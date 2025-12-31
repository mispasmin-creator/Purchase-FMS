"use client";
import { useState, useEffect, useMemo, useContext, useCallback } from "react";
import {
  Loader2,
  AlertTriangle,
  TrendingDown,
  DollarSign,
  Package,
  Info,
  Filter,
  ExternalLink,
  Beaker,
  Edit,
  Eye,
  FileText,
  AlertCircle,
  RefreshCw,
  Save,
  X,
} from "lucide-react";
import { MixerHorizontalIcon } from "@radix-ui/react-icons";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { AuthContext } from "../context/AuthContext";
import { toast } from "sonner";

// Constants
const SHEET_ID = "1NUxf4pnQ-CtCFUjA5rqLgYEJiU77wQlwVyimjt8RmFQ";
const LIFT_ACCOUNTS_SHEET = "LIFT-ACCOUNTS";
const INDENT_PO_SHEET = "INDENT-PO";
const TL_SHEET = "TL";

// Rate Mismatch Columns Meta - ALL LIFT-ACCOUNTS + INDENT-PO columns
const RATE_MISMATCH_COLUMNS_META = [
  // Core mismatch fields
    { header: "Actions", dataKey: "actions", toggleable: false, alwaysVisible: true },

  { header: "Lift ID", dataKey: "id", toggleable: true, alwaysVisible: true },
  { header: "Indent Number", dataKey: "indentNo", toggleable: true },
  { header: "Material Rate (Lift)", dataKey: "materialRate", toggleable: true },
  { header: "PO Rate (Original)", dataKey: "poRate", toggleable: true },
  { header: "Rate Difference", dataKey: "rateDifference", toggleable: true },
  
  // ALL LIFT-ACCOUNTS columns (excluding Planned/Actual/Delay - columns 19-21, 29-31, 34-36, 52-54)
  { header: "Timestamp (Lift)", dataKey: "timestamp", toggleable: true },
  { header: "Vendor Name", dataKey: "vendorName", toggleable: true },
  { header: "Qty", dataKey: "quantity", toggleable: true },
  { header: "Raw Material Name", dataKey: "material", toggleable: true },
  { header: "Bill No.", dataKey: "billNo", toggleable: true },
  { header: "Area lifting", dataKey: "areaLifting", toggleable: true },
  { header: "Lead Time To Reach Factory (days)", dataKey: "leadTimeToFactory", toggleable: true },
  { header: "Lifting Qty", dataKey: "liftingQty", toggleable: true },
  { header: "Type", dataKey: "liftType", toggleable: true },
  { header: "Transporter Name", dataKey: "transporterName", toggleable: true },
  { header: "Truck No.", dataKey: "truckNo", toggleable: true },
  { header: "Driver No.", dataKey: "driverNo", toggleable: true },
  { header: "Bilty No.", dataKey: "biltyNo", toggleable: true },
  { header: "Type Of Transporting Rate", dataKey: "typeOfTransportingRate", toggleable: true },
  { header: "Rate (Lift)", dataKey: "materialRate", toggleable: true },
  { header: "Bill Image", dataKey: "billImageUrl", toggleable: true, isLink: true, linkText: "View" },
  { header: "Truck Qty", dataKey: "truckQty", toggleable: true },
  { header: "Date Of Receiving", dataKey: "dateOfReceiving", toggleable: true },
  { header: "Total Bill Quantity", dataKey: "totalBillQuantity", toggleable: true },
  { header: "Actual Quantity", dataKey: "actualQuantity", toggleable: true },
  { header: "Physical Condition", dataKey: "physicalCondition", toggleable: true },
  { header: "Moisture", dataKey: "moisture", toggleable: true },
  { header: "Physical Image", dataKey: "physicalImageUrl", toggleable: true, isLink: true, linkText: "View" },
  { header: "Image Of Weight Slip", dataKey: "weightSlipImageUrl", toggleable: true, isLink: true, linkText: "View" },
  { header: "Bilty No. 2", dataKey: "biltyNo2", toggleable: true },
  { header: "Bilty Image", dataKey: "biltyImageUrl", toggleable: true, isLink: true, linkText: "View" },
  { header: "Status (Lift)", dataKey: "status", toggleable: true },
  { header: "Date Of Test", dataKey: "dateOfTest", toggleable: true },
  { header: "Moisture Percent Age %", dataKey: "moisturePercent", toggleable: true },
  { header: "BD Percent Age %", dataKey: "bdPercent", toggleable: true },
  { header: "AP Percent Age %", dataKey: "apPercent", toggleable: true },
  { header: "Alumina % (Lift)", dataKey: "aluminaPercent", toggleable: true },
  { header: "Iron % (Lift)", dataKey: "ironPercent", toggleable: true },
  { header: "Sieve Analysis", dataKey: "sieveAnalysis", toggleable: true },
  { header: "LOI %", dataKey: "loiPercent", toggleable: true },
  { header: "SIO2 %", dataKey: "sio2Percent", toggleable: true },
  { header: "CaO %", dataKey: "caoPercent", toggleable: true },
  { header: "MgO %", dataKey: "mgoPercent", toggleable: true },
  { header: "TiO2 %", dataKey: "tio2Percent", toggleable: true },
  { header: "K2O + Na2O %", dataKey: "k2oNa2oPercent", toggleable: true },
  { header: "Free Iron %", dataKey: "freeIronPercent", toggleable: true },
  { header: "Firm Name (Lift)", dataKey: "firmName", toggleable: true },
  { header: "Weight Slip Qty", dataKey: "weightSlipQty", toggleable: true },
  { header: "Transporter Rate", dataKey: "transporterRate", toggleable: true },
  
  // ALL INDENT-PO columns (excluding Planned/Actual/Delay and duplicates)
  { header: "PO Timestamp", dataKey: "poTimestamp", toggleable: true },
  { header: "Indent Id", dataKey: "indentId", toggleable: true },
  { header: "Firm Name (PO)", dataKey: "poFirmName", toggleable: true },
  { header: "Generated By", dataKey: "poGeneratedBy", toggleable: true },
  { header: "Vendor (PO)", dataKey: "poVendor", toggleable: true },
  { header: "Material (PO)", dataKey: "poMaterial", toggleable: true },
  { header: "Quantity (PO)", dataKey: "poQuantity", toggleable: true },
  { header: "Current Stock", dataKey: "poCurrentStock", toggleable: true },
  { header: "Priority", dataKey: "poPriority", toggleable: true },
  { header: "Delivery Order No.", dataKey: "poDeliveryOrderNo", toggleable: true },
  { header: "Notes (PO)", dataKey: "poNotes", toggleable: true },
  { header: "Approved Qty", dataKey: "poApprovedQty", toggleable: true },
  { header: "Approval Status", dataKey: "poApprovalStatus", toggleable: true },
  { header: "Remarks (PO)", dataKey: "poRemarks", toggleable: true },
  { header: "Have To Make PO", dataKey: "poHaveToMake", toggleable: true },
  { header: "Rate (PO)", dataKey: "poRate", toggleable: true },
  { header: "Lead Time (days)", dataKey: "poLeadTime", toggleable: true },
  { header: "Total Quantity (PO)", dataKey: "poTotalQuantity", toggleable: true },
  { header: "Total Amount", dataKey: "poTotalAmount", toggleable: true },
  { header: "PO Copy", dataKey: "poCopyUrl", toggleable: true, isLink: true, linkText: "View" },
  { header: "Advance To Be Paid", dataKey: "poAdvanceToBePaid", toggleable: true },
  { header: "To Be Paid Amount", dataKey: "poToBePaidAmount", toggleable: true },
  { header: "When To Be Paid", dataKey: "poWhenToBePaid", toggleable: true },
  { header: "PO Notes", dataKey: "poPONotes", toggleable: true },
  { header: "Alumina % (PO)", dataKey: "poAluminaPercent", toggleable: true },
  { header: "Iron % (PO)", dataKey: "poIronPercent", toggleable: true },
  { header: "Total Lifted", dataKey: "poTotalLifted", toggleable: true },
  { header: "Pending Qty", dataKey: "poPendingQty", toggleable: true },
  // { header: "Order Cancel Qty", dataKey: "poOrderCancelQty", toggleable: true },
  // { header: "Status (PO)", dataKey: "poStatus", toggleable: true },
  
];

