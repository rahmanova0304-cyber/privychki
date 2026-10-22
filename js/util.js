// Мелкие помощники: даты, экранирование, форматирование.

export const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export const MONTHS_NOM = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
export const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
export const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
export const WD_LOW = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
export const WD_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
export const WD_ACC = ['понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу', 'воскресенье'];

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const pad = (n) => String(n).padStart(2, '0');
export const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const today = () => iso(new Date());
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
export const wd = (s) => (parse(s).getDay() + 6) % 7; // понедельник = 0
export const weekStart = (s) => addDays(s, -wd(s));
export const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

export function fmtLong(s) { const d = parse(s); return WD_FULL[wd(s)] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; }
export function fmtShort(s) { const d = parse(s); return WD_LOW[wd(s)] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; }
export function fmtDM(s) { const d = parse(s); return d.getDate() + ' ' + MONTHS[d.getMonth()]; }
export function fmtDMshort(s) { const d = parse(s); return d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()]; }

export function fmtMin(m) {
  m = Math.round(m || 0);
  if (m < 60) return m + ' мин';
  const h = Math.floor(m / 60), r = m % 60;
  return h + ' ч' + (r ? ' ' + r + ' мин' : '');
}

export function plural(n, one, few, many) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}

export function age(birth, at = today()) {
  if (!birth) return null;
  const b = parse(birth), d = parse(at);
  let a = d.getFullYear() - b.getFullYear();
  if (d.getMonth() < b.getMonth() || (d.getMonth() === b.getMonth() && d.getDate() < b.getDate())) a--;
  return a;
}

export const timeToMin = (t) => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
