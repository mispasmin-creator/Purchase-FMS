import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FilePlus2, Pencil, Save, Trash, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { ScrollArea } from "./ui/scroll-area";
import { Search } from "lucide-react";

import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { pdf, PDFViewer } from "@react-pdf/renderer";
import { ClipLoader as Loader } from "react-spinners";
import { toast } from "sonner";
import POPdf from "./POPdf";
import { AuthContext } from "../context/AuthContext";
import { supabase } from "../supabase";
import { uploadFileToStorage } from "../utils/storageUtils";
import { useRealtime } from "../hooks/useRealtime";
import { canViewFirm } from "../utils/firmFilter";

import logo from "../assets/logo.jpeg";

const DEFAULT_TERMS = [
  "Price is ex factory",
  "Subject to Raipur Jurisdiction",
  "Payment: 1 Day",
];

const TRANSPORT_TYPE_OPTIONS = ["FOR", "Ex-Factory"];
//there some comment
const defaultForm = () => ({
  poNumber: "",
  poDate: new Date().toISOString().split("T")[0],
  supplierName: "",
  supplierAddress: "",
  gstin: "",
  companyEmail: "",
  quotationNumber: "",
  quotationDate: new Date().toISOString().split("T")[0],
  deliveryDate: new Date().toISOString().split("T")[0],
  paymentTerms: "1 DAY",
  description: "",
  notes: "",
  destination: "",
  transportType: "",
  advanceToBePaid: "no",
  toBePaidAmount: "",
  whenToBePaid: "",
  terms: [...DEFAULT_TERMS],
  indents: [],
});

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();
const toDateInput = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.split("T")[0].split(" ")[0];
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
};
const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value || ""
    : new Intl.DateTimeFormat("en-GB").format(date);
};
const lineBase = (item) =>
  (Number(item.quantity) || 0) * (Number(item.rate) || 0);
const taxable = (item) =>
  lineBase(item) - (lineBase(item) * (Number(item.discountPercent) || 0)) / 100;
const lineGst = (item) =>
  (taxable(item) * (Number(item.gstPercent) || 0)) / 100;
const lineTotal = (item) => taxable(item) + lineGst(item);
const sumBy = (items, fn) => items.reduce((sum, item) => sum + fn(item), 0);
const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const mapRow = (row) => ({
  id: row["Indent Id."],
  firmName: row["Firm Name"] || "",
  vendorName: row["Vendor"] || "",
  rawMaterialName: row["Material"] || "",
  approvedQty: Number(row["Approved Qty"] || 0),
  approvedRate: Number(row["Approved Rate"] || row["Rate"] || 0),
  quotationNumber: row["Quotation Number 1"] || "",
  quotationDate: toDateInput(row["Quotation Date 1"]),
  poTimestamp: row["Actual2"] || "",
  planned: row["Planned2"] || "",
  notes: row["PO Notes"] || row["Notes"] || "",
  supplierAddress: row["Vendor Address"] || row["Address"] || "",
  supplierGstin: row["GST Number"] || row["GSTIN"] || "",
  supplierEmail: row["Email"] || "",
  alumina: row["Alumina %"] || "",
  iron: row["Iron %"] || "",
  sio2: row["SiO2 %"] || "",
  cao: row["CaO %"] || "",
  ap: row["AP Percent Age %"] || "",
  bd: row["BD Percent Age %"] || "",
  fineness: row["Fineness"] || "",
  packaging: row["Packaging"] || "",
  poFile: row["PO Copy"] || "",
  advanceToBePaid: row["Advance To Be Paid"] || "",
  toBePaidAmount: row["To Be Paid Amount"] || "",
  whenToBePaid: toDateInput(row["When To Be Paid Amount"]),
  transportType: row["Transport Type"] || "",
  dest: row["destination"] || "",
  poDate: toDateInput(row["Actual2"]),
  deliveryDate: toDateInput(row["Lead Time To Lift (days)"]),
  poNumber: row["po_number"] || "",
  uom: row["UOM"] || "MT",
});

const groupByVendor = (rows) => {
  const groups = rows.reduce((acc, row) => {
    const key = row.vendorName || "Unknown Vendor";
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});
  return Object.entries(groups).map(([vendorName, indents]) => ({
    vendorName,
    indents,
    totalItems: indents.length,
    totalQuantity: sumBy(indents, (item) => Number(item.approvedQty) || 0),
  }));
};

