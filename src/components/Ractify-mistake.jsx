import React, { useState, useEffect, useContext } from 'react';
import { RefreshCw, Save, X, Edit2, Image, Filter } from 'lucide-react';
import { supabase } from '../supabase';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'sonner';

const RectifyMistakeBiltyPage = () => {
  const { user } = useContext(AuthContext);
  const [accountsData, setAccountsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedRows, setSubmittedRows] = useState(new Set());
  const [visibleColumns, setVisibleColumns] = useState({
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

  // Helper date formatter
  const formatDate = (dateString) => {
    if (!dateString || dateString === '') return '-';
    try {
      // If it's already a formatted date string, return it (basic check)
      if (dateString.includes('/') && dateString.includes(':')) return dateString;

      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

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

  const initializeFormData = (rowId) => {
    setFormData({
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

    const row = accountsData.find(r => r.id === editingRow);
    if (!row) return;

    setSubmitting(true);
    try {
      const currentDate = new Date();
      // Format as YYYY-MM-DD HH:mm:ss for Supabase
      const actualDateTime = ((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`)(currentDate);

      // Update Mismatch table
      const { error: updateError } = await supabase
        .from("Mismatch")
        .update({
          Actual3: actualDateTime,
          Status3: formData.status || 'Done',
          Remarks3: formData.remarks || ''
        })
        .eq("id", row.supabaseId); // Use actual supabase ID

      if (updateError) throw updateError;

      setSubmittedRows(prev => new Set([...prev, row.id]));
      setEditingRow(null);

      const displayDate = currentDate.toLocaleString("en-GB", { hour12: false });
      toast.success("Entry Submitted", {
        description: `Lift ${row.liftNumber} updated successfully at ${displayDate}`,
      });

      setTimeout(() => {
        fetchData();
      }, 1000);

    } catch (error) {
      console.error('Submission error:', error);
      toast.error("Submission Failed", { description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("Mismatch")
        .select("*")
        .not("Planned3", "is", null) // Rectify Planned
        .is("Actual3", null) // Rectify Actual is null
        .order("Timestamp", { ascending: false });

      if (error) throw error;

      let parsedData = (data || []).map((row, index) => ({
        id: index, // UI Index
        supabaseId: row.id,
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
        firmName: row["Firm Name"] || ''
      }));

      // Filter by Firm Name
      if (user?.firmName && user.firmName.toLowerCase() !== "all") {
        const userFirmNameLower = user.firmName.toLowerCase();
        parsedData = parsedData.filter(
          (entry) => entry.firmName && String(entry.firmName).toLowerCase().trim() === userFirmNameLower
        );
      }

      // Filter out submitted locally
      parsedData = parsedData.filter(item => !submittedRows.has(item.id));

      setAccountsData(parsedData);

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

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
    if (editingRow === null) return null;

    const row = accountsData.find(r => r.id === editingRow);
    if (!row) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Add Entry</h3>
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-xl text-gray-600">Loading data...</p>
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
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Rectify The Mistake & Bilty Add</h1>
                <p className="text-sm text-gray-600 mt-1">Manage and update billing corrections</p>
                {user?.firmName && user.firmName.toLowerCase() !== "all" && (
                  <span className="text-sm text-purple-600 font-medium">Filtered by: {user.firmName}</span>
                )}
              </div>
              <div className="flex items-center space-x-3">
                {/* Column Filter Dropdown */}
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
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowColumnFilter(false)}
                      ></div>

                      {/* Dropdown */}
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-20 max-h-80 overflow-y-auto">
                        <div className="p-4">
                          <h3 className="text-sm font-medium text-gray-700 mb-3">Show/Hide Columns</h3>
                          <div className="grid grid-cols-1 gap-2">
                            {Object.entries({
                              timestamp: 'Timestamp',
                              liftNumber: 'Lift Number',
                              type: 'Type',
                              billNo: 'Bill No.',
                              partyName: 'Party Name',
                              productName: 'Product Name',
                              qty: 'Quantity',
                              areaLifting: 'Area Lifting',
                              truckNo: 'Truck No',
                              transporterName: 'Transporter Name',
                              billImage: 'Bill Image',
                              biltyNo: 'Bilty No',
                              typeOfRate: 'Type of Rate',
                              rate: 'Rate',
                              truckQty: 'Total Truck Billing Quantity',
                              biltyImage: 'Bilty Image',
                              qtyDifferenceStatus: 'Qty Difference Status',
                              differenceQty: 'Difference Quantity',
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

          <div className="px-6 py-3">
            <p className="text-sm text-gray-500">
              Showing {accountsData.length} records available for processing
            </p>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {visibleColumns.actions && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
                  {visibleColumns.timestamp && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>}
                  {visibleColumns.liftNumber && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lift Number</th>}
                  {visibleColumns.type && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>}
                  {visibleColumns.billNo && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill No.</th>}
                  {visibleColumns.partyName && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party Name</th>}
                  {visibleColumns.productName && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>}
                  {visibleColumns.qty && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>}
                  {visibleColumns.areaLifting && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area Lifting</th>}
                  {visibleColumns.truckNo && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Truck No</th>}
                  {visibleColumns.transporterName && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transporter Name</th>}
                  {visibleColumns.billImage && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill Image</th>}
                  {visibleColumns.biltyNo && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bilty No</th>}
                  {visibleColumns.typeOfRate && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type of Rate</th>}
                  {visibleColumns.rate && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>}
                  {visibleColumns.truckQty && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Truck Billing Quantity</th>}
                  {visibleColumns.biltyImage && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bilty Image</th>}
                  {visibleColumns.qtyDifferenceStatus && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty Difference Status</th>}
                  {visibleColumns.differenceQty && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difference Quantity</th>}
                  {visibleColumns.weightSlip && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight Slip</th>}
                  {visibleColumns.totalFreight && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Freight</th>}
                  {visibleColumns.status && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>}
                  {visibleColumns.remarks && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {accountsData.length === 0 ? (
                  <tr>
                    <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <p className="text-lg font-medium mb-2">No records available</p>
                        <p className="text-sm">All entries have been processed or no data is available.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  accountsData.map((row, index) => (
                    <tr key={row.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {visibleColumns.actions && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setEditingRow(row.id);
                              initializeFormData(row.id);
                            }}
                            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md"
                          >
                            <Edit2 className="w-4 h-4 mr-2" />
                            Add Entry
                          </button>
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
                      {visibleColumns.billImage && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.billImage ? (<a href={row.billImage} target='_blank' rel='noopener norefferer'><Image size={20} /></a>) : ("-")}</td>}
                      {visibleColumns.biltyNo && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.biltyNo || '-'}</td>}
                      {visibleColumns.typeOfRate && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.typeOfRate || '-'}</td>}
                      {visibleColumns.rate && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.rate || '-'}</td>}
                      {visibleColumns.truckQty && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.truckQty || '-'}</td>}
                      {visibleColumns.biltyImage && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.biltyImage ? (<a href={row.biltyImage} target='_blank' rel='noopener norefferer'><Image size={20} /></a>) : ("-")}</td>}
                      {visibleColumns.qtyDifferenceStatus && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.qtyDifferenceStatus || '-'}</td>}
                      {visibleColumns.differenceQty && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.differenceQty || '-'}</td>}
                      {visibleColumns.weightSlip && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.weightSlip ? (<a href={row.weightSlip} target='_blank' rel='noopener norefferer'><Image size={20} /></a>) : ("-")}</td>}
                      {visibleColumns.totalFreight && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.totalFreight || '-'}</td>}
                      {visibleColumns.status && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.status || '-'}</td>}
                      {visibleColumns.remarks && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.remarks || '-'}</td>}

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RectifyMistakeBiltyPage;