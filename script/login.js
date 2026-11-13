// login.js - the Log in / Sign up page

const KEY = 'ars_v3';

const ADMIN_EMAILS = ['admin@arpsmcc.com'];

const SAMPLE_NAMES = [];

const $ = s => document.querySelector(s);

// ---------- Saved data ----------
function loadData() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
}
function usersOf(data) {
  return data.users || SAMPLE_NAMES.map((name, i) => ({ id: i + 1, name, role: i === 1 ? 'admin' : 'student' }));
}

function enter(data, user) {
  data.users = usersOf(data);
  data.meId = user.id;
  data.log = [{ u: user.id, t: 'logged in', d: new Date().toLocaleString() }].concat(data.log || []).slice(0, 100);
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  try { sessionStorage.setItem('ars_me', String(user.id)); } catch (e) {}
  location.href = 'index.html';
}

(function () {
  const data = loadData();
  let id = data.meId;
  try { const m = sessionStorage.getItem('ars_me'); if (m !== null) id = m ? Number(m) : null; } catch (e) {}
  if (id && (data.users || []).some(u => u.id === id && !u.off)) location.href = 'index.html';
})();

// ---------- Password and messages ----------
async function hashText(text) {
  if (!window.crypto || !crypto.subtle) return btoa(unescape(encodeURIComponent(text)));
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}
function message(text) { const box = $('#authMsg'); box.textContent = text; box.hidden = !text; }

function showTab(tab) {
  $('#loginForm').hidden = tab !== 'login';
  $('#signupForm').hidden = tab !== 'signup';
  document.querySelectorAll('.auth-tab').forEach(b => b.classList.toggle('on', b.dataset.v === tab));
  message('');
}

if (new URLSearchParams(location.search).get('tab') === 'signup') showTab('signup');

// ---------- Log in ----------
$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const data = loadData(), email = $('#liEmail').value.trim().toLowerCase();
  const user = usersOf(data).find(u => u.email === email);
  if (!user || user.pass !== await hashText(email + ':' + $('#liPass').value)) return message('Wrong email or password.');
  if (user.off) return message('Your account is suspended.');
  enter(data, user);
});

// ---------- Sign up ----------
$('#signupForm').addEventListener('submit', async e => {
  e.preventDefault();
  const data = loadData(), users = usersOf(data);
  const name = $('#suName').value.trim(), email = $('#suEmail').value.trim().toLowerCase(), pass = $('#suPass').value;
  if (pass.length < 6) return message('Password must be at least 6 characters.');
  if (pass !== $('#suPass2').value) return message('Passwords do not match.');
  if (users.some(u => u.email === email)) return message('That email is already registered.');
  const user = { id: Math.max(0, ...users.map(u => u.id)) + 1, name, email, role: ADMIN_EMAILS.includes(email) ? 'admin' : 'student', pass: await hashText(email + ':' + pass) };
  users.push(user);
  data.users = users;
  enter(data, user);
});

// ---------- Tabs ----------
document.addEventListener('click', e => {
  const link = e.target.closest('[data-a]');
  if (!link) return;
  e.preventDefault();
  const a = link.dataset.a, v = link.dataset.v;
  if (a === 'authtab') showTab(v);
});
