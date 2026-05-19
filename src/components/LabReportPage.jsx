"use client";
import { useState, useEffect, useCallback, useMemo, useContext } from "react";
import { supabase } from "../supabase";
import { AuthContext } from "../context/AuthContext";
import { RefreshCw, Filter, X, Download, Settings, Check, FileDown, TrendingUp, Truck, AlertTriangle, Info, Edit2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import SuperAdminEditModal from "./SuperAdminEditModal";

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

const month_abbr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const fmtDate = (v) => {
  if (!v) return "-";
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return `${String(d.getDate()).padStart(2, "0")}-${month_abbr[d.getMonth()]}-${d.getFullYear()}`;
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
  const { user, isSuperAdmin } = useContext(AuthContext);
  const [rows, setRows] = useState([]);
  const [editRecord, setEditRecord] = useState(null); // { row, tab }
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

      const findPo = (indentNo, vendorName = "") => {
        if (!indentNo) return null;
        const key = String(indentNo).trim().toLowerCase();
        const vendor = String(vendorName || "").trim().toLowerCase();

        const allPos = Object.values(poMap);

        // 1. Direct match with Indent Id. or po_number
        let match = allPos.find(r => {
          const k1 = String(r["Indent Id."] || "").trim().toLowerCase();
          const k2 = String(r["po_number"] || "").trim().toLowerCase();
          return k1 === key || k2 === key;
        });
        if (match) return match;

        // 2. Strict Numeric Match (Matching the unique serial number part, usually at the end)
        const parts = key.match(/\d+/g);
        const lastNumPart = parts ? parts[parts.length - 1] : null;
        
        if (lastNumPart && lastNumPart.length >= 3) {
          match = allPos.find((r) => {
            const k1 = String(r["Indent Id."] || "").trim().toLowerCase();
            const k2 = String(r["po_number"] || "").trim().toLowerCase();
            const p1 = k1.match(/\d+/g);
            const p2 = k2.match(/\d+/g);
            const r1 = p1 ? p1[p1.length - 1] : null;
            const r2 = p2 ? p2[p2.length - 1] : null;
            
            const isNumMatch = r1 === lastNumPart || r2 === lastNumPart;
            if (!isNumMatch) return false;

            // If vendor provided, verify vendor match to avoid cross-vendor matching
            if (vendor) {
              const poVendor = String(r["Vendor name"] || r["Vendor"] || "").trim().toLowerCase();
              return poVendor.includes(vendor) || vendor.includes(poVendor);
            }
            return true;
          });
        }
        return match || null;
      };

      let data = (liftData || []).map((row) => {
        const indentNo = String(row["Indent no."] || "").trim();
        const vendorName = String(row["Vendor Name"] || "").trim();
        const poRow = findPo(indentNo, vendorName);
        const g = (f1, f2) => {
          if (!poRow) return "";
          const val = poRow[f1] ?? poRow[f2] ?? "";
          return String(val).trim();
        };
        return {
          _rawId: row.id,
          liftNo: String(row["Lift No"] || "").trim(),
          poNumber: indentNo,
          billNo: String(row["Bill No."] || "").trim(),
          partyName: String(row["Vendor Name"] || "").trim(),
          productName: String(row["Raw Material Name"] || "").trim(),
          qty: String(row["Qty"] || "").trim(),
          truckNo: String(row["Truck No."] || "").trim(),
          // PO reference values
          poAlumina: g("Alumina %"),
          poIron: g("Iron %"),
          poMoisture: g("Moisture %", "Moisture Percent Age %"),
          poBd: g("BD %", "BD Percent Age %"),
          poAp: g("AP %", "AP Percent Age %"),
          poSieve: g("Sieve Analysis"),
          poLoi: g("LOI %"),
          poSio2: g("SIO2 %"),
          poCao: g("CaO %"),
          poMgo: g("MgO %"),
          poTio2: g("TiO2 %"),
          poKna2o: g("K2O + Na2O %", "K2O+Na2O %"),
          // Lab results
          status: String(row["Status"] || "").trim(),
          dateOfTest: row["Date Of Test"] || "",
          moisture: String(row["Moisture Percent Age %"] || "").trim(),
          bd: String(row["BD Percent Age %"] || "").trim(),
          ap: String(row["AP Percent Age %"] || "").trim(),
          alumina: String(row["Alumina Percent Age %"] || "").trim(),
          iron: String(row["Iron Percent Age %"] || "").trim(),
          sieve: String(row["Sieve Analysis"] || "").trim(),
          loi: String(row["LOI %"] || "").trim(),
          sio2: String(row["SIO2 %"] || "").trim(),
          cao: String(row["CaO %"] || "").trim(),
          mgo: String(row["MgO %"] || "").trim(),
          tio2: String(row["TiO2 %"] || "").trim(),
          kna2o: String(row["K2O + Na2O %"] || "").trim(),
          freeIron: String(row["Free Iron %"] || "").trim(),
          tl: String(row["TL"] || row["Thermal Load"] || "").trim(),
          firmName: String(row["Firm Name"] || (poRow ? poRow["Firm Name"] : "") || "").trim(),
          timestamp: row["Timestamp"] || "",
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
      f.setHours(0, 0, 0, 0);
      const rowDate = new Date(r.timestamp);
      if (rowDate < f) return false;
    }
    if (toDate) {
      const t = new Date(toDate);
      t.setHours(23, 59, 59, 999);
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

  // ── Rate Report State ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("lab");
  const [rateRows, setRateRows] = useState([]);
  const [rateLoading, setRateLoading] = useState(false);
  const [rateSearch, setRateSearch] = useState("");
  const [rateFirmFilter, setRateFirmFilter] = useState("all");

  // ── Indent Report State ────────────────────────────────────────────────────
  const [indentRows, setIndentRows] = useState([]);
  const [indentLoading, setIndentLoading] = useState(false);
  const [indentSearch, setIndentSearch] = useState("");
  const [indentFirmFilter, setIndentFirmFilter] = useState("all");

  // --- Transporter Summary Logic ---
  const transporterSummaryData = useMemo(() => {
    if (!rateRows.length) return [];

    // 1. Filter by date range and firm
    let filtered = rateRows;
    if (rateFirmFilter !== "all") {
      filtered = filtered.filter(r => r.firmName === rateFirmFilter);
    }
    if (fromDate) {
      const f = new Date(fromDate);
      f.setHours(0, 0, 0, 0);
      filtered = filtered.filter(r => new Date(r.timestamp) >= f);
    }
    if (toDate) {
      const t = new Date(toDate);
      t.setHours(23, 59, 59, 999);
      filtered = filtered.filter(r => new Date(r.timestamp) <= t);
    }

    // 2. Propagate Transporter Name by Bill No.
    const billToTransporter = {};
    filtered.forEach(r => {
      if (r.billNo && r.transporterName && r.transporterName.trim() !== "" && r.transporterName.toLowerCase() !== "null") {
        billToTransporter[r.billNo] = r.transporterName;
      }
    });

    // 3. Aggregate by Transporter
    const summaryMap = {};
    filtered.forEach(r => {
      const billNo = r.billNo || "No Bill";
      const transporter = billToTransporter[billNo] || r.transporterName || "Unassigned Bills";

      if (!summaryMap[transporter]) {
        summaryMap[transporter] = {
          name: transporter,
          billCount: new Set(),
          totalQty: 0,
          totalTransportCost: 0,
          isUnassigned: transporter === "Unassigned Bills",
          bills: []
        };
      }

      summaryMap[transporter].billCount.add(billNo);
      summaryMap[transporter].totalQty += parseFloat(r.qty || 0);
      summaryMap[transporter].totalTransportCost += parseFloat(r.transportTotalCost || 0);
      summaryMap[transporter].bills.push({
        liftNo: r.liftNo,
        billNo: billNo,
        qty: r.qty,
        cost: r.transportTotalCost,
        product: r.productName,
        date: r.timestamp
      });
    });

    // Convert to array and sort
    const result = Object.values(summaryMap).sort((a, b) => {
      if (a.isUnassigned) return 1;
      if (b.isUnassigned) return -1;
      return b.totalTransportCost - a.totalTransportCost;
    });

    return result;
  }, [rateRows, fromDate, toDate, rateFirmFilter]);

  const fetchRateData = useCallback(async () => {
    setRateLoading(true);
    try {
      const [{ data: liftData, error: liftErr }, { data: poData, error: poErr }] = await Promise.all([
        supabase.from("LIFT-ACCOUNTS").select("*").order("Timestamp", { ascending: false }),
        supabase.from("INDENT-PO").select("*"),
      ]);
      if (liftErr) throw liftErr;
      if (poErr) throw poErr;

      const findPoRow = (indentNo, material, vendorName = "") => {
        if (!indentNo) return null;
        const key = String(indentNo).trim().toLowerCase();
        const mat = String(material || "").trim().toLowerCase();
        const vendor = String(vendorName || "").trim().toLowerCase();

        const allPos = poData || [];

        // Try direct match first
        let candidates = allPos.filter(r => {
          const k1 = String(r["Indent Id."] || "").trim().toLowerCase();
          const k2 = String(r["po_number"] || "").trim().toLowerCase();
          return k1 === key || k2 === key;
        });

        // If no direct match, try stricter numeric match
        if (candidates.length === 0) {
          const parts = key.match(/\d+/g);
          const lastNumPart = parts ? parts[parts.length - 1] : null;

          if (lastNumPart && lastNumPart.length >= 3) {
            candidates = allPos.filter(r => {
              const k1 = String(r["Indent Id."] || "").trim().toLowerCase();
              const k2 = String(r["po_number"] || "").trim().toLowerCase();
              const p1 = k1.match(/\d+/g);
              const p2 = k2.match(/\d+/g);
              const r1 = p1 ? p1[p1.length - 1] : null;
              const r2 = p2 ? p2[p2.length - 1] : null;
              
              const isNumMatch = r1 === lastNumPart || r2 === lastNumPart;
              if (!isNumMatch) return false;

              // Verify vendor if possible
              if (vendor) {
                const poVendor = String(r["Vendor name"] || r["Vendor"] || "").trim().toLowerCase();
                return poVendor.includes(vendor) || vendor.includes(poVendor);
              }
              return true;
            });
          }
        }

        if (candidates.length === 0) return null;
        if (candidates.length === 1) return candidates[0];

        // If multiple candidates, prioritize the one matching the material
        const exactMaterialMatch = candidates.find(r => 
          String(r["Material"] || "").trim().toLowerCase() === mat
        );
        if (exactMaterialMatch) return exactMaterialMatch;

        // Otherwise check PO Items within candidates
        const itemMatch = candidates.find(r => {
          const items = Array.isArray(r["PO Items"]) ? r["PO Items"] : [];
          return items.some(it => String(it.material || it.productName || "").trim().toLowerCase() === mat);
        });
        
        return itemMatch || candidates[0];
      };

      let data = (liftData || []).map((row) => {
        const liftIndentRef = String(row["Indent no."] || "").trim();
        const liftMaterial  = String(row["Raw Material Name"] || "").trim();
        const liftVendor = String(row["Vendor Name"] || "").trim();
        const poRow = findPoRow(liftIndentRef, liftMaterial, liftVendor);

        // Use true values from PO record if matched, otherwise fallback to lift reference
        const indentId = poRow ? String(poRow["Indent Id."] || "").trim() : liftIndentRef;
        const poNumber = poRow ? String(poRow["po_number"] || "").trim() : "";

        // Determine the PO Rate: Check PO Items first, then fallback to top-level Rate
        let poRate = String(poRow?.["Rate"] || "").trim();
        if (poRow?.["PO Items"] && Array.isArray(poRow["PO Items"])) {
          const matLower = liftMaterial.toLowerCase();
          const itemMatch = poRow["PO Items"].find(it =>
            String(it.material || it.productName || "").trim().toLowerCase() === matLower
          );
          if (itemMatch) {
            poRate = String(itemMatch.rate || "").trim();
          }
        }

        const poCopy = String(poRow?.["PO Copy"] || "").trim();

        // Transport cost logic
        const rateType = String(row["Type Of Transporting Rate"] || "").trim();
        const transRate = parseFloat(row["Transporter Rate"] || 0);
        const unitRate = parseFloat(row["Transporting Rate"] || 0);
        const liftQty = parseFloat(row["Lifting Qty"] || row["Qty"] || 0);
        const isPerMT = rateType.toLowerCase().includes("per mt") || rateType.toLowerCase() === "per mt";
        const isFixed = rateType.toLowerCase() === "fixed";

        // If Per MT, cost = unitRate * qty. If Fixed, cost = transRate (which is total)
        const transportTotalCost = isPerMT ? (unitRate * liftQty) : transRate;
        const effectiveRatePerMT = isFixed ? (liftQty > 0 ? transRate / liftQty : 0) : unitRate;

        return {
          _rawId: row.id,
          liftNo: String(row["Lift No"] || "").trim(),
          indentId,
          poNumber,
          partyName: String(row["Vendor Name"] || "").trim(),
          productName: String(row["Raw Material Name"] || "").trim(),
          qty: liftQty,
          billNo: String(row["Bill No."] || "").trim(),
          poRate,
          liftBillRate: String(row["Rate"] || "").trim(),
          transportRateType: rateType,
          transporterRate: isPerMT ? unitRate : transRate,
          isPerMT,
          isFixed,
          // Total transport cost for this lift
          transportTotalCost,
          // Effective rate per MT
          transportEffectiveRate: effectiveRatePerMT,
          // Added Lab Results to Rate Report
          status: String(row["Status"] || "").trim(),
          alumina: String(row["Alumina Percent Age %"] || "").trim(),
          iron: String(row["Iron Percent Age %"] || "").trim(),
          firmName: String(row["Firm Name"] || "").trim(),
          timestamp: row["Timestamp"] || "",
          billImage: String(row["Bill Image"] || "").trim(),
          poCopy,
          biltyNo: String(row["Bilty No."] || "").trim(),
          biltyImage: String(row["Bilty Image"] || "").trim(),
          truckNo: String(row["Truck No."] || "").trim(),
          transporterName: String(row["Transporter Name"] || "").trim(),
          totalTruckQty: String(row["Truck Qty"] || "").trim(),
        };
      });

      // User firm filter
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
      setRateRows(data);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to load rate data: ${err.message}`);
    } finally {
      setRateLoading(false);
    }
  }, [user]);

  useEffect(() => { if (activeTab === "rate") fetchRateData(); }, [activeTab, fetchRateData]);

  const fetchIndentData = useCallback(async () => {
    setIndentLoading(true);
    try {
      const { data, error } = await supabase
        .from("INDENT-PO")
        .select("*")
        .order("Timestamp", { ascending: false });

      if (error) throw error;
      
      const mappedData = (data || []).map(row => ({
        _rawId: row.id,
        indentNo: String(row["Indent Id."] || "").trim(),
        poNo: String(row["po_number"] || "").trim(),
        poCopy: String(row["PO Copy"] || "").trim(),
        timestamp: row["Timestamp"] || "",
        firmName: String(row["Firm Name"] || "").trim(),
        haveToMakePo: String(row["Have To Make PO"] || "").trim(),
        partyName: String(row["Vendor"] || row["Vendor name"] || "").trim(),
        productName: String(row["Material"] || "").trim(),
        qty: String(row["Quantity"] || "").trim(),
        rate: String(row["Rate"] || "").trim(),
      }));

      // Firm filter logic based on user access
      let filteredData = mappedData;
      if (user?.firmName) {
        const uf = user.firmName;
        if (Array.isArray(uf)) {
          const set = new Set(uf.map((f) => f.toLowerCase()));
          filteredData = filteredData.filter((r) => r.firmName && set.has(r.firmName.toLowerCase()));
        } else if (String(uf).toLowerCase() !== "all") {
          const userFirm = String(uf).toLowerCase();
          filteredData = filteredData.filter((r) => r.firmName && r.firmName.toLowerCase() === userFirm);
        }
      }
      
      setIndentRows(filteredData);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to load indent data: ${err.message}`);
    } finally {
      setIndentLoading(false);
    }
  }, [user]);

  useEffect(() => { if (activeTab === "indent") fetchIndentData(); }, [activeTab, fetchIndentData]);

  const rateFirmOptions = ["all", ...Array.from(new Set(rateRows.map((r) => r.firmName).filter(Boolean))).sort()];

  const filteredRateRows = rateRows.filter((r) => {
    if (rateFirmFilter !== "all" && r.firmName !== rateFirmFilter) return false;
    if (!rateSearch) return true;
    const s = rateSearch.toLowerCase();
    return (
      (r.liftNo || "").toLowerCase().includes(s) ||
      (r.indentNo || "").toLowerCase().includes(s) ||
      (r.partyName || "").toLowerCase().includes(s) ||
      (r.productName || "").toLowerCase().includes(s) ||
      (r.billNo || "").toLowerCase().includes(s)
    );
  });

  const indentFirmOptions = ["all", ...Array.from(new Set(indentRows.map((r) => r.firmName).filter(Boolean))).sort()];

  const filteredIndentRows = indentRows.filter((r) => {
    if (indentFirmFilter !== "all" && r.firmName !== indentFirmFilter) return false;
    if (!indentSearch) return true;
    const s = indentSearch.toLowerCase();
    return (
      (r.indentNo || "").toLowerCase().includes(s) ||
      (r.partyName || "").toLowerCase().includes(s) ||
      (r.productName || "").toLowerCase().includes(s) ||
      (r.firmName || "").toLowerCase().includes(s)
    );
  });
  // ── End Rate Report State ──────────────────────────────────────────────────

  const exportRateExcel = () => {
    try {
      if (filteredRateRows.length === 0) {
        toast.error("No data to export");
        return;
      }

      // Headers
      const headers = [
        "Firm Name",
        "Lift No.",
        "Lift Date",
        "Indent ID",
        "PO Number",
        "Party Name",
        "Product Name",
        "Lifting Qty",
        "Truck No.",
        "Transporter Name",
        "Total Truck Billing Qty",
        "PO Copy Link",
        "Bill Copy Link",
        "Bilty No.",
        "Bilty Copy Link",
        "PO Rate (INR)",
        "Lifting Bill Rate (INR)",
        "Total Transport Cost (INR)",
        "Transport Rate Type",
        "Effective Transport Rate/MT"
      ];

      // Data rows
      const dataRows = filteredRateRows.map(r => [
        r.firmName,
        r.liftNo,
        r.timestamp ? new Date(r.timestamp).toLocaleDateString() : "-",
        r.indentId,
        r.poNumber,
        r.partyName,
        r.productName,
        r.qty,
        r.truckNo,
        r.transporterName,
        r.totalTruckQty,
        r.poCopy,
        r.billImage,
        r.biltyNo,
        r.biltyImage,
        r.poRate,
        r.liftBillRate,
        r.transportTotalCost,
        r.transportRateType,
        r.transportEffectiveRate
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(","),
        ...dataRows.map(row => row.map(val => {
          const s = String(val ?? "").replace(/"/g, '""');
          return s.includes(",") ? `"${s}"` : s;
        }).join(","))
      ].join("\n");

      // Create download link
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `rate-report-${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Excel (CSV) exported successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export Excel: " + err.message);
    }
  };

  const exportIndentExcel = () => {
    try {
      if (filteredIndentRows.length === 0) {
        toast.error("No data to export");
        return;
      }
      const headers = ["Timestamp", "Indent No", "PO No", "PO Copy", "Firm Name", "Have to make a po", "Party name", "Product Name", "Quantity", "Rate"];
      const dataRows = filteredIndentRows.map(r => [
        r.timestamp ? new Date(r.timestamp).toLocaleString() : "-",
        r.indentNo,
        r.poNo,
        r.poCopy,
        r.firmName,
        r.haveToMakePo,
        r.partyName,
        r.productName,
        r.qty,
        r.rate
      ]);

      // Using HTML table trick to support colors in Excel
      const tableHtml = `
        <html>
        <head><meta charset="UTF-8"></head>
        <body>
          <table border="1">
            <thead>
              <tr style="background-color: #2563eb; color: #ffffff; font-weight: bold;">
                ${headers.map(h => `<th style="background-color: #2563eb; color: #ffffff;">${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${dataRows.map(row => `
                <tr>
                  ${row.map(val => `<td>${val ?? "-"}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob([tableHtml], { type: "application/vnd.ms-excel" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `indent-report-${new Date().toISOString().slice(0, 10)}.xls`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Excel exported successfully with purple header");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export Excel: " + err.message);
    }
  };

  // Build field definitions for the edit modal based on tab
  const buildEditFields = (record) => {
    if (!record) return [];
    const { row, tab } = record;
    if (tab === "lab" || tab === "rate") {
      return [
        { label: "Party Name (Vendor)", dbKey: "Vendor Name", value: row.partyName, type: "text" },
        { label: "Product Name", dbKey: "Raw Material Name", value: row.productName, type: "text" },
        { label: "Qty", dbKey: "Qty", value: row.qty, type: "number" },
        { label: "Truck No.", dbKey: "Truck No.", value: row.truckNo, type: "text" },
        { label: "Bill No.", dbKey: "Bill No.", value: row.billNo, type: "text" },
        { label: "Status", dbKey: "Status", value: row.status, type: "text" },
        { label: "Date Of Test", dbKey: "Date Of Test", value: row.dateOfTest, type: "date" },
        { label: "Moisture %", dbKey: "Moisture Percent Age %", value: row.moisture, type: "number" },
        { label: "BD %", dbKey: "BD Percent Age %", value: row.bd, type: "number" },
        { label: "AP %", dbKey: "AP Percent Age %", value: row.ap, type: "number" },
        { label: "Alumina %", dbKey: "Alumina Percent Age %", value: row.alumina, type: "number" },
        { label: "Iron %", dbKey: "Iron Percent Age %", value: row.iron, type: "number" },
        { label: "LOI %", dbKey: "LOI %", value: row.loi, type: "number" },
        { label: "SIO2 %", dbKey: "SIO2 %", value: row.sio2, type: "number" },
        { label: "CaO %", dbKey: "CaO %", value: row.cao, type: "number" },
        { label: "MgO %", dbKey: "MgO %", value: row.mgo, type: "number" },
        { label: "TiO2 %", dbKey: "TiO2 %", value: row.tio2, type: "number" },
        { label: "K2O+Na2O %", dbKey: "K2O + Na2O %", value: row.kna2o, type: "number" },
        { label: "Free Iron %", dbKey: "Free Iron %", value: row.freeIron, type: "number" },
        { label: "TL", dbKey: "TL", value: row.tl, type: "text" },
      ];
    }
    if (tab === "indent") {
      return [
        { label: "Indent No.", dbKey: "Indent Id.", value: row.indentNo, type: "text" },
        { label: "PO No.", dbKey: "po_number", value: row.poNo, type: "text" },
        { label: "Firm Name", dbKey: "Firm Name", value: row.firmName, type: "text" },
        { label: "Party Name", dbKey: "Vendor", value: row.partyName, type: "text" },
        { label: "Product Name", dbKey: "Material", value: row.productName, type: "text" },
        { label: "Quantity", dbKey: "Quantity", value: row.qty, type: "number" },
        { label: "Rate (₹)", dbKey: "Rate", value: row.rate, type: "number" },
        { label: "Have To Make PO", dbKey: "Have To Make PO", value: row.haveToMakePo, type: "text" },
        { label: "PO Copy URL", dbKey: "PO Copy", value: row.poCopy, type: "text" },
      ];
    }
    return [];
  };

  const getEditTableName = (tab) => {
    if (tab === "lab" || tab === "rate") return "LIFT-ACCOUNTS";
    return "INDENT-PO";
  };

  return (
    <div className="p-4 min-h-screen bg-gray-50">
      {/* Super Admin Edit Modal */}
      {isSuperAdmin && editRecord && (
        <SuperAdminEditModal
          title={`Edit ${editRecord.tab === "indent" ? "Indent" : "Lift"} Record — ${editRecord.row.liftNo || editRecord.row.indentNo || ""}`}
          tableName={getEditTableName(editRecord.tab)}
          pkField="id"
          pkValue={editRecord.row._rawId}
          fields={buildEditFields(editRecord)}
          onClose={() => setEditRecord(null)}
          onSaved={() => {
            setEditRecord(null);
            if (editRecord.tab === "lab") fetchData();
            else if (editRecord.tab === "rate") fetchRateData();
            else fetchIndentData();
          }}
        />
      )}

      {/* Page Tabs */}
      <div className="mb-4 flex items-center gap-1 border-b border-gray-200 pb-0">
        <button
          onClick={() => setActiveTab("lab")}
          className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border-b-2 ${activeTab === "lab"
              ? "border-teal-600 text-teal-700 bg-teal-50"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
        >
          🧪 Lab Report
        </button>
        <button
          onClick={() => setActiveTab("rate")}
          className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border-b-2 ${activeTab === "rate"
              ? "border-indigo-600 text-indigo-700 bg-indigo-50"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
        >
          💰 Rate Report
        </button>
        <button
          onClick={() => setActiveTab("indent")}
          className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border-b-2 ${activeTab === "indent"
              ? "border-orange-600 text-orange-700 bg-orange-50"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
        >
          📋 Indent Report
        </button>
      </div>

      {/* ═══════════════════════════════ LAB REPORT TAB ═══════════════════════════════ */}
      {activeTab === "lab" && (
        <>
          {/* Header */}
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-800">Lab Report</h1>
                {isSuperAdmin && (
                  <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                    <ShieldCheck size={12} /> Super Admin
                  </span>
                )}
              </div>
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg transition-colors ${showColSettings ? "bg-gray-800 text-white border-gray-800" : "bg-white border-gray-300 hover:bg-gray-50"
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
                    {isSuperAdmin && <TH className="bg-purple-50 text-purple-700">Edit</TH>}
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
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${isTested ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
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
                        {isSuperAdmin && (
                          <TD className="text-center">
                            <button
                              onClick={() => setEditRecord({ row, tab: "lab" })}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-purple-600 border border-purple-200 bg-purple-50 hover:bg-purple-100 rounded"
                            >
                              <Edit2 size={11} /> Edit
                            </button>
                          </TD>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ═══════════════════════════════ RATE REPORT TAB ═══════════════════════════════ */}
      {activeTab === "rate" && (
        <>
          {/* Rate Report Header */}
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-800">Rate Report</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Indent-wise PO Rate, Lifting Bill Rate &amp; Transport Cost &nbsp;|&nbsp;
                Total: {filteredRateRows.length} lifts
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Firm filter */}
              <select
                value={rateFirmFilter}
                onChange={(e) => setRateFirmFilter(e.target.value)}
                className="py-1.5 px-2 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {rateFirmOptions.map((f) => (
                  <option key={f} value={f}>{f === "all" ? "All Firms" : f}</option>
                ))}
              </select>
              {/* Search */}
              <div className="relative">
                <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search indent, party, product..."
                  value={rateSearch}
                  onChange={(e) => setRateSearch(e.target.value)}
                  className="pl-8 pr-8 py-1.5 text-xs border border-gray-300 rounded-lg w-52 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {rateSearch && (
                  <button onClick={() => setRateSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                    <X className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                )}
              </div>
              {/* Refresh */}
              <button
                onClick={fetchRateData}
                disabled={rateLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${rateLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              {/* Excel Export */}
              <button
                onClick={exportRateExcel}
                disabled={rateLoading || filteredRateRows.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                <FileDown className="h-3.5 w-3.5" />
                Export Excel
              </button>
            </div>
          </div>

          {/* Rate Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-auto" style={{ maxHeight: "calc(100vh - 210px)" }}>
            {rateLoading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
                <span className="ml-3 text-gray-500">Loading rate report...</span>
              </div>
            ) : filteredRateRows.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-gray-400">No data found</div>
            ) : (
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 z-10">
                  {/* Group header */}
                  <tr>
                    <th colSpan={14} className="border border-gray-300 bg-indigo-700 text-white text-center text-[11px] font-bold px-2 py-1.5">
                      Lift &amp; Indent Information
                    </th>
                    <th colSpan={4} className="border border-gray-300 bg-purple-700 text-white text-center text-[11px] font-bold px-2 py-1.5">
                      Rate &amp; Cost
                    </th>
                  </tr>
                  <tr className="bg-gray-100">
                    <TH>Firm Name</TH>
                    <TH>Lift No.</TH>
                    <TH>Lift Date</TH>
                    <TH>Indent / PO No.</TH>
                    <TH>Party Name</TH>
                    <TH>Product Name</TH>
                    <TH>Lifting Qty</TH>
                    <TH>Truck No.</TH>
                    <TH>Transporter</TH>
                    <TH>Truck Billing Qty</TH>
                    <TH>PO Copy</TH>
                    <TH>Bill Copy</TH>
                    <TH>Bilty No.</TH>
                    <TH>Bilty Copy</TH>
                    <TH className="bg-purple-50">PO Rate (₹)</TH>
                    <TH className="bg-orange-50">Lifting Bill Rate (₹)</TH>
                    <TH className="bg-blue-50">Transport Cost (₹)</TH>
                    <TH className="bg-blue-50">Rate Type</TH>
                    {isSuperAdmin && <TH className="bg-purple-50 text-purple-700">Edit</TH>}
                  </tr>
                </thead>
                <tbody>
                  {filteredRateRows.map((row, i) => {
                    const rowBg = i % 2 === 0 ? "bg-white" : "bg-gray-50";
                    const poR = parseFloat(row.poRate);
                    const liftR = parseFloat(row.liftBillRate);
                    const rateVariance = (!isNaN(poR) && !isNaN(liftR)) ? liftR - poR : null;

                    return (
                      <tr key={i} className={`${rowBg} hover:bg-indigo-50/40`}>
                        <TD className="text-gray-600 font-medium">{row.firmName || "-"}</TD>
                        <TD className="font-medium text-indigo-700">{row.liftNo || "-"}</TD>
                        <TD>{fmtDate(row.timestamp)}</TD>
                        <TD className="font-medium">
                          <div>{row.indentId || "-"}</div>
                          {row.poNumber && row.poNumber !== row.indentId && (
                            <div className="text-gray-500 font-normal text-[10px]">PO: {row.poNumber}</div>
                          )}
                        </TD>
                        <TD className="max-w-[140px] truncate" title={row.partyName}>{row.partyName || "-"}</TD>
                        <TD className="max-w-[120px] truncate" title={row.productName}>{row.productName || "-"}</TD>
                        <TD className="text-right">{row.qty || "-"}</TD>
                        <TD>{row.truckNo || "-"}</TD>
                        <TD className="max-w-[120px] truncate" title={row.transporterName}>{row.transporterName || "-"}</TD>
                        <TD className="text-right">{row.totalTruckQty || "-"}</TD>
                        <TD className="text-center">
                          {row.poCopy ? (
                            <a
                              href={row.poCopy.startsWith("http") ? row.poCopy : `https://${row.poCopy}`}
                              target="_blank" rel="noopener noreferrer"
                              className="text-purple-600 hover:text-purple-800 underline font-medium"
                            >
                              View PO
                            </a>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TD>
                        <TD className="text-center">
                          {row.billImage ? (
                            <a
                              href={row.billImage.startsWith("http") ? row.billImage : `https://${row.billImage}`}
                              target="_blank" rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-800 underline font-medium"
                            >
                              View Bill
                            </a>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TD>
                        <TD className="text-center">
                          {row.biltyNo || "-"}
                        </TD>
                        <TD className="text-center">
                          {row.biltyImage ? (
                            <a
                              href={row.biltyImage.startsWith("http") ? row.biltyImage : `https://${row.biltyImage}`}
                              target="_blank" rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-800 underline font-medium"
                            >
                              View Bilty
                            </a>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TD>
                        {/* PO Rate */}
                        <TD className="text-right font-semibold text-purple-700 bg-purple-50/40">
                          {row.poRate ? `₹${parseFloat(row.poRate).toLocaleString("en-IN")}` : "-"}
                        </TD>
                        {/* Lifting Bill Rate with variance */}
                        <TD className={`text-right font-semibold bg-orange-50/40 ${rateVariance === null ? "text-gray-700"
                            : rateVariance > 0 ? "text-red-600"
                              : rateVariance < 0 ? "text-green-700"
                                : "text-gray-700"
                          }`}>
                          {row.liftBillRate ? (
                            <span>
                              ₹{parseFloat(row.liftBillRate).toLocaleString("en-IN")}
                              {rateVariance !== null && (
                                <span className={`ml-1 text-[10px] font-normal px-1 rounded ${rateVariance > 0 ? "bg-red-100 text-red-600" : rateVariance < 0 ? "bg-green-100 text-green-700" : ""
                                  }`}>
                                  {rateVariance > 0 ? `+${rateVariance.toFixed(0)}` : rateVariance.toFixed(0)}
                                </span>
                              )}
                            </span>
                          ) : "-"}
                        </TD>
                        {/* Transport Cost */}
                        <TD className="text-right font-semibold text-blue-700 bg-blue-50/40">
                          <div>₹{(row.transportTotalCost || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                          <div className="text-[10px] font-normal text-gray-400">
                            {row.isPerMT ? `(₹${row.transporterRate}/MT)` : `(Fixed)`}
                          </div>
                        </TD>
                        {/* Rate Type */}
                        <TD className="text-center text-[10px] text-gray-500 bg-blue-50/40">
                          {row.transportRateType || "-"}
                        </TD>
                        {isSuperAdmin && (
                          <TD className="text-center">
                            <button
                              onClick={() => setEditRecord({ row, tab: "rate" })}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-purple-600 border border-purple-200 bg-purple-50 hover:bg-purple-100 rounded"
                            >
                              <Edit2 size={11} /> Edit
                            </button>
                          </TD>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                {/* Footer Totals */}
                <tfoot className="sticky bottom-0 bg-gray-100 border-t-2 border-gray-300">
                  <tr>
                    <td colSpan={14} className="border border-gray-300 px-2 py-1.5 text-[11px] font-bold text-gray-700">
                      Totals ({filteredRateRows.length} lifts)
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 text-[11px] font-bold text-right text-purple-700 bg-purple-50">—</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-[11px] font-bold text-right text-orange-700 bg-orange-50">—</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-[11px] font-bold text-right text-blue-700 bg-blue-50">
                      ₹{filteredRateRows
                        .reduce((sum, r) => sum + (r.transportTotalCost || 0), 0)
                        .toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
          {/* Legend */}
          <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 inline-block border border-red-300" /> Lifting Rate &gt; PO Rate (over budget)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 inline-block border border-green-300" /> Lifting Rate ≤ PO Rate (within budget)</span>
          </div>
        </>
      )}

      {/* ═══════════════════════════════ INDENT REPORT TAB ═══════════════════════════════ */}
      {activeTab === "indent" && (
        <>
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-800">Indent Report</h1>
              <p className="text-xs text-gray-500 mt-0.5">List of all indents from INDENT-PO table</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <select
                value={indentFirmFilter}
                onChange={(e) => setIndentFirmFilter(e.target.value)}
                className="py-1.5 px-2 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {indentFirmOptions.map((f) => (
                  <option key={f} value={f}>{f === "all" ? "All Firms" : f}</option>
                ))}
              </select>
              <div className="relative">
                <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search indent, party..."
                  value={indentSearch}
                  onChange={(e) => setIndentSearch(e.target.value)}
                  className="pl-8 pr-8 py-1.5 text-xs border border-gray-300 rounded-lg w-48 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {indentSearch && (
                  <button onClick={() => setIndentSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                    <X className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                )}
              </div>
              <button
                onClick={fetchIndentData}
                disabled={indentLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${indentLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                onClick={exportIndentExcel}
                disabled={indentLoading || filteredIndentRows.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                <FileDown className="h-3.5 w-3.5" />
                Export Excel
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {indentLoading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
              </div>
            ) : filteredIndentRows.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-gray-400">No indents found</div>
            ) : (
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-gray-100">
                  <tr>
                    <TH className="bg-blue-600 text-white border-blue-700">Timestamp</TH>
                    <TH className="bg-blue-600 text-white border-blue-700">Indent No</TH>
                    <TH className="bg-blue-600 text-white border-blue-700">PO No</TH>
                    <TH className="bg-blue-600 text-white border-blue-700">PO Copy</TH>
                    <TH className="bg-blue-600 text-white border-blue-700">Firm Name</TH>
                    <TH className="bg-blue-600 text-white border-blue-700">Have to make a po</TH>
                    <TH className="bg-blue-600 text-white border-blue-700">Party name</TH>
                    <TH className="bg-blue-600 text-white border-blue-700">Product Name</TH>
                    <TH className="bg-blue-600 text-white border-blue-700">Quantity</TH>
                    <TH className="bg-blue-600 text-white border-blue-700 text-right">Rate (₹)</TH>
                    {isSuperAdmin && <TH className="bg-purple-600 text-white border-purple-700">Edit</TH>}
                  </tr>
                </thead>
                <tbody>
                  {filteredIndentRows.map((row, i) => (
                    <tr key={i} className={`${i % 2 === 0 ? "bg-white" : "bg-blue-50/20"} hover:bg-blue-50/40`}>
                      <TD className="text-[10px] text-gray-500 font-medium">{row.timestamp ? fmtDate(row.timestamp) : "-"}</TD>
                      <TD className="font-medium text-blue-700">{row.indentNo || "-"}</TD>
                      <TD className="font-medium text-indigo-600">{row.poNo || "-"}</TD>
                      <TD className="text-center">
                        {row.poCopy ? (
                          <a
                            href={row.poCopy.startsWith("http") ? row.poCopy : `https://${row.poCopy}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline font-medium"
                          >
                            View PO
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TD>
                      <TD>{row.firmName || "-"}</TD>
                      <TD>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          row.haveToMakePo?.toLowerCase() === "yes" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                        }`}>
                          {row.haveToMakePo || "-"}
                        </span>
                      </TD>
                      <TD className="max-w-[180px] truncate" title={row.partyName}>{row.partyName || "-"}</TD>
                      <TD className="max-w-[150px] truncate" title={row.productName}>{row.productName || "-"}</TD>
                      <TD className="font-semibold">{row.qty || "-"}</TD>
                      <TD className="text-right font-bold text-blue-700">
                        {row.rate ? `₹${parseFloat(row.rate).toLocaleString("en-IN")}` : "-"}
                      </TD>
                      {isSuperAdmin && (
                        <TD className="text-center">
                          <button
                            onClick={() => setEditRecord({ row, tab: "indent" })}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-purple-600 border border-purple-200 bg-purple-50 hover:bg-purple-100 rounded"
                          >
                            <Edit2 size={11} /> Edit
                          </button>
                        </TD>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* --- Transporter Summary Tab --- */}
      {activeTab === "transporter" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Transporter-Wise Summary</h3>
                <p className="text-sm text-gray-500">Aggregated by transporter with automatic Bill No. matching</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const headers = ["Transporter", "Bills", "Total Qty", "Total Transport Cost"];
                    const data = transporterSummaryData.map(t => [
                      t.name,
                      t.billCount.size,
                      t.totalQty.toFixed(2),
                      t.totalTransportCost.toFixed(2)
                    ]);
                    const csvContent = [headers.join(","), ...data.map(r => r.join(","))].join("\n");
                    const blob = new Blob([csvContent], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `transporter-summary-${new Date().toISOString().slice(0, 10)}.csv`;
                    a.click();
                  }}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" /> Export Summary
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <TH className="text-left w-1/3">Transporter Name</TH>
                    <TH>Total Bills</TH>
                    <TH>Total Qty (MT)</TH>
                    <TH className="text-right">Total Transport Cost (₹)</TH>
                    <TH className="w-10"></TH>
                  </tr>
                </thead>
                <tbody>
                  {transporterSummaryData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-gray-400">No data available for the selected filters.</td>
                    </tr>
                  ) : (
                    transporterSummaryData.map((t, idx) => (
                      <tr key={idx} className={`hover:bg-blue-50/30 transition-colors ${t.isUnassigned ? "bg-red-50/50" : ""}`}>
                        <TD className={`font-semibold ${t.isUnassigned ? "text-red-600" : "text-gray-700"}`}>
                          {t.isUnassigned ? (
                            <span className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4" /> {t.name}
                            </span>
                          ) : (
                            t.name
                          )}
                        </TD>
                        <TD className="text-center font-medium">{t.billCount.size}</TD>
                        <TD className="text-center">{t.totalQty.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TD>
                        <TD className="text-right font-bold text-blue-700">₹{t.totalTransportCost.toLocaleString("en-IN", { minimumFractionDigits: 0 })}</TD>
                        <TD className="text-center">
                          {t.isUnassigned && (
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Missing Transporter Info"></div>
                          )}
                        </TD>
                      </tr>
                    ))
                  )}
                </tbody>
                {transporterSummaryData.length > 0 && (
                  <tfoot className="bg-gray-50 font-bold border-t-2 border-gray-200">
                    <tr>
                      <TD>Total Summary</TD>
                      <TD className="text-center">
                        {transporterSummaryData.reduce((s, t) => s + t.billCount.size, 0)}
                      </TD>
                      <TD className="text-center">
                        {transporterSummaryData.reduce((s, t) => s + t.totalQty, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </TD>
                      <TD className="text-right text-blue-800">
                        ₹{transporterSummaryData.reduce((s, t) => s + t.totalTransportCost, 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                      </TD>
                      <TD></TD>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 flex gap-2">
            <Info className="w-4 h-4 flex-shrink-0" />
            <div>
              <strong>Note:</strong> The Transporter Name is automatically propagated across all rows sharing the same <strong>Bill No.</strong> if at least one row in that group has a transporter assigned.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add these to imports at the top
// AlertTriangle, Info from lucide-react
