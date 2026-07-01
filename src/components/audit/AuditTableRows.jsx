import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { Edit2, Image, ShieldCheck, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';

// Helper to sum fields for parent rows
export const sumField = (items, fieldName) => {
  let total = 0;
  let hasValidNumber = false;
  items.forEach(item => {
    const val = parseFloat(item[fieldName]);
    if (!isNaN(val)) {
      total += val;
      hasValidNumber = true;
    }
  });
  return hasValidNumber ? total.toFixed(3).replace(/\.?0+$/, '') : '-';
};

const parseNumber = (value) => {
  if (value === null || value === undefined || value === '') return NaN;
  const num = parseFloat(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(num) ? num : NaN;
};

const formatNumber = (value) => (
  Number.isFinite(value) ? value.toFixed(3).replace(/\.?0+$/, '') : '-'
);

const sumReAuditParentFreight = (items) => {
  const rateType = String(items.find(item => item.typeOfRate)?.typeOfRate || '').toLowerCase().replace(/[^a-z]/g, '');
  const parentTransporterRate = parseNumber(sumField(items, 'transporterRate'));
  const parentTruckQty = parseNumber(sumField(items, 'liftingQty'));
  const parentMaterialQty = parseNumber(sumField(items, 'truckQty'));
  const qtyForFreight = Number.isFinite(parentTruckQty) ? parentTruckQty : parentMaterialQty;

  if (rateType.includes('permt') && Number.isFinite(parentTransporterRate) && Number.isFinite(qtyForFreight)) {
    return formatNumber(parentTransporterRate * qtyForFreight);
  }

  if (rateType.includes('fixed') && Number.isFinite(parentTransporterRate)) {
    return formatNumber(parentTransporterRate);
  }

  return '-';
};

// Helper to render cell value with elegant badge for Multiple
export const renderCellVal = (val) => {
  if (val === 'Multiple') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200/60 uppercase tracking-wider shadow-2xs">
        Multiple
      </span>
    );
  }
  return val;
};

