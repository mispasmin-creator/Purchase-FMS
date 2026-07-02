"use client";
import { useState, useEffect, useMemo, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  AlertTriangle,
  TrendingDown,
  DollarSign,
  Package,
  Info,
  Filter,
  ExternalLink,
  Beaker,
  Edit,
  Eye,
  FileText,
  AlertCircle,
  RefreshCw,
  Save,
  X,
  History,
  CheckCircle2,
  ShieldCheck,
  Download,
} from "lucide-react";
import { MixerHorizontalIcon } from "@radix-ui/react-icons";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { AuthContext } from "../context/AuthContext";
import { toast } from "sonner";
import { supabase } from "../supabase";
import { canViewFirm } from "../utils/firmFilter";
import SuperAdminEditModal from "./SuperAdminEditModal";
import { Input } from "@/components/ui/input";

const UNIFIED_MISMATCH_COLUMNS_META = [
  { header: "Actions", dataKey: "actions", toggleable: false, alwaysVisible: true },
  { header: "Stage", dataKey: "stage", toggleable: true, alwaysVisible: true },
  { header: "Detected Issues", dataKey: "mismatchTypes", toggleable: true, alwaysVisible: true },
  { header: "Lift Number", dataKey: "liftIdDisplay", toggleable: true, alwaysVisible: true },
  { header: "Truck No.", dataKey: "truckNo", toggleable: true },
  { header: "PO Number", dataKey: "indentNo", toggleable: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "Party Name", dataKey: "vendorName", toggleable: true },
  { header: "Product", dataKey: "material", toggleable: true },
  { header: "Difference Summary", dataKey: "diffSummary", toggleable: true },
  // Core fields for visibility
  { header: "Bill Rate", dataKey: "materialRate", toggleable: true },
  { header: "Bill Qty", dataKey: "billQuantity", toggleable: true },
  { header: "Receive Qty", dataKey: "actualQuantity", toggleable: true },
  { header: "Diff(Bill-Rec)", dataKey: "diffBillRec", toggleable: true },
  { header: "PO Al2O3%", dataKey: "poAlumina", toggleable: true },
  { header: "PO Fe%", dataKey: "poIron", toggleable: true },
  { header: "Lab Al2O3%", dataKey: "aluminaPercent", toggleable: true },
  { header: "Lab Fe%", dataKey: "ironPercent", toggleable: true },
];

const HISTORY_COLUMNS_META = [
  {
    header: "Date",
    dataKey: "timestamp",
    toggleable: true,
    alwaysVisible: true,
  },
  {
    header: "Lift ID",
    dataKey: "liftIdDisplay",
    toggleable: true,
    alwaysVisible: true,
  },
  {
    header: "PO Number",
    dataKey: "indentNo",
    toggleable: true,
    alwaysVisible: true,
  },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "Party Name", dataKey: "vendorName", toggleable: true },
  { header: "Product Name", dataKey: "material", toggleable: true },
  { header: "Transporter", dataKey: "transporterName", toggleable: true },
  { header: "Status", dataKey: "status", toggleable: true },
  { header: "Remarks", dataKey: "remarks", toggleable: true },
  { header: "Lift Number", dataKey: "liftNo", toggleable: true },
  { header: "Type", dataKey: "liftType", toggleable: true },
  { header: "Bill No.", dataKey: "billNo", toggleable: true },
  { header: "Bill Qty", dataKey: "billQuantity", toggleable: true },
  { header: "Area Lifting", dataKey: "areaLifting", toggleable: true },
  { header: "Truck No.", dataKey: "truckNo", toggleable: true },
  {
    header: "Bill Image",
    dataKey: "billImageUrl",
    toggleable: true,
    isLink: true,
    linkText: "View",
  },
  { header: "Bilty No.", dataKey: "biltyNo", toggleable: true },
  { header: "Type Of Rate", dataKey: "typeOfTransportingRate", toggleable: true },
  { header: "Bill Rate", dataKey: "materialRate", toggleable: true },
  { header: "Receive Qty", dataKey: "actualQuantity", toggleable: true },
  { header: "Diff(Bill-Rec)", dataKey: "diffBillRec", toggleable: true },
  {
    header: "Bilty Image",
    dataKey: "biltyImageUrl",
    toggleable: true,
    isLink: true,
    linkText: "View",
  },
  { header: "Qty Diff Status", dataKey: "qtyDifferenceStatus", toggleable: true },
  { header: "Diff Qty", dataKey: "differenceQty", toggleable: true },
  {
    header: "Weight Slip",
    dataKey: "weightSlipImageUrl",
    toggleable: true,
    isLink: true,
    linkText: "View",
  },
  { header: "PO Al2O3%", dataKey: "poAlumina", toggleable: true },
  { header: "PO Fe%", dataKey: "poIron", toggleable: true },
  { header: "Lab Al2O3%", dataKey: "aluminaPercent", toggleable: true },
  { header: "Lab Fe%", dataKey: "ironPercent", toggleable: true },
  {
    header: "Actions",
    dataKey: "actions",
    toggleable: false,
    alwaysVisible: true,
  },
];

