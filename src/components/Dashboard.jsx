"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  LayoutDashboard,
  CheckCircle,
  Hourglass,
  Truck,
  FileText,
  Archive,
  RefreshCw,
  X,
  CalendarIcon,
  List,
  Filter,
  TrendingUp,
  Package,
  Clock,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Activity,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Search,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format, startOfDay, endOfDay } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  Area,
  AreaChart,
  RadialBarChart,
  RadialBar,
} from "recharts";
import { supabase } from "../supabase";
import { useAuth } from "../context/AuthContext";
import { useRealtime } from "../hooks/useRealtime";
import { canViewFirm } from "../utils/firmFilter";


// --- Constants ---
// Enhanced color palette
const THEME_COLORS = {
  primary: "#8B5CF6",
  secondary: "#6366F1",
  accent: "#3B82F6",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#06B6D4",
  green: "#8B5CF6",
  emerald: "#6366F1",
  pink: "#EC4899",
};

const PIE_COLORS = [
  "#10B981", // Green
  "#F59E0B", // Amber
  "#3B82F6", // Blue
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#06B6D4", // Cyan
  "#EC4899", // Pink
  "#6366F1", // Indigo
];

// --- Helper Functions ---
// Gviz parser removed

const parseDateFromSheet = (dateValue) => {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === "string" && dateValue.startsWith("Date(")) {
    const parts = dateValue.match(/\d+/g);
    if (parts && parts.length >= 3) {
      return new Date(
        Number.parseInt(parts[0]),
        Number.parseInt(parts[1]),
        Number.parseInt(parts[2]),
      );
    }
  }
  const d = new Date(dateValue);
  return isNaN(d.getTime()) ? null : d;
};

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-2xl border border-green-200">
        <p className="font-bold text-gray-900 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p
            key={index}
            className="text-sm font-medium"
            style={{ color: entry.color }}
          >
            {entry.name}:{" "}
            <span className="font-bold">
              {typeof entry.value === "number"
                ? entry.value.toLocaleString()
                : entry.value}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Stat Card Component
