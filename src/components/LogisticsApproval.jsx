"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "./ui/card";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import {
  Check,
  Filter,
  History,
  Loader2,
  AlertTriangle,
  Info,
  Truck,
  Search,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { supabase } from "../supabase";
import { useRealtime } from "../hooks/useRealtime";
import { canViewFirm } from "../utils/firmFilter";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";

const formatDateTime = (isoString) => {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return String(isoString);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

export default function LogisticsApproval() {
  const [pendingData, setPendingData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [filteredPendingData, setFilteredPendingData] = useState([]);
  const [filteredHistoryData, setFilteredHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshData, setRefreshData] = useState(false);
  const [selectedIndent, setSelectedIndent] = useState(null);
  const [selectedTransporterIndex, setSelectedTransporterIndex] =
    useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const { user } = useAuth();
  const { updateCount } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("INDENT-PO")
        .select("*");
      if (fetchError) throw fetchError;

      let filteredData = data || [];
      if (user?.firmName) {
        filteredData = filteredData.filter((row) =>
          canViewFirm(user.firmName, row["Firm Name"]),
        );
      }

      const groupedData = Object.values(
        filteredData.reduce((acc, row) => {
          const poNumber = String(
            row.po_number || row["Indent Id."] || "",
          ).trim();
          if (!poNumber) return acc;
          if (!acc[poNumber]) {
            acc[poNumber] = { primaryRow: row, rowIds: [], allMaterials: new Set() };
          }
          acc[poNumber].rowIds.push(row.id);
          if (row["Material"]) {
            acc[poNumber].allMaterials.add(String(row["Material"]).trim());
          }
          return acc;
        }, {}),
      );

      const pending = groupedData
        .map(({ primaryRow: row, rowIds, allMaterials }) => ({
          id: row.id,
          rowIds,
          indentId: String(row.po_number || row["Indent Id."] || ""),
          firmName: row["Firm Name"] || "",
          vendorName: row["Vendor name"] || row["Vendor"] || "",
          material: Array.from(allMaterials).filter(m => m !== "").join(", "),
          poNumber: String(row.po_number || row["Indent Id."] || ""),
          totalQuantity: row["Total Quantity"] || row["Approved Qty"] || "",
          totalAmount: row["Total Amount"] || "",
          planned9: row["Planned9"] || "",
          actualLogistics: row["ActualLogistics"] || "",
          logisticsOptions: Array.isArray(row["LogisticsOptions"])
            ? row["LogisticsOptions"]
            : [],
          proposedTransporter: row["SelectedTransporter"] || null,
          proposedTransporterIndex: row["SelectedTransporterIndex"],
        }))
        .filter((row) => row.planned9 && !row.actualLogistics);

      const history = groupedData
        .map(({ primaryRow: row, rowIds, allMaterials }) => ({
          id: row.id,
          rowIds,
          indentId: String(row.po_number || row["Indent Id."] || ""),
          firmName: row["Firm Name"] || "",
          vendorName: row["Vendor name"] || row["Vendor"] || "",
          material: Array.from(allMaterials).filter(m => m !== "").join(", "),
          poNumber: String(row.po_number || row["Indent Id."] || ""),
          totalQuantity: row["Total Quantity"] || row["Approved Qty"] || "",
          totalAmount: row["Total Amount"] || "",
          actual9: row["Actual9"] || "",
          selectedTransporter: row["SelectedTransporter"] || null,
        }))
        .filter((row) => row.actual9)
        .sort(
          (a, b) =>
            new Date(b.actual9).getTime() - new Date(a.actual9).getTime(),
        );

      setPendingData(pending);
      setFilteredPendingData(pending);
      setHistoryData(history);
      setFilteredHistoryData(history);
      updateCount("logistics-approval", pending.length);
    } catch (fetchErr) {
      console.error("Error fetching logistics approval data:", fetchErr);
      setError(`Failed to load data: ${fetchErr.message}`);
      toast.error("Failed to load data", { description: fetchErr.message });
    } finally {
      setLoading(false);
    }
  }, [user, updateCount]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshData]);

  // Realtime: Listen for changes in INDENT-PO and refresh
  useRealtime("INDENT-PO", () => {
    setRefreshData((prev) => !prev);
  });


  useEffect(() => {
    const query = searchQuery.toLowerCase();
    setFilteredPendingData(
      pendingData.filter(
        (item) =>
          item.indentId.toLowerCase().includes(query) ||
          item.firmName.toLowerCase().includes(query) ||
          item.vendorName.toLowerCase().includes(query) ||
          item.material.toLowerCase().includes(query),
      ),
    );
  }, [pendingData, searchQuery]);

  useEffect(() => {
    const query = historySearchQuery.toLowerCase();
    setFilteredHistoryData(
      historyData.filter(
        (item) =>
          item.indentId.toLowerCase().includes(query) ||
          item.firmName.toLowerCase().includes(query) ||
          item.vendorName.toLowerCase().includes(query) ||
          item.material.toLowerCase().includes(query),
      ),
    );
  }, [historyData, historySearchQuery]);

  const onApprove = async () => {
    if (!selectedIndent || selectedTransporterIndex === null) {
      toast.error("Please select a transporter");
      return;
    }

    const selectedTransporter =
      selectedIndent.logisticsOptions[selectedTransporterIndex];
    if (!selectedTransporter) {
      toast.error("Invalid transporter selection");
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const updatePayload = {
        Actual9: now,
        ActualLogistics: now,
        Planned3: now,
        "Transporter Name": selectedTransporter.name,
        "Transporter Rate": Number(selectedTransporter.cost || 0),
        transpoter_rate_type: selectedTransporter.rateType || "",
        SelectedTransporter: selectedTransporter,
        SelectedTransporterIndex: selectedTransporterIndex,

      };

      const { error: updateError } = await supabase
        .from("INDENT-PO")
        .update(updatePayload)
        .in("id", selectedIndent.rowIds);

      if (updateError) throw updateError;

      toast.success(`Logistics approved for ${selectedIndent.poNumber}`);
      setOpenDialog(false);
      setRefreshData((prev) => !prev);
    } catch (err) {
      console.error("Error approving logistics:", err);
      toast.error("Approval failed", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col bg-slate-50">
      <Card className="shadow-md border border-gray-200 flex-1 flex flex-col bg-white">
        <CardHeader className="p-4 border-b border-gray-200">
          <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-[#7da23a]" />
            Logistics Approval
          </CardTitle>
          <CardDescription className="text-gray-500 mt-1 text-sm">
            Review and approve proposed transporter arrangements.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 flex-1 flex flex-col">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col"
          >
            <TabsList className="grid w-full sm:w-[400px] grid-cols-2 mb-4">
              <TabsTrigger value="pending" className="gap-2">
                Pending{" "}
                <Badge variant="secondary" className="ml-2">
                  {filteredPendingData.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                History{" "}
                <Badge variant="secondary" className="ml-2">
                  {filteredHistoryData.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <div className="mb-4">
              <div className="relative max-w-sm">
                <Search className="absolute h-4 w-4 left-3 top-2.5 text-gray-400" />
                <Input
                  value={
                    activeTab === "pending" ? searchQuery : historySearchQuery
                  }
                  onChange={(e) =>
                    activeTab === "pending"
                      ? setSearchQuery(e.target.value)
                      : setHistorySearchQuery(e.target.value)
                  }
                  className="pl-9 bg-white"
                  placeholder="Search by PO, Vendor, material..."
                />
              </div>
            </div>

            <TabsContent value="pending" className="flex-1 mt-0">
              {loading ? (
                <div className="flex items-center justify-center py-10 text-sm text-gray-500">
                  <Loader2 className="h-5 w-5 mr-2 animate-spin text-[#7da23a]" />
                  Loading pending approvals...
                </div>
              ) : error ? (
                <div className="p-6 rounded-lg border border-dashed border-red-200 bg-red-50 text-red-700 flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5" />
                  {error}
                </div>
              ) : !filteredPendingData.length ? (
                <div className="p-6 rounded-lg border border-dashed bg-secondary/50 text-center">
                  <Info className="h-10 w-10 text-[#7da23a] mx-auto mb-3" />
                  <p className="font-semibold">No logistics pending approval</p>
                </div>
              ) : (
                <div className="overflow-auto border border-gray-200 rounded-xl max-h-[calc(100vh-450px)] relative custom-scrollbar">
                  <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 z-30">
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Action</th>
                        <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">PO Number</th>
                        <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Firm</th>
                        <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Vendor</th>
                        <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Material</th>
                        <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Proposed Transporter</th>
                        <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Proposed Rate</th>
                        <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Submitted On</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {filteredPendingData.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                          <td className="px-4 py-3">
                            <Button
                              size="sm"
                              className="bg-[#7da23a] hover:bg-[#6b8e2f]"
                              onClick={() => {
                                setSelectedIndent(item);
                                setSelectedTransporterIndex(
                                  item.proposedTransporterIndex ?? 0,
                                );
                                setOpenDialog(true);
                              }}
                            >
                              Review
                            </Button>
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {item.poNumber}
                          </td>
                          <td className="px-4 py-3">{item.firmName}</td>
                          <td className="px-4 py-3">{item.vendorName}</td>
                          <td className="px-4 py-3">{item.material}</td>
                          <td className="px-4 py-3">
                            {item.proposedTransporter?.name || "-"}
                          </td>
                          <td className="px-4 py-3">
                            Rs {item.proposedTransporter?.cost || "-"}
                          </td>
                          <td className="px-4 py-3">{formatDateTime(item.planned9)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="flex-1 mt-0">
              <div className="overflow-auto border border-gray-200 rounded-xl max-h-[calc(100vh-450px)] relative custom-scrollbar">
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 z-30">
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">PO Number</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Firm</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Vendor</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Material</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Approved Transporter</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Rate</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Approved On</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredHistoryData.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                        <td className="px-4 py-3 font-medium">
                          {item.poNumber}
                        </td>
                        <td className="px-4 py-3">{item.firmName}</td>
                        <td className="px-4 py-3">{item.vendorName}</td>
                        <td className="px-4 py-3">{item.material}</td>
                        <td className="px-4 py-3">
                          {item.selectedTransporter?.name || "-"}
                        </td>
                        <td className="px-4 py-3">
                          Rs {item.selectedTransporter?.cost || "-"}
                        </td>
                        <td className="px-4 py-3">{formatDateTime(item.actual9)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-4xl">
          {selectedIndent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-[#7da23a]" />
                  Approve Logistics for {selectedIndent.poNumber}
                </DialogTitle>
                <div className="grid grid-cols-2 gap-4 mt-4 text-sm bg-slate-50 p-4 rounded-lg">
                  <div>
                    <Label className="text-gray-500">Vendor</Label>
                    <p className="font-medium">{selectedIndent.vendorName}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Material</Label>
                    <p className="font-medium">{selectedIndent.material}</p>
                  </div>
                </div>
              </DialogHeader>

              <div className="py-4">
                <Label className="mb-4 block font-semibold">
                  Comparison of Proposed Options
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedIndent.logisticsOptions.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedTransporterIndex(idx)}
                      className={`p-4 border rounded-xl text-left transition-all ${
                        selectedTransporterIndex === idx
                          ? "border-[#7da23a] bg-green-50 ring-1 ring-[#7da23a]"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-gray-900">
                          {opt.name}
                        </span>
                        {selectedIndent.proposedTransporterIndex === idx && (
                          <Badge
                            variant="secondary"
                            className="bg-blue-100 text-blue-700"
                          >
                            Proposed
                          </Badge>
                        )}
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">{opt.rateType}</span>
                        <span className="text-lg font-bold text-[#7da23a]">
                          Rs {opt.cost}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenDialog(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-[#7da23a] hover:bg-[#6b8e2f]"
                  onClick={onApprove}
                  disabled={isSubmitting || selectedTransporterIndex === null}
                >
                  {isSubmitting && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Approve Selected Transporter
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
