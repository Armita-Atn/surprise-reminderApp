// ================================
// آدرس سرور
// ================================
const API_URL = 'https://surprise-reminder.onrender.com/api';
const TOKEN_KEY = 'reminder_app_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}
function authHeaders(extra) {
  return Object.assign({ 'Authorization': 'Bearer ' + getToken() }, extra || {});
}

const loginScreen = document.getElementById('loginScreen');
const appScreen = document.getElementById('appScreen');
const loginPassword = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');

function showLogin() {
  clearToken();
  loginScreen.style.display = 'flex';
  appScreen.style.display = 'none';
}

function showApp() {
  loginScreen.style.display = 'none';
  appScreen.style.display = 'block';
  initApp();
}

loginBtn.addEventListener('click', async () => {
  const password = loginPassword.value;
  loginError.style.display = 'none';
  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    if (!res.ok) {
      loginError.style.display = 'block';
      return;
    }
    const data = await res.json();
    setToken(data.token);
    showApp();
  } catch (err) {
    loginError.textContent = 'اتصال به سرور برقرار نشد';
    loginError.style.display = 'block';
  }
});

// اگه توکن قبلاً ذخیره شده، مستقیم بریم تو اپ
if (getToken()) {
  showApp();
} else {
  showLogin();
}

// ================================
// از این‌جا به بعد فقط بعد از ورود موفق اجرا می‌شه
// ================================
let appInitialized = false;

function initApp() {
  if (appInitialized) { loadCustomers(); return; }
  appInitialized = true;

  // ---------- ساخت سلکت‌های تاریخ شمسی ----------
  const today = new Date();
  const todayJ = JalaliCalendar.toJalali(today.getFullYear(), today.getMonth() + 1, today.getDate());

  const yearSel = document.getElementById('dYear');
  const monthSel = document.getElementById('dMonth');
  const daySel = document.getElementById('dDay');

  for (let y = todayJ.jy - 1; y <= todayJ.jy + 1; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    if (y === todayJ.jy) opt.selected = true;
    yearSel.appendChild(opt);
  }
  JalaliCalendar.monthNames.forEach((name, i) => {
    const opt = document.createElement('option');
    opt.value = i + 1;
    opt.textContent = name;
    if (i + 1 === todayJ.jm) opt.selected = true;
    monthSel.appendChild(opt);
  });
  for (let d = 1; d <= 31; d++) {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = d;
    if (d === todayJ.jd) opt.selected = true;
    daySel.appendChild(opt);
  }

  // ---------- سلکت‌های تاریخ سررسید (پیش‌فرض: تاریخ ورودی + ۲۵ روز) ----------
  const dueYearSel = document.getElementById('dueYear');
  const dueMonthSel = document.getElementById('dueMonth');
  const dueDaySel = document.getElementById('dueDay');

  function computeDefaultDueJalali() {
    const jy = Number(yearSel.value), jm = Number(monthSel.value), jd = Number(daySel.value);
    const startIso = JalaliCalendar.jalaliToIso(jy, jm, jd);
    const startDate = new Date(startIso);
    startDate.setDate(startDate.getDate() + 25);
    const iso = startDate.toISOString().slice(0, 10);
    const [gy, gm, gd] = iso.split('-').map(Number);
    return JalaliCalendar.toJalali(gy, gm, gd);
  }

  function buildDueSelects() {
    const dueJ = computeDefaultDueJalali();

    dueYearSel.innerHTML = '';
    for (let y = dueJ.jy - 1; y <= dueJ.jy + 1; y++) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      if (y === dueJ.jy) opt.selected = true;
      dueYearSel.appendChild(opt);
    }

    dueMonthSel.innerHTML = '';
    JalaliCalendar.monthNames.forEach((name, i) => {
      const opt = document.createElement('option');
      opt.value = i + 1;
      opt.textContent = name;
      if (i + 1 === dueJ.jm) opt.selected = true;
      dueMonthSel.appendChild(opt);
    });

    dueDaySel.innerHTML = '';
    for (let d = 1; d <= 31; d++) {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      if (d === dueJ.jd) opt.selected = true;
      dueDaySel.appendChild(opt);
    }
  }

  buildDueSelects();
  [yearSel, monthSel, daySel].forEach(sel => sel.addEventListener('change', buildDueSelects));

  // ---------- افزودن مشتری ----------
  document.getElementById('addBtn').addEventListener('click', async () => {
    const name = document.getElementById('custName').value.trim();
    const amount = document.getElementById('custAmount').value;
    const jy = Number(yearSel.value), jm = Number(monthSel.value), jd = Number(daySel.value);
    const djy = Number(dueYearSel.value), djm = Number(dueMonthSel.value), djd = Number(dueDaySel.value);

    if (!name) {
      alert('نام مشتری رو وارد کن');
      return;
    }

    const startDateIso = JalaliCalendar.jalaliToIso(jy, jm, jd);
    const dueDateIso = JalaliCalendar.jalaliToIso(djy, djm, djd);

    try {
      const res = await fetch(`${API_URL}/customers`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name, startDate: startDateIso, dueDate: dueDateIso, amount: amount ? Number(amount) : null })
      });
      if (res.status === 401) { showLogin(); return; }
      if (!res.ok) throw new Error('خطا در ثبت');
      document.getElementById('custName').value = '';
      document.getElementById('custAmount').value = '';
      loadCustomers();
    } catch (err) {
      alert('اتصال به سرور برقرار نشد.');
      console.error(err);
    }
  });

  loadCustomers();
  setupPush();
}

