import React, { useState, useEffect, useCallback, useMemo, useContext } from "react";
import { supabase } from "../supabase";
import { AuthContext } from "../context/AuthContext";
import { 
  RefreshCw, 
  Filter, 
  Download, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Search,
  ArrowUpDown,
  TrendingUp,
  FileText,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { canViewFirm } from "../utils/firmFilter";

// Helper to parse diverse date formats from Supabase / Google Sheets
const parseDate = (v) => {
  if (!v || String(v).trim() === "" || String(v) === "-") return null;
  try {
    // 1. Google Sheets gviz format: Date(2026, 4, 25, 11, 23, 10)
    const gvizMatch = String(v).match(/^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)/);
    if (gvizMatch) {
      const [, year, month, day, hours, minutes, seconds] = gvizMatch.map(Number);
      // Google Sheets month index is 0-based
      return new Date(year, month, day, hours || 0, minutes || 0, seconds || 0);
    }
    // 2. Serial date format (Excel format)
    if (!isNaN(v) && parseFloat(v) > 30000) {
      const serialNumber = parseFloat(v);
      return new Date((serialNumber - 25569) * 86400 * 1000);
    }
    // 3. ISO / Standard format
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d;
  } catch (e) {
    console.error("Error parsing date:", v, e);
  }
  return null;
};

