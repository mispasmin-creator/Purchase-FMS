import React, { useState, useEffect, useMemo } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { StandardRow, ParentRow, SubRow } from './AuditTableRows';

const AuditTable = ({
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
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100;

  useEffect(() => {
    setCurrentPage(1);
  }, [groupedData]);

  const totalPages = Math.ceil(groupedData.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return groupedData.slice(start, start + pageSize);
  }, [groupedData, currentPage, pageSize]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
      <div className="overflow-auto max-h-[calc(100vh-250px)] relative custom-scrollbar">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-30">
            <tr className="bg-gray-50 border-b border-gray-200">
              {activeTab === 'HISTORY' ? (
                <th className="sticky left-0 z-40 px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap border-r border-gray-200">Completed At</th>
              ) : visibleColumns.actions && (
                <th className="sticky left-0 z-40 px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap border-r border-gray-200">Actions</th>
              )}
              {visibleColumns.stage && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Stage</th>}
              {visibleColumns.timestamp && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Date</th>}
              {visibleColumns.indentNumber && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Indent No.</th>}
              {visibleColumns.firmName && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Firm Name</th>}
              {visibleColumns.poRate && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">PO Rate</th>}
              {visibleColumns.liftNumber && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Lift Number</th>}
              {visibleColumns.billNo && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Bill No.</th>}
              {visibleColumns.dateOfBill && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Date Of Bill</th>}
              {visibleColumns.dateOfReceiving && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Bill Receiving Date</th>}
              {visibleColumns.partyName && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Party Name</th>}
              {visibleColumns.productName && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Product Name</th>}
              {visibleColumns.remarks && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Remarks</th>}
              {visibleColumns.auditRemarks && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Audit Remarks</th>}
              {visibleColumns.rectifyRemarks && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Rectify Remarks</th>}
              {visibleColumns.reauditRemarks && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Re-Audit Remarks</th>}
              {visibleColumns.tallyRemarks && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Tally Remarks</th>}
              {visibleColumns.billRemarks && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Bill Remarks</th>}
              {visibleColumns.qty && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">PO Qty</th>}
              {visibleColumns.areaLifting && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Area Lifting</th>}
              {visibleColumns.truckNo && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Truck No.</th>}
              {visibleColumns.transporterName && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Transporter</th>}
              {visibleColumns.transporterRate && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Transporter Rate</th>}
              {visibleColumns.billImage && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Bill Image</th>}
              {visibleColumns.biltyNo && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Bilty No.</th>}
              {visibleColumns.typeOfRate && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Type Of Rate</th>}
              {visibleColumns.rate && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Material Rate</th>}
              {visibleColumns.truckQty && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Material Qty</th>}
              {visibleColumns.liftingQty && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Truck Qty</th>}
              {visibleColumns.biltyImage && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Bilty Image</th>}
              {visibleColumns.qtyDifferenceStatus && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Qty Diff Status</th>}
              {visibleColumns.weightSlip && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Weight Slip</th>}
              {visibleColumns.debitAmount && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Debit Amount</th>}
              {visibleColumns.debitNoteUrl && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Debit Image</th>}
              {visibleColumns.totalFreight && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Total Freight</th>}
              {visibleColumns.auditStatus && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Audit Status</th>}
              {visibleColumns.rectifyStatus && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Rectify Status</th>}
              {visibleColumns.reAuditStatus && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Re-Audit Status</th>}
              {visibleColumns.tallyStatus && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Tally Status</th>}
              {visibleColumns.status && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Status</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 2} className="px-6 py-12 text-center text-gray-500 bg-gray-50/50">
                  <div className="flex flex-col items-center justify-center">
                    <AlertCircle className="w-10 h-10 text-gray-300 mb-3" />
                    <p className="text-lg font-medium text-gray-600">No records found</p>
                    <p className="text-sm">
                      {activeTab === 'ALL'
                        ? 'All entries have been processed or no data is available.'
                        : activeTab === 'HISTORY'
                          ? 'No completed records found.'
                          : `No entries in ${STAGES[activeTab]?.name} stage.`}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((group, groupIdx) => {
                const groupKey = getGroupKey(group.firmName, group.billNo, group.partyName);
                const isExpanded = expandedGroups.has(groupKey);
                const hasMultiple = group.items.length > 1;

                if (!hasMultiple) {
                  return (
                    <StandardRow
                      key={group.items[0].id}
                      row={group.items[0]}
                      index={groupIdx}
                      activeTab={activeTab}
                      visibleColumns={visibleColumns}
                      isSuperAdmin={isSuperAdmin}
                      setEditingRow={setEditingRow}
                      initializeFormData={initializeFormData}
                      setSuperAdminEditRow={setSuperAdminEditRow}
                      STAGES={STAGES}
                    />
                  );
                }

                return (
                  <React.Fragment key={groupKey}>
                    <ParentRow
                      group={group}
                      groupKey={groupKey}
                      isExpanded={isExpanded}
                      groupIdx={groupIdx}
                      activeTab={activeTab}
                      visibleColumns={visibleColumns}
                      isSuperAdmin={isSuperAdmin}
                      setEditingGroupItems={setEditingGroupItems}
                      setEditingRow={setEditingRow}
                      initializeFormData={initializeFormData}
                      toggleGroup={toggleGroup}
                      STAGES={STAGES}
                    />
                    {isExpanded && group.items.map((row, subIdx) => (
                      <SubRow
                        key={row.id}
                        row={row}
                        subIdx={subIdx}
                        groupIdx={groupIdx}
                        visibleColumns={visibleColumns}
                        STAGES={STAGES}
                        activeTab={activeTab}
                        isSuperAdmin={isSuperAdmin}
                        setSuperAdminEditRow={setSuperAdminEditRow}
                      />
                    ))}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3 sm:px-6 select-none shrink-0">
          {/* Mobile buttons */}
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
          {/* Desktop pagination controls */}
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-xs text-gray-600">
                Showing <span className="font-semibold text-gray-900">{Math.min((currentPage - 1) * pageSize + 1, groupedData.length)}</span> to{' '}
                <span className="font-semibold text-gray-900">{Math.min(currentPage * pageSize, groupedData.length)}</span> of{' '}
                <span className="font-semibold text-gray-900">{groupedData.length}</span> groups
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-xs" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Only render page numbers near current page to keep it clean
                  if (page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2)) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 text-xs font-semibold focus:z-20 transition-all cursor-pointer ${
                          page === currentPage
                            ? 'z-10 bg-green-600 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600'
                            : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  }
                  if (page === currentPage - 3 || page === currentPage + 3) {
                    return (
                      <span
                        key={page}
                        className="relative inline-flex items-center px-4 py-2 text-xs font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0"
                      >
                        ...
                      </span>
                    );
                  }
                  return null;
                })}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                  <span className="sr-only">Next</span>
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditTable;
