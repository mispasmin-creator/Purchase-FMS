"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
  Check,
  Filter,
  CheckCircle2,
  History,
  Loader2,
  AlertTriangle,
  Info,
  Users,
  Search,
  TrendingDown,
  ChevronsUpDown,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { supabase } from "../supabase";
import { fetchMasterData } from "../utils/masterDataUtils";
import { useRealtime } from "../hooks/useRealtime";
import { canViewFirm } from "../utils/firmFilter";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Helper function to format datetime
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

const createEmptyVendorForm = () => ({
  name: "",
  rateType: "basic",
  rate: 0,
  withTax: "no",
  gstPercent: 0,
  paymentTerm: "",
  advancePercentage: "",
  quotationNumber: "",
  quotationDate: "",
  whatsapp: "",
  email: "",
  alumina: "",
  iron: "",
  sio2: "",
  cao: "",
  ap: "",
  bd: "",
  fineness: "",
  packaging: "",
  transportType: "FOR",
  notes: "",
  expectedDate: "",
});

const normalizeVendorForm = (vendor = {}) => ({
  ...createEmptyVendorForm(),
  ...vendor,
});

export default function ThreeParty() {
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

  // Filter states
  const [selectedDate, setSelectedDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHistoryDate, setSelectedHistoryDate] = useState("");
  const [historySearchQuery, setHistorySearchQuery] = useState("");

  const { user } = useAuth();
  const { updateCount } = useNotification();
  const [vendorMasterOptions, setVendorMasterOptions] = useState([]);
  const [selectedVendorIndex, setSelectedVendorIndex] = useState(0);
  const [vendorSearchTerms, setVendorSearchTerms] = useState(["", "", ""]);
  const [vendorPopoverOpen, setVendorPopoverOpen] = useState([
    false,
    false,
    false,
  ]);

  const fetchVendorMasterOptions = useCallback(async () => {
    try {
      const masterData = await fetchMasterData();
      setVendorMasterOptions(masterData.vendorOptions || []);
    } catch (error) {
      console.error("Error fetching vendor options:", error);
    }
  }, []);

  useEffect(() => {
    fetchVendorMasterOptions();
  }, [fetchVendorMasterOptions]);

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from("INDENT-PO")
          .select("*");

        if (fetchError) throw fetchError;

        // Filter by firm name
        let filteredData = data;
        if (user?.firmName) {
          filteredData = data.filter((row) =>
            canViewFirm(user.firmName, row["Firm Name"]),
          );
        }

        // Process pending data (Planned6 is not null and Actual6 is null)
        const pending = filteredData
          .filter(
            (row) =>
              row["Planned6"] !== null &&
              row["Planned6"] !== "" &&
              (!row["Actual6"] || row["Actual6"] === ""),
          )
          .map((row) => ({
            id: row.id,
            indentId: row["Indent Id."] || "",
            firmName: row["Firm Name"] || "",
            indenter: row["Generated By"] || "",
            department: row["Type Of Indent"] || "",
            product: row["Material"] || "",
            quantity: row["Approved Qty"] || row["Quantity"] || 0,
            uom: row["UOM"] || "MT",
            comparisonSheet: row["Comparison Sheet"] || "",
            planned6: row["Planned6"] || "",
            actual6: row["Actual6"] || "",
            vendors: [
              {
                name: row["Vendor Name 1"] || "",
                rateType:
                  row["Select Rate Type 1"] === "Basic Rate"
                    ? "basic"
                    : "withTax",
                rate: parseFloat(row["Rate 1"]) || 0,
                withTax: row["With Tax or Not 1"] === "No" ? "no" : "yes",
                gstPercent: parseInt(row["Tax Value 1"]) || 0,
                paymentTerm: row["Payment Term 1"] || "",
                advancePercentage: row["Advance Percentage 1"] || "",
                quotationNumber: row["Quotation Number 1"] || "",
                quotationDate: row["Quotation Date 1"] || "",
                whatsapp: row["Whatsapp Number 1"] || "",
                email: row["Email Id 1"] || "",
                alumina: row["Alumina 1"] || "",
                iron: row["Iron 1"] || "",
                sio2: row["SiO2 1"] || "",
                cao: row["CaO 1"] || "",
                ap: row["AP 1"] || "",
                bd: row["BD 1"] || "",
                fineness: row["Fineness 1"] || "",
                packaging: row["Packaging 1"] || "",
                transportType: row["Transport Type 1"] || "FOR",
                notes: row["Notes 1"] || "",
                expectedDate: row["Expected Date 1"] || "",
              },
              {
                name: row["Vendor Name 2"] || "",
                rateType:
                  row["Select Rate Type 2"] === "Basic Rate"
                    ? "basic"
                    : "withTax",
                rate: parseFloat(row["Rate 2"]) || 0,
                withTax: row["With Tax or Not 2"] === "No" ? "no" : "yes",
                gstPercent: parseInt(row["Tax Value 2"]) || 0,
                paymentTerm: row["Payment Term 2"] || "",
                advancePercentage: row["Advance Percentage 2"] || "",
                quotationNumber: row["Quotation Number 2"] || "",
                quotationDate: row["Quotation Date 2"] || "",
                whatsapp: row["Whatsapp Number 2"] || "",
                email: row["Email Id 2"] || "",
                alumina: row["Alumina 2"] || "",
                iron: row["Iron 2"] || "",
                sio2: row["SiO2 2"] || "",
                cao: row["CaO 2"] || "",
                ap: row["AP 2"] || "",
                bd: row["BD 2"] || "",
                fineness: row["Fineness 2"] || "",
                packaging: row["Packaging 2"] || "",
                transportType: row["Transport Type 2"] || "FOR",
                notes: row["Notes 2"] || "",
                expectedDate: row["Expected Date 2"] || "",
              },
              {
                name: row["Vendor Name 3"] || "",
                rateType:
                  row["Select Rate Type 3"] === "Basic Rate"
                    ? "basic"
                    : "withTax",
                rate: parseFloat(row["Rate 3"]) || 0,
                withTax: row["With Tax or Not 3"] === "No" ? "no" : "yes",
                gstPercent: parseInt(row["Tax Value 3"]) || 0,
                paymentTerm: row["Payment Term 3"] || "",
                advancePercentage: row["Advance Percentage 3"] || "",
                quotationNumber: row["Quotation Number 3"] || "",
                quotationDate: row["Quotation Date 3"] || "",
                whatsapp: row["Whatsapp Number 3"] || "",
                email: row["Email Id 3"] || "",
                alumina: row["Alumina 3"] || "",
                iron: row["Iron 3"] || "",
                sio2: row["SiO2 3"] || "",
                cao: row["CaO 3"] || "",
                ap: row["AP 3"] || "",
                bd: row["BD 3"] || "",
                fineness: row["Fineness 3"] || "",
                packaging: row["Packaging 3"] || "",
                transportType: row["Transport Type 3"] || "FOR",
                notes: row["Notes 3"] || "",
                expectedDate: row["Expected Date 3"] || "",
              },
            ],
          }));

        // Process history data (Planned6 is not null and Actual6 is not null)
        const history = filteredData
          .filter(
            (row) =>
              row["Planned6"] !== null &&
              row["Planned6"] !== "" &&
              row["Actual6"] !== null &&
              row["Actual6"] !== "",
          )
          .map((row) => ({
            id: row.id,
            indentId: row["Indent Id."] || "",
            firmName: row["Firm Name"] || "",
            indenter: row["Generated By"] || "",
            department: row["Type Of Indent"] || "",
            product: row["Material"] || "",
            quantity: row["Approved Qty"] || row["Quantity"] || 0,
            uom: row["UOM"] || "MT",
            actual6: row["Actual6"] || "",
            vendor: [
              row["Approved Vendor Name"] || "",
              row["Approved Rate"]?.toString() || "0",
              row["Approved Payment Term"] || "",
              row["With Tax or Not 4"] || "Yes",
              row["Tax Value 4"]?.toString() || "0",
            ],
            approvedDate: row["Approved Date"] || "",
          }))
          .sort((a, b) => {
            const dateA = new Date(a.actual6);
            const dateB = new Date(b.actual6);
            return dateB.getTime() - dateA.getTime();
          });

        setPendingData(pending);
        setFilteredPendingData(pending);
        setHistoryData(history);
        setFilteredHistoryData(history);

        // Update notification count
        updateCount("vendor", pending.length);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data: " + err.message);
        toast.error("Failed to load data", { description: err.message });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [refreshData, user, updateCount]);

  // Realtime: refresh data whenever INDENT-PO changes
  useRealtime("INDENT-PO", () => {
    setRefreshData((prev) => !prev);
  });

  // Filter pending data
  useEffect(() => {
    let filtered = [...pendingData];

    if (selectedDate) {
      filtered = filtered.filter((item) => {
        const itemDate = new Date(item.planned6).toISOString().split("T")[0];
        return itemDate === selectedDate;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.indentId.toLowerCase().includes(query) ||
          item.firmName.toLowerCase().includes(query) ||
          item.indenter.toLowerCase().includes(query) ||
          item.department.toLowerCase().includes(query) ||
          item.product.toLowerCase().includes(query),
      );
    }

    setFilteredPendingData(filtered);
  }, [selectedDate, searchQuery, pendingData]);

  // Filter history data
  useEffect(() => {
    let filtered = [...historyData];

    if (selectedHistoryDate) {
      filtered = filtered.filter((item) => {
        const itemDate = new Date(item.actual6).toISOString().split("T")[0];
        return itemDate === selectedHistoryDate;
      });
    }

    if (historySearchQuery.trim()) {
      const query = historySearchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.indentId.toLowerCase().includes(query) ||
          item.firmName.toLowerCase().includes(query) ||
          item.indenter.toLowerCase().includes(query) ||
          item.department.toLowerCase().includes(query) ||
          item.product.toLowerCase().includes(query),
      );
    }

    setFilteredHistoryData(filtered);
  }, [selectedHistoryDate, historySearchQuery, historyData]);

  const clearAllFilters = () => {
    setSelectedDate("");
    setSearchQuery("");
  };

  const clearAllHistoryFilters = () => {
    setSelectedHistoryDate("");
    setHistorySearchQuery("");
  };

  // Form state for Three Party
  const [vendorForms, setVendorForms] = useState([
    createEmptyVendorForm(),
    createEmptyVendorForm(),
    createEmptyVendorForm(),
  ]);
  const [historyRate, setHistoryRate] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const noScroll = (e) => e.target.blur();

  const updateVendorForm = (index, field, value) => {
    if (field === "whatsapp") value = value.replace(/\D/g, "").slice(0, 10);
    if (
      ["alumina", "iron", "sio2", "cao", "ap", "bd", "fineness"].includes(field)
    )
      value = value.replace(/[^0-9.]/g, "");
    if (field === "advancePercentage")
      value = value.replace(/[^0-9.]/g, "").slice(0, 6);
    setVendorForms((prev) => {
      const newForms = [...prev];
      newForms[index] = { ...newForms[index], [field]: value };
      if (field === "paymentTerm" && value !== "Advance") {
        newForms[index].advancePercentage = "";
      }
      return newForms;
    });
  };

  // Calculate lowest rate among vendors
  const lowestRate = useMemo(() => {
    const validRates = vendorForms
      .filter((v) => v.name && v.rate > 0)
      .map((v) => v.rate);
    return validRates.length > 0 ? Math.min(...validRates) : null;
  }, [vendorForms]);

  // Quick approve function
  const quickApprove = () => {
    const lowestVendorIndex = vendorForms.findIndex(
      (v) => v.name && v.rate === lowestRate,
    );
    if (lowestVendorIndex !== -1) {
      setSelectedVendorIndex(lowestVendorIndex);
      toast.success(`Selected vendor with best rate: ₹${lowestRate}`);
    }
  };

  async function onSubmit() {
    if (!selectedIndent) return;

    // Validate at least one vendor selected
    const hasVendor = vendorForms.some((v) => v.name);
    if (!hasVendor) {
      toast.error("Please select at least one vendor");
      return;
    }

    setIsSubmitting(true);
    try {
      const formatVendor = (v) => {
        const numericOrNull = (value) =>
          value === "" || value === null || value === undefined ? null : value;
        const rateTypeText = v.rateType === "basic" ? "Basic Rate" : "With Tax";
        let withTaxOrNot = "";
        let taxValue = 0;

        if (v.rateType === "basic") {
          withTaxOrNot = "No";
          taxValue = v.gstPercent || 0;
        } else {
          withTaxOrNot = "Yes";
          taxValue = 0;
        }

        return {
          name: v.name || "",
          rateType: rateTypeText,
          rate: v.rate?.toString() || "0",
          withTaxOrNot,
          taxValue: taxValue.toString(),
          paymentTerm: v.paymentTerm || "",
          advancePercentage: numericOrNull(v.advancePercentage),
          quotationNumber: v.quotationNumber || "",
          quotationDate: v.quotationDate || null,
          whatsapp: v.whatsapp || "",
          email: v.email || "",
          alumina: numericOrNull(v.alumina),
          iron: numericOrNull(v.iron),
          sio2: numericOrNull(v.sio2),
          cao: numericOrNull(v.cao),
          ap: numericOrNull(v.ap),
          bd: numericOrNull(v.bd),
          fineness: numericOrNull(v.fineness),
          packaging: v.packaging || "",
          transportType: v.transportType || "FOR",
          notes: v.notes || "",
          expectedDate: v.expectedDate || null,
        };
      };

      const v1 = formatVendor(vendorForms[0]);
      const v2 = formatVendor(vendorForms[1]);
      const v3 = formatVendor(vendorForms[2]);

      const { error: updateError } = await supabase
        .from("INDENT-PO")
        .update({
          Actual6: new Date().toISOString(),
          "Vendor Name 1": v1.name,
          "Select Rate Type 1": v1.rateType,
          "Rate 1": v1.rate,
          "With Tax or Not 1": v1.withTaxOrNot,
          "Tax Value 1": v1.taxValue,
          "Payment Term 1": v1.paymentTerm,
          "Advance Percentage 1": v1.advancePercentage,
          "Quotation Number 1": v1.quotationNumber,
          "Quotation Date 1": v1.quotationDate,
          "Whatsapp Number 1": v1.whatsapp,
          "Email Id 1": v1.email,
          "Packaging 1": v1.packaging,

          "Vendor Name 2": v2.name,
          "Select Rate Type 2": v2.rateType,
          "Rate 2": v2.rate,
          "With Tax or Not 2": v2.withTaxOrNot,
          "Tax Value 2": v2.taxValue,
          "Payment Term 2": v2.paymentTerm,
          "Advance Percentage 2": v2.advancePercentage,
          "Quotation Number 2": v2.quotationNumber,
          "Quotation Date 2": v2.quotationDate,
          "Whatsapp Number 2": v2.whatsapp,
          "Email Id 2": v2.email,
          "Packaging 2": v2.packaging,

          "Vendor Name 3": v3.name,
          "Select Rate Type 3": v3.rateType,
          "Rate 3": v3.rate,
          "With Tax or Not 3": v3.withTaxOrNot,
          "Tax Value 3": v3.taxValue,
          "Payment Term 3": v3.paymentTerm,
          "Advance Percentage 3": v3.advancePercentage,
          "Quotation Number 3": v3.quotationNumber,
          "Quotation Date 3": v3.quotationDate,
          "Whatsapp Number 3": v3.whatsapp,
          "Email Id 3": v3.email,
          "Packaging 3": v3.packaging,

          "Alumina 1": v1.alumina,
          "Iron 1": v1.iron,
          "SiO2 1": v1.sio2,
          "CaO 1": v1.cao,
          "AP 1": v1.ap,
          "BD 1": v1.bd,
          "Fineness 1": v1.fineness,

          "Alumina 2": v2.alumina,
          "Iron 2": v2.iron,
          "SiO2 2": v2.sio2,
          "CaO 2": v2.cao,
          "AP 2": v2.ap,
          "BD 2": v2.bd,
          "Fineness 2": v2.fineness,

          "Alumina 3": v3.alumina,
          "Iron 3": v3.iron,
          "SiO2 3": v3.sio2,
          "CaO 3": v3.cao,
          "AP 3": v3.ap,
          "BD 3": v3.bd,
          "Fineness 3": v3.fineness,
          "Transport Type 1": v1.transportType,
          "Transport Type 2": v2.transportType,
          "Transport Type 3": v3.transportType,
          "Notes 1": v1.notes,
          "Notes 2": v2.notes,
          "Notes 3": v3.notes,
          "Expected Date 1": v1.expectedDate,
          "Expected Date 2": v2.expectedDate,
          "Expected Date 3": v3.expectedDate,
          Planned7: new Date().toISOString(),
        })
        .eq("id", selectedIndent.id);

      if (updateError) throw updateError;

      toast.success(`Approved ${selectedIndent.indentId}`);
      setOpenDialog(false);
      setVendorForms([
        createEmptyVendorForm(),
        createEmptyVendorForm(),
        createEmptyVendorForm(),
      ]);
      setVendorSearchTerms(["", "", ""]);
      setVendorPopoverOpen([false, false, false]);
      setSelectedVendorIndex(0);
      setTimeout(() => setRefreshData((prev) => !prev), 1000);
    } catch (error) {
      console.error("Error updating vendors:", error);
      toast.error("Failed to update vendors");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onSubmitHistoryUpdate() {
    if (!selectedHistory) return;
    if (historyRate <= 0) {
      toast.error("Rate must be greater than 0");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from("INDENT-PO")
        .update({
          "Approved Rate": historyRate.toString(),
          "Approved Date": new Date().toISOString(),
        })
        .eq("id", selectedHistory.id);

      if (updateError) throw updateError;

      toast.success(`Updated rate for ${selectedHistory.indentId}`);
      setOpenDialog(false);
      setHistoryRate(0);
      setRefreshData((prev) => !prev);
    } catch (error) {
      console.error("Error updating rate:", error);
      toast.error("Failed to update rate");
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (selectedHistory) {
      setHistoryRate(parseFloat(selectedHistory.vendor[1]) || 0);
    }
  }, [selectedHistory]);

  return (
    <Card className="relative w-full max-w-full mx-auto bg-white border-0 shadow-lg">
      <CardHeader className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <CardTitle className="flex items-center gap-3 text-xl font-semibold text-gray-800">
          <div className="p-2 bg-green-100 rounded-lg">
            <Users className="h-5 w-5 text-[#7da23a]" />
          </div>
          Factory Rate Approval
        </CardTitle>
        <CardDescription className="mt-1 text-sm text-gray-500">
          Compare vendors and submit for factory approval
        </CardDescription>
        {user?.firmName && (
          <Badge
            variant="outline"
            className="mt-2 text-green-700 border-green-200 bg-green-50"
          >
            {user.firmName === "all"
              ? "All Firms"
              : Array.isArray(user.firmName)
                ? user.firmName.join(", ")
                : user.firmName}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="p-6">
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full max-w-[300px] grid-cols-2 mb-6 bg-gray-100 p-1 rounded-lg">
            <TabsTrigger
              value="pending"
              className="flex items-center gap-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              Pending
              <Badge
                variant="secondary"
                className="ml-1 px-1.5 py-0.5 text-xs bg-gray-200"
              >
                {pendingData.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex items-center gap-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Pending Tab */}
          <TabsContent value="pending" className="mt-0">
            {/* Filters Section */}
            <div className="p-4 mb-6 bg-gray-50/50 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">
                  Filters
                </span>
                {(selectedDate || searchQuery) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="ml-auto text-xs text-gray-500 h-7 hover:text-gray-700"
                  >
                    Clear all
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <Label className="block mb-1 text-xs text-gray-500">
                    Planned Date
                  </Label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="text-sm border-gray-200 h-9 focus:ring-1 focus:ring-green-500"
                  />
                </div>
                <div>
                  <Label className="block mb-1 text-xs text-gray-500">
                    Search
                  </Label>
                  <div className="relative">
                    <Search className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                    <Input
                      placeholder="Indent, Product, Department..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="text-sm border-gray-200 pl-9 h-9 focus:ring-1 focus:ring-green-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
              </div>
            ) : error ? (
              <div className="p-8 text-center bg-red-50 rounded-xl">
                <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-red-500" />
                <p className="text-red-600">{error}</p>
                <Button
                  onClick={() => setRefreshData((p) => !p)}
                  className="mt-4 bg-red-600 hover:bg-red-700"
                >
                  Retry
                </Button>
              </div>
            ) : filteredPendingData.length === 0 ? (
              <div className="py-12 text-center">
                <Info className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No pending approvals</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-100 rounded-xl">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow className="border-b border-gray-200">
                      <TableHead className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                        Action
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                        Indent & Product
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                        Firm & Department
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                        Quantity
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                        Planned Date
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                        Vendor Rates
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPendingData.map((indent) => (
                      <TableRow
                        key={indent.id}
                        className="cursor-pointer transition-colors border-b border-gray-100 hover:bg-gray-50/50"
                        onClick={() => {
                          setSelectedIndent(indent);
                          setSelectedHistory(null);
                          setOpenDialog(true);
                          setVendorForms(
                            indent.vendors.map(normalizeVendorForm),
                          );
                          setVendorSearchTerms(["", "", ""]);
                          setVendorPopoverOpen([false, false, false]);
                          setSelectedVendorIndex(0);
                        }}
                      >
                        <TableCell className="px-4 py-3">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedIndent(indent);
                              setSelectedHistory(null);
                              setOpenDialog(true);
                              setVendorForms(
                                indent.vendors.map(normalizeVendorForm),
                              );
                              setVendorSearchTerms(["", "", ""]);
                              setVendorPopoverOpen([false, false, false]);
                              setSelectedVendorIndex(0);
                            }}
                            className="h-8 px-3 text-xs bg-[#7da23a] hover:bg-[#6b8e2f] text-white shadow-none"
                          >
                            Approve
                          </Button>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-800">
                            {indent.indentId}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {indent.product}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="text-sm text-gray-700">
                            {indent.firmName}
                          </div>
                          <div className="text-xs text-gray-400">
                            {indent.department}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm font-medium text-gray-700">
                          {indent.quantity}{" "}
                          <span className="text-xs text-gray-400 font-normal">
                            {indent.uom}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-600">
                          {formatDateTime(indent.planned6)}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {indent.vendors
                              .filter((v) => v.name)
                              .map((vendor, index) => (
                                <Badge
                                  key={index}
                                  variant="outline"
                                  className="text-xs px-2 py-0.5 bg-white border-gray-200"
                                >
                                  {vendor.name.split(" ").slice(0, 2).join(" ")}{" "}
                                  ₹{vendor.rate}
                                </Badge>
                              ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-0">
            <div className="p-4 mb-6 bg-gray-50/50 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">
                  Filters
                </span>
                {(selectedHistoryDate || historySearchQuery) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllHistoryFilters}
                    className="ml-auto text-xs h-7"
                  >
                    Clear all
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <Label className="block mb-1 text-xs text-gray-500">
                    Approval Date
                  </Label>
                  <Input
                    type="date"
                    value={selectedHistoryDate}
                    onChange={(e) => setSelectedHistoryDate(e.target.value)}
                    className="text-sm border-gray-200 h-9"
                  />
                </div>
                <div>
                  <Label className="block mb-1 text-xs text-gray-500">
                    Search
                  </Label>
                  <div className="relative">
                    <Search className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                    <Input
                      placeholder="Indent, Product, Department..."
                      value={historySearchQuery}
                      onChange={(e) => setHistorySearchQuery(e.target.value)}
                      className="text-sm border-gray-200 pl-9 h-9"
                    />
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
              </div>
            ) : filteredHistoryData.length === 0 ? (
              <div className="py-12 text-center">
                <Info className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No history found</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-100 rounded-xl">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow className="border-b border-gray-200">
                      <TableHead className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                        Action
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                        Approval Date
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                        Indent & Product
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                        Quantity
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                        Approved Vendor
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                        Rate
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistoryData.map((indent) => (
                      <TableRow
                        key={indent.id}
                        className="border-b border-gray-100 hover:bg-gray-50/50"
                      >
                        <TableCell className="px-4 py-3">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedHistory(indent);
                              setSelectedIndent(null);
                              setOpenDialog(true);
                            }}
                            className="h-8 px-3 text-xs"
                          >
                            Update
                          </Button>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-600">
                          {formatDateTime(indent.actual6)}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-800">
                            {indent.indentId}
                          </div>
                          <div className="text-xs text-gray-400">
                            {indent.product}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm font-medium text-gray-700">
                          {indent.quantity}{" "}
                          <span className="text-xs text-gray-400 font-normal">
                            {indent.uom}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge className="text-green-700 bg-green-100 border-0">
                            {indent.vendor[0]}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm font-medium">
                          ₹{indent.vendor[1]}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Redesigned Dialog with Single Vendor Form */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent
          aria-describedby={undefined}
          className="sm:max-w-[1400px] p-0 overflow-hidden rounded-2xl"
        >
          {selectedIndent && (
            <div className="flex flex-col h-full max-h-[100vh]">
              {/* Header with Indent Info */}
              <DialogHeader className="px-6 pt-6 pb-3 border-b border-gray-100">
                <DialogTitle className="text-lg font-semibold text-gray-800">
                  Approve Vendors
                </DialogTitle>
                <div className="grid grid-cols-3 gap-3 p-3 mt-2 text-sm rounded-lg bg-gray-50">
                  <div>
                    <span className="block text-xs text-gray-500">
                      Indent ID
                    </span>
                    <span className="font-medium text-gray-800">
                      {selectedIndent.indentId}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500">
                      Department
                    </span>
                    <span className="text-gray-700">
                      {selectedIndent.department}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500">Product</span>
                    <span className="font-medium text-gray-700">
                      {selectedIndent.product}
                    </span>
                  </div>
                </div>
              </DialogHeader>

              {/* Comparison Strip */}
              <div className="px-6 pt-4">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {vendorForms.map((v, i) => {
                    const isLowest = v.rate && v.rate === lowestRate;

                    return (
                      <div
                        key={i}
                        className={`p-3 rounded-lg border text-center cursor-pointer transition ${
                          isLowest
                            ? "bg-green-50 border-green-500 shadow-sm"
                            : "bg-white border-gray-200 hover:border-gray-300"
                        } ${selectedVendorIndex === i ? "ring-2 ring-green-500" : ""}`}
                        onClick={() => setSelectedVendorIndex(i)}
                      >
                        <div className="text-xs text-gray-400">
                          Vendor {i + 1}
                        </div>
                        <div className="text-lg font-bold text-gray-800">
                          ₹{v.rate || "-"}
                        </div>
                        {isLowest && (
                          <div className="text-[10px] text-green-600 font-semibold mt-1">
                            BEST
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Quick Approve Button */}
                {lowestRate && (
                  <Button
                    onClick={quickApprove}
                    className="w-full mb-4 bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    <TrendingDown className="w-4 h-4 mr-2" />
                    Approve Lowest Rate (₹{lowestRate})
                  </Button>
                )}
              </div>

              <div className="flex-1 px-6 pb-4 overflow-y-auto">
                {/* Vendor Forms */}
                <div className="grid gap-4 lg:grid-cols-3">
                  {vendorForms.map((currentVendor, idx) => (
                    <div
                      key={idx}
                      className="p-4 border rounded-xl bg-gray-50/30 space-y-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700">
                          Vendor {idx + 1} Details
                        </span>
                        {selectedVendorIndex === idx && (
                          <Badge className="text-green-700 bg-green-100">
                            Selected
                          </Badge>
                        )}
                      </div>
                      <div>
                        <Label className="block mb-1 text-xs font-medium text-gray-600">
                          Vendor Name
                        </Label>
                        <Popover
                          open={vendorPopoverOpen[idx]}
                          onOpenChange={(open) =>
                            setVendorPopoverOpen((prev) =>
                              prev.map((value, index) =>
                                index === idx ? open : value,
                              ),
                            )
                          }
                        >
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              role="combobox"
                              aria-expanded={vendorPopoverOpen[idx]}
                              className="w-full justify-between text-sm border-gray-200 h-9 bg-white font-normal"
                            >
                              <span className="truncate">
                                {currentVendor.name || "Select vendor"}
                              </span>
                              <ChevronsUpDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="z-[60] w-[var(--radix-popover-trigger-width)] p-2">
                            <Input
                              value={vendorSearchTerms[idx] || ""}
                              onChange={(e) =>
                                setVendorSearchTerms((prev) =>
                                  prev.map((term, index) =>
                                    index === idx ? e.target.value : term,
                                  ),
                                )
                              }
                              placeholder="Search vendor..."
                              className="mb-2 h-8 text-xs"
                            />
                            <div className="max-h-60 overflow-y-auto">
                              {vendorMasterOptions
                                .filter((vendor) =>
                                  vendor
                                    .toLowerCase()
                                    .includes(
                                      (vendorSearchTerms[idx] || "")
                                        .trim()
                                        .toLowerCase(),
                                    ),
                                )
                                .map((vendor, vendorIndex) => (
                                  <button
                                    key={`vendor-${idx}-${vendorIndex}`}
                                    type="button"
                                    onClick={() => {
                                      updateVendorForm(idx, "name", vendor);
                                      setVendorSearchTerms((prev) =>
                                        prev.map((term, index) =>
                                          index === idx ? "" : term,
                                        ),
                                      );
                                      setVendorPopoverOpen((prev) =>
                                        prev.map((value, index) =>
                                          index === idx ? false : value,
                                        ),
                                      );
                                    }}
                                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100"
                                  >
                                    <span>{vendor}</span>
                                    {currentVendor.name === vendor && (
                                      <Check className="w-4 h-4 text-primary" />
                                    )}
                                  </button>
                                ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="block mb-1 text-xs font-medium text-gray-600">
                            Rate (₹)
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            onWheel={noScroll}
                            value={currentVendor.rate || ""}
                            onChange={(e) =>
                              updateVendorForm(
                                idx,
                                "rate",
                                Math.max(0, parseFloat(e.target.value) || 0),
                              )
                            }
                            className="text-sm border-gray-200 h-9 bg-white"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label className="block mb-1 text-xs font-medium text-gray-600">
                            Rate Type
                          </Label>
                          <Select
                            value={currentVendor.rateType}
                            onValueChange={(v) =>
                              updateVendorForm(idx, "rateType", v)
                            }
                          >
                            <SelectTrigger className="text-sm border-gray-200 h-9 bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="basic">Basic Rate</SelectItem>
                              <SelectItem value="withTax">With Tax</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {currentVendor.rateType === "basic" && (
                        <div>
                          <Label className="block mb-1 text-[10px] text-gray-500">
                            GST %
                          </Label>
                          <Select
                            value={currentVendor.gstPercent?.toString() || "0"}
                            onValueChange={(v) =>
                              updateVendorForm(idx, "gstPercent", parseInt(v))
                            }
                          >
                            <SelectTrigger className="text-xs border-gray-200 h-8 bg-white">
                              <SelectValue placeholder="Tax %" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0%</SelectItem>
                              <SelectItem value="5">5%</SelectItem>
                              <SelectItem value="12">12%</SelectItem>
                              <SelectItem value="18">18%</SelectItem>
                              <SelectItem value="28">28%</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-green-700">
                            Final Rate (with GST)
                          </span>
                          <span className="text-xl font-bold text-green-700">
                            ₹
                            {currentVendor.rateType === "basic"
                              ? currentVendor.rate +
                                (currentVendor.rate *
                                  currentVendor.gstPercent) /
                                  100
                              : currentVendor.rate}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="py-2 text-xs font-medium text-gray-600">
                          Advanced Details
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="block mb-1 text-[10px] text-gray-500">
                              Packaging
                            </Label>
                            <Select
                              value={currentVendor.packaging}
                              onValueChange={(v) =>
                                updateVendorForm(idx, "packaging", v)
                              }
                            >
                              <SelectTrigger className="text-xs border-gray-200 h-8 bg-white">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Ton Bag">Ton Bag</SelectItem>
                                <SelectItem value="50 kg">50 kg</SelectItem>
                                <SelectItem value="Loose">Loose</SelectItem>
                                <SelectItem value="25kg">25kg</SelectItem>
                                <SelectItem value="40kg">40kg</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="block mb-1 text-[10px] text-gray-500">
                              Payment Term
                            </Label>
                            <Select
                              value={currentVendor.paymentTerm}
                              onValueChange={(v) =>
                                updateVendorForm(idx, "paymentTerm", v)
                              }
                            >
                              <SelectTrigger className="text-xs border-gray-200 h-8 bg-white">
                                <SelectValue placeholder="Select term" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Advance">Advance</SelectItem>
                                <SelectItem value="After Delivery">
                                  After Delivery
                                </SelectItem>
                                <SelectItem value="Credit 30 Days">
                                  Credit 30 Days
                                </SelectItem>
                                <SelectItem value="Credit 60 Days">
                                  Credit 60 Days
                                </SelectItem>
                                <SelectItem value="Credit 45 Days">
                                  Credit 45 Days
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="block mb-1 text-[10px] text-gray-500">
                              Quotation Number
                            </Label>
                            <Input
                              value={currentVendor.quotationNumber || ""}
                              onChange={(e) =>
                                updateVendorForm(
                                  idx,
                                  "quotationNumber",
                                  e.target.value,
                                )
                              }
                              className="h-8 text-xs bg-white border-gray-200"
                              placeholder="Enter quotation no."
                            />
                          </div>
                          <div>
                            <Label className="block mb-1 text-[10px] text-gray-500">
                              Quotation Date
                            </Label>
                            <Input
                              type="date"
                              value={currentVendor.quotationDate || ""}
                              onChange={(e) =>
                                updateVendorForm(
                                  idx,
                                  "quotationDate",
                                  e.target.value,
                                )
                              }
                              className="h-8 text-xs bg-white border-gray-200"
                            />
                          </div>
                        </div>
                        {currentVendor.paymentTerm === "Advance" && (
                          <div>
                            <Label className="block mb-1 text-[10px] text-gray-500">
                              Advance Percentage
                            </Label>
                            <Input
                              inputMode="decimal"
                              value={currentVendor.advancePercentage || ""}
                              onChange={(e) =>
                                updateVendorForm(
                                  idx,
                                  "advancePercentage",
                                  e.target.value,
                                )
                              }
                              className="h-8 text-xs bg-white border-gray-200"
                              placeholder="Enter advance %"
                            />
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="block mb-1 text-[10px] text-gray-500">
                              WhatsApp
                            </Label>
                            <Input
                              inputMode="numeric"
                              maxLength={10}
                              value={currentVendor.whatsapp || ""}
                              onChange={(e) =>
                                updateVendorForm(
                                  idx,
                                  "whatsapp",
                                  e.target.value,
                                )
                              }
                              className="h-8 text-xs bg-white border-gray-200"
                              placeholder="10-digit number"
                            />
                          </div>
                          <div>
                            <Label className="block mb-1 text-[10px] text-gray-500">
                              Email
                            </Label>
                            <Input
                              type="email"
                              value={currentVendor.email || ""}
                              onChange={(e) =>
                                updateVendorForm(idx, "email", e.target.value)
                              }
                              className="h-8 text-xs bg-white border-gray-200"
                              placeholder="vendor@email.com"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="block mb-1 text-[10px] text-gray-500">
                              Transport Type
                            </Label>
                            <Select
                              value={currentVendor.transportType}
                              onValueChange={(v) =>
                                updateVendorForm(idx, "transportType", v)
                              }
                            >
                              <SelectTrigger className="text-xs border-gray-200 h-8 bg-white">
                                <SelectValue placeholder="Select Type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="FOR">FOR</SelectItem>
                                <SelectItem value="ex-factory">
                                  ex-factory
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="block mb-1 text-[10px] text-gray-500">
                              Expected Date
                            </Label>
                            <Input
                              type="date"
                              value={currentVendor.expectedDate || ""}
                              onChange={(e) =>
                                updateVendorForm(
                                  idx,
                                  "expectedDate",
                                  e.target.value,
                                )
                              }
                              className="h-8 text-xs bg-white border-gray-200"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="block mb-1 text-[10px] text-gray-500">
                            Notes
                          </Label>
                          <Textarea
                            value={currentVendor.notes || ""}
                            onChange={(e) =>
                              updateVendorForm(idx, "notes", e.target.value)
                            }
                            className="text-xs bg-white border-gray-200 min-h-[60px]"
                            placeholder="Additional notes for this vendor..."
                          />
                        </div>
                        <div>
                          <Label className="block mb-2 text-xs font-medium text-gray-600">
                            Chemical Analysis (%)
                          </Label>
                          <p className="mb-2 text-[10px] text-gray-400">
                            Optional
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              ["alumina", "Al₂O₃"],
                              ["iron", "Fe₂O₃"],
                              ["sio2", "SiO₂"],
                              ["cao", "CaO"],
                              ["ap", "AP"],
                              ["bd", "BD"],
                            ].map(([field, label]) => (
                              <div key={field}>
                                <Label className="block mb-1 text-[9px] text-gray-500">
                                  {label}
                                </Label>
                                <Input
                                  type="text"
                                  value={currentVendor[field]}
                                  onChange={(e) =>
                                    updateVendorForm(idx, field, e.target.value)
                                  }
                                  className="h-7 text-[10px] border-gray-200"
                                  placeholder="0.00"
                                />
                              </div>
                            ))}
                          </div>
                          <div className="mt-2">
                            <Label className="block mb-1 text-[9px] text-gray-500">
                              Fineness
                            </Label>
                            <Input
                              type="text"
                              value={currentVendor.fineness}
                              onChange={(e) =>
                                updateVendorForm(
                                  idx,
                                  "fineness",
                                  e.target.value,
                                )
                              }
                              className="h-7 text-[10px] border-gray-200"
                              placeholder="Details"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 px-6 flex justify-end gap-3 rounded-b-2xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <Button
                  variant="outline"
                  onClick={() => setOpenDialog(false)}
                  className="px-6"
                >
                  Cancel
                </Button>
                <Button
                  onClick={onSubmit}
                  disabled={isSubmitting || !vendorForms.some((v) => v.name)}
                  className="px-6 bg-[#7da23a] hover:bg-[#6b8e2f] text-white"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Submit to Factory Approval
                </Button>
              </div>
            </div>
          )}

          {selectedHistory && (
            <DialogHeader className="p-6 pb-2">
              <DialogTitle className="text-lg font-semibold">
                Update Approved Rate
              </DialogTitle>
              <div className="p-3 mt-3 rounded-lg bg-gray-50">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="block text-xs text-gray-500">
                      Indent ID
                    </span>
                    <span className="font-medium">
                      {selectedHistory.indentId}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500">Vendor</span>
                    <span className="font-medium">
                      {selectedHistory.vendor[0]}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <Label className="text-sm font-medium">Current Rate</Label>
                <div className="text-2xl font-bold text-gray-800">
                  ₹{selectedHistory.vendor[1]}
                </div>
                <Label className="mt-4 text-sm font-medium">New Rate</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  onWheel={noScroll}
                  value={historyRate}
                  onChange={(e) =>
                    setHistoryRate(Math.max(0, parseFloat(e.target.value) || 0))
                  }
                  placeholder="Enter new rate"
                  className="text-lg"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setOpenDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-[#7da23a] hover:bg-[#6b8e2f]"
                  disabled={historyRate <= 0 || isSubmitting}
                  onClick={onSubmitHistoryUpdate}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Update Rate"
                  )}
                </Button>
              </div>
            </DialogHeader>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