const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  color = "green",
  description,
}) => {
  const colorClasses = {
    green: "from-green-500 to-green-600",
    blue: "from-blue-500 to-blue-600",
    amber: "from-amber-500 to-amber-600",
    red: "from-red-500 to-red-600",
    emerald: "from-emerald-500 to-emerald-600",
  };

  return (
    <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
      <div
        className={`absolute inset-0 bg-linear-to-br ${colorClasses[color]} opacity-5 group-hover:opacity-10 transition-opacity`}
      ></div>
      <CardContent className="p-4 sm:p-6 relative">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-semibold text-gray-600 mb-1 sm:mb-2 truncate">
              {title}
            </p>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-1 truncate">
              {typeof value === "number" ? value.toLocaleString() : value}
            </h3>
            {description && (
              <p className="text-[10px] sm:text-xs text-gray-500 mt-1 truncate">
                {description}
              </p>
            )}
            {trend && (
              <div className="flex items-center gap-2 mt-2 sm:mt-3">
                {trend === "up" && (
                  <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                )}
                {trend === "down" && (
                  <ArrowDownRight className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
                )}
                {trend === "neutral" && (
                  <Minus className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                )}
                <span
                  className={`text-xs sm:text-sm font-semibold ${trend === "up" ? "text-[#7da23a]" : trend === "down" ? "text-red-600" : "text-gray-500"}`}
                >
                  {trendValue}
                </span>
              </div>
            )}
          </div>
          <div
            className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-linear-to-br ${colorClasses[color]} shadow-lg shrink-0`}
          >
            <Icon className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allPurchaseData, setAllPurchaseData] = useState([]);
  const [allLiftAccountData, setAllLiftAccountData] = useState([]);
  const [allAccountsData, setAllAccountsData] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [purchaseSubTab, setPurchaseSubTab] = useState("pending-lift");
  const { user, allowedSteps } = useAuth();

  // Add Dropdown state
  const [isDropdownModalOpen, setIsDropdownModalOpen] = useState(false);
  const [dropdownFormData, setDropdownFormData] = useState({
    type: "",
    vendorName: "",
    rawMaterialName: "",
    transporterName: "",
    aluminaRange: "",
    ironRange: "",
    apRange: "",
    bdRange: "",
  });
  const [dropdownSubmitLoading, setDropdownSubmitLoading] = useState(false);

  // Filter States
  const [dateRange, setDateRange] = useState(undefined);
  const [filters, setFilters] = useState({
    vendorName: "all",
    material: "all",
    status: "all",
    rlNo: "",
    firmName: "all",
  });

  // Fetch Data
  const isFetchingRef = useRef(false);
  const refreshTimeoutRef = useRef(null);

  // Fetch Data
  const fetchData = useCallback(async (isRealtime = false) => {
    // If already fetching, don't start another one unless it's a direct call
    if (isFetchingRef.current && isRealtime) return;
    
    isFetchingRef.current = true;
    if (!isRealtime) setLoading(true);
    setError(null);
    try {
      // Fetch from Supabase
      const [indentPoRes, liftAccountsRes, mismatchRes] = await Promise.all([
        supabase
          .from("INDENT-PO")
          .select("*")
          .order("Timestamp", { ascending: false }),
        supabase
          .from("LIFT-ACCOUNTS")
          .select("*")
          .order("Timestamp", { ascending: false }),
        supabase.from("Mismatch").select("*").order("id", { ascending: false }),
      ]);

      if (indentPoRes.error) throw indentPoRes.error;
      if (liftAccountsRes.error) throw liftAccountsRes.error;
      if (mismatchRes.error) throw mismatchRes.error;

      // Process INDENT-PO data
      let processedIndentPoData = (indentPoRes.data || [])
        .map((row) => ({
          id: row["Indent Id."] || `po-${Math.random()}`,
          date: row["Timestamp"] ? new Date(row["Timestamp"]) : null,
          rlNo: row["Indent Id."],
          firmName: row["Firm Name"],
          vendorName: row["Vendor"] || row["Vendor name"], // Handle both potential column names
          material: row["Material"] || row["Raw Material Name"],
          poQty: Number.parseFloat(
            row["Quantity"] || row["Total Quantity"] || 0,
          ),
          poTimestamp: row["Actual2"], // Generate PO Status
          pendingQty: row["Actual4"]
            ? 0
            : Number.parseFloat(row["Quantity"] || 0),

          notes: row["Notes"],
          actualM: row["Actual1"], // Indent Approval
          planned7: row["Planned7"], // Factory Approval Planned
          actual7: row["Actual7"], // Factory Approval
          planned8: row["Planned8"], // Management Approval Planned
          actual8: row["Actual8"], // Management Approval
          actualS: row["Actual2"], // Generate PO
          actualAL: row["Actual3"], // PO Entry
          actualAO: row["Actual4"], // Lift Item
        }))
        .filter((p) => p && p.rlNo);

      // Process LIFT-ACCOUNTS data
      let processedLiftAccountData = (liftAccountsRes.data || [])
        .map((row) => {
          const liftDate = row["Timestamp"] ? new Date(row["Timestamp"]) : null;
          const receiptDate = row["Actual 1"] ? new Date(row["Actual 1"]) : null;
          
          return {
            id: row["Lift No"] || `lift-${Math.random()}`,
            // Prioritize Receipt Date for received items, otherwise use Lift Date
            date: (row["Actual 1"] && receiptDate && !isNaN(receiptDate.getTime())) ? receiptDate : liftDate,
            rlNo: row["Indent no."],
            deliveryOrderNo: row["Delivery Order No."], // Check column name
            liftedQty: Number.parseFloat(row["Qty"] || 0), // is this Lifted Qty?
            receivedTimestamp: row["Actual 1"], // Receipt Timestamp
            receivedQty: Number.parseFloat(row["Actual Quantity"] || 0),
            firmName: row["Firm Name"],
            vendorName: row["Vendor Name"],
            material: row["Raw Material Name"],
            notes: row["Notes"] || "", // If exists
            actualU: row["Actual 1"], // Receipt
            actualAE: row["Actual 2"], // Bilty
            actualAJ: row["Actual 3"], // Lab
            actualBB: row["Actual 4"], // Final Tally
          };
        })
        .filter((l) => l && l.rlNo);

      // Process ACCOUNTS (Mismatch) data
      let processedAccountsData = (mismatchRes.data || [])
        .map((row) => ({
          id: row.id,
          date: row["Timestamp"] ? new Date(row["Timestamp"]) : null,
          rlNo: row.liftNumber, // Mapping liftNumber to rlNo for consistency? Or keep liftNumber?
          actualAA: row["Actual2"], // Audit
          actualAF: row["Actual3"], // Rectify
          actualAK: row["Actual4"], // Tally
          actualAP: row["Actual5"], // ReAudit
          actualAU: row["Actual6"], // Bill Entry
          firmName: row["Firm Name"] || row["firmName"], // Add Firm Name for filtering
        }))
        .filter((a) => a && a.rlNo);

      // Apply firm filtering
      if (user?.firmName) {
        processedIndentPoData = processedIndentPoData.filter((po) =>
          canViewFirm(user.firmName, po.firmName),
        );
        processedLiftAccountData = processedLiftAccountData.filter((lift) =>
          canViewFirm(user.firmName, lift.firmName),
        );
        processedAccountsData = processedAccountsData.filter((acc) =>
          canViewFirm(user.firmName, acc.firmName),
        );
      }

      setAllPurchaseData(processedIndentPoData);
      setAllLiftAccountData(processedLiftAccountData);
      setAllAccountsData(processedAccountsData);
    } catch (e) {
      setError(`Failed to fetch dashboard data: ${e.message}`);
      console.error("Error:", e);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [user, allowedSteps]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime: Listen for changes in core tables and refresh dashboard
  useRealtime(["INDENT-PO", "LIFT-ACCOUNTS", "Mismatch"], () => {
    console.log("[Realtime] Dashboard refreshing due to table change");
    fetchData(true);
  });


  // Filter Options
  const { vendorOptions, materialOptions, firmOptions } = useMemo(() => {
    const vendors = new Set();
    const materials = new Set();
    const firms = new Set();

    allPurchaseData.forEach((d) => {
      if (d.vendorName) vendors.add(d.vendorName);
      if (d.material) materials.add(d.material);
      if (d.firmName) firms.add(d.firmName);
    });

    allLiftAccountData.forEach((d) => {
      if (d.vendorName) vendors.add(d.vendorName);
      if (d.material) materials.add(d.material);
      if (d.firmName) firms.add(d.firmName);
    });

    return {
      vendorOptions: Array.from(vendors).sort(),
      materialOptions: Array.from(materials).sort(),
      firmOptions: Array.from(firms).sort(),
    };
  }, [allPurchaseData, allLiftAccountData]);

  // Filtered Data
  const filteredIndentPoData = useMemo(() => {
    return allPurchaseData
      .filter((po) => {
        const materialLiftStatus = po.pendingQty === 0 ? "Complete" : "Pending";
        if (dateRange?.from && po.date && po.date < startOfDay(dateRange.from))
          return false;
        if (dateRange?.to && po.date && po.date > endOfDay(dateRange.to)) return false;
        if (
          filters.rlNo &&
          !po.rlNo?.toLowerCase().includes(filters.rlNo.toLowerCase())
        )
          return false;
        if (
          filters.vendorName !== "all" &&
          po.vendorName !== filters.vendorName
        )
          return false;
        if (filters.material !== "all" && po.material !== filters.material)
          return false;
        if (filters.status !== "all" && materialLiftStatus !== filters.status)
          return false;
        if (filters.firmName !== "all" && po.firmName !== filters.firmName)
          return false;
        return true;
      })
      .map((po) => ({
        ...po,
        materialLiftStatus: po.pendingQty === 0 ? "Complete" : "Pending",
      }));
  }, [allPurchaseData, dateRange, filters]);

  const filteredLiftAccountData = useMemo(() => {
    return allLiftAccountData.filter((lift) => {
      if (dateRange?.from && lift.date && lift.date < startOfDay(dateRange.from))
        return false;
      if (dateRange?.to && lift.date && lift.date > endOfDay(dateRange.to)) return false;
      if (
        filters.rlNo &&
        !lift.rlNo?.toLowerCase().includes(filters.rlNo.toLowerCase())
      )
        return false;
      if (
        filters.vendorName !== "all" &&
        lift.vendorName !== filters.vendorName
      )
        return false;
      if (filters.material !== "all" && lift.material !== filters.material)
        return false;
      if (filters.firmName !== "all" && lift.firmName !== filters.firmName)
        return false;
      return true;
    });
  }, [allLiftAccountData, filters, dateRange]);

  const filteredAccountsData = useMemo(() => {
    return allAccountsData.filter((account) => {
      if (dateRange?.from && account.date && account.date < startOfDay(dateRange.from))
        return false;
      if (dateRange?.to && account.date && account.date > endOfDay(dateRange.to)) return false;
      if (filters.firmName !== "all" && account.firmName !== filters.firmName)
        return false;
      return true;
    });
  }, [allAccountsData, filters, dateRange]);

  // Pending Stages Data
  const pendingStagesData = useMemo(() => {
    const stageNames = {
      indentPo: {
        M: "Indent Approvals",
        FACTORY: "Factory Approval",
        MGMT: "Management Approval",
        S: "Generate PO",
        AL: "PO Entry In Tally",
        AO: "Get Lift The Item",
      },
      liftAccounts: {
        U: "Receipt / Quality Check",
        AE: "Bilty Entry",
        AJ: "Lab Testing",
        BB: "Final Tally Entry",
      },
      accounts: {
        AA: "Rectify & Bilty Add",
        AF: "Audit Data",
        AK: "Rectify Mistake 2",
        AP: "Take Entry By Tally",
        AU: "Again For Auditing",
      },
    };

    const pendingCounts = [];

    // Standard INDENT-PO stages
    const indentPoStages = [
      { key: "actualM", columnName: "M" },
    ];

    indentPoStages.forEach(({ key, columnName }) => {
      const pendingCount = filteredIndentPoData.filter(
        (po) => !po[key] || po[key] === null || po[key] === "",
      ).length;
      pendingCounts.push({
        stageName: stageNames.indentPo[columnName],
        pendingCount: pendingCount,
        category: "INDENT-PO",
      });
    });

    // Factory Approval: pending if Planned7 exists but Actual7 doesn't
    const factoryPendingCount = filteredIndentPoData.filter(
      (po) => po.planned7 && (!po.actual7 || po.actual7 === ""),
    ).length;
    pendingCounts.push({
      stageName: stageNames.indentPo.FACTORY,
      pendingCount: factoryPendingCount,
      category: "INDENT-PO",
    });

    // Management Approval: pending if Planned8 exists but Actual8 doesn't
    const mgmtPendingCount = filteredIndentPoData.filter(
      (po) => po.planned8 && (!po.actual8 || po.actual8 === ""),
    ).length;
    pendingCounts.push({
      stageName: stageNames.indentPo.MGMT,
      pendingCount: mgmtPendingCount,
      category: "INDENT-PO",
    });

    // Remaining INDENT-PO stages
    const indentPoStages2 = [
      { key: "actualS", columnName: "S" },
      { key: "actualAL", columnName: "AL" },
      { key: "actualAO", columnName: "AO" },
    ];

    indentPoStages2.forEach(({ key, columnName }) => {
      const pendingCount = filteredIndentPoData.filter(
        (po) => !po[key] || po[key] === null || po[key] === "",
      ).length;
      pendingCounts.push({
        stageName: stageNames.indentPo[columnName],
        pendingCount: pendingCount,
        category: "INDENT-PO",
      });
    });

    const liftAccountsStages = [
      { key: "actualU", columnName: "U" },
      { key: "actualAE", columnName: "AE" },
      { key: "actualAJ", columnName: "AJ" },
      { key: "actualBB", columnName: "BB" },
    ];

    liftAccountsStages.forEach(({ key, columnName }) => {
      const pendingCount = filteredLiftAccountData.filter(
        (lift) => !lift[key] || lift[key] === null || lift[key] === "",
      ).length;
      pendingCounts.push({
        stageName: stageNames.liftAccounts[columnName],
        pendingCount: pendingCount,
        category: "LIFT-ACCOUNTS",
      });
    });

    const accountsStages = [
      { key: "actualAA", columnName: "AA" },
      { key: "actualAF", columnName: "AF" },
      { key: "actualAK", columnName: "AK" },
      { key: "actualAP", columnName: "AP" },
      { key: "actualAU", columnName: "AU" },
    ];

    accountsStages.forEach(({ key, columnName }) => {
      const pendingCount = filteredAccountsData.filter(
        (account) =>
          !account[key] || account[key] === null || account[key] === "",
      ).length;
      pendingCounts.push({
        stageName: stageNames.accounts[columnName],
        pendingCount: pendingCount,
        category: "ACCOUNTS",
      });
    });

    return pendingCounts;
  }, [filteredIndentPoData, filteredLiftAccountData, filteredAccountsData]);

  // Overview Data
  const overviewData = useMemo(() => {
    const kpis = {
      totalPOs: 0,
      pendingPOs: 0,
      completedPOs: 0,
      totalPoQuantity: 0,
      totalPendingQuantity: 0,
      totalReceivedQuantity: 0,
    };

    const vendorQuantities = {};
    const materialQuantities = {};
    const poQuantityByStatus = { Completed: 0, Pending: 0 };
    const uniquePOsByRlNo = new Set();

    filteredIndentPoData.forEach((po) => {
      uniquePOsByRlNo.add(po.rlNo);
      const isPoPendingForKPI = !po.poTimestamp;

      if (isPoPendingForKPI) {
        kpis.pendingPOs += 1;
      } else {
        kpis.completedPOs += 1;
      }

      const isMaterialLiftComplete = po.pendingQty === 0;
      if (isMaterialLiftComplete) {
        poQuantityByStatus["Completed"] += po.poQty;
      } else {
        poQuantityByStatus["Pending"] += po.poQty;
      }

      kpis.totalPoQuantity += po.poQty;
      kpis.totalPendingQuantity += po.pendingQty;

      if (po.material && po.poQty) {
        materialQuantities[po.material] =
          (materialQuantities[po.material] || 0) + po.poQty;
      }
      if (po.vendorName && po.poQty) {
        vendorQuantities[po.vendorName] =
          (vendorQuantities[po.vendorName] || 0) + po.poQty;
      }
    });

    kpis.totalPOs = uniquePOsByRlNo.size;

    filteredLiftAccountData.forEach((lift) => {
      kpis.totalReceivedQuantity += lift.receivedQty;
    });

    const top10Materials = Object.entries(materialQuantities)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    const top10Vendors = Object.entries(vendorQuantities)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    const poQuantityByStatusData = [
      {
        name: "Completed",
        value: poQuantityByStatus["Completed"],
        fill: "#10B981",
      },
      {
        name: "Pending",
        value: poQuantityByStatus["Pending"],
        fill: "#F59E0B",
      },
    ].filter((item) => item.value > 0);

    return {
      kpis,
      top10Materials,
      top10Vendors,
      poQuantityByStatusData,
    };
  }, [filteredIndentPoData, filteredLiftAccountData]);

  // Purchase Tab Tables
  const purchaseTabTables = useMemo(() => {
    const pendingLift = filteredIndentPoData.filter(
      (po) => po.materialLiftStatus === "Pending",
    );
    const inTransit = filteredLiftAccountData.filter(
      (lift) => !lift.receivedTimestamp,
    );
    const received = filteredLiftAccountData.filter(
      (lift) => lift.receivedTimestamp,
    );

    return { pendingLift, inTransit, received };
  }, [filteredIndentPoData, filteredLiftAccountData]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      vendorName: "all",
      material: "all",
      status: "all",
      rlNo: "",
      firmName: "all",
    });
    setDateRange(undefined);
  };

  const handleDropdownSubmit = async (e) => {
    e.preventDefault();
    setDropdownSubmitLoading(true);
    try {
      if (!dropdownFormData.type) {
        throw new Error("Please select a valid type.");
      }

      let error = null;

      if (
        dropdownFormData.type === "Vendor Name" ||
        dropdownFormData.type === "Transporter"
      ) {
        let insertData = {};
        if (dropdownFormData.type === "Vendor Name") {
          insertData = {
            "Vendor Name": dropdownFormData.vendorName.trim() || null,
          };
        } else if (dropdownFormData.type === "Transporter") {
          insertData = {
            "Transporter Name": dropdownFormData.transporterName.trim() || null,
          };
        }

        const response = await supabase.from("Master").insert([insertData]);
        error = response.error;
      } else if (dropdownFormData.type === "Raw Material") {
        const insertData = {
          NAME: dropdownFormData.rawMaterialName.trim() || null,
          "TL Alumina": dropdownFormData.aluminaRange
            ? parseFloat(dropdownFormData.aluminaRange)
            : null,
          "TL Iron": dropdownFormData.ironRange
            ? parseFloat(dropdownFormData.ironRange)
            : null,
          "AP%": dropdownFormData.apRange
            ? parseFloat(dropdownFormData.apRange)
            : null,
          "BD%": dropdownFormData.bdRange
            ? parseFloat(dropdownFormData.bdRange)
            : null,
        };

        const response = await supabase.from("TL").insert([insertData]);
        error = response.error;
      }

      if (error) {
        throw error;
      }
      toast.success("Dropdown Data Added Successfully");
      setIsDropdownModalOpen(false);
      setDropdownFormData({
        type: "",
        vendorName: "",
        rawMaterialName: "",
        transporterName: "",
        aluminaRange: "",
        ironRange: "",
        apRange: "",
        bdRange: "",
      });
    } catch (err) {
      toast.error("Error adding dropdown data", { description: err.message });
    } finally {
      setDropdownSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-green-50 to-slate-50 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative">
            <Loader2 className="w-16 h-16 text-[#7da23a] animate-spin mx-auto" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-green-200 rounded-full animate-ping mx-auto"></div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              Loading Dashboard
            </h3>
            <p className="text-gray-600">
              Fetching your data from Google Sheets...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-red-50 to-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full shadow-2xl border-red-200">
          <CardContent className="text-center p-8 space-y-6">
            <div className="p-4 bg-red-100 rounded-full inline-block">
              <Archive className="h-12 w-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">
              Connection Failed
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">{error}</p>
            <Button
              onClick={fetchData}
              className="bg-linear-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Connection
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-green-50 to-slate-50">
      <div className="container mx-auto p-4 sm:p-6 max-w-full">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Card className="border-0 shadow-xl bg-linear-to-r from-[#7da23a] to-[#6b8e2f] text-white">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 sm:space-y-2">
                  <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg sm:rounded-xl backdrop-blur-sm shrink-0">
                      <LayoutDashboard className="h-5 w-5 sm:h-8 sm:w-8" />
                    </div>
                    <span className="leading-tight">Dashboard Overview</span>
                  </CardTitle>
                  <CardDescription className="text-green-50 text-xs sm:text-base leading-snug">
                    Real-time insights into your purchase operations
                    {user?.firmName && (
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <Badge className="bg-white/20 text-white border-0 text-[10px] sm:text-xs">
                          {user.firmName === "all"
                            ? "All Firms"
                            : Array.isArray(user.firmName)
                              ? user.firmName.join(", ")
                              : user.firmName}
                        </Badge>
                      </div>
                    )}
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <Button
                      onClick={() => setIsDropdownModalOpen(true)}
                      variant="outline"
                      size="sm"
                      className="flex-1 sm:flex-none bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm shadow-lg text-xs sm:text-sm h-9 sm:h-10 px-4"
                    >
                      Add Data
                    </Button>
                    <Button
                      onClick={fetchData}
                      variant="secondary"
                      size="sm"
                      className="flex-1 sm:flex-none bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm shadow-lg text-xs sm:text-sm h-9 sm:h-10 px-4"
                    >
                      <RefreshCw
                        className={`h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 ${loading ? "animate-spin" : ""}`}
                      />
                      Refresh
                    </Button>
                  </div>

                  {/* Separate From and To Date Inputs Integrated into Header */}
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex flex-col gap-1 min-w-[130px]">
                      <Label className="text-[10px] font-bold text-green-50 uppercase tracking-wider ml-1">From Date</Label>
                      <div className="relative">
                        <Input 
                          type="date" 
                          className="h-9 text-xs bg-white/10 text-white border-white/20 focus:bg-white/20 focus:ring-1 focus:ring-white/30 transition-all cursor-pointer scheme-dark"
                          value={dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDateRange(prev => ({ ...prev, from: val ? new Date(val) : undefined }));
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 min-w-[130px]">
                      <Label className="text-[10px] font-bold text-green-50 uppercase tracking-wider ml-1">To Date</Label>
                      <div className="relative">
                        <Input 
                          type="date" 
                          className="h-9 text-xs bg-white/10 text-white border-white/20 focus:bg-white/20 focus:ring-1 focus:ring-white/30 transition-all cursor-pointer scheme-dark"
                          value={dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDateRange(prev => ({ ...prev, to: val ? new Date(val) : undefined }));
                          }}
                        />
                      </div>
                    </div>

                    {(dateRange?.from || dateRange?.to) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-5 h-9 w-9 p-0 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        onClick={clearFilters}
                        title="Clear Dates"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>



        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center mb-6 sm:mb-8">
            <TabsList className="flex w-full sm:w-auto overflow-x-auto no-scrollbar bg-white border-0 shadow-lg rounded-xl sm:rounded-2xl p-1 sm:p-2 h-auto gap-1">
              <TabsTrigger
                value="overview"
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-4 px-3 sm:px-6 text-xs sm:text-base font-semibold rounded-lg sm:rounded-xl data-[state=active]:bg-linear-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-xl transition-all duration-300 whitespace-nowrap"
              >
                <TrendingUp className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="purchase"
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-4 px-3 sm:px-6 text-xs sm:text-base font-semibold rounded-lg sm:rounded-xl data-[state=active]:bg-linear-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-xl transition-all duration-300 whitespace-nowrap"
              >
                <List className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                Data
              </TabsTrigger>
              <TabsTrigger
                value="pending"
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-4 px-3 sm:px-6 text-xs sm:text-base font-semibold rounded-lg sm:rounded-xl data-[state=active]:bg-linear-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-xl transition-all duration-300 whitespace-nowrap"
              >
                <AlertTriangle className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                Workflow
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatCard
                title="Total Purchase Orders"
                value={overviewData.kpis.totalPOs}
                icon={FileText}
                color="green"
                description="Unique purchase orders"
              />
              <StatCard
                title="Pending Issuance"
                value={overviewData.kpis.pendingPOs}
                icon={Clock}
                color="amber"
                description="Awaiting PO generation"
              />
              <StatCard
                title="Issued & Finalized"
                value={overviewData.kpis.completedPOs}
                icon={CheckCircle}
                color="green"
                description="Successfully completed"
              />
            </div>

            {/* Quantity Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="p-2 sm:p-3 bg-linear-to-br from-green-500 to-green-600 rounded-xl sm:rounded-2xl shadow-lg">
                      <Package className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <Badge className="bg-green-100 text-[#6b8e2f] font-semibold text-[10px] sm:text-xs">
                      Total
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-600 mb-1 truncate">
                    Total PO Quantity
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
                    {overviewData.kpis.totalPoQuantity.toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="p-2 sm:p-3 bg-linear-to-br from-amber-500 to-amber-600 rounded-xl sm:rounded-2xl shadow-lg">
                      <Hourglass className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <Badge className="bg-amber-100 text-amber-700 font-semibold text-[10px] sm:text-xs">
                      Pending
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-600 mb-1 truncate">
                    Pending Quantity
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
                    {overviewData.kpis.totalPendingQuantity.toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="p-2 sm:p-3 bg-linear-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl shadow-lg">
                      <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <Badge className="bg-blue-100 text-blue-700 font-semibold text-[10px] sm:text-xs">
                      Received
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-600 mb-1 truncate">
                    Received Quantity
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
                    {overviewData.kpis.totalReceivedQuantity.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* PO Status Chart */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="p-6 border-b border-gray-100">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <PieChart className="h-6 w-6 text-[#7da23a]" />
                    Material Lift Status Distribution
                  </CardTitle>
                  <CardDescription>
                    PO quantity breakdown by completion status
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Tooltip content={<CustomTooltip />} />
                        <Pie
                          data={overviewData.poQuantityByStatusData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          innerRadius={60}
                          paddingAngle={5}
                          label={({ name, percent }) =>
                            `${name}: ${(percent * 100).toFixed(1)}%`
                          }
                          labelLine={false}
                        >
                          {overviewData.poQuantityByStatusData.map(
                            (entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.fill}
                                stroke="white"
                                strokeWidth={3}
                              />
                            ),
                          )}
                        </Pie>
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          iconType="circle"
                          wrapperStyle={{ paddingTop: "20px" }}
                        />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Top Vendors Chart */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="p-6 border-b border-gray-100">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <BarChart3 className="h-6 w-6 text-[#7da23a]" />
                    Top 10 Vendors by Quantity
                  </CardTitle>
                  <CardDescription>
                    Vendors ranked by total order quantity
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[450px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={overviewData.top10Vendors}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <defs>
                          <linearGradient id="vendorGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#7da23a" />
                            <stop offset="100%" stopColor="#6b8e2f" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                        <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} hide />
                        <YAxis
                          dataKey="name"
                          type="category"
                          stroke="#64748b"
                          tick={{ fontSize: 11, fill: "#64748b", fontWeight: 500 }}
                          width={180}
                          interval={0}
                          tickFormatter={(value) => 
                            value.length > 25 ? `${value.substring(0, 22)}...` : value
                          }
                        />
                        <Tooltip
                          content={<CustomTooltip />}
                          cursor={{ fill: "rgba(110, 142, 47, 0.1)" }}
                        />
                        <Bar
                          dataKey="quantity"
                          fill="url(#vendorGradient)"
                          radius={[0, 4, 4, 0]}
                          barSize={24}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Materials Chart */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="p-6 border-b border-gray-100">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Activity className="h-6 w-6 text-[#7da23a]" />
                  Top 10 Materials by Quantity
                </CardTitle>
                <CardDescription>
                  Most ordered materials ranked by quantity
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[450px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={overviewData.top10Materials}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient id="materialGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        stroke="#64748b"
                        tick={{ fontSize: 11, fill: "#64748b", fontWeight: 500 }}
                        width={180}
                        interval={0}
                        tickFormatter={(value) => 
                          value.length > 25 ? `${value.substring(0, 22)}...` : value
                        }
                      />
                      <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ fill: "rgba(16, 185, 129, 0.1)" }}
                      />
                      <Bar
                        dataKey="quantity"
                        fill="url(#materialGradient)"
                        radius={[0, 4, 4, 0]}
                        barSize={24}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Purchase Tab */}
          <TabsContent value="purchase" className="space-y-6">
            <Tabs value={purchaseSubTab} onValueChange={setPurchaseSubTab}>
              <TabsList className="grid w-full grid-cols-3 max-w-xl mx-auto mb-6 bg-white border-0 shadow-lg rounded-2xl p-2 h-auto">
                <TabsTrigger
                  value="pending-lift"
                  className="flex items-center justify-center gap-2 py-3 text-base font-semibold rounded-xl data-[state=active]:bg-linear-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                >
                  <Hourglass className="h-5 w-5" />
                  Pending
                </TabsTrigger>
                <TabsTrigger
                  value="in-transit"
                  className="flex items-center justify-center gap-2 py-3 text-base font-semibold rounded-xl data-[state=active]:bg-linear-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                >
                  <Truck className="h-5 w-5" />
                  In-Transit
                </TabsTrigger>
                <TabsTrigger
                  value="received"
                  className="flex items-center justify-center gap-2 py-3 text-base font-semibold rounded-xl data-[state=active]:bg-linear-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  Received
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending-lift">
                <Card className="border-0 shadow-lg">
                  <CardHeader className="p-6 border-b border-gray-100 bg-linear-to-r from-amber-50 to-orange-50">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Hourglass className="h-6 w-6 text-amber-600" />
                      Purchase Orders Pending Lift
                      <Badge className="ml-2 bg-amber-500 text-white">
                        {purchaseTabTables.pendingLift.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-200">
                            <TableHead className="font-bold text-gray-700">
                              Indent No.
                            </TableHead>
                            <TableHead className="font-bold text-gray-700">
                              PO Date
                            </TableHead>
                            <TableHead className="font-bold text-gray-700">
                              Firm
                            </TableHead>
                            <TableHead className="font-bold text-gray-700">
                              Vendor
                            </TableHead>
                            <TableHead className="font-bold text-gray-700">
                              Material
                            </TableHead>
                            <TableHead className="text-right font-bold text-gray-700">
                              PO Qty
                            </TableHead>
                            <TableHead className="text-right font-bold text-gray-700">
                              Pending
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {purchaseTabTables.pendingLift.length > 0 ? (
                            purchaseTabTables.pendingLift.map((po) => (
                              <TableRow
                                key={po.id}
                                className="hover:bg-amber-50/50 border-b border-gray-100"
                              >
                                <TableCell className="font-semibold text-[#7da23a]">
                                  {po.rlNo}
                                </TableCell>
                                <TableCell className="text-gray-700">
                                  {po.date
                                    ? format(po.date, "dd-MMM-yyyy")
                                    : "N/A"}
                                </TableCell>
                                <TableCell className="text-gray-700">
                                  {po.firmName || "N/A"}
                                </TableCell>
                                <TableCell className="text-gray-700">
                                  {po.vendorName}
                                </TableCell>
                                <TableCell className="max-w-xs truncate text-gray-700">
                                  {po.material}
                                </TableCell>
                                <TableCell className="text-right font-semibold text-gray-900">
                                  {po.poQty.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge className="bg-amber-100 text-amber-700 font-semibold">
                                    {po.pendingQty.toLocaleString()}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell
                                colSpan={7}
                                className="text-center h-32 text-gray-500"
                              >
                                <Package className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                                <p className="font-medium">
                                  No pending purchase orders
                                </p>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="in-transit">
                <Card className="border-0 shadow-lg">
                  <CardHeader className="p-6 border-b border-gray-100 bg-linear-to-r from-green-50 to-emerald-50">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Truck className="h-6 w-6 text-[#7da23a]" />
                      Materials In-Transit
                      <Badge className="ml-2 bg-green-500 text-white">
                        {purchaseTabTables.inTransit.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-200">
                            <TableHead className="font-bold text-gray-700">
                              Indent No.
                            </TableHead>
                            <TableHead className="font-bold text-gray-700">
                              Date
                            </TableHead>
                            <TableHead className="font-bold text-gray-700">
                              Delivery Order
                            </TableHead>
                            <TableHead className="font-bold text-gray-700">
                              Firm
                            </TableHead>
                            <TableHead className="font-bold text-gray-700">
                              Vendor
                            </TableHead>
                            <TableHead className="font-bold text-gray-700">
                              Material
                            </TableHead>
                            <TableHead className="text-right font-bold text-gray-700">
                              Billing Quantity
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {purchaseTabTables.inTransit.length > 0 ? (
                            purchaseTabTables.inTransit.map((lift) => (
                              <TableRow
                                key={lift.id}
                                className="hover:bg-green-50/50 border-b border-gray-100"
                              >
                                <TableCell className="font-semibold text-[#7da23a]">
                                  {lift.rlNo}
                                </TableCell>
                                <TableCell className="text-gray-700">
                                  {lift.date ? format(lift.date, "dd-MMM-yyyy") : "N/A"}
                                </TableCell>
                                <TableCell className="text-gray-700">
                                  {lift.deliveryOrderNo || "N/A"}
                                </TableCell>
                                <TableCell className="text-gray-700">
                                  {lift.firmName || "N/A"}
                                </TableCell>
                                <TableCell className="text-gray-700">
                                  {lift.vendorName}
                                </TableCell>
                                <TableCell className="max-w-xs truncate text-gray-700">
                                  {lift.material}
                                </TableCell>
                                <TableCell className="text-right font-semibold text-gray-900">
                                  {lift.liftedQty.toLocaleString()}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell
                                colSpan={7}
                                className="text-center h-32 text-gray-500"
                              >
                                <Truck className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                                <p className="font-medium">
                                  No materials in transit
                                </p>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="received">
                <Card className="border-0 shadow-lg">
                  <CardHeader className="p-6 border-b border-gray-100 bg-linear-to-r from-green-50 to-emerald-50">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <CheckCircle2 className="h-6 w-6 text-[#7da23a]" />
                      Received Materials
                      <Badge className="ml-2 bg-green-500 text-white">
                        {purchaseTabTables.received.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-200">
                            <TableHead className="font-bold text-gray-700">
                              Indent No.
                            </TableHead>
                            <TableHead className="font-bold text-gray-700">
                              Date
                            </TableHead>
                            <TableHead className="font-bold text-gray-700">
                              Firm
                            </TableHead>
                            <TableHead className="font-bold text-gray-700">
                              Vendor
                            </TableHead>
                            <TableHead className="font-bold text-gray-700">
                              Material
                            </TableHead>
                            <TableHead className="font-bold text-gray-700">
                              Notes
                            </TableHead>
                            <TableHead className="text-right font-bold text-gray-700">
                              Billing Quantity
                            </TableHead>
                            <TableHead className="text-right font-bold text-gray-700">
                              Received Qty
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {purchaseTabTables.received.length > 0 ? (
                            purchaseTabTables.received.map((lift) => (
                              <TableRow
                                key={lift.id}
                                className="hover:bg-green-50/50 border-b border-gray-100"
                              >
                                <TableCell className="font-semibold text-[#7da23a]">
                                  {lift.rlNo}
                                </TableCell>
                                <TableCell className="text-gray-700">
                                  {lift.date ? format(lift.date, "dd-MMM-yyyy") : "N/A"}
                                </TableCell>
                                <TableCell className="text-gray-700">
                                  {lift.firmName || "N/A"}
                                </TableCell>
                                <TableCell className="text-gray-700">
                                  {lift.vendorName}
                                </TableCell>
                                <TableCell className="max-w-xs truncate text-gray-700">
                                  {lift.material}
                                </TableCell>
                                <TableCell className="max-w-xs truncate text-gray-700">
                                  {lift.notes || "N/A"}
                                </TableCell>
                                <TableCell className="text-right font-semibold text-gray-900">
                                  {lift.liftedQty.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge className="bg-green-100 text-[#6b8e2f] font-semibold">
                                    {lift.receivedQty.toLocaleString()}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell
                                colSpan={7}
                                className="text-center h-32 text-gray-500"
                              >
                                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                                <p className="font-medium">
                                  No received materials
                                </p>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Pending/Workflow Tab */}
          <TabsContent value="pending" className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <StatCard
                title="INDENT-PO Pending"
                value={pendingStagesData
                  .filter((s) => s.category === "INDENT-PO")
                  .reduce((sum, stage) => sum + stage.pendingCount, 0)}
                icon={FileText}
                color="green"
                description="6 workflow stages"
              />
              <StatCard
                title="LIFT-ACCOUNTS Pending"
                value={pendingStagesData
                  .filter((s) => s.category === "LIFT-ACCOUNTS")
                  .reduce((sum, stage) => sum + stage.pendingCount, 0)}
                icon={Truck}
                color="blue"
                description="4 workflow stages"
              />
              <StatCard
                title="ACCOUNTS Pending"
                value={pendingStagesData
                  .filter((s) => s.category === "ACCOUNTS")
                  .reduce((sum, stage) => sum + stage.pendingCount, 0)}
                icon={CheckCircle}
                color="green"
                description="5 workflow stages"
              />
            </div>

            {/* Workflow Visualization */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="p-6 border-b border-gray-100">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Activity className="h-6 w-6 text-[#7da23a]" />
                  Workflow Stage Analysis
                </CardTitle>
                <CardDescription>
                  Visual breakdown of pending items across all workflow stages
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pendingStagesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="stageName"
                        angle={-45}
                        textAnchor="end"
                        height={150}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        stroke="#64748b"
                      />
                      <YAxis stroke="#64748b" tick={{ fill: "#64748b" }} />
                      <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ fill: "rgba(139, 92, 246, 0.1)" }}
                      />
                      <Bar
                        dataKey="pendingCount"
                        fill="url(#pendingGradient)"
                        radius={[8, 8, 0, 0]}
                        name="Pending Count"
                      />
                      <defs>
                        <linearGradient
                          id="pendingGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor="#F59E0B" />
                          <stop offset="100%" stopColor="#EF4444" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Stage Table */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="p-6 border-b border-gray-100">
                <CardTitle className="text-xl flex items-center gap-2">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                  Detailed Pending Stages Overview
                  <Badge className="ml-2 bg-amber-500 text-white">
                    {pendingStagesData.reduce(
                      (sum, stage) => sum + stage.pendingCount,
                      0,
                    )}{" "}
                    Total
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Comprehensive list of all workflow stages with pending counts
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-200">
                        <TableHead className="font-bold text-gray-700">
                          Category
                        </TableHead>
                        <TableHead className="font-bold text-gray-700">
                          Stage Name
                        </TableHead>
                        <TableHead className="text-right font-bold text-gray-700">
                          Pending Count
                        </TableHead>
                        <TableHead className="text-right font-bold text-gray-700">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingStagesData.map((stage, index) => (
                        <TableRow
                          key={index}
                          className="hover:bg-amber-50/30 border-b border-gray-100"
                        >
                          <TableCell>
                            <Badge
                              className={`font-semibold ${
                                stage.category === "INDENT-PO"
                                  ? "bg-green-100 text-[#6b8e2f]"
                                  : stage.category === "LIFT-ACCOUNTS"
                                    ? "bg-green-100 text-[#6b8e2f]"
                                    : "bg-green-100 text-[#6b8e2f]"
                              }`}
                            >
                              {stage.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium text-gray-900">
                            {stage.stageName}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-2xl font-bold text-gray-900">
                              {stage.pendingCount}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              className={`font-semibold ${
                                stage.pendingCount === 0
                                  ? "bg-green-100 text-[#6b8e2f]"
                                  : stage.pendingCount < 10
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-red-100 text-red-700"
                              }`}
                            >
                              {stage.pendingCount === 0
                                ? "Clear"
                                : stage.pendingCount < 10
                                  ? "Low"
                                  : "High"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* INDENT-PO */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="p-4 border-b border-gray-100 bg-linear-to-r from-green-50 to-emerald-50">
                  <CardTitle className="text-lg font-bold text-[#6b8e2f]">
                    INDENT-PO Stages
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Tooltip content={<CustomTooltip />} />
                        <Pie
                          data={pendingStagesData
                            .filter((s) => s.category === "INDENT-PO")
                            .map((s, i) => ({ ...s, fill: PIE_COLORS[i] }))}
                          dataKey="pendingCount"
                          nameKey="stageName"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          label={({ pendingCount }) =>
                            pendingCount > 0 ? pendingCount : ""
                          }
                        >
                          {pendingStagesData.filter((s) => s.category === "INDENT-PO").map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={PIE_COLORS[index]}
                              stroke="white"
                              strokeWidth={2}
                            />
                          ))}
                        </Pie>
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* LIFT-ACCOUNTS */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="p-4 border-b border-gray-100 bg-linear-to-r from-green-50 to-cyan-50">
                  <CardTitle className="text-lg font-bold text-[#6b8e2f]">
                    LIFT-ACCOUNTS Stages
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Tooltip content={<CustomTooltip />} />
                        <Pie
                          data={pendingStagesData
                            .filter((s) => s.category === "LIFT-ACCOUNTS")
                            .map((s, i) => ({ ...s, fill: PIE_COLORS[i] }))}
                          dataKey="pendingCount"
                          nameKey="stageName"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          label={({ pendingCount }) =>
                            pendingCount > 0 ? pendingCount : ""
                          }
                        >
                          {pendingStagesData.filter((s) => s.category === "LIFT-ACCOUNTS").map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={PIE_COLORS[index]}
                              stroke="white"
                              strokeWidth={2}
                            />
                          ))}
                        </Pie>
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* ACCOUNTS */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="p-4 border-b border-gray-100 bg-linear-to-r from-green-50 to-emerald-50">
                  <CardTitle className="text-lg font-bold text-[#6b8e2f]">
                    ACCOUNTS Stages
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Tooltip content={<CustomTooltip />} />
                        <Pie
                          data={pendingStagesData
                            .filter((s) => s.category === "ACCOUNTS")
                            .map((s, i) => ({ ...s, fill: PIE_COLORS[i] }))}
                          dataKey="pendingCount"
                          nameKey="stageName"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          label={({ pendingCount }) =>
                            pendingCount > 0 ? pendingCount : ""
                          }
                        >
                          {pendingStagesData.filter((s) => s.category === "ACCOUNTS").map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={PIE_COLORS[index]}
                              stroke="white"
                              strokeWidth={2}
                            />
                          ))}
                        </Pie>
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isDropdownModalOpen} onOpenChange={setIsDropdownModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Dropdown Data</DialogTitle>
            <DialogDescription>
              Add new entries to the Master table for dropdowns across the
              application.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDropdownSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="dropdownType">Type</Label>
              <Select
                value={dropdownFormData.type || undefined}
                onValueChange={(val) =>
                  setDropdownFormData((prev) => ({ ...prev, type: val }))
                }
              >
                <SelectTrigger id="dropdownType" className="w-full">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vendor Name">Vendor Name</SelectItem>
                  <SelectItem value="Transporter">Transporter</SelectItem>
                  <SelectItem value="Raw Material">Raw Material</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dropdownFormData.type === "Vendor Name" && (
              <div className="space-y-2">
                <Label htmlFor="vendorName">Vendor Name</Label>
                <Input
                  id="vendorName"
                  placeholder="Enter vendor name"
                  value={dropdownFormData.vendorName}
                  onChange={(e) =>
                    setDropdownFormData((prev) => ({
                      ...prev,
                      vendorName: e.target.value,
                    }))
                  }
                />
              </div>
            )}

            {dropdownFormData.type === "Transporter" && (
              <div className="space-y-2">
                <Label htmlFor="transporterName">Transporter Name</Label>
                <Input
                  id="transporterName"
                  placeholder="Enter transporter name"
                  value={dropdownFormData.transporterName}
                  onChange={(e) =>
                    setDropdownFormData((prev) => ({
                      ...prev,
                      transporterName: e.target.value,
                    }))
                  }
                />
              </div>
            )}

            {dropdownFormData.type === "Raw Material" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="rawMaterialName">Product Name</Label>
                  <Input
                    id="rawMaterialName"
                    placeholder="Enter product name"
                    value={dropdownFormData.rawMaterialName}
                    onChange={(e) =>
                      setDropdownFormData((prev) => ({
                        ...prev,
                        rawMaterialName: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aluminaRange">Alumina Range</Label>
                  <Input
                    id="aluminaRange"
                    placeholder="Enter alumina range"
                    value={dropdownFormData.aluminaRange}
                    onChange={(e) =>
                      setDropdownFormData((prev) => ({
                        ...prev,
                        aluminaRange: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ironRange">Iron Range</Label>
                  <Input
                    id="ironRange"
                    placeholder="Enter iron range"
                    value={dropdownFormData.ironRange}
                    onChange={(e) =>
                      setDropdownFormData((prev) => ({
                        ...prev,
                        ironRange: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apRange">AP Range</Label>
                  <Input
                    id="apRange"
                    placeholder="Enter AP range"
                    value={dropdownFormData.apRange}
                    onChange={(e) =>
                      setDropdownFormData((prev) => ({
                        ...prev,
                        apRange: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bdRange">BD Range</Label>
                  <Input
                    id="bdRange"
                    placeholder="Enter BD range"
                    value={dropdownFormData.bdRange}
                    onChange={(e) =>
                      setDropdownFormData((prev) => ({
                        ...prev,
                        bdRange: e.target.value,
                      }))
                    }
                  />
                </div>
              </>
            )}
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDropdownModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={dropdownSubmitLoading}>
                {dropdownSubmitLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
