"use client";
import { useState, useEffect, useCallback, useMemo, useContext } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

import {
  Calculator,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  LinkIcon,
  Filter,
  ExternalLink,
  ChevronsUpDown,
  History,
  FileClock
} from "lucide-react";
import { MixerHorizontalIcon } from "@radix-ui/react-icons";
import { AuthContext } from "../context/AuthContext";
import { supabase } from "../supabase";

// Helper Functions
const cleanIndentId = (indentId) => {
  if (!indentId) return "";
  return String(indentId).replace(/[^a-zA-Z0-9-]/g, "");
};

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

const columns = [
  { header: "Select", dataKey: "selectAction", toggleable: false, alwaysVisible: true },
  { header: "Action", dataKey: "paymentAction", toggleable: false, alwaysVisible: true },
  { header: "Indent ID", dataKey: "indentId", toggleable: true, alwaysVisible: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "Delivery Order No.", dataKey: "deliveryOrderNo", toggleable: true },
  { header: "Vendor", dataKey: "vendorName", toggleable: true },
  { header: "Material Name", dataKey: "rawMaterialName", toggleable: true },
  { header: "PO Qty", dataKey: "approvedQty", toggleable: true },
  { header: "Advance Amount", dataKey: "advanceAmount", toggleable: true },
  { header: "Total Amount", dataKey: "totalAmount", toggleable: true },

  { header: "Indent Type", dataKey: "typeOfIndent", toggleable: true },

  {
    header: "PO Copy",
    dataKey: "poCopyLink",
    toggleable: true,
    isLink: true,
    linkText: "View PO",
  },

  { header: "Notes", dataKey: "notes", toggleable: true },
  { header: "Planned", dataKey: "planned", toggleable: true },
  { header: "Paid On", dataKey: "actual", toggleable: true },
];

