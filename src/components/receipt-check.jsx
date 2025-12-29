"use client";
import { useState, useEffect, useMemo, useContext } from "react";
import {
  Loader2,
  PackageOpen,
  AlertTriangle,
  PackageCheck,
  FileUp,
  ExternalLink,
  History,
  FileCheckIcon,
  Info,
  Filter,
} from "lucide-react";
import { MixerHorizontalIcon } from "@radix-ui/react-icons";
// Shadcn UI components
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { AuthContext } from "../context/AuthContext"; // Import AuthContext
import { toast } from "sonner";

// Constants for Google Sheets and Apps Script
const SHEET_ID = "1NUxf4pnQ-CtCFUjA5rqLgYEJiU77wQlwVyimjt8RmFQ";
const LIFTS_SHEET_NAME = "LIFT-ACCOUNTS";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzj9zlZTEhdlmaMt78Qy3kpkz7aOfVKVBRuJkd3wv_UERNrIRCaepSULpNa7W1g-pw/exec";
const DATA_START_ROW_LIFTS = 6; // FIX: Corrected from 7 to 6

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
    { header: "Action", dataKey: "actionColumn", toggleable: false, alwaysVisible: true },
  { header: "Lift Number", dataKey: "id", toggleable: true, alwaysVisible: true },
  { header: "PO Number", dataKey: "indentNo", toggleable: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "Bill No.", dataKey: "billNo", toggleable: true },
  { header: "Party Name", dataKey: "vendorName", toggleable: true },
  { header: "Product Name", dataKey: "rawMaterialName", toggleable: true },
  { header: "PO Qty", dataKey: "qty", toggleable: true },
  { header: "Bill Copy", dataKey: "billCopy", toggleable: true, isLink: true, linkText: "View" },
  { header: "Type", dataKey: "type", toggleable: true },
  { header: "Driver No.", dataKey: "driverNo", toggleable: true },
  { header: "Area Lifting", dataKey: "areaLifting", toggleable: true },
  { header: "Truck No.", dataKey: "truckNo", toggleable: true },
  { header: "Planned", dataKey: "plannedDate_formatted", toggleable: true },
];

const PROCESSED_RECEIPTS_COLUMNS_META = [
  { header: "Lift Number", dataKey: "liftNo", toggleable: true, alwaysVisible: true },
  { header: "PO Number", dataKey: "indentNo", toggleable: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "Bill No.", dataKey: "billNo", toggleable: true },
  { header: "Party Name", dataKey: "vendorName", toggleable: true },
  { header: "Product Name", dataKey: "rawMaterialName", toggleable: true },
  { header: "PO Qty", dataKey: "qty", toggleable: true },
  { header: "Bill Copy", dataKey: "billCopy", toggleable: true, isLink: true, linkText: "View" },
  { header: "Type", dataKey: "type", toggleable: true },
  { header: "Driver No.", dataKey: "driverNo", toggleable: true },
  { header: "Area Lifting", dataKey: "areaLifting", toggleable: true },
  { header: "Truck No.", dataKey: "truckNo", toggleable: true },
  { header: "Planned", dataKey: "plannedDate_formatted", toggleable: true },
  { header: "Actual Receipt Date", dataKey: "dateOfReceiving_formatted", toggleable: true },
  { header: "Weight Slip Qty", dataKey: "weightSlipQty_fromSheet", toggleable: true },
  { header: "Physical Image", dataKey: "physicalImageUrl_fromSheet", toggleable: true, isLink: true, linkText: "View Image" },
  { header: "Weight Slip", dataKey: "weightSlipImageUrl_fromSheet", toggleable: true, isLink: true, linkText: "View Image" },
  { header: "Receipt Timestamp (Col U)", dataKey: "actual1Timestamp", toggleable: true },
];

// Helper to parse Google Sheet gviz JSON response
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

// Function to format date string
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

