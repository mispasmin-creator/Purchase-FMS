/**
 * CALL TRACKER MIS  (Firm-wise Planned vs Actual)
 * -----------------------------------------------
 * "Mis" sheet (Q:AI) + "FInal MIS" sheet ka kaam ek hi script me, bina manual paste ke.
 *
 * Logic (Call Track sheet se):
 *   - Har wo call jiska Col E (Order Received) = "Expected" hai, ek row banti hai.
 *   - Planned = us call ka Col F (Next Call Date & Time)
 *   - Actual  = usi Enquiry No. (Col B) ki AGLI call ka Col A (Timestamp)
 *               (agli call abhi nahi hui to Actual khali = Pending)
 *   - Delay   = Actual (ya pending ho to aaj) - Planned, din me (0 se kam nahi)
 *   - Sirf wo rows jinka Planned <= aaj + 1 din (FInal MIS jaisa filter)
 *
 * Output: "Call MIS" sheet me firm-wise blocks (PMMPL | RKL | PURAB).
 * Use: Menu "📊 Call MIS" > "Refresh MIS"  ya  refreshCallMIS() run karein.
 */

const MIS_CONFIG = {
  CALL_TRACK_SHEET: 'Call Track',
  CALL_TRACK_FIRST_ROW: 2,       // Row 1 = header
  CT_COL_TIMESTAMP: 1,           // A
  CT_COL_ENQUIRY: 2,             // B
  CT_COL_ORDER_RECEIVED: 5,      // E
  CT_COL_NEXT_CALL: 6,           // F
  CT_COL_FIRM: 10,               // J
  CT_COL_CALL_NO: 12,            // L

  FIRMS: ['PMMPL', 'RKL', 'PURAB'], // FInal MIS wala order
  OPEN_STATUS: 'expected',
  PLANNED_UPTO_DAYS: 1,          // Planned <= aaj + 1 (FInal MIS jaisa). null = sab rows

  OUTPUT_SHEET: 'Call MIS',      // naya sheet, script khud bana dega
  DATE_FORMAT: 'dd/MM/yyyy HH:mm'
};

const MIS_HEADERS = ['Firm Name', 'Enquiry No.', 'Call-Unique No', 'Planned', 'Actual', 'Delay (Days)'];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📊 Call MIS')
    .addItem('Refresh MIS', 'refreshCallMIS')
    .addItem('Auto refresh har 1 ghante (trigger lagao)', 'createHourlyMisTrigger')
    .addToUi();
}

function refreshCallMIS() {
  const C = MIS_CONFIG;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ctSheet = ss.getSheetByName(C.CALL_TRACK_SHEET);
  if (!ctSheet) throw new Error('Sheet nahi mili: ' + C.CALL_TRACK_SHEET);

  // 1) Call Track padho
  const calls = [];
  const lastRow = ctSheet.getLastRow();
  if (lastRow >= C.CALL_TRACK_FIRST_ROW) {
    const range = ctSheet.getRange(C.CALL_TRACK_FIRST_ROW, 1, lastRow - C.CALL_TRACK_FIRST_ROW + 1, C.CT_COL_CALL_NO);
    const values = range.getValues();
    const display = range.getDisplayValues();
    for (let i = 0; i < values.length; i++) {
      const enq = display[i][C.CT_COL_ENQUIRY - 1].trim();
      const ts = toDate_(values[i][C.CT_COL_TIMESTAMP - 1]);
      if (!enq || !ts) continue;
      calls.push({
        idx: i,
        key: normKey_(enq),
        enq: enq,
        ts: ts,
        status: display[i][C.CT_COL_ORDER_RECEIVED - 1].trim().toLowerCase(),
        planned: toDate_(values[i][C.CT_COL_NEXT_CALL - 1]),
        firm: display[i][C.CT_COL_FIRM - 1].trim().toUpperCase(),
        callNo: display[i][C.CT_COL_CALL_NO - 1]
      });
    }
  }

  // 2) Har enquiry ki calls time ke order me -> agli call ka timestamp = Actual
  const byEnq = {};
  calls.forEach(function (c) { (byEnq[c.key] = byEnq[c.key] || []).push(c); });
  Object.keys(byEnq).forEach(function (k) {
    const list = byEnq[k].sort(function (a, b) { return (a.ts - b.ts) || (a.idx - b.idx); });
    for (let i = 0; i < list.length; i++) list[i].actual = i + 1 < list.length ? list[i + 1].ts : null;
  });

  // 3) Firm-wise rows (Call Track ke order me, jaise QUERY deta tha)
  const now = new Date();
  const limit = C.PLANNED_UPTO_DAYS == null ? null : startOfDay_(addDays_(now, C.PLANNED_UPTO_DAYS));
  const blocks = C.FIRMS.map(function () { return []; });
  calls.forEach(function (c) {
    if (c.status !== C.OPEN_STATUS) return;
    const f = C.FIRMS.indexOf(c.firm);
    if (f === -1 || !c.planned) return;
    if (limit && c.planned > limit) return;
    const delay = Math.max(0, dayDiff_(c.planned, c.actual || now));
    blocks[f].push([c.firm, c.enq, c.callNo, c.planned, c.actual || 'Pending', delay]);
  });

  // 4) Output sheet me likho: har firm ka block, beech me 1 khali column
  let out = ss.getSheetByName(C.OUTPUT_SHEET) || ss.insertSheet(C.OUTPUT_SHEET);
  out.clear();
  const w = MIS_HEADERS.length;
  out.getRange(1, 1).setValue('Call MIS  |  Last Updated: ' +
    Utilities.formatDate(now, ss.getSpreadsheetTimeZone(), C.DATE_FORMAT)).setFontWeight('bold');

  blocks.forEach(function (rows, b) {
    const col = 1 + b * (w + 1);
    out.getRange(2, col).setValue(C.FIRMS[b] + '  (' + rows.length + ')').setFontWeight('bold');
    out.getRange(3, col, 1, w).setValues([MIS_HEADERS])
      .setFontWeight('bold').setBackground('#1f4e78').setFontColor('#ffffff');
    if (rows.length) {
      out.getRange(4, col, rows.length, w).setValues(rows);
      out.getRange(4, col + 3, rows.length, 2).setNumberFormat(C.DATE_FORMAT);
    }
  });
  out.setFrozenRows(3);

  ss.toast('MIS update ho gaya', 'Call MIS', 5);
}

/** Har 1 ghante me auto refresh (sirf ek baar run karein) */
function createHourlyMisTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'refreshCallMIS') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('refreshCallMIS').timeBased().everyHours(1).create();
  SpreadsheetApp.getActiveSpreadsheet().toast('Hourly auto-refresh trigger set ho gaya', 'Call MIS', 5);
}

// "EN-12 ", "en-12" -> "EN-12"
function normKey_(v) {
  return String(v == null ? '' : v).replace(/\s+/g, '').toUpperCase();
}

function toDate_(v) {
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  if (v === '' || v == null) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function addDays_(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfDay_(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Sirf date ka farak (time ignore), jaise 26/07 -> 29/07 = 3
function dayDiff_(from, to) {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86400000);
}