// Quantity Mismatch Columns Meta - ALL LIFT-ACCOUNTS + INDENT-PO columns
const QUANTITY_MISMATCH_COLUMNS_META = [
  // Core mismatch fields
  { header: "Lift Number", dataKey: "liftNo", toggleable: true, alwaysVisible: true },
  { header: "PO Number", dataKey: "indentNo", toggleable: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "Party Name", dataKey: "vendorName", toggleable: true },
  { header: "Product Name", dataKey: "rawMaterialName", toggleable: true },
  { header: "Lifted Qty (Column J)", dataKey: "liftedQty", toggleable: true },
  { header: "Actual Quantity (Column Y)", dataKey: "actualQuantityY", toggleable: true },
  { header: "Weight Slip Qty (Column BF)", dataKey: "weightSlipQty", toggleable: true },
  { header: "Quantity Difference", dataKey: "qtyDifference", toggleable: true },
  
  // Additional LIFT-ACCOUNTS columns
  { header: "Timestamp (Lift)", dataKey: "timestamp", toggleable: true },
  { header: "Bill No.", dataKey: "billNo", toggleable: true },
  { header: "Area lifting", dataKey: "areaLifting", toggleable: true },
  { header: "Lead Time To Reach Factory (days)", dataKey: "leadTimeToFactory", toggleable: true },
  { header: "Type", dataKey: "liftType", toggleable: true },
  { header: "Transporter Name", dataKey: "transporterName", toggleable: true },
  { header: "Truck No.", dataKey: "truckNo", toggleable: true },
  { header: "Driver No.", dataKey: "driverNo", toggleable: true },
  { header: "Bilty No.", dataKey: "biltyNo", toggleable: true },
  { header: "Type Of Transporting Rate", dataKey: "typeOfTransportingRate", toggleable: true },
  { header: "Rate (Lift)", dataKey: "materialRate", toggleable: true },
  { header: "Bill Image", dataKey: "billImageUrl", toggleable: true, isLink: true, linkText: "View" },
  { header: "Truck Qty", dataKey: "truckQty", toggleable: true },
  { header: "Date Of Receiving", dataKey: "dateOfReceiving_formatted", toggleable: true },
  { header: "Total Bill Quantity", dataKey: "totalBillQuantity", toggleable: true },
  { header: "Actual Quantity", dataKey: "actualQuantity", toggleable: true },
  { header: "Physical Condition", dataKey: "physicalCondition_fromSheet", toggleable: true },
  { header: "Moisture", dataKey: "moisture", toggleable: true },
  { header: "Physical Image", dataKey: "physicalImageUrl", toggleable: true, isLink: true, linkText: "View" },
  { header: "Image Of Weight Slip", dataKey: "weightSlipImageUrl", toggleable: true, isLink: true, linkText: "View" },
  
  // INDENT-PO columns
  { header: "PO Timestamp", dataKey: "poTimestamp", toggleable: true },
  { header: "Generated By", dataKey: "poGeneratedBy", toggleable: true },
  { header: "Quantity (PO)", dataKey: "poQuantity", toggleable: true },
  { header: "Current Stock", dataKey: "poCurrentStock", toggleable: true },
  { header: "Priority", dataKey: "poPriority", toggleable: true },
  { header: "Delivery Order No.", dataKey: "poDeliveryOrderNo", toggleable: true },
  { header: "Notes (PO)", dataKey: "poNotes", toggleable: true },
  { header: "Approved Qty", dataKey: "poApprovedQty", toggleable: true },
  { header: "Approval Status", dataKey: "poApprovalStatus", toggleable: true },
  { header: "Have To Make PO", dataKey: "poHaveToMake", toggleable: true },
  { header: "Rate (PO)", dataKey: "poRate", toggleable: true },
  { header: "Lead Time (days)", dataKey: "poLeadTime", toggleable: true },
  { header: "Total Quantity (PO)", dataKey: "poTotalQuantity", toggleable: true },
  { header: "Total Amount", dataKey: "poTotalAmount", toggleable: true },
  { header: "PO Copy", dataKey: "poCopyUrl", toggleable: true, isLink: true, linkText: "View" },
  { header: "Advance To Be Paid", dataKey: "poAdvanceToBePaid", toggleable: true },
  { header: "To Be Paid Amount", dataKey: "poToBePaidAmount", toggleable: true },
  { header: "When To Be Paid", dataKey: "poWhenToBePaid", toggleable: true },
  { header: "PO Notes", dataKey: "poPONotes", toggleable: true },
  { header: "Alumina % (PO)", dataKey: "poAluminaPercent", toggleable: true },
  { header: "Iron % (PO)", dataKey: "poIronPercent", toggleable: true },
  { header: "Total Lifted (PO)", dataKey: "poTotalLifted", toggleable: true },
  { header: "Pending Qty (PO)", dataKey: "poPendingQty", toggleable: true },
  { header: "Order Cancel Qty", dataKey: "poOrderCancelQty", toggleable: true },
  { header: "Status (PO)", dataKey: "poStatus", toggleable: true },
  
  { header: "Actions", dataKey: "actions", toggleable: false, alwaysVisible: true },
];

