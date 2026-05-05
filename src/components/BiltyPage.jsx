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
import { supabase } from "../supabase";
import { uploadFileToStorage } from "../utils/storageUtils";
import { useRealtime } from "../hooks/useRealtime";

// --- Column Definitions for Tables ---
const PENDING_BILTY_COLUMNS_META = [
  { header: "Actions", dataKey: "actionColumn", toggleable: false, alwaysVisible: true },
  { header: "Lift ID", dataKey: "id", toggleable: true, alwaysVisible: true },
  { header: "Planned Date", dataKey: "planned3", toggleable: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "Vendor Name", dataKey: "vendorName", toggleable: true },
  { header: "Product Name", dataKey: "rawMaterialName", toggleable: true },
];

const BILTY_HISTORY_COLUMNS_META = [
  { header: "Lift ID", dataKey: "id", toggleable: true, alwaysVisible: true },
  { header: "Timestamp", dataKey: "timestamp", toggleable: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "Vendor Name", dataKey: "vendorName", toggleable: true },
  { header: "Product Name", dataKey: "rawMaterialName", toggleable: true },
  { header: "Bilty Number", dataKey: "biltyNumber", toggleable: true },
  { header: "Bilty Image", dataKey: "biltyImageUrl", isLink: true, linkText: "View Bilty" },
];

