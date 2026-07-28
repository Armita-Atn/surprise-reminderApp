// ================================
// آدرس سرور - بعد از هاست کردن روی Render اینو عوض کن
// ================================
const API_URL = 'https://surprise-reminder-1.onrender.com/api';

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

// ---------- افزودن مشتری ----------
document.getElementById('addBtn').addEventListener('click', async () => {
  const name = document.getElementById('custName').value.trim();
  const amount = document.getElementById('custAmount').value;
  const jy = Number(yearSel.value), jm = Number(monthSel.value), jd = Number(daySel.value);

  if (!name) {
    alert('نام مشتری رو وارد کن');
    return;
  }

  const startDateIso = JalaliCalendar.jalaliToIso(jy, jm, jd);

  try {
    const res = await fetch(`${API_URL}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, startDate: startDateIso, amount: amount ? Number(amount) : null })
    });
    if (!res.ok) throw new Error('خطا در ثبت');
    document.getElementById('custName').value = '';
    document.getElementById('custAmount').value = '';
    loadCustomers();
  } catch (err) {
    alert('اتصال به سرور برقرار نشد. اول باید سرور رو تنظیم و آدرسش رو در app.js وارد کنی.');
    console.error(err);
  }
});

// ---------- نمایش لیست مشتری‌ها ----------
async function loadCustomers() {
  const listEl = document.getElementById('customerList');
  try {
    const res = await fetch(`${API_URL}/customers`);
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
      const amountText = c.amount ? `${Number(c.amount).toLocaleString('fa-IR')} تومان · ` : '';
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
  await fetch(`${API_URL}/customers/${id}`, { method: 'DELETE' });
  loadCustomers();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- ثبت‌نام سرویس‌ورکر + پوش نوتیفیکیشن ----------
const notifBanner = document.getElementById('notifBanner');
const notifText = document.getElementById('notifText');
const notifBtn = document.getElementById('notifBtn');

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

async function setupPush() {
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub)
    });
  } catch (err) {
    console.error('خطا در فعال‌سازی نوتیفیکیشن:', err);
  }
}

loadCustomers();
setupPush();
