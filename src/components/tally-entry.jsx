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
  ChevronsUpDown,
} from "lucide-react";
import { MixerHorizontalIcon } from "@radix-ui/react-icons";
import { AuthContext } from "../context/AuthContext";
import { Input } from "@/components/ui/input";
import { supabase } from "../supabase";


// Helper Functions
const cleanIndentId = (indentId) => {
  if (!indentId) return "";
  return String(indentId).replace(/[^a-zA-Z0-9-]/g, "");
};

// Simple SearchableSelect Component
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
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
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
  { header: "PO Number", dataKey: "indentId", toggleable: true, alwaysVisible: true },
  { header: "Planned", dataKey: "planned", toggleable: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "Delivery Order No.", dataKey: "deliveryOrderNo", toggleable: true },
  { header: "Vendor", dataKey: "vendorName", toggleable: true },
  { header: "Material Name", dataKey: "rawMaterialName", toggleable: true },
  { header: "PO Qty", dataKey: "approvedQty", toggleable: true },
  { header: "Alumina %", dataKey: "alumina", toggleable: true },
  { header: "Iron %", dataKey: "iron", toggleable: true },
  { header: "Advance Amount", dataKey: "advanceAmount", toggleable: true },
  { header: "Total Amount", dataKey: "totalAmount", toggleable: true },
  { header: "Indent Type", dataKey: "typeOfIndent", toggleable: true },
  { header: "PO Copy", dataKey: "poCopyLink", toggleable: true, isLink: true, linkText: "View PO" },
  { header: "Notes", dataKey: "notes", toggleable: true },
];

