"use client";

import React, { useState, useEffect, useContext, useMemo, useCallback } from "react";
import {
  Users,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Download,
  Loader2,
  FileText,
  Truck,
  ExternalLink,
  ShieldCheck,
  Building2,
  Calendar,
  X,
  Phone,
  ArrowRight,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "../supabase";
import { AuthContext } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { canViewFirm } from "../utils/firmFilter";
import { usePagination } from "../hooks/usePagination";
import { PaginationControls } from "@/components/ui/pagination";

const CRM_STATUS_OPTIONS = [
  "Approved",
  "Rejected",
];

const formatTimestamp = (dateValue) => {
  if (!dateValue) return "N/A";
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

const formatDateOnly = (dateValue) => {
  if (!dateValue) return "N/A";
  try {
    const d = new Date(dateValue);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }
  } catch (e) {
    return String(dateValue);
  }
  return String(dateValue);
};

export default function CrmPage() {
  const { user, isReadOnly, isSuperAdmin } = useContext(AuthContext);
  const { updateCount } = useNotification();

  const [liftsData, setLiftsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    firmName: "all",
    vendorName: "all",
    materialName: "all",
    transporterName: "all",
    crmStatus: "all",
  });
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  // CRM Action Modal state
  const [selectedLift, setSelectedLift] = useState(null);
  const [siblingLifts, setSiblingLifts] = useState([]);
  const [applyToSiblings, setApplyToSiblings] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    crmStatus: "Approved",
    etaDate: "",
    remarks: "",
  });

  const pendingPagination = usePagination(50);
  const historyPagination = usePagination(50);

  // Fetch Lift Accounts Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data, error: fetchError }, { data: poData, error: poError }] =
        await Promise.all([
          supabase
            .from("LIFT-ACCOUNTS")
            .select("*")
            .order("id", { ascending: false }),
          supabase
            .from("INDENT-PO")
            .select('"Indent Id.", po_number, "Firm Name"'),
        ]);

      if (fetchError) throw fetchError;
      if (poError) console.warn("Failed to load PO map:", poError);

      const indentToPoMap = {};
      (poData || []).forEach((row) => {
        const indent = String(row["Indent Id."] || "").trim();
        const po = String(row.po_number || indent).trim();
        if (indent) indentToPoMap[indent] = po;
      });

      const processed = (data || []).map((row) => {
        const indentKey = String(row["Indent no."] || "").trim();
        const resolvedPo = indentToPoMap[indentKey] || indentKey;

        // CRM is considered completed if CRM Date is populated, or if already received (Actual 1 exists)
        const isCrmCompleted = Boolean(row["CRM Date"] || row["Actual 1"] || row["Actual 4"]);
        const crmStatus = row["CRM Status"] || row["Delay 4"] || (row["Actual 1"] ? "Direct / Auto-Cleared" : "Pending");
        const crmRemarks = String(row["CRM Remarks"] || "").trim();
        const crmBy = String(row["CRM By"] || "").trim();

        return {
          _dbId: row.id,
          id: String(row["Lift No"] || "").trim(),
          liftNo: String(row["Lift No"] || "").trim(),
          timestamp: row["Timestamp"] || "",
          timestampFormatted: formatTimestamp(row["Timestamp"]),
          indentNo: resolvedPo,
          riNo: indentKey,
          firmName: String(row["Firm Name"] || "").trim(),
          vendorName: String(row["Vendor Name"] || "").trim(),
          material: String(row["Raw Material Name"] || "").trim(),
          poQty: String(row["Qty"] || "").trim(),
          liftingQty: String(row["Lifting Qty"] || "").trim(),
          rate: String(row["Rate"] || "").trim(),
          billNo: String(row["Bill No."] || "").trim(),
          dateOfBill: String(row["Date Of Bill"] || "").trim(),
          truckNo: String(row["Truck No."] || "").trim(),
          driverNo: String(row["Driver No."] || "").trim(),
          transporterName: String(row["Transporter Name"] || "").trim(),
          biltyNo: String(row["Bilty No."] || "").trim(),
          billImage: String(row["Bill Image"] || "").trim(),
          biltyImage: String(row["Bilty Image"] || "").trim(),
          areaLifting: String(row["Area lifting"] || "").trim(),
          leadTime: String(row["Lead Time To Reach Factory (days)"] || "").trim(),
          // CRM Dedicated Fields
          crmPlanned: row["Planned 4"] || row["Timestamp"],
          crmActual: row["CRM Date"] || row["Actual 4"],
          crmActualFormatted: formatTimestamp(row["CRM Date"] || row["Actual 4"]),
          crmStatus: crmStatus,
          crmRemarks: crmRemarks,
          crmBy: crmBy,
          isCrmCompleted: isCrmCompleted,
          // Downstream Receipt & Lab flags
          actual1: row["Actual 1"],
          planned1: row["Planned 1"],
        };
      });

      // Filter by Firm Access
      let firmFiltered = processed;
      if (user?.firmName) {
        firmFiltered = processed.filter(
          (lift) => lift && canViewFirm(user.firmName, lift.firmName),
        );
      }

      setLiftsData(firmFiltered);
    } catch (err) {
      console.error("Error loading CRM lifts data:", err);
      setError(`Failed to load CRM data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update notification count for CRM
  useEffect(() => {
    const pendingCount = liftsData.filter((lift) => !lift.isCrmCompleted).length;
    updateCount("crm", pendingCount);
  }, [liftsData, updateCount]);

  // Reset to first page whenever filters/search/date range change, so a
  // narrowed result set never leaves pagination stuck on a now-empty page
  useEffect(() => {
    pendingPagination.resetPage();
    historyPagination.resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, searchQuery, dateRange]);

  // Filter options
  const filterOptions = useMemo(() => {
    const firms = new Set();
    const vendors = new Set();
    const materials = new Set();
    const transporters = new Set();

    liftsData.forEach((row) => {
      if (row.firmName) firms.add(row.firmName);
      if (row.vendorName) vendors.add(row.vendorName);
      if (row.material) materials.add(row.material);
      if (row.transporterName) transporters.add(row.transporterName);
    });

    return {
      firmName: [...firms].sort(),
      vendorName: [...vendors].sort(),
      materialName: [...materials].sort(),
      transporterName: [...transporters].sort(),
    };
  }, [liftsData]);

  // Filter helper
  const isWithinDateRange = (dateStr, range) => {
    if (!range.from && !range.to) return true;
    if (!dateStr) return false;
    const itemDate = new Date(dateStr);
    if (isNaN(itemDate.getTime())) return false;

    if (range.from) {
      const fromDate = new Date(range.from);
      fromDate.setHours(0, 0, 0, 0);
      if (itemDate < fromDate) return false;
    }
    if (range.to) {
      const toDate = new Date(range.to);
      toDate.setHours(23, 59, 59, 999);
      if (itemDate > toDate) return false;
    }
    return true;
  };

  const filterRows = (rows, isPendingTab) => {
    return rows.filter((row) => {
      if (isPendingTab ? row.isCrmCompleted : !row.isCrmCompleted) return false;

      if (filters.firmName !== "all" && row.firmName !== filters.firmName)
        return false;
      if (filters.vendorName !== "all" && row.vendorName !== filters.vendorName)
        return false;
      if (filters.materialName !== "all" && row.material !== filters.materialName)
        return false;
      if (
        filters.transporterName !== "all" &&
        row.transporterName !== filters.transporterName
      )
        return false;
      if (filters.crmStatus !== "all" && row.crmStatus !== filters.crmStatus)
        return false;

      if (
        !isWithinDateRange(
          isPendingTab ? row.dateOfBill || row.timestamp : row.crmActual || row.timestamp,
          dateRange,
        )
      ) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          (row.id && row.id.toLowerCase().includes(q)) ||
          (row.indentNo && row.indentNo.toLowerCase().includes(q)) ||
          (row.riNo && row.riNo.toLowerCase().includes(q)) ||
          (row.firmName && row.firmName.toLowerCase().includes(q)) ||
          (row.vendorName && row.vendorName.toLowerCase().includes(q)) ||
          (row.material && row.material.toLowerCase().includes(q)) ||
          (row.truckNo && row.truckNo.toLowerCase().includes(q)) ||
          (row.driverNo && row.driverNo.toLowerCase().includes(q)) ||
          (row.transporterName && row.transporterName.toLowerCase().includes(q)) ||
          (row.billNo && row.billNo.toLowerCase().includes(q)) ||
          (row.crmStatus && row.crmStatus.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  };

  const pendingLifts = useMemo(
    () => filterRows(liftsData, true),
    [liftsData, filters, searchQuery, dateRange],
  );

  const historyLifts = useMemo(
    () => filterRows(liftsData, false),
    [liftsData, filters, searchQuery, dateRange],
  );

  const paginatedPending = useMemo(() => {
    return pendingLifts.slice(pendingPagination.from, pendingPagination.to + 1);
  }, [pendingLifts, pendingPagination.from, pendingPagination.to]);

  const paginatedHistory = useMemo(() => {
    return historyLifts.slice(historyPagination.from, historyPagination.to + 1);
  }, [historyLifts, historyPagination.from, historyPagination.to]);

  // Handle Open CRM Action Modal
  const handleOpenActionModal = (lift) => {
    setSelectedLift(lift);

    // Find any other pending products with same Bill No + Truck No
    if (lift.billNo && lift.truckNo) {
      const siblings = liftsData.filter(
        (item) =>
          !item.isCrmCompleted &&
          item._dbId !== lift._dbId &&
          item.billNo === lift.billNo &&
          item.truckNo === lift.truckNo,
      );
      setSiblingLifts(siblings);
      setApplyToSiblings(siblings.length > 0);
    } else {
      setSiblingLifts([]);
      setApplyToSiblings(false);
    }

    setFormData({
      crmStatus: lift.crmStatus === "Rejected" ? "Rejected" : "Approved",
      etaDate: "",
      remarks: lift.crmRemarks || "",
    });
    setIsModalOpen(true);
  };

  // Submit CRM Action
  const handleSubmitCrm = async () => {
    if (!selectedLift) return;
    setIsSubmitting(true);

    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

      // Target row IDs to update
      const targetIds = [selectedLift._dbId];
      if (applyToSiblings && siblingLifts.length > 0) {
        siblingLifts.forEach((s) => targetIds.push(s._dbId));
      }

      const updatePayload = {
        "CRM Date": timestamp,
        "CRM Status": formData.crmStatus,
        "CRM Remarks": formData.remarks.trim() || null,
        "CRM By": user?.username || user?.name || "CRM User",
      };

      const { error: updateError } = await supabase
        .from("LIFT-ACCOUNTS")
        .update(updatePayload)
        .in("id", targetIds);

      if (updateError) throw updateError;

      if (formData.crmStatus === "Approved") {
        toast.success(
          `✅ CRM Approved for ${targetIds.length} item(s)! Sent to Receipt Check.`,
        );
      } else {
        toast.error(
          `❌ CRM Rejected for ${targetIds.length} item(s). Moved to CRM History.`,
        );
      }
      setIsModalOpen(false);
      await fetchData();
    } catch (err) {
      console.error("Error saving CRM review:", err);
      toast.error(`❌ Failed to update CRM review: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export CSV
  const handleExportCSV = (dataToExport, filename) => {
    if (!dataToExport.length) {
      toast.error("No data available to export.");
      return;
    }

    const headers = [
      "Lift Number",
      "Lifted Timestamp",
      "PO Number",
      "RI Number",
      "Firm Name",
      "Vendor Name",
      "Product Name",
      "Lifting Quantity",
      "PO Quantity",
      "Rate",
      "Bill No.",
      "Date Of Bill",
      "Truck No.",
      "Driver No.",
      "Transporter Name",
      "Bilty No.",
      "CRM Status",
      "CRM Completion Date",
      "CRM Remarks",
    ];

    const csvRows = [headers.join(",")];

    dataToExport.forEach((row) => {
      const values = [
        `"${row.id || ""}"`,
        `"${row.timestampFormatted || ""}"`,
        `"${row.indentNo || ""}"`,
        `"${row.riNo || ""}"`,
        `"${row.firmName || ""}"`,
        `"${row.vendorName || ""}"`,
        `"${row.material || ""}"`,
        `"${row.liftingQty || ""}"`,
        `"${row.poQty || ""}"`,
        `"${row.rate || ""}"`,
        `"${row.billNo || ""}"`,
        `"${row.dateOfBill || ""}"`,
        `"${row.truckNo || ""}"`,
        `"${row.driverNo || ""}"`,
        `"${row.transporterName || ""}"`,
        `"${row.biltyNo || ""}"`,
        `"${row.crmStatus || ""}"`,
        `"${row.crmActualFormatted || ""}"`,
        `"${(row.crmRemarks || "").replace(/"/g, '""')}"`,
      ];
      csvRows.push(values.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${dataToExport.length} records.`);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Approved":
      case "Direct / Auto-Cleared":
        return <Badge className="bg-green-600 hover:bg-green-700 text-white font-medium">Approved</Badge>;
      case "Rejected":
        return <Badge className="bg-red-600 hover:bg-red-700 text-white font-medium">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status || "Pending"}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-[98%]">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-50 rounded-xl text-[#7da23a]">
            <Users className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              CRM Dispatch & Tracking
            </h1>
            <p className="text-sm text-gray-500">
              Verify lifted materials, track transit status, and authorize receipt at factory.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              handleExportCSV(
                activeTab === "pending" ? pendingLifts : historyLifts,
                activeTab === "pending" ? "CRM_Pending_Lifts" : "CRM_History_Lifts",
              )
            }
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="bg-[#7da23a] hover:bg-[#6b8e2f] text-white flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="shadow-sm border-gray-200 bg-white">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Search */}
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search Lift No, PO, Vendor, Truck No..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            {/* Firm Filter */}
            <div>
              <Select
                value={filters.firmName}
                onValueChange={(val) => setFilters((p) => ({ ...p, firmName: val }))}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="All Firms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Firms</SelectItem>
                  {filterOptions.firmName.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Vendor Filter */}
            <div>
              <Select
                value={filters.vendorName}
                onValueChange={(val) => setFilters((p) => ({ ...p, vendorName: val }))}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="All Vendors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {filterOptions.vendorName.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Material Filter */}
            <div>
              <Select
                value={filters.materialName}
                onValueChange={(val) => setFilters((p) => ({ ...p, materialName: val }))}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="All Materials" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Materials</SelectItem>
                  {filterOptions.materialName.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Transporter Filter */}
            <div>
              <Select
                value={filters.transporterName}
                onValueChange={(val) => setFilters((p) => ({ ...p, transporterName: val }))}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="All Transporters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Transporters</SelectItem>
                  {filterOptions.transporterName.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Range & Clear */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Date Range:</span>
              <Input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange((p) => ({ ...p, from: e.target.value }))}
                className="text-xs h-8 w-40 pr-2 [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:ml-1"
              />
              <span className="text-xs text-gray-400">to</span>
              <Input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange((p) => ({ ...p, to: e.target.value }))}
                className="text-xs h-8 w-40 pr-2 [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:ml-1"
              />
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setFilters({
                  firmName: "all",
                  vendorName: "all",
                  materialName: "all",
                  transporterName: "all",
                  crmStatus: "all",
                });
                setDateRange({ from: "", to: "" });
              }}
              className="text-xs text-gray-500 hover:text-gray-900"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs View */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white border border-gray-200 p-1">
          <TabsTrigger
            value="pending"
            className="data-[state=active]:bg-[#7da23a] data-[state=active]:text-white font-medium flex items-center gap-2"
          >
            <Clock className="h-4 w-4" />
            Pending CRM Review
            <Badge
              variant="secondary"
              className="ml-1 bg-amber-100 text-amber-800 hover:bg-amber-100"
            >
              {pendingLifts.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="data-[state=active]:bg-[#7da23a] data-[state=active]:text-white font-medium flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            CRM Processed History
            <Badge
              variant="secondary"
              className="ml-1 bg-green-100 text-green-800 hover:bg-green-100"
            >
              {historyLifts.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Pending CRM */}
        <TabsContent value="pending" className="m-0 space-y-4">
          <Card className="shadow-sm border-gray-200">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-[#7da23a]" />
                  <p className="text-sm text-gray-500">Loading pending CRM lifts...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <AlertTriangle className="h-10 w-10 text-red-500 mb-2" />
                  <p className="text-sm font-semibold text-red-700">{error}</p>
                </div>
              ) : pendingLifts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mb-2" />
                  <h3 className="text-lg font-semibold text-gray-800">All Caught Up!</h3>
                  <p className="text-sm text-gray-500 max-w-md mt-1">
                    No lifted materials currently awaiting CRM review or clearance.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="text-xs">
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-bold text-gray-700 whitespace-nowrap">
                          Action
                        </TableHead>
                        <TableHead className="font-bold text-gray-700 whitespace-nowrap">
                          Lift No
                        </TableHead>
                        <TableHead className="font-bold text-gray-700 whitespace-nowrap">
                          Lifted Date
                        </TableHead>
                        <TableHead className="font-bold text-gray-700 whitespace-nowrap">
                          PO Number
                        </TableHead>
                        <TableHead className="font-bold text-gray-700 whitespace-nowrap">
                          RI Number
                        </TableHead>
                        <TableHead className="font-bold text-gray-700 whitespace-nowrap">
                          Firm Name
                        </TableHead>
                        <TableHead className="font-bold text-gray-700 whitespace-nowrap">
                          Vendor Name
                        </TableHead>
                        <TableHead className="font-bold text-gray-700 whitespace-nowrap">
                          Product Name
                        </TableHead>
                        <TableHead className="font-bold text-gray-700 whitespace-nowrap">
                          Billing Qty
                        </TableHead>
                        <TableHead className="font-bold text-gray-700 whitespace-nowrap">
                          Rate
                        </TableHead>
                        <TableHead className="font-bold text-gray-700 whitespace-nowrap">
                          Bill No.
                        </TableHead>
                        <TableHead className="font-bold text-gray-700 whitespace-nowrap">
                          Date Of Bill
                        </TableHead>
                        <TableHead className="font-bold text-gray-700 whitespace-nowrap">
                          Truck No.
                        </TableHead>
                        <TableHead className="font-bold text-gray-700 whitespace-nowrap">
                          Driver No.
                        </TableHead>
                        <TableHead className="font-bold text-gray-700 whitespace-nowrap">
                          Transporter Name
                        </TableHead>
                        <TableHead className="font-bold text-gray-700 whitespace-nowrap">
                          Bilty No.
                        </TableHead>
                        <TableHead className="font-bold text-gray-700 whitespace-nowrap">
                          Documents
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedPending.map((row) => (
                        <TableRow key={row._dbId} className="hover:bg-slate-50">
                          <TableCell className="whitespace-nowrap py-2">
                            <Button
                              size="sm"
                              onClick={() => handleOpenActionModal(row)}
                              className="bg-[#7da23a] hover:bg-[#6b8e2f] text-white text-xs h-7 px-2.5 flex items-center gap-1 shadow-sm"
                            >
                              Confirm / Forward
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </TableCell>
                          <TableCell className="font-semibold text-gray-900 whitespace-nowrap">
                            {row.id}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-gray-600">
                            {row.timestampFormatted}
                          </TableCell>
                          <TableCell className="font-medium text-blue-700 whitespace-nowrap">
                            {row.indentNo}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-gray-600">
                            {row.riNo}
                          </TableCell>
                          <TableCell className="font-medium whitespace-nowrap">
                            {row.firmName}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{row.vendorName}</TableCell>
                          <TableCell className="font-medium whitespace-nowrap">
                            {row.material}
                          </TableCell>
                          <TableCell className="font-bold text-[#7da23a] whitespace-nowrap">
                            {row.liftingQty}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">₹{row.rate}</TableCell>
                          <TableCell className="whitespace-nowrap">{row.billNo}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatDateOnly(row.dateOfBill)}
                          </TableCell>
                          <TableCell className="font-mono font-medium whitespace-nowrap">
                            {row.truckNo}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{row.driverNo}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {row.transporterName}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{row.biltyNo || "-"}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {row.billImage ? (
                                <a
                                  href={row.billImage}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center gap-0.5"
                                >
                                  Bill <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                              {row.biltyImage && (
                                <a
                                  href={row.biltyImage}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-purple-600 hover:underline flex items-center gap-0.5"
                                >
                                  Bilty <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          {pendingLifts.length > 0 && (
            <PaginationControls
              page={pendingPagination.page}
              pageSize={pendingPagination.pageSize}
              totalRows={pendingLifts.length}
              onPageChange={pendingPagination.setPage}
              onPageSizeChange={pendingPagination.setPageSize}
              pageSizeOptions={[50, 100, 500]}
            />
          )}
        </TabsContent>

        {/* Tab 2: CRM History */}
        <TabsContent value="history" className="m-0 space-y-4">
          <Card className="shadow-sm border-gray-200">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-[#7da23a]" />
                  <p className="text-sm text-gray-500">Loading CRM history...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <AlertTriangle className="h-10 w-10 text-red-500 mb-2" />
                  <p className="text-sm font-semibold text-red-700">{error}</p>
                </div>
              ) : historyLifts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
                  <p className="text-sm">No processed CRM records match the filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="text-xs">
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-bold text-gray-700 whitespace-nowrap">
                          Lift No
                        </TableHead>
                        <TableHead className="font-bold text-gray-700 whitespace-nowrap">
                          CRM Status
                        </TableHead>
                        <TableHead className="font-bold text-gray-700 whitespace-nowrap">
                          CRM Cleared On
                        </TableHead>
                        <TableHead className="font-bold text-gray-700 whitespace-nowrap">
                          PO Number
                        </TableHead>
                        <TableHead className="font-bold text-gray-700 whitespace-nowrap">
                          Firm Name
                        </TableHead>
                        <TableHead className="font-bold text-gray-700 whitespace-nowrap">
                          Vendor Name
                        </TableHead>
                        <TableHead className="font-bold text-gray-700 whitespace-nowrap">
                          Product Name
                        </TableHead>
                        <TableHead className="font-bold text-gray-700 whitespace-nowrap">
                          Billing Qty
                        </TableHead>
                        <TableHead className="font-bold text-gray-700 whitespace-nowrap">
                          Bill No.
                        </TableHead>
                        <TableHead className="font-bold text-gray-700 whitespace-nowrap">
                          Truck No.
                        </TableHead>
                        <TableHead className="font-bold text-gray-700 whitespace-nowrap">
                          Transporter
                        </TableHead>
                        <TableHead className="font-bold text-gray-700 whitespace-nowrap">
                          CRM Remarks
                        </TableHead>
                        <TableHead className="font-bold text-gray-700 whitespace-nowrap">
                          Documents
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedHistory.map((row) => (
                        <TableRow key={row._dbId} className="hover:bg-slate-50">
                          <TableCell className="font-semibold text-gray-900 whitespace-nowrap">
                            {row.id}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {getStatusBadge(row.crmStatus)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-gray-600">
                            {row.crmActualFormatted || formatTimestamp(row.timestamp)}
                          </TableCell>
                          <TableCell className="font-medium text-blue-700 whitespace-nowrap">
                            {row.indentNo}
                          </TableCell>
                          <TableCell className="font-medium whitespace-nowrap">
                            {row.firmName}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{row.vendorName}</TableCell>
                          <TableCell className="font-medium whitespace-nowrap">
                            {row.material}
                          </TableCell>
                          <TableCell className="font-bold text-[#7da23a] whitespace-nowrap">
                            {row.liftingQty}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{row.billNo}</TableCell>
                          <TableCell className="font-mono font-medium whitespace-nowrap">
                            {row.truckNo}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {row.transporterName}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-gray-600">
                            {row.crmRemarks || "-"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {row.billImage ? (
                                <a
                                  href={row.billImage}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center gap-0.5"
                                >
                                  Bill <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                              {row.biltyImage && (
                                <a
                                  href={row.biltyImage}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-purple-600 hover:underline flex items-center gap-0.5"
                                >
                                  Bilty <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          {historyLifts.length > 0 && (
            <PaginationControls
              page={historyPagination.page}
              pageSize={historyPagination.pageSize}
              totalRows={historyLifts.length}
              onPageChange={historyPagination.setPage}
              onPageSizeChange={historyPagination.setPageSize}
              pageSizeOptions={[50, 100, 500]}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* CRM Action Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <Users className="h-5 w-5 text-[#7da23a]" />
              CRM Dispatch Review & Clearance
            </DialogTitle>
            <DialogDescription>
              Review lift details, update transit tracking, and approve to forward to Receipt Check.
            </DialogDescription>
          </DialogHeader>

          {selectedLift && (
            <div className="space-y-4 py-2">
              {/* Summary Cards */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-gray-500 block">Lift ID:</span>
                  <span className="font-bold text-gray-900">{selectedLift.id}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">PO Number:</span>
                  <span className="font-bold text-blue-700">{selectedLift.indentNo}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Firm Name:</span>
                  <span className="font-medium text-gray-900">{selectedLift.firmName}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Vendor / Party:</span>
                  <span className="font-medium text-gray-900">{selectedLift.vendorName}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Product:</span>
                  <span className="font-medium text-gray-900">{selectedLift.material}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Billing Qty:</span>
                  <span className="font-bold text-[#7da23a]">{selectedLift.liftingQty} MT</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Truck No:</span>
                  <span className="font-mono font-bold text-gray-900">{selectedLift.truckNo}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Driver Mobile:</span>
                  <span className="font-mono text-gray-800">{selectedLift.driverNo || "N/A"}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Transporter:</span>
                  <span className="text-gray-800">{selectedLift.transporterName || "N/A"}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Bill No & Date:</span>
                  <span className="text-gray-800">
                    {selectedLift.billNo} ({formatDateOnly(selectedLift.dateOfBill)})
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Bilty No:</span>
                  <span className="text-gray-800">{selectedLift.biltyNo || "N/A"}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Documents:</span>
                  <div className="flex gap-2 font-medium">
                    {selectedLift.billImage && (
                      <a
                        href={selectedLift.billImage}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Bill
                      </a>
                    )}
                    {selectedLift.biltyImage && (
                      <a
                        href={selectedLift.biltyImage}
                        target="_blank"
                        rel="noreferrer"
                        className="text-purple-600 hover:underline"
                      >
                        Bilty
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Sibling items alert */}
              {siblingLifts.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs space-y-2">
                  <p className="font-semibold text-amber-900 flex items-center gap-1.5">
                    <Truck className="h-4 w-4" /> Multi-Product Delivery Detected:
                  </p>
                  <p className="text-amber-800">
                    Found {siblingLifts.length} other pending product(s) on the same Truck (
                    {selectedLift.truckNo}) and Bill No ({selectedLift.billNo}):
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5 text-amber-900">
                    {siblingLifts.map((s) => (
                      <li key={s._dbId}>
                        {s.id}: <b>{s.material}</b> ({s.liftingQty} MT)
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-2 pt-1">
                    <Checkbox
                      id="applySiblings"
                      checked={applyToSiblings}
                      onCheckedChange={setApplyToSiblings}
                    />
                    <label
                      htmlFor="applySiblings"
                      className="cursor-pointer text-amber-900 font-medium select-none"
                    >
                      Apply this CRM clearance to all {siblingLifts.length + 1} products on this truck
                    </label>
                  </div>
                </div>
              )}

              {/* Form Controls */}
              <div className="space-y-3 pt-2">
                <div>
                  <Label className="text-xs font-semibold text-gray-700">
                    CRM Status<span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.crmStatus}
                    onValueChange={(val) => setFormData((p) => ({ ...p, crmStatus: val }))}
                  >
                    <SelectTrigger className="text-xs h-9 mt-1">
                      <SelectValue placeholder="Select CRM Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {CRM_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700">
                    CRM Remarks
                  </Label>
                  <Textarea
                    placeholder="Enter Remarks here..."
                    value={formData.remarks}
                    onChange={(e) => setFormData((p) => ({ ...p, remarks: e.target.value }))}
                    className="text-xs mt-1 min-h-[80px]"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-3 flex sm:justify-between items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitCrm}
              disabled={isSubmitting}
              className={
                formData.crmStatus === "Rejected"
                  ? "bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
                  : "bg-[#7da23a] hover:bg-[#6b8e2f] text-white flex items-center gap-2"
              }
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : formData.crmStatus === "Rejected" ? (
                <X className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {formData.crmStatus === "Rejected"
                ? "Reject & Save to History"
                : "Approve & Forward to Receipt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
