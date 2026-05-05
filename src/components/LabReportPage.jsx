"use client";
import { useState, useEffect, useCallback, useContext } from "react";
import { supabase } from "../supabase";
import { AuthContext } from "../context/AuthContext";
import { RefreshCw, Filter, X, Download, Settings, Check, FileDown } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const COLUMN_GROUPS = [
  {
    label: "Lift & PO Information",
    color: "bg-indigo-700",
    columns: [
      { id: "liftNo", label: "Lift Number" },
      { id: "poNumber", label: "PO Number" },
      { id: "billNo", label: "Bill No." },
      { id: "partyName", label: "Party Name" },
      { id: "productName", label: "Product Name" },
      { id: "qty", label: "Qty" },
      { id: "truckNo", label: "Truck Number" },
      { id: "poAlumina", label: "PO-Alumina %" },
      { id: "poIron", label: "PO-Iron %" },
      { id: "poMoisture", label: "PO-Moisture %" },
      { id: "poBd", label: "PO-BD %" },
      { id: "poAp", label: "PO-AP %" },
      { id: "poSieve", label: "PO-Sieve Analysis" },
      { id: "poLoi", label: "PO-LOI %" },
      { id: "poSio2", label: "PO-SIO2 %" },
      { id: "poCao", label: "PO-CaO %" },
      { id: "poMgo", label: "PO-MgO %" },
      { id: "poTio2", label: "PO-TiO2 %" },
      { id: "poKna2o", label: "PO-K2O+Na2O %" },
    ]
  },
  {
    label: "Test",
    color: "bg-amber-600",
    columns: [
      { id: "status", label: "Status" },
      { id: "dateOfTest", label: "Date Of Test" },
    ]
  },
  {
    label: "Lab Test Results",
    color: "bg-teal-700",
    columns: [
      { id: "moisture", label: "Moisture %" },
      { id: "bd", label: "BD %" },
      { id: "ap", label: "AP %" },
      { id: "alumina", label: "Alumina %" },
      { id: "iron", label: "Iron %" },
      { id: "sieve", label: "Sieve Analysis" },
      { id: "loi", label: "LOI %" },
      { id: "sio2", label: "SIO2 %" },
      { id: "cao", label: "CaO %" },
      { id: "mgo", label: "MgO %" },
      { id: "tio2", label: "TiO2 %" },
      { id: "kna2o", label: "K2O + Na2O %" },
      { id: "freeIron", label: "Free Iron %" },
      { id: "tl", label: "TL" },
    ]
  }
];

const month_abbr = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const fmtDate = (v) => {
  if (!v) return "-";
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return `${String(d.getDate()).padStart(2,"0")}-${month_abbr[d.getMonth()]}-${d.getFullYear()}`;
  } catch { return String(v); }
};

const num = (v) => (v !== "" && v !== null && v !== undefined ? parseFloat(v) : null);

// Green: actual >= expected | Red: actual < expected | no color if either empty
const qualityColor = (actual, expected, lowerIsBetter = false) => {
  const a = num(actual), e = num(expected);
  if (a === null || e === null) return "";
  if (lowerIsBetter) {
    return a <= e ? "bg-green-200 text-green-900" : "bg-red-200 text-red-900";
  }
  return a >= e ? "bg-green-200 text-green-900" : "bg-red-200 text-red-900";
};

const TH = ({ children, className = "" }) => (
  <th className={`border border-gray-300 px-2 py-1.5 text-center text-[11px] font-semibold whitespace-nowrap ${className}`}>
    {children}
  </th>
);

const TD = ({ children, className = "" }) => (
  <td className={`border border-gray-200 px-2 py-1 text-[11px] whitespace-nowrap ${className}`}>
    {children}
  </td>
);

