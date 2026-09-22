var GVIZ_SHEET_ID = '13_sHCFkVxAzPbel-k9BuUBFY-E11vdKJAOgvzhBMLMY';

var LIFT_DELAY_PARTIES = [
  'PASSARY MINERALS MADHYA PVT LTD',
  'Passary Minerals Madhya Pvt.Ltd',
  'Passary Minerals Pvt Ltd.'
];

var FIRM_SCOPE = null;

function canViewFirmJs(userFirm, dataFirm) {
  if (!userFirm) return true;
  var normUser = Array.isArray(userFirm)
    ? userFirm.map(function (f) { return String(f || '').toLowerCase().trim(); })
    : String(userFirm || '').toLowerCase().trim();
  if (normUser === 'all' || (Array.isArray(normUser) && normUser.indexOf('all') !== -1)) return true;
  if (!dataFirm) return true;
  var normData = String(dataFirm || '').toLowerCase().trim();
  return Array.isArray(normUser) ? normUser.indexOf(normData) !== -1 : normUser === normData;
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📊 Purchase FMS Import')
    .addItem('1️⃣ Setup Supabase Credentials', 'promptForCredentials')
    .addItem('2️⃣ Test Connection', 'testConnection')
    .addSeparator()
    .addItem('▶️ Import ALL Steps (Live)', 'importAllSteps')
    .addItem('📦 Import Lift Delay Report (Passary)', 'runLiftDelayReport')
    .addItem('🔵 Refresh Accounts Audit (Live)', 'runAccountsAuditLive')
    .addSeparator()
    .addItem('⏱️ Install Hourly Auto-Refresh', 'installHourlyTrigger')
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
function uniq(arr) {
  var seen = {};
  var out = [];
  arr.forEach(function (v) {
    if (v && !seen[v]) { seen[v] = true; out.push(v); }
  });
  return out;
}

function sbFetchAll(table, params, idCol) {
  var col = idCol || 'id';
  var hasOrder = params.some(function (p) { return p.indexOf('order=') === 0; });
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

var _tableCache = {};
function getFullTable(table, idCol) {
  if (!_tableCache[table]) {
    _tableCache[table] = sbFetchAll(table, ['select=*'], idCol);
  }
  return _tableCache[table];
}

function notNull(v) { return v !== null && v !== undefined; }
function isNull(v) { return v === null || v === undefined; }

function pgNeqJs(v, value) { return notNull(v) && v !== value; }

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

function pgParam(colName, op, value) {
  return encCol(colName) + '=' + op + '.' + encodeURIComponent(value);
}

function pgInParam(colName, op, arr) {
  var value = op + '.(' + arr.map(function (v) { return '"' + String(v).replace(/"/g, '\\"') + '"'; }).join(',') + ')';
  return encCol(colName) + '=' + encodeURIComponent(value);
}

function pgOrder(colName, dir) {
  return 'order=' + encodeURIComponent(ident(colName) + '.' + (dir || 'desc'));
}

var STANDARD_HEADERS = ['Reference No.', 'Party / Vendor', 'Firm Name', 'Material / Item', 'Sub-Stage', 'Planned Date', 'Actual Date', 'Delay (Days)', 'Status'];

function getOrCreateSheet(ss, name) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var safe = String(name).substring(0, 99);
  var sheet = ss.getSheetByName(safe);
  if (!sheet) sheet = ss.insertSheet(safe);
  return sheet;
}

function writeStepSheet(ss, label, rows) {
  var sheet = getOrCreateSheet(ss, label);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, STANDARD_HEADERS.length).setValues([STANDARD_HEADERS]).setFontWeight('bold').setBackground('#7da23a').setFontColor('#ffffff');
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, STANDARD_HEADERS.length).setValues(rows);
  }
  sheet.setFrozenRows(1);
  try { sheet.autoResizeColumns(1, STANDARD_HEADERS.length); } catch (e) {  }
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
  try { sheet.autoResizeColumns(1, headers.length); } catch (e) {  }
}

function gvizFetchRawRows(sheetId, sheetName) {
  var url = 'https://docs.google.com/spreadsheets/d/' + sheetId + '/gviz/tq?tqx=out:json&sheet=' + encodeURIComponent(sheetName);
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var text = res.getContentText();
  var jsonStart = text.indexOf('{');
  var jsonEnd = text.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd < 0) return [];
  var data = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
  if (!data.table || !data.table.rows) return [];
  return data.table.rows.map(function (row) { return (row && row.c) ? row.c : []; });
}

function gvizFetchTable(sheetId, sheetName) {
  var url = 'https://docs.google.com/spreadsheets/d/' + sheetId + '/gviz/tq?tqx=out:json&sheet=' + encodeURIComponent(sheetName);
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var text = res.getContentText();
  var jsonStart = text.indexOf('{');
  var jsonEnd = text.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd < 0) return { headers: [], rows: [] };
  var data = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
  if (!data.table) return { headers: [], rows: [] };
  var headers = (data.table.cols || []).map(function (c, i) { return c.label || c.id || ('Col' + i); });
  var rows = (data.table.rows || []).map(function (row) {
    return (row.c || []).map(function (c) { return c ? (c.f !== undefined && c.f !== null ? c.f : (c.v !== undefined ? c.v : '')) : ''; });
  });
  return { headers: headers, rows: rows };
}

function cellVal(cells, idx) {
  var c = cells[idx];
  if (!c) return null;
  if (c.f !== undefined && c.f !== null) return c.f;
  return c.v !== undefined ? c.v : null;
}

function parseGvizDate(v) {
  var d = parseDateAny(v);
  return d || '';
}

