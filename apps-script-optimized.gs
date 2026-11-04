var LIFT_DELAY_PARTIES = [
  'PASSARY MINERALS MADHYA PVT LTD',
  'Passary Minerals Madhya Pvt.Ltd',
  'Passary Minerals Pvt Ltd.'
];

function onOpen() {
  // getUi() only exists when the sheet is opened; running onOpen from the editor has no UI, so skip quietly.
  var ui;
  try { ui = SpreadsheetApp.getUi(); } catch (e) { return; }
  ui
    .createMenu('📊 Purchase FMS Import')
    .addItem('1️⃣ Setup Supabase Credentials', 'promptForCredentials')
    .addItem('2️⃣ Test Connection', 'testConnection')
    .addSeparator()
    .addItem('▶️ Import ALL Steps (Live)', 'importAllSteps')
    .addItem('📦 Import Lift Delay Report (Passary)', 'runLiftDelayReport')
    .addItem('🔵 Refresh Accounts Audit (Live)', 'runAccountsAuditLive')
    .addSeparator()
    .addItem('⏱️ Install 4-Hourly Auto-Refresh', 'installHourlyTrigger')
    .addItem('⏹️ Remove Auto-Refresh', 'removeHourlyTrigger')
    .addToUi();
}

function getSupabaseUrl() {
  var url = PropertiesService.getScriptProperties().getProperty('SUPABASE_URL');
  if (!url) {
    throw new Error('Supabase URL not set. Run menu: 📊 Purchase FMS Import > Setup Supabase Credentials.');
  }
  return url.replace(/\/+$/, '');
}

function getSupabaseKey() {
  var key = PropertiesService.getScriptProperties().getProperty('SUPABASE_KEY');
  if (!key) {
    throw new Error('Supabase Key not set. Run menu: 📊 Purchase FMS Import > Setup Supabase Credentials.');
  }
  return key;
}

function promptForCredentials() {
  var ui = SpreadsheetApp.getUi();
  var props = PropertiesService.getScriptProperties();

  var urlResp = ui.prompt('Supabase Project URL', 'e.g. https://xxxxxxxxx.supabase.co', ui.ButtonSet.OK_CANCEL);
  if (urlResp.getSelectedButton() !== ui.Button.OK) return;
  var url = urlResp.getResponseText().trim();
  if (url) props.setProperty('SUPABASE_URL', url);

  var keyResp = ui.prompt('Supabase API Key', 'anon/public key (needs SELECT access on the app\'s tables)', ui.ButtonSet.OK_CANCEL);
  if (keyResp.getSelectedButton() !== ui.Button.OK) return;
  var key = keyResp.getResponseText().trim();
  if (key) props.setProperty('SUPABASE_KEY', key);

  ui.alert('Saved. Now run "2️⃣ Test Connection", then "▶️ Import ALL Steps (Live)".');
}

function testConnection() {
  try {

    var url = getSupabaseUrl() + '/rest/v1/' + encodeURIComponent('INDENT-PO') + '?select=' + encSelect(['id']) + '&limit=1';
    var res = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { apikey: getSupabaseKey(), Authorization: 'Bearer ' + getSupabaseKey() },
      muteHttpExceptions: true
    });
    var code = res.getResponseCode();
    if (code !== 200 && code !== 206) {
      throw new Error('Supabase error [' + code + ']: ' + res.getContentText().substring(0, 300));
    }
    var rows = JSON.parse(res.getContentText());
    SpreadsheetApp.getUi().alert('✅ Connected to Supabase. Sample fetch returned ' + rows.length + ' row(s) from INDENT-PO.');
  } catch (err) {
    SpreadsheetApp.getUi().alert('❌ Connection failed: ' + err.message);
  }
}

function ident(name) {
  return /^[A-Za-z0-9_]+$/.test(name) ? name : '"' + String(name).replace(/"/g, '""') + '"';
}
function encCol(name) {
  return encodeURIComponent(ident(name));
}
function encSelect(fields) {
  var clean = fields.filter(function (f) { return !!f; });
  return encodeURIComponent(clean.map(ident).join(','));
}

function sbFetchAll(table, params, idCol) {
  // idCol === false: no ORDER BY, i.e. the database's natural row order -- the same order the React pages get.
  var col = idCol || 'id';
  var hasOrder = idCol === false || params.some(function (p) { return p.indexOf('order=') === 0; });
  var orderedParams = hasOrder ? params : params.concat(['order=' + encCol(col) + '.asc']);
  try {
    return sbFetchAllRaw(table, orderedParams);
  } catch (err) {
    if (hasOrder) throw err;

    return sbFetchAllRaw(table, params);
  }
}

function sbFetchAllRaw(table, params) {
  var url = getSupabaseUrl() + '/rest/v1/' + encodeURIComponent(table) + '?' + params.join('&');
  var pageSize = 1000;
  var start = 0;
  var total = null;
  var all = [];
  while (true) {
    var res = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: {
        apikey: getSupabaseKey(),
        Authorization: 'Bearer ' + getSupabaseKey(),
        Range: start + '-' + (start + pageSize - 1),
        Prefer: 'count=exact'
      },
      muteHttpExceptions: true
    });
    var code = res.getResponseCode();
    if (code !== 200 && code !== 206) {
      throw new Error('Supabase error [' + code + '] for table "' + table + '": ' + res.getContentText().substring(0, 300));
    }
    var batch = JSON.parse(res.getContentText());
    all = all.concat(batch);

    var headers = res.getHeaders();
    var contentRange = headers['Content-Range'] || headers['content-range'];
    if (contentRange) {
      var m = String(contentRange).match(/\/(\d+|\*)$/);
      if (m && m[1] !== '*') total = parseInt(m[1], 10);
    }

    if (batch.length === 0) break;
    start += batch.length;
    if (total !== null) {
      if (start >= total) break;
    } else if (batch.length < pageSize) {
      break;
    }
  }
  return all;
}

// Only columns read by the import logic below (all must exist in the DB, or the request fails with 400).
// 'id' is not listed where unused: ORDER BY id works without selecting it. Mismatch keeps 'id' (Debit Note / Purchase Return read it).
var TABLE_SELECT_FIELDS = {
  'INDENT-PO': [
    'Indent Id.', 'po_number', 'Firm Name', 'Generated By', 'Approved Vendor Name', 'Vendor name', 
    'Material', 'Planned1', 'Actual1', 'Planned2', 'Actual2', 'Planned3', 
    'Actual3', 'Planned4', 'Planned5', 'Actual5', 'Planned6', 'Actual6', 
    'Planned7', 'Actual7', 'Planned8', 'Actual8', 'Planned9', 'Actual9', 
    'PlannedLogistics', 'ActualLogistics', 'Transport Type', 'Technical Tag 1', 'Technical Tag 2', 'Technical Tag 3', 
    'Quantity', 'Total Quantity', 'Order Cancel Qty', 'Status', 'Lead Time To Lift (days)'
  ],
  'Mismatch': [
    'id', 'Lift ID', 'Lift Number', 'Party Name', 'Firm Name', 'Product Name', 
    'Timestamp', 'Status', 'Status2', 'Status5', 'Qty', 'Truck Qty', 
    'Lifting Quantity', 'Planned', 'Actual', 'Planned2', 'Actual2', 'Planned3', 
    'Actual3', 'Planned4', 'Actual4', 'Planned5', 'Actual5', 'Planned6', 
    'Actual6', 'Planned8', 'Actual8', 'Bilty No.', 'Bilty Image', 'Transporter Name', 
    'Type', 'Type Of Rate', 'Area Lifting', 'Action Type', 'coordination_status', 'sent_to_pr_at', 
    'Quantity Difference', 'Diff Qty', 'Qty Diff Status', 'Rate Difference', 'Alumina Difference', 'Iron Difference', 
    'AP Difference', 'BD Difference'
  ],
  'LIFT-ACCOUNTS': [
    'Lift No', 'Vendor Name', 'Firm Name', 'Raw Material Name', 'Planned 1', 'Actual 1', 
    'Planned 2', 'Actual 2', 'Planned 3', 'Actual 3', 'Planned 4', 'Actual 4', 
    'Actual Quantity', 'Truck Qty', 'Qty', 'Lifting Qty', 'Area lifting', 'Unload Approval Required', 
    'Unload Approval Status', 'Bilty No.', 'Bilty Image', 'Indent no.', 'Timestamp', 'Date Of Bill', 
    'Transporter Name', 'Type', 'Type Of Transporting Rate', 'Status', 'Physical Condition', 'Moisture', 
    'CRM Status', 'CRM Date', 'Alumina Percent Age %', 'Iron Percent Age %', 'AP Percent Age %', 'BD Percent Age %'
  ],
  'Purchase Returns': [
    'mismatch_id', 'Lift No', 'Party Name', 'Firm Name', 'Product Name', 'Time Stamp', 
    'Purchase Return No.', 'Qty', 'Total Return Qty', 'Return This Time', 'Actual', 'PR Planned', 
    'PR Actual', 'PR Approval Status'
  ],
  'purchaser_coordinates': [
    'mismatch_id', 'po_number', 'type', 'status'
  ],
  'fullkittin': [
    'Lift No', 'Bilty Number', 'Timestamp'
  ]
};

// The React pages read INDENT-PO without ORDER BY and keep the FIRST row of each PO group, so the script must read it
// in the same natural order (ordering by id changes which row is first, and with it the Lift pending count).
var UNORDERED_TABLES = { 'INDENT-PO': true };

var _tableCache = {};
function getFullTable(table, idCol) {
  if (UNORDERED_TABLES[table]) idCol = false;
  if (!_tableCache[table]) {
    var fields = TABLE_SELECT_FIELDS[table];
    if (!fields) throw new Error('No explicit field list configured for table: ' + table);
    _tableCache[table] = sbFetchAll(table, ['select=' + encSelect(fields)], idCol);
  }
  return _tableCache[table];
}