export default function LabReportPage() {
  const { user } = useContext(AuthContext);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [firmFilter, setFirmFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showColSettings, setShowColSettings] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const all = {};
    COLUMN_GROUPS.forEach(g => g.columns.forEach(c => all[c.id] = true));
    return all;
  });

  const toggleColumn = (id) => {
    setVisibleColumns(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: liftData, error: liftErr }, { data: poData, error: poErr }] = await Promise.all([
        supabase
          .from("LIFT-ACCOUNTS")
          .select("*")
          .order("Timestamp", { ascending: false }),
        supabase
          .from("INDENT-PO")
          .select("*"),
      ]);

      if (liftErr) throw liftErr;
      if (poErr) throw poErr;

      const poMap = {};
      (poData || []).forEach((row) => {
        const key = String(row["Indent Id."] || "").trim().toLowerCase();
        if (key) poMap[key] = row;
      });

      const findPo = (indentNo) => {
        if (!indentNo) return null;
        const key = String(indentNo).trim().toLowerCase();
        
        // 1. Direct match with Indent Id.
        let match = Object.values(poMap).find(r => String(r["Indent Id."] || "").trim().toLowerCase() === key);
        if (match) return match;
        
        // 2. Direct match with po_number
        match = Object.values(poMap).find(r => String(r["po_number"] || "").trim().toLowerCase() === key);
        if (match) return match;

        // 3. Match numeric part
        const numPart = key.match(/\d+/)?.[0];
        if (!numPart) return null;
        return Object.values(poMap).find((r) => {
          const k1 = String(r["Indent Id."] || "").trim().toLowerCase();
          const k2 = String(r["po_number"] || "").trim().toLowerCase();
          return k1.match(/\d+/)?.[0] === numPart || k2.match(/\d+/)?.[0] === numPart;
        }) || null;
      };

      let data = (liftData || []).map((row) => {
        const indentNo = String(row["Indent no."] || "").trim();
        const poRow = findPo(indentNo);
        const g = (f1, f2) => {
          if (!poRow) return "";
          const val = poRow[f1] ?? poRow[f2] ?? "";
          return String(val).trim();
        };
        return {
          liftNo:      String(row["Lift No"] || "").trim(),
          poNumber:    indentNo,
          billNo:      String(row["Bill No."] || "").trim(),
          partyName:   String(row["Vendor Name"] || "").trim(),
          productName: String(row["Raw Material Name"] || "").trim(),
          qty:         String(row["Qty"] || "").trim(),
          truckNo:     String(row["Truck No."] || "").trim(),
          // PO reference values
          poAlumina:   g("Alumina %"),
          poIron:      g("Iron %"),
          poMoisture:  g("Moisture %", "Moisture Percent Age %"),
          poBd:        g("BD %", "BD Percent Age %"),
          poAp:        g("AP %", "AP Percent Age %"),
          poSieve:     g("Sieve Analysis"),
          poLoi:       g("LOI %"),
          poSio2:      g("SIO2 %"),
          poCao:       g("CaO %"),
          poMgo:       g("MgO %"),
          poTio2:      g("TiO2 %"),
          poKna2o:     g("K2O + Na2O %", "K2O+Na2O %"),
          // Lab results
          status:      String(row["Status"] || "").trim(),
          dateOfTest:  row["Date Of Test"] || "",
          moisture:    String(row["Moisture Percent Age %"] || "").trim(),
          bd:          String(row["BD Percent Age %"] || "").trim(),
          ap:          String(row["AP Percent Age %"] || "").trim(),
          alumina:     String(row["Alumina Percent Age %"] || "").trim(),
          iron:        String(row["Iron Percent Age %"] || "").trim(),
          sieve:       String(row["Sieve Analysis"] || "").trim(),
          loi:         String(row["LOI %"] || "").trim(),
          sio2:        String(row["SIO2 %"] || "").trim(),
          cao:         String(row["CaO %"] || "").trim(),
          mgo:         String(row["MgO %"] || "").trim(),
          tio2:        String(row["TiO2 %"] || "").trim(),
          kna2o:       String(row["K2O + Na2O %"] || "").trim(),
          freeIron:    String(row["Free Iron %"] || "").trim(),
          tl:          String(row["TL"] || row["Thermal Load"] || "").trim(),
          firmName:    String(row["Firm Name"] || (poRow ? poRow["Firm Name"] : "") || "").trim(),
          timestamp:   row["Timestamp"] || "",
        };
      });

      // User-level firm filter
      if (user?.firmName) {
        const uf = user.firmName;
        if (Array.isArray(uf)) {
          const set = new Set(uf.map((f) => f.toLowerCase()));
          data = data.filter((r) => set.has(r.firmName.toLowerCase()));
        } else if (String(uf).toLowerCase() !== "all") {
          const userFirm = String(uf).toLowerCase();
          data = data.filter((r) => r.firmName.toLowerCase() === userFirm);
        }
      }

      setRows(data);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to load data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const firmOptions = ["all", ...Array.from(new Set(rows.map((r) => r.firmName).filter(Boolean))).sort()];

  const filtered = rows.filter((r) => {
    if (firmFilter !== "all" && r.firmName !== firmFilter) return false;
    
    if (fromDate) {
      const f = new Date(fromDate);
      f.setHours(0,0,0,0);
      const rowDate = new Date(r.timestamp);
      if (rowDate < f) return false;
    }
    if (toDate) {
      const t = new Date(toDate);
      t.setHours(23,59,59,999);
      const rowDate = new Date(r.timestamp);
      if (rowDate > t) return false;
    }

    if (!search) return true;
    const s = search.toLowerCase();
    return (
      r.liftNo.toLowerCase().includes(s) ||
      r.poNumber.toLowerCase().includes(s) ||
      r.billNo.toLowerCase().includes(s) ||
      r.partyName.toLowerCase().includes(s) ||
      r.productName.toLowerCase().includes(s)
    );
  });

  const tested = filtered.filter((r) => r.status.toLowerCase() === "tested" || r.alumina !== "").length;
  const notTested = filtered.length - tested;

  const exportPdf = () => {
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
      
      // Get visible columns
      const visibleCols = [];
      COLUMN_GROUPS.forEach(g => {
        g.columns.forEach(c => {
          if (visibleColumns[c.id]) visibleCols.push(c);
        });
      });

      if (visibleCols.length === 0) {
        toast.error("No columns selected for export");
        return;
      }

      const headers = visibleCols.map(c => c.label);
      const data = filtered.map(r => {
        return visibleCols.map(c => {
          if (c.id === "dateOfTest") return r.dateOfTest ? fmtDate(r.dateOfTest) : "-";
          if (c.id === "status") {
            const isTested = r.status.toLowerCase() === "tested" || r.alumina !== "" || r.iron !== "";
            return isTested ? "Tested" : "Not Tested";
          }
          if (c.id === "sieve" || c.id === "poSieve") return r[c.id] ? "Link" : "-";
          return r[c.id] || "-";
        });
      });

      doc.setFontSize(16);
      doc.text("Lab Report", 14, 15);
      doc.setFontSize(8);
      doc.setTextColor(100);
      let filterText = `Firm: ${firmFilter === "all" ? "All" : firmFilter}`;
      if (fromDate || toDate) {
        filterText += ` | Range: ${fromDate || 'Start'} to ${toDate || 'End'}`;
      }
      doc.text(`Generated on: ${new Date().toLocaleString()} | ${filterText}`, 14, 22);

      autoTable(doc, {
        head: [headers],
        body: data,
        startY: 25,
        styles: { fontSize: 7, cellPadding: 1, lineWidth: 0.1, lineColor: [200, 200, 200] },
        headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        didParseCell: (data) => {
          if (data.section === 'body') {
            const col = visibleCols[data.column.index];
            const rowData = filtered[data.row.index];
            
            // Color logic for Alumina
            if (col.id === "alumina") {
              const a = num(rowData.alumina);
              const e = num(rowData.poAlumina);
              if (a !== null && e !== null) {
                if (a >= e) {
                  data.cell.styles.fillColor = [220, 252, 231]; // green-100
                  data.cell.styles.textColor = [21, 128, 61];   // green-700
                } else {
                  data.cell.styles.fillColor = [254, 226, 226]; // red-100
                  data.cell.styles.textColor = [185, 28, 28];   // red-700
                }
              }
            }
            // Color logic for Iron
            if (col.id === "iron") {
              const a = num(rowData.iron);
              const e = num(rowData.poIron);
              if (a !== null && e !== null) {
                if (a >= e) {
                  data.cell.styles.fillColor = [220, 252, 231];
                  data.cell.styles.textColor = [21, 128, 61];
                } else {
                  data.cell.styles.fillColor = [254, 226, 226];
                  data.cell.styles.textColor = [185, 28, 28];
                }
              }
            }
            // Color logic for Status
            if (col.id === "status") {
              const isTested = rowData.status.toLowerCase() === "tested" || rowData.alumina !== "" || rowData.iron !== "";
              if (isTested) {
                data.cell.styles.textColor = [21, 128, 61];
              } else {
                data.cell.styles.textColor = [107, 114, 128];
              }
            }
          }
        }
      });

      doc.save(`lab-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("PDF exported successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export PDF: " + err.message);
    }
  };

  return (
    <div className="p-4 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Lab Report</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Lift & PO data combined with Lab Test results &nbsp;|&nbsp;
            <span className="text-green-600 font-medium">{tested} Tested</span> &nbsp;|&nbsp;
            <span className="text-gray-500 font-medium">{notTested} Not Tested</span> &nbsp;|&nbsp;
            Total: {filtered.length}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Firm filter */}
          <select
            value={firmFilter}
            onChange={(e) => setFirmFilter(e.target.value)}
            className="py-1.5 px-2 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
          >
            {firmOptions.map((f) => (
              <option key={f} value={f}>{f === "all" ? "All Firms" : f}</option>
            ))}
          </select>

          {/* Date Range */}
          <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg px-2 py-1">
            <span className="text-[10px] text-gray-400 font-medium">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="text-xs focus:outline-none bg-transparent"
            />
            <span className="text-[10px] text-gray-400 font-medium ml-1">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="text-xs focus:outline-none bg-transparent"
            />
            {(fromDate || toDate) && (
              <button onClick={() => { setFromDate(""); setToDate(""); }} className="ml-1">
                <X className="h-3 w-3 text-gray-400 hover:text-red-500" />
              </button>
            )}
          </div>
          {/* Search */}
          <div className="relative">
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search lift, PO, party..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-8 py-1.5 text-xs border border-gray-300 rounded-lg w-48 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="h-3.5 w-3.5 text-gray-400" />
              </button>
            )}
          </div>
          {/* Export */}
          <button
            onClick={exportPdf}
            disabled={loading || filtered.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <FileDown className="h-3.5 w-3.5" />
            Export PDF
          </button>
          {/* Refresh */}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          
          {/* Column Settings */}
          <div className="relative">
            <button
              onClick={() => setShowColSettings(!showColSettings)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg transition-colors ${
                showColSettings ? "bg-gray-800 text-white border-gray-800" : "bg-white border-gray-300 hover:bg-gray-50"
              }`}
            >
              <Settings className="h-3.5 w-3.5" />
              Columns
            </button>
            
            {showColSettings && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowColSettings(false)} />
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-30 overflow-hidden">
                  <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <span className="font-bold text-xs text-gray-700">Column Visibility</span>
                    <button onClick={() => setShowColSettings(false)}><X className="h-4 w-4 text-gray-400" /></button>
                  </div>
                  <div className="max-h-96 overflow-y-auto p-2">
                    {COLUMN_GROUPS.map(group => (
                      <div key={group.label} className="mb-4 last:mb-0">
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          {group.label}
                        </div>
                        <div className="space-y-1 mt-1">
                          {group.columns.map(col => (
                            <button
                              key={col.id}
                              onClick={() => toggleColumn(col.id)}
                              className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-gray-50 text-xs transition-colors"
                            >
                              <span className={visibleColumns[col.id] ? "text-gray-800" : "text-gray-400 line-through"}>
                                {col.label}
                              </span>
                              {visibleColumns[col.id] && <Check className="h-3.5 w-3.5 text-green-600" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-2 border-t border-gray-100 bg-gray-50 flex gap-2">
                    <button 
                      onClick={() => {
                        const all = {};
                        COLUMN_GROUPS.forEach(g => g.columns.forEach(c => all[c.id] = true));
                        setVisibleColumns(all);
                      }}
                      className="flex-1 py-1 text-[10px] bg-white border border-gray-200 rounded hover:bg-gray-100 font-medium"
                    >
                      Show All
                    </button>
                    <button 
                      onClick={() => {
                        const none = {};
                        COLUMN_GROUPS.forEach(g => g.columns.forEach(c => none[c.id] = false));
                        setVisibleColumns(none);
                      }}
                      className="flex-1 py-1 text-[10px] bg-white border border-gray-200 rounded hover:bg-gray-100 font-medium"
                    >
                      Hide All
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-3 flex flex-wrap gap-3 text-[11px]">
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-green-200 inline-block" /> Pass — Actual ≥ PO %</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-red-200 inline-block" /> Fail — Actual &lt; PO %</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-auto" style={{ maxHeight: "calc(100vh - 210px)" }}>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-green-500" />
            <span className="ml-3 text-gray-500">Loading report...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-400">No data found</div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10">
              {/* Group row */}
              <tr>
                {COLUMN_GROUPS.map(group => {
                  const visibleInGroup = group.columns.filter(c => visibleColumns[c.id]).length;
                  if (visibleInGroup === 0) return null;
                  return (
                    <th key={group.label} colSpan={visibleInGroup} className={`border border-gray-300 ${group.color} text-white text-center text-[11px] font-bold px-2 py-1.5`}>
                      {group.label}
                    </th>
                  );
                })}
              </tr>
              {/* Column row */}
              <tr className="bg-gray-100">
                {visibleColumns.liftNo && <TH>LN-Lift Number</TH>}
                {visibleColumns.poNumber && <TH>Po Number</TH>}
                {visibleColumns.billNo && <TH>Bill No.</TH>}
                {visibleColumns.partyName && <TH>Party Name</TH>}
                {visibleColumns.productName && <TH>Product Name</TH>}
                {visibleColumns.qty && <TH>Qty</TH>}
                {visibleColumns.truckNo && <TH>Truck Number</TH>}
                {visibleColumns.poAlumina && <TH>PO-Alumina %</TH>}
                {visibleColumns.poIron && <TH>PO-Iron %</TH>}
                {visibleColumns.poMoisture && <TH>PO-Moisture %</TH>}
                {visibleColumns.poBd && <TH>PO-BD %</TH>}
                {visibleColumns.poAp && <TH>PO-AP %</TH>}
                {visibleColumns.poSieve && <TH>PO-Sieve Analysis</TH>}
                {visibleColumns.poLoi && <TH>PO-LOI %</TH>}
                {visibleColumns.poSio2 && <TH>PO-SIO2 %</TH>}
                {visibleColumns.poCao && <TH>PO-CaO %</TH>}
                {visibleColumns.poMgo && <TH>PO-MgO %</TH>}
                {visibleColumns.poTio2 && <TH>PO-TiO2 %</TH>}
                {visibleColumns.poKna2o && <TH>PO-K2O+Na2O %</TH>}
                {visibleColumns.status && <TH className="bg-amber-50">Status</TH>}
                {visibleColumns.dateOfTest && <TH className="bg-amber-50">Date Of Test</TH>}
                {visibleColumns.moisture && <TH className="bg-teal-50">Moisture %</TH>}
                {visibleColumns.bd && <TH className="bg-teal-50">BD %</TH>}
                {visibleColumns.ap && <TH className="bg-teal-50">AP %</TH>}
                {visibleColumns.alumina && <TH className="bg-teal-50">Alumina %</TH>}
                {visibleColumns.iron && <TH className="bg-teal-50">Iron %</TH>}
                {visibleColumns.sieve && <TH className="bg-teal-50">Sieve Analysis</TH>}
                {visibleColumns.loi && <TH className="bg-teal-50">LOI %</TH>}
                {visibleColumns.sio2 && <TH className="bg-teal-50">SIO2 %</TH>}
                {visibleColumns.cao && <TH className="bg-teal-50">CaO %</TH>}
                {visibleColumns.mgo && <TH className="bg-teal-50">MgO %</TH>}
                {visibleColumns.tio2 && <TH className="bg-teal-50">TiO2 %</TH>}
                {visibleColumns.kna2o && <TH className="bg-teal-50">K2O + Na2O %</TH>}
                {visibleColumns.freeIron && <TH className="bg-teal-50">Free Iron %</TH>}
                {visibleColumns.tl && <TH className="bg-teal-50">TL</TH>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => {
                const isTested = row.status.toLowerCase() === "tested" || row.alumina !== "" || row.iron !== "";
                const rowBg = i % 2 === 0 ? "bg-white" : "bg-gray-50";
                return (
                  <tr key={i} className={`${rowBg} hover:bg-blue-50/40`}>
                    {visibleColumns.liftNo && <TD className="font-medium text-indigo-700">{row.liftNo || "-"}</TD>}
                    {visibleColumns.poNumber && <TD>{row.poNumber || "-"}</TD>}
                    {visibleColumns.billNo && <TD>{row.billNo || "-"}</TD>}
                    {visibleColumns.partyName && <TD className="max-w-[140px] truncate" title={row.partyName}>{row.partyName || "-"}</TD>}
                    {visibleColumns.productName && <TD className="max-w-[120px] truncate" title={row.productName}>{row.productName || "-"}</TD>}
                    {visibleColumns.qty && <TD className="text-right">{row.qty || "-"}</TD>}
                    {visibleColumns.truckNo && <TD>{row.truckNo || "-"}</TD>}
                    {visibleColumns.poAlumina && <TD className="text-center font-medium">{row.poAlumina || "-"}</TD>}
                    {visibleColumns.poIron && <TD className="text-center font-medium">{row.poIron || "-"}</TD>}
                    {visibleColumns.poMoisture && <TD className="text-center">{row.poMoisture || "-"}</TD>}
                    {visibleColumns.poBd && <TD className="text-center">{row.poBd || "-"}</TD>}
                    {visibleColumns.poAp && <TD className="text-center">{row.poAp || "-"}</TD>}
                    {visibleColumns.poSieve && <TD className="text-center">{row.poSieve || "-"}</TD>}
                    {visibleColumns.poLoi && <TD className="text-center">{row.poLoi || "-"}</TD>}
                    {visibleColumns.poSio2 && <TD className="text-center">{row.poSio2 || "-"}</TD>}
                    {visibleColumns.poCao && <TD className="text-center">{row.poCao || "-"}</TD>}
                    {visibleColumns.poMgo && <TD className="text-center">{row.poMgo || "-"}</TD>}
                    {visibleColumns.poTio2 && <TD className="text-center">{row.poTio2 || "-"}</TD>}
                    {visibleColumns.poKna2o && <TD className="text-center">{row.poKna2o || "-"}</TD>}
                    {/* Status */}
                    {visibleColumns.status && (
                      <TD className="text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isTested ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          {isTested ? "Tested" : "Not Tested"}
                        </span>
                      </TD>
                    )}
                    {visibleColumns.dateOfTest && <TD className="text-center">{row.dateOfTest ? fmtDate(row.dateOfTest) : "-"}</TD>}
                    {/* Lab values */}
                    {visibleColumns.moisture && (
                      <TD className={`text-center font-medium ${qualityColor(row.moisture, row.poMoisture, true)}`}>
                        {row.moisture || "-"}
                      </TD>
                    )}
                    {visibleColumns.bd && <TD className="text-center">{row.bd || "-"}</TD>}
                    {visibleColumns.ap && <TD className="text-center">{row.ap || "-"}</TD>}
                    {visibleColumns.alumina && (
                      <TD className={`text-center font-medium ${qualityColor(row.alumina, row.poAlumina)}`}>
                        {row.alumina || "-"}
                      </TD>
                    )}
                    {visibleColumns.iron && (
                      <TD className={`text-center font-medium ${qualityColor(row.iron, row.poIron, true)}`}>
                        {row.iron || "-"}
                      </TD>
                    )}
                    {visibleColumns.sieve && (
                      <TD className="text-center">
                        {row.sieve ? (
                          <a
                            href={row.sieve.startsWith("http") ? row.sieve : `https://${row.sieve}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-blue-600 underline text-[10px]"
                          >View</a>
                        ) : "-"}
                      </TD>
                    )}
                    {visibleColumns.loi && (
                      <TD className={`text-center font-medium ${qualityColor(row.loi, row.poLoi, true)}`}>
                        {row.loi || "-"}
                      </TD>
                    )}
                    {visibleColumns.sio2 && (
                      <TD className={`text-center font-medium ${qualityColor(row.sio2, row.poSio2, true)}`}>
                        {row.sio2 || "-"}
                      </TD>
                    )}
                    {visibleColumns.cao && (
                      <TD className={`text-center font-medium ${qualityColor(row.cao, row.poCao, true)}`}>
                        {row.cao || "-"}
                      </TD>
                    )}
                    {visibleColumns.mgo && (
                      <TD className={`text-center font-medium ${qualityColor(row.mgo, row.poMgo, true)}`}>
                        {row.mgo || "-"}
                      </TD>
                    )}
                    {visibleColumns.tio2 && (
                      <TD className={`text-center font-medium ${qualityColor(row.tio2, row.poTio2, true)}`}>
                        {row.tio2 || "-"}
                      </TD>
                    )}
                    {visibleColumns.kna2o && (
                      <TD className={`text-center font-medium ${qualityColor(row.kna2o, row.poKna2o, true)}`}>
                        {row.kna2o || "-"}
                      </TD>
                    )}
                    {visibleColumns.freeIron && (
                      <TD className={`text-center font-medium ${qualityColor(row.freeIron, row.poIron, true)}`}>
                        {row.freeIron || "-"}
                      </TD>
                    )}
                    {visibleColumns.tl && <TD className="text-center">{row.tl || "-"}</TD>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
