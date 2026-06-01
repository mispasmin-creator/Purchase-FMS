"use client";
import { useState, useContext, useMemo, useEffect } from "react";
import {
  PackageOpen,
  PackageCheck,
  FileCheckIcon,
  Loader2,
  X,
  History,
  Info,
  AlertTriangle,
  FileUp,
  ExternalLink,
  Filter,
  ShieldCheck,
  Download,
} from "lucide-react";
import { MixerHorizontalIcon } from "@radix-ui/react-icons";
// Shadcn UI components
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { AuthContext } from "../context/AuthContext";
import SuperAdminEditModal from "./SuperAdminEditModal";
import { useNotification } from "../context/NotificationContext";
import { toast } from "sonner";
import { supabase } from "../supabase";
import { uploadFileToStorage } from "../utils/storageUtils";
import { canViewFirm } from "../utils/firmFilter";

// Constants for Google Sheets and Apps Script
const SHEET_ID = "13_sHCFkVxAzPbel-k9BuUBFY-E11vdKJAOgvzhBMLMY";
const LIFTS_SHEET_NAME = "LIFT-ACCOUNTS";
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbylQZLstOi0LyDisD6Z6KKC97pU5YJY2dDYVw2gtnW1fxZq9kz7wHBei4aZ8Ed-XKhKEA/exec";
const DATA_START_ROW_LIFTS = 5; // FIX: Corrected from 7 to 6

// Column Indices for LIFT-ACCOUNTS (0-based) - R is 17
const BILL_COPY_COL = 17;
const LIFT_ID_COL = 1;
const INDENT_NO_COL = 2;
const VENDOR_NAME_COL = 3;
const RAW_MATERIAL_COL = 5;
const ORIGINAL_QTY_COL = 6;
const BILL_NO_COL = 7;
const LIFT_TYPE_COL = 10;
const TRUCK_NO_COL = 12;
const DRIVER_NO_COL = 13;
const PLANNED_COL = 19;
const FILTER_U_COL = 20; // Actual Timestamp
const DATE_OF_RECEIVING_COL_W = 22;
const TOTAL_BILL_QUANTITY_COL_X = 23;
const ACTUAL_QTY_COL_Y = 24;
const PHYSICAL_COND_COL_Z = 25;
const MOISTURE_COL_AA = 26;
const PHYSICAL_IMAGE_URL_COL_AB = 27;
const WEIGHT_SLIP_URL_COL_AC = 28;
const WEIGHT_SLIP_QTY_COL_BF = 57; // Column BF for Weight Slip Qty
const FIRM_NAME_COL = 55; // Column BD for Firm Name

// Column Definitions
const AWAITING_RECEIPT_COLUMNS_META = [
  {
    header: "Action",
    dataKey: "actionColumn",
    toggleable: false,
    alwaysVisible: true,
  },
  {
    header: "Lift Number",
    dataKey: "id",
    toggleable: true,
    alwaysVisible: true,
  },
  { header: "Planned", dataKey: "plannedDate_formatted", toggleable: true },
  { header: "PO Number", dataKey: "indentNo", toggleable: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "Bill No.", dataKey: "billNo", toggleable: true },
  { header: "Party Name", dataKey: "vendorName", toggleable: true },
  { header: "Product Name", dataKey: "rawMaterialName", toggleable: true },
  { header: "Billing Quantity", dataKey: "liftingQty", toggleable: true },
  {
    header: "Bill Copy",
    dataKey: "billCopy",
    toggleable: true,
    isLink: true,
    linkText: "View",
  },
  { header: "Type", dataKey: "type", toggleable: true },
  { header: "Driver No.", dataKey: "driverNo", toggleable: true },
  { header: "Area Lifting", dataKey: "areaLifting", toggleable: true },
  { header: "Truck No.", dataKey: "truckNo", toggleable: true },
  { header: "Cancel PO Qty", dataKey: "orderCancelQty", toggleable: true },
];

const PROCESSED_RECEIPTS_COLUMNS_META = [
  {
    header: "Lift Number",
    dataKey: "liftNo",
    toggleable: true,
    alwaysVisible: true,
  },
  { header: "Planned", dataKey: "plannedDate_formatted", toggleable: true },
  {
    header: "Actual Receipt Date",
    dataKey: "dateOfReceiving_formatted",
    toggleable: true,
  },
  {
    header: "Receipt Timestamp (Col U)",
    dataKey: "actual1Timestamp",
    toggleable: true,
  },
  { header: "PO Number", dataKey: "indentNo", toggleable: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "Bill No.", dataKey: "billNo", toggleable: true },
  { header: "Party Name", dataKey: "vendorName", toggleable: true },
  { header: "Product Name", dataKey: "rawMaterialName", toggleable: true },
  { header: "PO Qty", dataKey: "qty", toggleable: true },
  { header: "ACTUAL Qty", dataKey: "liftingQty", toggleable: true },
  {
    header: "Bill Copy",
    dataKey: "billCopy",
    toggleable: true,
    isLink: true,
    linkText: "View",
  },
  { header: "Type", dataKey: "type", toggleable: true },
  { header: "Driver No.", dataKey: "driverNo", toggleable: true },
  { header: "Area Lifting", dataKey: "areaLifting", toggleable: true },
  { header: "Truck No.", dataKey: "truckNo", toggleable: true },
  {
    header: "Weight Slip Qty",
    dataKey: "weightSlipQty_fromSheet",
    toggleable: true,
  },
  {
    header: "Physical Image",
    dataKey: "physicalImageUrl_fromSheet",
    toggleable: true,
    isLink: true,
    linkText: "View Image",
  },
  {
    header: "Weight Slip",
    dataKey: "weightSlipImageUrl_fromSheet",
    toggleable: true,
    isLink: true,
    linkText: "View Image",
  },
  { header: "Cancel PO Qty", dataKey: "orderCancelQty", toggleable: true },
];