// ---------- نمایش لیست مشتری‌ها ----------
async function loadCustomers() {
  const listEl = document.getElementById('customerList');
  try {
    const res = await fetch(`${API_URL}/customers`, { headers: authHeaders() });
    if (res.status === 401) { showLogin(); return; }
    const customers = await res.json();

    if (customers.length === 0) {
      listEl.innerHTML = '<div class="empty-state">هنوز مشتری‌ای ثبت نشده</div>';
      return;
    }

    listEl.innerHTML = customers.map(c => {
      let badgeClass = 'ok', badgeText = `${c.daysLeft} روز مونده`;
      if (c.daysLeft <= 0) {
        badgeClass = 'danger';
        badgeText = c.daysLeft === 0 ? 'امروز سررسیده' : `${Math.abs(c.daysLeft)} روز گذشته`;
      } else if (c.daysLeft <= 3) {
        badgeClass = 'warn';
      }
      const dueJalali = JalaliCalendar.isoToJalaliDisplay(c.dueDate);
      const amountText = c.amount ? `${Number(c.amount).toLocaleString('fa-IR')} ریال · ` : '';
      return `
        <div class="customer-item">
          <div class="info">
            <div class="name">${escapeHtml(c.name)}</div>
            <div class="meta">${amountText}سررسید: ${dueJalali}</div>
          </div>
          <span class="badge ${badgeClass}">${badgeText}</span>
          <button class="del-btn" onclick="deleteCustomer('${c.id}')">✕</button>
        </div>`;
    }).join('');
  } catch (err) {
    listEl.innerHTML = '<div class="empty-state">اتصال به سرور برقرار نشد</div>';
  }
}

async function deleteCustomer(id) {
  if (!confirm('این مشتری حذف بشه؟')) return;
  const res = await fetch(`${API_URL}/customers/${id}`, { method: 'DELETE', headers: authHeaders() });
  if (res.status === 401) { showLogin(); return; }
  loadCustomers();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- ثبت‌نام سرویس‌ورکر + پوش نوتیفیکیشن ----------
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

async function setupPush() {
  const notifBanner = document.getElementById('notifBanner');
  const notifText = document.getElementById('notifText');
  const notifBtn = document.getElementById('notifBtn');

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    notifBanner.style.display = 'flex';
    notifText.textContent = 'این مرورگر از نوتیفیکیشن پشتیبانی نمی‌کنه';
    notifBtn.style.display = 'none';
    return;
  }

  const reg = await navigator.serviceWorker.register('service-worker.js');

  if (Notification.permission === 'granted') {
    await subscribeUser(reg);
    notifBanner.classList.add('ok');
    notifBanner.style.display = 'flex';
    notifText.textContent = 'نوتیفیکیشن فعاله ✓';
    notifBtn.style.display = 'none';
  } else if (Notification.permission !== 'denied') {
    notifBanner.style.display = 'flex';
    notifText.textContent = 'برای دریافت یادآور، نوتیفیکیشن رو فعال کن';
    notifBtn.onclick = async () => {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        await subscribeUser(reg);
        notifBanner.classList.add('ok');
        notifText.textContent = 'نوتیفیکیشن فعاله ✓';
        notifBtn.style.display = 'none';
      }
    };
  }
}

async function subscribeUser(reg) {
  try {
    const keyRes = await fetch(`${API_URL}/vapid-public-key`);
    const { publicKey } = await keyRes.json();

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
    }
    await fetch(`${API_URL}/subscribe`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(sub)
    });
  } catch (err) {
    console.error('خطا در فعال‌سازی نوتیفیکیشن:', err);
  }
}