function hasVal(v) { return v !== null && v !== undefined && String(v).trim() !== ''; }
function notNull(v) { return v !== null && v !== undefined; }
function isNull(v) { return v === null || v === undefined; }


function sortByDateDesc(rows, col) {
  return rows.slice().sort(function (a, b) {
    var ta = parseDateAny(a[col]);
    var tb = parseDateAny(b[col]);
    var na = ta ? ta.getTime() : -Infinity;
    var nb = tb ? tb.getTime() : -Infinity;
    return nb - na;
  });
}

function parseDateAny(v) {
  if (v === null || v === undefined || v === '' || v === '-') return null;
  if (v instanceof Date) return v;
  var s = String(v).trim();
  var gviz = s.match(/^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)/);
  if (gviz) {
    return new Date(Number(gviz[1]), Number(gviz[2]), Number(gviz[3]), Number(gviz[4] || 0), Number(gviz[5] || 0), Number(gviz[6] || 0));
  }
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function daysBetween(d1, d2) {
  if (!d1 || !d2) return '';
  return Math.round(((d2.getTime() - d1.getTime()) / 86400000) * 10) / 10;
}

function mkRow(r, refCol, partyCol, firmCol, materialCol, plannedCol, actualCol, subStage, status) {
  var planned = plannedCol ? parseDateAny(r[plannedCol]) : null;
  var actual = actualCol ? parseDateAny(r[actualCol]) : null;
  var delay = status === 'History' ? daysBetween(planned, actual) : (planned ? daysBetween(planned, new Date()) : '');
  return [
    (refCol && r[refCol]) || '-',
    (partyCol && r[partyCol]) || '-',
    (firmCol && r[firmCol]) || '-',
    (materialCol && r[materialCol]) || '-',
    subStage,
    planned || '',
    actual || '',
    delay,
    status
  ];
}

function groupIndentPoRows(rows, keyFn) {
  var seen = {};
  var order = [];
  rows.forEach(function (row) {
    var key = keyFn(row);
    if (!key) return;
    if (!seen[key]) { seen[key] = row; order.push(key); }
  });
  return order.map(function (key) { return seen[key]; });
}

function mkGroupedRow(r, partyCol, firmCol, materialCol, plannedCol, actualCol, subStage, status) {
  var ref = r['po_number'] || r['Indent Id.'] || '-';
  var planned = plannedCol ? parseDateAny(r[plannedCol]) : null;
  var actual = actualCol ? parseDateAny(r[actualCol]) : null;
  var delay = status === 'History' ? daysBetween(planned, actual) : (planned ? daysBetween(planned, new Date()) : '');
  return [
    ref,
    (partyCol && r[partyCol]) || '-',
    (firmCol && r[firmCol]) || '-',
    (materialCol && r[materialCol]) || '-',
    subStage,
    planned || '',
    actual || '',
    delay,
    status
  ];
}

function cleanIndentIdJs(s) {
  return String(s || '').replace(/[^a-zA-Z0-9-]/g, '');
}




var STANDARD_HEADERS = ['Reference No.', 'Party / Vendor', 'Firm Name', 'Material / Item', 'Sub-Stage', 'Planned Date', 'Actual Date', 'Delay (Days)', 'Status'];

function getOrCreateSheet(ss, name) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var safe = String(name).substring(0, 99);
  var sheet = ss.getSheetByName(safe);
  if (!sheet) sheet = ss.insertSheet(safe);
  return sheet;
}

function writeStepSheet(ss, label, rows, extraHeaders) {
  var headers = STANDARD_HEADERS.concat(extraHeaders || []);
  var sheet = getOrCreateSheet(ss, label);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#7da23a').setFontColor('#ffffff');
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  sheet.setFrozenRows(1);
  return sheet;
}

