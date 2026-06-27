import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { RefreshCw, Save, X, Edit2, Image, Filter, CheckCircle, Clock, AlertCircle, ExternalLink, Search, ShieldCheck, Download } from 'lucide-react';
import { supabase } from '../supabase';
import { toast } from 'sonner';
import { AuthContext } from '../context/AuthContext';
import SuperAdminEditModal from './SuperAdminEditModal';
import { canViewFirm } from '../utils/firmFilter';

// Modular Component Imports
import AuditEntryModal from './audit/AuditEntryModal';
import GroupedProductsDetailsModal from './audit/GroupedProductsDetailsModal';
import AuditTab from './audit/tabs/AuditTab';
import RectifyTab from './audit/tabs/RectifyTab';
import TallyEntryTab from './audit/tabs/TallyEntryTab';
import ReAuditTab from './audit/tabs/ReAuditTab';
import BillEntryTab from './audit/tabs/BillEntryTab';
import HistoryTab from './audit/tabs/HistoryTab';
import AllStagesTab from './audit/tabs/AllStagesTab';

const CallTrackerPage = () => {
  const location = useLocation();
  const { user, isSuperAdmin } = useContext(AuthContext);
  const [superAdminEditRow, setSuperAdminEditRow] = useState(null);
  const [accountsData, setAccountsData] = useState([]);
  const [auditMismatchData, setAuditMismatchData] = useState([]); 
  const [tallyEntryMismatchData, setTallyEntryMismatchData] = useState([]); 
  const [billEntryMismatchData, setBillEntryMismatchData] = useState([]); 
  const [rectifyMismatchData, setRectifyMismatchData] = useState([]); 
  const [reAuditMismatchData, setReAuditMismatchData] = useState([]); 
  const [allMismatchData, setAllMismatchData] = useState([]); 
  const [historyData, setHistoryData] = useState([]); 
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingAudit, setLoadingAudit] = useState(true); 
  const [loadingTallyEntry, setLoadingTallyEntry] = useState(true); 
  const [loadingBillEntry, setLoadingBillEntry] = useState(true); 
  const [loadingRectify, setLoadingRectify] = useState(true); 
  const [loadingReAudit, setLoadingReAudit] = useState(true); 
  const [loadingAll, setLoadingAll] = useState(true); 
  const [liftAccountsRawData, setLiftAccountsRawData] = useState([]); 
  const [error, setError] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedRows, setSubmittedRows] = useState(new Set());
  const [firmFilter, setFirmFilter] = useState('all');

  const [visibleColumns, setVisibleColumns] = useState({
    stage: true,
    timestamp: true,
    indentNumber: true,
    firmName: true,
    poRate: true,
    liftNumber: true,
    billNo: true,
    partyName: true,
    productName: true,
    qty: true,
    areaLifting: true,
    truckNo: true,
    transporterName: true,
    transporterRate: true,
    billImage: true,
    biltyNo: true,
    typeOfRate: true,
    rate: true,
    truckQty: true,
    liftingQty: true,
    biltyImage: true,
    qtyDifferenceStatus: true,
    weightSlip: true,
    debitAmount: true,
    debitNoteUrl: true,
    totalFreight: true,
    dateOfReceiving: true,
    remarks: true,
    auditRemarks: false,
    rectifyRemarks: false,
    reauditRemarks: false,
    tallyRemarks: false,
    billRemarks: false,
    auditStatus: false,
    rectifyStatus: false,
    reAuditStatus: false,
    tallyStatus: false,
    status: false,
    actions: true
  });
  const [liftWeightSlipMap, setLiftWeightSlipMap] = useState({}); 
  const [liftTypeMap, setLiftTypeMap] = useState({}); 
  const [liftBiltyNoMap, setLiftBiltyNoMap] = useState({}); 
  const [liftBiltyImageMap, setLiftBiltyImageMap] = useState({}); 
  const [liftActualQtyMap, setLiftActualQtyMap] = useState({}); 
  const [liftDateOfReceivingMap, setLiftDateOfReceivingMap] = useState({}); 
  const [liftTransporterRateMap, setLiftTransporterRateMap] = useState({}); 
  const [liftActual2Map, setLiftActual2Map] = useState({});
  const [liftTransporterMap, setLiftTransporterMap] = useState({});
  const [showColumnFilter, setShowColumnFilter] = useState(false);
  const [activeTab, setActiveTab] = useState('AUDIT'); 
  const [poToIndentMap, setPoToIndentMap] = useState({});
  const [poToRateMap, setPoToRateMap] = useState({});
  const [poToAluminaMap, setPoToAluminaMap] = useState({});
  const [poToIronMap, setPoToIronMap] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  // State for collapsible grouped rows in Accounts Audit tab
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [viewGroupItems, setViewGroupItems] = useState(null);
  const [editingGroupItems, setEditingGroupItems] = useState(null);

  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  useEffect(() => {
    const fetchPOMapping = async () => {
      try {
        const { data, error } = await supabase
          .from("INDENT-PO")
          .select('po_number, "Indent Id.", Rate, "Alumina %", "Iron %"');
        
        if (!error && data) {
          const indentMap = {};
          const rateMap = {};
          const aluminaMap = {};
          const ironMap = {};
          data.forEach(row => {
            const rawPo = String(row.po_number || "").trim().toUpperCase();
            const rawIndent = String(row["Indent Id."] || "").trim().toUpperCase();

            if (rawPo) {
              indentMap[rawPo] = row["Indent Id."];
              rateMap[rawPo] = row["Rate"];
              aluminaMap[rawPo] = row["Alumina %"];
              ironMap[rawPo] = row["Iron %"];
              
              const parts = rawPo.split('/');
              if (parts.length > 1) {
                const normalizedPo = parts.slice(1).join('/');
                if (!indentMap[normalizedPo]) {
                  indentMap[normalizedPo] = row["Indent Id."];
                  rateMap[normalizedPo] = row["Rate"];
                  aluminaMap[normalizedPo] = row["Alumina %"];
                  ironMap[normalizedPo] = row["Iron %"];
                }
              }
            }
            
            if (rawIndent) {
              rateMap[rawIndent] = row["Rate"];
              aluminaMap[rawIndent] = row["Alumina %"];
              ironMap[rawIndent] = row["Iron %"];
            }
          });
          setPoToIndentMap(indentMap);
          setPoToRateMap(rateMap);
          setPoToAluminaMap(aluminaMap);
          setPoToIronMap(ironMap);
        }
      } catch (err) {
        console.error("Error fetching PO mapping:", err);
      }
    };
    fetchPOMapping();
  }, []);

  const SHEET_ID = "13_sHCFkVxAzPbel-k9BuUBFY-E11vdKJAOgvzhBMLMY";
  const SHEET_NAME = "ACCOUNTS";

  const STAGES = {
    AUDIT: {
      name: 'Audit',
      color: 'bg-yellow-100 text-yellow-800',
      icon: CheckCircle,
      description: 'Initial audit verification'
    },
    RECTIFY: {
      name: 'Rectify',
      color: 'bg-green-100 text-green-800',
      icon: AlertCircle,
      description: 'Correct mistakes and add bilty'
    },
    RECTIFY_2: {
      name: 'Rectify 2',
      color: 'bg-cyan-100 text-cyan-800',
      icon: AlertCircle,
      description: 'Second round of corrections'
    },
    TALLY_ENTRY: {
      name: 'Tally Entry',
      color: 'bg-green-100 text-green-800',
      icon: Clock,
      description: 'Enter data into tally system'
    },
    REAUDIT: {
      name: 'Re-Audit',
      color: 'bg-orange-100 text-orange-800',
      icon: RefreshCw,
      description: 'Re-audit after corrections'
    },
    BILL_ENTRY: {
      name: 'Bill Received',
      color: 'bg-emerald-100 text-emerald-800',
      icon: Save,
      description: 'Enter original bills'
    },
    COMPLETED: {
      name: 'Completed',
      color: 'bg-green-100 text-green-800',
      icon: CheckCircle,
      description: 'All stages completed'
    }
  };

  const TAB_ORDER = ['AUDIT', 'RECTIFY', 'REAUDIT', 'TALLY_ENTRY', 'BILL_ENTRY'];

  const formatDate = (dateString) => {
    if (!dateString || dateString === '') return '-';

    try {
      let date;

      const dateMatch = dateString.match(/^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)$/);
      if (dateMatch) {
        const [, year, month, day, hours, minutes, seconds] = dateMatch.map(Number);
        date = new Date(year, month - 1, day, hours || 0, minutes || 0, seconds || 0);
      }
      else if (!isNaN(dateString) && parseFloat(dateString) > 30000) {
        const serialNumber = parseFloat(dateString);
        date = new Date((serialNumber - 25569) * 86400 * 1000);
      }
      else if (dateString.includes('/') || dateString.includes('-')) {
        date = new Date(dateString);
      }
      else {
        date = new Date(dateString);
      }

      if (isNaN(date.getTime())) {
        return dateString;
      }

      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');

      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

    } catch (error) {
      console.error('Date formatting error:', error);
      return dateString;
    }
  };

  const getCellValue = (row, colIndex) => {
    const cell = row.c?.[colIndex];
    if (!cell) return null;
    if (cell.v !== undefined && cell.v !== null) return String(cell.v).trim();
    return null;
  };

  const calculateDelayDays = (timestampString) => {
    if (!timestampString || timestampString === '' || timestampString === '-') return 0;

    try {
      let originalDate;

      if (!isNaN(timestampString) && parseFloat(timestampString) > 30000) {
        const serialNumber = parseFloat(timestampString);
        originalDate = new Date((serialNumber - 25569) * 86400 * 1000);
      } else if (timestampString.includes('/') || timestampString.includes('-')) {
        originalDate = new Date(timestampString);
      } else {
        originalDate = new Date(timestampString);
      }

      if (isNaN(originalDate.getTime())) {
        return 0;
      }

      const currentDate = new Date();
      const timeDifference = currentDate.getTime() - originalDate.getTime();
      const daysDifference = Math.floor(timeDifference / (1000 * 3600 * 24));

      return Math.max(0, daysDifference);

    } catch (error) {
      console.error('Error calculating delay:', error);
      return 0;
    }
  };

  const determineStage = (row) => {
    const rectifyActual = getCellValue(row, 21);
    const rectify2Planned = getCellValue(row, 30);
    const rectify2Actual = getCellValue(row, 31);
    const tallyPlanned = getCellValue(row, 35);
    const tallyActual = getCellValue(row, 36);
    const auditPlanned = getCellValue(row, 25);
    const auditActual = getCellValue(row, 26);
    const reauditPlanned = getCellValue(row, 40);
    const reauditActual = getCellValue(row, 41);
    const billEntryPlanned = getCellValue(row, 45);
    const billEntryActual = getCellValue(row, 46);

    if (rectifyActual && rectify2Actual && tallyActual && auditActual && reauditActual && billEntryActual) {
      return 'COMPLETED';
    }

    if (billEntryPlanned && billEntryPlanned !== '' && (!billEntryActual || billEntryActual === '')) {
      return 'BILL_ENTRY';
    }

    if (reauditPlanned && reauditPlanned !== '' && (!reauditActual || reauditActual === '')) {
      return 'REAUDIT';
    }

    if (auditPlanned && auditPlanned !== '' && (!auditActual || auditActual === '')) {
      return 'AUDIT';
    }

    if (tallyPlanned && tallyPlanned !== '' && (!tallyActual || tallyActual === '')) {
      return 'TALLY_ENTRY';
    }

    if (rectify2Planned && rectify2Planned !== '' && (!rectify2Actual || rectify2Actual === '')) {
      return 'RECTIFY_2';
    }

    if (!rectifyActual || rectifyActual === '') {
      return 'RECTIFY';
    }

    return 'COMPLETED';
  };

  const getStageConfig = (stage) => {
    switch (stage) {
      case 'RECTIFY':
        return {
          type: 'rectify',
          includeDelay: true,
          statusOptions: ['Done']
        };
      case 'RECTIFY_2':
        return {
          type: 'rectify-mistake-2',
          includeDelay: true,
          statusOptions: ['Done', 'Not Done']
        };
      case 'TALLY_ENTRY':
        return {
          type: 'take-entry-tally',
          includeDelay: false,
          statusOptions: ['Done', 'Not Done']
        };
      case 'AUDIT':
        return {
          type: 'audit-data',
          includeDelay: false,
          statusOptions: ['Done', 'Not Done']
        };
      case 'REAUDIT':
        return {
          type: 'again-auditing',
          includeDelay: true,
          statusOptions: ['Done']
        };
      case 'BILL_ENTRY':
        return {
          type: 'original-bills',
          includeDelay: true,
          statusOptions: ['Done', 'Not Done']
        };
      default:
        return null;
    }
  };

  const initializeFormData = (stage) => {
    setFormData({
      stage: stage,
      status: getDefaultStatusForStage(stage),
      remarks: ''
    });
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getDefaultStatusForStage = (stage) => (
    ['RECTIFY', 'REAUDIT', 'RE_AUDIT'].includes(stage) ? 'Done' : 'Not Done'
  );

  const getAuditNextStagePayload = (actualDateTime) => (
    formData.status === 'Done'
      ? { Planned4: actualDateTime }
      : { Planned3: actualDateTime }
  );

  const getRectifyNextStagePayload = (actualDateTime) => ({
    Planned5: actualDateTime
  });

  const getReAuditNextStagePayload = (actualDateTime) => ({
    Planned4: actualDateTime
  });

  const filterRowsByUserFirm = (rows) => {
    if (!user?.firmName) return rows;
    return rows.filter((entry) => canViewFirm(user.firmName, entry.firmName));
  };

  const isAuditNotDone = (row) => String(row.Status2 || '').trim().toLowerCase() === 'not done';
  const isAuditDone = (row) => String(row.Status2 || '').trim().toLowerCase() === 'done';
  const isReAuditDone = (row) => String(row.Status5 || '').trim().toLowerCase() === 'done';
  const hasBiltyDetails = (row, liftNo) => {
    const actualLiftNo = (typeof liftNo === 'string') ? liftNo : null;
    const normalizedLiftNo = String(actualLiftNo || row["Lift ID"] || row["Lift Number"] || row["Lift No"] || "").trim();
    const transporter = String(row["Transporter Name"] || liftTransporterMap[normalizedLiftNo] || "").trim().toUpperCase();
    const isBypassed = transporter === "FOR" || transporter === "OWNED TRUCK" || transporter === "BY COMPANY";
    if (isBypassed) {
      const labCompleted = String(row["Actual 2"] || liftActual2Map[normalizedLiftNo] || "").trim();
      return Boolean(labCompleted);
    }
    const biltyNo = String(row["Bilty No."] || row["Bilty No"] || liftBiltyNoMap[normalizedLiftNo] || "").trim();
    const biltyImage = String(row["Bilty Image"] || liftBiltyImageMap[normalizedLiftNo] || "").trim();
    return Boolean(biltyNo && biltyImage);
  };
  const getLiftKey = (row) => String(row["Lift ID"] || row["Lift Number"] || row["Lift No"] || "").trim();
  const getLiftTransporterRate = (row) => liftTransporterRateMap[getLiftKey(row)] || "";
  const getTotalFreightValue = (row) => row["Total Freight"] || getLiftTransporterRate(row) || "";
  const getQtyDifferenceStatus = (row) => {
    const materialQty = parseFloat(row["Truck Qty"] || 0);
    const truckQty = parseFloat(liftActualQtyMap[String(row["Lift ID"] || "").trim()] || row["Lifting Qty"] || 0);
    return (truckQty - materialQty).toFixed(3);
  };
  const shouldShowInTallyEntry = (row) => (
    hasBiltyDetails(row) && !row.Actual4 && (row.Planned4 || (row.Actual2 && isAuditDone(row)) || (row.Actual5 && isReAuditDone(row)))
  );

  const submitFormData = async () => {
    if (editingGroupItems && editingGroupItems.length > 0) {
      setSubmitting(true);
      try {
        const currentDate = new Date();
        const actualDateTime = ((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`)(currentDate);
        
        const parseNumeric = (val) => {
          if (val === null || val === undefined || val === '') return null;
          const num = parseFloat(val);
          return isNaN(num) ? null : num;
        };

        const promises = editingGroupItems.map(async (item) => {
          let itemStage = item.currentStage || activeTab;
          if (itemStage === 'ALL') {
            itemStage = item.currentStage || 'AUDIT';
          }

          if (item.isNewFromLift) {
            const rawLift = liftAccountsRawData.find(l => String(l["Lift No"] || "").trim() === item.liftNumber);
            if (!rawLift) throw new Error(`Could not find raw lift data for lift ${item.liftNumber}`);

            const { error: insertError } = await supabase
              .from("Mismatch")
              .insert({
                "Lift ID": item.liftNumber,
                "Lift Number": item.liftNumber,
                "Type": item.type || rawLift["Type"] || "",
                "Bill No.": item.billNo || rawLift["Bill No."] || "",
                "Party Name": item.partyName || rawLift["Vendor Name"] || "",
                "Product Name": item.productName || rawLift["Raw Material Name"] || "",
                "Qty": parseNumeric(item.qty || rawLift["Qty"]),
                "Area Lifting": item.areaLifting || rawLift["Area lifting"] || "",
                "Truck No.": item.truckNo || rawLift["Truck No."] || "",
                "Transporter Name": item.transporterName || rawLift["Transporter Name"] || "",
                "Bill Image": item.billImage || rawLift["Bill Image"] || "",
                "Bilty No.": item.biltyNo || rawLift["Bilty No."] || "",
                "Rate": parseNumeric(item.rate || rawLift["Rate"]),
                "Truck Qty": parseNumeric(item.truckQty || rawLift["Truck Qty"]),
                "Bilty Image": item.biltyImage || rawLift["Bilty Image"] || "",
                "Weight Slip": item.weightSlip || rawLift["Image Of Weight Slip"] || "",
                "Total Freight": parseNumeric(item.totalFreight || rawLift["Total Freight"] || rawLift["Transporter Rate"]),
                "Firm Name": item.firmName || rawLift["Firm Name"] || "",
                "Actual2": actualDateTime,
                "Planned2": rawLift["Timestamp"] || actualDateTime,
                "Status2": formData.status || 'Done',
                "Remarks2": formData.remarks || '',
                ...getAuditNextStagePayload(actualDateTime)
              });

            if (insertError) throw insertError;
          } else {
            let updatePayload = {};
            if (itemStage === 'AUDIT') {
              updatePayload = {
                Actual2: actualDateTime,
                Status2: formData.status || 'Done',
                Remarks2: formData.remarks || '',
                ...getAuditNextStagePayload(actualDateTime)
              };
            } else if (itemStage === 'RECTIFY') {
              updatePayload = {
                Actual3: actualDateTime,
                Status3: formData.status || 'Done',
                Remarks3: formData.remarks || '',
                ...getRectifyNextStagePayload(actualDateTime)
              };
            } else if (itemStage === 'TALLY_ENTRY') {
              updatePayload = {
                Actual4: actualDateTime,
                Status4: formData.status || 'Done',
                Remarks4: formData.remarks || ''
              };
            } else if (itemStage === 'REAUDIT' || itemStage === 'RE_AUDIT') {
              updatePayload = {
                Actual5: actualDateTime,
                Status5: formData.status || 'Done',
                Remarks5: formData.remarks || '',
                ...getReAuditNextStagePayload(actualDateTime)
              };
            } else if (itemStage === 'BILL_ENTRY') {
              updatePayload = {
                Actual6: actualDateTime,
                Status6: formData.status || 'Done',
                Remarks6: formData.remarks || ''
              };
            } else {
              updatePayload = {
                Actual2: actualDateTime,
                Status2: formData.status || 'Done',
                Remarks2: formData.remarks || ''
              };
            }

            const { error: updateError } = await supabase
              .from("Mismatch")
              .update(updatePayload)
              .eq("id", item.supabaseId);

            if (updateError) throw updateError;
          }

          setSubmittedRows(prev => new Set([...prev, `${itemStage}_${item.id}`]));
        });

        await Promise.all(promises);

        setEditingRow(null);
        setEditingGroupItems(null);
        toast.success(`✅ SUCCESS: Group mismatch data submitted for ${editingGroupItems.length} products`);

        setTimeout(() => {
          fetchAuditDataFromSupabase();
          fetchRectifyDataFromSupabase();
          fetchTallyEntryDataFromSupabase();
          fetchReAuditDataFromSupabase();
          fetchBillEntryDataFromSupabase();
          fetchAllDataFromSupabase();
        }, 1000);

      } catch (error) {
        console.error('Group submission error:', error);
        toast.error(`❌ GROUP SUBMISSION FAILED: ${error.message}`);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!editingRow) return;

    const auditRow = auditMismatchData.find(r => r.id === editingRow && !r.isNewFromLift);

    if (auditRow) {
      setSubmitting(true);
      try {
        const currentDate = new Date();
        const actualDateTime = ((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`)(currentDate);

        const { error: updateError } = await supabase
          .from("Mismatch")
          .update({
            Actual2: actualDateTime,
            Status2: formData.status || 'Done',
            Remarks2: formData.remarks || '',
            ...getAuditNextStagePayload(actualDateTime)
          })
          .eq("id", auditRow.supabaseId);

        if (updateError) throw updateError;

        setSubmittedRows(prev => new Set([...prev, `AUDIT_${editingRow}`]));
        setEditingRow(null);

        const formattedDateTime = ((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`)(currentDate);
        toast.success(`✅ SUCCESS: Mismatch data submitted to Mismatch table for: ${auditRow.liftNumber} Submitted at: ${formattedDateTime}`);

        setTimeout(() => {
          fetchAuditDataFromSupabase();
          fetchRectifyDataFromSupabase();
          fetchTallyEntryDataFromSupabase();
          fetchAllDataFromSupabase();
        }, 1000);

      } catch (error) {
        console.error('Submission error:', error);
        toast.error(`❌ SUBMISSION FAILED: ${error.message}`);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const newLiftRow = auditMismatchData.find(r => r.id === editingRow && r.isNewFromLift);

    if (newLiftRow) { 
      setSubmitting(true);
      try {
        const currentDate = new Date();
        const actualDateTime = ((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`)(currentDate);

        const rawLift = liftAccountsRawData.find(l => String(l["Lift No"] || "").trim() === newLiftRow.liftNumber);
        
        if (!rawLift) throw new Error("Could not find raw lift data for insertion");

        const parseNumeric = (val) => {
          if (val === null || val === undefined || val === '') return null;
          const num = parseFloat(val);
          return isNaN(num) ? null : num;
        };

        const { error: insertError } = await supabase
          .from("Mismatch")
          .insert({
            "Lift ID": newLiftRow.liftNumber,
            "Lift Number": newLiftRow.liftNumber,
            "Type": newLiftRow.type || rawLift["Type"] || "",
            "Bill No.": newLiftRow.billNo || rawLift["Bill No."] || "",
            "Party Name": newLiftRow.partyName || rawLift["Vendor Name"] || "",
            "Product Name": newLiftRow.productName || rawLift["Raw Material Name"] || "",
            "Qty": parseNumeric(newLiftRow.qty || rawLift["Qty"]),
            "Area Lifting": newLiftRow.areaLifting || rawLift["Area lifting"] || "",
            "Truck No.": newLiftRow.truckNo || rawLift["Truck No."] || "",
            "Transporter Name": newLiftRow.transporterName || rawLift["Transporter Name"] || "",
            "Bill Image": newLiftRow.billImage || rawLift["Bill Image"] || "",
            "Bilty No.": newLiftRow.biltyNo || rawLift["Bilty No."] || "",
            "Rate": parseNumeric(newLiftRow.rate || rawLift["Rate"]),
            "Truck Qty": parseNumeric(newLiftRow.truckQty || rawLift["Truck Qty"]),
            "Bilty Image": newLiftRow.biltyImage || rawLift["Bilty Image"] || "",
            "Weight Slip": newLiftRow.weightSlip || rawLift["Image Of Weight Slip"] || "",
            "Total Freight": parseNumeric(newLiftRow.totalFreight || rawLift["Total Freight"] || rawLift["Transporter Rate"]),
            "Firm Name": newLiftRow.firmName || rawLift["Firm Name"] || "",
            "Actual2": actualDateTime,
            "Planned2": rawLift["Timestamp"] || actualDateTime,
            "Status2": formData.status || 'Done',
            "Remarks2": formData.remarks || '',
            ...getAuditNextStagePayload(actualDateTime)
          });

        if (insertError) throw insertError;

        setSubmittedRows(prev => new Set([...prev, `AUDIT_${editingRow}`]));
        setEditingRow(null);

        toast.success(`✅ SUCCESS: New record created in Mismatch table for: ${newLiftRow.liftNumber}`);

        setTimeout(() => {
          fetchAuditDataFromSupabase();
          fetchRectifyDataFromSupabase();
          fetchTallyEntryDataFromSupabase();
          fetchAllDataFromSupabase();
        }, 1000);

      } catch (error) {
        console.error('Insertion error:', error);
        toast.error(`❌ INSERTION FAILED: ${error.message}`);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const tallyEntryRow = tallyEntryMismatchData.find(r => r.id === editingRow);

    if (tallyEntryRow) {
      setSubmitting(true);
      try {
        const currentDate = new Date();
        const actualDateTime = ((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`)(currentDate);

        const { error: updateError } = await supabase
          .from("Mismatch")
          .update({
            Actual4: actualDateTime,
            Status4: formData.status || 'Done',
            Remarks4: formData.remarks || ''
          })
          .eq("id", tallyEntryRow.supabaseId);

        if (updateError) throw updateError;

        setSubmittedRows(prev => new Set([...prev, `TALLY_ENTRY_${editingRow}`]));
        setEditingRow(null);

        const formattedDateTime = ((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`)(currentDate);
        toast.success(`✅ SUCCESS: Mismatch data submitted to Mismatch table for: ${tallyEntryRow.liftNumber} Submitted at: ${formattedDateTime}`);

        setTimeout(() => {
          fetchTallyEntryDataFromSupabase();
          fetchAllDataFromSupabase(); 
        }, 1000);

      } catch (error) {
        console.error('Submission error:', error);
        toast.error(`❌ SUBMISSION FAILED: ${error.message}`);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const billEntryRow = billEntryMismatchData.find(r => r.id === editingRow);

    if (billEntryRow) {
      setSubmitting(true);
      try {
        const currentDate = new Date();
        const actualDateTime = ((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`)(currentDate);

        const { error: updateError } = await supabase
          .from("Mismatch")
          .update({
            Actual6: actualDateTime,
            Status6: formData.status || 'Done',
            Remarks6: formData.remarks || ''
          })
          .eq("id", billEntryRow.supabaseId);

        if (updateError) throw updateError;

        setSubmittedRows(prev => new Set([...prev, `BILL_ENTRY_${editingRow}`]));
        setEditingRow(null);

        const formattedDateTime = ((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`)(currentDate);
        toast.success(`✅ SUCCESS: Mismatch data submitted to Mismatch table for: ${billEntryRow.liftNumber} Submitted at: ${formattedDateTime}`);

        setTimeout(() => {
          fetchBillEntryDataFromSupabase();
          fetchAllDataFromSupabase(); 
        }, 1000);

      } catch (error) {
        console.error('Submission error:', error);
        toast.error(`❌ SUBMISSION FAILED: ${error.message}`);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const rectifyRow = rectifyMismatchData.find(r => r.id === editingRow);

    if (rectifyRow) {
      setSubmitting(true);
      try {
        const currentDate = new Date();
        const actualDateTime = ((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`)(currentDate);

        const { error: updateError } = await supabase
          .from("Mismatch")
          .update({
            Actual3: actualDateTime,
            Status3: formData.status || 'Done',
            Remarks3: formData.remarks || '',
            ...getRectifyNextStagePayload(actualDateTime)
          })
          .eq("id", rectifyRow.supabaseId);

        if (updateError) throw updateError;

        setSubmittedRows(prev => new Set([...prev, `RECTIFY_${editingRow}`]));
        setEditingRow(null);

        const formattedDateTime = ((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`)(currentDate);
        toast.success(`✅ SUCCESS: Mismatch data submitted to Mismatch table for: ${rectifyRow.liftNumber} Submitted at: ${formattedDateTime}`);

        setTimeout(() => {
          fetchRectifyDataFromSupabase();
          fetchReAuditDataFromSupabase();
          fetchAllDataFromSupabase(); 
        }, 1000);

      } catch (error) {
        console.error('Submission error:', error);
        toast.error(`❌ SUBMISSION FAILED: ${error.message}`);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const reAuditRow = reAuditMismatchData.find(r => r.id === editingRow);

    if (reAuditRow) {
      setSubmitting(true);
      try {
        const currentDate = new Date();
        const actualDateTime = ((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`)(currentDate);

        const { error: updateError } = await supabase
          .from("Mismatch")
          .update({
            Actual5: actualDateTime,
            Status5: formData.status || 'Done',
            Remarks5: formData.remarks || '',
            ...getReAuditNextStagePayload(actualDateTime)
          })
          .eq("id", reAuditRow.supabaseId);

        if (updateError) throw updateError;

        setSubmittedRows(prev => new Set([...prev, `RE_AUDIT_${editingRow}`]));
        setEditingRow(null);

        const formattedDateTime = ((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`)(currentDate);
        toast.success(`✅ SUCCESS: Mismatch data submitted to Mismatch table for: ${reAuditRow.liftNumber} Submitted at: ${formattedDateTime}`);

        setTimeout(() => {
          fetchReAuditDataFromSupabase();
          fetchTallyEntryDataFromSupabase();
          fetchAllDataFromSupabase(); 
        }, 1000);

      } catch (error) {
        console.error('Submission error:', error);
        toast.error(`❌ SUBMISSION FAILED: ${error.message}`);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const allRow = allMismatchData.find(r => r.id === editingRow);

    if (allRow) {
      setSubmitting(true);
      try {
        const currentDate = new Date();
        const actualDateTime = ((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`)(currentDate);

        let updateColumns = {};
        switch (allRow.currentStage) {
          case 'AUDIT':
            updateColumns = {
              Actual2: actualDateTime,
              Status2: formData.status || 'Done',
              Remarks2: formData.remarks || '',
              ...getAuditNextStagePayload(actualDateTime)
            };
            break;
          case 'RECTIFY':
            updateColumns = {
              Actual3: actualDateTime,
              Status3: formData.status || 'Done',
              Remarks3: formData.remarks || '',
              ...getRectifyNextStagePayload(actualDateTime)
            };
            break;
          case 'TALLY_ENTRY':
            updateColumns = {
              Actual4: actualDateTime,
              Status4: formData.status || 'Done',
              Remarks4: formData.remarks || ''
            };
            break;
          case 'REAUDIT':
            updateColumns = {
              Actual5: actualDateTime,
              Status5: formData.status || 'Done',
              Remarks5: formData.remarks || '',
              ...getReAuditNextStagePayload(actualDateTime)
            };
            break;
          case 'BILL_ENTRY':
            updateColumns = {
              Actual6: actualDateTime,
              Status6: formData.status || 'Done',
              Remarks6: formData.remarks || ''
            };
            break;
          default:
            throw new Error(`Unknown stage: ${allRow.currentStage}`);
        }

        const { error: updateError } = await supabase
          .from("Mismatch")
          .update(updateColumns)
          .eq("id", allRow.supabaseId);

        if (updateError) throw updateError;

        setSubmittedRows(prev => new Set([...prev, `ALL_${editingRow}`]));
        setEditingRow(null);

        const formattedDateTime = ((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`)(currentDate);
        toast.success(`✅ SUCCESS: Mismatch data submitted to Mismatch table for: ${allRow.liftNumber} Submitted at: ${formattedDateTime}`);

        setTimeout(() => {
          fetchAllDataFromSupabase();
          fetchAuditDataFromSupabase();
          fetchRectifyDataFromSupabase();
          fetchTallyEntryDataFromSupabase();
          fetchReAuditDataFromSupabase();
          fetchBillEntryDataFromSupabase();
        }, 1000);

      } catch (error) {
        console.error('Submission error:', error);
        toast.error(`❌ SUBMISSION FAILED: ${error.message}`);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const row = accountsData.find(r => r.id === editingRow);
    if (!row || !row.liftNumber) {
      alert('Error: Could not find lift number for this row');
      return;
    }

    const stageConfig = getStageConfig(row.currentStage);
    if (!stageConfig) {
      alert('Invalid stage configuration');
      return;
    }

    setSubmitting(true);

    try {
      const appsScriptUrl = 'https://script.google.com/macros/s/AKfycbylQZLstOi0LyDisD6Z6KKC97pU5YJY2dDYVw2gtnW1fxZq9kz7wHBei4aZ8Ed-XKhKEA/exec';

      const currentDate = new Date();
      const actualDateTime = currentDate.toLocaleString("en-GB", { hour12: false }).replace(",", "");
      const delayDays = calculateDelayDays(row.timestamp);

      const submitFormData = {
        actual: actualDateTime,
        status: formData.status || 'Not Done',
        remarks: formData.remarks || ''
      };

      if (stageConfig.includeDelay) {
        if (row.currentStage === 'RECTIFY' && formData.status !== 'Done') {
          submitFormData.delay = String(delayDays);
        } else if (row.currentStage === 'RECTIFY_2') {
          submitFormData.delay = String(delayDays);
        } else if (row.currentStage === 'REAUDIT') {
          submitFormData.delay = String(delayDays);
        } else if (row.currentStage === 'BILL_ENTRY') {
          submitFormData.delay = String(delayDays);
        }
      }

      const requestData = {
        action: 'submitForm',
        sheetName: 'ACCOUNTS',
        liftNo: row.liftNumber,
        type: stageConfig.type,
        formData: JSON.stringify(submitFormData)
      };

      const formDataToSend = new FormData();
      Object.keys(requestData).forEach(key => {
        formDataToSend.append(key, requestData[key]);
      });

      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        body: formDataToSend,
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();
      let result;

      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        const responseLower = responseText.toLowerCase();
        const successIndicators = ['success', 'updated', 'submitted', 'complete', 'true'];
        const errorIndicators = ['error', 'failed', 'exception', 'false'];

        const hasSuccess = successIndicators.some(indicator => responseLower.includes(indicator));
        const hasError = errorIndicators.some(indicator => responseLower.includes(indicator));

        if (hasError && !hasSuccess) {
          throw new Error(`Apps Script error: ${responseText}`);
        } else {
          result = { success: true, message: 'Form submitted successfully' };
        }
      }

      if (result.success === false || (result.error && !result.success)) {
        throw new Error(result.error || result.message || 'Form submission failed');
      }

      setSubmittedRows(prev => new Set([...prev, `${row.currentStage}_${editingRow}`]));
      setEditingRow(null);

      const successMsg = submitFormData.delay
        ? `✅ SUCCESS: Form submitted for Lift Number: ${row.liftNumber}\nStage: ${STAGES[row.currentStage].name}\nActual Date: ${actualDateTime}\nDelay: ${delayDays} days`
        : `✅ SUCCESS: Form submitted for Lift Number: ${row.liftNumber}\nStage: ${STAGES[row.currentStage].name}\nActual Date: ${actualDateTime}`;

      alert(successMsg);

      setTimeout(() => {
        fetchData();
      }, 2000);

    } catch (error) {
      console.error('Submission error:', error);
      alert(`❌ SUBMISSION FAILED: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}&cb=${new Date().getTime()}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch sheet data: ${response.status} ${response.statusText}`);
      }

      let text = await response.text();
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("Invalid response format from Google Sheets.");
      }

      const data = JSON.parse(text.substring(jsonStart, jsonEnd + 1));

      if (!data.table || !data.table.rows) {
        setAccountsData([]);
        return;
      }

      let parsedData = data.table.rows.map((row, index) => {
        if (!row || !row.c) return null;

        const firstCellValue = getCellValue(row, 0);
        const secondCellValue = getCellValue(row, 1);

        if (firstCellValue === 'Timestamp' ||
          firstCellValue === 'Rectify The Mistake & Bilty Add' ||
          secondCellValue === 'Lift Number' ||
          !firstCellValue || firstCellValue === '') {
          return null;
        }

        const liftNumber = getCellValue(row, 1) || '';

        const rowData = {
          id: index,
          timestamp: formatDate(getCellValue(row, 0)) || '',
          liftNumber,
          type: getCellValue(row, 2) || '',
          billNo: getCellValue(row, 3) || '',
          partyName: getCellValue(row, 4) || '',
          productName: getCellValue(row, 5) || '',
          qty: getCellValue(row, 6) || '',
          areaLifting: getCellValue(row, 7) || '',
          truckNo: getCellValue(row, 8) || '',
          transporterName: getCellValue(row, 9) || '',
          billImage: getCellValue(row, 10) || '',
          biltyNo: getCellValue(row, 11) || '',
          typeOfRate: getCellValue(row, 12) || '',
          rate: getCellValue(row, 13) || '',
          truckQty: getCellValue(row, 14) || '',
          biltyImage: getCellValue(row, 15) || '',
          qtyDifferenceStatus: getCellValue(row, 16) || '',
          differenceQty: getCellValue(row, 17) || '',
          weightSlip: getCellValue(row, 18) || '',
          totalFreight: getCellValue(row, 19) || liftTransporterRateMap[liftNumber] || '',
          auditRemarks: getCellValue(row, 29) || '',
          rectifyRemarks: getCellValue(row, 24) || '',
          tallyRemarks: getCellValue(row, 39) || '',
          reauditRemarks: getCellValue(row, 44) || '',
          billRemarks: getCellValue(row, 49) || '',
          auditStatus: getCellValue(row, 28) || '',
          rectifyStatus: getCellValue(row, 23) || '',
          reAuditStatus: getCellValue(row, 43) || '',
          tallyStatus: getCellValue(row, 38) || '',
          rawRow: row
        };

        const hasData = Object.values(rowData).some(value =>
          value && value !== '' && value !== index && value !== row
        );

        if (!hasData) return null;

        const stage = determineStage(row);
        rowData.currentStage = stage;

        switch (stage) {
          case 'RECTIFY':
            rowData.status = getCellValue(row, 23) || '';
            rowData.remarks = getCellValue(row, 24) || '';
            break;
          case 'RECTIFY_2':
            rowData.status = getCellValue(row, 33) || '';
            rowData.remarks = getCellValue(row, 34) || '';
            break;
          case 'TALLY_ENTRY':
            rowData.status = getCellValue(row, 38) || '';
            rowData.remarks = getCellValue(row, 39) || '';
            break;
          case 'AUDIT':
            rowData.status = getCellValue(row, 28) || '';
            rowData.remarks = getCellValue(row, 29) || '';
            break;
          case 'REAUDIT':
            rowData.status = getCellValue(row, 43) || '';
            rowData.remarks = getCellValue(row, 44) || '';
            break;
          case 'BILL_ENTRY':
            rowData.status = getCellValue(row, 48) || '';
            rowData.remarks = getCellValue(row, 49) || '';
            break;
          default:
            rowData.status = '';
            rowData.remarks = '';
        }

        return rowData;
      }).filter(Boolean);

      parsedData = parsedData.filter(item => {
        if (item.currentStage === 'COMPLETED') return false;
        const submittedKey = `${item.currentStage}_${item.id}`;
        return !submittedRows.has(submittedKey);
      });

      setAccountsData(parsedData);

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchLiftAccountsMeta = async () => {
      try {
        const { data } = await supabase
          .from("LIFT-ACCOUNTS")
          .select('"Lift No", "Image Of Weight Slip", "Type", "Bilty No.", "Bilty Image", "Actual Quantity", "Date Of Receiving", "Transporter Rate", "Actual 2", "Transporter Name"');
        const weightSlipMap = {};
        const typeMap = {};
        const biltyNoMap = {};
        const biltyImageMap = {};
        const actualQtyMap = {};
        const dateOfReceivingMap = {};
        const transporterRateMap = {};
        const actual2Map = {};
        const transporterMap = {};
        (data || []).forEach(l => {
          const key = String(l["Lift No"] || "").trim();
          if (key) {
            weightSlipMap[key] = String(l["Image Of Weight Slip"] || "").trim();
            typeMap[key] = String(l["Type"] || "").trim();
            biltyNoMap[key] = String(l["Bilty No."] || "").trim();
            biltyImageMap[key] = String(l["Bilty Image"] || "").trim();
            actualQtyMap[key] = String(l["Actual Quantity"] || "").trim();
            dateOfReceivingMap[key] = String(l["Date Of Receiving"] || "").trim();
            transporterRateMap[key] = String(l["Transporter Rate"] || "").trim();
            actual2Map[key] = String(l["Actual 2"] || "").trim();
            transporterMap[key] = String(l["Transporter Name"] || "").trim();
          }
        });
        setLiftWeightSlipMap(weightSlipMap);
        setLiftTypeMap(typeMap);
        setLiftBiltyNoMap(biltyNoMap);
        setLiftBiltyImageMap(biltyImageMap);
        setLiftActualQtyMap(actualQtyMap);
        setLiftDateOfReceivingMap(dateOfReceivingMap);
        setLiftTransporterRateMap(transporterRateMap);
        setLiftActual2Map(actual2Map);
        setLiftTransporterMap(transporterMap);
      } catch (e) {
        console.error('Failed to fetch LIFT-ACCOUNTS meta:', e);
      }
    };
    fetchLiftAccountsMeta();
  }, []);

  const fetchAuditDataFromSupabase = async () => {
    setLoadingAudit(true);
    try {
      const [
        { data: pendingMismatchData, error: mismatchError },
        { data: allMismatchLiftIds, error: liftIdsError },
        { data: fullkittingData, error: fkError },
        { data: liftAccountsData, error: laError }
      ] = await Promise.all([
        supabase
          .from("Mismatch")
          .select('id, Timestamp, "Lift ID", Type, "Bill No.", "Party Name", "Product Name", Qty, "Area Lifting", "Truck No.", "Transporter Name", "Bill Image", "Bilty No.", Rate, "Truck Qty", "Bilty Image", "Weight Slip", "Total Freight", "Debit Amount", "Debit Note URL", Status, Status2, Status3, Status4, Status5, Status6, Remarks, Remarks2, Remarks3, Remarks4, Remarks5, Remarks6, "Indent Number", "Firm Name", "Lifting Quantity", Actual2, Actual3, Actual4, Actual5, Actual6, Planned2, Planned3, Planned4, Planned5, Planned6')
          .is("Actual2", null)
          .order("Timestamp", { ascending: false }),
        supabase
          .from("Mismatch")
          .select('"Lift ID"'),
        supabase
          .from("fullkittin")
          .select('"Bilty Number"'),
        supabase
          .from("LIFT-ACCOUNTS")
          .select('id, "Timestamp", "Lift No", "Type", "Bill No.", "Vendor Name", "Raw Material Name", "Qty", "Area lifting", "Truck No.", "Transporter Name", "Transporter Rate", "Bill Image", "Bilty No.", "Type Of Transporting Rate", "Rate", "Truck Qty", "Bilty Image", "Image Of Weight Slip", "Status", "Indent no.", "Firm Name", "Actual Quantity", "Date Of Receiving", "Actual 1"')
          .not("Actual 1", "is", null)
      ]);

      if (mismatchError) throw mismatchError;
      if (liftIdsError) throw liftIdsError;
      if (fkError) throw fkError;
      if (laError) console.warn('LIFT-ACCOUNTS fetch warning:', laError);

      setLiftAccountsRawData(liftAccountsData || []);

      const filteredByActual = (pendingMismatchData || []).filter(row => {
        return hasBiltyDetails(row);
      });

      const mismatchLiftIds = new Set((allMismatchLiftIds || []).map(m => String(m["Lift ID"] || "").trim()).filter(Boolean));
      const newFromLift = (liftAccountsData || []).filter(la => {
        const liftNo = String(la["Lift No"] || "").trim();
        return liftNo && !mismatchLiftIds.has(liftNo) && la["Actual 1"] && hasBiltyDetails(la, liftNo);
      });

      const formattedData = (filteredByActual || []).map((row, index) => ({
        id: `mismatch_${row.id || index}`,
        timestamp: formatDate(row.Planned2) || '',
        liftNumber: row["Lift ID"] || '',
        type: row["Type"] || '',
        billNo: row["Bill No."] || row["Bill No"] || '',
        partyName: row["Party Name"] || '',
        productName: row["Product Name"] || '',
        qty: row["Qty"] || row["Quantity"] || '',
        areaLifting: row["Area Lifting"] || row["Area lifting"] || '',
        truckNo: row["Truck No."] || row["Truck No"] || '',
        transporterName: row["Transporter Name"] || '',
        billImage: row["Bill Image"] || '',
        biltyNo: row["Bilty No."] || row["Bilty No"] || liftBiltyNoMap[String(row["Lift ID"] || "").trim()] || '',
        typeOfRate: row["Type Of Rate"] || row["Type Of Transporting Rate"] || '',
        rate: row["Rate"] || '',
        truckQty: row["Truck Qty"] || '',
        biltyImage: row["Bilty Image"] || liftBiltyImageMap[String(row["Lift ID"] || "").trim()] || '',
        qtyDifferenceStatus: getQtyDifferenceStatus(row),
        differenceQty: row["Diff Qty"] || row["Difference Qty"] || '',
        weightSlip: row["Weight Slip"] || liftWeightSlipMap[String(row["Lift ID"] || "").trim()] || '',
        totalFreight: getTotalFreightValue(row),
        debitAmount: row["Debit Amount"] || '',
        debitNoteUrl: row["Debit Note URL"] || '',
        status: row.Status2 || row.Status || '',
        auditStatus: row.Status2 || '',
        rectifyStatus: row.Status3 || '',
        reAuditStatus: row.Status5 || '',
        tallyStatus: row.Status4 || '',
        remarks: row.Remarks || row.Remark || '',
        auditRemarks: row.Remarks2 || '',
        rectifyRemarks: row.Remarks3 || '',
        tallyRemarks: row.Remarks4 || '',
        reauditRemarks: row.Remarks5 || '',
        billRemarks: row.Remarks6 || '',
        currentStage: 'AUDIT',
        supabaseId: row.id, 
        indentNumber: (() => {
          const raw = String(row["Indent Number"] || row["Indent No"] || row["Indent No."] || '').trim().toUpperCase();
          const parts = raw.split('/');
          const normalized = parts.length > 1 ? parts.slice(1).join('/') : raw;
          return poToIndentMap[raw] || poToIndentMap[normalized] || row["Indent Number"] || row["Indent No"] || row["Indent No."] || '';
        })(),
        firmName: row["Firm Name"] || '',
        poRate: (() => {
          const raw = String(row["Indent Number"] || row["Indent No"] || '').trim().toUpperCase();
          const parts = raw.split('/');
          const normalized = parts.length > 1 ? parts.slice(1).join('/') : raw;
          return poToRateMap[raw] || poToRateMap[normalized] || row["PO Rate"] || row["Rate Of Material"] || '';
        })(),
        vendorName: row["Vendor Name"] || '',
        liftingQty: liftActualQtyMap[String(row["Lift ID"] || "").trim()] || row["Lifting Qty"] || '',
        dateOfReceiving: liftDateOfReceivingMap[String(row["Lift ID"] || "").trim()] || row["Date Of Receiving"] || '',
        transporterRate: liftTransporterRateMap[String(row["Lift ID"] || "").trim()] || ''
      }));

      const formattedLiftData = newFromLift.map((row, index) => ({
        id: `lift_${row.id || index}`,
        timestamp: formatDate(row["Timestamp"]) || '',
        liftNumber: row["Lift No"] || '',
        type: row["Type"] || '',
        billNo: row["Bill No."] || '',
        partyName: row["Vendor Name"] || '',
        productName: row["Raw Material Name"] || '',
        qty: row["Qty"] || '',
        areaLifting: row["Area lifting"] || '',
        truckNo: row["Truck No."] || '',
        transporterName: row["Transporter Name"] || '',
        transporterRate: row["Transporter Rate"] || '',
        billImage: row["Bill Image"] || '',
        biltyNo: row["Bilty No."] || '',
        typeOfRate: row["Type Of Transporting Rate"] || '',
        rate: row["Rate"] || '',
        truckQty: row["Truck Qty"] || '',
        biltyImage: row["Bilty Image"] || '',
        qtyDifferenceStatus: '0.000',
        differenceQty: '0.000',
        weightSlip: row["Image Of Weight Slip"] || '',
        totalFreight: row["Total Freight"] || row["Transporter Rate"] || '',
        status: row["Status"] || '',
        auditStatus: '',
        rectifyStatus: '',
        reAuditStatus: '',
        tallyStatus: '',
        remarks: '',
        auditRemarks: '',
        rectifyRemarks: '',
        tallyRemarks: '',
        reauditRemarks: '',
        billRemarks: '',
        currentStage: 'AUDIT',
        isNewFromLift: true, 
        supabaseId: `lift_${row.id || index}`, 
        liftDbId: row.id,
        indentNumber: (() => {
          const raw = String(row["Indent no."] || '').trim().toUpperCase();
          const parts = raw.split('/');
          const normalized = parts.length > 1 ? parts.slice(1).join('/') : raw;
          return poToIndentMap[raw] || poToIndentMap[normalized] || row["Indent no."] || '';
        })(),
        firmName: row["Firm Name"] || '',
        poRate: (() => {
          const raw = String(row["Indent no."] || '').trim().toUpperCase();
          const parts = raw.split('/');
          const normalized = parts.length > 1 ? parts.slice(1).join('/') : raw;
          return poToRateMap[raw] || poToRateMap[normalized] || '';
        })(),
        vendorName: row["Vendor Name"] || '',
        liftingQty: row["Actual Quantity"] || row["Qty"] || '',
        dateOfReceiving: row["Date Of Receiving"] || ''
      }));

      const allAuditRows = [...formattedData, ...formattedLiftData];

      const filteredData = allAuditRows.filter(item => {
        const submittedKey = `AUDIT_${item.id}`;
        return !submittedRows.has(submittedKey);
      });

      let finalAuditData = filterRowsByUserFirm(filteredData);
      setAuditMismatchData(finalAuditData);

    } catch (err) {
      console.error('Error fetching audit data from Supabase:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const fetchTallyEntryDataFromSupabase = async () => {
    setLoadingTallyEntry(true);
    try {
      const { data, error } = await supabase
        .from("Mismatch")
        .select('id, Timestamp, "Lift ID", Type, "Bill No.", "Party Name", "Product Name", Qty, "Area Lifting", "Truck No.", "Transporter Name", "Bill Image", "Bilty No.", Rate, "Truck Qty", "Bilty Image", "Weight Slip", "Total Freight", "Debit Amount", "Debit Note URL", Status, Status2, Status3, Status4, Status5, Status6, Remarks, Remarks2, Remarks3, Remarks4, Remarks5, Remarks6, "Indent Number", "Firm Name", "Lifting Quantity", Actual2, Actual3, Actual4, Actual5, Actual6, Planned2, Planned3, Planned4, Planned5, Planned6')
        .is("Actual4", null)
        .order("Timestamp", { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).filter(shouldShowInTallyEntry).map((row, index) => ({
        id: `mismatch_tally_${row.id || index}`,
        timestamp: formatDate(row.Planned4 || row.Actual5 || row.Actual2) || '',
        liftNumber: row["Lift ID"] || '',
        type: row["Type"] || '',
        billNo: row["Bill No."] || row["Bill No"] || '',
        partyName: row["Party Name"] || '',
        productName: row["Product Name"] || '',
        qty: row["Qty"] || row["Quantity"] || '',
        areaLifting: row["Area Lifting"] || row["Area lifting"] || '',
        truckNo: row["Truck No."] || row["Truck No"] || '',
        transporterName: row["Transporter Name"] || '',
        billImage: row["Bill Image"] || '',
        biltyNo: row["Bilty No."] || row["Bilty No"] || liftBiltyNoMap[String(row["Lift ID"] || "").trim()] || '',
        typeOfRate: row["Type Of Rate"] || row["Type Of Transporting Rate"] || '',
        rate: row["Rate"] || '',
        truckQty: row["Truck Qty"] || '',
        biltyImage: row["Bilty Image"] || liftBiltyImageMap[String(row["Lift ID"] || "").trim()] || '',
        qtyDifferenceStatus: getQtyDifferenceStatus(row),
        differenceQty: row["Diff Qty"] || row["Difference Qty"] || '',
        weightSlip: row["Weight Slip"] || liftWeightSlipMap[String(row["Lift ID"] || "").trim()] || '',
        totalFreight: getTotalFreightValue(row),
        debitAmount: row["Debit Amount"] || '',
        debitNoteUrl: row["Debit Note URL"] || '',
        status: row.Status4 || '',
        auditStatus: row.Status2 || '',
        rectifyStatus: row.Status3 || '',
        reAuditStatus: row.Status5 || '',
        tallyStatus: row.Status4 || '',
        remarks: row.Remarks2 || row.Remarks3 || row.Remarks5 || '',
        auditRemarks: row.Remarks2 || '',
        rectifyRemarks: row.Remarks3 || '',
        tallyRemarks: row.Remarks4 || '',
        reauditRemarks: row.Remarks5 || '',
        billRemarks: row.Remarks6 || '',
        currentStage: 'TALLY_ENTRY',
        supabaseId: row.id, 
        indentNumber: (() => {
          const raw = String(row["Indent Number"] || row["Indent No"] || '').trim().toUpperCase();
          const parts = raw.split('/');
          const normalized = parts.length > 1 ? parts.slice(1).join('/') : raw;
          return poToIndentMap[raw] || poToIndentMap[normalized] || row["Indent Number"] || row["Indent No"] || '';
        })(),
        firmName: row["Firm Name"] || '',
        poRate: (() => {
          const raw = String(row["Indent Number"] || row["Indent No"] || '').trim().toUpperCase();
          const parts = raw.split('/');
          const normalized = parts.length > 1 ? parts.slice(1).join('/') : raw;
          return poToRateMap[raw] || poToRateMap[normalized] || row["PO Rate"] || row["Rate Of Material"] || '';
        })(),
        vendorName: row["Vendor Name"] || '',
        driverNo: row["Driver No"] || row["Driver No."] || '',
        liftingQty: liftActualQtyMap[String(row["Lift ID"] || "").trim()] || row["Lifting Qty"] || '',
        dateOfReceiving: liftDateOfReceivingMap[String(row["Lift ID"] || "").trim()] || row["Date Of Receiving"] || '',
        actualQuantity: row["Actual Quantity"] || '',
        physicalCondition: row["Physical Condition"] || '',
        moisture: row["Moisture"] || '',
        weightSlipQty: row["Weight Slip Qty"] || '',
        transporterRate: liftTransporterRateMap[String(row["Lift ID"] || "").trim()] || ''
      }));

      const filteredData = formattedData.filter(item => {
        const submittedKey = `TALLY_ENTRY_${item.id}`;
        return !submittedRows.has(submittedKey);
      });

      let finalTallyData = filterRowsByUserFirm(filteredData);
      setTallyEntryMismatchData(finalTallyData);

    } catch (err) {
      console.error('Error fetching tally entry data from Supabase:', err);
    } finally {
      setLoadingTallyEntry(false);
    }
  };

  const fetchBillEntryDataFromSupabase = async () => {
    setLoadingBillEntry(true);
    try {
      const { data, error } = await supabase
        .from("Mismatch")
        .select('id, Timestamp, "Lift ID", Type, "Bill No.", "Party Name", "Product Name", Qty, "Area Lifting", "Truck No.", "Transporter Name", "Bill Image", "Bilty No.", Rate, "Truck Qty", "Bilty Image", "Weight Slip", "Total Freight", "Debit Amount", "Debit Note URL", Status, Status2, Status3, Status4, Status5, Status6, Remarks, Remarks2, Remarks3, Remarks4, Remarks5, Remarks6, "Indent Number", "Firm Name", "Lifting Quantity", Actual2, Actual3, Actual4, Actual5, Actual6, Planned2, Planned3, Planned4, Planned5, Planned6')
        .not("Planned6", "is", null)
        .is("Actual6", null)
        .order("Timestamp", { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).filter(hasBiltyDetails).map((row, index) => ({
        id: `mismatch_bill_${row.id || index}`,
        timestamp: formatDate(row.Planned6) || '',
        liftNumber: row["Lift ID"] || '',
        type: row["Type"] || '',
        billNo: row["Bill No."] || row["Bill No"] || '',
        partyName: row["Party Name"] || '',
        productName: row["Product Name"] || '',
        qty: row["Qty"] || row["Quantity"] || '',
        areaLifting: row["Area Lifting"] || row["Area lifting"] || '',
        truckNo: row["Truck No."] || row["Truck No"] || '',
        transporterName: row["Transporter Name"] || '',
        billImage: row["Bill Image"] || '',
        biltyNo: row["Bilty No."] || row["Bilty No"] || liftBiltyNoMap[String(row["Lift ID"] || "").trim()] || '',
        typeOfRate: row["Type Of Rate"] || row["Type Of Transporting Rate"] || '',
        rate: row["Rate"] || '',
        truckQty: row["Truck Qty"] || '',
        biltyImage: row["Bilty Image"] || liftBiltyImageMap[String(row["Lift ID"] || "").trim()] || '',
        qtyDifferenceStatus: getQtyDifferenceStatus(row),
        differenceQty: row["Diff Qty"] || row["Difference Qty"] || '',
        weightSlip: row["Weight Slip"] || liftWeightSlipMap[String(row["Lift ID"] || "").trim()] || '',
        totalFreight: getTotalFreightValue(row),
        debitAmount: row["Debit Amount"] || '',
        debitNoteUrl: row["Debit Note URL"] || '',
        status: row.Status6 || '',
        auditStatus: row.Status2 || '',
        rectifyStatus: row.Status3 || '',
        reAuditStatus: row.Status5 || '',
        tallyStatus: row.Status4 || '',
        remarks: row.Remarks4 || '',
        auditRemarks: row.Remarks2 || '',
        rectifyRemarks: row.Remarks3 || '',
        tallyRemarks: row.Remarks4 || '',
        reauditRemarks: row.Remarks5 || '',
        billRemarks: row.Remarks6 || '',
        currentStage: 'BILL_ENTRY',
        supabaseId: row.id, 
        indentNumber: (() => {
          const raw = String(row["Indent Number"] || row["Indent No"] || '').trim().toUpperCase();
          const parts = raw.split('/');
          const normalized = parts.length > 1 ? parts.slice(1).join('/') : raw;
          return poToIndentMap[raw] || poToIndentMap[normalized] || row["Indent Number"] || row["Indent No"] || '';
        })(),
        firmName: row["Firm Name"] || '',
        poRate: (() => {
          const raw = String(row["Indent Number"] || row["Indent No"] || '').trim().toUpperCase();
          const parts = raw.split('/');
          const normalized = parts.length > 1 ? parts.slice(1).join('/') : raw;
          return poToRateMap[raw] || poToRateMap[normalized] || row["PO Rate"] || row["Rate Of Material"] || '';
        })(),
        vendorName: row["Vendor Name"] || '',
        driverNo: row["Driver No"] || row["Driver No."] || '',
        liftingQty: liftActualQtyMap[String(row["Lift ID"] || "").trim()] || row["Lifting Qty"] || '',
        dateOfReceiving: liftDateOfReceivingMap[String(row["Lift ID"] || "").trim()] || row["Date Of Receiving"] || '',
        actualQuantity: row["Actual Quantity"] || '',
        physicalCondition: row["Physical Condition"] || '',
        moisture: row["Moisture"] || '',
        weightSlipQty: row["Weight Slip Qty"] || '',
        transporterRate: liftTransporterRateMap[String(row["Lift ID"] || "").trim()] || ''
      }));

      const filteredData = formattedData.filter(item => {
        const submittedKey = `BILL_ENTRY_${item.id}`;
        return !submittedRows.has(submittedKey);
      });

      let finalBillData = filterRowsByUserFirm(filteredData);
      setBillEntryMismatchData(finalBillData);

    } catch (err) {
      console.error('Error fetching bill entry data from Supabase:', err);
    } finally {
      setLoadingBillEntry(false);
    }
  };

  const fetchRectifyDataFromSupabase = async () => {
    setLoadingRectify(true);
    try {
      const { data, error } = await supabase
        .from("Mismatch")
        .select('id, Timestamp, "Lift ID", Type, "Bill No.", "Party Name", "Product Name", Qty, "Area Lifting", "Truck No.", "Transporter Name", "Bill Image", "Bilty No.", Rate, "Truck Qty", "Bilty Image", "Weight Slip", "Total Freight", "Debit Amount", "Debit Note URL", Status, Status2, Status3, Status4, Status5, Status6, Remarks, Remarks2, Remarks3, Remarks4, Remarks5, Remarks6, "Indent Number", "Firm Name", "Lifting Quantity", Actual2, Actual3, Actual4, Actual5, Actual6, Planned2, Planned3, Planned4, Planned5, Planned6')
        .not("Planned3", "is", null)
        .is("Actual3", null)
        .eq("Status2", "Not Done")
        .order("Timestamp", { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).filter(hasBiltyDetails).map((row, index) => ({
        id: `mismatch_rectify_${row.id || index}`,
        timestamp: formatDate(row.Planned3) || '',
        liftNumber: row["Lift ID"] || '',
        type: row["Type"] || '',
        billNo: row["Bill No."] || row["Bill No"] || '',
        partyName: row["Party Name"] || '',
        productName: row["Product Name"] || '',
        qty: row["Qty"] || row["Quantity"] || '',
        areaLifting: row["Area Lifting"] || row["Area lifting"] || '',
        truckNo: row["Truck No."] || row["Truck No"] || '',
        transporterName: row["Transporter Name"] || '',
        billImage: row["Bill Image"] || '',
        biltyNo: row["Bilty No."] || row["Bilty No"] || liftBiltyNoMap[String(row["Lift ID"] || "").trim()] || '',
        typeOfRate: row["Type Of Rate"] || row["Type Of Transporting Rate"] || '',
        rate: row["Rate"] || '',
        truckQty: row["Truck Qty"] || '',
        biltyImage: row["Bilty Image"] || liftBiltyImageMap[String(row["Lift ID"] || "").trim()] || '',
        qtyDifferenceStatus: getQtyDifferenceStatus(row),
        differenceQty: row["Diff Qty"] || row["Difference Qty"] || '',
        weightSlip: row["Weight Slip"] || liftWeightSlipMap[String(row["Lift ID"] || "").trim()] || '',
        totalFreight: getTotalFreightValue(row),
        debitAmount: row["Debit Amount"] || '',
        debitNoteUrl: row["Debit Note URL"] || '',
        status: row.Status3 || '',
        auditStatus: row.Status2 || '',
        rectifyStatus: row.Status3 || '',
        reAuditStatus: row.Status5 || '',
        tallyStatus: row.Status4 || '',
        remarks: row.Remarks2 || '',
        auditRemarks: row.Remarks2 || '',
        rectifyRemarks: row.Remarks3 || '',
        tallyRemarks: row.Remarks4 || '',
        reauditRemarks: row.Remarks5 || '',
        billRemarks: row.Remarks6 || '',
        currentStage: 'RECTIFY',
        supabaseId: row.id, 
        indentNumber: (() => {
          const raw = String(row["Indent Number"] || row["Indent No"] || '').trim().toUpperCase();
          const parts = raw.split('/');
          const normalized = parts.length > 1 ? parts.slice(1).join('/') : raw;
          return poToIndentMap[raw] || poToIndentMap[normalized] || row["Indent Number"] || row["Indent No"] || '';
        })(),
        firmName: row["Firm Name"] || '',
        poRate: (() => {
          const raw = String(row["Indent Number"] || row["Indent No"] || '').trim().toUpperCase();
          const parts = raw.split('/');
          const normalized = parts.length > 1 ? parts.slice(1).join('/') : raw;
          return poToRateMap[raw] || poToRateMap[normalized] || row["PO Rate"] || row["Rate Of Material"] || '';
        })(),
        vendorName: row["Vendor Name"] || '',
        driverNo: row["Driver No"] || row["Driver No."] || '',
        liftingQty: liftActualQtyMap[String(row["Lift ID"] || "").trim()] || row["Lifting Qty"] || '',
        dateOfReceiving: liftDateOfReceivingMap[String(row["Lift ID"] || "").trim()] || row["Date Of Receiving"] || '',
        actualQuantity: row["Actual Quantity"] || '',
        physicalCondition: row["Physical Condition"] || '',
        moisture: row["Moisture"] || '',
        weightSlipQty: row["Weight Slip Qty"] || '',
        transporterRate: liftTransporterRateMap[String(row["Lift ID"] || "").trim()] || ''
      }));

      const filteredData = formattedData.filter(item => {
        const submittedKey = `RECTIFY_${item.id}`;
        return !submittedRows.has(submittedKey);
      });

      let finalRectifyData = filterRowsByUserFirm(filteredData);
      setRectifyMismatchData(finalRectifyData);

    } catch (err) {
      console.error('Error fetching rectify data from Supabase:', err);
    } finally {
      setLoadingRectify(false);
    }
  };

  const fetchReAuditDataFromSupabase = async () => {
    setLoadingReAudit(true);
    try {
      const { data, error } = await supabase
        .from("Mismatch")
        .select('id, Timestamp, "Lift ID", Type, "Bill No.", "Party Name", "Product Name", Qty, "Area Lifting", "Truck No.", "Transporter Name", "Bill Image", "Bilty No.", Rate, "Truck Qty", "Bilty Image", "Weight Slip", "Total Freight", "Debit Amount", "Debit Note URL", Status, Status2, Status3, Status4, Status5, Status6, Remarks, Remarks2, Remarks3, Remarks4, Remarks5, Remarks6, "Indent Number", "Firm Name", "Lifting Quantity", Actual2, Actual3, Actual4, Actual5, Actual6, Planned2, Planned3, Planned4, Planned5, Planned6')
        .not("Planned5", "is", null)
        .is("Actual5", null)
        .order("Timestamp", { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).filter(hasBiltyDetails).map((row, index) => ({
        id: `mismatch_reaudit_${row.id || index}`,
        timestamp: formatDate(row.Planned5) || '',
        liftNumber: row["Lift ID"] || '',
        type: row["Type"] || '',
        billNo: row["Bill No."] || row["Bill No"] || '',
        partyName: row["Party Name"] || '',
        productName: row["Product Name"] || '',
        qty: row["Qty"] || row["Quantity"] || '',
        areaLifting: row["Area Lifting"] || row["Area lifting"] || '',
        truckNo: row["Truck No."] || row["Truck No"] || '',
        transporterName: row["Transporter Name"] || '',
        billImage: row["Bill Image"] || '',
        biltyNo: row["Bilty No."] || row["Bilty No"] || liftBiltyNoMap[String(row["Lift ID"] || "").trim()] || '',
        typeOfRate: row["Type Of Rate"] || row["Type Of Transporting Rate"] || '',
        rate: row["Rate"] || '',
        truckQty: row["Truck Qty"] || '',
        biltyImage: row["Bilty Image"] || liftBiltyImageMap[String(row["Lift ID"] || "").trim()] || '',
        qtyDifferenceStatus: getQtyDifferenceStatus(row),
        differenceQty: row["Diff Qty"] || row["Difference Qty"] || '',
        weightSlip: row["Weight Slip"] || liftWeightSlipMap[String(row["Lift ID"] || "").trim()] || '',
        totalFreight: getTotalFreightValue(row),
        debitAmount: row["Debit Amount"] || '',
        debitNoteUrl: row["Debit Note URL"] || '',
        status: row.Status5 || '',
        auditStatus: row.Status2 || '',
        rectifyStatus: row.Status3 || '',
        reAuditStatus: row.Status5 || '',
        tallyStatus: row.Status4 || '',
        remarks: row.Remarks3 || '',
        auditRemarks: row.Remarks2 || '',
        rectifyRemarks: row.Remarks3 || '',
        tallyRemarks: row.Remarks4 || '',
        reauditRemarks: row.Remarks5 || '',
        billRemarks: row.Remarks6 || '',
        currentStage: 'RE_AUDIT',
        supabaseId: row.id, 
        indentNumber: (() => {
          const raw = String(row["Indent Number"] || row["Indent No"] || '').trim().toUpperCase();
          const parts = raw.split('/');
          const normalized = parts.length > 1 ? parts.slice(1).join('/') : raw;
          return poToIndentMap[raw] || poToIndentMap[normalized] || row["Indent Number"] || row["Indent No"] || '';
        })(),
        firmName: row["Firm Name"] || '',
        poRate: (() => {
          const raw = String(row["Indent Number"] || row["Indent No"] || '').trim().toUpperCase();
          const parts = raw.split('/');
          const normalized = parts.length > 1 ? parts.slice(1).join('/') : raw;
          return poToRateMap[raw] || poToRateMap[normalized] || row["PO Rate"] || row["Rate Of Material"] || '';
        })(),
        vendorName: row["Vendor Name"] || '',
        driverNo: row["Driver No"] || row["Driver No."] || '',
        liftingQty: liftActualQtyMap[String(row["Lift ID"] || "").trim()] || row["Lifting Qty"] || '',
        dateOfReceiving: liftDateOfReceivingMap[String(row["Lift ID"] || "").trim()] || row["Date Of Receiving"] || '',
        actualQuantity: row["Actual Quantity"] || '',
        physicalCondition: row["Physical Condition"] || '',
        moisture: row["Moisture"] || '',
        weightSlipQty: row["Weight Slip Qty"] || '',
        transporterRate: liftTransporterRateMap[String(row["Lift ID"] || "").trim()] || ''
      }));

      const filteredData = formattedData.filter(item => {
        const submittedKey = `RE_AUDIT_${item.id}`;
        return !submittedRows.has(submittedKey);
      });

      let finalReAuditData = filterRowsByUserFirm(filteredData);
      setReAuditMismatchData(finalReAuditData);

    } catch (err) {
      console.error('Error fetching re-audit data from Supabase:', err);
    } finally {
      setLoadingReAudit(false);
    }
  };

  const fetchAllDataFromSupabase = async () => {
    setLoadingAll(true);
    try {
      const [{ data: mismatchData, error: mismatchError }, { data: fullkittingData, error: fkError }] = await Promise.all([
        supabase
          .from("Mismatch")
          .select('id, Timestamp, "Lift ID", Type, "Bill No.", "Party Name", "Product Name", Qty, "Area Lifting", "Truck No.", "Transporter Name", "Bill Image", "Bilty No.", Rate, "Truck Qty", "Bilty Image", "Weight Slip", "Total Freight", "Debit Amount", "Debit Note URL", Status, Status2, Status3, Status4, Status5, Status6, Remarks, Remarks2, Remarks3, Remarks4, Remarks5, Remarks6, "Indent Number", "Firm Name", "Lifting Quantity", Actual2, Actual3, Actual4, Actual5, Actual6, Planned2, Planned3, Planned4, Planned5, Planned6')
          .order("Timestamp", { ascending: false }),
        supabase.from("fullkittin").select('"Bilty Number"')
      ]);

      if (mismatchError) throw mismatchError;
      if (fkError) throw fkError;

      const kittedBiltyNos = new Set((fullkittingData || []).map(fk => String(fk["Bilty Number"] || "").trim()).filter(Boolean));

      const determineCurrentStage = (row) => {
        const activeStages = [];
        if (!row.Actual2) activeStages.push('AUDIT');
        if (row.Planned3 && !row.Actual3 && isAuditNotDone(row)) activeStages.push('RECTIFY');
        if (shouldShowInTallyEntry(row)) activeStages.push('TALLY_ENTRY');
        if (row.Planned5 && !row.Actual5) activeStages.push('REAUDIT');
        if (row.Planned6 && !row.Actual6) activeStages.push('BILL_ENTRY');

        return activeStages.length > 0 ? activeStages[0] : 'COMPLETED';
      };

      const formattedData = (mismatchData || []).filter(hasBiltyDetails).map((row, index) => {
        const currentStage = determineCurrentStage(row);
        return {
          id: `mismatch_all_${row.id || index}`,
          timestamp: formatDate(row[`Planned${currentStage === 'AUDIT' ? '2' : currentStage === 'RECTIFY' ? '3' : currentStage === 'TALLY_ENTRY' ? '4' : currentStage === 'REAUDIT' ? '5' : '6'}`]) || '',
          liftNumber: row["Lift ID"] || '',
          type: row["Type"] || '',
          billNo: row["Bill No."] || row["Bill No"] || '',
          partyName: row["Party Name"] || '',
          productName: row["Product Name"] || '',
          qty: row["Qty"] || row["Quantity"] || '',
          areaLifting: row["Area Lifting"] || row["Area lifting"] || '',
          truckNo: row["Truck No."] || row["Truck No"] || '',
          transporterName: row["Transporter Name"] || '',
          billImage: row["Bill Image"] || '',
          biltyNo: row["Bilty No."] || row["Bilty No"] || liftBiltyNoMap[String(row["Lift ID"] || "").trim()] || '',
          typeOfRate: row["Type Of Rate"] || row["Type Of Transporting Rate"] || '',
          rate: row["Rate"] || '',
          truckQty: row["Truck Qty"] || '',
          biltyImage: row["Bilty Image"] || liftBiltyImageMap[String(row["Lift ID"] || "").trim()] || '',
          qtyDifferenceStatus: getQtyDifferenceStatus(row),
          differenceQty: row["Diff Qty"] || row["Difference Qty"] || '',
          weightSlip: row["Weight Slip"] || liftWeightSlipMap[String(row["Lift ID"] || "").trim()] || '',
          totalFreight: getTotalFreightValue(row),
          status: row[`Status${currentStage === 'AUDIT' ? '2' : currentStage === 'RECTIFY' ? '3' : currentStage === 'TALLY_ENTRY' ? '4' : currentStage === 'REAUDIT' ? '5' : '6'}`] || '',
          auditStatus: row.Status2 || '',
          rectifyStatus: row.Status3 || '',
          reAuditStatus: row.Status5 || '',
          tallyStatus: row.Status4 || '',
          remarks: currentStage === 'AUDIT' ? (row.Remarks || row.Remark || '') : 
                   currentStage === 'RECTIFY' ? (row.Remarks2 || '') :
                   currentStage === 'REAUDIT' ? (row.Remarks3 || '') :
                   currentStage === 'TALLY_ENTRY' ? (row.Remarks5 || row.Remarks3 || row.Remarks2 || '') :
                   currentStage === 'BILL_ENTRY' ? (row.Remarks4 || '') : '',
          auditRemarks: row.Remarks2 || '',
          rectifyRemarks: row.Remarks3 || '',
          tallyRemarks: row.Remarks4 || '',
          reauditRemarks: row.Remarks5 || '',
          billRemarks: row.Remarks6 || '',
          currentStage: currentStage,
          indentNumber: (() => {
            const raw = String(row["Indent Number"] || row["Indent No"] || '').trim().toUpperCase();
            const parts = raw.split('/');
            const normalized = parts.length > 1 ? parts.slice(1).join('/') : raw;
            return poToIndentMap[raw] || poToIndentMap[normalized] || row["Indent Number"] || row["Indent No"] || '';
          })(),
          firmName: row["Firm Name"] || '',
          poRate: (() => {
            const raw = String(row["Indent Number"] || row["Indent No"] || '').trim().toUpperCase();
            const parts = raw.split('/');
            const normalized = parts.length > 1 ? parts.slice(1).join('/') : raw;
            return poToRateMap[raw] || poToRateMap[normalized] || row["PO Rate"] || row["Rate Of Material"] || '';
          })(),
          vendorName: row["Vendor Name"] || '',
          driverNo: row["Driver No"] || row["Driver No."] || '',
          liftingQty: liftActualQtyMap[String(row["Lift ID"] || "").trim()] || row["Lifting Qty"] || '',
          dateOfReceiving: liftDateOfReceivingMap[String(row["Lift ID"] || "").trim()] || row["Date Of Receiving"] || '',
          actualQuantity: row["Actual Quantity"] || '',
          physicalCondition: row["Physical Condition"] || '',
          moisture: row["Moisture"] || '',
          weightSlipQty: row["Weight Slip Qty"] || ''
        };
      });

      let filteredData = formattedData.filter(item => {
        if (item.currentStage === 'COMPLETED') return false;
        const submittedKey = `ALL_${item.id}`;
        return !submittedRows.has(submittedKey);
      });

      filteredData = filterRowsByUserFirm(filteredData);
      setAllMismatchData(filteredData);

    } catch (err) {
      console.error('Error fetching all data from Supabase:', err);
    } finally {
      setLoadingAll(false);
    }
  };

  const fetchHistoryDataFromSupabase = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("Mismatch")
        .select('id, Timestamp, "Lift ID", Type, "Bill No.", "Party Name", "Product Name", Qty, "Area Lifting", "Truck No.", "Transporter Name", "Bill Image", "Bilty No.", Rate, "Truck Qty", "Bilty Image", "Weight Slip", "Total Freight", "Debit Amount", "Debit Note URL", Status, Status2, Status3, Status4, Status5, Status6, Remarks, Remarks2, Remarks3, Remarks4, Remarks5, Remarks6, "Indent Number", "Firm Name", "Lifting Quantity", Actual2, Actual3, Actual4, Actual5, Actual6, Planned2, Planned3, Planned4, Planned5, Planned6')
        .not("Actual6", "is", null)
        .order("Timestamp", { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).filter(hasBiltyDetails).map((row, index) => ({
        id: `mismatch_history_${row.id || index}`,
        timestamp: formatDate(row.Planned6) || '',
        completedAt: formatDate(row.Actual6) || '',
        liftNumber: row["Lift ID"] || '',
        type: row["Type"] || '',
        billNo: row["Bill No."] || row["Bill No"] || '',
        partyName: row["Party Name"] || '',
        productName: row["Product Name"] || '',
        qty: row["Qty"] || row["Quantity"] || '',
        areaLifting: row["Area Lifting"] || row["Area lifting"] || '',
        truckNo: row["Truck No."] || row["Truck No"] || '',
        transporterName: row["Transporter Name"] || '',
        billImage: row["Bill Image"] || '',
        biltyNo: row["Bilty No."] || row["Bilty No"] || liftBiltyNoMap[String(row["Lift ID"] || "").trim()] || '',
        typeOfRate: row["Type Of Rate"] || row["Type Of Transporting Rate"] || '',
        rate: row["Rate"] || '',
        truckQty: row["Truck Qty"] || '',
        biltyImage: row["Bilty Image"] || liftBiltyImageMap[String(row["Lift ID"] || "").trim()] || '',
        qtyDifferenceStatus: getQtyDifferenceStatus(row),
        weightSlip: row["Weight Slip"] || liftWeightSlipMap[String(row["Lift ID"] || "").trim()] || '',
        totalFreight: getTotalFreightValue(row),
        debitAmount: row["Debit Amount"] || '',
        debitNoteUrl: row["Debit Note URL"] || '',
        status: row.Status6 || '',
        auditStatus: row.Status2 || '',
        rectifyStatus: row.Status3 || '',
        reAuditStatus: row.Status5 || '',
        tallyStatus: row.Status4 || '',
        remarks: row.Remarks6 || '',
        auditRemarks: row.Remarks2 || '',
        rectifyRemarks: row.Remarks3 || '',
        tallyRemarks: row.Remarks4 || '',
        reauditRemarks: row.Remarks5 || '',
        billRemarks: row.Remarks6 || '',
        currentStage: 'COMPLETED',
        supabaseId: row.id,
        indentNumber: (() => {
          const raw = String(row["Indent Number"] || row["Indent No"] || '').trim().toUpperCase();
          const parts = raw.split('/');
          const normalized = parts.length > 1 ? parts.slice(1).join('/') : raw;
          return poToIndentMap[raw] || poToIndentMap[normalized] || row["Indent Number"] || row["Indent No"] || '';
        })(),
        firmName: row["Firm Name"] || '',
        poRate: (() => {
          const raw = String(row["Indent Number"] || row["Indent No"] || '').trim().toUpperCase();
          const parts = raw.split('/');
          const normalized = parts.length > 1 ? parts.slice(1).join('/') : raw;
          return poToRateMap[raw] || poToRateMap[normalized] || row["PO Rate"] || row["Rate Of Material"] || '';
        })(),
        vendorName: row["Vendor Name"] || '',
        liftingQty: liftActualQtyMap[String(row["Lift ID"] || "").trim()] || row["Lifting Qty"] || '',
        dateOfReceiving: liftDateOfReceivingMap[String(row["Lift ID"] || "").trim()] || row["Date Of Receiving"] || ''
      }));

      let finalData = filterRowsByUserFirm(formattedData);
      setHistoryData(finalData);
    } catch (err) {
      console.error('Error fetching history data from Supabase:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchAuditDataFromSupabase();
    fetchTallyEntryDataFromSupabase();
    fetchBillEntryDataFromSupabase();
    fetchRectifyDataFromSupabase();
    fetchReAuditDataFromSupabase();
    fetchAllDataFromSupabase();
    fetchHistoryDataFromSupabase();
  }, [submittedRows, user, liftWeightSlipMap, liftTransporterRateMap]);

  useEffect(() => {
    if (location.state?.returnToTab === 'REAUDIT' && !loadingReAudit && reAuditMismatchData.length > 0) {
      setActiveTab('REAUDIT');
      if (location.state.openRowId) {
        const targetRow = reAuditMismatchData.find(r => r.supabaseId === location.state.openRowId || r.id === location.state.openRowId || r.id === `mismatch_reaudit_${location.state.openRowId}`);
        if (targetRow) {
          setEditingRow(targetRow.id);
          window.history.replaceState({}, document.title);
        }
      } else {
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, loadingReAudit, reAuditMismatchData]);

  useEffect(() => {
    setVisibleColumns(prev => {
      const updated = {
        ...prev,
        remarks: false,
        auditRemarks: false,
        rectifyRemarks: false,
        reauditRemarks: false,
        tallyRemarks: false,
        billRemarks: false,
        auditStatus: false,
        rectifyStatus: false,
        reAuditStatus: false,
        tallyStatus: false
      };

      if (activeTab === 'AUDIT') {
        updated.remarks = true;
      } else if (activeTab === 'RECTIFY') {
        updated.auditRemarks = true;
        updated.auditStatus = true;
      } else if (activeTab === 'REAUDIT') {
        updated.auditRemarks = true;
        updated.rectifyRemarks = true;
        updated.auditStatus = true;
        updated.rectifyStatus = true;
      } else if (activeTab === 'TALLY_ENTRY') {
        updated.auditRemarks = true;
        updated.rectifyRemarks = true;
        updated.reauditRemarks = true;
        updated.auditStatus = true;
        updated.rectifyStatus = true;
        updated.reAuditStatus = true;
      } else if (activeTab === 'BILL_ENTRY') {
        updated.auditRemarks = true;
        updated.rectifyRemarks = true;
        updated.reauditRemarks = true;
        updated.tallyRemarks = true;
        updated.auditStatus = true;
        updated.rectifyStatus = true;
        updated.reAuditStatus = true;
        updated.tallyStatus = true;
      } else if (activeTab === 'ALL' || activeTab === 'HISTORY') {
        updated.auditRemarks = true;
        updated.rectifyRemarks = true;
        updated.reauditRemarks = true;
        updated.tallyRemarks = true;
        updated.billRemarks = true;
        updated.auditStatus = true;
        updated.rectifyStatus = true;
        updated.reAuditStatus = true;
        updated.tallyStatus = true;
      }

      return updated;
    });
  }, [activeTab]);

  const toggleColumnVisibility = (columnKey) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  };

  const toggleColumnFilter = () => {
    setShowColumnFilter(prev => !prev);
  };

  const uniqueFirms = useMemo(() => {
    const allData = [
      ...auditMismatchData,
      ...rectifyMismatchData,
      ...tallyEntryMismatchData,
      ...reAuditMismatchData,
      ...billEntryMismatchData,
      ...accountsData,
      ...historyData
    ];
    const firms = [...new Set(allData.map(item => item.firmName).filter(Boolean))];
    return firms.sort();
  }, [auditMismatchData, rectifyMismatchData, tallyEntryMismatchData, reAuditMismatchData, billEntryMismatchData, accountsData, historyData]);

  const getAllStagesData = () => {
    const combinedData = [
      ...auditMismatchData,
      ...rectifyMismatchData,
      ...tallyEntryMismatchData,
      ...reAuditMismatchData,
      ...billEntryMismatchData
    ];

    const uniqueData = combinedData.reduce((acc, current) => {
      const exists = acc.find(item => item.supabaseId === current.supabaseId);
      if (!exists) {
        acc.push(current);
      }
      return acc;
    }, []);

    return uniqueData;
  };

  const getFilteredByTab = (tab) => {
    if (tab === 'ALL') return getAllStagesData();
    if (tab === 'AUDIT') return auditMismatchData;
    if (tab === 'TALLY_ENTRY') return tallyEntryMismatchData;
    if (tab === 'BILL_ENTRY') return billEntryMismatchData;
    if (tab === 'RECTIFY') return rectifyMismatchData;
    if (tab === 'REAUDIT') return reAuditMismatchData;
    if (tab === 'HISTORY') return historyData;
    return accountsData.filter(row => row.currentStage === tab);
  };

  const filteredData = getFilteredByTab(activeTab).filter(item => {
    const matchesFirm = firmFilter === 'all' || (item.firmName && item.firmName === firmFilter);
    if (!matchesFirm) return false;

    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      String(item.liftNumber || '').toLowerCase().includes(searchLower) ||
      String(item.partyName || '').toLowerCase().includes(searchLower) ||
      String(item.productName || '').toLowerCase().includes(searchLower) ||
      String(item.billNo || '').toLowerCase().includes(searchLower) ||
      String(item.indentNumber || '').toLowerCase().includes(searchLower) ||
      String(item.firmName || '').toLowerCase().includes(searchLower) ||
      String(item.transporterName || '').toLowerCase().includes(searchLower)
    );
  }).sort((a, b) => {
    const liftA = String(a.liftNumber || '');
    const liftB = String(b.liftNumber || '');
    return liftB.localeCompare(liftA, undefined, { numeric: true, sensitivity: 'base' });
  });

  const getGroupKey = (firmName, billNo, partyName) => {
    const firm = String(firmName || '').trim().toLowerCase();
    const bill = String(billNo || '').trim().toLowerCase();
    const party = String(partyName || '').trim().toLowerCase();
    return `${firm}|||${bill}|||${party}`;
  };

  const groupedData = useMemo(() => {
    const groups = {};
    filteredData.forEach(row => {
      const key = getGroupKey(row.firmName, row.billNo, row.partyName);
      
      if (!groups[key]) {
        groups[key] = {
          firmName: row.firmName || '',
          billNo: row.billNo || '',
          partyName: row.partyName || '',
          items: [],
        };
      }
      groups[key].items.push(row);
    });

    return Object.values(groups);
  }, [filteredData, activeTab]);

  const getStageCount = (stage) => {
    const data = getFilteredByTab(stage);
    return data.filter(item => firmFilter === 'all' || (item.firmName && item.firmName === firmFilter)).length;
  };

  const COLUMN_LABELS = {
    stage: 'Stage', timestamp: 'Date', indentNumber: 'Indent No.', firmName: 'Firm Name',
    poRate: 'PO Rate', vendorName: 'Vendor Name', liftNumber: 'Lift Number', billNo: 'Bill No.',
    dateOfReceiving: 'Bill Receiving Date', partyName: 'Party Name', productName: 'Product Name',
    qty: 'PO Qty', areaLifting: 'Area Lifting', truckNo: 'Truck No.', transporterName: 'Transporter',
    transporterRate: 'Transporter Rate', billImage: 'Bill Image', biltyNo: 'Bilty No.',
    typeOfRate: 'Type Of Rate', rate: 'Material Rate', truckQty: 'Material Qty',
    liftingQty: 'Truck Qty', biltyImage: 'Bilty Image', qtyDifferenceStatus: 'Qty Diff Status',
    weightSlip: 'Weight Slip', debitAmount: 'Debit Amount', debitNoteUrl: 'Debit Image',
    totalFreight: 'Total Freight', auditStatus: 'Audit Status', rectifyStatus: 'Rectify Status',
    reAuditStatus: 'Re-Audit Status', tallyStatus: 'Tally Status', status: 'Status',
    remarks: 'Remarks', auditRemarks: 'Audit Remarks', rectifyRemarks: 'Rectify Remarks',
    reauditRemarks: 'Re-Audit Remarks', tallyRemarks: 'Tally Remarks', billRemarks: 'Bill Remarks',
  };

  const exportCSV = () => {
    const exportCols = Object.entries(COLUMN_LABELS).filter(([key]) => visibleColumns[key]);
    const headers = exportCols.map(([, label]) => `"${label}"`).join(',');
    const rows = filteredData.map((row) =>
      exportCols.map(([key]) => `"${String(row[key] ?? '').replace(/"/g, '""')}"`).join(','),
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-${activeTab.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderActiveTab = () => {
    const tabProps = {
      filteredData,
      groupedData,
      visibleColumns,
      activeTab,
      isSuperAdmin,
      setEditingRow,
      initializeFormData,
      setSuperAdminEditRow,
      toggleGroup,
      expandedGroups,
      setEditingGroupItems,
      STAGES,
      getGroupKey
    };

    switch (activeTab) {
      case 'ALL':
        return <AllStagesTab {...tabProps} />;
      case 'AUDIT':
        return <AuditTab {...tabProps} />;
      case 'RECTIFY':
        return <RectifyTab {...tabProps} />;
      case 'TALLY_ENTRY':
        return <TallyEntryTab {...tabProps} />;
      case 'REAUDIT':
        return <ReAuditTab {...tabProps} />;
      case 'BILL_ENTRY':
        return <BillEntryTab {...tabProps} />;
      case 'HISTORY':
        return <HistoryTab {...tabProps} />;
      default:
        return null;
    }
  };

  if (loading || (activeTab === 'ALL' && (loadingAudit || loadingRectify || loadingTallyEntry || loadingReAudit || loadingBillEntry)) || (activeTab === 'AUDIT' && loadingAudit) || (activeTab === 'TALLY_ENTRY' && loadingTallyEntry) || (activeTab === 'BILL_ENTRY' && loadingBillEntry) || (activeTab === 'RECTIFY' && loadingRectify) || (activeTab === 'REAUDIT' && loadingReAudit) || (activeTab === 'HISTORY' && loadingHistory)) {
    return (
      <div className="min-h-[400px] bg-linear-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center rounded-xl border border-gray-200 shadow-sm m-4">
        <RefreshCw className="w-12 h-12 animate-spin text-green-500 mx-auto mb-4" />
        <p className="text-xl text-gray-600">Loading call tracker data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 max-w-2xl w-full">
          <div className="flex items-center mb-4">
            <X className="w-8 h-8 text-red-500 mr-3" />
            <h3 className="text-xl font-semibold text-red-800">Error Loading Data</h3>
          </div>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 p-4 sm:p-6 pb-20">
      {/* Entry Modal */}
      <AuditEntryModal
        visibleColumns={visibleColumns}
        editingRow={editingRow}
        editingGroupItems={editingGroupItems}
        auditMismatchData={auditMismatchData}
        tallyEntryMismatchData={tallyEntryMismatchData}
        billEntryMismatchData={billEntryMismatchData}
        rectifyMismatchData={rectifyMismatchData}
        reAuditMismatchData={reAuditMismatchData}
        allMismatchData={allMismatchData}
        accountsData={accountsData}
        STAGES={STAGES}
        formData={formData}
        handleFormChange={handleFormChange}
        submitFormData={submitFormData}
        submitting={submitting}
        setEditingRow={setEditingRow}
        setEditingGroupItems={setEditingGroupItems}
        activeTab={activeTab}
      />

      {/* Group Preview Modal */}
      <GroupedProductsDetailsModal
        viewGroupItems={viewGroupItems}
        setViewGroupItems={setViewGroupItems}
      />

      {/* SuperAdmin Edit Modal */}
      {superAdminEditRow && (
        <SuperAdminEditModal
          title={
            superAdminEditRow.isNewFromLift
              ? `Edit Lift Record — ${superAdminEditRow.liftNumber}`
              : `Edit Mismatch Record — ${superAdminEditRow.liftNumber}`
          }
          tableName={superAdminEditRow.isNewFromLift ? "LIFT-ACCOUNTS" : "Mismatch"}
          pkField="id"
          pkValue={
            superAdminEditRow.isNewFromLift
              ? superAdminEditRow.liftDbId
              : superAdminEditRow.supabaseId
          }
          fields={
            superAdminEditRow.isNewFromLift
              ? [
                  { label: "Lift Number", dbKey: "Lift No", value: superAdminEditRow.liftNumber, type: "text" },
                  { label: "Indent No.", dbKey: "Indent no.", value: superAdminEditRow.indentNumber, type: "text" },
                  { label: "Firm Name", dbKey: "Firm Name", value: superAdminEditRow.firmName, type: "text" },
                  {
                    label: "PO Rate",
                    dbKey: "PO Rate",
                    value: superAdminEditRow.poRate,
                    type: "number",
                    customTable: "INDENT-PO",
                    customPkField: "po_number",
                    customPkValue: superAdminEditRow.indentNumber,
                    saveDbKey: "Rate"
                  },
                  { label: "Bill No.", dbKey: "Bill No.", value: superAdminEditRow.billNo, type: "text" },
                  { label: "Bill Receiving Date", dbKey: "Date Of Receiving", value: superAdminEditRow.dateOfReceiving, type: "date" },
                  { label: "Party Name", dbKey: "Vendor Name", value: superAdminEditRow.partyName || superAdminEditRow.vendorName, type: "text" },
                  { label: "Product Name", dbKey: "Raw Material Name", value: superAdminEditRow.productName, type: "text" },
                  { label: "Remarks", dbKey: "Remarks", value: superAdminEditRow.remarks, type: "textarea", skipSave: true },
                  { label: "PO Qty", dbKey: "Qty", value: superAdminEditRow.qty, type: "number" },
                  { label: "Area Lifting", dbKey: "Area lifting", value: superAdminEditRow.areaLifting, type: "text" },
                  { label: "Truck No.", dbKey: "Truck No.", value: superAdminEditRow.truckNo, type: "text" },
                  { label: "Transporter", dbKey: "Transporter Name", value: superAdminEditRow.transporterName, type: "text" },
                  { label: "Transporter Rate", dbKey: "Transporter Rate", value: superAdminEditRow.transporterRate, type: "number" },
                  { label: "Bill Image", dbKey: "Bill Image", value: superAdminEditRow.billImage, type: "file", folder: "bill-images" },
                  { label: "Bilty No.", dbKey: "Bilty No.", value: superAdminEditRow.biltyNo, type: "text" },
                  { label: "Type Of Rate", dbKey: "Type Of Transporting Rate", value: superAdminEditRow.typeOfRate, type: "text" },
                  { label: "Material Rate", dbKey: "Rate", value: superAdminEditRow.rate, type: "number" },
                  { label: "Material Qty", dbKey: "Truck Qty", value: superAdminEditRow.truckQty, type: "number" },
                  { label: "Truck Qty", dbKey: "Lifting Qty", value: superAdminEditRow.liftingQty, type: "number" },
                  { label: "Bilty Image", dbKey: "Bilty Image", value: superAdminEditRow.biltyImage, type: "file", folder: "lift-bilty" },
                  { label: "Qty Diff Status", dbKey: "qtyDifferenceStatus", value: superAdminEditRow.qtyDifferenceStatus, type: "text", readOnly: true },
                  { label: "Weight Slip", dbKey: "Image Of Weight Slip", value: superAdminEditRow.weightSlip, type: "file", folder: "receipt-weight-slip" },
                  { label: "Debit Amount", dbKey: "Debit Amount", value: superAdminEditRow.debitAmount, type: "number", skipSave: true },
                  { label: "Debit Image", dbKey: "Debit Note URL", value: superAdminEditRow.debitNoteUrl, type: "file", folder: "debit-notes", skipSave: true },
                  { label: "Total Freight", dbKey: "Total Freight", value: superAdminEditRow.totalFreight, type: "number" },
                ]
              : [
                  { label: "Lift Number", dbKey: "Lift ID", value: superAdminEditRow.liftNumber, type: "text" },
                  { label: "Indent No.", dbKey: "Indent Number", value: superAdminEditRow.indentNumber, type: "text" },
                  { label: "Firm Name", dbKey: "Firm Name", value: superAdminEditRow.firmName, type: "text" },
                  {
                    label: "PO Rate",
                    dbKey: "PO Rate",
                    value: superAdminEditRow.poRate,
                    type: "number",
                    customTable: "INDENT-PO",
                    customPkField: "po_number",
                    customPkValue: superAdminEditRow.indentNumber,
                    saveDbKey: "Rate"
                  },
                  { label: "Bill No.", dbKey: "Bill No.", value: superAdminEditRow.billNo, type: "text" },
                  { label: "Bill Receiving Date", dbKey: "Date Of Receiving", value: superAdminEditRow.dateOfReceiving, type: "date" },
                  { label: "Party Name", dbKey: "Party Name", value: superAdminEditRow.partyName, type: "text" },
                  { label: "Product Name", dbKey: "Product Name", value: superAdminEditRow.productName, type: "text" },
                  { label: "Remarks", dbKey: "Remarks", value: superAdminEditRow.remarks, type: "textarea" },
                  { label: "PO Qty", dbKey: "Qty", value: superAdminEditRow.qty, type: "number" },
                  { label: "Area Lifting", dbKey: "Area Lifting", value: superAdminEditRow.areaLifting, type: "text" },
                  { label: "Truck No.", dbKey: "Truck No.", value: superAdminEditRow.truckNo, type: "text" },
                  { label: "Transporter", dbKey: "Transporter Name", value: superAdminEditRow.transporterName, type: "text" },
                  { label: "Transporter Rate", dbKey: "Transporter Rate", value: superAdminEditRow.transporterRate, type: "number" },
                  { label: "Bill Image", dbKey: "Bill Image", value: superAdminEditRow.billImage, type: "file", folder: "bill-images" },
                  { label: "Bilty No.", dbKey: "Bilty No.", value: superAdminEditRow.biltyNo, type: "text" },
                  { label: "Type Of Rate", dbKey: "Type Of Rate", value: superAdminEditRow.typeOfRate, type: "text" },
                  { label: "Material Rate", dbKey: "Rate", value: superAdminEditRow.rate, type: "number" },
                  { label: "Material Qty", dbKey: "Truck Qty", value: superAdminEditRow.truckQty, type: "number" },
                  {
                    label: "Truck Qty",
                    dbKey: "Lifting Qty",
                    value: superAdminEditRow.liftingQty,
                    type: "number",
                    customTable: "LIFT-ACCOUNTS",
                    customPkField: "Lift No",
                    customPkValue: superAdminEditRow.liftNumber,
                    saveDbKey: "Lifting Qty"
                  },
                  { label: "Bilty Image", dbKey: "Bilty Image", value: superAdminEditRow.biltyImage, type: "file", folder: "lift-bilty" },
                  { label: "Qty Diff Status", dbKey: "qtyDifferenceStatus", value: superAdminEditRow.qtyDifferenceStatus, type: "text", readOnly: true },
                  { label: "Weight Slip", dbKey: "Weight Slip", value: superAdminEditRow.weightSlip, type: "file", folder: "receipt-weight-slip" },
                  { label: "Debit Amount", dbKey: "Debit Amount", value: superAdminEditRow.debitAmount, type: "number" },
                  { label: "Debit Image", dbKey: "Debit Note URL", value: superAdminEditRow.debitNoteUrl, type: "file", folder: "debit-notes" },
                  { label: "Total Freight", dbKey: "Total Freight", value: superAdminEditRow.totalFreight, type: "number" },
                  { label: "Audit Remarks", dbKey: "Remarks2", value: superAdminEditRow.auditRemarks, type: "textarea" },
                  { label: "Rectify Remarks", dbKey: "Remarks3", value: superAdminEditRow.rectifyRemarks, type: "textarea" },
                  { label: "Tally Remarks", dbKey: "Remarks4", value: superAdminEditRow.tallyRemarks, type: "textarea" },
                  { label: "Re-Audit Remarks", dbKey: "Remarks5", value: superAdminEditRow.reauditRemarks, type: "textarea" },
                  { label: "Bill Remarks", dbKey: "Remarks6", value: superAdminEditRow.billRemarks, type: "textarea" },
                ]
          }
          onClose={() => setSuperAdminEditRow(null)}
          onSaved={() => {
            setSuperAdminEditRow(null);
            fetchData();
            fetchAuditDataFromSupabase();
            fetchTallyEntryDataFromSupabase();
            fetchBillEntryDataFromSupabase();
            fetchRectifyDataFromSupabase();
            fetchReAuditDataFromSupabase();
            fetchHistoryDataFromSupabase();
          }}
        />
      )}

      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Call Tracker</h1>
                <p className="text-sm text-gray-600 mt-1">Track all stages of account processing</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="relative w-64 hidden sm:block">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#7da23a] focus:border-[#7da23a] sm:text-sm"
                    placeholder="Search records..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2 mr-2">
                  <select
                    value={firmFilter}
                    onChange={(e) => setFirmFilter(e.target.value)}
                    className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-[#6b8e2f] outline-none"
                  >
                    <option value="all">All Firms</option>
                    {uniqueFirms.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <button
                    onClick={toggleColumnFilter}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors duration-200"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Columns
                  </button>

                  {showColumnFilter && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowColumnFilter(false)}
                      ></div>

                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-80 overflow-y-auto">
                        <div className="p-4">
                          <h3 className="text-sm font-medium text-gray-700 mb-3">Show/Hide Columns</h3>
                          <div className="grid grid-cols-1 gap-2">
                            {Object.entries({
                              stage: 'Stage',
                              timestamp: 'Date',
                              indentNumber: 'Indent No.',
                              firmName: 'Firm Name',
                              poRate: 'PO Rate',
                              vendorName: 'Vendor Name',
                              liftNumber: 'Lift Number',
                              billNo: 'Bill No.',
                              dateOfReceiving: 'Bill Receiving Date',
                              partyName: 'Party Name',
                              productName: 'Product Name',
                              qty: 'PO Qty',
                              areaLifting: 'Area Lifting',
                              truckNo: 'Truck No.',
                              transporterName: 'Transporter',
                              transporterRate: 'Transporter Rate',
                              billImage: 'Bill Image',
                              biltyNo: 'Bilty No.',
                              typeOfRate: 'Type Of Rate',
                              rate: 'Material Rate',
                              truckQty: 'Material Qty',
                              liftingQty: 'Truck Qty',
                              biltyImage: 'Bilty Image',
                              qtyDifferenceStatus: 'Qty Diff Status',
                              weightSlip: 'Weight Slip',
                              debitAmount: 'Debit Amount',
                              debitNoteUrl: 'Debit Image',
                              totalFreight: 'Total Freight',
                              auditStatus: 'Audit Status',
                              rectifyStatus: 'Rectify Status',
                              reAuditStatus: 'Re-Audit Status',
                              tallyStatus: 'Tally Status',
                              status: 'Status',
                              remarks: 'Remarks',
                              auditRemarks: 'Audit Remarks',
                              rectifyRemarks: 'Rectify Remarks',
                              reauditRemarks: 'Re-Audit Remarks',
                              tallyRemarks: 'Tally Remarks',
                              billRemarks: 'Bill Remarks',
                              actions: 'Actions'
                            }).map(([key, label]) => (
                              <label key={key} className="flex items-center space-x-2 text-sm py-1 hover:bg-gray-50 px-2 rounded cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={visibleColumns[key]}
                                  onChange={() => toggleColumnVisibility(key)}
                                  className="w-4 h-4 text-[#7da23a] bg-gray-100 border-gray-300 rounded focus:ring-[#6b8e2f] focus:ring-2"
                                />
                                <span className="text-gray-700">{label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={exportCSV}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors duration-200"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </button>
                <button
                  onClick={fetchData}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors duration-200"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Tabs Section */}
          <div className="px-6 pt-4">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-2 overflow-x-auto pb-2" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('ALL')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 whitespace-nowrap ${activeTab === 'ALL'
                    ? 'bg-green-50 text-[#6b8e2f] border border-green-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center space-x-2">
                    <span>All Stages</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === 'ALL' ? 'bg-green-100 text-[#6b8e2f]' : 'bg-gray-100 text-gray-700'
                      }`}>
                      {getStageCount('ALL')}
                    </span>
                  </div>
                </button>

                {TAB_ORDER.map((stageKey) => {
                  const stageInfo = STAGES[stageKey];
                  const StageIcon = stageInfo.icon;
                  const count = getStageCount(stageKey);

                  return (
                    <button
                      key={stageKey}
                      onClick={() => setActiveTab(stageKey)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 whitespace-nowrap ${activeTab === stageKey
                        ? `${stageInfo.color.replace('text', 'border').replace('bg', 'bg-opacity-20')} border`
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex items-center space-x-2">
                        <StageIcon className="w-4 h-4" />
                        <span>{stageInfo.name}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === stageKey
                          ? `${stageInfo.color.replace('bg-100', 'bg-200')}`
                          : 'bg-gray-100 text-gray-700'
                          }`}>
                          {count}
                        </span>
                      </div>
                    </button>
                  );
                })}

                {/* History Tab */}
                <button
                  onClick={() => setActiveTab('HISTORY')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 whitespace-nowrap ${activeTab === 'HISTORY'
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>History</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === 'HISTORY' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                      {getStageCount('HISTORY')}
                    </span>
                  </div>
                </button>
              </nav>
            </div>
          </div>

          {/* Stage Description */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            {activeTab !== 'ALL' && activeTab !== 'HISTORY' && (
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${STAGES[activeTab].color.replace('bg-100', 'bg-200')}`}>
                  {React.createElement(STAGES[activeTab].icon, { className: "w-5 h-5" })}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{STAGES[activeTab].name}</h3>
                  <p className="text-sm text-gray-600">{STAGES[activeTab].description}</p>
                </div>
                <div className="ml-auto text-sm text-gray-500">
                  Showing {filteredData.length} records
                </div>
              </div>
            )}
            {activeTab === 'HISTORY' && (
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">History</h3>
                  <p className="text-sm text-gray-600">All fully completed records (Bill Received done)</p>
                </div>
                <div className="ml-auto text-sm text-gray-500">
                  Showing {filteredData.length} records
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Active Tab Content */}
        {renderActiveTab()}
      </div>
    </div>
  );
};

export default CallTrackerPage;
