// stats.js - the Statistics pop-up (charts drawn by the Chart.js component). Admin only.
// Loaded AFTER script.js in index.html, because it uses helpers from script.js: $, S, UI, count, kindsOf, progShort, userName, showView.
// script.js calls statsView(), drawStats() and destroyCharts() (see showView and closeView there).
//
// Chart.js is a third-party component (loaded from a CDN in index.html).
// This is the ONLY file that talks to it: drawChart() hands it a canvas and a settings object.
// To swap in another chart library, change drawChart() and the settings in drawStats().

let charts = [];
const destroyCharts = () => { charts.forEach(c => c.destroy()); charts = []; };   // free the old charts before drawing new ones
function drawChart(canvasId, config) {
  const canvas = $('#' + canvasId);
  if (canvas && window.Chart) charts.push(new Chart(canvas, config));
}
const approvedList = () => S.res.filter(r => r.status === 'Approved');   // only approved posts are counted

// ---------- Time range: All time / last 7 days / last 30 days ----------
const DAY = 86400000;
const isoDay = ms => new Date(ms).toISOString().slice(0, 10);   // same date format the posts use (YYYY-MM-DD)
const rangeDays = () => Number(UI.statsRange) || 0;              // 0 = all time
function statsList() {
  const days = rangeDays(), today = Date.parse(isoDay(Date.now()));
  return approvedList().filter(r => !days || Date.parse(r.date) >= today - (days - 1) * DAY);
}
// Choosing another range draws the pop-up again
document.addEventListener('change', e => {
  if (e.target.id === 'statsRange') { UI.statsRange = e.target.value; showView('stats'); }
});

// ---------- The HTML of the pop-up (the charts themselves are drawn afterwards by drawStats) ----------
function statsView() {
  const all = approvedList(), list = statsList();
  const head = '<p class="eyebrow">overview</p><h2>Statistics</h2>';
  if (!all.length) return head + '<div class="empty">No data yet. Charts appear once resources are uploaded and approved.</div>';
  if (!window.Chart) return head + '<p class="note">The chart component could not be loaded. Check your internet connection and reload the page.</p>';

  const days = rangeDays();
  const opt = (v, text) => `<option value="${v}"${days === v ? ' selected' : ''}>${text}</option>`;
  const bar = `<div class="stats-bar"><p class="mut">Based on ${list.length} approved resource${list.length === 1 ? '' : 's'}.</p>
    <label class="mut">Show <select id="statsRange">${opt(0, 'All time')}${opt(7, 'Last 7 days')}${opt(30, 'Last 30 days')}</select></label></div>`;
  if (!list.length) return head + bar + '<div class="empty">No resources in this time range.</div>';

  const waiting = S.res.filter(r => r.status === 'Pending' || (r.flags.length && r.status === 'Approved')).length;   // same number as the Moderation badge
  const tile = (n, label) => `<div class="stat-tile"><b>${n}</b><span>${label}</span></div>`;
  const card = (id, title) => `<div class="chart-card"><h3>${title}</h3><div class="chart-box"><canvas id="${id}"></canvas></div></div>`;
  return head + bar +
    `<div class="stat-row">${tile(list.length, 'Resources')}${tile(new Set(list.map(r => r.by)).size, 'Contributors')}${tile(list.reduce((n, r) => n + count(r), 0), 'Helpful votes')}${tile(waiting, 'Waiting for review')}</div>
    <div class="chart-grid">${card('chCourse', 'Uploads per course')}${card('chType', 'File types')}${card('chTime', 'Uploads over time')}${card('chTop', 'Most helpful resources')}${card('chProgram', 'Resources per program')}${card('chPeople', 'Top contributors')}</div>`;
}

// ---------- The charts ----------
function drawStats() {
  const list = statsList();
  if (!list.length || !window.Chart) return;
  destroyCharts();
  // Colors and fonts to match the dark theme
  Chart.defaults.color = '#bdbbb3';
  Chart.defaults.borderColor = '#2c3236';
  Chart.defaults.font.family = 'system-ui, "Segoe UI", Roboto, Arial, sans-serif';
  const GREEN = '#6fb89f';
  const TYPE_COLORS = { PDF: '#f19a94', DOCX: '#8fb8f0', DOC: '#8fb8f0', PPTX: '#f2b277', XLSX: '#82d0a0', Image: '#c3a3ee', Text: '#bdbbb3', Link: '#f0d58a' };   // same colors as the file type badges
  const tally = items => items.reduce((m, k) => { m[k] = (m[k] || 0) + 1; return m; }, {});
  const ranked = (m, n) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n).map(([label, value]) => ({ label, value }));   // biggest first
  const short = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;
  const wholeNumbers = { beginAtZero: true, ticks: { precision: 0 } };

  // One bar chart (standing bars, or horizontal bars). rows = [{ label, value }]. The tooltip shows the full label.
  const barChart = (id, rows, horizontal, unit) => drawChart(id, {
    type: 'bar',
    data: { labels: rows.map(x => short(x.label, horizontal ? 24 : 14)), datasets: [{ data: rows.map(x => x.value), backgroundColor: GREEN, borderRadius: 6 }] },
    options: {
      indexAxis: horizontal ? 'y' : 'x', maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: {
        title: items => rows[items[0].dataIndex].label,
        label: c => { const v = horizontal ? c.parsed.x : c.parsed.y; return v + ' ' + unit + (v === 1 ? '' : 's'); }
      } } },
      scales: { [horizontal ? 'x' : 'y']: wholeNumbers }
    }
  });

  // 1. Uploads per course (top 8)
  barChart('chCourse', ranked(tally(list.map(r => r.course)), 8), false, 'upload');

  // 2. File types: doughnut (a post with two kinds of files counts once for each kind)
  const byType = Object.entries(tally(list.flatMap(kindsOf)));
  drawChart('chType', {
    type: 'doughnut',
    data: { labels: byType.map(x => `${x[0]} (${x[1]})`), datasets: [{ data: byType.map(x => x[1]), backgroundColor: byType.map(x => TYPE_COLORS[x[0]] || '#9a9a92'), borderColor: '#1b1f22', borderWidth: 2 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });

  // 3. Uploads over time: one point for each day (or each month when the range is long). Days with no uploads show as 0.
  const today = Date.parse(isoDay(Date.now())), days = rangeDays();
  const start = days ? today - (days - 1) * DAY : Math.min(...list.map(r => Date.parse(r.date)));
  const daily = (today - start) / DAY + 1 <= 45;
  const labels = [];
  if (daily) { for (let t = start; t <= today; t += DAY) labels.push(isoDay(t)); }
  else {
    const d = new Date(start); d.setUTCDate(1);
    while (isoDay(d.getTime()).slice(0, 7) <= isoDay(today).slice(0, 7)) { labels.push(isoDay(d.getTime()).slice(0, 7)); d.setUTCMonth(d.getUTCMonth() + 1); }
  }
  const perSlot = tally(list.map(r => daily ? r.date : r.date.slice(0, 7)));
  drawChart('chTime', {
    type: 'line',
    data: { labels, datasets: [{ data: labels.map(k => perSlot[k] || 0), borderColor: GREEN, backgroundColor: 'rgba(111, 184, 159, 0.18)', fill: true, tension: 0.3, pointRadius: labels.length > 20 ? 2 : 4, pointBackgroundColor: GREEN }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.parsed.y + ' upload' + (c.parsed.y === 1 ? '' : 's') } } }, scales: { y: wholeNumbers } }
  });

  // 4. Most helpful resources (top 5 by upvotes)
  barChart('chTop', list.slice().sort((a, b) => count(b) - count(a)).slice(0, 5).map(r => ({ label: r.title, value: count(r) })), true, 'helpful vote');

  // 5. Resources per program (top 6)
  barChart('chProgram', ranked(tally(list.map(r => progShort(r.program))), 6), true, 'resource');

  // 6. Top contributors (top 5 uploaders)
  barChart('chPeople', ranked(tally(list.map(r => r.by)), 5).map(x => ({ label: userName(Number(x.label)), value: x.value })), true, 'resource');
}