export default function BiltyPage() {
  const { user } = useContext(AuthContext);
  const [liftData, setLiftData] = useState([]);
  const [selectedLift, setSelectedLift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [error, setError] = useState(null);

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
      const { data, error: fetchError } = await supabase
        .from("LIFT-ACCOUNTS")
        .select("*")
        .order("Timestamp", { ascending: false });

      if (fetchError) throw fetchError;

      const formatTimestamp = (dateValue) => {
        if (!dateValue) return "";
        try {
          const d = new Date(dateValue);
          if (!isNaN(d.getTime())) {
            return d.toLocaleString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            }).replace(/,/g, "");
          }
        } catch (e) {
          return String(dateValue);
        }
        return String(dateValue);
      };

      let processedRawRows = (data || []).map((row) => {
        return {
          _id: `lift-${row.id}-${row["Lift No"] || ''}`,
          _dbId: row.id,
          id: String(row["Lift No"] || "").trim(),
          vendorName: String(row["Vendor Name"] || "").trim(),
          rawMaterialName: String(row["Raw Material Name"] || "").trim(),
          liftType: String(row["Type"] || "").trim(),
          originalQty: String(row["Qty"] || "").trim(),
          totalBillQuantity: String(row["Total Bill Quantity"] || "").trim(),
          actualQty: String(row["Actual Quantity"] || "").trim(),
          indentNo: String(row["Indent no."] || "").trim(),
          billNo: String(row["Bill No."] || "").trim(),
          firmName: String(row["Firm Name"] || "").trim(),
          unloadApprovalRequired: String(row["Unload Approval Required"] || "").trim(),
          unloadApprovalStatus: String(row["Unload Approval Status"] || "").trim(),
          planned3: formatTimestamp(row["Planned 3"]),
          isPending: row["Planned 3"] && !row["Actual 3"] && !row["Bilty No."] &&
                    (String(row["Unload Approval Required"] || "").trim().toLowerCase() !== "yes" ||
                     String(row["Unload Approval Status"] || "").trim().toLowerCase() === "approved"),
          isHistory: row["Planned 3"] && (row["Actual 3"] || row["Bilty No."]),
          biltyNumber: String(row["Bilty No."] || "").trim(),
          biltyImageUrl: String(row["Bilty Image"] || "").trim(),
          timestamp: formatTimestamp(row["Actual 3"]),
        };
      }).filter(row => row && row.id);

      if (user?.firmName && String(user.firmName).toLowerCase() !== "all") {
        const userFirmNameLower = String(user.firmName).toLowerCase();
        processedRawRows = processedRawRows.filter(
          (lift) => lift.firmName && String(lift.firmName).toLowerCase() === userFirmNameLower,
        );
      }

      setLiftData(processedRawRows);
    } catch (err) {
      console.error("Error fetching lift data:", err);
      setError(`Failed to load lifts data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLiftData();
  }, [fetchLiftData]);

  useRealtime(["LIFT-ACCOUNTS"], () => {
    console.log("[Realtime] Bilty Page refreshing due to LIFT-ACCOUNTS table change");
    fetchLiftData();
  });

  const pendingBilty = useMemo(() => {
    let filtered = liftData.filter(lift => lift.isPending);
    if (filters.vendorName !== "all") filtered = filtered.filter(lift => lift.vendorName === filters.vendorName);
    if (filters.materialName !== "all") filtered = filtered.filter(lift => lift.rawMaterialName === filters.materialName);
    if (filters.liftType !== "all") filtered = filtered.filter(lift => lift.liftType === filters.liftType);
    if (filters.orderNumber !== "all") filtered = filtered.filter(lift => lift.indentNo === filters.orderNumber || lift.billNo === filters.orderNumber);
    return filtered;
  }, [liftData, filters]);

  const biltyHistory = useMemo(() => {
    let filtered = liftData.filter(lift => lift.isHistory);
    if (filters.vendorName !== "all") filtered = filtered.filter(lift => lift.vendorName === filters.vendorName);
    if (filters.materialName !== "all") filtered = filtered.filter(lift => lift.rawMaterialName === filters.materialName);
    if (filters.liftType !== "all") filtered = filtered.filter(lift => lift.liftType === filters.liftType);
    if (filters.orderNumber !== "all") filtered = filtered.filter(lift => lift.indentNo === filters.orderNumber || lift.billNo === filters.orderNumber);
    return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [liftData, filters]);

  const uniqueFilterOptions = useMemo(() => {
    const vendors = new Set();
    const materials = new Set();
    const types = new Set();
    const orders = new Set();

    liftData.forEach(lift => {
      if (lift.vendorName) vendors.add(lift.vendorName);
      if (lift.rawMaterialName) materials.add(lift.rawMaterialName);
      if (lift.liftType) types.add(lift.liftType);
      if (lift.indentNo) orders.add(lift.indentNo);
      if (lift.billNo) orders.add(lift.billNo);
    });

    return {
      vendorName: [...vendors].sort(),
      materialName: [...materials].sort(),
      liftType: [...types].sort(),
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

  const uploadFileToSupabase = async (file) => {
    if (!file || !(file instanceof File)) throw new Error("Invalid file provided.");
    try {
      const { url } = await uploadFileToStorage(file, 'image', 'bilty-images');
      return url;
    } catch (error) {
      console.error("Error uploading bilty image:", error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "biltyImageFile") {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: null }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.biltyNumber.trim()) newErrors.biltyNumber = "Bilty Number is required.";
    if (!formData.biltyImageFile && !selectedLift?.biltyImageUrl) newErrors.biltyImageFile = "Bilty Image is required.";
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm() || !selectedLift) return;
    
    setIsSubmitting(true);
    const toastId = toast.loading("Submitting Bilty details...");

    try {
      let biltyImageUrl = selectedLift.biltyImageUrl || "";
      if (formData.biltyImageFile) {
        biltyImageUrl = await uploadFileToSupabase(formData.biltyImageFile);
      }

      const now = new Date();
      const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);

      const updateData = {
        "Actual 3": timestamp,
        "Bilty No.": formData.biltyNumber,
        "Bilty Image": biltyImageUrl,
      };

      const { error: updateError } = await supabase
        .from("LIFT-ACCOUNTS")
        .update(updateData)
        .eq("id", selectedLift._dbId);

      if (updateError) throw updateError;

      toast.success("Bilty submitted successfully!", { id: toastId });
      fetchLiftData();
      handleClosePopup();
    } catch (error) {
      console.error("Error submitting bilty:", error);
      toast.error(`Submission Failed: ${error.message}`, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCell = (item, column) => {
    const value = item[column.dataKey];
    if (column.isLink) {
      return value && String(value).startsWith("http") ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-[#7da23a] hover:text-green-800 hover:underline font-medium text-xs inline-flex items-center gap-1">
          <ExternalLink className="h-3 w-3" />{column.linkText || "View"}
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
    return (
      <Card className="shadow-sm border border-border flex-1 flex flex-col">
        <CardHeader className="py-3 px-4 bg-muted/30">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center text-md font-semibold text-foreground">
                {tabKey === 'pendingBilty' ? <FileCheck className="h-5 w-5 text-[#7da23a] mr-2" /> : <History className="h-5 w-5 text-[#7da23a] mr-2" />}
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
                          {col.header}
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
          {loading ? (
            <div className="flex flex-col justify-center items-center py-10 flex-1"><Loader2 className="h-8 w-8 text-[#7da23a] animate-spin mb-3" /><p className="text-muted-foreground">Loading...</p></div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-green-200/50 bg-green-50/50 rounded-lg mx-4 my-4 text-center flex-1">
              <Info className="h-12 w-12 text-green-500 mb-3" />
              <p className="font-medium text-foreground">No Data Found</p>
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
                    <TableRow key={item._id} className="hover:bg-green-50/50">
                      {columnsMeta.filter(col => visibilityState[col.dataKey]).map(column => (
                        <TableCell key={column.dataKey} className={`whitespace-nowrap text-xs px-3 py-2 ${column.dataKey === 'id' ? 'font-medium text-primary' : 'text-gray-700'}`}>
                          {column.dataKey === "actionColumn" ? (
                            <Button onClick={() => handleLiftSelect(item)} size="sm" variant="outline" className="text-xs h-7 px-2">Enter Bilty</Button>
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
            <Receipt className="h-5 w-5 text-[#7da23a]" />
            Bilty Page
          </CardTitle>
          <CardDescription className="text-gray-500 text-sm">
            Manage bilty details for material lifts.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full sm:w-[450px] grid-cols-2 mb-4">
              <TabsTrigger value="pendingBilty" className="flex items-center gap-2">
                <FileCheck className="h-4 w-4" /> Pending Bilty
                <Badge variant="secondary" className="ml-1.5">{pendingBilty.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="biltyHistory" className="flex items-center gap-2">
                <History className="h-4 w-4" /> Bilty History
                <Badge variant="secondary" className="ml-1.5">{biltyHistory.length}</Badge>
              </TabsTrigger>
            </TabsList>
            
            <div className="mb-4 p-4 bg-green-50/50 rounded-lg grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select value={filters.vendorName} onValueChange={(value) => handleFilterChange("vendorName", value)}>
                <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="All Vendors" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {uniqueFilterOptions.vendorName.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.materialName} onValueChange={(value) => handleFilterChange("materialName", value)}>
                <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="All Materials" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Materials</SelectItem>
                  {uniqueFilterOptions.materialName.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={clearAllFilters}>Clear Filters</Button>
            </div>

            <TabsContent value="pendingBilty" className="mt-0">
              {renderTableSection("pendingBilty", "Lifts Pending Bilty", "Awaiting Bilty Number and Image.", pendingBilty, PENDING_BILTY_COLUMNS_META, visiblePendingColumns)}
            </TabsContent>
            <TabsContent value="biltyHistory" className="mt-0">
              {renderTableSection("biltyHistory", "Bilty History", "Completed Bilty entries.", biltyHistory, BILTY_HISTORY_COLUMNS_META, visibleHistoryColumns)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={showPopup} onOpenChange={handleClosePopup}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Enter Bilty for {selectedLift?.id}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Bilty Number *</Label>
              <Input name="biltyNumber" value={formData.biltyNumber} onChange={handleInputChange} />
              {formErrors.biltyNumber && <p className="text-red-500 text-xs">{formErrors.biltyNumber}</p>}
            </div>
            <div>
              <Label>Bilty Image *</Label>
              <Input name="biltyImageFile" type="file" onChange={handleInputChange} accept="image/*,.pdf" />
              {formErrors.biltyImageFile && <p className="text-red-500 text-xs">{formErrors.biltyImageFile}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClosePopup}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Bilty"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
