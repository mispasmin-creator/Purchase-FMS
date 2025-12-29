"use client";
import React, { useState, useEffect, useMemo, useCallback, useContext } from "react";
import { FileCheck, Loader2, Upload, Wallet, Filter, Link as LinkIcon, File, History, Info, AlertTriangle } from 'lucide-react';
import { MixerHorizontalIcon } from '@radix-ui/react-icons';
import "../scrollbar-hide.css";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AuthContext } from "../context/AuthContext";

// Constants
const SHEET_ID = "1NUxf4pnQ-CtCFUjA5rqLgYEJiU77wQlwVyimjt8RmFQ";
const INDENT_PO_SHEET = "INDENT-PO";
const DATA_START_ROW = 6; // FIX: Corrected from 7 to 5 to fix 2-row offset
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzj9zlZTEhdlmaMt78Qy3kpkz7aOfVKVBRuJkd3wv_UERNrIRCaepSULpNa7W1g-pw/exec";

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
const COL_ADVANCE_TO_BE_PAID = 26; // Column AA
const COL_TO_BE_PAID_AMOUNT = 27; // Column AB
const COL_WHEN_TO_BE_PAID = 28; // Column AC
const COL_NOTES = 29;
const COL_ALUMINA = 30;
const COL_IRON = 31;
const COL_VENDOR_NAME_PO = 42; // Column AQ (index 42 = column AQ)

// Mock data for filters
const vendorOptions = ["Devid", "Karan", "Sanjay", "Vinod", "Purab"];
const materialOptions = ["Fabrics", "Minerals", "Iron", "Steel"];
const firmOptions = ["Purab", "Rkl", "Prmmpl", "PMMPL"];

const GeneratePurchaseOrder = () => {
  const { user } = useContext(AuthContext);
  const [filters, setFilters] = useState({
    vendorName: "all",
    rawMaterialName: "all",
    firmName: "all"
  });

  // States for Generate PO
  const [indents, setIndents] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedIndent, setSelectedIndent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState(null);
  const [haveToPO, setHaveToPO] = useState("");
  const [poErrors, setPoErrors] = useState({});

  // States for Advance Payment Tab
  const [indentData, setIndentData] = useState([]); // This holds the raw data for advance payments
  const [selectedPaymentIndent, setSelectedPaymentIndent] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [vendorOptions, setVendorOptions] = useState([]);

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
    alumina: "",
    iron: "",
  });

  // Form state for Advance Payment
  const [paymentFormData, setPaymentFormData] = useState({ amount: "", paymentDate: "" });
  const [paymentFormErrors, setPaymentFormErrors] = useState({});

  // Column visibility states
  const [visibleIndentColumns, setVisibleIndentColumns] = useState({});
  const [visiblePoColumns, setVisiblePoColumns] = useState({});
  const [visiblePaymentColumns, setVisiblePaymentColumns] = useState({});
  const [activeTab, setActiveTab] = useState("approve");

  // Column definitions for display tables
  const allIndentColumnsMeta = useMemo(() => ([
    { header: "Action", dataKey: "actionColumn", toggleable: false, alwaysVisible: true },
    { header: "Indent ID", dataKey: "id", toggleable: true, alwaysVisible: true },
    { header: "Firm Name", dataKey: "firmName", toggleable: true },
    { header: "Vendor Name", dataKey: "vendorName", toggleable: true },
    { header: "Raw Material", dataKey: "rawMaterialName", toggleable: true },
    { header: "Approved Qty", dataKey: "approvedQty", toggleable: true },
    { header: "Type", dataKey: "typeOfIndent", toggleable: true },
    { header: "Planned Date", dataKey: "planned", toggleable: true },
  ]), []);

  const allPoColumnsMeta = useMemo(() => ([
    { header: "Indent ID", dataKey: "indentId", toggleable: true, alwaysVisible: true },
    { header: "Firm Name", dataKey: "firmName", toggleable: true },
    { header: "Vendor Name", dataKey: "vendorName", toggleable: true },
    { header: "Raw Material", dataKey: "rawMaterialName", toggleable: true },
    { header: "Quantity", dataKey: "quantity", toggleable: true },
    { header: "Total Amount", dataKey: "totalAmount", toggleable: true },
    { header: "Alumina %", dataKey: "alumina", toggleable: true },
    { header: "Iron %", dataKey: "iron", toggleable: true },
    { header: "PO File", dataKey: "poFile", toggleable: true, isLink: true, linkText: "View PDF" },
    { header: "Created At", dataKey: "createdAt", toggleable: true },
  ]), []);

  const ADVANCE_PAYMENT_COLUMNS_META = useMemo(() => ([
    { header: "Indent ID", dataKey: "indentId", toggleable: true, alwaysVisible: true },
    { header: "Firm Name", dataKey: "firmName", toggleable: true },
    { header: "Vendor Name", dataKey: "vendorName", toggleable: true },
    { header: "Status", dataKey: "paymentStatus", toggleable: true },
    { header: "Amount to Pay", dataKey: "toBePaidAmount", toggleable: true }, // Data from COL_TO_BE_PAID_AMOUNT
    { header: "Payment Date", dataKey: "whenToBePaid", toggleable: true }, // Data from COL_WHEN_TO_BE_PAID
  ]), []);

  // Helper function to parse gviz date string
  const parseGvizDate = useCallback((dateValue) => {
    if (!dateValue || typeof dateValue !== "string" || !dateValue.trim()) {
      return "";
    }
    const gvizMatch = dateValue.match(/^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)/);
    if (gvizMatch) {
      const [, year, month, day, hours, minutes, seconds] = gvizMatch.map(Number);
      const parsedDate = new Date(year, month, day, hours || 0, minutes || 0, seconds || 0);
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
      }).format(dateObj).replace(/,/g, "");
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
    setVisiblePaymentColumns(initializeVisibility(ADVANCE_PAYMENT_COLUMNS_META));
  }, [allIndentColumnsMeta, allPoColumnsMeta, ADVANCE_PAYMENT_COLUMNS_META]);

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
      console.error(`JSON delimiters not found for ${sheetNameForError}. Text:`, text.substring(0, 200));
      throw new Error(
        `Could not parse JSON from Google Sheets response for ${sheetNameForError}. Text: ${text.substring(0, 200)}`,
      );
    }
    const jsonString = text.substring(jsonStart, jsonEnd + 1);
    try {
      const data = JSON.parse(jsonString);
      if (!data.table || !data.table.cols) {
        console.warn(`No data.table or cols in ${sheetNameForError} or sheet is empty`, data);
        return { cols: [], rows: [] };
      }
      if (!data.table.rows) {
        console.warn(`No data.table.rows in ${sheetNameForError}, treating as empty.`, data);
        data.table.rows = [];
      }
      return data.table;
    } catch (e) {
      console.error(`Error parsing JSON for ${sheetNameForError}:`, e, "JSON String:", jsonString.substring(0, 500));
      throw new Error(`Failed to parse JSON response from Google Sheets for ${sheetNameForError}. Error: ${e.message}`);
    }
  }, []);


