/**
 * CALL TRACKER MIS  (Planned Date vs Actual Date)
 * ------------------------------------------------
 * Har unique Enquiry No. (Call Tracker sheet, Col A) ke liye
 * "Call Track" sheet se data laata hai:
 *   - Actual Date  = Call Track Col A (Timestamp) ka LAST (sabse latest) entry
 *   - Planned Date = usi last entry ka Call Track Col F (Next Call Date & Time)
 *
 * Call Track me ek enquiry tab tak repeat hoti hai jab tak Col E
 * (Order Received) "Expected" hai. Script har enquiry ki sirf latest row
 * uthata hai, isliye manual update ki zarurat nahi.
 *
 * Use:  Menu "📊 Call MIS" > "Refresh MIS"  ya  refreshCallMIS() run karein.
 */

const MIS_CONFIG = {
  SOURCE_LIST_SHEET: 'Call Tracker', // unique enquiry list yahan se
  SOURCE_LIST_COL: 1,                // Col A = Enquiry No.
  SOURCE_LIST_FIRST_ROW: 3,          // Row 1 = count, Row 2 = header

  CALL_TRACK_SHEET: 'Call Track',
  CALL_TRACK_FIRST_ROW: 2,           // Row 1 = header
  CT_COL_TIMESTAMP: 1,               // A
  CT_COL_ENQUIRY: 2,                 // B
  CT_COL_STATUS: 3,                  // C
  CT_COL_ORDER_RECEIVED: 5,          // E
  CT_COL_NEXT_CALL: 6,               // F
  CT_COL_FIRM: 10,                   // J
  CT_COL_PARTY: 11,                  // K

  OUTPUT_SHEET: 'Call MIS',          // naya sheet, script khud bana dega
  DATE_FORMAT: 'dd/MM/yyyy HH:mm'
};

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
  const listSheet = ss.getSheetByName(C.SOURCE_LIST_SHEET);
  const ctSheet = ss.getSheetByName(C.CALL_TRACK_SHEET);
  if (!listSheet) throw new Error('Sheet nahi mili: ' + C.SOURCE_LIST_SHEET);
  if (!ctSheet) throw new Error('Sheet nahi mili: ' + C.CALL_TRACK_SHEET);

  // 1) Call Tracker Col A se unique enquiry numbers (order same rahega)
  const enquiries = [];
  const seen = {};
  const listLastRow = listSheet.getLastRow();
  if (listLastRow >= C.SOURCE_LIST_FIRST_ROW) {
    listSheet
      .getRange(C.SOURCE_LIST_FIRST_ROW, C.SOURCE_LIST_COL, listLastRow - C.SOURCE_LIST_FIRST_ROW + 1, 1)
      .getDisplayValues()
      .forEach(function (r) {
        const display = String(r[0]).trim();
        const key = normKey_(display);
        if (key && !seen[key]) {
          seen[key] = true;
          enquiries.push(display);
        }
      });
  }

  // 2) Call Track ki har enquiry ki LATEST row (max timestamp) + total calls
  const latest = {}; // key -> { row, ts, count }
  const ctLastRow = ctSheet.getLastRow();
  if (ctLastRow >= C.CALL_TRACK_FIRST_ROW) {
    const numRows = ctLastRow - C.CALL_TRACK_FIRST_ROW + 1;
    const numCols = Math.max(C.CT_COL_PARTY, C.CT_COL_NEXT_CALL, C.CT_COL_ORDER_RECEIVED);
    const range = ctSheet.getRange(C.CALL_TRACK_FIRST_ROW, 1, numRows, numCols);
    const values = range.getValues();
    const display = range.getDisplayValues();

    for (let i = 0; i < values.length; i++) {
      const key = normKey_(display[i][C.CT_COL_ENQUIRY - 1]);
      if (!key) continue;
      const ts = toDate_(values[i][C.CT_COL_TIMESTAMP - 1]);
      const tsNum = ts ? ts.getTime() : -1;

      const cur = latest[key];
      if (!cur) {
        latest[key] = { row: values[i], ts: tsNum, count: 1 };
      } else {
        cur.count++;
        // ">=" : same timestamp ho to neeche wali (baad me bhari gayi) row lo
        if (tsNum >= cur.ts) {
          cur.row = values[i];
          cur.ts = tsNum;
        }
      }
    }
  }

  // 3) Output rows banao
  const out = enquiries.map(function (enq, idx) {
    const hit = latest[normKey_(enq)];
    if (!hit) {
      return [idx + 1, enq, '', '', 0, '', '', '', 'No Call Yet'];
    }
    const r = hit.row;
    const orderRec = String(r[C.CT_COL_ORDER_RECEIVED - 1]).trim();
    const o = orderRec.toLowerCase();
    const status = (o === 'yes' || o === 'no') ? 'Closed (' + orderRec + ')' : 'Open';
    return [
      idx + 1,
      enq,
      r[C.CT_COL_FIRM - 1],
      r[C.CT_COL_PARTY - 1],
      hit.count,
      orderRec,
      toDate_(r[C.CT_COL_NEXT_CALL - 1]) || r[C.CT_COL_NEXT_CALL - 1], // Planned (Col F)
      toDate_(r[C.CT_COL_TIMESTAMP - 1]) || r[C.CT_COL_TIMESTAMP - 1], // Actual (last Col A)
      status
    ];
  });

  // 4) Output sheet me likho
  let outSheet = ss.getSheetByName(C.OUTPUT_SHEET);
  if (!outSheet) outSheet = ss.insertSheet(C.OUTPUT_SHEET);
  outSheet.clearContents();

  const headers = [[
    'S.No.', 'Enquiry No.', 'Firm Name', 'Party Name', 'Total Calls',
    'Order Received (Latest)', 'Planned Date', 'Actual Date', 'Status'
  ]];
  outSheet.getRange(1, 1).setValue(
    'Call MIS  |  Last Updated: ' +
    Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), C.DATE_FORMAT) +
    '  |  Total Enquiries: ' + out.length
  ).setFontWeight('bold');
  outSheet.getRange(2, 1, 1, headers[0].length).setValues(headers)
    .setFontWeight('bold').setBackground('#1f4e78').setFontColor('#ffffff');

  if (out.length) {
    outSheet.getRange(3, 1, out.length, headers[0].length).setValues(out);
    outSheet.getRange(3, 7, out.length, 2).setNumberFormat(C.DATE_FORMAT);
  }
  outSheet.setFrozenRows(2);

  ss.toast('MIS update ho gaya: ' + out.length + ' enquiries', 'Call MIS', 5);
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
