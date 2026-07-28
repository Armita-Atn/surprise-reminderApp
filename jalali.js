// تبدیل تقویم میلادی <-> شمسی (پیاده‌سازی الگوریتم استاندارد تقویم جلالی)
const JalaliCalendar = (() => {
  const breaks = [
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
    1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178
  ];

  function div(a, b) { return ~~(a / b); }
  function mod(a, b) { return a - ~~(a / b) * b; }

  function jalCal(jy) {
    const bl = breaks.length;
    const gy = jy + 621;
    let leapJ = -14, jp = breaks[0];
    if (jy < jp || jy >= breaks[bl - 1]) throw new Error('سال شمسی خارج از محدوده');
    let jump = 0;
    for (let i = 1; i < bl; i += 1) {
      const jm = breaks[i];
      jump = jm - jp;
      if (jy < jm) break;
      leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
      jp = jm;
    }
    let n = jy - jp;
    leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
    if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
    const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
    const march = 20 + leapJ - leapG;
    if (jump - n < 6) n = n - jump + div(jump, 33) * 33;
    let leap = mod(mod(n + 1, 33) - 1, 4);
    if (leap === -1) leap = 4;
    return { leap, gy, march };
  }

  function g2d(gy, gm, gd) {
    let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4)
      + div(153 * mod(gm + 9, 12) + 2, 5)
      + gd - 34840408;
    d = d - div(div(gy + div(gm - 8, 6) + 100100, 100) * 3, 4) + 752;
    return d;
  }

  function d2g(jdn) {
    let j = 4 * jdn + 139361631;
    j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
    const i = div(mod(j, 1461), 4) * 5 + 308;
    const gd = div(mod(i, 153), 5) + 1;
    const gm = mod(div(i, 153), 12) + 1;
    const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
    return { gy, gm, gd };
  }

  function j2d(jy, jm, jd) {
    const r = jalCal(jy);
    return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
  }

  function d2j(jdn) {
    const gy = d2g(jdn).gy;
    let jy = gy - 621;
    let r = jalCal(jy);
    let jdn1f = g2d(gy, 3, r.march);
    let k = jdn - jdn1f;
    if (k >= 0) {
      if (k <= 185) {
        const jm = 1 + div(k, 31);
        const jd = mod(k, 31) + 1;
        return { jy, jm, jd };
      } else {
        k -= 186;
      }
    } else {
      jy -= 1;
      k += r.leap ? 366 : 365 - (jalCal(jy).leap ? 0 : 0);
      r = jalCal(jy);
      jdn1f = g2d(gy - 1, 3, r.march);
      k = jdn - jdn1f;
      if (k <= 185) {
        const jm = 1 + div(k, 31);
        const jd = mod(k, 31) + 1;
        return { jy, jm, jd };
      }
      k -= 186;
    }
    const jm = 7 + div(k, 30);
    const jd = mod(k, 30) + 1;
    return { jy, jm, jd };
  }

  function toJalali(gy, gm, gd) {
    return d2j(g2d(gy, gm, gd));
  }

  function toGregorian(jy, jm, jd) {
    const d = j2d(jy, jm, jd);
    return d2g(d);
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  // ISO gregorian string (YYYY-MM-DD) -> رشته‌ی نمایشی شمسی
  function isoToJalaliDisplay(isoStr) {
    const [gy, gm, gd] = isoStr.split('-').map(Number);
    const j = toJalali(gy, gm, gd);
    return `${j.jy}/${pad(j.jm)}/${pad(j.jd)}`;
  }

  // مقادیر شمسی -> رشته‌ی ISO میلادی (برای ذخیره/محاسبه)
  function jalaliToIso(jy, jm, jd) {
    const g = toGregorian(jy, jm, jd);
    return `${g.gy}-${pad(g.gm)}-${pad(g.gd)}`;
  }

  const monthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

  return { toJalali, toGregorian, isoToJalaliDisplay, jalaliToIso, monthNames };
})();
