// Academic Resource Repository System - prototype script.js

// ========== COURSE DATA (edit this part to add courses) ==========
// curriculum.js - years, semesters, programs and the courses of each program.
// To add more courses: find the program, year and semester below, then add a line like
//   ['CC100', 'Introduction to Computing'],
// (a program without courses yet simply shows no course list; uploads can still use "General").

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const SEMESTERS = ['1st Semester', '2nd Semester'];

const BSIT = 'Bachelor of Information Technology';

const PROGRAMS = [
  BSIT,
  'Bachelor of Industrial Technology - Computer Technology',
  'Bachelor of Industrial Technology - Electronics Technology',
  'Bachelor of Elementary Education - General Content',
  'Bachelor of Secondary Education - English',
  'Bachelor of Secondary Education - Filipino',
  'Bachelor of Secondary Education - Mathematics',
  'Bachelor of Business Administration - Human Resource Management',
  'Bachelor of Business Administration - Marketing Management'
];

// CURRICULUM[program][year][semester] = list of [subject code, descriptive title]
const CURRICULUM = {
  [BSIT]: {
    '1st Year': {
      '1st Semester': [
        ['CC100', 'Introduction to Computing'],
        ['CC101', 'Computer Programming I']
      ],
      '2nd Semester': [
        ['HCI 102', 'Introduction to Human Computer']
      ]
    },
    '2nd Year': {
      '1st Semester': [
        ['MST 101', 'Environmental Science'],
        ['SSP 101', 'Gender and Society']
      ],
      '2nd Semester': [
        ['AH101', 'Philippine Popular Culture'],
        ['RIZAL', 'Life and Works of Rizal']
      ]
    },
    '3rd Year': { '1st Semester': [], '2nd Semester': [] },
    '4th Year': { '1st Semester': [], '2nd Semester': [] }
  }
};

// ========== APP ==========
// The page design + the system features (accounts, upload, duplicate check,
// ratings, comments, reports, moderation, notifications, activity, AI summary).
// Data is kept in the browser (localStorage). Later this becomes PHP + MySQL.

const KEY = 'ars_v3';
const MAX_SIZE = 100 * 1024 * 1024;   // 100 MB for each file (big files are kept in the browser's IndexedDB; with PHP/MySQL the limit moves to php.ini)
const MAX_FILES = 10;                // files in one post
const MAX_TOTAL = 300 * 1024 * 1024; // 300 MB for all files of one post
// Short name of a program for the cards, e.g. 'BSEd · English'
const progShort = p => p.replace('Bachelor of Information Technology', 'BSIT').replace('Bachelor of Industrial Technology - ', 'BIndTech · ').replace('Bachelor of Elementary Education - ', 'BEEd · ').replace('Bachelor of Secondary Education - ', 'BSEd · ').replace('Bachelor of Business Administration - ', 'BSBA · ');
// File types people can upload (uploads from older versions, like TXT, still open fine)
const TYPES = { pdf: 'PDF', docx: 'DOCX', doc: 'DOC', png: 'Image', jpg: 'Image', jpeg: 'Image', pptx: 'PPTX', xlsx: 'XLSX' };
const TYPE_LIST = ['PDF', 'DOCX', 'DOC', 'Image', 'PPTX', 'XLSX', 'Link'];   // always shown in the File type filter

// ---------- Data ----------
function seedData() {
  // No sample resources: the list starts empty and only fills up with real uploads.
  // No sample users either: every account comes from the Sign up page.
  return { meId: null, nextId: 20, notifs: [], log: [], res: [], users: [] };
}
// Removes the old sample resources and sample users (they have no email) that earlier versions saved in this browser
// Old program names saved in this browser -> new names
const OLD_PROGRAMS = { 'BEEd – Major in General Content': 'Bachelor of Elementary Education - General Content', 'BSEd – Major in English': 'Bachelor of Secondary Education - English', 'BSEd – Major in Filipino': 'Bachelor of Secondary Education - Filipino', 'BSEd – Major in Mathematics': 'Bachelor of Secondary Education - Mathematics', 'BSBA – Major in Human Resource Management': 'Bachelor of Business Administration - Human Resource Management', 'BSBA – Major in Marketing Management': 'Bachelor of Business Administration - Marketing Management', 'BIndTech – Major in Computer Technology': 'Bachelor of Industrial Technology - Computer Technology', 'BIndTech – Major in Electronics Technology': 'Bachelor of Industrial Technology - Electronics Technology', 'BSIT – Bachelor of Science in Information Technology': 'Bachelor of Information Technology' };
const dropSamples = d => { d.res = (d.res || []).filter(r => !String(r.hash).startsWith('seed')); d.res.forEach(r => { if (OLD_PROGRAMS[r.program]) r.program = OLD_PROGRAMS[r.program]; }); d.users = (d.users || []).filter(u => u.email); return d; };
function loadData() { try { return dropSamples(Object.assign(seedData(), JSON.parse(localStorage.getItem(KEY)))); } catch (e) { return seedData(); } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { alert('Browser storage is full.'); } }

let S = loadData();
// Each browser tab remembers its own logged-in person, so two accounts can be tried side by side
try { const m = sessionStorage.getItem('ars_me'); if (m !== null) S.meId = m ? Number(m) : null; else if (S.meId) sessionStorage.setItem('ars_me', S.meId); } catch (e) {}
let UI = { q: '', year: '', program: '', sem: '', course: '', type: '', sort: 'new', page: 1, view: null, vid: null, note: '', shown: {} };

// ---------- Helpers ----------
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const me = () => S.users.find(u => u.id === S.meId);
const isAdmin = () => me() && me().role === 'admin';
const userName = id => (S.users.find(u => u.id === id) || { name: 'Unknown' }).name;
const findRes = id => S.res.find(r => r.id === Number(id));
const count = r => r.base + r.votes.length;
// The files of a post. Posts saved by older versions have just one file in r.data.
const filesOf = r => r.files || (r.data ? [{ name: r.fileName || r.title, type: r.type, data: r.data, size: parseInt(r.meta) || 0 }] : []);
const kindsOf = r => r.kinds || [r.type];   // file types in a post (used by the File type filter)

// The description of a post, or '' when the uploader wrote none (old posts saved "No description." - treated as empty too)
const descOf = r => !r.desc || r.desc === 'No description.' ? '' : r.desc;

// When a post was uploaded, e.g. "Nov 13, 2026 · 10:27 AM" (posts saved before this had only a date, so just that is shown)
const whenOf = r => {
  if (!r.at) return r.date || '';
  const d = new Date(r.at);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' \u00b7 ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

// ----- Links (YouTube or any website) -----
// cleanLink: '' = nothing typed, null = not a usable web address, otherwise the cleaned address. Only http(s) is allowed.
function cleanLink(s) {
  s = String(s || '').trim();
  if (!s) return '';
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = 'https://' + s;   // "youtube.com/..." works too
  try {
    const u = new URL(s);
    return /^https?:$/.test(u.protocol) && u.hostname.includes('.') && u.href.length <= 500 ? u.href : null;
  } catch (e) { return null; }
}
const linkOf = r => cleanLink(r.link || '') || '';
const linkHost = url => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return url; } };
function youtubeId(url) {
  try {
    const u = new URL(url), host = u.hostname.replace(/^(www|m)\./, '');
    let id = '';
    if (host === 'youtu.be') id = u.pathname.split('/')[1] || '';
    else if (host === 'youtube.com') id = u.pathname === '/watch' ? (u.searchParams.get('v') || '') : ((u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/) || [])[1] || '');
    return /^[\w-]{6,20}$/.test(id) ? id : '';
  } catch (e) { return ''; }
}
const ytThumb = id => `<img src="https://i.ytimg.com/vi/${esc(id)}/hqdefault.jpg" alt="" loading="lazy"><span class="cp-play">&#9654;</span>`;
// Card preview for a post that has a link but no files: YouTube thumbnail, or the website name
const linkCardHtml = r => {
  const url = linkOf(r), id = youtubeId(url);
  return `<a href="#" class="card-preview" data-a="view" data-v="${r.id}" aria-label="Open ${esc(r.title)}">${id ? ytThumb(id) : `<div class="cp-file"><b>Link</b><span>${esc(linkHost(url))}</span></div>`}</a>`;
};
// Link in the details pop-up: a YouTube link plays right here in the YouTube player; any other link opens in a new tab.
const linkBlockHtml = url => {
  const id = youtubeId(url);
  const player = id ? `<div class="link-player"><iframe src="https://www.youtube-nocookie.com/embed/${esc(id)}?rel=0" title="YouTube video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>` : '';
  return `${player}<div class="link-box"><div class="link-info"><b>${id ? 'YouTube video' : esc(linkHost(url))}</b><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${id ? 'Open on YouTube' : esc(url)}</a></div></div>`;
};
// ----- end of links -----
const addLog = t => { S.log.unshift({ u: S.meId, t, d: new Date().toLocaleString() }); S.log = S.log.slice(0, 100); };
const notify = (uid, t) => S.notifs.unshift({ uid, t, d: new Date().toLocaleString(), read: false });
const notifyAdmins = t => S.users.filter(u => u.role === 'admin').forEach(u => notify(u.id, t));

