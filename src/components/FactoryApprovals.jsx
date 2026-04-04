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

const VendorCard = ({ vendor, tag }) => {
  const gstNote =
    vendor.rateType === "Basic Rate" && vendor.taxValue !== "0"
      ? `GST ${vendor.taxValue}%`
      : vendor.rateType === "Basic Rate"
        ? "Basic Rate"
        : "With Tax";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-md transition-all hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-gray-400" />
            <p className="truncate text-sm font-semibold text-gray-800">
              {vendor.name}
            </p>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {vendor.paymentTerm || "Payment term not set"}
          </p>
        </div>
        {tag && (
          <Badge className="bg-[#7da23a] text-white hover:bg-[#7da23a]">
            {tag}
          </Badge>
        )}
      </div>

      {/* Lab Details Section */}
      <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-lg bg-slate-50 p-2 border border-slate-100">
        {[
          { label: "Alumina", value: vendor.alumina, unit: "%" },
          { label: "Iron", value: vendor.iron, unit: "%" },
          { label: "SiO2", value: vendor.sio2, unit: "%" },
          { label: "CaO", value: vendor.cao, unit: "%" },
          { label: "AP", value: vendor.ap, unit: "%" },
          { label: "BD", value: vendor.bd, unit: "%" },
        ].filter(item => item.value && item.value !== "0").map((item, i) => (
          <div key={i} className="text-center">
            <p className="text-[9px] font-medium text-gray-500 uppercase tracking-tighter">{item.label}</p>
            <p className="text-[11px] font-bold text-gray-800">{item.value}{item.unit}</p>
          </div>
        ))}
        {vendor.fineness && (
          <div className="col-span-3 border-t border-slate-200 mt-1 pt-1">
            <p className="text-[9px] font-medium text-gray-500 text-center">FINENESS: {vendor.fineness}</p>
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500">
        <span className="flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-medium">{gstNote}</span>
        {vendor.packaging ? <span className="flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{vendor.packaging}</span> : null}
        {vendor.advancePercentage ? (
          <span className="text-amber-600 font-medium">Adv. {vendor.advancePercentage}%</span>
        ) : null}
      </div>
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
        .filter(
          (row) =>
            row["Actual7"] !== null &&
            row["Actual7"] !== "",
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
  };

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
    <Card className="w-full max-w-full mx-auto bg-white border border-gray-200 rounded-lg shadow-md">
      <CardHeader className="p-4 border-b border-gray-200">
        <CardTitle className="flex items-center gap-2 text-lg text-gray-800">
          <Users className="h-5 w-5 text-[#7da23a]" />
          Factory Technical Categorisation
        </CardTitle>
        <CardDescription className="text-sm text-gray-500">
          Drag vendors into `T1`, `T2`, and `T3` before management makes the final selection.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4">
        <Tabs defaultValue="pending">
          <TabsList className="mb-4">
            <TabsTrigger value="pending" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Pending <Badge variant="secondary">{pendingData.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              History <Badge variant="secondary">{historyData.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Search indent, firm, product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[#7da23a]" />
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-500" />
                <p className="font-medium text-red-700">{error}</p>
              </div>
            ) : filteredPendingData.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center">
                <Info className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p className="text-sm text-gray-500">No factory categorisation pending.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-[100px]">Action</TableHead>
                      <TableHead>Indent</TableHead>
                      <TableHead>Firm</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Vendors</TableHead>
                      <TableHead>Three Party Done</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPendingData.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Button
                            size="sm"
                            className="bg-[#7da23a] hover:bg-[#6b8e2f] h-8"
                            onClick={() => openCategorizationDialog(item)}
                          >
                            Categorise
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">{item.indentId}</TableCell>
                        <TableCell>{item.firmName}</TableCell>
                        <TableCell>{item.product}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {item.vendors.map((vendor) => (
                              <Badge key={vendor.slot} variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-0">
                                {vendor.name}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-gray-500 whitespace-nowrap">{formatDateTime(item.planned7)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Search tagged approvals..."
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[#7da23a]" />
              </div>
            ) : filteredHistoryData.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center">
                <Info className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p className="text-sm text-gray-500">No factory categorisation history yet.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredHistoryData.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-gray-900">
                          {item.indentId}
                        </p>
                        <p className="text-sm text-gray-500">
                          {item.firmName} · {item.product}
                        </p>
                      </div>
                      <Badge variant="secondary">{formatDateTime(item.actual7)}</Badge>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {TECHNICAL_TAGS.map((tag) => {
                        const vendor = item.vendors.find(
                          (currentVendor) => currentVendor.technicalTag === tag,
                        );
                        return (
                          <div
                            key={tag}
                            className="rounded-xl border border-dashed border-gray-200 bg-slate-50 p-3"
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-xs font-semibold tracking-wide text-gray-500">
                                {tag}
                              </span>
                            </div>
                            {vendor ? (
                              <VendorCard vendor={vendor} tag={tag} />
                            ) : (
                              <p className="text-sm text-gray-400">Not assigned</p>
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

      <Dialog
        open={openDialog}
        onOpenChange={(open) => {
          setOpenDialog(open);
          if (!open) {
            setSelectedIndent(null);
            setDraggedSlot(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[1100px]">
          {selectedIndent && (
            <>
              <DialogHeader>
                <DialogTitle>Technical Categorisation</DialogTitle>
                <DialogDescription>
                  Drag each vendor into a technical bucket for{" "}
                  <span className="font-medium">{selectedIndent.indentId}</span>.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-6 py-2 lg:grid-cols-[320px,1fr]">
                <div
                  className="rounded-2xl border border-dashed border-gray-300 bg-slate-50 p-4"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDropToPool}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <Label className="text-sm font-semibold text-gray-700">
                      Unassigned Vendors
                    </Label>
                    <Badge variant="secondary">
                      {selectedUnassignedVendors.length}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {selectedUnassignedVendors.length > 0 ? (
                      selectedUnassignedVendors.map((vendor) => (
                        <div
                          key={vendor.slot}
                          draggable
                          onDragStart={() => setDraggedSlot(vendor.slot)}
                        >
                          <VendorCard vendor={vendor} />
                        </div>
                      ))
                    ) : (
                      <p className="rounded-xl border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-400">
                        All vendors are assigned. Drag one back here to reset it.
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {TECHNICAL_TAGS.map((tag) => {
                    const assignedSlot = technicalAssignments[tag];
                    const vendor = selectedIndent.vendors.find(
                      (currentVendor) => currentVendor.slot === assignedSlot,
                    );

                    return (
                      <div
                        key={tag}
                        className="rounded-2xl border border-gray-200 bg-white p-4"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (draggedSlot) assignVendorToTag(draggedSlot, tag);
                          setDraggedSlot(null);
                        }}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {tag}
                            </p>
                            <p className="text-xs text-gray-500">
                              Technical ranking bucket
                            </p>
                          </div>
                          {vendor ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => clearTag(tag)}
                            >
                              Clear
                            </Button>
                          ) : null}
                        </div>

                        {vendor ? (
                          <div
                            draggable
                            onDragStart={() => setDraggedSlot(vendor.slot)}
                          >
                            <VendorCard vendor={vendor} tag={tag} />
                          </div>
                        ) : (
                          <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-slate-50 p-4 text-center text-sm text-gray-400">
                            Drop a vendor here
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenDialog(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-[#7da23a] hover:bg-[#6b8e2f]"
                  disabled={isSubmitting}
                  onClick={onSubmit}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Save Technical Tags
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
