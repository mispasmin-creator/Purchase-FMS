import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Settings, Eye, Download, RefreshCw } from 'lucide-react';

const Accounts = () => {
  // State management
  const [accountsData, setAccountsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    type: 'All',
    partyName: 'All',
    transporterName: 'All',
    typeOfRate: 'All'
  });
  const [visibleColumns, setVisibleColumns] = useState({});
  const [showColumnSettings, setShowColumnSettings] = useState(false);

  // Configuration
  const SHEET_ID = "1NUxf4pnQ-CtCFUjA5rqLgYEJiU77wQlwVyimjt8RmFQ";
  const SHEET_NAME = "ACCOUNTS";

  const columns = [
    { key: 'timestamp', label: 'Date' },
    { key: 'liftNumber', label: 'Lift Number' },
    { key: 'type', label: 'Type' },
    { key: 'billNo', label: 'Bill No.' },
    { key: 'partyName', label: 'Party Name' },
    { key: 'productName', label: 'Product Name' },
    { key: 'qty', label: 'Qty' },
    { key: 'areaLifting', label: 'Area Lifting' },
    { key: 'truckNo', label: 'Truck No.' },
    { key: 'transporterName', label: 'Transporter Name' },
    { key: 'billImage', label: 'Bill Image' },
    { key: 'biltyNo', label: 'Bilty No.' },
    { key: 'typeOfRate', label: 'Type Of Rate' },
    { key: 'rate', label: 'Rate' },
    { key: 'truckQty', label: 'Truck Qty' },
    { key: 'biltyImage', label: 'Bilty Image' },
    { key: 'qtyDifferenceStatus', label: 'Qty Difference Status' },
    { key: 'differenceQty', label: 'Difference Qty' },
    { key: 'weightSlip', label: 'Weight Slip' },
    { key: 'totalFreight', label: 'Total Freight' }
  ];

  // Helper functions
  useEffect(() => {
    const initialVisibleColumns = columns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {});
    setVisibleColumns(initialVisibleColumns);
  }, []);

  // Updated date format function to match the second code example
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

  // Fetch data function
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
          totalFreight: getCellValue(row, 19) || ''
        };
        
        const hasData = Object.values(rowData).some(value => 
          value && value !== '' && value !== index
        );
        
        return hasData ? rowData : null;
      }).filter(Boolean);
      
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
  }, []);

  const getUniqueValues = (key) => {
    const values = [...new Set(accountsData.map(item => item[key]).filter(Boolean))];
    return ['All', ...values];
  };

  const filteredData = useMemo(() => {
    return accountsData.filter(item => {
      const matchesSearch = Object.values(item).some(value => 
        value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      );

      const matchesFilters = Object.entries(filters).every(([key, value]) => {
        if (value === 'All') return true;
        return item[key] === value;
      });

      return matchesSearch && matchesFilters;
    });
  }, [searchTerm, filters, accountsData]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleColumn = (columnKey) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({
      type: 'All',
      partyName: 'All',
      transporterName: 'All',
      typeOfRate: 'All'
    });
  };

  const handleViewImage = (imageId) => {
    if (imageId) {
      let fullUrl = imageId;
      
      if (imageId.includes('drive.google.com')) {
        const fileIdMatch = imageId.match(/[-\w]{25,}/);
        if (fileIdMatch) {
          fullUrl = `https://drive.google.com/file/d/${fileIdMatch[0]}/view`;
        }
      } else if (imageId.includes('id=')) {
        const fileId = imageId.split('id=')[1];
        fullUrl = `https://drive.google.com/file/d/${fileId}/view`;
      }
      
      window.open(fullUrl, '_blank');
    }
  };

  const handleExport = () => {
    try {
      const csvContent = [
        columns.filter(col => visibleColumns[col.key]).map(col => col.label).join(','),
        ...filteredData.map(row => 
          columns.filter(col => visibleColumns[col.key]).map(col => {
            const value = row[col.key] || '';
            return value.toString().includes(',') ? `"${value.toString().replace(/"/g, '""')}"` : value;
          }).join(',')
        )
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `accounts_data_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    }
  };

  // Loading and error states
  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-2 text-lg text-gray-600">Loading accounts data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-4xl mx-auto">
          <div className="flex items-center">
            <X className="w-6 h-6 text-red-500 mr-2 flex-shrink-0" />
            <h3 className="text-lg font-medium text-red-800">Error Loading Data</h3>
          </div>
          <div className="mt-2 text-red-700">
            <pre className="whitespace-pre-wrap text-sm font-mono bg-red-100 p-3 rounded mt-2 overflow-auto">
              {error}
            </pre>
          </div>
          <div className="mt-4 flex space-x-3">
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main component JSX
  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      {/* Search and Filter Section */}
      <div className="bg-white rounded-lg shadow border mb-4">
        <div className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium text-gray-900">Search & Filters</h3>
            <div className="flex space-x-2">
              <button
                onClick={fetchData}
                className="flex items-center px-3 py-1 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </button>
              <button
                onClick={() => setShowColumnSettings(!showColumnSettings)}
                className="flex items-center px-3 py-1 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                <Settings className="w-4 h-4 mr-1" />
                Columns
              </button>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search across all fields..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {getUniqueValues('type').map(value => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Party Name</label>
              <select
                value={filters.partyName}
                onChange={(e) => handleFilterChange('partyName', e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {getUniqueValues('partyName').map(value => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Transporter</label>
              <select
                value={filters.transporterName}
                onChange={(e) => handleFilterChange('transporterName', e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {getUniqueValues('transporterName').map(value => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Rate Type</label>
              <select
                value={filters.typeOfRate}
                onChange={(e) => handleFilterChange('typeOfRate', e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {getUniqueValues('typeOfRate').map(value => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
          </div>

          {showColumnSettings && (
            <div className="mb-4 p-3 bg-gray-50 rounded-md border">
              <h4 className="text-xs font-medium text-gray-700 mb-2">Visible Columns</h4>
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2">
                {columns.map(column => (
                  <label key={column.key} className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleColumns[column.key]}
                      onChange={() => toggleColumn(column.key)}
                      className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-700">{column.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <button
              onClick={clearFilters}
              className="flex items-center px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              <X className="w-4 h-4 mr-1" />
              Clear All
            </button>
            <button
              onClick={handleExport}
              className="flex items-center px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Download className="w-4 h-4 mr-1" />
              Export Data
            </button>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium text-gray-900">Accounts Data</h3>
              <p className="text-sm text-gray-600 mt-1">
                All account records from the sheet
              </p>
            </div>
            <span className="text-sm text-gray-600">
              Showing {filteredData.length} of {accountsData.length} records
            </span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {columns.filter(col => visibleColumns[col.key]).map(column => (
                  <th key={column.key} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={columns.filter(col => visibleColumns[col.key]).length} className="px-4 py-8 text-center text-gray-500">
                    {accountsData.length === 0 
                      ? 'No data available in the ACCOUNTS sheet' 
                      : 'No records match the current filters'
                    }
                  </td>
                </tr>
              ) : (
                filteredData.map((row, index) => (
                  <tr key={row.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {columns.filter(col => visibleColumns[col.key]).map(column => (
                      <td key={column.key} className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {column.key === 'billImage' || column.key === 'biltyImage' || column.key === 'weightSlip' ? (
                          row[column.key] ? (
                            <button 
                              onClick={() => handleViewImage(row[column.key])}
                              className="flex items-center text-blue-600 hover:text-blue-800"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )
                        ) : (
                          <span>{row[column.key] || '-'}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Accounts;