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
  Users,
  Eye,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
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
  const [allFullkittingData, setAllFullkittingData] = useState([]);
  const [allTlData, setAllTlData] = useState([]);
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

  // Party Report States
  const [selectedParty, setSelectedParty] = useState("all");
  const [partySearch, setPartySearch] = useState("");
  const [partyFirmFilter, setPartyFirmFilter] = useState("all");
  const [expandedIndent, setExpandedIndent] = useState(null);

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
      const [indentPoRes, liftAccountsRes, mismatchRes, fullkittingRes, tlRes] = await Promise.all([
        supabase
          .from("INDENT-PO")
          .select("*")
          .order("Timestamp", { ascending: false }),
        supabase
          .from("LIFT-ACCOUNTS")
          .select("*")
          .order("Timestamp", { ascending: false }),
        supabase.from("Mismatch").select("*").order("id", { ascending: false }),
        supabase.from("fullkittin").select("*"),
        supabase.from("TL").select("*"),
      ]);

      if (indentPoRes.error) throw indentPoRes.error;
      if (liftAccountsRes.error) throw liftAccountsRes.error;
      if (mismatchRes.error) throw mismatchRes.error;
      if (fullkittingRes.error) throw fullkittingRes.error;
      if (tlRes.error) throw tlRes.error;

      // Process INDENT-PO data
      let processedIndentPoData = (indentPoRes.data || [])
        .map((row) => ({
          id: row["Indent Id."] || `po-${Math.random()}`,
          date: row["Timestamp"] ? new Date(row["Timestamp"]) : null,
          rlNo: row["Indent Id."],
          poNumber: row.po_number || row["Indent Id."],
          firmName: row["Firm Name"],
          vendorName: row["Vendor"] || row["Vendor name"], // Handle both potential column names
          material: row["Material"] || row["Raw Material Name"],
          poQty: Number.parseFloat(
            row["Quantity"] || row["Total Quantity"] || 0,
          ),
          poTimestamp: row["Actual2"], // Generate PO Status
          pendingQty: Number.parseFloat(
            row["Pending PO Qty"] ?? row["Quantity"] ?? row["Total Quantity"] ?? 0,
          ),

          notes: row["Notes"],
          planned1: row["Planned1"],
          actual1: row["Actual1"],
          planned5: row["Planned5"],
          actual5: row["Actual5"],
          planned6: row["Planned6"],
          actual6: row["Actual6"],
          planned3: row["Planned3"],
          planned4: row["Planned4"],
          actualM: row["Actual1"], // Indent Approval
          plannedLogistics: row["PlannedLogistics"],
          actualLogistics: row["ActualLogistics"],
          planned9: row["Planned9"],
          planned7: row["Planned7"], // Factory Approval Planned
          actual7: row["Actual7"], // Factory Approval
          planned8: row["Planned8"], // Management Approval Planned
          actual8: row["Actual8"], // Management Approval
          actualS: row["Actual2"], // Generate PO
          actualAL: row["Actual3"], // PO Entry
          actualAO: row["Actual4"], // Lift Item
          status: row["Status"],
          transportType: row["Transport Type"],
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
            biltyNo: row["Bilty No."],
            biltyImage: row["Bilty Image"],
            billNo: row["Bill No."],
            liftedQty: Number.parseFloat(row["Lifting Qty"] || row["Truck Qty"] || 0),
            receivedTimestamp: row["Actual 1"], // Receipt Timestamp
            receivedQty: Number.parseFloat(row["Actual Quantity"] || 0),
            firmName: row["Firm Name"],
            vendorName: row["Vendor Name"],
            material: row["Raw Material Name"],
            transporterName: row["Transporter Name"],
            notes: row["Notes"] || "", // If exists
            actualU: row["Actual 1"], // Receipt
            actualAE: row["Actual 2"], // Bilty
            actualAJ: row["Actual 3"], // Lab
            actualBB: row["Actual 4"], // Final Tally
            planned1: row["Planned 1"],
            planned2: row["Planned 2"],
            planned3: row["Planned 3"],
            type: row["Type"],
            unloadApprovalRequired: row["Unload Approval Required"],
            unloadApprovalStatus: row["Unload Approval Status"],
            status: row["Status"],
            physicalCondition: row["Physical Condition"],
            moisture: row["Moisture"],
            aluminaPercent: row["Alumina Percent Age %"],
            ironPercent: row["Iron Percent Age %"],
            apPercent: row["AP Percent Age %"],
            bdPercent: row["BD Percent Age %"],
          };
        })
        .filter((l) => l && l.rlNo);

      // Process ACCOUNTS (Mismatch) data
      let processedAccountsData = (mismatchRes.data || [])
        .map((row) => ({
          id: row.id,
          date: row["Timestamp"] ? new Date(row["Timestamp"]) : null,
          rlNo: row["Lift Number"] || row["Lift ID"] || row.liftNumber,
          liftId: row["Lift ID"],
          liftNumber: row["Lift Number"],
          biltyNo: row["Bilty No."] || row["Bilty No"],
          biltyImage: row["Bilty Image"],
          billNo: row["Bill No."] || row["Bill No"],
          partyName: row["Party Name"],
          productName: row["Product Name"],
          actualAA: row["Actual2"], // Audit
          actualAF: row["Actual3"], // Rectify
          actualAK: row["Actual4"], // Tally
          actualAP: row["Actual5"], // ReAudit
          actualAU: row["Actual6"], // Bill Entry
          planned2: row["Planned2"],
          planned3: row["Planned3"],
          planned4: row["Planned4"],
          planned5: row["Planned5"],
          planned6: row["Planned6"],
          planned7: row["Planned7"],
          actual7: row["Actual7"],
          status: row["Status"],
          status2: row["Status2"],
          status5: row["Status5"],
          qtyDifference: Number.parseFloat(row["Quantity Difference"] || row["Diff Qty"] || 0),
          qtyDiffStatus: row["Qty Diff Status"],
          rateDifference: Number.parseFloat(row["Rate Difference"] || 0),
          aluminaDifference: Number.parseFloat(row["Alumina Difference"] || 0),
          ironDifference: Number.parseFloat(row["Iron Difference"] || 0),
          apDifference: Number.parseFloat(row["AP Difference"] || 0),
          bdDifference: Number.parseFloat(row["BD Difference"] || 0),
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
      setAllFullkittingData(fullkittingRes.data || []);
      setAllTlData(tlRes.data || []);
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

  // Party Report Data
  const partyReportData = useMemo(() => {
    const vendorMap = {};
    const today = new Date();

    allPurchaseData.forEach((indent) => {
      const vendor = indent.vendorName || "Unknown";
      if (!vendorMap[vendor]) {
        vendorMap[vendor] = { vendorName: vendor, firmName: indent.firmName || "", indents: [] };
      }

      const lifts = allLiftAccountData.filter((l) => l.rlNo === indent.rlNo);
      const liftNos = lifts.map((l) => String(l.id || "")).filter(Boolean);
      const accounts = allAccountsData.filter(
        (a) => a.rlNo && liftNos.includes(String(a.rlNo))
      );

      // Quantities
      const indentQty = indent.poQty || 0;
      const liftedQty = lifts.reduce((s, l) => s + (l.liftedQty || 0), 0);
      const receivedQty = lifts.reduce((s, l) => s + (l.receivedQty || 0), 0);
      const pendingQty = Math.max(0, indentQty - liftedQty);

      // Aging
      const createdDate = indent.date;
      const daysOld = createdDate && !isNaN(createdDate)
        ? Math.floor((today - createdDate) / (1000 * 60 * 60 * 24))
        : null;

      const steps = [
        { label: "HOD Approved", done: !!indent.actualM, category: "indent" },
        { label: "Factory Approved", done: !!indent.actual7, category: "indent" },
        { label: "Mgmt Approved", done: !!indent.actual8, category: "indent" },
        { label: "PO Generated", done: !!indent.actualS, category: "indent" },
        { label: "PO Entry (Tally)", done: !!indent.actualAL, category: "indent" },
        { label: "Material Lifted", done: lifts.length > 0, category: "lift" },
        { label: "Material Received", done: lifts.some((l) => l.actualU), category: "lift" },
        { label: "Bilty Entry", done: lifts.some((l) => l.actualAE), category: "lift" },
        { label: "Lab Testing", done: lifts.some((l) => l.actualAJ), category: "lift" },
        { label: "Final Tally", done: lifts.some((l) => l.actualBB), category: "lift" },
        { label: "Accounts Audit", done: accounts.some((a) => a.actualAA || a.actualAU), category: "accounts" },
      ];

      const pendingStep = steps.find((s) => !s.done);
      const pendingStepQty =
        !pendingStep ? 0
        : pendingStep.category === "lift" && pendingStep.label !== "Material Lifted" ? Math.max(receivedQty || liftedQty || 0, 0)
        : pendingStep.category === "accounts" ? Math.max(receivedQty || liftedQty || 0, 0)
        : Math.max(pendingQty || indentQty || 0, 0);
      const completedCount = steps.filter((s) => s.done).length;
      const progress = Math.round((completedCount / steps.length) * 100);

      const liftStatus =
        lifts.length === 0 ? "Lift Pending"
        : lifts.some((l) => !l.actualU) ? "In Transit"
        : lifts.some((l) => !l.actualAJ) ? "Lab Pending"
        : lifts.some((l) => !l.actualBB) ? "Tally Pending"
        : "Lift Done";

      // Urgency based on age + pending
      const urgency =
        progress === 100 ? "done"
        : daysOld === null ? "low"
        : daysOld > 30 ? "high"
        : daysOld > 15 ? "medium"
        : "low";

      vendorMap[vendor].indents.push({
        ...indent,
        lifts, accounts, steps, pendingStep,
        completedSteps: completedCount, progress,
        liftStatus, isComplete: progress === 100,
        indentQty, liftedQty, receivedQty, pendingQty, pendingStepQty,
        daysOld, urgency,
      });
    });

    Object.values(vendorMap).forEach((v) => {
      v.indents.sort((a, b) => {
        // Sort: high urgency first, then by progress ascending
        const uOrder = { high: 0, medium: 1, low: 2, done: 3 };
        if (uOrder[a.urgency] !== uOrder[b.urgency]) return uOrder[a.urgency] - uOrder[b.urgency];
        return a.progress - b.progress;
      });
      v.totalIndents = v.indents.length;
      v.pendingCount = v.indents.filter((i) => !i.isComplete).length;
      v.doneCount = v.indents.filter((i) => i.isComplete).length;
      v.liftsNotDone = v.indents.filter((i) => i.liftStatus === "Lift Pending").length;
      v.inTransit = v.indents.filter((i) => i.liftStatus === "In Transit").length;
      v.labPending = v.indents.filter((i) => i.liftStatus === "Lab Pending").length;
      v.tallyPending = v.indents.filter((i) => i.liftStatus === "Tally Pending").length;
      v.accountsPending = v.indents.filter((i) => i.pendingStep?.category === "accounts").length;
      v.criticalCount = v.indents.filter((i) => i.urgency === "high").length;
      // Qty totals
      v.totalIndentQty = v.indents.reduce((s, i) => s + i.indentQty, 0);
      v.totalLiftedQty = v.indents.reduce((s, i) => s + i.liftedQty, 0);
      v.totalReceivedQty = v.indents.reduce((s, i) => s + i.receivedQty, 0);
      v.totalPendingQty = v.indents.reduce((s, i) => s + i.pendingQty, 0);
    });

    return Object.values(vendorMap).sort((a, b) => {
      if (b.criticalCount !== a.criticalCount) return b.criticalCount - a.criticalCount;
      return b.pendingCount - a.pendingCount;
    });
  }, [allPurchaseData, allLiftAccountData, allAccountsData]);

  const selectedPartyData = useMemo(() => {
    if (selectedParty === "all") return null;
    return partyReportData.find((p) => p.vendorName === selectedParty) || null;
  }, [partyReportData, selectedParty]);

  const filteredParties = useMemo(() => {
    let result = partyReportData;
    if (partyFirmFilter !== "all") {
      result = result.filter((p) => p.firmName === partyFirmFilter);
    }
    if (partySearch.trim()) {
      const q = partySearch.toLowerCase();
      result = result.filter((p) => p.vendorName.toLowerCase().includes(q));
    }
    return result;
  }, [partyReportData, partySearch, partyFirmFilter]);

  const stepTrackerData = useMemo(() => {
    const hasValue = (value) => value !== null && value !== undefined && String(value).trim() !== "";
    const needsUnloadApproval = (row) =>
      String(row.unloadApprovalRequired || "").trim().toLowerCase() === "yes";
    const isUnloadApproved = (row) =>
      String(row.unloadApprovalStatus || "").trim().toLowerCase() === "approved";

    const groupedPoRows = (rows, predicate) => {
      const groups = new Map();
      rows.forEach((row) => {
        const key = String(row.poNumber || row.rlNo || "").trim();
        if (!key || groups.has(key)) return;
        if (predicate(row)) groups.set(key, row);
      });
      return Array.from(groups.values());
    };

    const groupedPoMetrics = (rows, predicate, qtyKey) => {
      const groups = new Map();
      let quantity = 0;
      rows.forEach((row) => {
        if (!predicate(row)) return;
        quantity += Number(row[qtyKey]) || 0;
        const key = String(row.poNumber || row.rlNo || "").trim();
        if (key && !groups.has(key)) groups.set(key, row);
      });
      return { sourceRows: Array.from(groups.values()), quantity };
    };

    const accountByLiftNo = new Map();
    filteredAccountsData.forEach((row) => {
      [row.rlNo, row.liftId, row.liftNumber].forEach((value) => {
        const liftNo = String(value || "").trim();
        if (liftNo && !accountByLiftNo.has(liftNo)) accountByLiftNo.set(liftNo, row);
      });
    });

    const accountStageKey = (row) =>
      row?.id ?? row?.liftId ?? row?.liftNumber ?? row?.rlNo ?? "";

    const liftByLiftNo = new Map();
    filteredLiftAccountData.forEach((row) => {
      const liftNo = String(row.id || "").trim();
      if (liftNo && !liftByLiftNo.has(liftNo)) liftByLiftNo.set(liftNo, row);
    });

    const hasBiltyDetails = (row) => {
      const liftNo = String(row.id || row.rlNo || row.liftId || row.liftNumber || "").trim();
      const lift = liftByLiftNo.get(liftNo) || {};
      const biltyNo = String(row.biltyNo || lift.biltyNo || "").trim();
      const biltyImage = String(row.biltyImage || lift.biltyImage || "").trim();
      return Boolean(biltyNo && biltyImage);
    };

    const auditGroupRows = (rows) => {
      const groups = new Map();
      rows.forEach((row) => {
        const firm = String(row.firmName || "").trim().toLowerCase();
        const bill = String(row.billNo || "").trim().toLowerCase();
        const party = String(row.partyName || row.vendorName || "").trim().toLowerCase();
        const key = `${firm}|||${bill}|||${party}`;
        if (!groups.has(key)) groups.set(key, row);
      });
      return Array.from(groups.values());
    };

    const uniqueAccountRows = (rows) => {
      const uniqueRows = new Map();
      rows.forEach((row) => {
        const key = String(accountStageKey(row)).trim();
        if (key && !uniqueRows.has(key)) uniqueRows.set(key, row);
      });
      return Array.from(uniqueRows.values());
    };

    const tlByProduct = new Map();
    allTlData.forEach((row) => {
      const productName = String(row["NAME"] || "").trim().toLowerCase();
      if (productName) tlByProduct.set(productName, row);
    });

    const fullkittingDoneLiftNos = new Set();
    const fullkittingDoneBiltyNos = new Set();
    allFullkittingData.forEach((row) => {
      const liftNo = String(row["Lift No"] || "").trim();
      const biltyNo = String(row["Bilty Number"] || row["Bilty No."] || "").trim();
      if (liftNo) fullkittingDoneLiftNos.add(liftNo);
      if (biltyNo) fullkittingDoneBiltyNos.add(biltyNo);
    });

    const hasReceiptDownstreamProof = (row) => {
      const liftNo = String(row.id || "").trim();
      const accountRow = accountByLiftNo.get(liftNo);
      return (
        hasValue(accountRow?.actualAU) ||
        fullkittingDoneLiftNos.has(liftNo)
      );
    };

    const biltyLiftCounts = {};
    filteredLiftAccountData.forEach((row) => {
      const liftNo = String(row.id || "").trim();
      const accountRow = accountByLiftNo.get(liftNo);
      const biltyNo = String(accountRow?.biltyNo || row.biltyNo || "").trim();
      if (biltyNo) biltyLiftCounts[biltyNo] = (biltyLiftCounts[biltyNo] || 0) + 1;
    });

    const hodRows = filteredIndentPoData.filter((row) => hasValue(row.planned1) && !hasValue(row.actual1));
    const threePartyRows = filteredIndentPoData.filter((row) => hasValue(row.planned6) && !hasValue(row.actual6));
    const factoryRows = filteredIndentPoData.filter((row) => hasValue(row.planned7) && !hasValue(row.actual7));
    const managementRows = filteredIndentPoData.filter((row) => hasValue(row.planned8) && !hasValue(row.actual8));
    const arrangeLogisticsRows = filteredIndentPoData.filter(
      (row) => hasValue(row.plannedLogistics) && !hasValue(row.actualLogistics) && !hasValue(row.planned9),
    );
    const logisticsApprovalRows = groupedPoRows(
      filteredIndentPoData,
      (row) => hasValue(row.planned9) && !hasValue(row.actualLogistics),
    );
    const poEntryRows = groupedPoRows(filteredIndentPoData, (row) => {
      const isForTransport = String(row.transportType || "").trim().toUpperCase() === "FOR";
      const hasCompletedLogistics = isForTransport || hasValue(row.actualLogistics);
      return hasValue(row.actualAL) === false && hasValue(row.planned3) && hasCompletedLogistics;
    });
    const advanceRows = groupedPoRows(
      filteredIndentPoData,
      (row) => hasValue(row.planned5) && !hasValue(row.actual5),
    );
    const liftMetrics = groupedPoMetrics(filteredIndentPoData, (row) => {
      const status = String(row.status || "").trim().toLowerCase();
      return (
        (status === "" || status === "pending") &&
        hasValue(row.planned4) &&
        !hasValue(row.actualAO) &&
        (Number(row.pendingQty) || 0) > 0
      );
    }, "pendingQty");
    const receiptRows = filteredLiftAccountData.filter((row) => {
      const unloadStatus = String(row.unloadApprovalStatus || "").trim();
      const unloadRequired = String(row.unloadApprovalRequired || "").trim();
      const isPendingApproval = unloadStatus === "Pending";
      const isApprovedButNotFinalized = unloadStatus === "Approved" && unloadRequired === "Yes";
      const hasMovedToLab = hasValue(row.planned2) || hasValue(row.actualAE);
      const staleMissingReceipt = !hasValue(row.actualU) && hasReceiptDownstreamProof(row);

      return (
        hasValue(row.planned1) &&
        !hasMovedToLab &&
        !staleMissingReceipt &&
        (!hasValue(row.actualU) || isPendingApproval || isApprovedButNotFinalized)
      );
    });

    const isBiltyPageExcluded = (row) => {
      const firmName = String(row.firmName || "").trim().toUpperCase();
      const transporterName = String(row.transporterName || "").trim().toUpperCase();
      return (
        ((firmName === "RKL" || firmName === "PURAB") && transporterName === "FOR") ||
        ((firmName === "PMMPL" || firmName === "PMPL") &&
          (transporterName === "EX FACTORY TRANSPORTER" || transporterName === "EX FACTORY"))
      );
    };

    const getMismatchTypes = (row) => {
      const liftNo = String(row.rlNo || row.liftId || row.liftNumber || "").trim();
      const lift = liftByLiftNo.get(liftNo) || {};
      const productName = String(row.productName || lift.material || "").trim().toLowerCase();
      const tlRow = tlByProduct.get(productName) || {};

      const hasRate = Math.abs(Number(row.rateDifference || 0)) > 0.001;
      const hasQty =
        (row.qtyDiffStatus === "Mismatch" && (Number(row.qtyDifference) || 0) < 0) ||
        (Number(row.qtyDifference) || 0) < -0.001;

      const hasAluminaStored = row.aluminaDifference !== null && Math.abs(Number(row.aluminaDifference || 0)) > 0;
      const hasIronStored = row.ironDifference !== null && Math.abs(Number(row.ironDifference || 0)) > 0;
      const hasApStored = row.apDifference !== null && Math.abs(Number(row.apDifference || 0)) > 0;
      const hasBdStored = row.bdDifference !== null && Math.abs(Number(row.bdDifference || 0)) > 0;

      const parseNumeric = (value) => {
        if (value === null || value === undefined || String(value).trim() === "") return NaN;
        return Number(value);
      };
      const labAlumina = parseNumeric(lift.aluminaPercent);
      const labIron = parseNumeric(lift.ironPercent);
      const labAp = parseNumeric(lift.apPercent);
      const labBd = parseNumeric(lift.bdPercent);
      const tlAlumina = parseNumeric(tlRow["TL Alumina"]);
      const tlIron = parseNumeric(tlRow["TL Iron"]);
      const tlAp = parseNumeric(tlRow["AP%"]);
      const tlBd = parseNumeric(tlRow["BD%"]);

      const hasAluminaLive = !Number.isNaN(labAlumina) && !Number.isNaN(tlAlumina) && labAlumina < tlAlumina;
      const hasIronLive = !Number.isNaN(labIron) && !Number.isNaN(tlIron) && labIron > tlIron;
      const hasApLive = !Number.isNaN(labAp) && !Number.isNaN(tlAp) && labAp > tlAp;
      const hasBdLive = !Number.isNaN(labBd) && !Number.isNaN(tlBd) && labBd < tlBd;
      const isRejected = String(lift.status || "").trim().toLowerCase() === "rejected";
      const hasBadPhysical = String(lift.physicalCondition || "").trim() === "Bad" && String(lift.moisture || "").trim() === "Yes";
      const hasLab =
        hasAluminaStored ||
        hasIronStored ||
        hasApStored ||
        hasBdStored ||
        hasAluminaLive ||
        hasIronLive ||
        hasApLive ||
        hasBdLive ||
        isRejected ||
        hasBadPhysical;

      return [hasRate ? "rate" : "", hasQty ? "quantity" : "", hasLab ? "lab" : ""].filter(Boolean);
    };
    const unloadRows = filteredLiftAccountData.filter(
      (row) => needsUnloadApproval(row) && String(row.unloadApprovalStatus || "").trim().toLowerCase() === "pending" && hasValue(row.actualU),
    );
    const labRows = filteredLiftAccountData.filter(
      (row) => hasValue(row.planned2) && !hasValue(row.actualAE) && (!needsUnloadApproval(row) || isUnloadApproved(row)),
    );
    const biltyRows = filteredLiftAccountData.filter(
      (row) =>
        !isBiltyPageExcluded(row) &&
        hasValue(row.planned3) &&
        !hasValue(row.actualAJ) &&
        !hasValue(row.biltyNo) &&
        (!needsUnloadApproval(row) || isUnloadApproved(row)),
    );
    const mismatchRows = filteredAccountsData.filter((row) => {
      const status = String(row.status || "").trim();
      const isResolved = ["Credit Notes", "Others", "Purchase Return", "Acknowledge"].includes(status);
      return !isResolved && getMismatchTypes(row).length > 0;
    });
    const isAuditNotDone = (row) => String(row.status2 || "").trim().toLowerCase() === "not done";
    const isAuditDone = (row) => String(row.status2 || "").trim().toLowerCase() === "done";
    const isReAuditDone = (row) => String(row.status5 || "").trim().toLowerCase() === "done";
    const shouldShowInTallyEntry = (row) =>
      hasBiltyDetails(row) &&
      !hasValue(row.actualAK) &&
      (hasValue(row.planned4) || (hasValue(row.actualAA) && isAuditDone(row)) || (hasValue(row.actualAP) && isReAuditDone(row)));
    const accountAuditRows = uniqueAccountRows(filteredAccountsData.filter((row) => {
      if (!hasBiltyDetails(row)) return false;
      return (
        !hasValue(row.actualAA) ||
        (hasValue(row.planned3) && !hasValue(row.actualAF) && isAuditNotDone(row)) ||
        shouldShowInTallyEntry(row) ||
        (hasValue(row.planned5) && !hasValue(row.actualAP)) ||
        (hasValue(row.planned6) && !hasValue(row.actualAU))
      );
    }));
    const fullkittingRows = filteredLiftAccountData.filter((row) => {
      const liftNo = String(row.id || "").trim();
      const accountRow = accountByLiftNo.get(liftNo);
      const biltyNo = String(accountRow?.biltyNo || row.biltyNo || "").trim();
      const isSharedBilty = biltyNo && biltyLiftCounts[biltyNo] > 1;
      return (
        hasValue(accountRow?.actualAU) &&
        !fullkittingDoneLiftNos.has(liftNo) &&
        (isSharedBilty || !biltyNo || !fullkittingDoneBiltyNos.has(biltyNo))
      );
    });

    const sumQty = (rows, key) =>
      rows.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);

    const rows = [
      { label: "HOD Approval", category: "Indent", sourceRows: hodRows, quantity: 0 },
      { label: "Three Party", category: "Vendor", sourceRows: threePartyRows, quantity: 0 },
      { label: "Factory App.", category: "Approval", sourceRows: factoryRows, quantity: 0 },
      { label: "Mgmt App.", category: "Approval", sourceRows: managementRows, quantity: 0 },
      { label: "Arrange Logistics", category: "Logistics", sourceRows: arrangeLogisticsRows, quantity: 0 },
      { label: "Logistics App.", category: "Logistics", sourceRows: logisticsApprovalRows, quantity: 0 },
      { label: "PO Entry", category: "PO", sourceRows: poEntryRows, quantity: 0 },
      { label: "Advance Payment", category: "Accounts", sourceRows: advanceRows, quantity: 0 },
      { label: "Lift", category: "Lift", sourceRows: liftMetrics.sourceRows, quantity: liftMetrics.quantity },
      { label: "Receipt", category: "Receipt", sourceRows: receiptRows, quantity: sumQty(receiptRows, "liftedQty") },
      { label: "Unload App.", category: "Receipt", sourceRows: unloadRows, quantity: sumQty(unloadRows, "receivedQty") },
      { label: "Lab", category: "Lab", sourceRows: labRows, quantity: sumQty(labRows, "receivedQty") },
      { label: "Bilty", category: "Bilty", sourceRows: biltyRows, quantity: sumQty(biltyRows, "receivedQty") },
      { label: "Mismatch", category: "Mismatch", sourceRows: mismatchRows, quantity: 0 },
      { label: "Accounts Audit", category: "Accounts", sourceRows: accountAuditRows, quantity: 0 },
      { label: "Fullkitting", category: "Fullkitting", sourceRows: fullkittingRows, quantity: 0 },
    ].map((row) => ({
      label: row.label,
      category: row.category,
      count: row.sourceRows.length,
      quantity: row.quantity,
    }));

    const totalCount = rows.reduce((sum, row) => sum + row.count, 0);
    const pendingCount = totalCount;
    const completedCount = 0;

    return { rows, totalCount, pendingCount, completedCount };
  }, [filteredIndentPoData, filteredLiftAccountData, filteredAccountsData, allFullkittingData, allTlData]);

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
                    Snapshot insights into your purchase operations
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
          <div className="flex justify-center mb-6 sm:mb-8 overflow-x-auto no-scrollbar">
            <TabsList className="flex shrink-0 w-full sm:w-auto bg-white border-0 shadow-lg rounded-xl sm:rounded-2xl p-1 sm:p-2 h-auto gap-0.5 sm:gap-1">
              {[
                { value: "overview", icon: <TrendingUp className="h-3.5 w-3.5 sm:h-5 sm:w-5 shrink-0" />, label: "Overview" },
                { value: "purchase", icon: <List className="h-3.5 w-3.5 sm:h-5 sm:w-5 shrink-0" />, label: "Data" },
                { value: "pending", icon: <AlertTriangle className="h-3.5 w-3.5 sm:h-5 sm:w-5 shrink-0" />, label: "Workflow" },
                { value: "step-tracker", icon: <Activity className="h-3.5 w-3.5 sm:h-5 sm:w-5 shrink-0" />, label: "Step Track" },
                { value: "party", icon: <Users className="h-3.5 w-3.5 sm:h-5 sm:w-5 shrink-0" />, label: "Party Report" },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex-1 sm:flex-none shrink-0 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-4 px-2 sm:px-6 text-[11px] sm:text-base font-semibold rounded-lg sm:rounded-xl data-[state=active]:bg-linear-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-xl transition-all duration-300 whitespace-nowrap"
                >
                  {tab.icon}
                  <span className="hidden xs:inline sm:inline">{tab.label}</span>
                  <span className="xs:hidden sm:hidden">{tab.label.split(" ")[0]}</span>
                </TabsTrigger>
              ))}
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

          <TabsContent value="step-tracker" className="space-y-5">
            <Card className="border-0 shadow-lg">
              <CardHeader className="p-5 border-b border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Activity className="h-6 w-6 text-[#7da23a]" />
                      Step Wise Data Tracker
                    </CardTitle>
                    <CardDescription>
                      Snapshot view. Data refreshes only on page load or manual Refresh.
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => fetchData(false)}
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto border-[#7da23a] text-[#6b8e2f] hover:bg-green-50"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Snapshot
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-200">
                        <TableHead className="font-bold text-gray-700">Step</TableHead>
                        <TableHead className="font-bold text-gray-700">Category</TableHead>
                        <TableHead className="text-right font-bold text-gray-700">Data Count</TableHead>
                        <TableHead className="text-right font-bold text-gray-700">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stepTrackerData.rows.map((row) => (
                        <TableRow key={row.label} className="hover:bg-green-50/30 border-b border-gray-100">
                          <TableCell className="font-medium text-gray-900">{row.label}</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-[#6b8e2f] font-semibold">
                              {row.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-xl font-bold text-gray-900">{row.count}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              className={
                                row.label === "Completed"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : row.count === 0
                                    ? "bg-gray-100 text-gray-600"
                                    : "bg-amber-100 text-amber-800"
                              }
                            >
                              {row.label === "Completed"
                                ? "Done"
                                : row.count === 0
                                  ? "Clear"
                                  : "Pending"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== PARTY REPORT TAB ===== */}
          <TabsContent value="party" className="space-y-5">

            {/* ---- Filters Row ---- */}
            <Card className="border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Party / Vendor naam search karein..."
                      value={partySearch}
                      onChange={(e) => setPartySearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7da23a]/40 bg-white"
                    />
                  </div>
                  <Select value={partyFirmFilter} onValueChange={setPartyFirmFilter}>
                    <SelectTrigger className="w-full sm:w-44 h-9 text-sm shrink-0">
                      <SelectValue placeholder="Firm Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Sab Firms</SelectItem>
                      {firmOptions.map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedParty !== "all" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSelectedParty("all"); setExpandedIndent(null); }}
                      className="shrink-0 border-[#7da23a] text-[#7da23a] hover:bg-green-50"
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Sab Parties
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {selectedParty === "all" ? (
              /* ========== ALL PARTIES VIEW ========== */
              <>
                {/* Grand summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { label: "Total Parties", value: filteredParties.length, icon: <Users className="h-5 w-5 text-white" />, gradient: "from-green-500 to-green-600" },
                    { label: "Critical (>30d)", value: filteredParties.reduce((s, p) => s + p.criticalCount, 0), icon: <AlertTriangle className="h-5 w-5 text-white" />, gradient: "from-red-500 to-red-600" },
                    { label: "Lift Pending", value: filteredParties.reduce((s, p) => s + p.liftsNotDone, 0), icon: <Hourglass className="h-5 w-5 text-white" />, gradient: "from-orange-500 to-orange-600" },
                    { label: "In Transit", value: filteredParties.reduce((s, p) => s + p.inTransit, 0), icon: <Truck className="h-5 w-5 text-white" />, gradient: "from-blue-500 to-blue-600" },
                    { label: "Accounts Pending", value: filteredParties.reduce((s, p) => s + p.accountsPending, 0), icon: <Archive className="h-5 w-5 text-white" />, gradient: "from-amber-500 to-amber-600" },
                    { label: "Completed", value: filteredParties.reduce((s, p) => s + p.doneCount, 0), icon: <CheckCircle className="h-5 w-5 text-white" />, gradient: "from-emerald-500 to-emerald-600" },
                  ].map((c) => (
                    <Card key={c.label} className="border-0 shadow-md bg-white">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${c.gradient} shadow shrink-0`}>{c.icon}</div>
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500 font-medium truncate">{c.label}</p>
                          <p className="text-2xl font-bold text-gray-900">{c.value}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Qty Summary Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Total PO Qty", value: filteredParties.reduce((s, p) => s + p.totalIndentQty, 0), color: "text-gray-800", bg: "bg-white" },
                    { label: "Total Lifted Qty", value: filteredParties.reduce((s, p) => s + p.totalLiftedQty, 0), color: "text-blue-700", bg: "bg-blue-50" },
                    { label: "Total Received Qty", value: filteredParties.reduce((s, p) => s + p.totalReceivedQty, 0), color: "text-green-700", bg: "bg-green-50" },
                    { label: "Total Pending Qty", value: filteredParties.reduce((s, p) => s + p.totalPendingQty, 0), color: "text-red-700", bg: "bg-red-50" },
                  ].map((q) => (
                    <Card key={q.label} className={`border-0 shadow-sm ${q.bg}`}>
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-gray-500 font-medium">{q.label}</p>
                        <p className={`text-xl font-bold mt-0.5 ${q.color}`}>{q.value.toLocaleString()}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* All Parties Table */}
                <Card className="border-0 shadow-lg">
                  <CardHeader className="p-5 border-b border-gray-100">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5 text-[#7da23a]" />
                      Party-wise Complete Report
                      <Badge className="ml-2 bg-green-100 text-[#6b8e2f]">{filteredParties.length} parties</Badge>
                    </CardTitle>
                    <CardDescription>Kisi bhi party ki row pe click karein — complete indent report dekhein</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50 hover:bg-gray-50 border-b-2 border-gray-200">
                            <TableHead className="font-bold text-gray-700 min-w-[180px]">Party / Vendor</TableHead>
                            <TableHead className="font-bold text-gray-700">Firm</TableHead>
                            <TableHead className="text-center font-bold text-gray-700">Total</TableHead>
                            <TableHead className="text-center font-bold text-gray-700 text-red-600">Critical</TableHead>
                            <TableHead className="text-right font-bold text-gray-700">PO Qty</TableHead>
                            <TableHead className="text-right font-bold text-gray-700">Lifted Qty</TableHead>
                            <TableHead className="text-right font-bold text-gray-700">Received Qty</TableHead>
                            <TableHead className="text-right font-bold text-red-600">Pending Qty</TableHead>
                            <TableHead className="text-center font-bold text-orange-600">Lift⬇</TableHead>
                            <TableHead className="text-center font-bold text-blue-600">Transit</TableHead>
                            <TableHead className="text-center font-bold text-purple-600">Lab</TableHead>
                            <TableHead className="text-center font-bold text-amber-600">Accounts</TableHead>
                            <TableHead className="text-center font-bold text-green-600">Done</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredParties.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={14} className="text-center h-32 text-gray-500">
                                <Users className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                                <p>Koi party nahi mili</p>
                              </TableCell>
                            </TableRow>
                          ) : filteredParties.map((party) => (
                            <TableRow
                              key={party.vendorName}
                              className={`cursor-pointer border-b border-gray-100 transition-colors hover:bg-green-50/50 ${party.criticalCount > 0 ? "border-l-4 border-l-red-400" : ""}`}
                              onClick={() => { setSelectedParty(party.vendorName); setExpandedIndent(null); }}
                            >
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {party.criticalCount > 0 && (
                                    <span className="text-red-500 text-xs font-bold shrink-0" title="Critical - 30+ din se pending">🔥</span>
                                  )}
                                  <span className="font-semibold text-[#7da23a]">{party.vendorName}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-gray-500 text-sm">{party.firmName || "—"}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className="font-bold">{party.totalIndents}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                {party.criticalCount > 0
                                  ? <Badge className="bg-red-100 text-red-700 font-bold">{party.criticalCount}</Badge>
                                  : <span className="text-gray-300 text-xs">—</span>}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-gray-800">
                                {party.totalIndentQty > 0 ? party.totalIndentQty.toLocaleString() : "—"}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-blue-700">
                                {party.totalLiftedQty > 0 ? party.totalLiftedQty.toLocaleString() : "—"}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-green-700">
                                {party.totalReceivedQty > 0 ? party.totalReceivedQty.toLocaleString() : "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                {party.totalPendingQty > 0
                                  ? <span className="font-bold text-red-600">{party.totalPendingQty.toLocaleString()}</span>
                                  : <span className="text-gray-300 text-xs">—</span>}
                              </TableCell>
                              <TableCell className="text-center">
                                {party.liftsNotDone > 0
                                  ? <Badge className="bg-orange-100 text-orange-700 font-semibold">{party.liftsNotDone}</Badge>
                                  : <span className="text-gray-300 text-xs">—</span>}
                              </TableCell>
                              <TableCell className="text-center">
                                {party.inTransit > 0
                                  ? <Badge className="bg-blue-100 text-blue-700 font-semibold">{party.inTransit}</Badge>
                                  : <span className="text-gray-300 text-xs">—</span>}
                              </TableCell>
                              <TableCell className="text-center">
                                {party.labPending > 0
                                  ? <Badge className="bg-purple-100 text-purple-700 font-semibold">{party.labPending}</Badge>
                                  : <span className="text-gray-300 text-xs">—</span>}
                              </TableCell>
                              <TableCell className="text-center">
                                {party.accountsPending > 0
                                  ? <Badge className="bg-amber-100 text-amber-700 font-semibold">{party.accountsPending}</Badge>
                                  : <span className="text-gray-300 text-xs">—</span>}
                              </TableCell>
                              <TableCell className="text-center">
                                {party.doneCount > 0
                                  ? <Badge className="bg-green-100 text-green-700 font-semibold">{party.doneCount}</Badge>
                                  : <span className="text-gray-300 text-xs">—</span>}
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-[#7da23a] border-[#7da23a] hover:bg-green-50 h-7 px-2 text-xs whitespace-nowrap"
                                  onClick={(e) => { e.stopPropagation(); setSelectedParty(party.vendorName); setExpandedIndent(null); }}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Details
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : selectedPartyData ? (
              /* ========== PARTY DETAIL VIEW ========== */
              <>
                {/* Party Header */}
                <Card className="border-0 shadow-xl bg-gradient-to-r from-[#7da23a] to-[#5a7a28] text-white">
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <p className="text-green-100 text-xs font-semibold uppercase tracking-wider mb-1">Party Report</p>
                        <h2 className="text-xl sm:text-2xl font-bold">{selectedPartyData.vendorName}</h2>
                        <p className="text-green-200 text-sm mt-0.5">{selectedPartyData.firmName}</p>
                      </div>
                      <div className="flex items-start gap-4">
                        {/* Qty summary in header */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                          {[
                            { label: "PO Qty", value: selectedPartyData.totalIndentQty },
                            { label: "Lifted", value: selectedPartyData.totalLiftedQty },
                            { label: "Received", value: selectedPartyData.totalReceivedQty },
                            { label: "Pending", value: selectedPartyData.totalPendingQty },
                          ].map((q) => (
                            <div key={q.label} className="bg-white/10 rounded-lg px-3 py-2">
                              <p className="text-green-100 text-[10px] font-medium">{q.label}</p>
                              <p className="text-white font-bold text-base">{q.value.toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setSelectedParty("all"); setExpandedIndent(null); }}
                          className="bg-white/10 text-white border-white/30 hover:bg-white/20 shrink-0 mt-1"
                        >
                          <ArrowLeft className="h-4 w-4 mr-1" />
                          Back
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Status Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 sm:gap-3">
                  {[
                    { label: "Total", value: selectedPartyData.totalIndents, bg: "bg-gray-50 border-gray-200 text-gray-700", emoji: "📋" },
                    { label: "Critical", value: selectedPartyData.criticalCount, bg: "bg-red-50 border-red-200 text-red-700", emoji: "🔥" },
                    { label: "Lift Pending", value: selectedPartyData.liftsNotDone, bg: "bg-orange-50 border-orange-200 text-orange-700", emoji: "⏳" },
                    { label: "In Transit", value: selectedPartyData.inTransit, bg: "bg-blue-50 border-blue-200 text-blue-700", emoji: "🚛" },
                    { label: "Lab Pending", value: selectedPartyData.labPending, bg: "bg-purple-50 border-purple-200 text-purple-700", emoji: "🧪" },
                    { label: "Accounts", value: selectedPartyData.accountsPending, bg: "bg-amber-50 border-amber-200 text-amber-700", emoji: "📑" },
                    { label: "Done", value: selectedPartyData.doneCount, bg: "bg-green-50 border-green-200 text-green-700", emoji: "✅" },
                  ].map((c) => (
                    <Card key={c.label} className={`border shadow-sm ${c.bg}`}>
                      <CardContent className="p-3 text-center">
                        <p className="text-sm">{c.emoji}</p>
                        <p className="text-xl font-bold">{c.value}</p>
                        <p className="text-xs font-medium mt-0.5 truncate">{c.label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Qty Flow Visual Bar */}
                {selectedPartyData.totalIndentQty > 0 && (
                  <Card className="border-0 shadow-md">
                    <CardContent className="p-4">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Quantity Flow</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {[
                          { label: "PO Qty", value: selectedPartyData.totalIndentQty, color: "bg-gray-200 text-gray-700" },
                          { label: "→ Lifted", value: selectedPartyData.totalLiftedQty, color: "bg-blue-100 text-blue-700" },
                          { label: "→ Received", value: selectedPartyData.totalReceivedQty, color: "bg-green-100 text-green-700" },
                          { label: "= Pending", value: selectedPartyData.totalPendingQty, color: "bg-red-100 text-red-700" },
                        ].map((q) => (
                          <div key={q.label} className={`px-4 py-2 rounded-lg ${q.color} flex items-center gap-2`}>
                            <span className="text-xs font-medium">{q.label}</span>
                            <span className="text-base font-bold">{q.value.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      {/* Lifted progress bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Lift Progress</span>
                          <span>
                            {selectedPartyData.totalIndentQty > 0
                              ? Math.round((selectedPartyData.totalLiftedQty / selectedPartyData.totalIndentQty) * 100)
                              : 0}% lifted
                          </span>
                        </div>
                        <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-400 to-green-500 rounded-full"
                            style={{
                              width: `${selectedPartyData.totalIndentQty > 0
                                ? Math.min(100, Math.round((selectedPartyData.totalLiftedQty / selectedPartyData.totalIndentQty) * 100))
                                : 0}%`
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Indent-wise Detailed Table */}
                <Card className="border-0 shadow-lg">
                  <CardHeader className="p-5 border-b border-gray-100">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-[#7da23a]" />
                      Indent-wise Complete Report
                      <Badge className="ml-2 bg-green-100 text-[#6b8e2f]">{selectedPartyData.indents.length} indents</Badge>
                    </CardTitle>
                    <CardDescription>Row pe click karein → step-by-step detail aur lift status dekhein</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50 hover:bg-gray-50 border-b-2 border-gray-200">
                            <TableHead className="w-7 font-bold text-gray-700"></TableHead>
                            <TableHead className="font-bold text-gray-700 min-w-[120px]">Indent No.</TableHead>
                            <TableHead className="font-bold text-gray-700">Date</TableHead>
                            <TableHead className="font-bold text-gray-700 text-center">Age</TableHead>
                            <TableHead className="font-bold text-gray-700 min-w-[140px]">Material</TableHead>
                            <TableHead className="text-right font-bold text-gray-700">PO Qty</TableHead>
                            <TableHead className="text-right font-bold text-blue-600">Lifted Qty</TableHead>
                            <TableHead className="text-right font-bold text-green-600">Received Qty</TableHead>
                            <TableHead className="text-right font-bold text-red-500">Pending Qty</TableHead>
                            <TableHead className="font-bold text-gray-700 min-w-[120px]">Lift Status</TableHead>
                            <TableHead className="font-bold text-gray-700 min-w-[150px]">Kahan Ruka Hai</TableHead>
                            <TableHead className="font-bold text-gray-700 min-w-[110px]">Progress</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedPartyData.indents.map((indent) => {
                            const pendingIdx = indent.steps.findIndex((s) => !s.done);
                            return (
                              <>
                                <TableRow
                                  key={indent.rlNo}
                                  className={`cursor-pointer border-b border-gray-100 transition-colors ${
                                    indent.urgency === "high"
                                      ? "border-l-4 border-l-red-400 hover:bg-red-50/30"
                                      : indent.urgency === "medium"
                                        ? "border-l-4 border-l-amber-400 hover:bg-amber-50/30"
                                        : "hover:bg-gray-50"
                                  } ${expandedIndent === indent.rlNo ? "bg-green-50" : ""}`}
                                  onClick={() =>
                                    setExpandedIndent(expandedIndent === indent.rlNo ? null : indent.rlNo)
                                  }
                                >
                                  <TableCell className="text-center">
                                    {expandedIndent === indent.rlNo
                                      ? <ChevronUp className="h-4 w-4 text-gray-500 mx-auto" />
                                      : <ChevronDown className="h-4 w-4 text-gray-400 mx-auto" />}
                                  </TableCell>
                                  <TableCell className="font-bold text-[#7da23a]">{indent.rlNo}</TableCell>
                                  <TableCell className="text-gray-600 text-sm whitespace-nowrap">
                                    {indent.date ? format(indent.date, "dd-MMM-yy") : "—"}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {indent.daysOld !== null ? (
                                      <Badge
                                        className={
                                          indent.urgency === "high"
                                            ? "bg-red-100 text-red-700 font-bold text-xs"
                                            : indent.urgency === "medium"
                                              ? "bg-amber-100 text-amber-700 font-semibold text-xs"
                                              : indent.isComplete
                                                ? "bg-gray-100 text-gray-500 text-xs"
                                                : "bg-green-100 text-green-700 text-xs"
                                        }
                                      >
                                        {indent.daysOld}d
                                      </Badge>
                                    ) : "—"}
                                  </TableCell>
                                  <TableCell className="text-gray-800 text-sm max-w-[160px] truncate" title={indent.material || ""}>
                                    {indent.material || "—"}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-gray-900">
                                    {indent.indentQty > 0 ? indent.indentQty.toLocaleString() : "—"}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-blue-700">
                                    {indent.liftedQty > 0 ? indent.liftedQty.toLocaleString() : <span className="text-gray-300">—</span>}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-green-700">
                                    {indent.receivedQty > 0 ? indent.receivedQty.toLocaleString() : <span className="text-gray-300">—</span>}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {indent.pendingQty > 0
                                      ? <span className="font-bold text-red-600">{indent.pendingQty.toLocaleString()}</span>
                                      : <span className="text-green-600 font-medium text-xs">✓ 0</span>}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      className={
                                        indent.liftStatus === "Lift Pending" ? "bg-orange-100 text-orange-700 text-xs"
                                        : indent.liftStatus === "In Transit" ? "bg-blue-100 text-blue-700 text-xs"
                                        : indent.liftStatus === "Lab Pending" ? "bg-purple-100 text-purple-700 text-xs"
                                        : indent.liftStatus === "Tally Pending" ? "bg-amber-100 text-amber-700 text-xs"
                                        : "bg-green-100 text-green-700 text-xs"
                                      }
                                    >
                                      {indent.liftStatus}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {indent.pendingStep ? (
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs">⏳</span>
                                        <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                                          {indent.pendingStep.label}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                                        ✓ Mukammal
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1.5 min-w-[100px]">
                                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full ${
                                            indent.progress === 100 ? "bg-green-500"
                                            : indent.urgency === "high" ? "bg-red-400"
                                            : indent.progress >= 50 ? "bg-[#7da23a]"
                                            : "bg-amber-500"
                                          }`}
                                          style={{ width: `${indent.progress}%` }}
                                        />
                                      </div>
                                      <span className="text-xs font-bold text-gray-600 shrink-0 w-8 text-right">
                                        {indent.progress}%
                                      </span>
                                    </div>
                                  </TableCell>
                                </TableRow>

                                {/* ---- Expanded Detail Row ---- */}
                                {expandedIndent === indent.rlNo && (
                                  <TableRow key={`${indent.rlNo}-exp`}>
                                    <TableCell colSpan={12} className="p-0 bg-slate-50">
                                      <div className="p-4 border-l-4 border-[#7da23a] space-y-4">

                                        {/* Step checklist */}
                                        <div>
                                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                                            Step Progress — {indent.completedSteps}/{indent.steps.length} complete
                                          </p>
                                          <div className="flex flex-wrap gap-1.5">
                                            {indent.steps.map((step, idx) => (
                                              <span
                                                key={idx}
                                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                                                  step.done
                                                    ? "bg-green-50 text-green-700 border-green-200"
                                                    : idx === pendingIdx
                                                      ? "bg-amber-50 text-amber-800 border-amber-400 ring-2 ring-amber-300 font-bold shadow-sm"
                                                      : "bg-white text-gray-400 border-gray-200"
                                                }`}
                                              >
                                                <span>{step.done ? "✓" : idx === pendingIdx ? "⏳" : "○"}</span>
                                                <span>{step.label}</span>
                                              </span>
                                            ))}
                                          </div>
                                        </div>

                                        {/* Lift details table */}
                                        {indent.lifts.length > 0 && (
                                          <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                                              Lift Details — {indent.lifts.length} lift(s)
                                            </p>
                                            <div className="rounded-lg border border-gray-200 overflow-hidden">
                                              <table className="w-full text-xs">
                                                <thead>
                                                  <tr className="bg-gray-100 text-gray-600 font-semibold">
                                                    <th className="px-3 py-2 text-left">Lift No.</th>
                                                    <th className="px-3 py-2 text-left">Date</th>
                                                    <th className="px-3 py-2 text-right">Lifted Qty</th>
                                                    <th className="px-3 py-2 text-right">Received Qty</th>
                                                    <th className="px-3 py-2 text-center">Receipt</th>
                                                    <th className="px-3 py-2 text-center">Bilty</th>
                                                    <th className="px-3 py-2 text-center">Lab</th>
                                                    <th className="px-3 py-2 text-center">Tally</th>
                                                    <th className="px-3 py-2 text-left">Kahan Ruki Hai</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {indent.lifts.map((lift) => {
                                                    const liftPendingAt =
                                                      !lift.actualU ? "Receipt Pending"
                                                      : !lift.actualAE ? "Bilty Pending"
                                                      : !lift.actualAJ ? "Lab Pending"
                                                      : !lift.actualBB ? "Final Tally Pending"
                                                      : "Done";
                                                    return (
                                                      <tr key={lift.id} className="bg-white border-t border-gray-100 hover:bg-blue-50/30">
                                                        <td className="px-3 py-2 font-bold text-[#7da23a]">#{lift.id}</td>
                                                        <td className="px-3 py-2 text-gray-500">
                                                          {lift.date ? format(lift.date, "dd-MMM-yy") : "—"}
                                                        </td>
                                                        <td className="px-3 py-2 text-right font-semibold text-blue-700">
                                                          {lift.liftedQty > 0 ? lift.liftedQty.toLocaleString() : "—"}
                                                        </td>
                                                        <td className="px-3 py-2 text-right font-semibold text-green-700">
                                                          {lift.receivedQty > 0 ? lift.receivedQty.toLocaleString() : "—"}
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                          <span className={lift.actualU ? "text-green-600 font-bold" : "text-red-400"}>
                                                            {lift.actualU ? "✓" : "✗"}
                                                          </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                          <span className={lift.actualAE ? "text-green-600 font-bold" : "text-red-400"}>
                                                            {lift.actualAE ? "✓" : "✗"}
                                                          </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                          <span className={lift.actualAJ ? "text-green-600 font-bold" : "text-red-400"}>
                                                            {lift.actualAJ ? "✓" : "✗"}
                                                          </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                          <span className={lift.actualBB ? "text-green-600 font-bold" : "text-red-400"}>
                                                            {lift.actualBB ? "✓" : "✗"}
                                                          </span>
                                                        </td>
                                                        <td className="px-3 py-2">
                                                          <Badge
                                                            className={liftPendingAt === "Done"
                                                              ? "bg-green-100 text-green-700 text-[10px]"
                                                              : "bg-amber-100 text-amber-800 text-[10px] font-semibold"}
                                                          >
                                                            {liftPendingAt}
                                                          </Badge>
                                                        </td>
                                                      </tr>
                                                    );
                                                  })}
                                                </tbody>
                                              </table>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : null}
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