export default function CreatePO() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [mode, setMode] = useState("create");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [termEditIndex, setTermEditIndex] = useState(-1);
  const [editDestination, setEditDestination] = useState(false);
  const [formData, setFormData] = useState(defaultForm());
  const [firms, setFirms] = useState([]);
  const [selectedFirm, setSelectedFirm] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [poPopoverOpen, setPoPopoverOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [poDropdownOpen, setPoDropdownOpen] = useState(false);

  // Fetch Firms data
  useEffect(() => {
    async function fetchFirms() {
      const { data, error } = await supabase.from("Firms").select("*");
      if (error) {
        console.error("Error fetching firms:", error);
        return;
      }
      setFirms(data || []);

      // Auto-select firm based on user
      const userFirmPath = user?.firmName;
      if (userFirmPath && userFirmPath !== "all") {
        // Find if user has exactly one firm assigned or use the first one if multiple
        const firstUserFirm = Array.isArray(userFirmPath)
          ? userFirmPath[0]
          : userFirmPath;

        const found = data.find(
          (f) =>
            normalize(f.firm_name) === normalize(firstUserFirm) ||
            normalize(f.data_name) === normalize(firstUserFirm),
        );
        if (found) setSelectedFirm(found);
      }
    }
    fetchFirms();
  }, [user]);

  const fetchPreviewPoNumber = async () => {
    if (!selectedFirm || mode !== "create") return;

    const { data, error } = await supabase.rpc("preview_next_po_number", {
      target_firm_id: selectedFirm.id,
    });

    if (!error && data?.length) {
      const { next_id, prefix } = data[0];
      setFormData((prev) => ({
        ...prev,
        poNumber: `${prefix}${next_id}`,
      }));
    }
  };

  useEffect(() => {
    fetchPreviewPoNumber();
  }, [selectedFirm, mode]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("INDENT-PO")
          .select("*")
          .not("Planned2", "is", null);
        if (error) throw error;
        const mapped = (data || []).map(mapRow);

        // Debug info: Log available firm names in data
        const availableFirmsInData = Array.from(
          new Set(mapped.map((i) => i.firmName)),
        ).filter(Boolean);
        console.log("Available firms in INDENT-PO data:", availableFirmsInData);
        if (selectedFirm) {
          console.log("Currently selected firm:", selectedFirm.firm_name);
        }

        // Filter rows by the current selected firm
        let filtered = mapped;
        if (selectedFirm) {
          // Use data_name (short key like 'Pmmpl') if it exists, otherwise fall back to firm_name
          const filterKey = selectedFirm.data_name || selectedFirm.firm_name;
          filtered = mapped.filter((item) =>
            canViewFirm(filterKey, item.firmName),
          );
        } else if (user?.firmName) {
          filtered = mapped.filter((item) =>
            canViewFirm(user.firmName, item.firmName),
          );
        }

        setRows(filtered);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load purchase order data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.firmName, refreshTrigger, selectedFirm]);

  // Realtime: Listen for changes in INDENT-PO and refresh
  useRealtime("INDENT-PO", () => {
    setRefreshTrigger((prev) => prev + 1);
  });

  const pendingGroups = useMemo(
    () =>
      groupByVendor(rows.filter((item) => item.planned && !item.poTimestamp)),
    [rows],
  );
  const createdGroups = useMemo(
    () =>
      groupByVendor(rows.filter((item) => item.planned && item.poTimestamp)),
    [rows],
  );
  const vendorGroups = mode === "create" ? pendingGroups : createdGroups;
  const [poSearch, setPoSearch] = useState("");

  const poNumbers = useMemo(() => {
    return Array.from(
      new Set(
        rows.filter((r) => r.poTimestamp && r.poNumber).map((r) => r.poNumber),
      ),
    ).sort();
  }, [rows]);

  const currentGroup = useMemo(() => {
    if (mode === "create") {
      return (
        vendorGroups.find(
          (group) =>
            normalize(group.vendorName) === normalize(formData.supplierName),
        ) || null
      );
    } else {
      if (!formData.poNumber) return null;
      const poRows = rows.filter((r) => r.poNumber === formData.poNumber);
      if (poRows.length === 0) return null;
      return {
        vendorName: poRows[0].vendorName,
        indents: poRows,
      };
    }
  }, [mode, vendorGroups, rows, formData.supplierName, formData.poNumber]);

  useEffect(() => {
    if (!currentGroup) return;
    const first = currentGroup.indents[0] || {};
    setFormData((prev) => ({
      ...prev,
      poNumber: mode === "revise" ? first.poNumber || "" : prev.poNumber,
      poDate: mode === "revise" ? first.poDate || prev.poDate : prev.poDate,
      deliveryDate:
        mode === "revise"
          ? first.deliveryDate || prev.deliveryDate
          : prev.deliveryDate,
      supplierName: currentGroup.vendorName,
      supplierAddress: first.supplierAddress || prev.supplierAddress,
      gstin: first.supplierGstin || prev.gstin,
      companyEmail: first.supplierEmail || prev.companyEmail,
      quotationNumber: first.quotationNumber || prev.quotationNumber,
      quotationDate: first.quotationDate || prev.quotationDate,
      notes: prev.notes || first.notes || "",
      destination: first.dest || first.firmName || prev.destination,
      advanceToBePaid:
        normalize(first.advanceToBePaid) === "yes"
          ? "yes"
          : prev.advanceToBePaid,
      toBePaidAmount: first.toBePaidAmount || prev.toBePaidAmount,
      whenToBePaid: first.whenToBePaid || prev.whenToBePaid,
      transportType: first.transportType || prev.transportType,

      indents: currentGroup.indents.map((indent) => ({
        id: indent.id,
        indentNumber: String(indent.id || ""),
        productName: indent.rawMaterialName || "",
        specifications: [
          indent.alumina ? `Alumina ${indent.alumina}%` : "",
          indent.iron ? `Iron ${indent.iron}%` : "",
          indent.sio2 ? `SiO2 ${indent.sio2}%` : "",
          indent.cao ? `CaO ${indent.cao}%` : "",
          indent.ap ? `AP ${indent.ap}%` : "",
          indent.bd ? `BD ${indent.bd}%` : "",
          indent.fineness ? `Fineness ${indent.fineness}` : "",
          indent.packaging ? `Packaging ${indent.packaging}` : "",
        ]
          .filter(Boolean)
          .join(", "),
        quantity: indent.approvedQty,
        unit: indent.uom || "MT",
        rate: indent.approvedRate,
        gstPercent: 18,
        discountPercent: 0,
        specs: {
          alumina: indent.alumina || "",
          iron: indent.iron || "",
          sio2: indent.sio2 || "",
          cao: indent.cao || "",
          ap: indent.ap || "",
          bd: indent.bd || "",
          fineness: indent.fineness || "",
        },
        packaging: indent.packaging || "",
      })),
    }));
  }, [currentGroup, rows]);

  const subtotal = useMemo(
    () => sumBy(formData.indents, taxable),
    [formData.indents],
  );
  const gstAmount = useMemo(
    () => sumBy(formData.indents, lineGst),
    [formData.indents],
  );
  const grandTotal = useMemo(
    () => sumBy(formData.indents, lineTotal),
    [formData.indents],
  );
  const advanceAmount = Number(formData.toBePaidAmount) || 0;
  const totalQuantity = useMemo(
    () => sumBy(formData.indents, (item) => Number(item.quantity) || 0),
    [formData.indents],
  );

  const setField = (name, value) =>
    setFormData((prev) => ({ ...prev, [name]: value }));
  const updateTerm = (index, value) =>
    setFormData((prev) => ({
      ...prev,
      terms: prev.terms.map((term, i) => (i === index ? value : term)),
    }));
  const updateIndent = (index, key, value) =>
    setFormData((prev) => ({
      ...prev,
      indents: prev.indents.map((item, i) =>
        i === index ? { ...item, [key]: value } : item,
      ),
    }));
  const removeIndent = (index) =>
    setFormData((prev) => ({
      ...prev,
      indents: prev.indents.filter((_, i) => i !== index),
    }));
  const removeTerm = (index) =>
    setFormData((prev) => ({
      ...prev,
      terms: prev.terms.filter((_, i) => i !== index),
    }));
  const resetForm = () => {
    setErrors({});
    setTermEditIndex(-1);
    setEditDestination(false);
    setFormData(defaultForm());
    // The poNumber will be recalculated by the useEffect that watches refreshTrigger
  };

  const validateForm = () => {
    const next = {};
    if (!formData.supplierName) next.supplierName = "Supplier is required";
    if (mode === "revise" && !formData.poNumber)
      next.poNumber = "PO number is required";
    if (!formData.poDate) next.poDate = "PO date is required";
    if (!formData.deliveryDate) next.deliveryDate = "Delivery date is required";
    if (!formData.supplierAddress)
      next.supplierAddress = "Supplier address is required";
    if (!formData.gstin) next.gstin = "GSTIN is required";
    if (!formData.quotationNumber)
      next.quotationNumber = "Quotation number is required";
    if (!formData.notes) next.notes = "PO notes are required";
    if (!formData.indents.length)
      next.indents = "At least one item is required";
    if (!formData.transportType)
      next.transportType = "Transport type is required";
    if (formData.advanceToBePaid === "yes" && !formData.toBePaidAmount)
      next.toBePaidAmount = "Advance amount is required";
    if (formData.advanceToBePaid === "yes" && !formData.whenToBePaid)
      next.whenToBePaid = "Advance payment date is required";
    setErrors(next);
    return !Object.keys(next).length;
  };

  const buildPdfProps = () => ({
    companyName: selectedFirm?.firm_name || "Passary Minerals Madhya Pvt Ltd",
    companyPhone: selectedFirm?.phone || "771-4001598",
    companyGstin: selectedFirm?.gstin || "22AAHCP9274B1ZI",
    companyPan: selectedFirm?.pan || "AAHCP9274B",
    companyAddress:
      selectedFirm?.address || "Kh No 297/2, Akoli, Block Dharsiwa, Raipur",
    billingAddress:
      selectedFirm?.billing_address ||
      "Kh No 297/2, Akoli, Block Dharsiwa, Raipur",
    destinationAddress: formData.destination,
    supplierName: formData.supplierName,
    supplierAddress: formData.supplierAddress,
    supplierGstin: formData.gstin,
    orderNumber: formData.poNumber,
    orderDate: formatDate(formData.poDate),
    deliveryDate: formatDate(formData.deliveryDate),
    quotationNumber: formData.quotationNumber,
    quotationDate: formatDate(formData.quotationDate),
    notes: formData.notes,
    items: formData.indents.map((item) => ({
      product: item.productName,
      quantity: Number(item.quantity) || 0,
      unit: item.unit || "MT",
      rate: Number(item.rate) || 0,
      amount: lineBase(item),
      specs: item.specs || {},
      packaging: item.packaging || "",
    })),
    totalQuantity,
    totalAmount: subtotal,
    gstAmount,
    grandTotal,
    advanceToBePaid: formData.advanceToBePaid,
    advanceAmount: Number(formData.toBePaidAmount) || 0,
    gstPercent: Number(formData.indents[0]?.gstPercent) || 18,
    discountPercent: 0,
    terms: formData.terms.filter(Boolean),
    paymentTerms: formData.paymentTerms || "1 DAY",
    labDetails: { packaging: formData.indents[0]?.packaging || "" },
    companyEmail: (() => {
      const name = (selectedFirm?.firm_name || "").toUpperCase().trim();
      if (name.includes("PURAB")) return "pmpurab@gmail.com";
      if (name.includes("MADHYA")) return "pmmpl@pasmin.com";
      if (name.includes("PASSARY MINERALS PVT LTD"))
        return "marketing@pasmin.com";
      return "marketing@pasmin.com";
    })(),
  });

  const handlePreview = async () => {
    if (!validateForm())
      return toast.error("Please fill all required PO fields first");

    setIsGenerating(true);
    try {
      const props = buildPdfProps();
      const blob = await pdf(<POPdf {...props} />).toBlob();
      const url = URL.createObjectURL(blob);

      // Open the generated PDF natively in a new tab
      window.open(url, "_blank");
    } catch (err) {
      console.error("Preview failed:", err);
      toast.error("Failed to generate PDF preview");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm())
      return toast.error("Please fill all required PO fields");
    if (!currentGroup) return toast.error("Please select a vendor group first");

    setSubmitting(true);
    toast.loading("Generating and uploading PO...", { id: "create-po" });
    try {
      let finalPoNumber = formData.poNumber;

      // 1. If creating a new PO, get the next unique number from the server
      if (mode === "create") {
        const { data: nextPoData, error: rpcError } = await supabase.rpc(
          "get_next_po_number",
          { target_firm_id: selectedFirm.id },
        );

        if (rpcError) {
          throw new Error(`Failed to generate PO number: ${rpcError.message}`);
        }

        if (nextPoData && nextPoData.length > 0) {
          const { next_id, prefix } = nextPoData[0];
          finalPoNumber = `${prefix}${next_id}`;
        } else {
          throw new Error("No data returned from PO number generator");
        }
      }

      // 2. Generate PDF with the final confirmed PO number
      const pdfProps = { ...buildPdfProps(), orderNumber: finalPoNumber };
      const blob = await pdf(<POPdf {...pdfProps} />).toBlob();
      const file = new File(
        [blob],
        `PO-${finalPoNumber.replace(/\//g, "-")}.pdf`,
        { type: "application/pdf" },
      );
      const { url } = await uploadFileToStorage(file, "image", "po-files");

      const now = new Date();
      const datePart = formData.poDate || now.toISOString().split("T")[0];
      const timePart = now.toTimeString().split(" ")[0];
      const stamp = `${datePart} ${timePart}`;

      const isExFac = normalize(formData.transportType) === "ex-factory";
      const updates = {
        Actual2: stamp,
        PlannedLogistics: stamp,
        ...(isExFac
          ? {}
          : {
              ActualLogistics: stamp,
              Planned9: stamp,
              Actual9: stamp,
              Planned3: stamp,
            }),
        po_number: finalPoNumber,
        "Vendor name": formData.supplierName,
        Rate: Number(formData.indents[0]?.rate) || 0,
        "Lead Time To Lift (days)": formData.deliveryDate
          ? `${formData.deliveryDate} 00:00:00`
          : null,
        "Total Quantity": totalQuantity,
        "Total Amount": subtotal,
        "PO Copy": url,
        "Advance To Be Paid": formData.advanceToBePaid === "yes" ? "Yes" : "No",
        "To Be Paid Amount":
          formData.advanceToBePaid === "yes"
            ? Number(formData.toBePaidAmount) || 0
            : null,
        "When To Be Paid Amount":
          formData.advanceToBePaid === "yes" && formData.whenToBePaid
            ? `${formData.whenToBePaid} 00:00:00`
            : null,
        Status5: formData.advanceToBePaid === "yes" ? "Pending" : null,
        "PO Notes": formData.notes,
        Packaging: formData.indents[0]?.packaging || "",
        "Transport Type": formData.transportType || "",
        "PO Items": formData.indents.map((item) => ({
          indentId: item.id,
          material: item.productName,
          quantity: Number(item.quantity) || 0,
          rate: Number(item.rate) || 0,
          gstPercent: Number(item.gstPercent) || 0,
          specs: { ...(item.specs || {}), packaging: item.packaging || "" },
        })),
      };

      // 3. Update/Set indents that are in the form
      for (const indent of formData.indents) {
        const { error } = await supabase
          .from("INDENT-PO")
          .update({
            ...updates,
            "Approved Qty": Number(indent.quantity) || 0,
            Rate: Number(indent.rate) || 0,
          })
          .eq('"Indent Id."', indent.id);
        if (error) throw error;
      }

      // 4. If revising, clear PO info from indents that were removed from the form
      if (mode === "revise") {
        const formIds = new Set(formData.indents.map((i) => i.id));
        const removedIndents = currentGroup.indents.filter(
          (i) => !formIds.has(i.id),
        );

        if (removedIndents.length > 30) {
          toast.error(
            "Safety check: Too many removals. Please verify your selection.",
          );
          return;
        }

        for (const indent of removedIndents) {
          const { error } = await supabase
            .from("INDENT-PO")
            .update({
              Actual2: null,
              PlannedLogistics: null,
              ActualLogistics: null,
              Planned9: null,
              Actual9: null,
              Planned3: null,
              po_number: null,
              "PO Copy": null,
              "Advance To Be Paid": null,
              "To Be Paid Amount": null,
              "When To Be Paid Amount": null,
              Status5: null,
              "PO Notes": null,
              Packaging: null,
              "Transport Type": null,
              "PO Items": null,
              Rate: null,
              "Total Quantity": null,
              "Total Amount": null,
            })
            .eq('"Indent Id."', indent.id);
          if (error) throw error;
        }
      }

      toast.success(
        mode === "revise"
          ? "PO revised successfully"
          : "PO created successfully",
        {
          id: "create-po",
          description: `${formData.supplierName} processed for PO ${finalPoNumber}`,
        },
      );

      // Trigger a full refresh which will also recalculate the next PO number correctly
      setRefreshTrigger((prev) => prev + 1);
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to save purchase order", {
        id: "create-po",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid w-full rounded-md place-items-center bg-gradient-to-br from-blue-100 via-purple-50 to-blue-50">
      <div className="flex justify-between w-full p-5">
        <div className="flex items-center gap-2">
          <FilePlus2 size={50} className="text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-primary">
              Create or Revise PO
            </h1>
            <p className="text-sm text-muted-foreground">
              Create purchase order for approved indents using the current PO
              flow
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="self-start bg-white"
          onClick={() => navigate("/arrange-logistics")}
        >
          Arrange Logistics
        </Button>
      </div>

      <div className="max-w-6xl sm:p-4">
        <Tabs
          defaultValue="create"
          onValueChange={(value) => {
            setMode(value === "revise" ? "revise" : "create");
            resetForm();
          }}
        >
          <TabsList className="w-full h-10 rounded-none">
            <TabsTrigger value="create">Create</TabsTrigger>
            <TabsTrigger value="revise">Revise</TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={handleSubmit} className="flex flex-col items-center">
          <div className="w-full p-4 space-y-4 bg-white rounded-sm shadow-md">
            {user?.firmName === "all" && (
              <div className="flex flex-col items-center justify-center p-4 mb-4 border rounded-md bg-blue-50/50 border-primary/20">
                <Label className="mb-2 text-lg font-bold text-primary">
                  Choose Firm for PO
                </Label>
                <div className="w-full max-w-md">
                  <Select
                    value={selectedFirm?.id || ""}
                    onValueChange={(value) => {
                      const firm = firms.find((f) => f.id === value);
                      setSelectedFirm(firm);
                      resetForm();
                    }}
                  >
                    <SelectTrigger className="w-full h-12 text-lg bg-white border-2 border-primary/30">
                      <SelectValue placeholder="Select the firm to generate PO for" />
                    </SelectTrigger>
                    <SelectContent>
                      {firms.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.firm_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!selectedFirm && (
                  <p className="mt-2 text-sm font-medium text-red-500">
                    Please select a firm before proceeding
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-center gap-4 p-2 rounded h-25">
              <img
                src={logo}
                alt="Company Logo"
                className="object-contain w-40"
              />
              <div className="text-center">
                <h1 className="text-2xl font-bold tracking-tight uppercase text-primary">
                  {selectedFirm?.firm_name || "Passary Minerals Madhya Pvt Ltd"}
                </h1>
                <p className="text-sm font-medium text-muted-foreground">
                  {selectedFirm?.address ||
                    "Shri Ram Business Park , Block - C, 2nd floor , Room No. 212"}
                </p>
                <p className="text-sm font-semibold text-primary/80">
                  Phone No: {selectedFirm?.phone || "+91 7223844007"}
                </p>
              </div>
            </div>

            {selectedFirm && rows.length === 0 && (
              <div className="p-4 mx-4 text-center border-2 border-red-200 border-dashed rounded-lg bg-red-50/50">
                <p className="text-sm font-bold text-red-600">
                  No pending indents found for "{selectedFirm.firm_name}"
                </p>
                <p className="mt-1 text-xs text-red-500">
                  Please verify that the Firm Name in your indents matches the
                  name in your Firms table exactly.
                </p>
              </div>
            )}

            <hr />
            <h2 className="text-lg font-bold text-center">Purchase Order</h2>
            <hr />

            <div className="grid gap-5 px-4 py-2 text-foreground/80">
              <div className="grid grid-cols-2 gap-x-5">
                <div>
                  <Label className="block mb-2">PO Number</Label>
                  {mode === "create" ? (
                    <div className="space-y-1">
                      <Input
                        className="h-9"
                        value={formData.poNumber || "Calculating..."}
                        readOnly
                      />
                      <p className="text-[10px] text-muted-foreground italic">
                        *Final PO number will be assigned on save
                      </p>
                    </div>
                  ) : (
                    <div className="relative">
                      <Input
                        className="w-full pr-8 h-9"
                        placeholder="Search or Select PO..."
                        value={formData.poNumber}
                        onChange={(e) => {
                          setField("poNumber", e.target.value);
                          setPoDropdownOpen(true);
                        }}
                        onFocus={() => setPoDropdownOpen(true)}
                        onBlur={() => setPoDropdownOpen(false)}
                        autoComplete="off"
                      />
                      <Search className="absolute right-2.5 top-2.5 h-4 w-4 opacity-50 text-gray-500 pointer-events-none" />
                      {poDropdownOpen && (
                        <div className="absolute z-50 w-full mt-1 overflow-x-hidden overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg max-h-60">
                          {poNumbers.filter((po) =>
                            po
                              .toLowerCase()
                              .includes(
                                (formData.poNumber || "").toLowerCase(),
                              ),
                          ).length > 0 ? (
                            poNumbers
                              .filter((po) =>
                                po
                                  .toLowerCase()
                                  .includes(
                                    (formData.poNumber || "").toLowerCase(),
                                  ),
                              )
                              .map((po) => (
                                <div
                                  key={po}
                                  className="px-4 py-2 text-sm cursor-pointer hover:bg-blue-100"
                                  onMouseDown={() => {
                                    setField("poNumber", po);
                                    setPoDropdownOpen(false);
                                  }}
                                >
                                  {po}
                                </div>
                              ))
                          ) : (
                            <div className="px-4 py-2 text-sm text-gray-500">
                              No matches found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {errors.poNumber && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.poNumber}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="block mb-2">PO Date</Label>
                  <Input
                    className="h-9"
                    type="date"
                    value={formData.poDate}
                    onChange={(e) => setField("poDate", e.target.value)}
                  />
                  {errors.poDate && (
                    <p className="mt-1 text-xs text-red-500">{errors.poDate}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-x-5">
                <div>
                  <Label className="block mb-2">
                    {mode === "create" ? "Supplier Name" : "Processed Vendor"}
                  </Label>
                  <Select
                    value={formData.supplierName || undefined}
                    onValueChange={(value) => setField("supplierName", value)}
                    disabled={mode === "revise"}
                  >
                    <SelectTrigger className="w-full h-9">
                      <SelectValue
                        placeholder={
                          mode === "create"
                            ? "Select supplier"
                            : "Select processed vendor"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {vendorGroups.map((group) => (
                        <SelectItem
                          key={group.vendorName}
                          value={group.vendorName}
                        >
                          {group.vendorName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.supplierName && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.supplierName}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="block mb-2">Quotation Number</Label>
                  <Input
                    className="h-9"
                    value={formData.quotationNumber}
                    onChange={(e) =>
                      setField("quotationNumber", e.target.value)
                    }
                  />
                  {errors.quotationNumber && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.quotationNumber}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="block mb-2">Quotation Date</Label>
                  <Input
                    className="h-9"
                    type="date"
                    value={formData.quotationDate}
                    onChange={(e) => setField("quotationDate", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-x-5">
                <div>
                  <Label className="block mb-2">Supplier Address</Label>
                  <Input
                    className="h-9"
                    value={formData.supplierAddress}
                    onChange={(e) =>
                      setField("supplierAddress", e.target.value)
                    }
                  />
                  {errors.supplierAddress && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.supplierAddress}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="block mb-2">GSTIN</Label>
                  <Input
                    className="h-9"
                    value={formData.gstin}
                    onChange={(e) => setField("gstin", e.target.value)}
                  />
                  {errors.gstin && (
                    <p className="mt-1 text-xs text-red-500">{errors.gstin}</p>
                  )}
                </div>
                <div>
                  <Label className="block mb-2">Company Email</Label>
                  <Input
                    className="h-9"
                    type="email"
                    value={formData.companyEmail}
                    onChange={(e) => setField("companyEmail", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-x-5">
                <div>
                  <Label className="block mb-2">Delivery Date</Label>
                  <Input
                    className="h-9"
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) => setField("deliveryDate", e.target.value)}
                  />
                  {errors.deliveryDate && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.deliveryDate}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="block mb-2">Payment Terms</Label>
                  <Input
                    className="h-9"
                    value={formData.paymentTerms}
                    onChange={(e) => setField("paymentTerms", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="block mb-2">
                    Transport Type <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.transportType || ""}
                    onValueChange={(value) => setField("transportType", value)}
                  >
                    <SelectTrigger className="w-full h-9">
                      <SelectValue placeholder="Select transport type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSPORT_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.transportType && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.transportType}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-x-5">
                <div>
                  <Label className="block mb-2">Advance To Be Paid?</Label>
                  <Select
                    value={formData.advanceToBePaid}
                    onValueChange={(value) =>
                      setField("advanceToBePaid", value)
                    }
                  >
                    <SelectTrigger className="w-full h-9">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="block mb-2">Advance Amount</Label>
                  <Input
                    className="h-9"
                    type="number"
                    value={formData.toBePaidAmount}
                    onChange={(e) => setField("toBePaidAmount", e.target.value)}
                    disabled={formData.advanceToBePaid !== "yes"}
                  />
                  {errors.toBePaidAmount && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.toBePaidAmount}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="block mb-2">Advance Payment Date</Label>
                  <Input
                    className="h-9"
                    type="date"
                    value={formData.whenToBePaid}
                    onChange={(e) => setField("whenToBePaid", e.target.value)}
                    disabled={formData.advanceToBePaid !== "yes"}
                  />
                  {errors.whenToBePaid && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.whenToBePaid}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <hr />

            <div className="grid gap-3 md:grid-cols-3">
              <Card className="gap-0 rounded-[3px] p-0 shadow-xs">
                <CardHeader className="px-5 py-2 bg-muted">
                  <CardTitle className="text-center">
                    Our Commercial Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 text-sm">
                  <p>
                    <span className="font-semibold">GSTIN:</span>{" "}
                    {selectedFirm?.gstin || "22AAHCP9274B1ZI"}
                  </p>
                  <p>
                    <span className="font-semibold">Pan No.</span>{" "}
                    {selectedFirm?.pan || "AAHCP9274B"}
                  </p>
                </CardContent>
              </Card>
              <Card className="gap-0 rounded-[3px] p-0 shadow-xs">
                <CardHeader className="px-5 py-2 bg-muted">
                  <CardTitle className="text-center">Billing Address</CardTitle>
                </CardHeader>
                <CardContent className="p-5 text-sm">
                  <p>
                    {selectedFirm?.billing_address ||
                      "Kh No 297/2, Akoli, Block Dharsiwa, Raipur"}
                  </p>
                </CardContent>
              </Card>
              <Card className="gap-0 rounded-[3px] p-0 shadow-xs">
                <CardHeader className="px-5 py-2 bg-muted">
                  <CardTitle className="flex items-center justify-between text-center">
                    Destination Address
                    {formData.supplierName && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditDestination((prev) => !prev)}
                        className="w-6 h-6 p-0 hover:bg-gray-200"
                      >
                        {editDestination ? (
                          <Save size={14} className="text-green-600" />
                        ) : (
                          <Pencil size={14} className="text-gray-600" />
                        )}
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 text-sm">
                  {formData.supplierName ? (
                    <>
                      {editDestination ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            value={formData.destination}
                            onChange={(e) =>
                              setField("destination", e.target.value)
                            }
                            className="text-sm h-7"
                            placeholder="Enter destination address"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setField("destination", "")}
                            className="w-6 h-6 p-0 hover:bg-red-100"
                          >
                            <Trash size={12} className="text-red-500" />
                          </Button>
                        </div>
                      ) : (
                        <p>{formData.destination || "Destination not set"}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-center text-gray-400">Select Supplier</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <hr />

            <div>
              <Label className="block mb-2">Description</Label>
              <Textarea
                placeholder="Enter message"
                className="resize-y"
                value={formData.description}
                onChange={(e) => setField("description", e.target.value)}
              />
            </div>
            <div>
              <Label className="block mb-2">PO Notes</Label>
              <Textarea
                placeholder="Describe goods / remarks"
                className="resize-y"
                value={formData.notes}
                onChange={(e) => setField("notes", e.target.value)}
              />
              {errors.notes && (
                <p className="mt-1 text-xs text-red-500">{errors.notes}</p>
              )}
            </div>

            <hr />

            <div className="grid mx-4">
              <div className="min-w-full w-full overflow-auto rounded-lg border border-gray-200 max-h-[500px] relative custom-scrollbar">
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 z-30">
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">S/N</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Internal Code</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Product</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Description</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Qty</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Unit</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Rate</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">GST (%)</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Discount (%)</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Amount</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-center bg-gray-50/95 backdrop-blur-sm shadow-sm">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {formData.indents.map((item, index) => (
                      <tr key={`${item.id}-${index}`} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                        <td className="px-4 py-3">{index + 1}</td>
                        <td className="px-4 py-3 font-medium">
                          {item.indentNumber || "N/A"}
                        </td>
                        <td className="px-4 py-3">
                          {item.productName || "No Product"}
                        </td>
                        <td className="px-4 py-3">
                          {item.specifications || (
                            <span className="italic text-muted-foreground">
                              No description
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            className="w-20 text-center h-9 no-spinner"
                            value={item.quantity || 0}
                            onChange={(e) =>
                              updateIndent(index, "quantity", e.target.value)
                            }
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            className="w-20 text-center h-9 bg-gray-50"
                            value={item.unit || ""}
                            readOnly
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            className="w-24 text-center h-9 no-spinner"
                            value={item.rate || 0}
                            onChange={(e) =>
                              updateIndent(index, "rate", e.target.value)
                            }
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            className="w-16 text-center h-9 no-spinner"
                            value={item.gstPercent || 0}
                            onChange={(e) =>
                              updateIndent(index, "gstPercent", e.target.value)
                            }
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            className="w-16 text-center h-9 bg-gray-50"
                            value={item.discountPercent || 0}
                            readOnly
                          />
                        </td>
                        <td className="px-4 py-3 font-medium">
                          Rs. {money(lineTotal(item))}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-8 h-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => removeIndent(index)}
                          >
                            <Trash size={14} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {errors.indents && (
                <p className="mt-2 text-xs text-red-500">{errors.indents}</p>
              )}
              <div className="flex justify-end p-4">
                <div className="space-y-3 w-80">
                  <div className="rounded-[3px] bg-muted">
                    <p className="flex justify-between py-2 px-7">
                      <span>Total:</span>
                      <span className="text-end">{money(subtotal)}</span>
                    </p>
                    <hr />
                    <p className="flex justify-between py-2 px-7">
                      <span>GST Amount:</span>
                      <span className="text-end">{money(gstAmount)}</span>
                    </p>
                    <hr />
                    <p className="flex justify-between py-2 font-bold px-7">
                      <span>Grand Total:</span>
                      <span className="text-end">{money(grandTotal)}</span>
                    </p>
                  </div>
                  {formData.advanceToBePaid === "yes" && advanceAmount > 0 && (
                    <div className="rounded-[3px] bg-muted">
                      <p className="py-2 font-semibold border-b px-7">
                        Advance To Be Paid
                      </p>
                      <p className="flex justify-between py-2 px-7">
                        <span>Advance Amount:</span>
                        <span className="text-end">{money(advanceAmount)}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <hr />

            <div>
              <p className="px-3 text-sm font-semibold">THE ABOVE</p>
              <div>
                {formData.terms.map((term, index) => {
                  const writable = termEditIndex === index;
                  return (
                    <div className="flex items-center" key={index}>
                      <span className="px-3">{index + 1}.</span>
                      <Input
                        className={`h-6 rounded-xs border-transparent shadow-none ${writable ? "border-b border-b-foreground" : ""}`}
                        readOnly={!writable}
                        value={term}
                        onChange={(e) => updateTerm(index, e.target.value)}
                      />
                      <Button
                        variant="ghost"
                        type="button"
                        onClick={() => {
                          if (writable) setTermEditIndex(-1);
                          else if (termEditIndex === -1)
                            setTermEditIndex(index);
                          else
                            toast.error(
                              `Please save term ${termEditIndex + 1} before editing`,
                            );
                        }}
                      >
                        {!writable ? <Pencil size={20} /> : <Save size={20} />}
                      </Button>
                      <Button
                        variant="ghost"
                        type="button"
                        onClick={() => removeTerm(index)}
                      >
                        <Trash className="text-red-300" size={20} />
                      </Button>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end w-full p-3">
                <Button
                  className="w-50"
                  variant="outline"
                  type="button"
                  onClick={() => {
                    if (formData.terms.length >= 10)
                      return toast.error("Only 10 terms are allowed");
                    if (termEditIndex !== -1)
                      return toast.error(
                        `Please save term ${termEditIndex + 1} before creating`,
                      );
                    setFormData((prev) => ({
                      ...prev,
                      terms: [...prev.terms, ""],
                    }));
                    setTermEditIndex(formData.terms.length);
                  }}
                >
                  Add Term
                </Button>
              </div>
            </div>
          </div>

          <div className="grid w-full max-w-6xl grid-cols-3 gap-3 p-3 m-5 rounded-md shadow-md bg-background">
            <Button type="button" variant="outline" onClick={resetForm}>
              Reset
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handlePreview}
              disabled={
                !formData.supplierName ||
                !formData.indents.length ||
                isGenerating
              }
            >
              {isGenerating ? (
                <Loader size={20} color="gray" className="mr-2" />
              ) : (
                <Eye size={20} className="mr-2" />
              )}
              Preview
            </Button>
            <Button type="submit" disabled={submitting || loading}>
              {(submitting || loading) && (
                <Loader size={20} color="white" aria-label="Loading Spinner" />
              )}
              Save And Send PO
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