// Simple "AI": keeps the 3 sentences that use the most frequent words.
function summarize(text) {
  const sentences = text.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]/g) || [text];
  const freq = {};
  (text.toLowerCase().match(/[a-z]{4,}/g) || []).forEach(w => freq[w] = (freq[w] || 0) + 1);
  const scored = sentences.map((s, i) => ({ i, n: (s.toLowerCase().match(/[a-z]{4,}/g) || []).reduce((a, w) => a + freq[w], 0) / Math.sqrt(s.length) }));
  return scored.sort((a, b) => b.n - a.n).slice(0, 3).sort((a, b) => a.i - b.i).map(x => sentences[x.i].trim()).join(' ');
}
async function fileHash(file) {
  if (!window.crypto || !crypto.subtle) return file.name + file.size; // fallback when not on localhost
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()));
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}
const readDataURL = file => new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(file); });

// ---------- Drawing the page ----------
function renderNav() {
  const unread = S.notifs.filter(n => n.uid === S.meId && !n.read).length;
  // For admins: posts waiting for approval + approved posts that were reported (the same two lists as in Moderation)
  const toReview = S.res.filter(r => r.status === 'Pending' || (r.flags.length && r.status === 'Approved')).length;
  // Right side of the header: guests see Log in / Sign up, members see bell + name + log out
  $('#userNav').innerHTML = me()
    ? `<button data-a="open" data-v="notifs">🔔${unread ? ` <span class="badge">${unread}</span>` : ''}</button>
       <button data-a="open" data-v="profile">${esc(me().name)}</button>
       <button data-a="out">Log out</button>`
    : '<a class="btn-link" href="login.html" data-a="auth" data-v="login">Log in</a><a class="btn-outline" href="login.html?tab=signup" data-a="auth" data-v="signup">Sign up</a>';
  // Sidebar: admin-only links
  $('#adminNav').innerHTML = isAdmin()
    ? '<span class="side-label">Admin</span>' +
      `<button data-a="open" data-v="admin" title="Moderation">Moderation${toReview ? ` <span class="badge">${toReview}</span>` : ''}</button>` +
      '<button data-a="open" data-v="log" title="Activity">Activity</button>' +
      '<button data-a="open" data-v="stats" title="Statistics">Statistics</button>' +
      '<button data-a="open" data-v="users" title="Users">Users</button>'
    : '';
  // Sidebar: students get a Pending link, with the number of their posts that are waiting for approval
  const waiting = S.res.filter(r => r.by === S.meId && r.status === 'Pending').length;
  $('#memberNav').hidden = !me() || isAdmin();
  $('#memberNav').innerHTML = `<button data-a="open" data-v="pending" title="Pending posts">Pending${waiting ? ` <span class="badge">${waiting}</span>` : ''}</button>`;
}

// ---------- Reading Excel (.xlsx) files: first rows of the first sheet ----------
// An .xlsx is a zip of XML files. This reads just the cells we need for the preview.
async function zipRead(blob, wanted, asBytes) {
  const out = {}, tailLen = Math.min(blob.size, 65557);
  const tail = new Uint8Array(await blob.slice(blob.size - tailLen).arrayBuffer()), tdv = new DataView(tail.buffer);
  let end = -1;
  for (let i = tail.length - 22; i >= 0 && end < 0; i--) if (tdv.getUint32(i, true) === 0x06054b50) end = i;
  if (end < 0) throw new Error('not a zip file');
  let count = tdv.getUint16(end + 10, true);
  const cdSize = tdv.getUint32(end + 12, true), cdStart = tdv.getUint32(end + 16, true);
  const cd = new Uint8Array(await blob.slice(cdStart, cdStart + cdSize).arrayBuffer()), dv = new DataView(cd.buffer);
  let p = 0;
  while (count-- > 0 && p + 46 <= cd.length) {
    const method = dv.getUint16(p + 10, true), size = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true), extraLen = dv.getUint16(p + 30, true), noteLen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true), name = new TextDecoder().decode(cd.subarray(p + 46, p + 46 + nameLen));
    if (wanted(name)) {
      const head = new DataView(await blob.slice(local, local + 30).arrayBuffer());
      const from = local + 30 + head.getUint16(26, true) + head.getUint16(28, true);
      let data = new Uint8Array(await blob.slice(from, from + size).arrayBuffer());
      if (method === 8) data = new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
      out[name] = asBytes ? data : new TextDecoder().decode(data);
    }
    p += 46 + nameLen + extraLen + noteLen;
  }
  return out;
}
const xmlText = t => t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
// Returns the top-left corner of the first sheet as rows of text: [['Name', 'Score'], ['Ana', '90'], ...]
async function xlsxGrid(blob, maxRows, maxCols) {
  const files = await zipRead(blob, nm => nm === 'xl/sharedStrings.xml' || /^xl\/worksheets\/sheet\d+\.xml$/.test(nm));
  const sheetName = Object.keys(files).filter(k => k.includes('worksheets')).sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]))[0];
  if (!sheetName) throw new Error('no sheet found');
  const strings = [...(files['xl/sharedStrings.xml'] || '').matchAll(/<si>([\s\S]*?)<\/si>/g)]
    .map(m => xmlText([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x => x[1]).join('')));
  const grid = [];
  for (const m of files[sheetName].slice(0, 400000).matchAll(/<c\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const ref = (m[1].match(/\br="([A-Z]+)(\d+)"/) || []), type = (m[1].match(/\bt="(\w+)"/) || [])[1];
    if (!ref[1]) continue;
    const row = Number(ref[2]), col = [...ref[1]].reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0);
    if (row > maxRows) break;
    if (col > maxCols || !m[2]) continue;
    let v = (m[2].match(/<v>([\s\S]*?)<\/v>/) || [])[1];
    if (type === 'inlineStr') v = (m[2].match(/<t[^>]*>([\s\S]*?)<\/t>/) || [])[1];
    else if (type === 's' && v !== undefined) v = strings[Number(v)];
    if (v === undefined || v === '') continue;
    v = xmlText(String(v));
    if (/^-?\d+\.\d{6,}$/.test(v)) v = String(Math.round(Number(v) * 100) / 100);
    (grid[row - 1] = grid[row - 1] || [])[col - 1] = v;
  }
  const colNum = L => [...L].reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0);
  const dim = files[sheetName].slice(0, 2000).match(/<dimension ref="([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?"/);
  const rows = Array.from(grid, r => r || []);
  const cols = Math.max(0, ...rows.map(r => r.length));
  if (!rows.length || !cols) throw new Error('empty sheet');
  const out = rows.map(r => Array.from({ length: cols }, (_, i) => r[i] || ''));
  if (dim) out.dim = { rows: Number(dim[4] || dim[2]) - Number(dim[2]) + 1, cols: colNum(dim[3] || dim[1]) - colNum(dim[1]) + 1 };   // size of the whole sheet
  return out;
}
const colName = i => { let n = i + 1, t = ''; while (n > 0) { t = String.fromCharCode(65 + (n - 1) % 26) + t; n = Math.floor((n - 1) / 26); } return t; };
const gridTable = grid => `<table class="xl-grid"><tr class="xl-head"><td class="xl-rn"></td>${grid[0].map((_, i) => `<td>${colName(i)}</td>`).join('')}</tr>` +
  grid.map((r, i) => `<tr${i ? '' : ' class="xl-first"'}><td class="xl-rn">${i + 1}</td>${r.map(c => `<td${/^-?[\d,.]+%?$/.test(c) ? ' class="xl-num"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('') + '</table>';

// ---------- Reading PowerPoint (.pptx) files: the saved thumbnail of slide 1, or its text ----------
async function pptxPreview(blob) {
  let slides = 0;
  const files = await zipRead(blob, nm => {
    if (/^ppt\/slides\/slide\d+\.xml$/.test(nm)) slides++;
    return /^docProps\/thumbnail\.(jpe?g|png)$/i.test(nm) || nm === 'ppt/slides/slide1.xml';
  }, true);
  const thumbName = Object.keys(files).find(k => k.startsWith('docProps/thumbnail'));
  const thumb = thumbName ? new Blob([files[thumbName]], { type: /png$/i.test(thumbName) ? 'image/png' : 'image/jpeg' }) : null;
  const xml = files['ppt/slides/slide1.xml'] ? new TextDecoder().decode(files['ppt/slides/slide1.xml']) : '';
  const text = xml.split('</a:p>').map(par => xmlText((par.match(/<a:t>[^<]*<\/a:t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join(''))).filter(Boolean).join('\n');
  if (!thumb && !text) throw new Error('nothing to show');
  return { thumb, text, slides };
}
// ---------- Preview on each card ----------
// Shows what the file looks like (photo, first page of a PDF, start of a document), filled in when the card scrolls into view.
let cardUrls = [], cardWatcher = null;
function watchCardPreviews() {
  if (cardWatcher) cardWatcher.disconnect();
  const boxes = document.querySelectorAll('.card-preview[data-pv]');
  if (!('IntersectionObserver' in window)) return boxes.forEach(fillCardPreview);
  cardWatcher = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) { cardWatcher.unobserve(en.target); fillCardPreview(en.target); }
  }), { rootMargin: '200px' });
  boxes.forEach(b => cardWatcher.observe(b));
}
async function fillCardPreview(box) {
  const r = findRes(Number(box.dataset.pv)), files = r ? filesOf(r) : [];
  if (!files.length) return box.remove();
  // Prefer a photo, then a PDF, then a Word file, then whatever is first
  const f = files.find(x => x.type === 'Image') || files.find(x => x.type === 'PDF') || files.find(x => x.type === 'DOCX') || files.find(x => x.type === 'XLSX') || files.find(x => x.type === 'PPTX') || files[0];
  let html = '';
  try {
    if (f.type === 'Image') { const url = URL.createObjectURL(await fileBlob(f)); cardUrls.push(url); html = `<img src="${url}" alt="" loading="lazy">`; }
    else if (f.type === 'PDF') {
      const url = URL.createObjectURL(await fileBlob(f, 'application/pdf'));
      cardUrls.push(url);
      html = `<iframe src="${url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH" title="PDF preview" tabindex="-1" loading="lazy"></iframe>`;
    }
    else if (f.type === 'DOCX') {
      const text = f.size > 15 * 1024 ? '' : (await docxText(await fileBlob(f))).trim();
      html = text ? `<div class="cp-text">${esc(text.slice(0, 500))}</div>` : '';
    }
    else if (f.type === 'PPTX') {
      const p = await pptxPreview(await fileBlob(f));
      const tag = `<span class="cp-badge">${p.slides} slide${p.slides === 1 ? '' : 's'}</span>`;
      if (p.thumb) { const url = URL.createObjectURL(p.thumb); cardUrls.push(url); html = `<img class="cp-slide" src="${url}" alt="">${tag}`; }
      else html = `<div class="cp-text cp-slidetext">${esc(p.text.slice(0, 400))}</div>${tag}`;
    }
    else if (f.type === 'XLSX') {
      // Like an e-mail attachment: file name on the left, a thumbnail of the sheet on the right
      if (f.size > 15 * 1024) throw new Error('too big to read here');
      const grid = await xlsxGrid(await fileBlob(f), 16, 6);
      const size = grid.dim ? `<small>${grid.dim.rows} row${grid.dim.rows === 1 ? '' : 's'} &middot; ${grid.dim.cols} column${grid.dim.cols === 1 ? '' : 's'}</small>` : '';
      html = `<div class="cp-info"><span class="cp-xl-icon">X</span><b title="${esc(f.name)}">${esc(f.name)}</b><span>Microsoft Excel</span>${size}</div><div class="cp-thumb"><div class="cp-scale">${gridTable(grid)}</div></div>`;
      box.classList.add('cp-attach');
    }
  } catch (e) { html = ''; }
  if (!box.isConnected) return;   // the list was redrawn meanwhile
  if (!html) html = `<div class="cp-file"><b>${esc(f.type)}</b><span>${esc(f.name)}</span></div>`;
  if (files.length > 1) html += `<span class="cp-more">+${files.length - 1} more</span>`;
  box.innerHTML = html;
}