var SIMPLE_STEPS = [

  { label: 'HOD Approval', table: 'INDENT-PO', plannedCol: 'Planned1', actualCol: 'Actual1', refCol: 'Indent Id.', partyCol: 'Generated By', firmCol: 'Firm Name', materialCol: 'Material' },

  { label: 'Three Party', table: 'INDENT-PO', plannedCol: 'Planned6', actualCol: 'Actual6', refCol: 'Indent Id.', partyCol: 'Approved Vendor Name', firmCol: 'Firm Name', materialCol: 'Material' },

  { label: 'Factory App.', table: 'INDENT-PO', plannedCol: 'Planned7', actualCol: 'Actual7', refCol: 'Indent Id.', partyCol: 'Approved Vendor Name', firmCol: 'Firm Name', materialCol: 'Material' },

  { label: ' Make PO', table: 'INDENT-PO', plannedCol: 'Planned2', actualCol: 'Actual2', refCol: 'po_number', partyCol: 'Vendor name', firmCol: 'Firm Name', materialCol: 'Material' },

  { label: 'Take Entry Tally', table: 'Mismatch', plannedCol: 'Planned4', actualCol: 'Actual4', refCol: 'Lift ID', partyCol: 'Party Name', firmCol: 'Firm Name', materialCol: 'Product Name' },

  { label: 'Again Auditing', table: 'Mismatch', plannedCol: 'Planned5', actualCol: 'Actual5', refCol: 'Lift ID', partyCol: 'Party Name', firmCol: 'Firm Name', materialCol: 'Product Name' },

  { label: 'Rectify Mistake', table: 'Mismatch', plannedCol: 'Planned3', actualCol: 'Actual3', refCol: 'Lift ID', partyCol: 'Party Name', firmCol: 'Firm Name', materialCol: 'Product Name' }
];

function importSimpleStep(ss, cfg) {
  var all = getFullTable(cfg.table);
  var pending = all.filter(function (r) { return notNull(r[cfg.plannedCol]) && isNull(r[cfg.actualCol]); });
  var history = all.filter(function (r) { return notNull(r[cfg.plannedCol]) && notNull(r[cfg.actualCol]); });
  var rows = [];
  pending.forEach(function (r) { rows.push(mkRow(r, cfg.refCol, cfg.partyCol, cfg.firmCol, cfg.materialCol, cfg.plannedCol, cfg.actualCol, cfg.label.trim(), 'Pending')); });
  history.forEach(function (r) { rows.push(mkRow(r, cfg.refCol, cfg.partyCol, cfg.firmCol, cfg.materialCol, cfg.plannedCol, cfg.actualCol, cfg.label.trim(), 'History')); });
  writeStepSheet(ss, cfg.label.trim(), rows);
  return { label: cfg.label.trim(), source: cfg.table, total: pending.length + history.length, pending: pending.length, history: history.length };
}

function importPoHistory(ss) {
  var all = getFullTable('INDENT-PO').filter(function (r) { return notNull(r['Actual2']); });
  var seen = {};
  var rows = [];
  all.forEach(function (r) {
    var poId = r['po_number'] || 'Draft';
    var vendorName = r['Vendor name'] || r['Vendor Name 1'] || 'N/A';
    var firmName = r['Firm Name'] || 'N/A';
    var key = poId + '_' + vendorName + '_' + firmName;
    if (seen[key]) return;
    seen[key] = true;
    rows.push([poId, vendorName, firmName, r['Material'] || '-', 'PO History', '', parseDateAny(r['Actual2']) || '', '', 'History']);
  });
  writeStepSheet(ss, 'PO History', rows);
  return { label: 'PO History', source: 'INDENT-PO (grouped by PO+Vendor+Firm)', total: rows.length, pending: 0, history: rows.length };
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
  var all = getFullTable('INDENT-PO').filter(function (r) { return notNull(r['Planned5']); });
  var groups = groupIndentPoRows(all, function (r) { return String(r['po_number'] || r['Indent Id.'] || '').trim(); });
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
    var planned2 = r['Planned 2'];
    var actual2 = r['Actual 2'];
    var needsUnloadApproval = String(r['Unload Approval Required'] || '').trim().toLowerCase() === 'yes';
    var unloadStatus = String(r['Unload Approval Status'] || '').trim().toLowerCase();
    var isUnloadApproved = unloadStatus === 'approved' || unloadStatus === 'completed';
    return planned2 && !actual2 && (!needsUnloadApproval || isUnloadApproved);
  });
  var history = all.filter(function (r) { return r['Actual 2']; });
  var rows = [];
  pending.forEach(function (r) { rows.push(mkRow(r, 'Lift No', 'Vendor Name', 'Firm Name', 'Raw Material Name', 'Planned 2', null, 'Lab', 'Pending')); });
  history.forEach(function (r) { rows.push(mkRow(r, 'Lift No', 'Vendor Name', 'Firm Name', 'Raw Material Name', 'Planned 2', 'Actual 2', 'Lab', 'History')); });
  writeStepSheet(ss, 'Lab', rows);
  return { label: 'Lab', source: 'LIFT-ACCOUNTS', total: pending.length + history.length, pending: pending.length, history: history.length };
}