export default function MismatchAnalysis() {
  const { user, isSuperAdmin } = useContext(AuthContext);
  const [superAdminEditItem, setSuperAdminEditItem] = useState(null);
  const navigate = useNavigate();
  const [liftAccountsData, setLiftAccountsData] = useState([]);
  const [purchaseOrdersData, setPurchaseOrdersData] = useState([]);
  const [tlData, setTlData] = useState([]);
  const [loadingLifts, setLoadingLifts] = useState(true);
  const [loadingPOs, setLoadingPOs] = useState(true);
  const [loadingTL, setLoadingTL] = useState(true);
  const [loadingMismatch, setLoadingMismatch] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [editingRow, setEditingRow] = useState(null);
  const [editingRowData, setEditingRowData] = useState(null); // Store full row data
  const [submitting, setSubmitting] = useState(false);
  const [visibleUnifiedColumns, setVisibleUnifiedColumns] = useState({});
  const [visibleHistoryColumns, setVisibleHistoryColumns] = useState({});
  const [mismatchSheetData, setMismatchSheetData] = useState([]);
  const [formData, setFormData] = useState({});
  const [submittedRows, setSubmittedRows] = useState(new Set());
  const [actionType, setActionType] = useState("");

  const [filters, setFilters] = useState({
    vendorName: "all",
    materialName: "all",
    firmName: "all",
    orderNumber: "all",
    fromDate: "",
    toDate: "",
  });

  // Fetch Mismatch data from Supabase
  const fetchMismatchSheetData = useCallback(async () => {
    setLoadingMismatch(true);
    try {
      const { data, error: fetchError } = await supabase
        .from("Mismatch")
        .select('id, Timestamp, "Lift ID", "Lift Number", "Indent Number", "Product Name", "Rate Difference", "Quantity Difference", "Diff Qty", "Qty Diff Status", "Alumina Difference", "Iron Difference", "AP Difference", "BD Difference", "Party Name", "Firm Name", Status, Remarks, Rate, "Action Type", "Debit Amount", "Debit Note URL", "Total Freight", "Truck No.", "Truck Qty", Qty, "Bill No.", "Area Lifting", "Bill Image", "Bilty No.", "Bilty Image", "Weight Slip", "Type Of Rate"')
        .order("Timestamp", { ascending: false });

      if (fetchError) throw fetchError;

      let formattedData = data || [];
      if (user?.firmName) {
        formattedData = formattedData.filter((item) =>
          canViewFirm(user.firmName, item["Firm Name"] || item.firmName)
        );
      }

      setMismatchSheetData(formattedData);
    } catch (error) {
      console.error("Failed to load Mismatch data:", error);
      setMismatchSheetData([]);
    } finally {
      setLoadingMismatch(false);
    }
  }, [user]);

  // Initialize column visibility
  useEffect(() => {
    const initializeVisibility = (columnsMeta) => {
      const visibility = {};
      columnsMeta.forEach((col) => {
        visibility[col.dataKey] = col.alwaysVisible || col.toggleable;
      });
      return visibility;
    };
    setVisibleUnifiedColumns(
      initializeVisibility(UNIFIED_MISMATCH_COLUMNS_META),
    );
    setVisibleHistoryColumns(initializeVisibility(HISTORY_COLUMNS_META));
  }, []);

  // Initialize form data
  const initializeFormData = (rowId, rowData) => {
    setFormData({
      remarks: "",
      debitAmount: "",
    });
    setActionType("");
  };

  // Handle form changes
  const handleFormChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle purchase return form changes
  const handlePurchaseReturnChange = (field, value) => {
    setPurchaseReturnForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Action handlers
  const handleViewDetails = (item, mismatchType) => {
    const details = {
      rateMismatch: {
        title: "Rate Mismatch Details",
        content: `Lift ID: ${item.id}\nMaterial Rate: ₹${item.materialRate}\nPO Rate: ₹${item.poRate}\nDifference: ₹${item.rateDifference}\nVendor: ${item.vendorName}\nMaterial: ${item.material}`,
      },
      quantityMismatch: {
        title: "Quantity Mismatch Details",
        content: `Lift No: ${item.liftNo}\nBilling Quantity (Col J): ${item.liftedQty}\nActual Qty (Col Y): ${item.actualQuantityY}\nDifference: ${item.qtyDifference}\nVendor: ${item.vendorName}\nMaterial: ${item.rawMaterialName}`,
      },
      materialMismatch: {
        title: "Material Properties Mismatch Details",
        content: `Lift No: ${item.liftNo}\nRaw Material: ${item.rawMaterialName}\nAlumina: PO ${item.poAluminaPercent}% vs Lab ${item.liftAlumina}% (Diff: ${item.aluminaDiff}%)\nIron: PO ${item.poIronPercent}% vs Lab ${item.liftIron}% (Diff: ${item.ironDiff}%)`,
      },
    };

    toast.info(details[mismatchType].title, {
      description: details[mismatchType].content,
      duration: 10000,
    });
  };

  const handleCorrectData = (item, mismatchType) => {
    setEditingRow(item.liftNo || item.liftIdDisplay || item.id);
    setEditingRowData(item);
    initializeFormData(item.id || item.liftNo, item);
  };


  const handleReportIssue = (item, mismatchType) => {
    toast.success("Issue Reported", {
      description: `Mismatch issue has been reported to the quality team. Reference: ${item.id || item.liftNo}`,
      duration: 3000,
    });
  };

  const handleExportData = (item, mismatchType) => {
    // Create CSV data for the specific item
    const csvData = Object.entries(item)
      .filter(([key]) => !key.startsWith("_"))
      .map(([key, value]) => `"${key}","${value}"`)
      .join("\n");

    const blob = new Blob([`"Field","Value"\n${csvData}`], {
      type: "text/csv",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${mismatchType}_${item.id || item.liftNo}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast.success("Data Exported", {
      description: `${mismatchType} data exported successfully for ${item.id || item.liftNo}`,
      duration: 3000,
    });
  };

  // Submit form data to Supabase Mismatch table (Update existing record)
  const submitFormData = async () => {
    if (!editingRow || !editingRowData) return;

    // Validate action type is selected
    if (!actionType) {
      toast.error("Please select an Action Type.");
      return;
    }

    // If material return is needed, send it to Purchase Return first.
    if (actionType === "Return Material and Make Debit Note") {
      setSubmitting(true);
      try {
        // ONLY update Mismatch status - the separate page will handle the record creation
        const { error: updateError } = await supabase
          .from("Mismatch")
          .update({
            Status: "Purchase Return",
            coordination_status: "COORDINATED",
            "Action Type": actionType,
            Remarks: formData.remarks || "",
          })
          .eq("Lift Number", editingRowData.liftNo);

        if (updateError) throw updateError;

        setSubmittedRows(
          (prev) => new Set([...prev, `mismatch_${editingRowData.liftNo}`]),
        );
        setEditingRow(null);
        setEditingRowData(null);
        setFormData({});
        setActionType("");
        toast.success(
          `✅ SUCCESS: Mismatch record marked for Purchase Return.`,
        );

        setTimeout(() => {
          fetchMismatchSheetData();
          fetchLiftAccountsData();
        }, 500);
      } catch (error) {
        console.error("Submission error:", error);
        toast.error(`❌ SUBMISSION FAILED: ${error.message}`);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Validate debit note fields
    if (!formData.debitAmount) {
      toast.error("Please enter a Debit Amount.");
      return;
    }

    setSubmitting(true);

    try {
      const recordId = editingRowData.id;
      if (!recordId) throw new Error("Missing Record ID for update");

      const currentDate = new Date();

      const updates = {
        Status: "Credit Notes",
        coordination_status: "COORDINATED",
        "Action Type": actionType,
        Remarks: formData.remarks || "",
        "Debit Amount": parseFloat(formData.debitAmount) || null,
      };

      // Update the existing record(s) in Mismatch table for this Lift
      const { error: updateError } = await supabase
        .from("Mismatch")
        .update(updates)
        .eq("Lift Number", editingRowData.liftNo);

      if (updateError) throw updateError;

      setSubmittedRows(
        (prev) => new Set([...prev, `mismatch_${editingRowData.liftNo}`]),
      );
      setEditingRow(null);
      setEditingRowData(null);
      setFormData({});
      setActionType("");

      const actualDateTime = currentDate
        .toLocaleString("en-GB", { hour12: false })
        .replace(",", "");
      toast.success(
        `✅ SUCCESS: Mismatch data corrected and resolved for: ${editingRow}\nUpdated at: ${actualDateTime}`,
      );

      // Refresh data
      setTimeout(() => {
        fetchMismatchSheetData();
        fetchLiftAccountsData();
      }, 500);
    } catch (error) {
      console.error("Submission error:", error);
      toast.error(`❌ SUBMISSION FAILED: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcknowledgeMismatch = async (item) => {
    const recordId = item.id || item.supabaseId;
    if (!recordId) {
      toast.error("Cannot acknowledge: Missing record ID");
      return;
    }

    if (!window.confirm(`Mark Lift Number ${item.liftNo || item.liftIdDisplay} as proper/resolved?`)) {
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from("Mismatch")
        .update({ 
          Status: "Acknowledge",
          "Action Type": "Manual Acknowledge",
          Remarks: "Marked as proper by user"
        })
        .eq("id", recordId);

      if (updateError) throw updateError;

      toast.success(`✅ SUCCESS: Record marked as Acknowledged (Proper).`);
      
      // Refresh data
      setTimeout(() => {
        fetchMismatchSheetData();
      }, 500);
    } catch (error) {
      console.error("Acknowledge error:", error);
      toast.error(`❌ UPDATE FAILED: ${error.message}`);
    }
  };

  // Modal render
  const renderModal = () => {
    if (!editingRow) return null;

    const isDebitNote = actionType === "Make Debit Note";
    const isPurchaseReturn = actionType === "Return Material and Make Debit Note";

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                Submit Mismatch Correction
              </h3>
              <button
                onClick={() => {
                  setEditingRow(null);
                  setActionType("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Mismatch Details */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2">
                Mismatch Details
              </h4>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Lift ID:</span>{" "}
                    <span className="font-medium">{editingRow}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Firm:</span>{" "}
                    <span className="font-medium">{editingRowData?.firmName}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Party:</span>{" "}
                    <span className="font-medium">{editingRowData?.vendorName}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Material:</span>{" "}
                    <span className="font-medium">{editingRowData?.material}</span>
                  </div>
                </div>

                <div className="border-t pt-2 mt-2">
                  <p className="text-xs font-bold text-red-600 mb-2">DETECTED MISMATCHES:</p>
                  <div className="space-y-1">
                    {editingRowData?.mismatchTypes?.map(type => (
                      <div key={type} className="flex items-center gap-2 text-xs bg-red-50 text-red-700 p-1 rounded px-2">
                        <AlertCircle className="w-3 h-3" />
                        <span className="font-semibold uppercase">{type}</span>
                        <span className="text-gray-400">|</span>
                        <span>{getMismatchSummary(type, editingRowData)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Type Dropdown */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Action Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6b8e2f] focus:border-[#6b8e2f] bg-white text-sm"
                >
                  <option value="">-- Select Action Type --</option>
                  <option value="Make Debit Note">Make Debit Note</option>
                  <option value="Return Material and Make Debit Note">
                    Return Material and Make Debit Note
                  </option>
                </select>
              </div>

              {/* Purchase Return Info Banner */}
              {isPurchaseReturn && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-orange-800">
                        Return Material First
                      </p>
                      <p className="text-xs text-orange-600 mt-1">
                        Click confirm to send this mismatch to Purchase Return.
                        After return finalization, it will move to the Debit Note
                        page.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Debit Note Fields - shown for both Purchaser and Transporter */}
              {isDebitNote && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Debit Amount <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.debitAmount || ""}
                      onChange={(e) =>
                        handleFormChange("debitAmount", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6b8e2f] focus:border-[#6b8e2f] text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="Enter debit amount (e.g. 5000)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason / Remarks
                    </label>
                    <textarea
                      value={formData.remarks || ""}
                      onChange={(e) =>
                        handleFormChange("remarks", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6b8e2f] focus:border-[#6b8e2f] text-sm resize-none"
                      placeholder="Enter correction details and notes..."
                      rows={3}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setEditingRow(null);
                  setActionType("");
                }}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 transition-colors duration-200"
              >
                Cancel
              </button>
              {actionType && (
                <button
                  onClick={submitFormData}
                  disabled={submitting}
                  className={`inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md ${
                    isPurchaseReturn
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:ring-blue-500"
                      : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 focus:ring-[#6b8e2f]"
                  }`}
                >
                  {submitting ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {submitting
                    ? "Submitting..."
                    : isPurchaseReturn
                      ? "Confirm Return Material"
                      : "Submit Debit Note"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Optimized Fetch LIFT-ACCOUNTS data for Mismatches
  const fetchLiftAccountsForMismatches = useCallback(async (mismatches) => {
    const list = mismatches || mismatchSheetData;
    if (!list || list.length === 0) {
      setLiftAccountsData([]);
      setLoadingLifts(false);
      return;
    }
    setLoadingLifts(true);
    try {
      const liftIds = Array.from(
        new Set(
          list
            .map((item) => item["Lift Number"] || item["Lift ID"])
            .filter(Boolean)
        )
      );
      if (liftIds.length === 0) {
        setLiftAccountsData([]);
        setLoadingLifts(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("LIFT-ACCOUNTS")
        .select('"Lift No", "Indent no.", "Vendor Name", "Qty", "Raw Material Name", "Planned 1", "Actual 1", "Planned 2", "Actual 2", "Planned 3", "Actual 3", "Bill No.", "Area lifting", "Lead Time To Reach Factory (days)", "Lifting Qty", "Type", "Transporter Name", "Truck No.", "Driver No.", "Bilty No.", "Type Of Transporting Rate", "Rate", "Bill Image", "Truck Qty", "Date Of Receiving", "Total Bill Quantity", "Actual Quantity", "Physical Condition", "Moisture", "Physical Image Of Product", "Image Of Weight Slip", "Bilty No. 2", "Bilty Image", "Status", "Date Of Test", "Moisture Percent Age %", "BD Percent Age %", "AP Percent Age %", "Alumina Percent Age %", "Iron Percent Age %", "Sieve Analysis", "LOI %", "SIO2 %", "CaO %", "MgO %", "TiO2 %", "K2O + Na2O %", "Free Iron %", "Firm Name", "Weight Slip Qty", "Transporter Rate", "Transporting Rate", "Testing Certificate", "Timestamp"')
        .in("Lift No", liftIds);

      if (fetchError) throw fetchError;

      let formattedData = (data || []).map((row) => {
        let createdAt = "";
        let timestamp = "";
        if (row["Timestamp"]) {
          try {
            const d = new Date(row["Timestamp"]);
            if (!isNaN(d.getTime())) {
              createdAt = d
                .toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: false,
                })
                .replace(",", "");
              timestamp = createdAt;
            }
          } catch (e) {
            createdAt = String(row["Timestamp"] || "");
            timestamp = createdAt;
          }
        }

        const formatDate = (dateValue) => {
          if (!dateValue) return "";
          try {
            const d = new Date(dateValue);
            if (!isNaN(d.getTime())) {
              return d.toLocaleDateString("en-GB");
            }
          } catch (e) {
            return String(dateValue);
          }
          return String(dateValue);
        };

        return {
          id: String(row["Lift No"] || "").trim(),
          liftNo: String(row["Lift No"] || "").trim(),
          indentNo: String(row["Indent no."] || "").trim(),
          vendorName: String(row["Vendor Name"] || "").trim(),
          quantity: String(row["Qty"] || "").trim(),
          material: String(row["Raw Material Name"] || "").trim(),
          rawMaterialName: String(row["Raw Material Name"] || "").trim(),
          planned1: row["Planned 1"] || null,
          actual1: row["Actual 1"] || null,
          planned2: row["Planned 2"] || null,
          actual2: row["Actual 2"] || null,
          planned3: row["Planned 3"] || null,
          actual3: row["Actual 3"] || null,
          billNo: String(row["Bill No."] || "").trim(),
          areaLifting: String(row["Area lifting"] || "").trim(),
          leadTimeToFactory: String(row["Lead Time To Reach Factory (days)"] || "").trim(),
          liftingQty: String(row["Lifting Qty"] || "").trim(),
          liftType: String(row["Type"] || "").trim(),
          transporterName: String(row["Transporter Name"] || "").trim(),
          truckNo: String(row["Truck No."] || "").trim(),
          driverNo: String(row["Driver No."] || "").trim(),
          biltyNo: String(row["Bilty No."] || "").trim(),
          typeOfTransportingRate: String(row["Type Of Transporting Rate"] || "").trim(),
          materialRate: String(row["Rate"] || "").trim(),
          billImageUrl: String(row["Bill Image"] || "").trim(),
          truckQty: String(row["Truck Qty"] || "").trim(),
          dateOfReceiving: formatDate(row["Date Of Receiving"]),
          totalBillQuantity: String(row["Total Bill Quantity"] || "").trim(),
          actualQuantity: String(row["Actual Quantity"] || "").trim(),
          physicalCondition: String(row["Physical Condition"] || "").trim(),
          moisture: String(row["Moisture"] || "").trim(),
          physicalImageUrl: String(row["Physical Image Of Product"] || "").trim(),
          weightSlipImageUrl: String(row["Image Of Weight Slip"] || "").trim(),
          biltyNo2: String(row["Bilty No. 2"] || "").trim(),
          biltyImageUrl: String(row["Bilty Image"] || "").trim(),
          status: String(row["Status"] || "").trim(),
          dateOfTest: formatDate(row["Date Of Test"]),
          moisturePercent: String(row["Moisture Percent Age %"] || "").trim(),
          bdPercent: String(row["BD Percent Age %"] || "").trim(),
          apPercent: String(row["AP Percent Age %"] || "").trim(),
          aluminaPercent: String(row["Alumina Percent Age %"] || "").trim(),
          ironPercent: String(row["Iron Percent Age %"] || "").trim(),
          sieveAnalysis: String(row["Sieve Analysis"] || "").trim(),
          loiPercent: String(row["LOI %"] || "").trim(),
          sio2Percent: String(row["SIO2 %"] || "").trim(),
          caoPercent: String(row["CaO %"] || "").trim(),
          mgoPercent: String(row["MgO %"] || "").trim(),
          tio2Percent: String(row["TiO2 %"] || "").trim(),
          k2oNa2oPercent: String(row["K2O + Na2O %"] || "").trim(),
          freeIronPercent: String(row["Free Iron %"] || "").trim(),
          firmName: String(row["Firm Name"] || "").trim(),
          weightSlipQty: String(row["Weight Slip Qty"] || "").trim(),
          transporterRate: String(row["Transporter Rate"] || "").trim(),
          transportingRate: String(row["Transporting Rate"] || "").trim(),
          testingCertificate: String(row["Testing Certificate"] || "").trim(),
          createdAt: createdAt,
          timestamp: timestamp,
        };
      });

      if (user?.firmName) {
        formattedData = formattedData.filter((lift) =>
          canViewFirm(user.firmName, lift.firmName),
        );
      }

      setLiftAccountsData(formattedData);
    } catch (err) {
      setError((prev) => prev ? `${prev}\nFailed to load LIFT-ACCOUNTS data: ${err.message}` : `Failed to load LIFT-ACCOUNTS data: ${err.message}`);
      setLiftAccountsData([]);
    } finally {
      setLoadingLifts(false);
    }
  }, [user, mismatchSheetData]);

  // Keep fetchLiftAccountsData compatible for external callers, calling our optimized function
  const fetchLiftAccountsData = useCallback(async () => {
    await fetchLiftAccountsForMismatches();
  }, [fetchLiftAccountsForMismatches]);

  // Optimized Fetch INDENT-PO data for Mismatches
  const fetchPOsForMismatches = useCallback(async (mismatches) => {
    const list = mismatches || mismatchSheetData;
    if (!list || list.length === 0) {
      setPurchaseOrdersData([]);
      setLoadingPOs(false);
      return;
    }
    setLoadingPOs(true);
    try {
      const indentIds = Array.from(
        new Set(
          list
            .flatMap((item) => [
              item["Indent Number"],
              item["Indent Id."],
              item["PO Number"],
              item["po_number"],
              item["Indent No"],
              item["Indent No."]
            ])
            .filter(Boolean)
        )
      );
      if (indentIds.length === 0) {
        setPurchaseOrdersData([]);
        setLoadingPOs(false);
        return;
      }

      // Fetch from INDENT-PO in parallel by po_number and Indent Id. to be safe
      const [res1, res2] = await Promise.all([
        supabase
          .from("INDENT-PO")
          .select('"Indent Id.", po_number, "Firm Name", "Vendor name", Vendor, Material, Quantity, Rate, "Pending PO Qty", "Approved Qty", "Approval Status", "Order Cancel Qty", "Reason Of Cancel Qty", Status, "Alumina %", "Iron %", Timestamp')
          .in("po_number", indentIds),
        supabase
          .from("INDENT-PO")
          .select('"Indent Id.", po_number, "Firm Name", "Vendor name", Vendor, Material, Quantity, Rate, "Pending PO Qty", "Approved Qty", "Approval Status", "Order Cancel Qty", "Reason Of Cancel Qty", Status, "Alumina %", "Iron %", Timestamp')
          .in("Indent Id.", indentIds)
      ]);

      const rawData = [...(res1.data || []), ...(res2.data || [])];
      
      // Deduplicate merged PO rows
      const seen = new Set();
      const uniqueData = [];
      for (const row of rawData) {
        const key = `${row["Indent Id."]}-${row["po_number"]}-${row["Material"]}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueData.push(row);
        }
      }

      const formattedData = uniqueData.map((row) => {
        let poTimestamp = "";
        if (row["Timestamp"]) {
          try {
            const d = new Date(row["Timestamp"]);
            if (!isNaN(d.getTime())) {
              poTimestamp = d
                .toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: false,
                })
                .replace(",", "");
            }
          } catch (e) {
            poTimestamp = String(row["Timestamp"] || "");
          }
        }

        return {
          indentNo: String(row["po_number"] || row["Indent Id."] || "").trim(),
          indentId: String(row["Indent Id."] || "").trim(),
          poNumber: String(row["po_number"] || "").trim(),
          firmName: String(row["Firm Name"] || "").trim(),
          vendorName: String(row["Vendor name"] || row["Vendor"] || "").trim(),
          rawMaterialName: String(row["Material"] || "").trim(),
          materialName: String(row["Material"] || "").trim(),
          poQuantity: String(row["Quantity"] || "").trim(),
          poRate: String(row["Rate"] || "").trim(),
          pendingQty: String(row["Pending PO Qty"] || "").trim(),
          approvedQty: String(row["Approved Qty"] || "").trim(),
          approvalStatus: String(row["Approval Status"] || "").trim(),
          orderCancelQty: String(row["Order Cancel Qty"] || "").trim(),
          reasonOfCancelQty: String(row["Reason Of Cancel Qty"] || "").trim(),
          poStatus: String(row["Status"] || "").trim(),
          poAlumina: String(row["Alumina %"] || "").trim(),
          poIron: String(row["Iron %"] || "").trim(),
          poTimestamp: poTimestamp,
        };
      });

      setPurchaseOrdersData(formattedData);
    } catch (error) {
      setError((prev) =>
        prev
          ? `${prev}\nFailed to load PO data: ${error.message}`
          : `Failed to load PO data: ${error.message}`,
      );
      setPurchaseOrdersData([]);
    } finally {
      setLoadingPOs(false);
    }
  }, [mismatchSheetData]);

  // Keep fetchPurchaseOrdersData compatible for external callers, calling our optimized function
  const fetchPurchaseOrdersData = useCallback(async () => {
    await fetchPOsForMismatches();
  }, [fetchPOsForMismatches]);

  // Watch mismatchSheetData to load Lifts and POs
  useEffect(() => {
    if (mismatchSheetData && mismatchSheetData.length > 0) {
      fetchLiftAccountsForMismatches(mismatchSheetData);
      fetchPOsForMismatches(mismatchSheetData);
    } else {
      setLiftAccountsData([]);
      setPurchaseOrdersData([]);
      setLoadingLifts(false);
      setLoadingPOs(false);
    }
  }, [mismatchSheetData, fetchLiftAccountsForMismatches, fetchPOsForMismatches]);

  const fetchTLData = useCallback(async () => {
    setLoadingTL(true);
    try {
      const { data, error: fetchError } = await supabase.from("TL").select("*");

      if (fetchError) throw fetchError;

      const formattedData = (data || [])
        .map((row, index) => ({
          _id: `tl-${index}`,
          productName: String(row["NAME"] || "").trim(),
          aluminaRange:
            row["TL Alumina"] !== null && row["TL Alumina"] !== undefined
              ? String(row["TL Alumina"])
              : "",
          ironRange:
            row["TL Iron"] !== null && row["TL Iron"] !== undefined
              ? String(row["TL Iron"])
              : "",
          apRange:
            row["AP%"] !== null && row["AP%"] !== undefined
              ? String(row["AP%"])
              : "",
          bdRange:
            row["BD%"] !== null && row["BD%"] !== undefined
              ? String(row["BD%"])
              : "",
          tlAluminaMin: row["TL Alumina"],
          tlIronMax: row["TL Iron"],
          tlApMax: row["AP%"],
          tlBdMin: row["BD%"],
        }))
        .filter((item) => item.productName && item.productName !== "");

      setTlData(formattedData);
    } catch (err) {
      setError((prev) =>
        prev
          ? `${prev}\nFailed to load TL data: ${err.message}`
          : `Failed to load TL data: ${err.message}`,
      );
      setTlData([]);
    } finally {
      setLoadingTL(false);
    }
  }, []);

  useEffect(() => {
    fetchTLData();
    fetchMismatchSheetData();
  }, [
    fetchTLData,
    fetchMismatchSheetData,
  ]);

  // Realtime subscription - auto-update Stage column when any module updates LIFT-ACCOUNTS
  useEffect(() => {
    const channel = supabase
      .channel("lift-accounts-stage-watch")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "LIFT-ACCOUNTS" },
        () => {
          fetchLiftAccountsData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLiftAccountsData]);

  // Helper for mismatch details in modal
  const getMismatchSummary = (type, item) => {
    const format = (val) => val !== undefined && val !== null ? val : "N/A";
    switch(type) {
      case 'rate': return `PO Rate: ₹${format(item.poRate)} vs Lift Rate: ₹${format(item.materialRate)} (Diff: ₹${format(item.rateDifference)})`;
      case 'quantity': return `PO Qty: ${format(item.poQuantity)} vs Lift Qty: ${format(item.liftingQty)} (Diff: ${format(item.qtyDifference || item.differenceQty)})`;
      case 'lab': return `Lab values out of tolerance: Alumina (${format(item.aluminaDiff)}%), Iron (${format(item.ironDiff)}%), AP (${format(item.apDiff)}%), BD (${format(item.bdDiff)}%)`;
      default: return "";
    }
  };

  // Calculate mismatch data (Hybrid: Differences from DB, Details from Source Tables)
  const getHybridRow = useCallback(
    (mismatchItem) => {
      const normalizeLookupKey = (value) =>
        String(value || "")
          .trim()
          .toUpperCase()
          .replace(/\s+/g, "");
      const numericLookupKey = (value) =>
        String(value || "").match(/\d+/g)?.join("") || "";

      const liftId = String(mismatchItem["Lift Number"] || mismatchItem["Lift ID"] || "").trim();
      const indentId = String(mismatchItem["Indent Number"] || mismatchItem["Indent Id."] || "").trim();

      const lift =
        liftAccountsData.find(
          (l) =>
            String(l.liftNo || "").trim() === liftId
        ) || {};

      const poLookupValues = [
        indentId,
        mismatchItem["PO Number"],
        mismatchItem["po_number"],
        mismatchItem["Indent No"],
        mismatchItem["Indent No."],
        lift.indentNo,
      ].filter(Boolean);
      const poLookupKeys = poLookupValues.map(normalizeLookupKey).filter(Boolean);
      const poNumericKeys = poLookupValues.map(numericLookupKey).filter(Boolean);
      const mismatchMaterial = String(
        mismatchItem["Product Name"] || lift.rawMaterialName || lift.material || "",
      ).trim().toLowerCase();

      const poCandidates = purchaseOrdersData.filter((p) => {
        const candidateKeys = [
          p.indentNo,
          p.indentId,
          p.poNumber,
        ].map(normalizeLookupKey).filter(Boolean);
        const candidateNumericKeys = [
          p.indentNo,
          p.indentId,
          p.poNumber,
        ].map(numericLookupKey).filter(Boolean);
        return candidateKeys.some((key) => poLookupKeys.includes(key)) ||
          candidateNumericKeys.some((key) => poNumericKeys.includes(key));
      });

      const po =
        poCandidates.find((p) =>
          String(p.rawMaterialName || p.materialName || "").trim().toLowerCase() === mismatchMaterial
        ) || poCandidates[0] || {};

      // Match TL row by Product Name (from Mismatch table) or Raw Material Name (from LIFT-ACCOUNTS)
      const productNameForTL = String(
        mismatchItem["Product Name"] || lift.rawMaterialName || "",
      )
        .trim()
        .toLowerCase();
      const tlRow =
        tlData.find(
          (tl) =>
            String(tl.productName || "")
              .trim()
              .toLowerCase() === productNameForTL,
        ) || {};

      // 4 Stages: Lift → Receipt → Lab → Mismatch
      let liveStage;
      if (lift.planned2 && !lift.actual2) {
        liveStage = "Lab";
      } else if (lift.planned1 && !lift.actual1) {
        liveStage = "Receipt";
      } else if (!lift.planned1) {
        liveStage = "Lift";
      } else {
        liveStage = "Mismatch";
      }

      // Identify Mismatch Types
      const rateTypeStr = String(lift.typeOfTransportingRate || mismatchItem["Type Of Rate"] || mismatchItem["Type Of Transporting Rate"] || "").toUpperCase();
      const liftTypeStr = String(lift.liftType || mismatchItem["Type"] || "").toUpperCase();
      const isTransporter = rateTypeStr.includes("TO PAY") || liftTypeStr.includes("TRANSPORTER");
      const isVendor = liftTypeStr.includes("VENDOR") || rateTypeStr.includes("PAID") || rateTypeStr.includes("BILLED") || rateTypeStr.includes("FOR");
      
      
      // Handle both MT and KG: if bill quantity > 500, it's likely in KG. (Trucks carry 9-40 MT)
      const baseBillQty = parseFloat(lift.liftingQty || lift.quantity || po.poQuantity || 0);
      const isKG = baseBillQty > 500; 
      const multiplier = isKG ? 1000 : 1;
      const tolerance = isTransporter ? (-0.10 * multiplier) : (-0.05 * multiplier);

      const mismatchTypes = [];
      const hasRate = Math.abs(parseFloat(mismatchItem["Rate Difference"] || 0)) > 0.001;
      const hasQty = (parseFloat(mismatchItem["Quantity Difference"] || 0) < tolerance || 
                     parseFloat(mismatchItem["Diff Qty"] || 0) < tolerance || 
                     (mismatchItem["Qty Diff Status"] === "Mismatch" && parseFloat(mismatchItem["Quantity Difference"] || 0) < tolerance));
      
      const aluminaDiff = mismatchItem["Alumina Difference"];
      const ironDiff = mismatchItem["Iron Difference"];
      const apDiff = mismatchItem["AP Difference"];
      const bdDiff = mismatchItem["BD Difference"];

      // Check stored difference columns from Mismatch table
      const hasAluminaStored = aluminaDiff !== null && Math.abs(parseFloat(aluminaDiff || 0)) > 0;
      const hasIronStored = ironDiff !== null && Math.abs(parseFloat(ironDiff || 0)) > 0;
      const hasApStored = apDiff !== null && Math.abs(parseFloat(apDiff || 0)) > 0;
      const hasBdStored = bdDiff !== null && Math.abs(parseFloat(bdDiff || 0)) > 0;

      // LIVE comparison: compare LIFT-ACCOUNTS lab values directly against TL thresholds
      // This catches records where Mismatch table diff columns are null (e.g. submitted before integration)
      const labAluminaVal = parseFloat(lift.aluminaPercent || "");
      const labIronVal = parseFloat(lift.ironPercent || "");
      const labApVal = parseFloat(lift.apPercent || "");
      const labBdVal = parseFloat(lift.bdPercent || "");
      const tlAluminaMinVal = parseFloat(tlRow.tlAluminaMin ?? "");
      const tlIronMaxVal = parseFloat(tlRow.tlIronMax ?? "");
      const tlApMaxVal = parseFloat(tlRow.tlApMax ?? "");
      const tlBdMinVal = parseFloat(tlRow.tlBdMin ?? "");

      // Alumina: TL Alumina is MINIMUM → mismatch if lab < min
      const hasAluminaLive = !isNaN(labAluminaVal) && !isNaN(tlAluminaMinVal) && labAluminaVal < tlAluminaMinVal;
      // Iron: TL Iron is MAXIMUM → mismatch if lab > max
      const hasIronLive = !isNaN(labIronVal) && !isNaN(tlIronMaxVal) && labIronVal > tlIronMaxVal;
      // AP: TL AP is MAXIMUM → mismatch if lab > max
      const hasApLive = !isNaN(labApVal) && !isNaN(tlApMaxVal) && labApVal > tlApMaxVal;
      // BD: TL BD is MINIMUM → mismatch if lab < min
      const hasBdLive = !isNaN(labBdVal) && !isNaN(tlBdMinVal) && labBdVal < tlBdMinVal;

      const hasAlumina = hasAluminaStored || hasAluminaLive;
      const hasIron = hasIronStored || hasIronLive;
      const hasAp = hasApStored || hasApLive;
      const hasBd = hasBdStored || hasBdLive;
      const isRejected = lift.status?.toLowerCase() === "rejected";
      const hasLab = hasAlumina || hasIron || hasAp || hasBd || isRejected || (lift.physicalCondition === "Bad" && lift.moisture === "Yes");

      if (hasRate) mismatchTypes.push("rate");
      if (hasQty) mismatchTypes.push("quantity");
      if (hasLab) mismatchTypes.push("lab");

      const diffSummary = [
        hasRate ? "Rate" : "",
        hasQty ? "Qty" : "",
        hasLab ? "Lab" : ""
      ].filter(Boolean).join(", ");

      const billQtyVal = parseFloat(lift.truckQty || mismatchItem["Truck Qty"] || mismatchItem["Qty"]);
      const actQtyVal = parseFloat(lift.actualQuantity || mismatchItem["Actual Quantity"]);
      const diffBillRecVal = (!isNaN(billQtyVal) && !isNaN(actQtyVal))
        ? parseFloat((billQtyVal - actQtyVal).toFixed(3))
        : "N/A";

      return {
        ...lift,
        ...po,
        // Map DB Mismatch columns to component props
        id: mismatchItem.id,
        liftIdDisplay: mismatchItem["Lift ID"],
        // Core Identifiers
        liftNo: mismatchItem["Lift Number"],
        indentNo: po.poNumber || po.indentNo || po.indentId || mismatchItem["Indent Number"] || lift.indentNo || "",
        truckNo: lift.truckNo || mismatchItem["Truck No."] || mismatchItem["Truck No"] || "",

        // Differences from Mismatch Table (TL vs LIFT-ACCOUNTS)
        rateDifference: mismatchItem["Rate Difference"],
        qtyDifference: mismatchItem["Quantity Difference"],
        qtyDifferenceStatus: mismatchItem["Qty Diff Status"],
        differenceQty: mismatchItem["Diff Qty"],
        aluminaDiff: mismatchItem["Alumina Difference"],
        ironDiff: mismatchItem["Iron Difference"],
        apDiff: mismatchItem["AP Difference"],
        bdDiff: mismatchItem["BD Difference"],

        // TL table tolerance values (shown instead of PO values in Lab Mismatch)
        tlAlumina: tlRow.aluminaRange || "N/A",
        tlIron: tlRow.ironRange || "N/A",
        tlAP: tlRow.apRange || "N/A",
        tlBD: tlRow.bdRange || "N/A",

        // Fallback/Priority for shared fields
        vendorName:
          mismatchItem["Party Name"] || lift.vendorName || po.vendorName,
        rawMaterialName:
          mismatchItem["Product Name"] || lift.rawMaterialName || lift.material,
        material:
          mismatchItem["Product Name"] || lift.material || po.materialName || po.rawMaterialName,
        firmName: mismatchItem["Firm Name"] || lift.firmName || po.firmName,
        timestamp: String(mismatchItem["Timestamp"] || "").replace("T", " "),

        // Live stage derived from LIFT-ACCOUNTS actual timestamps
        stage: liveStage,
        status: mismatchItem["Status"] || mismatchItem.Status || "",
        Status: mismatchItem["Status"] || mismatchItem.Status || "",
        remarks: mismatchItem["Remarks"] || mismatchItem.Remarks || "",
        mismatchTypes,
        diffSummary,
        qtyUnit: isKG ? "KG" : "MT",

        // Explicit Mapping for Mismatch Summaries
        materialRate: lift.materialRate || mismatchItem["Rate"] || mismatchItem["Material Rate (Lift)"],
        poRate: po.poRate || mismatchItem["PO Rate"] || mismatchItem["PO Rate (Original)"],
        liftingQty: lift.liftingQty || lift.quantity || mismatchItem["Billing Quantity"],
        poQuantity: po.poQuantity || po.quantity || mismatchItem["Quantity (PO)"],
        billQuantity: lift.truckQty || mismatchItem["Truck Qty"] || mismatchItem["Qty"] || "N/A",
        actualQuantity: lift.actualQuantity || mismatchItem["Actual Quantity"] || "N/A",
        diffBillRec: diffBillRecVal,
        billNo: lift.billNo || mismatchItem["Bill No."] || mismatchItem["Bill No"] || "",
        areaLifting: lift.areaLifting || mismatchItem["Area Lifting"] || mismatchItem["Area lifting"] || "",
        billImageUrl: lift.billImageUrl || mismatchItem["Bill Image"] || "",
        biltyNo: lift.biltyNo || mismatchItem["Bilty No."] || mismatchItem["Bilty No"] || "",
        biltyImageUrl: lift.biltyImageUrl || mismatchItem["Bilty Image"] || "",
        weightSlipImageUrl: lift.weightSlipImageUrl || mismatchItem["Weight Slip"] || "",
        typeOfTransportingRate: lift.typeOfTransportingRate || mismatchItem["Type Of Rate"] || mismatchItem["Type Of Transporting Rate"] || "",
        
        // Lab Data Explicit Mapping
        aluminaPercent: lift.aluminaPercent || "",
        ironPercent: lift.ironPercent || "",
        apPercent: lift.apPercent || "",
        bdPercent: lift.bdPercent || "",
        poAlumina: po.poAlumina || mismatchItem["PO Al2O3%"] || mismatchItem["PO Alumina"] || mismatchItem["Alumina %"] || "",
        poIron: po.poIron || mismatchItem["PO Fe%"] || mismatchItem["PO Iron"] || mismatchItem["Iron %"] || ""
      };
    },
    [liftAccountsData, purchaseOrdersData, tlData],
  );

  const unifiedMismatchData = useMemo(() => {
    const raw = mismatchSheetData
      .filter(
        (item) =>
          item["Status"] !== "Credit Notes" &&
          item["Status"] !== "Others" &&
          item["Status"] !== "Purchase Return" &&
          item["Status"] !== "Acknowledge" &&
          item["Status"] !== "Completed" &&
          item["Status"] !== "Resolved - Return",
      )
      .map(getHybridRow)
      .filter(row => row.mismatchTypes.length > 0);

    if (user?.firmName) {
      return raw.filter((item) => canViewFirm(user.firmName, item.firmName));
    }
    return raw;
  }, [mismatchSheetData, getHybridRow, user]);

  const historyMismatchData = useMemo(() => {
    const raw = mismatchSheetData
      .filter(item => item.Status !== "Pending" && item.Status !== "Not Done" && item.Status !== "Purchase Return")
      .map(getHybridRow);

    if (user?.firmName) {
      return raw.filter((item) => canViewFirm(user.firmName, item.firmName));
    }
    return raw;
  }, [mismatchSheetData, getHybridRow, user]);


  const filteredUnifiedData = useMemo(() => {
    let filtered = unifiedMismatchData.filter(
      (item) => !submittedRows.has(`mismatch_${item.liftNo}`),
    );
    if (filters.vendorName !== "all") {
      filtered = filtered.filter(
        (item) => item.vendorName === filters.vendorName,
      );
    }
    if (filters.materialName !== "all") {
      filtered = filtered.filter(
        (item) => item.material === filters.materialName || item.rawMaterialName === filters.materialName,
      );
    }
    if (filters.firmName !== "all") {
      filtered = filtered.filter((item) => item.firmName === filters.firmName);
    }
    if (filters.orderNumber !== "all") {
      filtered = filtered.filter(
        (item) => item.indentNo === filters.orderNumber,
      );
    }
    if (filters.fromDate) {
      filtered = filtered.filter((item) => {
        if (!item.timestamp) return false;
        const itemDateStr = item.timestamp.substring(0, 10);
        return itemDateStr >= filters.fromDate;
      });
    }
    if (filters.toDate) {
      filtered = filtered.filter((item) => {
        if (!item.timestamp) return false;
        const itemDateStr = item.timestamp.substring(0, 10);
        return itemDateStr <= filters.toDate;
      });
    }
    return filtered;
  }, [unifiedMismatchData, filters, submittedRows]);

  const filteredHistoryData = useMemo(() => {
    let filtered = historyMismatchData;
    if (filters.vendorName !== "all") {
      filtered = filtered.filter(
        (item) => item.vendorName === filters.vendorName,
      );
    }
    if (filters.materialName !== "all") {
      filtered = filtered.filter(
        (item) => item.material === filters.materialName || item.rawMaterialName === filters.materialName,
      );
    }
    if (filters.firmName !== "all") {
      filtered = filtered.filter((item) => item.firmName === filters.firmName);
    }
    if (filters.orderNumber !== "all") {
      filtered = filtered.filter(
        (item) => item.indentNo === filters.orderNumber,
      );
    }
    if (filters.fromDate) {
      filtered = filtered.filter((item) => {
        if (!item.timestamp) return false;
        const itemDateStr = item.timestamp.substring(0, 10);
        return itemDateStr >= filters.fromDate;
      });
    }
    if (filters.toDate) {
      filtered = filtered.filter((item) => {
        if (!item.timestamp) return false;
        const itemDateStr = item.timestamp.substring(0, 10);
        return itemDateStr <= filters.toDate;
      });
    }
    return filtered;
  }, [historyMismatchData, filters]);

  // Filter options
  const uniqueFilterOptions = useMemo(() => {
    const vendors = new Set();
    const materials = new Set();
    const firms = new Set();
    const orders = new Set();

    unifiedMismatchData.forEach((item) => {
      if (item.vendorName) vendors.add(item.vendorName);
      if (item.material || item.rawMaterialName) {
        materials.add(item.material || item.rawMaterialName);
      }
      if (item.firmName) firms.add(item.firmName);
      if (item.indentNo) orders.add(item.indentNo);
    });

    return {
      vendorName: [...vendors].sort(),
      materialName: [...materials].sort(),
      firmName: [...firms].sort(),
      orderNumber: [...orders].sort(),
    };
  }, [unifiedMismatchData]);

  // Event handlers (keeping existing logic unchanged)
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
    setFilters({
      vendorName: "all",
      materialName: "all",
      firmName: "all",
      orderNumber: "all",
      fromDate: "",
      toDate: "",
    });
  };

  const handleToggleColumn = (tab, dataKey, checked) => {
    if (tab === "unified") {
      setVisibleUnifiedColumns((prev) => ({
        ...prev,
        [dataKey]: checked,
      }));
    } else if (tab === "history") {
      setVisibleHistoryColumns((prev) => ({ ...prev, [dataKey]: checked }));
    }
  };

  const handleSelectAllColumns = (tab, columnsMeta, selectAll) => {
    const newVisibility = {};
    columnsMeta.forEach((col) => {
      newVisibility[col.dataKey] = col.alwaysVisible || selectAll;
    });
    if (tab === "unified") {
      setVisibleUnifiedColumns(newVisibility);
    } else if (tab === "history") {
      setVisibleHistoryColumns(newVisibility);
    }
  };

  // Render cell with action buttons
  const renderCell = (item, column) => {
    const value = item[column.dataKey];

    if (column.dataKey === "actions") {
      const mismatchType = "unified";

      if (activeTab === "history") {
        return (
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-green-50 text-[#6b8e2f] border-green-200"
            >
              Submitted
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50 border border-green-200 font-bold"
              onClick={() => handleAcknowledgeMismatch(item)}
              title="Mark as Proper"
              disabled={item.status === "Acknowledge"}
            >
              {item.status === "Acknowledge" ? "Proper" : "OK"}
            </Button>
            {isSuperAdmin && (
              <button
                onClick={() => setSuperAdminEditItem(item)}
                className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-md hover:bg-purple-200 border border-purple-300"
              >
                <ShieldCheck className="w-3 h-3 mr-1" />
                Edit
              </button>
            )}
          </div>
        );
      }

      return (
        <div className="flex gap-2 whitespace-nowrap items-center">
          <button
            onClick={() => handleCorrectData(item, mismatchType)}
            className="inline-flex items-center px-3 py-1 text-xs font-medium text-white bg-linear-to-r from-green-500 to-green-600 rounded-md hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-[#6b8e2f] focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Edit className="w-3 h-3 mr-1" />
            Management Approval
          </button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50 border border-green-200 font-bold"
            onClick={() => handleAcknowledgeMismatch(item)}
            title="Mark as Proper"
          >
            OK
          </Button>
          {isSuperAdmin && (
            <button
              onClick={() => setSuperAdminEditItem(item)}
              className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-md hover:bg-purple-200 border border-purple-300"
            >
              <ShieldCheck className="w-3 h-3 mr-1" />
              Edit
            </button>
          )}
        </div>
      );
    }

    if (column.isLink) {
      return value ? (
        <a
          href={String(value).startsWith("http") ? value : `https://${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#7da23a] hover:text-green-800 hover:underline inline-flex items-center text-xs"
        >
          <ExternalLink className="h-3 w-3 mr-1" /> {column.linkText || "View"}
        </a>
      ) : (
        <span className="text-gray-400 text-xs">N/A</span>
      );
    }

    if (column.dataKey === "mismatchTypes") {
      return (
        <div className="flex flex-wrap gap-1">
          {item.mismatchTypes.map(type => (
            <Badge key={type} className="text-[9px] px-1 bg-red-50 text-red-600 border-red-100 uppercase">
              {type}
            </Badge>
          ))}
        </div>
      );
    }

    if (column.dataKey === "diffSummary") {
      return <span className="text-[10px] text-gray-500 font-medium">{item.diffSummary}</span>;
    }

    // Stage badge rendering
    if (column.dataKey === "stage") {
      const stageValue = String(value || "Lift");
      const stageConfig = {
        Lift: {
          className: "bg-orange-100 text-orange-800 border-orange-200",
          icon: "🚛",
        },
        Receipt: {
          className: "bg-green-100 text-green-800 border-green-200",
          icon: "📦",
        },
        Lab: {
          className: "bg-green-100 text-green-800 border-green-200",
          icon: "🧪",
        },
        Mismatch: {
          className: "bg-red-100 text-red-800 border-red-200",
          icon: "⚠️",
        },
      };
      const config = stageConfig[stageValue] || stageConfig["Lift"];
      return (
        <Badge
          variant="outline"
          className={`whitespace-nowrap text-xs font-semibold px-2 py-0.5 ${config.className}`}
        >
          <span className="mr-1">{config.icon}</span>
          {stageValue}
        </Badge>
      );
    }

    // Highlight differences with color coding
    if (
      column.dataKey === "rateDifference" ||
      column.dataKey === "qtyDifference" ||
      column.dataKey === "aluminaDiff" ||
      column.dataKey === "ironDiff" ||
      column.dataKey === "apDiff" ||
      column.dataKey === "bdDiff"
    ) {
      const numValue = parseFloat(value) || 0;
      let displayValue = numValue > 0 ? `+${value}` : value;
      if (column.dataKey === "qtyDifference" && value !== undefined && value !== null) {
        displayValue = `${displayValue} ${item.qtyUnit || ""}`;
      }
      return (
        <span
          className={
            numValue < 0
              ? "text-red-600 font-semibold"
              : "text-[#7da23a] font-semibold"
          }
        >
          {displayValue}
        </span>
      );
    }

    if (column.dataKey === "diffBillRec") {
      if (value === "N/A" || value === undefined || value === null) {
        return <span className="text-gray-400 text-xs">N/A</span>;
      }
      const numValue = parseFloat(value) || 0;
      let displayValue = numValue > 0 ? `+${value}` : value;
      return (
        <span
          className={
            numValue > 0
              ? "text-red-600 font-semibold"
              : numValue < 0
                ? "text-[#7da23a] font-semibold"
                : "text-gray-700 font-medium"
          }
        >
          {displayValue} <span className="text-[10px] text-gray-500 ml-0.5">{item.qtyUnit || ""}</span>
        </span>
      );
    }

    if (
      (column.dataKey === "billQuantity" || 
       column.dataKey === "actualQuantity" || 
       column.dataKey === "differenceQty") && 
      value && value !== "N/A"
    ) {
      return <span>{value} <span className="text-[10px] text-gray-500 ml-0.5">{item.qtyUnit || ""}</span></span>;
    }

    return value || <span className="text-gray-400 text-xs">N/A</span>;
  };

  const renderTableSection = (
    tabKey,
    title,
    description,
    data,
    columnsMeta,
    visibilityState,
  ) => {
    const visibleCols = columnsMeta.filter(
      (col) => visibilityState[col.dataKey],
    );
    const isLoading = tabKey === "unified" 
      ? loadingLifts || loadingPOs || loadingMismatch 
      : loadingLifts;
    const hasError = error && data.length === 0;

    return (
      <Card className="shadow-sm border border-border flex-1 flex-col">
        <CardHeader className="py-3 px-4 bg-red-50/50">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center text-md font-semibold text-foreground">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                {title} ({data.length})
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-0.5">
                {description}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  fetchLiftAccountsData();
                  fetchPurchaseOrdersData();
                  fetchTLData();
                  fetchMismatchSheetData();
                }}
                variant="outline"
                size="sm"
                className="h-8 text-xs bg-white"
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Refresh
              </Button>
              <Button
                onClick={() => {
                  const exportHeaders = columnsMeta
                    .filter((col) => col.dataKey !== "actions")
                    .map((col) => `"${col.header.replace(/"/g, '""')}"`);

                  const exportRows = data.map((item) => {
                    return columnsMeta
                      .filter((col) => col.dataKey !== "actions")
                      .map((col) => {
                        let val = item[col.dataKey];
                        if (val === undefined || val === null) {
                          val = "";
                        } else {
                          val = String(val);
                        }
                        return `"${val.replace(/"/g, '""')}"`;
                      })
                      .join(",");
                  });

                  const csvContent = [exportHeaders.join(","), ...exportRows].join("\n");
                  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.setAttribute("href", url);
                  link.setAttribute("download", `${tabKey}_mismatches_${new Date().toISOString().slice(0, 10)}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  toast.success("Excel (CSV) Exported Successfully", {
                    description: `Downloaded ${data.length} records in Excel format.`,
                    duration: 3000,
                  });
                }}
                variant="outline"
                size="sm"
                className="h-8 text-xs bg-white text-emerald-600 border-emerald-200 hover:text-emerald-700 hover:bg-emerald-50/50"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs bg-white"
                  >
                    <MixerHorizontalIcon className="mr-1.5 h-3.5 w-3.5" /> View Columns
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-3">
                  <div className="grid gap-2">
                    <p className="text-sm font-medium">Toggle Columns</p>
                    <div className="flex items-center justify-between mt-1 mb-2">
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto text-xs"
                        onClick={() => handleSelectAllColumns(tabKey === "unified" ? "unified" : "history", columnsMeta, true)}
                      >
                        Select All
                      </Button>
                      <span className="text-gray-300 mx-1">|</span>
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto text-xs"
                        onClick={() => handleSelectAllColumns(tabKey === "unified" ? "unified" : "history", columnsMeta, false)}
                      >
                        Deselect All
                      </Button>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {columnsMeta
                        .filter((col) => col.toggleable)
                        .map((col) => (
                          <div key={`toggle-${tabKey}-${col.dataKey}`} className="flex items-center space-x-2">
                            <Checkbox
                              id={`toggle-${tabKey}-${col.dataKey}`}
                              checked={!!visibilityState[col.dataKey]}
                              onCheckedChange={(checked) => handleToggleColumn(tabKey === "unified" ? "unified" : "history", col.dataKey, Boolean(checked))}
                              disabled={col.alwaysVisible}
                            />
                            <Label htmlFor={`toggle-${tabKey}-${col.dataKey}`} className="text-xs font-normal cursor-pointer">
                              {col.header} {col.alwaysVisible && <span className="text-gray-400 ml-0.5 text-xs">(Fixed)</span>}
                            </Label>
                          </div>
                        ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 flex-col">
          {isLoading ? (
            <div className="flex flex-col justify-center items-center py-10 flex-1">
              <Loader2 className="h-8 w-8 text-red-600 animate-spin mb-3" />
              <p className="text-muted-foreground ml-2">
                Loading mismatch data...
              </p>
            </div>
          ) : hasError ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-destructive-foreground bg-destructive/10 rounded-lg mx-4 my-4 text-center flex-1">
              <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
              <p className="font-medium text-destructive">Error Loading Data</p>
              <p className="text-sm text-muted-foreground max-w-md">{error}</p>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-green-200/50 bg-green-50/50 rounded-lg mx-4 my-4 text-center flex-1">
              <Info className="h-12 w-12 text-green-500 mb-3" />
              <p className="font-medium text-foreground">No Mismatches Found</p>
              <p className="text-sm text-muted-foreground text-center">
                {tabKey === "rateMismatch"
                  ? "All material rates match their corresponding PO rates."
                  : tabKey === "quantityMismatch"
                    ? "All lifted quantities match their weight slip quantities."
                    : "All material properties match between TL and LIFT-ACCOUNTS sheets."}
                {user?.firmName && String(user.firmName).toLowerCase() !== "all" && (
                  <span className="block mt-1">
                    (Filtered by firm: {user.firmName})
                  </span>
                )}
              </p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[calc(100vh-280px)] min-h-[400px] relative custom-scrollbar rounded-b-lg flex-1">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-30">
                  <tr className="bg-red-50 border-b border-red-200">
                    {visibleCols.map((col) => (
                      <th
                        key={col.dataKey}
                        className={`px-3 py-3 text-xs font-bold text-red-800 uppercase text-left bg-red-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap ${col.dataKey === "actions" ? "w-[150px]" : ""}`}
                      >
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {data.map((item, index) => (
                    <tr
                      key={`${tabKey}-${item.id || item.liftNo}-${index}`}
                      className="hover:bg-red-50/50 bg-red-100/30 border-l-4 border-l-red-500 transition-colors border-b border-gray-100"
                    >
                      {visibleCols.map((column) => (
                        <td
                          key={`${item.id || item.liftNo}-${column.dataKey}`}
                          className={`text-xs px-3 py-2 ${
                            column.dataKey === "id" ||
                            column.dataKey === "liftNo" ||
                            column.dataKey === "liftIdDisplay"
                              ? "font-medium text-primary"
                              : column.dataKey === "actions"
                                ? "w-[150px]"
                                : "text-gray-700"
                          }`}
                        >
                          {renderCell(item, column)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      {renderModal()}
      {superAdminEditItem && (
        <SuperAdminEditModal
          title={`Edit Mismatch — ${superAdminEditItem.liftIdDisplay || superAdminEditItem.liftNo}`}
          tableName="Mismatch"
          pkField="id"
          pkValue={superAdminEditItem.id}
          fields={[
            { label: "Stage", dbKey: "stage", value: superAdminEditItem.stage, type: "text", readOnly: true },
            { label: "Detected Issues", dbKey: "mismatchTypes", value: (superAdminEditItem.mismatchTypes || []).join(", ").toUpperCase(), type: "text", readOnly: true },
            { label: "Difference Summary", dbKey: "diffSummary", value: superAdminEditItem.diffSummary, type: "text", readOnly: true },
            
            { label: "Lift ID (Mismatch)", dbKey: "Lift ID", value: superAdminEditItem.liftIdDisplay || superAdminEditItem.liftNo, type: "text" },
            { label: "Lift Number (Mismatch)", dbKey: "Lift Number", value: superAdminEditItem.liftNo, type: "text" },
            { label: "Lift Number (LIFT-ACCOUNTS)", dbKey: "liftNoLift", saveDbKey: "Lift No", customTable: "LIFT-ACCOUNTS", customPkField: "Lift No", customPkValue: superAdminEditItem.liftNo, value: superAdminEditItem.liftNo, type: "text" },
            
            { label: "Truck No. (Mismatch)", dbKey: "Truck No.", value: superAdminEditItem.truckNo, type: "text" },
            { label: "Truck No. (LIFT-ACCOUNTS)", dbKey: "truckNoLift", saveDbKey: "Truck No.", customTable: "LIFT-ACCOUNTS", customPkField: "Lift No", customPkValue: superAdminEditItem.liftNo, value: superAdminEditItem.truckNo, type: "text" },
            
            { label: "PO Number (Mismatch)", dbKey: "Indent Number", value: superAdminEditItem.indentNo, type: "text" },
            { label: "PO Number (LIFT-ACCOUNTS)", dbKey: "poNoLift", saveDbKey: "Indent no.", customTable: "LIFT-ACCOUNTS", customPkField: "Lift No", customPkValue: superAdminEditItem.liftNo, value: superAdminEditItem.indentNo, type: "text" },
            
            { label: "Firm Name (Mismatch)", dbKey: "Firm Name", value: superAdminEditItem.firmName, type: "text" },
            { label: "Firm Name (LIFT-ACCOUNTS)", dbKey: "firmNameLift", saveDbKey: "Firm Name", customTable: "LIFT-ACCOUNTS", customPkField: "Lift No", customPkValue: superAdminEditItem.liftNo, value: superAdminEditItem.firmName, type: "text" },
            
            { label: "Party Name (Mismatch)", dbKey: "Party Name", value: superAdminEditItem.vendorName, type: "text" },
            { label: "Party Name (LIFT-ACCOUNTS)", dbKey: "partyNameLift", saveDbKey: "Vendor Name", customTable: "LIFT-ACCOUNTS", customPkField: "Lift No", customPkValue: superAdminEditItem.liftNo, value: superAdminEditItem.vendorName, type: "text" },
            
            { label: "Product Name (Mismatch)", dbKey: "Product Name", value: superAdminEditItem.material, type: "text" },
            { label: "Product Name (LIFT-ACCOUNTS)", dbKey: "productNameLift", saveDbKey: "Raw Material Name", customTable: "LIFT-ACCOUNTS", customPkField: "Lift No", customPkValue: superAdminEditItem.liftNo, value: superAdminEditItem.material, type: "text" },
            
            { label: "PO Rate (INDENT-PO)", dbKey: "poRatePO", saveDbKey: "Rate", customTable: "INDENT-PO", customPkField: "po_number", customPkValue: superAdminEditItem.indentNo, value: superAdminEditItem.poRate, type: "number" },
            
            { label: "Bill Rate (Mismatch)", dbKey: "Rate", value: superAdminEditItem.materialRate, type: "number" },
            { label: "Bill Rate (LIFT-ACCOUNTS)", dbKey: "rateLift", saveDbKey: "Rate", customTable: "LIFT-ACCOUNTS", customPkField: "Lift No", customPkValue: superAdminEditItem.liftNo, value: superAdminEditItem.materialRate, type: "number" },
            
            { label: "Bill Qty (Mismatch)", dbKey: "Truck Qty", value: superAdminEditItem.billQuantity, type: "number" },
            { label: "Bill Qty (LIFT-ACCOUNTS)", dbKey: "truckQtyLift", saveDbKey: "Truck Qty", customTable: "LIFT-ACCOUNTS", customPkField: "Lift No", customPkValue: superAdminEditItem.liftNo, value: superAdminEditItem.billQuantity, type: "number" },
            
            { label: "Receive Qty (LIFT-ACCOUNTS)", dbKey: "actualQtyLift", saveDbKey: "Actual Quantity", customTable: "LIFT-ACCOUNTS", customPkField: "Lift No", customPkValue: superAdminEditItem.liftNo, value: superAdminEditItem.actualQuantity, type: "number" },
            
            { label: "PO Al2O3% (INDENT-PO)", dbKey: "poAluminaPO", saveDbKey: "Alumina %", customTable: "INDENT-PO", customPkField: "po_number", customPkValue: superAdminEditItem.indentNo, value: superAdminEditItem.poAlumina, type: "number" },
            { label: "PO Fe% (INDENT-PO)", dbKey: "poIronPO", saveDbKey: "Iron %", customTable: "INDENT-PO", customPkField: "po_number", customPkValue: superAdminEditItem.indentNo, value: superAdminEditItem.poIron, type: "number" },
            
            { label: "Lab Al2O3% (LIFT-ACCOUNTS)", dbKey: "aluminaPercentLift", saveDbKey: "Alumina Percent Age %", customTable: "LIFT-ACCOUNTS", customPkField: "Lift No", customPkValue: superAdminEditItem.liftNo, value: superAdminEditItem.aluminaPercent, type: "number" },
            { label: "Lab Fe% (LIFT-ACCOUNTS)", dbKey: "ironPercentLift", saveDbKey: "Iron Percent Age %", customTable: "LIFT-ACCOUNTS", customPkField: "Lift No", customPkValue: superAdminEditItem.liftNo, value: superAdminEditItem.ironPercent, type: "number" },
            
            { label: "Debit Amount", dbKey: "Debit Amount", value: superAdminEditItem.debitAmount, type: "number" },
            { label: "Debit Note URL", dbKey: "Debit Note URL", value: superAdminEditItem.debitNoteUrl, type: "text" },
            { label: "Total Freight", dbKey: "Total Freight", value: superAdminEditItem.totalFreight, type: "number" },
            { label: "Remarks", dbKey: "Remarks", value: superAdminEditItem.remarks, type: "textarea" },
          ]}
          onClose={() => setSuperAdminEditItem(null)}
          onSaved={() => { setSuperAdminEditItem(null); fetchMismatchSheetData(); fetchLiftAccountsData(); }}
        />
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        <Card className="shadow-md border-none">
          <CardHeader className="p-4 border-b border-gray-200">
            <CardTitle className="flex items-center gap-2 text-gray-700 text-lg">
              <TrendingDown className="h-5 w-5 text-red-600" /> Mismatch
              Analysis Dashboard
            </CardTitle>
            <CardDescription className="text-gray-500 text-sm">
              Identify and analyze rate, quantity, and material property
              mismatches across sheets.
              {user?.firmName && String(user.firmName).toLowerCase() !== "all" && (
                <span className="ml-2 text-red-600 font-medium">
                  • Filtered by: {user.firmName}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex-1 flex flex-col"
            >
              <TabsList className="grid w-full sm:w-[400px] grid-cols-2 mb-4">
                <TabsTrigger value="pending" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Active Mismatches
                  <Badge variant="destructive" className="ml-1.5 px-1.5 py-0.5 text-xs">
                    {filteredUnifiedData.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="h-4 w-4" /> Resolution History
                </TabsTrigger>
              </TabsList>

              {/* Filters */}
              <div className="mb-4 p-4 bg-red-50/50 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <Label className="text-sm font-medium">Filters</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllFilters}
                    className="ml-auto bg-white"
                  >
                    Clear All
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <Select
                    value={filters.vendorName}
                    onValueChange={(value) =>
                      handleFilterChange("vendorName", value)
                    }
                  >
                    <SelectTrigger className="h-8 bg-white">
                      <SelectValue placeholder="All Vendors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Vendors</SelectItem>
                      {uniqueFilterOptions.vendorName.map((vendor) => (
                        <SelectItem key={vendor} value={vendor}>
                          {vendor}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.materialName}
                    onValueChange={(value) =>
                      handleFilterChange("materialName", value)
                    }
                  >
                    <SelectTrigger className="h-8 bg-white">
                      <SelectValue placeholder="All Materials" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Materials</SelectItem>
                      {uniqueFilterOptions.materialName.map((material) => (
                        <SelectItem key={material} value={material}>
                          {material}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.firmName}
                    onValueChange={(value) =>
                      handleFilterChange("firmName", value)
                    }
                  >
                    <SelectTrigger className="h-8 bg-white">
                      <SelectValue placeholder="All Firms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Firms</SelectItem>
                      {uniqueFilterOptions.firmName.map((firm) => (
                        <SelectItem key={firm} value={firm}>
                          {firm}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.orderNumber}
                    onValueChange={(value) =>
                      handleFilterChange("orderNumber", value)
                    }
                  >
                    <SelectTrigger className="h-8 bg-white">
                      <SelectValue placeholder="All Orders" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Orders</SelectItem>
                      {uniqueFilterOptions.orderNumber.map((order) => (
                        <SelectItem key={order} value={order}>
                          {order}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="relative">
                    <Input
                      type="date"
                      value={filters.fromDate}
                      onChange={(e) =>
                        handleFilterChange("fromDate", e.target.value)
                      }
                      className="h-8 bg-white text-xs pl-12"
                    />
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500 uppercase pointer-events-none">
                      From
                    </span>
                  </div>

                  <div className="relative">
                    <Input
                      type="date"
                      value={filters.toDate}
                      onChange={(e) =>
                        handleFilterChange("toDate", e.target.value)
                      }
                      className="h-8 bg-white text-xs pl-8"
                    />
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500 uppercase pointer-events-none">
                      To
                    </span>
                  </div>
                </div>
              </div>

              <TabsContent value="pending" className="flex-1 flex flex-col mt-0">
                {renderTableSection(
                  "unified",
                  "Active Mismatches",
                  "Consolidated view of all rate, quantity, and quality mismatches for pending lifts.",
                  filteredUnifiedData,
                  UNIFIED_MISMATCH_COLUMNS_META,
                  visibleUnifiedColumns,
                )}
              </TabsContent>

              <TabsContent value="history" className="flex-1 flex flex-col mt-0">
                {renderTableSection(
                  "history",
                  "Resolution History",
                  "View previously resolved mismatches and management actions taken.",
                  filteredHistoryData,
                  HISTORY_COLUMNS_META,
                  visibleHistoryColumns,
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
