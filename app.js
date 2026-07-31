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

// ---------- پر کردن سلکت‌های سال/ماه/روز شمسی با یه تاریخ پیش‌فرض ----------
function populateJalaliSelects(yearId, monthId, dayId, jalaliDate) {
  const yearSel = document.getElementById(yearId);
  const monthSel = document.getElementById(monthId);
  const daySel = document.getElementById(dayId);
  if (!yearSel || !monthSel || !daySel) return;

  yearSel.innerHTML = '';
  monthSel.innerHTML = '';
  daySel.innerHTML = '';

  for (let y = jalaliDate.jy - 1; y <= jalaliDate.jy + 1; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    if (y === jalaliDate.jy) opt.selected = true;
    yearSel.appendChild(opt);
  }
  JalaliCalendar.monthNames.forEach((name, i) => {
    const opt = document.createElement('option');
    opt.value = i + 1;
    opt.textContent = name;
    if (i + 1 === jalaliDate.jm) opt.selected = true;
    monthSel.appendChild(opt);
  });
  for (let d = 1; d <= 31; d++) {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = d;
    if (d === jalaliDate.jd) opt.selected = true;
    daySel.appendChild(opt);
  }
}

// ---------- جابه‌جایی بین صفحه‌ی لیست و گزارش ----------
function showPage(name) {
  const pageList = document.getElementById('pageList');
  const pageReport = document.getElementById('pageReport');
  if (pageList) pageList.style.display = name === 'list' ? 'block' : 'none';
  if (pageReport) pageReport.style.display = name === 'report' ? 'block' : 'none';
  document.querySelectorAll('.side-menu-item[data-page]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === name);
  });
}

// ---------- باز کردن صفحه‌ی ثبت دریافت برای یه مشتری خاص ----------
function openPaymentPage(id) {
  const customer = lastCustomers.find(c => c.id === id);
  if (!customer) return;

  const pagePayment = document.getElementById('pagePayment');
  pagePayment.dataset.customerId = id;
  document.getElementById('paymentCustName').textContent = customer.name;
  document.getElementById('paymentAmount').value = customer.amount ? Number(customer.amount).toLocaleString('en-US') : '';

  const today = new Date();
  const todayJ = JalaliCalendar.toJalali(today.getFullYear(), today.getMonth() + 1, today.getDate());
  populateJalaliSelects('payYear', 'payMonth', 'payDay', todayJ);

  pagePayment.style.display = 'block';
}

const authScreen = document.getElementById('authScreen');
const appScreen = document.getElementById('appScreen');
const authUsername = document.getElementById('authUsername');
const authPassword = document.getElementById('authPassword');
const authBtn = document.getElementById('authBtn');
const authError = document.getElementById('authError');
const tabLogin = document.getElementById('tabLogin');
const tabSignup = document.getElementById('tabSignup');

let authMode = 'login'; // یا 'signup'

function setAuthMode(mode) {
  authMode = mode;
  authError.style.display = 'none';
  if (mode === 'login') {
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    authBtn.textContent = 'ورود';
  } else {
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    authBtn.textContent = 'ثبت‌نام';
  }
}
tabLogin.addEventListener('click', () => setAuthMode('login'));
tabSignup.addEventListener('click', () => setAuthMode('signup'));

function showAuth() {
  clearToken();
  authScreen.style.display = 'flex';
  appScreen.style.display = 'none';
}

function showApp() {
  authScreen.style.display = 'none';
  appScreen.style.display = 'block';
  initApp();
}