const fetchVendorOptions = useCallback(async () => {
  try {
    const masterUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=Master&cb=${new Date().getTime()}`;
    const response = await fetch(masterUrl);
    if (!response.ok) throw new Error(`Failed to fetch vendor data: ${response.statusText}`);
    
    let text = await response.text();
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    const jsonString = text.substring(jsonStart, jsonEnd + 1);
    const data = JSON.parse(jsonString);
    
    if (data.table && data.table.rows) {
      const vendors = data.table.rows
        .slice(1) // Skip header row
        .map(row => row.c[1] ? String(row.c[1].v).trim() : "") // Column B (index 1) for vendor names
        .filter(Boolean)
        .filter((value, index, self) => self.indexOf(value) === index) // Remove duplicates
        .sort();
      
      setVendorOptions(vendors);
    }
  } catch (error) {
    console.error("Error fetching vendor options:", error);
  }
}, []);

useEffect(() => {
  fetchVendorOptions();
}, [fetchVendorOptions]);


  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setPaymentLoading(true);
    setError(null);
    setPaymentError(null);
    try {
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(INDENT_PO_SHEET)}&t=${new Date().getTime()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }
      const responseText = await response.text();
      const dataTable = parseGvizResponse(responseText, INDENT_PO_SHEET);

      let processedData = dataTable.rows.map((row, gvizRowIndex) => {
        if (!row || !row.c) return null;

        const getStringValue = (colIndex) => {
          const cell = row.c[colIndex];
          if (cell && (cell.v !== undefined && cell.v !== null)) {
            return String(cell.f ?? cell.v).trim();
          }
          return "";
        };

        const rowData = {
          _id: `${INDENT_PO_SHEET}-${gvizRowIndex}`,
          _rowIndex: gvizRowIndex + DATA_START_ROW,
          rawCells: row.c.map(cell => cell ? (cell.f ?? cell.v) : null)
        };

        rowData.id = getStringValue(COL_INDENT_ID);
        rowData.firmName = getStringValue(COL_FIRM_NAME);
        rowData.vendorName = getStringValue(COL_VENDOR_NAME);
        rowData.rawMaterialName = getStringValue(COL_RAW_MATERIAL_NAME);
        rowData.typeOfIndent = getStringValue(COL_TYPE_OF_INDENT);
        rowData.approvedQty = getStringValue(COL_APPROVED_QTY);
        rowData.planned = parseGvizDate(getStringValue(COL_PLANNED_DATE));
        rowData.poTimestamp = parseGvizDate(getStringValue(COL_PO_TIMESTAMP));
        rowData.indentId = getStringValue(COL_INDENT_ID); // For PO History and Advance Payment
        rowData.quantity = getStringValue(COL_TOTAL_QTY); // For PO History quantity
        rowData.totalAmount = getStringValue(COL_TOTAL_AMOUNT);
        rowData.alumina = getStringValue(COL_ALUMINA);
        rowData.iron = getStringValue(COL_IRON);
        rowData.poFile = getStringValue(COL_PO_FILE_URL);
        rowData.createdAt = rowData.poTimestamp;
        rowData.haveToPO = getStringValue(COL_HAVE_TO_PO);
        rowData.rate = getStringValue(COL_RATE);
        rowData.leadTimeToLift = getStringValue(COL_LEAD_TIME);
        rowData.notes = getStringValue(COL_NOTES);

        // Advance Payment: Use the raw value or string value from the sheet for logic and display
        rowData.advanceToBePaid = getStringValue(COL_ADVANCE_TO_BE_PAID); // "yes" or "no"
        rowData.toBePaidAmount = getStringValue(COL_TO_BE_PAID_AMOUNT);
        rowData.whenToBePaid = getStringValue(COL_WHEN_TO_BE_PAID);

        // Determine payment status based on 'Advance To Be Paid' and if amount/date are filled
        const advanceToBePaidFlag = rowData.advanceToBePaid.toLowerCase();
        // A payment is considered 'Paid' if AdvanceToBePaid is 'yes' AND both amount and date are non-empty
        const isPaid = (advanceToBePaidFlag === 'yes' && rowData.toBePaidAmount !== "" && rowData.whenToBePaid !== "");
        rowData.paymentStatus = isPaid ? "Paid" : "Pending";

        return rowData;
      }).filter(Boolean); // Filter out any nulls

      if (user?.firmName && user.firmName.toLowerCase() !== 'all') {
        const userFirmNameLower = user.firmName.toLowerCase();
        processedData = processedData.filter(item => (item.firmName || "").toLowerCase().trim() === userFirmNameLower);
      }

      const indentsForApproval = processedData.filter(item => item.planned !== "" && item.poTimestamp === "");
      const poHistory = processedData.filter(item => item.poTimestamp !== "").sort((a, b) => new Date(b.poTimestamp) - new Date(a.poTimestamp));

      // Filtering for Advance Payment Needed: Must be 'yes' in COL_ADVANCE_TO_BE_PAID AND paymentStatus is "Pending"
      const advancePaymentNeeded = processedData.filter(item =>
        (item.advanceToBePaid || "").toLowerCase() === 'yes'
      );
      
      setIndents(indentsForApproval);
      setPurchaseOrders(poHistory);
      setIndentData(advancePaymentNeeded); // Correctly setting data for Advance Payment tab

    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data: " + err.message);
      setPaymentError("Failed to load payment data: " + err.message);
      toast.error("Data Load Error", { description: err.message });
    } finally {
      setLoading(false);
      setPaymentLoading(false);
    }
  }, [refreshTrigger, user, parseGvizDate, parseGvizResponse]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

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
    setPoErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({
        ...formData,
        poFile: file,
      });
      toast.info("File Selected", { description: file.name });
    }
  };

 const uploadFileToDrive = async (file) => {
  toast.loading("Preparing file upload...", { id: "upload-toast" });
  
  try {
    console.log("Uploading file:", file.name, "Size:", file.size, "Type:", file.type);
    
    // Check file size (Google Apps Script has ~50MB limit)
    if (file.size > 50 * 1024 * 1024) { // 50MB
      throw new Error("File size exceeds 50MB limit. Please use a smaller file.");
    }

    // Convert file to base64 with better error handling
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        console.log("File converted to base64 successfully");
        // Extract only the base64 part (remove data:mime;base64, prefix)
        const result = reader.result;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => {
        console.error("FileReader error:", error);
        reject(new Error("Failed to read file. It might be corrupted."));
      };
      reader.onabort = () => {
        reject(new Error("File read was aborted"));
      };
      
      // Add timeout for large files
      setTimeout(() => {
        if (reader.readyState !== 2) { // Not DONE
          reader.abort();
          reject(new Error("File read timeout. File might be too large."));
        }
      }, 30000); // 30 second timeout
      
      reader.readAsDataURL(file);
    });

    console.log("Base64 conversion complete, data length:", base64Data.length);

    // FIX: Use URLSearchParams with proper encoding
    const params = new URLSearchParams();
    params.append("action", "uploadFile");
    params.append("fileName", file.name);
    params.append("mimeType", file.type);
    params.append("base64Data", base64Data);
    params.append("folderId", "1stVz__roPfr5SBqKqfU_GPlxjJkYmsey");

    console.log("Sending upload request...");
    
    // IMPORTANT: Add timeout and error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout

    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      signal: controller.signal,
      redirect: 'follow'
    });

    clearTimeout(timeoutId);

    console.log("Response status:", response.status);
    
    const responseText = await response.text();
    console.log("Raw response text (first 500 chars):", responseText.substring(0, 500));

    let result;
    try {
      result = JSON.parse(responseText);
      console.log("Parsed response:", result);
    } catch (parseError) {
      console.error("Failed to parse response as JSON:", parseError);
      console.error("Full response:", responseText);
      throw new Error(`Server returned invalid response. Status: ${response.status}. Response: ${responseText.substring(0, 200)}`);
    }

    if (!result.success) {
      // Provide more specific error messages
      if (result.error && result.error.includes("exceeded")) {
        throw new Error("File too large for Google Apps Script. Try a smaller file.");
      }
      if (result.error && result.error.includes("folder")) {
        throw new Error("Drive folder access error. Check folder ID and permissions.");
      }
      throw new Error(result.message || result.error || `Upload failed: ${JSON.stringify(result)}`);
    }

    if (!result.fileUrl) {
      throw new Error("Server didn't return a file URL");
    }

    toast.success("File Uploaded!", { 
      id: "upload-toast", 
      description: `${file.name} (${(file.size/1024/1024).toFixed(2)}MB) uploaded successfully.` 
    });
    
    console.log("Upload successful, URL:", result.fileUrl);
    return result.fileUrl;
    
  } catch (error) {
    console.error("Error uploading file to Google Drive:", error);
    
    let errorMessage = error.message || "Failed to upload file";
    if (error.name === 'AbortError') {
      errorMessage = "Upload timeout. File might be too large or network is slow.";
    }
    
    toast.error("Upload Failed", { 
      id: "upload-toast", 
      description: errorMessage
    });
    throw error;
  }
};


  const updateGoogleSheet = async (dataToUpdate, currentHaveToPO) => {
    toast.loading("Updating Google Sheet...", { id: "sheet-update-toast" });
    try {
        if (!selectedIndent || selectedIndent._rowIndex === undefined) {
            throw new Error("Selected indent details are missing for update.");
        }

        const now = new Date();
        const timestamp = now.toLocaleString("en-GB", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
        }).replace(/,/g, "");

        const cellUpdates = {
            [`col${COL_PO_TIMESTAMP + 1}`]: timestamp,
            [`col${COL_HAVE_TO_PO + 1}`]: currentHaveToPO
        };

        if (currentHaveToPO === "yes") {
          cellUpdates[`col${COL_VENDOR_NAME_PO + 1}`] = dataToUpdate.vendorName; // Add this line
            cellUpdates[`col${COL_RATE + 1}`] = dataToUpdate.rate;
            cellUpdates[`col${COL_LEAD_TIME + 1}`] = dataToUpdate.leadTimeToLift;
            cellUpdates[`col${COL_TOTAL_QTY + 1}`] = dataToUpdate.totalQty;
            cellUpdates[`col${COL_TOTAL_AMOUNT + 1}`] = dataToUpdate.totalAmount;
            if (dataToUpdate.poFileUrl) {
                cellUpdates[`col${COL_PO_FILE_URL + 1}`] = dataToUpdate.poFileUrl;
            }
            cellUpdates[`col${COL_ADVANCE_TO_BE_PAID + 1}`] = dataToUpdate.advanceToBePaid;
            if (dataToUpdate.advanceToBePaid === "yes") {
                cellUpdates[`col${COL_TO_BE_PAID_AMOUNT + 1}`] = dataToUpdate.toBePaidAmount;
                cellUpdates[`col${COL_WHEN_TO_BE_PAID + 1}`] = dataToUpdate.whenToBePaid;
            } else {
                cellUpdates[`col${COL_TO_BE_PAID_AMOUNT + 1}`] = "";
                cellUpdates[`col${COL_WHEN_TO_BE_PAID + 1}`] = "";
            }
            cellUpdates[`col${COL_NOTES + 1}`] = dataToUpdate.notes;
            cellUpdates[`col${COL_ALUMINA + 1}`] = dataToUpdate.alumina;
            cellUpdates[`col${COL_IRON + 1}`] = dataToUpdate.iron;
        } else { // if haveToPO is "no", clear all PO related fields
            const fieldsToClear = [
                COL_RATE, COL_LEAD_TIME, COL_TOTAL_QTY, COL_TOTAL_AMOUNT,
                COL_PO_FILE_URL, COL_ADVANCE_TO_BE_PAID, COL_TO_BE_PAID_AMOUNT,
                COL_WHEN_TO_BE_PAID, COL_NOTES, COL_ALUMINA, COL_IRON
            ];
            fieldsToClear.forEach(colIndex => {
                cellUpdates[`col${colIndex + 1}`] = "";
            });
        }

        const params = new URLSearchParams({
            action: "updateCells",
            sheetName: INDENT_PO_SHEET,
            rowIndex: selectedIndent._rowIndex.toString(),
            cellUpdates: JSON.stringify(cellUpdates)
        });

        const response = await fetch(SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString(),
        });
        
        const responseText = await response.text();
        if (!response.ok && !responseText.toLowerCase().includes("success")) {
            throw new Error(`Failed to update sheet: ${response.status} - ${responseText}`);
        }
        
        toast.success("Sheet Updated!", { id: "sheet-update-toast", description: `Indent ID ${selectedIndent.id} processed.` });

    } catch (error) {
        console.error("Error updating Google Sheet:", error);
        toast.error("Sheet Update Failed", { id: "sheet-update-toast", description: error.message });
        throw error;
    }
  };

  const handleHaveToPOChange = (value) => {
    setHaveToPO(value);
    if (value !== "yes") {
      setFormData((prev) => ({
        ...prev,
        vendorName: selectedIndent?.vendorName || "",
        rate: "",
        leadTimeToLift: "",
        totalQty: selectedIndent?.approvedQty || "",
        totalAmount: "",
        advanceToBePaid: "",
        toBePaidAmount: "",
        whenToBePaid: "",
        notes: "",
        poFile: null,
        alumina: "",
        iron: "",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        vendorName: selectedIndent?.vendorName || "",
        totalQty: selectedIndent?.approvedQty || "",
      }));
    }
    setPoErrors({});
  };

  const handleIndentSelect = (indent) => {
    setSelectedIndent(indent);
    setFormData({
      indentId: indent.id,
      vendorName: indent.vendorName,
      quantity: indent.approvedQty,
      rate: "",
      leadTimeToLift: "",
      totalQty: indent.approvedQty,
      totalAmount: "",
      advanceToBePaid: "",
      toBePaidAmount: "",
      whenToBePaid: "",
      notes: "",
      poFile: null,
      alumina: "",
      iron: "",
    });
    setPoErrors({});
    setHaveToPO("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setPoErrors({});
    setHaveToPO("");
    setSelectedIndent(null);
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
      alumina: "",
      iron: "",
    });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!haveToPO) {
    toast.error("Selection Required", { description: "Please select if you need to generate a PO (Yes/No)." });
    setPoErrors(prev => ({ ...prev, haveToPO: "This selection is mandatory." }));
    return;
  }

  if (haveToPO === "yes" && !validatePoForm()) {
    toast.error("Validation Error", { description: "Please fill all required PO fields." });
    return;
  }
  if (!selectedIndent) {
    toast.error("Selection Error", { description: "No indent selected." });
    return;
  }

  setIsSubmitting(true);
  toast.loading("Initiating PO process...", { id: "po-submit" });

  try {
    let fileUrl = "";
    
    // Only upload file if "yes" and file is provided
    if (haveToPO === "yes" && formData.poFile) {
      console.log("Starting file upload...");
      try {
        fileUrl = await uploadFileToDrive(formData.poFile);
        console.log("File upload result:", fileUrl);
        
        if (!fileUrl) {
          console.warn("File upload returned empty URL, continuing without file");
        }
      } catch (uploadError) {
        console.error("File upload failed:", uploadError);
        // Continue without file - don't show warning toast here
        fileUrl = "";
      }
    }

    const dataToSubmit = {
      ...formData,
      poFileUrl: fileUrl,
    };

    await updateGoogleSheet(dataToSubmit, haveToPO);

    toast.success("PO Processed", {
      id: "po-submit",
      description: `Purchase Order for ${selectedIndent.id} has been created successfully.`
    });
    setRefreshTrigger(prev => prev + 1);
    closeModal();
  } catch (error) {
    console.error("Error submitting form:", error);
    toast.error("Submission Failed", { 
      id: "po-submit", 
      description: error.message || "An unexpected error occurred." 
    });
  } finally {
    setIsSubmitting(false);
  }
};



  const validatePoForm = () => {
    const newErrors = {};
    if (haveToPO === "yes") {
      if (!formData.vendorName.trim()) newErrors.vendorName = "Vendor name is required."; // Add this line
      if (!formData.rate || parseFloat(formData.rate) <= 0) newErrors.rate = "Rate must be a positive number.";
      if (!formData.leadTimeToLift || parseInt(formData.leadTimeToLift) <= 0) newErrors.leadTimeToLift = "Lead Time must be a positive number.";
      if (!formData.totalQty || parseFloat(formData.totalQty) <= 0) newErrors.totalQty = "Total Quantity must be a positive number.";
      if (!formData.alumina || parseFloat(formData.alumina) < 0) newErrors.alumina = "Alumina % is required and must be non-negative.";
      if (!formData.iron || parseFloat(formData.iron) < 0) newErrors.iron = "Iron % is required and must be non-negative.";
      if (!formData.advanceToBePaid) newErrors.advanceToBePaid = "Advance option is required.";
      if (formData.advanceToBePaid === "yes") {
        if (!formData.toBePaidAmount || parseFloat(formData.toBePaidAmount) <= 0) newErrors.toBePaidAmount = "Advance amount must be a positive number.";
        if (!formData.whenToBePaid) newErrors.whenToBePaid = "Payment date is required.";
      }
    }
    setPoErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
    setFilters({
      vendorName: "all",
      rawMaterialName: "all",
      firmName: "all"
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
    // When selecting for payment, pre-fill with existing (or empty) values from the item
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
    setPaymentFormData(prev => ({ ...prev, [name]: value }));
    if (paymentFormErrors[name]) setPaymentFormErrors(prev => ({ ...prev, [name]: null }));
  };

  const validatePaymentForm = () => {
    const newErrors = {};
    if (!paymentFormData.amount || isNaN(paymentFormData.amount) || parseFloat(paymentFormData.amount) <= 0)
      newErrors.amount = "A valid positive amount is required.";
    if (!paymentFormData.paymentDate)
      newErrors.paymentDate = "Payment date is required.";
    setPaymentFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!validatePaymentForm() || !selectedPaymentIndent) {
      toast.error("Validation Error", { description: "Please fill all required payment fields." });
      return;
    }
    setIsSubmittingPayment(true);
    toast.loading("Recording payment...", { id: "payment-submit" });
    try {
      const updatedRowData = [...selectedPaymentIndent.rawCells];
      updatedRowData[COL_TO_BE_PAID_AMOUNT] = paymentFormData.amount;
      updatedRowData[COL_WHEN_TO_BE_PAID] = paymentFormData.paymentDate;

      const payload = new URLSearchParams({
        action: "update",
        sheetName: INDENT_PO_SHEET,
        rowIndex: selectedPaymentIndent._rowIndex,
        rowData: JSON.stringify(updatedRowData),
      });

      const response = await fetch(SCRIPT_URL, { method: "POST", body: payload });
      if (!response.ok) {
        throw new Error(`Failed to update sheet: ${await response.text()}`);
      }
      const result = await response.json();
      if (!result.success)
        throw new Error(result.message || "Apps Script update failed.");

      toast.success("Payment Recorded!", {
        id: "payment-submit",
        description: `Advance payment for Indent ID ${selectedPaymentIndent.indentId} recorded.`
      });
      setRefreshTrigger(p => p + 1);
      handleClosePaymentPopup();
    } catch (error) {
      console.error("Error submitting payment:", error);
      toast.error("Submission Failed", { id: "payment-submit", description: error.message });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const filteredIndents = useMemo(() => {
    return indents.filter(item => {
      const matchesVendor = filters.vendorName === 'all' || item.vendorName === filters.vendorName;
      const matchesMaterial = filters.rawMaterialName === 'all' || item.rawMaterialName === filters.rawMaterialName;
      const matchesFirm = filters.firmName === 'all' || item.firmName === filters.firmName;
      return matchesVendor && matchesMaterial && matchesFirm;
    });
  }, [indents, filters]);

  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter(item => {
      const matchesVendor = filters.vendorName === 'all' || item.vendorName === filters.vendorName;
      const matchesMaterial = filters.rawMaterialName === 'all' || item.rawMaterialName === filters.rawMaterialName;
      const matchesFirm = filters.firmName === 'all' || item.firmName === filters.firmName;
      return matchesVendor && matchesMaterial && matchesFirm;
    });
  }, [purchaseOrders, filters]);

  const filteredPaymentIndents = useMemo(() => {
    return indentData.filter(item => {
      const matchesVendor = filters.vendorName === 'all' || item.vendorName === filters.vendorName;
      const matchesFirm = filters.firmName === 'all' || item.firmName === filters.firmName;
      return matchesVendor && matchesFirm;
    });
  }, [indentData, filters]);

  const getTableColumns = useCallback((tab) => {
    if (tab === "approve") return allIndentColumnsMeta.filter(col => visibleIndentColumns[col.dataKey]);
    if (tab === "history") return allPoColumnsMeta.filter(col => visiblePoColumns[col.dataKey]);
    if (tab === "advancePayment") return ADVANCE_PAYMENT_COLUMNS_META.filter(col => visiblePaymentColumns[col.dataKey] && col.dataKey !== 'actionColumn');
    return [];
  }, [allIndentColumnsMeta, visibleIndentColumns, allPoColumnsMeta, visiblePoColumns, ADVANCE_PAYMENT_COLUMNS_META, visiblePaymentColumns]);


  const renderTableSection = useCallback((tabKey, title, description, data, columnsMeta, visibilityState, isLoading, hasError, errorMessage) => {
    const visibleCols = columnsMeta.filter((col) =>
      visibilityState[col.dataKey] && !(tabKey === "advancePayment" && col.dataKey === 'actionColumn')
    );

    const renderCellContent = (item, column) => {
      let value = item[column.dataKey];
      const displayValue = (value === null || value === undefined || value === "") ? <span className="text-gray-400 text-xs">N/A</span> : value;

      if (tabKey === "advancePayment" && column.dataKey === "paymentStatus") {
        const isPaymentComplete = item.paymentStatus === "Paid";
        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`px-2 py-0.5 text-xs ${isPaymentComplete ? "bg-green-100 text-green-700 border-green-200" : "bg-yellow-100 text-yellow-700 border-yellow-200"}`}>
              {isPaymentComplete ? "Paid" : "Pending"}
            </Badge>
            {!isPaymentComplete && (
              <Button
                onClick={() => handlePaymentSelect(item)}
                size="sm"
                variant="outline"
                className="h-7 px-2.5 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200"
              >
                Record Payment
              </Button>
            )}
          </div>
        );
      }
      
      if (column.dataKey === "actionColumn") {
        if (tabKey === "approve") {
          return <Button onClick={() => handleIndentSelect(item)} size="sm" className="h-7 px-2.5 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold">Generate PO</Button>;
        }
        return null;
      }

      if (column.dataKey === "totalAmount" || column.dataKey === "toBePaidAmount") {
        return displayValue !== "N/A" ? `₹${Number(value).toLocaleString()}` : displayValue;
      }
      if (column.isLink) {
        return value ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline inline-flex items-center text-xs">
            <LinkIcon className="h-3 w-3 mr-1" /> {column.linkText || "View"}
          </a>
        ) : (
          <span className="text-gray-400 text-xs">N/A</span>
        );
      }
      if (column.dataKey === 'id' || column.dataKey === 'indentId') {
        return <span className="font-semibold text-purple-600">{displayValue}</span>;
      }
      return displayValue;
    };

    return (
      <Card className="shadow-sm border border-border flex-1 flex flex-col">
        <CardHeader className="py-3 px-4 bg-muted/30">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center text-md font-semibold text-foreground">
                {tabKey === "approve" && <File className="h-5 w-5 text-purple-600 mr-2" />}
                {tabKey === "history" && <History className="h-5 w-5 text-purple-600 mr-2" />}
                {tabKey === "advancePayment" && <Wallet className="h-5 w-5 text-purple-600 mr-2" />}
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
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto text-xs"
                      onClick={() => handleSelectAllColumns(tabKey === "approve" ? "indent" : tabKey === "history" ? "po" : "payment", columnsMeta, true)}
                    >
                      Select All
                    </Button>
                    <span className="text-gray-300 mx-1">|</span>
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto text-xs"
                      onClick={() => handleSelectAllColumns(tabKey === "approve" ? "indent" : tabKey === "history" ? "po" : "payment", columnsMeta, false)}
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
                            onCheckedChange={(checked) => handleToggleColumn(tabKey === "approve" ? "indent" : tabKey === "history" ? "po" : "payment", col.dataKey, Boolean(checked))}
                            disabled={col.alwaysVisible || (tabKey === "advancePayment" && col.dataKey === 'actionColumn')} // Disable if it's the action column on advance payment
                          />
                          <Label
                            htmlFor={`toggle-${tabKey}-${col.dataKey}`}
                            className="text-xs font-normal cursor-pointer"
                          >
                            {col.header}{" "}
                            {col.alwaysVisible && <span className="text-gray-400 ml-0.5 text-xs">(Fixed)</span>}
                            {tabKey === "advancePayment" && col.dataKey === 'actionColumn' && <span className="text-gray-400 ml-0.5 text-xs">(Removed)</span>}
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
          {isLoading ? (
            <div className="flex flex-col justify-center items-center py-10 flex-1">
              <Loader2 className="h-8 w-8 text-purple-600 animate-spin mb-3" />
              <p className="text-muted-foreground ml-2">Loading...</p>
            </div>
          ) : hasError ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-destructive-foreground bg-destructive/10 rounded-lg mx-4 my-4 text-center flex-1">
              <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
              <p className="font-medium text-destructive">Error Loading Data</p>
              <p className="text-sm text-muted-foreground max-w-md">{errorMessage}</p>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-purple-200/50 bg-purple-50/50 rounded-lg mx-4 my-4 text-center flex-1">
              <Info className="h-12 w-12 text-purple-500 mb-3" />
              <p className="font-medium text-foreground">No Data Found</p>
              <p className="text-sm text-muted-foreground text-center">
                {tabKey === "approve" && "No approved indents found for PO generation."}
                {tabKey === "history" && "No purchase orders have been generated yet."}
                {tabKey === "advancePayment" && "No items require advance payment."}
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
                    {visibleCols.map((col) => (
                      <TableHead key={col.dataKey} className="whitespace-nowrap text-xs px-3 py-2">
                        {col.header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item) => (
                    <TableRow key={item._id} className="hover:bg-purple-50/50">
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
        </CardContent>
      </Card>
    );
  }, [handleIndentSelect, handlePaymentSelect, handleToggleColumn, handleSelectAllColumns]);

  return (
    <div className="space-y-4 p-4 md:p-6 bg-slate-50 min-h-screen">
      <Card className="shadow-md border-none">
        <CardHeader className="p-4 border-b border-gray-200">
          <CardTitle className="flex items-center gap-2 text-gray-700 text-lg">
            <FileCheck className="h-5 w-5 text-purple-600" /> Purchase Management
          </CardTitle>
          <CardDescription className="text-gray-500 text-sm">
            Manage approved indents, generate purchase orders, and record advance payments.
            {user?.firmName && user.firmName.toLowerCase() !== "all" && (
              <span className="ml-2 text-purple-600 font-medium">• Filtered by: {user.firmName}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full sm:w-[580px] grid-cols-3 mb-4">
              <TabsTrigger value="approve" className="flex items-center gap-2">
                <File className="h-4 w-4" /> Approve Indents
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">
                  {filteredIndents.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" /> PO History
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">
                  {filteredPOs.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="advancePayment" className="flex items-center gap-2">
                <Wallet className="h-4 w-4" /> Advance Payment
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">
                  {filteredPaymentIndents.length}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Select value={filters.vendorName} onValueChange={(value) => handleFilterChange("vendorName", value)}>
                  <SelectTrigger className="h-9 bg-white">
                    <SelectValue placeholder="All Vendors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vendors</SelectItem>
                    {vendorOptions.map((vendor) => (
                      <SelectItem key={vendor} value={vendor}>
                        {vendor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {activeTab !== "advancePayment" && (
                  <Select value={filters.rawMaterialName} onValueChange={(value) => handleFilterChange("rawMaterialName", value)}>
                    <SelectTrigger className="h-9 bg-white">
                      <SelectValue placeholder="All Materials" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Materials</SelectItem>
                      {materialOptions.map((material) => (
                        <SelectItem key={material} value={material}>
                          {material}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Select value={filters.firmName} onValueChange={(value) => handleFilterChange("firmName", value)}>
                  <SelectTrigger className="h-9 bg-white">
                    <SelectValue placeholder="All Firms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Firms</SelectItem>
                    {firmOptions.map((firm) => (
                      <SelectItem key={firm} value={firm}>
                        {firm}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <TabsContent value="approve" className="flex-1 flex flex-col mt-0">
              {renderTableSection(
                "approve",
                "Approved Indents (Ready for PO)",
                "Select an indent to generate its purchase order.",
                filteredIndents,
                allIndentColumnsMeta,
                visibleIndentColumns,
                loading,
                !!error,
                error
              )}
            </TabsContent>
            <TabsContent value="history" className="flex-1 flex flex-col mt-0">
              {renderTableSection(
                "history",
                "Purchase Order History",
                "View all generated purchase orders.",
                filteredPOs,
                allPoColumnsMeta,
                visiblePoColumns,
                loading,
                !!error,
                error
              )}
            </TabsContent>
            <TabsContent value="advancePayment" className="flex-1 flex flex-col mt-0">
              {renderTableSection(
                "advancePayment",
                "Advance Payments Needed",
                "Record advance payments for approved indents.",
                filteredPaymentIndents, 
                ADVANCE_PAYMENT_COLUMNS_META,
                visiblePaymentColumns,
                paymentLoading,
                !!paymentError,
                paymentError
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      {isModalOpen && (
        <Dialog open={isModalOpen} onOpenChange={closeModal}>
          <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b pb-4 mb-4">
              <DialogTitle className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                <FileCheck className="h-6 w-6 text-purple-600 mr-3" /> Generate PO for Indent ID:{" "}
                <span className="font-bold text-purple-600 ml-1">{selectedIndent?.id}</span>
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-gray-500">
                Vendor: {selectedIndent?.vendorName || "N/A"} | Material: {selectedIndent?.rawMaterialName || "N/A"}
              </DialogDescription>
            </DialogHeader>
            <div className="px-0 py-2 sm:px-0">
              <div className="mb-6">
                <Label htmlFor="haveToPO" className="block text-sm font-medium text-gray-700 mb-2">
                  Generate PO for this Indent?<span className="text-red-500">*</span>
                </Label>
                <Select
                  onValueChange={handleHaveToPOChange}
                  value={haveToPO}
                >
                  <SelectTrigger className={`w-full rounded-md shadow-sm sm:text-sm ${!haveToPO && poErrors.haveToPO ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 focus:border-purple-500 focus:ring-purple-500"}`}>
                    <SelectValue placeholder="-- Select an option --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
                {poErrors.haveToPO && <p className="mt-1 text-xs text-red-500">{poErrors.haveToPO}</p>}
              </div>
              {haveToPO === "yes" && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <Label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Indent Quantity</Label>
                      <Input
                        type="text"
                        id="quantity"
                        name="quantity"
                        value={selectedIndent?.approvedQty || ""}
                        readOnly
                        className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm sm:text-sm"
                      />
                    </div>
                    <div>
  <Label htmlFor="vendorName" className="block text-sm font-medium text-gray-700">Vendor Name <span className="text-red-500">*</span></Label>
  <Select
    onValueChange={(value) => handleInputChange({ target: { name: "vendorName", value } })}
    value={formData.vendorName}
  >
    <SelectTrigger className={`mt-1 w-full rounded-md shadow-sm sm:text-sm ${poErrors.vendorName ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 focus:border-purple-500 focus:ring-purple-500"}`}>
      <SelectValue placeholder="Select vendor name" />
    </SelectTrigger>
    <SelectContent>
      {vendorOptions.map((vendor, index) => (
        <SelectItem key={`vendor-${index}`} value={vendor}>
          {vendor}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
  {poErrors.vendorName && <p className="text-red-500 text-xs mt-1">{poErrors.vendorName}</p>}
</div>
                    <div>
                      <Label htmlFor="totalQty" className="block text-sm font-medium text-gray-700">PO Total Quantity</Label>
                      <Input
                        type="number"
                        step="any"
                        id="totalQty"
                        name="totalQty"
                        value={formData.totalQty}
                        onChange={handleInputChange}
                        placeholder="PO Total Quantity"
                        className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${poErrors.totalQty ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 focus:border-purple-500 focus:ring-purple-500"}`}
                      />
                      {poErrors.totalQty && <p className="text-red-500 text-xs mt-1">{poErrors.totalQty}</p>}
                    </div>
                    <div>
                      <Label htmlFor="rate" className="block text-sm font-medium text-gray-700">Rate <span className="text-red-500">*</span></Label>
                      <Input
                        type="number"
                        step="any"
                        id="rate"
                        name="rate"
                        value={formData.rate}
                        onChange={handleInputChange}
                        placeholder="Rate"
                        className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${poErrors.rate ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 focus:border-purple-500 focus:ring-purple-500"}`}
                      />
                      {poErrors.rate && <p className="text-red-500 text-xs mt-1">{poErrors.rate}</p>}
                    </div>
                    <div>
                      <Label htmlFor="totalAmount" className="block text-sm font-medium text-gray-700">Total Amount</Label>
                      <Input
                        type="text"
                        id="totalAmount"
                        name="totalAmount"
                        value={formData.totalAmount}
                        readOnly
                        className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm sm:text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="leadTimeToLift" className="block text-sm font-medium text-gray-700">Lead Time (Days) <span className="text-red-500">*</span></Label>
                      <Input
                        type="number"
                        id="leadTimeToLift"
                        name="leadTimeToLift"
                        value={formData.leadTimeToLift}
                        onChange={handleInputChange}
                        placeholder="Lead Time To Lift"
                        className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${poErrors.leadTimeToLift ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 focus:border-purple-500 focus:ring-purple-500"}`}
                      />
                      {poErrors.leadTimeToLift && <p className="text-red-500 text-xs mt-1">{poErrors.leadTimeToLift}</p>}
                    </div>
                    <div>
                      <Label htmlFor="alumina" className="block text-sm font-medium text-gray-700">Alumina % <span className="text-red-500">*</span></Label>
                      <Input
                        type="number"
                        step="any"
                        id="alumina"
                        name="alumina"
                        value={formData.alumina}
                        onChange={handleInputChange}
                        placeholder="Alumina %"
                        className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${poErrors.alumina ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 focus:border-purple-500 focus:ring-purple-500"}`}
                      />
                      {poErrors.alumina && <p className="text-red-500 text-xs mt-1">{poErrors.alumina}</p>}
                    </div>
                    <div>
                      <Label htmlFor="iron" className="block text-sm font-medium text-gray-700">Iron % <span className="text-red-500">*</span></Label>
                      <Input
                        type="number"
                        step="any"
                        id="iron"
                        name="iron"
                        value={formData.iron}
                        onChange={handleInputChange}
                        placeholder="Iron %"
                        className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${poErrors.iron ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 focus:border-purple-500 focus:ring-purple-500"}`}
                      />
                      {poErrors.iron && <p className="text-red-500 text-xs mt-1">{poErrors.iron}</p>}
                    </div>
                    <div className="md:col-span-1">
                      <Label htmlFor="poFile" className="block text-sm font-medium text-gray-700">Upload PO Copy</Label>
                      <div className="relative flex items-center justify-center h-10 border border-dashed border-purple-200 rounded-md bg-purple-50 cursor-pointer hover:bg-purple-100 mt-1">
                        <Input
                          type="file"
                          id="poFile"
                          name="poFile"
                          onChange={handleFileUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        />
                        <Upload className="h-4 w-4 text-purple-500 mr-2" />
                        <span className="text-xs text-purple-600 truncate max-w-[calc(100%-30px)]">
                          {formData.poFile ? formData.poFile.name : "Upload PO Copy"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="advanceToBePaid" className="block text-sm font-medium text-gray-700">Advance To Be Paid? <span className="text-red-500">*</span></Label>
                      <Select
                        onValueChange={(value) =>
                          handleInputChange({
                            target: { name: "advanceToBePaid", value },
                          })
                        }
                        value={formData.advanceToBePaid}
                      >
                        <SelectTrigger className={`mt-1 w-full rounded-md shadow-sm sm:text-sm ${poErrors.advanceToBePaid ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 focus:border-purple-500 focus:ring-purple-500"}`}>
                          <SelectValue placeholder="-- Select --" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                      {poErrors.advanceToBePaid && (
                        <p className="text-red-500 text-xs mt-1">{poErrors.advanceToBePaid}</p>
                      )}
                    </div>
                    {formData.advanceToBePaid === "yes" && (
                      <>
                        <div>
                          <Label htmlFor="toBePaidAmount" className="block text-sm font-medium text-gray-700">Advance Amount <span className="text-red-500">*</span></Label>
                          <Input
                            type="number"
                            step="any"
                            id="toBePaidAmount"
                            name="toBePaidAmount"
                            value={formData.toBePaidAmount}
                            onChange={handleInputChange}
                            placeholder="To Be Paid Amount"
                            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${poErrors.toBePaidAmount ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 focus:border-purple-500 focus:ring-purple-500"}`}
                          />
                          {poErrors.toBePaidAmount && (
                            <p className="text-red-500 text-xs mt-1">{poErrors.toBePaidAmount}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="whenToBePaid" className="block text-sm font-medium text-gray-700">When To Be Paid <span className="text-red-500">*</span></Label>
                          <Input
                            type="date"
                            id="whenToBePaid"
                            name="whenToBePaid"
                            value={formData.whenToBePaid}
                            onChange={handleInputChange}
                            placeholder="Payment Date"
                            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${poErrors.whenToBePaid ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 focus:border-purple-500 focus:ring-purple-500"}`}
                          />
                          {poErrors.whenToBePaid && (
                            <p className="text-red-500 text-xs mt-1">{poErrors.whenToBePaid}</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="notes" className="block text-sm font-medium text-gray-700">PO Notes/Remarks</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      rows={3}
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Notes"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                  <DialogFooter className="pt-5 sm:pt-6 flex flex-col sm:flex-row-reverse gap-3 sm:gap-0 sm:justify-start">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className={`w-full sm:w-auto inline-flex justify-center py-2.5 px-6 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white ${isSubmitting ? "bg-purple-400 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"}`}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin my-0.5" /> Submitting...
                        </>
                      ) : (
                        "Submit PO"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeModal}
                      className="w-full sm:w-auto inline-flex justify-center py-2.5 px-6 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 sm:mr-3"
                    >
                      Cancel
                    </Button>
                  </DialogFooter>
                </form>
              )}
              {haveToPO === "no" && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <p className="text-sm text-gray-600">
                    You've selected not to generate a PO for this indent. Clicking submit will mark this indent as processed without PO details.
                  </p>
                  <DialogFooter className="pt-5 sm:pt-6 flex flex-col sm:flex-row-reverse gap-3 sm:gap-0 sm:justify-start">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className={`w-full sm:w-auto inline-flex justify-center py-2.5 px-6 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white ${isSubmitting ? "bg-purple-400 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"}`}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin my-0.5" /> Submitting...
                        </>
                      ) : (
                        "Submit as No PO"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeModal}
                      className="w-full sm:w-auto inline-flex justify-center py-2.5 px-6 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 sm:mr-3"
                    >
                      Cancel
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={showPaymentPopup} onOpenChange={handleClosePaymentPopup}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4 mb-4">
            <DialogTitle className="text-lg leading-6 font-medium text-gray-900 flex items-center">
              <Wallet className="h-6 w-6 text-purple-600 mr-3" /> Record Advance Payment
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-gray-500">
              For Indent ID: <span className="font-bold text-purple-600">{selectedPaymentIndent?.indentId || "N/A"}</span> | Vendor: <span className="font-bold text-purple-600">{selectedPaymentIndent?.vendorName || "N/A"}</span>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4 py-2 px-0">
            <div>
              <Label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount to be Paid <span className="text-red-500">*</span></Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="any"
                value={paymentFormData.amount}
                onChange={handlePaymentInputChange}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${paymentFormErrors.amount ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 focus:border-purple-500 focus:ring-purple-500"}`}
              />
              {paymentFormErrors.amount && <p className="text-red-500 text-xs mt-1">{paymentFormErrors.amount}</p>}
            </div>
            <div>
              <Label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700">Payment Date <span className="text-red-500">*</span></Label>
              <Input
                id="paymentDate"
                name="paymentDate"
                type="date"
                value={paymentFormData.paymentDate}
                onChange={handlePaymentInputChange}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${paymentFormErrors.paymentDate ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 focus:border-purple-500 focus:ring-purple-500"}`}
              />
              {paymentFormErrors.paymentDate && <p className="text-red-500 text-xs mt-1">{paymentFormErrors.paymentDate}</p>}
            </div>
            <DialogFooter className="pt-5 sm:pt-6 flex flex-col sm:flex-row-reverse gap-3 sm:gap-0 sm:justify-start">
              <Button type="submit" disabled={isSubmittingPayment} className={`w-full sm:w-auto inline-flex justify-center py-2.5 px-6 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white ${isSubmittingPayment ? "bg-purple-400 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"}`}>
                {isSubmittingPayment ? <><Loader2 className="mr-2 h-4 w-4 animate-spin my-0.5"/>Processing...</> : "Submit Payment"}
              </Button>
              <Button type="button" variant="outline" onClick={handleClosePaymentPopup} className="w-full sm:w-auto inline-flex justify-center py-2.5 px-6 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 sm:mr-3">Cancel</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GeneratePurchaseOrder;