// Material Properties Mismatch Columns Meta - ALL LIFT-ACCOUNTS + INDENT-PO + TL columns
const MATERIAL_MISMATCH_COLUMNS_META = [
  // Core mismatch fields
  { header: "Lift Number", dataKey: "liftNo", toggleable: true, alwaysVisible: true },
  { header: "Raw Material", dataKey: "rawMaterial", toggleable: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "TL Alumina %", dataKey: "tlAlumina", toggleable: true },
  { header: "Lift Alumina %", dataKey: "liftAlumina", toggleable: true },
  { header: "Alumina Diff", dataKey: "aluminaDiff", toggleable: true },
  { header: "TL Iron %", dataKey: "tlIron", toggleable: true },
  { header: "Lift Iron %", dataKey: "liftIron", toggleable: true },
  { header: "Iron Diff", dataKey: "ironDiff", toggleable: true },
  { header: "TL AP", dataKey: "tlAP", toggleable: true },
  { header: "Lift AP", dataKey: "liftAP", toggleable: true },
  { header: "AP Diff", dataKey: "apDiff", toggleable: true },
  
  // Additional LIFT-ACCOUNTS columns
  { header: "Indent Number", dataKey: "indentNo", toggleable: true },
  { header: "Vendor Name", dataKey: "vendorName", toggleable: true },
  { header: "Bill No.", dataKey: "billNo", toggleable: true },
  { header: "Lifted On", dataKey: "createdAt", toggleable: true },
  { header: "Lifting Qty", dataKey: "liftingQty", toggleable: true },
  { header: "Type", dataKey: "liftType", toggleable: true },
  { header: "Transporter Name", dataKey: "transporterName", toggleable: true },
  { header: "Truck No.", dataKey: "truckNo", toggleable: true },
  { header: "Date Of Receiving", dataKey: "dateOfReceiving_formatted", toggleable: true },
  { header: "Physical Condition", dataKey: "physicalCondition_fromSheet", toggleable: true },
  { header: "Moisture %", dataKey: "moisturePercent", toggleable: true },
  { header: "BD %", dataKey: "bdPercent", toggleable: true },
  { header: "AP % (Lift)", dataKey: "apPercent", toggleable: true },
  { header: "Sieve Analysis", dataKey: "sieveAnalysis", toggleable: true },
  { header: "LOI %", dataKey: "loiPercent", toggleable: true },
  { header: "SIO2 %", dataKey: "sio2Percent", toggleable: true },
  { header: "CaO %", dataKey: "caoPercent", toggleable: true },
  { header: "MgO %", dataKey: "mgoPercent", toggleable: true },
  { header: "TiO2 %", dataKey: "tio2Percent", toggleable: true },
  { header: "K2O + Na2O %", dataKey: "k2oNa2oPercent", toggleable: true },
  { header: "Free Iron %", dataKey: "freeIronPercent", toggleable: true },
  { header: "Weight Slip Qty", dataKey: "weightSlipQty", toggleable: true },
  
  // INDENT-PO columns
  { header: "PO Timestamp", dataKey: "poTimestamp", toggleable: true },
  { header: "Generated By", dataKey: "poGeneratedBy", toggleable: true },
  { header: "Vendor (PO)", dataKey: "poVendor", toggleable: true },
  { header: "Quantity (PO)", dataKey: "poQuantity", toggleable: true },
  { header: "Current Stock", dataKey: "poCurrentStock", toggleable: true },
  { header: "Priority", dataKey: "poPriority", toggleable: true },
  { header: "Delivery Order No.", dataKey: "poDeliveryOrderNo", toggleable: true },
  { header: "Notes (PO)", dataKey: "poNotes", toggleable: true },
  { header: "Approved Qty", dataKey: "poApprovedQty", toggleable: true },
  { header: "Approval Status", dataKey: "poApprovalStatus", toggleable: true },
  { header: "Rate (PO)", dataKey: "poRate", toggleable: true },
  { header: "Lead Time (days)", dataKey: "poLeadTime", toggleable: true },
  { header: "Total Quantity (PO)", dataKey: "poTotalQuantity", toggleable: true },
  { header: "Total Amount", dataKey: "poTotalAmount", toggleable: true },
  { header: "Alumina % (PO)", dataKey: "poAluminaPercent", toggleable: true },
  { header: "Iron % (PO)", dataKey: "poIronPercent", toggleable: true },
  { header: "Total Lifted (PO)", dataKey: "poTotalLifted", toggleable: true },
  { header: "Pending Qty (PO)", dataKey: "poPendingQty", toggleable: true },
  { header: "Status (PO)", dataKey: "poStatus", toggleable: true },
  
  // TL columns
  { header: "TL Raw Material", dataKey: "tlRawMaterial", toggleable: true },
  
  { header: "Actions", dataKey: "actions", toggleable: false, alwaysVisible: true },
];

// Helper functions
const parseGvizResponse = (text, sheetNameForError) => {
  if (!text || !text.includes("google.visualization.Query.setResponse")) {
    console.error(`[ParseGviz] Invalid or empty gviz response for ${sheetNameForError}:`, text ? text.substring(0, 500) : "Response was null/empty");
    throw new Error(`Invalid response format from Google Sheets for ${sheetNameForError}. Ensure it's link-shareable as 'Viewer'.`);
  }
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) {
    console.error(`[ParseGviz] JSON delimiters not found for ${sheetNameForError}. Text:`, text.substring(0, 200));
    throw new Error(`Could not parse JSON from Google Sheets response for ${sheetNameForError}. Text: ${text.substring(0, 200)}`);
  }
  const jsonString = text.substring(jsonStart, jsonEnd + 1);
  try {
    const data = JSON.parse(jsonString);
    if (!data.table || !data.table.cols) {
      console.warn(`[ParseGviz] No data.table or cols in ${sheetNameForError} or sheet is empty`, data);
      return { cols: [], rows: [] };
    }
    if (!data.table.rows) {
      console.warn(`[ParseGviz] No data.table.rows in ${sheetNameForError}, treating as empty.`, data);
      data.table.rows = [];
    }
    return data.table;
  } catch (e) {
    console.error(`[ParseGviz] Error parsing JSON for ${sheetNameForError}:`, e, "JSON String:", jsonString.substring(0, 500));
    throw new Error(`Failed to parse JSON response from Google Sheets for ${sheetNameForError}. Error: ${e.message}`);
  }
};

const formatDateString = (dateValue) => {
  if (!dateValue || typeof dateValue !== "string" || !dateValue.trim()) {
    return "";
  }
  let parsedDate;
  const gvizMatch = dateValue.match(/^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?/);
  if (gvizMatch) {
    const [, year, month, day, hours, minutes, seconds] = gvizMatch.map(Number);
    parsedDate = new Date(year, month, day, hours || 0, minutes || 0, seconds || 0);
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
    }).format(parsedDate).replace(/,/g, "");
  }
  return dateValue;
};

const formatTimestamp = (timestampStr) => {
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
};