const StatusBadge = ({ value }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${value === 'Done' ? 'bg-green-100 text-green-800' : value === 'Not Done' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
    {value || '-'}
  </span>
);

// Helper to compute and format Qty Difference Status dynamically (Truck Qty - Material Qty)
export const getQtyDifference = (row) => {
  const liftQty = parseFloat(row.liftingQty);
  const trkQty = parseFloat(row.truckQty);
  if (!isNaN(liftQty) && !isNaN(trkQty)) {
    const diff = liftQty - trkQty;
    return diff.toFixed(3).replace(/\.?0+$/, '');
  }
  return row.qtyDifferenceStatus || '-';
};

// Standard individual row
export const StandardRow = ({
  row,
  index,
  activeTab,
  visibleColumns,
  isSuperAdmin,
  setEditingRow,
  initializeFormData,
  setSuperAdminEditRow,
  STAGES
}) => {
  const navigate = useNavigate();
  const stageInfo = STAGES[row.currentStage] || {
    name: row.currentStage || 'Unknown',
    color: 'bg-gray-100 text-gray-800',
    icon: null
  };
  const StageIcon = stageInfo.icon;

  return (
    <tr 
      key={row.id} 
      className={`${
        activeTab !== 'HISTORY'
          ? 'bg-emerald-50/20 hover:bg-emerald-50/45 border-b border-emerald-100/50'
          : (index % 2 === 0 ? 'bg-white hover:bg-slate-50/80' : 'bg-slate-50/30 hover:bg-slate-50/80')
      } transition-colors border-b border-gray-100 group`}
    >
      {activeTab === 'HISTORY' ? (
        <td className={`sticky left-0 z-10 px-4 py-3 whitespace-nowrap text-xs text-purple-700 font-medium border-r border-gray-150 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white group-hover:bg-slate-50' : 'bg-[#fafafb] group-hover:bg-slate-50'}`}>
          <div className="flex items-center gap-2">
            <span>{row.completedAt || '-'}</span>
            {isSuperAdmin && row.supabaseId && (
              <button
                onClick={() => setSuperAdminEditRow(row)}
                className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 text-[10px] font-medium rounded-md hover:bg-purple-200 border border-purple-300 transition-all duration-200 shadow-2xs"
              >
                <ShieldCheck className="w-2.5 h-2.5 mr-0.5" />
                Edit
              </button>
            )}
          </div>
        </td>
      ) : visibleColumns.actions && (
        <td className="sticky left-0 z-10 px-4 py-3 whitespace-nowrap bg-[#fbfefd] group-hover:bg-[#f2faf5] border-r border-emerald-100/50 transition-colors duration-150">
          <div className="flex items-center gap-1.5">
            {['RE_AUDIT', 'REAUDIT'].includes(row.currentStage) && !Boolean(row.debit_note_created || row.debitAmount || row.debitNoteUrl) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window._isMakingDebitNote = true;
                  setEditingRow(row.id);
                  initializeFormData(row.currentStage);
                }}
                className="inline-flex items-center px-2.5 py-1.5 bg-linear-to-r from-orange-500 to-amber-600 text-white text-xs font-bold rounded-lg hover:from-orange-600 hover:to-amber-700 transition-all duration-200 shadow-sm hover:shadow whitespace-nowrap cursor-pointer"
              >
                Make Debit Note
              </button>
            )}
            {['RE_AUDIT', 'REAUDIT'].includes(row.currentStage) && Boolean(row.debit_note_created || row.debitAmount || row.debitNoteUrl) && (
              <span className="inline-flex items-center px-2.5 py-1 bg-green-100 text-green-800 border border-green-300 rounded-lg text-xs font-bold whitespace-nowrap shadow-2xs">
                ✅ Debit Note Created
              </span>
            )}
            <button
              onClick={() => {
                window._isMakingDebitNote = false;
                setEditingRow(row.id);
                initializeFormData(row.currentStage);
              }}
              className="inline-flex items-center px-3 py-1.5 bg-linear-to-r from-green-500 to-green-600 text-white text-xs font-medium rounded-lg hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-[#6b8e2f] focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Edit2 className="w-3 h-3 mr-1" />
              Add Entry
            </button>
            {isSuperAdmin && row.supabaseId && (
              <button
                onClick={() => setSuperAdminEditRow(row)}
                className="inline-flex items-center px-2 py-1.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-lg hover:bg-purple-200 border border-purple-300 transition-all duration-200"
              >
                <ShieldCheck className="w-3 h-3 mr-1" />
                Edit
              </button>
            )}
          </div>
        </td>
      )}
      {visibleColumns.stage && (
        <td className="px-4 py-3 whitespace-nowrap">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${stageInfo.color} uppercase tracking-wider`}>
            {StageIcon && <StageIcon className="w-2.5 h-2.5 mr-1" />}
            {stageInfo.name}
          </span>
        </td>
      )}
      {visibleColumns.timestamp && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">{row.timestamp || '-'}</td>}
      {visibleColumns.indentNumber && <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-primary">{row.indentNumber || '-'}</td>}
      {visibleColumns.firmName && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 font-medium">{row.firmName || '-'}</td>}
      {visibleColumns.poRate && <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-[#7da23a]">{row.poRate ? `₹${row.poRate}` : '-'}</td>}
      {visibleColumns.liftNumber && <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-primary">{row.liftNumber || '-'}</td>}
      {visibleColumns.billNo && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">{row.billNo || '-'}</td>}
      {visibleColumns.dateOfReceiving && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">{row.dateOfReceiving || '-'}</td>}
      {visibleColumns.partyName && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 font-medium">{row.partyName || '-'}</td>}
      {visibleColumns.productName && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">{row.productName || '-'}</td>}
      {visibleColumns.remarks && (
        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 max-w-xs truncate" title={row.remarks}>
          {row.remarks || '-'}
        </td>
      )}
      {visibleColumns.auditRemarks && (
        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 max-w-xs truncate" title={row.auditRemarks}>
          {row.auditRemarks || '-'}
        </td>
      )}
      {visibleColumns.rectifyRemarks && (
        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 max-w-xs truncate" title={row.rectifyRemarks}>
          {row.rectifyRemarks || '-'}
        </td>
      )}
      {visibleColumns.reauditRemarks && (
        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 max-w-xs truncate" title={row.reauditRemarks}>
          {row.reauditRemarks || '-'}
        </td>
      )}
      {visibleColumns.tallyRemarks && (
        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 max-w-xs truncate" title={row.tallyRemarks}>
          {row.tallyRemarks || '-'}
        </td>
      )}
      {visibleColumns.billRemarks && (
        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 max-w-xs truncate" title={row.billRemarks}>
          {row.billRemarks || '-'}
        </td>
      )}
      {visibleColumns.qty && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">{row.qty || '-'}</td>}
      {visibleColumns.areaLifting && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">{row.areaLifting || '-'}</td>}
      {visibleColumns.truckNo && <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-gray-700">{row.truckNo || '-'}</td>}
      {visibleColumns.transporterName && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">{row.transporterName || '-'}</td>}
      {visibleColumns.transporterRate && <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-orange-600">{row.transporterRate ? `₹${row.transporterRate}` : '-'}</td>}
      {visibleColumns.billImage && (
        <td className="px-4 py-3 whitespace-nowrap text-xs">
          {row.billImage ? (
            <a href={row.billImage} target="_blank" rel="noopener noreferrer" className="text-[#7da23a] hover:text-[#6b8e2f] flex items-center font-medium">
              <Image size={14} className="mr-1" /> View
            </a>
          ) : "-"}
        </td>
      )}
      {visibleColumns.biltyNo && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">{row.biltyNo || '-'}</td>}
      {visibleColumns.typeOfRate && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">{row.typeOfRate || '-'}</td>}
      {visibleColumns.rate && <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-green-600">{row.rate ? `₹${row.rate}` : '-'}</td>}
      {visibleColumns.truckQty && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">{row.truckQty || '-'}</td>}
      {visibleColumns.liftingQty && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">{row.liftingQty || '-'}</td>}
      {visibleColumns.biltyImage && (
        <td className="px-4 py-3 whitespace-nowrap text-xs">
          {row.biltyImage ? (
            <a href={row.biltyImage} target="_blank" rel="noopener noreferrer" className="text-[#7da23a] hover:text-[#6b8e2f] flex items-center font-medium">
              <Image size={14} className="mr-1" /> View
            </a>
          ) : "-"}
        </td>
      )}
      {visibleColumns.qtyDifferenceStatus && <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-red-600">{getQtyDifference(row)}</td>}
      {visibleColumns.weightSlip && (
        <td className="px-4 py-3 whitespace-nowrap text-xs">
          {row.weightSlip ? (
            <a href={row.weightSlip} target="_blank" rel="noopener noreferrer" className="text-[#7da23a] hover:text-[#6b8e2f] flex items-center font-medium">
              <Image size={14} className="mr-1" /> View
            </a>
          ) : "-"}
        </td>
      )}
      {visibleColumns.debitAmount && <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-red-600">{row.debitAmount ? `₹${row.debitAmount}` : '-'}</td>}
      {visibleColumns.debitNoteUrl && (
        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
          {row.debitNoteUrl ? (
            <a href={row.debitNoteUrl} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-800 font-medium inline-flex items-center">
              <ExternalLink className="h-3 w-3 mr-1" /> View
            </a>
          ) : "-"}
        </td>
      )}
      {visibleColumns.totalFreight && <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-gray-800">{row.totalFreight ? `₹${row.totalFreight}` : '-'}</td>}
      {visibleColumns.auditStatus && <td className="px-4 py-3 whitespace-nowrap"><StatusBadge value={row.auditStatus} /></td>}
      {visibleColumns.rectifyStatus && <td className="px-4 py-3 whitespace-nowrap"><StatusBadge value={row.rectifyStatus} /></td>}
      {visibleColumns.reAuditStatus && <td className="px-4 py-3 whitespace-nowrap"><StatusBadge value={row.reAuditStatus} /></td>}
      {visibleColumns.tallyStatus && <td className="px-4 py-3 whitespace-nowrap"><StatusBadge value={row.tallyStatus} /></td>}
      {visibleColumns.status && (
        <td className="px-4 py-3 whitespace-nowrap">
          <StatusBadge value={row.status} />
        </td>
      )}
    </tr>
  );
};

// Collapsible Group Parent Row
export const ParentRow = ({
  group,
  groupKey,
  isExpanded,
  groupIdx,
  activeTab,
  visibleColumns,
  setEditingGroupItems,
  setEditingRow,
  initializeFormData,
  toggleGroup,
  STAGES
}) => {
  const navigate = useNavigate();
  const firstItem = group.items[0] || {};
  const itemStage = activeTab === 'ALL' ? (firstItem.currentStage || 'AUDIT') : (activeTab === 'HISTORY' ? 'COMPLETED' : activeTab);
  const stageInfo = STAGES[itemStage] || {
    name: itemStage || 'Unknown',
    color: 'bg-gray-100 text-gray-800',
    icon: null
  };
  const StageIcon = stageInfo.icon;

  const dates = [...new Set(group.items.map(i => i.timestamp).filter(Boolean))];
  const displayDate = dates.length === 1 ? dates[0] : (dates.length > 1 ? 'Multiple' : '-');

  const indents = [...new Set(group.items.map(i => i.indentNumber).filter(Boolean))];
  const displayIndent = indents.length === 1 ? indents[0] : (indents.length > 1 ? 'Multiple' : '-');

  const poRates = [...new Set(group.items.map(i => i.poRate).filter(Boolean))];
  const displayPoRate = poRates.length === 1 ? `₹${poRates[0]}` : (poRates.length > 1 ? 'Multiple' : '-');

  const recDates = [...new Set(group.items.map(i => i.dateOfReceiving).filter(Boolean))];
  const displayRecDate = recDates.length === 1 ? recDates[0] : (recDates.length > 1 ? 'Multiple' : '-');

  const parties = [...new Set(group.items.map(i => i.partyName).filter(Boolean))];
  const displayParty = parties.length === 1 ? parties[0] : (parties.length > 1 ? 'Multiple' : '-');

  const products = [...new Set(group.items.map(i => i.productName).filter(Boolean))];
  const displayProduct = products.length === 1 ? products[0] : (products.length > 1 ? 'Multiple' : '-');

  const remarksList = [...new Set(group.items.map(i => i.remarks).filter(Boolean))];
  const displayRemarks = remarksList.length === 1 ? remarksList[0] : (remarksList.length > 1 ? 'Multiple' : '-');

  const auditRemarksList = [...new Set(group.items.map(i => i.auditRemarks).filter(Boolean))];
  const displayAuditRemarks = auditRemarksList.length === 1 ? auditRemarksList[0] : (auditRemarksList.length > 1 ? 'Multiple' : '-');

  const rectifyRemarksList = [...new Set(group.items.map(i => i.rectifyRemarks).filter(Boolean))];
  const displayRectifyRemarks = rectifyRemarksList.length === 1 ? rectifyRemarksList[0] : (rectifyRemarksList.length > 1 ? 'Multiple' : '-');

  const reauditRemarksList = [...new Set(group.items.map(i => i.reauditRemarks).filter(Boolean))];
  const displayReauditRemarks = reauditRemarksList.length === 1 ? reauditRemarksList[0] : (reauditRemarksList.length > 1 ? 'Multiple' : '-');

  const tallyRemarksList = [...new Set(group.items.map(i => i.tallyRemarks).filter(Boolean))];
  const displayTallyRemarks = tallyRemarksList.length === 1 ? tallyRemarksList[0] : (tallyRemarksList.length > 1 ? 'Multiple' : '-');

  const billRemarksList = [...new Set(group.items.map(i => i.billRemarks).filter(Boolean))];
  const displayBillRemarks = billRemarksList.length === 1 ? billRemarksList[0] : (billRemarksList.length > 1 ? 'Multiple' : '-');

  const areas = [...new Set(group.items.map(i => i.areaLifting).filter(Boolean))];
  const displayArea = areas.length === 1 ? areas[0] : (areas.length > 1 ? 'Multiple' : '-');

  const transporters = [...new Set(group.items.map(i => i.transporterName).filter(Boolean))];
  const displayTransporter = transporters.length === 1 ? transporters[0] : (transporters.length > 1 ? 'Multiple' : '-');

  const summedTransRate = sumField(group.items, 'transporterRate');
  const displayTransRate = summedTransRate !== '-' ? `₹${summedTransRate}` : '-';

  const billImages = [...new Set(group.items.map(i => i.billImage).filter(Boolean))];
  const displayBillImage = billImages.length === 1 ? (
    <a href={billImages[0]} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[#7da23a] hover:text-[#6b8e2f] flex items-center font-medium">
      <Image size={14} className="mr-1" /> View
    </a>
  ) : (billImages.length > 1 ? 'Multiple' : '-');

  const biltyNos = [...new Set(group.items.map(i => i.biltyNo).filter(Boolean))];
  const displayBiltyNo = biltyNos.length === 1 ? biltyNos[0] : (biltyNos.length > 1 ? 'Multiple' : '-');

  const rateTypes = [...new Set(group.items.map(i => i.typeOfRate).filter(Boolean))];
  const displayRateType = rateTypes.length === 1 ? rateTypes[0] : (rateTypes.length > 1 ? 'Multiple' : '-');

  const rates = [...new Set(group.items.map(i => i.rate).filter(Boolean))];
  const displayRate = rates.length === 1 ? `₹${rates[0]}` : (rates.length > 1 ? 'Multiple' : '-');

  const biltyImages = [...new Set(group.items.map(i => i.biltyImage).filter(Boolean))];
  const displayBiltyImage = biltyImages.length === 1 ? (
    <a href={biltyImages[0]} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[#7da23a] hover:text-[#6b8e2f] flex items-center font-medium">
      <Image size={14} className="mr-1" /> View
    </a>
  ) : (biltyImages.length > 1 ? 'Multiple' : '-');

  let totalQtyDiff = 0;
  let hasValidQtyDiff = false;
  group.items.forEach(item => {
    const diffVal = parseFloat(getQtyDifference(item));
    if (!isNaN(diffVal)) {
      totalQtyDiff += diffVal;
      hasValidQtyDiff = true;
    }
  });
  const displayQtyDiff = hasValidQtyDiff ? totalQtyDiff.toFixed(3).replace(/\.?0+$/, '') : '-';

  const weightSlips = [...new Set(group.items.map(i => i.weightSlip).filter(Boolean))];
  const displayWeightSlip = weightSlips.length === 1 ? (
    <a href={weightSlips[0]} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[#7da23a] hover:text-[#6b8e2f] flex items-center font-medium">
      <Image size={14} className="mr-1" /> View
    </a>
  ) : (weightSlips.length > 1 ? 'Multiple' : '-');

  const debitImages = [...new Set(group.items.map(i => i.debitNoteUrl).filter(Boolean))];
  const displayDebitImage = debitImages.length === 1 ? (
    <a href={debitImages[0]} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-red-600 hover:text-red-800 font-medium inline-flex items-center">
      <ExternalLink className="h-3 w-3 mr-1" /> View
    </a>
  ) : (debitImages.length > 1 ? 'Multiple' : '-');
  const summedTotalFreight = activeTab === 'REAUDIT'
    ? sumReAuditParentFreight(group.items)
    : sumField(group.items, 'totalFreight');
  const displayTotalFreight = summedTotalFreight !== '-' ? `₹${summedTotalFreight}` : '-';

  const statuses = [...new Set(group.items.map(i => i.status).filter(Boolean))];
  const displayStatus = statuses.length === 1 ? statuses[0] : (statuses.length > 1 ? 'Multiple' : '-');
  const auditStatuses = [...new Set(group.items.map(i => i.auditStatus).filter(Boolean))];
  const displayAuditStatus = auditStatuses.length === 1 ? auditStatuses[0] : (auditStatuses.length > 1 ? 'Multiple' : '-');
  const rectifyStatuses = [...new Set(group.items.map(i => i.rectifyStatus).filter(Boolean))];
  const displayRectifyStatus = rectifyStatuses.length === 1 ? rectifyStatuses[0] : (rectifyStatuses.length > 1 ? 'Multiple' : '-');
  const reAuditStatuses = [...new Set(group.items.map(i => i.reAuditStatus).filter(Boolean))];
  const displayReAuditStatus = reAuditStatuses.length === 1 ? reAuditStatuses[0] : (reAuditStatuses.length > 1 ? 'Multiple' : '-');
  const tallyStatuses = [...new Set(group.items.map(i => i.tallyStatus).filter(Boolean))];
  const displayTallyStatus = tallyStatuses.length === 1 ? tallyStatuses[0] : (tallyStatuses.length > 1 ? 'Multiple' : '-');

  return (
    <tr 
      key={groupKey} 
      onClick={() => toggleGroup(groupKey)}
      className={`${
        activeTab !== 'HISTORY'
          ? 'bg-emerald-50/20 hover:bg-emerald-50/45 border-b border-emerald-100/50 border-l-4 border-l-[#7da23a]'
          : 'bg-purple-50/10 hover:bg-purple-50/30 border-b border-purple-100/50 border-l-4 border-l-purple-500'
      } cursor-pointer select-none transition-colors group`}
    >
      {activeTab === 'HISTORY' ? (
        <td className="sticky left-0 z-10 px-4 py-3 whitespace-nowrap text-xs text-purple-700 font-medium bg-[#fcfaff] group-hover:bg-[#f7f2ff] border-r border-purple-150 border-l-4 border-l-purple-500 transition-colors duration-150">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleGroup(groupKey);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-750 hover:bg-purple-200 text-xs font-bold rounded-full transition-colors border border-purple-300 shadow-xs"
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span>{group.items.length}</span>
            </button>
            <span>{renderCellVal((() => {
              const dates = [...new Set(group.items.map(i => i.completedAt).filter(Boolean))];
              return dates.length === 1 ? dates[0] : (dates.length > 1 ? 'Multiple' : '-');
            })())}</span>
          </div>
        </td>
      ) : visibleColumns.actions && (
        <td className="sticky left-0 z-10 px-4 py-3 whitespace-nowrap bg-[#fbfefd] group-hover:bg-[#f2faf5] border-r border-emerald-100/50 border-l-4 border-l-[#7da23a] transition-colors duration-150">
          <div className="flex items-center gap-2">
            {['RE_AUDIT', 'REAUDIT'].includes(itemStage) && !Boolean(firstItem.debit_note_created || firstItem.debitAmount || firstItem.debitNoteUrl) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingGroupItems(group.items);
                  setEditingRow("group_edit");
                  initializeFormData(itemStage);
                }}
                className="inline-flex items-center px-2.5 py-1.5 bg-linear-to-r from-orange-500 to-amber-600 text-white text-xs font-bold rounded-lg hover:from-orange-600 hover:to-amber-700 transition-all duration-200 shadow-sm hover:shadow whitespace-nowrap cursor-pointer"
              >
                Make Debit Note
              </button>
            )}
            {['RE_AUDIT', 'REAUDIT'].includes(itemStage) && Boolean(firstItem.debit_note_created || firstItem.debitAmount || firstItem.debitNoteUrl) && (
              <span className="inline-flex items-center px-2.5 py-1 bg-green-100 text-green-800 border border-green-300 rounded-lg text-xs font-bold whitespace-nowrap shadow-2xs">
                ✅ Debit Note Created
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingGroupItems(group.items);
                setEditingRow("group_edit");
                initializeFormData(itemStage);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-linear-to-r from-green-500 to-green-600 text-white text-xs font-semibold rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 border border-emerald-500 shadow-xs"
            >
              <Edit2 className="w-3 h-3" />
              <span>Add Entry</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleGroup(groupKey);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#7da23a]/12 text-[#6b8e2f] hover:bg-[#7da23a]/25 text-xs font-bold rounded-full transition-colors border border-[#7da23a]/30 shadow-xs"
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span>{group.items.length}</span>
            </button>
          </div>
        </td>
      )}
      {visibleColumns.stage && (
        <td className="px-4 py-3 whitespace-nowrap">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${stageInfo.color} uppercase tracking-wider`}>
            {StageIcon && <StageIcon className="w-2.5 h-2.5 mr-1" />}
            {stageInfo.name}
          </span>
        </td>
      )}
      {visibleColumns.timestamp && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 font-medium">{renderCellVal(displayDate)}</td>}
      {visibleColumns.indentNumber && <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-emerald-800">{renderCellVal(displayIndent)}</td>}
      {visibleColumns.firmName && <td className="px-4 py-3 whitespace-nowrap text-xs text-emerald-950 font-bold">{renderCellVal(group.firmName)}</td>}
      {visibleColumns.poRate && <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-[#7da23a]">{renderCellVal(displayPoRate)}</td>}
      {visibleColumns.liftNumber && <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-gray-600">{renderCellVal('Multiple')}</td>}
      {visibleColumns.billNo && <td className="px-4 py-3 whitespace-nowrap text-xs text-emerald-950 font-bold">{renderCellVal(group.billNo)}</td>}
      {visibleColumns.dateOfReceiving && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 font-medium">{renderCellVal(displayRecDate)}</td>}
      {visibleColumns.partyName && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 font-semibold">{renderCellVal(displayParty)}</td>}
      {visibleColumns.productName && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 font-medium">{renderCellVal(displayProduct)}</td>}
      {visibleColumns.remarks && (
        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 max-w-xs truncate" title={displayRemarks === 'Multiple' ? 'Multiple remarks across trucks' : displayRemarks}>
          {renderCellVal(displayRemarks)}
        </td>
      )}
      {visibleColumns.auditRemarks && (
        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 max-w-xs truncate" title={displayAuditRemarks === 'Multiple' ? 'Multiple remarks' : displayAuditRemarks}>
          {renderCellVal(displayAuditRemarks)}
        </td>
      )}
      {visibleColumns.rectifyRemarks && (
        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 max-w-xs truncate" title={displayRectifyRemarks === 'Multiple' ? 'Multiple remarks' : displayRectifyRemarks}>
          {renderCellVal(displayRectifyRemarks)}
        </td>
      )}
      {visibleColumns.reauditRemarks && (
        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 max-w-xs truncate" title={displayReauditRemarks === 'Multiple' ? 'Multiple remarks' : displayReauditRemarks}>
          {renderCellVal(displayReauditRemarks)}
        </td>
      )}
      {visibleColumns.tallyRemarks && (
        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 max-w-xs truncate" title={displayTallyRemarks === 'Multiple' ? 'Multiple remarks' : displayTallyRemarks}>
          {renderCellVal(displayTallyRemarks)}
        </td>
      )}
      {visibleColumns.billRemarks && (
        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 max-w-xs truncate" title={displayBillRemarks === 'Multiple' ? 'Multiple remarks' : displayBillRemarks}>
          {renderCellVal(displayBillRemarks)}
        </td>
      )}
      {visibleColumns.qty && <td className="px-4 py-3 whitespace-nowrap text-xs text-emerald-900 font-bold">{renderCellVal(sumField(group.items, 'qty'))}</td>}
      {visibleColumns.areaLifting && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">{renderCellVal(displayArea)}</td>}
      {visibleColumns.truckNo && <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-emerald-800">{group.items.length} Trucks</td>}
      {visibleColumns.transporterName && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 font-medium">{renderCellVal(displayTransporter)}</td>}
      {visibleColumns.transporterRate && <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-orange-600">{renderCellVal(displayTransRate)}</td>}
      {visibleColumns.billImage && <td className="px-4 py-3 whitespace-nowrap text-xs font-medium">{renderCellVal(displayBillImage)}</td>}
      {visibleColumns.biltyNo && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 font-medium">{renderCellVal(displayBiltyNo)}</td>}
      {visibleColumns.typeOfRate && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">{renderCellVal(displayRateType)}</td>}
      {visibleColumns.rate && <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-green-600">{renderCellVal(displayRate)}</td>}
      {visibleColumns.truckQty && <td className="px-4 py-3 whitespace-nowrap text-xs text-emerald-900 font-bold">{renderCellVal(sumField(group.items, 'truckQty'))}</td>}
      {visibleColumns.liftingQty && <td className="px-4 py-3 whitespace-nowrap text-xs text-emerald-900 font-bold">{renderCellVal(sumField(group.items, 'liftingQty'))}</td>}
      {visibleColumns.biltyImage && <td className="px-4 py-3 whitespace-nowrap text-xs font-medium">{renderCellVal(displayBiltyImage)}</td>}
      {visibleColumns.qtyDifferenceStatus && <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-red-600">{renderCellVal(displayQtyDiff)}</td>}
      {visibleColumns.weightSlip && <td className="px-4 py-3 whitespace-nowrap text-xs font-medium">{renderCellVal(displayWeightSlip)}</td>}
      {visibleColumns.debitAmount && <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-red-600">{renderCellVal(sumField(group.items, 'debitAmount') !== '-' ? `₹${sumField(group.items, 'debitAmount')}` : '-')}</td>}
      {visibleColumns.debitNoteUrl && <td className="px-4 py-3 whitespace-nowrap text-xs font-medium">{renderCellVal(displayDebitImage)}</td>}
      {visibleColumns.totalFreight && <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-gray-800">{renderCellVal(displayTotalFreight)}</td>}
      {visibleColumns.auditStatus && <td className="px-4 py-3 whitespace-nowrap">{displayAuditStatus === 'Multiple' ? renderCellVal(displayAuditStatus) : <StatusBadge value={displayAuditStatus} />}</td>}
      {visibleColumns.rectifyStatus && <td className="px-4 py-3 whitespace-nowrap">{displayRectifyStatus === 'Multiple' ? renderCellVal(displayRectifyStatus) : <StatusBadge value={displayRectifyStatus} />}</td>}
      {visibleColumns.reAuditStatus && <td className="px-4 py-3 whitespace-nowrap">{displayReAuditStatus === 'Multiple' ? renderCellVal(displayReAuditStatus) : <StatusBadge value={displayReAuditStatus} />}</td>}
      {visibleColumns.tallyStatus && <td className="px-4 py-3 whitespace-nowrap">{displayTallyStatus === 'Multiple' ? renderCellVal(displayTallyStatus) : <StatusBadge value={displayTallyStatus} />}</td>}
      {visibleColumns.status && (
        <td className="px-4 py-3 whitespace-nowrap">
          {displayStatus === 'Multiple' ? (
            renderCellVal(displayStatus)
          ) : (
            <StatusBadge value={displayStatus} />
          )}
        </td>
      )}
    </tr>
  );
};

// Collapsible Group Sub Row (expanded child under parent row)
export const SubRow = ({
  row,
  subIdx,
  groupIdx,
  visibleColumns,
  STAGES,
  activeTab,
  isSuperAdmin,
  setSuperAdminEditRow
}) => {
  const stageInfo = STAGES[row.currentStage] || {
    name: row.currentStage || 'Unknown',
    color: 'bg-gray-100 text-gray-800',
    icon: null
  };
  const StageIcon = stageInfo.icon;

  return (
    <tr 
      key={row.id} 
      className="bg-slate-50/30 hover:bg-slate-50/80 border-l-4 border-l-slate-200 transition-colors border-b border-gray-100 group"
    >
      {activeTab === 'HISTORY' ? (
        <td className="sticky left-0 z-10 px-4 py-3 whitespace-nowrap text-xs text-purple-700 font-medium pl-6 bg-[#fafbfe] group-hover:bg-[#f1f3f9] border-r border-slate-200/50 border-l-4 border-l-slate-200 transition-colors duration-150">
          <div className="flex items-center gap-1.5 animate-fade-in">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-slate-100 text-purple-600 border border-slate-200/60 font-bold mr-2 text-[10px]">↳</span>
            <span>{row.completedAt || '-'}</span>
            {isSuperAdmin && row.supabaseId && (
              <button
                onClick={() => setSuperAdminEditRow(row)}
                className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 text-[10px] font-medium rounded-md hover:bg-purple-200 border border-purple-300 transition-all duration-200 shadow-2xs"
              >
                <ShieldCheck className="w-2.5 h-2.5 mr-0.5" />
                Edit
              </button>
            )}
          </div>
        </td>
      ) : visibleColumns.actions && (
        <td className="sticky left-0 z-10 px-4 py-3 whitespace-nowrap pl-6 bg-[#fafbfe] group-hover:bg-[#f1f3f9] border-r border-slate-200/50 border-l-4 border-l-slate-200 transition-colors duration-150">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-slate-100 text-[#7da23a] border border-slate-200/60 font-bold mr-2 text-[10px]">↳</span>
            {isSuperAdmin && row.supabaseId && (
              <button
                onClick={() => setSuperAdminEditRow(row)}
                className="inline-flex items-center px-2 py-1.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-lg hover:bg-purple-200 border border-purple-300 transition-all duration-200 shadow-2xs"
              >
                <ShieldCheck className="w-3 h-3 mr-1" />
                Edit
              </button>
            )}
          </div>
        </td>
      )}
      {visibleColumns.stage && (
        <td className="px-4 py-3 whitespace-nowrap">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${stageInfo.color} uppercase tracking-wider`}>
            {StageIcon && <StageIcon className="w-2.5 h-2.5 mr-1" />}
            {stageInfo.name}
          </span>
        </td>
      )}
      {visibleColumns.timestamp && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">{row.timestamp || '-'}</td>}
      {visibleColumns.indentNumber && <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-primary">{row.indentNumber || '-'}</td>}
      {visibleColumns.firmName && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 font-medium">{row.firmName || '-'}</td>}
      {visibleColumns.poRate && <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-[#7da23a]">{row.poRate ? `₹${row.poRate}` : '-'}</td>}
      {visibleColumns.liftNumber && <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-primary">{row.liftNumber || '-'}</td>}
      {visibleColumns.billNo && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">{row.billNo || '-'}</td>}
      {visibleColumns.dateOfReceiving && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">{row.dateOfReceiving || '-'}</td>}
      {visibleColumns.partyName && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700 font-medium">{row.partyName || '-'}</td>}
      {visibleColumns.productName && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">{row.productName || '-'}</td>}
      {visibleColumns.remarks && (
        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 max-w-xs truncate" title={row.remarks}>
          {row.remarks || '-'}
        </td>
      )}
      {visibleColumns.auditRemarks && (
        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 max-w-xs truncate" title={row.auditRemarks}>
          {row.auditRemarks || '-'}
        </td>
      )}
      {visibleColumns.rectifyRemarks && (
        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 max-w-xs truncate" title={row.rectifyRemarks}>
          {row.rectifyRemarks || '-'}
        </td>
      )}
      {visibleColumns.reauditRemarks && (
        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 max-w-xs truncate" title={row.reauditRemarks}>
          {row.reauditRemarks || '-'}
        </td>
      )}
      {visibleColumns.tallyRemarks && (
        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 max-w-xs truncate" title={row.tallyRemarks}>
          {row.tallyRemarks || '-'}
        </td>
      )}
      {visibleColumns.billRemarks && (
        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 max-w-xs truncate" title={row.billRemarks}>
          {row.billRemarks || '-'}
        </td>
      )}
      {visibleColumns.qty && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">{row.qty || '-'}</td>}
      {visibleColumns.areaLifting && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">{row.areaLifting || '-'}</td>}
      {visibleColumns.truckNo && <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-gray-700">{row.truckNo || '-'}</td>}
      {visibleColumns.transporterName && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">{row.transporterName || '-'}</td>}
      {visibleColumns.transporterRate && <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-orange-600">{row.transporterRate ? `₹${row.transporterRate}` : '-'}</td>}
      {visibleColumns.billImage && (
        <td className="px-4 py-3 whitespace-nowrap text-xs">
          {row.billImage ? (
            <a href={row.billImage} target="_blank" rel="noopener noreferrer" className="text-[#7da23a] hover:text-[#6b8e2f] flex items-center font-medium">
              <Image size={14} className="mr-1" /> View
            </a>
          ) : "-"}
        </td>
      )}
      {visibleColumns.biltyNo && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">{row.biltyNo || '-'}</td>}
      {visibleColumns.typeOfRate && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">{row.typeOfRate || '-'}</td>}
      {visibleColumns.rate && <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-green-600">{row.rate ? `₹${row.rate}` : '-'}</td>}
      {visibleColumns.truckQty && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">{row.truckQty || '-'}</td>}
      {visibleColumns.liftingQty && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">{row.liftingQty || '-'}</td>}
      {visibleColumns.biltyImage && (
        <td className="px-4 py-3 whitespace-nowrap text-xs">
          {row.biltyImage ? (
            <a href={row.biltyImage} target="_blank" rel="noopener noreferrer" className="text-[#7da23a] hover:text-[#6b8e2f] flex items-center font-medium">
              <Image size={14} className="mr-1" /> View
            </a>
          ) : "-"}
        </td>
      )}
      {visibleColumns.qtyDifferenceStatus && <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-red-600">{getQtyDifference(row)}</td>}
      {visibleColumns.weightSlip && (
        <td className="px-4 py-3 whitespace-nowrap text-xs">
          {row.weightSlip ? (
            <a href={row.weightSlip} target="_blank" rel="noopener noreferrer" className="text-[#7da23a] hover:text-[#6b8e2f] flex items-center font-medium">
              <Image size={14} className="mr-1" /> View
            </a>
          ) : "-"}
        </td>
      )}
      {visibleColumns.debitAmount && <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-red-600">{row.debitAmount ? `₹${row.debitAmount}` : '-'}</td>}
      {visibleColumns.debitNoteUrl && (
        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
          {row.debitNoteUrl ? (
            <a href={row.debitNoteUrl} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-800 font-medium inline-flex items-center">
              <ExternalLink className="h-3 w-3 mr-1" /> View
            </a>
          ) : "-"}
        </td>
      )}
      {visibleColumns.totalFreight && <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-gray-800">{activeTab === 'REAUDIT' ? '-' : (row.totalFreight ? `₹${row.totalFreight}` : '-')}</td>}
      {visibleColumns.auditStatus && <td className="px-4 py-3 whitespace-nowrap"><StatusBadge value={row.auditStatus} /></td>}
      {visibleColumns.rectifyStatus && <td className="px-4 py-3 whitespace-nowrap"><StatusBadge value={row.rectifyStatus} /></td>}
      {visibleColumns.reAuditStatus && <td className="px-4 py-3 whitespace-nowrap"><StatusBadge value={row.reAuditStatus} /></td>}
      {visibleColumns.tallyStatus && <td className="px-4 py-3 whitespace-nowrap"><StatusBadge value={row.tallyStatus} /></td>}
      {visibleColumns.status && (
        <td className="px-4 py-3 whitespace-nowrap">
          <StatusBadge value={row.status} />
        </td>
      )}
    </tr>
  );
};