export default function OriginalBillsFiledPage() {
  const { user } = useContext(AuthContext);
  const [sheetData, setSheetData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingEntries, setProcessingEntries] = useState({});
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedEntries, setSelectedEntries] = useState({});
  const [activeTab, setActiveTab] = useState("pending");
  const [filters, setFilters] = useState({
    vendorName: "all",
    rawMaterialName: "all",
    typeOfIndent: "all",
    approvedQty: "all",
    deliveryOrderNo: "all",
  });
  const [visibleCols, setVisibleCols] = useState(
    columns.reduce((acc, col) => ({ ...acc, [col.dataKey]: col.alwaysVisible || col.toggleable }), {})
  );

  const fetchSheetData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("INDENT-PO")
        .select("*")
        .not("Planned5", "is", null);

      if (fetchError) throw fetchError;

      let parsedData = (data || [])
        .map((row) => {
          return {
            ...row,
            _id: row.id || `adv-pay-${row["Indent Id."]}-${row.Timestamp}`,
            dbIndentId: row["Indent Id."],
            indentId: cleanIndentId(row["Indent Id."]),
            firmName: String(row["Firm Name"] || ""),
            poNumber: String(row["Indent Id."] || ""),
            deliveryOrderNo: String(row["Delivery Order No."] || ""),
            vendorName: String(row["Vendor name"] || row["Vendor"] || ""),
            rawMaterialName: String(row["Material"] || ""),
            approvedQty: String(row["Total Quantity"] || row["Approved Qty"] || ""),
            advanceAmount: String(row["To Be Paid Amount"] || ""),
            totalAmount: String(row["Total Amount"] || ""),
            typeOfIndent: String(row["Priority"] || ""),
            poCopyLink: String(row["PO Copy"] || ""),
            notes: String(row["PO Notes"] || ""),
            planned: formatSheetDateString(row["Planned5"]),
            planned5: row["Planned5"],
            actual: formatSheetDateString(row["Actual5"]),
            actual5: row["Actual5"],
            status: row["Status5"],
            paymentLink: String(row["Payment Link"] || ""),
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

  const pendingEntries = useMemo(() => {
    const pending = sheetData.filter((row) => {
      const hasPlanned5 = row.planned5 && String(row.planned5).trim() !== "" && String(row.planned5).trim() !== "-";
      const hasActual5 = row.actual5 && String(row.actual5).trim() !== "" && String(row.actual5).trim() !== "-";
      return hasPlanned5 && !hasActual5;
    });
    return applyFilters(pending);
  }, [sheetData, applyFilters]);

  const historyEntries = useMemo(() => {
    const history = sheetData.filter((row) => {
      const hasPlanned5 = row.planned5 && String(row.planned5).trim() !== "" && String(row.planned5).trim() !== "-";
      const hasActual5 = row.actual5 && String(row.actual5).trim() !== "" && String(row.actual5).trim() !== "-";
      return hasPlanned5 && hasActual5;
    });
    // Sort logic removed to simply show all history
    return applyFilters(history);
  }, [sheetData, applyFilters]);

  const getUniqueValues = (field) => {
    const values = sheetData.map((entry) => entry[field]).filter((value) => value && value.trim() !== "");
    return [...new Set(values)].sort();
  };

  const updateSupabase = async (entry) => {
    if (!entry?.dbIndentId) {
      throw new Error("Cannot update: Entry database ID is missing.");
    }

    // Format timestamp in YYYY-MM-DD HH:mm:ss format (IST)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

    const { error: updateError } = await supabase
      .from("INDENT-PO")
      .update({
        "Actual5": timestamp,
        "Status5": "paid"
      })
      .eq('"Indent Id."', entry.dbIndentId);

    if (updateError) throw updateError;
    return { success: true };
  };

  const handleSubmitSelected = async () => {
    const selectedIds = Object.keys(selectedEntries).filter(id => selectedEntries[id]);

    if (selectedIds.length === 0) {
      toast.error("No entries selected", {
        description: "Please select at least one entry to submit.",
        icon: <AlertTriangle className="h-4 w-4" />,
      });
      return;
    }

    const entriesToProcess = pendingEntries.filter(entry =>
      selectedIds.includes(entry._id) || selectedIds.includes(String(entry._id))
    );

    setProcessingEntries(prev => {
      const newState = { ...prev };
      entriesToProcess.forEach(entry => {
        newState[entry._id] = true;
      });
      return newState;
    });

    let successCount = 0;
    let errorCount = 0;

    for (const entry of entriesToProcess) {
      try {
        await updateSupabase(entry);
        successCount++;
      } catch (error) {
        console.error(`Failed to update PO ${entry.poNumber}:`, error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast.success("Entries Updated", {
        description: `${successCount} entries have been successfully updated.`,
        icon: <CheckCircle className="h-4 w-4" />,
      });
    }

    if (errorCount > 0) {
      toast.error("Some Updates Failed", {
        description: `${errorCount} entries failed to update. Please try again.`,
        icon: <XCircle className="h-4 w-4" />,
      });
    }

    setSelectedEntries({});
    setProcessingEntries({});
    setRefreshTrigger(t => t + 1);
  };

  const handleSelectEntry = (entryId, checked) => {
    setSelectedEntries(prev => ({
      ...prev,
      [entryId]: checked,
    }));
  };

  const handleSelectAll = (checked) => {
    const newSelection = {};
    if (checked) {
      pendingEntries.forEach(entry => {
        newSelection[entry._id] = true;
      });
    }
    setSelectedEntries(newSelection);
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

  const ColumnVisibilityToggle = () => {
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
                  <div key={col.dataKey} className="flex items-center space-x-2">
                    <Checkbox
                      id={col.dataKey}
                      checked={!!visibleCols[col.dataKey]}
                      onCheckedChange={(checked) => setVisibleCols((p) => ({ ...p, [col.dataKey]: !!checked }))}
                      disabled={col.alwaysVisible}
                    />
                    <Label htmlFor={col.dataKey} className="text-sm font-normal cursor-pointer flex-1">
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

  const visibleColumns = columns.filter((col) => visibleCols[col.dataKey]);
  const allSelected = pendingEntries.length > 0 && pendingEntries.every(entry => selectedEntries[entry._id]);
  const someSelected = Object.values(selectedEntries).some(v => v);

  const renderTable = (entries, isHistory) => (
    <div className="overflow-auto h-full rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
          <TableRow>
            {visibleColumns.map((col) => (
              <TableHead
                key={col.dataKey}
                className={col.dataKey === "selectAction" || col.dataKey === "paymentAction" ? "w-[120px] text-center" : ""}
              >
                {col.dataKey === "selectAction" ? (
                  !isHistory ? (
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                    />) : <span>#</span>
                ) : (
                  col.header
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={visibleColumns.length} className="h-24 text-center text-muted-foreground">
                No {isHistory ? "history" : "pending"} records found.
              </TableCell>
            </TableRow>
          ) : (
            entries.map((entry) => (
              <TableRow key={entry._id} className="hover:bg-muted/50">
                {visibleColumns.map((col) => (
                  <TableCell key={col.dataKey} className="py-2.5 px-3 text-xs">
                    {col.dataKey === "selectAction" ? (
                      <div className="flex justify-center items-center">
                        {!isHistory ? (
                          <>
                            {processingEntries[entry._id] ? (
                              <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                            ) : (
                              <Checkbox
                                checked={!!selectedEntries[entry._id]}
                                onCheckedChange={(checked) => handleSelectEntry(entry._id, checked)}
                              />
                            )}
                          </>
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                        )}
                      </div>
                    ) : col.dataKey === "paymentAction" ? (
                      <div className="flex justify-center items-center">
                        {entry.paymentLink && entry.paymentLink.trim() !== "" && entry.paymentLink !== "-" ? (
                          <Button
                            size="sm"
                            className={`text-xs h-7 ${isHistory ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-green-600 hover:bg-green-700 text-white"}`}
                            variant={isHistory ? "ghost" : "default"}
                            onClick={() => {
                              const link = entry.paymentLink.startsWith("http")
                                ? entry.paymentLink
                                : `https://${entry.paymentLink}`;
                              window.open(link, "_blank");
                            }}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            {isHistory ? "View Link" : "Make Payment"}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-xs">No Link</span>
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
            )))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col bg-slate-50">
      <Card className="shadow-md border border-gray-200 flex-1 flex flex-col bg-white">
        <CardHeader className="p-4 border-b border-gray-200">
          <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-3">
            <Calculator className="h-6 w-6 text-purple-600" />
            Advance Payment Management
          </CardTitle>
          <CardDescription className="text-gray-500 mt-1 text-sm">
            Manage advance payments for purchase orders (Stage 5).
            {user?.firmName && user.firmName.toLowerCase() !== "all" && (
              <span className="ml-2 text-purple-600 font-medium">• Filtered by: {user.firmName}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-[400px] grid-cols-2 mb-4">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <FileClock className="h-4 w-4" />
                Pending Payments
                <Badge variant="secondary" className="ml-1 text-xs">{pendingEntries.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Payment History
                <Badge variant="outline" className="ml-1 text-xs">{historyEntries.length}</Badge>
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


            <TabsContent value="pending" className="flex-1 flex flex-col mt-0 h-full">
              <Card className="shadow-none border flex-1 flex flex-col h-full bg-white">
                <CardHeader className="py-3 px-4 border-b">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center text-base">
                        Pending Entries ({pendingEntries.length})
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs">
                        POs waiting for Payment (Planned5 set, Actual5 empty)
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {someSelected && (
                        <Button
                          onClick={handleSubmitSelected}
                          disabled={Object.values(processingEntries).some(v => v)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {Object.values(processingEntries).some(v => v) ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Submit Selected ({Object.values(selectedEntries).filter(v => v).length})
                            </>
                          )}
                        </Button>
                      )}
                      <ColumnVisibilityToggle />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-hidden h-full">
                  {loading && pendingEntries.length === 0 ? (
                    <div className="flex h-40 items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-purple-600" /> Loading...
                    </div>
                  ) : (
                    renderTable(pendingEntries, false)
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="flex-1 flex flex-col mt-0 h-full">
              <Card className="shadow-none border flex-1 flex flex-col h-full bg-white">
                <CardHeader className="py-3 px-4 border-b">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center text-base">
                        Payment History ({historyEntries.length})
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs">
                        Completed payments (Planned5 and Actual5 set)
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <ColumnVisibilityToggle />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-hidden h-full">
                  {loading && historyEntries.length === 0 ? (
                    <div className="flex h-40 items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-purple-600" /> Loading...
                    </div>
                  ) : (
                    renderTable(historyEntries, true)
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}