// Full course name for a card, e.g. 'RIZAL – Life and Works of Rizal' (typed courses are shown as typed)
const courseLabel = c => { const f = coursesFor('', '', '').find(x => x[0] === c); return f ? f[0] + ' – ' + f[1] : c; };

function cardHtml(r) {
  const voted = r.votes.includes(S.meId);
  return `<article class="resource-card">
    <div class="card-top"><span class="course-tag" title="${esc(courseLabel(r.course))}">${esc(courseLabel(r.course))}</span>${r.status !== 'Approved' ? `<span class="st ${r.status}">${r.status}</span>` : ''}<span class="ftype ft-${esc(r.type).toLowerCase()}">${esc(r.type)}</span></div>
    ${filesOf(r).length ? `<a href="#" class="card-preview" data-a="view" data-v="${r.id}" data-pv="${r.id}" aria-label="Open ${esc(r.title)}"></a>` : linkOf(r) ? linkCardHtml(r) : ''}
    <h3>${esc(r.title)}</h3>${descOf(r) ? `<p class="card-desc">${esc(descOf(r))}</p>` : ''}
    <div class="card-where"><span>${esc(r.year)} &middot; ${esc(r.sem)}</span><span class="cw-prog" title="${esc(r.program)}">${esc(progShort(r.program))}</span><span>${esc(r.meta)}</span><span>${esc(whenOf(r))}</span></div>
    <div class="card-footer"><span class="uploader"><b>${esc(userName(r.by))}</b></span>
      <span class="card-actions"><button type="button" class="upvotes ${voted ? 'on' : ''}" data-a="vote" data-v="${r.id}" title="Mark as helpful">&#9650; <span class="count">${count(r)}</span></button>
      <a href="#" class="view-link" data-a="view" data-v="${r.id}">View</a></span></div></article>`;
}

// Paging: 2 rows per page, with as many columns as the grid is showing (at most 4)
const ROWS_PER_PAGE = 2;
let lastGridKey = null, lastCols = 0;
const gridCols = () => Math.max(1, getComputedStyle($('#resourceGrid')).gridTemplateColumns.split(' ').length);

// Page buttons: Prev 1 2 3 ... Next
function renderPager(pages) {
  const box = $('#pager'), p = UI.page, nums = [];
  if (pages < 2) { box.innerHTML = ''; return; }
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - p) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== '\u2026') nums.push('\u2026');
  }
  box.innerHTML =
    `<button type="button" class="pg-btn" data-a="page" data-v="${p - 1}" ${p === 1 ? 'disabled' : ''}>&lsaquo; Prev</button>` +
    nums.map(n => n === '\u2026' ? '<span class="pg-gap">&hellip;</span>'
      : `<button type="button" class="pg-btn ${n === p ? 'on' : ''}" data-a="page" data-v="${n}" ${n === p ? 'aria-current="page"' : ''}>${n}</button>`).join('') +
    `<button type="button" class="pg-btn" data-a="page" data-v="${p + 1}" ${p === pages ? 'disabled' : ''}>Next &rsaquo;</button>`;
}

function renderGrid() {
  const q = UI.q.toLowerCase();
  const list = S.res
    .filter(r => r.status === 'Approved')
    .filter(r => (!UI.year || r.year === UI.year) && (!UI.program || r.program === UI.program) && (!UI.sem || r.sem === UI.sem) && (!UI.course || r.course === UI.course) && (!UI.type || kindsOf(r).includes(UI.type)))
    .filter(r => !q || [r.title, r.year, r.program, r.sem, r.course, r.type, descOf(r), r.tags.join(' '), r.text || '', filesOf(r).map(f => f.name).join(' '), linkOf(r)].join(' ').toLowerCase().includes(q))
    .sort((a, b) => UI.sort === 'top' ? count(b) - count(a) : b.date.localeCompare(a.date) || b.id - a.id);
  cardUrls.forEach(u => URL.revokeObjectURL(u)); cardUrls = [];
  // A new search, filter or sort starts again at page 1
  const key = [UI.q, UI.year, UI.program, UI.sem, UI.course, UI.type, UI.sort].join('|');
  if (key !== lastGridKey) { UI.page = 1; lastGridKey = key; }
  lastCols = gridCols();
  const perPage = lastCols * ROWS_PER_PAGE;
  const pages = Math.max(1, Math.ceil(list.length / perPage));
  UI.page = Math.min(Math.max(1, UI.page), pages);
  $('#resourceGrid').innerHTML = list.slice((UI.page - 1) * perPage, UI.page * perPage).map(cardHtml).join('');
  renderPager(pages);
  watchCardPreviews();
  $('#emptyState').textContent = S.res.some(r => r.status === 'Approved')
    ? 'No resources match your search. Try a different course or keyword.'
    : 'No resources yet. Be the first to upload a file or photo!';
  $('#emptyState').hidden = list.length > 0;
  $('#resultCount').textContent = list.length + (list.length === 1 ? ' resource found' : ' resources found') + (pages > 1 ? ` \u00b7 page ${UI.page} of ${pages}` : '');
  const approved = S.res.filter(r => r.status === 'Approved');
  $('#heroStats').innerHTML = `${approved.length} resource${approved.length === 1 ? '' : 's'} &nbsp;&middot;&nbsp; ${new Set(approved.map(r => r.course)).size} course${new Set(approved.map(r => r.course)).size === 1 ? '' : 's'} &nbsp;&middot;&nbsp; updated daily`;
}