export default function MismatchAnalysis() {
  const { user } = useContext(AuthContext);
  const [liftAccountsData, setLiftAccountsData] = useState([]);
  const [purchaseOrdersData, setPurchaseOrdersData] = useState([]);
  const [tlData, setTlData] = useState([]);
  const [loadingLifts, setLoadingLifts] = useState(true);
  const [loadingPOs, setLoadingPOs] = useState(true);
  const [loadingTL, setLoadingTL] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("rateMismatch");
  const [visibleRateMismatchColumns, setVisibleRateMismatchColumns] = useState({});
  const [visibleQuantityMismatchColumns, setVisibleQuantityMismatchColumns] = useState({});
  const [visibleMaterialMismatchColumns, setVisibleMaterialMismatchColumns] = useState({});
  const [mismatchSheetData, setMismatchSheetData] = useState([]);
const [loadingMismatch, setLoadingMismatch] = useState(false);

  const [filters, setFilters] = useState({
    vendorName: "all",
    materialName: "all",
    firmName: "all",
    orderNumber: "all",
  });

  // Modal states
  const [editingRow, setEditingRow] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedRows, setSubmittedRows] = useState(new Set());
  const fetchMismatchSheetData = useCallback(async () => {
  setLoadingMismatch(true);
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=Mismatch`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch Mismatch sheet: ${response.status}`);
    
    const text = await response.text();
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    const jsonString = text.substring(jsonStart, jsonEnd + 1);
    const data = JSON.parse(jsonString);

    let processedRows = [];
    if (data.table && data.table.cols && data.table.rows) {
      processedRows = (data.table.rows || [])
        .slice(1) // Skip header row
        .filter(row => row.c && row.c[2] && row.c[2].v) // Column C (Indent Number)
        .map(row => ({
          indentNo: String(row.c[2]?.v || "").trim(), // Column C: Indent Number
          liftId: String(row.c[1]?.v || "").trim(), // Column B: Lift ID
          timestamp: String(row.c[0]?.v || "").trim(), // Column A: Timestamp
        }));
    }

    setMismatchSheetData(processedRows);
  } catch (error) {
    console.error("Failed to load Mismatch sheet:", error);
    setMismatchSheetData([]);
  } finally {
    setLoadingMismatch(false);
  }
}, []);

  // Initialize column visibility
  useEffect(() => {
    const initializeVisibility = (columnsMeta) => {
      const visibility = {};
      columnsMeta.forEach((col) => {
        visibility[col.dataKey] = col.alwaysVisible || col.toggleable;
      });
      return visibility;
    };
    setVisibleRateMismatchColumns(initializeVisibility(RATE_MISMATCH_COLUMNS_META));
    setVisibleQuantityMismatchColumns(initializeVisibility(QUANTITY_MISMATCH_COLUMNS_META));
    setVisibleMaterialMismatchColumns(initializeVisibility(MATERIAL_MISMATCH_COLUMNS_META));
  }, []);

  // Initialize form data
  const initializeFormData = (rowId) => {
    setFormData({
      status: 'Credit Notes',
      remarks: ''
    });
  };

  // Handle form changes
  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Action handlers
  const handleViewDetails = (item, mismatchType) => {
    const details = {
      rateMismatch: {
        title: "Rate Mismatch Details",
        content: `Lift ID: ${item.id}\nMaterial Rate: ₹${item.materialRate}\nPO Rate: ₹${item.poRate}\nDifference: ₹${item.rateDifference}\nVendor: ${item.vendorName}\nMaterial: ${item.material}`
      },
      quantityMismatch: {
        title: "Quantity Mismatch Details", 
      content: `Lift No: ${item.liftNo}\nLifting Qty (Col J): ${item.liftedQty}\nActual Qty (Col Y): ${item.actualQuantityY}\nDifference: ${item.qtyDifference}\nVendor: ${item.vendorName}\nMaterial: ${item.rawMaterialName}`
      },
      materialMismatch: {
        title: "Material Properties Mismatch Details",
        content: `Lift No: ${item.liftNo}\nRaw Material: ${item.rawMaterial}\nAlumina: TL ${item.tlAlumina}% vs Lift ${item.liftAlumina}% (Diff: ${item.aluminaDiff}%)\nIron: TL ${item.tlIron}% vs Lift ${item.liftIron}% (Diff: ${item.ironDiff}%)\nAP: TL ${item.tlAP} vs Lift ${item.liftAP} (Diff: ${item.apDiff})`
      }
    };

    toast.info(details[mismatchType].title, {
      description: details[mismatchType].content,
      duration: 10000,
    });
  };

  const handleCorrectData = (item, mismatchType) => {
    setEditingRow(item.id || item.liftNo);
    initializeFormData(item.id || item.liftNo);
  };

  const handleReportIssue = (item, mismatchType) => {
    toast.success("Issue Reported", {
      description: `Mismatch issue has been reported to the quality team. Reference: ${item.id || item.liftNo}`,
      duration: 3000,
    });
  };

  const handleExportData = (item, mismatchType) => {
    // Create CSV data for the specific item
    const csvData = Object.entries(item)
      .filter(([key]) => !key.startsWith('_'))
      .map(([key, value]) => `"${key}","${value}"`)
      .join('\n');

    const blob = new Blob([`"Field","Value"\n${csvData}`], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mismatchType}_${item.id || item.liftNo}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast.success("Data Exported", {
      description: `${mismatchType} data exported successfully for ${item.id || item.liftNo}`,
      duration: 3000,
    });
  };

  // UPDATED: Submit form data to Mismatch sheet with correct sheetName
  const submitFormData = async () => {
    if (!editingRow) return;

    const data = formData;
    
    if (!data) {
      alert('No form data to submit');
      return;
    }

    setSubmitting(true);

    try {
      const appsScriptUrl = 'https://script.google.com/macros/s/AKfycbzj9zlZTEhdlmaMt78Qy3kpkz7aOfVKVBRuJkd3wv_UERNrIRCaepSULpNa7W1g-pw/exec';
      
      const currentDate = new Date();
      const actualDateTime = currentDate.toLocaleString("en-GB", { hour12: false }).replace(",", "");
      
      const submitFormData = {
        actual: actualDateTime,
        status: data.status || 'Credit Notes',
        remarks: data.remarks || ''
      };

      // FIXED: Use LIFT-ACCOUNTS as source sheet to find the data, then Apps Script will create row in Mismatch sheet
      const requestData = {
        action: 'submitForm',
        sheetName: 'LIFT-ACCOUNTS', // This tells Apps Script where to find the source data
        liftNo: editingRow,
        type: 'mismatch-correction', // This triggers the new case that creates Mismatch sheet entry
        formData: JSON.stringify(submitFormData)
      };

      const formDataToSend = new FormData();
      Object.keys(requestData).forEach(key => {
        formDataToSend.append(key, requestData[key]);
      });

      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        body: formDataToSend,
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();
      let result;
      
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        const responseLower = responseText.toLowerCase();
        const successIndicators = ['success', 'updated', 'submitted', 'complete', 'true'];
        const errorIndicators = ['error', 'failed', 'exception', 'false'];
        
        const hasSuccess = successIndicators.some(indicator => responseLower.includes(indicator));
        const hasError = errorIndicators.some(indicator => responseLower.includes(indicator));
        
        if (hasError && !hasSuccess) {
          throw new Error(`Apps Script error: ${responseText}`);
        } else {
          result = { success: true, message: 'Form submitted successfully' };
        }
      }

      if (result.success === false || (result.error && !result.success)) {
        throw new Error(result.error || result.message || 'Form submission failed');
      }

      setSubmittedRows(prev => new Set([...prev, `mismatch_${editingRow}`]));
      setEditingRow(null);
      
      toast.success(`✅ SUCCESS: Mismatch data submitted to Mismatch sheet for: ${editingRow}\nSubmitted at: ${actualDateTime}`);
      
      setTimeout(() => {
        // Refresh data
        fetchLiftAccountsData();
        fetchPurchaseOrdersData();
        fetchTLData();
      }, 2000);
      
    } catch (error) {
      console.error('Submission error:', error);
      toast.error(`❌ SUBMISSION FAILED: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Modal render function
  const renderModal = () => {
    if (!editingRow) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Submit Mismatch Correction</h3>
              <button
                onClick={() => setEditingRow(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2">Mismatch Details</h4>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div><span className="text-gray-600">Lift ID:</span> {editingRow}</div>
                <div><span className="text-gray-600">Mismatch Type:</span> {activeTab}</div>
                <div className="text-xs text-gray-500 mt-2">
                  This will submit the complete lift data along with your status and remarks to the Mismatch sheet.
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Debite Note</label>
                <select
                  value={formData.status || 'Credit Notes'}
                  onChange={(e) => handleFormChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                >
                  <option value="Credit Notes">Yes</option>
                  <option value="Others">No</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                <textarea
                  value={formData.remarks || ''}
                  onChange={(e) => handleFormChange('remarks', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                  placeholder="Enter correction details and notes..."
                  rows={4}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-gray-200">
              <button
                onClick={() => setEditingRow(null)}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={submitFormData}
                disabled={submitting}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {submitting ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {submitting ? 'Submitting...' : 'Submit to Mismatch Sheet'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Enhanced fetch function to get ALL columns from LIFT-ACCOUNTS
  const fetchLiftAccountsData = useCallback(async () => {
    setLoadingLifts(true);
    setError(null);
    try {
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(LIFT_ACCOUNTS_SHEET)}&cb=${new Date().getTime()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch lifts data: ${response.status}`);
      
      let text = await response.text();
      if (text.startsWith("google.visualization.Query.setResponse(")) {
        text = text.substring(text.indexOf("(") + 1, text.lastIndexOf(")"));
      } else {
        const jsonStart = text.indexOf("{");
        const jsonEnd = text.lastIndexOf("}");
        if (jsonStart === -1 || jsonEnd === -1) throw new Error("Invalid response format for lifts from Google Sheets.");
        text = text.substring(jsonStart, jsonEnd + 1);
      }

      const data = JSON.parse(text);
      if (!data.table || !data.table.cols) {
        setLiftAccountsData([]);
        return;
      }
      if (!data.table.rows) data.table.rows = [];

      const processedRows = data.table.rows
        .map((row, indexWithinSlicedData) => {
          if (!row || !row.c) return null;
          const rowData = { _gvizRowIndex: indexWithinSlicedData };
          row.c.forEach((cell, cellIndex) => {
            const colId = `col${cellIndex}`;
            const value = cell && cell.v !== undefined && cell.v !== null ? cell.v : "";
            rowData[colId] = value;
            if (cell && cell.f) rowData[`${colId}_formatted`] = cell.f;
          });

          if (rowData.col0 && typeof rowData.col0 === "string" && rowData.col0.startsWith("Date(")) {
            rowData.col0_formatted = formatTimestamp(rowData.col0);
          } else if (rowData.col0) {
            try {
              const d = new Date(rowData.col0);
              if (!isNaN(d.getTime())) {
                rowData.col0_formatted = d
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
              /* ignore */
            }
          }
          return rowData;
        })
        .filter((row) => row !== null);

      const dataRows = processedRows.filter((row) => {
        if (!row.col1 || typeof row.col1 === "undefined" || String(row.col1).trim() === "") return false;
        const liftIdValue = String(row.col1).trim().toLowerCase();
        if (liftIdValue.includes("lift id") || liftIdValue.includes("lift no") || !liftIdValue.startsWith("lf-")) {
          return false;
        }
        if (!row.col0 || String(row.col0).trim() === "") return false;
        return true;
      });

      let formattedData = dataRows.map((row) => ({
        // Core fields
        id: String(row.col1 || "").trim(),
        liftNo: String(row.col1 || "").trim(),
        indentNo: String(row.col2 || "").trim(),
        vendorName: String(row.col3 || "").trim(),
        quantity: String(row.col4 || "").trim(),
        material: String(row.col5 || "").trim(),
        rawMaterialName: String(row.col5 || "").trim(),
        
        // LIFT-ACCOUNTS columns 6-58
        actualQuantityY: String(row.col24 || "").trim(),
        billNo: String(row.col6 || "").trim(),
        areaLifting: String(row.col7 || "").trim(),
        leadTimeToFactory: String(row.col8 || "").trim(),
        liftingQty: String(row.col9 || "").trim(),
        liftType: String(row.col10 || "").trim(),
        transporterName: String(row.col11 || "").trim(),
        truckNo: String(row.col12 || "").trim(),
        driverNo: String(row.col13 || "").trim(),
        biltyNo: String(row.col14 || "").trim(),
        typeOfTransportingRate: String(row.col15 || "").trim(),
        materialRate: String(row.col16 || "").trim(),
        billImageUrl: String(row.col17 || "").trim(),
        truckQty: String(row.col18 || "").trim(),
dateOfReceiving: formatDateString(String(row.col22 || "").trim()) || String(row.col22 || "").trim(),        totalBillQuantity: String(row.col23 || "").trim(),
        actualQuantity: String(row.col24 || "").trim(),
        physicalCondition: String(row.col25 || "").trim(),
        moisture: String(row.col26 || "").trim(),
        physicalImageUrl: String(row.col27 || "").trim(),
        weightSlipImageUrl: String(row.col28 || "").trim(),
        biltyNo2: String(row.col32 || "").trim(),
        biltyImageUrl: String(row.col33 || "").trim(),
        status: String(row.col37 || "").trim(),
        dateOfTest: formatDateString(String(row.col38 || "").trim()) || String(row.col38 || "").trim(),
        moisturePercent: String(row.col39 || "").trim(),
        bdPercent: String(row.col40 || "").trim(),
        apPercent: String(row.col41 || "").trim(),
        aluminaPercent: String(row.col42 || "").trim(),
        ironPercent: String(row.col43 || "").trim(),
        sieveAnalysis: String(row.col44 || "").trim(),
        loiPercent: String(row.col45 || "").trim(),
        sio2Percent: String(row.col46 || "").trim(),
        caoPercent: String(row.col47 || "").trim(),
        mgoPercent: String(row.col48 || "").trim(),
        tio2Percent: String(row.col49 || "").trim(),
        k2oNa2oPercent: String(row.col50 || "").trim(),
        freeIronPercent: String(row.col51 || "").trim(),
        firmName: String(row.col56 || "").trim(),
        weightSlipQty: String(row.col57 || "").trim(),
        transporterRate: String(row.col58 || "").trim(),
        
        // Additional fields for existing functionality
        createdAt: typeof row.col0_formatted === "string" && row.col0_formatted.trim() !== ""
          ? row.col0_formatted.trim()
          : String(row.col0 || "").trim(),
        liftedQty: String(row.col9 || "").trim(),
         actualQuantityY: String(row.col24 || "").trim(),
        dateOfReceiving_formatted: formatDateString(String(row.col22 || "").trim()) || String(row.col22 || "").trim(),
        physicalCondition_fromSheet: String(row.col25 || "").trim(),
        liftAlumina: String(row.col42 || "").trim(),
        liftIron: String(row.col43 || "").trim(),
        liftAP: String(row.col41 || "").trim(),
        timestamp: typeof row.col0_formatted === "string" && row.col0_formatted.trim() !== ""
          ? row.col0_formatted.trim()
          : String(row.col0 || "").trim(),
      }));

      if (user?.firmName && user.firmName.toLowerCase() !== "all") {
        const userFirmNameLower = user.firmName.toLowerCase();
        formattedData = formattedData.filter(
          (lift) => lift.firmName && String(lift.firmName).toLowerCase() === userFirmNameLower,
        );
      }

      setLiftAccountsData(formattedData);
    } catch (err) {
      setError(`Failed to load LIFT-ACCOUNTS data: ${err.message}`);
      setLiftAccountsData([]);
    } finally {
      setLoadingLifts(false);
    }
  }, [user]);

  // Enhanced fetch function to get ALL columns from INDENT-PO
  const fetchPurchaseOrdersData = useCallback(async () => {
    setLoadingPOs(true);
    try {
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(INDENT_PO_SHEET)}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch PO data: ${response.status}`);
      }
      const text = await response.text();
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      const jsonString = text.substring(jsonStart, jsonEnd + 1);
      const data = JSON.parse(jsonString);

      let processedRows = [];
      if (data.table && data.table.cols && data.table.rows) {
        processedRows = (data.table.rows || [])
          .slice(1)
          .filter(
            (row) =>
              row.c &&
              row.c.some((cell) => cell && cell.v !== null && cell.v !== undefined && String(cell.v).trim() !== ""),
          )
          .map((row) => {
            const rowData = {};
            if (row.c) {
              row.c.forEach((cell, cellIndex) => {
                const colId = `col${cellIndex}`;
                const value = cell && cell.v !== undefined && cell.v !== null ? cell.v : "";
                rowData[colId] = value;
                if (cell && cell.f) rowData[`${colId}_formatted`] = cell.f;
              });
            }
            return rowData;
          });
      }

      const formattedData = processedRows.map((row) => ({
        // INDENT-PO columns 0-42
        poTimestamp: typeof row.col0_formatted === "string" && row.col0_formatted.trim() !== ""
          ? row.col0_formatted.trim()
          : String(row.col0 || "").trim(),
        indentId: String(row.col1 || "").trim(),
        poFirmName: String(row.col2 || "").trim(),
        poGeneratedBy: String(row.col3 || "").trim(),
        poVendor: String(row.col4 || "").trim(),
        poMaterial: String(row.col5 || "").trim(),
        poQuantity: String(row.col6 || "").trim(),
        poCurrentStock: String(row.col7 || "").trim(),
        poPriority: String(row.col8 || "").trim(),
        poDeliveryOrderNo: String(row.col9 || "").trim(),
        poNotes: String(row.col10 || "").trim(),
        poApprovedQty: String(row.col14 || "").trim(),
        poApprovalStatus: String(row.col15 || "").trim(),
        poRemarks: String(row.col16 || "").trim(),
        poHaveToMake: String(row.col20 || "").trim(),
        poRate: String(row.col21 || "").trim(),
        poLeadTime: String(row.col22 || "").trim(),
        poTotalQuantity: String(row.col23 || "").trim(),
        poTotalAmount: String(row.col24 || "").trim(),
        poCopyUrl: String(row.col25 || "").trim(),
        poAdvanceToBePaid: String(row.col26 || "").trim(),
        poToBePaidAmount: String(row.col27 || "").trim(),
poWhenToBePaid: formatDateString(String(row.col28 || "").trim()) || String(row.col28 || "").trim(),        poPONotes: String(row.col29 || "").trim(),
        poAluminaPercent: String(row.col30 || "").trim(),
        poIronPercent: String(row.col31 || "").trim(),
        poTotalLifted: String(row.col32 || "").trim(),
        poPendingQty: String(row.col33 || "").trim(),
        poOrderCancelQty: String(row.col34 || "").trim(),
        poStatus: String(row.col35 || "").trim(),
        
        // Additional fields for existing functionality
        indentNo: String(row.col1 || "").trim(),
        firmName: String(row.col2 || "").trim(),
        vendorName: String(row.col4 || "").trim(),
        rawMaterialName: String(row.col5 || "").trim(),
      }));

      setPurchaseOrdersData(formattedData);
    } catch (error) {
      setError(prev => prev ? `${prev}\nFailed to load PO data: ${error.message}` : `Failed to load PO data: ${error.message}`);
      setPurchaseOrdersData([]);
    } finally {
      setLoadingPOs(false);
    }
  }, []);

  const fetchTLData = useCallback(async () => {
    setLoadingTL(true);
    try {
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(TL_SHEET)}&cb=${new Date().getTime()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch TL data: ${response.status}`);
      
      const text = await response.text();
      const dataTable = parseGvizResponse(text, TL_SHEET);

      const formattedData = dataTable.rows
        .map((row, index) => {
          if (!row || !row.c) return null;
          const getStringValue = (colIndex) => (row.c?.[colIndex]?.v !== undefined && row.c?.[colIndex]?.v !== null ? String(row.c[colIndex].v) : "");
          
          return {
            _id: `tl-${index}`,
            rawMaterial: getStringValue(1),
            alumina: getStringValue(2),
            iron: getStringValue(3),
            ap: getStringValue(4),
          };
        })
        .filter(Boolean)
        .filter(item => item.rawMaterial && item.rawMaterial.trim() !== "");

      setTlData(formattedData);
    } catch (err) {
      setError(prev => prev ? `${prev}\nFailed to load TL data: ${err.message}` : `Failed to load TL data: ${err.message}`);
      setTlData([]);
    } finally {
      setLoadingTL(false);
    }
  }, []);

  useEffect(() => {
    fetchLiftAccountsData();
    fetchPurchaseOrdersData();
    fetchTLData();
    fetchMismatchSheetData(); // Add this line

  }, [fetchLiftAccountsData, fetchPurchaseOrdersData, fetchTLData,fetchMismatchSheetData]);

  // Calculate mismatch data (keeping existing calculations unchanged)
 // Helper function to check if an indent number exists in Mismatch sheet
