"use client";

import { useState, useEffect, useCallback, useContext, useMemo } from "react";
import {
  Truck,
  FileText,
  Loader2,
  Upload,
  X,
  History,
  FileCheck,
  AlertTriangle,
  Filter,
  ChevronsUpDown,
  Download,
  FileUp,
  Plus,
  Check,
} from "lucide-react";
import { MixerHorizontalIcon } from "@radix-ui/react-icons";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { AuthContext } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { toast } from "sonner";
import { supabase } from "../supabase";
import { fetchMasterDataForSelects } from "../utils/masterDataUtils";
import { uploadFileToStorage } from "../utils/storageUtils";
import { canViewFirm } from "../utils/firmFilter";

function formatTimestamp(timestampStr) {
  if (!timestampStr || typeof timestampStr !== "string") {
    return "N/A";
  }
  const numbers = timestampStr.match(/\d+/g);
  if (!numbers || numbers.length < 6) {
    const d = new Date(timestampStr);
    if (!isNaN(d.getTime())) {
      return d
        .toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
        .replace(",", "");
    }
    return "Invalid Date";
  }
  const date = new Date(
    parseInt(numbers[0]), // Year
    parseInt(numbers[1]) - 1, // Month (0-based)
    parseInt(numbers[2]), // Day
    parseInt(numbers[3]), // Hours
    parseInt(numbers[4]), // Minutes
    parseInt(numbers[5]), // Seconds
  );
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

const SHEET_ID = "13_sHCFkVxAzPbel-k9BuUBFY-E11vdKJAOgvzhBMLMY";
const DRIVE_FOLDER_ID = "1K3ymzKKielcDbg0j3y1qQ1UiIOPViZo7"; // Your actual folder ID
const INDENT_PO_SHEET = "INDENT-PO";
const LIFT_ACCOUNTS_SHEET = "LIFT-ACCOUNTS";
const API_URL =
  "https://script.google.com/macros/s/AKfycbylQZLstOi0LyDisD6Z6KKC97pU5YJY2dDYVw2gtnW1fxZq9kz7wHBei4aZ8Ed-XKhKEA/exec";

const DATA_START_ROW = 7; // Corrected the start row

const PO_COLUMNS_META = [
  {
    header: "Actions",
    dataKey: "actionColumn",
    toggleable: false,
    alwaysVisible: true,
  },
  {
    header: "PO Number",
    dataKey: "indentNo",
    toggleable: true,
    alwaysVisible: true,
  },
  { header: "Planned Date", dataKey: "planned", toggleable: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "Party Name", dataKey: "vendorName", toggleable: true },
  { header: "Product Name", dataKey: "rawMaterialName", toggleable: true },
  { header: "Quantity", dataKey: "quantity", toggleable: true },
  { header: "Rate", dataKey: "rate", toggleable: true },
  { header: "Alumina %", dataKey: "alumina", toggleable: true },
  { header: "Iron %", dataKey: "iron", toggleable: true },
  { header: "Received Qty", dataKey: "receivedQty", toggleable: true },
  { header: "Pending PO Qty", dataKey: "pendingPOQty", toggleable: true },
  {
    header: "Order Cancel Qty",
    dataKey: "orderCancelQty",
    toggleable: true,
    alwaysVisible: true,
  },
  { header: "Cancel Reason", dataKey: "cancelReason", toggleable: true },
  { header: "Status", dataKey: "status", toggleable: true },
  { header: "Notes", dataKey: "whatIsToBeDone", toggleable: true },
  {
    header: "DO Number",
    dataKey: "doNumber",
    toggleable: true,
  },
  {
    header: "Cancel PO",
    dataKey: "cancelAction",
    toggleable: false,
    alwaysVisible: true,
  },
];
const LIFTS_COLUMNS_META = [
  { header: "Lift ID", dataKey: "id", toggleable: true, alwaysVisible: true },
  { header: "Lifted On", dataKey: "createdAt", toggleable: true },
  { header: "Indent Number", dataKey: "indentNo", toggleable: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "Party Name", dataKey: "vendorName", toggleable: true },
  { header: "Product Name", dataKey: "material", toggleable: true },
  { header: "PO Qty", dataKey: "quantity", toggleable: true },
  { header: "Billing Quantity", dataKey: "liftingQty", toggleable: true },
  { header: "Rate", dataKey: "rate", toggleable: true },
  {
    header: "Transportation Total Amount",
    dataKey: "transportRate",
    toggleable: true,
  },
  { header: "Bill No.", dataKey: "billNo", toggleable: true },
  { header: "Truck No.", dataKey: "truckNo", toggleable: true },
  { header: "Transporter Name", dataKey: "transporterName", toggleable: true },
  {
    header: "Bill Image",
    dataKey: "billImageUrl",
    toggleable: true,
    isLink: true,
    linkText: "View Bill",
  },
  {
    header: "Total Truck Billing Quantity",
    dataKey: "additionalTruckQty",
    toggleable: true,
  },
  { header: "DO Number", dataKey: "doNumber", toggleable: true },
  { header: "Order Cancel Qty", dataKey: "orderCancelQty", toggleable: true },
  { header: "Cancel Reason", dataKey: "cancelReason", toggleable: true },
];

const createEmptyLiftForm = () => ({
  billNo: "",
  Arealifting: "",
  liftingLeadTime: "",
  truckNo: "",
  driverNo: "",
  TransporterName: "",
  rateType: "",
  rate: "",
  truckQty: "",
  biltyNo: "",
  indentNo: "",
  vendorName: "",
  material: "",
  totalQuantity: "",
  billImage: null,
  additionalTruckQty: "",
  transportRate: "",
  transportingRate: "",
  hasBilty: "no",
  biltyImage: null,
  testingCertificate: null,
});

const toNumber = (value) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundQuantity = (value) => Number(toNumber(value).toFixed(3));

const normalizeTransportRateType = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (normalized === "per mt") return "Per MT";
  if (normalized === "fixed") return "Fixed";
  return String(value || "").trim();
};

