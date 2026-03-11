import React, { useState, useEffect, useCallback, useContext } from 'react';
import { RefreshCw, Save, X, Edit2, Filter, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../supabase';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'sonner';

// Define all columns based on schemas provided
const COLUMN_DEFINITIONS = [
  { key: 'timestamp', label: 'Timestamp' },
  { key: 'planned2', label: 'Planned Date' },
  { key: 'liftId', label: 'Lift ID' },
  { key: 'indentNumber', label: 'Indent Number' },
  { key: 'firmName', label: 'Firm Name' },
  { key: 'partyName', label: 'Party Name' },
  { key: 'productName', label: 'Product Name' },
  { key: 'transporterName', label: 'Transporter Name' },
  { key: 'status', label: 'Status' },
  { key: 'remarks', label: 'Remarks' },

  // Extended Columns from Mismatch Schema
  { key: 'liftNumber', label: 'Lift Number' },
  { key: 'type', label: 'Type' },
  { key: 'billNo', label: 'Bill No.' },
  { key: 'qty', label: 'Qty' },
  { key: 'areaLifting', label: 'Area Lifting' },
  { key: 'truckNo', label: 'Truck No.' },
  { key: 'rateType', label: 'Rate Type' },
  { key: 'rate', label: 'Rate' },
  { key: 'truckQty', label: 'Truck Qty' },
  { key: 'biltyNo', label: 'Bilty No.' },
  { key: 'qtyDiffStatus', label: 'Qty Diff Status' },
  { key: 'diffQty', label: 'Diff Qty' },
  { key: 'totalFreight', label: 'Total Freight' },
  { key: 'rateDifference', label: 'Rate Diff' },
  { key: 'aluminaDifference', label: 'Alumina Diff' },
  { key: 'ironDifference', label: 'Iron Diff' },
  { key: 'quantityDifference', label: 'Qty Diff' },

  // Columns from LIFT-ACCOUNTS (that might be in Mismatch or relevant)
  { key: 'vendorName', label: 'Vendor Name' },
  { key: 'rawMaterialName', label: 'Raw Material Name' },
  { key: 'physicalCondition', label: 'Physical Condition' },
  { key: 'moisture', label: 'Moisture' },
  { key: 'dateOfReceiving', label: 'Date Of Receiving' },

  // Image Links (display as text/link)
  { key: 'billImage', label: 'Bill Image' },
  { key: 'biltyImage', label: 'Bilty Image' },
  { key: 'weightSlip', label: 'Weight Slip' },

  { key: 'actions', label: 'Actions' }
];

const AccountsAudit = () => {
  const { user } = useContext(AuthContext);
  const [auditData, setAuditData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedRows, setSubmittedRows] = useState(new Set());

  // Initialize with all columns visible by default
  const [visibleColumns, setVisibleColumns] = useState(() =>
    COLUMN_DEFINITIONS.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  );

  const [showColumnFilter, setShowColumnFilter] = useState(false);

  const columns = COLUMN_DEFINITIONS;

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString || dateString === '') return '-';

    try {
      const date = new Date(dateString);
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

  // Initialize form data
  const initializeFormData = () => {
    setFormData({
      status: 'Done',
      remarks: ''
    });
  };

  // Handle form changes
  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Fetch data from Supabase
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch Mismatch Data (Pending Items)
      const { data: mismatchData, error: fetchError } = await supabase
        .from("Mismatch")
        .select("*")
        .not("Planned2", "is", null)
        .is("Actual2", null)
        .order("Timestamp", { ascending: false });

      if (fetchError) throw fetchError;

      if (!mismatchData || mismatchData.length === 0) {
        setAuditData([]);
        setLoading(false);
        return;
      }

      // 2. Fetch LIFT-ACCOUNTS Data (Manual Join)
      // Extract Lift IDs to query LIFT-ACCOUNTS (Robust extraction)
      const liftIds = [...new Set(mismatchData
        .map(item => {
          const val = item["Lift ID"] || item["Lift Number"];
          return val ? String(val).trim() : null;
        })
        .filter(id => id))]; // Remove null/empty

      let liftAccountsMap = {};

      if (liftIds.length > 0) {
        // Fetch matching records
        const { data: liftData, error: liftError } = await supabase
          .from("LIFT-ACCOUNTS")
          .select("*")
          .in("Lift No", liftIds);

        if (liftError) {
          console.error("Error fetching LIFT-ACCOUNTS:", liftError);
          // We continue, just without extra data
        } else {
          // Create lookup map: Lift No -> Record (normalized key)
          (liftData || []).forEach(record => {
            const key = record["Lift No"] ? String(record["Lift No"]).trim() : null;
            if (key) {
              liftAccountsMap[key] = record;
            }
          });
        }
      }

      // 3. Merge Data
      const formattedData = mismatchData.map((row, index) => {
        // Find match using normalized key
        const rawLiftId = row["Lift ID"] || row["Lift Number"];
        const liftId = rawLiftId ? String(rawLiftId).trim() : '';
        const liftRecord = liftAccountsMap[liftId] || {}; // Linked record or empty

        return {
          id: row.id || index,

          // --- Mismatch Table Columns ---
          timestamp: row.Timestamp || '',
          liftId: liftId || '',
          indentNumber: row["Indent Number"] || '',
          firmName: row["Firm Name"] || '',
          partyName: row["Party Name"] || '',
          productName: row["Product Name"] || '',
          transporterName: row["Transporter Name"] || '',
          status: row.Status || '',
          remarks: row.Remarks || '',
          planned2: row.Planned2 || '',
          remark: row.Remark || '',

          // Mismatch specific extended
          liftNumber: row["Lift Number"] || '',
          type: liftRecord["Type"] || row["Type"] || '',
          billNo: row["Bill No."] || '',
          qty: row["Qty"] || '',
          areaLifting: row["Area Lifting"] || '',
          truckNo: row["Truck No."] || '',
          rateType: row["Type Of Rate"] || '',
          rate: row["Rate"] || '',
          truckQty: row["Truck Qty"] || '',
          biltyNo: row["Bilty No."] || '',
          qtyDiffStatus: row["Qty Diff Status"] || '',
          diffQty: row["Diff Qty"] || '',
          totalFreight: row["Total Freight"] || '',
          rateDifference: row["Rate Difference"] || '',
          aluminaDifference: row["Alumina Difference"] || '',
          ironDifference: row["Iron Difference"] || '',
          quantityDifference: row["Quantity Difference"] || '',

          // --- LIFT-ACCOUNTS Table Columns (Merged) ---
          // Use LIFT-ACCOUNTS value if Mismatch value is missing, or specifically requests it
          vendorName: liftRecord["Vendor Name"] || '',
          rawMaterialName: liftRecord["Raw Material Name"] || '',
          physicalCondition: liftRecord["Physical Condition"] || '',
          moisture: liftRecord["Moisture"] || '',
          dateOfReceiving: liftRecord["Date Of Receiving"] || '',
          driverNo: liftRecord["Driver No."] || '', // Specific to LIFT-ACCOUNTS
          leadTime: liftRecord["Lead Time To Reach Factory (days)"] || '',

          // Image Links (Prioritize LIFT-ACCOUNTS if richer)
          billImage: row["Bill Image"] || liftRecord["Bill Image"] || '',
          biltyImage: row["Bilty Image"] || liftRecord["Bilty Image"] || '',
          weightSlip: row["Weight Slip"] || liftRecord["Image Of Weight Slip"] || '',
          physicalImage: liftRecord["Physical Image Of Product"] || '',

          // Fallbacks/Overlaps (e.g. if Mismatch has empty Truck No, check LIFT-ACCOUNTS)
          truckNo: row["Truck No."] || liftRecord["Truck No."] || '',
          transporterName: row["Transporter Name"] || liftRecord["Transporter Name"] || ''
        };
      });

      // Filter out submitted rows
      let filteredData = formattedData.filter(item => {
        const submittedKey = `audit_${item.id}`;
        return !submittedRows.has(submittedKey);
      });

      // Show only Independent type lifts
      filteredData = filteredData.filter((item) => String(item.type || "").toLowerCase() === "independent");

      // Filter by Firm Name
      if (user?.firmName && user.firmName.toLowerCase() !== "all") {
        const userFirmNameLower = user.firmName.toLowerCase();
        filteredData = filteredData.filter(
          (item) => item.firmName && String(item.firmName).toLowerCase().trim() === userFirmNameLower
        );
      }

      setAuditData(filteredData);

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
      toast.error(`Failed to load data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [submittedRows]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Submit form data
  const submitFormData = async () => {
    if (!editingRow) return;

    const row = auditData.find(r => r.id === editingRow);
    if (!row) {
      toast.error('Error: Could not find record');
      return;
    }

    setSubmitting(true);

    try {
      const currentDate = new Date();
      const actualDateTime = currentDate.toLocaleString("en-GB", { hour12: false }).replace(",", "");

      // Update the Actual2 column in Supabase
      const { data: updateData, error: updateError } = await supabase
        .from("Mismatch")
        .update({
          Actual2: actualDateTime,
          Status: formData.status || 'Done',
          Remarks: formData.remarks || ''
        })
        .eq("id", row.id)
        .select();

      if (updateError) throw updateError;

      // Mark as submitted
      setSubmittedRows(prev => new Set([...prev, `audit_${editingRow}`]));
      setEditingRow(null);

      const formattedDateTime = currentDate.toLocaleString("en-GB", { hour12: false }).replace(",", "");
      toast.success(`✅ SUCCESS: Audit entry submitted for Lift ID: ${row.liftId}\nActual Date: ${formattedDateTime}`);

      // Refresh data
      setTimeout(() => {
        fetchData();
      }, 1000);

    } catch (error) {
      console.error('Submission error:', error);
      toast.error(`❌ SUBMISSION FAILED: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle column visibility
  const toggleColumnVisibility = (columnKey) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  };

  // Render modal
  const renderModal = () => {
    if (!editingRow) return null;

    const row = auditData.find(r => r.id === editingRow);
    if (!row) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
        <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <h3 className="text-xl font-semibold text-gray-900">Add Audit Entry</h3>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Audit
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
              <h4 className="font-medium text-gray-700 mb-2">Record Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-600">Lift ID:</span> {row.liftId}</div>
                <div><span className="text-gray-600">Indent Number:</span> {row.indentNumber}</div>
                <div><span className="text-gray-600">Party Name:</span> {row.partyName}</div>
                <div><span className="text-gray-600">Product Name:</span> {row.productName}</div>
                <div><span className="text-gray-600">Firm Name:</span> {row.firmName}</div>
                <div><span className="text-gray-600">Planned Date:</span> {formatDate(row.planned2)}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={formData.status || 'Done'}
                  onChange={(e) => handleFormChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                >
                  <option value="Done">Done</option>
                  <option value="Not Done">Not Done</option>
                  <option value="Pending">Pending</option>
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
                disabled={submitting}
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-xl text-gray-600">Loading audit data...</p>
        </div>
      </div>
    );
  }

  // Error state
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

  // Main render
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      {renderModal()}

      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Accounts Audit</h1>
                <p className="text-sm text-gray-600 mt-1">Review and process pending audit items</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <button
                    onClick={() => setShowColumnFilter(!showColumnFilter)}
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
                            {columns.map(col => (
                              <label key={col.key} className="flex items-center space-x-2 text-sm py-1 hover:bg-gray-50 px-2 rounded cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={visibleColumns[col.key]}
                                  onChange={() => toggleColumnVisibility(col.key)}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                />
                                <span className="text-gray-700">{col.label}</span>
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

          {/* Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {columns.filter(col => visibleColumns[col.key]).map(column => (
                    <th key={column.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {auditData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.filter(col => visibleColumns[col.key]).length} className="px-6 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <AlertCircle className="w-12 h-12 text-gray-400 mb-2" />
                        <p className="text-lg">No pending audit items</p>
                        <p className="text-sm text-gray-400 mt-1">All items have been processed</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  auditData.map((row, index) => (
                    <tr key={row.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {columns.filter(col => visibleColumns[col.key]).map(col => (
                        <td key={`${row.id}-${col.key}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {col.key === 'actions' ? (
                            <button
                              onClick={() => {
                                setEditingRow(row.id);
                                initializeFormData();
                              }}
                              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                            >
                              <Edit2 className="w-4 h-4 mr-1" />
                              Add Entry
                            </button>
                          ) : col.key.toLowerCase().includes('date') || col.key.toLowerCase().includes('timestamp') || col.key.toLowerCase().includes('planned') ? (
                            formatDate(row[col.key])
                          ) : col.key === 'remarks' ? (
                            <div className="max-w-xs truncate" title={row.remarks}>
                              {row.remarks || '-'}
                            </div>
                          ) : (
                            row[col.key] || '-'
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer with count */}
          {auditData.length > 0 && (
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Showing {auditData.length} pending audit {auditData.length === 1 ? 'item' : 'items'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountsAudit;