// ---------- Filters: Year, Program, Semester, File type ----------
// Courses of the chosen year / program / semester (empty choice = any)
function coursesFor(year, program, sem) {
  const found = {};
  Object.keys(CURRICULUM).filter(p => !program || p === program).forEach(p =>
    YEARS.filter(y => !year || y === year).forEach(y =>
      SEMESTERS.filter(s => !sem || s === sem).forEach(s =>
        ((CURRICULUM[p][y] || {})[s] || []).forEach(c => found[c[0]] = c[1]))));
  return Object.entries(found); // [[code, title], ...]
}

// One drop-down. The menu has a max height, so long lists scroll.
function dropdown(id, label, all, options, current) {
  const shown = (options.find(o => o[0] === current) || [0, all])[1];
  return `<div class="dd"><span class="dd-label">${label}</span>
    <button type="button" class="dd-btn" data-a="dd" title="${esc(shown)}">${esc(shown)} &#9662;</button>
    <div class="dd-menu dd-menu-${id}" hidden>
      <button type="button" class="dd-opt ${current ? '' : 'on'}" data-a="pick" data-id="${id}" data-val="">${all}</button>
      ${options.map(o => `<button type="button" class="dd-opt ${current === o[0] ? 'on' : ''}" data-a="pick" data-id="${id}" data-val="${esc(o[0])}">${esc(o[1])}</button>`).join('')}
    </div></div>`;
}
const closeMenus = () => document.querySelectorAll('.dd-menu').forEach(m => m.hidden = true);

function renderFilters() {
  const visible = S.res.filter(r => r.status === 'Approved');
  const types = [...new Set([...TYPE_LIST, ...visible.flatMap(kindsOf)])].filter(t => t !== 'Text').map(t => [t, t]);   // no "Text" choice: posts are a link and/or files now
  $('#filterBar').innerHTML =
    dropdown('year', 'Year', 'All years', YEARS.map(y => [y, y]), UI.year) +
    dropdown('program', 'Program and Major', 'All programs and majors', PROGRAMS.map(p => [p, p]), UI.program) +
    dropdown('sem', 'Semester', 'All semesters', SEMESTERS.map(s => [s, s]), UI.sem) +
    dropdown('type', 'File type', 'All types', types, UI.type) +
    '<button type="button" id="clearFilters">Clear filters</button>';
  fillUploadForm();
}
function clearFilters() {
  Object.assign(UI, { q: '', year: '', program: '', sem: '', course: '', type: '' });
  $('#searchInput').value = '';
  renderFilters(); renderGrid();
}

// Upload form: nothing is pre-selected. The person picks Year, Program, Semester, then types the Course code and title.
function fillUploadForm() {
  if ($('#upYear').children.length) return;
  const opts = (label, list) => `<option value="">${label}</option>` + list.map(x => `<option>${esc(x)}</option>`).join('');
  $('#upYear').innerHTML = opts('Select year', YEARS);
  $('#upProgram').innerHTML = opts('Select program and major', PROGRAMS);
  $('#upSem').innerHTML = opts('Select semester', SEMESTERS);
}

function renderTrend() {
  if (!$('#trendList')) return;   // safe to skip if the Trending list is not on the page
  const top = S.res.filter(r => r.status === 'Approved').sort((a, b) => count(b) - count(a)).slice(0, 3);
  $('#trendList').innerHTML = !top.length ? '<li class="mut" style="list-style:none">No uploads yet.</li>' : top.map(r => `<li><a href="#" data-a="view" data-v="${r.id}">${esc(r.title)}</a> <span class="mut">${esc(r.course)} &middot; ▲ ${count(r)}</span></li>`).join('');
}

// ---------- Pop-up views ----------
function noteHtml() { const n = UI.note ? `<div class="note">${UI.note}</div>` : ''; UI.note = ''; return n; }