const isIndentSubmitted = (indentNo) => {
  return mismatchSheetData.some(mismatchRow => 
    mismatchRow.indentNo && 
    indentNo && 
    String(mismatchRow.indentNo).trim() === String(indentNo).trim()
  );
};

const rateMismatchData = useMemo(() => {
  return liftAccountsData
    .filter(lift => !isIndentSubmitted(lift.indentNo)) // Filter out submitted rows
    .map((lift) => {
      const liftMaterialRate = parseFloat(lift.materialRate) || 0;
      const correspondingPO = purchaseOrdersData.find(po => po.indentNo === lift.indentNo);
      const poRate = parseFloat(correspondingPO?.poRate) || 0;
      
      if (Math.abs(liftMaterialRate - poRate) >= 0.01 && liftMaterialRate > 0 && poRate > 0) {
        return {
          ...lift,
          ...(correspondingPO || {}),
          poRate: poRate.toFixed(2),
          rateDifference: (liftMaterialRate - poRate).toFixed(2),
        };
      }
      return null;
    })
    .filter(Boolean);
}, [liftAccountsData, purchaseOrdersData, mismatchSheetData]);

const quantityMismatchData = useMemo(() => {
  return liftAccountsData
    .filter(lift => !isIndentSubmitted(lift.indentNo)) // Filter out submitted rows
    .map((lift) => {
      const liftedQty = parseFloat(lift.liftedQty) || 0;
      const actualQuantityY = parseFloat(lift.actualQuantityY) || 0;
      
      const correspondingPO = purchaseOrdersData.find(po => po.indentNo === lift.indentNo);
      
      const rowData = {
        ...lift,
        ...(correspondingPO || {}),
      };
      
      if (Math.abs(liftedQty - actualQuantityY) >= 0.01 && liftedQty > 0 && actualQuantityY > 0) {
        return {
          ...rowData,
          qtyDifference: (liftedQty - actualQuantityY).toFixed(2),
        };
      }
      return null;
    })
    .filter(Boolean);
}, [liftAccountsData, purchaseOrdersData, mismatchSheetData]);