function writeSummarySheet(ss, summary) {
  var sheet = getOrCreateSheet(ss, '📋 Summary');
  sheet.clearContents();
  var headers = ['Step', 'Source', 'Total', 'Pending', 'History', 'Check', 'Last Refreshed'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#6b8e2f').setFontColor('#ffffff');
  var now = new Date();
  var rows = summary.map(function (s) {
    var check = (typeof s.pending === 'number' && typeof s.history === 'number') ? ((s.pending + s.history === s.total) ? 'OK' : 'CHECK') : 'N/A';
    return [s.label, s.source, s.total, s.pending, s.history, check, now];
  });
  if (rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.setFrozenRows(1);
}





var SIMPLE_STEPS = [

  { label: 'HOD Approval', table: 'INDENT-PO', plannedCol: 'Planned1', actualCol: 'Actual1', refCol: 'Indent Id.', partyCol: 'Generated By', firmCol: 'Firm Name', materialCol: 'Material' },

  { label: 'Three Party', table: 'INDENT-PO', plannedCol: 'Planned6', actualCol: 'Actual6', refCol: 'Indent Id.', partyCol: 'Approved Vendor Name', firmCol: 'Firm Name', materialCol: 'Material' },

  { label: 'Factory App.', table: 'INDENT-PO', plannedCol: 'Planned7', actualCol: 'Actual7', refCol: 'Indent Id.', partyCol: 'Approved Vendor Name', firmCol: 'Firm Name', materialCol: 'Material' }
];

function importSimpleStep(ss, cfg) {
  var all = getFullTable(cfg.table);
  var pending = all.filter(function (r) { return hasVal(r[cfg.plannedCol]) && !hasVal(r[cfg.actualCol]); });
  var history = all.filter(function (r) { return hasVal(r[cfg.plannedCol]) && hasVal(r[cfg.actualCol]); });
  var rows = [];
  pending.forEach(function (r) { rows.push(mkRow(r, cfg.refCol, cfg.partyCol, cfg.firmCol, cfg.materialCol, cfg.plannedCol, cfg.actualCol, cfg.label.trim(), 'Pending')); });
  history.forEach(function (r) { rows.push(mkRow(r, cfg.refCol, cfg.partyCol, cfg.firmCol, cfg.materialCol, cfg.plannedCol, cfg.actualCol, cfg.label.trim(), 'History')); });
  writeStepSheet(ss, cfg.label.trim(), rows);
  return { label: cfg.label.trim(), source: cfg.table, total: pending.length + history.length, pending: pending.length, history: history.length };
}


function importArrangeLogistics(ss) {
  var all = getFullTable('INDENT-PO').filter(function (r) { return r['Transport Type'] === 'Ex-Factory'; });
  var groups = groupIndentPoRows(all, function (r) { return String(r['po_number'] || r['Indent Id.'] || '').trim(); });
  var pending = groups.filter(function (r) { return r['PlannedLogistics'] && !r['ActualLogistics'] && !r['Planned9'] && r['Actual2']; });
  var history = groups.filter(function (r) { return r['ActualLogistics'] || r['Planned9']; });
  var rows = [];
  pending.forEach(function (r) { rows.push(mkGroupedRow(r, 'Vendor name', 'Firm Name', 'Material', 'PlannedLogistics', null, 'Arrange Logistics', 'Pending')); });
  history.forEach(function (r) { rows.push(mkGroupedRow(r, 'Vendor name', 'Firm Name', 'Material', 'PlannedLogistics', 'ActualLogistics', 'Arrange Logistics', 'History')); });
  writeStepSheet(ss, 'Arrange Logistics', rows);
  return { label: 'Arrange Logistics', source: 'INDENT-PO (grouped by PO)', total: pending.length + history.length, pending: pending.length, history: history.length };
}

function importLogisticsApproval(ss) {
  var all = getFullTable('INDENT-PO');
  var groups = groupIndentPoRows(all, function (r) { return String(r['po_number'] || r['Indent Id.'] || '').trim(); });
  var pending = groups.filter(function (r) { return r['Planned9'] && !r['ActualLogistics']; });
  var history = groups.filter(function (r) { return r['Actual9']; });
  var rows = [];
  pending.forEach(function (r) { rows.push(mkGroupedRow(r, 'Vendor name', 'Firm Name', 'Material', 'Planned9', null, 'Logistics App.', 'Pending')); });
  history.forEach(function (r) { rows.push(mkGroupedRow(r, 'Vendor name', 'Firm Name', 'Material', 'Planned9', 'Actual9', 'Logistics App.', 'History')); });
  writeStepSheet(ss, 'Logistics App.', rows);
  return { label: 'Logistics App.', source: 'INDENT-PO (grouped by PO)', total: pending.length + history.length, pending: pending.length, history: history.length };
}

function importMgmtApp(ss) {
  var all = getFullTable('INDENT-PO');
  var pendingAll = all.filter(function (r) { return notNull(r['Planned8']) && isNull(r['Actual8']); });
  var pending = pendingAll.filter(function (r) { return r['Technical Tag 1'] || r['Technical Tag 2'] || r['Technical Tag 3']; });
  var history = all.filter(function (r) { return notNull(r['Actual8']); });
  var rows = [];
  pending.forEach(function (r) { rows.push(mkRow(r, 'Indent Id.', 'Approved Vendor Name', 'Firm Name', 'Material', 'Planned8', null, 'Mgmt App.', 'Pending')); });
  history.forEach(function (r) { rows.push(mkRow(r, 'Indent Id.', 'Approved Vendor Name', 'Firm Name', 'Material', 'Planned8', 'Actual8', 'Mgmt App.', 'History')); });
  writeStepSheet(ss, 'Mgmt App.', rows);
  return { label: 'Mgmt App.', source: 'INDENT-PO', total: pending.length + history.length, pending: pending.length, history: history.length };
}

function importPoEntry(ss) {
  var all = getFullTable('INDENT-PO').filter(function (r) { return notNull(r['Planned3']); });
  var groups = groupIndentPoRows(all, function (r) { return cleanIndentIdJs(r['po_number'] || r['Indent Id.'] || ''); });
  var eligible = groups.filter(function (r) {
    var isForTransport = String(r['Transport Type'] || '').trim().toUpperCase() === 'FOR';
    return isForTransport || (r['ActualLogistics'] && String(r['ActualLogistics']).trim() !== '');
  });
  var pending = eligible.filter(function (r) { return r['Planned3'] && !r['Actual3']; });
  var history = eligible.filter(function (r) { return r['Planned3'] && r['Actual3']; });
  var rows = [];
  pending.forEach(function (r) { rows.push(mkGroupedRow(r, 'Vendor name', 'Firm Name', 'Material', 'Planned3', null, 'PO Entry', 'Pending')); });
  history.forEach(function (r) { rows.push(mkGroupedRow(r, 'Vendor name', 'Firm Name', 'Material', 'Planned3', 'Actual3', 'PO Entry', 'History')); });
  writeStepSheet(ss, 'PO Entry', rows);
  return { label: 'PO Entry', source: 'INDENT-PO (grouped by PO)', total: pending.length + history.length, pending: pending.length, history: history.length };
}

function importAdvancePayment(ss) {
  var seen = {};
  var groups = [];
  getFullTable('INDENT-PO').forEach(function (r) {
    if (isNull(r['Planned5'])) return;
    var key = String(r['po_number'] || r['Indent Id.'] || '').trim();
    if (seen[key]) return;
    seen[key] = true;
    groups.push(r);
  });
  groups = groups.filter(function (r) { return cleanIndentIdJs(r['Indent Id.']); });
  var isSet = function (v) { return v && String(v).trim() !== '' && String(v).trim() !== '-'; };
  var pending = groups.filter(function (r) { return isSet(r['Planned5']) && !isSet(r['Actual5']); });
  var history = groups.filter(function (r) { return isSet(r['Planned5']) && isSet(r['Actual5']); });
  var rows = [];
  pending.forEach(function (r) { rows.push(mkGroupedRow(r, 'Vendor name', 'Firm Name', 'Material', 'Planned5', null, 'Advance Payement', 'Pending')); });
  history.forEach(function (r) { rows.push(mkGroupedRow(r, 'Vendor name', 'Firm Name', 'Material', 'Planned5', 'Actual5', 'Advance Payement', 'History')); });
  writeStepSheet(ss, 'Advance Payement', rows);
  return { label: 'Advance Payement', source: 'INDENT-PO (grouped by PO)', total: pending.length + history.length, pending: pending.length, history: history.length };
}

function importBilty(ss) {
  var allLifts = getFullTable('LIFT-ACCOUNTS');

  var liftMap = {};
  allLifts.forEach(function (r) {
    var liftNo = String(r['Lift No'] || '').trim();
    if (liftNo) liftMap[liftNo] = r;
  });

  var eligibleFromLift = allLifts.filter(function (r) {
    var firm = String(r['Firm Name'] || '').trim().toUpperCase();
    var transporter = String(r['Transporter Name'] || '').trim().toUpperCase();
    if (transporter === 'FOR' || transporter === 'OWNED TRUCK' || transporter === 'BY COMPANY') return false;
    if ((firm === 'RKL' || firm === 'PURAB') && transporter === 'FOR') return false;
    if ((firm === 'PMMPL' || firm === 'PMPL') && (transporter === 'EX FACTORY TRANSPORTER' || transporter === 'EX FACTORY')) return false;
    return true;
  });

  var ackMismatchRows = getFullTable('Mismatch').filter(function (row) {
    return String(row['Status'] || '').toLowerCase() === 'acknowledge';
  });
  var acknowledgedRows = ackMismatchRows.map(function (row) {
    var liftNo = String(row['Lift Number'] || row['Lift ID'] || '').trim();
    var liftRecord = liftMap[liftNo] || {};
    var biltyNumber = String(row['Bilty No.'] || liftRecord['Bilty No.'] || '').trim();
    var biltyImageUrl = String(row['Bilty Image'] || liftRecord['Bilty Image'] || '').trim();

    var plannedVal = row['Timestamp'] || row['Planned2'] || liftRecord['Planned 3'];

    var actualVal = liftRecord['Actual 3'] || liftRecord['Date Of Bill'] || row['Planned2'] || row['Timestamp'];
    return {
      liftNo: liftNo,
      vendorName: String(row['Party Name'] || liftRecord['Vendor Name'] || '').trim(),
      firmName: String(row['Firm Name'] || liftRecord['Firm Name'] || '').trim(),
      materialName: String(row['Product Name'] || liftRecord['Raw Material Name'] || '').trim(),
      transporterName: String(row['Transporter Name'] || liftRecord['Transporter Name'] || '').trim(),
      isPending: !biltyNumber || !biltyImageUrl,
      isHistory: !!(biltyNumber && biltyImageUrl),
      plannedVal: plannedVal,
      actualVal: actualVal
    };
  }).filter(function (r) {
    if (!r.liftNo) return false;
    var t = String(r.transporterName || '').trim().toUpperCase();
    return !(t === 'FOR' || t === 'OWNED TRUCK' || t === 'BY COMPANY');
  });

  var ackIds = {};
  acknowledgedRows.forEach(function (r) { ackIds[r.liftNo] = true; });
  var eligibleFromLiftFinal = eligibleFromLift.filter(function (r) { return !ackIds[String(r['Lift No'] || '').trim()]; });

  var rows = [];
  var pendingCount = 0, historyCount = 0;
  eligibleFromLiftFinal.forEach(function (r) {
    if (r['Planned 3'] && !r['Actual 3'] && !r['Bilty No.']) {
      rows.push(mkRow(r, 'Lift No', 'Vendor Name', 'Firm Name', 'Raw Material Name', 'Planned 3', null, 'Bilty', 'Pending'));
      pendingCount++;
    } else if (r['Planned 3'] && (r['Actual 3'] || r['Bilty No.'])) {

      var planned = parseDateAny(r['Planned 3']);
      var actual = parseDateAny(r['Actual 3'] || r['Date Of Bill']);
      var delay = daysBetween(planned, actual);
      rows.push([r['Lift No'] || '-', r['Vendor Name'] || '-', r['Firm Name'] || '-', r['Raw Material Name'] || '-', 'Bilty', planned || '', actual || '', delay, 'History']);
      historyCount++;
    }
  });
  acknowledgedRows.forEach(function (r) {
    var status = r.isPending ? 'Pending' : 'History';
    var planned = parseDateAny(r.plannedVal);
    var actual = status === 'History' ? parseDateAny(r.actualVal) : null;
    var delay = status === 'History' ? daysBetween(planned, actual) : (planned ? daysBetween(planned, new Date()) : '');
    rows.push([r.liftNo, r.vendorName || '-', r.firmName || '-', r.materialName || '-', 'Bilty', planned || '', actual || '', delay, status]);
    if (r.isPending) pendingCount++; else historyCount++;
  });

  writeStepSheet(ss, 'Bilty', rows);
  return { label: 'Bilty', source: 'LIFT-ACCOUNTS + Mismatch (Acknowledge)', total: pendingCount + historyCount, pending: pendingCount, history: historyCount };
}

function importLab(ss) {
  var all = getFullTable('LIFT-ACCOUNTS');
  var pending = all.filter(function (r) {
    var needsUnloadApproval = String(r['Unload Approval Required'] || '').trim().toLowerCase() === 'yes';
    var unloadStatus = String(r['Unload Approval Status'] || '').trim().toLowerCase();
    var isUnloadApproved = unloadStatus === 'approved' || unloadStatus === 'completed';
    var isDirectSupply = String(r['Area lifting'] || '').trim() === 'Direct Supply To Party';
    return hasVal(r['Planned 2']) && !hasVal(r['Actual 2']) && (!needsUnloadApproval || isUnloadApproved) && !isDirectSupply;
  });
  var history = all.filter(function (r) { return hasVal(r['Actual 2']); });
  var rows = [];
  pending.forEach(function (r) { rows.push(mkRow(r, 'Lift No', 'Vendor Name', 'Firm Name', 'Raw Material Name', 'Planned 2', null, 'Lab', 'Pending')); });
  history.forEach(function (r) { rows.push(mkRow(r, 'Lift No', 'Vendor Name', 'Firm Name', 'Raw Material Name', 'Planned 2', 'Actual 2', 'Lab', 'History')); });
  writeStepSheet(ss, 'Lab', rows);
  return { label: 'Lab', source: 'LIFT-ACCOUNTS', total: pending.length + history.length, pending: pending.length, history: history.length };
}

function importReceipt(ss) {
  var downstreamCompletedLiftNos = {};
  getFullTable('Mismatch').forEach(function (r) {
    var liftNo = String(r['Lift Number'] || r['Lift ID'] || '').trim();
    if (liftNo && r['Actual6']) downstreamCompletedLiftNos[liftNo] = true;
  });
  getFullTable('fullkittin').forEach(function (r) {
    var liftNo = String(r['Lift No'] || '').trim();
    if (liftNo) downstreamCompletedLiftNos[liftNo] = true;
  });

  var pending = [];
  var history = [];
  getFullTable('LIFT-ACCOUNTS').forEach(function (r) {
    var hasDownstream = !!downstreamCompletedLiftNos[String(r['Lift No'] || '').trim()];
    var actual1 = r['Actual 1'];
    var status = String(r['Unload Approval Status'] || '').trim();
    var required = String(r['Unload Approval Required'] || '').trim();
    var hasMovedToLab = !!(r['Planned 2'] || r['Actual 2']);
    var hasStaleMissingReceipt = !actual1 && hasDownstream;
    var crmStatus = r['CRM Status'];
    var isCrmCleared = String(r['Area lifting'] || '').trim() === 'Factory' ||
      (crmStatus !== 'Rejected' && !!(crmStatus === 'Approved' || actual1 || hasDownstream || (!crmStatus && (r['CRM Date'] || r['Actual 4']))));

    var isPendingMatch = r['Planned 1'] && isCrmCleared && !hasMovedToLab && !hasStaleMissingReceipt &&
      (!actual1 || status === 'Pending' || (status === 'Approved' && required === 'Yes'));
    var isHistoryMatch = actual1 && (status === 'Rejected' || status === 'Completed' ||
      (status === 'Approved' && (required !== 'Yes' || hasMovedToLab)));

    if (isPendingMatch) pending.push(r);
    if (isHistoryMatch) history.push(r);
  });

  var rows = [];
  pending.forEach(function (r) { rows.push(mkRow(r, 'Lift No', 'Vendor Name', 'Firm Name', 'Raw Material Name', 'Planned 1', null, 'Receipt', 'Pending')); });
  history.forEach(function (r) { rows.push(mkRow(r, 'Lift No', 'Vendor Name', 'Firm Name', 'Raw Material Name', 'Planned 1', 'Actual 1', 'Receipt', 'History')); });
  writeStepSheet(ss, 'Receipt', rows);
  return { label: 'Receipt', source: 'LIFT-ACCOUNTS + Mismatch + fullkittin', total: pending.length + history.length, pending: pending.length, history: history.length };
}

function makeLiftItemKey(poNumber, material, uniqueId) {
  var baseKey = String(poNumber || '').trim() + '::' + String(material || '').trim().toLowerCase();
  return uniqueId ? baseKey + '::' + uniqueId : baseKey;
}

function roundQty(v) { return Number((parseFloat(v) || 0).toFixed(3)); }

function normalizePoItemsJs(poNumber, primaryRow, allItems, liftedQtyByItem, liftedQtyByBaseItem) {
  var fallbackMaterial = String(primaryRow['Material'] || '').trim();
  var fallbackQuantity = parseFloat(primaryRow['Quantity'] || primaryRow['Total Quantity']) || 0;
  var rawItems = allItems.length ? allItems : [{ material: fallbackMaterial, quantity: fallbackQuantity, orderCancelQty: 0, indentId: '' }];
  var itemName = function (item, index) { return String(item.material || fallbackMaterial || ('Product ' + (index + 1))).trim(); };

  var nameCounts = {};
  rawItems.forEach(function (item, index) {
    var n = itemName(item, index).toLowerCase();
    nameCounts[n] = (nameCounts[n] || 0) + 1;
  });
  var pick = function (a, b) { return a !== undefined ? a : (b !== undefined ? b : 0); };

  return rawItems.map(function (item, index) {
    var materialName = itemName(item, index);
    var aggregationKey = makeLiftItemKey(poNumber, materialName);
    var key = makeLiftItemKey(poNumber, materialName, item.indentId || index);
    var maxQuantity = parseFloat(item.quantity || fallbackQuantity) || 0;
    var lifted;
    if (nameCounts[materialName.toLowerCase()] === 1) lifted = pick(liftedQtyByBaseItem[aggregationKey], liftedQtyByItem[key]);
    else if (item.indentId) lifted = liftedQtyByItem[key] !== undefined ? liftedQtyByItem[key] : 0;
    else lifted = pick(liftedQtyByItem[key], liftedQtyByBaseItem[aggregationKey]);
    var pendingQuantity = Math.max(0, roundQty(maxQuantity - roundQty(lifted) - (item.orderCancelQty || 0)));
    return { pendingQuantity: pendingQuantity };
  });
}

function importLift(ss) {
  var pAll = getFullTable('INDENT-PO').filter(function (r) { return notNull(r['Planned4']); });

  var validRows = pAll.filter(function (r) {
    var status = String(r['Status'] || '').trim().toLowerCase();
    var planned4 = r['Planned4'];
    return (status === '' || status === 'pending') && planned4 !== null && planned4 !== '';
  });

  var indentToPoMap = {};
  pAll.forEach(function (r) {
    var indent = String(r['Indent Id.'] || '').trim();
    var poNumber = String(r['po_number'] || indent).trim();
    if (indent) indentToPoMap[indent] = poNumber;
  });

  var liftRows = getFullTable('LIFT-ACCOUNTS');
  var liftedQtyByItem = {};
  var liftedQtyByBaseItem = {};
  liftRows.forEach(function (r) {
    var indent = String(r['Indent no.'] || '').trim();
    var poNumber = indentToPoMap[indent] || indent;
    var qty = parseFloat(r['Lifting Qty']) || 0;
    var material = String(r['Raw Material Name'] || '').trim();
    if (poNumber && material) {
      var itemKey = makeLiftItemKey(poNumber, material, indent);
      liftedQtyByItem[itemKey] = (liftedQtyByItem[itemKey] || 0) + qty;
      var baseKey = makeLiftItemKey(poNumber, material);
      liftedQtyByBaseItem[baseKey] = (liftedQtyByBaseItem[baseKey] || 0) + qty;
    }
  });

  var groups = {};
  var groupOrder = [];
  validRows.forEach(function (row) {
    var indentId = String(row['Indent Id.'] || '').trim();
    var poNumber = String(row['po_number'] || indentId).trim();
    var groupKey = poNumber || indentId;
    if (!groupKey) return;
    if (!groups[groupKey]) {
      groups[groupKey] = { primaryRow: row, allItems: [] };
      groupOrder.push(groupKey);
    }
    groups[groupKey].allItems.push({
      indentId: indentId,
      material: String(row['Material'] || '').trim(),
      quantity: parseFloat(row['Quantity'] || row['Total Quantity']) || 0,
      orderCancelQty: parseFloat(row['Order Cancel Qty']) || 0
    });
  });

  var pending = [];
  groupOrder.forEach(function (groupKey) {
    var g = groups[groupKey];
    var row = g.primaryRow;
    var poNumber = String(row['po_number'] || row['Indent Id.'] || '').trim();
    var items = normalizePoItemsJs(poNumber, row, g.allItems, liftedQtyByItem, liftedQtyByBaseItem);
    var pendingQuantity = items.reduce(function (sum, item) { return sum + item.pendingQuantity; }, 0);
    pendingQuantity = roundQty(pendingQuantity);
    if (pendingQuantity > 0) pending.push(row);
  });

  // Delivery Date = the PO's 'Lead Time To Lift (days)' date part, as the Lift page shows it.
  var deliveryDate = function (v) { return v ? (parseDateAny(String(v).trim().split(' ')[0].split('T')[0]) || '') : ''; };
  var planned4ByIndent = {}, deliveryByIndent = {};
  // Older lifts saved the PO number (not the RI id) in 'Indent no.', so index each PO row under both keys.
  pAll.forEach(function (r) {
    [String(r['Indent Id.'] || '').trim(), String(r['po_number'] || '').trim()].forEach(function (key) {
      if (!key || planned4ByIndent[key]) return;
      planned4ByIndent[key] = r['Planned4'];
      deliveryByIndent[key] = deliveryDate(r['Lead Time To Lift (days)']);
    });
  });
  var history = sortByDateDesc(getFullTable('LIFT-ACCOUNTS'), 'Timestamp');
  var rows = [];
  pending.forEach(function (r) { rows.push(mkGroupedRow(r, 'Vendor name', 'Firm Name', 'Material', 'Planned4', null, 'Lift', 'Pending').concat([deliveryDate(r['Lead Time To Lift (days)'])])); });
  history.forEach(function (r) {
    var planned = parseDateAny(planned4ByIndent[String(r['Indent no.'] || '').trim()]);
    var actual = parseDateAny(r['Timestamp']);
    rows.push([r['Lift No'] || '-', r['Vendor Name'] || '-', r['Firm Name'] || '-', r['Raw Material Name'] || '-', 'Lift', planned || '', actual || '', planned ? daysBetween(planned, actual) : '', 'History', deliveryByIndent[String(r['Indent no.'] || '').trim()] || '']);
  });
  writeStepSheet(ss, 'Lift', rows, ['Delivery Date']);
  return { label: 'Lift', source: 'INDENT-PO (grouped by PO, per-item ledger) + LIFT-ACCOUNTS', total: pending.length + history.length, pending: pending.length, history: history.length };
}




function importLiftDelayReport(ss) {
  var pAll = getFullTable('INDENT-PO').filter(function (r) {
    return notNull(r['Planned4']) && LIFT_DELAY_PARTIES.indexOf(r['Vendor name']) !== -1;
  });

  var validRows = pAll.filter(function (r) {
    var status = String(r['Status'] || '').trim().toLowerCase();
    var planned4 = r['Planned4'];
    return (status === '' || status === 'pending') && planned4 !== null && planned4 !== '';
  });

  var indentToPoMap = {};
  var planned4ByIndent = {}, deliveryByIndent = {};
  var deliveryDate = function (v) { return v ? (parseDateAny(String(v).trim().split(' ')[0].split('T')[0]) || '') : ''; };
  pAll.forEach(function (r) {
    var indent = String(r['Indent Id.'] || '').trim();
    var poNumber = String(r['po_number'] || indent).trim();
    if (indent) {
      indentToPoMap[indent] = poNumber;
      planned4ByIndent[indent] = r['Planned4'];
      deliveryByIndent[indent] = deliveryDate(r['Lead Time To Lift (days)']);
    }
    // Older lifts saved the PO number in 'Indent no.'.
    var poKey = String(r['po_number'] || '').trim();
    if (poKey && !planned4ByIndent[poKey]) {
      planned4ByIndent[poKey] = r['Planned4'];
      deliveryByIndent[poKey] = deliveryDate(r['Lead Time To Lift (days)']);
    }
  });

  var liftRows = getFullTable('LIFT-ACCOUNTS');
  var liftedQtyByItem = {};
  var liftedQtyByBaseItem = {};
  liftRows.forEach(function (r) {
    var indent = String(r['Indent no.'] || '').trim();
    var poNumber = indentToPoMap[indent] || indent;
    var qty = parseFloat(r['Lifting Qty']) || 0;
    var material = String(r['Raw Material Name'] || '').trim();
    if (poNumber && material) {
      var itemKey = makeLiftItemKey(poNumber, material, indent);
      liftedQtyByItem[itemKey] = (liftedQtyByItem[itemKey] || 0) + qty;
      var baseKey = makeLiftItemKey(poNumber, material);
      liftedQtyByBaseItem[baseKey] = (liftedQtyByBaseItem[baseKey] || 0) + qty;
    }
  });

  var groups = {};
  var groupOrder = [];
  validRows.forEach(function (row) {
    var indentId = String(row['Indent Id.'] || '').trim();
    var poNumber = String(row['po_number'] || indentId).trim();
    var groupKey = poNumber || indentId;
    if (!groupKey) return;
    if (!groups[groupKey]) {
      groups[groupKey] = { primaryRow: row, allItems: [] };
      groupOrder.push(groupKey);
    }
    groups[groupKey].allItems.push({
      indentId: indentId,
      material: String(row['Material'] || '').trim(),
      quantity: parseFloat(row['Quantity'] || row['Total Quantity']) || 0,
      orderCancelQty: parseFloat(row['Order Cancel Qty']) || 0
    });
  });

  var pending = [];
  groupOrder.forEach(function (groupKey) {
    var g = groups[groupKey];
    var row = g.primaryRow;
    var poNumber = String(row['po_number'] || row['Indent Id.'] || '').trim();
    var items = normalizePoItemsJs(poNumber, row, g.allItems, liftedQtyByItem, liftedQtyByBaseItem);
    var pendingQuantity = items.reduce(function (sum, item) { return sum + item.pendingQuantity; }, 0);
    pendingQuantity = roundQty(pendingQuantity);
    if (pendingQuantity > 0) pending.push(row);
  });

  var history = sortByDateDesc(
    getFullTable('LIFT-ACCOUNTS').filter(function (r) { return LIFT_DELAY_PARTIES.indexOf(r['Vendor Name']) !== -1; }),
    'Timestamp'
  );

  var rows = [];
  pending.forEach(function (r) { rows.push(mkGroupedRow(r, 'Vendor name', 'Firm Name', 'Material', 'Planned4', null, 'Lift Delay Report', 'Pending').concat([deliveryDate(r['Lead Time To Lift (days)'])])); });
  history.forEach(function (r) {
    var indent = String(r['Indent no.'] || '').trim();
    var planned = parseDateAny(planned4ByIndent[indent]);
    var actual = parseDateAny(r['Timestamp']);
    var delay = planned ? daysBetween(planned, actual) : '';
    rows.push([r['Lift No'] || '-', r['Vendor Name'] || '-', r['Firm Name'] || '-', r['Raw Material Name'] || '-', 'Lift Delay Report', planned || '', actual || '', delay, 'History', deliveryByIndent[indent] || '']);
  });

  writeStepSheet(ss, 'Lift Delay Report', rows, ['Delivery Date']);
  return { label: 'Lift Delay Report', source: 'INDENT-PO + LIFT-ACCOUNTS (Passary vendor variants only)', total: pending.length + history.length, pending: pending.length, history: history.length };
}

function runLiftDelayReport() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  try {
    var result = importLiftDelayReport(ss);
    SpreadsheetApp.getUi().alert('✅ "Lift Delay Report" refreshed — ' + result.total + ' row(s) (' + result.pending + ' pending, ' + result.history + ' history).');
  } catch (err) {
    SpreadsheetApp.getUi().alert('❌ Import failed: ' + err.message);
    throw err;
  }
}

function importCrm(ss) {
  var all = getFullTable('LIFT-ACCOUNTS').filter(function (r) { return r['Area lifting'] === 'Direct Supply To Party'; });
  var rows = [];
  var pendingCount = 0, historyCount = 0;
  all.forEach(function (r) {
    var isCompleted = !!(r['CRM Date'] || r['Actual 1'] || r['Actual 4']);
    var planned = parseDateAny(r['Planned 4'] || r['Timestamp']);
    var actual = isCompleted ? parseDateAny(r['CRM Date'] || r['Actual 4'] || r['Actual 1']) : null;
    var status = isCompleted ? 'History' : 'Pending';
    var delay = isCompleted ? daysBetween(planned, actual) : (planned ? daysBetween(planned, new Date()) : '');
    rows.push([r['Lift No'] || '-', r['Vendor Name'] || '-', r['Firm Name'] || '-', r['Raw Material Name'] || '-', 'CRM Dispatch', planned || '', actual || '', delay, status]);
    if (isCompleted) historyCount++; else pendingCount++;
  });
  writeStepSheet(ss, 'CRM Dispatch & Tracking', rows);
  return { label: 'CRM Dispatch & Tracking', source: 'LIFT-ACCOUNTS (Direct Supply To Party only)', total: pendingCount + historyCount, pending: pendingCount, history: historyCount };
}

function computeMismatchTypes(mismatchItem, liftMap, tlMap) {
  var liftNo = String(mismatchItem['Lift Number'] || mismatchItem['Lift ID'] || '').trim();
  var lift = liftMap[liftNo] || {};
  var tlKey = String(mismatchItem['Product Name'] || lift['Raw Material Name'] || '').trim().toLowerCase();
  var tlRow = tlMap[tlKey] || {};

  var rateTypeStr = String(lift['Type Of Transporting Rate'] || mismatchItem['Type Of Rate'] || mismatchItem['Type Of Transporting Rate'] || '').toUpperCase();
  var liftTypeStr = String(lift['Type'] || mismatchItem['Type'] || '').toUpperCase();
  var isTransporter = rateTypeStr.indexOf('TO PAY') !== -1 || liftTypeStr.indexOf('TRANSPORTER') !== -1;

  var baseBillQty = parseFloat(lift['Lifting Qty'] || lift['Qty']) || 0;
  var isKG = baseBillQty > 500;
  var multiplier = isKG ? 1000 : 1;
  var tolerance = isTransporter ? (-0.10 * multiplier) : (-0.05 * multiplier);

  var hasRate = Math.abs(parseFloat(mismatchItem['Rate Difference']) || 0) > 0.001;
  var qtyDiff = parseFloat(mismatchItem['Quantity Difference']) || 0;
  var diffQty = parseFloat(mismatchItem['Diff Qty']) || 0;
  var hasQty = (qtyDiff < tolerance) || (diffQty < tolerance) || (mismatchItem['Qty Diff Status'] === 'Mismatch' && qtyDiff < tolerance);

  var aluminaDiff = mismatchItem['Alumina Difference'];
  var ironDiff = mismatchItem['Iron Difference'];
  var apDiff = mismatchItem['AP Difference'];
  var bdDiff = mismatchItem['BD Difference'];
  var hasAluminaStored = aluminaDiff !== null && aluminaDiff !== undefined && Math.abs(parseFloat(aluminaDiff) || 0) > 0;
  var hasIronStored = ironDiff !== null && ironDiff !== undefined && Math.abs(parseFloat(ironDiff) || 0) > 0;
  var hasApStored = apDiff !== null && apDiff !== undefined && Math.abs(parseFloat(apDiff) || 0) > 0;
  var hasBdStored = bdDiff !== null && bdDiff !== undefined && Math.abs(parseFloat(bdDiff) || 0) > 0;

  var labAluminaVal = parseFloat(lift['Alumina Percent Age %']);
  var labIronVal = parseFloat(lift['Iron Percent Age %']);
  var labApVal = parseFloat(lift['AP Percent Age %']);
  var labBdVal = parseFloat(lift['BD Percent Age %']);
  var tlAluminaMinVal = parseFloat(tlRow['TL Alumina']);
  var tlIronMaxVal = parseFloat(tlRow['TL Iron']);
  var tlApMaxVal = parseFloat(tlRow['AP%']);
  var tlBdMinVal = parseFloat(tlRow['BD%']);

  var hasAluminaLive = !isNaN(labAluminaVal) && !isNaN(tlAluminaMinVal) && labAluminaVal < tlAluminaMinVal;
  var hasIronLive = !isNaN(labIronVal) && !isNaN(tlIronMaxVal) && labIronVal > tlIronMaxVal;
  var hasApLive = !isNaN(labApVal) && !isNaN(tlApMaxVal) && labApVal > tlApMaxVal;
  var hasBdLive = !isNaN(labBdVal) && !isNaN(tlBdMinVal) && labBdVal < tlBdMinVal;

  var hasAlumina = hasAluminaStored || hasAluminaLive;
  var hasIron = hasIronStored || hasIronLive;
  var hasAp = hasApStored || hasApLive;
  var hasBd = hasBdStored || hasBdLive;

  var isRejected = String(lift['Status'] || '').trim().toLowerCase() === 'rejected';
  var hasLab = hasAlumina || hasIron || hasAp || hasBd || isRejected ||
    (String(lift['Physical Condition'] || '').trim() === 'Bad' && String(lift['Moisture'] || '').trim() === 'Yes');

  var types = [];
  if (hasRate) types.push('rate');
  if (hasQty) types.push('quantity');
  if (hasLab) types.push('lab');
  return types;
}

function importMismatchStep(ss) {

  var all = getFullTable('Mismatch');

  var pendingExcludeSet = { 'Credit Notes': 1, 'Others': 1, 'Purchase Return': 1, 'Acknowledge': 1, 'Completed': 1, 'Resolved - Return': 1 };
  var historyExcludeSet = { 'Pending': 1, 'Not Done': 1 };
  var pendingCandidates = all.filter(function (r) { return !pendingExcludeSet[r['Status']]; });
  // Rows sent via 'To PR' keep Status 'Purchase Return' but still belong in history.
  var historyRows = all.filter(function (r) { return !historyExcludeSet[r['Status']] && (r['Status'] !== 'Purchase Return' || r['sent_to_pr_at']); });

  var liftRows = getFullTable('LIFT-ACCOUNTS');
  var liftMap = {};
  liftRows.forEach(function (r) {
    var liftNo = String(r['Lift No'] || '').trim();
    if (liftNo && !liftMap[liftNo]) liftMap[liftNo] = r;
  });

  var tlRows = sbFetchAll('TL', ['select=' + encSelect(['NAME', 'TL Alumina', 'TL Iron', 'AP%', 'BD%'])]);
  var tlMap = {};
  tlRows.forEach(function (r) {
    var name = String(r['NAME'] || '').trim().toLowerCase();
    if (name && !tlMap[name]) tlMap[name] = r;
  });

  // Mis-match.jsx loads LIFT-ACCOUNTS with .in('Lift No', <every lift id>) -- a ~40KB URL that Supabase rejects (400),
  // so the page classifies every row with NO lift data (stored differences + TL only). Mirror that so counts match.
  var pending = pendingCandidates.filter(function (r) { return computeMismatchTypes(r, {}, tlMap).length > 0; });

  var rows = [];
  pending.forEach(function (r) {
    // Older rows have no Timestamp: fall back to the audit start (Planned2), then the lift's own Timestamp.
    var lift = liftMap[String(r['Lift Number'] || r['Lift ID'] || '').trim()] || {};
    var planned = parseDateAny(r['Timestamp'] || r['Planned2'] || lift['Timestamp']);
    var delay = planned ? daysBetween(planned, new Date()) : '';
    rows.push([r['Lift Number'] || r['Lift ID'] || '-', r['Party Name'] || '-', r['Firm Name'] || '-', r['Product Name'] || '-', 'Mismatch', planned || '', '', delay, 'Pending']);
  });
  historyRows.forEach(function (r) {

    var actualVal = r['Actual'] || r['Actual6'] || r['Actual5'] || r['Actual4'] || r['Actual3'] || r['Actual2'] || r['Timestamp'];
    var planned = parseDateAny(r['Timestamp'] || r['Planned2']);
    var actual = parseDateAny(actualVal);
    var delay = planned ? daysBetween(planned, actual) : '';
    rows.push([r['Lift Number'] || r['Lift ID'] || '-', r['Party Name'] || '-', r['Firm Name'] || '-', r['Product Name'] || '-', 'Mismatch', planned || '', actual || '', delay, 'History']);
  });
  writeStepSheet(ss, 'Mismatch', rows);
  return { label: 'Mismatch', source: 'Mismatch + LIFT-ACCOUNTS + TL', total: pending.length + historyRows.length, pending: pending.length, history: historyRows.length };
}


function importDebitNote(ss) {
  var mismatchAll = getFullTable('Mismatch');
  var sourceRows = mismatchAll.filter(function (r) { return r['coordination_status'] === 'COORDINATED'; });
  var manualReturnsData = getFullTable('Purchase Returns', 'ID');

  var existingMismatchIds = {};
  sourceRows.forEach(function (r) { var id = String(r['id'] || '').trim(); if (id) existingMismatchIds[id] = true; });

  var directDebitMismatchIds = {};
  getFullTable('purchaser_coordinates').forEach(function (r) {
    if (r['status'] !== 'COORDINATED' || r['type'] !== 'Make Debit Note') return;
    var id = String(r['mismatch_id'] || '').trim();
    if (id) directDebitMismatchIds[id] = true;
  });

  // Mismatch rows reached only through a direct debit-note coordination or a Purchase Return link.
  var fallbackIds = {};
  Object.keys(directDebitMismatchIds).forEach(function (id) { fallbackIds[id] = true; });
  manualReturnsData.forEach(function (r) { var id = String(r['mismatch_id'] || '').trim(); if (id) fallbackIds[id] = true; });
  mismatchAll.forEach(function (r) {
    var id = String(r['id'] || '').trim();
    if (!fallbackIds[id] || existingMismatchIds[id]) return;
    var copy = Object.assign({}, r);
    copy['Status'] = copy['Status'] || 'Credit Notes';
    copy['Action Type'] = copy['Action Type'] || 'Make Debit Note';
    sourceRows.push(copy);
  });

  var validDate = function (v) { return parseDateAny(v) ? v : null; };
  var formattedData = sourceRows.map(function (row) {
    var idStr = String(row['id'] || '').trim();
    var isCompleted = row['Status'] === 'Completed' || !!row['Actual'];
    return {
      supabaseId: idStr,
      liftId: String(row['Lift ID'] || '').trim(),
      firmName: row['Firm Name'] || '',
      partyName: row['Party Name'] || '',
      productName: row['Product Name'] || '',
      status: isCompleted ? 'Completed' : (directDebitMismatchIds[idStr] ? 'Credit Notes' : String(row['Status'] || '').trim()),
      planned: validDate(row['Planned']),
      displayPlanned: row['Planned'] || row['Timestamp'] || null,
      actual: validDate(row['Actual']),
      actionType: row['Action Type'] || '',
      isFromReAudit: row['Action Type'] === 'Make Debit Note (Re-Audit)'
    };
  });

  var prLiftNos = {};
  manualReturnsData.forEach(function (r) {
    var liftNo = String(r['Lift No'] || '').trim();
    if (liftNo) prLiftNos[liftNo] = true;
  });

  var mismatchOnlyRows = formattedData.filter(function (item) {
    return !item.liftId || !prLiftNos[item.liftId] || item.actionType === 'Make Debit Note' || item.isFromReAudit;
  });
  var mismatchOnlyIds = {};
  mismatchOnlyRows.forEach(function (item) { mismatchOnlyIds[item.supabaseId] = true; });

  var formattedPurchaseReturns = manualReturnsData.filter(function (row) {
    var mId = String(row['mismatch_id'] || '').trim();
    if (hasVal(row['Actual'])) return false;
    if (mId && (existingMismatchIds[mId] || mismatchOnlyIds[mId])) return false;
    return true;
  }).map(function (row) {
    return {
      liftId: String(row['Lift No'] || '').trim(),
      firmName: row['Firm Name'] || '',
      partyName: row['Party Name'] || '',
      productName: row['Product Name'] || '',
      status: 'Credit Notes',
      planned: null,
      displayPlanned: row['Time Stamp'] || null,
      actual: validDate(row['Actual']),
      actionType: '',
      isFromReAudit: false
    };
  });

  var pending = [];
  var history = [];
  mismatchOnlyRows.concat(formattedPurchaseReturns).forEach(function (item) {
    var hasPlanned = hasVal(item.planned);
    var hasActual = hasVal(item.actual);
    var statusLower = String(item.status || '').toLowerCase();
    var isEligibleDebitNote = hasPlanned || statusLower.indexOf('credit') !== -1 || item.actionType === 'Make Debit Note' || item.isFromReAudit;
    if (isEligibleDebitNote && !hasActual && statusLower.indexOf('return') === -1) pending.push(item);
    else if (hasActual) history.push(item);
  });

  var rows = [];
  pending.forEach(function (item) {
    var planned = parseDateAny(item.displayPlanned);
    rows.push([item.liftId || '-', item.partyName || '-', item.firmName || '-', item.productName || '-', 'Debit Note', planned || '', '', planned ? daysBetween(planned, new Date()) : '', 'Pending']);
  });
  history.forEach(function (item) {
    var planned = parseDateAny(item.displayPlanned);
    var actual = parseDateAny(item.actual);
    rows.push([item.liftId || '-', item.partyName || '-', item.firmName || '-', item.productName || '-', 'Debit Note', planned || '', actual || '', daysBetween(planned, actual), 'History']);
  });

  writeStepSheet(ss, 'Debit Note', rows);
  return { label: 'Debit Note', source: 'Mismatch + purchaser_coordinates + Purchase Returns', total: pending.length + history.length, pending: pending.length, history: history.length };
}

function importFullkitting(ss) {
  var liftRows = getFullTable('LIFT-ACCOUNTS');

  var mismatchRows = getFullTable('Mismatch');
  var mismatchByLift = {};
  mismatchRows.forEach(function (m) {
    var liftNo = String(m['Lift Number'] || '').trim();
    if (liftNo) mismatchByLift[liftNo] = m;
  });

  var kitted = getFullTable('fullkittin');
  var doneLiftNos = {};
  var kittedByLift = {};
  var kittedByBilty = {};
  kitted.forEach(function (k) {
    var liftNo = String(k['Lift No'] || '').trim();
    var biltyNo = String(k['Bilty Number'] || '').trim();
    if (liftNo) { doneLiftNos[liftNo] = true; kittedByLift[liftNo] = k; }
    else if (biltyNo) { doneLiftNos['bilty:' + biltyNo] = true; kittedByBilty[biltyNo] = k; }
  });

  var pending = [];
  var history = [];
  liftRows.forEach(function (row) {
    var liftNum = String(row['Lift No'] || '').trim();
    var mismatch = mismatchByLift[liftNum];
    var biltyNo = String((mismatch && mismatch['Bilty No.']) || row['Bilty No.'] || '').trim();
    var isDone = !!doneLiftNos[liftNum] || (!!biltyNo && !!doneLiftNos['bilty:' + biltyNo]);

    if (!isDone && !(mismatch && mismatch['Actual6'])) return;

    var entry = {
      liftNumber: liftNum,
      firmName: row['Firm Name'] || '',
      partyName: row['Vendor Name'] || '',
      productName: row['Raw Material Name'] || '',

      plannedVal: row['Actual 3'] || row['Timestamp'],
      actualVal: isDone ? ((kittedByLift[liftNum] || kittedByBilty[biltyNo] || {})['Timestamp']) : null
    };
    if (isDone) history.push(entry); else pending.push(entry);
  });

  var rows = [];
  pending.forEach(function (e) {
    var planned = parseDateAny(e.plannedVal);
    var delay = planned ? daysBetween(planned, new Date()) : '';
    rows.push([e.liftNumber || '-', e.partyName || '-', e.firmName || '-', e.productName || '-', 'Fullkitting', planned || '', '', delay, 'Pending']);
  });
  history.forEach(function (e) {
    var planned = parseDateAny(e.plannedVal);
    var actual = parseDateAny(e.actualVal);
    var delay = daysBetween(planned, actual);
    rows.push([e.liftNumber || '-', e.partyName || '-', e.firmName || '-', e.productName || '-', 'Fullkitting', planned || '', actual || '', delay, 'History']);
  });

  writeStepSheet(ss, 'Fullkitting', rows);
  return { label: 'Fullkitting', source: 'LIFT-ACCOUNTS + Mismatch + fullkittin', total: pending.length + history.length, pending: pending.length, history: history.length };
}


function importAccountsAuditLive(ss) {
  var allMismatch = getFullTable('Mismatch');

  var mismatchLiftIds = {};
  allMismatch.forEach(function (r) {
    var id = String(r['Lift ID'] || r['Lift Number'] || '').trim();
    if (id) mismatchLiftIds[id] = true;
  });

  var liftRows = getFullTable('LIFT-ACCOUNTS');
  var transporterMap = {}, biltyNoMap = {}, biltyImageMap = {}, actual2Map = {}, areaLiftingMap = {}, actual1Map = {};
  liftRows.forEach(function (l) {
    var key = String(l['Lift No'] || '').trim();
    if (!key) return;
    transporterMap[key] = String(l['Transporter Name'] || '').trim();
    biltyNoMap[key] = String(l['Bilty No.'] || '').trim();
    biltyImageMap[key] = String(l['Bilty Image'] || '').trim();
    actual2Map[key] = String(l['Actual 2'] || '').trim();
    areaLiftingMap[key] = String(l['Area lifting'] || '').trim();
    actual1Map[key] = String(l['Actual 1'] || '').trim();
  });

  function hasBiltyDetails(row, liftNoOverride) {
    var normalizedLiftNo = String(liftNoOverride || row['Lift ID'] || row['Lift Number'] || row['Lift No'] || '').trim();
    var transporter = String(row['Transporter Name'] || transporterMap[normalizedLiftNo] || '').trim().toUpperCase();
    var isBypassed = transporter === 'FOR' || transporter === 'OWNED TRUCK' || transporter === 'BY COMPANY';
    if (isBypassed) {
      var labCompleted = String(row['Actual 2'] || actual2Map[normalizedLiftNo] || '').trim();
      if (labCompleted) return true;
      // Direct Supply To Party lifts skip Lab, so receipt (Actual 1) is enough
      var areaLifting = String(row['Area lifting'] || row['Area Lifting'] || areaLiftingMap[normalizedLiftNo] || '').trim();
      if (areaLifting === 'Direct Supply To Party') {
        return !!String(row['Actual 1'] || actual1Map[normalizedLiftNo] || '').trim();
      }
      return false;
    }
    var biltyNo = String(row['Bilty No.'] || biltyNoMap[normalizedLiftNo] || '').trim();
    var biltyImage = String(row['Bilty Image'] || biltyImageMap[normalizedLiftNo] || '').trim();
    return !!(biltyNo && biltyImage);
  }

  function isAuditDone(r) { return String(r['Status2'] || '').trim().toLowerCase() === 'done'; }
  function isReAuditDone(r) { return String(r['Status5'] || '').trim().toLowerCase() === 'done'; }

  var entries = [];

  allMismatch.forEach(function (r) {
    var ref = r['Lift ID'] || r['Lift Number'] || '-';
    var party = r['Party Name'] || '-';
    var firm = r['Firm Name'] || '-';
    var material = r['Product Name'] || '-';

    if (!hasBiltyDetails(r)) return;
    var rowIsClosed = !isNull(r['Actual']);

    if (!rowIsClosed) {
      if (isNull(r['Actual2'])) {
        entries.push({ ref: ref, party: party, firm: firm, material: material, subStage: 'AUDIT', planned: r['Planned2'], actual: null, status: 'Pending' });
      } else {
        entries.push({ ref: ref, party: party, firm: firm, material: material, subStage: 'AUDIT', planned: r['Planned2'], actual: r['Actual2'], status: 'History' });
      }
    }

    if (!rowIsClosed) {
      if (!isNull(r['Planned3']) && isNull(r['Actual3']) && r['Status2'] === 'Not Done') {
        entries.push({ ref: ref, party: party, firm: firm, material: material, subStage: 'RECTIFY', planned: r['Planned3'], actual: null, status: 'Pending' });
      } else if (!isNull(r['Actual3'])) {
        entries.push({ ref: ref, party: party, firm: firm, material: material, subStage: 'RECTIFY', planned: r['Planned3'], actual: r['Actual3'], status: 'History' });
      }
    }

    if (!rowIsClosed) {
      var tallyGate = !isNull(r['Planned4']) || (!isNull(r['Actual2']) && isAuditDone(r)) || (!isNull(r['Actual5']) && isReAuditDone(r));
      var tallyPlanned = r['Planned4'] || r['Actual5'] || r['Actual2'];
      if (isNull(r['Actual4']) && tallyGate) {
        entries.push({ ref: ref, party: party, firm: firm, material: material, subStage: 'TALLY_ENTRY', planned: tallyPlanned, actual: null, status: 'Pending' });
      } else if (!isNull(r['Actual4'])) {
        entries.push({ ref: ref, party: party, firm: firm, material: material, subStage: 'TALLY_ENTRY', planned: tallyPlanned, actual: r['Actual4'], status: 'History' });
      }
    }

    if (!rowIsClosed) {
      if (!isNull(r['Planned8']) && isNull(r['Actual8'])) {
        entries.push({ ref: ref, party: party, firm: firm, material: material, subStage: 'RE_CHECKING', planned: r['Planned8'], actual: null, status: 'Pending' });
      } else if (!isNull(r['Actual8'])) {
        entries.push({ ref: ref, party: party, firm: firm, material: material, subStage: 'RE_CHECKING', planned: r['Planned8'], actual: r['Actual8'], status: 'History' });
      }
    }

    if (!rowIsClosed) {
      if (!isNull(r['Planned5']) && isNull(r['Actual5'])) {
        entries.push({ ref: ref, party: party, firm: firm, material: material, subStage: 'RE_AUDIT', planned: r['Planned5'], actual: null, status: 'Pending' });
      } else if (!isNull(r['Actual5'])) {
        entries.push({ ref: ref, party: party, firm: firm, material: material, subStage: 'RE_AUDIT', planned: r['Planned5'], actual: r['Actual5'], status: 'History' });
      }
    }

    if (!rowIsClosed) {
      if (!isNull(r['Planned6']) && isNull(r['Actual6'])) {
        entries.push({ ref: ref, party: party, firm: firm, material: material, subStage: 'BILL_ENTRY', planned: r['Planned6'], actual: null, status: 'Pending' });
      } else if (!isNull(r['Actual6'])) {
        entries.push({ ref: ref, party: party, firm: firm, material: material, subStage: 'BILL_ENTRY', planned: r['Planned6'], actual: r['Actual6'], status: 'History' });
      }
    }
  });

  liftRows.forEach(function (l) {
    var liftNo = String(l['Lift No'] || '').trim();
    if (!liftNo || mismatchLiftIds[liftNo]) return;
    if (isNull(l['Actual 1'])) return;
    if (!hasBiltyDetails(l, liftNo)) return;
    entries.push({
      ref: liftNo,
      party: l['Vendor Name'] || '-',
      firm: l['Firm Name'] || '-',
      material: l['Raw Material Name'] || '-',
      subStage: 'AUDIT',
      planned: l['Timestamp'],
      actual: null,
      status: 'Pending'
    });
  });

  var liveHeaders = ['Reference No.', 'Party / Vendor', 'Firm Name', 'Material / Item', 'Sub-Stage', 'Planned Date', 'Actual Date', 'Delay (Days)', 'Status'];
  var now = new Date();
  var liveRows = entries.map(function (e) {
    var planned = parseDateAny(e.planned);
    var actual = parseDateAny(e.actual);
    var delay = e.status === 'History'
      ? (planned ? daysBetween(planned, actual) : '')
      : (planned ? daysBetween(planned, now) : '');
    return [e.ref, e.party, e.firm, e.material, e.subStage, planned || '', actual || '', delay, e.status];
  });

  var liveSheet = getOrCreateSheet(ss, 'Accounts Audit Live');
  liveSheet.clearContents();
  liveSheet.getRange(1, 1, 1, liveHeaders.length).setValues([liveHeaders]).setFontWeight('bold').setBackground('#2c6fbb').setFontColor('#ffffff');
  if (liveRows.length) liveSheet.getRange(2, 1, liveRows.length, liveHeaders.length).setValues(liveRows);
  liveSheet.setFrozenRows(1);

  var counts = { AUDIT: 0, RECTIFY: 0, TALLY_ENTRY: 0, RE_CHECKING: 0, RE_AUDIT: 0, BILL_ENTRY: 0 };
  var historyCount = 0;
  entries.forEach(function (e) {
    if (e.status === 'Pending') {
      counts[e.subStage] = (counts[e.subStage] || 0) + 1;
    } else {
      historyCount++;
    }
  });
  var allStages = counts.AUDIT + counts.RECTIFY + counts.TALLY_ENTRY + counts.RE_CHECKING + counts.RE_AUDIT + counts.BILL_ENTRY;

  return {
    label: 'Accounts Audit Live',
    source: 'Mismatch + LIFT-ACCOUNTS (hasBiltyDetails-gated, 6 stages, each with its own Pending/History)',
    total: allStages + historyCount,
    pending: allStages,
    history: historyCount,
    stageCounts: counts
  };
}

function runAccountsAuditLive() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var result = importAccountsAuditLive(ss);
  var c = result.stageCounts;
  SpreadsheetApp.getUi().alert(
    '🔵 Accounts Audit (Live)\n\n' +
    'All Stages: ' + result.pending + '\n' +
    '  Audit: ' + c.AUDIT + '\n' +
    '  Rectify: ' + c.RECTIFY + '\n' +
    '  Re-Audit: ' + c.RE_AUDIT + '\n' +
    '  Tally Entry: ' + c.TALLY_ENTRY + '\n' +
    '  Re-Checking: ' + c.RE_CHECKING + '\n' +
    '  Bill Received: ' + c.BILL_ENTRY + '\n\n' +
    'History: ' + result.history + '\n\n' +
    'Compare directly against the dashboard tab badges (refresh both around\n' +
    'the same moment — this is live data, it can drift a little).'
  );
}