function importReceipt(ss) {
  var allLifts = getFullTable('LIFT-ACCOUNTS');

  var mismatchRows = getFullTable('Mismatch').filter(function (r) { return notNull(r['Actual6']); });
  var fullkittinRows = getFullTable('fullkittin');
  var downstreamCompletedLiftNos = {};
  mismatchRows.forEach(function (r) {
    var liftNo = String(r['Lift Number'] || r['Lift ID'] || '').trim();
    if (liftNo) downstreamCompletedLiftNos[liftNo] = true;
  });
  fullkittinRows.forEach(function (r) {
    var liftNo = String(r['Lift No'] || '').trim();
    if (liftNo) downstreamCompletedLiftNos[liftNo] = true;
  });

  var pending = [];
  var history = [];
  allLifts.forEach(function (r) {
    var liftNo = String(r['Lift No'] || '').trim();
    var planned1 = r['Planned 1'];
    var actual1 = r['Actual 1'];
    var status = String(r['Unload Approval Status'] || '').trim();
    var required = String(r['Unload Approval Required'] || '').trim();
    var hasMovedToLab = !!(r['Planned 2'] || r['Actual 2']);
    var hasDownstreamCompletion = !!downstreamCompletedLiftNos[liftNo];
    var hasStaleMissingReceipt = !actual1 && hasDownstreamCompletion;

    var isPendingApproval = status === 'Pending';
    var isApprovedButNotFinalized = status === 'Approved' && required === 'Yes';
    var isPendingMatch = planned1 && !hasMovedToLab && !hasStaleMissingReceipt && (!actual1 || isPendingApproval || isApprovedButNotFinalized);

    var isRejected = status === 'Rejected';
    var isFinalized = status === 'Completed';
    var isApprovedNoRequirement = status === 'Approved' && required !== 'Yes';
    var isApprovedAndMovedToLab = status === 'Approved' && required === 'Yes' && hasMovedToLab;
    var isHistoryMatch = actual1 && (isRejected || isFinalized || isApprovedNoRequirement || isApprovedAndMovedToLab);

    if (isPendingMatch) pending.push(r);
    else if (isHistoryMatch) history.push(r);
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

function normalizePoItemsJs(poNumber, primaryRow, allItems, liftedQtyByItem, liftedQtyByBaseItem) {
  var fallbackMaterial = String(primaryRow['Material'] || '').trim();
  var fallbackQuantity = parseFloat(primaryRow['Quantity'] || primaryRow['Total Quantity']) || 0;
  var rawItems = allItems.length ? allItems : [{ material: fallbackMaterial, quantity: fallbackQuantity, orderCancelQty: 0, indentId: '' }];

  return rawItems.map(function (item, index) {
    var materialName = String(item.material || fallbackMaterial || ('Product ' + (index + 1))).trim();
    var aggregationKey = makeLiftItemKey(poNumber, materialName);
    var uniqueId = item.indentId || index;
    var key = makeLiftItemKey(poNumber, materialName, uniqueId);
    var maxQuantity = item.quantity || fallbackQuantity;
    var hasSpecificId = !!item.indentId;
    var liftedQtyRaw = hasSpecificId
      ? (liftedQtyByItem[key] !== undefined ? liftedQtyByItem[key] : 0)
      : (liftedQtyByItem[key] !== undefined ? liftedQtyByItem[key] : (liftedQtyByBaseItem[aggregationKey] || 0));
    var liftedQuantity = Math.round(liftedQtyRaw * 1000) / 1000;
    var itemCancelQty = item.orderCancelQty || 0;
    var pendingQuantity = Math.max(0, Math.round((maxQuantity - liftedQuantity - itemCancelQty) * 1000) / 1000);
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
    pendingQuantity = Math.round(pendingQuantity * 1000) / 1000;
    if (pendingQuantity > 0) pending.push(row);
  });

  var history = sortByDateDesc(getFullTable('LIFT-ACCOUNTS'), 'Timestamp');
  var rows = [];
  pending.forEach(function (r) { rows.push(mkGroupedRow(r, 'Vendor name', 'Firm Name', 'Material', 'Planned4', null, 'Lift', 'Pending')); });
  history.forEach(function (r) {
    rows.push([r['Lift No'] || '-', r['Vendor Name'] || '-', r['Firm Name'] || '-', r['Raw Material Name'] || '-', 'Lift', '', parseDateAny(r['Timestamp']) || '', '', 'History']);
  });
  writeStepSheet(ss, 'Lift', rows);
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
  var planned4ByIndent = {};
  pAll.forEach(function (r) {
    var indent = String(r['Indent Id.'] || '').trim();
    var poNumber = String(r['po_number'] || indent).trim();
    if (indent) {
      indentToPoMap[indent] = poNumber;
      planned4ByIndent[indent] = r['Planned4'];
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
    pendingQuantity = Math.round(pendingQuantity * 1000) / 1000;
    if (pendingQuantity > 0) pending.push(row);
  });

  var history = sortByDateDesc(
    getFullTable('LIFT-ACCOUNTS').filter(function (r) { return LIFT_DELAY_PARTIES.indexOf(r['Vendor Name']) !== -1; }),
    'Timestamp'
  );

  var rows = [];
  pending.forEach(function (r) { rows.push(mkGroupedRow(r, 'Vendor name', 'Firm Name', 'Material', 'Planned4', null, 'Lift Delay Report', 'Pending')); });
  history.forEach(function (r) {
    var indent = String(r['Indent no.'] || '').trim();
    var planned = parseDateAny(planned4ByIndent[indent]);
    var actual = parseDateAny(r['Timestamp']);
    var delay = planned ? daysBetween(planned, actual) : '';
    rows.push([r['Lift No'] || '-', r['Vendor Name'] || '-', r['Firm Name'] || '-', r['Raw Material Name'] || '-', 'Lift Delay Report', planned || '', actual || '', delay, 'History']);
  });

  writeStepSheet(ss, 'Lift Delay Report', rows);
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

function importUnloadApproval(ss) {
  var base = getFullTable('LIFT-ACCOUNTS').filter(function (r) {
    return notNull(r['Actual 1']) && r['Unload Approval Required'] === 'Yes';
  });
  var pending = base.filter(function (r) { return r['Unload Approval Status'] === 'Pending'; });

  var history = base.filter(function (r) { return pgNeqJs(r['Unload Approval Status'], 'Pending'); });
  var rows = [];
  pending.forEach(function (r) { rows.push([r['Lift No'] || '-', r['Vendor Name'] || '-', r['Firm Name'] || '-', r['Raw Material Name'] || '-', 'Unload App.', '', '', '', 'Pending']); });
  history.forEach(function (r) { rows.push([r['Lift No'] || '-', r['Vendor Name'] || '-', r['Firm Name'] || '-', r['Raw Material Name'] || '-', 'Unload App.', '', parseDateAny(r['Actual Unload Approval']) || '', '', 'History']); });
  writeStepSheet(ss, 'Unload App.', rows);
  return { label: 'Unload App.', source: 'LIFT-ACCOUNTS', total: pending.length + history.length, pending: pending.length, history: history.length };
}

function importLabReport(ss) {
  var all = getFullTable('LIFT-ACCOUNTS');
  var pending = all.filter(function (r) { return isNull(r['Actual 2']); });
  var history = all.filter(function (r) { return notNull(r['Actual 2']); });
  var rows = [];
  pending.forEach(function (r) { rows.push([r['Lift No'] || '-', r['Vendor Name'] || '-', r['Firm Name'] || '-', r['Raw Material Name'] || '-', 'Lab Report', '', '', '', 'Pending']); });
  history.forEach(function (r) { rows.push([r['Lift No'] || '-', r['Vendor Name'] || '-', r['Firm Name'] || '-', r['Raw Material Name'] || '-', 'Lab Report', '', parseDateAny(r['Date Of Test']) || parseDateAny(r['Actual 2']) || '', '', 'History']); });
  writeStepSheet(ss, 'Lab Report', rows);
  return { label: 'Lab Report', source: 'LIFT-ACCOUNTS', total: pending.length + history.length, pending: pending.length, history: history.length };
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

  if (FIRM_SCOPE) {
    all = all.filter(function (r) { return canViewFirmJs(FIRM_SCOPE, r['Firm Name']); });
  }

  var pendingExcludeSet = { 'Credit Notes': 1, 'Others': 1, 'Purchase Return': 1, 'Acknowledge': 1, 'Completed': 1, 'Resolved - Return': 1 };
  var historyExcludeSet = { 'Pending': 1, 'Not Done': 1, 'Purchase Return': 1 };
  var pendingCandidates = all.filter(function (r) { return !pendingExcludeSet[r['Status']]; });
  var historyRows = all.filter(function (r) { return !historyExcludeSet[r['Status']]; });

  var liftRows = getFullTable('LIFT-ACCOUNTS');
  var liftMap = {};
  liftRows.forEach(function (r) {
    var liftNo = String(r['Lift No'] || '').trim();
    if (liftNo) liftMap[liftNo] = r;
  });

  var tlRows = sbFetchAll('TL', ['select=' + encSelect(['NAME', 'TL Alumina', 'TL Iron', 'AP%', 'BD%'])]);
  var tlMap = {};
  tlRows.forEach(function (r) {
    var name = String(r['NAME'] || '').trim().toLowerCase();
    if (name) tlMap[name] = r;
  });

  var pending = pendingCandidates.filter(function (r) { return computeMismatchTypes(r, liftMap, tlMap).length > 0; });

  var rows = [];
  pending.forEach(function (r) {
    var planned = parseDateAny(r['Timestamp']);
    var delay = planned ? daysBetween(planned, new Date()) : '';
    rows.push([r['Lift Number'] || r['Lift ID'] || '-', r['Party Name'] || '-', r['Firm Name'] || '-', r['Product Name'] || '-', 'Mismatch', planned || '', '', delay, 'Pending']);
  });
  historyRows.forEach(function (r) {

    var actualVal = r['Actual'] || r['Actual6'] || r['Actual5'] || r['Actual4'] || r['Actual3'] || r['Actual2'] || r['Timestamp'];
    var planned = parseDateAny(r['Timestamp']);
    var actual = parseDateAny(actualVal);
    var delay = planned ? daysBetween(planned, actual) : '';
    rows.push([r['Lift Number'] || r['Lift ID'] || '-', r['Party Name'] || '-', r['Firm Name'] || '-', r['Product Name'] || '-', 'Mismatch', planned || '', actual || '', delay, 'History']);
  });
  writeStepSheet(ss, 'Mismatch', rows);
  return { label: 'Mismatch', source: 'Mismatch + LIFT-ACCOUNTS + TL', total: pending.length + historyRows.length, pending: pending.length, history: historyRows.length };
}

function importPurchaserCoordinate(ss) {
  var all = getFullTable('purchaser_coordinates');
  var pending = all.filter(function (r) { return r['status'] === 'PENDING'; });
  var history = all.filter(function (r) { return r['status'] === 'COORDINATED'; });
  var rows = [];
  pending.forEach(function (r) { rows.push([r['po_number'] || '-', r['vendor_name'] || '-', '-', r['material_name'] || '-', 'Purchaser Coord.', parseDateAny(r['created_at']) || '', '', daysBetween(parseDateAny(r['created_at']), new Date()), 'Pending']); });
  history.forEach(function (r) { rows.push([r['po_number'] || '-', r['vendor_name'] || '-', '-', r['material_name'] || '-', 'Purchaser Coord.', parseDateAny(r['created_at']) || '', parseDateAny(r['coordinated_at']) || '', daysBetween(parseDateAny(r['created_at']), parseDateAny(r['coordinated_at'])), 'History']); });
  writeStepSheet(ss, 'Purchaser Coord.', rows);
  return { label: 'Purchaser Coord.', source: 'purchaser_coordinates', total: pending.length + history.length, pending: pending.length, history: history.length };
}

function importDebitNote(ss) {
  var mismatchAll = getFullTable('Mismatch');
  var sourceRows = mismatchAll.filter(function (r) { return r['coordination_status'] === 'COORDINATED'; });

  var coordinatedDebitData = getFullTable('purchaser_coordinates').filter(function (r) {
    return r['status'] === 'COORDINATED' && r['type'] === 'Make Debit Note';
  });

  var manualReturnsData = getFullTable('Purchase Returns', 'ID');

  var existingMismatchIds = {};
  sourceRows.forEach(function (r) { var id = String(r['id'] || '').trim(); if (id) existingMismatchIds[id] = true; });

  var directDebitMismatchIds = {};
  coordinatedDebitData.forEach(function (r) { var id = String(r['mismatch_id'] || '').trim(); if (id) directDebitMismatchIds[id] = true; });

  var coordinatedMismatchIds = Object.keys(directDebitMismatchIds).filter(function (id) { return !existingMismatchIds[id]; });
  if (coordinatedMismatchIds.length > 0) {
    var idSet = {};
    coordinatedMismatchIds.forEach(function (id) { idSet[id] = true; });

    var fallbackRows = mismatchAll
      .filter(function (r) { return idSet[String(r['id'] || '').trim()]; })
      .map(function (r) { return Object.assign({}, r); });
    fallbackRows.forEach(function (r) {
      r['Status'] = 'Credit Notes';
      r['Action Type'] = r['Action Type'] || 'Make Debit Note';
      sourceRows.push(r);
    });
  }

  var formattedData = sourceRows.map(function (row) {
    var idStr = String(row['id'] || '').trim();
    return {
      supabaseId: idStr,
      liftId: String(row['Lift ID'] || '').trim(),
      firmName: row['Firm Name'] || '',
      partyName: row['Party Name'] || '',
      productName: row['Product Name'] || '',
      status: directDebitMismatchIds[idStr] ? 'Credit Notes' : String(row['Status'] || '').trim(),
      planned: row['Planned'] || null,

      displayPlanned: row['Planned'] || row['Timestamp'] || null,
      actual: row['Actual'] || null,
      actionType: row['Action Type'] || '',
      isReAuditItem: !!row['Planned5'],
      isFromReAudit: row['Action Type'] === 'Make Debit Note (Re-Audit)'
    };
  });

  var prLiftNos = {};
  manualReturnsData.forEach(function (r) {
    var liftNo = String(r['Lift No'] || '').trim();
    if (liftNo) prLiftNos[liftNo] = true;
  });

  var mismatchOnlyRows = formattedData.filter(function (item) {
    return !item.liftId || !prLiftNos[item.liftId] || (item.isReAuditItem ? item.isFromReAudit : item.actionType === 'Make Debit Note');
  });

  var mismatchOnlyIds = {};
  mismatchOnlyRows.forEach(function (item) { mismatchOnlyIds[item.supabaseId] = true; });

  var formattedPurchaseReturns = manualReturnsData.filter(function (row) {
    var mId = String(row['mismatch_id'] || '').trim();
    return !mId || !mismatchOnlyIds[mId];
  }).map(function (row) {
    return {
      supabaseId: 'MANUAL-' + row['ID'],
      liftId: String(row['Lift No'] || '').trim(),
      firmName: row['Firm Name'] || '',
      partyName: row['Party Name'] || '',
      productName: row['Product Name'] || '',
      status: 'Credit Notes',
      planned: null,
      displayPlanned: row['Time Stamp'] || null,
      actual: null,
      actionType: '',
      isReAuditItem: false,
      isFromReAudit: false
    };
  });

  var allMergedData = mismatchOnlyRows.concat(formattedPurchaseReturns);

  function isValidTimestamp(v) { return !!v && v !== 'N/A' && String(v).trim() !== ''; }

  var pending = [];
  var history = [];
  allMergedData.forEach(function (item) {
    var hasPlanned = isValidTimestamp(item.planned);
    var hasActual = isValidTimestamp(item.actual);
    var statusLower = String(item.status || '').toLowerCase();

    var isEligibleDebitNote = hasPlanned || statusLower.indexOf('credit') !== -1 || item.actionType === 'Make Debit Note' || item.isFromReAudit;
    if (isEligibleDebitNote && !hasActual && statusLower.indexOf('return') === -1) {
      pending.push(item);
    } else if (hasActual) {
      history.push(item);
    }
  });

  var rows = [];
  pending.forEach(function (item) {
    var planned = parseDateAny(item.displayPlanned);
    var delay = planned ? daysBetween(planned, new Date()) : '';
    rows.push([item.liftId || '-', item.partyName || '-', item.firmName || '-', item.productName || '-', 'Debit Note', planned || '', '', delay, 'Pending']);
  });
  history.forEach(function (item) {
    var planned = parseDateAny(item.displayPlanned);
    var actual = parseDateAny(item.actual);
    var delay = daysBetween(planned, actual);
    rows.push([item.liftId || '-', item.partyName || '-', item.firmName || '-', item.productName || '-', 'Debit Note', planned || '', actual || '', delay, 'History']);
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

function importAccountsAudit(ss) {
  var mismatchAll = getFullTable('Mismatch');
  var stageFilters = {
    AUDIT: function (r) { return isNull(r['Actual2']) && isNull(r['Actual']); },
    RECTIFY: function (r) { return notNull(r['Planned3']) && isNull(r['Actual3']) && r['Status2'] === 'Not Done'; },
    TALLY_ENTRY: function (r) { return isNull(r['Actual4']) && isNull(r['Actual']); },
    REAUDIT: function (r) { return notNull(r['Planned5']) && isNull(r['Actual5']) && isNull(r['Actual']); },
    BILL_ENTRY: function (r) { return notNull(r['Planned6']) && isNull(r['Actual6']) && isNull(r['Actual']); }
  };
  var stages = [
    { name: 'AUDIT', plannedCol: null },
    { name: 'RECTIFY', plannedCol: 'Planned3' },
    { name: 'TALLY_ENTRY', plannedCol: null },
    { name: 'REAUDIT', plannedCol: 'Planned5' },
    { name: 'BILL_ENTRY', plannedCol: 'Planned6' }
  ];
  var rows = [];
  var totalPending = 0;
  stages.forEach(function (st) {
    var data = mismatchAll.filter(stageFilters[st.name]);
    totalPending += data.length;
    data.forEach(function (r) {
      var planned = st.plannedCol ? parseDateAny(r[st.plannedCol]) : null;
      rows.push([r['Lift ID'] || '-', r['Party Name'] || '-', r['Firm Name'] || '-', r['Product Name'] || '-', st.name, planned || '', '', planned ? daysBetween(planned, new Date()) : '', 'Pending']);
    });
  });
  var history = mismatchAll.filter(function (r) { return notNull(r['Actual6']) && isNull(r['Actual']); });
  history.forEach(function (r) { rows.push([r['Lift ID'] || '-', r['Party Name'] || '-', r['Firm Name'] || '-', r['Product Name'] || '-', 'CLOSED', '', parseDateAny(r['Actual6']) || '', '', 'History']); });
  writeStepSheet(ss, 'Accounts Audit', rows);
  return { label: 'Accounts Audit', source: 'Mismatch (5 sub-stages)', total: totalPending + history.length, pending: totalPending, history: history.length };
}

function isNullVal(v) {
  return v === null || v === undefined;
}

function importAccountsAuditLive(ss) {
  var allMismatch = getFullTable('Mismatch');

  var mismatchLiftIds = {};
  allMismatch.forEach(function (r) {
    var id = String(r['Lift ID'] || r['Lift Number'] || '').trim();
    if (id) mismatchLiftIds[id] = true;
  });

  var liftRows = getFullTable('LIFT-ACCOUNTS');
  var transporterMap = {}, biltyNoMap = {}, biltyImageMap = {}, actual2Map = {};
  liftRows.forEach(function (l) {
    var key = String(l['Lift No'] || '').trim();
    if (!key) return;
    transporterMap[key] = String(l['Transporter Name'] || '').trim();
    biltyNoMap[key] = String(l['Bilty No.'] || '').trim();
    biltyImageMap[key] = String(l['Bilty Image'] || '').trim();
    actual2Map[key] = String(l['Actual 2'] || '').trim();
  });

  function hasBiltyDetails(row, liftNoOverride) {
    var normalizedLiftNo = String(liftNoOverride || row['Lift ID'] || row['Lift Number'] || row['Lift No'] || '').trim();
    var transporter = String(row['Transporter Name'] || transporterMap[normalizedLiftNo] || '').trim().toUpperCase();
    var isBypassed = transporter === 'FOR' || transporter === 'OWNED TRUCK' || transporter === 'BY COMPANY';
    if (isBypassed) {
      var labCompleted = String(row['Actual 2'] || actual2Map[normalizedLiftNo] || '').trim();
      return !!labCompleted;
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
    var rowIsClosed = !isNullVal(r['Actual']);

    if (!rowIsClosed) {
      if (isNullVal(r['Actual2'])) {
        entries.push({ ref: ref, party: party, firm: firm, material: material, subStage: 'AUDIT', planned: r['Planned2'], actual: null, status: 'Pending' });
      } else {
        entries.push({ ref: ref, party: party, firm: firm, material: material, subStage: 'AUDIT', planned: r['Planned2'], actual: r['Actual2'], status: 'History' });
      }
    }

    if (!rowIsClosed) {
      if (!isNullVal(r['Planned3']) && isNullVal(r['Actual3']) && r['Status2'] === 'Not Done') {
        entries.push({ ref: ref, party: party, firm: firm, material: material, subStage: 'RECTIFY', planned: r['Planned3'], actual: null, status: 'Pending' });
      } else if (!isNullVal(r['Actual3'])) {
        entries.push({ ref: ref, party: party, firm: firm, material: material, subStage: 'RECTIFY', planned: r['Planned3'], actual: r['Actual3'], status: 'History' });
      }
    }

    if (!rowIsClosed) {
      var tallyGate = !isNullVal(r['Planned4']) || (!isNullVal(r['Actual2']) && isAuditDone(r)) || (!isNullVal(r['Actual5']) && isReAuditDone(r));
      var tallyPlanned = r['Planned4'] || r['Actual5'] || r['Actual2'];
      if (isNullVal(r['Actual4']) && tallyGate) {
        entries.push({ ref: ref, party: party, firm: firm, material: material, subStage: 'TALLY_ENTRY', planned: tallyPlanned, actual: null, status: 'Pending' });
      } else if (!isNullVal(r['Actual4'])) {
        entries.push({ ref: ref, party: party, firm: firm, material: material, subStage: 'TALLY_ENTRY', planned: tallyPlanned, actual: r['Actual4'], status: 'History' });
      }
    }

    if (!rowIsClosed) {
      if (!isNullVal(r['Planned8']) && isNullVal(r['Actual8'])) {
        entries.push({ ref: ref, party: party, firm: firm, material: material, subStage: 'RE_CHECKING', planned: r['Planned8'], actual: null, status: 'Pending' });
      } else if (!isNullVal(r['Actual8'])) {
        entries.push({ ref: ref, party: party, firm: firm, material: material, subStage: 'RE_CHECKING', planned: r['Planned8'], actual: r['Actual8'], status: 'History' });
      }
    }

    if (!rowIsClosed) {
      if (!isNullVal(r['Planned5']) && isNullVal(r['Actual5'])) {
        entries.push({ ref: ref, party: party, firm: firm, material: material, subStage: 'RE_AUDIT', planned: r['Planned5'], actual: null, status: 'Pending' });
      } else if (!isNullVal(r['Actual5'])) {
        entries.push({ ref: ref, party: party, firm: firm, material: material, subStage: 'RE_AUDIT', planned: r['Planned5'], actual: r['Actual5'], status: 'History' });
      }
    }

    if (!rowIsClosed) {
      if (!isNullVal(r['Planned6']) && isNullVal(r['Actual6'])) {
        entries.push({ ref: ref, party: party, firm: firm, material: material, subStage: 'BILL_ENTRY', planned: r['Planned6'], actual: null, status: 'Pending' });
      } else if (!isNullVal(r['Actual6'])) {
        entries.push({ ref: ref, party: party, firm: firm, material: material, subStage: 'BILL_ENTRY', planned: r['Planned6'], actual: r['Actual6'], status: 'History' });
      }
    }
  });

  liftRows.forEach(function (l) {
    var liftNo = String(l['Lift No'] || '').trim();
    if (!liftNo || mismatchLiftIds[liftNo]) return;
    if (isNullVal(l['Actual 1'])) return;
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
  try { liveSheet.autoResizeColumns(1, liveHeaders.length); } catch (e) {  }

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

function importSaleOfRawMaterial(ss) {
  var fields = ['Order No.', 'Party Name', 'Product Name', 'Planned 2', 'Actual 2', 'Planned 3', 'Actual 3'];

  var invPending = sbFetchAll('Sale Of Raw Material', ['select=' + encSelect(fields), encCol('Planned 2') + '=not.is.null', encCol('Actual 2') + '=is.null'], 'ID');
  var invHistory = sbFetchAll('Sale Of Raw Material', ['select=' + encSelect(fields), encCol('Planned 2') + '=not.is.null', encCol('Actual 2') + '=not.is.null'], 'ID');
  var payPending = sbFetchAll('Sale Of Raw Material', ['select=' + encSelect(fields), encCol('Planned 3') + '=not.is.null', encCol('Actual 3') + '=is.null'], 'ID');
  var payHistory = sbFetchAll('Sale Of Raw Material', ['select=' + encSelect(fields), encCol('Planned 3') + '=not.is.null', encCol('Actual 3') + '=not.is.null'], 'ID');
  var rows = [];
  invPending.forEach(function (r) { rows.push(mkRow(r, 'Order No.', 'Party Name', null, 'Product Name', 'Planned 2', null, 'Invoice', 'Pending')); });
  invHistory.forEach(function (r) { rows.push(mkRow(r, 'Order No.', 'Party Name', null, 'Product Name', 'Planned 2', 'Actual 2', 'Invoice', 'History')); });
  payPending.forEach(function (r) { rows.push(mkRow(r, 'Order No.', 'Party Name', null, 'Product Name', 'Planned 3', null, 'Payment / Collection', 'Pending')); });
  payHistory.forEach(function (r) { rows.push(mkRow(r, 'Order No.', 'Party Name', null, 'Product Name', 'Planned 3', 'Actual 3', 'Payment / Collection', 'History')); });
  writeStepSheet(ss, 'Sale Of Raw Material', rows);
  return { label: 'Sale Of Raw Material', source: 'Sale Of Raw Material', total: rows.length, pending: invPending.length + payPending.length, history: invHistory.length + payHistory.length };
}

function importPurchaseReturn(ss) {
  var mismatchAll = getFullTable('Mismatch');
  var mismatchRows = mismatchAll.filter(function (m) {
    return m['Status'] === 'Purchase Return' && m['coordination_status'] === 'COORDINATED';
  });

  var coordinatedReturnData = getFullTable('purchaser_coordinates').filter(function (r) {
    return r['status'] === 'COORDINATED' && r['type'] === 'Return Material and Make Debit Note';
  });
  var existingPendingIds = {};
  mismatchRows.forEach(function (m) { var id = String(m['id'] || '').trim(); if (id) existingPendingIds[id] = true; });
  var coordinatedMismatchIds = [];
  coordinatedReturnData.forEach(function (r) {
    var id = String(r['mismatch_id'] || '').trim();
    if (id && !existingPendingIds[id]) coordinatedMismatchIds.push(id);
  });
  if (coordinatedMismatchIds.length > 0) {
    var idSet = {};
    coordinatedMismatchIds.forEach(function (id) { idSet[id] = true; });
    var fallbackRows = mismatchAll.filter(function (r) { return idSet[String(r['id'] || '').trim()]; });
    mismatchRows = mismatchRows.concat(fallbackRows);
  }

  var seenIds = {};
  mismatchRows = mismatchRows.filter(function (m) {
    var id = String(m['id'] || '').trim();
    if (!id || seenIds[id]) return false;
    seenIds[id] = true;
    return true;
  });

  var allReturns = getFullTable('Purchase Returns', 'ID');
  var returnedQtyMap = {}, totalReturnQtyMap = {}, returnedQtyByLiftMap = {}, totalReturnQtyByLiftMap = {};
  allReturns.forEach(function (r) {
    var mId = String(r['mismatch_id'] || '').trim();
    var liftNo = String(r['Lift No'] || '').trim();
    var returnedThisTime = parseFloat(r['Return This Time']) || parseFloat(r['Qty']) || 0;
    var configuredTotal = parseFloat(r['Total Return Qty']) || 0;
    if (mId) {
      returnedQtyMap[mId] = (returnedQtyMap[mId] || 0) + returnedThisTime;
      if (configuredTotal > 0) totalReturnQtyMap[mId] = Math.max(totalReturnQtyMap[mId] || 0, configuredTotal);
    }
    if (liftNo) {
      returnedQtyByLiftMap[liftNo] = (returnedQtyByLiftMap[liftNo] || 0) + returnedThisTime;
      if (configuredTotal > 0) totalReturnQtyByLiftMap[liftNo] = Math.max(totalReturnQtyByLiftMap[liftNo] || 0, configuredTotal);
    }
  });

  var liftNos = uniq(mismatchRows.map(function (m) { return m['Lift Number'] || m['Lift ID']; }).filter(Boolean));
  var liftNoSet = {};
  liftNos.forEach(function (n) { liftNoSet[n] = true; });
  var liftQtyMap = {};
  getFullTable('LIFT-ACCOUNTS').forEach(function (la) {
    var lNo = String(la['Lift No'] || '').trim();
    if (lNo && liftNoSet[lNo]) liftQtyMap[lNo] = parseFloat(la['Actual Quantity']) || 0;
  });

  var stillPending = mismatchRows.map(function (m) {
    var mId = String(m['id'] || '').trim();
    var liftNo = String(m['Lift Number'] || m['Lift ID'] || '').trim();
    var receivedQty = liftQtyMap[liftNo];
    var totalQty = (receivedQty !== undefined && receivedQty > 0) ? receivedQty : (parseFloat(m['Qty']) || parseFloat(m['Quantity']) || parseFloat(m['Lifting Quantity']) || 0);
    var returnedByMismatchId = returnedQtyMap[mId] || 0;
    var returnedByLiftNo = returnedQtyByLiftMap[liftNo] || 0;
    var returnedQty = Math.max(returnedByMismatchId, returnedByLiftNo);
    var configuredTotalReturnQty = totalReturnQtyMap[mId] || totalReturnQtyByLiftMap[liftNo] || 0;
    var returnTargetQty = configuredTotalReturnQty > 0 ? configuredTotalReturnQty : totalQty;
    var pendingQty = Math.max(0, returnTargetQty - returnedQty);
    var isStillPending = pendingQty > 0.001 || (returnedQty === 0 && returnTargetQty > 0);
    if (!isStillPending) return null;

    var copy = Object.assign({}, m);
    copy.__pendingQty = pendingQty;
    copy.__liftNo = liftNo;
    return copy;
  }).filter(function (m) { return m; });

  var byLift = {};
  var liftOrder = [];
  var noLift = [];
  stillPending.forEach(function (m) {
    if (!m.__liftNo) { noLift.push(m); return; }
    var existing = byLift[m.__liftNo];
    if (!existing) liftOrder.push(m.__liftNo);
    if (!existing || m.__pendingQty > existing.__pendingQty) byLift[m.__liftNo] = m;
  });
  var pending = liftOrder.map(function (k) { return byLift[k]; }).concat(noLift);

  var history = sortByDateDesc(getFullTable('Purchase Returns', 'ID'), 'Time Stamp');

  var mismatchById = {};
  mismatchAll.forEach(function (r) { mismatchById[r['id']] = r; });

  var rows = [];
  pending.forEach(function (r) {

    var plannedVal = r['Timestamp'] || r['Actual'] || r['Actual6'] || r['Actual5'] || r['Actual4'] || r['Actual3'] || r['Actual2'];
    var planned = parseDateAny(plannedVal);
    var delay = planned ? daysBetween(planned, new Date()) : '';
    rows.push([r['Lift Number'] || r['Lift ID'] || '-', r['Party Name'] || '-', r['Firm Name'] || '-', r['Product Name'] || '-', 'Purchase Return', planned || '', '', delay, 'Pending']);
  });
  history.forEach(function (r) {
    var m = mismatchById[r['mismatch_id']] || {};
    var plannedVal = m['Timestamp'] || m['Actual'] || m['Actual6'] || m['Actual5'] || m['Actual4'] || m['Actual3'] || m['Actual2'];
    var planned = parseDateAny(plannedVal);
    var actual = parseDateAny(r['Time Stamp']);
    var delay = daysBetween(planned, actual);
    rows.push([r['Purchase Return No.'] || r['Lift No'] || '-', r['Party Name'] || '-', r['Firm Name'] || '-', r['Product Name'] || '-', 'Purchase Return', planned || '', actual || '', delay, 'History']);
  });
  writeStepSheet(ss, 'Purchase Return', rows);
  return { label: 'Purchase Return', source: 'Mismatch + purchaser_coordinates + Purchase Returns + LIFT-ACCOUNTS', total: pending.length + history.length, pending: pending.length, history: history.length };
}

function importKyc(ss) {
  var fields = ['Type Of KYC Form', 'Vendor Name KYC', 'Product Name', 'Transporter Name 2'];
  var data = sbFetchAll('Master', ['select=' + encSelect(fields)]);
  var kycOnly = data.filter(function (r) { return ['Product', 'Transportation', 'Vendor'].indexOf(r['Type Of KYC Form']) !== -1; });
  var rows = kycOnly.map(function (r) {
    var name = r['Vendor Name KYC'] || r['Product Name'] || r['Transporter Name 2'] || '-';
    return [name, '-', '-', r['Type Of KYC Form'] || '-', 'KYC', '', '', '', 'Live'];
  });
  writeStepSheet(ss, 'KYC', rows);
  return { label: 'KYC', source: 'Master', total: rows.length, pending: 0, history: rows.length };
}

function importTolerance(ss) {
  var data = gvizFetchTable(GVIZ_SHEET_ID, 'TL');
  var sheet = getOrCreateSheet(ss, 'Tolerance');
  sheet.clearContents();
  if (data.headers.length) {
    sheet.getRange(1, 1, 1, data.headers.length).setValues([data.headers]).setFontWeight('bold').setBackground('#7da23a').setFontColor('#ffffff');
  }
  if (data.rows.length) {
    sheet.getRange(2, 1, data.rows.length, data.headers.length).setValues(data.rows);
  }
  sheet.setFrozenRows(1);
  return { label: 'Tolerance', source: 'Google Sheet "TL" tab (not Supabase)', total: data.rows.length, pending: '-', history: '-' };
}

function importVendorPayment(ss) {
  var sheet = getOrCreateSheet(ss, 'Vendor Payment');
  sheet.clearContents();
  var headers = ['Firm Key', 'Firm Label', 'External Sheet Link'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#7da23a').setFontColor('#ffffff');
  var rows = [
    ['pmmpl', 'PMMPl', 'https://docs.google.com/spreadsheets/d/1VR2nVpRVaDFG54vzNsAjmQFGielNYX_ykjzGYY3UT9M/edit?gid=0#gid=0'],
    ['rkl', 'Rkl', 'https://docs.google.com/spreadsheets/d/1QVEUJrh0R-8ibt_Md8wbCA3j0ZN2gBWN_wPdlfVqW08/edit?gid=0#gid=0'],
    ['purab', 'Purab', 'https://docs.google.com/spreadsheets/d/1eMZCScHdVAn3gS2fsMYg7Tig7WVcp9duh5yiyx2Laqo/edit?gid=0#gid=0']
  ];
  sheet.getRange(2, 1, rows.length, 3).setValues(rows);
  sheet.getRange(rows.length + 3, 1).setValue('Note: Vendor Payment has no live Supabase data — the app only redirects to these external per-firm sheets.');
  return { label: 'Vendor Payment', source: 'Static (no DB)', total: 3, pending: '-', history: '-' };
}

function importFinalTallyEntry(ss) {
  var cellsRows = gvizFetchRawRows(GVIZ_SHEET_ID, 'LIFT-ACCOUNTS');
  var rows = [];
  cellsRows.forEach(function (cells) {
    var primaryId = cellVal(cells, 1);
    if (!primaryId) return;
    var vendor = cellVal(cells, 3);
    var firmName = cellVal(cells, 55);
    var baValue = cellVal(cells, 52);
    var bbValue = cellVal(cells, 53);
    if (!baValue || String(baValue).trim() === '') return;
    var isCompleted = bbValue !== null && String(bbValue).trim() !== '';
    rows.push([primaryId, vendor || '-', firmName || '-', '-', 'Final Tally Entry', '', isCompleted ? parseGvizDate(bbValue) : '', '', isCompleted ? 'History' : 'Pending']);
  });
  writeStepSheet(ss, 'Final Tally Entry', rows);
  var pendingCount = rows.filter(function (r) { return r[8] === 'Pending'; }).length;
  return { label: 'Final Tally Entry', source: 'Google Sheet "LIFT-ACCOUNTS" tab (not Supabase)', total: rows.length, pending: pendingCount, history: rows.length - pendingCount };
}

function importRectifyMistake2(ss) {
  var cellsRows = gvizFetchRawRows(GVIZ_SHEET_ID, 'ACCOUNTS');
  var rows = [];
  cellsRows.forEach(function (cells) {
    var timestamp = cellVal(cells, 0);
    var liftNumber = cellVal(cells, 1);
    var type = cellVal(cells, 2);
    if (!timestamp || timestamp === 'Timestamp' || !liftNumber) return;
    var ae = cellVal(cells, 30);
    var af = cellVal(cells, 31);
    if (!ae || String(ae).trim() === '') return;
    var isDone = af !== null && String(af).trim() !== '';
    rows.push([liftNumber, '-', '-', type || '-', 'Rectify Mistake 2', '', isDone ? parseGvizDate(af) : '', '', isDone ? 'History' : 'Pending']);
  });
  writeStepSheet(ss, 'Rectify Mistake 2', rows);
  var pendingCount = rows.filter(function (r) { return r[8] === 'Pending'; }).length;
  return { label: 'Rectify Mistake 2', source: 'Google Sheet "ACCOUNTS" tab (not Supabase)', total: rows.length, pending: pendingCount, history: rows.length - pendingCount };
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
    summary.push(importPoHistory(ss));
    summary.push(importArrangeLogistics(ss));
    summary.push(importLogisticsApproval(ss));
    summary.push(importLab(ss));
    summary.push(importBilty(ss));
    summary.push(importReceipt(ss));
    summary.push(importLift(ss));
    summary.push(importLiftDelayReport(ss));
    summary.push(importUnloadApproval(ss));
    summary.push(importLabReport(ss));
    summary.push(importCrm(ss));
    summary.push(importMismatchStep(ss));
    summary.push(importPurchaserCoordinate(ss));
    summary.push(importDebitNote(ss));
    summary.push(importFullkitting(ss));
    summary.push(importAccountsAudit(ss));
    summary.push(importAccountsAuditLive(ss));
    summary.push(importSaleOfRawMaterial(ss));
    summary.push(importPurchaseReturn(ss));
    summary.push(importKyc(ss));
    summary.push(importTolerance(ss));
    summary.push(importVendorPayment(ss));
    summary.push(importFinalTallyEntry(ss));
    summary.push(importRectifyMistake2(ss));

    writeSummarySheet(ss, summary);
    SpreadsheetApp.getUi().alert('✅ Import complete: ' + summary.length + ' steps refreshed. See "📋 Summary" sheet.');
  } catch (err) {
    SpreadsheetApp.getUi().alert('❌ Import failed: ' + err.message);
    throw err;
  }
}

function installHourlyTrigger() {
  removeHourlyTrigger();
  ScriptApp.newTrigger('importAllSteps').timeBased().everyHours(1).create();
  SpreadsheetApp.getUi().alert('Hourly auto-refresh installed — the sheet will now pull live data every hour.');
}

function removeHourlyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'importAllSteps') ScriptApp.deleteTrigger(t);
  });
}
