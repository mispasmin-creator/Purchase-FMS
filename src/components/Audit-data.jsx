import React, { useState, useEffect } from 'react';
import { RefreshCw, Save, X, Edit2, Image, Filter, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../supabase';
import { toast } from 'sonner';

const CallTrackerPage = () => {
  const [accountsData, setAccountsData] = useState([]);
  const [auditMismatchData, setAuditMismatchData] = useState([]); // New state for Audit tab from Supabase
  const [tallyEntryMismatchData, setTallyEntryMismatchData] = useState([]); // New state for Tally Entry tab from Supabase
  const [billEntryMismatchData, setBillEntryMismatchData] = useState([]); // New state for Bill Entry tab from Supabase
  const [rectifyMismatchData, setRectifyMismatchData] = useState([]); // New state for Rectify tab from Supabase
  const [reAuditMismatchData, setReAuditMismatchData] = useState([]); // New state for Re-Audit tab from Supabase
  const [allMismatchData, setAllMismatchData] = useState([]); // New state for ALL tab from Supabase
  const [loading, setLoading] = useState(true);
  const [loadingAudit, setLoadingAudit] = useState(true); // Separate loading state for Supabase audit data
  const [loadingTallyEntry, setLoadingTallyEntry] = useState(true); // Separate loading state for Supabase tally entry data
  const [loadingBillEntry, setLoadingBillEntry] = useState(true); // Separate loading state for Supabase bill entry data
  const [loadingRectify, setLoadingRectify] = useState(true); // Separate loading state for Supabase rectify data
  const [loadingReAudit, setLoadingReAudit] = useState(true); // Separate loading state for Supabase re-audit data
  const [loadingAll, setLoadingAll] = useState(true); // Separate loading state for Supabase all data
  const [error, setError] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedRows, setSubmittedRows] = useState(new Set());
  const [visibleColumns, setVisibleColumns] = useState({
    stage: true,
    timestamp: true,
    liftNumber: true,
    type: true,
    billNo: true,
    partyName: true,
    productName: true,
    qty: true,
    areaLifting: true,
    truckNo: true,
    transporterName: true,
    billImage: true,
    biltyNo: true,
    typeOfRate: true,
    rate: true,
    truckQty: true,
    biltyImage: true,
    qtyDifferenceStatus: true,
    differenceQty: true,
    weightSlip: true,
    totalFreight: true,
    status: true,
    remarks: true,
    actions: true
  });
  const [showColumnFilter, setShowColumnFilter] = useState(false);
  const [activeTab, setActiveTab] = useState('AUDIT'); // Default to Audit tab

  const SHEET_ID = "13_sHCFkVxAzPbel-k9BuUBFY-E11vdKJAOgvzhBMLMY";
  const SHEET_NAME = "ACCOUNTS";

  // Define stages in the required sequence
  const STAGES = {
    AUDIT: {
      name: 'Audit',
      color: 'bg-yellow-100 text-yellow-800',
      icon: CheckCircle,
      description: 'Initial audit verification'
    },
    RECTIFY: {
      name: 'Rectify',
      color: 'bg-blue-100 text-blue-800',
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
      color: 'bg-purple-100 text-purple-800',
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
      name: 'Bill Entry',
      color: 'bg-indigo-100 text-indigo-800',
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

  // Define tab order according to requirements
  const TAB_ORDER = ['AUDIT', 'RECTIFY', 'TALLY_ENTRY', 'REAUDIT', 'BILL_ENTRY'];

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
    // Column V (21) - Actual for Rectify
    const rectifyActual = getCellValue(row, 21);

    // Column AE (30) - Planned for Rectify 2 (trigger)
    // Column AF (31) - Actual for Rectify 2
    const rectify2Planned = getCellValue(row, 30);
    const rectify2Actual = getCellValue(row, 31);

    // Column AJ (35) - Planned for Tally Entry (trigger)
    // Column AK (36) - Actual for Tally Entry
    const tallyPlanned = getCellValue(row, 35);
    const tallyActual = getCellValue(row, 36);

    // Column Z (25) - Planned for Audit (trigger)
    // Column AA (26) - Actual for Audit
    const auditPlanned = getCellValue(row, 25);
    const auditActual = getCellValue(row, 26);

    // Column AO (40) - Planned for Re-Audit (trigger)
    // Column AP (41) - Actual for Re-Audit
    const reauditPlanned = getCellValue(row, 40);
    const reauditActual = getCellValue(row, 41);

    // Column AT (45) - Planned for Bill Entry (trigger)
    // Column AU (46) - Actual for Bill Entry
    const billEntryPlanned = getCellValue(row, 45);
    const billEntryActual = getCellValue(row, 46);

    // Check if completed (all stages done - all Actual columns have data)
    if (rectifyActual && rectify2Actual && tallyActual && auditActual && reauditActual && billEntryActual) {
      return 'COMPLETED';
    }

    // Bill Entry stage: AT (Planned) has data but AU (Actual) is empty
    if (billEntryPlanned && billEntryPlanned !== '' && (!billEntryActual || billEntryActual === '')) {
      return 'BILL_ENTRY';
    }

    // Re-Audit stage: AO (Planned) has data AND AP (Actual) is empty
    if (reauditPlanned && reauditPlanned !== '' && (!reauditActual || reauditActual === '')) {
      return 'REAUDIT';
    }

    // Audit stage: Z (Planned) has data but AA (Actual) is empty
    if (auditPlanned && auditPlanned !== '' && (!auditActual || auditActual === '')) {
      return 'AUDIT';
    }

    // Tally Entry stage: AJ (Planned) has data AND AK (Actual) is empty
    if (tallyPlanned && tallyPlanned !== '' && (!tallyActual || tallyActual === '')) {
      return 'TALLY_ENTRY';
    }

    // Rectify 2 stage: AE (Planned) has data AND AF (Actual) is empty
    if (rectify2Planned && rectify2Planned !== '' && (!rectify2Actual || rectify2Actual === '')) {
      return 'RECTIFY_2';
    }

    // Rectify stage: V (Actual) is empty (default initial stage)
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
          statusOptions: ['Done', 'Not Done']
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
          statusOptions: ['Done', 'Not Done']
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
      status: 'Not Done',
      remarks: ''
    });
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const submitFormData = async () => {
    if (!editingRow) return;

    // Check if this is an AUDIT tab item from Supabase
    const auditRow = auditMismatchData.find(r => r.id === editingRow);

    if (auditRow) {
      // Handle AUDIT tab submission to Supabase
      setSubmitting(true);
      try {
        const currentDate = new Date();
        const actualDateTime = currentDate.toLocaleString("en-GB", { hour12: false }).replace(",", "");

        // Update the Actual2 column in Supabase Mismatch table
        const { data: updateData, error: updateError } = await supabase
          .from("Mismatch")
          .update({
            Actual2: actualDateTime,
            Status2: formData.status || 'Done',
            Remarks2: formData.remarks || ''
          })
          .eq("id", auditRow.supabaseId)
          .select();

        if (updateError) throw updateError;

        // Mark as submitted
        setSubmittedRows(prev => new Set([...prev, `AUDIT_${editingRow}`]));
        setEditingRow(null);

        const formattedDateTime = currentDate.toLocaleString("en-GB", { hour12: false }).replace(",", "");
        toast.success(`✅ SUCCESS: Mismatch data submitted to Mismatch table for: ${auditRow.liftNumber} Submitted at: ${formattedDateTime}`);

        // Refresh data
        setTimeout(() => {
          fetchAuditDataFromSupabase();
          fetchAllDataFromSupabase(); // Also refresh All Stages tab
        }, 1000);

      } catch (error) {
        console.error('Submission error:', error);
        toast.error(`❌ SUBMISSION FAILED: ${error.message}`);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Check if this is a TALLY_ENTRY tab item from Supabase
    const tallyEntryRow = tallyEntryMismatchData.find(r => r.id === editingRow);

    if (tallyEntryRow) {
      // Handle TALLY_ENTRY tab submission to Supabase
      setSubmitting(true);
      try {
        const currentDate = new Date();
        const actualDateTime = currentDate.toLocaleString("en-GB", { hour12: false }).replace(",", "");

        // Update the Actual4, Status4, and Remarks4 columns in Supabase Mismatch table
        const { data: updateData, error: updateError } = await supabase
          .from("Mismatch")
          .update({
            Actual4: actualDateTime,
            Status4: formData.status || 'Done',
            Remarks4: formData.remarks || ''
          })
          .eq("id", tallyEntryRow.supabaseId)
          .select();

        if (updateError) throw updateError;

        // Mark as submitted
        setSubmittedRows(prev => new Set([...prev, `TALLY_ENTRY_${editingRow}`]));
        setEditingRow(null);

        const formattedDateTime = currentDate.toLocaleString("en-GB", { hour12: false }).replace(",", "");
        toast.success(`✅ SUCCESS: Mismatch data submitted to Mismatch table for: ${tallyEntryRow.liftNumber} Submitted at: ${formattedDateTime}`);

        // Refresh data
        setTimeout(() => {
          fetchTallyEntryDataFromSupabase();
          fetchAllDataFromSupabase(); // Also refresh All Stages tab
        }, 1000);

      } catch (error) {
        console.error('Submission error:', error);
        toast.error(`❌ SUBMISSION FAILED: ${error.message}`);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Check if this is a BILL_ENTRY tab item from Supabase
    const billEntryRow = billEntryMismatchData.find(r => r.id === editingRow);

    if (billEntryRow) {
      // Handle BILL_ENTRY tab submission to Supabase
      setSubmitting(true);
      try {
        const currentDate = new Date();
        const actualDateTime = currentDate.toLocaleString("en-GB", { hour12: false }).replace(",", "");

        // Update the Actual6, Status6, and Remarks6 columns in Supabase Mismatch table
        const { data: updateData, error: updateError } = await supabase
          .from("Mismatch")
          .update({
            Actual6: actualDateTime,
            Status6: formData.status || 'Done',
            Remarks6: formData.remarks || ''
          })
          .eq("id", billEntryRow.supabaseId)
          .select();

        if (updateError) throw updateError;

        // Mark as submitted
        setSubmittedRows(prev => new Set([...prev, `BILL_ENTRY_${editingRow}`]));
        setEditingRow(null);

        const formattedDateTime = currentDate.toLocaleString("en-GB", { hour12: false }).replace(",", "");
        toast.success(`✅ SUCCESS: Mismatch data submitted to Mismatch table for: ${billEntryRow.liftNumber} Submitted at: ${formattedDateTime}`);

        // Refresh data
        setTimeout(() => {
          fetchBillEntryDataFromSupabase();
          fetchAllDataFromSupabase(); // Also refresh All Stages tab
        }, 1000);

      } catch (error) {
        console.error('Submission error:', error);
        toast.error(`❌ SUBMISSION FAILED: ${error.message}`);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Check if this is a RECTIFY tab item from Supabase
    const rectifyRow = rectifyMismatchData.find(r => r.id === editingRow);

    if (rectifyRow) {
      // Handle RECTIFY tab submission to Supabase
      setSubmitting(true);
      try {
        const currentDate = new Date();
        const actualDateTime = currentDate.toLocaleString("en-GB", { hour12: false }).replace(",", "");

        // Update the Actual3, Status3, and Remarks3 columns in Supabase Mismatch table
        const { data: updateData, error: updateError } = await supabase
          .from("Mismatch")
          .update({
            Actual3: actualDateTime,
            Status3: formData.status || 'Done',
            Remarks3: formData.remarks || ''
          })
          .eq("id", rectifyRow.supabaseId)
          .select();

        if (updateError) throw updateError;

        // Mark as submitted
        setSubmittedRows(prev => new Set([...prev, `RECTIFY_${editingRow}`]));
        setEditingRow(null);

        const formattedDateTime = currentDate.toLocaleString("en-GB", { hour12: false }).replace(",", "");
        toast.success(`✅ SUCCESS: Mismatch data submitted to Mismatch table for: ${rectifyRow.liftNumber} Submitted at: ${formattedDateTime}`);

        // Refresh data
        setTimeout(() => {
          fetchRectifyDataFromSupabase();
          fetchAllDataFromSupabase(); // Also refresh All Stages tab
        }, 1000);

      } catch (error) {
        console.error('Submission error:', error);
        toast.error(`❌ SUBMISSION FAILED: ${error.message}`);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Check if this is a RE_AUDIT tab item from Supabase
    const reAuditRow = reAuditMismatchData.find(r => r.id === editingRow);

    if (reAuditRow) {
      // Handle RE_AUDIT tab submission to Supabase
      setSubmitting(true);
      try {
        const currentDate = new Date();
        const actualDateTime = currentDate.toLocaleString("en-GB", { hour12: false }).replace(",", "");

        // Update the Actual5, Status5, and Remarks5 columns in Supabase Mismatch table
        const { data: updateData, error: updateError } = await supabase
          .from("Mismatch")
          .update({
            Actual5: actualDateTime,
            Status5: formData.status || 'Done',
            Remarks5: formData.remarks || ''
          })
          .eq("id", reAuditRow.supabaseId)
          .select();

        if (updateError) throw updateError;

        // Mark as submitted
        setSubmittedRows(prev => new Set([...prev, `RE_AUDIT_${editingRow}`]));
        setEditingRow(null);

        const formattedDateTime = currentDate.toLocaleString("en-GB", { hour12: false }).replace(",", "");
        toast.success(`✅ SUCCESS: Mismatch data submitted to Mismatch table for: ${reAuditRow.liftNumber} Submitted at: ${formattedDateTime}`);

        // Refresh data
        setTimeout(() => {
          fetchReAuditDataFromSupabase();
          fetchAllDataFromSupabase(); // Also refresh All Stages tab
        }, 1000);

      } catch (error) {
        console.error('Submission error:', error);
        toast.error(`❌ SUBMISSION FAILED: ${error.message}`);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Check if this is an ALL tab item from Supabase
    const allRow = allMismatchData.find(r => r.id === editingRow);

    if (allRow) {
      // Handle ALL tab submission to Supabase based on currentStage
      setSubmitting(true);
      try {
        const currentDate = new Date();
        const actualDateTime = currentDate.toLocaleString("en-GB", { hour12: false }).replace(",", "");

        // Determine which columns to update based on the row's currentStage
        let updateColumns = {};
        let refreshFunction = null;

        switch (allRow.currentStage) {
          case 'AUDIT':
            updateColumns = {
              Actual2: actualDateTime,
              Status2: formData.status || 'Done',
              Remarks2: formData.remarks || ''
            };
            refreshFunction = fetchAuditDataFromSupabase;
            break;
          case 'RECTIFY':
            updateColumns = {
              Actual3: actualDateTime,
              Status3: formData.status || 'Done',
              Remarks3: formData.remarks || ''
            };
            refreshFunction = fetchRectifyDataFromSupabase;
            break;
          case 'TALLY_ENTRY':
            updateColumns = {
              Actual4: actualDateTime,
              Status4: formData.status || 'Done',
              Remarks4: formData.remarks || ''
            };
            refreshFunction = fetchTallyEntryDataFromSupabase;
            break;
          case 'REAUDIT':
            updateColumns = {
              Actual5: actualDateTime,
              Status5: formData.status || 'Done',
              Remarks5: formData.remarks || ''
            };
            refreshFunction = fetchReAuditDataFromSupabase;
            break;
          case 'BILL_ENTRY':
            updateColumns = {
              Actual6: actualDateTime,
              Status6: formData.status || 'Done',
              Remarks6: formData.remarks || ''
            };
            refreshFunction = fetchBillEntryDataFromSupabase;
            break;
          default:
            throw new Error(`Unknown stage: ${allRow.currentStage}`);
        }

        // Update the corresponding columns in Supabase Mismatch table
        const { data: updateData, error: updateError } = await supabase
          .from("Mismatch")
          .update(updateColumns)
          .eq("id", allRow.supabaseId)
          .select();

        if (updateError) throw updateError;

        // Mark as submitted
        setSubmittedRows(prev => new Set([...prev, `ALL_${editingRow}`]));
        setEditingRow(null);

        const formattedDateTime = currentDate.toLocaleString("en-GB", { hour12: false }).replace(",", "");
        toast.success(`✅ SUCCESS: Mismatch data submitted to Mismatch table for: ${allRow.liftNumber} Submitted at: ${formattedDateTime}`);

        // Refresh ALL data and all individual stage tabs for complete sync
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

    // Original Google Sheets logic for other tabs
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

      // Add delay based on stage and status
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

        const rowData = {
          id: index,
          timestamp: formatDate(getCellValue(row, 0)) || '',
          liftNumber: getCellValue(row, 1) || '',
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
          totalFreight: getCellValue(row, 19) || '',
          rawRow: row
        };

        const hasData = Object.values(rowData).some(value =>
          value && value !== '' && value !== index && value !== row
        );

        if (!hasData) return null;

        const stage = determineStage(row);
        rowData.currentStage = stage;

        // Get status and remarks based on current stage
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

      // Filter out completed and submitted rows
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

  // Fetch Audit data from Supabase Mismatch table
  const fetchAuditDataFromSupabase = async () => {
    setLoadingAudit(true);
    try {
      const { data, error } = await supabase
        .from("Mismatch")
        .select("*")
        .not("Planned2", "is", null)
        .order("Timestamp", { ascending: false });

      if (error) throw error;

      // Filter: Show data ONLY when Actual2 is null (Planned2 not null is already filtered in query)
      const filteredByActual = (data || []).filter(row => !row.Actual2);

      // Map Supabase data to match the expected format
      const formattedData = (filteredByActual || []).map((row, index) => ({
        id: `mismatch_${row.id || index}`,
        timestamp: formatDate(row.Timestamp) || '',
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
        biltyNo: row["Bilty No."] || row["Bilty No"] || '',
        typeOfRate: row["Type Of Rate"] || row["Type Of Transporting Rate"] || '',
        rate: row["Rate"] || '',
        truckQty: row["Truck Qty"] || '',
        biltyImage: row["Bilty Image"] || '',
        qtyDifferenceStatus: row["Qty Diff Status"] || row["Qty Difference Status"] || '',
        differenceQty: row["Diff Qty"] || row["Difference Qty"] || '',
        weightSlip: row["Weight Slip"] || row["Image Of Weight Slip"] || '',
        totalFreight: row["Total Freight"] || '',
        status: row.Status2 || row.Status || '',
        remarks: row.Remarks2 || row.Remarks || '',
        currentStage: 'AUDIT',
        supabaseId: row.id, // Store the actual Supabase ID for updates
        indentNumber: row["Indent Number"] || '',
        firmName: row["Firm Name"] || ''
      }));

      // Filter out submitted rows
      const filteredData = formattedData.filter(item => {
        const submittedKey = `AUDIT_${item.id}`;
        return !submittedRows.has(submittedKey);
      });

      setAuditMismatchData(filteredData);

    } catch (err) {
      console.error('Error fetching audit data from Supabase:', err);
      // Don't set error state here, just log it
    } finally {
      setLoadingAudit(false);
    }
  };

  // Fetch Tally Entry data from Supabase Mismatch table where Planned4 is not null AND Actual4 is null
  const fetchTallyEntryDataFromSupabase = async () => {
    setLoadingTallyEntry(true);
    try {
      const { data, error } = await supabase
        .from("Mismatch")
        .select("*")
        .not("Planned4", "is", null)
        .is("Actual4", null)
        .order("Timestamp", { ascending: false });

      if (error) throw error;

      // Map Supabase data to match the expected format - include all columns
      const formattedData = (data || []).map((row, index) => ({
        id: `mismatch_tally_${row.id || index}`,
        timestamp: formatDate(row.Timestamp) || '',
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
        biltyNo: row["Bilty No."] || row["Bilty No"] || '',
        typeOfRate: row["Type Of Rate"] || row["Type Of Transporting Rate"] || '',
        rate: row["Rate"] || '',
        truckQty: row["Truck Qty"] || '',
        biltyImage: row["Bilty Image"] || '',
        qtyDifferenceStatus: row["Qty Diff Status"] || row["Qty Difference Status"] || '',
        differenceQty: row["Diff Qty"] || row["Difference Qty"] || '',
        weightSlip: row["Weight Slip"] || row["Image Of Weight Slip"] || '',
        totalFreight: row["Total Freight"] || '',
        status: row.Status4 || '',
        remarks: row.Remarks4 || '',
        currentStage: 'TALLY_ENTRY',
        supabaseId: row.id, // Store the actual Supabase ID for updates
        indentNumber: row["Indent Number"] || row["Indent No"] || '',
        firmName: row["Firm Name"] || '',
        vendorName: row["Vendor Name"] || '',
        driverNo: row["Driver No"] || row["Driver No."] || '',
        liftingQty: row["Lifting Qty"] || '',
        dateOfReceiving: row["Date Of Receiving"] || '',
        actualQuantity: row["Actual Quantity"] || '',
        physicalCondition: row["Physical Condition"] || '',
        moisture: row["Moisture"] || '',
        weightSlipQty: row["Weight Slip Qty"] || ''
      }));

      // Filter out submitted rows
      const filteredData = formattedData.filter(item => {
        const submittedKey = `TALLY_ENTRY_${item.id}`;
        return !submittedRows.has(submittedKey);
      });

      setTallyEntryMismatchData(filteredData);

    } catch (err) {
      console.error('Error fetching tally entry data from Supabase:', err);
      // Don't set error state here, just log it
    } finally {
      setLoadingTallyEntry(false);
    }
  };

  // Fetch Bill Entry data from Supabase Mismatch table where Planned6 is not null AND Actual6 is null
  const fetchBillEntryDataFromSupabase = async () => {
    setLoadingBillEntry(true);
    try {
      const { data, error } = await supabase
        .from("Mismatch")
        .select("*")
        .not("Planned6", "is", null)
        .is("Actual6", null)
        .order("Timestamp", { ascending: false });

      if (error) throw error;

      // Map Supabase data to match the expected format - include all columns
      const formattedData = (data || []).map((row, index) => ({
        id: `mismatch_bill_${row.id || index}`,
        timestamp: formatDate(row.Timestamp) || '',
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
        biltyNo: row["Bilty No."] || row["Bilty No"] || '',
        typeOfRate: row["Type Of Rate"] || row["Type Of Transporting Rate"] || '',
        rate: row["Rate"] || '',
        truckQty: row["Truck Qty"] || '',
        biltyImage: row["Bilty Image"] || '',
        qtyDifferenceStatus: row["Qty Diff Status"] || row["Qty Difference Status"] || '',
        differenceQty: row["Diff Qty"] || row["Difference Qty"] || '',
        weightSlip: row["Weight Slip"] || row["Image Of Weight Slip"] || '',
        totalFreight: row["Total Freight"] || '',
        status: row.Status6 || '',
        remarks: row.Remarks6 || '',
        currentStage: 'BILL_ENTRY',
        supabaseId: row.id, // Store the actual Supabase ID for updates
        indentNumber: row["Indent Number"] || row["Indent No"] || '',
        firmName: row["Firm Name"] || '',
        vendorName: row["Vendor Name"] || '',
        driverNo: row["Driver No"] || row["Driver No."] || '',
        liftingQty: row["Lifting Qty"] || '',
        dateOfReceiving: row["Date Of Receiving"] || '',
        actualQuantity: row["Actual Quantity"] || '',
        physicalCondition: row["Physical Condition"] || '',
        moisture: row["Moisture"] || '',
        weightSlipQty: row["Weight Slip Qty"] || ''
      }));

      // Filter out submitted rows
      const filteredData = formattedData.filter(item => {
        const submittedKey = `BILL_ENTRY_${item.id}`;
        return !submittedRows.has(submittedKey);
      });

      setBillEntryMismatchData(filteredData);

    } catch (err) {
      console.error('Error fetching bill entry data from Supabase:', err);
      // Don't set error state here, just log it
    } finally {
      setLoadingBillEntry(false);
    }
  };

  // Fetch Rectify data from Supabase Mismatch table where Planned3 is not null AND Actual3 is null
  const fetchRectifyDataFromSupabase = async () => {
    setLoadingRectify(true);
    try {
      const { data, error } = await supabase
        .from("Mismatch")
        .select("*")
        .not("Planned3", "is", null)
        .is("Actual3", null)
        .order("Timestamp", { ascending: false });

      if (error) throw error;

      // Map Supabase data to match the expected format - include all columns
      const formattedData = (data || []).map((row, index) => ({
        id: `mismatch_rectify_${row.id || index}`,
        timestamp: formatDate(row.Timestamp) || '',
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
        biltyNo: row["Bilty No."] || row["Bilty No"] || '',
        typeOfRate: row["Type Of Rate"] || row["Type Of Transporting Rate"] || '',
        rate: row["Rate"] || '',
        truckQty: row["Truck Qty"] || '',
        biltyImage: row["Bilty Image"] || '',
        qtyDifferenceStatus: row["Qty Diff Status"] || row["Qty Difference Status"] || '',
        differenceQty: row["Diff Qty"] || row["Difference Qty"] || '',
        weightSlip: row["Weight Slip"] || row["Image Of Weight Slip"] || '',
        totalFreight: row["Total Freight"] || '',
        status: row.Status3 || '',
        remarks: row.Remarks3 || '',
        currentStage: 'RECTIFY',
        supabaseId: row.id, // Store the actual Supabase ID for updates
        indentNumber: row["Indent Number"] || row["Indent No"] || '',
        firmName: row["Firm Name"] || '',
        vendorName: row["Vendor Name"] || '',
        driverNo: row["Driver No"] || row["Driver No."] || '',
        liftingQty: row["Lifting Qty"] || '',
        dateOfReceiving: row["Date Of Receiving"] || '',
        actualQuantity: row["Actual Quantity"] || '',
        physicalCondition: row["Physical Condition"] || '',
        moisture: row["Moisture"] || '',
        weightSlipQty: row["Weight Slip Qty"] || ''
      }));

      // Filter out submitted rows
      const filteredData = formattedData.filter(item => {
        const submittedKey = `RECTIFY_${item.id}`;
        return !submittedRows.has(submittedKey);
      });

      setRectifyMismatchData(filteredData);

    } catch (err) {
      console.error('Error fetching rectify data from Supabase:', err);
      // Don't set error state here, just log it
    } finally {
      setLoadingRectify(false);
    }
  };

  // Fetch Re-Audit data from Supabase Mismatch table where Planned5 is not null AND Actual5 is null
  const fetchReAuditDataFromSupabase = async () => {
    setLoadingReAudit(true);
    try {
      const { data, error } = await supabase
        .from("Mismatch")
        .select("*")
        .not("Planned5", "is", null)
        .is("Actual5", null)
        .order("Timestamp", { ascending: false });

      if (error) throw error;

      // Map Supabase data to match the expected format - include all columns
      const formattedData = (data || []).map((row, index) => ({
        id: `mismatch_reaudit_${row.id || index}`,
        timestamp: formatDate(row.Timestamp) || '',
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
        biltyNo: row["Bilty No."] || row["Bilty No"] || '',
        typeOfRate: row["Type Of Rate"] || row["Type Of Transporting Rate"] || '',
        rate: row["Rate"] || '',
        truckQty: row["Truck Qty"] || '',
        biltyImage: row["Bilty Image"] || '',
        qtyDifferenceStatus: row["Qty Diff Status"] || row["Qty Difference Status"] || '',
        differenceQty: row["Diff Qty"] || row["Difference Qty"] || '',
        weightSlip: row["Weight Slip"] || row["Image Of Weight Slip"] || '',
        totalFreight: row["Total Freight"] || '',
        status: row.Status5 || '',
        remarks: row.Remarks5 || '',
        currentStage: 'RE_AUDIT',
        supabaseId: row.id, // Store the actual Supabase ID for updates
        indentNumber: row["Indent Number"] || row["Indent No"] || '',
        firmName: row["Firm Name"] || '',
        vendorName: row["Vendor Name"] || '',
        driverNo: row["Driver No"] || row["Driver No."] || '',
        liftingQty: row["Lifting Qty"] || '',
        dateOfReceiving: row["Date Of Receiving"] || '',
        actualQuantity: row["Actual Quantity"] || '',
        physicalCondition: row["Physical Condition"] || '',
        moisture: row["Moisture"] || '',
        weightSlipQty: row["Weight Slip Qty"] || ''
      }));

      // Filter out submitted rows
      const filteredData = formattedData.filter(item => {
        const submittedKey = `RE_AUDIT_${item.id}`;
        return !submittedRows.has(submittedKey);
      });

      setReAuditMismatchData(filteredData);

    } catch (err) {
      console.error('Error fetching re-audit data from Supabase:', err);
      // Don't set error state here, just log it
    } finally {
      setLoadingReAudit(false);
    }
  };

  // Fetch ALL data from Supabase Mismatch table (no filtering)
  const fetchAllDataFromSupabase = async () => {
    setLoadingAll(true);
    try {
      const { data, error } = await supabase
        .from("Mismatch")
        .select("*")
        .order("Timestamp", { ascending: false });

      if (error) throw error;

      // Determine the current stage for each row based on Planned/Actual logic
      // Check ALL stages and return ANY active stage (Planned set, Actual not set)
      const determineCurrentStage = (row) => {
        // Check all stages - return any that has Planned set but Actual not set
        // This ensures data shows up in ALL tab regardless of workflow order
        const activeStages = [];
        if (row.Planned2 && !row.Actual2) activeStages.push('AUDIT');
        if (row.Planned3 && !row.Actual3) activeStages.push('RECTIFY');
        if (row.Planned4 && !row.Actual4) activeStages.push('TALLY_ENTRY');
        if (row.Planned5 && !row.Actual5) activeStages.push('REAUDIT');
        if (row.Planned6 && !row.Actual6) activeStages.push('BILL_ENTRY');

        // Return the first active stage found, or COMPLETED if none
        return activeStages.length > 0 ? activeStages[0] : 'COMPLETED';
      };

      // Map Supabase data to match the expected format - include all columns
      const formattedData = (data || []).map((row, index) => {
        const currentStage = determineCurrentStage(row);
        return {
          id: `mismatch_all_${row.id || index}`,
          timestamp: formatDate(row.Timestamp) || '',
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
          biltyNo: row["Bilty No."] || row["Bilty No"] || '',
          typeOfRate: row["Type Of Rate"] || row["Type Of Transporting Rate"] || '',
          rate: row["Rate"] || '',
          truckQty: row["Truck Qty"] || '',
          biltyImage: row["Bilty Image"] || '',
          qtyDifferenceStatus: row["Qty Diff Status"] || row["Qty Difference Status"] || '',
          differenceQty: row["Diff Qty"] || row["Difference Qty"] || '',
          weightSlip: row["Weight Slip"] || row["Image Of Weight Slip"] || '',
          totalFreight: row["Total Freight"] || '',
          status: row[`Status${currentStage === 'AUDIT' ? '2' : currentStage === 'RECTIFY' ? '3' : currentStage === 'TALLY_ENTRY' ? '4' : currentStage === 'REAUDIT' ? '5' : '6'}`] || '',
          remarks: row[`Remarks${currentStage === 'AUDIT' ? '2' : currentStage === 'RECTIFY' ? '3' : currentStage === 'TALLY_ENTRY' ? '4' : currentStage === 'REAUDIT' ? '5' : '6'}`] || '',
          currentStage: currentStage,
          supabaseId: row.id, // Store the actual Supabase ID for updates
          indentNumber: row["Indent Number"] || row["Indent No"] || '',
          firmName: row["Firm Name"] || '',
          vendorName: row["Vendor Name"] || '',
          driverNo: row["Driver No"] || row["Driver No."] || '',
          liftingQty: row["Lifting Qty"] || '',
          dateOfReceiving: row["Date Of Receiving"] || '',
          actualQuantity: row["Actual Quantity"] || '',
          physicalCondition: row["Physical Condition"] || '',
          moisture: row["Moisture"] || '',
          weightSlipQty: row["Weight Slip Qty"] || ''
        };
      });

      // Filter out COMPLETED rows and submitted rows
      const filteredData = formattedData.filter(item => {
        if (item.currentStage === 'COMPLETED') return false;
        const submittedKey = `ALL_${item.id}`;
        return !submittedRows.has(submittedKey);
      });

      setAllMismatchData(filteredData);

    } catch (err) {
      console.error('Error fetching all data from Supabase:', err);
      // Don't set error state here, just log it
    } finally {
      setLoadingAll(false);
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
  }, [submittedRows]);

  const toggleColumnVisibility = (columnKey) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  };

  const toggleColumnFilter = () => {
    setShowColumnFilter(prev => !prev);
  };

  const renderModal = () => {
    if (!editingRow) return null;

    // Check all Supabase data sources and accountsData
    let row = auditMismatchData.find(r => r.id === editingRow);
    if (!row) {
      row = tallyEntryMismatchData.find(r => r.id === editingRow);
    }
    if (!row) {
      row = billEntryMismatchData.find(r => r.id === editingRow);
    }
    if (!row) {
      row = rectifyMismatchData.find(r => r.id === editingRow);
    }
    if (!row) {
      row = reAuditMismatchData.find(r => r.id === editingRow);
    }
    if (!row) {
      row = allMismatchData.find(r => r.id === editingRow);
    }
    if (!row) {
      row = accountsData.find(r => r.id === editingRow);
    }
    if (!row) return null;

    const stageInfo = STAGES[row.currentStage] || {
      name: row.currentStage || 'Unknown',
      color: 'bg-gray-100 text-gray-800',
      icon: AlertCircle
    };
    const StageIcon = stageInfo.icon;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <h3 className="text-xl font-semibold text-gray-900">Add Entry</h3>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${stageInfo.color}`}>
                  <StageIcon className="w-4 h-4 mr-1" />
                  {stageInfo.name}
                </span>
              </div>
              <button
                onClick={() => setEditingRow(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2">Lift Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-600">Lift Number:</span> {row.liftNumber}</div>
                <div><span className="text-gray-600">Timestamp:</span> {row.timestamp}</div>
                <div><span className="text-gray-600">Party:</span> {row.partyName}</div>
                <div><span className="text-gray-600">Product:</span> {row.productName}</div>
                <div><span className="text-gray-600">Current Stage:</span> <span className={`font-medium ${stageInfo.color.split(' ')[1]}`}>{stageInfo.name}</span></div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={formData.status || 'Not Done'}
                  onChange={(e) => handleFormChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                >
                  <option value="Done">Done</option>
                  <option value="Not Done">Not Done</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                <textarea
                  value={formData.remarks || ''}
                  onChange={(e) => handleFormChange('remarks', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                  placeholder="Enter your remarks..."
                  rows={4}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-gray-200">
              <button
                onClick={() => setEditingRow(null)}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={submitFormData}
                disabled={submitting || (['RECTIFY', 'TALLY_ENTRY', 'REAUDIT', 'BILL_ENTRY'].includes(row.currentStage) && formData.status !== 'Done')}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {submitting ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {submitting ? 'Submitting...' : 'Submit Entry'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Filter data based on active tab
  // For ALL tab, combine data from all individual tabs to ensure consistency
  const getAllStagesData = () => {
    // Combine all individual tab data - this ensures whatever shows in individual tabs also shows in All Stages
    const combinedData = [
      ...auditMismatchData,
      ...rectifyMismatchData,
      ...tallyEntryMismatchData,
      ...reAuditMismatchData,
      ...billEntryMismatchData
    ];

    // Remove duplicates based on supabaseId (in case same record appears in multiple stages)
    const uniqueData = combinedData.reduce((acc, current) => {
      const exists = acc.find(item => item.supabaseId === current.supabaseId);
      if (!exists) {
        acc.push(current);
      }
      return acc;
    }, []);

    return uniqueData;
  };

  const filteredData = activeTab === 'ALL'
    ? getAllStagesData()  // Combine all individual tab data for ALL tab
    : activeTab === 'AUDIT'
      ? auditMismatchData  // Use Supabase data for AUDIT tab
      : activeTab === 'TALLY_ENTRY'
        ? tallyEntryMismatchData  // Use Supabase data for TALLY_ENTRY tab
        : activeTab === 'BILL_ENTRY'
          ? billEntryMismatchData  // Use Supabase data for BILL_ENTRY tab
          : activeTab === 'RECTIFY'
            ? rectifyMismatchData  // Use Supabase data for RECTIFY tab
            : activeTab === 'REAUDIT'
              ? reAuditMismatchData  // Use Supabase data for RE_AUDIT tab
              : accountsData.filter(row => row.currentStage === activeTab);

  // Calculate counts for each tab
  const getStageCount = (stage) => {
    if (stage === 'ALL') return getAllStagesData().length; // Use combined data count for ALL
    if (stage === 'AUDIT') return auditMismatchData.length; // Use Supabase count for AUDIT
    if (stage === 'TALLY_ENTRY') return tallyEntryMismatchData.length; // Use Supabase count for TALLY_ENTRY
    if (stage === 'BILL_ENTRY') return billEntryMismatchData.length; // Use Supabase count for BILL_ENTRY
    if (stage === 'RECTIFY') return rectifyMismatchData.length; // Use Supabase count for RECTIFY
    if (stage === 'REAUDIT') return reAuditMismatchData.length; // Use Supabase count for RE_AUDIT
    return accountsData.filter(row => row.currentStage === stage).length;
  };

  if (loading || (activeTab === 'ALL' && (loadingAudit || loadingRectify || loadingTallyEntry || loadingReAudit || loadingBillEntry)) || (activeTab === 'AUDIT' && loadingAudit) || (activeTab === 'TALLY_ENTRY' && loadingTallyEntry) || (activeTab === 'BILL_ENTRY' && loadingBillEntry) || (activeTab === 'RECTIFY' && loadingRectify) || (activeTab === 'REAUDIT' && loadingReAudit)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-xl text-gray-600">Loading call tracker data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      {renderModal()}

      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Call Tracker</h1>
                <p className="text-sm text-gray-600 mt-1">Track all stages of account processing</p>
              </div>
              <div className="flex items-center space-x-3">
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
                        className="fixed inset-0 z-10"
                        onClick={() => setShowColumnFilter(false)}
                      ></div>

                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-20 max-h-80 overflow-y-auto">
                        <div className="p-4">
                          <h3 className="text-sm font-medium text-gray-700 mb-3">Show/Hide Columns</h3>
                          <div className="grid grid-cols-1 gap-2">
                            {Object.entries({
                              stage: 'Stage',
                              timestamp: 'Timestamp',
                              liftNumber: 'Lift Number',
                              type: 'Type',
                              billNo: 'Bill No.',
                              partyName: 'Party Name',
                              productName: 'Product Name',
                              qty: 'Qty',
                              areaLifting: 'Area Lifting',
                              truckNo: 'Truck No.',
                              transporterName: 'Transporter',
                              billImage: 'Bill Image',
                              biltyNo: 'Bilty No.',
                              typeOfRate: 'Type Of Rate',
                              rate: 'Rate',
                              truckQty: 'Truck Qty',
                              biltyImage: 'Bilty Image',
                              qtyDifferenceStatus: 'Qty Diff Status',
                              differenceQty: 'Diff Qty',
                              weightSlip: 'Weight Slip',
                              totalFreight: 'Total Freight',
                              status: 'Status',
                              remarks: 'Remarks',
                              actions: 'Actions'
                            }).map(([key, label]) => (
                              <label key={key} className="flex items-center space-x-2 text-sm py-1 hover:bg-gray-50 px-2 rounded cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={visibleColumns[key]}
                                  onChange={() => toggleColumnVisibility(key)}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
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
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center space-x-2">
                    <span>All Stages</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === 'ALL' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
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
              </nav>
            </div>
          </div>

          {/* Stage Description */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            {activeTab !== 'ALL' && (
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
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {visibleColumns.actions && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
                  {visibleColumns.stage && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>}
                  {visibleColumns.timestamp && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>}
                  {visibleColumns.liftNumber && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lift Number</th>}
                  {visibleColumns.type && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>}
                  {visibleColumns.billNo && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill No.</th>}
                  {visibleColumns.partyName && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party Name</th>}
                  {visibleColumns.productName && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>}
                  {visibleColumns.qty && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>}
                  {visibleColumns.areaLifting && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area Lifting</th>}
                  {visibleColumns.truckNo && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Truck No.</th>}
                  {visibleColumns.transporterName && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transporter</th>}
                  {visibleColumns.billImage && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill Image</th>}
                  {visibleColumns.biltyNo && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bilty No.</th>}
                  {visibleColumns.typeOfRate && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type Of Rate</th>}
                  {visibleColumns.rate && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>}
                  {visibleColumns.truckQty && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Truck Qty</th>}
                  {visibleColumns.biltyImage && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bilty Image</th>}
                  {visibleColumns.qtyDifferenceStatus && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty Diff Status</th>}
                  {visibleColumns.differenceQty && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diff Qty</th>}
                  {visibleColumns.weightSlip && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight Slip</th>}
                  {visibleColumns.totalFreight && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Freight</th>}
                  {visibleColumns.status && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>}
                  {visibleColumns.remarks && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <p className="text-lg font-medium mb-2">No records available</p>
                        <p className="text-sm">
                          {activeTab === 'ALL'
                            ? 'All entries have been processed or no data is available.'
                            : `No entries in ${STAGES[activeTab]?.name} stage.`}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row, index) => {
                    const stageInfo = STAGES[row.currentStage] || {
                      name: row.currentStage || 'Unknown',
                      color: 'bg-gray-100 text-gray-800',
                      icon: AlertCircle
                    };
                    const StageIcon = stageInfo.icon;
                    return (
                      <tr key={row.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {visibleColumns.actions && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => {
                                setEditingRow(row.id);
                                initializeFormData(row.currentStage);
                              }}
                              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              Add Entry
                            </button>
                          </td>
                        )}
                        {visibleColumns.stage && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${stageInfo.color}`}>
                              <StageIcon className="w-3 h-3 mr-1" />
                              {stageInfo.name}
                            </span>
                          </td>
                        )}
                        {visibleColumns.timestamp && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.timestamp || '-'}</td>}
                        {visibleColumns.liftNumber && <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.liftNumber || '-'}</td>}
                        {visibleColumns.type && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.type || '-'}</td>}
                        {visibleColumns.billNo && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.billNo || '-'}</td>}
                        {visibleColumns.partyName && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.partyName || '-'}</td>}
                        {visibleColumns.productName && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.productName || '-'}</td>}
                        {visibleColumns.qty && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.qty || '-'}</td>}
                        {visibleColumns.areaLifting && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.areaLifting || '-'}</td>}
                        {visibleColumns.truckNo && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.truckNo || '-'}</td>}
                        {visibleColumns.transporterName && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.transporterName || '-'}</td>}
                        {visibleColumns.billImage && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.billImage ? (<a href={row.billImage} target='_blank' rel='noopener noreferrer'><Image size={20} /></a>) : ("-")}</td>}
                        {visibleColumns.biltyNo && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.biltyNo || '-'}</td>}
                        {visibleColumns.typeOfRate && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.typeOfRate || '-'}</td>}
                        {visibleColumns.rate && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.rate || '-'}</td>}
                        {visibleColumns.truckQty && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.truckQty || '-'}</td>}
                        {visibleColumns.biltyImage && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.biltyImage ? (<a href={row.biltyImage} target='_blank' rel='noopener noreferrer'><Image size={20} /></a>) : ("-")}</td>}
                        {visibleColumns.qtyDifferenceStatus && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.qtyDifferenceStatus || '-'}</td>}
                        {visibleColumns.differenceQty && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.differenceQty || '-'}</td>}
                        {visibleColumns.weightSlip && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.weightSlip ? (<a href={row.weightSlip} target='_blank' rel='noopener noreferrer'><Image size={20} /></a>) : ("-")}</td>}
                        {visibleColumns.totalFreight && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.totalFreight || '-'}</td>}
                        {visibleColumns.status && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.status || '-'}</td>}
                        {visibleColumns.remarks && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.remarks || '-'}</td>}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallTrackerPage;