/**
 * @fileoverview
 * Public Assignment Summary as a JPSO "Detail Schedule" PDF.
 *
 * Mirrors the paper/fillable form: each form is two landscape pages
 * (days 1-14, then days 15-31 with per-row Total Hours), 17 numbered rows,
 * and three riders per form starting on rows 1, 7 and 13. Every escort is its
 * own entry: hours on the first line and the from-to time (HHMM-HHMM) below.
 * When a rider has several escorts on the same day they go on the rider's
 * following rows, as on the paper form.
 */

const DETAIL_SCHEDULE = {
  businessName: 'Traffic',
  rowsPerForm: 17,
  rowsPerRiderBlock: 6,
  firstPageDays: 14,
  rankPrefixes: [
    'capt', 'captain', 'sgt', 'sergeant', 'lt', 'lieut', 'lieutenant', 'cpl', 'corporal',
    'dep', 'deputy', 'det', 'detective', 'ofc', 'officer', 'maj', 'major', 'col', 'colonel',
    'chief', 'cmdr', 'commander', 'insp', 'inspector', 'agent', 'tfc', 'trooper', 'sheriff'
  ],
  nameSuffixes: ['jr', 'sr', 'ii', 'iii', 'iv', 'v']
};

/**
 * Builds the Public Assignment Summary PDF for the month containing startDate.
 * @param {string} startDate Date in YYYY-MM-DD format (any day in the month).
 * @return {{success: boolean, pdfBase64?: string, filename?: string, html?: string, riderCount?: number, message?: string}}
 */
function exportPublicAssignmentSummaryPDF(startDate) {
  try {
    const summary = buildPublicAssignmentSummaryData(startDate);
    if (!summary.riders.length) {
      throw new Error('No completed escorts found for this month');
    }

    const html = buildDetailScheduleHtml(summary);
    const monthLabel = `${summary.year}-${String(summary.month + 1).padStart(2, '0')}`;
    const filename = `Public Assignment Summary ${monthLabel}.pdf`;

    let pdfBase64 = '';
    try {
      const pdfBlob = Utilities.newBlob(html, 'text/html', 'detail-schedule.html')
        .getAs('application/pdf')
        .setName(filename);
      pdfBase64 = Utilities.base64Encode(pdfBlob.getBytes());
    } catch (conversionError) {
      // The page falls back to a printable view if PDF conversion is unavailable.
      logError('PDF conversion failed in exportPublicAssignmentSummaryPDF', conversionError);
    }

    return {
      success: true,
      pdfBase64: pdfBase64,
      filename: filename,
      html: html,
      riderCount: summary.riders.length
    };
  } catch (error) {
    logError('Error in exportPublicAssignmentSummaryPDF', error);
    return { success: false, message: error.message };
  }
}

/**
 * Lays riders out into forms of 17 rows and returns the full HTML document.
 * @param {{year: number, month: number, daysInMonth: number, riders: Array<object>}} summary
 * @return {string}
 */
function buildDetailScheduleHtml(summary) {
  const forms = layoutDetailScheduleForms(summary);
  const monthName = Utilities.formatDate(new Date(summary.year, summary.month, 1),
    Session.getScriptTimeZone(), 'MMMM yyyy');
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const days = [];
  for (let d = 1; d <= 31; d++) {
    const inMonth = d <= summary.daysInMonth;
    days.push({
      day: d,
      inMonth: inMonth,
      weekday: inMonth ? weekdayNames[new Date(summary.year, summary.month, d).getDay()] : ''
    });
  }
  const firstDays = days.slice(0, DETAIL_SCHEDULE.firstPageDays);
  const secondDays = days.slice(DETAIL_SCHEDULE.firstPageDays);

  const pages = [];
  forms.forEach(form => {
    pages.push(renderDetailSchedulePageOne(form, firstDays, monthName));
    pages.push(renderDetailSchedulePageTwo(form, secondDays));
  });

  return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' + DETAIL_SCHEDULE_CSS + '</style></head><body>' +
    pages.join('<div class="page-break"></div>') +
    '</body></html>';
}

/**
 * Places each rider into a block of rows. Rider k on a form starts at row 1, 7 or 13;
 * a rider with more same-day escorts than the block holds gets extra rows, and a
 * rider that does not fit in the rows left on a form starts a new form.
 */
function layoutDetailScheduleForms(summary) {
  const rowsPerForm = DETAIL_SCHEDULE.rowsPerForm;
  const forms = [];
  let form = null;
  let cursor = 0;

  const newForm = () => {
    form = { rows: [] };
    for (let i = 0; i < rowsPerForm; i++) {
      form.rows.push({ label: '', payroll: '', days: {}, total: 0 });
    }
    forms.push(form);
    cursor = 0;
  };

  summary.riders.forEach(rider => {
    // One row per escort on the busiest day, at least one row.
    const rowsNeeded = Math.max(1, ...rider.dailyEntries.map(entries => entries.length));

    // Sort each day's escorts by start time; entry i goes on the rider's i-th row.
    const sortedDays = rider.dailyEntries.map(entries => entries.slice().sort((a, b) => {
      const am = timeValueToMinutes(a.start);
      const bm = timeValueToMinutes(b.start);
      return (am === null ? 9999 : am) - (bm === null ? 9999 : bm);
    }));

    if (!form || (cursor > 0 && cursor + Math.min(rowsNeeded, rowsPerForm) > rowsPerForm)) {
      newForm();
    }

    const label = formatDetailScheduleName(rider);
    for (let r = 0; r < rowsNeeded; r++) {
      if (cursor >= rowsPerForm) {
        newForm(); // only for a rider needing more rows than one whole form
      }
      const row = form.rows[cursor];
      if (r === 0 || cursor === 0) {
        row.label = label;
        row.payroll = rider.id || '';
      }
      sortedDays.forEach((entries, dayIndex) => {
        const entry = entries[r];
        if (entry) {
          row.days[dayIndex + 1] = entry;
          row.total += entry.hours;
        }
      });
      cursor++;
    }

    // Keep the paper form's spacing: the next rider starts on the next block (rows 1, 7, 13).
    const used = rowsNeeded % rowsPerForm || rowsPerForm;
    const blockRows = Math.max(DETAIL_SCHEDULE.rowsPerRiderBlock, used);
    const blockStart = cursor - used;
    cursor = Math.min(rowsPerForm, blockStart + blockRows);
  });

  forms.forEach(f => {
    f.totalHours = f.rows.reduce((sum, row) => sum + row.total, 0);
  });
  return forms;
}

/**
 * "1317 Alvarado, Julio" - Rider ID, then Last, First with any rank removed.
 */
function formatDetailScheduleName(rider) {
  let name = String(rider.name || '').replace(/\s+/g, ' ').trim();
  let lastFirst = name;

  if (name.indexOf(',') === -1) {
    const parts = name.split(' ');
    while (parts.length > 2 &&
           DETAIL_SCHEDULE.rankPrefixes.indexOf(parts[0].replace(/\./g, '').toLowerCase()) !== -1) {
      parts.shift();
    }
    if (parts.length >= 2) {
      let lastStart = parts.length - 1;
      if (parts.length > 2 &&
          DETAIL_SCHEDULE.nameSuffixes.indexOf(parts[lastStart].replace(/[.,]/g, '').toLowerCase()) !== -1) {
        lastStart--;
      }
      const last = parts.slice(lastStart).join(' ');
      const first = parts.slice(0, lastStart).join(' ');
      lastFirst = `${last}, ${first}`;
    } else {
      lastFirst = parts.join(' ');
    }
  }

  return rider.jpNumber ? `${rider.jpNumber} ${lastFirst}` : lastFirst;
}

/** Hours inside a day cell, written like the form: .25, .5, 1.0, 1.25, 2.0 */
function formatDetailScheduleCellHours(hours) {
  const rounded = roundToQuarterHour(hours);
  if (rounded <= 0) return '0';
  if (Number.isInteger(rounded)) return rounded.toFixed(1);
  const text = String(rounded);
  return rounded < 1 ? text.replace(/^0/, '') : text;
}

/** Totals, written like the form: 7.25, 0.25, 3, 0 */
function formatDetailScheduleTotal(hours) {
  const rounded = roundToQuarterHour(hours);
  return String(Number(rounded.toFixed(2)));
}

/** HHMM, e.g. 1630, 0800, 0000 */
function formatDetailScheduleTime(value) {
  const minutes = timeValueToMinutes(value);
  if (minutes === null) return '';
  return String(Math.floor(minutes / 60)).padStart(2, '0') + String(minutes % 60).padStart(2, '0');
}

function formatDetailScheduleEntry(entry) {
  if (!entry) return '';
  const start = formatDetailScheduleTime(entry.start);
  const end = formatDetailScheduleTime(entry.end);
  let time = 'TBD';
  if (start && end) {
    time = `${start}-${end}`;
  } else if (start || end) {
    time = start || end;
  }
  return '<div class="hrs">' + escapeDetailScheduleHtml(formatDetailScheduleCellHours(entry.hours)) + '</div>' +
         '<div class="tm">' + escapeDetailScheduleHtml(time) + '</div>';
}

function escapeDetailScheduleHtml(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderDetailScheduleDayHeaders(days) {
  return days.map(d =>
    '<th class="day' + (d.inMonth ? '' : ' out') + '"><div class="wd">' + escapeDetailScheduleHtml(d.weekday) +
    '</div><div class="dn">' + d.day + '</div></th>').join('');
}

function renderDetailScheduleDayCells(row, days) {
  return days.map(d => {
    if (!d.inMonth) return '<td class="day out"></td>';
    return '<td class="day">' + formatDetailScheduleEntry(row.days[d.day]) + '</td>';
  }).join('');
}

function renderDetailSchedulePageOne(form, days, monthName) {
  const esc = escapeDetailScheduleHtml;
  const header =
    '<div class="title">JEFFERSON PARISH SHERIFF’S OFFICE DETAIL SCHEDULE</div>' +
    '<table class="hdr"><tr>' +
      '<td class="hcol c1">' +
        '<div class="fld"><span class="lbl">Business Name</span><span class="val">' + esc(DETAIL_SCHEDULE.businessName) + '</span></div>' +
        '<div class="fld"><span class="lbl">Location/Address</span><span class="val"></span></div>' +
        '<div class="fld"><span class="lbl">Owner/Manager</span><span class="val"></span></div>' +
      '</td>' +
      '<td class="hcol c2">' +
        '<div class="fld"><span class="lbl">Phone #</span><span class="val"></span></div>' +
        '<div class="fld"><span class="lbl">Zip Code</span><span class="val"></span></div>' +
        '<div class="fld"><span class="lbl">Date (Month/Year)</span><span class="val">' + esc(monthName) + '</span></div>' +
      '</td>' +
      '<td class="hcol c3">' +
        '<div class="fld"><span class="lbl">Rate Charged Per Hour $</span><span class="val"></span></div>' +
        '<div class="fld"><span class="lbl">Detail Administrator</span><span class="val"></span></div>' +
        '<div class="fld"><span class="lbl">Phone #</span><span class="val"></span></div>' +
      '</td>' +
      '<td class="hcol checks">' +
        '<div class="small center">(Check One)</div>' +
        '<div><span class="box">X</span> 1. Payroll Deduction</div>' +
        '<div><span class="box"></span> 2. Check with Schedule</div>' +
        '<div><span class="box"></span> 3. Invoice Mail for Payment</div>' +
      '</td>' +
      '<td class="hcol office">' +
        '<div class="fld"><span class="lbl">Amount $</span><span class="val"></span></div>' +
        '<div class="fld"><span class="lbl">Check #</span><span class="val"></span></div>' +
        '<div class="fld"><span class="lbl">Date</span><span class="val"></span></div>' +
        '<div class="fld"><span class="lbl">PA #</span><span class="val"></span></div>' +
        '<div class="fld"><span class="lbl">Computer Entry</span><span class="val"></span></div>' +
        '<div class="small center">(OFFICE USE ONLY)</div>' +
      '</td>' +
    '</tr></table>';

  const rows = form.rows.map((row, i) =>
    '<tr>' +
      '<td class="name"><span class="num">' + (i + 1) + '.</span> ' + esc(row.label) + '</td>' +
      '<td class="pay">' + esc(row.payroll) + '</td>' +
      '<td class="lbls"><div>Total Hours</div><div>Time</div></td>' +
      renderDetailScheduleDayCells(row, days) +
    '</tr>').join('');

  return '<div class="page">' + header +
    '<table class="grid"><thead><tr>' +
      '<th class="name">Name (Last, First)</th><th class="pay">Payroll #</th><th class="lbls"></th>' +
      renderDetailScheduleDayHeaders(days) +
    '</tr></thead><tbody>' + rows + '</tbody></table>' +
    '<div class="foot">Revised: 8/5/2020<br>E#: 266</div>' +
    '</div>';
}

function renderDetailSchedulePageTwo(form, days) {
  const esc = escapeDetailScheduleHtml;
  const header =
    '<table class="hdr2"><tr>' +
      '<td><span class="lbl">TOTAL HOURS DETAILED</span><span class="val wide">' +
        esc(formatDetailScheduleTotal(form.totalHours)) + '</span></td>' +
      '<td><span class="lbl">DETAIL SUPERVISORY MONTHLY ADMIN FEE</span><span class="val wide"></span>' +
        '<div class="small right">(If $0, put $0)</div></td>' +
    '</tr></table>';

  const rows = form.rows.map((row, i) =>
    '<tr>' +
      '<td class="rn">' + (i + 1) + '.</td>' +
      renderDetailScheduleDayCells(row, days) +
      '<td class="tot">' + esc(formatDetailScheduleTotal(row.total)) + '</td>' +
    '</tr>').join('');

  return '<div class="page">' + header +
    '<table class="grid"><thead><tr><th class="rn"></th>' +
      renderDetailScheduleDayHeaders(days) +
      '<th class="tot">Total<br>Hours</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>' +
    '<div class="foot">Revised: 8/5/2020<br>E#: 266</div>' +
    '</div>';
}

const DETAIL_SCHEDULE_CSS = [
  '@page { size: 11in 8.5in; margin: 0.3in; }',
  'body { font-family: "Times New Roman", Times, serif; font-size: 9pt; color: #000; margin: 0; }',
  '.page { width: 10.4in; }',
  '.page-break { page-break-after: always; break-after: page; height: 0; }',
  '.title { font-weight: bold; font-size: 11pt; text-align: center; margin-bottom: 4px; }',
  'table.hdr, table.hdr2 { width: 100%; border-collapse: collapse; margin-bottom: 10px; }',
  'table.hdr { table-layout: fixed; }',
  'table.hdr td.hcol { vertical-align: top; padding: 0 4px; overflow: hidden; }',
  'table.hdr td.c1 { width: 2.3in; } table.hdr td.c2 { width: 2.3in; } table.hdr td.c3 { width: 2.3in; }',
  'table.hdr td.checks { width: 1.75in; white-space: nowrap; font-size: 8.5pt; font-weight: bold; }',
  'table.hdr td.office { border: 1px solid #000; padding: 3px 6px; width: 1.75in; }',
  '.fld { white-space: nowrap; margin: 3px 0; }',
  '.lbl { font-weight: bold; }',
  '.val { display: inline-block; min-width: 0.9in; border-bottom: 1px solid #000; padding: 0 3px; }',
  '.val.wide { min-width: 2.5in; text-align: center; font-size: 11pt; }',
  '.box { display: inline-block; width: 10px; height: 10px; line-height: 10px; border: 1px solid #000; text-align: center; font-size: 8pt; margin-right: 3px; }',
  '.small { font-size: 7pt; font-weight: bold; }',
  '.center { text-align: center; } .right { text-align: right; }',
  'table.hdr2 td { padding: 0 20px; font-size: 10pt; }',
  'table.grid { width: 100%; border-collapse: collapse; table-layout: fixed; }',
  'table.grid th, table.grid td { border: 1px solid #000; padding: 1px 2px; }',
  'table.grid th { font-weight: normal; vertical-align: bottom; }',
  'table.grid td { height: 0.31in; vertical-align: middle; }',
  'th.name, td.name { width: 2.05in; text-align: left; }',
  'th.name { font-weight: bold; }',
  'td.name { border-right: none; vertical-align: bottom; }',
  'th.pay, td.pay { width: 0.65in; text-align: right; }',
  'th.pay { font-weight: bold; }',
  'td.pay { border-left: none; vertical-align: bottom; }',
  'th.lbls, td.lbls { width: 0.6in; text-align: center; font-size: 7pt; }',
  'th.day, td.day { text-align: center; }',
  'th.day .wd { font-size: 7pt; text-align: left; }',
  'th.day .dn { font-size: 9pt; }',
  'td.day .hrs, td.day .tm { font-size: 7pt; line-height: 1.15; }',
  '.out { background: #e5e5e5; }',
  'th.rn, td.rn { width: 0.3in; text-align: left; font-weight: bold; }',
  'th.tot, td.tot { width: 0.55in; text-align: center; }',
  'td.tot { font-size: 9pt; }',
  '.num { font-weight: normal; }',
  '.foot { font-size: 6.5pt; font-weight: bold; margin-top: 4px; }'
].join('\n');