// Helper to format milliseconds to friendly text (days, hours, minutes)
const formatDuration = (ms) => {
  if (ms === null || ms === undefined || isNaN(ms)) return "-";
  if (ms < 0) ms = 0;
  
  const totalSeconds = Math.floor(ms / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);

  const remainingHours = totalHours % 24;
  const remainingMinutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${remainingHours}h`;
  }
  if (remainingHours > 0) {
    return `${remainingHours}h ${remainingMinutes}m`;
  }
  return `${remainingMinutes}m`;
};

export default function TatReportPage() {
  const { user } = useContext(AuthContext);
  const [lifts, setLifts] = useState([]);
  const [indents, setIndents] = useState([]);
  const [kittings, setKittings] = useState([]);
  const [mismatches, setMismatches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [firmFilter, setFirmFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Sort State
  const [sortField, setSortField] = useState("indentNo");
  const [sortOrder, setSortOrder] = useState("desc");

  // Fetch all necessary tables in parallel
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: liftData, error: liftErr },
        { data: indentData, error: indentErr },
        { data: kittingData, error: kittingErr },
        { data: mismatchData, error: mismatchErr }
      ] = await Promise.all([
        supabase.from("LIFT-ACCOUNTS").select("*").order("Timestamp", { ascending: false }),
        supabase.from("INDENT-PO").select("*").order("Timestamp", { ascending: false }),
        supabase.from("fullkittin").select("*"),
        supabase.from("Mismatch").select("*")
      ]);

      if (liftErr) throw liftErr;
      if (indentErr) throw indentErr;
      if (kittingErr) throw kittingErr;
      if (mismatchErr) throw mismatchErr;

      setLifts(liftData || []);
      setIndents(indentData || []);
      setKittings(kittingData || []);
      setMismatches(mismatchData || []);
    } catch (err) {
      console.error(err);
      toast.error(`Data load failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Combine and map data to calculate TAT durations for each transaction step-by-step
  const processedData = useMemo(() => {
    // Group lifts by Indent Number or PO Number for fast lookup
    const liftsByIndent = {};
    lifts.forEach(lift => {
      const indentNo = String(lift["Indent no."] || "").trim().toLowerCase();
      if (indentNo) {
        if (!liftsByIndent[indentNo]) liftsByIndent[indentNo] = [];
        liftsByIndent[indentNo].push(lift);
      }
    });

    // Group kittings by Lift No, Bilty Number, and Indent No for fast lookup
    const kittingsByLiftNo = {};
    const kittingsByBiltyNo = {};
    const kittingsByIndentNo = {};
    kittings.forEach(k => {
      const liftNo = String(k["Lift No"] || "").trim().toLowerCase();
      const biltyNo = String(k["Bilty Number"] || "").trim().toLowerCase();
      const indentNo = String(k["Indent No"] || "").trim().toLowerCase();
      if (liftNo) kittingsByLiftNo[liftNo] = k;
      if (biltyNo) kittingsByBiltyNo[biltyNo] = k;
      if (indentNo) {
        if (!kittingsByIndentNo[indentNo]) kittingsByIndentNo[indentNo] = [];
        kittingsByIndentNo[indentNo].push(k);
      }
    });

    // Group mismatches by Lift Number / Lift No for fast lookup
    const mismatchesByLiftNo = {};
    mismatches.forEach(m => {
      const liftNo = String(m["Lift Number"] || m["Lift No"] || "").trim().toLowerCase();
      if (liftNo) mismatchesByLiftNo[liftNo] = m;
    });

    const result = [];

    indents.forEach((indent, index) => {
      const indentId = String(indent["Indent Id."] || "").trim();
      const poNumber = String(indent["po_number"] || "").trim();
      const indentKey = indentId.toLowerCase();
      const poKey = poNumber.toLowerCase();

      // Find matching lifts
      const matchingLifts = (indentId && liftsByIndent[indentKey]) || (poNumber && liftsByIndent[poKey]) || [];

      // Extract raw timestamps
      const tIndent = parseDate(indent["Timestamp"]);
      const tPo = parseDate(indent["Actual2"]);
      const tArrange = parseDate(indent["Planned9"]);
      const tLogApp = parseDate(indent["Actual9"]);
      const tPoEntry = parseDate(indent["Actual3"]);

      // Step-by-step durations in INDENT-PO (independent of individual lifts/trucks)
      const durationMakePo = (tIndent && tPo) ? (tPo - tIndent) : null;
      const durationArrange = (tPo && tArrange) ? (tArrange - tPo) : null;
      const durationLogApp = (tArrange && tLogApp) ? (tLogApp - tArrange) : null;
      const durationPoEntry = (tLogApp && tPoEntry) ? (tPoEntry - tLogApp) : null;

      // Base row metadata
      const baseRow = {
        indentId,
        poNumber: poNumber || "-",
        partyName: String(indent["Vendor name"] || indent["Vendor"] || "").trim(),
        productName: String(indent["Material"] || "").trim(),
        firmName: String(indent["Firm Name"] || "").trim(),
        priority: indent["Priority"] || "Planned",
        dateIndent: tIndent,
        
        // INDENT-PO step durations
        durationMakePo,
        durationArrange,
        durationLogApp,
        durationPoEntry,

        // Delays based on thresholds
        isDelayMakePo: durationMakePo > 172800000,      // 2 days
        isDelayArrange: durationArrange > 172800000,    // 2 days
        isDelayLogApp: durationLogApp > 86400000,       // 1 day
        isDelayPoEntry: durationPoEntry > 172800000     // 2 days
      };

      if (matchingLifts.length > 0) {
        // Create a row for each lift
        matchingLifts.forEach(lift => {
          const tLift = parseDate(lift["Timestamp"]);
          const tReceipt = parseDate(lift["Date Of Receiving"]);
          const tTest = parseDate(lift["Date Of Test"]);
          const tBilty = parseDate(lift["Actual 3"]);

          const liftNoKey = String(lift["Lift No"] || "").trim().toLowerCase();
          const biltyNoKey = String(lift["Bilty No."] || "").trim().toLowerCase();
          const indentNoKey = String(lift["Indent no."] || "").trim().toLowerCase();

          const kitting = (liftNoKey && kittingsByLiftNo[liftNoKey]) ||
                          (biltyNoKey && kittingsByBiltyNo[biltyNoKey]) ||
                          (indentNoKey && kittingsByIndentNo[indentNoKey] && kittingsByIndentNo[indentNoKey].find(k => String(k["Bilty Number"] || "").trim().toLowerCase() === biltyNoKey)) ||
                          (indentNoKey && kittingsByIndentNo[indentNoKey] && kittingsByIndentNo[indentNoKey][0]) ||
                          null;

          const mismatch = mismatchesByLiftNo[liftNoKey] || null;

          const tAudit = mismatch ? parseDate(mismatch["Actual2"]) : null;
          const tFullkitting = kitting ? parseDate(kitting["Timestamp"] || kitting["created_at"]) : null;

          // Durations relative to this lift
          const durationLift = (tPoEntry && tLift) ? (tLift - tPoEntry) : null;
          const durationReceipt = (tLift && tReceipt) ? (tReceipt - tLift) : null;
          const durationLab = (tReceipt && tTest) ? (tTest - tReceipt) : null;
          const durationBilty = (tTest && tBilty) ? (tBilty - tTest) : null;
          const durationAudit = (tBilty && tAudit) ? (tAudit - tBilty) : null;
          const durationFullkitting = (tAudit && tFullkitting) ? (tFullkitting - tAudit) : null;

          const isDelayLift = durationLift > 259200000;       // 3 days
          const isDelayReceipt = durationReceipt > 345600000;   // 4 days
          const isDelayLab = durationLab > 172800000;         // 2 days
          const isDelayBilty = durationBilty > 172800000;       // 2 days
          const isDelayAudit = durationAudit > 172800000;       // 2 days
          const isDelayFullkitting = durationFullkitting > 172800000; // 2 days

          const hasAnyDelay = 
            baseRow.isDelayMakePo || 
            baseRow.isDelayArrange || 
            baseRow.isDelayLogApp || 
            baseRow.isDelayPoEntry || 
            isDelayLift || 
            isDelayReceipt || 
            isDelayLab ||
            isDelayBilty ||
            isDelayAudit ||
            isDelayFullkitting;

          result.push({
            ...baseRow,
            id: `lift-${lift.id}`,
            liftNo: lift["Lift No"] || "-",
            durationLift,
            durationReceipt,
            durationLab,
            durationBilty,
            durationAudit,
            durationFullkitting,
            isDelayLift,
            isDelayReceipt,
            isDelayLab,
            isDelayBilty,
            isDelayAudit,
            isDelayFullkitting,
            hasAnyDelay,
            isLifted: true
          });
        });
      } else {
        // No lifts yet, create a single row representing the pending stages
        const hasAnyDelay = 
          baseRow.isDelayMakePo || 
          baseRow.isDelayArrange || 
          baseRow.isDelayLogApp || 
          baseRow.isDelayPoEntry;

        result.push({
          ...baseRow,
          id: `indent-${indent.id || index}`,
          liftNo: "-",
          durationLift: null,
          durationReceipt: null,
          durationLab: null,
          durationBilty: null,
          durationAudit: null,
          durationFullkitting: null,
          isDelayLift: false,
          isDelayReceipt: false,
          isDelayLab: false,
          isDelayBilty: false,
          isDelayAudit: false,
          isDelayFullkitting: false,
          hasAnyDelay,
          isLifted: false
        });
      }
    });

    return result;
  }, [lifts, indents, kittings, mismatches]);

  // Apply firm authorization check & search filters
  const filteredData = useMemo(() => {
    let result = processedData;

    // Firm Auth Filter (based on logged in user permissions)
    if (user?.firmName) {
      const uf = user.firmName;
      if (Array.isArray(uf)) {
        const set = new Set(uf.map((f) => f.toLowerCase()));
        result = result.filter((r) => set.has(r.firmName.toLowerCase()));
      } else if (String(uf).toLowerCase() !== "all") {
        const userFirm = String(uf).toLowerCase();
        result = result.filter((r) => r.firmName.toLowerCase() === userFirm);
      }
    }

    // Dropdown Firm Filter
    if (firmFilter !== "all") {
      result = result.filter(r => r.firmName === firmFilter);
    }

    // Product Filter
    if (productFilter !== "all") {
      result = result.filter(r => r.productName === productFilter);
    }

    // Status Filter (Delay status)
    if (statusFilter !== "all") {
      if (statusFilter === "delayed") {
        result = result.filter(r => r.hasAnyDelay);
      } else if (statusFilter === "on_time") {
        result = result.filter(r => !r.hasAnyDelay);
      }
    }

    // Date Range Filter
    if (fromDate) {
      const f = new Date(fromDate);
      f.setHours(0, 0, 0, 0);
      result = result.filter(r => r.dateIndent && r.dateIndent >= f);
    }
    if (toDate) {
      const t = new Date(toDate);
      t.setHours(23, 59, 59, 999);
      result = result.filter(r => r.dateIndent && r.dateIndent <= t);
    }

    // Text Search Filter
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      result = result.filter(r => 
        r.liftNo.toLowerCase().includes(s) ||
        r.poNumber.toLowerCase().includes(s) ||
        r.partyName.toLowerCase().includes(s) ||
        r.productName.toLowerCase().includes(s) ||
        r.indentId.toLowerCase().includes(s)
      );
    }

    // Sorting
    return result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === "string") {
        return sortOrder === "asc" 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [processedData, firmFilter, productFilter, statusFilter, fromDate, toDate, searchTerm, sortField, sortOrder, user]);

  // Aggregate statistics for the KPI cards (all 10 steps)
  const stats = useMemo(() => {
    let sumMakePo = 0, countMakePo = 0;
    let sumArrange = 0, countArrange = 0;
    let sumLogApp = 0, countLogApp = 0;
    let sumPoEntry = 0, countPoEntry = 0;
    let sumLift = 0, countLift = 0;
    let sumReceipt = 0, countReceipt = 0;
    let sumLab = 0, countLab = 0;
    let sumBilty = 0, countBilty = 0;
    let sumAudit = 0, countAudit = 0;
    let sumFullkitting = 0, countFullkitting = 0;
    let totalDelayed = 0;

    filteredData.forEach(r => {
      if (r.durationMakePo !== null) {
        sumMakePo += r.durationMakePo;
        countMakePo++;
      }
      if (r.durationArrange !== null) {
        sumArrange += r.durationArrange;
        countArrange++;
      }
      if (r.durationLogApp !== null) {
        sumLogApp += r.durationLogApp;
        countLogApp++;
      }
      if (r.durationPoEntry !== null) {
        sumPoEntry += r.durationPoEntry;
        countPoEntry++;
      }
      if (r.durationLift !== null) {
        sumLift += r.durationLift;
        countLift++;
      }
      if (r.durationReceipt !== null) {
        sumReceipt += r.durationReceipt;
        countReceipt++;
      }
      if (r.durationLab !== null) {
        sumLab += r.durationLab;
        countLab++;
      }
      if (r.durationBilty !== null) {
        sumBilty += r.durationBilty;
        countBilty++;
      }
      if (r.durationAudit !== null) {
        sumAudit += r.durationAudit;
        countAudit++;
      }
      if (r.durationFullkitting !== null) {
        sumFullkitting += r.durationFullkitting;
        countFullkitting++;
      }
      if (r.hasAnyDelay) {
        totalDelayed++;
      }
    });

    return {
      avgMakePo: countMakePo > 0 ? sumMakePo / countMakePo : null,
      avgArrange: countArrange > 0 ? sumArrange / countArrange : null,
      avgLogApp: countLogApp > 0 ? sumLogApp / countLogApp : null,
      avgPoEntry: countPoEntry > 0 ? sumPoEntry / countPoEntry : null,
      avgLift: countLift > 0 ? sumLift / countLift : null,
      avgReceipt: countReceipt > 0 ? sumReceipt / countReceipt : null,
      avgLab: countLab > 0 ? sumLab / countLab : null,
      avgBilty: countBilty > 0 ? sumBilty / countBilty : null,
      avgAudit: countAudit > 0 ? sumAudit / countAudit : null,
      avgFullkitting: countFullkitting > 0 ? sumFullkitting / countFullkitting : null,
      totalDelayed,
      totalRecords: filteredData.length
    };
  }, [filteredData]);

  // Dropdown list options
  const firmOptions = useMemo(() => {
    return Array.from(new Set(processedData.map(r => r.firmName).filter(Boolean))).sort();
  }, [processedData]);

  const productOptions = useMemo(() => {
    return Array.from(new Set(processedData.map(r => r.productName).filter(Boolean))).sort();
  }, [processedData]);

  // Sort handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Export report to CSV
  const handleExportCSV = () => {
    try {
      if (filteredData.length === 0) {
        toast.error("No data to export");
        return;
      }

      const headers = [
        "Firm Name",
        "Indent ID",
        "PO Number",
        "Lift No",
        "Party Name",
        "Product Name",
        "Priority",
        "Step 1: Make PO TAT",
        "Step 2: Arrange Logistics TAT",
        "Step 3: Logistics App. TAT",
        "Step 4: PO Entry TAT",
        "Step 5: Lift TAT",
        "Step 6: Receipt TAT",
        "Step 7: Lab TAT",
        "Step 8: Bilty TAT",
        "Step 9: Accounts Audit TAT",
        "Step 10: Fullkitting TAT",
        "Delay Status"
      ];

      const csvRows = filteredData.map(r => [
        r.firmName,
        r.indentId,
        r.poNumber,
        r.liftNo,
        r.partyName,
        r.productName,
        r.priority,
        formatDuration(r.durationMakePo),
        formatDuration(r.durationArrange),
        formatDuration(r.durationLogApp),
        formatDuration(r.durationPoEntry),
        formatDuration(r.durationLift),
        formatDuration(r.durationReceipt),
        formatDuration(r.durationLab),
        formatDuration(r.durationBilty),
        formatDuration(r.durationAudit),
        formatDuration(r.durationFullkitting),
        r.hasAnyDelay ? "Delayed" : "On Time"
      ]);

      const csvContent = [
        headers.join(","),
        ...csvRows.map(row => row.map(val => {
          const s = String(val ?? "").replace(/"/g, '""');
          return s.includes(",") ? `"${s}"` : s;
        }).join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `TAT-Delay-Flow-Report-${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV report exported successfully");
    } catch (err) {
      console.error(err);
      toast.error("CSV Export failed: " + err.message);
    }
  };

  return (
    <div className="w-full min-h-screen p-4 space-y-6 bg-slate-50 sm:p-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-800 flex items-center gap-2">
            <Clock className="w-6 h-6 text-[#7da23a]" />
            TAT & Delay Analysis Dashboard
          </h1>
          <p className="text-sm text-gray-500">
            Monitor Turn Around Time (TAT) step-by-step using exact sidebar names.
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-center">
          <Button 
            onClick={fetchData} 
            variant="outline" 
            size="sm" 
            className="bg-white hover:bg-slate-100 flex items-center gap-1.5"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button 
            onClick={handleExportCSV} 
            size="sm" 
            className="bg-[#7da23a] text-white hover:bg-[#6b8e2f] flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* 10-Step Flow Overview Cards (Average TAT calculated step-by-step) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-3 bg-[#7da23a] rounded-sm inline-block" />
            Step-by-Step Flow Average TAT
          </h2>
          <span className="text-[11px] bg-[#7da23a]/10 text-[#7da23a] px-2 py-0.5 rounded-full font-bold">
            10-Step Pipeline
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          
          {/* Step 1: Make PO */}
          <Card className="border border-gray-200 bg-white shadow-sm rounded-xl">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="inline-block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Step 01
                  </span>
                  <p className="text-xs font-semibold text-gray-600 mt-1">Make PO</p>
                  <h3 className="text-lg font-bold text-gray-800 mt-0.5">
                    {formatDuration(stats.avgMakePo)}
                  </h3>
                </div>
                <div className="p-2 bg-green-50 rounded-lg text-[#7da23a]">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="flex justify-between items-center text-[9px] text-gray-400 mt-3 pt-2 border-t border-gray-100">
                <span className="font-semibold text-slate-500">Indent → PO Created</span>
                <span className="bg-slate-50 border border-slate-100 text-gray-500 px-1.5 py-0.25 rounded font-medium">Limit: 2d</span>
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Arrange Logistics */}
          <Card className="border border-gray-200 bg-white shadow-sm rounded-xl">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="inline-block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Step 02
                  </span>
                  <p className="text-xs font-semibold text-gray-600 mt-1">Arrange Logistics</p>
                  <h3 className="text-lg font-bold text-gray-800 mt-0.5">
                    {formatDuration(stats.avgArrange)}
                  </h3>
                </div>
                <div className="p-2 bg-green-50 rounded-lg text-[#7da23a]">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="flex justify-between items-center text-[9px] text-gray-400 mt-3 pt-2 border-t border-gray-100">
                <span className="font-semibold text-slate-500">PO → Arrange Log.</span>
                <span className="bg-slate-50 border border-slate-100 text-gray-500 px-1.5 py-0.25 rounded font-medium">Limit: 2d</span>
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Logistics App. */}
          <Card className="border border-gray-200 bg-white shadow-sm rounded-xl">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="inline-block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Step 03
                  </span>
                  <p className="text-xs font-semibold text-gray-600 mt-1">Logistics App.</p>
                  <h3 className="text-lg font-bold text-gray-800 mt-0.5">
                    {formatDuration(stats.avgLogApp)}
                  </h3>
                </div>
                <div className="p-2 bg-green-50 rounded-lg text-[#7da23a]">
                  <CheckCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="flex justify-between items-center text-[9px] text-gray-400 mt-3 pt-2 border-t border-gray-100">
                <span className="font-semibold text-slate-500">Arrange → Approved</span>
                <span className="bg-slate-50 border border-slate-100 text-gray-500 px-1.5 py-0.25 rounded font-medium">Limit: 1d</span>
              </div>
            </CardContent>
          </Card>

          {/* Step 4: PO Entry */}
          <Card className="border border-gray-200 bg-white shadow-sm rounded-xl">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="inline-block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Step 04
                  </span>
                  <p className="text-xs font-semibold text-gray-600 mt-1">PO Entry</p>
                  <h3 className="text-lg font-bold text-gray-800 mt-0.5">
                    {formatDuration(stats.avgPoEntry)}
                  </h3>
                </div>
                <div className="p-2 bg-green-50 rounded-lg text-[#7da23a]">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="flex justify-between items-center text-[9px] text-gray-400 mt-3 pt-2 border-t border-gray-100">
                <span className="font-semibold text-slate-500">Logistics App → PO Entry</span>
                <span className="bg-slate-50 border border-slate-100 text-gray-500 px-1.5 py-0.25 rounded font-medium">Limit: 2d</span>
              </div>
            </CardContent>
          </Card>

          {/* Step 5: Lift */}
          <Card className="border border-gray-200 bg-white shadow-sm rounded-xl">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="inline-block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Step 05
                  </span>
                  <p className="text-xs font-semibold text-gray-600 mt-1">Lift</p>
                  <h3 className="text-lg font-bold text-gray-800 mt-0.5">
                    {formatDuration(stats.avgLift)}
                  </h3>
                </div>
                <div className="p-2 bg-green-50 rounded-lg text-[#7da23a]">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="flex justify-between items-center text-[9px] text-gray-400 mt-3 pt-2 border-t border-gray-100">
                <span className="font-semibold text-slate-500">PO Entry → Lifted</span>
                <span className="bg-slate-50 border border-slate-100 text-gray-500 px-1.5 py-0.25 rounded font-medium">Limit: 3d</span>
              </div>
            </CardContent>
          </Card>

          {/* Step 6: Receipt */}
          <Card className="border border-gray-200 bg-white shadow-sm rounded-xl">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="inline-block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Step 06
                  </span>
                  <p className="text-xs font-semibold text-gray-600 mt-1">Receipt</p>
                  <h3 className="text-lg font-bold text-gray-800 mt-0.5">
                    {formatDuration(stats.avgReceipt)}
                  </h3>
                </div>
                <div className="p-2 bg-green-50 rounded-lg text-[#7da23a]">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="flex justify-between items-center text-[9px] text-gray-400 mt-3 pt-2 border-t border-gray-100">
                <span className="font-semibold text-slate-500">Lifted → Received Gate</span>
                <span className="bg-slate-50 border border-slate-100 text-gray-500 px-1.5 py-0.25 rounded font-medium">Limit: 4d</span>
              </div>
            </CardContent>
          </Card>

          {/* Step 7: Lab */}
          <Card className="border border-gray-200 bg-white shadow-sm rounded-xl">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="inline-block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Step 07
                  </span>
                  <p className="text-xs font-semibold text-gray-600 mt-1">Lab</p>
                  <h3 className="text-lg font-bold text-gray-800 mt-0.5">
                    {formatDuration(stats.avgLab)}
                  </h3>
                </div>
                <div className="p-2 bg-green-50 rounded-lg text-[#7da23a]">
                  <CheckCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="flex justify-between items-center text-[9px] text-gray-400 mt-3 pt-2 border-t border-gray-100">
                <span className="font-semibold text-slate-500">Received → Lab Tested</span>
                <span className="bg-slate-50 border border-slate-100 text-gray-500 px-1.5 py-0.25 rounded font-medium">Limit: 2d</span>
              </div>
            </CardContent>
          </Card>

          {/* Step 8: Bilty */}
          <Card className="border border-gray-200 bg-white shadow-sm rounded-xl">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="inline-block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Step 08
                  </span>
                  <p className="text-xs font-semibold text-gray-600 mt-1">Bilty</p>
                  <h3 className="text-lg font-bold text-gray-800 mt-0.5">
                    {formatDuration(stats.avgBilty)}
                  </h3>
                </div>
                <div className="p-2 bg-green-50 rounded-lg text-[#7da23a]">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="flex justify-between items-center text-[9px] text-gray-400 mt-3 pt-2 border-t border-gray-100">
                <span className="font-semibold text-slate-500">Lab Tested → Bilty Ent.</span>
                <span className="bg-slate-50 border border-slate-100 text-gray-500 px-1.5 py-0.25 rounded font-medium">Limit: 2d</span>
              </div>
            </CardContent>
          </Card>

          {/* Step 9: Accounts Audit */}
          <Card className="border border-gray-200 bg-white shadow-sm rounded-xl">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="inline-block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Step 09
                  </span>
                  <p className="text-xs font-semibold text-gray-600 mt-1">Accounts Audit</p>
                  <h3 className="text-lg font-bold text-gray-800 mt-0.5">
                    {formatDuration(stats.avgAudit)}
                  </h3>
                </div>
                <div className="p-2 bg-green-50 rounded-lg text-[#7da23a]">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="flex justify-between items-center text-[9px] text-gray-400 mt-3 pt-2 border-t border-gray-100">
                <span className="font-semibold text-slate-500">Bilty Entered → Audited</span>
                <span className="bg-slate-50 border border-slate-100 text-gray-500 px-1.5 py-0.25 rounded font-medium">Limit: 2d</span>
              </div>
            </CardContent>
          </Card>

          {/* Step 10: Fullkitting */}
          <Card className="border border-gray-200 bg-white shadow-sm rounded-xl">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="inline-block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Step 10
                  </span>
                  <p className="text-xs font-semibold text-gray-600 mt-1">Fullkitting</p>
                  <h3 className="text-lg font-bold text-gray-800 mt-0.5">
                    {formatDuration(stats.avgFullkitting)}
                  </h3>
                </div>
                <div className="p-2 bg-green-50 rounded-lg text-[#7da23a]">
                  <CheckCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="flex justify-between items-center text-[9px] text-gray-400 mt-3 pt-2 border-t border-gray-100">
                <span className="font-semibold text-slate-500">Audited → Fullkitted</span>
                <span className="bg-slate-50 border border-slate-100 text-gray-500 px-1.5 py-0.25 rounded font-medium">Limit: 2d</span>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Filter panel */}
      <Card className="shadow-sm">
        <CardHeader className="py-4 border-b">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <Filter className="w-4 h-4" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="firm-filter" className="text-xs text-gray-600">Firm Name</Label>
            <select
              id="firm-filter"
              value={firmFilter}
              onChange={(e) => setFirmFilter(e.target.value)}
              className="h-9 px-3 text-xs bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#7da23a]"
            >
              <option value="all">All Firms</option>
              {firmOptions.map(firm => (
                <option key={firm} value={firm}>{firm}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="product-filter" className="text-xs text-gray-600">Raw Material</Label>
            <select
              id="product-filter"
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="h-9 px-3 text-xs bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#7da23a]"
            >
              <option value="all">All Products</option>
              {productOptions.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="status-filter" className="text-xs text-gray-600">Delay Status</Label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 text-xs bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#7da23a]"
            >
              <option value="all">All Statuses</option>
              <option value="delayed">Delayed Steps Only</option>
              <option value="on_time">On Time Only</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="from-date" className="text-xs text-gray-600">From Date</Label>
            <Input
              id="from-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 text-xs focus:ring-1 focus:ring-[#7da23a]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="to-date" className="text-xs text-gray-600">To Date</Label>
            <Input
              id="to-date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 text-xs focus:ring-1 focus:ring-[#7da23a]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="search-input" className="text-xs text-gray-600">Search</Label>
            <div className="relative">
              <Input
                id="search-input"
                type="text"
                placeholder="Search Lift/PO/Indent..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pr-8 text-xs focus:ring-1 focus:ring-[#7da23a]"
              />
              <Search className="absolute right-2.5 top-2.5 w-4 h-4 text-gray-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Table Card */}
      <Card className="shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-gray-200 text-gray-700 text-[10px] font-bold uppercase tracking-wider">
                <th className="py-3 px-3 cursor-pointer hover:bg-slate-200 w-[160px]" onClick={() => handleSort("indentNo")}>
                  <div className="flex items-center gap-1">
                    Indent / PO / Lift
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3 cursor-pointer hover:bg-slate-200 w-[140px]" onClick={() => handleSort("partyName")}>
                  <div className="flex items-center gap-1">
                    Party / Product
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                
                {/* 10 Process Step Headers */}
                <th className="py-3 px-2 cursor-pointer hover:bg-slate-200 text-center" onClick={() => handleSort("durationMakePo")}>
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] text-gray-400 font-normal">Step 1</span>
                    <span className="flex items-center gap-0.5">Make PO <ArrowUpDown className="w-2.5 h-2.5" /></span>
                  </div>
                </th>
                <th className="py-3 px-2 cursor-pointer hover:bg-slate-200 text-center" onClick={() => handleSort("durationArrange")}>
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] text-gray-400 font-normal">Step 2</span>
                    <span className="flex items-center gap-0.5">Arrange Logistics <ArrowUpDown className="w-2.5 h-2.5" /></span>
                  </div>
                </th>
                <th className="py-3 px-2 cursor-pointer hover:bg-slate-200 text-center" onClick={() => handleSort("durationLogApp")}>
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] text-gray-400 font-normal">Step 3</span>
                    <span className="flex items-center gap-0.5">Logistics App. <ArrowUpDown className="w-2.5 h-2.5" /></span>
                  </div>
                </th>
                <th className="py-3 px-2 cursor-pointer hover:bg-slate-200 text-center" onClick={() => handleSort("durationPoEntry")}>
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] text-gray-400 font-normal">Step 4</span>
                    <span className="flex items-center gap-0.5">PO Entry <ArrowUpDown className="w-2.5 h-2.5" /></span>
                  </div>
                </th>
                <th className="py-3 px-2 cursor-pointer hover:bg-slate-200 text-center" onClick={() => handleSort("durationLift")}>
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] text-gray-400 font-normal">Step 5</span>
                    <span className="flex items-center gap-0.5">Lift <ArrowUpDown className="w-2.5 h-2.5" /></span>
                  </div>
                </th>
                <th className="py-3 px-2 cursor-pointer hover:bg-slate-200 text-center" onClick={() => handleSort("durationReceipt")}>
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] text-gray-400 font-normal">Step 6</span>
                    <span className="flex items-center gap-0.5">Receipt <ArrowUpDown className="w-2.5 h-2.5" /></span>
                  </div>
                </th>
                <th className="py-3 px-2 cursor-pointer hover:bg-slate-200 text-center" onClick={() => handleSort("durationLab")}>
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] text-gray-400 font-normal">Step 7</span>
                    <span className="flex items-center gap-0.5">Lab <ArrowUpDown className="w-2.5 h-2.5" /></span>
                  </div>
                </th>
                <th className="py-3 px-2 cursor-pointer hover:bg-slate-200 text-center" onClick={() => handleSort("durationBilty")}>
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] text-gray-400 font-normal">Step 8</span>
                    <span className="flex items-center gap-0.5">Bilty <ArrowUpDown className="w-2.5 h-2.5" /></span>
                  </div>
                </th>
                <th className="py-3 px-2 cursor-pointer hover:bg-slate-200 text-center" onClick={() => handleSort("durationAudit")}>
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] text-gray-400 font-normal">Step 9</span>
                    <span className="flex items-center gap-0.5">Accounts Audit <ArrowUpDown className="w-2.5 h-2.5" /></span>
                  </div>
                </th>
                <th className="py-3 px-2 cursor-pointer hover:bg-slate-200 text-center" onClick={() => handleSort("durationFullkitting")}>
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] text-gray-400 font-normal">Step 10</span>
                    <span className="flex items-center gap-0.5">Fullkitting <ArrowUpDown className="w-2.5 h-2.5" /></span>
                  </div>
                </th>
                
                <th className="py-3 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="13" className="py-10 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#7da23a] mb-2" />
                    Calculating durations and loading details...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="13" className="py-10 text-center text-gray-500">
                    No transactions matching your criteria were found.
                  </td>
                </tr>
              ) : (
                filteredData.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-gray-900">Indent: {r.indentId}</div>
                      <div className="text-[10px] text-gray-500">PO: {r.poNumber}</div>
                      {r.isLifted ? (
                        <div className="text-[10px] text-[#7da23a] font-semibold">Lift No: {r.liftNo}</div>
                      ) : (
                        <div className="text-[10px] text-amber-600 italic">Pending Lift</div>
                      )}
                      <span className="inline-block mt-1 px-1.5 py-0.25 rounded text-[9px] font-semibold bg-slate-100 text-gray-600">
                        {r.firmName}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-gray-900 truncate max-w-[125px]" title={r.partyName}>{r.partyName}</div>
                      <div className="text-gray-500 text-[10px] truncate max-w-[125px]" title={r.productName}>{r.productName}</div>
                    </td>
                    
                    {/* Step 1: Make PO */}
                    <td className="py-3 px-2 text-center">
                      <div className={`font-semibold ${r.isDelayMakePo ? "text-red-500" : "text-gray-900"}`}>
                        {formatDuration(r.durationMakePo)}
                      </div>
                      {r.isDelayMakePo && (
                        <span className="text-[8px] text-red-500 block mt-0.5 font-medium">Delay</span>
                      )}
                    </td>

                    {/* Step 2: Arrange Logistics */}
                    <td className="py-3 px-2 text-center">
                      <div className={`font-semibold ${r.isDelayArrange ? "text-red-500" : "text-gray-900"}`}>
                        {formatDuration(r.durationArrange)}
                      </div>
                      {r.isDelayArrange && (
                        <span className="text-[8px] text-red-500 block mt-0.5 font-medium">Delay</span>
                      )}
                    </td>

                    {/* Step 3: Logistics App. */}
                    <td className="py-3 px-2 text-center">
                      <div className={`font-semibold ${r.isDelayLogApp ? "text-red-500" : "text-gray-900"}`}>
                        {formatDuration(r.durationLogApp)}
                      </div>
                      {r.isDelayLogApp && (
                        <span className="text-[8px] text-red-500 block mt-0.5 font-medium">Delay</span>
                      )}
                    </td>

                    {/* Step 4: PO Entry */}
                    <td className="py-3 px-2 text-center">
                      <div className={`font-semibold ${r.isDelayPoEntry ? "text-red-500" : "text-gray-900"}`}>
                        {formatDuration(r.durationPoEntry)}
                      </div>
                      {r.isDelayPoEntry && (
                        <span className="text-[8px] text-red-500 block mt-0.5 font-medium">Delay</span>
                      )}
                    </td>

                    {/* Step 5: Lift */}
                    <td className="py-3 px-2 text-center">
                      <div className={`font-semibold ${r.isDelayLift ? "text-red-500" : "text-gray-900"}`}>
                        {formatDuration(r.durationLift)}
                      </div>
                      {r.isDelayLift && (
                        <span className="text-[8px] text-red-500 block mt-0.5 font-medium">Delay</span>
                      )}
                    </td>

                    {/* Step 6: Receipt */}
                    <td className="py-3 px-2 text-center">
                      <div className={`font-semibold ${r.isDelayReceipt ? "text-red-500" : "text-gray-900"}`}>
                        {formatDuration(r.durationReceipt)}
                      </div>
                      {r.isDelayReceipt && (
                        <span className="text-[8px] text-red-500 block mt-0.5 font-medium">Delay</span>
                      )}
                    </td>

                    {/* Step 7: Lab */}
                    <td className="py-3 px-2 text-center">
                      <div className={`font-semibold ${r.isDelayLab ? "text-red-500" : "text-gray-900"}`}>
                        {formatDuration(r.durationLab)}
                      </div>
                      {r.isDelayLab && (
                        <span className="text-[8px] text-red-500 block mt-0.5 font-medium">Delay</span>
                      )}
                    </td>

                    {/* Step 8: Bilty */}
                    <td className="py-3 px-2 text-center">
                      <div className={`font-semibold ${r.isDelayBilty ? "text-red-500" : "text-gray-900"}`}>
                        {formatDuration(r.durationBilty)}
                      </div>
                      {r.isDelayBilty && (
                        <span className="text-[8px] text-red-500 block mt-0.5 font-medium">Delay</span>
                      )}
                    </td>

                    {/* Step 9: Accounts Audit */}
                    <td className="py-3 px-2 text-center">
                      <div className={`font-semibold ${r.isDelayAudit ? "text-red-500" : "text-gray-900"}`}>
                        {formatDuration(r.durationAudit)}
                      </div>
                      {r.isDelayAudit && (
                        <span className="text-[8px] text-red-500 block mt-0.5 font-medium">Delay</span>
                      )}
                    </td>

                    {/* Step 10: Fullkitting */}
                    <td className="py-3 px-2 text-center">
                      <div className={`font-semibold ${r.isDelayFullkitting ? "text-red-500" : "text-gray-900"}`}>
                        {formatDuration(r.durationFullkitting)}
                      </div>
                      {r.isDelayFullkitting && (
                        <span className="text-[8px] text-red-500 block mt-0.5 font-medium">Delay</span>
                      )}
                    </td>

                    {/* Overall Status Badge */}
                    <td className="py-3 px-3 text-center">
                      {r.hasAnyDelay ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-red-100 text-red-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                          Delayed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-green-100 text-green-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                          On Time
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