// Helper to parse Google Sheet gviz JSON response
const parseGvizResponse = (text, sheetNameForError) => {
  if (!text || !text.includes("google.visualization.Query.setResponse")) {
    console.error(
      `[ParseGviz] Invalid or empty gviz response for ${sheetNameForError}: `,
      text ? text.substring(0, 500) : "Response was null/empty",
    );
    throw new Error(
      `Invalid response format from Google Sheets for ${sheetNameForError}.Ensure it's link-shareable as 'Viewer'.`,
    );
  }
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) {
    console.error(
      `[ParseGviz] JSON delimiters not found for ${sheetNameForError}. Text:`,
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
        `[ParseGviz] No data.table or cols in ${sheetNameForError} or sheet is empty`,
        data,
      );
      return { cols: [], rows: [] };
    }
    if (!data.table.rows) {
      console.warn(
        `[ParseGviz] No data.table.rows in ${sheetNameForError}, treating as empty.`,
        data,
      );
      data.table.rows = [];
    }
    return data.table;
  } catch (e) {
    console.error(
      `[ParseGviz] Error parsing JSON for ${sheetNameForError}:`,
      e,
      "JSON String:",
      jsonString.substring(0, 500),
    );
    throw new Error(
      `Failed to parse JSON response from Google Sheets for ${sheetNameForError}. Error: ${e.message}`,
    );
  }
};

// Function to format date string
const formatDateString = (dateValue) => {
  if (!dateValue || typeof dateValue !== "string" || !dateValue.trim()) {
    return "";
  }
  let parsedDate;
  const gvizMatch = dateValue.match(
    /^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?/,
  );
  if (gvizMatch) {
    const [, year, month, day, hours, minutes, seconds] = gvizMatch.map(Number);
    parsedDate = new Date(
      year,
      month,
      day,
      hours || 0,
      minutes || 0,
      seconds || 0,
    );
  } else {
    parsedDate = new Date(dateValue);
  }
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
  return dateValue;
};

// Helper function to check if quantities match (no shortage: actual >= billed)
const checkQuantitiesMatch = (totalBillQty, actualQty) => {
  const bill = parseFloat(totalBillQty) || 0;
  const actual = parseFloat(actualQty) || 0;

  // Return true if no shortage (actual >= billed), false if shortage (actual < billed)
  return actual >= bill;
};

