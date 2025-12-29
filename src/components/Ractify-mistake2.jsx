import React, { useState, useEffect } from 'react';
import { RefreshCw, Save, X, Edit2, Image, Filter } from 'lucide-react';
const RectifyMistake2Page = () => {
  const [accountsData, setAccountsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingRow, setEditingRow] = useState(null); // Changed from editingRows object
  const [formData, setFormData] = useState({}); // Simplified form data structure
  const [submitting, setSubmitting] = useState(false); // Changed from submitting object
  const [submittedRows, setSubmittedRows] = useState(new Set());
const [showColumnFilter, setShowColumnFilter] = useState(false);
const [columnVisibility, setColumnVisibility] = useState({
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

  const SHEET_ID = "1NUxf4pnQ-CtCFUjA5rqLgYEJiU77wQlwVyimjt8RmFQ";
  const SHEET_NAME = "ACCOUNTS";

  // Updated date format function to handle Date(year,month,day,hour,minute,second) format
  const formatDate = (dateString) => {
    if (!dateString || dateString === '') return '-';
    
    try {
      let date;
      
      // Handle Google Sheets Date(YYYY,MM,DD,HH,MM,SS) format
      const dateMatch = dateString.match(/^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)$/);
      if (dateMatch) {
        const [, year, month, day, hours, minutes, seconds] = dateMatch.map(Number);
        date = new Date(year, month - 1, day, hours || 0, minutes || 0, seconds || 0);
      }
      // Handle Excel serial number format from Google Sheets
      else if (!isNaN(dateString) && parseFloat(dateString) > 30000) {
        const serialNumber = parseFloat(dateString);
        date = new Date((serialNumber - 25569) * 86400 * 1000);
      }
      // Handle regular date formats
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
      
      // Format matching the second code: DD/MM/YYYY HH:MM:SS
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

    const data = formData;
    
    if (!data) {
      alert('No form data to submit');
      return;
    }

    const row = accountsData.find(r => r.id === editingRow);
    if (!row || !row.liftNumber) {
      alert('Error: Could not find lift number for this row');
      return;
    }

    setSubmitting(true);

    try {
      const appsScriptUrl = 'https://script.google.com/macros/s/AKfycbzj9zlZTEhdlmaMt78Qy3kpkz7aOfVKVBRuJkd3wv_UERNrIRCaepSULpNa7W1g-pw/exec';
      
      const currentDate = new Date();
      const actualDateTime = currentDate.toLocaleString("en-GB", { hour12: false }).replace(",", "");
      const delayDays = calculateDelayDays(row.timestamp);
      
      const submitFormData = {
        actual: actualDateTime,
        delay: String(delayDays),
        status: data.status || 'Not Done',
        remarks: data.remarks || ''
      };

      const requestData = {
        action: 'submitForm',
        sheetName: 'ACCOUNTS',
        liftNo: row.liftNumber,
        type: 'rectify-mistake-2',
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

      setSubmittedRows(prev => new Set([...prev, `rectify2_${editingRow}`]));
      setEditingRow(null);
      
      alert(`✅ SUCCESS: Form submitted successfully for Lift Number: ${row.liftNumber}\nActual Date: ${actualDateTime}\nDelay: ${delayDays} days`);
      
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
      
      // Check if Column AE (index 30) has data AND Column AF (index 31) is empty
      const columnAEValue = getCellValue(row, 30); // Column AE (index 30)
      const columnAFValue = getCellValue(row, 31); // Column AF (index 31)
      
      if (!columnAEValue || columnAEValue === '' || columnAFValue && columnAFValue !== '') {
        return null; // Skip rows where Column AE is empty OR Column AF is not empty
      }
      
      // Updated to include all requested columns
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
        status: getCellValue(row, 33) || '', // Column AH (index 33)
        remarks: getCellValue(row, 34) || '' // Column AI (index 34)
      };
      
      const hasData = Object.values(rowData).some(value => 
        value && value !== '' && value !== index
      );
      
      return hasData ? rowData : null;
    }).filter(Boolean);
    
    // Filter out submitted rows
    parsedData = parsedData.filter(item => {
      const submittedKey = `rectify2_${item.id}`;
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

const toggleColumnVisibility = (columnKey) => {
  setColumnVisibility(prev => ({
    ...prev,
    [columnKey]: !prev[columnKey]
  }));
};

const toggleColumnFilter = () => {
  setShowColumnFilter(prev => !prev);
};

  useEffect(() => {
    fetchData();
  }, []);

  const renderModal = () => {
    if (!editingRow) return null;
    
    const row = accountsData.find(r => r.id === editingRow);
    if (!row) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Add Entry - Rectify Mistake 2</h3>
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
        <h1 className="text-2xl font-bold text-gray-900">Rectify The Mistake 2</h1>
        <p className="text-sm text-gray-600 mt-1">Secondary correction and verification process</p>
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
                          checked={columnVisibility[key]}
                          onChange={() => toggleColumnVisibility(key)}
                          className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
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
      Showing {accountsData.length} records available for secondary rectification
    </p>
  </div>
</div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead className="bg-gray-50 border-b border-gray-200">
  <tr>
    {columnVisibility.timestamp && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>}
    {columnVisibility.liftNumber && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lift Number</th>}
    {columnVisibility.type && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>}
    {columnVisibility.billNo && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill No.</th>}
    {columnVisibility.partyName && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party Name</th>}
    {columnVisibility.productName && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>}
    {columnVisibility.qty && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>}
    {columnVisibility.areaLifting && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area Lifting</th>}
    {columnVisibility.truckNo && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Truck No.</th>}
    {columnVisibility.transporterName && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transporter</th>}
    {columnVisibility.billImage && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill Image</th>}
    {columnVisibility.biltyNo && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bilty No.</th>}
    {columnVisibility.typeOfRate && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type Of Rate</th>}
    {columnVisibility.rate && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>}
    {columnVisibility.truckQty && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Truck Qty</th>}
    {columnVisibility.biltyImage && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bilty Image</th>}
    {columnVisibility.qtyDifferenceStatus && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty Diff Status</th>}
    {columnVisibility.differenceQty && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diff Qty</th>}
    {columnVisibility.weightSlip && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight Slip</th>}
    {columnVisibility.totalFreight && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Freight</th>}
    {columnVisibility.status && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>}
    {columnVisibility.remarks && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>}
    {columnVisibility.actions && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
  </tr>
</thead>

      <tbody className="bg-white divide-y divide-gray-200">
        {accountsData.length === 0 ? (
          <tr>
  <td colSpan={Object.values(columnVisibility).filter(Boolean).length} className="px-6 py-12 text-center text-gray-500">
    <div className="flex flex-col items-center">
      <p className="text-lg font-medium mb-2">No records available</p>
      <p className="text-sm">All entries have been processed or no data is available for secondary rectification.</p>
    </div>
  </td>
</tr>
        ) : (
          accountsData.map((row, index) => (
  <tr key={row.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
    {columnVisibility.timestamp && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.timestamp || '-'}</td>}
    {columnVisibility.liftNumber && <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.liftNumber || '-'}</td>}
    {columnVisibility.type && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.type || '-'}</td>}
    {columnVisibility.billNo && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.billNo || '-'}</td>}
    {columnVisibility.partyName && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.partyName || '-'}</td>}
    {columnVisibility.productName && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.productName || '-'}</td>}
    {columnVisibility.qty && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.qty || '-'}</td>}
    {columnVisibility.areaLifting && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.areaLifting || '-'}</td>}
    {columnVisibility.truckNo && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.truckNo || '-'}</td>}
    {columnVisibility.transporterName && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.transporterName || '-'}</td>}
    {columnVisibility.billImage && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.billImage ? (<a href={row.billImage} target='_blank' rel='noopener norefferer'><Image size={20} /></a>) : ("-")}</td>}
    {columnVisibility.biltyNo && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.biltyNo || '-'}</td>}
    {columnVisibility.typeOfRate && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.typeOfRate || '-'}</td>}
    {columnVisibility.rate && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.rate || '-'}</td>}
    {columnVisibility.truckQty && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.truckQty || '-'}</td>}
    {columnVisibility.biltyImage && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.biltyImage ? (<a href={row.biltyImage} target='_blank' rel='noopener norefferer'><Image size={20} /></a>) : ("-")}</td>}
    {columnVisibility.qtyDifferenceStatus && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.qtyDifferenceStatus || '-'}</td>}
    {columnVisibility.differenceQty && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.differenceQty || '-'}</td>}
    {columnVisibility.weightSlip && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.weightSlip ? (<a href={row.weightSlip} target='_blank' rel='noopener norefferer'><Image size={20} /></a>) : ("-")}</td>}
    {columnVisibility.totalFreight && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.totalFreight || '-'}</td>}
    {columnVisibility.status && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.status || '-'}</td>}
    {columnVisibility.remarks && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.remarks || '-'}</td>}
    {columnVisibility.actions && (
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

export default RectifyMistake2Page;