function detailView(r) {
  const canRemove = isAdmin() || r.by === S.meId;
  const files = filesOf(r), textOnly = !files.length, link = linkOf(r);
  const words = r.text ? r.text.trim().split(/\s+/).length : 0;
  // When nobody typed a description, it is just a copy of the post, so only show it if it adds something
  const dupDesc = r.text && (r.desc === r.text || r.desc === r.text.slice(0, 120) + '…');
  const meta = textOnly && link ? `Link &middot; ${esc(linkHost(link))}` : textOnly
    ? `Text post &middot; ${words} word${words === 1 ? '' : 's'}${words > 150 ? ` &middot; ${Math.round(words / 200) || 1} min read` : ''}`
    : `${r.type} &middot; ${esc(r.meta).replace(/^1 words/, '1 word')}`;
  const showAi = !textOnly || words >= 40;   // a summary of a one-line post is pointless
  return `<span class="course-tag">${esc(r.course)}</span> <span class="st ${r.status}">${r.status}</span>
    <h2>${esc(r.title)}</h2>
    <p class="mut byline"><b>${esc(userName(r.by))}</b> &middot; ${esc(whenOf(r))}</p>
    ${descOf(r) && !dupDesc ? `<p>${esc(descOf(r))}</p>` : ''}${r.text ? `<div class="post-text${textOnly ? ' post-text-main' : ''}">${esc(r.text)}</div>` : ''}
    <div class="row">${[r.year, r.sem, r.program].map(t => `<span class="tag">${esc(t)}</span>`).join('')}${r.tags.map(t => `<span class="tag">#${esc(t)}</span>`).join('')}</div>
    <div class="mut">${meta}</div>
    ${link ? linkBlockHtml(link) : ''}
    <div class="row">${textOnly ? '' : `<button data-a="dl" data-v="${r.id}" class="p">${files.length > 1 ? 'Download all' : 'Download'}</button>`}${showAi ? `<button data-a="ai" data-v="${r.id}">✨ AI summary</button>` : ''}
      ${isAdmin() && r.status === 'Pending' ? `<button data-a="appr" data-v="${r.id}" class="p">Approve</button><button data-a="rej" data-v="${r.id}" class="d">Reject</button>` : ''}${r.by !== S.meId ? `<button data-a="flag" data-v="${r.id}" class="d">⚑ Report</button>` : ''}${canRemove ? `<button data-a="del" data-v="${r.id}" class="d">Remove</button>` : ''}</div>
    ${UI.shown[r.id] ? `<div class="sum"><b>AI summary:</b> ${esc(r.sum)}</div>` : ''}
    ${files.length ? `<h3>Files (${files.length})</h3><div id="preview" class="preview"></div>` : ''}
    <h3>Comments (${r.comments.length})</h3>${r.comments.map(c => `<div class="cm"><b>${esc(c.u)}</b>: ${esc(c.t)}</div>`).join('') || '<div class="mut">No comments yet.</div>'}
    ${me() ? `<div class="row"><input id="ci" placeholder="Add a comment" style="flex:1"><button data-a="post" data-v="${r.id}">Post</button></div>` : '<div class="mut">Log in to add a comment.</div>'}`;
}

function profileView() {
  const mine = S.res.filter(r => r.by === S.meId && r.status !== 'Rejected');
  return `<h2>${esc(me().name)}</h2><p class="mut">${mine.length} uploads &middot; ${mine.reduce((n, r) => n + r.votes.length, 0)} upvotes received</p>
    <h3>My uploads</h3>${mine.map(r => `<div class="cm"><a href="#" data-a="view" data-v="${r.id}">${esc(r.title)}</a> <span class="st ${r.status}">${r.status}</span></div>`).join('') || '<div class="mut">Nothing uploaded yet.</div>'}
    <h3>My activity</h3>${S.log.filter(x => x.u === S.meId).slice(0, 15).map(x => `<div class="cm">${esc(x.t)} <span class="mut">&middot; ${x.d}</span></div>`).join('') || '<div class="mut">No activity yet.</div>'}`;
}

function notifsView() {
  const mine = S.notifs.filter(n => n.uid === S.meId);
  const html = `<h2>Notifications</h2>${mine.length ? '<button data-a="clearn">Clear all</button>' : ''}
    ${mine.map(n => `<div class="cm">${n.read ? '' : '🔴 '}${esc(n.t)} <span class="mut">&middot; ${n.d}</span></div>`).join('') || '<div class="empty">All caught up.</div>'}`;
  mine.forEach(n => n.read = true); save(); renderNav();
  return html;
}

function adminView() {
  const pending = S.res.filter(r => r.status === 'Pending');
  const flagged = S.res.filter(r => r.flags.length && r.status === 'Approved');
  // Each row shows what the person is trying to post, so the admin can judge it before approving
  const row = r => {
    const files = filesOf(r);
    const dupDesc = r.text && (r.desc === r.text || r.desc === r.text.slice(0, 120) + '…');
    return `<div class="cm"><b>${esc(r.title)}</b> <span class="mut">${esc(r.course)} &middot; <b>${esc(userName(r.by))}</b> &middot; ${esc(whenOf(r))}</span>
    <div class="mut">${esc(r.year)} &middot; ${esc(r.sem)} &middot; ${esc(progShort(r.program))} &middot; ${r.type} &middot; ${esc(r.meta)}</div>
    ${descOf(r) && !dupDesc ? `<div>${esc(descOf(r))}</div>` : ''}
    ${r.text ? `<div class="post-text post-peek">${esc(r.text.length > 300 ? r.text.slice(0, 300) + '…' : r.text)}</div>` : ''}
    ${files.length ? `<div class="row">${files.map(f => `<span class="tag">${esc(f.name)} &middot; ${esc(f.type)}</span>`).join('')}</div>` : ''}
    ${linkOf(r) ? `<div class="mut">Link: <a href="${esc(linkOf(r))}" target="_blank" rel="noopener noreferrer">${esc(linkOf(r))}</a></div>` : ''}
    ${r.flags.length ? `<div class="mut">Reports: ${r.flags.map(f => esc(userName(f.u) + ': ' + f.why)).join(' | ')}</div>` : ''}
    <div class="row"><button data-a="view" data-v="${r.id}">Review full post</button><button class="p" data-a="appr" data-v="${r.id}">${r.status === 'Pending' ? 'Approve' : 'Dismiss reports'}</button><button class="d" data-a="rej" data-v="${r.id}">Reject / remove</button></div></div>`;
  };
  return `<h2>Moderation</h2><h3>Pending (${pending.length})</h3>${pending.map(row).join('') || '<div class="mut">Queue is empty.</div>'}
    <h3>Reported (${flagged.length})</h3>${flagged.map(row).join('') || '<div class="mut">No reports.</div>'}`;
}

function logView() {
  return `<h2>Activity history</h2>${S.log.map(x => `<div class="cm"><b>${esc(userName(x.u))}</b> ${esc(x.t)} <span class="mut">&middot; ${x.d}</span></div>`).join('') || '<div class="mut">Nothing yet.</div>'}`;
}

// ---------- Who is online ----------
// Every open tab of a logged-in person writes "I am here" (the time) into the browser every 20 seconds.
// A person counts as online if one of their tabs checked in during the last 2 minutes.
// Logging out or closing the tab clears it right away. (This works for tabs of the same browser; with PHP + MySQL it would be saved on the server.)
const PRESENCE_KEY = 'ars_online';
const TAB_ID = Math.random().toString(36).slice(2);
const readPresence = () => { try { return JSON.parse(localStorage.getItem(PRESENCE_KEY)) || {}; } catch (e) { return {}; } };
const writePresence = p => { try { localStorage.setItem(PRESENCE_KEY, JSON.stringify(p)); } catch (e) {} };
function setPresence(uid, on) {
  if (!uid) return;
  const p = readPresence(), now = Date.now(), tabs = p[uid] || {};
  Object.keys(tabs).forEach(t => { if (now - tabs[t] > 120000) delete tabs[t]; });   // forget tabs that stopped checking in
  if (on) tabs[TAB_ID] = now; else delete tabs[TAB_ID];
  p[uid] = tabs;
  writePresence(p);
}
function clearPresence(uid) { const p = readPresence(); delete p[uid]; writePresence(p); }   // all tabs of this person (used when suspending)
const isOnline = uid => Object.values(readPresence()[uid] || {}).some(t => Date.now() - t < 120000);
const beat = () => { if (me() && !me().off) setPresence(S.meId, true); };

function usersView() {
  const dot = on => `<span class="dot ${on ? 'on' : 'off'}" role="img" aria-label="${on ? 'Online' : 'Offline'}" title="${on ? 'Online' : 'Offline'}"></span>`;
  const live = u => isOnline(u.id) && !u.off;
  const online = S.users.filter(live).length;
  return `<h2>Users</h2><p class="mut">${S.users.length} user${S.users.length === 1 ? '' : 's'} &middot; ${online} online</p>` +
    (S.users.map(u => `<div class="row sp cm"><span>${dot(live(u))} ${esc(u.name)} <span class="tag">${u.role}</span>${u.off ? ' <span class="st Rejected">suspended</span>' : ''}</span>
      ${u.role !== 'admin' ? `<button class="d" data-a="ban" data-v="${u.id}">${u.off ? 'Unsuspend' : 'Suspend'}</button>` : ''}</div>`).join('') || '<div class="mut">No users yet.</div>');
}

beat();
setInterval(() => { beat(); if (UI.view === 'users') showView('users'); }, 20000);   // check in, and refresh the Users list if it is open
window.addEventListener('pagehide', () => { if (S.meId) setPresence(S.meId, false); });   // this tab is closing
window.addEventListener('storage', e => { if (e.key === PRESENCE_KEY && UI.view === 'users') showView('users'); });   // someone logged in or out in another tab

// The student's own posts that are still waiting for an admin to approve them
function pendingView() {
  const mine = S.res.filter(r => r.by === S.meId && r.status === 'Pending');
  return `<h2>Pending posts</h2><p class="mut">These are waiting for an admin to approve them. Other students can see them once they are approved.</p>` +
    (mine.map(r => `<div class="cm"><a href="#" data-a="view" data-v="${r.id}">${esc(r.title)}</a> <span class="st Pending">Pending</span>
      <div class="mut">${esc(courseLabel(r.course))} &middot; ${esc(r.year)} &middot; ${esc(r.sem)} &middot; ${esc(r.meta)}</div>
      <div class="mut">Posted ${r.date}</div></div>`).join('') || '<div class="empty">No pending posts. Everything you posted has been reviewed.</div>');
}

// The Statistics charts (Chart.js) live in stats.js: statsView(), drawStats() and destroyCharts() are used below.

function showView(name, id) {
  if (name !== 'detail' && !me()) return showLoginPrompt(name);   // guests can only open details
  if ((name === 'admin' || name === 'log' || name === 'stats' || name === 'users') && !isAdmin()) return;   // Moderation, Activity, Statistics and Users are for admins
  UI.view = name; UI.vid = id;
  const r = name === 'detail' ? findRes(id) : null;
  if (name === 'detail' && !r) return closeView();
  destroyCharts();
  const views = { detail: () => detailView(r), profile: profileView, notifs: notifsView, admin: adminView, log: logView, stats: statsView, pending: pendingView, users: usersView };
  $('#dynBody').classList.toggle('stats-wide', name === 'stats');   // the statistics pop-up is wider
  $('#dynBody').innerHTML = '<button type="button" class="modal-close" data-a="close" aria-label="Close">&times;</button>' + views[name]();
  $('#dynModal').hidden = false;
  if (name === 'detail') loadPreview(r);
  if (name === 'stats') drawStats();
}
function closeView() { UI.view = null; $('#dynModal').hidden = true; $('#dynBody').innerHTML = ''; destroyCharts(); $('#dynBody').classList.remove('stats-wide'); }
function refresh() { save(); renderNav(); renderFilters(); renderGrid(); renderTrend(); if (UI.view) showView(UI.view, UI.vid); }

// ---------- File preview (shows what is inside the uploaded file) ----------
// Images and PDFs are shown as they are, TXT as text, and DOCX as its text (no pictures).
let previewUrls = [];

function dataToBlob(url, type) {
  const head = url.slice(0, url.indexOf(',')), bin = atob(url.slice(url.indexOf(',') + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: type || head.slice(5, head.indexOf(';')) });
}

// A .docx is a zip file. Find word/document.xml inside it and pull out the text.
async function docxText(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer()), dv = new DataView(buf.buffer);
  let end = -1;
  for (let i = buf.length - 22; i >= 0 && end < 0; i--) if (dv.getUint32(i, true) === 0x06054b50) end = i;
  if (end < 0) throw new Error('not a zip file');
  let n = dv.getUint16(end + 10, true), p = dv.getUint32(end + 16, true);
  while (n--) {
    const method = dv.getUint16(p + 10, true), size = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true), extraLen = dv.getUint16(p + 30, true), noteLen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    if (new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nameLen)) === 'word/document.xml') {
      const from = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
      let data = buf.subarray(from, from + size);
      if (method === 8) data = new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
      const xml = new TextDecoder().decode(data);
      const decode = t => t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
      return xml.split('</w:p>').map(par => (par.match(/<w:t(?: [^>]*)?>[^<]*<\/w:t>|<w:tab\/>|<w:br\/>/g) || [])
        .map(m => m.startsWith('<w:tab') ? '\t' : m.startsWith('<w:br') ? '\n' : decode(m.replace(/<[^>]+>/g, ''))).join(''))
        .join('\n').replace(/\n{3,}/g, '\n\n').trim();
    }
    p += 46 + nameLen + extraLen + noteLen;
  }
  throw new Error('no document text found');
}

async function previewOf(f) {
  if (f.type === 'Image') { const url = URL.createObjectURL(await fileBlob(f)); previewUrls.push(url); return `<img class="pv-img" src="${url}" alt="${esc(f.name)}">`; }
  if (f.type === 'PDF') {
    const url = URL.createObjectURL(await fileBlob(f, 'application/pdf'));
    previewUrls.push(url);
    return `<iframe class="pv-frame" src="${url}" title="PDF preview"></iframe>`;
  }
  if (f.type === 'TXT') return `<pre class="pv-text">${esc((await (await fileBlob(f, 'text/plain')).text()).slice(0, 20000))}</pre>`;
  if (f.type === 'DOCX') {
    if (f.size > 30 * 1024) return '<p class="mut">This file is large. Use Download to open it.</p>';
    const text = await docxText(await fileBlob(f));
    return text ? `<pre class="pv-text pv-doc">${esc(text.slice(0, 20000))}</pre><p class="mut">Text only. Pictures and layout show after you download the file.</p>` : '<p class="mut">This document has no text to show.</p>';
  }
  if (f.type === 'PPTX') {
    const p = await pptxPreview(await fileBlob(f));
    let html = '';
    if (p.thumb) { const url = URL.createObjectURL(p.thumb); previewUrls.push(url); html += `<img class="pv-img" src="${url}" alt="Slide 1">`; }
    if (p.text) html += `<pre class="pv-text">${esc(p.text.slice(0, 2000))}</pre>`;
    return html + `<p class="mut">First slide of ${p.slides} slide${p.slides === 1 ? '' : 's'}. The full presentation shows after you download the file.</p>`;
  }
  if (f.type === 'XLSX') {
    if (f.size > 30 * 1024) return '<p class="mut">This file is large. Use Download to open it.</p>';
    const grid = await xlsxGrid(await fileBlob(f), 40, 12);
    return `<div class="xl-full">${gridTable(grid)}</div><p class="mut">First rows of the first sheet. The rest shows after you download the file.</p>`;
  }
  return '<p class="mut">No preview for this file type. Use Download to open it.</p>';
}

// Move the file strip in the details pop-up one file left or right
function pvMove(dir) {
  const t = $('.pv-track'); if (!t) return;
  t.scrollBy({ left: dir * t.clientWidth, behavior: 'smooth' });
}
function pvUpdate(t) {
  const items = t.children.length, i = Math.min(items - 1, Math.round(t.scrollLeft / (t.clientWidth || 1)));
  const count = $('.pv-count'); if (count) count.textContent = `${i + 1} / ${items}`;
  const prev = $('[data-a="pvprev"]'), next = $('[data-a="pvnext"]');
  if (prev) prev.disabled = i <= 0;
  if (next) next.disabled = i >= items - 1;
}
async function loadPreview(r) {
  const box = $('#preview');
  if (!box) return;                                    // text-only posts have no files
  previewUrls.forEach(u => URL.revokeObjectURL(u)); previewUrls = [];
  const files = filesOf(r);
  const items = files.map((f, i) => `<div class="pv-item"><div class="pv-head"><b>${esc(f.name)}</b><span class="mut">${esc(f.type)}${f.size ? ' &middot; ' + fmtKB(f.size) : ''}</span>` +
    `<button type="button" data-a="dl" data-v="${r.id}" data-i="${i}">Download</button></div><div class="pv-body" id="pv${i}"><p class="mut">Loading preview&hellip;</p></div></div>`).join('');
  // Several files: one at a time, move left / right with the arrows (or swipe, or the keyboard arrow keys)
  box.innerHTML = files.length < 2 ? items : `<div class="pv-stage"><button type="button" class="pv-arrow pv-prev" data-a="pvprev" aria-label="Previous file">&#8249;</button><button type="button" class="pv-arrow pv-next" data-a="pvnext" aria-label="Next file">&#8250;</button><span class="pv-count">1 / ${files.length}</span><div class="pv-track">${items}</div></div>`;
  const track = box.querySelector('.pv-track');
  if (track) { track.addEventListener('scroll', () => pvUpdate(track)); pvUpdate(track); }
  for (let i = 0; i < files.length; i++) {
    let html;
    try { html = await previewOf(files[i]); } catch (e) { html = '<p class="mut">Could not show a preview. Use Download to open the file.</p>'; }
    const body = $('#pv' + i);
    if ($('#preview') === box && body) body.innerHTML = html;   // ignore if the pop-up changed meanwhile
  }
}

