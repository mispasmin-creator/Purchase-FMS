"use client";

import { useState, useEffect, useCallback, useContext, useMemo } from "react";
import { 
  Loader2, 
  AlertTriangle, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Calendar, 
  User, 
  Package, 
  Truck, 
  Filter,
  ChevronsUpDown,
  Edit,
  Save,
  X,
  Clock,
  History
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AuthContext } from "../context/AuthContext";
import { toast } from "sonner";

// Constants
const SHEET_ID = "13_sHCFkVxAzPbel-k9BuUBFY-E11vdKJAOgvzhBMLMY";
const MISMATCH_SHEET = "Mismatch";
const API_URL = "https://script.google.com/macros/s/AKfycbylQZLstOi0LyDisD6Z6KKC97pU5YJY2dDYVw2gtnW1fxZq9kz7wHBei4aZ8Ed-XKhKEA/exec";

// Column configuration
const DEBIT_NOTE_COLUMNS_META = [
  { header: "Actions", dataKey: "actions", toggleable: false, alwaysVisible: true },
  { header: "Timestamp", dataKey: "timestamp", toggleable: true, alwaysVisible: true },
  { header: "Lift ID", dataKey: "liftId", toggleable: true, alwaysVisible: true },
  { header: "Indent Number", dataKey: "indentNo", toggleable: true, alwaysVisible: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "Party Name", dataKey: "partyName", toggleable: true },
  { header: "Product Name", dataKey: "productName", toggleable: true },
  { header: "Transporter Name", dataKey: "transporterName", toggleable: true },
  { header: "Status", dataKey: "status", toggleable: true },
  { header: "Remarks", dataKey: "remarks", toggleable: true },
  { header: "Planned", dataKey: "planned", toggleable: true },
];