authBtn.addEventListener('click', async () => {
  const username = authUsername.value.trim();
  const password = authPassword.value;
  authError.style.display = 'none';

  if (!username || !password) {
    authError.textContent = 'نام کاربری و رمز عبور رو وارد کن';
    authError.style.display = 'block';
    return;
  }

  const endpoint = authMode === 'login' ? 'login' : 'signup';

  try {
    const res = await fetch(`${API_URL}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) {
      authError.textContent = data.error || 'خطایی رخ داد';
      authError.style.display = 'block';
      return;
    }
    setToken(data.token);
    showApp();
  } catch (err) {
    authError.textContent = 'اتصال به سرور برقرار نشد';
    authError.style.display = 'block';
  }
});

// اگه توکن قبلاً ذخیره شده، مستقیم بریم تو اپ
if (getToken()) {
  showApp();
} else {
  showAuth();
}

// ================================
// از این‌جا به بعد فقط بعد از ورود موفق اجرا می‌شه
// ================================
let appInitialized = false;

function initApp() {
  if (appInitialized) { loadCustomers(); return; }
  appInitialized = true;

  // ---------- منوی کشویی (تو try/catch تا اگه مشکلی داشت بقیه‌ی فرم خراب نشه) ----------
  try {
    const sideMenu = document.getElementById('sideMenu');
    const sideMenuOverlay = document.getElementById('sideMenuOverlay');
    const edgeHandle = document.getElementById('edgeHandle');

    function openMenu() {
      if (sideMenu) sideMenu.classList.add('open');
      if (sideMenuOverlay) sideMenuOverlay.classList.add('open');
    }
    function closeMenu() {
      if (sideMenu) sideMenu.classList.remove('open');
      if (sideMenuOverlay) sideMenuOverlay.classList.remove('open');
    }

    if (sideMenuOverlay) sideMenuOverlay.addEventListener('click', closeMenu);

    const sideLogoutBtn = document.getElementById('sideLogoutBtn');
    if (sideLogoutBtn) {
      sideLogoutBtn.addEventListener('click', () => {
        closeMenu();
        showAuth();
      });
    }

    const navListBtn = document.querySelector('[data-page="list"]');
    const navReportBtn = document.querySelector('[data-page="report"]');
    if (navListBtn) navListBtn.addEventListener('click', () => { closeMenu(); showPage('list'); });
    if (navReportBtn) navReportBtn.addEventListener('click', () => { closeMenu(); showPage('report'); });

    // ---------- کشیدن از لبه‌ی صفحه برای باز کردن منو (مثل آیفون) ----------
    if (edgeHandle && sideMenu) {
      const menuWidth = 230;
      let dragging = false;
      let startX = 0;
      let currentX = 0;

      function setMenuX(x) {
        const clamped = Math.max(-menuWidth, Math.min(0, x));
        sideMenu.style.transition = 'none';
        sideMenu.style.transform = `translateX(${clamped}px)`;
        if (sideMenuOverlay) sideMenuOverlay.style.opacity = String((clamped + menuWidth) / menuWidth * 0.4);
        if (sideMenuOverlay) sideMenuOverlay.style.pointerEvents = clamped > -menuWidth ? 'auto' : 'none';
      }

      function endDrag(finalX) {
        sideMenu.style.transition = '';
        sideMenu.style.transform = '';
        if (sideMenuOverlay) { sideMenuOverlay.style.opacity = ''; sideMenuOverlay.style.pointerEvents = ''; }
        if (finalX > -menuWidth / 2) {
          openMenu();
        } else {
          closeMenu();
        }
      }

      edgeHandle.addEventListener('touchstart', (e) => {
        dragging = true;
        startX = e.touches[0].clientX;
        currentX = -menuWidth;
      }, { passive: true });

      edgeHandle.addEventListener('touchmove', (e) => {
        if (!dragging) return;
        const dx = e.touches[0].clientX - startX;
        currentX = -menuWidth + dx;
        setMenuX(currentX);
      }, { passive: true });

      edgeHandle.addEventListener('touchend', () => {
        if (!dragging) return;
        dragging = false;
        endDrag(currentX);
      });

      edgeHandle.addEventListener('click', () => {
        if (sideMenu.classList.contains('open')) closeMenu(); else openMenu();
      });
    }
  } catch (err) {
    console.error('خطا در راه‌اندازی منو:', err);
  }

  // ---------- فرمت جداکننده‌ی هزارگان برای مبلغ ----------
  const custAmountEl = document.getElementById('custAmount');
  if (custAmountEl) {
    custAmountEl.addEventListener('input', () => {
      const digitsOnly = custAmountEl.value.replace(/[^\d]/g, '');
      custAmountEl.value = digitsOnly ? Number(digitsOnly).toLocaleString('en-US') : '';
    });
  }

  // ---------- ساخت سلکت‌های تاریخ شمسی ----------
  const today = new Date();
  const todayJ = JalaliCalendar.toJalali(today.getFullYear(), today.getMonth() + 1, today.getDate());

  populateJalaliSelects('dYear', 'dMonth', 'dDay', todayJ);
  const yearSel = document.getElementById('dYear');
  const monthSel = document.getElementById('dMonth');
  const daySel = document.getElementById('dDay');

  // ---------- افزودن مشتری ----------
  document.getElementById('addBtn').addEventListener('click', async () => {
    const name = document.getElementById('custName').value.trim();
    const amount = document.getElementById('custAmount').value.replace(/,/g, '');
    const graceDays = Number(document.getElementById('graceDays').value) || 25;
    const jy = Number(yearSel.value), jm = Number(monthSel.value), jd = Number(daySel.value);

    if (!name) {
      alert('نام مشتری رو وارد کن');
      return;
    }

    const startDateIso = JalaliCalendar.jalaliToIso(jy, jm, jd);
    const dueDate = new Date(startDateIso);
    dueDate.setDate(dueDate.getDate() + graceDays);
    const dueDateIso = dueDate.toISOString().slice(0, 10);

    try {
      const res = await fetch(`${API_URL}/customers`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name, startDate: startDateIso, dueDate: dueDateIso, amount: amount ? Number(amount) : null })
      });
      if (res.status === 401) { showAuth(); return; }
      if (!res.ok) throw new Error('خطا در ثبت');
      document.getElementById('custName').value = '';
      document.getElementById('custAmount').value = '';
      loadCustomers();
    } catch (err) {
      alert('اتصال به سرور برقرار نشد.');
      console.error(err);
    }
  });

  // ---------- صفحه‌ی گزارش نقدینگی ----------
  populateJalaliSelects('repFromYear', 'repFromMonth', 'repFromDay', todayJ);
  populateJalaliSelects('repToYear', 'repToMonth', 'repToDay', todayJ);

  document.getElementById('repCalcBtn').addEventListener('click', async () => {
    const fromIso = JalaliCalendar.jalaliToIso(
      Number(document.getElementById('repFromYear').value),
      Number(document.getElementById('repFromMonth').value),
      Number(document.getElementById('repFromDay').value)
    );
    const toIso = JalaliCalendar.jalaliToIso(
      Number(document.getElementById('repToYear').value),
      Number(document.getElementById('repToMonth').value),
      Number(document.getElementById('repToDay').value)
    );

    try {
      const res = await fetch(`${API_URL}/report?from=${fromIso}&to=${toIso}`, { headers: authHeaders() });
      if (res.status === 401) { showAuth(); return; }
      const data = await res.json();
      const resultCard = document.getElementById('repResultCard');
      const resultEl = document.getElementById('repResult');
      resultCard.style.display = 'block';
      resultEl.innerHTML = `
        <div class="customer-item"><div class="info"><div class="name">تعداد مشتری در این بازه</div></div><span class="badge ok">${data.count}</span></div>
        <div class="customer-item"><div class="info"><div class="name">تعداد دریافت‌شده</div></div><span class="badge ok">${data.paidCount}</span></div>
        <div class="customer-item"><div class="info"><div class="name">مجموع قول‌داده‌شده</div></div><span class="badge warn">${Number(data.totalPromised).toLocaleString('fa-IR')} ریال</span></div>
        <div class="customer-item"><div class="info"><div class="name">مجموع دریافت‌شده</div></div><span class="badge ok">${Number(data.totalPaid).toLocaleString('fa-IR')} ریال</span></div>
        <div class="customer-item"><div class="info"><div class="name">درصد وصول</div></div><span class="badge ${data.percentage >= 80 ? 'ok' : data.percentage >= 40 ? 'warn' : 'danger'}">${data.percentage}%</span></div>
      `;
    } catch (err) {
      alert('اتصال به سرور برقرار نشد.');
    }
  });

  // ---------- صفحه‌ی ثبت پرداخت ----------
  document.getElementById('paymentBackBtn').addEventListener('click', () => {
    document.getElementById('pagePayment').style.display = 'none';
  });

  document.getElementById('confirmPayBtn').addEventListener('click', async () => {
    const id = document.getElementById('pagePayment').dataset.customerId;
    const amount = document.getElementById('paymentAmount').value.replace(/,/g, '');
    const paidDateIso = JalaliCalendar.jalaliToIso(
      Number(document.getElementById('payYear').value),
      Number(document.getElementById('payMonth').value),
      Number(document.getElementById('payDay').value)
    );

    try {
      const res = await fetch(`${API_URL}/customers/${id}/pay`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ paidAmount: amount ? Number(amount) : null, paidDate: paidDateIso })
      });
      if (res.status === 401) { showAuth(); return; }
      if (!res.ok) throw new Error('خطا در ثبت پرداخت');
      document.getElementById('pagePayment').style.display = 'none';
      loadCustomers();
    } catch (err) {
      alert('اتصال به سرور برقرار نشد.');
    }
  });

  const paymentAmountEl = document.getElementById('paymentAmount');
  if (paymentAmountEl) {
    paymentAmountEl.addEventListener('input', () => {
      const digitsOnly = paymentAmountEl.value.replace(/[^\d]/g, '');
      paymentAmountEl.value = digitsOnly ? Number(digitsOnly).toLocaleString('en-US') : '';
    });
  }

  loadCustomers();
  setupPush();
}

// ---------- نمایش لیست مشتری‌ها ----------
let lastCustomers = [];

async function loadCustomers() {
  const listEl = document.getElementById('customerList');
  try {
    const res = await fetch(`${API_URL}/customers`, { headers: authHeaders() });
    if (res.status === 401) { showAuth(); return; }
    const customers = await res.json();
    lastCustomers = customers;

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
      const payAction = c.paid
        ? `<span class="badge ok" title="دریافت شد">✓ دریافت شد</span>`
        : `<button class="del-btn" style="color:var(--ok); font-size:12px; font-weight:600;" onclick="openPaymentPage('${c.id}')">ثبت دریافت</button>`;
      return `
        <div class="customer-item">
          <div class="info">
            <div class="name">${escapeHtml(c.name)}</div>
            <div class="meta">${amountText}سررسید: ${dueJalali}</div>
          </div>
          <span class="badge ${badgeClass}">${badgeText}</span>
          ${payAction}
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
  if (res.status === 401) { showAuth(); return; }
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