// Helper function to check if quantities match (Total Bill Qty vs Actual Qty only)
const checkQuantitiesMatch = (totalBillQty, actualQty) => {
  const bill = parseFloat(totalBillQty) || 0;
  const actual = parseFloat(actualQty) || 0;
  
  // Check if Total Bill Qty equals Actual Qty only
  return bill === actual;
};

// ReceiptFormModal Component
function ReceiptFormModal({ isOpen, onClose, liftData, children }) {
  if (!isOpen) {
    return null;
  }
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="dialog-description">
        <DialogHeader className="border-b pb-4 mb-4">
          <DialogTitle className="text-lg leading-6 font-medium text-gray-900 flex items-center">
            <FileUp className="h-6 w-6 text-purple-600 mr-3" /> Record Receipt for Lift ID:{" "}
            <span className="font-bold text-purple-600 ml-1">{liftData?.id}</span>
          </DialogTitle>
          <DialogDescription id="dialog-description" className="mt-1 text-sm text-gray-500">
            Update LIFT-ACCOUNTS with receipt details.
          </DialogDescription>
        </DialogHeader>
        <div className="px-0 py-2 sm:px-0">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

export default function ReceiptCheck() {
  const { user } = useContext(AuthContext);
  const [allLiftsData, setAllLiftsData] = useState([]);
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
  const [visibleAwaitingReceiptColumns, setVisibleAwaitingReceiptColumns] = useState({});
  const [visibleProcessedReceiptsColumns, setVisibleProcessedReceiptsColumns] = useState({});
  const [formData, setFormData] = useState({
    liftId: "",
    dateOfReceiving: new Date().toISOString().split("T")[0],
    totalBillQuantity: "",
    actualQuantity: "",
    weightSlipQty: "", // New field
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
    setVisibleAwaitingReceiptColumns(initializeVisibility(AWAITING_RECEIPT_COLUMNS_META));
    setVisibleProcessedReceiptsColumns(initializeVisibility(PROCESSED_RECEIPTS_COLUMNS_META));
  }, []);

  useEffect(() => {
    const fetchLiftAccountData = async () => {
      setLoadingData(true);
      setErrorData(null);
      try {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(LIFTS_SHEET_NAME)}&t=${new Date().getTime()}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const responseText = await response.text();
        const dataTable = parseGvizResponse(responseText, LIFTS_SHEET_NAME);
        setDataTableForSubmit(dataTable);
        
        let processedData = dataTable.rows.map((row, gvizRowIndex) => {
          if (!row || !row.c) {
            return null;
          }
          const getStringValue = (colIndex) => (row.c?.[colIndex]?.v !== undefined && row.c?.[colIndex]?.v !== null ? String(row.c[colIndex].v) : "");
          const getFormattedValue = (colIndex) => formatDateString(getStringValue(colIndex));
          
          const rowData = { 
            _id: `lift-${gvizRowIndex}`,
            _rowIndex: gvizRowIndex + DATA_START_ROW_LIFTS,
            id: getStringValue(LIFT_ID_COL),
            liftNo: getStringValue(LIFT_ID_COL),
            indentNo: getStringValue(INDENT_NO_COL),
            vendorName: getStringValue(VENDOR_NAME_COL),
            rawMaterialName: getStringValue(RAW_MATERIAL_COL),
            billNo: getStringValue(BILL_NO_COL),
            qty: getStringValue(ORIGINAL_QTY_COL),
            type: getStringValue(LIFT_TYPE_COL),
            billCopy: getStringValue(BILL_COPY_COL),
            driverNo: getStringValue(DRIVER_NO_COL),
            areaLifting: getStringValue(BILL_NO_COL),
            truckNo: getStringValue(TRUCK_NO_COL),
            plannedDate_formatted: getFormattedValue(PLANNED_COL) || getStringValue(PLANNED_COL),
            filterColT_val: getStringValue(PLANNED_COL),
            filterColU_val: getStringValue(FILTER_U_COL),
            actual1Timestamp: getFormattedValue(FILTER_U_COL),
            dateOfReceiving_fromSheet: getStringValue(DATE_OF_RECEIVING_COL_W),
            dateOfReceiving_formatted: getFormattedValue(DATE_OF_RECEIVING_COL_W) || getStringValue(DATE_OF_RECEIVING_COL_W),
            totalBillQuantity_fromSheet: getStringValue(TOTAL_BILL_QUANTITY_COL_X),
            actualQuantity_fromSheet: getStringValue(ACTUAL_QTY_COL_Y),
            physicalCondition_fromSheet: getStringValue(PHYSICAL_COND_COL_Z),
            moisture_fromSheet: getStringValue(MOISTURE_COL_AA),
            physicalImageUrl_fromSheet: getStringValue(PHYSICAL_IMAGE_URL_COL_AB),
            weightSlipImageUrl_fromSheet: getStringValue(WEIGHT_SLIP_URL_COL_AC),
            weightSlipQty_fromSheet: getStringValue(WEIGHT_SLIP_QTY_COL_BF), // New field
            firmName: getStringValue(FIRM_NAME_COL),
            // Helper property to check if quantities match (Total Bill Qty vs Actual Qty only)
            _quantitiesMatch: checkQuantitiesMatch(
              getStringValue(TOTAL_BILL_QUANTITY_COL_X),
              getStringValue(ACTUAL_QTY_COL_Y)
            ),
          };
          return rowData;
        });

        if (user?.firmName && user.firmName.toLowerCase() !== "all") {
          const userFirmNameLower = user.firmName.toLowerCase();
          processedData = processedData.filter((lift) => lift && lift.firmName && String(lift.firmName).toLowerCase() === userFirmNameLower);
        }
        setAllLiftsData(processedData.filter(Boolean));
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
      if (lift.totalBillQuantity_fromSheet) quantities.add(lift.totalBillQuantity_fromSheet);
      if (lift.actualQuantity_fromSheet) quantities.add(lift.actualQuantity_fromSheet);
      if (lift.indentNo) orders.add(lift.indentNo);
      if (lift.billNo) orders.add(lift.billNo);
    });
    return {
      vendorName: [...vendors].sort(),
      materialName: [...materials].sort(),
      liftType: [...types].sort(),
      totalQuantity: [...quantities].sort((a, b) => parseFloat(a) - parseFloat(b)),
      orderNumber: [...orders].sort(),
    };
  }, [allLiftsData]);

  const liftsAwaitingReceipt = useMemo(() => {
    return allLiftsData.filter((lift) => {
      let matches = lift.filterColT_val && !lift.filterColU_val;
      if (filters.vendorName !== "all") matches = matches && lift.vendorName === filters.vendorName;
      if (filters.materialName !== "all") matches = matches && lift.rawMaterialName === filters.materialName;
      // ... add other filters
      return matches;
    });
  }, [allLiftsData, filters]);

  const derivedMaterialReceipts = useMemo(() => {
    return allLiftsData.filter((lift) => {
      let matches = !!lift.filterColU_val;
      if (filters.vendorName !== "all") matches = matches && lift.vendorName === filters.vendorName;
      if (filters.materialName !== "all") matches = matches && lift.rawMaterialName === filters.materialName;
      // ... add other filters
      return matches;
    }).sort((a, b) => new Date(b.actual1Timestamp) - new Date(a.actual1Timestamp));
  }, [allLiftsData, filters]);

  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === "file") {
      setFormData((prev) => ({ ...prev, [name]: files?.[0] || null }));
    } else {
      setFormData((prev) => {
        const updated = { ...prev, [name]: value };
        if (name === "actualQuantity" || name === "totalBillQuantity") {
          const billQty = parseFloat(name === "totalBillQuantity" ? value : prev.totalBillQuantity) || 0;
          const actualQty = parseFloat(name === "actualQuantity" ? value : prev.actualQuantity) || 0;
          updated.qtyDifference = (billQty - actualQty).toFixed(2);
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
    const initialTotal = parseFloat(lift.totalBillQuantity_fromSheet || lift.qty) || 0;
    const initialActual = parseFloat(lift.actualQuantity_fromSheet || lift.qty) || 0;
    const initialWeightSlip = parseFloat(lift.weightSlipQty_fromSheet || lift.qty) || 0;
    setFormData({
      liftId: lift.id,
      dateOfReceiving: lift.dateOfReceiving_fromSheet || new Date().toISOString().split("T")[0],
      totalBillQuantity: initialTotal.toString(),
      actualQuantity: initialActual.toString(),
      weightSlipQty: initialWeightSlip.toString(), // New field
      qtyDifference: (initialTotal - initialActual).toFixed(2),
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
    if (!formData.dateOfReceiving) newErrors.dateOfReceiving = "Date of Receiving is required.";
    if (!formData.totalBillQuantity || isNaN(parseFloat(formData.totalBillQuantity))) newErrors.totalBillQuantity = "Total Bill Quantity must be a number.";
    if (!formData.actualQuantity || isNaN(parseFloat(formData.actualQuantity))) newErrors.actualQuantity = "Actual Quantity must be a number.";
    if (!formData.weightSlipQty || isNaN(parseFloat(formData.weightSlipQty))) newErrors.weightSlipQty = "Weight Slip Qty must be a number.";
    if (!formData.physicalCondition) newErrors.physicalCondition = "Physical Condition is required.";
    if (!formData.moisture || isNaN(parseFloat(formData.moisture))) newErrors.moisture = "Moisture must be a number.";
    
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const uploadFileToDrive = async (file, folderId = "1g0Tx2uULt8EmMWtS6VjsrM-6IOvc4Jwk") => {
    if (!file) return "";
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = error => reject(error);
    });

    const uploadPayload = new FormData();
    uploadPayload.append("action", "uploadFile");
    uploadPayload.append("fileName", file.name);
    uploadPayload.append("mimeType", file.type);
    uploadPayload.append("base64Data", base64Data);
    uploadPayload.append("folderId", folderId);

    const response = await fetch(APPS_SCRIPT_URL, { method: "POST", body: uploadPayload });
    if (!response.ok) throw new Error(`Drive upload failed: ${await response.text()}`);
    
    const result = await response.json();
    if (!result.success) throw new Error(result.message || "Apps Script upload failed");
    return result.fileUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm() || !selectedLift) {
      toast.error("Validation Error", { description: "Please fill all required fields or select a lift." });
      return;
    }
    setIsSubmitting(true);
    toast.loading("Submitting receipt details...", { id: "receipt-submit" });
  
    try {
      const receiptFolderId = "1Jt4wd7KLTSXeypkO8ODLOzHPkhmaZCBX";
      let physicalImageUrl = formData.physicalImageUrl || "";
      if (formData.physicalImageFile) {
        physicalImageUrl = await uploadFileToDrive(formData.physicalImageFile, receiptFolderId);
      }
  
      let weightSlipImageUrl = formData.weightSlipImageUrl || "";
      if (formData.weightSlipFile) {
        weightSlipImageUrl = await uploadFileToDrive(formData.weightSlipFile, receiptFolderId);
      }
  
      const timestamp = new Date().toLocaleString("en-GB", { hour12: false }).replace(",", "");
  
      const cellUpdates = {
        [`col${FILTER_U_COL + 1}`]: timestamp,
        [`col${DATE_OF_RECEIVING_COL_W + 1}`]: formData.dateOfReceiving,
        [`col${TOTAL_BILL_QUANTITY_COL_X + 1}`]: parseFloat(formData.totalBillQuantity) || 0,
        [`col${ACTUAL_QTY_COL_Y + 1}`]: parseFloat(formData.actualQuantity) || 0,
        [`col${PHYSICAL_COND_COL_Z + 1}`]: formData.physicalCondition,
        [`col${MOISTURE_COL_AA + 1}`]: parseFloat(formData.moisture) || 0,
        [`col${PHYSICAL_IMAGE_URL_COL_AB + 1}`]: physicalImageUrl,
        [`col${WEIGHT_SLIP_URL_COL_AC + 1}`]: weightSlipImageUrl,
        [`col${WEIGHT_SLIP_QTY_COL_BF + 1}`]: parseFloat(formData.weightSlipQty) || 0, // New field
      };
  
      const payload = new URLSearchParams({
        action: "updateCells",
        sheetName: LIFTS_SHEET_NAME,
        rowIndex: selectedLift._rowIndex,
        cellUpdates: JSON.stringify(cellUpdates),
      });
  
      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: payload.toString(),
      });
  
      const responseText = await response.text();
      if (!response.ok && !responseText.toLowerCase().includes("success")) {
        throw new Error(`Sheet update failed: ${response.status}. ${responseText}`);
      }
  
      toast.success("Success!", { id: "receipt-submit", description: `Receipt for Lift ID ${selectedLift.id} recorded successfully.` });
      setRefreshTrigger(prev => prev + 1);
      handleModalClose();
  
    } catch (error) {
      console.error("Error submitting receipt form:", error);
      toast.error("Submission Failed", { id: "receipt-submit", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setFormErrors({});
    setFormData({
      liftId: "",
      dateOfReceiving: new Date().toISOString().split("T")[0],
      totalBillQuantity: "",
      actualQuantity: "",
      weightSlipQty: "", // New field
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
      setVisibleAwaitingReceiptColumns((prev) => ({ ...prev, [dataKey]: checked }));
    } else {
      setVisibleProcessedReceiptsColumns((prev) => ({ ...prev, [dataKey]: checked }));
    }
  };

  const handleSelectAllColumns = (tab, columnsMeta, checked) => {
    const newVisibility = {};
    columnsMeta.forEach((col) => {
      if (col.toggleable && !col.alwaysVisible) newVisibility[col.dataKey] = checked;
    });
    if (tab === "awaiting") {
      setVisibleAwaitingReceiptColumns((prev) => ({ ...prev, ...newVisibility }));
    } else {
      setVisibleProcessedReceiptsColumns((prev) => ({ ...prev, ...newVisibility }));
    }
  };

  const renderCell = (item, column) => {
    const value = item[column.dataKey];
    if (column.isLink) {
        return value && String(value).startsWith("http") ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800 hover:underline inline-flex items-center text-xs">
            <ExternalLink className="h-3 w-3 mr-1" /> {column.linkText || "View"}
          </a>
        ) : (
          <span className="text-gray-400 text-xs">N/A</span>
        );
    }
    return value || <span className="text-gray-400 text-xs">N/A</span>;
  };

  const renderTableSection = (tabKey, title, description, data, columnsMeta, visibilityState) => {
    const visibleCols = columnsMeta.filter((col) => visibilityState[col.dataKey]);
    const isLoading = loadingData && data.length === 0;
    const hasError = errorData && data.length === 0 && activeTab === tabKey;
    return (
      <Card className="shadow-sm border border-border flex-1 flex-col">
        <CardHeader className="py-3 px-4 bg-muted/30">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center text-md font-semibold text-foreground">
                {tabKey === "awaitingReceipt" ? <PackageOpen className="h-5 w-5 text-purple-600 mr-2" /> : <PackageCheck className="h-5 w-5 text-purple-600 mr-2" />}
                {title} ({data.length})
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-0.5">{description}</CardDescription>
            </div>
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
                    <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => handleSelectAllColumns(tabKey === "awaitingReceipt" ? "awaiting" : "processed", columnsMeta, true)}>
                      Reset
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
                              handleToggleColumn(tabKey === "awaitingReceipt" ? "awaiting" : "processed", col.dataKey, Boolean(checked))
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
        </CardHeader>
        <CardContent className="p-0 flex-1 flex-col">
          {isLoading ? (
            <div className="flex flex-col justify-center items-center py-10 flex-1">
              <Loader2 className="h-8 w-8 text-purple-600 animate-spin mb-3" />
              <p className="text-muted-foreground ml-2">Loading...</p>
            </div>
          ) : hasError ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-destructive-foreground bg-destructive/10 rounded-lg mx-4 my-4 text-center flex-1">
              <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
              <p className="font-medium text-destructive">Error Loading Data</p>
              <p className="text-sm text-muted-foreground max-w-md">{errorData}</p>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-purple-200/50 bg-purple-50/50 rounded-lg mx-4 my-4 text-center flex-1">
              <Info className="h-12 w-12 text-purple-500 mb-3" />
              <p className="font-medium text-foreground">No Data Found</p>
              <p className="text-sm text-muted-foreground text-center">
                {tabKey === "awaitingReceipt" ? "No lifts are currently awaiting receipt." : "No processed lifts match the criteria."}
                {user?.firmName && user.firmName.toLowerCase() !== "all" && <span className="block mt-1">(Filtered by firm: {user.firmName})</span>}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-b-lg flex-1">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                  <TableRow>
                    {visibleCols.map((col) => (
                      <TableHead key={col.dataKey} className="whitespace-nowrap text-xs px-3 py-2">
                        {col.header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item) => (
                    <TableRow 
                      key={item._id} 
                      className={`hover:bg-purple-50/50 ${
                        tabKey === "processedReceipts" && !item._quantitiesMatch 
                          ? "bg-red-100 hover:bg-red-200/70 border-l-4 border-l-red-500" 
                          : ""
                      }`}
                    >
                      {visibleCols.map((column) => (
                        <TableCell key={`${item._id}-${column.dataKey}`} className={`whitespace-nowrap text-xs px-3 py-2 ${column.dataKey === "id" || column.dataKey === "liftNo" ? "font-medium text-primary" : "text-gray-700"}`}>
                          {column.dataKey === "actionColumn" && tabKey === "awaitingReceipt" ? (
                            <Button variant="outline" size="xs" onClick={() => handleOpenReceiptModal(item)} className="h-7 px-2.5 py-1 text-xs">
                              Record Receipt
                            </Button>
                          ) : (
                            renderCell(item, column)
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
    );
  };

  return (
    <div className="space-y-4 p-4 md:p-6 bg-slate-50 min-h-screen">
      <Card className="shadow-md border-none">
        <CardHeader className="p-4 border-b border-gray-200">
          <CardTitle className="flex items-center gap-2 text-gray-700 text-lg">
            <PackageOpen className="h-5 w-5 text-purple-600" /> Step 6: Receipt Of Material / Physical Quality Check 
          </CardTitle>
          <CardDescription className="text-gray-500 text-sm">
            Record receipt details and perform quality checks for incoming materials.
            {user?.firmName && user.firmName.toLowerCase() !== "all" && <span className="ml-2 text-purple-600 font-medium">• Filtered by: {user.firmName}</span>}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full sm:w-[480px] grid-cols-2 mb-4">
              <TabsTrigger value="awaitingReceipt" className="flex items-center gap-2">
                <FileCheckIcon className="h-4 w-4" /> Awaiting Receipt
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">
                  {liftsAwaitingReceipt.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="processedReceipts" className="flex items-center gap-2">
                <History className="h-4 w-4" /> Processed Lifts
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">
                  {derivedMaterialReceipts.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
            <div className="mb-4 p-4 bg-purple-50/50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-gray-500" />
                <Label className="text-sm font-medium">Filters</Label>
                <Button variant="outline" size="sm" onClick={clearAllFilters} className="ml-auto bg-white">
                  Clear All
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                <Select value={filters.liftType} onValueChange={(value) => handleFilterChange("liftType", value)}>
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
                <Select value={filters.totalQuantity} onValueChange={(value) => handleFilterChange("totalQuantity", value)}>
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
            <TabsContent value="awaitingReceipt" className="flex-1 flex flex-col mt-0">
              {renderTableSection("awaitingReceipt", "Material Lifts Awaiting Receipt", "Filtered by Column T (Planned) having a value and Column U (Actual Timestamp) being empty.", liftsAwaitingReceipt, AWAITING_RECEIPT_COLUMNS_META, visibleAwaitingReceiptColumns)}
            </TabsContent>
            <TabsContent value="processedReceipts" className="flex-1 flex flex-col mt-0">
              {renderTableSection("processedReceipts", "Processed Lifts / Receipts", "Lifts with a Timestamp in Column U, sorted by latest. Red rows indicate quantity mismatches.", derivedMaterialReceipts, PROCESSED_RECEIPTS_COLUMNS_META, visibleProcessedReceiptsColumns)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <ReceiptFormModal isOpen={isModalOpen} onClose={handleModalClose} liftData={selectedLift}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <Label htmlFor="dateOfReceiving" className="block text-sm font-medium text-gray-700">
                Date Of Receiving<span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                id="dateOfReceiving"
                name="dateOfReceiving"
                value={formData.dateOfReceiving}
                onChange={handleInputChange}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${formErrors.dateOfReceiving ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 focus:border-purple-500 focus:ring-purple-500"}`}
              />
              {formErrors.dateOfReceiving && <p className="text-red-500 text-xs mt-1">{formErrors.dateOfReceiving}</p>}
            </div>
            <div>
              <Label htmlFor="totalBillQuantity" className="block text-sm font-medium text-gray-700">
                Total Bill Quantity <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                step="any"
                id="totalBillQuantity"
                name="totalBillQuantity"
                value={formData.totalBillQuantity}
                onChange={handleInputChange}
                placeholder="e.g. 15.00"
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${formErrors.totalBillQuantity ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 focus:border-purple-500 focus:ring-purple-500"}`}
              />
              {formErrors.totalBillQuantity && <p className="text-red-500 text-xs mt-1">{formErrors.totalBillQuantity}</p>}
            </div>
            <div>
              <Label htmlFor="actualQuantity" className="block text-sm font-medium text-gray-700">
                Actual Quantity Received<span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                step="any"
                id="actualQuantity"
                name="actualQuantity"
                value={formData.actualQuantity}
                onChange={handleInputChange}
                placeholder="e.g. 14.80"
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${formErrors.actualQuantity ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 focus:border-purple-500 focus:ring-purple-500"}`}
              />
              {formErrors.actualQuantity && <p className="text-red-500 text-xs mt-1">{formErrors.actualQuantity}</p>}
            </div>
            <div>
              <Label htmlFor="weightSlipQty" className="block text-sm font-medium text-gray-700">
                Weight Slip Qty<span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                step="any"
                id="weightSlipQty"
                name="weightSlipQty"
                value={formData.weightSlipQty}
                onChange={handleInputChange}
                placeholder="e.g. 15.00"
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${formErrors.weightSlipQty ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 focus:border-purple-500 focus:ring-purple-500"}`}
              />
              {formErrors.weightSlipQty && <p className="text-red-500 text-xs mt-1">{formErrors.weightSlipQty}</p>}
            </div>
            <div>
              <Label htmlFor="qtyDifference" className="block text-sm font-medium text-gray-700">
                Quantity Difference
              </Label>
              <Input type="text" id="qtyDifference" name="qtyDifference" value={formData.qtyDifference} readOnly className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm sm:text-sm text-gray-700" />
            </div>
            <div>
              <Label htmlFor="physicalCondition" className="block text-sm font-medium text-gray-700">
                Physical Condition<span className="text-red-500">*</span>
              </Label>
              <Select value={formData.physicalCondition} onValueChange={(value) => handleFormSelectChange("physicalCondition", value)}>
                <SelectTrigger className={`mt-1 w-full rounded-md shadow-sm sm:text-sm ${formErrors.physicalCondition ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 focus:border-purple-500 focus:ring-purple-500"}`}>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Excellent">Excellent</SelectItem>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Average">Average</SelectItem>
                  <SelectItem value="Poor">Poor</SelectItem>
                  <SelectItem value="Damaged">Damaged</SelectItem>
                </SelectContent>
              </Select>
              {formErrors.physicalCondition && <p className="text-red-500 text-xs mt-1">{formErrors.physicalCondition}</p>}
            </div>
            <div>
              <Label htmlFor="moisture" className="block text-sm font-medium text-gray-700">
                Moisture (%)<span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                step="any"
                id="moisture"
                name="moisture"
                value={formData.moisture}
                onChange={handleInputChange}
                placeholder="e.g. 2.5"
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${formErrors.moisture ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 focus:border-purple-500 focus:ring-purple-500"}`}
              />
              {formErrors.moisture && <p className="text-red-500 text-xs mt-1">{formErrors.moisture}</p>}
            </div>
            <div className="md:col-span-1">
              <Label htmlFor="physicalImageFile" className="block text-sm font-medium text-gray-700">
                Physical Image
              </Label>
              <Input
                type="file"
                id="physicalImageFile"
                name="physicalImageFile"
                onChange={handleInputChange}
                accept="image/*,.pdf"
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
              {formData.physicalImageFile && <p className="text-xs text-gray-500 mt-1">Selected: {formData.physicalImageFile.name}</p>}
              {formData.physicalImageUrl && !formData.physicalImageFile && (
                <p className="text-xs text-gray-500 mt-1">
                  Existing: <a href={formData.physicalImageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">View</a>
                </p>
              )}
            </div>
            <div className="md:col-span-1">
              <Label htmlFor="weightSlipFile" className="block text-sm font-medium text-gray-700">
                Weight Slip Image
              </Label>
              <Input
                type="file"
                id="weightSlipFile"
                name="weightSlipFile"
                onChange={handleInputChange}
                accept="image/*,.pdf"
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
              {formData.weightSlipFile && <p className="text-xs text-gray-500 mt-1">Selected: {formData.weightSlipFile.name}</p>}
              {formData.weightSlipImageUrl && !formData.weightSlipFile && (
                <p className="text-xs text-gray-500 mt-1">
                  Existing: <a href={formData.weightSlipImageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">View</a>
                </p>
              )}
            </div>
          </div>
          
          {/* Quantity Comparison Warning */}
          {(formData.totalBillQuantity || formData.actualQuantity || formData.weightSlipQty) && (
            <div className="mt-4 p-3 rounded-lg border-l-4 border-l-amber-400 bg-amber-50">
              <div className="flex">
                {/* <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                </div> */}
                {/* <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800">
                    Quantity Comparison
                  </h3>
                  <div className="mt-2 text-sm text-amber-700">
                    <p>Bill Qty: {formData.totalBillQuantity || "0"} | Actual Qty: {formData.actualQuantity || "0"} | Weight Slip Qty: {formData.weightSlipQty || "0"}</p>
                    {!checkQuantitiesMatch(formData.totalBillQuantity, formData.actualQuantity, formData.weightSlipQty) && (
                      <p className="mt-1 font-medium text-red-600">⚠️ Warning: Quantities do not match!</p>
                    )}
                  </div>
                </div> */}
              </div>
            </div>
          )}
          
          <div className="pt-5 sm:pt-6 flex flex-col sm:flex-row-reverse gap-3 sm:gap-0 sm:justify-start">
            <Button
              type="submit"
              disabled={isSubmitting}
              className={`w-full sm:w-auto inline-flex justify-center py-2.5 px-6 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white ${isSubmitting ? "bg-purple-400 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"}`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin my-0.5" /> Saving...
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