function importPurchaseReturn(ss) {
  var mismatchAll = getFullTable('Mismatch');
  var mismatchRows = mismatchAll.filter(function (m) {
    return m['Status'] === 'Purchase Return' && m['coordination_status'] === 'COORDINATED';
  });

  var existingIds = {};
  mismatchRows.forEach(function (m) { var id = String(m['id'] || '').trim(); if (id) existingIds[id] = true; });
  var fallbackIds = {};
  getFullTable('purchaser_coordinates').forEach(function (r) {
    if (r['status'] !== 'COORDINATED' || r['type'] !== 'Return Material and Make Debit Note') return;
    var id = String(r['mismatch_id'] || '').trim();
    if (id && !existingIds[id]) fallbackIds[id] = true;
  });
  mismatchRows = mismatchRows.concat(mismatchAll.filter(function (r) { return fallbackIds[String(r['id'] || '').trim()]; }));

  var seenIds = {};
  mismatchRows = mismatchRows.filter(function (m) {
    var id = String(m['id'] || '').trim();
    if (!id || seenIds[id]) return false;
    seenIds[id] = true;
    return true;
  });

  var allReturns = getFullTable('Purchase Returns', 'ID');
  var returnedQtyMap = {}, totalReturnQtyMap = {}, returnedQtyByLiftMap = {}, totalReturnQtyByLiftMap = {}, zeroReturnIds = {};
  allReturns.forEach(function (r) {
    var mId = String(r['mismatch_id'] || '').trim();
    var liftNo = String(r['Lift No'] || '').trim();
    var returnedThisTime = parseFloat(r['Return This Time']) || parseFloat(r['Qty']) || 0;
    var configuredTotal = parseFloat(r['Total Return Qty']) || 0;
    if (hasVal(r['Total Return Qty']) && parseFloat(r['Total Return Qty']) === 0 && (parseFloat(r['Return This Time']) || 0) === 0) {
      if (mId) zeroReturnIds['m:' + mId] = true;
      if (liftNo) zeroReturnIds['l:' + liftNo] = true;
    }
    if (mId) {
      returnedQtyMap[mId] = (returnedQtyMap[mId] || 0) + returnedThisTime;
      if (configuredTotal > 0) totalReturnQtyMap[mId] = Math.max(totalReturnQtyMap[mId] || 0, configuredTotal);
    }
    if (liftNo) {
      returnedQtyByLiftMap[liftNo] = (returnedQtyByLiftMap[liftNo] || 0) + returnedThisTime;
      if (configuredTotal > 0) totalReturnQtyByLiftMap[liftNo] = Math.max(totalReturnQtyByLiftMap[liftNo] || 0, configuredTotal);
    }
  });

  var liftQtyMap = {};
  getFullTable('LIFT-ACCOUNTS').forEach(function (la) {
    var lNo = String(la['Lift No'] || '').trim();
    if (lNo) liftQtyMap[lNo] = parseFloat(la['Actual Quantity']) || parseFloat(la['Truck Qty']) || parseFloat(la['Qty']) || parseFloat(la['Lifting Qty']) || 0;
  });

  var stillPending = [];
  mismatchRows.forEach(function (m) {
    var mId = String(m['id'] || '').trim();
    var liftNo = String(m['Lift Number'] || m['Lift ID'] || '').trim();
    var receivedQty = liftQtyMap[liftNo];
    var totalQty = (receivedQty !== undefined && receivedQty > 0) ? receivedQty : (parseFloat(m['Qty']) || parseFloat(m['Truck Qty']) || parseFloat(m['Quantity']) || parseFloat(m['Lifting Quantity']) || 0);
    var returnedQty = Math.max(returnedQtyMap[mId] || 0, returnedQtyByLiftMap[liftNo] || 0);
    var configuredTotal = totalReturnQtyMap[mId] || totalReturnQtyByLiftMap[liftNo] || 0;
    var returnTargetQty = configuredTotal > 0 ? configuredTotal : totalQty;
    var pendingQty = Math.max(0, returnTargetQty - returnedQty);
    var hasZeroEntry = zeroReturnIds['m:' + mId] || (liftNo && zeroReturnIds['l:' + liftNo]);
    if (hasZeroEntry || !(pendingQty > 0.001 || (returnedQty === 0 && returnTargetQty > 0))) return;
    stillPending.push({ row: m, liftNo: liftNo, pendingQty: pendingQty });
  });

  // One row per lift (the one with most work remaining); rows without a lift are all kept.
  var byLift = {};
  var pendingMismatches = [];
  stillPending.forEach(function (p) {
    if (!p.liftNo) { pendingMismatches.push(p.row); return; }
    var existing = byLift[p.liftNo];
    if (!existing || p.pendingQty > existing.pendingQty) byLift[p.liftNo] = p;
  });
  Object.keys(byLift).forEach(function (k) { pendingMismatches.unshift(byLift[k].row); });

  // Returns not yet sent to PR Approval stay in Pending; the rest are the Finalized (History) tab.
  var pendingReturns = allReturns.filter(function (r) { return !r['PR Approval Status']; });
  var history = sortByDateDesc(allReturns.filter(function (r) { return !!r['PR Approval Status']; }), 'Time Stamp');

  var rows = [];
  pendingMismatches.forEach(function (r) {
    var planned = parseDateAny(r['Timestamp']);
    rows.push([r['Lift Number'] || r['Lift ID'] || '-', r['Party Name'] || '-', r['Firm Name'] || '-', r['Product Name'] || '-', 'Purchase Return', planned || '', '', planned ? daysBetween(planned, new Date()) : '', 'Pending']);
  });
  pendingReturns.forEach(function (r) {
    var planned = parseDateAny(r['Time Stamp']);
    rows.push([r['Purchase Return No.'] || r['Lift No'] || '-', r['Party Name'] || '-', r['Firm Name'] || '-', r['Product Name'] || '-', 'Purchase Return', planned || '', '', planned ? daysBetween(planned, new Date()) : '', 'Pending']);
  });
  history.forEach(function (r) {
    var planned = parseDateAny(r['PR Planned'] || r['Time Stamp']);
    var actual = parseDateAny(r['PR Actual'] || r['Time Stamp']);
    rows.push([r['Purchase Return No.'] || r['Lift No'] || '-', r['Party Name'] || '-', r['Firm Name'] || '-', r['Product Name'] || '-', 'Purchase Return', planned || '', actual || '', daysBetween(planned, actual), 'History']);
  });
  var pendingCount = pendingMismatches.length + pendingReturns.length;
  writeStepSheet(ss, 'Purchase Return', rows);
  return { label: 'Purchase Return', source: 'Mismatch + purchaser_coordinates + Purchase Returns + LIFT-ACCOUNTS', total: pendingCount + history.length, pending: pendingCount, history: history.length };
}