// ---------- Actions ----------
function openUpload() {
  if (!me()) return showLoginPrompt('upload');
  $('#uploadMsg').hidden = true; $('#uploadModal').hidden = false;
}

const extOf = name => name.split('.').pop().toLowerCase();

// ----- Files chosen in the upload form: each one can be removed before posting -----
let picked = [];
let pickedUrls = [];
const sizeText = bytes => bytes >= 1024 * 1024 ? (bytes / 1024 / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB';

function showPicked() {
  pickedUrls.forEach(u => URL.revokeObjectURL(u)); pickedUrls = [];
  const total = picked.reduce((n, f) => n + f.size, 0);
  const warn = picked.length > MAX_FILES ? `Too many files (max ${MAX_FILES}). Remove some.` : total > MAX_TOTAL ? `Too big together (max ${MAX_TOTAL / 1024 / 1024} MB). Remove some.` : '';
  $('#upPicked').innerHTML = picked.map((f, i) => {
    const type = TYPES[extOf(f.name)];
    const problem = !type ? 'not supported' : f.size > MAX_SIZE ? `over ${MAX_SIZE / 1024 / 1024} MB` : '';
    let thumb = `<span class="pk-ext">${esc(type || extOf(f.name).slice(0, 4).toUpperCase())}</span>`;
    if (type === 'Image') { const url = URL.createObjectURL(f); pickedUrls.push(url); thumb = `<img class="pk-thumb" src="${url}" alt="">`; }
    return `<div class="pk-item${problem ? ' bad' : ''}">${thumb}<span class="pk-name">${esc(f.name)}</span>` +
      `<span class="mut">${sizeText(f.size)}${problem ? ' &middot; ' + problem : ''}</span>` +
      `<button type="button" class="pk-remove" data-rm="${i}" title="Remove this file" aria-label="Remove ${esc(f.name)}">&times;</button></div>`;
  }).join('') + (picked.length
    ? `<p class="mut pk-sum">${picked.length} file${picked.length > 1 ? 's' : ''} &middot; ${sizeText(total)}${warn ? ' &middot; <span class="pk-warn">' + warn + '</span>' : ''}</p>` : '');
}

// Choosing files adds them to the list (it does not replace what is already there)
function addPicked() {
  [...$('#upFile').files].forEach(f => {
    if (!picked.some(x => x.name === f.name && x.size === f.size && x.lastModified === f.lastModified)) picked.push(f);
  });
  $('#upFile').value = '';   // so the same file can be chosen again after it was removed
  showPicked();
}

async function submitUpload(e) {
  e.preventDefault();
  const msg = t => { const box = $('#uploadMsg'); box.textContent = t; box.hidden = false; box.scrollIntoView({ block: 'nearest' }); };
  const files = picked.slice(), title = $('#upTitle').value.trim(), text = '';   // the "Post text" box was removed: a post is a link and/or files
  const link = cleanLink($('#upLink').value);   // '' = none, null = not a web address
  // Check the required choices ourselves, so the message shows right above the Post button
  for (const [id, name] of [['#upYear', 'year'], ['#upProgram', 'program'], ['#upSem', 'semester']]) if (!$(id).value) return msg(`Please choose the ${name}.`);
  // The course is typed: code and title, e.g. NET101 - Networking I
  const course = $('#upCourse').value.trim().replace(/\s+/g, ' ').slice(0, 80);
  if (!course) return msg('Please type the course code and title, e.g. NET101 - Networking I.');
  if (!/\S\s*[-–—]\s*\S/.test(course)) return msg('Please type both the course code and the title, e.g. NET101 - Networking I.');
  if (!title) return msg('Please add a title.');
  if (link === null) return msg('That link does not look right. Paste the full address, e.g. https://www.youtube.com/watch?v=...');
  if (!files.length && !text && !link) return msg('Add a link, or choose at least one file or photo.');
  if (files.length > MAX_FILES) return msg(`You can upload up to ${MAX_FILES} files at a time.`);
  for (const f of files) {
    if (!TYPES[extOf(f.name)]) return msg(`"${f.name}" is not supported. Use PDF, Word, PNG, JPG, PowerPoint or Excel.`);
    if (f.size > MAX_SIZE) return msg(`"${f.name}" is too big (max ${MAX_SIZE / 1024 / 1024} MB each).`);
  }
  if (files.reduce((n, f) => n + f.size, 0) > MAX_TOTAL) return msg(`These files are too big together (max ${MAX_TOTAL / 1024 / 1024} MB per post).`);

  if (files.length) msg('Saving your files… please wait.');
  const hashes = await Promise.all(files.map(fileHash));   // duplicate-file checker
  if (new Set(hashes).size < hashes.length) return msg('You picked the same file twice.');
  for (let i = 0; i < files.length; i++) {
    const dup = S.res.find(r => r.status !== 'Rejected' && (r.hash === hashes[i] || (r.files || []).some(x => x.hash === hashes[i])));
    if (dup) return msg(`⚠ Duplicate: "${files[i].name}" already exists in "${dup.title}". Upload blocked.`);
  }

  const stored = files.map((f, i) => ({
    name: f.name, type: TYPES[extOf(f.name)], size: Math.max(1, Math.round(f.size / 1024)), hash: hashes[i],
    key: `f${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`
  }));
  const dropStored = () => stored.forEach(f => delBlob(f.key).catch(() => {}));
  try { await Promise.all(files.map((f, i) => putBlob(stored[i].key, f))); }
  catch (err) { dropStored(); return msg('The browser has no space left for these files. Try fewer or smaller files.'); }
  const texts = [text];
  for (const f of files) if (extOf(f.name) === 'txt') texts.push(await f.text());
  const joined = texts.filter(Boolean).join('\n');
  const kb = stored.reduce((n, f) => n + f.size, 0);
  const sum = joined ? summarize(joined)
    : `Prototype summary based on the title (${title}). A real version would read the file text and send it to an AI model.`;

  const post = {
    id: S.nextId++, program: $('#upProgram').value, year: $('#upYear').value, course, title,
    desc: $('#upDesc').value.trim(),   // stays empty when the uploader writes nothing
    type: !stored.length ? (link ? 'Link' : 'Text') : new Set(stored.map(f => f.type)).size === 1 ? stored[0].type : 'Mixed',
    kinds: [...new Set([...stored.map(f => f.type), ...(text ? ['Text'] : []), ...(link ? ['Link'] : [])])],
    meta: stored.length ? `${stored.length} file${stored.length > 1 ? 's' : ''} · ${fmtKB(kb)}` : link ? linkHost(link) : `${text.split(/\s+/).length} word${text.split(/\s+/).length === 1 ? '' : 's'}`,
    base: 0, by: S.meId, tags: [], sem: $('#upSem').value, date: new Date().toISOString().slice(0, 10), at: Date.now(),
    status: isAdmin() ? 'Approved' : 'Pending', votes: [], flags: [], comments: [], text, link, files: stored, sum
  };
  S.res.unshift(post);
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (err) { S.res.shift(); dropStored(); return msg('The browser has no space left for this post. Try fewer or smaller files.'); }

  if (!isAdmin()) notifyAdmins(`${me().name} uploaded "${title}" for review.`);
  addLog(`uploaded "${title}"`);
  $('#uploadForm').reset(); picked = []; showPicked();
  msg(isAdmin() ? '✅ Posted! It is live right away (admin posts need no approval).' : '✅ Posted! Status: Pending admin approval. You can see it under Pending in the menu.');
  refresh();
}

// ---------- Big files live in IndexedDB (localStorage only holds ~5 MB) ----------
// A post keeps only the file's name, type, size and a key; the file itself is stored under that key.
let fileDb = null;
function openFileDb() {
  return fileDb || (fileDb = new Promise((ok, fail) => {
    const q = indexedDB.open('ars_files', 1);
    q.onupgradeneeded = () => q.result.createObjectStore('blobs');
    q.onsuccess = () => ok(q.result);
    q.onerror = () => fail(q.error);
  }));
}
async function dbDo(mode, fn) {
  const db = await openFileDb();
  return new Promise((ok, fail) => {
    const tx = db.transaction('blobs', mode), req = fn(tx.objectStore('blobs'));
    tx.oncomplete = () => ok(req.result);
    tx.onerror = tx.onabort = () => fail(tx.error);
  });
}
const putBlob = (key, blob) => dbDo('readwrite', st => st.put(blob, key));
const getBlob = key => dbDo('readonly', st => st.get(key));
const delBlob = key => dbDo('readwrite', st => st.delete(key));
// The file of a post as a Blob (newer posts: from IndexedDB; posts from older versions: from the saved text)
async function fileBlob(f, type) {
  const blob = f.key ? await getBlob(f.key) : dataToBlob(f.data);
  if (!blob) throw new Error('file not found');
  return type ? new Blob([blob], { type }) : blob;
}
const fmtKB = kb => kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB';
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}   // ask the browser not to clear the files