const approveColumns = [
  { header: "Select", dataKey: "actionColumn", toggleable: false, alwaysVisible: true },
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
  const [selectedEntries, setSelectedEntries] = useState({});
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);
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
      const { data, error: fetchError } = await supabase
        .from("INDENT-PO")
        .select("*")
        .not("Planned3", "is", null);

      if (fetchError) throw fetchError;

      let parsedData = (data || [])
        .reduce((acc, row) => {
          const poNumber = String(row.po_number || row["Indent Id."] || "");
          const groupKey = cleanIndentId(poNumber);
          if (!groupKey) return acc;
          if (!acc[groupKey]) {
            acc[groupKey] = {
              ...row,
              _id: row.id || `po-entry-${poNumber}-${row.Timestamp}`,
              dbRowIds: [],
              indentId: poNumber,
              firmName: String(row["Firm Name"] || ""),
              poNumber,
              deliveryOrderNo: String(row["Delivery Order No."] || ""),
              vendorName: String(row["Vendor name"] || row["Vendor"] || ""),
              rawMaterialName: String(row["Material"] || ""),
              allMaterials: new Set([String(row["Material"] || "").trim()]),
              approvedQty: String(row["Total Quantity"] || row["Approved Qty"] || ""),
              advanceAmount: String(row["To Be Paid Amount"] || ""),
              typeOfIndent: String(row["Priority"] || ""),
              poCopyLink: String(row["PO Copy"] || ""),
              notes: String(row["PO Notes"] || ""),
              totalAmount: String(row["Total Amount"] || ""),
              alumina: String(row["Alumina %"] || ""),
              iron: String(row["Iron %"] || ""),
              transportType: String(row["Transport Type"] || ""),
              planned: formatSheetDateString(row["Planned3"]),
              tallyEntryTimestamp: formatSheetDateString(row["Actual3"]),
              rawActual3: row["Actual3"],
              rawActualLogistics: row["ActualLogistics"],
            };
          }
          acc[groupKey].dbRowIds.push(row.id);
          if (row["Material"]) {
            acc[groupKey].allMaterials.add(String(row["Material"]).trim());
          }
          return acc;
        }, {});

      parsedData = Object.values(parsedData).map(row => ({
        ...row,
        rawMaterialName: Array.from(row.allMaterials).filter(m => m !== "").join(", ")
      })).filter((row) => row.indentId);

      if (user?.firmName && String(user.firmName).toLowerCase() !== "all") {
        const userFirmNameLower = String(user.firmName).toLowerCase();
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
      const hasPlanned3 = row.planned && row.planned.trim() !== "";
      const hasActual3 = row.rawActual3 && row.rawActual3 !== null;
      const isForTransport = String(row.transportType || "").trim().toUpperCase() === "FOR";
      const hasCompletedLogistics =
        isForTransport || (row.rawActualLogistics && String(row.rawActualLogistics).trim() !== "");
      if (hasCompletedLogistics && hasPlanned3 && !hasActual3) {
        pending.push(row);
      } else if (hasCompletedLogistics && hasPlanned3 && hasActual3) {
        completed.push(row);
      }
    });
    completed.sort(
      (a, b) => new Date(b.rawActual3).getTime() - new Date(a.rawActual3).getTime()
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

  const updateSupabase = async (entry, checked) => {
    if (!entry?.dbRowIds?.length) {
      throw new Error("Cannot update: Entry database ID is missing.");
    }

    let timestamp = null;
    if (checked) {
      const now = new Date();
      timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    }

    const { error: updateError } = await supabase
      .from("INDENT-PO")
      .update({ "Actual3": timestamp })
      .in("id", entry.dbRowIds);

    if (updateError) throw updateError;
    return { success: true };
  };

  const toggleSelectEntry = (entry) => {
    setSelectedEntries((prev) => {
      const newState = { ...prev };
      if (newState[entry._id]) {
        delete newState[entry._id];
      } else {
        newState[entry._id] = entry;
      }
      return newState;
    });
  };

  const toggleSelectAll = (entries) => {
    const allSelected = entries.every((e) => selectedEntries[e._id]);
    if (allSelected) {
      setSelectedEntries((prev) => {
        const newState = { ...prev };
        entries.forEach((e) => delete newState[e._id]);
        return newState;
      });
    } else {
      setSelectedEntries((prev) => {
        const newState = { ...prev };
        entries.forEach((e) => { newState[e._id] = e; });
        return newState;
      });
    }
  };

  const selectedCount = Object.keys(selectedEntries).length;

  const handleSubmitSelected = async () => {
    const entriesToSubmit = Object.values(selectedEntries);
    if (entriesToSubmit.length === 0) return;

    setIsSubmittingBatch(true);
    const ids = entriesToSubmit.map((e) => e._id);
    ids.forEach((id) => setProcessingEntries((prev) => ({ ...prev, [id]: true })));

    let successCount = 0;
    let failCount = 0;

    for (const entry of entriesToSubmit) {
      try {
        await updateSupabase(entry, true);
        successCount++;
      } catch (error) {
        console.error(`Failed to update ${entry.indentId}:`, error);
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} entr${successCount > 1 ? "ies" : "y"} marked as done`, {
        icon: <CheckCircle className="h-4 w-4" />,
      });
    }
    if (failCount > 0) {
      toast.error(`${failCount} entr${failCount > 1 ? "ies" : "y"} failed to update`, {
        icon: <XCircle className="h-4 w-4" />,
      });
    }

    setSelectedEntries({});
    setProcessingEntries({});
    setIsSubmittingBatch(false);
    setRefreshTrigger((t) => t + 1);
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
          <a href={fullLink} target="_blank" rel="noopener noreferrer" className="text-[#7da23a] hover:underline inline-flex items-center gap-1">
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
                <Icon className="h-5 w-5 text-[#7da23a] mr-2" /> {title} ({entries.length})
              </CardTitle>
              <CardDescription className="mt-1 text-xs">{desc}</CardDescription>
            </div>
            <ColumnVisibilityToggle tab={type} columns={columns} visibleCols={visibleCols} setVisibleCols={setVisibleCols} />
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-hidden">
          {loading && entries.length === 0 ? (
            <div className="flex flex-1 items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-[#7da23a]" /> Loading...
            </div>
          ) : error && entries.length === 0 ? (
            <div className="m-4 p-6 flex flex-1 flex-col items-center justify-center text-center bg-destructive/10 border border-dashed border-destructive rounded-lg">
              <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
              <p className="font-semibold text-destructive">Error Loading Data</p>
              <p className="text-sm text-muted-foreground max-w-md mt-1">{error}</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="m-4 p-6 flex flex-1 flex-col items-center justify-center text-center bg-secondary/50 border border-dashed rounded-lg">
              <Info className="h-10 w-10 text-[#7da23a] mb-3" />
              <p className="font-semibold">{type === "approve" ? "No Pending Entries" : "No Completed Entries"}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {type === "approve" ? "All eligible entries have been processed." : "Completed entries will appear here."}
                {user?.firmName && String(user.firmName).toLowerCase() !== "all" && (
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
                      <TableHead key={col.dataKey} className={col.dataKey === "actionColumn" ? "w-[60px] text-center" : ""}>
                        {col.dataKey === "actionColumn" && type === "approve" ? (
                          <Checkbox
                            checked={entries.length > 0 && entries.every((e) => selectedEntries[e._id])}
                            onCheckedChange={() => toggleSelectAll(entries)}
                          />
                        ) : (
                          col.header
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry._id} className={`hover:bg-muted/50 ${selectedEntries[entry._id] ? "bg-green-50" : ""}`}>
                      {visibleColumns.map((col) => (
                        <TableCell key={col.dataKey} className="py-2.5 px-3 text-xs">
                          {col.dataKey === "actionColumn" ? (
                            <div className="flex justify-center items-center">
                              {processingEntries[entry._id] ? (
                                <Loader2 className="h-4 w-4 animate-spin text-[#7da23a]" />
                              ) : (
                                <Checkbox
                                  checked={!!selectedEntries[entry._id]}
                                  onCheckedChange={() => toggleSelectEntry(entry)}
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
            <Calculator className="h-6 w-6 text-[#7da23a]" />
            Step 4: Purchase Order Entry In Tally
          </CardTitle>
          <CardDescription className="text-gray-500 mt-1 text-sm">
            Mark purchase orders as entered in the Tally accounting system.
            {user?.firmName && String(user.firmName).toLowerCase() !== "all" && (
              <span className="ml-2 text-[#7da23a] font-medium">• Filtered by: {user.firmName}</span>
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
            <div className="mb-4 p-4 bg-green-50/50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-gray-500" />
                <Label className="text-sm font-medium">Filters</Label>
                <Button variant="outline" size="sm" onClick={clearAllFilters} className="ml-auto bg-white">
                  Clear All
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Vendor Name Filter */}
                <div>
                  <Label className="text-xs mb-1 block">Vendor Name</Label>
                  <SearchableSelect
                    value={filters.vendorName}
                    onValueChange={(value) => handleFilterChange("vendorName", value)}
                    options={["all", ...getUniqueValues("vendorName")]}
                    placeholder="Vendors"
                    className="h-9"
                  />
                </div>

                {/* Material Name Filter */}
                <div>
                  <Label className="text-xs mb-1 block">Material Name</Label>
                  <SearchableSelect
                    value={filters.rawMaterialName}
                    onValueChange={(value) => handleFilterChange("rawMaterialName", value)}
                    options={["all", ...getUniqueValues("rawMaterialName")]}
                    placeholder="Materials"
                    className="h-9"
                  />
                </div>

                {/* Type Of Indent Filter */}
                <div>
                  <Label className="text-xs mb-1 block">Type Of Indent</Label>
                  <SearchableSelect
                    value={filters.typeOfIndent}
                    onValueChange={(value) => handleFilterChange("typeOfIndent", value)}
                    options={["all", ...getUniqueValues("typeOfIndent")]}
                    placeholder="Types"
                    className="h-9"
                  />
                </div>

                {/* Approved Quantity Filter */}
                <div>
                  <Label className="text-xs mb-1 block">Approved Quantity</Label>
                  <SearchableSelect
                    value={filters.approvedQty}
                    onValueChange={(value) => handleFilterChange("approvedQty", value)}
                    options={["all", ...getUniqueValues("approvedQty")]}
                    placeholder="Quantities"
                    className="h-9"
                  />
                </div>

                {/* Delivery Order No Filter */}
                <div>
                  <Label className="text-xs mb-1 block">Delivery Order No</Label>
                  <SearchableSelect
                    value={filters.deliveryOrderNo}
                    onValueChange={(value) => handleFilterChange("deliveryOrderNo", value)}
                    options={["all", ...getUniqueValues("deliveryOrderNo")]}
                    placeholder="Orders"
                    className="h-9"
                  />
                </div>
              </div>
            </div>
            <TabsContent value="approve" className="flex-1 mt-0">
              {renderTable("approve", pendingEntries, approveColumns, visibleApproveCols, setVisibleApproveCols)}
            </TabsContent>
            <TabsContent value="history" className="flex-1 mt-0">
              {renderTable("history", completedEntries, historyColumns, visibleHistoryCols, setVisibleHistoryCols)}
            </TabsContent>

            {/* Sticky Submit Bar */}
            {selectedCount > 0 && (
              <div className="sticky bottom-0 z-20 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between shadow-[0_-2px_8px_rgba(0,0,0,0.08)] rounded-b-lg">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-[#7da23a] text-white">
                    {selectedCount}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {selectedCount === 1 ? "entry" : "entries"} selected
                  </span>
                  <Button variant="ghost" size="sm" className="text-xs text-gray-500" onClick={() => setSelectedEntries({})}>
                    Clear
                  </Button>
                </div>
                <Button
                  onClick={handleSubmitSelected}
                  disabled={isSubmittingBatch}
                  className="bg-[#7da23a] hover:bg-[#6b8f30] text-white gap-2"
                >
                  {isSubmittingBatch ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
                  ) : (
                    <><CheckCircle className="h-4 w-4" /> Submit {selectedCount} {selectedCount === 1 ? "Entry" : "Entries"}</>
                  )}
                </Button>
              </div>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
