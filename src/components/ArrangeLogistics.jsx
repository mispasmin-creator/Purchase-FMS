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
  TrendingDown,
  ChevronsUpDown,
  Plus,
  Trash,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import SuperAdminEditModal from "./SuperAdminEditModal";
import { useNotification } from "../context/NotificationContext";
import { supabase } from "../supabase";
import { fetchMasterData } from "../utils/masterDataUtils";
import { canViewFirm } from "../utils/firmFilter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

const MAX_TRANSPORTERS = 10;
const INITIAL_TRANSPORTER_SLOTS = 3;

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

const money = (val) => {
  const n = Number(val);
  if (isNaN(n)) return "0.00";
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const createEmptyTransporterForm = () => ({
  name: "",
  rateType: "",
  cost: 0,
});

const normalizeTransporterForm = (transporter = {}) => ({
  ...createEmptyTransporterForm(),
  ...transporter,
  rateType: String(transporter.rateType || transporter.vehicleType || "").toLowerCase(),
});

export default function ArrangeLogistics() {
  const [pendingData, setPendingData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [filteredPendingData, setFilteredPendingData] = useState([]);
  const [filteredHistoryData, setFilteredHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshData, setRefreshData] = useState(false);
  const [selectedIndent, setSelectedIndent] = useState(null);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHistoryDate, setSelectedHistoryDate] = useState("");
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const { user, isSuperAdmin } = useAuth();
  const [superAdminEditItem, setSuperAdminEditItem] = useState(null);
  const { updateCount } = useNotification();
  const [transporterMasterOptions, setTransporterMasterOptions] = useState([]);
  const [selectedTransporterIndex, setSelectedTransporterIndex] = useState(0);
  const [transporterSearchTerms, setTransporterSearchTerms] = useState(Array.from({ length: INITIAL_TRANSPORTER_SLOTS }, () => ""));
  const [transporterPopoverOpen, setTransporterPopoverOpen] = useState(Array.from({ length: INITIAL_TRANSPORTER_SLOTS }, () => false));
  const [transporterForms, setTransporterForms] = useState(Array.from({ length: INITIAL_TRANSPORTER_SLOTS }, () => createEmptyTransporterForm()));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const transporterMasterMap = useMemo(
    () =>
      transporterMasterOptions.reduce((acc, transporter) => {
        if (transporter?.name) {
          acc[transporter.name] = transporter;
        }
        return acc;
      }, {}),
    [transporterMasterOptions],
  );

  const syncHelperArrays = useCallback((length) => {
    setTransporterSearchTerms((prev) => {
      const next = [...prev];
      while (next.length < length) next.push("");
      return next.slice(0, length);
    });
    setTransporterPopoverOpen((prev) => {
      const next = [...prev];
      while (next.length < length) next.push(false);
      return next.slice(0, length);
    });
  }, []);

  const fetchTransporterMasterOptions = useCallback(async () => {
    try {
      const masterData = await fetchMasterData();
      setTransporterMasterOptions(masterData.transporterMasterOptions || []);
    } catch (fetchError) {
      console.error("Error fetching transporter options:", fetchError);
    }
  }, []);

  useEffect(() => {
    fetchTransporterMasterOptions();
  }, [fetchTransporterMasterOptions]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase.from("INDENT-PO").select("*");
        if (fetchError) throw fetchError;

        let filteredData = data || [];
        if (user?.firmName) {
          filteredData = filteredData.filter((row) =>
            canViewFirm(user.firmName, row["Firm Name"]),
          );
        }
        filteredData = filteredData.filter(
          (row) =>
            String(row["Transport Type"]).trim().toLowerCase() === "ex-factory",
        );

        const groupedData = Object.values(
          filteredData.reduce((acc, row) => {
            const poNumber = String(row.po_number || row["Indent Id."] || "").trim();
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
            transportType: row["Transport Type"] || "",
            plannedLogistics: row["PlannedLogistics"] || "",
            actualLogistics: row["ActualLogistics"] || "",
            actual2: row["Actual2"] || "",
            logisticsOptions: Array.isArray(row["LogisticsOptions"]) ? row["LogisticsOptions"] : [],
          }))
          .filter((row) => row.plannedLogistics && !row.actualLogistics && !row.Planned9 && row.actual2)
          .sort((a, b) => new Date(b.plannedLogistics).getTime() - new Date(a.plannedLogistics).getTime());

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
            actualLogistics: row["ActualLogistics"] || "",
            planned9: row["Planned9"] || "",
            selectedTransporter: row["SelectedTransporter"] || (Array.isArray(row["LogisticsOptions"]) ? row["LogisticsOptions"][row["SelectedTransporterIndex"] || 0] : null),
          }))
          .filter((row) => row.actualLogistics || row.planned9)
          .sort((a, b) => {
            const dateA = new Date(a.actualLogistics || a.planned9).getTime();
            const dateB = new Date(b.actualLogistics || b.planned9).getTime();
            return dateB - dateA;
          });

        setPendingData(pending);
        setFilteredPendingData(pending);
        setHistoryData(history);
        setFilteredHistoryData(history);
        updateCount("logistics", pending.length);
      } catch (fetchErr) {
        console.error("Error fetching logistics data:", fetchErr);
        setError(`Failed to load data: ${fetchErr.message}`);
        toast.error("Failed to load data", { description: fetchErr.message });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [refreshData, updateCount, user]);

  useEffect(() => {
    let filtered = [...pendingData];
    if (selectedDate) {
      filtered = filtered.filter((item) => new Date(item.plannedLogistics).toISOString().split("T")[0] === selectedDate);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) =>
        String(item.indentId).toLowerCase().includes(query) ||
        String(item.firmName).toLowerCase().includes(query) ||
        String(item.vendorName).toLowerCase().includes(query) ||
        String(item.material).toLowerCase().includes(query),
      );
    }
    setFilteredPendingData(filtered);
  }, [pendingData, searchQuery, selectedDate]);

  useEffect(() => {
    let filtered = [...historyData];
    if (selectedHistoryDate) {
      filtered = filtered.filter((item) => new Date(item.actualLogistics).toISOString().split("T")[0] === selectedHistoryDate);
    }
    if (historySearchQuery.trim()) {
      const query = historySearchQuery.toLowerCase();
      filtered = filtered.filter((item) =>
        String(item.indentId).toLowerCase().includes(query) ||
        String(item.firmName).toLowerCase().includes(query) ||
        String(item.vendorName).toLowerCase().includes(query) ||
        String(item.material).toLowerCase().includes(query) ||
        String(item.selectedTransporter?.name || "").toLowerCase().includes(query),
      );
    }
    setFilteredHistoryData(filtered);
  }, [historyData, historySearchQuery, selectedHistoryDate]);

  const updateTransporterForm = (index, field, value) => {
    if (field === "cost") value = value === "" ? "" : value.replace(/[^0-9.]/g, "");
    setTransporterForms((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const applyTransporterMasterSelection = (index, transporterName) => {
    const masterTransporter = transporterMasterMap[transporterName];
    setTransporterForms((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        name: transporterName,
        rateType: masterTransporter?.rateType || next[index]?.rateType || "",
        cost: masterTransporter?.rate || next[index]?.cost || "",
      };
      return next;
    });
  };

  const addTransporterSlot = () => {
    if (transporterForms.length >= MAX_TRANSPORTERS) {
      toast.error(`Only ${MAX_TRANSPORTERS} transporter slots are allowed`);
      return;
    }
    setTransporterForms((prev) => [...prev, createEmptyTransporterForm()]);
    syncHelperArrays(transporterForms.length + 1);
  };

  const removeTransporterSlot = (index) => {
    if (transporterForms.length <= 1) {
      toast.error("At least one transporter slot is required");
      return;
    }
    setTransporterForms((prev) => prev.filter((_, formIndex) => formIndex !== index));
    syncHelperArrays(transporterForms.length - 1);
    setSelectedTransporterIndex((prev) => (prev >= transporterForms.length - 1 ? 0 : prev));
  };

  const lowestCost = useMemo(() => {
    const costs = transporterForms
      .filter((transporter) => transporter.name && Number(transporter.cost || 0) > 0)
      .map((transporter) => Number(transporter.cost));
    return costs.length ? Math.min(...costs) : null;
  }, [transporterForms]);

  const quickSelectLowestCost = () => {
    const bestIndex = transporterForms.findIndex(
      (transporter) => transporter.name && Number(transporter.cost || 0) > 0 && Number(transporter.cost) === lowestCost,
    );
    if (bestIndex !== -1) {
      setSelectedTransporterIndex(bestIndex);
      toast.success(`Selected transporter with best cost: Rs ${lowestCost}`);
    }
  };

  const openArrangeDialog = (indent) => {
    setSelectedIndent(indent);
    const nextForms = indent.logisticsOptions && indent.logisticsOptions.length
      ? indent.logisticsOptions.map(normalizeTransporterForm)
      : Array.from({ length: INITIAL_TRANSPORTER_SLOTS }, () => createEmptyTransporterForm());
    setTransporterForms(nextForms);
    syncHelperArrays(nextForms.length);
    setSelectedTransporterIndex(0);
    setOpenDialog(true);
    setSelectedHistory(null);
  };

  const openHistoryDialog = (item) => {
    setSelectedHistory(item);
    setSelectedIndent(null);
    setOpenDialog(true);
  };

  const closeDialog = () => {
    setOpenDialog(false);
    setSelectedIndent(null);
    setSelectedHistory(null);
    setTransporterForms(Array.from({ length: INITIAL_TRANSPORTER_SLOTS }, () => createEmptyTransporterForm()));
    syncHelperArrays(INITIAL_TRANSPORTER_SLOTS);
    setSelectedTransporterIndex(0);
  };

  async function onSubmit() {
    if (!selectedIndent) return;
    const filledTransporters = transporterForms.filter((transporter) =>
      Object.values(transporter).some((value) => String(value || "").trim() !== ""),
    );
    if (!filledTransporters.length) {
      toast.error("Please add at least one transporter");
      return;
    }

    const selectedTransporter = filledTransporters[selectedTransporterIndex] || filledTransporters[0] || null;
    if (!selectedTransporter?.name) {
      toast.error("Please choose a selected transporter");
      return;
    }

    setIsSubmitting(true);
    try {
      const normalizedTransporters = filledTransporters.map((transporter) => ({
        ...normalizeTransporterForm(transporter),
        cost: Number(transporter.cost || 0),
      }));
      const { data: updatedRows, error: updateError } = await supabase
        .from("INDENT-PO")
        .update({
          Planned9: new Date().toISOString(),
          LogisticsOptions: normalizedTransporters,
          SelectedTransporter: selectedTransporter,
          SelectedTransporterIndex: normalizedTransporters.findIndex(
            (transporter) => transporter.name === selectedTransporter.name && Number(transporter.cost) === Number(selectedTransporter.cost),
          ),
        })
        .select("id, Planned9")
        .in("id", selectedIndent.rowIds || []);

      if (updateError) throw updateError;
      if (!updatedRows?.length) {
        throw new Error("No INDENT-PO row was updated for logistics submission.");
      }
      toast.success(`Arranged logistics for ${selectedIndent.poNumber || selectedIndent.indentId}`);
      closeDialog();
      setTimeout(() => setRefreshData((prev) => !prev), 500);
    } catch (submitError) {
      console.error("Error arranging logistics:", submitError);
      toast.error("Failed to arrange logistics", { description: submitError.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col bg-slate-50">
      {superAdminEditItem && (
        <SuperAdminEditModal
          title={`Edit PO — ${superAdminEditItem.poNumber}`}
          tableName="INDENT-PO"
          pkField="id"
          pkValue={superAdminEditItem.id}
          fields={[
            { label: "PO Number", dbKey: "po_number", value: superAdminEditItem.poNumber, type: "text" },
            { label: "Firm Name", dbKey: "Firm Name", value: superAdminEditItem.firmName, type: "text" },
            { label: "Vendor Name", dbKey: "Vendor name", value: superAdminEditItem.vendorName, type: "text" },
            { label: "Total Amount", dbKey: "Total Amount", value: superAdminEditItem.totalAmount, type: "number" },
            { label: "Total Quantity", dbKey: "Total Quantity", value: superAdminEditItem.totalQuantity, type: "number" },
            { label: "Transport Type", dbKey: "Transport Type", value: superAdminEditItem.transportType, type: "text" },
          ]}
          onClose={() => setSuperAdminEditItem(null)}
          onSaved={() => { setSuperAdminEditItem(null); }}
        />
      )}
      <Card className="shadow-md border border-gray-200 flex-1 flex flex-col bg-white">
        <CardHeader className="p-4 border-b border-gray-200">
          <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-3">
            <Truck className="h-6 w-6 text-[#7da23a]" />
            Arrange Logistics
          </CardTitle>
          <CardDescription className="text-gray-500 mt-1 text-sm">
            Capture transporter options after PO creation and before Tally entry.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 flex-1 flex flex-col">
          <Tabs defaultValue="pending" className="flex-1 flex flex-col">
            <TabsList className="grid w-full sm:w-[430px] grid-cols-2 mb-4">
              <TabsTrigger value="pending" className="gap-2"><Truck className="h-4 w-4" />Pending <Badge variant="secondary" className="ml-2">{filteredPendingData.length}</Badge></TabsTrigger>
              <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" />History <Badge variant="secondary" className="ml-2">{filteredHistoryData.length}</Badge></TabsTrigger>
            </TabsList>

            <div className="mb-4 p-4 bg-green-50/50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-gray-500" />
                <Label className="text-sm font-medium">Filters</Label>
                <Button variant="outline" size="sm" onClick={() => { setSelectedDate(""); setSearchQuery(""); }} className="ml-auto bg-white">Clear Pending</Button>
                <Button variant="outline" size="sm" onClick={() => { setSelectedHistoryDate(""); setHistorySearchQuery(""); }} className="bg-white">Clear History</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div><Label className="text-xs mb-1 block">Pending Date</Label><Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="h-9 bg-white" /></div>
                <div><Label className="text-xs mb-1 block">Pending Search</Label><div className="relative"><Search className="absolute h-4 w-4 left-3 top-2.5 text-gray-400" /><Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-9 bg-white pl-9" placeholder="PO, vendor, material..." /></div></div>
                <div><Label className="text-xs mb-1 block">History Date</Label><Input type="date" value={selectedHistoryDate} onChange={(e) => setSelectedHistoryDate(e.target.value)} className="h-9 bg-white" /></div>
                <div><Label className="text-xs mb-1 block">History Search</Label><div className="relative"><Search className="absolute h-4 w-4 left-3 top-2.5 text-gray-400" /><Input value={historySearchQuery} onChange={(e) => setHistorySearchQuery(e.target.value)} className="h-9 bg-white pl-9" placeholder="PO, transporter..." /></div></div>
              </div>
            </div>

            <TabsContent value="pending" className="flex-1 mt-0">
              {loading ? (
                <div className="flex items-center justify-center py-10 text-sm text-gray-500">
                  <Loader2 className="h-5 w-5 mr-2 animate-spin text-[#7da23a]" />
                  Loading pending logistics...
                </div>
              ) : error ? (
                <div className="p-6 rounded-lg border border-dashed border-red-200 bg-red-50 text-red-700 flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5" />
                  {error}
                </div>
              ) : !filteredPendingData.length ? (
                <div className="p-6 rounded-lg border border-dashed bg-secondary/50 text-center">
                  <Info className="h-10 w-10 text-[#7da23a] mx-auto mb-3" />
                  <p className="font-semibold">No pending logistics items</p>
                </div>
              ) : (
                <Card className="shadow-none border flex-1 flex flex-col">
                  <CardHeader className="py-3 px-4 border-b">
                    <CardTitle className="flex items-center text-base">
                      <Truck className="w-5 h-5 mr-2 text-[#7da23a]" />
                      Pending Logistics ({filteredPendingData.length})
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs">
                      POs waiting for transporter arrangement before Tally entry.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 overflow-hidden">
                    <div className="overflow-auto max-h-[calc(100vh-450px)] relative custom-scrollbar">
                      <table className="w-full text-sm border-collapse">
                        <thead className="sticky top-0 z-30">
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Action</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">PO Number</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Firm Name</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Vendor</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Material</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">PO Qty</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Total Amount</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Planned</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {filteredPendingData.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  <Button size="sm" className="bg-[#7da23a] hover:bg-[#6b8e2f]" onClick={() => openArrangeDialog(item)}>Arrange</Button>
                                  {isSuperAdmin && (
                                    <button onClick={() => setSuperAdminEditItem(item)} className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-md hover:bg-purple-200 border border-purple-300">
                                      <ShieldCheck className="h-3 w-3 mr-1" />Edit
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">{item.poNumber || item.indentId}</td>
                              <td className="px-4 py-3">{item.firmName}</td>
                              <td className="px-4 py-3">{item.vendorName}</td>
                              <td className="px-4 py-3">{item.material}</td>
                              <td className="px-4 py-3">{item.totalQuantity || "-"}</td>
                              <td className="px-4 py-3">{item.totalAmount || "-"}</td>
                              <td className="px-4 py-3">{formatDateTime(item.plannedLogistics)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="history" className="flex-1 mt-0">
              {loading ? (
                <div className="flex items-center justify-center py-10 text-sm text-gray-500">
                  <Loader2 className="h-5 w-5 mr-2 animate-spin text-[#7da23a]" />
                  Loading logistics history...
                </div>
              ) : !filteredHistoryData.length ? (
                <div className="p-6 rounded-lg border border-dashed bg-secondary/50 text-center">
                  <Info className="h-10 w-10 text-[#7da23a] mx-auto mb-3" />
                  <p className="font-semibold">No logistics history yet</p>
                </div>
              ) : (
                <Card className="shadow-none border flex-1 flex flex-col">
                  <CardHeader className="py-3 px-4 border-b">
                    <CardTitle className="flex items-center text-base">
                      <History className="w-5 h-5 mr-2 text-[#7da23a]" />
                      Logistics History ({filteredHistoryData.length})
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs">
                      Completed logistics arrangements with selected transporters.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 overflow-hidden">
                    <div className="overflow-auto max-h-[calc(100vh-450px)] relative custom-scrollbar">
                      <table className="w-full text-sm border-collapse">
                        <thead className="sticky top-0 z-30">
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">View</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Status</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">PO Number</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Firm Name</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Vendor</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Material</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Selected Transporter</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Cost</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm">Date</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {filteredHistoryData.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  <Button variant="outline" size="sm" onClick={() => openHistoryDialog(item)}>View</Button>
                                  {isSuperAdmin && (
                                    <button onClick={() => setSuperAdminEditItem(item)} className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-md hover:bg-purple-200 border border-purple-300">
                                      <ShieldCheck className="h-3 w-3 mr-1" />Edit
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {item.actualLogistics ? (
                                  <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Approved</Badge>
                                ) : (
                                  <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs">Pending Approval</Badge>
                                )}
                              </td>
                              <td className="px-4 py-3">{item.poNumber || item.indentId}</td>
                              <td className="px-4 py-3">{item.firmName}</td>
                              <td className="px-4 py-3">{item.vendorName}</td>
                              <td className="px-4 py-3">{item.material}</td>
                              <td className="px-4 py-3">{item.selectedTransporter?.name || "-"}</td>
                              <td className="px-4 py-3">{item.selectedTransporter?.cost || "-"}</td>
                              <td className="px-4 py-3">{formatDateTime(item.actualLogistics || item.planned9)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-7xl max-h-[94vh] overflow-y-auto p-0">
          {selectedIndent && (
            <div className="flex flex-col">
              <DialogHeader className="p-6 pb-3 border-b">
                <DialogTitle className="text-xl font-semibold flex items-center gap-2"><Truck className="h-5 w-5 text-[#7da23a]" />Arrange Logistics for {selectedIndent.poNumber || selectedIndent.indentId}</DialogTitle>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 text-sm">
                  <div className="p-3 rounded-lg bg-gray-50"><span className="block text-xs text-gray-500">Vendor</span><span className="font-medium">{selectedIndent.vendorName}</span></div>
                  <div className="p-3 rounded-lg bg-gray-50"><span className="block text-xs text-gray-500">Material</span><span className="font-medium">{selectedIndent.material}</span></div>
                  <div className="p-3 rounded-lg bg-gray-50"><span className="block text-xs text-gray-500">PO Qty</span><span className="font-medium">{selectedIndent.totalQuantity || "-"}</span></div>
                  <div className="p-3 rounded-lg bg-gray-50"><span className="block text-xs text-gray-500">PO Amount</span><span className="font-medium">{selectedIndent.totalAmount || "-"}</span></div>
                </div>
              </DialogHeader>

              <div className="px-6 pt-4">
                {lowestCost !== null && <Button onClick={quickSelectLowestCost} className="w-full mb-4 bg-green-600 hover:bg-green-700 text-white" size="sm"><TrendingDown className="w-4 h-4 mr-2" />Select Lowest Cost (Rs {lowestCost})</Button>}
                <div className="flex justify-between items-center mb-3"><div><p className="text-sm font-medium text-gray-700">Transporter Options</p><p className="text-xs text-gray-500">Starts with 3 transporters and can scale up to {MAX_TRANSPORTERS}.</p></div><Button variant="outline" size="sm" onClick={addTransporterSlot}><Plus className="h-4 w-4 mr-1" />Add Transporter</Button></div>
              </div>

              <div className="flex-1 px-6 pb-4 overflow-y-auto">
                <div className="grid gap-4 lg:grid-cols-3">
                  {transporterForms.map((currentTransporter, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setSelectedTransporterIndex(idx)}
                      className={`p-4 border rounded-xl transition-all cursor-pointer ${
                        selectedTransporterIndex === idx 
                          ? "border-[#7da23a] bg-green-50 shadow-sm ring-1 ring-[#7da23a]" 
                          : "border-gray-200 bg-gray-50/30 hover:border-gray-300"
                      } space-y-4`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700">Transporter {idx + 1}</span>
                        {selectedTransporterIndex === idx && <Badge className="text-white bg-[#7da23a] hover:bg-[#7da23a]">Selected</Badge>}
                        {transporterForms.length > 1 && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); removeTransporterSlot(idx); }}
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-500 hover:bg-red-50"
                          >
                            <Trash size={16} className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      {/* Transporter Name Popover */}
                      <Popover open={transporterPopoverOpen[idx]} onOpenChange={(open) => setTransporterPopoverOpen((prev) => prev.map((value, index) => index === idx ? open : value))}>
                        <PopoverTrigger asChild>
                          <Button 
                            type="button" 
                            variant="outline" 
                            className="w-full justify-between text-sm border-gray-200 h-9 bg-white font-normal"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="truncate">{currentTransporter.name || "Select transporter"}</span>
                            <ChevronsUpDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2">
                          <Input 
                            value={transporterSearchTerms[idx] || ""} 
                            onChange={(e) => setTransporterSearchTerms((prev) => prev.map((term, index) => index === idx ? e.target.value : term))} 
                            placeholder="Search transporter..." 
                            className="mb-2 h-8 text-xs" 
                          />
                          <div className="max-h-60 overflow-y-auto">
                            {transporterMasterOptions
                              .filter((transporter) => transporter.name.toLowerCase().includes((transporterSearchTerms[idx] || "").trim().toLowerCase()))
                              .map((transporter, transporterIndex) => (
                                <button 
                                  key={`${idx}-${transporterIndex}`} 
                                  type="button" 
                                  onClick={(e) => { 
                                    e.stopPropagation();
                                    applyTransporterMasterSelection(idx, transporter.name); 
                                    setTransporterSearchTerms((prev) => prev.map((term, index) => index === idx ? "" : term)); 
                                    setTransporterPopoverOpen((prev) => prev.map((value, index) => index === idx ? false : value)); 
                                  }} 
                                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100"
                                >
                                  <span>{transporter.name}</span>
                                  {currentTransporter.name === transporter.name && <Check className="w-4 h-4 text-primary" />}
                                </button>
                              ))}
                          </div>
                        </PopoverContent>
                      </Popover>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="block mb-1 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Rate Type</Label>
                          <Select value={currentTransporter.rateType || undefined} onValueChange={(value) => updateTransporterForm(idx, "rateType", value)}>
                            <SelectTrigger className="text-sm border-gray-200 h-9 bg-white" onClick={(e) => e.stopPropagation()}>
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fixed">Fixed</SelectItem>
                              <SelectItem value="per mt">Per MT</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="block mb-1 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Entered Rate</Label>
                          <Input 
                            value={currentTransporter.cost} 
                            onChange={(e) => updateTransporterForm(idx, "cost", e.target.value)} 
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm border-gray-200 h-9 bg-white" 
                            placeholder="0.00" 
                          />
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-100 space-y-2">
                        {(() => {
                          const qty = Number(selectedIndent?.totalQuantity) || 1;
                          const entered = Number(currentTransporter.cost) || 0;
                          const isFixed = currentTransporter.rateType === "fixed";
                          
                          const totalCost = isFixed ? entered : entered * qty;
                          const ratePerMt = isFixed ? (entered / qty) : entered;

                          return (
                            <>
                              <div className="flex justify-between items-center p-2 rounded-lg bg-[#7da23a]/10 border border-[#7da23a]/20">
                                <span className="text-xs font-medium text-[#7da23a]">Rate per MT:</span>
                                <span className="text-base font-bold text-[#7da23a]">₹{money(ratePerMt)}</span>
                              </div>
                              <div className="flex justify-between items-center px-2 text-xs">
                                <span className="text-gray-500 italic">Total Est. Cost:</span>
                                <span className="font-semibold text-gray-700">₹{money(totalCost)}</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 px-6 flex justify-end gap-3 rounded-b-2xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]"><Button variant="outline" onClick={closeDialog} className="px-6">Cancel</Button><Button onClick={onSubmit} disabled={isSubmitting || !transporterForms.some((item) => item.name)} className="px-6 bg-[#7da23a] hover:bg-[#6b8e2f] text-white">{isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Submit for Approval</Button></div>
            </div>
          )}

          {selectedHistory && <div className="p-6 space-y-4"><DialogHeader className="p-0"><DialogTitle className="text-lg font-semibold">Logistics Arrangement Summary</DialogTitle></DialogHeader><div className="grid grid-cols-2 gap-3 text-sm"><div className="p-3 rounded-lg bg-gray-50"><span className="block text-xs text-gray-500">PO Number</span><span className="font-medium">{selectedHistory.poNumber || selectedHistory.indentId}</span></div><div className="p-3 rounded-lg bg-gray-50"><span className="block text-xs text-gray-500">Transporter</span><span className="font-medium">{selectedHistory.selectedTransporter?.name || "-"}</span></div><div className="p-3 rounded-lg bg-gray-50"><span className="block text-xs text-gray-500">Cost</span><span className="font-medium">{selectedHistory.selectedTransporter?.cost || "-"}</span></div><div className="p-3 rounded-lg bg-gray-50"><span className="block text-xs text-gray-500">Completed</span><span className="font-medium">{formatDateTime(selectedHistory.actualLogistics)}</span></div></div><div className="flex justify-end"><Button variant="outline" onClick={closeDialog}>Close</Button></div></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