function saveAs(href, name) {
  const a = document.createElement('a');
  a.href = href; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
}

// i = one file of the post, no i = everything (all files, or the text of a text-only post)
async function download(r, i) {
  const files = filesOf(r);
  const send = async f => {
    try { const url = URL.createObjectURL(await fileBlob(f)); saveAs(url, f.name); setTimeout(() => URL.revokeObjectURL(url), 60000); }
    catch (e) { alert(`Could not find "${f.name}" in this browser.`); }
  };
  if (i !== undefined && files[i]) await send(files[i]);
  else if (!files.length) saveAs(URL.createObjectURL(new Blob([r.text || 'Prototype placeholder for: ' + r.title], { type: 'text/plain' })), r.title + '.txt');
  else for (const f of files) { await send(f); await new Promise(ok => setTimeout(ok, 400)); }
  addLog(`downloaded "${r.title}"`); save();
}

// ---------- Login prompt ----------
// Log in / Sign up open as a pop-up on this page (login.html still works as a separate page)
// Guests can look around, but some actions need an account. This asks them to log in.
function showLoginPrompt(action) {
  const what = { dl: 'download files', vote: 'upvote resources', post: 'comment', flag: 'report a resource', upload: 'upload resources' }[action] || 'see that page';
  UI.view = null;
  $('#dynBody').innerHTML = `<button type="button" class="modal-close" data-a="close" aria-label="Close">&times;</button>
    <h2>Please log in</h2><p>You need an account to ${what}.</p>
    <div class="row"><a class="btn-link" href="login.html" data-a="auth" data-v="login">Log in</a><a class="btn-outline" href="login.html?tab=signup" data-a="auth" data-v="signup">Sign up</a><button data-a="close">Not now</button></div>`;
  $('#dynModal').hidden = false;
}

