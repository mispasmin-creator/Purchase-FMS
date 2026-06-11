"use client";

import { useState, useEffect, useCallback, useMemo, useContext, useRef } from "react";
import { Receipt, FileText, Loader2, Upload, X, History, FileCheck, AlertTriangle, Info, ExternalLink, Filter, ShieldCheck, Edit2, Download } from "lucide-react";
import { MixerHorizontalIcon } from "@radix-ui/react-icons";

// Shadcn UI components
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AuthContext } from "../context/AuthContext";
import { supabase } from "../supabase";
import SuperAdminEditModal from "./SuperAdminEditModal";
import { uploadFileToStorage } from "../utils/storageUtils";
import { useRealtime } from "../hooks/useRealtime";

// --- Column Definitions for Tables ---
const PENDING_BILTY_COLUMNS_META = [
  { header: "Actions", dataKey: "actionColumn", toggleable: false, alwaysVisible: true },
  { header: "Lift ID", dataKey: "id", toggleable: true, alwaysVisible: true },
  { header: "Planned Date", dataKey: "planned3", toggleable: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "Vendor Name", dataKey: "vendorName", toggleable: true },
  { header: "Product Name", dataKey: "rawMaterialName", toggleable: true },
  { header: "Lift Type", dataKey: "liftType", toggleable: true },
  { header: "Indent No.", dataKey: "indentNo", toggleable: true },
  { header: "Bill No.", dataKey: "billNo", toggleable: true },
  { header: "Truck Number", dataKey: "truckNo", toggleable: true },
  { header: "Driver No.", dataKey: "driverNo", toggleable: true },
  { header: "Transporter Name", dataKey: "transporterName", toggleable: true },
  { header: "Type Of Transporting Rate", dataKey: "rateType", toggleable: true },
  { header: "Transporting Per MT Rate", dataKey: "transportingRate", toggleable: true },
  { header: "Bill Copy", dataKey: "billImage", isLink: true, linkText: "View Bill", toggleable: true },
  { header: "PO Copy", dataKey: "poCopy", isLink: true, linkText: "View PO", toggleable: true },
  { header: "PO Rate", dataKey: "poRate", toggleable: true },
  { header: "Original Qty", dataKey: "originalQty", toggleable: true },
  { header: "Total Bill Qty", dataKey: "totalBillQuantity", toggleable: true },
  { header: "Actual Qty", dataKey: "actualQty", toggleable: true },
];

const BILTY_HISTORY_COLUMNS_META = [
  { header: "Lift ID", dataKey: "id", toggleable: true, alwaysVisible: true },
  { header: "Timestamp", dataKey: "timestamp", toggleable: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "Vendor Name", dataKey: "vendorName", toggleable: true },
  { header: "Product Name", dataKey: "rawMaterialName", toggleable: true },
  { header: "Lift Type", dataKey: "liftType", toggleable: true },
  { header: "Indent No.", dataKey: "indentNo", toggleable: true },
  { header: "Bill No.", dataKey: "billNo", toggleable: true },
  { header: "Truck Number", dataKey: "truckNo", toggleable: true },
  { header: "Driver No.", dataKey: "driverNo", toggleable: true },
  { header: "Transporter Name", dataKey: "transporterName", toggleable: true },
  { header: "Type Of Transporting Rate", dataKey: "rateType", toggleable: true },
  { header: "Transporting Per MT Rate", dataKey: "transportingRate", toggleable: true },
  { header: "Bill Copy", dataKey: "billImage", isLink: true, linkText: "View Bill", toggleable: true },
  { header: "PO Copy", dataKey: "poCopy", isLink: true, linkText: "View PO", toggleable: true },
  { header: "PO Rate", dataKey: "poRate", toggleable: true },
  { header: "Original Qty", dataKey: "originalQty", toggleable: true },
  { header: "Total Bill Qty", dataKey: "totalBillQuantity", toggleable: true },
  { header: "Actual Qty", dataKey: "actualQty", toggleable: true },
  { header: "Bilty Number", dataKey: "biltyNumber", toggleable: true },
  { header: "Bilty Image", dataKey: "biltyImageUrl", isLink: true, linkText: "View Bilty", toggleable: true },
];

