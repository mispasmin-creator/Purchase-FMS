"use client";
import { useState, useEffect, useCallback, useMemo, useContext } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Calculator,
  Loader2,
  FileCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  LinkIcon,
  History,
  Filter,
} from "lucide-react";
import { MixerHorizontalIcon } from "@radix-ui/react-icons";
import { AuthContext } from "../context/AuthContext";

// Constants
const SHEET_ID = "1NUxf4pnQ-CtCFUjA5rqLgYEJiU77wQlwVyimjt8RmFQ";
const SHEET_NAME = "INDENT-PO";
const DATA_START_ROW = 6; // Ensure this is the correct starting row
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzj9zlZTEhdlmaMt78Qy3kpkz7aOfVKVBRuJkd3wv_UERNrIRCaepSULpNa7W1g-pw/exec";

// Column indices from Google Sheet
const ColumnIndices = {
  INDENT_ID: 1,
  FIRM_NAME: 2,
  PO_NUMBER: 2,
  VENDOR_NAME: 4,
  RAW_MATERIAL_NAME: 5,
  TYPE_OF_INDENT: 8,
  NOTES: 10,
  APPROVED_QTY: 14,
  PLANNED: 17,
  PO_COPY_LINK: 25,
  DELIVERY_ORDER_NO: 36,
  TALLY_ENTRY_TIMESTAMP: 37,
};

// Helper Functions
const cleanIndentId = (indentId) => {
  if (!indentId) return "";
  return String(indentId).replace(/[^a-zA-Z0-9-]/g, "");
};

