import React from 'react';
import { AlertCircle } from 'lucide-react';
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
              {visibleColumns.dateOfReceiving && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Bill Receiving Date</th>}
              {visibleColumns.partyName && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Party Name</th>}
              {visibleColumns.productName && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Product Name</th>}
              {visibleColumns.remarks && <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left bg-gray-50/95 backdrop-blur-sm shadow-sm whitespace-nowrap">Remarks</th>}
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
              groupedData.map((group, groupIdx) => {
                const groupKey = getGroupKey(group.firmName, group.billNo);
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
                      />
                    ))}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditTable;