const materialMismatchData = useMemo(() => {
  return liftAccountsData
    .filter(lift => !isIndentSubmitted(lift.indentNo)) // Filter out submitted rows
    .map((lift) => {
      const correspondingTL = tlData.find(tl => 
        tl.rawMaterial && lift.material && 
        tl.rawMaterial.toLowerCase().trim() === lift.material.toLowerCase().trim()
      );
      
      if (!correspondingTL) return null;

      const tlAlumina = parseFloat(correspondingTL.alumina) || 0;
      const liftAlumina = parseFloat(lift.liftAlumina) || 0;
      const tlIron = parseFloat(correspondingTL.iron) || 0;
      const liftIron = parseFloat(lift.liftIron) || 0;
      const tlAP = parseFloat(correspondingTL.ap) || 0;
      const liftAP = parseFloat(lift.liftAP) || 0;

      const aluminaMismatch = Math.abs(tlAlumina - liftAlumina) >= 0.01;
      const ironMismatch = Math.abs(tlIron - liftIron) >= 0.01;
      const apMismatch = Math.abs(tlAP - liftAP) >= 0.01;

      if ((aluminaMismatch || ironMismatch || apMismatch) && 
          (tlAlumina > 0 || liftAlumina > 0 || tlIron > 0 || liftIron > 0 || tlAP > 0 || liftAP > 0)) {
        const correspondingPO = purchaseOrdersData.find(po => po.indentNo === lift.indentNo);
        return {
          ...lift,
          ...(correspondingPO || {}),
          rawMaterial: lift.material,
          tlRawMaterial: correspondingTL.rawMaterial,
          tlAlumina: tlAlumina.toFixed(2),
          tlIron: tlIron.toFixed(2),
          tlAP: tlAP.toFixed(2),
          aluminaDiff: (liftAlumina - tlAlumina).toFixed(2),
          ironDiff: (liftIron - tlIron).toFixed(2),
          apDiff: (liftAP - tlAP).toFixed(2),
        };
      }
      return null;
    })
    .filter(Boolean);
}, [liftAccountsData, tlData, purchaseOrdersData, mismatchSheetData]);
  // Filter options (keeping existing logic unchanged)
  const uniqueFilterOptions = useMemo(() => {
    const vendors = new Set();
    const materials = new Set();
    const firms = new Set();
    const orders = new Set();

    [...rateMismatchData, ...quantityMismatchData, ...materialMismatchData].forEach((item) => {
      if (item.vendorName) vendors.add(item.vendorName);
      if (item.material || item.rawMaterialName || item.rawMaterial) {
        materials.add(item.material || item.rawMaterialName || item.rawMaterial);
      }
      if (item.firmName) firms.add(item.firmName);
      if (item.indentNo) orders.add(item.indentNo);
    });

    return {
      vendorName: [...vendors].sort(),
      materialName: [...materials].sort(),
      firmName: [...firms].sort(),
      orderNumber: [...orders].sort(),
    };
  }, [rateMismatchData, quantityMismatchData, materialMismatchData]);

  // Apply filters (keeping existing logic unchanged)
  const filteredRateMismatchData = useMemo(() => {
    let filtered = rateMismatchData.filter(item => !submittedRows.has(`mismatch_${item.id}`));
    if (filters.vendorName !== "all") {
      filtered = filtered.filter((item) => item.vendorName === filters.vendorName);
    }
    if (filters.materialName !== "all") {
      filtered = filtered.filter((item) => item.material === filters.materialName);
    }
    if (filters.firmName !== "all") {
      filtered = filtered.filter((item) => item.firmName === filters.firmName);
    }
    if (filters.orderNumber !== "all") {
      filtered = filtered.filter((item) => item.indentNo === filters.orderNumber);
    }
    return filtered;
  }, [rateMismatchData, filters, submittedRows]);

  const filteredQuantityMismatchData = useMemo(() => {
    let filtered = quantityMismatchData.filter(item => !submittedRows.has(`mismatch_${item.liftNo}`));
    if (filters.vendorName !== "all") {
      filtered = filtered.filter((item) => item.vendorName === filters.vendorName);
    }
    if (filters.materialName !== "all") {
      filtered = filtered.filter((item) => item.rawMaterialName === filters.materialName);
    }
    if (filters.firmName !== "all") {
      filtered = filtered.filter((item) => item.firmName === filters.firmName);
    }
    if (filters.orderNumber !== "all") {
      filtered = filtered.filter((item) => item.indentNo === filters.orderNumber);
    }
    return filtered;
  }, [quantityMismatchData, filters, submittedRows]);

  const filteredMaterialMismatchData = useMemo(() => {
    let filtered = materialMismatchData.filter(item => !submittedRows.has(`mismatch_${item.liftNo}`));
    if (filters.vendorName !== "all") {
      filtered = filtered.filter((item) => item.vendorName === filters.vendorName);
    }
    if (filters.materialName !== "all") {
      filtered = filtered.filter((item) => item.rawMaterial === filters.materialName);
    }
    if (filters.firmName !== "all") {
      filtered = filtered.filter((item) => item.firmName === filters.firmName);
    }
    if (filters.orderNumber !== "all") {
      filtered = filtered.filter((item) => item.indentNo === filters.orderNumber);
    }
    return filtered;
  }, [materialMismatchData, filters, submittedRows]);

  // Event handlers (keeping existing logic unchanged)
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
    setFilters({
      vendorName: "all",
      materialName: "all",
      firmName: "all",
      orderNumber: "all",
    });
  };

  const handleToggleColumn = (tab, dataKey, checked) => {
    if (tab === "rate") {
      setVisibleRateMismatchColumns((prev) => ({ ...prev, [dataKey]: checked }));
    } else if (tab === "quantity") {
      setVisibleQuantityMismatchColumns((prev) => ({ ...prev, [dataKey]: checked }));
    } else if (tab === "material") {
      setVisibleMaterialMismatchColumns((prev) => ({ ...prev, [dataKey]: checked }));
    }
  };

  const handleSelectAllColumns = (tab, columnsMeta, selectAll) => {
    const newVisibility = {};
    columnsMeta.forEach((col) => {
      newVisibility[col.dataKey] = col.alwaysVisible || selectAll;
    });
    if (tab === "rate") {
      setVisibleRateMismatchColumns(newVisibility);
    } else if (tab === "quantity") {
      setVisibleQuantityMismatchColumns(newVisibility);
    } else if (tab === "material") {
      setVisibleMaterialMismatchColumns(newVisibility);
    }
  };

  // Render cell with action buttons
  const renderCell = (item, column) => {
    const value = item[column.dataKey];

    if (column.dataKey === "actions") {
      let mismatchType = "rateMismatch";
      if (activeTab === "quantityMismatch") mismatchType = "quantityMismatch";
      if (activeTab === "materialMismatch") mismatchType = "materialMismatch";
      
      return (
        <div className="flex gap-2 whitespace-nowrap">
          <button
            onClick={() => handleCorrectData(item, mismatchType)}
            className="inline-flex items-center px-3 py-1 text-xs font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-md hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Edit className="w-3 h-3 mr-1" />
            Correct Data
          </button>
        </div>
      );
    }

    if (column.isLink) {
      return value ? (
        <a
          href={String(value).startsWith("http") ? value : `https://${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-600 hover:text-purple-800 hover:underline inline-flex items-center text-xs"
        >
          <ExternalLink className="h-3 w-3 mr-1" /> {column.linkText || "View"}
        </a>
      ) : (
        <span className="text-gray-400 text-xs">N/A</span>
      );
    }
    
    // Highlight differences with color coding
    if (column.dataKey === "rateDifference" || column.dataKey === "qtyDifference" || 
        column.dataKey === "aluminaDiff" || column.dataKey === "ironDiff" || column.dataKey === "apDiff") {
      const numValue = parseFloat(value) || 0;
      return (
        <span className={numValue < 0 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
          {numValue > 0 ? `+${value}` : value}
        </span>
      );
    }
    
    return value || <span className="text-gray-400 text-xs">N/A</span>;
  };

  const renderTableSection = (tabKey, title, description, data, columnsMeta, visibilityState) => {
    const visibleCols = columnsMeta.filter((col) => visibilityState[col.dataKey]);
    const isLoading = (tabKey === "rateMismatch" ? loadingLifts || loadingPOs : 
                     tabKey === "materialMismatch" ? loadingLifts || loadingTL : loadingLifts) && data.length === 0;
    const hasError = error && data.length === 0;

    return (
      <Card className="shadow-sm border border-border flex-1 flex-col">
        <CardHeader className="py-3 px-4 bg-red-50/50">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center text-md font-semibold text-foreground">
                {tabKey === "rateMismatch" ? (
                  <DollarSign className="h-5 w-5 text-red-600 mr-2" />
                ) : tabKey === "quantityMismatch" ? (
                  <Package className="h-5 w-5 text-red-600 mr-2" />
                ) : (
                  <Beaker className="h-5 w-5 text-red-600 mr-2" />
                )}
                {title} ({data.length})
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-0.5">{description}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  fetchLiftAccountsData();
                  fetchPurchaseOrdersData();
                  fetchTLData();
                }}
                variant="outline" 
                size="sm" 
                className="h-8 text-xs bg-white"
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> 
                Refresh
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs bg-white">
                    <MixerHorizontalIcon className="mr-1.5 h-3.5 w-3.5" /> View Columns
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-3">
                  <div className="grid gap-2">
                    <p className="text-sm font-medium">Toggle Columns</p>
                    <div className="flex items-center justify-between mt-1 mb-2">
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto text-xs"
                        onClick={() => handleSelectAllColumns(
                          tabKey === "rateMismatch" ? "rate" : 
                          tabKey === "quantityMismatch" ? "quantity" : "material", 
                          columnsMeta, true)}
                      >
                        Select All
                      </Button>
                      <span className="text-gray-300 mx-1">|</span>
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto text-xs"
                        onClick={() => handleSelectAllColumns(
                          tabKey === "rateMismatch" ? "rate" : 
                          tabKey === "quantityMismatch" ? "quantity" : "material", 
                          columnsMeta, false)}
                      >
                        Deselect All
                      </Button>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {columnsMeta
                        .filter((col) => col.toggleable)
                        .map((col) => (
                          <div key={`toggle-${tabKey}-${col.dataKey}`} className="flex items-center space-x-2">
                            <Checkbox
                              id={`toggle-${tabKey}-${col.dataKey}`}
                              checked={!!visibilityState[col.dataKey]}
                              onCheckedChange={(checked) =>
                                handleToggleColumn(
                                  tabKey === "rateMismatch" ? "rate" : 
                                  tabKey === "quantityMismatch" ? "quantity" : "material", 
                                  col.dataKey, Boolean(checked))
                              }
                              disabled={col.alwaysVisible}
                            />
                            <Label htmlFor={`toggle-${tabKey}-${col.dataKey}`} className="text-xs font-normal cursor-pointer">
                              {col.header} {col.alwaysVisible && <span className="text-gray-400 ml-0.5 text-xs">(Fixed)</span>}
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
        <CardContent className="p-0 flex-1 flex-col">
          {isLoading ? (
            <div className="flex flex-col justify-center items-center py-10 flex-1">
              <Loader2 className="h-8 w-8 text-red-600 animate-spin mb-3" />
              <p className="text-muted-foreground ml-2">Loading mismatch data...</p>
            </div>
          ) : hasError ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-destructive-foreground bg-destructive/10 rounded-lg mx-4 my-4 text-center flex-1">
              <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
              <p className="font-medium text-destructive">Error Loading Data</p>
              <p className="text-sm text-muted-foreground max-w-md">{error}</p>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-green-200/50 bg-green-50/50 rounded-lg mx-4 my-4 text-center flex-1">
              <Info className="h-12 w-12 text-green-500 mb-3" />
              <p className="font-medium text-foreground">No Mismatches Found</p>
              <p className="text-sm text-muted-foreground text-center">
                {tabKey === "rateMismatch" 
                  ? "All material rates match their corresponding PO rates." 
                  : tabKey === "quantityMismatch"
                  ? "All lifted quantities match their weight slip quantities."
                  : "All material properties match between TL and LIFT-ACCOUNTS sheets."}
                {user?.firmName && user.firmName.toLowerCase() !== "all" && (
                  <span className="block mt-1">(Filtered by firm: {user.firmName})</span>
                )}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-b-lg flex-1">
              <Table>
                <TableHeader className="bg-red-50 sticky top-0 z-10">
                  <TableRow>
                    {visibleCols.map((col) => (
                      <TableHead key={col.dataKey} className={`whitespace-nowrap text-xs px-3 py-2 ${col.dataKey === "actions" ? "w-[150px]" : ""}`}>
                        {col.header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item, index) => (
                    <TableRow 
                      key={`${tabKey}-${item.id || item.liftNo}-${index}`} 
                      className="hover:bg-red-50/50 bg-red-100/30 border-l-4 border-l-red-500"
                    >
                      {visibleCols.map((column) => (
                        <TableCell 
                          key={`${item.id || item.liftNo}-${column.dataKey}`} 
                          className={`text-xs px-3 py-2 ${
                            column.dataKey === "id" || column.dataKey === "liftNo" 
                              ? "font-medium text-primary" 
                              : column.dataKey === "actions"
                              ? "w-[150px]"
                              : "text-gray-700"
                          }`}
                        >
                          {renderCell(item, column)}
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
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      {renderModal()}
      
      <div className="max-w-7xl mx-auto space-y-6">
        <Card className="shadow-md border-none">
          <CardHeader className="p-4 border-b border-gray-200">
            <CardTitle className="flex items-center gap-2 text-gray-700 text-lg">
              <TrendingDown className="h-5 w-5 text-red-600" /> Mismatch Analysis Dashboard
            </CardTitle>
            <CardDescription className="text-gray-500 text-sm">
              Identify and analyze rate, quantity, and material property mismatches across sheets.
              {user?.firmName && user.firmName.toLowerCase() !== "all" && (
                <span className="ml-2 text-red-600 font-medium">• Filtered by: {user.firmName}</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="grid w-full sm:w-[750px] grid-cols-3 mb-4">
                <TabsTrigger value="rateMismatch" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" /> Rate Mismatches
                  <Badge variant="destructive" className="ml-1.5 px-1.5 py-0.5 text-xs">
                    {filteredRateMismatchData.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="quantityMismatch" className="flex items-center gap-2">
                  <Package className="h-4 w-4" /> Quantity Mismatches
                  <Badge variant="destructive" className="ml-1.5 px-1.5 py-0.5 text-xs">
                    {filteredQuantityMismatchData.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="materialMismatch" className="flex items-center gap-2">
                  <Beaker className="h-4 w-4" /> Material Mismatches
                  <Badge variant="destructive" className="ml-1.5 px-1.5 py-0.5 text-xs">
                    {filteredMaterialMismatchData.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              {/* Filters */}
              <div className="mb-4 p-4 bg-red-50/50 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <Label className="text-sm font-medium">Filters</Label>
                  <Button variant="outline" size="sm" onClick={clearAllFilters} className="ml-auto bg-white">
                    Clear All
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Select value={filters.vendorName} onValueChange={(value) => handleFilterChange("vendorName", value)}>
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

                  <Select value={filters.materialName} onValueChange={(value) => handleFilterChange("materialName", value)}>
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

                  <Select value={filters.firmName} onValueChange={(value) => handleFilterChange("firmName", value)}>
                    <SelectTrigger className="h-8 bg-white">
                      <SelectValue placeholder="All Firms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Firms</SelectItem>
                      {uniqueFilterOptions.firmName.map((firm) => (
                        <SelectItem key={firm} value={firm}>
                          {firm}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filters.orderNumber} onValueChange={(value) => handleFilterChange("orderNumber", value)}>
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

              <TabsContent value="rateMismatch" className="flex-1 flex flex-col mt-0">
                {renderTableSection(
                  "rateMismatch",
                  "Rate Mismatches",
                  "Material rates from LIFT-ACCOUNTS (Column Q) that don't match PO rates from INDENT-PO (Column Y).",
                  filteredRateMismatchData,
                  RATE_MISMATCH_COLUMNS_META,
                  visibleRateMismatchColumns
                )}
              </TabsContent>

              <TabsContent value="quantityMismatch" className="flex-1 flex flex-col mt-0">
                {renderTableSection(
                  "quantityMismatch",
                  "Quantity Mismatches",
                  "Lifting quantities (Column J) that don't match Actual quantities (Column Y) in LIFT-ACCOUNTS.",
                  filteredQuantityMismatchData,
                  QUANTITY_MISMATCH_COLUMNS_META,
                  visibleQuantityMismatchColumns
                )}
              </TabsContent>

              <TabsContent value="materialMismatch" className="flex-1 flex flex-col mt-0">
                {renderTableSection(
                  "materialMismatch",
                  "Material Properties Mismatches",
                  "Material properties (Alumina, Iron, AP) that don't match between TL sheet and LIFT-ACCOUNTS sheet for the same raw material.",
                  filteredMaterialMismatchData,
                  MATERIAL_MISMATCH_COLUMNS_META,
                  visibleMaterialMismatchColumns
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}