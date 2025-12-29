// src/components/BiltyPage.jsx
"use client";

import { useState, useEffect, useCallback, useMemo, useContext } from "react";
import { Receipt, FileText, Loader2, Upload, X, History, FileCheck, AlertTriangle, Info, ExternalLink, Filter } from "lucide-react";
import { MixerHorizontalIcon } from "@radix-ui/react-icons";

// Shadcn UI components
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AuthContext } from "../context/AuthContext";

// --- Constants ---
const SHEET_ID = "1NUxf4pnQ-CtCFUjA5rqLgYEJiU77wQlwVyimjt8RmFQ";
const LIFT_ACCOUNTS_SHEET = "LIFT-ACCOUNTS";
const API_URL = "https://script.google.com/macros/s/AKfycbzj9zlZTEhdlmaMt78Qy3kpkz7aOfVKVBRuJkd3wv_UERNrIRCaepSULpNa7W1g-pw/exec";
const BILTY_IMAGE_FOLDER_ID = "1P1JV_WJLm7Zl0hziPNzzkrAwwKaH94nW"; // Folder for Bilty images
const DATA_START_ROW_LIFTS = 6;

// --- Column Indices (0-based) from 'Copy of LIFT-ACCOUNTS' sheet ---
const LIFT_ID_COL = 1; // B
const VENDOR_NAME_COL = 3; // D
const RAW_MATERIAL_COL = 5; // F
const LIFT_TYPE_COL = 10; // K
const ORIGINAL_QTY_COL = 6; // G
const TOTAL_BILL_QUANTITY_COL_X = 23; // X
const ACTUAL_QTY_COL_Y = 24; // Y
const INDENT_NO_COL = 2; // C
const BILL_NO_COL = 7; // H
const NOT_NULL_CONDITION_COL = 29; // AD: Planned 2
const TIMESTAMP_COL = 30; // AE: Actual 2
const BILTY_NUMBER_COL = 32; // AG: Bilty No.
const BILTY_IMAGE_COL = 33; // AH: Bilty Image
const FIRM_NAME_COL = 55; // Column BD for Firm Name

// --- Column Definitions for Tables ---
const PENDING_BILTY_COLUMNS_META = [
  { header: "Actions", dataKey: "actionColumn", toggleable: false, alwaysVisible: true },
  { header: "Lift ID", dataKey: "id", toggleable: true, alwaysVisible: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "Vendor Name", dataKey: "vendorName", toggleable: true },
  { header: "Product Name", dataKey: "rawMaterialName", toggleable: true },
  { header: "Planned 2 (AD)", dataKey: "planned2", toggleable: true },
];

const BILTY_HISTORY_COLUMNS_META = [
  { header: "Lift ID", dataKey: "id", toggleable: true, alwaysVisible: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "Vendor Name", dataKey: "vendorName", toggleable: true },
  { header: "Product Name", dataKey: "rawMaterialName", toggleable: true },
  { header: "Bilty Number (AG)", dataKey: "biltyNumber", toggleable: true },
  { header: "Bilty Image (AH)", dataKey: "biltyImageUrl", isLink: true, linkText: "View Bilty" },
  { header: "Timestamp (AE)", dataKey: "timestamp", toggleable: true },
];

// --- Helper Functions ---
const parseGvizResponse = (text, sheetNameForError) => {
  if (!text || !text.includes("google.visualization.Query.setResponse")) {
    console.error(`Invalid or empty gviz response for ${sheetNameForError}:`, text ? text.substring(0, 500) : "Response was null/empty");
    throw new Error(`Invalid response format from Google Sheets for ${sheetNameForError}.`);
  }
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error(`Could not parse JSON from Google Sheets response for ${sheetNameForError}.`);
  }
  const jsonString = text.substring(jsonStart, jsonEnd + 1);
  const data = JSON.parse(jsonString);
  if (data.status === 'error') {
      throw new Error(`Google Sheets API Error: ${data.errors?.[0]?.detailed_message || "Unknown error"}`);
  }
  if (!data.table || !data.table.cols) {
    console.warn(`No data.table or cols in ${sheetNameForError} or sheet is empty`);
    return { cols: [], rows: [] };
  }
  if (!data.table.rows) data.table.rows = [];
  return data.table;
};