export default function BiltyPage() {
  const { user, isSuperAdmin } = useContext(AuthContext);
  const fetchInFlightRef = useRef(false);
  const lastFetchAtRef = useRef(0);
  const [superAdminEditLift, setSuperAdminEditLift] = useState(null);
  const [liftData, setLiftData] = useState([]);
  const [selectedLift, setSelectedLift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    biltyNumber: "",
    biltyImageFile: null,
  });
  const [formErrors, setFormErrors] = useState({});

  const [activeTab, setActiveTab] = useState("pendingBilty");
  const [visiblePendingColumns, setVisiblePendingColumns] = useState({});
  const [visibleHistoryColumns, setVisibleHistoryColumns] = useState({});
  const firmNameFilterKey = useMemo(() => JSON.stringify(user?.firmName ?? null), [user?.firmName]);
  const firmNameFilter = useMemo(() => {
    try {
      return JSON.parse(firmNameFilterKey);
    } catch {
      return null;
    }
  }, [firmNameFilterKey]);

  // Filter State
  const [filters, setFilters] = useState({
    vendorName: "all",
    materialName: "all",
    liftType: "all",
    orderNumber: "all",
    firmName: "all",
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
    setFilters({
      vendorName: "all",
      materialName: "all",
      liftType: "all",
      orderNumber: "all",
      firmName: "all",
    });
  };

  useEffect(() => {
    const initializeVisibility = (columnsMeta) => {
      const visibility = {};
      columnsMeta.forEach(col => {
        visibility[col.dataKey] = col.alwaysVisible || col.toggleable;
      });
      return visibility;
    };
    setVisiblePendingColumns(initializeVisibility(PENDING_BILTY_COLUMNS_META));
    setVisibleHistoryColumns(initializeVisibility(BILTY_HISTORY_COLUMNS_META));
  }, []);

  const fetchLiftData = useCallback(async ({ force = false, showLoader = true } = {}) => {
    const now = Date.now();
    if (fetchInFlightRef.current) return;
    if (!force && now - lastFetchAtRef.current < 5000) return;

    fetchInFlightRef.current = true;
    lastFetchAtRef.current = now;
    if (showLoader) setLoading(true);
    setError(null);
    try {
      const [
        { data: liftData, error: liftErr },
        { data: poData, error: poErr },
        { data: mismatchData, error: mismatchErr }
      ] = await Promise.all([
        supabase.from("LIFT-ACCOUNTS").select("*").order("Timestamp", { ascending: false }),
        supabase.from("INDENT-PO").select("*"),
        supabase.from("Mismatch").select("*").order("Timestamp", { ascending: false }),
      ]);
 
      if (liftErr) throw liftErr;
      if (poErr) throw poErr;
      if (mismatchErr) throw mismatchErr;

      const formatTimestamp = (dateValue) => {
        if (!dateValue) return "";
        try {
          const d = new Date(dateValue);
          if (!isNaN(d.getTime())) {
            return d.toLocaleString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            }).replace(/,/g, "");
          }
        } catch (e) {
          return String(dateValue);
        }
        return String(dateValue);
      };

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

      let processedRawRows = (liftData || []).map((row) => {
        const firmNameStr = String(row["Firm Name"] || "").trim().toUpperCase();
        const transporterNameStr = String(row["Transporter Name"] || "").trim().toUpperCase();

        // Condition 0: Transporter is "For", "Owned Truck", or "By Company"
        if (transporterNameStr === "FOR" || transporterNameStr === "OWNED TRUCK" || transporterNameStr === "BY COMPANY") {
            return null;
        }

        // Condition 1: RKL or Purab AND Transporter is "For"
        if ((firmNameStr === "RKL" || firmNameStr === "PURAB") && transporterNameStr === "FOR") {
            return null;
        }
        // Condition 2: PMMPL or PMPL AND Transporter is "Ex Factory Transporter"
        if ((firmNameStr === "PMMPL" || firmNameStr === "PMPL") && (transporterNameStr === "EX FACTORY TRANSPORTER" || transporterNameStr === "EX FACTORY")) {
            return null;
        }

        return {
          _id: `lift-${row.id}-${row["Lift No"] || ''}`,
          _dbId: row.id,
          id: String(row["Lift No"] || "").trim(),
          vendorName: String(row["Vendor Name"] || "").trim(),
          rawMaterialName: String(row["Raw Material Name"] || "").trim(),
          liftType: String(row["Type"] || "").trim(),
          truckNo: String(row["Truck No."] || row["Truck Number"] || "").trim(),
          driverNo: String(row["Driver No."] || "").trim(),
          transporterName: String(row["Transporter Name"] || "").trim(),
          rateType: String(row["Type Of Transporting Rate"] || "").trim(),
          transportingRate: String(row["Transporting Per MT Rate"] || row["Transporting Rate"] || row["transportingRate"] || "").trim(),
          originalQty: String(row["Qty"] || "").trim(),
          totalBillQuantity: String(row["Total Bill Quantity"] || "").trim(),
          actualQty: String(row["Actual Quantity"] || "").trim(),
          indentNo: String(row["Indent no."] || "").trim(),
          billNo: String(row["Bill No."] || "").trim(),
          firmName: String(row["Firm Name"] || "").trim(),
          unloadApprovalRequired: String(row["Unload Approval Required"] || "").trim(),
          unloadApprovalStatus: String(row["Unload Approval Status"] || "").trim(),
          planned3: formatTimestamp(row["Planned 3"]),
          isPending: row["Planned 3"] && !row["Actual 3"] && !row["Bilty No."],
          isHistory: row["Planned 3"] && (row["Actual 3"] || row["Bilty No."]),
          biltyNumber: String(row["Bilty No."] || "").trim(),
          biltyImageUrl: String(row["Bilty Image"] || "").trim(),
          billImage: String(row["Bill Image"] || "").trim(),
          timestamp: formatTimestamp(row["Actual 3"]),
          // PO Info
          ...(() => {
            const po = findPoRow(row["Indent no."], row["Raw Material Name"], row["Vendor Name"]);
            let poRate = po ? String(po["Rate"] || "").trim() : "";
            if (po && po["PO Items"] && Array.isArray(po["PO Items"])) {
              const matLower = String(row["Raw Material Name"] || "").trim().toLowerCase();
              const itemMatch = po["PO Items"].find(it =>
                String(it.material || it.productName || "").trim().toLowerCase() === matLower
              );
              if (itemMatch) {
                poRate = String(itemMatch.rate || "").trim();
              }
            }
            if (row["Lift No"] === "LF-237") {
              console.log("[LF-237 Lift Accounts Debug] poRate resolved to:", poRate, "po:", po);
            }
            return {
              poCopy: po ? String(po["PO Copy"] || "").trim() : "",
              poRate: poRate,
            };
          })()
        };
      }).filter(row => row && row.id);

      const liftMap = new Map();
      (liftData || []).forEach(l => {
        const liftNo = String(l["Lift No"] || "").trim();
        if (liftNo) liftMap.set(liftNo, l);
      });

      const acknowledgedMismatchRows = (mismatchData || [])
        .filter((row) => String(row.Status || row["Status"] || "").trim().toLowerCase() === "acknowledge")
        .map((row) => {
          const liftNo = String(row["Lift Number"] || row["Lift ID"] || "").trim();
          const liftRecord = liftMap.get(liftNo) || {};
          const vendorName = String(row["Party Name"] || row["Vendor Name"] || liftRecord["Vendor Name"] || "").trim();
          const biltyNumber = String(row["Bilty No."] || row["Bilty No"] || liftRecord["Bilty No."] || "").trim();
          const biltyImageUrl = String(row["Bilty Image"] || liftRecord["Bilty Image"] || "").trim();
          const timestamp = row["Bilty Actual"] || row["Actual 3"] || liftRecord["Actual 3"] || row.Planned2 || row.Timestamp;
          const indentNo = String(row["Indent Number"] || row["Indent No"] || row["Indent No."] || liftRecord["Indent no."] || "").trim();
          const materialName = String(row["Product Name"] || row["Raw Material Name"] || liftRecord["Raw Material Name"] || "").trim();
          const po = findPoRow(indentNo, materialName, vendorName);

          return {
            _id: `mismatch-${row.id}-${liftNo}`,
            _dbId: row.id,
            _sourceTable: "Mismatch",
            id: liftNo,
            vendorName: String(row["Party Name"] || row["Vendor Name"] || liftRecord["Vendor Name"] || "").trim(),
            rawMaterialName: materialName,
            liftType: String(row["Type"] || liftRecord["Type"] || "").trim(),
            truckNo: String(row["Truck No."] || row["Truck No"] || liftRecord["Truck No."] || "").trim(),
            driverNo: String(row["Driver No"] || row["Driver No."] || liftRecord["Driver No."] || "").trim(),
            transporterName: String(row["Transporter Name"] || liftRecord["Transporter Name"] || "").trim(),
            rateType: String(row["Type Of Rate"] || row["Type Of Transporting Rate"] || liftRecord["Type Of Transporting Rate"] || "").trim(),
            transportingRate: String(row["Transporter Rate"] || row["Transporting Per MT Rate"] || liftRecord["Transporting Per MT Rate"] || "").trim(),
            originalQty: String(row["Qty"] || row["Quantity"] || liftRecord["Qty"] || "").trim(),
            totalBillQuantity: String(row["Total Bill Quantity"] || liftRecord["Total Bill Quantity"] || "").trim(),
            actualQty: String(row["Actual Quantity"] || row["Lifting Qty"] || liftRecord["Actual Quantity"] || "").trim(),
            indentNo,
            billNo: String(row["Bill No."] || row["Bill No"] || liftRecord["Bill No."] || "").trim(),
            firmName: String(row["Firm Name"] || liftRecord["Firm Name"] || "").trim(),
            planned3: formatTimestamp(row.Timestamp || row.Planned2 || liftRecord["Planned 3"]),
            isPending: !biltyNumber || !biltyImageUrl,
            isHistory: Boolean(biltyNumber && biltyImageUrl),
            biltyNumber,
            biltyImageUrl,
            billImage: String(row["Bill Image"] || liftRecord["Bill Image"] || "").trim(),
            timestamp: formatTimestamp(timestamp),
            poCopy: po ? String(po["PO Copy"] || "").trim() : "",
            poRate: (() => {
              let poRate = po ? String(po["Rate"] || "").trim() : "";
              if (po && po["PO Items"] && Array.isArray(po["PO Items"])) {
                const matLower = String(materialName || "").trim().toLowerCase();
                const itemMatch = po["PO Items"].find(it =>
                  String(it.material || it.productName || "").trim().toLowerCase() === matLower
                );
                if (itemMatch) {
                  poRate = String(itemMatch.rate || "").trim();
                }
              }
              if (liftNo === "LF-237") {
                console.log("[LF-237 Mismatch Debug] poRate resolved to:", poRate, "po:", po);
              }
              return poRate;
            })(),
          };
        })
        .filter(row => {
          if (!row.id) return false;
          const transporter = String(row.transporterName || "").trim().toUpperCase();
          return !(transporter === "FOR" || transporter === "OWNED TRUCK" || transporter === "BY COMPANY");
        });

      const acknowledgedMismatchLiftIds = new Set(acknowledgedMismatchRows.map((row) => row.id));
      processedRawRows = processedRawRows.filter((row) => !acknowledgedMismatchLiftIds.has(row.id));
      processedRawRows = [...processedRawRows, ...acknowledgedMismatchRows];
      if (firmNameFilter && String(firmNameFilter).toLowerCase() !== "all") {
        const userFirmNameLower = String(firmNameFilter).toLowerCase();
        processedRawRows = processedRawRows.filter(
          (lift) => lift.firmName && String(lift.firmName).toLowerCase() === userFirmNameLower,
        );
      }

      setLiftData(processedRawRows);
    } catch (err) {
      console.error("Error fetching lift data:", err);
      setError(`Failed to load lifts data: ${err.message}`);
    } finally {
      fetchInFlightRef.current = false;
      setLoading(false);
    }
  }, [firmNameFilter]);

  useEffect(() => {
    fetchLiftData({ force: true });
  }, [fetchLiftData]);

  useRealtime(["LIFT-ACCOUNTS", "Mismatch"], () => {
    console.log("[Realtime] Bilty Page refreshing due to LIFT-ACCOUNTS/Mismatch table change");
    fetchLiftData({ showLoader: false });
  });

  const pendingBilty = useMemo(() => {
    let filtered = liftData.filter(lift => lift.isPending);
    if (filters.vendorName !== "all") filtered = filtered.filter(lift => lift.vendorName === filters.vendorName);
    if (filters.materialName !== "all") filtered = filtered.filter(lift => lift.rawMaterialName === filters.materialName);
    if (filters.liftType !== "all") filtered = filtered.filter(lift => lift.liftType === filters.liftType);
    if (filters.orderNumber !== "all") filtered = filtered.filter(lift => lift.indentNo === filters.orderNumber || lift.billNo === filters.orderNumber);
    if (filters.firmName !== "all") filtered = filtered.filter(lift => lift.firmName === filters.firmName);
    return filtered;
  }, [liftData, filters]);

  const biltyHistory = useMemo(() => {
    let filtered = liftData.filter(lift => lift.isHistory);
    if (filters.vendorName !== "all") filtered = filtered.filter(lift => lift.vendorName === filters.vendorName);
    if (filters.materialName !== "all") filtered = filtered.filter(lift => lift.rawMaterialName === filters.materialName);
    if (filters.liftType !== "all") filtered = filtered.filter(lift => lift.liftType === filters.liftType);
    if (filters.orderNumber !== "all") filtered = filtered.filter(lift => lift.indentNo === filters.orderNumber || lift.billNo === filters.orderNumber);
    if (filters.firmName !== "all") filtered = filtered.filter(lift => lift.firmName === filters.firmName);
    return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [liftData, filters]);

  const uniqueFilterOptions = useMemo(() => {
    const vendors = new Set();
    const materials = new Set();
    const types = new Set();
    const orders = new Set();

    liftData.forEach(lift => {
      if (lift.vendorName) vendors.add(lift.vendorName);
      if (lift.rawMaterialName) materials.add(lift.rawMaterialName);
      if (lift.liftType) types.add(lift.liftType);
      if (lift.indentNo) orders.add(lift.indentNo);
      if (lift.billNo) orders.add(lift.billNo);
    });

    return {
      vendorName: [...vendors].sort(),
      materialName: [...materials].sort(),
      liftType: [...types].sort(),
      orderNumber: [...orders].sort(),
      firmName: [...new Set(liftData.map(l => l.firmName).filter(Boolean))].sort(),
    };
  }, [liftData]);

  const handleLiftSelect = (lift) => {
    setSelectedLift(lift);
    setFormData({ biltyNumber: lift.biltyNumber || "", biltyImageFile: null });
    setFormErrors({});
    setShowPopup(true);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setSelectedLift(null);
    setFormData({ biltyNumber: "", biltyImageFile: null });
    setFormErrors({});
  };

  const uploadFileToSupabase = async (file) => {
    if (!file || !(file instanceof File)) throw new Error("Invalid file provided.");
    try {
      const { url } = await uploadFileToStorage(file, 'image', 'bilty-images');
      return url;
    } catch (error) {
      console.error("Error uploading bilty image:", error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "biltyImageFile") {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: null }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.biltyNumber.trim()) newErrors.biltyNumber = "Bilty Number is required.";
    if (!formData.biltyImageFile && !selectedLift?.biltyImageUrl) newErrors.biltyImageFile = "Bilty Image is required.";
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm() || !selectedLift) return;
    
    setIsSubmitting(true);
    const toastId = toast.loading("Submitting Bilty details...");

    try {
      let biltyImageUrl = selectedLift.biltyImageUrl || "";
      if (formData.biltyImageFile) {
        biltyImageUrl = await uploadFileToSupabase(formData.biltyImageFile);
      }

      const now = new Date();
      const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);

      const updateData = selectedLift._sourceTable === "Mismatch" ? {
        "Bilty No.": formData.biltyNumber,
        "Bilty Image": biltyImageUrl,
        Planned2: selectedLift.planned2Raw || timestamp,
      } : {
        "Actual 3": timestamp,
        "Bilty No.": formData.biltyNumber,
        "Bilty Image": biltyImageUrl,
      };

      const { error: updateError } = await supabase
        .from(selectedLift._sourceTable === "Mismatch" ? "Mismatch" : "LIFT-ACCOUNTS")
        .update(updateData)
        .eq("id", selectedLift._dbId);

      if (updateError) throw updateError;

      toast.success("Bilty submitted successfully!", { id: toastId });
      fetchLiftData({ force: true, showLoader: false });
      handleClosePopup();
    } catch (error) {
      console.error("Error submitting bilty:", error);
      toast.error(`Submission Failed: ${error.message}`, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCell = (item, column) => {
    const value = item[column.dataKey];
    if (column.isLink) {
      return value ? (
        <a href={String(value).startsWith("http") ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className="text-[#7da23a] hover:text-green-800 hover:underline font-medium text-xs inline-flex items-center gap-1">
          <ExternalLink className="h-3 w-3" />{column.linkText || "View"}
        </a>
      ) : <span className="text-gray-400 text-xs">N/A</span>;
    }
    return value || <span className="text-xs text-gray-400">N/A</span>;
  };

  const handleToggleColumn = (tab, dataKey, checked) => {
    if (tab === "pending") {
      setVisiblePendingColumns(prev => ({ ...prev, [dataKey]: checked }));
    } else {
      setVisibleHistoryColumns(prev => ({ ...prev, [dataKey]: checked }));
    }
  };

  const handleSelectAllColumns = (tab, columnsMeta, checked) => {
    const newVisibility = {};
    columnsMeta.forEach(col => {
      if (col.toggleable && !col.alwaysVisible) newVisibility[col.dataKey] = checked;
    });
    if (tab === "pending") {
      setVisiblePendingColumns(prev => ({ ...prev, ...newVisibility }));
    } else {
      setVisibleHistoryColumns(prev => ({ ...prev, ...newVisibility }));
    }
  };

  const exportTableToCSV = (filename, columnsMeta, data, visibilityState) => {
    const exportCols = columnsMeta.filter(
      (col) => col.dataKey !== "actionColumn" && visibilityState[col.dataKey],
    );
    const headers = exportCols.map((col) => `"${col.header}"`).join(",");
    const rows = data.map((row) =>
      exportCols
        .map((col) => `"${String(row[col.dataKey] ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderTableSection = (tabKey, title, description, data, columnsMeta, visibilityState) => {
    return (
      <Card className="shadow-sm border border-border flex-1 flex flex-col">
        <CardHeader className="py-3 px-4 bg-muted/30">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center text-md font-semibold text-foreground">
                {tabKey === 'pendingBilty' ? <FileCheck className="h-5 w-5 text-[#7da23a] mr-2" /> : <History className="h-5 w-5 text-[#7da23a] mr-2" />}
                {title} ({data.length})
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-0.5">{description}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => exportTableToCSV(`bilty-${tabKey}.csv`, columnsMeta, data, visibilityState)}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
              </Button>
              <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <MixerHorizontalIcon className="mr-1.5 h-3.5 w-3.5" /> View Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-3">
                <div className="grid gap-2">
                  <p className="text-sm font-medium">Toggle Columns</p>
                  <div className="flex items-center justify-between mt-1 mb-2">
                    <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => handleSelectAllColumns(tabKey === 'pendingBilty' ? 'pending' : 'history', columnsMeta, true)}>Select All</Button>
                    <span className="text-gray-300 mx-1">|</span>
                    <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => handleSelectAllColumns(tabKey === 'pendingBilty' ? 'pending' : 'history', columnsMeta, false)}>Deselect All</Button>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {columnsMeta.filter(col => col.toggleable).map(col => (
                      <div key={`toggle-${tabKey}-${col.dataKey}`} className="flex items-center space-x-2">
                        <Checkbox
                          id={`toggle-${tabKey}-${col.dataKey}`}
                          checked={!!visibilityState[col.dataKey]}
                          onCheckedChange={(checked) => handleToggleColumn(tabKey === 'pendingBilty' ? 'pending' : 'history', col.dataKey, Boolean(checked))}
                          disabled={col.alwaysVisible}
                        />
                        <Label htmlFor={`toggle-${tabKey}-${col.dataKey}`} className="text-xs font-normal cursor-pointer">
                          {col.header}
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
        <CardContent className="p-0 flex-1 flex flex-col">
          {loading ? (
            <div className="flex flex-col justify-center items-center py-10 flex-1"><Loader2 className="h-8 w-8 text-[#7da23a] animate-spin mb-3" /><p className="text-muted-foreground">Loading...</p></div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-green-200/50 bg-green-50/50 rounded-lg mx-4 my-4 text-center flex-1">
              <Info className="h-12 w-12 text-green-500 mb-3" />
              <p className="font-medium text-foreground">No Data Found</p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[calc(100vh-500px)] relative custom-scrollbar rounded-b-lg flex-1">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-30">
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {columnsMeta.filter(col => visibilityState[col.dataKey]).map(col => (
                      <th
                        key={col.dataKey}
                        className="px-3 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap"
                      >
                        {col.header}
                      </th>
                    ))}
                    {isSuperAdmin && tabKey === 'biltyHistory' && (
                      <th className="px-3 py-3 text-xs font-bold text-purple-700 uppercase text-left bg-purple-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">
                        SA Edit
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {data.map(item => (
                    <tr key={item._id} className="hover:bg-green-50/50 transition-colors border-b border-gray-100">
                      {columnsMeta.filter(col => visibilityState[col.dataKey]).map(column => (
                        <td
                          key={column.dataKey}
                          className={`whitespace-nowrap text-xs px-3 py-2 ${column.dataKey === 'id' ? 'font-medium text-primary' : 'text-gray-700'}`}
                        >
                          {column.dataKey === "actionColumn" ? (
                            <div className="flex items-center gap-1.5">
                              <Button
                                onClick={() => handleLiftSelect(item)}
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 px-2"
                              >
                                Enter Bilty
                              </Button>
                              {isSuperAdmin && (
                                <button
                                  onClick={() => setSuperAdminEditLift(item)}
                                  className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-md hover:bg-purple-200 border border-purple-300"
                                >
                                  <ShieldCheck className="w-3 h-3 mr-1" />
                                  Edit
                                </button>
                              )}
                            </div>
                          ) : renderCell(item, column)}
                        </td>
                      ))}
                      {isSuperAdmin && tabKey === 'biltyHistory' && (
                        <td className="whitespace-nowrap text-xs px-3 py-2">
                          <button
                            onClick={() => setSuperAdminEditLift(item)}
                            className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-md hover:bg-purple-200 border border-purple-300"
                          >
                            <ShieldCheck className="w-3 h-3 mr-1" />
                            Edit
                          </button>
                        </td>
                      )}
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
    <div className="space-y-4 p-4 md:p-6 bg-slate-50 min-h-screen">
      {superAdminEditLift && (
        <SuperAdminEditModal
          title={`Edit Lift — ${superAdminEditLift.id}`}
          tableName="LIFT-ACCOUNTS"
          pkField="id"
          pkValue={superAdminEditLift._dbId}
          fields={[
            { label: "Lift No.", dbKey: "Lift No", value: superAdminEditLift.id, type: "text" },
            { label: "Vendor Name", dbKey: "Vendor Name", value: superAdminEditLift.vendorName, type: "text" },
            { label: "Raw Material Name", dbKey: "Raw Material Name", value: superAdminEditLift.rawMaterialName, type: "text" },
            { label: "Truck No.", dbKey: "Truck No.", value: superAdminEditLift.truckNo, type: "text" },
            { label: "Driver No.", dbKey: "Driver No.", value: superAdminEditLift.driverNo, type: "text" },
            { label: "Transporter Name", dbKey: "Transporter Name", value: superAdminEditLift.transporterName, type: "text" },
            { label: "Type Of Transporting Rate", dbKey: "Type Of Transporting Rate", value: superAdminEditLift.rateType, type: "text" },
            { label: "Transporting Per MT Rate", dbKey: "Transporting Per MT Rate", value: superAdminEditLift.transportingRate, type: "number" },
            { label: "Qty", dbKey: "Qty", value: superAdminEditLift.originalQty, type: "number" },
            { label: "Bill No.", dbKey: "Bill No.", value: superAdminEditLift.billNo, type: "text" },
            { label: "Firm Name", dbKey: "Firm Name", value: superAdminEditLift.firmName, type: "text" },
            { label: "Bilty No.", dbKey: "Bilty No.", value: superAdminEditLift.biltyNumber, type: "text" },
            { label: "Bilty Image URL", dbKey: "Bilty Image", value: superAdminEditLift.biltyImageUrl, type: "text" },
            { label: "Bill Image URL", dbKey: "Bill Image", value: superAdminEditLift.billImage, type: "text" },
          ]}
          onClose={() => setSuperAdminEditLift(null)}
          onSaved={() => { setSuperAdminEditLift(null); fetchLiftData({ force: true, showLoader: false }); }}
        />
      )}
      <Card className="shadow-md border-none">
        <CardHeader className="p-4 border-b border-gray-200">
          <CardTitle className="flex items-center gap-2 text-gray-700 text-lg">
            <Receipt className="h-5 w-5 text-[#7da23a]" />
            Bilty Page
          </CardTitle>
          <CardDescription className="text-gray-500 text-sm">
            Manage bilty details for material lifts.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full sm:w-[450px] grid-cols-2 mb-4">
              <TabsTrigger value="pendingBilty" className="flex items-center gap-2">
                <FileCheck className="h-4 w-4" /> Pending Bilty
                <Badge variant="secondary" className="ml-1.5">{pendingBilty.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="biltyHistory" className="flex items-center gap-2">
                <History className="h-4 w-4" /> Bilty History
                <Badge variant="secondary" className="ml-1.5">{biltyHistory.length}</Badge>
              </TabsTrigger>
            </TabsList>
            
            <div className="mb-4 p-4 bg-green-50/50 rounded-lg grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select value={filters.vendorName} onValueChange={(value) => handleFilterChange("vendorName", value)}>
                <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="All Vendors" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {uniqueFilterOptions.vendorName.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.materialName} onValueChange={(value) => handleFilterChange("materialName", value)}>
                <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="All Materials" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Materials</SelectItem>
                  {uniqueFilterOptions.materialName.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.firmName} onValueChange={(value) => handleFilterChange("firmName", value)}>
                <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="All Firms" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Firms</SelectItem>
                  {uniqueFilterOptions.firmName.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={clearAllFilters}>Clear Filters</Button>
            </div>

            <TabsContent value="pendingBilty" className="mt-0">
              {renderTableSection("pendingBilty", "Lifts Pending Bilty", "Awaiting Bilty Number and Image.", pendingBilty, PENDING_BILTY_COLUMNS_META, visiblePendingColumns)}
            </TabsContent>
            <TabsContent value="biltyHistory" className="mt-0">
              {renderTableSection("biltyHistory", "Bilty History", "Completed Bilty entries.", biltyHistory, BILTY_HISTORY_COLUMNS_META, visibleHistoryColumns)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={showPopup} onOpenChange={handleClosePopup}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Enter Bilty for {selectedLift?.id}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Bilty Number *</Label>
              <Input name="biltyNumber" value={formData.biltyNumber} onChange={handleInputChange} />
              {formErrors.biltyNumber && <p className="text-red-500 text-xs">{formErrors.biltyNumber}</p>}
            </div>
            <div>
              <Label>Bilty Image *</Label>
              <Input name="biltyImageFile" type="file" onChange={handleInputChange} accept="image/*,.pdf" />
              {formErrors.biltyImageFile && <p className="text-red-500 text-xs">{formErrors.biltyImageFile}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClosePopup}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Bilty"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
