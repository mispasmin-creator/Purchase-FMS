"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CheckCircle2,
  GripVertical,
  History,
  Info,
  Loader2,
  Search,
  Users,
  ArrowRight,
  Zap,
  Award,
  TrendingDown,
  Clock,
  Package,
  DollarSign,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { supabase } from "../supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TECHNICAL_TAGS,
  buildTechnicalTagUpdate,
  getTechnicalAssignments,
  getVendorsFromRow,
} from "../utils/approvalVendorUtils";

const formatDateTime = (isoString) => {
  if (!isoString) return "-";
  const date = new Date(isoString);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const countAssignedTags = (assignments) =>
  Object.values(assignments).filter(Boolean).length;

const getUnassignedVendors = (vendors, assignments) => {
  const assignedSlots = new Set(Object.values(assignments).filter(Boolean));
  return vendors.filter((vendor) => !assignedSlots.has(vendor.slot));
};

// Enhanced VendorCard with better visual design
const VendorCard = ({
  vendor,
  tag,
  isDragging = false,
  isExpanded = false,
}) => {
  const gstNote =
    vendor.rateType === "Basic Rate" && vendor.taxValue !== "0"
      ? `GST ${vendor.taxValue}%`
      : vendor.rateType === "Basic Rate"
        ? "Basic Rate"
        : "With Tax";

  const labMetrics = [
    { label: "Al", value: vendor.alumina, unit: "%" },
    { label: "Fe", value: vendor.iron, unit: "%" },
    { label: "SiO2", value: vendor.sio2, unit: "%" },
    { label: "CaO", value: vendor.cao, unit: "%" },
    { label: "AP", value: vendor.ap, unit: "%" },
    { label: "BD", value: vendor.bd, unit: "%" },
  ].filter((item) => item.value && item.value !== "0");

  const visibleMetrics = isExpanded ? labMetrics : labMetrics.slice(0, 3);

  // Tag styling based on technical category
  const tagStyles = {
    T1: {
      bg: "bg-gradient-to-br from-emerald-50 to-emerald-100/50",
      border: "border-emerald-200",
    },
    T2: {
      bg: "bg-gradient-to-br from-blue-50 to-blue-100/50",
      border: "border-blue-200",
    },
    T3: {
      bg: "bg-gradient-to-br from-amber-50 to-amber-100/50",
      border: "border-amber-200",
    },
  };

  const style = tag
    ? tagStyles[tag] || tagStyles.T1
    : {
        bg: "bg-gradient-to-br from-gray-50 to-gray-100/50",
        border: "border-gray-200",
      };

  return (
    <div
      className={`group relative rounded-xl border-2 p-3 transition-all duration-300 ${
        isDragging
          ? "shadow-lg scale-105 ring-2 ring-offset-2 ring-green-400"
          : "shadow-sm hover:shadow-md"
      } ${style.bg} ${style.border} cursor-grab active:cursor-grabbing hover:border-opacity-60`}
    >
      {/* Decorative accent */}
      <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <GripVertical className="h-3.5 w-3.5 text-gray-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            <p className="truncate text-sm font-semibold text-gray-900">
              {vendor.name}
            </p>
          </div>
          <p className="mt-1 text-xs text-gray-500 truncate">
            {vendor.paymentTerm || "Payment term not set"}
          </p>
        </div>
        {tag && (
          <div className="flex-shrink-0">
            <Badge
              className={`text-[10px] font-semibold whitespace-nowrap ${
                tag === "T1"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : tag === "T2"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-amber-600 hover:bg-amber-700"
              } text-white`}
            >
              {tag}
            </Badge>
          </div>
        )}
      </div>

      {/* Lab Metrics - Enhanced Grid */}
      {labMetrics.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-white/60 p-2 border border-white/80">
          {visibleMetrics.map((item, i) => (
            <div
              key={i}
              className="text-center rounded-md bg-white/80 py-1.5 px-1"
            >
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                {item.label}
              </p>
              <p className="text-xs font-semibold text-gray-900 mt-0.5">
                {item.value}
                <span className="text-[9px] text-gray-600">{item.unit}</span>
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Meta Info - Tags */}
      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1 bg-white/60 px-2.5 py-1 rounded-full text-gray-700 font-medium border border-gray-200/50">
          <DollarSign className="h-3 w-3" />
          {gstNote}
        </span>
        {vendor.packaging && (
          <span className="inline-flex items-center gap-1 bg-white/60 px-2.5 py-1 rounded-full text-gray-700 font-medium border border-gray-200/50">
            <Package className="h-3 w-3" />
            {vendor.packaging}
          </span>
        )}
        {vendor.advancePercentage && (
          <span className="inline-flex items-center gap-1 bg-amber-100 px-2.5 py-1 rounded-full text-amber-800 font-semibold border border-amber-200">
            <Zap className="h-3 w-3" />
            Adv. {vendor.advancePercentage}%
          </span>
        )}
      </div>
    </div>
  );
};

// Enhanced Pending List View
const PendingListView = ({ items, onCategorize }) => {
  const getUrgencyIcon = (plannedDate) => {
    if (!plannedDate) return null;
    const date = new Date(plannedDate);
    const now = new Date();
    const diffDays = (now - date) / (1000 * 60 * 60 * 24);
    if (diffDays > 2) return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (diffDays > 0) return <Clock className="h-4 w-4 text-amber-500" />;
    return null;
  };

  const getUrgencyColor = (plannedDate) => {
    if (!plannedDate) return "bg-gradient-to-r from-gray-50 to-gray-100";
    const date = new Date(plannedDate);
    const now = new Date();
    const diffDays = (now - date) / (1000 * 60 * 60 * 24);
    if (diffDays > 2)
      return "bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-l-red-500";
    if (diffDays > 0)
      return "bg-gradient-to-r from-amber-50 to-amber-100 border-l-4 border-l-amber-500";
    return "bg-gradient-to-r from-gray-50 to-gray-100";
  };

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className={`group relative overflow-hidden rounded-xl border border-gray-200 p-4 transition-all duration-300 hover:shadow-md ${getUrgencyColor(item.planned7)}`}
        >
          {/* Animated gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-green-400/0 via-green-400/0 to-green-400/0 group-hover:from-white/0 group-hover:via-green-50/30 group-hover:to-white/0 transition-all duration-500" />

          <div className="relative flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-shrink-0">
                  {getUrgencyIcon(item.planned7)}
                </div>
                <div>
                  <p className="font-bold text-base text-gray-900 group-hover:text-green-700 transition-colors">
                    {item.indentId}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {item.firmName} • {item.product}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-700">
                  {item.vendors.length}
                </p>
                <p className="text-xs text-gray-500">
                  vendor{item.vendors.length !== 1 ? "s" : ""}
                </p>
              </div>
              <Button
                size="sm"
                className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 h-9 px-4 text-xs font-semibold shadow-sm hover:shadow-md transition-all duration-200 gap-2"
                onClick={() => onCategorize(item)}
              >
                Categorise
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default function FactoryApprovals() {
  const [pendingData, setPendingData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [filteredPendingData, setFilteredPendingData] = useState([]);
  const [filteredHistoryData, setFilteredHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshData, setRefreshData] = useState(false);
  const [selectedIndent, setSelectedIndent] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [draggedSlot, setDraggedSlot] = useState(null);
  const [dragOverTag, setDragOverTag] = useState(null);
  const [dragOverPool, setDragOverPool] = useState(false);
  const [technicalAssignments, setTechnicalAssignments] = useState(
    Object.fromEntries(TECHNICAL_TAGS.map((tag) => [tag, null])),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuth();
  const { updateCount } = useNotification();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("INDENT-PO")
        .select("*");

      if (fetchError) throw fetchError;

      let filteredData = data;
      if (user?.firmName && user.firmName.toLowerCase() !== "all") {
        filteredData = data.filter(
          (row) =>
            row["Firm Name"] &&
            String(row["Firm Name"]).toLowerCase() ===
              user.firmName.toLowerCase(),
        );
      }

      const pending = filteredData
        .filter(
          (row) =>
            row["Planned7"] !== null &&
            row["Planned7"] !== "" &&
            (!row["Actual7"] || row["Actual7"] === ""),
        )
        .map((row) => {
          const vendors = getVendorsFromRow(row);
          return {
            id: row.id,
            indentId: row["Indent Id."] || "",
            firmName: row["Firm Name"] || "",
            indenter: row["Generated By"] || "",
            department: row["Type Of Indent"] || "",
            product: row["Material"] || "",
            planned7: row["Planned7"] || "",
            vendors,
            assignments: getTechnicalAssignments(vendors),
          };
        });

      const history = filteredData
        .filter((row) => row["Actual7"] !== null && row["Actual7"] !== "")
        .map((row) => {
          const vendors = getVendorsFromRow(row);
          return {
            id: row.id,
            indentId: row["Indent Id."] || "",
            firmName: row["Firm Name"] || "",
            indenter: row["Generated By"] || "",
            department: row["Type Of Indent"] || "",
            product: row["Material"] || "",
            actual7: row["Actual7"] || "",
            vendors,
          };
        })
        .sort((a, b) => new Date(b.actual7) - new Date(a.actual7));

      setPendingData(pending);
      setFilteredPendingData(pending);
      setHistoryData(history);
      setFilteredHistoryData(history);
      updateCount("factory", pending.length);
    } catch (err) {
      console.error("Error fetching factory approvals:", err);
      setError(err.message || "Failed to load factory approvals");
      toast.error("Failed to load factory approvals", {
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  }, [updateCount, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshData]);

  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();
    setFilteredPendingData(
      pendingData.filter(
        (item) =>
          item.indentId.toLowerCase().includes(query) ||
          item.firmName.toLowerCase().includes(query) ||
          item.indenter.toLowerCase().includes(query) ||
          item.department.toLowerCase().includes(query) ||
          item.product.toLowerCase().includes(query),
      ),
    );
  }, [pendingData, searchQuery]);

  useEffect(() => {
    const query = historySearchQuery.trim().toLowerCase();
    setFilteredHistoryData(
      historyData.filter(
        (item) =>
          item.indentId.toLowerCase().includes(query) ||
          item.firmName.toLowerCase().includes(query) ||
          item.indenter.toLowerCase().includes(query) ||
          item.department.toLowerCase().includes(query) ||
          item.product.toLowerCase().includes(query) ||
          item.vendors.some((vendor) =>
            vendor.name.toLowerCase().includes(query),
          ),
      ),
    );
  }, [historyData, historySearchQuery]);

  const selectedUnassignedVendors = useMemo(
    () =>
      selectedIndent
        ? getUnassignedVendors(selectedIndent.vendors, technicalAssignments)
        : [],
    [selectedIndent, technicalAssignments],
  );

  const assignedCount = useMemo(
    () => countAssignedTags(technicalAssignments),
    [technicalAssignments],
  );
  const totalVendors = selectedIndent?.vendors.length || 0;
  const progressPercentage =
    totalVendors > 0 ? (assignedCount / totalVendors) * 100 : 0;

  const openCategorizationDialog = (indent) => {
    const existingAssignments = getTechnicalAssignments(indent.vendors);
    setSelectedIndent(indent);
    setTechnicalAssignments(
      existingAssignments.T1 || existingAssignments.T2 || existingAssignments.T3
        ? existingAssignments
        : Object.fromEntries(TECHNICAL_TAGS.map((tag) => [tag, null])),
    );
    setDraggedSlot(null);
    setOpenDialog(true);
  };

  const assignVendorToTag = (slot, tag) => {
    setTechnicalAssignments((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((currentTag) => {
        if (next[currentTag] === slot) {
          next[currentTag] = null;
        }
      });
      next[tag] = slot;
      return next;
    });
  };

  const clearTag = (tag) => {
    setTechnicalAssignments((prev) => ({ ...prev, [tag]: null }));
  };

  const handleDropToPool = () => {
    if (!draggedSlot) return;
    setTechnicalAssignments((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((tag) => {
        if (next[tag] === draggedSlot) {
          next[tag] = null;
        }
      });
      return next;
    });
    setDraggedSlot(null);
    setDragOverPool(false);
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!openDialog || !draggedSlot) return;

      const keyMap = {
        1: TECHNICAL_TAGS[0],
        2: TECHNICAL_TAGS[1],
        3: TECHNICAL_TAGS[2],
      };

      if (keyMap[e.key]) {
        e.preventDefault();
        assignVendorToTag(draggedSlot, keyMap[e.key]);
        setDraggedSlot(null);
        toast.success(`Assigned to ${keyMap[e.key]}`);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [openDialog, draggedSlot]);

  const onSubmit = async () => {
    if (!selectedIndent) return;

    const assignedCount = countAssignedTags(technicalAssignments);
    if (assignedCount !== selectedIndent.vendors.length) {
      toast.error("Please assign every vendor to a technical bucket");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from("INDENT-PO")
        .update({
          ...buildTechnicalTagUpdate(technicalAssignments),
          Actual7: new Date().toISOString(),
          Planned8: new Date().toISOString(),
        })
        .eq("id", selectedIndent.id);

      if (updateError) throw updateError;

      toast.success(`Technical ranking saved for ${selectedIndent.indentId}`);
      setOpenDialog(false);
      setSelectedIndent(null);
      setTechnicalAssignments(
        Object.fromEntries(TECHNICAL_TAGS.map((tag) => [tag, null])),
      );
      setRefreshData((prev) => !prev);
    } catch (error) {
      console.error("Error saving technical ranking:", error);
      toast.error("Failed to save technical ranking", {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-full mx-auto bg-gradient-to-br from-white via-slate-50/30 to-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
      <CardHeader className="p-6 border-b border-gray-200 bg-gradient-to-r from-slate-50/50 to-transparent">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-emerald-600 to-green-600 rounded-lg">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-gray-900">
              Factory Technical Categorisation
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 mt-1">
              Intelligently assign vendors to T1, T2, and T3 technical buckets
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <Tabs defaultValue="pending" className="w-full">
          {/* Modern Tabs */}
          <TabsList className="h-11 p-1.5 bg-gray-100 rounded-lg mb-6 grid grid-cols-2">
            <TabsTrigger
              value="pending"
              className="text-sm font-semibold rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Pending
              <Badge
                variant="secondary"
                className="ml-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
              >
                {pendingData.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="text-sm font-semibold rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
            >
              <History className="h-4 w-4 mr-2" />
              History
              <Badge
                variant="secondary"
                className="ml-2 bg-blue-100 text-blue-700 hover:bg-blue-100"
              >
                {historyData.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {/* Enhanced Search */}
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-emerald-600" />
              <Input
                className="pl-10 h-10 text-sm rounded-lg border-gray-200 bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                placeholder="Search by indent ID, firm, product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-3" />
                <p className="text-sm text-gray-500">Loading approvals...</p>
              </div>
            ) : error ? (
              <div className="rounded-lg border border-red-200 bg-gradient-to-br from-red-50 to-red-100/30 p-6 text-center">
                <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-600" />
                <p className="text-sm font-semibold text-red-900">{error}</p>
              </div>
            ) : filteredPendingData.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center bg-gradient-to-br from-gray-50/50 to-slate-50/50">
                <Info className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p className="text-sm font-medium text-gray-600">
                  No pending categorisations
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  All requests have been processed
                </p>
              </div>
            ) : (
              <PendingListView
                items={filteredPendingData}
                onCategorize={openCategorizationDialog}
              />
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {/* Enhanced Search */}
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-blue-600" />
              <Input
                className="pl-10 h-10 text-sm rounded-lg border-gray-200 bg-white focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="Search by indent ID, firm, product..."
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
                <p className="text-sm text-gray-500">Loading history...</p>
              </div>
            ) : filteredHistoryData.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center bg-gradient-to-br from-gray-50/50 to-slate-50/50">
                <Info className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p className="text-sm font-medium text-gray-600">
                  No history yet
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Categorised requests will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredHistoryData.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-gray-200 bg-gradient-to-br from-white to-slate-50/50 p-5 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          {item.indentId}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {item.firmName} • {item.product}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-blue-100 text-blue-700"
                      >
                        {formatDateTime(item.actual7)}
                      </Badge>
                    </div>

                    {/* Tech Category Grid */}
                    <div className="grid gap-3 md:grid-cols-3">
                      {TECHNICAL_TAGS.map((tag) => {
                        const vendor = item.vendors.find(
                          (currentVendor) => currentVendor.technicalTag === tag,
                        );
                        const tagConfigs = {
                          T1: {
                            icon: Award,
                            color: "emerald",
                            label: "Best Rate",
                          },
                          T2: {
                            icon: TrendingDown,
                            color: "blue",
                            label: "Medium",
                          },
                          T3: {
                            icon: AlertTriangle,
                            color: "amber",
                            label: "Worst",
                          },
                        };
                        const config = tagConfigs[tag];
                        const IconComponent = config.icon;

                        return (
                          <div
                            key={tag}
                            className={`rounded-lg border-2 border-dashed p-4 bg-gradient-to-br ${
                              tag === "T1"
                                ? "from-emerald-50 to-emerald-100/30 border-emerald-200"
                                : tag === "T2"
                                  ? "from-blue-50 to-blue-100/30 border-blue-200"
                                  : "from-amber-50 to-amber-100/30 border-amber-200"
                            }`}
                          >
                            <div className="mb-3 flex items-center gap-2">
                              <IconComponent
                                className={`h-4 w-4 ${
                                  tag === "T1"
                                    ? "text-emerald-600"
                                    : tag === "T2"
                                      ? "text-blue-600"
                                      : "text-amber-600"
                                }`}
                              />
                              <div>
                                <p className="text-xs font-bold text-gray-900">
                                  {tag}
                                </p>
                                <p className="text-[10px] text-gray-500">
                                  {config.label}
                                </p>
                              </div>
                            </div>
                            {vendor ? (
                              <VendorCard vendor={vendor} tag={tag} />
                            ) : (
                              <p className="text-xs text-gray-400 text-center py-6">
                                Not assigned
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Enhanced Dialog */}
      <Dialog
        open={openDialog}
        onOpenChange={(open) => {
          setOpenDialog(open);
          if (!open) {
            setSelectedIndent(null);
            setDraggedSlot(null);
            setDragOverTag(null);
            setDragOverPool(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[1000px] p-0 rounded-2xl overflow-hidden">
          {selectedIndent && (
            <>
              <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-slate-50/50 to-transparent border-b border-gray-200">
                <DialogTitle className="text-xl font-bold text-gray-900">
                  Technical Categorisation
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600 mt-2">
                  Drag vendors into{" "}
                  <span className="font-semibold text-emerald-700">T1</span>,{" "}
                  <span className="font-semibold text-blue-700">T2</span>, and{" "}
                  <span className="font-semibold text-amber-700">T3</span>{" "}
                  buckets for{" "}
                  <span className="font-semibold text-gray-900">
                    {selectedIndent.indentId}
                  </span>
                </DialogDescription>
              </DialogHeader>

              {/* Animated Progress Bar */}
              <div className="px-6 pt-4 pb-2">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-semibold text-gray-700">
                    Assignment Progress
                  </Label>
                  <span className="text-xs font-semibold text-emerald-700">
                    {assignedCount} / {totalVendors}
                  </span>
                </div>
                <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all duration-500 ease-out shadow-sm"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>

              {/* Main Grid */}
              <div className="grid gap-4 px-6 py-4 lg:grid-cols-[280px,1fr]">
                {/* Unassigned Vendors Pool */}
                <div
                  className={`rounded-xl border-2 p-4 transition-all duration-300 ${
                    dragOverPool
                      ? "bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-400 shadow-lg scale-[1.02]"
                      : "border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100/30"
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverPool(true);
                  }}
                  onDragLeave={() => setDragOverPool(false)}
                  onDrop={handleDropToPool}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <Label className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                      Unassigned
                    </Label>
                    <Badge className="bg-gray-600 text-white text-[10px]">
                      {selectedUnassignedVendors.length}
                    </Badge>
                  </div>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {selectedUnassignedVendors.length > 0 ? (
                      selectedUnassignedVendors.map((vendor) => (
                        <div
                          key={vendor.slot}
                          draggable
                          onDragStart={() => setDraggedSlot(vendor.slot)}
                          onDragEnd={() => setDraggedSlot(null)}
                        >
                          <VendorCard
                            vendor={vendor}
                            isDragging={draggedSlot === vendor.slot}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border-2 border-dashed border-emerald-200 bg-emerald-50 p-4 text-center">
                        <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-500 mb-2" />
                        <p className="text-xs font-medium text-emerald-700">
                          All assigned!
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Technical Buckets */}
                <div className="grid gap-4 md:grid-cols-3">
                  {TECHNICAL_TAGS.map((tag) => {
                    const assignedSlot = technicalAssignments[tag];
                    const vendor = selectedIndent.vendors.find(
                      (currentVendor) => currentVendor.slot === assignedSlot,
                    );
                    const isDragOver = dragOverTag === tag;

                    const tagConfigs = {
                      T1: {
                        icon: Award,
                        color: "emerald",
                        gradient: "from-emerald-50 to-emerald-100/30",
                        border: "border-emerald-200",
                        description: "Best Rate",
                      },
                      T2: {
                        icon: TrendingDown,
                        color: "blue",
                        gradient: "from-blue-50 to-blue-100/30",
                        border: "border-blue-200",
                        description: "Medium Rate",
                      },
                      T3: {
                        icon: AlertTriangle,
                        color: "amber",
                        gradient: "from-amber-50 to-amber-100/30",
                        border: "border-amber-200",
                        description: "Worst Rate",
                      },
                    };
                    const config = tagConfigs[tag];
                    const IconComponent = config.icon;

                    return (
                      <div
                        key={tag}
                        className={`rounded-xl border-2 p-4 transition-all duration-300 ${
                          isDragOver
                            ? `bg-gradient-to-br ${config.gradient} ${config.border} shadow-lg scale-[1.02]`
                            : `bg-gradient-to-br ${config.gradient} ${config.border}`
                        }`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverTag(tag);
                        }}
                        onDragLeave={() => setDragOverTag(null)}
                        onDrop={() => {
                          if (draggedSlot) {
                            assignVendorToTag(draggedSlot, tag);
                            toast.success(`Assigned to ${tag}`);
                          }
                          setDraggedSlot(null);
                          setDragOverTag(null);
                        }}
                      >
                        <div className="mb-3 flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={`p-2 rounded-lg ${
                                tag === "T1"
                                  ? "bg-emerald-100"
                                  : tag === "T2"
                                    ? "bg-blue-100"
                                    : "bg-amber-100"
                              }`}
                            >
                              <IconComponent
                                className={`h-4 w-4 ${
                                  tag === "T1"
                                    ? "text-emerald-700"
                                    : tag === "T2"
                                      ? "text-blue-700"
                                      : "text-amber-700"
                                }`}
                              />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">
                                {tag}
                              </p>
                              <p className="text-[10px] text-gray-500">
                                {config.description}
                              </p>
                            </div>
                          </div>
                          {vendor && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => clearTag(tag)}
                              className="h-7 px-2 text-xs hover:bg-white/50"
                            >
                              Clear
                            </Button>
                          )}
                        </div>

                        {vendor ? (
                          <div
                            draggable
                            onDragStart={() => setDraggedSlot(vendor.slot)}
                            onDragEnd={() => setDraggedSlot(null)}
                          >
                            <VendorCard
                              vendor={vendor}
                              tag={tag}
                              isDragging={draggedSlot === vendor.slot}
                            />
                          </div>
                        ) : (
                          <div className="flex min-h-[140px] items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white/50 p-3 text-center">
                            <div>
                              <p className="text-xs font-medium text-gray-500">
                                Drop vendor here
                              </p>
                              <p className="text-[10px] text-gray-400 mt-1">
                                {tag === "T1" && "← Best option"}
                                {tag === "T2" && "← Middle option"}
                                {tag === "T3" && "← Alternative"}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="sticky bottom-0 border-t border-gray-200 bg-gradient-to-r from-slate-50/50 to-white p-6">
                <DialogFooter className="sm:justify-between gap-3">
                  <div className="text-xs text-gray-500 hidden sm:block font-medium">
                    💡 Keyboard shortcut: Press{" "}
                    <kbd className="px-2 py-1 bg-gray-200 rounded text-gray-700">
                      1
                    </kbd>{" "}
                    <kbd className="px-2 py-1 bg-gray-200 rounded text-gray-700">
                      2
                    </kbd>{" "}
                    <kbd className="px-2 py-1 bg-gray-200 rounded text-gray-700">
                      3
                    </kbd>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setOpenDialog(false)}
                      size="sm"
                      className="px-4"
                    >
                      Cancel
                    </Button>
                    <Button
                      className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 h-9 px-6 text-sm font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                      disabled={isSubmitting || assignedCount !== totalVendors}
                      onClick={onSubmit}
                    >
                      {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      )}
                      Save & Complete
                    </Button>
                  </div>
                </DialogFooter>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