function importPrApproval(ss) {
  var all = getFullTable('Purchase Returns', 'ID').filter(function (r) { return notNull(r['PR Planned']); });
  var isPendingRow = function (r) { return String(r['PR Approval Status'] || '').trim() === 'Pending'; };
  var pending = all.filter(isPendingRow);
  var history = sortByDateDesc(all.filter(function (r) { return !isPendingRow(r); }), 'PR Actual');
  var toRow = function (r, status) {
    var planned = parseDateAny(r['PR Planned']);
    var actual = status === 'History' ? parseDateAny(r['PR Actual']) : null;
    var delay = status === 'History' ? (planned && actual ? daysBetween(planned, actual) : '') : (planned ? daysBetween(planned, new Date()) : '');
    return [r['Purchase Return No.'] || r['Lift No'] || '-', r['Party Name'] || '-', r['Firm Name'] || '-', r['Product Name'] || '-', 'PR Approval', planned || '', actual || '', delay, status];
  };
  var rows = pending.map(function (r) { return toRow(r, 'Pending'); }).concat(history.map(function (r) { return toRow(r, 'History'); }));
  writeStepSheet(ss, 'PR Approval', rows);
  return { label: 'PR Approval', source: 'Purchase Returns', total: rows.length, pending: pending.length, history: history.length };
}