// ---------- Log in / Sign up pop-up ----------
// Same accounts and password scheme as login.js, so both ways of logging in work together.
const ADMIN_EMAILS = ['admin@school.edu'];   // these emails become Administrators when they sign up
async function hashText(text) {
  if (!window.crypto || !crypto.subtle) return btoa(unescape(encodeURIComponent(text)));
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}
function showAuth(tab) {
  UI.view = null;
  $('#dynBody').innerHTML = `<button type="button" class="modal-close" data-a="close" aria-label="Close">&times;</button>
    <div class="auth-box" style="border:0;box-shadow:none;padding:0;margin:0;background:none">
      <img src="logo.svg" alt="" class="auth-logo">
      <h2>Academic Resource <span>Repository System</span></h2>
      <div class="auth-tabs">
        <button type="button" class="auth-tab" data-a="authtab" data-v="login">Log in</button>
        <button type="button" class="auth-tab" data-a="authtab" data-v="signup">Sign up</button>
      </div>
      <p class="note" id="authMsg" hidden></p>
      <form id="loginForm">
        <label class="field"><span>Email</span><input type="email" id="liEmail" required></label>
        <label class="field"><span>Password</span><input type="password" id="liPass" required></label>
        <button type="submit" class="btn-submit">Log in</button>
      </form>
      <form id="signupForm" hidden>
        <label class="field"><span>Full name</span><input type="text" id="suName" required></label>
        <label class="field"><span>Email</span><input type="email" id="suEmail" required></label>
        <label class="field"><span>Password (at least 6 characters)</span><input type="password" id="suPass" required></label>
        <label class="field"><span>Confirm password</span><input type="password" id="suPass2" required></label>
        <button type="submit" class="btn-submit">Create account</button>
      </form>
    </div>`;
  $('#dynModal').hidden = false;
  authTab(tab === 'signup' ? 'signup' : 'login');
}
function authTab(tab) {
  $('#loginForm').hidden = tab !== 'login';
  $('#signupForm').hidden = tab !== 'signup';
  document.querySelectorAll('.auth-tab').forEach(b => b.classList.toggle('on', b.dataset.v === tab));
  authMessage('');
  const first = $(tab === 'login' ? '#liEmail' : '#suName'); if (first) first.focus();
}
function authMessage(text) { const box = $('#authMsg'); if (box) { box.textContent = text; box.hidden = !text; } }
function enterSite(user) {
  S.meId = user.id;
  try { sessionStorage.setItem('ars_me', String(user.id)); } catch (e) {}   // this tab's own login
  addLog('logged in'); beat();
  closeView(); refresh();
}
document.addEventListener('submit', async e => {
  if (e.target.id === 'loginForm') {
    e.preventDefault();
    const email = $('#liEmail').value.trim().toLowerCase();
    const user = S.users.find(u => u.email === email);
    if (!user || user.pass !== await hashText(email + ':' + $('#liPass').value)) return authMessage('Wrong email or password.');
    if (user.off) return authMessage('Your account is suspended.');
    enterSite(user);
  } else if (e.target.id === 'signupForm') {
    e.preventDefault();
    const name = $('#suName').value.trim(), email = $('#suEmail').value.trim().toLowerCase(), pass = $('#suPass').value;
    if (pass.length < 6) return authMessage('Password must be at least 6 characters.');
    if (pass !== $('#suPass2').value) return authMessage('Passwords do not match.');
    if (S.users.some(u => u.email === email)) return authMessage('That email is already registered.');
    const user = { id: Math.max(0, ...S.users.map(u => u.id)) + 1, name, email, role: ADMIN_EMAILS.includes(email) ? 'admin' : 'student', pass: await hashText(email + ':' + pass) };
    S.users.push(user);
    enterSite(user);
  }
});

document.addEventListener('click', e => {
  if (e.target.id === 'clearFilters') return clearFilters();
  if (!e.target.closest('.dd')) closeMenus();
  if (e.target.closest('#openUpload')) return openUpload();
  if (e.target.closest('#trendingLink')) { UI.sort = 'top'; UI.page = 1; $('#sortSelect').value = 'top'; renderGrid(); return; }   // Trending = Most helpful first (the link then jumps to the list)
  if (e.target.id === 'closeUpload' || e.target.id === 'uploadModal') return $('#uploadModal').hidden = true;
  if (e.target.id === 'dynModal') return closeView();

  const btn = e.target.closest('[data-a]');
  if (!btn) return;
  e.preventDefault();
  const a = btn.dataset.a, v = btn.dataset.v, r = findRes(v);

  if (a === 'close') return closeView();
  if (a === 'pvprev' || a === 'pvnext') return pvMove(a === 'pvnext' ? 1 : -1);
  if (a === 'auth') return showAuth(v);
  if (a === 'authtab') return authTab(v);
  if (a === 'open') return showView(v);
  if (a === 'view') return showView('detail', v);
  if (a === 'dd') { const menu = btn.nextElementSibling, wasHidden = menu.hidden; closeMenus(); menu.hidden = !wasHidden; return; }
  if (a === 'page') {
    UI.page = Number(v); renderGrid();
    $('#browse').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    return;
  }
  if (a === 'pick') { UI[btn.dataset.id] = btn.dataset.val; renderFilters(); return renderGrid(); }
  if (a === 'out') { addLog('logged out'); setPresence(S.meId, false); S.meId = null; try { sessionStorage.setItem('ars_me', ''); } catch (e) {} closeView(); return refresh(); }
  // Guests may read the AI summary; everything below needs an account
  if (a === 'ai' && r) { UI.shown[r.id] = !UI.shown[r.id]; if (me() && UI.shown[r.id]) addLog(`viewed AI summary of "${r.title}"`); return refresh(); }
  if (!me()) return showLoginPrompt(a);

  if (a === 'clearn') S.notifs = S.notifs.filter(n => n.uid !== S.meId);
  else if (a === 'ban') { const u = S.users.find(x => x.id === Number(v)); u.off = !u.off; if (u.off) clearPresence(u.id); addLog((u.off ? 'suspended ' : 'unsuspended ') + u.name); }
  else if (!r) return;
  else if (a === 'vote') { const i = r.votes.indexOf(S.meId); i < 0 ? r.votes.push(S.meId) : r.votes.splice(i, 1); addLog(`rated "${r.title}"`); }
  else if (a === 'dl') return download(r, btn.dataset.i);
  else if (a === 'post') {
    const text = $('#ci').value.trim(); if (!text) return;
    r.comments.push({ u: me().name, t: text }); addLog(`commented on "${r.title}"`);
    if (r.by !== S.meId) notify(r.by, `${me().name} commented on "${r.title}".`);
  }
  else if (a === 'flag') {
    if (r.flags.some(f => f.u === S.meId)) return alert('You already reported this resource.');
    const why = prompt('Why are you reporting this? (inappropriate, incorrect or unauthorized)');
    if (!why) return;
    r.flags.push({ u: S.meId, why }); addLog(`reported "${r.title}"`); notifyAdmins(`"${r.title}" was reported: ${why}`);
  }
  else if (a === 'appr') { if (UI.view === 'detail') { UI.view = 'admin'; UI.vid = undefined; } r.status = 'Approved'; r.flags = []; notify(r.by, `Your upload "${r.title}" was approved.`); addLog(`approved "${r.title}"`); }
  else if (a === 'rej') { if (UI.view === 'detail') { UI.view = 'admin'; UI.vid = undefined; } r.status = 'Rejected'; notify(r.by, `Your upload "${r.title}" was rejected or removed by an admin.`); addLog(`rejected "${r.title}"`); }
  else if (a === 'del') {
    if (!confirm(`Remove "${r.title}"?`)) return;
    if (isAdmin()) { r.status = 'Rejected'; notify(r.by, `Your upload "${r.title}" was removed by an admin.`); } else { S.res = S.res.filter(x => x !== r); filesOf(r).forEach(f => f.key && delBlob(f.key).catch(() => {})); }
    addLog(`removed "${r.title}"`); closeView();
  }
  refresh();
});

$('#searchForm').addEventListener('submit', e => { e.preventDefault(); UI.q = $('#searchInput').value.trim(); renderGrid(); });
$('#searchInput').addEventListener('input', e => { UI.q = e.target.value.trim(); renderGrid(); });
$('#upFile').addEventListener('change', addPicked);
$('#upPicked').addEventListener('click', e => {
  const btn = e.target.closest('[data-rm]');
  if (btn) { picked.splice(Number(btn.dataset.rm), 1); showPicked(); }
});
$('#sortSelect').addEventListener('change', e => { UI.sort = e.target.value; renderGrid(); });
window.addEventListener('resize', () => { if (gridCols() !== lastCols) renderGrid(); });   // columns changed, so the page size changed
$('#uploadForm').addEventListener('submit', submitUpload);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeView(); $('#uploadModal').hidden = true; }
  if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && $('.pv-track') && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) pvMove(e.key === 'ArrowRight' ? 1 : -1);
});

if (me() && me().off) S.meId = null; // suspended users are logged out
renderNav(); renderFilters(); renderGrid(); renderTrend();

// ---------- Notification pop-ups ----------
// A small message appears at the bottom right when someone comments on your upload, approves it, and so on.
const myNotifs = () => S.notifs.filter(n => n.uid === S.meId);

function toast(text) {
  let box = $('#toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.className = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = text; t.title = 'Click to open your notifications';
  t.addEventListener('click', () => { t.remove(); showView('notifs'); });
  box.appendChild(t);
  setTimeout(() => t.remove(), 8000);
}

// When another tab changes the saved data (someone comments, approves...), this tab updates right away
window.addEventListener('storage', e => {
  if (e.key !== KEY || !e.newValue) return;
  const seen = new Set(myNotifs().map(n => n.d + n.t)), mine = S.meId;
  try { S = dropSamples(Object.assign(seedData(), JSON.parse(e.newValue))); } catch (err) { return; }
  S.meId = mine;
  myNotifs().filter(n => !n.read && !seen.has(n.d + n.t)).slice(0, 3).forEach(n => toast('🔔 ' + n.t));
  renderNav(); renderFilters(); renderGrid(); renderTrend();
});

// When the page opens: remind about notifications that are not opened yet
const unreadNow = myNotifs().filter(n => !n.read).length;
if (unreadNow) toast(`🔔 You have ${unreadNow} new notification${unreadNow === 1 ? '' : 's'}`);