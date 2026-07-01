import React from 'react';
import { X, RefreshCw, Save, CheckCircle, AlertCircle, Image, ExternalLink, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getQtyDifference } from './AuditTableRows';
import { supabase } from '../../supabase';

const AuditEntryModal = ({
  visibleColumns = {},
  editingRow,
  editingGroupItems,
  auditMismatchData,
  tallyEntryMismatchData,
  billEntryMismatchData,
  rectifyMismatchData,
  reAuditMismatchData,
  allMismatchData,
  accountsData,
  STAGES,
  formData,
  handleFormChange,
  submitFormData,
  submitting,
  setEditingRow,
  setEditingGroupItems,
  activeTab
}) => {
  const navigate = useNavigate();
  if (!editingRow) return null;

  let row = null;
  let isGroupEdit = false;

  if (editingGroupItems && editingGroupItems.length > 0) {
    row = editingGroupItems[0];
    isGroupEdit = true;
  } else {
    // Check all data sources
    row = auditMismatchData.find(r => r.id === editingRow);
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
  }

  if (!row) return null;

  const stageInfo = isGroupEdit
    ? (STAGES['AUDIT'] || { name: 'AUDIT', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle })
    : (STAGES[row.currentStage] || {
        name: row.currentStage || 'Unknown',
        color: 'bg-gray-100 text-gray-800',
        icon: AlertCircle
      });
  const StageIcon = stageInfo.icon;

  const itemStage = isGroupEdit
    ? (activeTab === 'ALL' ? (row.currentStage || 'AUDIT') : activeTab)
    : row.currentStage;
  const normalizedStage = itemStage === 'RE_AUDIT' ? 'REAUDIT' : itemStage;
  const isReAuditStage = ['REAUDIT', 'RE_AUDIT'].includes(normalizedStage);
  const isMakingDebitNote = Boolean(window._isMakingDebitNote);
  const isDebitNoteCreated = Boolean(row.debit_note_created || row.debitAmount || row.debitNoteUrl || row["Debit Amount"] || row["Debit Note URL"]);
  const statusOptions = ['RECTIFY', 'REAUDIT'].includes(normalizedStage)
    ? ['Done']
    : ['Done', 'Not Done'];

  // Unify display items list: single item row becomes an array of one item
  const displayItems = isGroupEdit ? editingGroupItems : [row];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-100">
      <div className="bg-white rounded-xl shadow-lg w-full max-h-[90vh] overflow-y-auto max-w-5xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <h3 className="text-xl font-semibold text-gray-900">Add Entry</h3>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${stageInfo.color}`}>
                {StageIcon && <StageIcon className="w-3 h-3 mr-1" />}
                {stageInfo.name}
              </span>
            </div>
            <button
              onClick={() => {
                window._isMakingDebitNote = false;
                setEditingRow(null);
                setEditingGroupItems(null);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="mb-6">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#7da23a]"></span>
              {isGroupEdit ? `Grouped Products (${editingGroupItems.length})` : 'Product Details'}
            </h4>
            <div className="overflow-auto border border-gray-200 rounded-xl bg-white shadow-xs max-h-[35vh] custom-scrollbar">
              <table className="w-full min-w-max text-xs text-left border-collapse">
                <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2.5 font-bold text-gray-700 uppercase whitespace-nowrap">Date</th>
                    <th className="px-3 py-2.5 font-bold text-gray-700 uppercase whitespace-nowrap">Indent No.</th>
                    <th className="px-3 py-2.5 font-bold text-gray-700 uppercase whitespace-nowrap">Firm Name</th>
                    <th className="px-3 py-2.5 font-bold text-gray-700 uppercase whitespace-nowrap">PO Rate</th>
                    <th className="px-3 py-2.5 font-bold text-gray-700 uppercase whitespace-nowrap">Lift No</th>
                    <th className="px-3 py-2.5 font-bold text-gray-700 uppercase whitespace-nowrap">Bill No</th>
                    <th className="px-3 py-2.5 font-bold text-gray-700 uppercase whitespace-nowrap">Bill Receiving Date</th>
                    <th className="px-3 py-2.5 font-bold text-gray-700 uppercase whitespace-nowrap">Party Name</th>
                    <th className="px-3 py-2.5 font-bold text-gray-700 uppercase whitespace-nowrap">Product Name</th>
                    <th className="px-3 py-2.5 font-bold text-gray-700 uppercase whitespace-nowrap">PO Qty</th>
                    <th className="px-3 py-2.5 font-bold text-gray-700 uppercase whitespace-nowrap">Area Lifting</th>
                    <th className="px-3 py-2.5 font-bold text-gray-700 uppercase whitespace-nowrap">Truck No</th>
                    <th className="px-3 py-2.5 font-bold text-gray-700 uppercase whitespace-nowrap">Transporter</th>
                    <th className="px-3 py-2.5 font-bold text-gray-700 uppercase whitespace-nowrap">Transporter Rate</th>
                    <th className="px-3 py-2.5 font-bold text-gray-700 uppercase whitespace-nowrap">Bill Image</th>
                    <th className="px-3 py-2.5 font-bold text-gray-700 uppercase whitespace-nowrap">Bilty No</th>
                    <th className="px-3 py-2.5 font-bold text-gray-700 uppercase whitespace-nowrap">Type Of Rate</th>
                    <th className="px-3 py-2.5 font-bold text-gray-700 uppercase whitespace-nowrap">Material Rate</th>
                    <th className="px-3 py-2.5 font-bold text-gray-700 uppercase whitespace-nowrap">Material Qty</th>
                    <th className="px-3 py-2.5 font-bold text-gray-700 uppercase whitespace-nowrap">Truck Qty</th>
                    <th className="px-3 py-2.5 font-bold text-gray-700 uppercase whitespace-nowrap">Bilty Image</th>
                    <th className="px-3 py-2.5 font-bold text-gray-700 uppercase whitespace-nowrap">Qty Diff Status</th>
                    <th className="px-3 py-2.5 font-bold text-gray-700 uppercase whitespace-nowrap">Weight Slip</th>
                    <th className="px-3 py-2.5 font-bold text-gray-700 uppercase whitespace-nowrap">Debit Amount</th>
                    <th className="px-3 py-2.5 font-bold text-gray-700 uppercase whitespace-nowrap">Debit Image</th>
                    <th className="px-3 py-2.5 font-bold text-gray-700 uppercase whitespace-nowrap">Total Freight</th>
                    {visibleColumns.remarks && <th className="px-3 py-2.5 font-bold text-gray-700 uppercase whitespace-nowrap">Remarks</th>}
                    {visibleColumns.auditRemarks && <th className="px-3 py-2.5 font-bold text-gray-700 uppercase whitespace-nowrap">Audit Remarks</th>}
                    {visibleColumns.rectifyRemarks && <th className="px-3 py-2.5 font-bold text-gray-700 uppercase whitespace-nowrap">Rectify Remarks</th>}
                    {visibleColumns.reauditRemarks && <th className="px-3 py-2.5 font-bold text-gray-700 uppercase whitespace-nowrap">Re-Audit Remarks</th>}
                    {visibleColumns.tallyRemarks && <th className="px-3 py-2.5 font-bold text-gray-700 uppercase whitespace-nowrap">Tally Remarks</th>}
                    {visibleColumns.billRemarks && <th className="px-3 py-2.5 font-bold text-gray-700 uppercase whitespace-nowrap">Bill Remarks</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayItems.map((item, idx) => (
                    <tr key={item.id || idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/20'} hover:bg-gray-50 transition-colors`}>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">{item.timestamp || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-bold text-primary">{item.indentNumber || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-700 font-semibold">{item.firmName || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-bold text-[#7da23a]">{item.poRate ? `₹${item.poRate}` : '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-bold text-primary">{item.liftNumber || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-700 font-bold">{item.billNo || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">{item.dateOfReceiving || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-700 font-semibold">{item.partyName || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-800 font-medium">{item.productName || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-700 font-medium">{item.qty || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">{item.areaLifting || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-700 font-medium">{item.truckNo || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">{item.transporterName || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-bold text-orange-600">{item.transporterRate ? `₹${item.transporterRate}` : '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                        {item.billImage ? (
                          <a href={item.billImage} target="_blank" rel="noopener noreferrer" className="text-[#7da23a] hover:text-[#6b8e2f] flex items-center font-medium">
                            <Image size={14} className="mr-1" /> View
                          </a>
                        ) : "-"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-700">{item.biltyNo || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">{item.typeOfRate || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-bold text-green-600">{item.rate ? `₹${item.rate}` : '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-700 font-medium">{item.truckQty || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-700 font-medium">{item.liftingQty || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {item.biltyImage ? (
                          <a href={item.biltyImage} target="_blank" rel="noopener noreferrer" className="text-[#7da23a] hover:text-[#6b8e2f] flex items-center font-medium">
                            <Image size={14} className="mr-1" /> View
                          </a>
                        ) : "-"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap font-bold text-red-600">{getQtyDifference(item)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {item.weightSlip ? (
                          <a href={item.weightSlip} target="_blank" rel="noopener noreferrer" className="text-[#7da23a] hover:text-[#6b8e2f] flex items-center font-medium">
                            <Image size={14} className="mr-1" /> View
                          </a>
                        ) : "-"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap font-bold text-red-600">{item.debitAmount ? `₹${item.debitAmount}` : '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {item.debitNoteUrl ? (
                          <a href={item.debitNoteUrl} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-800 font-medium inline-flex items-center">
                            <ExternalLink className="h-3 w-3 mr-1" /> View
                          </a>
                        ) : "-"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap font-bold text-gray-800">{item.totalFreight ? `₹${item.totalFreight}` : '-'}</td>
                      {visibleColumns.remarks && <td className="px-3 py-2 text-gray-600 max-w-xs break-words" title={item.remarks}>{item.remarks || '-'}</td>}
                      {visibleColumns.auditRemarks && <td className="px-3 py-2 text-gray-600 max-w-xs break-words" title={item.auditRemarks}>{item.auditRemarks || '-'}</td>}
                      {visibleColumns.rectifyRemarks && <td className="px-3 py-2 text-gray-600 max-w-xs break-words" title={item.rectifyRemarks}>{item.rectifyRemarks || '-'}</td>}
                      {visibleColumns.reauditRemarks && <td className="px-3 py-2 text-gray-600 max-w-xs break-words" title={item.reauditRemarks}>{item.reauditRemarks || '-'}</td>}
                      {visibleColumns.tallyRemarks && <td className="px-3 py-2 text-gray-600 max-w-xs break-words" title={item.tallyRemarks}>{item.tallyRemarks || '-'}</td>}
                      {visibleColumns.billRemarks && <td className="px-3 py-2 text-gray-600 max-w-xs break-words" title={item.billRemarks}>{item.billRemarks || '-'}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {isReAuditStage && (isDebitNoteCreated || isMakingDebitNote) && (
            <div className="mb-6">
              {isDebitNoteCreated ? (
                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl shadow-xs">
                  <div className="flex items-center text-green-800 font-semibold text-sm">
                    <CheckCircle className="w-5 h-5 mr-2 text-green-600 shrink-0" />
                    <span>Debit Note Created {row.debitAmount ? `(Amount: ₹${row.debitAmount})` : ''}</span>
                  </div>
                  {(row.debitNoteUrl || row["Debit Note URL"]) && (
                    <a
                      href={row.debitNoteUrl || row["Debit Note URL"]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-green-700 bg-white border border-green-300 rounded-lg hover:bg-green-100 transition-colors shadow-2xs"
                    >
                      View Debit Note <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  )}
                </div>
              ) : (
                <div className="flex flex-col p-4 bg-amber-50 border border-amber-200 rounded-xl gap-3 shadow-xs">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center text-amber-900 font-medium text-sm">
                      <AlertCircle className="w-5 h-5 mr-2 text-amber-600 shrink-0" />
                      <span>Create Debit Note required for Qty Diff Status before proceeding.</span>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 border border-red-300 rounded-lg text-xs font-extrabold shadow-2xs">
                      Qty Diff Status: {row.qtyDifferenceStatus || '0.000'}
                    </span>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={async () => {
                        if (row.supabaseId || row.id) {
                          const targetId = row.supabaseId || (typeof row.id === 'string' && row.id.includes('_') ? row.id.split('_').pop() : row.id);
                          await supabase.from("Mismatch").update({ 
                            coordination_status: "COORDINATED", 
                            "Action Type": "Make Debit Note (Re-Audit)",
                            "Qty Diff Status": row.qtyDifferenceStatus || '0.000',
                            "Diff Qty": row.qtyDifferenceStatus || '0.000'
                          }).eq("id", targetId);
                        }
                        window._isMakingDebitNote = false;
                        setEditingRow(null);
                        if (setEditingGroupItems) setEditingGroupItems(null);
                        navigate('/debit-note', { state: { fromReAudit: true, reauditRow: row } });
                      }}
                      className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-white bg-linear-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 rounded-lg shadow-sm hover:shadow transition-all whitespace-nowrap cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 mr-1.5" />
                      Create Debit Note (Qty Diff: {row.qtyDifferenceStatus || '0.000'})
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusOptions.includes(formData.status) ? formData.status : statusOptions[0]}
                onChange={(e) => handleFormChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6b8e2f] focus:border-[#6b8e2f] bg-white text-sm"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>


            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
              <textarea
                value={formData.remarks || ''}
                onChange={(e) => handleFormChange('remarks', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6b8e2f] focus:border-[#6b8e2f] text-sm resize-none"
                placeholder="Enter your remarks..."
                rows={4}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-gray-200">
            <button
              onClick={() => {
                window._isMakingDebitNote = false;
                setEditingRow(null);
                setEditingGroupItems(null);
              }}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              onClick={submitFormData}
              disabled={submitting || (!isGroupEdit && ['RECTIFY', 'TALLY_ENTRY', 'REAUDIT', 'RE_AUDIT', 'BILL_ENTRY'].includes(row.currentStage) && formData.status !== 'Done') || (isReAuditStage && isMakingDebitNote && !isDebitNoteCreated)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-linear-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b8e2f] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
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

export default AuditEntryModal;