const formatMoney = (value) =>
  toNumber(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const makeLiftItemKey = (poNumber, material, uniqueId = "") => {
  const baseKey = `${String(poNumber || "").trim()}::${String(material || "").trim().toLowerCase()}`;
  return uniqueId ? `${baseKey}::${uniqueId}` : baseKey;
};

const normalizePoItems = (row, liftedQtyByItem) => {
  const poNumber = String(row.po_number || row["Indent Id."] || "").trim();
  const fallbackMaterial = String(row["Material"] || "").trim();
  const fallbackRate = toNumber(row["Rate"]);
  const fallbackQuantity = toNumber(row["Total Quantity"] || row["Quantity"]);
  const rawItems =
    Array.isArray(row["PO Items"]) && row["PO Items"].length
      ? row["PO Items"]
      : [
          {
            material: fallbackMaterial,
            quantity: fallbackQuantity,
            rate: fallbackRate,
          },
        ];

  return rawItems.map((item, index) => {
    const materialName = String(
      item.material ||
        item.productName ||
        fallbackMaterial ||
        `Product ${index + 1}`,
    ).trim();

    const aggregationKey = makeLiftItemKey(poNumber, materialName);
    const uniqueId = item.indentId || item.id || index;
    const key = makeLiftItemKey(poNumber, materialName, uniqueId);

    const maxQuantity = toNumber(item.quantity || fallbackQuantity);
    // Use the specific key if available (future proofing), otherwise fallback to aggregated material key
    const liftedQuantity = roundQuantity(
      liftedQtyByItem[key] || liftedQtyByItem[aggregationKey] || 0,
    );
    const pendingQuantity = Math.max(
      0,
      roundQuantity(maxQuantity - liftedQuantity),
    );
    const rate = toNumber(item.rate || fallbackRate);

    return {
      key,
      aggregationKey,
      index,
      material: materialName,
      maxQuantity,
      liftedQuantity,
      pendingQuantity,
      quantityToLift: pendingQuantity,
      rate,
      poRate: rate, // Store original PO rate for mismatch tracking
      totalAmount: roundQuantity(pendingQuantity * rate),
      indentId: item.indentId || "",
    };
  });
};

export default function LiftMaterial() {
  const { user } = useContext(AuthContext);
  const { updateCount } = useNotification();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [materialLifts, setMaterialLifts] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  const [selectedLiftItems, setSelectedLiftItems] = useState([]);
  const [loadingPOs, setLoadingPOs] = useState(true);
  const [loadingLifts, setLoadingLifts] = useState(true);
  const [masterDataLoading, setMasterDataLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [error, setError] = useState(null);
  const [areaOptions, setAreaOptions] = useState([]);
  const [transporterOptions, setTransporterOptions] = useState([]);
  const [typeOptions, setTypeOptions] = useState([]);
  const [rateTypeOptions, setRateTypeOptions] = useState([]);
  const [formData, setFormData] = useState(createEmptyLiftForm);

  const [formErrors, setFormErrors] = useState({});
  const [activeTab, setActiveTab] = useState("availablePOs");
  const [visiblePoColumns, setVisiblePoColumns] = useState({});
  const [visibleLiftsColumns, setVisibleLiftsColumns] = useState({});
  const [cancelPendingPO, setCancelPendingPO] = useState({
    show: false,
    poId: null,
    indentNo: "",
    cancelQuantity: "",
    reason: "",
    loading: false,
  });
  const [filters, setFilters] = useState({
    vendorName: "all",
    materialName: "all",
    liftType: "all",
    totalQuantity: "all",
    orderNumber: "all",
  });

  useEffect(() => {
    const initializeVisibility = (columnsMeta) => {
      const visibility = {};
      columnsMeta.forEach((col) => {
        visibility[col.dataKey] = col.alwaysVisible || col.toggleable;
      });
      return visibility;
    };
    setVisiblePoColumns(initializeVisibility(PO_COLUMNS_META));
    setVisibleLiftsColumns(initializeVisibility(LIFTS_COLUMNS_META));
  }, []);

  const fetchMasterData = useCallback(async () => {
    setMasterDataLoading(true);
    setError(null);
    try {
      // Fetch data from Supabase Master table
      const masterData = await fetchMasterDataForSelects();

      setAreaOptions(masterData.areaLiftingOptions);
      setTransporterOptions(masterData.transporterOptions);
      setFormData((prev) => ({
        ...prev,
        TransporterName: masterData.transporterOptions[0]?.value || "",
      }));
      setTypeOptions(masterData.typeOptions);
      setRateTypeOptions(masterData.rateTypeOptions);
    } catch (error) {
      setError(`Failed to load Master data: ${error.message}`);
      setAreaOptions([]);
      setTypeOptions([]);
      setTransporterOptions([]);
      setRateTypeOptions([]);
    } finally {
      setMasterDataLoading(false);
    }
  }, []);

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

  const fetchPurchaseOrders = useCallback(async () => {
    setLoadingPOs(true);
    setError(null);
    try {
      // Fetch POs and already-lifted entries in parallel
      const [
        { data, error: fetchError },
        { data: liftData, error: liftFetchError },
      ] = await Promise.all([
        supabase.from("INDENT-PO").select("*").not("Planned4", "is", null),
        supabase
          .from("LIFT-ACCOUNTS")
          .select('"Indent no.", "Lifting Qty", "Raw Material Name"'),
      ]);

      if (fetchError) throw fetchError;
      if (liftFetchError) throw liftFetchError;

      const indentToPoMap = {};
      (data || []).forEach((row) => {
        const indent = String(row["Indent Id."] || "").trim();
        const poNumber = String(row.po_number || indent).trim();
        if (indent) indentToPoMap[indent] = poNumber;
      });

      // Build a map: poNumber -> total lifted billing qty so far
      const liftedQtyMap = {};
      const liftedQtyByItem = {};
      (liftData || []).forEach((row) => {
        const indent = String(row["Indent no."] || "").trim();
        const poNumber = indentToPoMap[indent] || indent;
        const qty = parseFloat(row["Lifting Qty"]) || 0;
        const material = String(row["Raw Material Name"] || "").trim();
        if (poNumber)
          liftedQtyMap[poNumber] = (liftedQtyMap[poNumber] || 0) + qty;
        if (poNumber && material) {
          const itemKey = makeLiftItemKey(poNumber, material);
          liftedQtyByItem[itemKey] = (liftedQtyByItem[itemKey] || 0) + qty;
        }
      });

      // Filter: Status pending/empty, Planned4 not null.
      // Actual4 check removed – PO stays visible until pending reaches 0.
      const filteredRows = data.filter((row) => {
        const status = String(row["Status"] || "")
          .trim()
          .toLowerCase();
        const planned4 = row["Planned4"];
        const poNumber = String(
          row.po_number || row["Indent Id."] || "",
        ).trim();
        const totalQty = parseFloat(
          row["Total Quantity"] || row["Quantity"] || 0,
        );
        const liftedSoFar = liftedQtyMap[poNumber] || 0;

        // Use Pending PO Qty from DB if it exists, else calculate it
        const dbPendingPOQty = parseFloat(row["Pending PO Qty"]);
        const pendingPending = isNaN(dbPendingPOQty)
          ? totalQty - liftedSoFar
          : dbPendingPOQty;

        return (
          (status === "" || status === "pending") &&
          planned4 !== null &&
          planned4 !== "" &&
          pendingPending > 0
        );
      });

      // Update global notification count with the count of pending lifts
      const groupedRows = Object.values(
        filteredRows.reduce((acc, row) => {
          const poNumber = String(
            row.po_number || row["Indent Id."] || "",
          ).trim();
          if (!poNumber) return acc;
          if (!acc[poNumber]) {
            acc[poNumber] = { primaryRow: row, dbRowIds: [] };
          }
          acc[poNumber].dbRowIds.push(row.id);
          return acc;
        }, {}),
      );
      updateCount("lift-material", groupedRows.length);

      let formattedData = groupedRows.map(({ primaryRow: row, dbRowIds }) => {
        const poNumber = String(
          row.po_number || row["Indent Id."] || "",
        ).trim();
        const totalQty = parseFloat(
          row["Total Quantity"] || row["Quantity"] || 0,
        );
        const liftedSoFar = liftedQtyMap[poNumber] || 0;
        const dbPendingPOQty = parseFloat(row["Pending PO Qty"]);
        const items = normalizePoItems(row, liftedQtyByItem);
        const pendingQuantity = roundQuantity(
          items.length
            ? items.reduce((sum, item) => sum + item.pendingQuantity, 0)
            : isNaN(dbPendingPOQty)
              ? totalQty - liftedSoFar
              : dbPendingPOQty,
        );

        return {
          id: `PO-${row.id || Math.random().toString(36).substring(7)}`,
          indentNo: String(row["Indent Id."] || row.po_number || "").trim(),
          poNumber: String(row.po_number || row["Indent Id."] || "").trim(),
          firmName: String(row["Firm Name"] || "").trim(),
          vendorName: String(row["Vendor name"] || row["Vendor"] || "").trim(),
          rawMaterialName:
            items.length > 1
              ? `${items[0].material} +${items.length - 1} more`
              : items[0]?.material || String(row["Material"] || "").trim(),
          quantity: String(totalQty || ""),
          _rowIndex: row.id,
          dbRowIds,
          rate: String(row["Rate"] || "").trim(),
          alumina: String(row["Alumina %"] || "").trim(),
          iron: String(row["Iron %"] || "").trim(),
          transportType: String(row["Transport Type"] || "").trim(),
          transporterName: String(row["Transporter Name"] || "").trim(),
          transportRateType: normalizeTransportRateType(
            row["transpoter_rate_type"] || "",
          ),
          pendingQty: String(pendingQuantity),
          transporterRate: String(row["Transporter Rate"] || "").trim(),
          planned: row["Planned4"]
            ? String(row["Planned4"]).trim().replace("T", " ")
            : "",
          whatIsToBeDone: String(row["PO Notes"] || "").trim(),
          pendingLiftQty: String(pendingQuantity),
          receivedQty: String(liftedSoFar),
          pendingPOQty: String(pendingQuantity),
          pendingPOQty_DB: row["Pending PO Qty"], // Store DB value for logic
          orderCancelQty: String(row["Order Cancel Qty"] || "0"),
          cancelReason: String(row["Reason Of Cancel Qty"] || "").trim(),
          status: row["Status"] || "Pending",
          doNumber: String(row["Delivery Order No."] || "").trim(),
          _totalQty: totalQty,
          _liftedSoFar: liftedSoFar,
          items,
        };
      });

      if (user?.firmName) {
        formattedData = formattedData.filter((po) =>
          canViewFirm(user.firmName, po.firmName),
        );
      }

      // Sort by planned date descending (latest first)
      formattedData.sort((a, b) => {
        const dateA = new Date(a.planned).getTime();
        const dateB = new Date(b.planned).getTime();
        if (isNaN(dateA)) return 1;
        if (isNaN(dateB)) return -1;
        return dateB - dateA;
      });

      setPurchaseOrders(formattedData);
    } catch (error) {
      setError(`Failed to load PO data: ${error.message}`);
      setPurchaseOrders([]);
    } finally {
      setLoadingPOs(false);
    }
  }, [SHEET_ID, INDENT_PO_SHEET, user]);

  const fetchMaterialLifts = useCallback(async () => {
    setLoadingLifts(true);
    setError(null);
    try {
      // Fetch LIFT-ACCOUNTS and INDENT-PO Order Cancel Qty in parallel
      const [
        { data, error: fetchError },
        { data: poData, error: poFetchError },
      ] = await Promise.all([
        supabase
          .from("LIFT-ACCOUNTS")
          .select("*")
          .order("Timestamp", { ascending: false }),
        supabase
          .from("INDENT-PO")
          .select(
            'id, "Indent Id.", "Order Cancel Qty", "Reason Of Cancel Qty", po_number, "Delivery Order No."',
          ),
      ]);

      if (fetchError) throw fetchError;
      if (poFetchError) throw poFetchError;

      // Build maps: poNumber -> Cancel Data
      const cancelQtyMap = {};
      const cancelReasonMap = {};
      const doNumberMap = {};
      (poData || []).forEach((row) => {
        const poNumber = String(
          row.po_number || row["Indent Id."] || "",
        ).trim();
        if (poNumber) {
          cancelQtyMap[poNumber] = String(row["Order Cancel Qty"] || "").trim();
          cancelReasonMap[poNumber] = String(
            row["Reason Of Cancel Qty"] || "",
          ).trim();
          doNumberMap[poNumber] = String(row["Delivery Order No."] || "").trim();
        }
      });

      const indentToPoMap = (poData || []).reduce((acc, row) => {
        const indent = String(row["Indent Id."] || "").trim();
        const poNumber = String(row.po_number || indent).trim();
        if (indent) acc[indent] = poNumber;
        return acc;
      }, {});

      let formattedData = (data || []).map((row) => {
        // Format timestamp for display
        let createdAt = "";
        if (row["Timestamp"]) {
          try {
            const d = new Date(row["Timestamp"]);
            if (!isNaN(d.getTime())) {
              createdAt = d
                .toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: false,
                })
                .replace(",", "");
            }
          } catch (e) {
            createdAt = String(row["Timestamp"] || "");
          }
        }

        return {
          id: String(row["Lift No"] || "").trim(),
          indentNo:
            indentToPoMap[String(row["Indent no."] || "").trim()] ||
            String(row["Indent no."] || "").trim(),
          vendorName: String(row["Vendor Name"] || "").trim(),
          quantity: String(row["Qty"] || "").trim(),
          material: String(row["Raw Material Name"] || "").trim(),
          billNo: String(row["Bill No."] || "").trim(),
          areaName: String(row["Area lifting"] || "").trim(),
          liftingLeadTime: String(
            row["Lead Time To Reach Factory (days)"] || "",
          ).trim(),
          liftingQty: String(row["Lifting Qty"] || "").trim(),
          liftType: String(row["Type"] || "").trim(),
          transporterName: String(row["Transporter Name"] || "").trim(),
          truckNo: String(row["Truck No."] || "").trim(),
          driverNo: String(row["Driver No."] || "").trim(),
          biltyNo: String(row["Bilty No."] || "").trim(),
          rateType: String(row["Type Of Transporting Rate"] || "").trim(),
          rate: String(row["Rate"] || "").trim(),
          billImageUrl: String(row["Bill Image"] || "").trim(),
          additionalTruckQty: String(row["Truck Qty"] || "").trim(),
          createdAt: createdAt,
          firmName: String(row["Firm Name"] || "").trim(),
          transportRate: String(row["Transporter Rate"] || "").trim(),
          orderCancelQty:
            cancelQtyMap[
              indentToPoMap[String(row["Indent no."] || "").trim()] ||
                String(row["Indent no."] || "").trim()
            ] || "0",
          cancelReason:
            cancelReasonMap[
              indentToPoMap[String(row["Indent no."] || "").trim()] ||
                String(row["Indent no."] || "").trim()
            ] || "",
          doNumber:
            doNumberMap[
              indentToPoMap[String(row["Indent no."] || "").trim()] ||
                String(row["Indent no."] || "").trim()
            ] || "",
        };
      });

      // Filter by user's firm name if applicable
      if (user?.firmName) {
        formattedData = formattedData.filter((lift) =>
          canViewFirm(user.firmName, lift.firmName),
        );
      }

      setMaterialLifts(formattedData);
    } catch (err) {
      setError((prev) =>
        prev
          ? `${prev}\nFailed to load lifts data: ${err.message}`
          : `Failed to load lifts data: ${err.message}`,
      );
      setMaterialLifts([]);
    } finally {
      setLoadingLifts(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPurchaseOrders();
    fetchMaterialLifts();
    fetchMasterData();
  }, [fetchPurchaseOrders, fetchMaterialLifts, fetchMasterData]);

  const handleCancelPendingPO = (po) => {
    setCancelPendingPO({
      show: true,
      poId: po.id,
      indentNo: po.indentNo,
      cancelQuantity: "",
      reason: "",
      loading: false,
    });
  };

  const handleCloseCancelPopup = () => {
    setCancelPendingPO({
      show: false,
      poId: null,
      indentNo: "",
      cancelQuantity: "",
      loading: false,
    });
  };

  const handleCancelQuantityChange = (e) => {
    const value = e.target.value;
    setCancelPendingPO((prev) => ({
      ...prev,
      cancelQuantity: value,
    }));
  };

  const submitCancelPendingPO = async () => {
    if (
      !cancelPendingPO.cancelQuantity ||
      isNaN(parseFloat(cancelPendingPO.cancelQuantity))
    ) {
      toast.error("Please enter a valid quantity");
      return;
    }

    setCancelPendingPO((prev) => ({ ...prev, loading: true }));

    try {
      const poToUpdate = purchaseOrders.find(
        (po) => po.id === cancelPendingPO.poId,
      );

      if (!poToUpdate) {
        throw new Error("PO not found");
      }

      const cancelQty = parseFloat(cancelPendingPO.cancelQuantity);

      // Use Pending PO Qty from DB column if available, else use calculated value
      const dbPendingPOQty = parseFloat(poToUpdate.pendingPOQty_DB);
      const calculatedPending = parseFloat(poToUpdate.pendingPOQty) || 0;
      const startingPending = !isNaN(dbPendingPOQty)
        ? dbPendingPOQty
        : calculatedPending;

      const newPendingPOQty = Math.max(0, startingPending - cancelQty);

      console.log("Submitting cancel quantity:", {
        indentNo: cancelPendingPO.indentNo,
        cancelQty,
        startingPending,
        newPendingPOQty,
        reason: cancelPendingPO.reason,
      });

      const currentCancelQty = parseFloat(poToUpdate.orderCancelQty) || 0;
      const newCancelQty = currentCancelQty + cancelQty;

      const updatePayload = {
        "Pending PO Qty": newPendingPOQty.toString(), // Subtract from Pending PO Qty instead of Total Quantity
        "Order Cancel Qty": newCancelQty.toString(),
        "Reason Of Cancel Qty": cancelPendingPO.reason, // Store reason
      };

      // If pending goes to 0, close the PO
      if (newPendingPOQty <= 0) {
        const now = new Date();
        const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
        updatePayload["Actual4"] = timestamp;
      }

      const { error: updateError } = await supabase
        .from("INDENT-PO")
        .update(updatePayload)
        .in("id", poToUpdate.dbRowIds || []);

      if (updateError) throw updateError;

      toast.success(
        `✅ Cancel quantity ${cancelPendingPO.cancelQuantity} submitted successfully to ${cancelPendingPO.indentNo}!`,
      );

      // Refresh data
      await fetchPurchaseOrders();
      handleCloseCancelPopup();
    } catch (error) {
      console.error("Error submitting cancel quantity:", error);
      toast.error(`❌ Failed to submit cancel quantity: ${error.message}`);
    } finally {
      setCancelPendingPO((prev) => ({ ...prev, loading: false }));
    }
  };

  const uniqueFilterOptions = useMemo(() => {
    const vendors = new Set();
    const materials = new Set();
    const types = new Set();
    const quantities = new Set();
    const orders = new Set();

    purchaseOrders.forEach((po) => {
      if (po.vendorName) vendors.add(po.vendorName);
      if (po.rawMaterialName) materials.add(po.rawMaterialName);
      if (po.quantity) quantities.add(po.quantity);
      if (po.indentNo) orders.add(po.indentNo);
    });

    materialLifts.forEach((lift) => {
      if (lift.vendorName) vendors.add(lift.vendorName);
      if (lift.material) materials.add(lift.material);
      if (lift.liftType) types.add(lift.liftType);
      if (lift.liftingQty) quantities.add(lift.liftingQty);
      if (lift.additionalTruckQty) quantities.add(lift.additionalTruckQty);
      if (lift.indentNo) orders.add(lift.indentNo);
      if (lift.billNo) orders.add(lift.billNo);
    });

    return {
      vendorName: [...vendors].sort(),
      materialName: [...materials].sort(),
      liftType: [...types].sort(),
      totalQuantity: [...quantities].sort(
        (a, b) => parseFloat(a) - parseFloat(b),
      ),
      orderNumber: [...orders].sort(),
    };
  }, [purchaseOrders, materialLifts]);

  const filteredPurchaseOrders = useMemo(() => {
    let filtered = purchaseOrders;
    if (filters.vendorName !== "all") {
      filtered = filtered.filter((po) => po.vendorName === filters.vendorName);
    }
    if (filters.materialName !== "all") {
      filtered = filtered.filter(
        (po) => po.rawMaterialName === filters.materialName,
      );
    }
    if (filters.totalQuantity !== "all") {
      filtered = filtered.filter((po) => po.quantity === filters.totalQuantity);
    }
    if (filters.orderNumber !== "all") {
      filtered = filtered.filter((po) => po.indentNo === filters.orderNumber);
    }
    return filtered;
  }, [purchaseOrders, filters]);

  const filteredMaterialLifts = useMemo(() => {
    let filtered = materialLifts;
    if (filters.vendorName !== "all") {
      filtered = filtered.filter(
        (lift) => lift.vendorName === filters.vendorName,
      );
    }
    if (filters.materialName !== "all") {
      filtered = filtered.filter(
        (lift) => lift.material === filters.materialName,
      );
    }
    if (filters.liftType !== "all") {
      filtered = filtered.filter((lift) => lift.liftType === filters.liftType);
    }
    if (filters.totalQuantity !== "all") {
      filtered = filtered.filter(
        (lift) =>
          lift.liftingQty === filters.totalQuantity ||
          lift.additionalTruckQty === filters.totalQuantity,
      );
    }
    if (filters.orderNumber !== "all") {
      filtered = filtered.filter(
        (lift) =>
          lift.indentNo === filters.orderNumber ||
          lift.billNo === filters.orderNumber,
      );
    }
    return filtered;
  }, [materialLifts, filters]);

  const selectedLiftSummary = useMemo(() => {
    const activeItems = selectedLiftItems.filter(
      (item) => toNumber(item.quantityToLift) > 0,
    );
    const totalLiftQuantity = roundQuantity(
      activeItems.reduce((sum, item) => sum + toNumber(item.quantityToLift), 0),
    );
    const totalMaterialAmount = activeItems.reduce(
      (sum, item) => sum + toNumber(item.quantityToLift) * toNumber(item.rate),
      0,
    );

    return {
      activeItems,
      totalLiftQuantity,
      totalMaterialAmount,
    };
  }, [selectedLiftItems]);

  useEffect(() => {
    setFormData((prev) => {
      const newTruckQty = selectedLiftSummary.totalLiftQuantity
        ? String(selectedLiftSummary.totalLiftQuantity)
        : "";

      const isExFactory =
        String(selectedPO?.transportType || "").trim().toUpperCase() ===
        "EX-FACTORY";
      let transportRate = prev.transportRate;
      if (prev.rateType === "Per MT" && !isExFactory) {
        const tRate = parseFloat(prev.transportingRate) || 0;
        const bQty = parseFloat(newTruckQty) || 0;
        transportRate = (tRate * bQty).toFixed(2);
      }

      return {
        ...prev,
        truckQty: newTruckQty,
        transportRate,
        totalQuantity: selectedPO?.quantity || "",
        material:
          selectedLiftSummary.activeItems.length > 1
            ? `${selectedLiftSummary.activeItems.length} products`
            : selectedLiftSummary.activeItems[0]?.material ||
              selectedPO?.rawMaterialName ||
              "",
        rate:
          selectedLiftSummary.activeItems.length === 1
            ? String(selectedLiftSummary.activeItems[0]?.rate || "")
            : prev.rate,
      };
    });
  }, [selectedLiftSummary, selectedPO]);

  const handleLiftItemQuantityChange = (itemKey, value) => {
    setSelectedLiftItems((prev) =>
      prev.map((item) => {
        if (item.key !== itemKey) return item;

        if (value === "") {
          return { ...item, quantityToLift: "" };
        }

        const nextQuantity = roundQuantity(value);

        return {
          ...item,
          quantityToLift: nextQuantity,
          totalAmount: roundQuantity(nextQuantity * item.rate),
        };
      }),
    );
  };

  const handleLiftItemRateChange = (itemKey, value) => {
    setSelectedLiftItems((prev) =>
      prev.map((item) => {
        if (item.key !== itemKey) return item;

        if (value === "") {
          return { ...item, rate: "" };
        }

        const nextRate = toNumber(value);

        return {
          ...item,
          rate: nextRate,
          totalAmount: roundQuantity(toNumber(item.quantityToLift) * nextRate),
        };
      }),
    );
  };

  const handleRemoveLiftItem = (itemKey) => {
    setSelectedLiftItems((prev) => prev.filter((item) => item.key !== itemKey));
  };

  const handlePOSelect = (po) => {
    setSelectedPO(po);
    setSelectedLiftItems(
      (po.items || []).map((item) => ({
        ...item,
        quantityToLift: item.pendingQuantity,
        rate: "", // Set rate to blank initially
        totalAmount: 0, // Set total amount to 0 since rate is blank
      })),
    );
    setFormData({
      ...createEmptyLiftForm(),
      indentNo: po.indentNo || po.poNumber,
      vendorName: po.vendorName,
      material: po.rawMaterialName,
      totalQuantity: po.quantity,
      TransporterName:
        po.transportType?.toUpperCase() === "EX-FACTORY"
          ? po.transporterName || transporterOptions[0]?.value || ""
          : po.transporterName || "",
      rateType:
        po.transportType?.toUpperCase() === "EX-FACTORY" || po.transportRateType
          ? po.transportRateType || ""
          : "",

      transportRate:
        po.transportType?.toUpperCase() === "EX-FACTORY"
          ? String(po.transporterRate || "")
          : "",
      rate: "", // Set rate to blank initially
    });
    setFormErrors({});
    setShowPopup(true);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setSelectedPO(null);
    setSelectedLiftItems([]);
    setFormData(createEmptyLiftForm());
    setFormErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const updatedForm = { ...formData, [name]: value };

    if (
      (name === "transportingRate" ||
        name === "truckQty" ||
        name === "rateType") &&
      updatedForm.rateType === "Per MT"
    ) {
      const tRate = parseFloat(updatedForm.transportingRate) || 0;
      const bQty = parseFloat(updatedForm.truckQty) || 0;
      updatedForm.transportRate = (tRate * bQty).toFixed(2);
    } else if (name === "rateType") {
      updatedForm.transportRate = "";
      if (value !== "Per MT") {
        updatedForm.transportingRate = "";
      }
    }

    setFormData(updatedForm);
    if (formErrors[name]) setFormErrors({ ...formErrors, [name]: null });
  };

  const handleFormSelectChange = (name, value) => {
    const updatedForm = { ...formData, [name]: value };

    if (
      (name === "transportingRate" ||
        name === "truckQty" ||
        name === "rateType") &&
      updatedForm.rateType === "Per MT"
    ) {
      const tRate = parseFloat(updatedForm.transportingRate) || 0;
      const bQty = parseFloat(updatedForm.truckQty) || 0;
      updatedForm.transportRate = (tRate * bQty).toFixed(2);
    } else if (name === "rateType") {
      updatedForm.transportRate = "";
      if (value !== "Per MT") {
        updatedForm.transportingRate = "";
      }
    }

    setFormData(updatedForm);
    if (formErrors[name]) setFormErrors({ ...formErrors, [name]: null });
  };

  const handleFileUpload = (e) => {
    const { name, files } = e.target;
    setFormData({ ...formData, [name]: files && files[0] ? files[0] : null });
    if (formErrors[name]) setFormErrors({ ...formErrors, [name]: null });
  };

  const validateForm = () => {
    const newErrors = {};
    const isCommon = formData.Type === "Common";
    const activeLiftItems = selectedLiftItems.filter(
      (item) => String(item.quantityToLift).trim() !== "",
    );

    let requiredFields = [
      "billNo",
      "Arealifting",
      "liftingLeadTime",
      "truckNo",
      "driverNo",
      "TransporterName",
      "rateType",
      "transportRate",
      "additionalTruckQty",
    ];

    if (formData.rateType === "Per MT" && !isCommon) {
      requiredFields.push("transportingRate");
    }

    if (isCommon) {
      requiredFields = ["billNo", "Arealifting", "Type", "liftingLeadTime"];
    }

    requiredFields.forEach((field) => {
      let readableField = field
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase());
      if (field === "Arealifting") readableField = "Area Lifting";
      if (field === "TransporterName") readableField = "Transporter Name";

      if (!formData[field] || String(formData[field]).trim() === "") {
        newErrors[field] = `${readableField} is required.`;
      }
    });

    // Bill image and other specific validations only for non-Common types or if visible
    if (!isCommon) {
      if (!formData.billImage) {
        newErrors.billImage = "Bill image is required.";
      }
      if (!formData.hasBilty) {
        newErrors.hasBilty = "Selection for 'Has Bilty?' is required.";
      }
      if (formData.transportRate && isNaN(parseFloat(formData.transportRate)))
        newErrors.transportRate =
          "Transportation Total Amount must be a valid number.";
      if (
        formData.additionalTruckQty &&
        isNaN(parseFloat(formData.additionalTruckQty))
      ) {
        newErrors.additionalTruckQty =
          "Total Truck Billing Quantity must be a valid number.";
      }

      // Validate bilty fields if hasBilty is yes
      if (formData.hasBilty === "yes") {
        if (!formData.biltyNo.trim()) {
          newErrors.biltyNo = "Bilty number is required when has bilty is yes";
        }
        if (!formData.biltyImage) {
          newErrors.biltyImage =
            "Bilty image is required when has bilty is yes";
        }
      }
    } else {
      // Basic number validation for Common fields
      if (
        formData.transportingRate &&
        isNaN(parseFloat(formData.transportingRate))
      ) {
        newErrors.transportingRate =
          "Transporting Rate must be a valid number.";
      }
    }

    if (
      formData.liftingLeadTime &&
      isNaN(parseFloat(formData.liftingLeadTime))
    ) {
      newErrors.liftingLeadTime = "Lead Time must be a valid number.";
    }

    if (!selectedLiftItems.length) {
      newErrors.liftItems = "Add at least one product to record a lift.";
    } else if (!activeLiftItems.length) {
      newErrors.liftItems =
        "Enter a lifting quantity for at least one product.";
    } else {
      selectedLiftItems.forEach((item) => {
        const quantity = toNumber(item.quantityToLift);
        if (String(item.quantityToLift).trim() === "") return;
        if (quantity <= 0) {
          newErrors[`liftItem-${item.key}`] =
            "Quantity must be greater than 0.";
        }
      });
    }

    if (!selectedLiftSummary.totalLiftQuantity) {
      newErrors.liftItems = "Total lift quantity must be greater than 0.";
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Upload file to Supabase Storage
  const uploadFileToSupabase = async (file, folder) => {
    try {
      console.log(`Uploading ${folder} image:`, file.name);
      const { url } = await uploadFileToStorage(file, "image", folder);
      console.log(`${folder} upload successful:`, url);
      return url;
    } catch (error) {
      console.error(`Error uploading ${folder} image:`, error);
      throw new Error(`Failed to upload ${folder} image: ${error.message}`);
    }
  };

  const generateLiftIds = async (count = 1) => {
    try {
      const { data, error } = await supabase
        .from("LIFT-ACCOUNTS")
        .select('"Lift No"')
        .order('"Lift No"', { ascending: false })
        .limit(10);

      if (error) throw error;

      let maxIdNum = 0;
      if (data && data.length > 0) {
        data.forEach((row) => {
          const liftNo = row["Lift No"];
          if (
            liftNo &&
            typeof liftNo === "string" &&
            liftNo.startsWith("LF-")
          ) {
            const numPart = parseInt(liftNo.substring(3), 10);
            if (!isNaN(numPart) && numPart > maxIdNum) maxIdNum = numPart;
          }
        });
      }

      return Array.from(
        { length: count },
        (_, index) => `LF-${String(maxIdNum + index + 1).padStart(3, "0")}`,
      );
    } catch (error) {
      console.error(
        "[generateLiftIds] Error during Supabase ID generation:",
        error,
      );
      console.warn(
        "[generateLiftIds] Falling back to local materialLifts state for Lift ID generation.",
      );

      let maxIdNum = 0;
      if (Array.isArray(materialLifts)) {
        materialLifts.forEach((lift) => {
          if (
            lift &&
            typeof lift.id === "string" &&
            lift.id.startsWith("LF-")
          ) {
            const numPart = parseInt(lift.id.substring(3), 10);
            if (!isNaN(numPart) && numPart > maxIdNum) maxIdNum = numPart;
          }
        });
      }
      return Array.from(
        { length: count },
        (_, index) => `LF-${String(maxIdNum + index + 1).padStart(3, "0")}`,
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Validation failed. Please check the required fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      const itemsToSubmit = selectedLiftSummary.activeItems.map((item) => ({
        ...item,
        quantityToLift: toNumber(item.quantityToLift),
      }));
      const liftIds = await generateLiftIds(itemsToSubmit.length);
      const now = new Date();
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");

      const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

      // Upload bill image (if provided)
      let billImageUrl = "";
      if (formData.billImage) {
        billImageUrl = await uploadFileToSupabase(
          formData.billImage,
          "lift-bills",
        );
      }

      // Upload bilty image (if provided and hasBilty is yes)
      let biltyImageUrl = "";
      if (formData.hasBilty === "yes" && formData.biltyImage) {
        biltyImageUrl = await uploadFileToSupabase(
          formData.biltyImage,
          "lift-bilty",
        );
      }

      // Upload testing certificate (if provided)
      let testingCertificateUrl = "";
      if (formData.testingCertificate) {
        testingCertificateUrl = await uploadFileToSupabase(
          formData.testingCertificate,
          "testing-certificates",
        );
      }

      const transportTotal = toNumber(formData.transportRate);
      const totalLiftQuantity = selectedLiftSummary.totalLiftQuantity;
      const additionalTruckQty = toNumber(formData.additionalTruckQty);
      const transportingRate = toNumber(formData.transportingRate);

      const liftAccountRows = itemsToSubmit.map((item, index) => {
        const quantityShare =
          totalLiftQuantity > 0 ? item.quantityToLift / totalLiftQuantity : 0;
        const allocatedTransportRate =
          formData.rateType === "Per MT"
            ? roundQuantity(transportingRate * item.quantityToLift)
            : roundQuantity(transportTotal * quantityShare);

        return {
          Timestamp: timestamp,
          "Lift No": liftIds[index],
          "Indent no.": formData.indentNo,
          "Vendor Name": formData.vendorName,
          Qty: item.maxQuantity || null,
          "Raw Material Name": item.material,
          "Bill No.": formData.billNo,
          "Area lifting": formData.Arealifting,
          "Lead Time To Reach Factory (days)":
            Number(formData.liftingLeadTime) || null,
          "Lifting Qty": item.quantityToLift || null,
          Type: formData.Type,
          "Transporter Name": formData.TransporterName,
          "Truck No.": formData.truckNo,
          "Driver No.": formData.driverNo,
          "Bilty No.":
            formData.hasBilty === "yes" ? formData.biltyNo || null : null,
          "Type Of Transporting Rate": formData.rateType,
          Rate: item.rate || null,
          "Bill Image": billImageUrl,
          "Truck Qty": additionalTruckQty
            ? roundQuantity(additionalTruckQty * quantityShare)
            : null,
          "Bilty Image": biltyImageUrl || null,
          "Testing Certificate": testingCertificateUrl || null,
          "Firm Name": selectedPO?.firmName || null,
          "Transporter Rate": allocatedTransportRate || null,
          "Transporting Rate": transportingRate || null,
        };
      });

      const { data: insertedLift, error: insertError } = await supabase
        .from("LIFT-ACCOUNTS")
        .insert(liftAccountRows)
        .select();

      if (insertError) {
        console.error("Lift insertion failed:", insertError);
        throw new Error(
          `Failed to insert into LIFT-ACCOUNTS: ${insertError.message}`,
        );
      }

      const mismatchRows = liftAccountRows.map((liftAccountData) => {
        const poItem = selectedLiftItems.find(
          (item) => item.material === liftAccountData["Raw Material Name"],
        );
        const poRate = toNumber(poItem?.poRate || selectedPO?.rate);
        const liftRate = toNumber(liftAccountData["Rate"]);
        const rateDiff = Number((poRate - liftRate).toFixed(2));

        return {
          "PO Rate": poRate,
          Timestamp: liftAccountData["Timestamp"],
          "Lift ID": liftAccountData["Lift No"],
          "Lift Number": liftAccountData["Lift No"],
          "Indent Number": liftAccountData["Indent no."],
          "Firm Name": liftAccountData["Firm Name"],
          "Party Name": liftAccountData["Vendor Name"],
          "Product Name": liftAccountData["Raw Material Name"],
          "Transporter Name": liftAccountData["Transporter Name"],
          Transporter: liftAccountData["Transporter Name"],
          Type: liftAccountData["Type"],
          "Bill No.": liftAccountData["Bill No."],
          Qty: liftAccountData["Qty"],
          "Area Lifting": liftAccountData["Area lifting"],
          "Truck No.": liftAccountData["Truck No."],
          "Type Of Rate": liftAccountData["Type Of Transporting Rate"],
          Rate: liftAccountData["Rate"],
          "Truck Qty": liftAccountData["Truck Qty"],
          "Bill Image": liftAccountData["Bill Image"],
          "Bilty No.": liftAccountData["Bilty No."],
          "Bilty Image": liftAccountData["Bilty Image"],
          "Testing Certificate": liftAccountData["Testing Certificate"],
          Status: "Pending",
          Remarks: "Auto-generated from Lifting",
          "Rate Difference": rateDiff,
          "Quantity Difference": 0,
          "Diff Qty": 0,
          "Qty Diff Status": "",
        };
      });

      const { error: mismatchError } = await supabase
        .from("Mismatch")
        .insert(mismatchRows);

      if (mismatchError) {
        console.error("Mismatch insertion failed:", mismatchError);
      }

      const dbPendingPOQty = parseFloat(selectedPO.pendingPOQty_DB);
      const calculatedPending = parseFloat(selectedPO.pendingPOQty) || 0;
      const startingPending = !isNaN(dbPendingPOQty)
        ? dbPendingPOQty
        : calculatedPending;
      const thisLiftQty = totalLiftQuantity;
      const newPending = Math.max(0, startingPending - thisLiftQty);

      const updatePayloadPO = {
        "Pending PO Qty": newPending.toString(),
        "Transporter Name": formData.TransporterName || null,
        transpoter_rate_type: formData.rateType || null,
      };

      if (newPending <= 0) {
        updatePayloadPO["Actual4"] = timestamp;
      } else {
        updatePayloadPO["Actual4"] = null;
      }

      const { error: updateError } = await supabase
        .from("INDENT-PO")
        .update(updatePayloadPO)
        .in("id", selectedPO.dbRowIds || []);

      if (updateError) {
        console.error("INDENT-PO update failed:", updateError);
        throw new Error(`Failed to update INDENT-PO: ${updateError.message}`);
      }

      toast.success(
        `Recorded ${itemsToSubmit.length} lift item${itemsToSubmit.length > 1 ? "s" : ""} successfully!`,
      );

      await Promise.all([fetchPurchaseOrders(), fetchMaterialLifts()]);
      handleClosePopup();
    } catch (error) {
      console.error("Error submitting lift form:", error);
      toast.error(`Submission failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const liftExistsForPO = (indentNo) => {
    if (!indentNo) return false;
    return materialLifts.some((lift) => lift.indentNo === indentNo);
  };

  const handleToggleColumn = (tab, dataKey, checked) => {
    if (tab === "pos") {
      setVisiblePoColumns((prev) => ({ ...prev, [dataKey]: checked }));
    } else {
      setVisibleLiftsColumns((prev) => ({ ...prev, [dataKey]: checked }));
    }
  };

  const handleSelectAllColumns = (tab, columnsMeta, selectAll) => {
    if (tab === "pos") {
      const newVisibility = {};
      columnsMeta.forEach((col) => {
        newVisibility[col.dataKey] = col.alwaysVisible || selectAll;
      });
      setVisiblePoColumns(newVisibility);
    } else {
      const newVisibility = {};
      columnsMeta.forEach((col) => {
        newVisibility[col.dataKey] = col.alwaysVisible || selectAll;
      });
      setVisibleLiftsColumns(newVisibility);
    }
  };

  const renderCell = (item, column) => {
    const value = item[column.dataKey];
    if (column.isLink) {
      return value ? (
        <a
          href={String(value).startsWith("http") ? value : `https://${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#7da23a] hover:text-green-800 hover:underline font-medium text-xs"
        >
          {column.linkText || "View"}
        </a>
      ) : (
        <span className="text-xs text-gray-400">N/A</span>
      );
    }

    // Show status with badge
    if (column.dataKey === "status") {
      const statusValue = value || "";
      const isPending = statusValue.toLowerCase() === "pending";
      return (
        <Badge
          variant={isPending ? "outline" : "secondary"}
          className={
            isPending
              ? "bg-yellow-100 text-yellow-800 border-yellow-200"
              : "bg-green-100 text-green-800"
          }
        >
          {statusValue || "N/A"}
        </Badge>
      );
    }

    return (
      value ||
      (value === 0 ? "0" : <span className="text-xs text-gray-400">N/A</span>)
    );
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
    setFilters({
      vendorName: "all",
      materialName: "all",
      liftType: "all",
      totalQuantity: "all",
      orderNumber: "all",
    });
  };

  return (
    <div className="min-h-screen p-4 space-y-4 md:p-6 bg-slate-50">
      <Card className="border-none shadow-md">
        <CardHeader className="p-4 border-b border-gray-200">
          <CardTitle className="flex items-center gap-2 text-lg text-gray-700">
            <Truck className="h-5 w-5 text-[#7da23a]" /> Step 5: Lift The
            Material
          </CardTitle>
          <CardDescription className="text-sm text-gray-500">
            Record material lifting details for purchase orders.
            {user?.firmName && String(user.firmName).toLowerCase() !== "all" && (
              <span className="ml-2 text-[#7da23a] font-medium">
                • Filtered by: {user.firmName}
              </span>
            )}
          </CardDescription>
          {masterDataLoading && (
            <div className="flex items-center gap-2 text-sm text-[#7da23a]">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading dropdown options from Master sheet...
            </div>
          )}
          {!masterDataLoading &&
            (areaOptions.length > 0 || typeOptions.length > 0) && (
              <div className="text-sm text-[#7da23a]">
                ✅ Dropdown options loaded: {areaOptions.length} areas,{" "}
                {typeOptions.length} types, {transporterOptions.length}{" "}
                transporters, {rateTypeOptions.length} rate types
              </div>
            )}
        </CardHeader>
        <CardContent className="p-4">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex flex-col flex-1"
          >
            <TabsList className="grid w-full sm:w-[450px] grid-cols-2 mb-4">
              <TabsTrigger
                value="availablePOs"
                className="flex items-center gap-2"
              >
                <FileCheck className="w-4 h-4" /> Available POs
                <Badge
                  variant="secondary"
                  className="ml-1.5 px-1.5 py-0.5 text-xs"
                >
                  {filteredPurchaseOrders.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="liftsHistory"
                className="flex items-center gap-2"
              >
                <History className="w-4 h-4" /> Lifts History
                <Badge
                  variant="secondary"
                  className="ml-1.5 px-1.5 py-0.5 text-xs"
                >
                  {filteredMaterialLifts.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <div className="p-4 mb-4 rounded-lg bg-green-50/50">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-gray-500" />
                <Label className="text-sm font-medium">Filters</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="ml-auto bg-white"
                >
                  Clear All
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
                <div>
                  <Label className="block mb-1 text-xs">Vendor Name</Label>
                  <SearchableSelect
                    value={filters.vendorName}
                    onValueChange={(value) =>
                      handleFilterChange("vendorName", value)
                    }
                    options={["all", ...uniqueFilterOptions.vendorName]}
                    placeholder="Vendors"
                    className="h-9"
                  />
                </div>

                <div>
                  <Label className="block mb-1 text-xs">Material Name</Label>
                  <SearchableSelect
                    value={filters.materialName}
                    onValueChange={(value) =>
                      handleFilterChange("materialName", value)
                    }
                    options={["all", ...uniqueFilterOptions.materialName]}
                    placeholder="Materials"
                    className="h-9"
                  />
                </div>

                <div>
                  <Label className="block mb-1 text-xs">Lift Type</Label>
                  <SearchableSelect
                    value={filters.liftType}
                    onValueChange={(value) =>
                      handleFilterChange("liftType", value)
                    }
                    options={["all", ...uniqueFilterOptions.liftType]}
                    placeholder="Types"
                    className="h-9"
                  />
                </div>

                <div>
                  <Label className="block mb-1 text-xs">Total Quantity</Label>
                  <SearchableSelect
                    value={filters.totalQuantity}
                    onValueChange={(value) =>
                      handleFilterChange("totalQuantity", value)
                    }
                    options={["all", ...uniqueFilterOptions.totalQuantity]}
                    placeholder="Quantities"
                    className="h-9"
                  />
                </div>

                <div>
                  <Label className="block mb-1 text-xs">Order Number</Label>
                  <SearchableSelect
                    value={filters.orderNumber}
                    onValueChange={(value) =>
                      handleFilterChange("orderNumber", value)
                    }
                    options={["all", ...uniqueFilterOptions.orderNumber]}
                    placeholder="Orders"
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            <TabsContent
              value="availablePOs"
              className="flex flex-col flex-1 mt-0"
            >
              <Card className="flex-col flex-1 border shadow-sm border-border">
                <CardHeader className="px-4 py-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center text-sm font-semibold text-foreground">
                        <FileCheck className="h-4 w-4 text-[#7da23a] mr-2" />{" "}
                        Available Purchase Orders (
                        {filteredPurchaseOrders.length})
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground mt-0.5">
                        Active lift records stay here until all pending product
                        quantities are completed.
                      </CardDescription>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs bg-transparent"
                        >
                          <MixerHorizontalIcon className="mr-1.5 h-3.5 w-3.5" />{" "}
                          View Columns
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[220px] p-3">
                        <div className="grid gap-2">
                          <p className="text-sm font-medium">
                            Toggle PO Columns
                          </p>
                          <div className="flex items-center justify-between mt-1 mb-2">
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              onClick={() =>
                                handleSelectAllColumns(
                                  "pos",
                                  PO_COLUMNS_META,
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
                                  "pos",
                                  PO_COLUMNS_META,
                                  false,
                                )
                              }
                            >
                              Deselect All
                            </Button>
                          </div>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {PO_COLUMNS_META.filter(
                              (col) => col.toggleable,
                            ).map((col) => (
                              <div
                                key={`toggle-po-${col.dataKey}`}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  id={`toggle-po-${col.dataKey}`}
                                  checked={!!visiblePoColumns[col.dataKey]}
                                  onCheckedChange={(checked) =>
                                    handleToggleColumn(
                                      "pos",
                                      col.dataKey,
                                      Boolean(checked),
                                    )
                                  }
                                  disabled={col.alwaysVisible}
                                />
                                <Label
                                  htmlFor={`toggle-po-${col.dataKey}`}
                                  className="text-xs font-normal cursor-pointer"
                                >
                                  {col.header}{" "}
                                  {col.alwaysVisible && (
                                    <span className="text-gray-400 ml-0.5 text-xs">
                                      (Fixed)
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
                </CardHeader>
                <CardContent className="flex-col flex-1 p-0">
                  {loadingPOs ? (
                    <div className="flex flex-col items-center justify-center flex-1 py-8">
                      <Loader2 className="h-8 w-8 text-[#7da23a] animate-spin mb-3" />
                      <p className="ml-2 text-muted-foreground">
                        Loading Purchase Orders...
                      </p>
                    </div>
                  ) : error && filteredPurchaseOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 px-4 py-8 mx-4 my-4 text-center border-2 border-dashed rounded-lg border-destructive-foreground bg-destructive/10">
                      <AlertTriangle className="w-10 h-10 mb-3 text-destructive" />
                      <p className="font-medium text-destructive">
                        Error Loading POs
                      </p>
                      <p className="max-w-md text-sm text-muted-foreground">
                        {error}
                      </p>
                    </div>
                  ) : filteredPurchaseOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 px-4 py-10 mx-4 my-4 text-center border-2 border-dashed rounded-lg border-green-200/50 bg-green-50/50">
                      <FileText className="w-12 h-12 mb-3 text-green-500" />
                      <p className="font-medium text-foreground">
                        No Eligible POs Found
                      </p>
                      <p className="text-sm text-center text-muted-foreground">
                        Pending lift records appear here until every product
                        quantity is fully lifted or cancelled.
                        {user?.firmName &&
                          String(user.firmName).toLowerCase() !== "all" && (
                            <span className="block mt-1">
                              (Filtered by firm: {user.firmName})
                            </span>
                          )}
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-x-auto rounded-b-lg">
                      <Table>
                        <TableHeader className="sticky top-0 z-10 bg-muted/50">
                          <TableRow>
                            {PO_COLUMNS_META.filter(
                              (col) =>
                                col.alwaysVisible ||
                                visiblePoColumns[col.dataKey] !== false,
                            ).map((col) => (
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
                          {filteredPurchaseOrders.map((po) => (
                            <TableRow
                              key={po.id}
                              className={`hover:bg-green-50/50 ${selectedPO?.id === po.id ? "bg-green-100 ring-1 ring-green-300" : ""}`}
                            >
                              {PO_COLUMNS_META.filter(
                                (col) =>
                                  col.alwaysVisible ||
                                  visiblePoColumns[col.dataKey] !== false,
                              ).map((column) => (
                                <TableCell
                                  key={column.dataKey}
                                  className={`whitespace-nowrap text-xs px-3 py-2 ${
                                    column.dataKey === "indentNo"
                                      ? "font-medium text-primary"
                                      : "text-gray-700"
                                  } ${
                                    column.dataKey === "vendorName" ||
                                    column.dataKey === "rawMaterialName" ||
                                    column.dataKey === "whatIsToBeDone"
                                      ? "truncate max-w-[150px]"
                                      : ""
                                  }`}
                                >
                                  {column.dataKey === "actionColumn" ? (
                                    <div className="flex justify-center">
                                      <Button
                                        onClick={() => handlePOSelect(po)}
                                        size="xs"
                                        variant="outline"
                                        disabled={isSubmitting}
                                        className="px-2 py-1 text-xs h-7"
                                      >
                                        Create Lift
                                      </Button>
                                    </div>
                                  ) : column.dataKey === "cancelAction" ? (
                                    <div className="flex justify-center">
                                      <Button
                                        onClick={() =>
                                          handleCancelPendingPO(po)
                                        }
                                        size="xs"
                                        variant="destructive"
                                        className="px-2 py-1 text-xs h-7"
                                        disabled={isSubmitting}
                                      >
                                        Cancel PO
                                      </Button>
                                    </div>
                                  ) : (
                                    <span
                                      title={
                                        column.dataKey === "whatIsToBeDone"
                                          ? po[column.dataKey]
                                          : undefined
                                      }
                                    >
                                      {renderCell(po, column)}
                                    </span>
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent
              value="liftsHistory"
              className="flex flex-col flex-1 mt-0"
            >
              <Card className="flex-col flex-1 border shadow-sm border-border">
                <CardHeader className="px-4 py-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center text-sm font-semibold text-foreground">
                        <History className="h-4 w-4 text-[#7da23a] mr-2" /> All
                        Material Lifts ({filteredMaterialLifts.length})
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground mt-0.5">
                        Sorted from latest to oldest recorded lift.
                      </CardDescription>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs bg-transparent"
                        >
                          <MixerHorizontalIcon className="mr-1.5 h-3.5 w-3.5" />{" "}
                          View Columns
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[220px] p-3">
                        <div className="grid gap-2">
                          <p className="text-sm font-medium">
                            Toggle Lift Columns
                          </p>
                          <div className="flex items-center justify-between mt-1 mb-2">
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              onClick={() =>
                                handleSelectAllColumns(
                                  "lifts",
                                  LIFTS_COLUMNS_META,
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
                                  "lifts",
                                  LIFTS_COLUMNS_META,
                                  false,
                                )
                              }
                            >
                              Deselect All
                            </Button>
                          </div>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {LIFTS_COLUMNS_META.filter(
                              (col) => col.toggleable,
                            ).map((col) => (
                              <div
                                key={`toggle-lift-${col.dataKey}`}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  id={`toggle-lift-${col.dataKey}`}
                                  checked={!!visibleLiftsColumns[col.dataKey]}
                                  onCheckedChange={(checked) =>
                                    handleToggleColumn(
                                      "lifts",
                                      col.dataKey,
                                      Boolean(checked),
                                    )
                                  }
                                  disabled={col.alwaysVisible}
                                />
                                <Label
                                  htmlFor={`toggle-lift-${col.dataKey}`}
                                  className="text-xs font-normal cursor-pointer"
                                >
                                  {col.header}{" "}
                                  {col.alwaysVisible && (
                                    <span className="text-gray-400 ml-0.5 text-xs">
                                      (Fixed)
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
                </CardHeader>
                <CardContent className="flex-col flex-1 p-0">
                  {loadingLifts ? (
                    <div className="flex flex-col items-center justify-center flex-1 py-8">
                      <Loader2 className="h-8 w-8 text-[#7da23a] animate-spin mb-3" />
                      <p className="ml-2 text-muted-foreground">
                        Loading Material Lifts...
                      </p>
                    </div>
                  ) : error && filteredMaterialLifts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 px-4 py-8 mx-4 my-4 text-center border-2 border-dashed rounded-lg border-destructive-foreground bg-destructive/10">
                      <AlertTriangle className="w-10 h-10 mb-3 text-destructive" />
                      <p className="font-medium text-destructive">
                        Error Loading Lifts
                      </p>
                      <p className="max-w-md text-sm text-muted-foreground">
                        {error
                          .split("\n")
                          .find((line) => line.includes("lifts data")) || error}
                      </p>
                    </div>
                  ) : filteredMaterialLifts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 px-4 py-10 mx-4 my-4 text-center border-2 border-dashed rounded-lg border-green-200/50 bg-green-50/50">
                      <Truck className="w-12 h-12 mb-3 text-green-500" />
                      <p className="font-medium text-foreground">
                        No Material Lifts Recorded
                      </p>
                      <p className="text-sm text-center text-muted-foreground">
                        Create lifts from the 'Available POs' tab.
                        {user?.firmName &&
                          String(user.firmName).toLowerCase() !== "all" && (
                            <span className="block mt-1">
                              (Filtered by firm: {user.firmName})
                            </span>
                          )}
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-x-auto rounded-b-lg">
                      <Table>
                        <TableHeader className="sticky top-0 z-10 bg-muted/50">
                          <TableRow>
                            {LIFTS_COLUMNS_META.filter(
                              (col) => visibleLiftsColumns[col.dataKey],
                            ).map((col) => (
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
                          {filteredMaterialLifts.map((lift) => (
                            <TableRow
                              key={lift.id}
                              className="hover:bg-green-50/50"
                            >
                              {LIFTS_COLUMNS_META.filter(
                                (col) => visibleLiftsColumns[col.dataKey],
                              ).map((column) => (
                                <TableCell
                                  key={column.dataKey}
                                  className={`whitespace-nowrap text-xs px-3 py-2 ${
                                    column.dataKey === "id"
                                      ? "font-medium text-primary"
                                      : "text-gray-700"
                                  } ${
                                    column.dataKey === "vendorName" ||
                                    column.dataKey === "material" ||
                                    column.dataKey === "transporterName"
                                      ? "truncate max-w-[150px]"
                                      : ""
                                  }`}
                                >
                                  {renderCell(lift, column)}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {showPopup && selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-3xl max-h-[95vh] flex flex-col shadow-2xl">
            <CardHeader className="flex items-center justify-between py-5 border-b border-gray-200 px-7 bg-gray-50 rounded-t-xl">
              <CardTitle className="text-lg font-semibold text-gray-800">
                Record Lift for{" "}
                <span className="text-[#7da23a]">{formData.indentNo}</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClosePopup}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-6 overflow-y-auto p-7 scrollbar-hide">
              <form onSubmit={handleSubmit}>
                <div className="p-4 mb-6 border rounded-lg bg-slate-50 border-slate-200">
                  <h4 className="text-sm font-semibold text-[#6b8e2f] mb-2">
                    Selected Purchase Order Details{" "}
                  </h4>
                  <div className="grid grid-cols-2 text-xs md:grid-cols-4 gap-x-4 gap-y-2">
                    <div>
                      <Label className="text-slate-500">Indent No.</Label>
                      <p className="font-medium text-slate-600">
                        {selectedPO.indentNo}
                      </p>
                    </div>
                    <div>
                      <Label className="text-slate-500">Vendor</Label>
                      <p className="font-medium truncate text-slate-600">
                        {selectedPO.vendorName}
                      </p>
                    </div>
                    <div>
                      <Label className="text-slate-500">Material</Label>
                      <p className="font-medium truncate text-slate-600">
                        {selectedLiftItems.length} product
                        {selectedLiftItems.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div>
                      <Label className="text-slate-500">PO Quantity</Label>
                      <p className="font-medium text-slate-600">
                        {selectedPO.quantity} units
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-6 overflow-hidden border rounded-lg border-slate-200">
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800">
                        Products To Lift
                      </h4>
                      <p className="text-xs text-slate-500">
                        Edit quantities per product. Removed products will not
                        be included in this lift.
                      </p>
                    </div>
                    <div className="text-xs text-right text-slate-600">
                      <p>
                        Total lift qty:{" "}
                        <span className="font-semibold">
                          {selectedLiftSummary.totalLiftQuantity || 0}
                        </span>
                      </p>
                      <p>
                        Material amount:{" "}
                        <span className="font-semibold">
                          Rs.{" "}
                          {formatMoney(selectedLiftSummary.totalMaterialAmount)}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">
                            Indent Qty
                          </TableHead>
                          <TableHead className="text-right">Lifted</TableHead>
                          <TableHead className="text-right">Pending</TableHead>
                          <TableHead className="text-right">Bill Rate</TableHead>
                          <TableHead className="text-right">Lift Qty</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-center">Remove</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedLiftItems.map((item) => (
                          <TableRow key={item.key}>
                            <TableCell className="font-medium text-slate-700">
                              {item.material}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.maxQuantity}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.liftedQuantity}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.pendingQuantity}
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.rate}
                                onChange={(e) =>
                                  handleLiftItemRateChange(
                                    item.key,
                                    e.target.value,
                                  )
                                }
                                className="h-8 ml-auto text-right w-24"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                min="0"
                                step="0.001"
                                value={item.quantityToLift}
                                onChange={(e) =>
                                  handleLiftItemQuantityChange(
                                    item.key,
                                    e.target.value,
                                  )
                                }
                                className="h-8 ml-auto text-right w-28"
                              />
                              {formErrors[`liftItem-${item.key}`] && (
                                <p className="mt-1 text-xs text-red-600">
                                  {formErrors[`liftItem-${item.key}`]}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              Rs.{" "}
                              {formatMoney(
                                toNumber(item.quantityToLift) * item.rate,
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveLiftItem(item.key)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {formErrors.liftItems && (
                    <p className="px-4 py-2 text-xs text-red-600 border-t border-slate-200">
                      {formErrors.liftItems}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
                  {[
                    {
                      label: "Bill No.",
                      name: "billNo",
                      type: "text",
                      isRequired: true,
                    },
                    {
                      label: "Area Lifting",
                      name: "Arealifting",
                      type: "select",
                      options: [
                        { value: "", label: "Select area" },
                        ...areaOptions,
                      ],
                      isRequired: true,
                    },
                    {
                      label: "Lead Time (Days)",
                      name: "liftingLeadTime",
                      type: "number",
                      isRequired: true,
                    },
                    {
                      label: "Truck No.",
                      name: "truckNo",
                      type: "text",
                      isRequired: true,
                    },
                    {
                      label: "Driver No.",
                      name: "driverNo",
                      type: "text",
                      isRequired: true,
                    },
                    {
                      label: "Transporter Name",
                      name: "TransporterName",
                      type: "select",
                      disabled:
                        String(selectedPO?.transportType || "")
                          .trim()
                          .toUpperCase() === "EX-FACTORY",
                      options: [
                        { value: "", label: "Select transporter" },
                        ...transporterOptions,
                      ],
                      isRequired: true,
                    },
                    {
                      label: "Type Of Transporting Rate",
                      name: "rateType",
                      type: "select",
                      disabled: false,
                      options: [
                        { value: "", label: "Select rate type" },
                        ...rateTypeOptions,
                      ],
                      isRequired: true,
                    },
                    ...(formData.rateType === "Per MT"
                      ? [
                          {
                            label: "Transporting Per MT Rate",
                            name: "transportingRate",
                            type: "text",
                            step: "any",
                            isRequired: true,
                          },
                        ]
                      : []),
                    {
                      label: "Transportation Total Amount",
                      name: "transportRate",
                      type: "text",
                      step: "any",
                      isRequired: true,
                      readOnly: false,
                    },
                    {
                      label: "Total Truck Billing Quantity",
                      name: "additionalTruckQty",
                      type: "text",
                      step: "any",
                      isRequired: true,
                    },
                  ].map((field) => {
                    const placeholderLabel =
                      field.type === "select"
                        ? field.options.find((opt) => opt.value === "")
                            ?.label ||
                          `Select ${field.label.toLowerCase().replace(" *", "")}`
                        : field.label.replace(" *", "");
                    const actualOptions =
                      field.type === "select"
                        ? field.options.filter((opt) => opt.value !== "")
                        : [];
                    return (
                      <div key={field.name}>
                        <Label
                          className="block mb-1 text-sm font-medium text-gray-700"
                          htmlFor={field.name}
                        >
                          {field.label}{" "}
                          {field.isRequired && (
                            <span className="text-red-500">*</span>
                          )}
                        </Label>
                        {field.type === "select" ? (
                          <Select
                            name={field.name}
                            value={formData[field.name]}
                            disabled={field.disabled}
                            onValueChange={(value) =>
                              handleFormSelectChange(field.name, value)
                            }
                          >
                            <SelectTrigger
                              className={`w-full ${formErrors[field.name] ? "border-red-500" : "border-gray-300"} ${field.disabled ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
                            >
                              <SelectValue placeholder={placeholderLabel} />
                            </SelectTrigger>
                            <SelectContent>
                              {actualOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            type={field.type}
                            id={field.name}
                            name={field.name}
                            value={formData[field.name]}
                            onChange={handleInputChange}
                            step={field.step}
                            readOnly={field.readOnly}
                            disabled={field.readOnly}
                            className={`${formErrors[field.name] ? "border-red-500" : "border-gray-300"} ${field.readOnly ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
                            placeholder={placeholderLabel}
                          />
                        )}
                        {formErrors[field.name] && (
                          <p className="mt-1 text-xs text-red-600">
                            {formErrors[field.name]}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {formData.Type !== "Common" && (
                  <div className="col-span-3">
                    <Label
                      className="block mb-1 text-sm font-medium text-gray-700"
                      htmlFor="hasBilty"
                    >
                      Has Bilty? <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      name="hasBilty"
                      value={formData.hasBilty}
                      onValueChange={(value) =>
                        handleFormSelectChange("hasBilty", value)
                      }
                    >
                      <SelectTrigger
                        className={`w-full ${formErrors.hasBilty ? "border-red-500" : "border-gray-300"}`}
                      >
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                    {formErrors.hasBilty && (
                      <p className="mt-1 text-xs text-red-600">
                        {formErrors.hasBilty}
                      </p>
                    )}
                  </div>
                )}

                {formData.hasBilty === "yes" && (
                  <>
                    <div>
                      <Label
                        className="block mb-1 text-sm font-medium text-gray-700"
                        htmlFor="biltyNo"
                      >
                        Bilty Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="text"
                        id="biltyNo"
                        name="biltyNo"
                        value={formData.biltyNo}
                        onChange={handleInputChange}
                        className={`${formErrors.biltyNo ? "border-red-500" : "border-gray-300"}`}
                        placeholder="Enter bilty number"
                      />
                      {formErrors.biltyNo && (
                        <p className="mt-1 text-xs text-red-600">
                          {formErrors.biltyNo}
                        </p>
                      )}
                    </div>

                    <div className="col-span-2">
                      <Label
                        className="block mb-1 text-sm font-medium text-gray-700"
                        htmlFor="biltyImage"
                      >
                        Upload Bilty Image{" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <div
                        className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 ${formErrors.biltyImage ? "border-red-500" : "border-gray-300"} border-dashed rounded-md hover:border-green-400 transition-colors`}
                      >
                        <div className="space-y-1 text-center">
                          <Upload className="w-10 h-10 mx-auto text-gray-400" />
                          <div className="flex justify-center text-sm text-gray-600">
                            <Label
                              htmlFor="biltyImage"
                              className="relative cursor-pointer bg-white rounded-md font-medium text-[#7da23a] hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-[#6b8e2f] px-1"
                            >
                              <span>Upload bilty image</span>
                              <Input
                                id="biltyImage"
                                name="biltyImage"
                                type="file"
                                className="sr-only"
                                onChange={(e) => {
                                  const { name, files } = e.target;
                                  setFormData({
                                    ...formData,
                                    [name]: files && files[0] ? files[0] : null,
                                  });
                                }}
                                accept="image/*,.pdf"
                              />
                            </Label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">
                            {formData.biltyImage
                              ? formData.biltyImage.name
                              : "PNG, JPG, PDF up to 10MB"}
                          </p>
                        </div>
                      </div>
                      {formErrors.biltyImage && (
                        <p className="mt-1 text-xs text-red-600">
                          {formErrors.biltyImage}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {formData.Type !== "Common" && (
                  <div className="mt-5">
                    <Label
                      className="block mb-1 text-sm font-medium text-gray-700"
                      htmlFor="billImage"
                    >
                      Upload Bill Image <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex justify-center px-6 pt-5 pb-6 mt-1 transition-colors border-2 border-gray-300 border-dashed rounded-md hover:border-green-400">
                      <div className="space-y-1 text-center">
                        <Upload className="w-10 h-10 mx-auto text-gray-400" />
                        <div className="flex justify-center text-sm text-gray-600">
                          <Label
                            htmlFor="billImage"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-[#7da23a] hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-[#6b8e2f] px-1"
                          >
                            <span>Upload a file</span>
                            <Input
                              id="billImage"
                              name="billImage"
                              type="file"
                              className="sr-only"
                              onChange={handleFileUpload}
                              accept="image/*,.pdf"
                            />
                          </Label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          {formData.billImage
                            ? formData.billImage.name
                            : "PNG, JPG, PDF up to 10MB"}
                        </p>
                      </div>
                    </div>
                    {formErrors.billImage && (
                      <p className="mt-1 text-xs text-red-600">
                        {formErrors.billImage}
                      </p>
                    )}
                  </div>
                )}

                {formData.Type !== "Common" && (
                  <div className="mt-5">
                    <Label
                      className="block mb-1 text-sm font-medium text-gray-700"
                      htmlFor="testingCertificate"
                    >
                      Upload Testing Certificate
                    </Label>
                    <div className="flex justify-center px-6 pt-5 pb-6 mt-1 transition-colors border-2 border-gray-300 border-dashed rounded-md hover:border-green-400">
                      <div className="space-y-1 text-center">
                        <FileUp className="w-10 h-10 mx-auto text-gray-400" />
                        <div className="flex justify-center text-sm text-gray-600">
                          <Label
                            htmlFor="testingCertificate"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-[#7da23a] hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-[#6b8e2f] px-1"
                          >
                            <span>Upload testing certificate</span>
                            <Input
                              id="testingCertificate"
                              name="testingCertificate"
                              type="file"
                              className="sr-only"
                              onChange={handleFileUpload}
                              accept="image/*,.pdf,.doc,.docx"
                            />
                          </Label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          {formData.testingCertificate
                            ? formData.testingCertificate.name
                            : "PNG, JPG, PDF, DOC, DOCX up to 10MB"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-4 pt-6 mt-4 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClosePopup}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="w-full md:w-auto"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin my-0.5" />{" "}
                        Recording Lift...
                      </>
                    ) : (
                      "Record Material Lifting"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cancel Pending PO Quantity Popup */}
      {cancelPendingPO.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-gray-50">
              <CardTitle className="text-lg font-semibold text-gray-800">
                Cancel Pending PO Quantity
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseCancelPopup}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>

            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-slate-50">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <Label>Indent No.</Label>
                      <p className="font-medium">{cancelPendingPO.indentNo}</p>
                    </div>
                    <div>
                      <Label>Current Cancel Qty</Label>
                      <p className="font-medium">
                        {purchaseOrders.find(
                          (po) => po.id === cancelPendingPO.poId,
                        )?.orderCancelQty || "0"}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Cancel Quantity *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={cancelPendingPO.cancelQuantity}
                    onChange={handleCancelQuantityChange}
                    placeholder="Enter quantity"
                  />
                </div>

                <div>
                  <Label>Reason of Cancel *</Label>
                  <Input
                    type="text"
                    value={cancelPendingPO.reason}
                    onChange={(e) =>
                      setCancelPendingPO((prev) => ({
                        ...prev,
                        reason: e.target.value,
                      }))
                    }
                    placeholder="Enter reason for cancellation"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={handleCloseCancelPopup}>
                    Cancel
                  </Button>
                  <Button
                    onClick={submitCancelPendingPO}
                    disabled={cancelPendingPO.loading}
                  >
                    {cancelPendingPO.loading ? "Submitting..." : "Submit"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
