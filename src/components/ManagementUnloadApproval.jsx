"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, History, Info, Loader2, Search } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export default function ManagementUnloadApproval() {
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: fetchError } = await supabase
        .from("LIFT-ACCOUNTS")
        .select("*")
        .order("Timestamp", { ascending: false });
      if (fetchError) throw fetchError;

      let rows = (data || []).map((row) => ({
        id: row.id,
        liftNo: String(row["Lift No"] || "").trim(),
        indentNo: String(row["Indent no."] || "").trim(),
        vendorName: String(row["Vendor Name"] || "").trim(),
        rawMaterialName: String(row["Raw Material Name"] || "").trim(),
        firmName: String(row["Firm Name"] || "").trim(),
        physicalCondition: String(row["Physical Condition"] || "").trim(),
        moisture: String(row["Moisture"] || "").trim(),
        receiptTime: row["Actual 1"] || "",
        plannedUnloadApproval: row["Planned Unload Approval"] || "",
        actualUnloadApproval: row["Actual Unload Approval"] || "",
        unloadApprovalRequired: String(
          row["Unload Approval Required"] || "",
        ).trim(),
        unloadApprovalStatus: String(row["Unload Approval Status"] || "").trim(),
        unloadApprovalTrigger: String(
          row["Unload Approval Trigger"] || "",
        ).trim(),
        unloadApprovalRemarks: String(
          row["Unload Approval Remarks"] || "",
        ).trim(),
        unloadApprovalBy: String(row["Unload Approval By"] || "").trim(),
      }));

      if (user?.firmName && user.firmName.toLowerCase() !== "all") {
        const firm = user.firmName.toLowerCase();
        rows = rows.filter((row) => row.firmName.toLowerCase() === firm);
      }

      rows = rows.filter(
        (row) =>
          row.receiptTime &&
          row.unloadApprovalRequired.toLowerCase() === "yes",
      );

      const pending = rows.filter(
        (row) => row.unloadApprovalStatus.toLowerCase() === "pending",
      );
      const history = rows
        .filter((row) => row.unloadApprovalStatus.toLowerCase() !== "pending")
        .sort(
          (a, b) =>
            new Date(b.actualUnloadApproval).getTime() -
            new Date(a.actualUnloadApproval).getTime(),
        );

      setPendingData(pending);
      setHistoryData(history);
      updateCount("unload-management", pending.length);
    } catch (fetchErr) {
      console.error("Error fetching unload approvals:", fetchErr);
      setError(fetchErr.message || "Failed to load unload approvals");
      toast.error("Failed to load unload approvals", {
        description: fetchErr.message,
      });
    } finally {
      setLoading(false);
    }
  }, [updateCount, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredPending = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return pendingData.filter(
      (item) =>
        item.liftNo.toLowerCase().includes(query) ||
        item.indentNo.toLowerCase().includes(query) ||
        item.vendorName.toLowerCase().includes(query) ||
        item.rawMaterialName.toLowerCase().includes(query) ||
        item.unloadApprovalTrigger.toLowerCase().includes(query),
    );
  }, [pendingData, searchQuery]);

  const filteredHistory = useMemo(() => {
    const query = historySearchQuery.trim().toLowerCase();
    return historyData.filter(
      (item) =>
        item.liftNo.toLowerCase().includes(query) ||
        item.indentNo.toLowerCase().includes(query) ||
        item.vendorName.toLowerCase().includes(query) ||
        item.rawMaterialName.toLowerCase().includes(query) ||
        item.unloadApprovalStatus.toLowerCase().includes(query),
    );
  }, [historyData, historySearchQuery]);

  const submitDecision = async (status) => {
    if (!selectedRow) return;
    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from("LIFT-ACCOUNTS")
        .update({
          "Unload Approval Status": status,
          "Actual Unload Approval": new Date().toISOString(),
          "Unload Approval Remarks": decisionNotes.trim() || null,
          "Unload Approval By":
            user?.name || user?.email || user?.username || "Management",
        })
        .eq("id", selectedRow.id);
      if (updateError) throw updateError;
      toast.success(`Unload ${status.toLowerCase()} for ${selectedRow.liftNo}`);
      setSelectedRow(null);
      setDecisionNotes("");
      fetchData();
    } catch (error) {
      console.error("Error updating unload approval:", error);
      toast.error("Failed to update unload approval", {
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
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-red-500" />
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
              ? "No unload approval history yet."
              : "No pending unload approvals."}
          </p>
        </div>
      );
    }
    return (
      <div className="overflow-x-auto border border-gray-200 rounded-xl">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              {!isHistory && <TableHead>Action</TableHead>}
              <TableHead>Lift</TableHead>
              <TableHead>PO</TableHead>
              <TableHead>Firm</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Material</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>{isHistory ? "Closed On" : "Receipt On"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((item) => (
              <TableRow key={item.id}>
                {!isHistory && (
                  <TableCell>
                    <Button
                      className="bg-[#7da23a] hover:bg-[#6b8e2f]"
                      onClick={() => {
                        setSelectedRow(item);
                        setDecisionNotes(item.unloadApprovalRemarks || "");
                      }}
                    >
                      Review
                    </Button>
                  </TableCell>
                )}
                <TableCell>{item.liftNo}</TableCell>
                <TableCell>{item.indentNo || "-"}</TableCell>
                <TableCell>{item.firmName || "-"}</TableCell>
                <TableCell>{item.vendorName || "-"}</TableCell>
                <TableCell>{item.rawMaterialName || "-"}</TableCell>
                <TableCell>{item.unloadApprovalTrigger || "-"}</TableCell>
                <TableCell>
                  <Badge className={statusTone(item.unloadApprovalStatus)}>
                    {item.unloadApprovalStatus || "Pending"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {formatDateTime(
                    isHistory
                      ? item.actualUnloadApproval
                      : item.receiptTime || item.plannedUnloadApproval,
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-full mx-auto bg-white border border-gray-200 rounded-lg shadow-md">
      <CardHeader className="p-4 border-b border-gray-200">
        <CardTitle className="flex items-center gap-2 text-lg text-gray-800">
          <AlertTriangle className="h-5 w-5 text-[#7da23a]" />
          Management App For Unload
        </CardTitle>
        <CardDescription className="text-sm text-gray-500">
          Review lifts from receipt check where condition is bad, moisture is
          present, or both. These lifts stay blocked until approved.
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
            <div className="relative">
              <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
              <Input
                className="pl-9"
                placeholder="Search lift, PO, vendor, trigger..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {renderTable(filteredPending)}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="relative">
              <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
              <Input
                className="pl-9"
                placeholder="Search lift history..."
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
              />
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
                <DialogTitle>Unload Approval Review</DialogTitle>
                <DialogDescription>
                  Approve or reject unload for lift{" "}
                  <span className="font-medium">{selectedRow.liftNo}</span>.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-gray-50">
                  <span className="block text-xs text-gray-500">Vendor</span>
                  <span className="font-medium">{selectedRow.vendorName}</span>
                </div>
                <div className="p-3 rounded-lg bg-gray-50">
                  <span className="block text-xs text-gray-500">Material</span>
                  <span className="font-medium">
                    {selectedRow.rawMaterialName}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-gray-50">
                  <span className="block text-xs text-gray-500">
                    Physical Condition
                  </span>
                  <span className="font-medium">
                    {selectedRow.physicalCondition || "-"}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-gray-50">
                  <span className="block text-xs text-gray-500">Moisture</span>
                  <span className="font-medium">
                    {selectedRow.moisture || "-"}
                  </span>
                </div>
                <div className="col-span-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <span className="block text-xs text-amber-700">Trigger</span>
                  <span className="font-medium text-amber-800">
                    {selectedRow.unloadApprovalTrigger || "-"}
                  </span>
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
                  className="bg-[#7da23a] hover:bg-[#6b8e2f]"
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
