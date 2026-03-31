"use client";
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useContext,
} from "react";
import {
  FileCheck,
  Loader2,
  Upload,
  Wallet,
  Filter,
  Link as LinkIcon,
  File as FileIcon,
  History,
  Info,
  AlertTriangle,
  ChevronsUpDown,
  Search,
  Copy,
} from "lucide-react";
import { MixerHorizontalIcon } from "@radix-ui/react-icons";
import "../scrollbar-hide.css";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AuthContext } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { supabase } from "../supabase";
import { fetchMasterData } from "../utils/masterDataUtils";
import { uploadFileToStorage } from "../utils/storageUtils";
import { pdf } from "@react-pdf/renderer";
import POPdf from "./POPdf";

// Constants
const SHEET_ID = "13_sHCFkVxAzPbel-k9BuUBFY-E11vdKJAOgvzhBMLMY";
const INDENT_PO_SHEET = "INDENT-PO";
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbylQZLstOi0LyDisD6Z6KKC97pU5YJY2dDYVw2gtnW1fxZq9kz7wHBei4aZ8Ed-XKhKEA/exec";

// Column mappings
const COL_INDENT_ID = 1;
const COL_FIRM_NAME = 2;
const COL_VENDOR_NAME = 4;
const COL_RAW_MATERIAL_NAME = 5;
const COL_TYPE_OF_INDENT = 8;
const COL_APPROVED_QTY = 14;
const COL_PLANNED_DATE = 17;
const COL_PO_TIMESTAMP = 18;
const COL_HAVE_TO_PO = 20;
const COL_RATE = 21;
const COL_LEAD_TIME = 22;
const COL_TOTAL_QTY = 23;
const COL_TOTAL_AMOUNT = 24;
const COL_PO_FILE_URL = 25;
const COL_ADVANCE_TO_BE_PAID = 26;
const COL_TO_BE_PAID_AMOUNT = 27;
const COL_WHEN_TO_BE_PAID = 28;
const COL_NOTES = 29;
const COL_ALUMINA = 30;
const COL_IRON = 31;
const COL_VENDOR_NAME_PO = 42;

// Mock data for filters
const vendorOptions = ["Devid", "Karan", "Sanjay", "Vinod", "Purab"];
const materialOptions = ["Fabrics", "Minerals", "Iron", "Steel"];
const firmOptions = ["Purab", "Rkl", "Prmmpl", "PMMPL"];