// Searchable Select Component
const SearchableSelect = ({ 
  value, 
  onValueChange, 
  options, 
  placeholder, 
  className 
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
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
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
      
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          <div className="sticky top-0 bg-white p-2 border-b">
            <Input
              type="text"
              placeholder={`Search ${placeholder.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-7 text-xs"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="py-1">
            <div
              className={`px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 ${value === "all" ? "bg-blue-50" : ""}`}
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
                className={`px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 ${value === option ? "bg-blue-50" : ""}`}
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
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
};

export default function DebitNote() {
  const { user } = useContext(AuthContext);
  const [mismatchData, setMismatchData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const [filters, setFilters] = useState({
    firmName: "all",
    partyName: "all",
    productName: "all",
    transporterName: "all",
    status: "all"
  });

  // Format timestamp function
  const formatTimestamp = (timestampStr) => {
    if (!timestampStr || typeof timestampStr !== "string") {
      return "N/A";
    }
    
    // Check if it's a Google Sheets Date() format
    const numbers = timestampStr.match(/\d+/g);
    if (numbers && numbers.length >= 6) {
      const date = new Date(
        parseInt(numbers[0]), // Year
        parseInt(numbers[1]) - 1, // Month (0-based)
        parseInt(numbers[2]), // Day
        parseInt(numbers[3]), // Hours
        parseInt(numbers[4]), // Minutes
        parseInt(numbers[5]), // Seconds
      );
      if (!isNaN(date.getTime())) {
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
    }
    
    // Try to parse as regular date
    try {
      const d = new Date(timestampStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });
      }
    } catch (e) {
      // Ignore parse error
    }
    
    return timestampStr;
  };

  // Check if timestamp is valid (not N/A)
  const isValidTimestamp = (timestamp) => {
    return timestamp && timestamp !== "N/A" && timestamp.trim() !== "";
  };

  // Categorize data into pending and history
  const categorizeData = useCallback((data) => {
    const pending = [];
    const history = [];
    
    data.forEach(item => {
      const hasPlanned = isValidTimestamp(item.planned);
      const hasActual = isValidTimestamp(item.actual);
      
      if (hasPlanned && !hasActual) {
        pending.push(item);
      } else if (hasPlanned && hasActual) {
        history.push(item);
      } else {
        // Items without planned timestamp go to pending as well
        pending.push(item);
      }
    });
    
    return { pending, history };
  }, []);

  // Fetch data from Mismatch sheet
  const fetchMismatchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        MISMATCH_SHEET,
      )}&cb=${new Date().getTime()}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch Mismatch data: ${response.status} ${response.statusText}`);
      }
      
      let text = await response.text();
      
      // Parse Google Visualization response
      if (text.startsWith("google.visualization.Query.setResponse(")) {
        text = text.substring(text.indexOf("(") + 1, text.lastIndexOf(")"));
      } else {
        const jsonStart = text.indexOf("{");
        const jsonEnd = text.lastIndexOf("}");
        if (jsonStart === -1 || jsonEnd === -1) {
          throw new Error("Invalid JSON response format from Google Sheets");
        }
        text = text.substring(jsonStart, jsonEnd + 1);
      }

      const data = JSON.parse(text);

      if (data.status === "error") {
        throw new Error(data.errors?.[0]?.detailed_message || "Mismatch Sheet API returned error status.");
      }

      if (!data.table || !data.table.cols) {
        console.warn("Mismatch sheet has no columns or is empty");
        setMismatchData([]);
        setLoading(false);
        return;
      }

      if (!data.table.rows) data.table.rows = [];

      // Process rows
      const processedRows = data.table.rows.map((row, index) => {
        if (!row || !row.c) return null;
        
        const rowData = { _id: index, _rowIndex: index + 2 }; // +2 because header is row 1
        
        // Map all columns from the sheet
        row.c.forEach((cell, cellIndex) => {
          const colId = `col${cellIndex}`;
          const value = cell && cell.v !== undefined && cell.v !== null ? cell.v : "";
          rowData[colId] = value;
          if (cell && cell.f) rowData[`${colId}_formatted`] = cell.f;
        });

        return rowData;
      }).filter(row => row !== null);

      // Filter out empty rows and map to our data structure
      const formattedData = processedRows
        .filter(row => row.col0 || row.col1 || row.col2) // At least one of timestamp, liftId, or indentNo should exist
        .map(row => ({
          id: `MISMATCH-${row._rowIndex}`,
          _rowIndex: row._rowIndex,
          timestamp: formatTimestamp(row.col0_formatted || row.col0 || ""),
          liftId: String(row.col1 || "").trim(),
          indentNo: String(row.col2 || "").trim(),
          firmName: String(row.col3 || "").trim(),
          partyName: String(row.col4 || "").trim(),
          productName: String(row.col5 || "").trim(),
          transporterName: String(row.col6 || "").trim(),
          status: String(row.col7 || "").trim(),
          remarks: String(row.col8 || "").trim(),
          planned: formatTimestamp(row.col9_formatted || row.col9 || ""),
          actual: formatTimestamp(row.col10_formatted || row.col10 || ""),
        }));

      // Filter by user's firm if applicable
      let filteredData = formattedData;
      if (user?.firmName && user.firmName.toLowerCase() !== "all") {
        const userFirmNameLower = user.firmName.toLowerCase();
        filteredData = formattedData.filter(
          (item) => item.firmName && String(item.firmName).toLowerCase() === userFirmNameLower,
        );
      }

      setMismatchData(filteredData);
    } catch (error) {
      console.error("Error fetching Mismatch data:", error);
      setError(`Failed to load Mismatch data: ${error.message}`);
      setMismatchData([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch data on component mount
  useEffect(() => {
    fetchMismatchData();
  }, [fetchMismatchData]);

  // Categorize data
  const { pending, history } = useMemo(() => {
    return categorizeData(mismatchData);
  }, [mismatchData, categorizeData]);

  // Get data for active tab
  const getActiveTabData = useCallback(() => {
    if (activeTab === "pending") {
      return pending;
    } else {
      return history;
    }
  }, [activeTab, pending, history]);

  // Generate filter options based on active tab data
  const uniqueFilterOptions = useMemo(() => {
    const activeData = getActiveTabData();
    const firms = new Set();
    const parties = new Set();
    const products = new Set();
    const transporters = new Set();
    const statuses = new Set();

    activeData.forEach((item) => {
      if (item.firmName) firms.add(item.firmName);
      if (item.partyName) parties.add(item.partyName);
      if (item.productName) products.add(item.productName);
      if (item.transporterName) transporters.add(item.transporterName);
      if (item.status) statuses.add(item.status);
    });

    return {
      firmName: [...firms].sort(),
      partyName: [...parties].sort(),
      productName: [...products].sort(),
      transporterName: [...transporters].sort(),
      status: [...statuses].sort(),
    };
  }, [getActiveTabData]);

  // Apply filters to active tab data
  const filteredData = useMemo(() => {
    let filtered = getActiveTabData();
    
    if (filters.firmName !== "all") {
      filtered = filtered.filter((item) => item.firmName === filters.firmName);
    }
    if (filters.partyName !== "all") {
      filtered = filtered.filter((item) => item.partyName === filters.partyName);
    }
    if (filters.productName !== "all") {
      filtered = filtered.filter((item) => item.productName === filters.productName);
    }
    if (filters.transporterName !== "all") {
      filtered = filtered.filter((item) => item.transporterName === filters.transporterName);
    }
    if (filters.status !== "all") {
      filtered = filtered.filter((item) => item.status === filters.status);
    }
    
    return filtered;
  }, [getActiveTabData, filters]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
    setFilters({
      firmName: "all",
      partyName: "all",
      productName: "all",
      transporterName: "all",
      status: "all",
    });
  };

  // Handle edit click
  const handleEditClick = (item) => {
    setEditingRow(item.id);
    setRemarks(item.remarks || "");
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingRow(null);
    setRemarks("");
  };

  // Submit remarks and update actual timestamp
  const handleSubmitRemarks = async () => {
    if (!editingRow || !remarks.trim()) {
      toast.error("Please enter remarks before submitting");
      return;
    }

    setSubmitting(true);
    
    try {
      // Find the item being edited
      const editingItem = mismatchData.find(item => item.id === editingRow);
      if (!editingItem) {
        throw new Error("Item not found");
      }

      // Generate current timestamp for "Actual" column
      const now = new Date();
      const actualTimestamp = now.toLocaleString("en-GB", { hour12: false }).replace(",", "");

      // Prepare the update data
      // Update remarks (column I, index 8) and actual timestamp (column K, index 10)
      const updateData = {
        action: "updateCells",
        sheetName: "Mismatch",
        rowIndex: editingItem._rowIndex.toString(),
        cellUpdates: JSON.stringify({
          col12: remarks.trim(),  // Remarks column (I) - index 8
          col11: actualTimestamp // Actual column (K) - index 10
        })
      };

      // Send to Google Apps Script
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(updateData).toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || "Failed to update remarks");
      }

      // Update local state
      setMismatchData(prev => prev.map(item => 
        item.id === editingRow 
          ? { 
              ...item, 
              remarks: remarks.trim(),
              actual: actualTimestamp
            }
          : item
      ));

      toast.success(`✅ Remarks submitted successfully for ${editingItem.liftId}!`);
      handleCancelEdit();

    } catch (error) {
      console.error("Error submitting remarks:", error);
      toast.error(`❌ Failed to submit remarks: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Render status badge
  const renderStatusBadge = (status) => {
    const statusLower = (status || "").toLowerCase();
    
    if (statusLower.includes("credit") || statusLower.includes("note")) {
      return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Credit Note</Badge>;
    } else if (statusLower.includes("pending")) {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
    } else if (statusLower.includes("done") || statusLower.includes("completed")) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
    } else {
      return <Badge variant="outline">{status || "N/A"}</Badge>;
    }
  };

  // Render cell content
  const renderCell = (item, column) => {
    const value = item[column.dataKey];
    
    if (column.dataKey === "status") {
      return renderStatusBadge(value);
    }
    
    if (column.dataKey === "actions") {
      if (activeTab === "history") {
        return (
          <Badge variant="outline" className="bg-gray-50">
            Completed
          </Badge>
        );
      }
      
      if (editingRow === item.id) {
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancelEdit}
              disabled={submitting}
              className="h-7 px-2"
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitRemarks}
              disabled={submitting}
              className="h-7 px-2"
            >
              {submitting ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Save className="h-3 w-3 mr-1" />
              )}
              Save
            </Button>
          </div>
        );
      }
      
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleEditClick(item)}
          className="h-7 px-2"
        >
          <Edit className="h-3 w-3 mr-1" />
          Add Remarks
        </Button>
      );
    }
    
    return value || <span className="text-gray-400 text-xs">N/A</span>;
  };

  // Render edit modal
  const renderEditModal = () => {
    if (!editingRow) return null;
    
    const editingItem = mismatchData.find(item => item.id === editingRow);
    if (!editingItem) return null;
    
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-2xl shadow-2xl">
          <CardHeader className="px-6 py-5 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <CardTitle className="font-semibold text-lg text-gray-800">
              Add Remarks for {editingItem.liftId}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancelEdit}
              className="text-gray-400 hover:text-gray-600"
              disabled={submitting}
            >
              <X className="h-5 w-5" />
            </Button>
          </CardHeader>
          
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Lift ID</Label>
                  <div className="p-2 bg-gray-50 rounded border text-sm">{editingItem.liftId}</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Indent Number</Label>
                  <div className="p-2 bg-gray-50 rounded border text-sm">{editingItem.indentNo}</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Party Name</Label>
                  <div className="p-2 bg-gray-50 rounded border text-sm">{editingItem.partyName}</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Product</Label>
                  <div className="p-2 bg-gray-50 rounded border text-sm">{editingItem.productName}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Planned Timestamp</Label>
                <div className="p-2 bg-gray-50 rounded border text-sm">
                  {editingItem.planned || "Not set"}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Remarks <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter your remarks here..."
                  className="min-h-[100px] resize-none"
                  disabled={submitting}
                />
                <p className="text-xs text-gray-500">
                  Note: Submitting remarks will automatically set the actual timestamp.
                </p>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitRemarks}
                  disabled={submitting || !remarks.trim()}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Submit Remarks
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      {renderEditModal()}
      
      <div className="max-w-7xl mx-auto space-y-6">
        <Card className="shadow-md border-none">
          <CardHeader className="p-4 border-b border-gray-200">
            <CardTitle className="flex items-center gap-2 text-gray-700 text-lg">
              <FileText className="h-5 w-5 text-purple-600" /> Debit Note Management
            </CardTitle>
            <CardDescription className="text-gray-500 text-sm">
              Manage and update remarks for mismatch entries. Add remarks to track debit note status.
              {user?.firmName && user.firmName.toLowerCase() !== "all" && (
                <span className="ml-2 text-purple-600 font-medium">• Filtered by: {user.firmName}</span>
              )}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-4">
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                <TabsTrigger value="pending" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Pending
                  <Badge variant="outline" className="ml-2">
                    {pending.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  History
                  <Badge variant="outline" className="ml-2">
                    {history.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
              
              {/* Filters Section - Only for pending tab */}
              {activeTab === "pending" && (
                <TabsContent value="pending" className="space-y-4">
                  <div className="mb-4 p-4 bg-purple-50/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Filter className="h-4 w-4 text-gray-500" />
                      <Label className="text-sm font-medium">Filters</Label>
                      <Button variant="outline" size="sm" onClick={clearAllFilters} className="ml-auto bg-white">
                        Clear All
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div>
                        <Label className="text-xs mb-1 block">Firm Name</Label>
                        <SearchableSelect
                          value={filters.firmName}
                          onValueChange={(value) => handleFilterChange("firmName", value)}
                          options={["all", ...uniqueFilterOptions.firmName]}
                          placeholder="Firms"
                          className="h-9"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs mb-1 block">Party Name</Label>
                        <SearchableSelect
                          value={filters.partyName}
                          onValueChange={(value) => handleFilterChange("partyName", value)}
                          options={["all", ...uniqueFilterOptions.partyName]}
                          placeholder="Parties"
                          className="h-9"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs mb-1 block">Product Name</Label>
                        <SearchableSelect
                          value={filters.productName}
                          onValueChange={(value) => handleFilterChange("productName", value)}
                          options={["all", ...uniqueFilterOptions.productName]}
                          placeholder="Products"
                          className="h-9"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs mb-1 block">Transporter</Label>
                        <SearchableSelect
                          value={filters.transporterName}
                          onValueChange={(value) => handleFilterChange("transporterName", value)}
                          options={["all", ...uniqueFilterOptions.transporterName]}
                          placeholder="Transporters"
                          className="h-9"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs mb-1 block">Status</Label>
                        <SearchableSelect
                          value={filters.status}
                          onValueChange={(value) => handleFilterChange("status", value)}
                          options={["all", ...uniqueFilterOptions.status]}
                          placeholder="Statuses"
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Data Table */}
                  <Card className="shadow-sm border border-border">
                    <CardHeader className="py-3 px-4 bg-gray-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="flex items-center text-sm font-semibold text-foreground">
                            <Clock className="h-4 w-4 text-yellow-600 mr-2" />
                            Pending Entries ({filteredData.length})
                          </CardTitle>
                          <CardDescription className="text-xs text-muted-foreground mt-0.5">
                            Entries with planned timestamp but no actual timestamp. Add remarks to move to history.
                          </CardDescription>
                        </div>
                        <Button
                          onClick={fetchMismatchData}
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs bg-white"
                        >
                          <Loader2 className="mr-1.5 h-3.5 w-3.5" />
                          Refresh
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="p-0">
                      {loading ? (
                        <div className="flex flex-col justify-center items-center py-10">
                          <Loader2 className="h-8 w-8 text-purple-600 animate-spin mb-3" />
                          <p className="text-muted-foreground">Loading debit note data...</p>
                        </div>
                      ) : error && filteredData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-destructive-foreground bg-destructive/10 rounded-lg mx-4 my-4 text-center">
                          <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
                          <p className="font-medium text-destructive">Error Loading Data</p>
                          <p className="text-sm text-muted-foreground max-w-md">{error}</p>
                          <Button onClick={fetchMismatchData} variant="outline" className="mt-4">
                            Retry Loading
                          </Button>
                        </div>
                      ) : filteredData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-yellow-200/50 bg-yellow-50/50 rounded-lg mx-4 my-4 text-center">
                          <CheckCircle className="h-12 w-12 text-yellow-500 mb-3" />
                          <p className="font-medium text-foreground">No Pending Entries</p>
                          <p className="text-sm text-muted-foreground text-center">
                            All pending entries have been processed. Check the History tab.
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-b-lg">
                          <Table>
                            <TableHeader className="bg-yellow-50/50 sticky top-0 z-10">
                              <TableRow>
                                {DEBIT_NOTE_COLUMNS_META.map((col) => (
                                  <TableHead 
                                    key={col.dataKey} 
                                    className={`whitespace-nowrap text-xs px-3 py-2 ${
                                      col.dataKey === "actions" ? "w-[150px]" : ""
                                    }`}
                                  >
                                    {col.header}
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredData.map((item) => (
                                <TableRow 
                                  key={item.id} 
                                  className={`hover:bg-yellow-50/50 ${
                                    editingRow === item.id ? "bg-yellow-100 ring-1 ring-yellow-300" : ""
                                  }`}
                                >
                                  {DEBIT_NOTE_COLUMNS_META.map((column) => (
                                    <TableCell
                                      key={`${item.id}-${column.dataKey}`}
                                      className={`text-xs px-3 py-2 ${
                                        column.dataKey === "actions" ? "w-[150px]" : ""
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
                </TabsContent>
              )}
              
              {/* History Tab */}
              <TabsContent value="history" className="space-y-4">
                <Card className="shadow-sm border border-border">
                  <CardHeader className="py-3 px-4 bg-gray-50">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="flex items-center text-sm font-semibold text-foreground">
                          <History className="h-4 w-4 text-green-600 mr-2" />
                          History Entries ({history.length})
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground mt-0.5">
                          Entries with both planned and actual timestamps. These have been processed.
                        </CardDescription>
                      </div>
                      <Button
                        onClick={fetchMismatchData}
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs bg-white"
                      >
                        <Loader2 className="mr-1.5 h-3.5 w-3.5" />
                        Refresh
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-0">
                    {loading ? (
                      <div className="flex flex-col justify-center items-center py-10">
                        <Loader2 className="h-8 w-8 text-purple-600 animate-spin mb-3" />
                        <p className="text-muted-foreground">Loading history data...</p>
                      </div>
                    ) : error && history.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-destructive-foreground bg-destructive/10 rounded-lg mx-4 my-4 text-center">
                        <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
                        <p className="font-medium text-destructive">Error Loading Data</p>
                        <p className="text-sm text-muted-foreground max-w-md">{error}</p>
                        <Button onClick={fetchMismatchData} variant="outline" className="mt-4">
                          Retry Loading
                        </Button>
                      </div>
                    ) : history.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-green-200/50 bg-green-50/50 rounded-lg mx-4 my-4 text-center">
                        <History className="h-12 w-12 text-green-500 mb-3" />
                        <p className="font-medium text-foreground">No History Entries</p>
                        <p className="text-sm text-muted-foreground text-center">
                          No entries have been processed yet. Check the Pending tab.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-b-lg">
                        <Table>
                          <TableHeader className="bg-green-50/50 sticky top-0 z-10">
                            <TableRow>
                              {DEBIT_NOTE_COLUMNS_META.map((col) => (
                                <TableHead 
                                  key={col.dataKey} 
                                  className={`whitespace-nowrap text-xs px-3 py-2 ${
                                    col.dataKey === "actions" ? "w-[150px]" : ""
                                  }`}
                                >
                                  {col.header}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {history.map((item) => (
                              <TableRow 
                                key={item.id} 
                                className="hover:bg-green-50/50"
                              >
                                {DEBIT_NOTE_COLUMNS_META.map((column) => (
                                  <TableCell
                                    key={`${item.id}-${column.dataKey}`}
                                    className={`text-xs px-3 py-2 ${
                                      column.dataKey === "actions" ? "w-[150px]" : ""
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
              </TabsContent>
            </Tabs>
            
            {/* Summary Stats */}
            {activeTab === "pending" && filteredData.length > 0 && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Clock className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Pending Entries</p>
                      <p className="text-2xl font-semibold">{pending.length}</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <History className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Processed Entries</p>
                      <p className="text-2xl font-semibold">{history.length}</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Entries</p>
                      <p className="text-2xl font-semibold">{mismatchData.length}</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Calendar className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Filtered Entries</p>
                      <p className="text-2xl font-semibold">{filteredData.length}</p>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}