// ReceiptFormModal Component
function ReceiptFormModal({ isOpen, onClose, liftData, children }) {
  if (!isOpen) {
    return null;
  }
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto"
        aria-describedby="dialog-description"
      >
        <DialogHeader className="pb-4 mb-4 border-b">
          <DialogTitle className="flex items-center text-lg font-medium leading-6 text-gray-900">
            <FileUp className="h-6 w-6 text-[#7da23a] mr-3" /> Record Receipt
            for Lift ID:{" "}
            <span className="font-bold text-[#7da23a] ml-1">
              {liftData?.id}
            </span>
          </DialogTitle>
          <DialogDescription
            id="dialog-description"
            className="mt-1 text-sm text-gray-500"
          >
            Update LIFT-ACCOUNTS with receipt details.
          </DialogDescription>
        </DialogHeader>
        <div className="px-0 py-2 sm:px-0">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

export default function ReceiptCheck() {
  const { user, isSuperAdmin } = useContext(AuthContext);
  const { updateCount } = useNotification();
  const [allLiftsData, setAllLiftsData] = useState([]);
  const [superAdminEditItem, setSuperAdminEditItem] = useState(null);
  const [selectedLift, setSelectedLift] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [errorData, setErrorData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [dataTableForSubmit, setDataTableForSubmit] = useState(null);
  const [filters, setFilters] = useState({
    vendorName: "all",
    materialName: "all",
    liftType: "all",
    totalQuantity: "all",
    orderNumber: "all",
  });
  const [activeTab, setActiveTab] = useState("awaitingReceipt");
  const [visibleAwaitingReceiptColumns, setVisibleAwaitingReceiptColumns] =
    useState({});
  const [visibleProcessedReceiptsColumns, setVisibleProcessedReceiptsColumns] =
    useState({});
  const [formData, setFormData] = useState({
    liftId: "",
    dateOfReceiving: new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    }),
    totalBillQuantity: "",
    actualQuantity: "",
    qtyDifference: "0.00",

    physicalCondition: "Good",
    moisture: "",
    physicalImageFile: null,
    weightSlipFile: null,
    physicalImageUrl: "",
    weightSlipImageUrl: "",
  });
  const [formErrors, setFormErrors] = useState({});

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

  useEffect(() => {
    const initializeVisibility = (columnsMeta) => {
      const visibility = {};
      columnsMeta.forEach((col) => {
        visibility[col.dataKey] = col.alwaysVisible || col.toggleable;
      });
      return visibility;
    };
    setVisibleAwaitingReceiptColumns(
      initializeVisibility(AWAITING_RECEIPT_COLUMNS_META),
    );
    setVisibleProcessedReceiptsColumns(
      initializeVisibility(PROCESSED_RECEIPTS_COLUMNS_META),
    );
  }, []);

  useEffect(() => {
    const fetchLiftAccountData = async () => {
      setLoadingData(true);
      setErrorData(null);
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
            .select('"Indent Id.", "Order Cancel Qty", po_number'),
        ]);

        if (fetchError) throw fetchError;
        if (poFetchError) throw poFetchError;

        // Build map: poNumber -> Order Cancel Qty
        const cancelQtyMap = {};
        const indentToPoMap = {};
        (poData || []).forEach((row) => {
          const indent = String(row["Indent Id."] || "").trim();
          const poNumber = String(row.po_number || indent).trim();
          if (indent) indentToPoMap[indent] = poNumber;
          if (poNumber)
            cancelQtyMap[poNumber] = String(
              row["Order Cancel Qty"] || "",
            ).trim();
        });

        // Helper to format date for display
        const formatTimestamp = (dateValue) => {
          if (!dateValue) return "";
          try {
            const d = new Date(dateValue);
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
                .replace(/,/g, "");
            }
          } catch (e) {
            return String(dateValue);
          }
          return String(dateValue);
        };

        let processedData = (data || []).map((row) => {
          const rowData = {
            _id: `lift-${row.id}`,
            _dbId: row.id, // Store the Supabase row ID for updates
            id: String(row["Lift No"] || "").trim(),
            liftNo: String(row["Lift No"] || "").trim(),
            indentNo:
              indentToPoMap[String(row["Indent no."] || "").trim()] ||
              String(row["Indent no."] || "").trim(),
            originalIndentNo: String(row["Indent no."] || "").trim(),
            vendorName: String(row["Vendor Name"] || "").trim(),
            rawMaterialName: String(row["Raw Material Name"] || "").trim(),
            billNo: String(row["Bill No."] || "").trim(),
            qty: String(row["Qty"] || "").trim(),
            liftingQty: String(row["Lifting Qty"] || "").trim(),
            type: String(row["Type"] || "").trim(),
            billCopy: String(row["Bill Image"] || "").trim(),
            driverNo: String(row["Driver No."] || "").trim(),
            areaLifting: String(row["Area lifting"] || "").trim(),
            truckNo: String(row["Truck No."] || "").trim(),
            plannedDate_formatted: formatTimestamp(row["Planned 1"]),
            // Filter columns - using Planned 1 and Actual 1
            filterColPlanned1: row["Planned 1"],
            filterColActual1: row["Actual 1"],
            actual1Timestamp: formatTimestamp(row["Actual 1"]),
            dateOfReceiving_fromSheet: row["Date Of Receiving"] || "",
            dateOfReceiving_formatted: formatTimestamp(
              row["Date Of Receiving"],
            ),
            totalBillQuantity_fromSheet: String(
              row["Total Bill Quantity"] || "",
            ).trim(),
            actualQuantity_fromSheet: String(
              row["Actual Quantity"] || "",
            ).trim(),
            physicalCondition_fromSheet: String(
              row["Physical Condition"] || "",
            ).trim(),
            moisture_fromSheet: String(row["Moisture"] || "").trim(),
            physicalImageUrl_fromSheet: String(
              row["Physical Image Of Product"] || "",
            ).trim(),
            weightSlipImageUrl_fromSheet: String(
              row["Image Of Weight Slip"] || "",
            ).trim(),
            weightSlipQty_fromSheet: String(
              row["Weight Slip Qty"] || "",
            ).trim(),
            firmName: String(row["Firm Name"] || "").trim(),
            orderCancelQty:
              cancelQtyMap[
                indentToPoMap[String(row["Indent no."] || "").trim()] ||
                  String(row["Indent no."] || "").trim()
              ] || "",
            // Unload Approval Fields
            unloadApprovalRequired: String(
              row["Unload Approval Required"] || "",
            ).trim(),
            unloadApprovalStatus: String(
              row["Unload Approval Status"] || "",
            ).trim(),
            plannedUnloadApproval: row["Planned Unload Approval"] || null,
            actualUnloadApproval: row["Actual Unload Approval"] || null,
            unloadApprovalTrigger: row["Unload Approval Trigger"] || null,
            unloadApprovalRemarks: row["Unload Approval Remarks"] || null,
            unloadApprovalBy: row["Unload Approval By"] || null,
            // Helper property to check if quantities match
            _quantitiesMatch: checkQuantitiesMatch(
              row["Total Bill Quantity"],
              row["Actual Quantity"],
            ),
          };
          return rowData;
        });

        // Filter by user's firm name if applicable
        if (user?.firmName) {
          processedData = processedData.filter(
            (lift) =>
              lift &&
              canViewFirm(user.firmName, lift.firmName),
          );
        }
        setAllLiftsData(processedData);
      } catch (err) {
        setErrorData(`Failed to load data: ${err.message}.`);
      } finally {
        setLoadingData(false);
      }
    };
    fetchLiftAccountData();
  }, [refreshTrigger, user]);

  const uniqueFilterOptions = useMemo(() => {
    const vendors = new Set();
    const materials = new Set();
    const types = new Set();
    const quantities = new Set();
    const orders = new Set();
    allLiftsData.forEach((lift) => {
      if (lift.vendorName) vendors.add(lift.vendorName);
      if (lift.rawMaterialName) materials.add(lift.rawMaterialName);
      if (lift.type) types.add(lift.type);
      if (lift.qty) quantities.add(lift.qty);
      if (lift.liftingQty) quantities.add(lift.liftingQty);
      if (lift.totalBillQuantity_fromSheet)
        quantities.add(lift.totalBillQuantity_fromSheet);
      if (lift.actualQuantity_fromSheet)
        quantities.add(lift.actualQuantity_fromSheet);
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
  }, [allLiftsData]);

  const liftsAwaitingReceipt = useMemo(() => {
    return allLiftsData.filter((lift) => {
      // Show when Planned 1 is not null AND (Actual 1 is null OR it's pending/approved unload approval)
      const isPendingApproval = lift.unloadApprovalStatus === "Pending";
      const isApprovedButNotFinalized =
        lift.unloadApprovalStatus === "Approved" &&
        lift.unloadApprovalRequired === "Yes";

      let matches =
        lift.filterColPlanned1 &&
        (!lift.filterColActual1 ||
          isPendingApproval ||
          isApprovedButNotFinalized);
      if (filters.vendorName !== "all")
        matches = matches && lift.vendorName === filters.vendorName;
      if (filters.materialName !== "all")
        matches = matches && lift.rawMaterialName === filters.materialName;
      if (filters.liftType !== "all")
        matches = matches && lift.type === filters.liftType;
      if (filters.orderNumber !== "all")
        matches =
          matches &&
          (lift.indentNo === filters.orderNumber ||
            lift.billNo === filters.orderNumber);
      return matches;
    });
  }, [allLiftsData, filters]);

  // Update Notification Context
  useEffect(() => {
    // Calculate total pending for the firm/user regardless of local filters
    const totalPending = allLiftsData.filter((lift) => {
      const isPending = lift.filterColPlanned1 && !lift.filterColActual1;
      const isPendingApproval = lift.unloadApprovalStatus === "Pending";
      const isApprovedButNotFinalized =
        lift.unloadApprovalStatus === "Approved" &&
        lift.unloadApprovalRequired === "Yes";
      return isPending || isPendingApproval || isApprovedButNotFinalized;
    }).length;
    updateCount("receipt-check", totalPending);
  }, [allLiftsData, updateCount]);

  const derivedMaterialReceipts = useMemo(() => {
    return allLiftsData
      .filter((lift) => {
        // Show when Actual 1 is set AND (no approval required OR rejected OR finalized)
        const isRejected = lift.unloadApprovalStatus === "Rejected";
        const isFinalized = lift.unloadApprovalStatus === "Completed";
        const isApprovedNoRequirement =
          lift.unloadApprovalStatus === "Approved" &&
          lift.unloadApprovalRequired !== "Yes";

        let matches =
          lift.filterColActual1 &&
          (isRejected || isFinalized || isApprovedNoRequirement);
        if (filters.vendorName !== "all")
          matches = matches && lift.vendorName === filters.vendorName;
        if (filters.materialName !== "all")
          matches = matches && lift.rawMaterialName === filters.materialName;
        if (filters.liftType !== "all")
          matches = matches && lift.type === filters.liftType;
        if (filters.orderNumber !== "all")
          matches =
            matches &&
            (lift.indentNo === filters.orderNumber ||
              lift.billNo === filters.orderNumber);
        return matches;
      })
      .sort(
        (a, b) => new Date(b.actual1Timestamp) - new Date(a.actual1Timestamp),
      );
  }, [allLiftsData, filters]);

  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === "file") {
      setFormData((prev) => ({ ...prev, [name]: files?.[0] || null }));
    } else {
      setFormData((prev) => {
        const updated = { ...prev, [name]: value };
        if (name === "actualQuantity" || name === "totalBillQuantity") {
          const rawValue = parseFloat(value) || 0;
          const sanitizedValue = name === "actualQuantity" ? Math.max(0, rawValue) : rawValue;
          
          const billQty =
            parseFloat(
              name === "totalBillQuantity" ? sanitizedValue : prev.totalBillQuantity,
            ) || 0;
          const actualQty =
            parseFloat(
              name === "actualQuantity" ? sanitizedValue : prev.actualQuantity,
            ) || 0;
          updated.qtyDifference = (actualQty - billQty).toFixed(2);
          if (name === "actualQuantity") updated.actualQuantity = sanitizedValue.toString();
        }
        return updated;
      });
    }
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleFormSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleOpenReceiptModal = (lift) => {
    setSelectedLift(lift);
    setFormErrors({});
    const initialTotal = parseFloat(lift.liftingQty) || 0;
    const initialActual =
      parseFloat(lift.actualQuantity_fromSheet || lift.liftingQty) || 0;

    setFormData({
      liftId: lift.id,
      dateOfReceiving:
        lift.dateOfReceiving_fromSheet ||
        new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
      totalBillQuantity: initialTotal.toString(),
      actualQuantity: "",
      qtyDifference: (-initialTotal).toFixed(2),

      physicalCondition: lift.physicalCondition_fromSheet || "Good",
      moisture: lift.moisture_fromSheet || "",
      physicalImageFile: null,
      weightSlipFile: null,
      physicalImageUrl: lift.physicalImageUrl_fromSheet || "",
      weightSlipImageUrl: lift.weightSlipImageUrl_fromSheet || "",
    });
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.dateOfReceiving)
      newErrors.dateOfReceiving = "Date of Receiving is required.";
    if (
      !formData.totalBillQuantity ||
      isNaN(parseFloat(formData.totalBillQuantity))
    )
      newErrors.totalBillQuantity = "Valid Billing Quantity is required.";
    if (!formData.actualQuantity || isNaN(parseFloat(formData.actualQuantity)))
      newErrors.actualQuantity = "Valid Actual Quantity is required.";
    if (!formData.physicalCondition)
      newErrors.physicalCondition = "Physical Condition selection is required.";
    if (!formData.moisture)
      newErrors.moisture = "Moisture selection is required.";

    // Mandatory Image Fields
    if (!formData.physicalImageUrl && !formData.physicalImageFile) {
      newErrors.physicalImageFile = "Physical Image is required.";
    }
    if (!formData.weightSlipImageUrl && !formData.weightSlipFile) {
      newErrors.weightSlipFile = "Weight Slip Image is required.";
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Upload file to Supabase Storage
  const uploadFileToSupabase = async (file, folder) => {
    if (!file) return "";
    try {
      const { url } = await uploadFileToStorage(file, "image", folder);
      return url;
    } catch (error) {
      console.error(`Error uploading ${folder} file:`, error);
      throw new Error(`Failed to upload ${folder}: ${error.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm() || !selectedLift) {
      toast.error("Validation Error", {
        description: "Please fill all required fields or select a lift.",
      });
      return;
    }
    setIsSubmitting(true);
    toast.loading("Submitting receipt details...", { id: "receipt-submit" });

    try {
      let physicalImageUrl = formData.physicalImageUrl || "";
      if (formData.physicalImageFile) {
        physicalImageUrl = await uploadFileToSupabase(
          formData.physicalImageFile,
          "receipt-physical",
        );
      }

      let weightSlipImageUrl = formData.weightSlipImageUrl || "";
      if (formData.weightSlipFile) {
        weightSlipImageUrl = await uploadFileToSupabase(
          formData.weightSlipFile,
          "receipt-weight-slip",
        );
      }

      const now = new Date();
      // Format as YYYY-MM-DD HH:mm:ss (IST)
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");

      const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

      // Calculate quantity difference first
      const totalBillQty = parseFloat(formData.totalBillQuantity) || 0;
      const actualQty = parseFloat(formData.actualQuantity) || 0;
      const qtyDiff = Number((actualQty - totalBillQty).toFixed(2));

      const unloadApprovalTrigger = [
        formData.physicalCondition === "Bad" ? "Condition Bad" : "",
        formData.moisture === "Yes" ? "Moisture Present" : "",
        qtyDiff < 0 ? "Quantity Shortage" : "",
      ]
        .filter(Boolean)
        .join(", ");

      // Highest priority: If quantity shortage, always require unload approval regardless of other conditions
      const needsUnloadApproval = qtyDiff < 0 || Boolean(unloadApprovalTrigger);

      const isReSubmittingApproved =
        selectedLift.unloadApprovalStatus === "Approved" &&
        selectedLift.unloadApprovalRequired === "Yes";
      const isFinalReceiptSubmission =
        !needsUnloadApproval || isReSubmittingApproved;

      // Prepare update data for Supabase LIFT-ACCOUNTS
      const updateData = {
        "Actual 1": timestamp,
        "Date Of Receiving": formData.dateOfReceiving,
        "Total Bill Quantity": parseFloat(formData.totalBillQuantity) || null,
        "Actual Quantity": parseFloat(formData.actualQuantity) || null,
        "Physical Condition": formData.physicalCondition,
        Moisture: formData.moisture || null,
        "Physical Image Of Product": physicalImageUrl || null,
        "Image Of Weight Slip": weightSlipImageUrl || null,
        "Unload Approval Required": needsUnloadApproval ? "Yes" : "No",
        "Planned Unload Approval":
          needsUnloadApproval && !isReSubmittingApproved
            ? timestamp
            : selectedLift.plannedUnloadApproval || null,
        "Actual Unload Approval": isReSubmittingApproved
          ? selectedLift.actualUnloadApproval
          : null,
        "Unload Approval Status": isReSubmittingApproved
          ? "Completed"
          : needsUnloadApproval
            ? "Pending"
            : "Approved",
        "Unload Approval Trigger":
          unloadApprovalTrigger || selectedLift.unloadApprovalTrigger || null,
        "Unload Approval Remarks": selectedLift.unloadApprovalRemarks || null,
        "Unload Approval By": selectedLift.unloadApprovalBy || null,
        "Planned 2": isFinalReceiptSubmission
          ? selectedLift["Planned 2"] || timestamp
          : selectedLift["Planned 2"] || null,
      };

      console.log(
        "Updating LIFT-ACCOUNTS record:",
        selectedLift._dbId,
        updateData,
      );

      // Update the LIFT-ACCOUNTS record in Supabase
      const { error: updateError } = await supabase
        .from("LIFT-ACCOUNTS")
        .update(updateData)
        .eq("id", selectedLift._dbId);

      if (updateError) {
        console.error("LIFT-ACCOUNTS update failed:", updateError);
        throw new Error(
          `Failed to update LIFT-ACCOUNTS: ${updateError.message}`,
        );
      }

      // Calculate quantity difference and update Mismatch table only for shortages (actual < billed)
      if (qtyDiff < 0) {
        const qtyDiffStatus = "Mismatch";

        const mismatchPayload = {
          "Quantity Difference": qtyDiff,
          "Diff Qty": qtyDiff,
          "Qty Diff Status": qtyDiffStatus,
          "Status": "Pending",
        };

        // Check for existing mismatch record
        const { data: existingMismatch, error: existingMismatchError } = await supabase
          .from("Mismatch")
          .select("id")
          .eq('"Lift ID"', selectedLift.id)
          .maybeSingle();

        if (existingMismatch) {
          // Update existing
          const { error: mismatchUpdateError } = await supabase
            .from("Mismatch")
            .update(mismatchPayload)
            .eq("id", existingMismatch.id);

          if (mismatchUpdateError) {
            console.error("Failed to update Mismatch table with qty difference:", mismatchUpdateError);
          }
        } else {
          // Create new record
          const newMismatchRecord = {
            ...mismatchPayload,
            Timestamp: timestamp,
            "Lift Number": selectedLift.liftNo,
            "Lift ID": selectedLift.id,
            "Indent Number": selectedLift.originalIndentNo || selectedLift.indentNo,
            "Firm Name": selectedLift.firmName,
            "Party Name": selectedLift.vendorName,
            "Product Name": selectedLift.rawMaterialName,
            "Qty": selectedLift.qty,
            "Bill No.": selectedLift.billNo,
            "Truck No.": selectedLift.truckNo,
            "Area Lifting": selectedLift.areaLifting || null,
          };

          const { error: mismatchInsertError } = await supabase
            .from("Mismatch")
            .insert([newMismatchRecord]);

          if (mismatchInsertError) {
            console.error("Failed to insert into Mismatch table with qty difference:", mismatchInsertError);
          }
        }
      }

      toast.success("Success!", {
        id: "receipt-submit",
        description: `Receipt for Lift ID ${selectedLift.id} recorded successfully.`,
      });
      setRefreshTrigger((prev) => prev + 1);
      handleModalClose();
    } catch (error) {
      console.error("Error submitting receipt form:", error);
      toast.error("Submission Failed", {
        id: "receipt-submit",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setFormErrors({});
    setFormData({
      liftId: "",
      dateOfReceiving: new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
      }),
      totalBillQuantity: "",
      actualQuantity: "",
      qtyDifference: "0.00",

      physicalCondition: "Good",
      moisture: "",
      physicalImageFile: null,
      weightSlipFile: null,
      physicalImageUrl: "",
      weightSlipImageUrl: "",
    });
    setSelectedLift(null);
  };

  const handleToggleColumn = (tab, dataKey, checked) => {
    if (tab === "awaiting") {
      setVisibleAwaitingReceiptColumns((prev) => ({
        ...prev,
        [dataKey]: checked,
      }));
    } else {
      setVisibleProcessedReceiptsColumns((prev) => ({
        ...prev,
        [dataKey]: checked,
      }));
    }
  };

  const handleSelectAllColumns = (tab, columnsMeta, checked) => {
    const newVisibility = {};
    columnsMeta.forEach((col) => {
      if (col.toggleable && !col.alwaysVisible)
        newVisibility[col.dataKey] = checked;
    });
    if (tab === "awaiting") {
      setVisibleAwaitingReceiptColumns((prev) => ({
        ...prev,
        ...newVisibility,
      }));
    } else {
      setVisibleProcessedReceiptsColumns((prev) => ({
        ...prev,
        ...newVisibility,
      }));
    }
  };

  const renderCell = (item, column) => {
    const value = item[column.dataKey];
    if (column.isLink) {
      return value && String(value).startsWith("http") ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#7da23a] hover:text-green-800 hover:underline inline-flex items-center text-xs"
        >
          <ExternalLink className="w-3 h-3 mr-1" /> {column.linkText || "View"}
        </a>
      ) : (
        <span className="text-xs text-gray-400">N/A</span>
      );
    }
    return value || <span className="text-xs text-gray-400">N/A</span>;
  };

  const exportTableToCSV = (filename, columnsMeta, data, visibilityState) => {
    const exportCols = columnsMeta.filter(
      (col) => col.dataKey !== "actionColumn" && visibilityState[col.dataKey],
    );
    const headers = exportCols.map((col) => `"${col.header}"`).join(",");
    const rows = data.map((row) =>
      exportCols
        .map((col) => `"${String(row[col.dataKey] ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderTableSection = (
    tabKey,
    title,
    description,
    data,
    columnsMeta,
    visibilityState,
  ) => {
    const visibleCols = columnsMeta.filter(
      (col) => visibilityState[col.dataKey],
    );
    const isLoading = loadingData && data.length === 0;
    const hasError = errorData && data.length === 0 && activeTab === tabKey;
    return (
      <Card className="flex-col flex-1 border shadow-sm border-border">
        <CardHeader className="px-4 py-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center font-semibold text-md text-foreground">
                {tabKey === "awaitingReceipt" ? (
                  <PackageOpen className="h-5 w-5 text-[#7da23a] mr-2" />
                ) : (
                  <PackageCheck className="h-5 w-5 text-[#7da23a] mr-2" />
                )}
                {title} ({data.length})
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-0.5">
                {description}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs bg-white"
                onClick={() =>
                  exportTableToCSV(
                    `receipt-${tabKey}.csv`,
                    columnsMeta,
                    data,
                    visibilityState,
                  )
                }
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
              </Button>
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
                          tabKey === "awaitingReceipt"
                            ? "awaiting"
                            : "processed",
                          columnsMeta,
                          true,
                        )
                      }
                    >
                      Reset
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
                                tabKey === "awaitingReceipt"
                                  ? "awaiting"
                                  : "processed",
                                col.dataKey,
                                Boolean(checked),
                              )
                            }
                            disabled={col.alwaysVisible}
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
                          </Label>
                        </div>
                      ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-col flex-1 p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center flex-1 py-10">
              <Loader2 className="h-8 w-8 text-[#7da23a] animate-spin mb-3" />
              <p className="ml-2 text-muted-foreground">Loading...</p>
            </div>
          ) : hasError ? (
            <div className="flex flex-col items-center justify-center flex-1 px-4 py-10 mx-4 my-4 text-center border-2 border-dashed rounded-lg border-destructive-foreground bg-destructive/10">
              <AlertTriangle className="w-10 h-10 mb-3 text-destructive" />
              <p className="font-medium text-destructive">Error Loading Data</p>
              <p className="max-w-md text-sm text-muted-foreground">
                {errorData}
              </p>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 px-4 py-10 mx-4 my-4 text-center border-2 border-dashed rounded-lg border-green-200/50 bg-green-50/50">
              <Info className="w-12 h-12 mb-3 text-green-500" />
              <p className="font-medium text-foreground">No Data Found</p>
              <p className="text-sm text-center text-muted-foreground">
                {tabKey === "awaitingReceipt"
                  ? "No lifts are currently awaiting receipt."
                  : "No processed lifts match the criteria."}
                {user?.firmName && String(user.firmName).toLowerCase() !== "all" && (
                  <span className="block mt-1">
                    (Filtered by firm: {user.firmName})
                  </span>
                )}
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto max-h-[calc(100vh-500px)] relative custom-scrollbar rounded-b-lg">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-30">
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {visibleCols.map((col) => (
                      <th
                        key={col.dataKey}
                        className="px-3 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap"
                      >
                        {col.header}
                      </th>
                    ))}
                    {isSuperAdmin && tabKey === "processedReceipts" && (
                      <th className="px-3 py-3 text-xs font-bold text-purple-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">
                        SA Edit
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {data.map((item) => (
                    <tr
                      key={item._id}
                      className={`hover:bg-green-50/50 transition-colors border-b border-gray-100 ${
                        tabKey === "processedReceipts" && !item._quantitiesMatch
                          ? "bg-red-100 hover:bg-red-200/70 border-l-4 border-l-red-500"
                          : ""
                      }`}
                    >
                      {visibleCols.map((column) => (
                        <td
                          key={`${item._id}-${column.dataKey}`}
                          className={`whitespace-nowrap text-xs px-3 py-2 ${column.dataKey === "id" || column.dataKey === "liftNo" ? "font-medium text-primary" : "text-gray-700"}`}
                        >
                          {column.dataKey === "actionColumn" &&
                          tabKey === "awaitingReceipt" ? (

                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() => handleOpenReceiptModal(item)}
                                disabled={item.unloadApprovalStatus === "Pending"}
                                className="h-7 px-2.5 py-1 text-xs"
                              >
                                {item.unloadApprovalStatus === "Pending"
                                  ? "Pending Approval"
                                  : "Record Receipt"}
                              </Button>
                              {isSuperAdmin && (
                                <button
                                  onClick={() => setSuperAdminEditItem(item)}
                                  className="inline-flex items-center px-2 py-1.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-lg hover:bg-purple-200 border border-purple-300"
                                >
                                  <ShieldCheck className="w-3 h-3 mr-1" />Edit
                                </button>
                              )}
                            </div>
                          ) : (
                            renderCell(item, column)
                          )}
                        </td>
                      ))}
                      {isSuperAdmin && tabKey === "processedReceipts" && (
                        <td className="whitespace-nowrap text-xs px-3 py-2">
                          <button
                            onClick={() => setSuperAdminEditItem(item)}
                            className="inline-flex items-center px-2 py-1.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-lg hover:bg-purple-200 border border-purple-300"
                          >
                            <ShieldCheck className="w-3 h-3 mr-1" />Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen p-4 space-y-4 md:p-6 bg-slate-50">
      <Card className="border-none shadow-md">
        <CardHeader className="p-4 border-b border-gray-200">
          <CardTitle className="flex items-center gap-2 text-lg text-gray-700">
            <PackageOpen className="h-5 w-5 text-[#7da23a]" /> Step 6: Receipt
            Of Material / Physical Quality Check
          </CardTitle>
          <CardDescription className="text-sm text-gray-500">
            Record receipt details and perform quality checks for incoming
            materials.
            {user?.firmName && String(user.firmName).toLowerCase() !== "all" && (
              <span className="ml-2 text-[#7da23a] font-medium">
                • Filtered by: {user.firmName}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex flex-col flex-1"
          >
            <TabsList className="grid w-full sm:w-[480px] grid-cols-2 mb-4">
              <TabsTrigger
                value="awaitingReceipt"
                className="flex items-center gap-2"
              >
                <FileCheckIcon className="w-4 h-4" /> Awaiting Receipt
                <Badge
                  variant="secondary"
                  className="ml-1.5 px-1.5 py-0.5 text-xs"
                >
                  {liftsAwaitingReceipt.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="processedReceipts"
                className="flex items-center gap-2"
              >
                <History className="w-4 h-4" /> Processed Lifts
                <Badge
                  variant="secondary"
                  className="ml-1.5 px-1.5 py-0.5 text-xs"
                >
                  {derivedMaterialReceipts.length}
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
                <Select
                  value={filters.vendorName}
                  onValueChange={(value) =>
                    handleFilterChange("vendorName", value)
                  }
                >
                  <SelectTrigger className="h-8 bg-white">
                    <SelectValue placeholder="All Vendors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vendors</SelectItem>
                    {uniqueFilterOptions.vendorName.map((vendor) => (
                      <SelectItem key={vendor} value={vendor}>
                        {vendor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filters.materialName}
                  onValueChange={(value) =>
                    handleFilterChange("materialName", value)
                  }
                >
                  <SelectTrigger className="h-8 bg-white">
                    <SelectValue placeholder="All Materials" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Materials</SelectItem>
                    {uniqueFilterOptions.materialName.map((material) => (
                      <SelectItem key={material} value={material}>
                        {material}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filters.liftType}
                  onValueChange={(value) =>
                    handleFilterChange("liftType", value)
                  }
                >
                  <SelectTrigger className="h-8 bg-white">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {uniqueFilterOptions.liftType.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filters.totalQuantity}
                  onValueChange={(value) =>
                    handleFilterChange("totalQuantity", value)
                  }
                >
                  <SelectTrigger className="h-8 bg-white">
                    <SelectValue placeholder="All Quantities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Quantities</SelectItem>
                    {uniqueFilterOptions.totalQuantity.map((qty) => (
                      <SelectItem key={qty} value={qty}>
                        {qty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filters.orderNumber}
                  onValueChange={(value) =>
                    handleFilterChange("orderNumber", value)
                  }
                >
                  <SelectTrigger className="h-8 bg-white">
                    <SelectValue placeholder="All Orders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orders</SelectItem>
                    {uniqueFilterOptions.orderNumber.map((order) => (
                      <SelectItem key={order} value={order}>
                        {order}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <TabsContent
              value="awaitingReceipt"
              className="flex flex-col flex-1 mt-0"
            >
              {renderTableSection(
                "awaitingReceipt",
                "Material Lifts Awaiting Receipt",
                "Filtered by Column T (Planned) having a value and Column U (Actual Timestamp) being empty.",
                liftsAwaitingReceipt,
                AWAITING_RECEIPT_COLUMNS_META,
                visibleAwaitingReceiptColumns,
              )}
            </TabsContent>
            <TabsContent
              value="processedReceipts"
              className="flex flex-col flex-1 mt-0"
            >
              {renderTableSection(
                "processedReceipts",
                "Processed Lifts / Receipts",
                "Lifts with a Timestamp in Column U, sorted by latest. Red rows indicate quantity mismatches.",
                derivedMaterialReceipts,
                PROCESSED_RECEIPTS_COLUMNS_META,
                visibleProcessedReceiptsColumns,
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      {superAdminEditItem && (
        <SuperAdminEditModal
          title={`Edit Receipt Record: ${superAdminEditItem.liftNo || superAdminEditItem.id}`}
          tableName="LIFT-ACCOUNTS"
          pkField="id"
          pkValue={superAdminEditItem._dbId}
          fields={[
            { label: "Lift No", dbKey: "Lift No", value: superAdminEditItem.liftNo, type: "text" },
            { label: "Indent No.", dbKey: "Indent no.", value: superAdminEditItem.indentNo, type: "text" },
            { label: "Vendor Name", dbKey: "Vendor Name", value: superAdminEditItem.vendorName, type: "text" },
            { label: "Raw Material Name", dbKey: "Raw Material Name", value: superAdminEditItem.rawMaterialName, type: "text" },
            { label: "Bill No.", dbKey: "Bill No.", value: superAdminEditItem.billNo, type: "text" },
            { label: "Qty", dbKey: "Qty", value: superAdminEditItem.qty, type: "number" },
            { label: "Lifting Qty", dbKey: "Lifting Qty", value: superAdminEditItem.liftingQty, type: "number" },
            { label: "Truck No.", dbKey: "Truck No.", value: superAdminEditItem.truckNo, type: "text" },
            { label: "Firm Name", dbKey: "Firm Name", value: superAdminEditItem.firmName, type: "text" },
            { label: "Physical Condition", dbKey: "Physical Condition", value: superAdminEditItem.physicalCondition_fromSheet, type: "select", options: ["Good", "Bad"] },
            { label: "Moisture", dbKey: "Moisture", value: superAdminEditItem.moisture_fromSheet, type: "select", options: ["Yes", "No"] },
            { label: "Total Bill Quantity", dbKey: "Total Bill Quantity", value: superAdminEditItem.totalBillQuantity_fromSheet, type: "number" },
            { label: "Actual Quantity", dbKey: "Actual Quantity", value: superAdminEditItem.actualQuantity_fromSheet, type: "number" },
            { label: "Weight Slip Qty", dbKey: "Weight Slip Qty", value: superAdminEditItem.weightSlipQty_fromSheet, type: "number" },
          ]}
          onClose={() => setSuperAdminEditItem(null)}
          onSaved={() => { setSuperAdminEditItem(null); setRefreshTrigger((p) => p + 1); }}
        />
      )}
      <ReceiptFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        liftData={selectedLift}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label
                htmlFor="dateOfReceiving"
                className="block text-sm font-medium text-gray-700"
              >
                Date Of Receiving <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                id="dateOfReceiving"
                name="dateOfReceiving"
                value={formData.dateOfReceiving}
                onChange={handleInputChange}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${formErrors.dateOfReceiving ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 focus:border-[#6b8e2f] focus:ring-[#6b8e2f]"}`}
              />
              {formErrors.dateOfReceiving && (
                <p className="mt-1 text-xs text-red-500">
                  {formErrors.dateOfReceiving}
                </p>
              )}
            </div>
            <div>
              <Label
                htmlFor="totalBillQuantity"
                className="block text-sm font-medium text-gray-700"
              >
                Billing Quantity <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                step="0.01"
                id="totalBillQuantity"
                name="totalBillQuantity"
                value={formData.totalBillQuantity}
                onChange={handleInputChange}
                readOnly
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-50 focus:border-[#6b8e2f] focus:ring-[#6b8e2f] sm:text-sm cursor-not-allowed"
              />
            </div>
            <div>
              <Label
                htmlFor="actualQuantity"
                className="block text-sm font-medium text-gray-700"
              >
                Truck Quantity (WeightSlip) <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                id="actualQuantity"
                name="actualQuantity"
                value={formData.actualQuantity}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#6b8e2f] focus:ring-[#6b8e2f] sm:text-sm"
              />
            </div>

            <div>
              <Label
                htmlFor="qtyDifference"
                className="block text-sm font-medium text-gray-700"
              >
                Difference
              </Label>
              <Input
                type="text"
                id="qtyDifference"
                name="qtyDifference"
                value={formData.qtyDifference}
                readOnly
                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm bg-gray-50 sm:text-sm"
              />
            </div>
            <div>
              <Label
                htmlFor="physicalCondition"
                className="block text-sm font-medium text-gray-700"
              >
                Physical Condition <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.physicalCondition}
                onValueChange={(value) =>
                  handleFormSelectChange("physicalCondition", value)
                }
              >
                <SelectTrigger
                  className={`mt-1 w-full rounded-md shadow-sm sm:text-sm ${formErrors.physicalCondition ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 focus:border-[#6b8e2f] focus:ring-[#6b8e2f]"}`}
                >
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Bad">Bad</SelectItem>
                </SelectContent>
              </Select>
              {formErrors.physicalCondition && (
                <p className="mt-1 text-xs text-red-500">
                  {formErrors.physicalCondition}
                </p>
              )}
            </div>
            <div>
              <Label
                htmlFor="moisture"
                className="block text-sm font-medium text-gray-700"
              >
                Moisture <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.moisture}
                onValueChange={(value) =>
                  handleFormSelectChange("moisture", value)
                }
              >
                <SelectTrigger
                  className={`mt-1 w-full rounded-md shadow-sm sm:text-sm ${formErrors.moisture ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 focus:border-[#6b8e2f] focus:ring-[#6b8e2f]"}`}
                >
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
              {formErrors.moisture && (
                <p className="mt-1 text-xs text-red-500">
                  {formErrors.moisture}
                </p>
              )}
            </div>
            <div className="md:col-span-1">
              <Label
                htmlFor="physicalImageFile"
                className="block text-sm font-medium text-gray-700"
              >
                Physical Image <span className="text-red-500">*</span>
              </Label>
              <Input
                type="file"
                id="physicalImageFile"
                name="physicalImageFile"
                onChange={handleInputChange}
                accept="image/*,.pdf"
                className={`mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-[#6b8e2f] hover:file:bg-green-100 ${formErrors.physicalImageFile ? "border-red-500 ring-1 ring-red-500 rounded-md" : ""}`}
              />
              {formData.physicalImageFile && (
                <p className="mt-1 text-xs text-gray-500">
                  Selected: {formData.physicalImageFile.name}
                </p>
              )}
              {formData.physicalImageUrl && !formData.physicalImageFile && (
                <p className="mt-1 text-xs text-gray-500">
                  Existing:{" "}
                  <a
                    href={formData.physicalImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-500 hover:underline"
                  >
                    View
                  </a>
                </p>
              )}
              {formErrors.physicalImageFile && (
                <p className="mt-1 text-xs text-red-500">
                  {formErrors.physicalImageFile}
                </p>
              )}
            </div>
            <div className="md:col-span-1">
              <Label
                htmlFor="weightSlipFile"
                className="block text-sm font-medium text-gray-700"
              >
                Weight Slip Image <span className="text-red-500">*</span>
              </Label>
              <Input
                type="file"
                id="weightSlipFile"
                name="weightSlipFile"
                onChange={handleInputChange}
                accept="image/*,.pdf"
                className={`mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-[#6b8e2f] hover:file:bg-green-100 ${formErrors.weightSlipFile ? "border-red-500 ring-1 ring-red-500 rounded-md" : ""}`}
              />
              {formData.weightSlipFile && (
                <p className="mt-1 text-xs text-gray-500">
                  Selected: {formData.weightSlipFile.name}
                </p>
              )}
              {formData.weightSlipImageUrl && !formData.weightSlipFile && (
                <p className="mt-1 text-xs text-gray-500">
                  Existing:{" "}
                  <a
                    href={formData.weightSlipImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-500 hover:underline"
                  >
                    View
                  </a>
                </p>
              )}
              {formErrors.weightSlipFile && (
                <p className="mt-1 text-xs text-red-500">
                  {formErrors.weightSlipFile}
                </p>
              )}
            </div>
          </div>

          {/* Quantity Comparison Warning Removed */}

          <div className="flex flex-col gap-3 pt-5 sm:pt-6 sm:flex-row-reverse sm:gap-0 sm:justify-start">
            <Button
              type="submit"
              disabled={isSubmitting}
              className={`w-full sm:w-auto inline-flex justify-center py-2.5 px-6 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white ${isSubmitting ? "bg-green-400 cursor-not-allowed" : "bg-[#7da23a] hover:bg-[#6b8e2f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6b8e2f]"}`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin my-0.5" />{" "}
                  Saving...
                </>
              ) : (
                "Save Receipt & Update Lift"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleModalClose}
              className="w-full sm:w-auto inline-flex justify-center py-2.5 px-6 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 sm:mr-3"
            >
              Cancel
            </Button>
          </div>
        </form>
      </ReceiptFormModal>
    </div>
  );
}