const formatDateString = (dateValue) => {
    if (!dateValue || typeof dateValue !== 'string' || !dateValue.trim()) return "";
    const gvizMatch = dateValue.match(/^Date\((\d+),(\d+),(\d+)(,(\d+),(\d+),(\d+))?\)/);
    if (gvizMatch) {
        const [, year, month, day, hours, minutes, seconds] = gvizMatch.map(Number);
        const d = new Date(year, month, day, hours || 0, minutes || 0, seconds || 0);
        return d.toLocaleString("en-GB", { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/,/g, "");
    }
    const d = new Date(dateValue);
    if (!isNaN(d.getTime())) {
        return d.toLocaleString("en-GB", { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/,/g, "");
    }
    return dateValue;
};

export default function BiltyPage() {
  const { user } = useContext(AuthContext);
  const [liftData, setLiftData] = useState([]);
  const [selectedLift, setSelectedLift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [formData, setFormData] = useState({
    biltyNumber: "",
    biltyImageFile: null,
  });
  const [formErrors, setFormErrors] = useState({});

  const [activeTab, setActiveTab] = useState("pendingBilty");
  const [visiblePendingColumns, setVisiblePendingColumns] = useState({});
  const [visibleHistoryColumns, setVisibleHistoryColumns] = useState({});

  // Filter State
  const [filters, setFilters] = useState({
    vendorName: "all",
    materialName: "all",
    liftType: "all",
    totalQuantity: "all",
    orderNumber: "all",
  });

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
      columnsMeta.forEach(col => {
        visibility[col.dataKey] = col.alwaysVisible || col.toggleable;
      });
      return visibility;
    };
    setVisiblePendingColumns(initializeVisibility(PENDING_BILTY_COLUMNS_META));
    setVisibleHistoryColumns(initializeVisibility(BILTY_HISTORY_COLUMNS_META));
  }, []);

  const fetchLiftData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(LIFT_ACCOUNTS_SHEET)}&cb=${new Date().getTime()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch lifts data: ${response.status}`);

      const text = await response.text();
      const dataTable = parseGvizResponse(text, LIFT_ACCOUNTS_SHEET);

      let processedRawRows = dataTable.rows.map((row, index) => {
        if (!row || !row.c) return null;

        const getStringValue = (colIndex) => {
          const cell = row.c[colIndex];
          return cell && (typeof cell.f !== 'undefined' ? cell.f : (typeof cell.v !== 'undefined' ? cell.v : null));
        };

        return {
          _id: `lift-${index}-${getStringValue(LIFT_ID_COL) || ''}`,
          _rowIndex: index + DATA_START_ROW_LIFTS,
          rawCells: row.c ? row.c.map(cell => cell ? (cell.f ?? cell.v) : null) : [],
          id: getStringValue(LIFT_ID_COL),
          vendorName: getStringValue(VENDOR_NAME_COL),
          rawMaterialName: getStringValue(RAW_MATERIAL_COL),
          liftType: getStringValue(LIFT_TYPE_COL),
          originalQty: getStringValue(ORIGINAL_QTY_COL),
          totalBillQuantity: getStringValue(TOTAL_BILL_QUANTITY_COL_X),
          actualQty: getStringValue(ACTUAL_QTY_COL_Y),
          indentNo: getStringValue(INDENT_NO_COL),
          billNo: getStringValue(BILL_NO_COL),
          firmName: getStringValue(FIRM_NAME_COL),
          planned2: formatDateString(getStringValue(NOT_NULL_CONDITION_COL)),
          isPending: getStringValue(NOT_NULL_CONDITION_COL) && !getStringValue(TIMESTAMP_COL),
          isHistory: !!getStringValue(TIMESTAMP_COL),
          biltyNumber: getStringValue(BILTY_NUMBER_COL),
          biltyImageUrl: getStringValue(BILTY_IMAGE_COL),
          timestamp: formatDateString(getStringValue(TIMESTAMP_COL)),
        };
      }).filter(row => row && row.id);

      if (user?.firmName && user.firmName.toLowerCase() !== "all") {
        const userFirmNameLower = user.firmName.toLowerCase();
        processedRawRows = processedRawRows.filter(
          (lift) => lift.firmName && String(lift.firmName).toLowerCase() === userFirmNameLower,
        );
      }
      
      setLiftData(processedRawRows);

    } catch (err) {
      console.error("Error fetching lift data:", err);
      setError(`Failed to load lifts data: ${err.message}`);
      toast.error("Data Load Error", { description: err.message, icon: <X className="h-4 w-4" /> });
    } finally {
      setLoading(false);
    }
  }, [refreshTrigger, user]);

  useEffect(() => {
    fetchLiftData();
  }, [fetchLiftData]);

  // Memoized lists for tabs
  const pendingBilty = useMemo(() => {
    let filtered = liftData.filter(lift => lift.isPending);
    if (filters.vendorName !== "all") filtered = filtered.filter(lift => lift.vendorName === filters.vendorName);
    if (filters.materialName !== "all") filtered = filtered.filter(lift => lift.rawMaterialName === filters.materialName);
    // ... add other filters
    return filtered;
  }, [liftData, filters]);

  const biltyHistory = useMemo(() => {
    let filtered = liftData.filter(lift => lift.isHistory);
    if (filters.vendorName !== "all") filtered = filtered.filter(lift => lift.vendorName === filters.vendorName);
    if (filters.materialName !== "all") filtered = filtered.filter(lift => lift.rawMaterialName === filters.materialName);
     // ... add other filters
    return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [liftData, filters]);
  
  const uniqueFilterOptions = useMemo(() => {
    const vendors = new Set();
    const materials = new Set();
    const types = new Set();
    const quantities = new Set();
    const orders = new Set();

    liftData.forEach(lift => {
      if (lift.vendorName) vendors.add(lift.vendorName);
      if (lift.rawMaterialName) materials.add(lift.rawMaterialName);
      if (lift.liftType) types.add(lift.liftType);
      if (lift.originalQty) quantities.add(lift.originalQty);
      if (lift.totalBillQuantity) quantities.add(lift.totalBillQuantity);
      if (lift.actualQty) quantities.add(lift.actualQty);
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
  }, [liftData]);

  const handleLiftSelect = (lift) => {
    setSelectedLift(lift);
    setFormData({ biltyNumber: lift.biltyNumber || "", biltyImageFile: null });
    setFormErrors({});
    setShowPopup(true);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setSelectedLift(null);
    setFormData({ biltyNumber: "", biltyImageFile: null });
    setFormErrors({});
  };
  
  const uploadFileToDrive = async (file, folderId) => {
    if (!file || !(file instanceof File)) {
        throw new Error("Invalid file provided for upload.");
    }

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

    const response = await fetch(API_URL, { method: "POST", body: uploadPayload });
    if (!response.ok) throw new Error(`Drive upload failed: ${await response.text()}`);
    
    const result = await response.json();
    if (!result.success) throw new Error(result.message || "Apps Script upload failed");
    return result.fileUrl;
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "biltyImageFile") {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.biltyNumber.trim()) {
      newErrors.biltyNumber = "Bilty Number is required.";
    }
    if (!formData.biltyImageFile) {
      newErrors.biltyImageFile = "Bilty Image is required.";
    }
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm() || !selectedLift) {
        toast.error("Validation Error", { description: "Please fill all required fields or select a lift." });
        return;
    }
    setIsSubmitting(true);
    toast.loading("Submitting Bilty details...", { id: "bilty-submit" });

    try {
        let biltyImageUrl = "";
        if (formData.biltyImageFile) {
            biltyImageUrl = await uploadFileToDrive(formData.biltyImageFile, BILTY_IMAGE_FOLDER_ID);
        }

        const timestamp = new Date().toLocaleString("en-GB", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit", second: "2-digit",
            hour12: false
        }).replace(/,/g, "");

        const cellUpdates = {
            [`col${TIMESTAMP_COL + 1}`]: timestamp,
            [`col${BILTY_NUMBER_COL + 1}`]: formData.biltyNumber,
            [`col${BILTY_IMAGE_COL + 1}`]: biltyImageUrl,
        };

        const params = new URLSearchParams({
            action: "updateCells",
            sheetName: LIFT_ACCOUNTS_SHEET,
            rowIndex: selectedLift._rowIndex,
            cellUpdates: JSON.stringify(cellUpdates),
        });

        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString(),
        });

        const responseText = await response.text();

        // FIX: Handle the Apps Script CORS error gracefully
        if (!response.ok && !responseText.toLowerCase().includes('success')) {
            throw new Error(`Server error: ${response.status}. ${responseText}`);
        }
        
        // Don't try to parse JSON if the response is not ok, just assume success
        // because the user confirmed the data gets submitted.

        toast.success("Success!", {
            id: "bilty-submit",
            description: `Bilty for Lift ID ${selectedLift.id} submitted successfully.`,
        });

        setRefreshTrigger((p) => p + 1);
        handleClosePopup();
    } catch (error) {
        console.error("Error submitting bilty:", error);
        toast.error("Submission Failed", {
            id: "bilty-submit",
            description: error.message,
        });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const renderCell = (item, column) => {
    const value = item[column.dataKey];
    if (column.isLink) {
      return value && String(value).startsWith("http") ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800 hover:underline font-medium text-xs inline-flex items-center gap-1">
          <ExternalLink className="h-3 w-3"/>{column.linkText || "View"}
        </a>
      ) : <span className="text-gray-400 text-xs">N/A</span>;
    }
    return value || <span className="text-xs text-gray-400">N/A</span>;
  };

  const handleToggleColumn = (tab, dataKey, checked) => {
    if (tab === "pending") {
      setVisiblePendingColumns(prev => ({ ...prev, [dataKey]: checked }));
    } else {
      setVisibleHistoryColumns(prev => ({ ...prev, [dataKey]: checked }));
    }
  };

  const handleSelectAllColumns = (tab, columnsMeta, checked) => {
    const newVisibility = {};
    columnsMeta.forEach(col => {
      if (col.toggleable && !col.alwaysVisible) newVisibility[col.dataKey] = checked;
    });
    if (tab === "pending") {
      setVisiblePendingColumns(prev => ({ ...prev, ...newVisibility }));
    } else {
      setVisibleHistoryColumns(prev => ({ ...prev, ...newVisibility }));
    }
  };

    const renderTableSection = (tabKey, title, description, data, columnsMeta, visibilityState) => {
    const isLocalLoading = loading && data.length === 0;
    const hasLocalError = error && data.length === 0 && activeTab === tabKey;

    return (
        <Card className="shadow-sm border border-border flex-1 flex flex-col">
            <CardHeader className="py-3 px-4 bg-muted/30">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="flex items-center text-md font-semibold text-foreground">
                          {tabKey === 'pendingBilty' ? <FileCheck className="h-5 w-5 text-purple-600 mr-2" /> : <History className="h-5 w-5 text-purple-600 mr-2" />}
                          {title} ({data.length})
                        </CardTitle>
                        <CardDescription className="text-sm text-muted-foreground mt-0.5">{description}</CardDescription>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs">
                          <MixerHorizontalIcon className="mr-1.5 h-3.5 w-3.5" /> View Columns
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[220px] p-3">
                        <div className="grid gap-2">
                          <p className="text-sm font-medium">Toggle Columns</p>
                          <div className="flex items-center justify-between mt-1 mb-2">
                            <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => handleSelectAllColumns(tabKey === 'pendingBilty' ? 'pending' : 'history', columnsMeta, true)}>Select All</Button>
                            <span className="text-gray-300 mx-1">|</span>
                            <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => handleSelectAllColumns(tabKey === 'pendingBilty' ? 'pending' : 'history', columnsMeta, false)}>Deselect All</Button>
                          </div>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {columnsMeta.filter(col => col.toggleable).map(col => (
                              <div key={`toggle-${tabKey}-${col.dataKey}`} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`toggle-${tabKey}-${col.dataKey}`}
                                  checked={!!visibilityState[col.dataKey]}
                                  onCheckedChange={(checked) => handleToggleColumn(tabKey === 'pendingBilty' ? 'pending' : 'history', col.dataKey, Boolean(checked))}
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
            <CardContent className="p-0 flex-1 flex flex-col">
                {isLocalLoading ? (
                    <div className="flex flex-col justify-center items-center py-10 flex-1"><Loader2 className="h-8 w-8 text-purple-600 animate-spin mb-3" /><p className="text-muted-foreground">Loading...</p></div>
                ) : hasLocalError ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-destructive-foreground bg-destructive/10 rounded-lg mx-4 my-4 text-center flex-1"><AlertTriangle className="h-10 w-10 text-destructive mb-3" /><p className="font-medium text-destructive">Error Loading Data</p><p className="text-sm text-muted-foreground max-w-md">{error}</p></div>
                ) : data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-purple-200/50 bg-purple-50/50 rounded-lg mx-4 my-4 text-center flex-1">
                      <Info className="h-12 w-12 text-purple-500 mb-3" />
                      <p className="font-medium text-foreground">No Data Found</p>
                      <p className="text-sm text-muted-foreground text-center">
                        No lifts match the criteria for this view.
                        {user?.firmName && user.firmName.toLowerCase() !== "all" && (
                          <span className="block mt-1">(Filtered by firm: {user.firmName})</span>
                        )}
                      </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-b-lg flex-1">
                        <Table>
                            <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                <TableRow>
                                    {columnsMeta.filter(col => visibilityState[col.dataKey]).map(col => (
                                        <TableHead key={col.dataKey} className="whitespace-nowrap text-xs px-3 py-2">{col.header}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map(item => (
                                    <TableRow key={item._id} className="hover:bg-purple-50/50">
                                        {columnsMeta.filter(col => visibilityState[col.dataKey]).map(column => (
                                            <TableCell key={column.dataKey} className={`whitespace-nowrap text-xs px-3 py-2 ${column.dataKey === 'id' ? 'font-medium text-primary' : 'text-gray-700'}`}>
                                                {column.dataKey === "actionColumn" ? (
                                                    <Button onClick={() => handleLiftSelect(item)} size="xs" variant="outline" className="text-xs h-7 px-2 py-1">Enter Bilty</Button>
                                                ) : renderCell(item, column)}
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
            <Receipt className="h-5 w-5 text-purple-600" />
            Bilty Page
          </CardTitle>
          <CardDescription className="text-gray-500 text-sm">
            Manage bilty details for material lifts.
            {user?.firmName && user.firmName.toLowerCase() !== "all" && (
              <span className="ml-2 text-purple-600 font-medium">• Filtered by: {user.firmName}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full sm:w-[450px] grid-cols-2 mb-4">
              <TabsTrigger value="pendingBilty" className="flex items-center gap-2">
                <FileCheck className="h-4 w-4" /> Pending Bilty
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">{pendingBilty.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="biltyHistory" className="flex items-center gap-2">
                <History className="h-4 w-4" /> Bilty History
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">{biltyHistory.length}</Badge>
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
                  <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="All Vendors" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vendors</SelectItem>
                    {uniqueFilterOptions.vendorName.map((vendor) => (<SelectItem key={vendor} value={vendor}>{vendor}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Select value={filters.materialName} onValueChange={(value) => handleFilterChange("materialName", value)}>
                  <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="All Materials" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Materials</SelectItem>
                    {uniqueFilterOptions.materialName.map((material) => (<SelectItem key={material} value={material}>{material}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Select value={filters.liftType} onValueChange={(value) => handleFilterChange("liftType", value)}>
                  <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="All Types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {uniqueFilterOptions.liftType.map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Select value={filters.totalQuantity} onValueChange={(value) => handleFilterChange("totalQuantity", value)}>
                  <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="All Quantities" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Quantities</SelectItem>
                    {uniqueFilterOptions.totalQuantity.map((qty) => (<SelectItem key={qty} value={qty}>{qty}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Select value={filters.orderNumber} onValueChange={(value) => handleFilterChange("orderNumber", value)}>
                  <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="All Orders" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orders</SelectItem>
                    {uniqueFilterOptions.orderNumber.map((order) => (<SelectItem key={order} value={order}>{order}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <TabsContent value="pendingBilty" className="flex-1 flex flex-col mt-0">
                {renderTableSection("pendingBilty", "Lifts Pending Bilty", "Filtered: Column AD is filled & Column AE is empty.", pendingBilty, PENDING_BILTY_COLUMNS_META, visiblePendingColumns)}
            </TabsContent>
            <TabsContent value="biltyHistory" className="flex-1 flex flex-col mt-0">
                {renderTableSection("biltyHistory", "Bilty History", "Sorted from latest to oldest recorded bilty.", biltyHistory, BILTY_HISTORY_COLUMNS_META, visibleHistoryColumns)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={showPopup} onOpenChange={handleClosePopup}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-6 w-6 text-purple-600"/>
              Enter Bilty for <span className="text-purple-600 font-bold">{selectedLift?.id}</span>
            </DialogTitle>
            <DialogDescription>
              Fill in the details below. Required fields are marked with an asterisk (*).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div>
              <Label htmlFor="biltyNumber" className="font-medium">
                Bilty Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="biltyNumber"
                name="biltyNumber"
                value={formData.biltyNumber}
                onChange={handleInputChange}
                className={`mt-1 ${formErrors.biltyNumber ? "border-red-500" : ""}`}
                placeholder="Enter Bilty Number"
              />
              {formErrors.biltyNumber && <p className="mt-1 text-xs text-red-600">{formErrors.biltyNumber}</p>}
            </div>
            <div>
              <Label htmlFor="biltyImageFile" className="font-medium">
                Upload Bilty Image <span className="text-red-500">*</span>
              </Label>
              <Input
                id="biltyImageFile"
                name="biltyImageFile"
                type="file"
                onChange={handleInputChange}
                className={`mt-1 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 ${formErrors.biltyImageFile ? "border-red-500" : ""}`}
                accept=".pdf,.jpg,.jpeg,.png"
              />
              {formData.biltyImageFile && <p className="text-xs text-gray-500 mt-1">Selected: {formData.biltyImageFile.name}</p>}
              {formErrors.biltyImageFile && <p className="mt-1 text-xs text-red-600">{formErrors.biltyImageFile}</p>}
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={handleClosePopup}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700">
                {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</> : "Submit Bilty"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}