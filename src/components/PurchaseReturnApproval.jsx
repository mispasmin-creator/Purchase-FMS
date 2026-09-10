"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, Info, Loader2, Search } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { canViewFirm } from "../utils/firmFilter";
import { supabase } from "../supabase";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(",", "");
};

const statusTone = (status) => {
  const value = String(status || "").toLowerCase();
  if (value === "approved") return "bg-emerald-100 text-emerald-700";
  if (value === "rejected") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
};

// Classify the underlying Mismatch record as Rate / Qty / Lab (or a
// combination), read straight off its own stored difference columns.
const classifyMismatchType = (m) => {
  if (!m) return "";
  const hasRate = Math.abs(parseFloat(m["Rate Difference"] || 0)) > 0.001;
  const hasQty = m["Qty Diff Status"] === "Mismatch" || Math.abs(parseFloat(m["Quantity Difference"] || m["Diff Qty"] || 0)) > 0.001;
  const hasLab = ["Alumina Difference", "Iron Difference", "AP Difference", "BD Difference"].some(
    (key) => Math.abs(parseFloat(m[key] || 0)) > 0.001
  );
  return [hasRate && "Rate", hasQty && "Qty", hasLab && "Lab"].filter(Boolean).join(", ");
};

export default function PurchaseReturnApproval() {
  const { user } = useAuth();
  const { updateCount } = useNotification();
  const [pendingData, setPendingData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRow, setSelectedRow] = useState(null);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [firmFilter, setFirmFilter] = useState("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: fetchError } = await supabase
        .from("Purchase Returns")
        .select("*")
        .not("PR Planned", "is", null)
        .order("PR Planned", { ascending: false });
      if (fetchError) throw fetchError;

      let rows = (data || []).map((row) => ({
        id: row.ID,
        mismatchId: row.mismatch_id || null,
        liftNo: String(row["Lift No"] || "").trim(),
        poNo: String(row["Po No."] || "").trim(),
        purchaseReturnNo: String(row["Purchase Return No."] || "").trim(),
        firmName: String(row["Firm Name"] || "").trim(),
        partyName: String(row["Party Name"] || "").trim(),
        productName: String(row["Product Name"] || "").trim(),
        returnQty: parseFloat(row["Return This Time"]) || parseFloat(row["Qty"]) || 0,
        vehicleNo: String(row["Vehicle No"] || "").trim(),
        billNo: String(row["Bill No"] || "").trim(),
        returnReason: String(row["Return Reason"] || "").trim(),
        creditNoteUrl: row["Credit Note URL"] || "",
        weightSlip: row["Weighslip of Material"] || "",
        approvalStatus: String(row["PR Approval Status"] || "").trim(),
        approvalRemarks: String(row["PR Approval Remarks"] || "").trim(),
        submittedOn: row["PR Planned"] || "",
        decidedOn: row["PR Actual"] || "",
      }));

      // Classify each linked Mismatch record as Rate / Qty / Lab, read
      // straight off its own stored difference columns.
      const mismatchIds = Array.from(new Set(rows.map((r) => r.mismatchId).filter(Boolean)));
      if (mismatchIds.length > 0) {
        const { data: diffRows } = await supabase
          .from("Mismatch")
          .select('id, "Rate Difference", "Quantity Difference", "Diff Qty", "Qty Diff Status", "Alumina Difference", "Iron Difference", "AP Difference", "BD Difference"')
          .in("id", mismatchIds);
        const diffMap = {};
        (diffRows || []).forEach((row) => { diffMap[String(row.id)] = row; });
        rows = rows.map((r) => ({ ...r, mismatchType: classifyMismatchType(diffMap[String(r.mismatchId)]) }));
      }

      rows = rows.filter((row) => canViewFirm(user?.firmName, row.firmName));

      const pending = rows.filter((row) => row.approvalStatus === "Pending");
      const history = rows
        .filter((row) => row.approvalStatus !== "Pending")
        .sort((a, b) => new Date(b.decidedOn).getTime() - new Date(a.decidedOn).getTime());

      setPendingData(pending);
      setHistoryData(history);
      updateCount("purchase-return-approval", pending.length);
    } catch (fetchErr) {
      console.error("Error fetching purchase return approvals:", fetchErr);
      setError(fetchErr.message || "Failed to load purchase return approvals");
      toast.error("Failed to load purchase return approvals", {
        description: fetchErr.message,
      });
    } finally {
      setLoading(false);
    }
  }, [updateCount, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const firmOptions = useMemo(() => {
    return Array.from(
      new Set([...pendingData, ...historyData].map((item) => item.firmName).filter(Boolean)),
    ).sort();
  }, [pendingData, historyData]);

  const filteredPending = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return pendingData.filter(
      (item) =>
        (firmFilter === "all" || item.firmName === firmFilter) &&
        (item.liftNo.toLowerCase().includes(query) ||
        item.poNo.toLowerCase().includes(query) ||
        item.partyName.toLowerCase().includes(query) ||
        item.productName.toLowerCase().includes(query) ||
        item.purchaseReturnNo.toLowerCase().includes(query)),
    );
  }, [pendingData, searchQuery, firmFilter]);

  const filteredHistory = useMemo(() => {
    const query = historySearchQuery.trim().toLowerCase();
    return historyData.filter(
      (item) =>
        (firmFilter === "all" || item.firmName === firmFilter) &&
        (item.liftNo.toLowerCase().includes(query) ||
        item.poNo.toLowerCase().includes(query) ||
        item.partyName.toLowerCase().includes(query) ||
        item.productName.toLowerCase().includes(query) ||
        item.approvalStatus.toLowerCase().includes(query)),
    );
  }, [historyData, historySearchQuery, firmFilter]);

  const submitDecision = async (decision) => {
    if (!selectedRow) return;
    setIsSubmitting(true);
    try {
      const isApproved = decision === "Approved";

      const { error: updateError } = await supabase
        .from("Purchase Returns")
        .update({
          "PR Approval Status": decision,
          "PR Actual": new Date().toISOString(),
          "PR Approval Remarks": decisionNotes.trim() || null,
        })
        .eq("ID", selectedRow.id);
      if (updateError) throw updateError;

      // Only once approved does the linked Mismatch record move on to the
      // Debit Note stage - this is the exact same handoff Purchase Return
      // always made, just held back until approval.
      if (isApproved && selectedRow.mismatchId) {
        const { error: mismatchError } = await supabase
          .from("Mismatch")
          .update({
            Status: "Credit Notes",
            coordination_status: "COORDINATED",
            "Action Type": "Make Debit Note",
          })
          .eq("id", selectedRow.mismatchId);
        if (mismatchError) throw mismatchError;
      }

      if (isApproved) {
        toast.success(`Purchase Return Approved for ${selectedRow.liftNo}`, {
          description: "Sent to Debit Note for further processing.",
        });
      } else {
        toast.success(`Purchase Return Rejected for ${selectedRow.liftNo}`);
      }
      setSelectedRow(null);
      setDecisionNotes("");
      fetchData();
    } catch (error) {
      console.error("Error updating purchase return approval:", error);
      toast.error("Failed to update purchase return approval", {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTable = (rows, isHistory = false) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#7da23a]" />
        </div>
      );
    }
    if (error) {
      return (
        <div className="p-6 text-center border border-red-200 rounded-xl bg-red-50">
          <p className="font-medium text-red-700">{error}</p>
        </div>
      );
    }
    if (!rows.length) {
      return (
        <div className="py-12 text-center border border-gray-200 border-dashed rounded-xl">
          <Info className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">
            {isHistory
              ? "No purchase return approval history yet."
              : "No pending purchase return approvals."}
          </p>
        </div>
      );
    }
    return (
      <div className="overflow-auto max-h-[calc(100vh-450px)] relative custom-scrollbar border border-gray-200 rounded-xl">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-30">
            <tr className="bg-gray-50 border-b border-gray-200">
              {!isHistory && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Action</th>}
              <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Lift No</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Firm Name</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">PR No.</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Party</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Product</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Return Qty</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Credit Note</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Weight Slip</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Mismatch Type</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Status</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">{isHistory ? "Decided On" : "Submitted On"}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {rows.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                {!isHistory && (
                  <td className="px-4 py-3">
                    <Button
                      className="bg-[#6b8e2f] hover:bg-[#5a7a27] h-8 px-3 text-xs"
                      onClick={() => {
                        setSelectedRow(item);
                        setDecisionNotes("");
                      }}
                    >
                      Review
                    </Button>
                  </td>
                )}
                <td className="px-4 py-3 font-medium text-primary text-xs">{item.liftNo || "-"}</td>
                <td className="px-4 py-3 text-gray-700 text-xs font-semibold">{item.firmName || "-"}</td>
                <td className="px-4 py-3 text-gray-700 text-xs">{item.purchaseReturnNo || "-"}</td>
                <td className="px-4 py-3 text-gray-700 text-xs">{item.partyName || "-"}</td>
                <td className="px-4 py-3 text-gray-700 text-xs">{item.productName || "-"}</td>
                <td className="px-4 py-3 text-gray-700 text-xs font-semibold">{item.returnQty ? item.returnQty.toFixed(2) : "-"}</td>
                <td className="px-4 py-3">
                  {item.creditNoteUrl ? (
                    <a href={item.creditNoteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium">
                      View <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : <span className="text-gray-400 text-xs">-</span>}
                </td>
                <td className="px-4 py-3">
                  {item.weightSlip ? (
                    <a href={item.weightSlip} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium">
                      View <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : <span className="text-gray-400 text-xs">-</span>}
                </td>
                <td className="px-4 py-3 text-gray-700 text-xs font-semibold">{item.mismatchType || "-"}</td>
                <td className="px-4 py-3">
                  <Badge className={`${statusTone(item.approvalStatus)} font-normal text-[10px] px-2 py-0.5`}>
                    {item.approvalStatus || "-"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-gray-600 text-[11px] whitespace-nowrap">
                  {formatDateTime(isHistory ? item.decidedOn : item.submittedOn)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-full mx-auto bg-white border border-gray-200 rounded-lg shadow-md">
      <CardHeader className="p-4 border-b border-gray-200">
        <CardTitle className="flex items-center gap-2 text-lg text-gray-800">
          <CheckCircle2 className="h-5 w-5 text-[#7da23a]" />
          Purchase Return Approval
        </CardTitle>
        <CardDescription className="text-sm text-gray-500">
          Review fully returned Purchase Return entries before they move to the Debit Note stage.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4">
        <Tabs defaultValue="pending">
          <TabsList className="mb-4">
            <TabsTrigger value="pending" className="gap-2">
              Pending <Badge variant="secondary">{filteredPending.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              History <Badge variant="secondary">{filteredHistory.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
                <Input
                  className="pl-9"
                  placeholder="Search lift, PO, party, product..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                value={firmFilter}
                onChange={(e) => setFirmFilter(e.target.value)}
                className="h-9 px-3 border border-gray-200 rounded-md text-sm bg-white sm:w-56"
              >
                <option value="all">All Firms</option>
                {firmOptions.map((firm) => (
                  <option key={firm} value={firm}>{firm}</option>
                ))}
              </select>
            </div>
            {renderTable(filteredPending)}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
                <Input
                  className="pl-9"
                  placeholder="Search history..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                />
              </div>
              <select
                value={firmFilter}
                onChange={(e) => setFirmFilter(e.target.value)}
                className="h-9 px-3 border border-gray-200 rounded-md text-sm bg-white sm:w-56"
              >
                <option value="all">All Firms</option>
                {firmOptions.map((firm) => (
                  <option key={firm} value={firm}>{firm}</option>
                ))}
              </select>
            </div>
            {renderTable(filteredHistory, true)}
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog
        open={!!selectedRow}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRow(null);
            setDecisionNotes("");
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          {selectedRow && (
            <>
              <DialogHeader>
                <DialogTitle>Purchase Return Approval</DialogTitle>
                <DialogDescription>
                  Approve or reject the purchase return for lift{" "}
                  <span className="font-medium">{selectedRow.liftNo}</span> before it moves to Debit Note.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-gray-50">
                  <span className="block text-xs text-gray-500">PR No.</span>
                  <span className="font-medium">{selectedRow.purchaseReturnNo || "-"}</span>
                </div>
                <div className="p-3 rounded-lg bg-gray-50">
                  <span className="block text-xs text-gray-500">Party</span>
                  <span className="font-medium">{selectedRow.partyName || "-"}</span>
                </div>
                <div className="p-3 rounded-lg bg-gray-50">
                  <span className="block text-xs text-gray-500">Product</span>
                  <span className="font-medium">{selectedRow.productName || "-"}</span>
                </div>
                <div className="p-3 rounded-lg bg-gray-50">
                  <span className="block text-xs text-gray-500">Return Qty</span>
                  <span className="font-medium">{selectedRow.returnQty ? selectedRow.returnQty.toFixed(2) : "-"}</span>
                </div>
                <div className="col-span-2 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between">
                  <div>
                    <span className="block text-xs text-amber-700">Credit Note</span>
                    <span className="font-medium text-amber-800">{selectedRow.creditNoteUrl ? "Uploaded" : "Not uploaded"}</span>
                  </div>
                  {selectedRow.creditNoteUrl && (
                    <a
                      href={selectedRow.creditNoteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-800 bg-white border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors"
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              <div>
                <Textarea
                  placeholder="Decision remarks"
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedRow(null);
                    setDecisionNotes("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => submitDecision("Rejected")}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Reject
                </Button>
                <Button
                  className="bg-[#6b8e2f] hover:bg-[#5a7a27]"
                  onClick={() => submitDecision("Approved")}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Approve
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