const GeneratePurchaseOrder = () => {
  const { user } = useContext(AuthContext);
  const { updateCount } = useNotification();
  const [filters, setFilters] = useState({
    vendorName: "all",
    rawMaterialName: "all",
    firmName: "all",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // States for Generate PO
  const [indents, setIndents] = useState([]);
  const [filteredIndents, setFilteredIndents] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedVendorGroup, setSelectedVendorGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState(null);
  const [haveToPO, setHaveToPO] = useState("");
  const [poErrors, setPoErrors] = useState({});

  // NEW: State for per-item chemical specifications
  const [itemSpecs, setItemSpecs] = useState([]);

  // States for Advance Payment Tab
  const [indentData, setIndentData] = useState([]);
  const [selectedPaymentIndent, setSelectedPaymentIndent] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [vendorOptionsState, setVendorOptions] = useState([]);

  // Form state for Generate PO
  const [formData, setFormData] = useState({
    indentId: "",
    vendorName: "",
    quantity: "",
    rate: "",
    leadTimeToLift: "",
    totalQty: "",
    totalAmount: "",
    advanceToBePaid: "",
    toBePaidAmount: "",
    whenToBePaid: "",
    notes: "",
    poFile: null,
    packaging: "",
    poNumber: "",
    poDate: new Date().toISOString().split("T")[0],
    quotationNumber: "",
    quotationDate: new Date().toISOString().split("T")[0],
    ourEnqNo: "",
    enquiryDate: new Date().toISOString().split("T")[0],
    deliveryDate: new Date().toISOString().split("T")[0],
    deliveryDays: "",
    paymentTerms: "1 DAY",
    gstPercent: 18,
    discountPercent: 0,
    terms: [
      "Price is ex factory",
      "Subject to Raipur Jurisdiction",
      "Payment: 1 Day",
    ],
    destination: "",
    transportType: "",
  });

  const [showPreview, setShowPreview] = useState(false);
  const [masterDetails, setMasterDetails] = useState(null);

  // Simple SearchableSelect Component
  const SearchableSelect = ({
    value,
    onValueChange,
    options,
    placeholder,
    className,
  }) => {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const filteredOptions = options.filter((option) =>
      option.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    return (
      <div className="relative">
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className={`w-full justify-between h-9 bg-white text-xs ${className}`}
        >
          {value === "all" || !value ? `All ${placeholder}` : value}
          <ChevronsUpDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />
        </Button>

        {open && (
          <div className="absolute z-50 w-full mt-1 overflow-y-auto bg-white border border-gray-300 rounded-md shadow-lg max-h-60">
            <div className="sticky top-0 p-2 bg-white border-b">
              <Input
                type="text"
                placeholder={`Search ${placeholder.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-xs h-7"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="py-1">
              <div
                className={`px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 ${value === "all" ? "bg-green-50" : ""}`}
                onClick={() => {
                  onValueChange("all");
                  setOpen(false);
                  setSearchTerm("");
                }}
              >
                All {placeholder}
              </div>
              {filteredOptions.map((option, index) => (
                <div
                  key={`${option}-${index}`}
                  className={`px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 ${value === option ? "bg-green-50" : ""}`}
                  onClick={() => {
                    onValueChange(option);
                    setOpen(false);
                    setSearchTerm("");
                  }}
                >
                  {option}
                </div>
              ))}
            </div>
          </div>
        )}

        {open && (
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
        )}
      </div>
    );
  };

  // Form state for Advance Payment
  const [paymentFormData, setPaymentFormData] = useState({
    amount: "",
    paymentDate: "",
  });
  const [paymentFormErrors, setPaymentFormErrors] = useState({});

  // Column visibility states
  const [visibleIndentColumns, setVisibleIndentColumns] = useState({});
  const [visiblePoColumns, setVisiblePoColumns] = useState({});
  const [visiblePaymentColumns, setVisiblePaymentColumns] = useState({});
  const [visibleVendorGroupColumns, setVisibleVendorGroupColumns] = useState(
    {},
  );
  const [activeTab, setActiveTab] = useState("approve");

  // Column definitions
  const allIndentColumnsMeta = useMemo(
    () => [
      {
        header: "Action",
        dataKey: "actionColumn",
        toggleable: false,
        alwaysVisible: true,
      },
      {
        header: "Indent ID",
        dataKey: "id",
        toggleable: true,
        alwaysVisible: true,
      },
      { header: "Planned Date", dataKey: "planned", toggleable: true },
      { header: "Firm Name", dataKey: "firmName", toggleable: true },
      { header: "Vendor Name", dataKey: "vendorName", toggleable: true },
      { header: "Raw Material", dataKey: "rawMaterialName", toggleable: true },
      {
        header: "Indented Quantity",
        dataKey: "originalQuantity",
        toggleable: true,
      },
      { header: "Approved Qty", dataKey: "approvedQty", toggleable: true },
      { header: "Type", dataKey: "typeOfIndent", toggleable: true },
      { header: "Notes", dataKey: "indentNotes", toggleable: true },
    ],
    [],
  );

  const vendorGroupColumnsMeta = useMemo(
    () => [
      {
        header: "Action",
        dataKey: "actionColumn",
        toggleable: false,
        alwaysVisible: true,
      },
      {
        header: "Vendor Name",
        dataKey: "vendorName",
        toggleable: true,
        alwaysVisible: true,
      },
      { header: "Total Items", dataKey: "totalItems", toggleable: true },
      {
        header: "Total Quantity (MT)",
        dataKey: "totalQuantity",
        toggleable: true,
      },
      { header: "Total Amount", dataKey: "totalAmount", toggleable: true },
    ],
    [],
  );

  const allPoColumnsMeta = useMemo(
    () => [
      {
        header: "Indent ID",
        dataKey: "indentId",
        toggleable: true,
        alwaysVisible: true,
      },
      { header: "Created At", dataKey: "createdAt", toggleable: true },
      { header: "Firm Name", dataKey: "firmName", toggleable: true },
      { header: "Raw Material", dataKey: "rawMaterialName", toggleable: true },
      { header: "Quantity", dataKey: "quantity", toggleable: true },
      { header: "Total Amount", dataKey: "totalAmount", toggleable: true },
      {
        header: "PO File",
        dataKey: "poFile",
        toggleable: true,
        isLink: true,
        linkText: "View PDF",
      },
    ],
    [],
  );

  const ADVANCE_PAYMENT_COLUMNS_META = useMemo(
    () => [
      {
        header: "Indent ID",
        dataKey: "indentId",
        toggleable: true,
        alwaysVisible: true,
      },
      { header: "Payment Date", dataKey: "whenToBePaid", toggleable: true },
      { header: "Firm Name", dataKey: "firmName", toggleable: true },
      { header: "Status", dataKey: "paymentStatus", toggleable: true },
      { header: "Amount to Pay", dataKey: "toBePaidAmount", toggleable: true },
    ],
    [],
  );

  const parseGvizDate = useCallback((dateValue) => {
    if (!dateValue || typeof dateValue !== "string" || !dateValue.trim()) {
      return "";
    }
    const gvizMatch = dateValue.match(
      /^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)/,
    );
    if (gvizMatch) {
      const [, year, month, day, hours, minutes, seconds] =
        gvizMatch.map(Number);
      const parsedDate = new Date(
        year,
        month,
        day,
        hours || 0,
        minutes || 0,
        seconds || 0,
      );
      if (!isNaN(parsedDate.getTime())) {
        return new Intl.DateTimeFormat("en-GB", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
          .format(parsedDate)
          .replace(/,/g, "");
      }
    }
    const dateObj = new Date(dateValue);
    if (!isNaN(dateObj.getTime())) {
      return new Intl.DateTimeFormat("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
        .format(dateObj)
        .replace(/,/g, "");
    }
    return dateValue;
  }, []);

  // Initialize visibility states
  useEffect(() => {
    const initializeVisibility = (columnsMeta) => {
      const visibility = {};
      columnsMeta.forEach((col) => {
        visibility[col.dataKey] = col.alwaysVisible || col.toggleable;
      });
      return visibility;
    };
    setVisibleIndentColumns(initializeVisibility(allIndentColumnsMeta));
    setVisiblePoColumns(initializeVisibility(allPoColumnsMeta));
    setVisiblePaymentColumns(
      initializeVisibility(ADVANCE_PAYMENT_COLUMNS_META),
    );
    setVisibleVendorGroupColumns(initializeVisibility(vendorGroupColumnsMeta));
  }, [
    allIndentColumnsMeta,
    allPoColumnsMeta,
    ADVANCE_PAYMENT_COLUMNS_META,
    vendorGroupColumnsMeta,
  ]);

  const parseGvizResponse = useCallback((text, sheetNameForError) => {
    if (!text || !text.includes("google.visualization.Query.setResponse")) {
      console.error(
        `Invalid or empty gviz response for ${sheetNameForError}:`,
        text ? text.substring(0, 500) : "Response was null/empty",
      );
      throw new Error(
        `Invalid response format from Google Sheets for ${sheetNameForError}. Ensure it's link-shareable as 'Viewer'.`,
      );
    }
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      console.error(
        `JSON delimiters not found for ${sheetNameForError}. Text:`,
        text.substring(0, 200),
      );
      throw new Error(
        `Could not parse JSON from Google Sheets response for ${sheetNameForError}. Text: ${text.substring(0, 200)}`,
      );
    }
    const jsonString = text.substring(jsonStart, jsonEnd + 1);
    try {
      const data = JSON.parse(jsonString);
      if (!data.table || !data.table.cols) {
        console.warn(
          `No data.table or cols in ${sheetNameForError} or sheet is empty`,
          data,
        );
        return { cols: [], rows: [] };
      }
      if (!data.table.rows) {
        console.warn(
          `No data.table.rows in ${sheetNameForError}, treating as empty.`,
          data,
        );
        data.table.rows = [];
      }
      return data.table;
    } catch (e) {
      console.error(
        `Error parsing JSON for ${sheetNameForError}:`,
        e,
        "JSON String:",
        jsonString.substring(0, 500),
      );
      throw new Error(
        `Failed to parse JSON response from Google Sheets for ${sheetNameForError}. Error: ${e.message}`,
      );
    }
  }, []);

  const fetchVendorOptions = useCallback(async () => {
    try {
      const masterData = await fetchMasterData();
      setVendorOptions(masterData.vendorOptions);
    } catch (error) {
      console.error("Error fetching vendor options:", error);
    }
  }, []);

  const numericOrNull = (value) =>
    value === "" || value === null || value === undefined
      ? null
      : parseFloat(value);

  useEffect(() => {
    const loadMaster = async () => {
      try {
        const data = await fetchMasterData();
        setMasterDetails(data);
        if (data.vendorOptions) setVendorOptions(data.vendorOptions);
      } catch (error) {
        console.error("Error fetching master data:", error);
      }
    };
    loadMaster();
  }, []);

  const generatePoNumber = useCallback((allPOs) => {
    const prefix = "PMMPL/PO/25-26/";
    if (!allPOs || allPOs.length === 0) return `${prefix}1`;
    const maxNumber = 2554;
    return `${prefix}${maxNumber + 1}`;
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setPaymentLoading(true);
    setError(null);
    setPaymentError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("INDENT-PO")
        .select("*")
        .not("Planned2", "is", null);

      if (fetchError) throw fetchError;

      let processedData = data.map((row) => {
        const rowData = {
          ...row,
          id: row["Indent Id."],
          firmName: row["Firm Name"],
          vendorName: row["Vendor"],
          rawMaterialName: row["Material"],
          typeOfIndent: row["Priority"],
          approvedQty: row["Approved Qty"],
          planned: String(row["Planned2"] || "").replace("T", " "),
          poTimestamp: String(row["Actual2"] || "").replace("T", " "),
          indentId: row["Indent Id."],
          quantity: row["Total Quantity"] || row["Quantity"],
          totalAmount: row["Total Amount"],
          alumina: row["Alumina %"],
          iron: row["Iron %"],
          ap: row["AP Percent Age %"],
          bd: row["BD Percent Age %"],
          sio2: row["SiO2 %"],
          cao: row["CaO %"],
          fineness: row["Fineness"],
          packaging: row["Packaging"],
          poFile: row["PO Copy"],
          createdAt: String(row["Actual2"] || "").replace("T", " "),
          haveToPO: row["Have To Make PO"],
          rate: row["Rate"],
          approvedRate: row["Approved Rate"],
          leadTimeToLift: row["Lead Time To Lift (days)"]
            ? String(row["Lead Time To Lift (days)"]).split("T")[0]
            : "",
          notes: row["PO Notes"],
          advanceToBePaid: row["Advance To Be Paid"],
          toBePaidAmount: row["To Be Paid Amount"],
          whenToBePaid: row["When To Be Paid Amount"],
          status5: row["Status5"],
          originalQuantity: row["Quantity"],
          indentNotes: row["Notes"],
          quotationNumber: row["Quotation Number 1"] || "",
          quotationDate: row["Quotation Date 1"] || "",
        };

        rowData.paymentStatus = row["Status5"];

        return rowData;
      });

      if (user?.firmName && user.firmName.toLowerCase() !== "all") {
        const userFirmNameLower = user.firmName.toLowerCase();
        processedData = processedData.filter(
          (item) =>
            (item.firmName || "").toLowerCase().trim() === userFirmNameLower,
        );
      }

      const indentsForApproval = processedData.filter(
        (item) => item.planned && !item.poTimestamp,
      );

      const groupedIndents = indentsForApproval.reduce((acc, indent) => {
        const vendor = indent.vendorName || "Unknown Vendor";
        if (!acc[vendor]) {
          acc[vendor] = [];
        }
        acc[vendor].push(indent);
        return acc;
      }, {});

      const vendorGroupedIndents = Object.entries(groupedIndents).map(
        ([vendor, indents]) => ({
          vendorName: vendor,
          indents,
          totalItems: indents.length,
          totalQuantity: indents.reduce(
            (sum, indent) => sum + (parseFloat(indent.approvedQty) || 0),
            0,
          ),
          totalAmount: indents.reduce(
            (sum, indent) =>
              sum +
              (parseFloat(indent.approvedQty) || 0) *
                (parseFloat(indent.approvedRate) || 0),
            0,
          ),
        }),
      );

      const poHistory = processedData
        .filter((item) => item.planned && item.poTimestamp)
        .sort((a, b) => new Date(b.poTimestamp) - new Date(a.poTimestamp));

      const advancePaymentNeeded = processedData.filter(
        (item) => (item.advanceToBePaid || "").toLowerCase() === "yes",
      );

      setIndents(vendorGroupedIndents);
      setFilteredIndents(vendorGroupedIndents);
      setPurchaseOrders(poHistory);
      setIndentData(advancePaymentNeeded);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data: " + err.message);
      setPaymentError("Failed to load payment data: " + err.message);
      toast.error("Data Load Error", { description: err.message });
    } finally {
      setLoading(false);
      setPaymentLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    let filtered = indents;

    if (filters.vendorName !== "all") {
      filtered = filtered.filter(
        (group) => group.vendorName === filters.vendorName,
      );
    }
    if (filters.rawMaterialName !== "all") {
      filtered = filtered.filter((group) =>
        group.indents.some(
          (indent) => indent.rawMaterialName === filters.rawMaterialName,
        ),
      );
    }
    if (filters.firmName !== "all") {
      filtered = filtered.filter((group) =>
        group.indents.some((indent) => indent.firmName === filters.firmName),
      );
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (group) =>
          group.vendorName.toLowerCase().includes(query) ||
          group.indents.some(
            (indent) =>
              indent.id.toLowerCase().includes(query) ||
              indent.rawMaterialName.toLowerCase().includes(query) ||
              indent.firmName.toLowerCase().includes(query),
          ),
      );
    }

    setFilteredIndents(filtered);
  }, [indents, filters, searchQuery]);

  useEffect(() => {
    updateCount("generate-po", indents.length);
  }, [indents, updateCount]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newFormData = { ...prev, [name]: value };
      if (name === "rate" || name === "totalQty") {
        const rate = parseFloat(newFormData.rate) || 0;
        const totalQty = parseFloat(newFormData.totalQty) || 0;
        newFormData.totalAmount = (rate * totalQty).toFixed(2);
      }
      return newFormData;
    });
    setPoErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleItemSpecChange = (index, field, value) => {
    setItemSpecs((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    if (poErrors.itemSpecs) {
      setPoErrors((prev) => ({ ...prev, itemSpecs: null }));
    }
  };

  // NEW: Apply specs from one item to all items
  const applySpecsToAll = (index) => {
    const sourceSpec = itemSpecs[index];
    if (!sourceSpec) return;

    setItemSpecs((prev) =>
      prev.map((spec) => ({
        ...spec,
        alumina: sourceSpec.alumina,
        iron: sourceSpec.iron,
        sio2: sourceSpec.sio2,
        cao: sourceSpec.cao,
        ap: sourceSpec.ap,
        bd: sourceSpec.bd,
        fineness: sourceSpec.fineness,
        packaging: sourceSpec.packaging,
      })),
    );
    toast.success("Applied", {
      description: "Chemical specs copied to all items",
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({
        ...formData,
        poFile: file,
      });
      toast.info("File Selected", { description: file.name });
      setPoErrors((prev) => ({ ...prev, poFile: null }));
    }
  };

  const uploadFileToSupabase = async (file) => {
    toast.loading("Uploading file...", { id: "upload-toast" });

    try {
      console.log(
        "Uploading file:",
        file.name,
        "Size:",
        file.size,
        "Type:",
        file.type,
      );

      const { url } = await uploadFileToStorage(file, "image", "po-files");

      toast.success("File Uploaded!", {
        id: "upload-toast",
        description: `${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB) uploaded successfully.`,
      });

      console.log("Upload successful, URL:", url);
      return url;
    } catch (error) {
      console.error("Error uploading file to Supabase Storage:", error);

      toast.error("Upload Failed", {
        id: "upload-toast",
        description: error.message || "Failed to upload file",
      });
      throw error;
    }
  };

  const updateSupabase = async (dataToSubmit, currentHaveToPO) => {
    toast.loading("Updating Supabase...", { id: "supabase-update-toast" });
    try {
      if (!selectedVendorGroup) {
        throw new Error(
          "Selected vendor group details are missing for update.",
        );
      }

      const now = new Date();
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");

      const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

      const updates = {
        Actual2: timestamp,
        "Have To Make PO": currentHaveToPO,
      };

      if (currentHaveToPO === "yes") {
        updates["Vendor name"] = dataToSubmit.vendorName;
        updates["Rate"] = parseFloat(dataToSubmit.rate);
        updates["Lead Time To Lift (days)"] = dataToSubmit.leadTimeToLift
          ? `${dataToSubmit.leadTimeToLift} ${hours}:${minutes}:${seconds}`
          : null;
        updates["Total Quantity"] = parseFloat(dataToSubmit.totalQty);
        updates["Total Amount"] = parseFloat(dataToSubmit.totalAmount);
        if (dataToSubmit.poFileUrl) {
          updates["PO Copy"] = dataToSubmit.poFileUrl;
        }
        updates["Advance To Be Paid"] =
          dataToSubmit.advanceToBePaid === "yes"
            ? "Yes"
            : dataToSubmit.advanceToBePaid;
        if (dataToSubmit.advanceToBePaid === "yes") {
          updates["To Be Paid Amount"] = parseFloat(
            dataToSubmit.toBePaidAmount,
          );
          updates["When To Be Paid Amount"] = dataToSubmit.whenToBePaid
            ? `${dataToSubmit.whenToBePaid} ${hours}:${minutes}:${seconds}`
            : null;
          updates["Status5"] = "Pending";
        } else {
          updates["To Be Paid Amount"] = null;
          updates["When To Be Paid Amount"] = null;
        }
        updates["PO Notes"] = dataToSubmit.notes;
        updates["Packaging"] = dataToSubmit.packaging;
        updates["Transport Type"] = dataToSubmit.transportType;

        // CLEANED: Build PO Items with clean specs structure
        const poItemsWithSpecs = selectedVendorGroup.indents.map(
          (indent, idx) => {
            const spec = itemSpecs[idx] || {};

            // Create clean specs object with only chemical values
            const cleanSpecs = Object.fromEntries(
              Object.entries({
                alumina: spec.alumina,
                iron: spec.iron,
                sio2: spec.sio2,
                cao: spec.cao,
                ap: spec.ap,
                bd: spec.bd,
                fineness: spec.fineness,
                packaging: dataToSubmit.packaging || indent.packaging,
              }).filter(([_, v]) => v !== "" && v !== null && v !== undefined),
            );

            return {
              indentId: indent.id,
              material: indent.rawMaterialName,
              quantity: indent.approvedQty,
              rate: indent.approvedRate || indent.rate,
              specs: cleanSpecs, // Only chemical specs, no duplicate fields
            };
          },
        );

        updates["PO Items"] = poItemsWithSpecs;

        // REMOVED: Individual chemical field updates
      } else {
        updates["Rate"] = null;
        updates["Lead Time To Lift (days)"] = null;
        updates["Total Quantity"] = null;
        updates["Total Amount"] = null;
        updates["PO Copy"] = null;
        updates["Advance To Be Paid"] = null;
        updates["To Be Paid Amount"] = null;
        updates["When To Be Paid Amount"] = null;
        updates["PO Notes"] = null;
        updates["Packaging"] = null;
        updates["PO Items"] = null;
      }

      for (const indent of selectedVendorGroup.indents) {
        const { error: updateError } = await supabase
          .from("INDENT-PO")
          .update(updates)
          .eq('"Indent Id."', indent.id);

        if (updateError) throw updateError;
      }

      toast.success("Supabase Updated!", {
        id: "supabase-update-toast",
        description: `Vendor ${selectedVendorGroup.vendorName} PO processed for ${selectedVendorGroup.indents.length} indents.`,
      });
    } catch (error) {
      console.error("Error updating Supabase:", error);
      toast.error("Supabase Update Failed", {
        id: "supabase-update-toast",
        description: error.message,
      });
      throw error;
    }
  };

  const handleHaveToPOChange = (value) => {
    setHaveToPO(value);
    if (value !== "yes") {
      setFormData((prev) => ({
        ...prev,
        vendorName: selectedVendorGroup?.vendorName || "",
        rate: "",
        leadTimeToLift: "",
        totalQty: selectedVendorGroup?.totalQuantity || "",
        totalAmount: "",
        advanceToBePaid: "",
        toBePaidAmount: "",
        whenToBePaid: "",
        notes: "",
        poFile: null,
        packaging: "",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        vendorName: selectedVendorGroup?.vendorName || "",
        totalQty: selectedVendorGroup?.totalQuantity || "",
      }));
    }
    setPoErrors({});
  };

  const handleVendorGroupSelect = (vendorGroup) => {
    const nextPoNumber = generatePoNumber(purchaseOrders);

    // CLEANED: Initialize itemSpecs with clean structure
    const initialItemSpecs = vendorGroup.indents.map((indent) => ({
      alumina: indent.alumina || "",
      iron: indent.iron || "",
      sio2: indent.sio2 || "",
      cao: indent.cao || "",
      ap: indent.ap || "",
      bd: indent.bd || "",
      fineness: indent.fineness || "",
      packaging: indent.packaging || "",
    }));

    setItemSpecs(initialItemSpecs);

    setSelectedVendorGroup(vendorGroup);
    setFormData({
      indentId: vendorGroup.indents.map((i) => i.id).join(", "),
      vendorName: vendorGroup.vendorName,
      quantity: vendorGroup.totalQuantity,
      rate:
        vendorGroup.indents[0]?.approvedRate ||
        vendorGroup.indents[0]?.rate ||
        "",
      leadTimeToLift: vendorGroup.indents[0]?.leadTimeToLift || "",
      totalQty: vendorGroup.totalQuantity,
      totalAmount: vendorGroup.totalAmount,
      advanceToBePaid: "",
      toBePaidAmount: "",
      whenToBePaid: "",
      notes: "",
      poFile: null,
      packaging: vendorGroup.indents[0]?.packaging || "",
      poNumber: nextPoNumber,
      poDate: new Date().toISOString().split("T")[0],
      quotationNumber: vendorGroup.indents[0]?.quotationNumber || "",
      quotationDate:
        vendorGroup.indents[0]?.quotationDate ||
        new Date().toISOString().split("T")[0],
      ourEnqNo: "",
      enquiryDate: new Date().toISOString().split("T")[0],
      deliveryDate: new Date().toISOString().split("T")[0],
      deliveryDays: 7,
      paymentTerms: "1 DAY",
      gstPercent: 18,
      discountPercent: 0,
      terms: [
        "Price is ex factory",
        "Subject to Raipur Jurisdiction",
        "Payment: 1 Day",
      ],
      destination: vendorGroup.indents[0]?.firmName || "",
      transportType: "",
    });
    setPoErrors({});
    setHaveToPO("yes");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setPoErrors({});
    setHaveToPO("");
    setSelectedVendorGroup(null);
    setItemSpecs([]); // NEW: Reset item specs
    setFormData({
      indentId: "",
      vendorName: "",
      quantity: "",
      rate: "",
      leadTimeToLift: "",
      totalQty: "",
      totalAmount: "",
      advanceToBePaid: "",
      toBePaidAmount: "",
      whenToBePaid: "",
      notes: "",
      poFile: null,
      packaging: "",
      poNumber: "",
      poDate: new Date().toISOString().split("T")[0],
      quotationNumber: "",
      quotationDate: new Date().toISOString().split("T")[0],
      ourEnqNo: "",
      enquiryDate: new Date().toISOString().split("T")[0],
      deliveryDate: new Date().toISOString().split("T")[0],
      deliveryDays: "",
      paymentTerms: "1 DAY",
      gstPercent: 18,
      discountPercent: 0,
      terms: [
        "Price is ex factory",
        "Subject to Raipur Jurisdiction",
        "Payment: 1 Day",
      ],
      destination: "",
      transportType: "",
    });
  };

  const validatePoForm = () => {
    const newErrors = {};
    if (haveToPO === "yes") {
      if (!formData.vendorName.trim())
        newErrors.vendorName = "Vendor name is required.";
      if (
        !formData.rate ||
        isNaN(parseFloat(formData.rate)) ||
        parseFloat(formData.rate) <= 0
      )
        newErrors.rate = "Rate must be a positive number.";
      if (!formData.poNumber || !formData.poNumber.trim())
        newErrors.poNumber = "PO Number is required.";
      if (!formData.poDate) newErrors.poDate = "PO Date is required.";
      if (!formData.deliveryDate)
        newErrors.deliveryDate = "Delivery Date is required.";
      if (!formData.leadTimeToLift)
        newErrors.leadTimeToLift = "Lead Time date is required.";

      if (
        formData.gstPercent !== "" &&
        (isNaN(parseFloat(formData.gstPercent)) ||
          parseFloat(formData.gstPercent) < 0)
      )
        newErrors.gstPercent = "GST % must be a non-negative number.";
      if (
        formData.discountPercent !== "" &&
        (isNaN(parseFloat(formData.discountPercent)) ||
          parseFloat(formData.discountPercent) < 0)
      )
        newErrors.discountPercent = "Discount % must be a non-negative number.";

      if (!formData.advanceToBePaid)
        newErrors.advanceToBePaid = "Advance option is required.";
      if (formData.poFile && formData.poFile.size <= 0)
        newErrors.poFile = "PO Copy must be a valid file if provided.";
      if (!formData.notes || !formData.notes.trim())
        newErrors.notes = "PO Notes/Remarks are required.";
      if (!formData.transportType)
        newErrors.transportType = "Transport Type is required.";
      if (formData.advanceToBePaid === "yes") {
        if (
          !formData.toBePaidAmount ||
          isNaN(parseFloat(formData.toBePaidAmount)) ||
          parseFloat(formData.toBePaidAmount) <= 0
        )
          newErrors.toBePaidAmount =
            "Advance amount must be a positive number.";
        if (!formData.whenToBePaid)
          newErrors.whenToBePaid = "Payment date is required.";
      }
    }
    setPoErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!haveToPO) {
      toast.error("Selection Required", {
        description: "Please select if you need to generate a PO (Yes/No).",
      });
      setPoErrors((prev) => ({
        ...prev,
        haveToPO: "This selection is mandatory.",
      }));
      return;
    }

    if (haveToPO === "yes" && !validatePoForm()) {
      toast.error("Validation Error", {
        description: "Please fill all required PO fields.",
      });
      return;
    }
    if (!selectedVendorGroup) {
      toast.error("Selection Error", { description: "No indent selected." });
      return;
    }

    setIsSubmitting(true);
    toast.loading("Generating and Uploading PO...", { id: "po-submit" });

    try {
      const rateNum = parseFloat(formData.rate || 0);
      const qtyNum = parseFloat(formData.totalQty || 0);
      const gstPercentNum = parseFloat(formData.gstPercent || 0);
      const discountPercentNum = parseFloat(formData.discountPercent || 0);

      const subtotal = rateNum * qtyNum;
      const discount = (subtotal * discountPercentNum) / 100;
      const amountAfterDiscount = subtotal - discount;
      const gstAmount = (amountAfterDiscount * gstPercentNum) / 100;
      const grandTotal = amountAfterDiscount + gstAmount;

      // NEW: Build items with per-item specs for PDF
      // In handleSubmit function, update the pdfItems mapping:
      // Build items with specs for PDF
      const pdfItems = selectedVendorGroup.indents.map((indent, idx) => ({
        product: indent.rawMaterialName,
        quantity: parseFloat(indent.approvedQty),
        unit: "MT",
        rate: parseFloat(indent.approvedRate || indent.rate),
        amount:
          parseFloat(indent.approvedQty) *
          parseFloat(indent.approvedRate || indent.rate),
        specs: {
          alumina: itemSpecs[idx]?.alumina || "",
          iron: itemSpecs[idx]?.iron || "",
          sio2: itemSpecs[idx]?.sio2 || "",
          cao: itemSpecs[idx]?.cao || "",
          ap: itemSpecs[idx]?.ap || "",
          bd: itemSpecs[idx]?.bd || "",
          fineness: itemSpecs[idx]?.fineness || "",
          packaging: formData.packaging || indent.packaging || "", // Add packaging to specs
        },
      }));
      const pdfProps = {
        companyName: "Passary Minerals Madhya Pvt Ltd",
        companyPhone: "771-4001598",
        companyGstin: "22AAHCP9274B1ZI",
        companyPan: "AAHCP9274B",
        companyAddress: "Kh No 297/2, Akoli, Block Dharsiwa, Raipur",
        billingAddress: "Kh No 297/2, Akoli, Block Dharsiwa, Raipur",
        destinationAddress: formData.destination || "Destination",
        supplierName: formData.vendorName || "Supplier",
        supplierAddress: selectedVendorGroup?.indents[0]?.supplierAddress || "",
        supplierGstin: selectedVendorGroup?.indents[0]?.supplierGstin || "",
        orderNumber: formData.poNumber,
        orderDate: formData.poDate,
        deliveryDate: formData.deliveryDate,
        notes: formData.notes || "",
        items: pdfItems,
        totalQuantity: qtyNum,
        totalAmount: subtotal,
        gstAmount: gstAmount,
        grandTotal: grandTotal,
        gstPercent: gstPercentNum,
        discountPercent: discountPercentNum,
        terms: formData.terms || [],
        paymentTerms: formData.paymentTerms || "1 DAY",
        labDetails: {
          packaging: formData.packaging,
        },
      };

      const blob = await pdf(<POPdf {...pdfProps} />).toBlob();
      const generatedFile = new File(
        [blob],
        `PO-${formData.poNumber.replace(/\//g, "-")}.pdf`,
        {
          type: "application/pdf",
        },
      );

      const { url } = await uploadFileToStorage(
        generatedFile,
        "image",
        "po-files",
      );

      const dataToSubmit = {
        ...formData,
        poFileUrl: url,
      };

      await updateSupabase(dataToSubmit, haveToPO);

      toast.success("PO Processed", {
        id: "po-submit",
        description: `Purchase Order for ${selectedVendorGroup.vendorName} has been created successfully.`,
      });
      fetchAllData();
      closeModal();
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Submission Failed", {
        id: "po-submit",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
    setFilters({
      vendorName: "all",
      rawMaterialName: "all",
      firmName: "all",
    });
  };

  const handleToggleColumn = (tab, dataKey, checked) => {
    if (tab === "indent") {
      setVisibleIndentColumns((prev) => ({ ...prev, [dataKey]: checked }));
    } else if (tab === "po") {
      setVisiblePoColumns((prev) => ({ ...prev, [dataKey]: checked }));
    } else {
      setVisiblePaymentColumns((prev) => ({ ...prev, [dataKey]: checked }));
    }
  };

  const handleSelectAllColumns = (tab, columnsMeta, checked) => {
    const newVisibility = {};
    columnsMeta.forEach((col) => {
      if (col.toggleable && !col.alwaysVisible) {
        newVisibility[col.dataKey] = checked;
      }
    });
    if (tab === "indent") {
      setVisibleIndentColumns((prev) => ({ ...prev, ...newVisibility }));
    } else if (tab === "po") {
      setVisiblePoColumns((prev) => ({ ...prev, ...newVisibility }));
    } else {
      setVisiblePaymentColumns((prev) => ({ ...prev, ...newVisibility }));
    }
  };

  const handlePaymentSelect = (item) => {
    setSelectedPaymentIndent(item);
    setPaymentFormData({
      amount: item.toBePaidAmount || "",
      paymentDate: item.whenToBePaid || "",
    });
    setPaymentFormErrors({});
    setShowPaymentPopup(true);
  };

  const handleClosePaymentPopup = () => {
    setShowPaymentPopup(false);
    setSelectedPaymentIndent(null);
    setPaymentFormData({ amount: "", paymentDate: "" });
    setPaymentFormErrors({});
  };

  const handlePaymentInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentFormData((prev) => ({ ...prev, [name]: value }));
    if (paymentFormErrors[name])
      setPaymentFormErrors((prev) => ({ ...prev, [name]: null }));
  };

  const validatePaymentForm = () => {
    const newErrors = {};
    if (
      !paymentFormData.amount ||
      isNaN(paymentFormData.amount) ||
      parseFloat(paymentFormData.amount) <= 0
    )
      newErrors.amount = "A valid positive amount is required.";
    if (!paymentFormData.paymentDate)
      newErrors.paymentDate = "Payment date is required.";
    setPaymentFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!validatePaymentForm() || !selectedPaymentIndent) {
      toast.error("Validation Error", {
        description: "Please fill all required payment fields.",
      });
      return;
    }
    setIsSubmittingPayment(true);
    toast.loading("Recording payment...", { id: "payment-submit" });
    try {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");

      const { error: updateError } = await supabase
        .from("INDENT-PO")
        .update({
          "To Be Paid Amount": parseFloat(paymentFormData.amount),
          "When To Be Paid Amount": paymentFormData.paymentDate
            ? `${paymentFormData.paymentDate} ${hours}:${minutes}:${seconds}`
            : null,
        })
        .eq('"Indent Id."', selectedPaymentIndent.indentId);

      if (updateError) throw updateError;

      toast.success("Payment Recorded!", {
        id: "payment-submit",
        description: `Advance payment for Indent ID ${selectedPaymentIndent.indentId} recorded.`,
      });
      fetchAllData();
      handleClosePaymentPopup();
    } catch (error) {
      console.error("Error submitting payment:", error);
      toast.error("Submission Failed", {
        id: "payment-submit",
        description: error.message,
      });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter((item) => {
      const matchesVendor =
        filters.vendorName === "all" || item.vendorName === filters.vendorName;
      const matchesMaterial =
        filters.rawMaterialName === "all" ||
        item.rawMaterialName === filters.rawMaterialName;
      const matchesFirm =
        filters.firmName === "all" || item.firmName === filters.firmName;
      return matchesVendor && matchesMaterial && matchesFirm;
    });
  }, [purchaseOrders, filters]);

  const filteredPaymentIndents = useMemo(() => {
    return indentData.filter((item) => {
      const matchesVendor =
        filters.vendorName === "all" || item.vendorName === filters.vendorName;
      const matchesFirm =
        filters.firmName === "all" || item.firmName === filters.firmName;
      return matchesVendor && matchesFirm;
    });
  }, [indentData, filters]);

  const getTableColumns = useCallback(
    (tab) => {
      if (tab === "approve")
        return vendorGroupColumnsMeta.filter(
          (col) => visibleVendorGroupColumns[col.dataKey],
        );
      if (tab === "history")
        return allPoColumnsMeta.filter((col) => visiblePoColumns[col.dataKey]);
      if (tab === "advancePayment")
        return ADVANCE_PAYMENT_COLUMNS_META.filter(
          (col) =>
            visiblePaymentColumns[col.dataKey] &&
            col.dataKey !== "actionColumn",
        );
      return [];
    },
    [
      vendorGroupColumnsMeta,
      visibleVendorGroupColumns,
      allPoColumnsMeta,
      visiblePoColumns,
      ADVANCE_PAYMENT_COLUMNS_META,
      visiblePaymentColumns,
    ],
  );

  const renderTableSection = useCallback(
    (
      tabKey,
      title,
      description,
      data,
      columnsMeta,
      visibilityState,
      isLoading,
      hasError,
      errorMessage,
    ) => {
      const visibleCols = columnsMeta.filter(
        (col) =>
          visibilityState[col.dataKey] &&
          !(tabKey === "advancePayment" && col.dataKey === "actionColumn"),
      );

      const renderCellContent = (item, column) => {
        let value = item[column.dataKey];
        const displayValue =
          value === null || value === undefined || value === "" ? (
            <span className="text-xs text-gray-400">N/A</span>
          ) : (
            value
          );

        if (tabKey === "advancePayment" && column.dataKey === "paymentStatus") {
          const status = (item.paymentStatus || "").toLowerCase();
          let badgeClass = "bg-gray-100 text-gray-700 border-gray-200";

          if (status === "paid") {
            badgeClass = "bg-green-100 text-[#6b8e2f] border-green-200";
          } else if (status === "pending") {
            badgeClass = "bg-yellow-100 text-yellow-700 border-yellow-200";
          }

          return (
            <Badge
              variant="outline"
              className={`px-2 py-0.5 text-xs ${badgeClass}`}
            >
              {item.paymentStatus || "N/A"}
            </Badge>
          );
        }

        if (column.dataKey === "actionColumn") {
          if (tabKey === "approve") {
            return (
              <Button
                onClick={() => handleVendorGroupSelect(item)}
                size="sm"
                className="h-7 px-2.5 py-1 text-xs bg-[#7da23a] hover:bg-[#6b8e2f] text-white font-semibold"
              >
                Generate PO
              </Button>
            );
          }
          return null;
        }

        if (
          column.dataKey === "totalAmount" ||
          column.dataKey === "toBePaidAmount"
        ) {
          return displayValue !== "N/A"
            ? `₹${Number(value).toLocaleString()}`
            : displayValue;
        }
        if (column.dataKey === "totalQuantity") {
          return displayValue !== "N/A"
            ? `${Number(value).toLocaleString()} MT`
            : displayValue;
        }
        if (column.isLink) {
          return value ? (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#7da23a] hover:underline inline-flex items-center text-xs"
            >
              <LinkIcon className="w-3 h-3 mr-1" /> {column.linkText || "View"}
            </a>
          ) : (
            <span className="text-xs text-gray-400">N/A</span>
          );
        }
        if (column.dataKey === "id" || column.dataKey === "indentId") {
          return (
            <span className="font-semibold text-[#7da23a]">{displayValue}</span>
          );
        }
        return displayValue;
      };

      return (
        <div className="flex flex-col flex-1 border rounded-md">
          <div className="px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="flex items-center font-semibold text-md text-foreground">
                  {title} ({data.length})
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {description}
                </p>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs bg-white"
                  >
                    <MixerHorizontalIcon className="mr-1.5 h-3.5 w-3.5" /> View
                    Columns
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-3">
                  <div className="grid gap-2">
                    <p className="text-sm font-medium">Toggle Columns</p>
                    <div className="flex items-center justify-between mt-1 mb-2">
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() =>
                          handleSelectAllColumns(
                            tabKey === "approve"
                              ? "indent"
                              : tabKey === "history"
                                ? "po"
                                : "payment",
                            columnsMeta,
                            true,
                          )
                        }
                      >
                        Select All
                      </Button>
                      <span className="mx-1 text-gray-300">|</span>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() =>
                          handleSelectAllColumns(
                            tabKey === "approve"
                              ? "indent"
                              : tabKey === "history"
                                ? "po"
                                : "payment",
                            columnsMeta,
                            false,
                          )
                        }
                      >
                        Deselect All
                      </Button>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {columnsMeta
                        .filter((col) => col.toggleable)
                        .map((col) => (
                          <div
                            key={`toggle-${tabKey}-${col.dataKey}`}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`toggle-${tabKey}-${col.dataKey}`}
                              checked={!!visibilityState[col.dataKey]}
                              onCheckedChange={(checked) =>
                                handleToggleColumn(
                                  tabKey === "approve"
                                    ? "indent"
                                    : tabKey === "history"
                                      ? "po"
                                      : "payment",
                                  col.dataKey,
                                  Boolean(checked),
                                )
                              }
                              disabled={
                                col.alwaysVisible ||
                                (tabKey === "advancePayment" &&
                                  col.dataKey === "actionColumn")
                              }
                            />
                            <Label
                              htmlFor={`toggle-${tabKey}-${col.dataKey}`}
                              className="text-xs font-normal cursor-pointer"
                            >
                              {col.header}{" "}
                              {col.alwaysVisible && (
                                <span className="text-gray-400 ml-0.5 text-xs">
                                  (Fixed)
                                </span>
                              )}
                              {tabKey === "advancePayment" &&
                                col.dataKey === "actionColumn" && (
                                  <span className="text-gray-400 ml-0.5 text-xs">
                                    (Removed)
                                  </span>
                                )}
                            </Label>
                          </div>
                        ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex flex-col flex-1">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center flex-1 py-10">
                <Loader2 className="h-8 w-8 text-[#7da23a] animate-spin mb-3" />
                <p className="ml-2 text-muted-foreground">Loading...</p>
              </div>
            ) : hasError ? (
              <div className="flex flex-col items-center justify-center flex-1 px-4 py-10 mx-4 my-4 text-center border-2 border-dashed rounded-lg border-destructive-foreground bg-destructive/10">
                <AlertTriangle className="w-10 h-10 mb-3 text-destructive" />
                <p className="font-medium text-destructive">
                  Error Loading Data
                </p>
                <p className="max-w-md text-sm text-muted-foreground">
                  {errorMessage}
                </p>
              </div>
            ) : data.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 px-4 py-10 mx-4 my-4 text-center border-2 border-dashed rounded-lg border-green-200/50 bg-green-50/50">
                <Info className="w-12 h-12 mb-3 text-green-500" />
                <p className="font-medium text-foreground">No Data Found</p>
                <p className="text-sm text-center text-muted-foreground">
                  {tabKey === "approve" &&
                    "No approved indents found for PO generation."}
                  {tabKey === "history" &&
                    "No purchase orders have been generated yet."}
                  {tabKey === "advancePayment" &&
                    "No items require advance payment."}
                  {user?.firmName && user.firmName.toLowerCase() !== "all" && (
                    <span className="block mt-1">
                      (Filtered by firm: {user.firmName})
                    </span>
                  )}
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-muted/50">
                    <TableRow>
                      {visibleCols.map((col) => (
                        <TableHead
                          key={col.dataKey}
                          className="px-3 py-2 text-xs whitespace-nowrap"
                        >
                          {col.header}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((item, index) => (
                      <TableRow
                        key={
                          item.vendorName || item.id || item.indentId || index
                        }
                        className="hover:bg-green-50/50"
                      >
                        {visibleCols.map((column) => (
                          <TableCell
                            key={column.dataKey}
                            className={`whitespace-nowrap text-xs px-3 py-2 ${column.dataKey === "id" || column.dataKey === "indentId" ? "font-medium text-primary" : "text-gray-700"}`}
                          >
                            {renderCellContent(item, column)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      );
    },
    [
      handleVendorGroupSelect,
      handlePaymentSelect,
      handleToggleColumn,
      handleSelectAllColumns,
    ],
  );

  const quickStats = (
    <div className="flex gap-3 mb-2 text-xs text-gray-600">
      <span>Pending: {filteredIndents.length}</span>
      <span>POs: {filteredPOs.length}</span>
      <span>Payments: {filteredPaymentIndents.length}</span>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-screen p-4 space-y-4 md:p-6 bg-slate-50">
      <div className="px-4 py-2 bg-white border-b border-gray-200 rounded-t-md">
        <div className="flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-[#7da23a]" />
          <h1 className="text-lg font-semibold text-gray-700">
            Purchase Management
          </h1>
          {user?.firmName && user.firmName.toLowerCase() !== "all" && (
            <span className="ml-2 text-[#7da23a] font-medium text-sm">
              • Filtered by: {user.firmName}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage approved indents, generate purchase orders, and record advance
          payments.
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col flex-1"
      >
        <TabsList className="sticky top-0 z-20 flex h-auto gap-2 p-0 mb-2 bg-transparent bg-white">
          <TabsTrigger value="approve" className="h-8 px-3 text-xs">
            Approve
            <Badge className="ml-1 text-[10px] px-1 py-0">
              {filteredIndents.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="history" className="h-8 px-3 text-xs">
            History
          </TabsTrigger>
          <TabsTrigger value="advancePayment" className="h-8 px-3 text-xs">
            Payments
          </TabsTrigger>
        </TabsList>

        {quickStats}

        <div className="mb-2">
          <div className="relative">
            <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
            <Input
              className="h-8 text-xs pl-9"
              placeholder="Search vendor, material, indent ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="mb-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="h-8 text-xs"
            >
              <Filter className="w-3 h-3 mr-1" />
              Filters
            </Button>
            {showFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-xs"
              >
                Clear
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="p-3 mt-2 border rounded-md bg-green-50/40">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <Label className="block mb-1 text-xs">Vendor Name</Label>
                  <SearchableSelect
                    value={filters.vendorName}
                    onValueChange={(value) =>
                      handleFilterChange("vendorName", value)
                    }
                    options={vendorOptions}
                    placeholder="Vendors"
                    className="h-9"
                  />
                </div>

                {activeTab !== "advancePayment" && (
                  <div>
                    <Label className="block mb-1 text-xs">Material Name</Label>
                    <SearchableSelect
                      value={filters.rawMaterialName}
                      onValueChange={(value) =>
                        handleFilterChange("rawMaterialName", value)
                      }
                      options={materialOptions}
                      placeholder="Materials"
                      className="h-9"
                    />
                  </div>
                )}

                <div>
                  <Label className="block mb-1 text-xs">Firm Name</Label>
                  <SearchableSelect
                    value={filters.firmName}
                    onValueChange={(value) =>
                      handleFilterChange("firmName", value)
                    }
                    options={firmOptions}
                    placeholder="Firms"
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <TabsContent value="approve" className="flex flex-col flex-1 mt-0">
          {renderTableSection(
            "approve",
            "Approved Vendor Groups (Ready for PO)",
            "Select a vendor group to generate its purchase order.",
            filteredIndents,
            vendorGroupColumnsMeta,
            visibleVendorGroupColumns,
            loading,
            !!error,
            error,
          )}
        </TabsContent>
        <TabsContent value="history" className="flex flex-col flex-1 mt-0">
          {renderTableSection(
            "history",
            "Purchase Order History",
            "View all generated purchase orders.",
            filteredPOs,
            allPoColumnsMeta,
            visiblePoColumns,
            loading,
            !!error,
            error,
          )}
        </TabsContent>
        <TabsContent
          value="advancePayment"
          className="flex flex-col flex-1 mt-0"
        >
          {renderTableSection(
            "advancePayment",
            "Advance Payments Needed",
            "Record advance payments for approved indents.",
            filteredPaymentIndents,
            ADVANCE_PAYMENT_COLUMNS_META,
            visiblePaymentColumns,
            paymentLoading,
            !!paymentError,
            paymentError,
          )}
        </TabsContent>
      </Tabs>

      {/* PO Modal with Per-Item Specs */}
      {isModalOpen && (
        <Dialog open={isModalOpen} onOpenChange={closeModal}>
          <DialogContent className="sm:max-w-5xl md:max-w-6xl lg:max-w-7xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-4 mb-4 border-b">
              <DialogTitle className="flex items-center text-lg font-medium leading-6 text-gray-900">
                <FileCheck className="h-6 w-6 text-[#7da23a] mr-3" /> Generate
                PO for Vendor:{" "}
                <span className="font-bold text-[#7da23a] ml-1">
                  {selectedVendorGroup?.vendorName}
                </span>
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-gray-500">
                Items: {selectedVendorGroup?.indents.length} | Total Quantity:{" "}
                {selectedVendorGroup?.totalQuantity} MT | Total Amount: ₹
                {selectedVendorGroup?.totalAmount.toLocaleString()}
              </DialogDescription>
            </DialogHeader>
            <div className="px-0 py-2 sm:px-0">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4">
                  <div>
                    <Label
                      htmlFor="poNumber"
                      className="text-xs font-medium text-gray-700"
                    >
                      PO Number
                    </Label>
                    <Input
                      id="poNumber"
                      name="poNumber"
                      value={formData.poNumber}
                      onChange={handleInputChange}
                      className="h-8 mt-1 text-xs"
                    />
                    {poErrors.poNumber && (
                      <p className="text-[10px] text-red-500 mt-0.5">
                        {poErrors.poNumber}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label
                      htmlFor="poDate"
                      className="text-xs font-medium text-gray-700"
                    >
                      PO Date
                    </Label>
                    <Input
                      type="date"
                      id="poDate"
                      name="poDate"
                      value={formData.poDate}
                      onChange={handleInputChange}
                      className="h-8 mt-1 text-xs"
                    />
                    {poErrors.poDate && (
                      <p className="text-[10px] text-red-500 mt-0.5">
                        {poErrors.poDate}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label
                      htmlFor="vendorName"
                      className="text-xs font-medium text-gray-700"
                    >
                      Vendor
                    </Label>
                    <Input
                      id="vendorName"
                      value={formData.vendorName}
                      readOnly
                      className="h-8 mt-1 text-xs bg-gray-50"
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="quotationNumber"
                      className="text-xs font-medium text-gray-700"
                    >
                      Quotation No
                    </Label>
                    <Input
                      id="quotationNumber"
                      name="quotationNumber"
                      value={formData.quotationNumber}
                      readOnly
                      className="h-8 mt-1 text-xs bg-gray-50"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="quotationDate"
                      className="text-xs font-medium text-gray-700"
                    >
                      Quotation Date
                    </Label>
                    <Input
                      type="date"
                      id="quotationDate"
                      name="quotationDate"
                      value={formData.quotationDate}
                      readOnly
                      className="h-8 mt-1 text-xs bg-gray-50"
                    />
                  </div>
                   <div>
                    <Label
                      htmlFor="destination"
                      className="text-xs font-medium text-gray-700"
                    >
                      Destination
                    </Label>
                    <Input
                      id="destination"
                      name="destination"
                      value={formData.destination}
                      onChange={handleInputChange}
                      className="h-8 mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-700">
                      Transport Type <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.transportType}
                      onValueChange={(val) => {
                        setFormData((prev) => ({
                          ...prev,
                          transportType: val,
                        }));
                        setPoErrors((prev) => ({ ...prev, transportType: null }));
                      }}
                    >
                      <SelectTrigger
                        className={`h-8 mt-1 text-xs ${poErrors.transportType ? "border-red-500" : ""}`}
                      >
                        <SelectValue placeholder="Select Type..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EX Factory">EX Factory</SelectItem>
                        <SelectItem value="FOR">FOR</SelectItem>
                      </SelectContent>
                    </Select>
                    {poErrors.transportType && (
                      <p className="text-[10px] text-red-500 mt-0.5">
                        {poErrors.transportType}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label
                      htmlFor="totalQty"
                      className="text-xs font-medium text-gray-700"
                    >
                      Quantity (MT)
                    </Label>
                    <Input
                      type="number"
                      id="totalQty"
                      name="totalQty"
                      value={formData.totalQty}
                      readOnly
                      className="h-8 mt-1 text-xs bg-gray-50"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="rate"
                      className="text-xs font-medium text-gray-700"
                    >
                      Rate
                    </Label>
                    <Input
                      type="number"
                      id="rate"
                      name="rate"
                      value={formData.rate}
                      onChange={handleInputChange}
                      readOnly
                      className="h-8 mt-1 text-xs bg-gray-50"
                    />
                    {poErrors.rate && (
                      <p className="text-[10px] text-red-500 mt-0.5">
                        {poErrors.rate}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label
                      htmlFor="totalAmount"
                      className="text-xs font-medium text-gray-700"
                    >
                      Subtotal
                    </Label>
                    <Input
                      value={formData.totalAmount}
                      readOnly
                      className="h-8 mt-1 text-xs bg-gray-50"
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="gstPercent"
                      className="text-xs font-medium text-gray-700"
                    >
                      GST %
                    </Label>
                    <Input
                      type="number"
                      id="gstPercent"
                      name="gstPercent"
                      value={formData.gstPercent}
                      readOnly
                      className="h-8 mt-1 text-xs bg-gray-50"
                    />
                    {poErrors.gstPercent && (
                      <p className="text-[10px] text-red-500 mt-0.5">
                        {poErrors.gstPercent}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label
                      htmlFor="discountPercent"
                      className="text-xs font-medium text-gray-700"
                    >
                      Discount %
                    </Label>
                    <Input
                      type="number"
                      id="discountPercent"
                      name="discountPercent"
                      value={formData.discountPercent}
                      onChange={handleInputChange}
                      className="h-8 mt-1 text-xs"
                    />
                    {poErrors.discountPercent && (
                      <p className="text-[10px] text-red-500 mt-0.5">
                        {poErrors.discountPercent}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label
                      htmlFor="deliveryDate"
                      className="text-xs font-medium text-gray-700"
                    >
                      Delivery Date
                    </Label>
                    <Input
                      type="date"
                      id="deliveryDate"
                      name="deliveryDate"
                      value={formData.deliveryDate}
                      onChange={handleInputChange}
                      className="h-8 mt-1 text-xs"
                    />
                    {poErrors.deliveryDate && (
                      <p className="text-[10px] text-red-500 mt-0.5">
                        {poErrors.deliveryDate}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label
                      htmlFor="leadTimeToLift"
                      className="text-xs font-medium text-gray-700"
                    >
                      Lead Time Date
                    </Label>
                    <Input
                      type="date"
                      id="leadTimeToLift"
                      name="leadTimeToLift"
                      value={formData.leadTimeToLift}
                      onChange={handleInputChange}
                      className="h-8 mt-1 text-xs"
                    />
                    {poErrors.leadTimeToLift && (
                      <p className="text-[10px] text-red-500 mt-0.5">
                        {poErrors.leadTimeToLift}
                      </p>
                    )}
                  </div>
                </div>

                {/* NEW: Per-Item Chemical Specifications Table */}
                <div className="mt-4">
                  <Label className="block mb-2 text-xs font-medium text-gray-700">
                    Material Specifications (Per Item)
                  </Label>
                  <div className="overflow-x-auto border rounded-md">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Material</th>
                          <th className="px-3 py-2 text-left">Qty (MT)</th>
                          <th className="px-3 py-2 text-left">Rate</th>
                          <th className="px-3 py-2 text-left">Alumina %</th>
                          <th className="px-3 py-2 text-left">Iron %</th>
                          <th className="px-3 py-2 text-left">SiO₂ %</th>
                          <th className="px-3 py-2 text-left">CaO %</th>
                          <th className="px-3 py-2 text-left">AP %</th>
                          <th className="px-3 py-2 text-left">BD %</th>
                          <th className="px-3 py-2 text-left">Fineness</th>
                          <th className="px-3 py-2 text-left">Packaging</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedVendorGroup?.indents.map((indent, idx) => (
                          <tr key={idx} className="border-t hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium">
                              {indent.rawMaterialName}
                            </td>
                            <td className="px-3 py-2">{indent.approvedQty}</td>
                            <td className="px-3 py-2">
                              {indent.approvedRate || indent.rate}
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                step="any"
                                value={itemSpecs[idx]?.alumina || ""}
                                readOnly
                                className={`h-7 w-24 text-xs bg-gray-50 ${poErrors[`alumina_${idx}`] ? "border-red-500" : ""}`}
                                placeholder=""
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                step="any"
                                value={itemSpecs[idx]?.iron || ""}
                                readOnly
                                className={`h-7 w-24 text-xs bg-gray-50 ${poErrors[`iron_${idx}`] ? "border-red-500" : ""}`}
                                placeholder=""
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                step="any"
                                value={itemSpecs[idx]?.sio2 || ""}
                                readOnly
                                className={`h-7 w-24 text-xs bg-gray-50 ${poErrors[`sio2_${idx}`] ? "border-red-500" : ""}`}
                                placeholder=""
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                step="any"
                                value={itemSpecs[idx]?.cao || ""}
                                readOnly
                                className={`h-7 w-24 text-xs bg-gray-50 ${poErrors[`cao_${idx}`] ? "border-red-500" : ""}`}
                                placeholder=""
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                step="any"
                                value={itemSpecs[idx]?.ap || ""}
                                readOnly
                                className={`h-7 w-24 text-xs bg-gray-50 ${poErrors[`ap_${idx}`] ? "border-red-500" : ""}`}
                                placeholder=""
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                step="any"
                                value={itemSpecs[idx]?.bd || ""}
                                readOnly
                                className={`h-7 w-24 text-xs bg-gray-50 ${poErrors[`bd_${idx}`] ? "border-red-500" : ""}`}
                                placeholder=""
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                step="any"
                                value={itemSpecs[idx]?.fineness || ""}
                                readOnly
                                className={`h-7 w-24 text-xs bg-gray-50 ${poErrors[`fineness_${idx}`] ? "border-red-500" : ""}`}
                                placeholder=""
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                value={itemSpecs[idx]?.packaging || ""}
                                readOnly
                                className="w-24 text-xs h-7 bg-gray-50"
                                placeholder="Type"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <Label className="text-xs font-medium text-gray-700">
                      Advance To Be Paid?
                    </Label>
                    <Select
                      value={formData.advanceToBePaid}
                      onValueChange={(val) =>
                        setFormData((prev) => ({
                          ...prev,
                          advanceToBePaid: val,
                        }))
                      }
                    >
                      <SelectTrigger className="h-8 mt-1 text-xs">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                    {poErrors.advanceToBePaid && (
                      <p className="text-[10px] text-red-500 mt-0.5">
                        {poErrors.advanceToBePaid}
                      </p>
                    )}
                  </div>
                  {formData.advanceToBePaid === "yes" && (
                    <>
                      <div>
                        <Label
                          htmlFor="toBePaidAmount"
                          className="text-xs font-medium text-gray-700"
                        >
                          Advance Amount
                        </Label>
                        <Input
                          type="number"
                          id="toBePaidAmount"
                          name="toBePaidAmount"
                          value={formData.toBePaidAmount}
                          onChange={handleInputChange}
                          className="h-8 mt-1 text-xs"
                        />
                        {poErrors.toBePaidAmount && (
                          <p className="text-[10px] text-red-500 mt-0.5">
                            {poErrors.toBePaidAmount}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label
                          htmlFor="whenToBePaid"
                          className="text-xs font-medium text-gray-700"
                        >
                          Payment Date
                        </Label>
                        <Input
                          type="date"
                          id="whenToBePaid"
                          name="whenToBePaid"
                          value={formData.whenToBePaid}
                          onChange={handleInputChange}
                          className="h-8 mt-1 text-xs"
                        />
                        {poErrors.whenToBePaid && (
                          <p className="text-[10px] text-red-500 mt-0.5">
                            {poErrors.whenToBePaid}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <Label
                    htmlFor="notes"
                    className="text-xs font-medium text-gray-700"
                  >
                    PO Notes / Description
                  </Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    rows={2}
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="mt-1 text-xs"
                    placeholder="Describe goods..."
                  />
                  {poErrors.notes && (
                    <p className="text-[10px] text-red-500 mt-0.5">
                      {poErrors.notes}
                    </p>
                  )}
                </div>

                <DialogFooter className="flex flex-col justify-end gap-2 pt-4 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      const subtotal =
                        parseFloat(formData.rate) *
                        parseFloat(formData.totalQty);
                      const discount =
                        (subtotal * parseFloat(formData.discountPercent)) / 100;
                      const amountAfterDiscount = subtotal - discount;
                      const gstAmount =
                        (amountAfterDiscount *
                          parseFloat(formData.gstPercent)) /
                        100;
                      const grandTotal = amountAfterDiscount + gstAmount;

                      // In the PDF preview button onClick handler:
                      const pdfItems = selectedVendorGroup.indents.map(
                        (indent, idx) => ({
                          product: indent.rawMaterialName,
                          quantity: parseFloat(indent.approvedQty),
                          unit: "MT",
                          rate: parseFloat(indent.approvedRate || indent.rate),
                          amount:
                            parseFloat(indent.approvedQty) *
                            parseFloat(indent.approvedRate || indent.rate),
                          specs: itemSpecs[idx] || {},
                          packaging:
                            itemSpecs[idx]?.packaging ||
                            formData.packaging ||
                            indent.packaging ||
                            "",
                        }),
                      );

                      const pdfProps = {
                        companyName: "Passary Minerals Madhya Pvt Ltd",
                        companyPhone: "771-4001598",
                        companyGstin: "22AAHCP9274B1ZI",
                        companyPan: "AAHCP9274B",
                        companyAddress:
                          "Kh No 297/2, Akoli, Block Dharsiwa, Raipur",
                        billingAddress:
                          "Kh No 297/2, Akoli, Block Dharsiwa, Raipur",
                        destinationAddress: formData.destination,
                        supplierName: formData.vendorName,
                        supplierAddress:
                          selectedVendorGroup?.indents[0]?.supplierAddress ||
                          "",
                        supplierGstin:
                          selectedVendorGroup?.indents[0]?.supplierGstin || "",
                        orderNumber: formData.poNumber,
                        orderDate: formData.poDate,
                        deliveryDate: formData.deliveryDate,
                        notes: formData.notes || "",
                        items: pdfItems,
                        totalQuantity: selectedVendorGroup.totalQuantity,
                        totalAmount: selectedVendorGroup.totalAmount,
                        gstAmount: gstAmount,
                        grandTotal: grandTotal,
                        terms: formData.terms,
                        gstPercent: parseFloat(formData.gstPercent || 0),
                        discountPercent: parseFloat(
                          formData.discountPercent || 0,
                        ),
                        paymentTerms: formData.paymentTerms || "1 DAY",
                        labDetails: {
                          packaging: formData.packaging,
                        },
                      };
                      const blob = await pdf(<POPdf {...pdfProps} />).toBlob();
                      const url = URL.createObjectURL(blob);
                      window.open(url, "_blank");
                    }}
                    className="text-xs h-9"
                  >
                    Preview PDF
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-9 text-xs bg-[#7da23a] hover:bg-[#6b8e2f]"
                  >
                    {isSubmitting ? "Generating..." : "Generate & Submit PO"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={closeModal}
                    className="text-xs h-9"
                  >
                    Cancel
                  </Button>
                </DialogFooter>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={showPaymentPopup} onOpenChange={handleClosePaymentPopup}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 mb-4 border-b">
            <DialogTitle className="flex items-center text-lg font-medium leading-6 text-gray-900">
              <Wallet className="h-6 w-6 text-[#7da23a] mr-3" /> Record Advance
              Payment
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-gray-500">
              For Indent ID:{" "}
              <span className="font-bold text-[#7da23a]">
                {selectedPaymentIndent?.indentId || "N/A"}
              </span>{" "}
              | Vendor:{" "}
              <span className="font-bold text-[#7da23a]">
                {selectedPaymentIndent?.vendorName || "N/A"}
              </span>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="px-0 py-2 space-y-4">
            <div>
              <Label
                htmlFor="amount"
                className="block text-sm font-medium text-gray-700"
              >
                Amount to be Paid <span className="text-red-500">*</span>
              </Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="any"
                value={paymentFormData.amount}
                onChange={handlePaymentInputChange}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${paymentFormErrors.amount ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 focus:border-[#6b8e2f] focus:ring-[#6b8e2f]"}`}
              />
              {paymentFormErrors.amount && (
                <p className="mt-1 text-xs text-red-500">
                  {paymentFormErrors.amount}
                </p>
              )}
            </div>
            <div>
              <Label
                htmlFor="paymentDate"
                className="block text-sm font-medium text-gray-700"
              >
                Payment Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="paymentDate"
                name="paymentDate"
                type="date"
                value={paymentFormData.paymentDate}
                onChange={handlePaymentInputChange}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${paymentFormErrors.paymentDate ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 focus:border-[#6b8e2f] focus:ring-[#6b8e2f]"}`}
              />
              {paymentFormErrors.paymentDate && (
                <p className="mt-1 text-xs text-red-500">
                  {paymentFormErrors.paymentDate}
                </p>
              )}
            </div>
            <DialogFooter className="flex flex-col gap-3 pt-5 sm:pt-6 sm:flex-row-reverse sm:gap-0 sm:justify-start">
              <Button
                type="submit"
                disabled={isSubmittingPayment}
                className={`w-full sm:w-auto inline-flex justify-center py-2.5 px-6 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white ${isSubmittingPayment ? "bg-green-400 cursor-not-allowed" : "bg-[#7da23a] hover:bg-[#6b8e2f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6b8e2f]"}`}
              >
                {isSubmittingPayment ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin my-0.5" />
                    Processing...
                  </>
                ) : (
                  "Submit Payment"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleClosePaymentPopup}
                className="w-full sm:w-auto inline-flex justify-center py-2.5 px-6 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 sm:mr-3"
              >
                Cancel
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GeneratePurchaseOrder;
