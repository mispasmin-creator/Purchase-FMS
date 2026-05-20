import React from 'react';
import { X, Image, ExternalLink } from 'lucide-react';
import { getQtyDifference } from './AuditTableRows';

const GroupedProductsDetailsModal = ({ viewGroupItems, setViewGroupItems }) => {
  if (!viewGroupItems || viewGroupItems.length === 0) return null;
  const firmName = viewGroupItems[0]?.firmName || '-';
  const billNo = viewGroupItems[0]?.billNo || '-';
  const partyName = viewGroupItems[0]?.partyName || '-';

  return (
    <div className="fixed inset-0 z-[110] overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-6xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#7da23a] to-emerald-600 text-white flex items-center justify-between shadow-md">
          <div>
            <h3 className="text-lg font-bold">Grouped Products Details</h3>
            <p className="text-xs text-emerald-100 mt-0.5">
              Firm: <span className="font-semibold text-white">{firmName}</span> | Bill No: <span className="font-semibold text-white">{billNo}</span> | Party: <span className="font-semibold text-white">{partyName}</span>
            </p>
          </div>
          <button 
            onClick={() => setViewGroupItems(null)} 
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
        {/* Body (Table) */}
        <div className="p-6 overflow-auto max-h-[calc(85vh-120px)] custom-scrollbar bg-gray-50/50">
          <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white shadow-xs custom-scrollbar">
            <table className="w-full min-w-max text-xs border-collapse text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
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
                  <th className="px-3 py-2.5 font-bold text-gray-700 uppercase whitespace-nowrap">Remarks</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {viewGroupItems.map((item, idx) => (
                  <tr key={item.id || idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/10'} hover:bg-gray-50 transition-colors`}>
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
                    <td className="px-3 py-2 text-gray-600 max-w-xs break-words" title={item.remarks}>{item.remarks || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button 
            onClick={() => setViewGroupItems(null)} 
            className="px-5 py-2 text-sm font-semibold text-gray-700 bg-gray-200/80 hover:bg-gray-300/80 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupedProductsDetailsModal;
