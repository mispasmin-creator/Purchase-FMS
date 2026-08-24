"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CheckCircle2,
  History,
  Info,
  Loader2,
  Search,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { supabase } from "../supabase";
import { useRealtime } from "../hooks/useRealtime";
import { applyFirmFilter } from "../utils/firmFilter";
import { usePagination } from "../hooks/usePagination";
import { PaginationControls } from "@/components/ui/pagination";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { XCircle } from "lucide-react";
import {
  buildApprovedVendorUpdate,
  compareTechnicalTags,
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

const formatDate = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const getDelayDays = (expectedVendor, required) => {
  if (!expectedVendor || !required) return null;
  const d1 = new Date(expectedVendor);
  const d2 = new Date(required);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  const diffTime = d1 - d2;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const chemistryFields = [
  ["Al2O3", "alumina"],
  ["Fe2O3", "iron"],
  ["SiO2", "sio2"],
  ["CaO", "cao"],
  ["AP", "ap"],
  ["BD", "bd"],
];

const getTagTone = (tag) => {
  if (tag === "T1") return "bg-emerald-100 text-emerald-700";
  if (tag === "T2") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
};

export default function ManagementApprovals() {
  const [pendingData, setPendingData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshData, setRefreshData] = useState(false);
  const [selectedIndent, setSelectedIndent] = useState(null);
  const [selectedVendorSlot, setSelectedVendorSlot] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [selectedFirm, setSelectedFirm] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState("all");
  const [selectedHistoryFirm, setSelectedHistoryFirm] = useState("all");
  const [filterOptionsRaw, setFilterOptionsRaw] = useState([]);

  const pendingPagination = usePagination(100);
  const historyPagination = usePagination(100);

  const { user } = useAuth();
  const { updateCount } = useNotification();

  const filteredPendingData = pendingData;
  const filteredHistoryData = historyData;

  // Narrow-column full fetch used only to build the Firm/Product dropdown
  // option lists (independent of whichever page of pending/history is loaded).
  const fetchFilterOptions = useCallback(async () => {
    try {
      let query = supabase
        .from("INDENT-PO")
        .select('"Firm Name", "Material", "Planned8", "Actual8"');
      query = applyFirmFilter(query, user?.firmName, "Firm Name");
      const { data, error: err } = await query;
      if (err) throw err;
      setFilterOptionsRaw(data || []);
    } catch (err) {
      console.error("Error fetching filter options:", err);
    }
  }, [user]);

  const fetchPendingData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const applyPendingFilters = (q) => {
        let query = q.not("Planned8", "is", null).is("Actual8", null);
        query = applyFirmFilter(query, user?.firmName, "Firm Name");
        if (selectedFirm !== "all") query = query.eq('"Firm Name"', selectedFirm);
        if (selectedProduct !== "all") query = query.eq('"Material"', selectedProduct);
        const q2 = searchQuery.trim().replace(/[%,"]/g, "");
        if (q2) {
          query = query.or(
            [
              `"Indent Id.".ilike.%${q2}%`,
              `"Firm Name".ilike.%${q2}%`,
              `"Material".ilike.%${q2}%`,
            ].join(","),
          );
        }
        return query;
      };

      // Rows only count as "pending" once at least one vendor has been
      // technical-tagged (that filter can't be expressed as a plain SQL
      // WHERE clause). A cheap, narrow-column, unpaginated query computes
      // the true total so the tab badge/pagination count matches what's
      // actually shown — otherwise a row with no tagged vendor (e.g. an
      // indent that reached this stage without any vendor tagged) gets
      // counted but never rendered.
      const [pageResult, countResult] = await Promise.all([
        applyPendingFilters(supabase.from("INDENT-PO").select("*")).range(
          pendingPagination.from,
          pendingPagination.to,
        ),
        applyPendingFilters(
          supabase
            .from("INDENT-PO")
            .select(
              '"Vendor Name 1", "Technical Tag 1", "Vendor Name 2", "Technical Tag 2", "Vendor Name 3", "Technical Tag 3"',
            ),
        ),
      ]);

      if (pageResult.error) throw pageResult.error;
      if (countResult.error) throw countResult.error;

      const pending = (pageResult.data || [])
        .map((row) => {
          const vendors = getVendorsFromRow(row)
            .filter((vendor) => vendor.technicalTag)
            .sort(compareTechnicalTags);

          return {
            id: row.id,
            indentId: row["Indent Id."] || "",
            firmName: row["Firm Name"] || "",
            indenter: row["Generated By"] || "",
            department: row["Type Of Indent"] || "",
            product: row["Material"] || "",
            planned8: row["Planned8"] || "",
            expectedRequirementDate: row["expected_requierment_date"] || "",
            currentStock: row["Current Stock As Per factory"] || "0",
            indentQty: row["Quantity"] || row["Total Quantity"] || "",
            vendors,
          };
        })
        .filter((item) => item.vendors.length > 0);

      const trueTotal = (countResult.data || []).filter(
        (row) => getVendorsFromRow(row).filter((v) => v.technicalTag).length > 0,
      ).length;

      setPendingData(pending);
      pendingPagination.setTotalRows(trueTotal);
      updateCount("management", trueTotal);
    } catch (err) {
      console.error("Error fetching management approvals:", err);
      setError(err.message || "Failed to load management approvals");
      toast.error("Failed to load management approvals", {
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  }, [
    updateCount,
    user,
    selectedFirm,
    selectedProduct,
    searchQuery,
    pendingPagination.page,
    pendingPagination.pageSize,
  ]);

  const fetchHistoryData = useCallback(async () => {
    try {
      let query = supabase
        .from("INDENT-PO")
        .select("*", { count: "exact" })
        .not("Actual8", "is", null)
        .order("Actual8", { ascending: false });
      query = applyFirmFilter(query, user?.firmName, "Firm Name");
      if (selectedHistoryFirm !== "all") {
        query = query.eq('"Firm Name"', selectedHistoryFirm);
      }
      const q = historySearchQuery.trim().replace(/[%,"]/g, "");
      if (q) {
        query = query.or(
          [
            `"Indent Id.".ilike.%${q}%`,
            `"Firm Name".ilike.%${q}%`,
            `"Material".ilike.%${q}%`,
            `"Approved Vendor Name".ilike.%${q}%`,
          ].join(","),
        );
      }
      query = query.range(historyPagination.from, historyPagination.to);

      const { data, error: fetchError, count } = await query;
      if (fetchError) throw fetchError;

      const history = (data || []).map((row) => {
        const vendors = getVendorsFromRow(row);
        const approvedVendor = vendors.find(
          (vendor) => vendor.name === (row["Approved Vendor Name"] || ""),
        );

        return {
          id: row.id,
          indentId: row["Indent Id."] || "",
          firmName: row["Firm Name"] || "",
          indenter: row["Generated By"] || "",
          department: row["Type Of Indent"] || "",
          product: row["Material"] || "",
          actual8: row["Actual8"] || "",
          approvedVendorName: row["Approved Vendor Name"] || "",
          approvedRate: row["Approved Rate"] || "0",
          approvedTag: approvedVendor?.technicalTag || "",
          indentQty: row["Quantity"] || row["Total Quantity"] || "",
        };
      });

      setHistoryData(history);
      historyPagination.setTotalRows(count || 0);
    } catch (err) {
      console.error("Error fetching management approval history:", err);
    }
  }, [
    user,
    historySearchQuery,
    selectedHistoryFirm,
    historyPagination.page,
    historyPagination.pageSize,
  ]);

  useEffect(() => {
    fetchPendingData();
    fetchHistoryData();
    fetchFilterOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshData]);

  // Realtime: Listen for changes in INDENT-PO and refresh (both fetches are
  // now bounded by pagination, so this no longer re-downloads the full table).
  useRealtime("INDENT-PO", () => {
    setRefreshData((prev) => !prev);
  });

  const firmOptions = useMemo(() => {
    const firms = new Set(
      filterOptionsRaw.map((row) => String(row["Firm Name"] || "").trim()).filter(Boolean),
    );
    return ["all", ...Array.from(firms).sort()];
  }, [filterOptionsRaw]);

  const historyFirmOptions = useMemo(() => {
    const firms = new Set(historyData.map((item) => item.firmName));
    return ["all", ...Array.from(firms).sort()];
  }, [historyData]);

  const productOptions = useMemo(() => {
    let filtered = filterOptionsRaw;
    if (selectedFirm !== "all") {
      filtered = filtered.filter(
        (row) => String(row["Firm Name"] || "").trim() === selectedFirm,
      );
    }
    const products = new Set(
      filtered.map((row) => String(row["Material"] || "").trim()).filter(Boolean),
    );
    return ["all", ...Array.from(products).sort()];
  }, [filterOptionsRaw, selectedFirm]);

  // Reset product when firm changes if the current product is not in the new options
  useEffect(() => {
    if (selectedProduct !== "all" && !productOptions.includes(selectedProduct)) {
      setSelectedProduct("all");
    }
  }, [productOptions, selectedProduct]);

  // Filter changes (firm/product/search) reset to page 1 and refetch.
  useEffect(() => {
    const handle = setTimeout(
      () => {
        if (pendingPagination.page !== 1) {
          pendingPagination.setPage(1);
        } else {
          fetchPendingData();
        }
      },
      searchQuery ? 400 : 0,
    );
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFirm, selectedProduct, searchQuery]);

  useEffect(() => {
    fetchPendingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPagination.page, pendingPagination.pageSize]);

  useEffect(() => {
    const handle = setTimeout(
      () => {
        if (historyPagination.page !== 1) {
          historyPagination.setPage(1);
        } else {
          fetchHistoryData();
        }
      },
      historySearchQuery ? 400 : 0,
    );
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historySearchQuery, selectedHistoryFirm]);

  useEffect(() => {
    fetchHistoryData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyPagination.page, historyPagination.pageSize]);

  const selectedVendor = useMemo(
    () =>
      selectedIndent?.vendors.find(
        (vendor) => vendor.slot.toString() === selectedVendorSlot,
      ) || null,
    [selectedIndent, selectedVendorSlot],
  );

  const onApprove = async () => {
    if (!selectedIndent || !selectedVendor) {
      toast.error("Please select one vendor");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from("INDENT-PO")
        .update({
          ...buildApprovedVendorUpdate(selectedVendor),
          "Approved Date": new Date().toISOString(),
          Actual8: new Date().toISOString(),
          Planned2: new Date().toISOString(),
          "Have To Make PO": "Yes",
        })
        .eq("id", selectedIndent.id);

      if (updateError) throw updateError;

      toast.success(`Management approved ${selectedIndent.indentId}`);
      setOpenDialog(false);
      setSelectedIndent(null);
      setSelectedVendorSlot("");
      setRefreshData((prev) => !prev);
    } catch (error) {
      console.error("Error completing management approval:", error);
      toast.error("Management approval failed", {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onReject = async () => {
    if (!selectedIndent) return;

    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from("INDENT-PO")
        .update({
          "Approved Date": new Date().toISOString(),
          Actual8: new Date().toISOString(),
          "Approved Vendor Name": "Rejected",
          "Have To Make PO": "No",
        })
        .eq("id", selectedIndent.id);

      if (updateError) throw updateError;

      toast.success(`Indent ${selectedIndent.indentId} rejected`);
      setOpenDialog(false);
      setSelectedIndent(null);
      setSelectedVendorSlot("");
      setRefreshData((prev) => !prev);
    } catch (error) {
      console.error("Error rejecting indent:", error);
      toast.error("Rejection failed", {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-full mx-auto bg-white border border-gray-200 rounded-lg shadow-md">
      <CardHeader className="p-4 border-b border-gray-200">
        <CardTitle className="flex items-center gap-2 text-lg text-gray-800">
          <CheckCircle2 className="h-5 w-5 text-[#7da23a]" />
          Management Final Approval
        </CardTitle>
        <CardDescription className="text-sm text-gray-500">
          Review the factory technical tags and approve one final vendor.
        </CardDescription>
        {user?.firmName && (
          <p className="border-t border-gray-100 mt-2 pt-2 text-[#7da23a] text-xs font-medium">
            Showing data for: {" "}
            <span className="font-bold">
              {user.firmName === "all"
                ? "All Firms"
                : Array.isArray(user.firmName)
                  ? user.firmName.join(", ")
                  : user.firmName}
            </span>
          </p>
        )}
      </CardHeader>

      <CardContent className="p-4">
        <Tabs defaultValue="pending">
          <TabsList className="mb-4">
            <TabsTrigger value="pending" className="gap-2">
              Pending <Badge variant="secondary">{pendingPagination.totalRows}</Badge>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              History <Badge variant="secondary">{historyPagination.totalRows}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 mb-2">
              <div className="relative flex-1">
                <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
                <Input
                  className="pl-9"
                  placeholder="Search indent, firm, product, vendor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <Select value={selectedFirm} onValueChange={setSelectedFirm}>
                  <SelectTrigger className="w-[180px] bg-white">
                    <SelectValue placeholder="All Firms" />
                  </SelectTrigger>
                  <SelectContent>
                    {firmOptions.map((firm) => (
                      <SelectItem key={firm} value={firm}>
                        {firm === "all" ? "All Firms" : firm}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={selectedProduct}
                  onValueChange={setSelectedProduct}
                >
                  <SelectTrigger className="w-[200px] bg-white">
                    <SelectValue placeholder="All Products" />
                  </SelectTrigger>
                  <SelectContent>
                    {productOptions.map((product) => (
                      <SelectItem key={product} value={product}>
                        {product === "all" ? "All Products" : product}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(selectedFirm !== "all" ||
                  selectedProduct !== "all" ||
                  searchQuery) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedFirm("all");
                      setSelectedProduct("all");
                      setSearchQuery("");
                    }}
                    className="text-gray-400 hover:text-red-500 h-9 w-9"
                    title="Clear all filters"
                  >
                    <XCircle className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[#7da23a]" />
              </div>
            ) : error ? (
              <div className="p-6 text-center border border-red-200 rounded-xl bg-red-50">
                <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-red-500" />
                <p className="font-medium text-red-700">{error}</p>
              </div>
            ) : filteredPendingData.length === 0 ? (
              <div className="py-12 text-center border border-gray-200 border-dashed rounded-xl">
                <Info className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-500">
                  No pending management approvals.
                </p>
              </div>
            ) : (
              <div className="overflow-auto border border-gray-200 rounded-xl max-h-[calc(100vh-400px)] relative custom-scrollbar">
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 z-30">
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Action</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Indent</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Firm</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Product</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Indent Qty</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Required On</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Current Stock</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Rate</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Tagged Vendors</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Factory Done</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredPendingData.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                        <td className="px-4 py-3">
                          <Button
                            className="bg-[#7da23a] hover:bg-[#6b8e2f]"
                            onClick={() => {
                              setSelectedIndent(item);
                              setSelectedVendorSlot("");
                              setOpenDialog(true);
                            }}
                          >
                            Review
                          </Button>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {item.indentId}
                        </td>
                        <td className="px-4 py-3">{item.firmName}</td>
                        <td className="px-4 py-3">{item.product}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{item.indentQty || "-"}</td>
                        <td className="px-4 py-3 text-xs font-medium text-blue-600">
                          {formatDate(item.expectedRequirementDate)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700">
                          {item.currentStock || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            {item.vendors.map((vendor) => (
                              <span key={vendor.slot} className="text-xs text-gray-700 whitespace-nowrap">
                                ₹{vendor.rate} <span className="text-gray-400">({vendor.name.split(' ').slice(0, 2).join(' ')})</span>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5 focus-within:z-10">
                            {item.vendors.map((vendor) => (
                              <Badge
                                key={vendor.slot}
                                className={`${getTagTone(vendor.technicalTag)} px-1.5 py-0.5 text-[10px]`}
                              >
                                {vendor.technicalTag} · {vendor.name.split(' ').slice(0, 2).join(' ')}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[10px] text-gray-500 whitespace-nowrap">{formatDateTime(item.planned8)}</td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
              </div>
            )}
            <PaginationControls
              page={pendingPagination.page}
              pageSize={pendingPagination.pageSize}
              totalRows={pendingPagination.totalRows}
              onPageChange={pendingPagination.setPage}
              onPageSizeChange={pendingPagination.setPageSize}
            />
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 mb-2">
              <div className="relative flex-1">
                <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
                <Input
                  className="pl-9"
                  placeholder="Search approved history..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <Select value={selectedHistoryFirm} onValueChange={setSelectedHistoryFirm}>
                  <SelectTrigger className="w-[180px] bg-white">
                    <SelectValue placeholder="All Firms" />
                  </SelectTrigger>
                  <SelectContent>
                    {historyFirmOptions.map((firm) => (
                      <SelectItem key={firm} value={firm}>
                        {firm === "all" ? "All Firms" : firm}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(selectedHistoryFirm !== "all" || historySearchQuery) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedHistoryFirm("all");
                      setHistorySearchQuery("");
                    }}
                    className="text-gray-400 hover:text-red-500 h-9 w-9"
                    title="Clear filters"
                  >
                    <XCircle className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[#7da23a]" />
              </div>
            ) : filteredHistoryData.length === 0 ? (
              <div className="py-12 text-center border border-gray-200 border-dashed rounded-xl">
                <Info className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-500">
                  No management approval history yet.
                </p>
              </div>
            ) : (
              <div className="overflow-auto border border-gray-200 rounded-xl max-h-[calc(100vh-400px)] relative custom-scrollbar">
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 z-30">
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Indent</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Firm</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Product</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Indent Qty</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Approved Vendor</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Tag</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Rate</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Approved On</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredHistoryData.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                        <td className="px-4 py-3">{item.indentId}</td>
                        <td className="px-4 py-3">{item.firmName}</td>
                        <td className="px-4 py-3">{item.product}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{item.indentQty || "-"}</td>
                        <td className="px-4 py-3">{item.approvedVendorName}</td>
                        <td className="px-4 py-3">
                          {item.approvedTag ? (
                            <Badge className={getTagTone(item.approvedTag)}>
                              {item.approvedTag}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          ₹{item.approvedRate}
                        </td>
                        <td className="px-4 py-3">{formatDateTime(item.actual8)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <PaginationControls
              page={historyPagination.page}
              pageSize={historyPagination.pageSize}
              totalRows={historyPagination.totalRows}
              onPageChange={historyPagination.setPage}
              onPageSizeChange={historyPagination.setPageSize}
            />
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog
        open={openDialog}
        onOpenChange={(open) => {
          setOpenDialog(open);
          if (!open) {
            setSelectedIndent(null);
            setSelectedVendorSlot("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[1100px]">
          {selectedIndent && (
            <>
              <DialogHeader>
                <DialogTitle>Management Vendor Review</DialogTitle>
                <DialogDescription className="flex items-center flex-wrap gap-y-2 mt-2">
                  <span>Review tagged vendors and approve one for</span>
                  <span className="font-bold text-gray-900 mx-1">{selectedIndent.indentId}</span>
                  <span>at</span>
                  <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-800 border-amber-200 font-bold px-3 py-1 shadow-sm">
                    {selectedIndent.firmName}
                  </Badge>
                  <span className="mx-2 text-gray-300">|</span>
                  <span className="font-medium text-gray-700">Product:</span>
                  <span className="font-bold text-gray-900 ml-1">{selectedIndent.product}</span>
                  <span className="mx-2 text-gray-300">|</span>
                  <span className="font-medium text-gray-700">Indent Qty:</span>
                  <span className="font-bold text-gray-900 ml-1">{selectedIndent.indentQty || "-"}</span>
                  <span className="mx-2 text-gray-300">|</span>
                  <span className="font-medium text-gray-700">Stock:</span>
                  <span className="font-bold text-gray-900 ml-1">{selectedIndent.currentStock}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-2 lg:grid-cols-3">
                {selectedIndent.vendors.map((vendor) => {
                  const isSelected =
                    selectedVendorSlot === vendor.slot.toString();

                  return (
                    <button
                      key={vendor.slot}
                      type="button"
                      onClick={() =>
                        setSelectedVendorSlot(vendor.slot.toString())
                      }
                      className={`rounded-2xl border p-4 text-left transition ${
                        isSelected
                          ? "border-[#7da23a] bg-green-50 shadow-sm"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Badge className={getTagTone(vendor.technicalTag)}>
                            {vendor.technicalTag}
                          </Badge>
                          <p className="mt-3 text-base font-semibold text-gray-900">
                            {vendor.name}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            {vendor.paymentTerm || "Payment term not set"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">
                            ₹{vendor.rate}
                          </p>
                          <p className="text-xs text-gray-500">
                            {vendor.rateType}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 p-3 mt-4 text-xs text-gray-600 rounded-xl bg-slate-50">
                        <div>
                          <span className="block text-[10px] uppercase tracking-wide text-gray-400">
                            Packaging
                          </span>
                          <span>{vendor.packaging || "-"}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase tracking-wide text-gray-400">
                            Quote
                          </span>
                          <span>{vendor.quotationNumber || "-"}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase tracking-wide text-gray-400">
                            Quote Date
                          </span>
                          <span>{vendor.quotationDate || "-"}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase tracking-wide text-gray-400">
                            Advance
                          </span>
                          <span>
                            {vendor.advancePercentage
                              ? `${vendor.advancePercentage}%`
                              : "-"}
                          </span>
                        </div>
                        <div className="col-span-2 mt-2 pt-2 border-t border-slate-200">
                          <span className="block text-[10px] uppercase tracking-wide text-gray-400 mb-1">
                            Delivery Timeline
                          </span>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[10px] text-gray-500">Requirement</p>
                              <p className="font-medium">{formatDate(selectedIndent.expectedRequirementDate)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-gray-500">Vendor Commit</p>
                              <p className="font-medium text-blue-600">{formatDate(vendor.expectedDate)}</p>
                            </div>
                          </div>
                          {getDelayDays(vendor.expectedDate, selectedIndent.expectedRequirementDate) !== null && (
                            <div className={`mt-2 text-center py-1 rounded text-[10px] font-bold uppercase ${
                              getDelayDays(vendor.expectedDate, selectedIndent.expectedRequirementDate) > 0
                                ? "bg-red-50 text-red-600"
                                : "bg-green-50 text-green-600"
                            }`}>
                              {getDelayDays(vendor.expectedDate, selectedIndent.expectedRequirementDate) > 0
                                ? `${getDelayDays(vendor.expectedDate, selectedIndent.expectedRequirementDate)} Days Delay`
                                : "On Time / Early"}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-3 mt-4 border border-gray-200 border-dashed rounded-xl">
                        <p className="mb-2 text-xs font-semibold text-gray-600">
                          Chemical Details
                        </p>
                        <div className="grid grid-cols-3 gap-y-2 text-[11px] text-gray-600">
                          {chemistryFields.map(([label, key]) => (
                            <div key={key}>
                              <span className="block text-[10px] text-gray-400">
                                {label}
                              </span>
                              <span>{vendor[key] || "-"}</span>
                            </div>
                          ))}
                          <div className="col-span-3">
                            <span className="block text-[10px] text-gray-400">
                              Fineness
                            </span>
                            <span>{vendor.fineness || "-"}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenDialog(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={onReject}
                  disabled={isSubmitting}
                >
                  Reject
                </Button>
                <Button
                  className="bg-[#7da23a] hover:bg-[#6b8e2f]"
                  onClick={onApprove}
                  disabled={!selectedVendorSlot || isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Approve Selected Vendor
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