function importAllSteps() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  _tableCache = {};
  var summary = [];
  try {
    SIMPLE_STEPS.forEach(function (cfg) { summary.push(importSimpleStep(ss, cfg)); });
    summary.push(importMgmtApp(ss));
    summary.push(importPoEntry(ss));
    summary.push(importAdvancePayment(ss));
    summary.push(importArrangeLogistics(ss));
    summary.push(importLogisticsApproval(ss));
    summary.push(importLab(ss));
    summary.push(importBilty(ss));
    summary.push(importReceipt(ss));
    summary.push(importLift(ss));
    summary.push(importLiftDelayReport(ss));
    summary.push(importCrm(ss));
    summary.push(importMismatchStep(ss));
    summary.push(importDebitNote(ss));
    summary.push(importFullkitting(ss));
    summary.push(importAccountsAuditLive(ss));
    summary.push(importPurchaseReturn(ss));
    summary.push(importPrApproval(ss));

    writeSummarySheet(ss, summary);
    SpreadsheetApp.getUi().alert('✅ Import complete: ' + summary.length + ' steps refreshed. See "📋 Summary" sheet.');
  } catch (err) {
    SpreadsheetApp.getUi().alert('❌ Import failed: ' + err.message);
    throw err;
  }
}

function installHourlyTrigger() {
  removeHourlyTrigger();
  ScriptApp.newTrigger('importAllSteps').timeBased().everyHours(4).create();
  SpreadsheetApp.getUi().alert('Auto-refresh installed — the sheet will now pull live data every 4 hours.');
}

function removeHourlyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'importAllSteps') ScriptApp.deleteTrigger(t);
  });
}