const formatSheetDateString = (dateValue) => {
  if (!dateValue || typeof dateValue !== "string" || !dateValue.trim()) {
    return "";
  }
  const dateObj = new Date(dateValue);
  if (isNaN(dateObj.getTime())) {
    const gvizMatch = dateValue.match(/^Date\((\d+),(\d+),(\d+)/);
    if (gvizMatch) {
      const [, year, month, day] = gvizMatch.map(Number);
      const parsedDate = new Date(year, month, day);
      if (!isNaN(parsedDate.getTime())) {
        return new Intl.DateTimeFormat("en-GB", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(parsedDate);
      }
    }
    return dateValue;
  }
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(dateObj);
};

// Column Definitions
const baseColumns = [
  { header: "Indent ID", dataKey: "indentId", toggleable: true, alwaysVisible: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "PO Number", dataKey: "poNumber", toggleable: true, alwaysVisible: true },
  { header: "Delivery Order No.", dataKey: "deliveryOrderNo", toggleable: true },
  { header: "Vendor", dataKey: "vendorName", toggleable: true },
  { header: "Material Name", dataKey: "rawMaterialName", toggleable: true },
  { header: "Approved Qty", dataKey: "approvedQty", toggleable: true },
  { header: "Indent Type", dataKey: "typeOfIndent", toggleable: true },
  { header: "PO Copy", dataKey: "poCopyLink", toggleable: true, isLink: true, linkText: "View PO" },
  { header: "Notes", dataKey: "notes", toggleable: true },
  { header: "Planned", dataKey: "planned", toggleable: true },
];

const approveColumns = [
  { header: "Mark Done", dataKey: "actionColumn", toggleable: false, alwaysVisible: true },
  ...baseColumns,
];

const historyColumns = [
  ...baseColumns,
  { header: "Tally Entry Time", dataKey: "tallyEntryTimestamp", toggleable: true },
];

// React Component
export default function TallyEntry() {
  const { user } = useContext(AuthContext);
  const [sheetData, setSheetData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingEntries, setProcessingEntries] = useState({});
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState("approve");
  const [filters, setFilters] = useState({
    vendorName: "all",
    rawMaterialName: "all",
    typeOfIndent: "all",
    approvedQty: "all",
    deliveryOrderNo: "all",
  });
  const [visibleApproveCols, setVisibleApproveCols] = useState(
    approveColumns.reduce((acc, col) => ({ ...acc, [col.dataKey]: col.alwaysVisible || col.toggleable }), {})
  );
  const [visibleHistoryCols, setVisibleHistoryCols] = useState(
    historyColumns.reduce((acc, col) => ({ ...acc, [col.dataKey]: col.alwaysVisible || col.toggleable }), {})
  );

  const fetchSheetData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        SHEET_NAME
      )}&t=${new Date().getTime()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
      const text = await response.text();
      const jsonString = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
      const data = JSON.parse(jsonString);
      if (data.status === "error") {
        throw new Error(data.errors.map((e) => e.detailed_message).join(", "));
      }
      let parsedData = (data.table.rows || [])
        .map((row, index) => {
          const rowData = {
            _rowIndex: index + DATA_START_ROW, // Ensure this is correct
            rawCells: row.c.map((cell) => (cell ? cell.f ?? cell.v : null)),
          };
          console.log(`Row index calculated: ${rowData._rowIndex}`); // Log the calculated row index
          const getCell = (colIdx) => rowData.rawCells[colIdx] || "";
          return {
            ...rowData,
            _id: `${SHEET_NAME}-${rowData._rowIndex}-${getCell(ColumnIndices.INDENT_ID)}`,
            indentId: cleanIndentId(getCell(ColumnIndices.INDENT_ID)),
            firmName: String(getCell(ColumnIndices.FIRM_NAME)),
            poNumber: String(getCell(ColumnIndices.PO_NUMBER)),
            deliveryOrderNo: String(getCell(ColumnIndices.DELIVERY_ORDER_NO)),
            vendorName: String(getCell(ColumnIndices.VENDOR_NAME)),
            rawMaterialName: String(getCell(ColumnIndices.RAW_MATERIAL_NAME)),
            approvedQty: String(getCell(ColumnIndices.APPROVED_QTY)),
            typeOfIndent: String(getCell(ColumnIndices.TYPE_OF_INDENT)),
            poCopyLink: String(getCell(ColumnIndices.PO_COPY_LINK)),
            notes: String(getCell(ColumnIndices.NOTES)),
            planned: String(getCell(ColumnIndices.PLANNED)),
            tallyEntryTimestamp: formatSheetDateString(getCell(ColumnIndices.TALLY_ENTRY_TIMESTAMP)),
          };
        })
        .filter((row) => row.indentId);
      if (user?.firmName && user.firmName.toLowerCase() !== "all") {
        const userFirmNameLower = user.firmName.toLowerCase();
        parsedData = parsedData.filter(
          (item) => (item.firmName || "").toLowerCase().trim() === userFirmNameLower
        );
      }
      setSheetData(parsedData);
    } catch (err) {
      const errorMessage = `Failed to load data. ${err.message}`;
      setError(errorMessage);
      toast.error("Data Load Error", {
        description: errorMessage,
        icon: <XCircle className="h-4 w-4" />,
      });
    } finally {
      setLoading(false);
    }
  }, [refreshTrigger, user]);

  useEffect(() => {
    fetchSheetData();
  }, [fetchSheetData]);

  const applyFilters = useCallback(
    (data) => {
      let filtered = [...data];
      if (filters.vendorName !== "all") filtered = filtered.filter((entry) => entry.vendorName === filters.vendorName);
      if (filters.rawMaterialName !== "all")
        filtered = filtered.filter((entry) => entry.rawMaterialName === filters.rawMaterialName);
      if (filters.typeOfIndent !== "all")
        filtered = filtered.filter((entry) => entry.typeOfIndent === filters.typeOfIndent);
      if (filters.approvedQty !== "all")
        filtered = filtered.filter((entry) => entry.approvedQty === filters.approvedQty);
      if (filters.deliveryOrderNo !== "all")
        filtered = filtered.filter((entry) => entry.deliveryOrderNo === filters.deliveryOrderNo);
      return filtered;
    },
    [filters]
  );

  const { pendingEntries, completedEntries } = useMemo(() => {
    const pending = [];
    const completed = [];
    sheetData.forEach((row) => {
      const hasDeliveryOrder = row.deliveryOrderNo && row.deliveryOrderNo.trim() !== "";
      const hasTallyTimestamp = row.tallyEntryTimestamp && row.tallyEntryTimestamp.trim() !== "";
      if (hasDeliveryOrder && !hasTallyTimestamp) {
        pending.push(row);
      } else if (hasDeliveryOrder && hasTallyTimestamp) {
        completed.push(row);
      }
    });
    completed.sort(
      (a, b) => new Date(b.tallyEntryTimestamp).getTime() - new Date(a.tallyEntryTimestamp).getTime()
    );
    return {
      pendingEntries: applyFilters(pending),
      completedEntries: applyFilters(completed),
    };
  }, [sheetData, applyFilters]);

  const getUniqueValues = (field) => {
    const allEntries = sheetData.filter((row) => row.deliveryOrderNo && row.deliveryOrderNo.trim() !== "");
    const values = allEntries.map((entry) => entry[field]).filter((value) => value && value.trim() !== "");
    return [...new Set(values)].sort();
  };

  const updateSheetWithTimestamp = async (entry, checked) => {
    if (!entry?._rowIndex) {
      throw new Error("Cannot update: Entry row index is missing.");
    }

    const timestamp = checked
      ? new Date().toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).replace(/,/g, "")
      : "";

    const cellUpdates = {
      [`col${ColumnIndices.TALLY_ENTRY_TIMESTAMP + 1}`]: timestamp,
    };

    const params = new URLSearchParams({
      action: "updateCells",
      sheetName: SHEET_NAME,
      rowIndex: entry._rowIndex.toString(), // Ensure this is the correct row index
      cellUpdates: JSON.stringify(cellUpdates),
    });

    console.log(`Updating row index: ${entry._rowIndex}`); // Log the row index being updated

    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const responseText = await response.text();
    let result;

    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse script response:", responseText);
      throw new Error("Received an invalid response from the server. Please check the script logs.");
    }

    if (!result.success) {
      console.error("Script returned an error:", result);
      throw new Error(result.message || result.error || "The script reported an unspecified failure.");
    }

    return result;
  };

  const handleMarkAsDone = async (entry, checked) => {
    setProcessingEntries((prev) => ({ ...prev, [entry._id]: true }));
    try {
      await updateSheetWithTimestamp(entry, checked);
      toast.success("Entry Updated", {
        description: `PO ${entry.poNumber} status has been successfully updated.`,
        icon: <CheckCircle className="h-4 w-4" />,
      });
      setRefreshTrigger((t) => t + 1);
    } catch (error) {
      console.error("Update Failed:", error);
      toast.error("Update Failed", {
        description: `Could not update PO ${entry.poNumber}. Reason: ${error.message}`,
        icon: <XCircle className="h-4 w-4" />,
      });
    } finally {
      setProcessingEntries((prev) => {
        const newState = { ...prev };
        delete newState[entry._id];
        return newState;
      });
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearAllFilters = () => {
    setFilters({
      vendorName: "all",
      rawMaterialName: "all",
      typeOfIndent: "all",
      approvedQty: "all",
      deliveryOrderNo: "all",
    });
  };

  const renderCellContent = (content, { isLink, linkText } = {}) => {
    if (isLink) {
      const link = String(content || "").trim();
      if (link && link !== "-") {
        const fullLink = link.startsWith("http") ? link : `https://${link}`;
        return (
          <a href={fullLink} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline inline-flex items-center gap-1">
            <LinkIcon className="h-3.5 w-3.5" />
            {linkText || "View"}
          </a>
        );
      }
      return <span className="text-muted-foreground">-</span>;
    }
    return String(content || "").trim() || <span className="text-muted-foreground">-</span>;
  };

  const ColumnVisibilityToggle = ({ tab, columns, visibleCols, setVisibleCols }) => {
    const handleToggleAll = (checked) => {
      const newVisibility = { ...visibleCols };
      columns.forEach((col) => {
        if (col.toggleable && !col.alwaysVisible) {
          newVisibility[col.dataKey] = checked;
        }
      });
      setVisibleCols(newVisibility);
    };
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 bg-white">
            <MixerHorizontalIcon className="mr-2 h-4 w-4" /> View
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="end">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Toggle Columns</p>
              <div>
                <Button variant="link" className="p-0 h-auto text-xs" onClick={() => handleToggleAll(true)}>
                  All
                </Button>
                <span className="text-muted-foreground mx-1">/</span>
                <Button variant="link" className="p-0 h-auto text-xs" onClick={() => handleToggleAll(false)}>
                  None
                </Button>
              </div>
            </div>
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-2">
              {columns
                .filter((c) => c.toggleable)
                .map((col) => (
                  <div key={`${tab}-${col.dataKey}`} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${tab}-${col.dataKey}`}
                      checked={!!visibleCols[col.dataKey]}
                      onCheckedChange={(checked) => setVisibleCols((p) => ({ ...p, [col.dataKey]: !!checked }))}
                      disabled={col.alwaysVisible}
                    />
                    <Label htmlFor={`${tab}-${col.dataKey}`} className="text-sm font-normal cursor-pointer flex-1">
                      {col.header} {col.alwaysVisible && <span className="text-xs text-muted-foreground">(Fixed)</span>}
                    </Label>
                  </div>
                ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const renderTable = (type, entries, columns, visibleCols, setVisibleCols) => {
    const visibleColumns = columns.filter((col) => visibleCols[col.dataKey]);
    const cardInfo = {
      approve: {
        icon: FileCheck,
        title: "Pending Tally Entries",
        desc: "Entries with a Delivery Order No. but no Tally timestamp.",
      },
      history: {
        icon: History,
        title: "Completed Tally Entries",
        desc: "Entries with both Delivery Order No. and Tally timestamp, sorted by latest.",
      },
    };
    const { icon: Icon, title, desc } = cardInfo[type];
    return (
      <Card className="shadow-none border flex-1 flex flex-col">
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center text-base">
                <Icon className="h-5 w-5 text-purple-600 mr-2" /> {title} ({entries.length})
              </CardTitle>
              <CardDescription className="mt-1 text-xs">{desc}</CardDescription>
            </div>
            <ColumnVisibilityToggle tab={type} columns={columns} visibleCols={visibleCols} setVisibleCols={setVisibleCols} />
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-hidden">
          {loading && entries.length === 0 ? (
            <div className="flex flex-1 items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-purple-600" /> Loading...
            </div>
          ) : error && entries.length === 0 ? (
            <div className="m-4 p-6 flex flex-1 flex-col items-center justify-center text-center bg-destructive/10 border border-dashed border-destructive rounded-lg">
              <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
              <p className="font-semibold text-destructive">Error Loading Data</p>
              <p className="text-sm text-muted-foreground max-w-md mt-1">{error}</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="m-4 p-6 flex flex-1 flex-col items-center justify-center text-center bg-secondary/50 border border-dashed rounded-lg">
              <Info className="h-10 w-10 text-purple-600 mb-3" />
              <p className="font-semibold">{type === "approve" ? "No Pending Entries" : "No Completed Entries"}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {type === "approve" ? "All eligible entries have been processed." : "Completed entries will appear here."}
                {user?.firmName && user.firmName.toLowerCase() !== "all" && (
                  <span className="block mt-1">(Filtered by firm: {user.firmName})</span>
                )}
              </p>
            </div>
          ) : (
            <div className="overflow-auto h-full">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                  <TableRow>
                    {visibleColumns.map((col) => (
                      <TableHead key={col.dataKey} className={col.dataKey === "actionColumn" ? "w-[120px] text-center" : ""}>
                        {col.header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry._id} className="hover:bg-muted/50">
                      {visibleColumns.map((col) => (
                        <TableCell key={col.dataKey} className="py-2.5 px-3 text-xs">
                          {col.dataKey === "actionColumn" ? (
                            <div className="flex justify-center items-center">
                              {processingEntries[entry._id] ? (
                                <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                              ) : (
                                <Checkbox
                                  onCheckedChange={(checked) => {
                                    if (checked) handleMarkAsDone(entry, checked);
                                  }}
                                />
                              )}
                            </div>
                          ) : (
                            <span title={typeof entry[col.dataKey] === "string" ? entry[col.dataKey] : ""}>
                              {renderCellContent(entry[col.dataKey], { isLink: col.isLink, linkText: col.linkText })}
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
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col bg-slate-50">
      <Card className="shadow-md border border-gray-200 flex-1 flex flex-col bg-white">
        <CardHeader className="p-4 border-b border-gray-200">
          <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-3">
            <Calculator className="h-6 w-6 text-purple-600" />
            Step 4: Purchase Order Entry In Tally
          </CardTitle>
          <CardDescription className="text-gray-500 mt-1 text-sm">
            Mark purchase orders as entered in the Tally accounting system.
            {user?.firmName && user.firmName.toLowerCase() !== "all" && (
              <span className="ml-2 text-purple-600 font-medium">• Filtered by: {user.firmName}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full sm:w-[450px] grid-cols-2 mb-4">
              <TabsTrigger value="approve" className="gap-2">
                <FileCheck className="h-4 w-4" /> Approve <Badge variant="secondary" className="ml-2">{pendingEntries.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="h-4 w-4" /> History <Badge variant="secondary" className="ml-2">{completedEntries.length}</Badge>
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
                <Select size="sm" value={filters.vendorName} onValueChange={(value) => handleFilterChange("vendorName", value)}>
                  <SelectTrigger className="h-8 bg-white">
                    <SelectValue placeholder="All Vendors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vendors</SelectItem>
                    {getUniqueValues("vendorName").map((vendor) => (
                      <SelectItem key={vendor} value={vendor}>
                        {vendor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  size="sm"
                  value={filters.rawMaterialName}
                  onValueChange={(value) => handleFilterChange("rawMaterialName", value)}
                >
                  <SelectTrigger className="h-8 bg-white">
                    <SelectValue placeholder="All Materials" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Materials</SelectItem>
                    {getUniqueValues("rawMaterialName").map((material) => (
                      <SelectItem key={material} value={material}>
                        {material}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select size="sm" value={filters.typeOfIndent} onValueChange={(value) => handleFilterChange("typeOfIndent", value)}>
                  <SelectTrigger className="h-8 bg-white">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {getUniqueValues("typeOfIndent").map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select size="sm" value={filters.approvedQty} onValueChange={(value) => handleFilterChange("approvedQty", value)}>
                  <SelectTrigger className="h-8 bg-white">
                    <SelectValue placeholder="All Quantities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Quantities</SelectItem>
                    {getUniqueValues("approvedQty").map((qty) => (
                      <SelectItem key={qty} value={qty}>
                        {qty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  size="sm"
                  value={filters.deliveryOrderNo}
                  onValueChange={(value) => handleFilterChange("deliveryOrderNo", value)}
                >
                  <SelectTrigger className="h-8 bg-white">
                    <SelectValue placeholder="All Orders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orders</SelectItem>
                    {getUniqueValues("deliveryOrderNo").map((order) => (
                      <SelectItem key={order} value={order}>
                        {order}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <TabsContent value="approve" className="flex-1 mt-0">
              {renderTable("approve", pendingEntries, approveColumns, visibleApproveCols, setVisibleApproveCols)}
            </TabsContent>
            <TabsContent value="history" className="flex-1 mt-0">
              {renderTable("history", completedEntries, historyColumns, visibleHistoryCols, setVisibleHistoryCols)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
