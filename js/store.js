// Данные приложения: хранение в IndexedDB и все правила (что стоит в дне, отметки, перенос, проценты, итоги).
import { uid, today, addDays, wd, parse, iso, daysInMonth, timeToMin, fmtDMshort } from './util.js?v=62';

// Варианты длительности — одни для шагов целей, задач и времени шага на день.
export const DURATIONS = [[15, '15 мин'], [30, '30 мин'], [45, '45 мин'], [60, '1 ч'], [90, '1,5 ч'], [120, '2 ч'], [180, '3 ч']];

const DB_NAME = 'privychki', STORE = 'kv', PHOTOS = 'photos', KEY = 'state';

function openDb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 2);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE);
      if (!r.result.objectStoreNames.contains(PHOTOS)) r.result.createObjectStore(PHOTOS);
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export function emptyState() {
  return {
    v: 1, profile: null, dreams: [], habits: [], tasks: [], goals: [], events: [], entries: [],
    days: {}, years: {}, reflections: {}, ai: { key: '', model: 'claude-opus-5-5' },
    backup: { lastAt: null }, createdAt: today(),
  };
}

export let state = emptyState();
let db, saveTimer;

export async function load() {
  db = await openDb();
  const saved = await new Promise((res) => {
    const r = db.transaction(STORE).objectStore(STORE).get(KEY);
    r.onsuccess = () => res(r.result);
    r.onerror = () => res(null);
  });
  if (saved && saved.v) state = Object.assign(emptyState(), saved);
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}

export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    db.transaction(STORE, 'readwrite').objectStore(STORE).put(JSON.parse(JSON.stringify(state)), KEY);
  }, 150);
}

export function replaceState(next) {
  state = Object.assign(emptyState(), next);
  save();
}

// ---------- фото ----------
// Хранятся отдельно от данных: большое (до 1600 px) и миниатюра (400 px).

function shrink(file, max) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => res(b), 'image/jpeg', max > 500 ? 0.8 : 0.75);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Не удалось открыть фото')); };
    img.src = url;
  });
}

export async function addPhoto(file) {
  const id = uid();
  const [full, thumb] = await Promise.all([shrink(file, 1600), shrink(file, 400)]);
  await new Promise((res, rej) => {
    const tx = db.transaction(PHOTOS, 'readwrite');
    tx.objectStore(PHOTOS).put({ full, thumb }, id);
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  });
  return id;
}

const urlCache = new Map();
export function photoUrl(id, size = 'thumb') {
  const k = id + ':' + size;
  if (urlCache.has(k)) return Promise.resolve(urlCache.get(k));
  return new Promise((res) => {
    const r = db.transaction(PHOTOS).objectStore(PHOTOS).get(id);
    r.onsuccess = () => { if (!r.result) return res(''); const u = URL.createObjectURL(r.result[size]); urlCache.set(k, u); res(u); };
    r.onerror = () => res('');
  });
}

export function deletePhoto(id) {
  db.transaction(PHOTOS, 'readwrite').objectStore(PHOTOS).delete(id);
}

async function allPhotos() {
  return new Promise((res) => {
    const out = {}, r = db.transaction(PHOTOS).objectStore(PHOTOS).openCursor();
    r.onsuccess = () => { const c = r.result; if (c) { out[c.key] = c.value; c.continue(); } else res(out); };
    r.onerror = () => res(out);
  });
}

const blobToB64 = (b) => new Promise((res) => { const f = new FileReader(); f.onload = () => res(f.result); f.readAsDataURL(b); });
const b64ToBlob = async (s) => (await fetch(s)).blob();

// ---------- день ----------

export function day(date, create) {
  let d = state.days[date];
  if (!d && create) d = state.days[date] = { items: {}, extra: [], closedAt: null, memory: '', note: '', photos: [] };
  if (d && !d.photos) d.photos = [];
  return d || { items: {}, extra: [], closedAt: null, memory: '', note: '', photos: [] };
}

export const habitById = (id) => state.habits.find((h) => h.id === id);
export const taskById = (id) => state.tasks.find((t) => t.id === id);
export const goalById = (id) => state.goals.find((g) => g.id === id);
export const eventById = (id) => state.events.find((e) => e.id === id);
export const dreamById = (id) => state.dreams.find((d) => d.id === id);

export function findStep(gid, sid) {
  const g = goalById(gid);
  if (!g) return null;
  for (const st of g.stages) for (const s of st.steps) if (s.id === sid) return { goal: g, stage: st, step: s };
  return null;
}

export function habitScheduled(h, date) {
  if (h.status === 'archived' && (!h.archivedAt || date >= h.archivedAt)) return false;
  if (h.createdAt && date < h.createdAt) return false;
  if (h.pausedFrom && date >= h.pausedFrom) return false;
  return (h.days || []).includes(wd(date));
}

function repeatMatch(r, date) {
  const d = parse(date);
  if (r.every === 'week') return (r.weekdays || []).includes(wd(date));
  if (r.every === 'month') return d.getDate() === Math.min(r.monthDay || 1, daysInMonth(d.getFullYear(), d.getMonth()));
  if (r.every === 'year') {
    const [mm, dd] = (r.yearDate || '01-01').split('-').map(Number);
    return d.getMonth() + 1 === mm && d.getDate() === Math.min(dd, daysInMonth(d.getFullYear(), mm - 1));
  }
  return false;
}

export function taskOccurs(t, date) {
  if (!t.repeat) return false;
  const start = t.date || t.createdAt;
  if (start && date < start) return false;
  return repeatMatch(t.repeat, date);
}

export function eventOccurs(e, date) {
  if (e.repeat) return date >= e.start && repeatMatch(e.repeat, date);
  return date >= e.start && date <= (e.end || e.start);
}

export const isPast = (date) => date < today();
export const isClosed = (date) => isPast(date) || !!day(date).closedAt;

// Все строки дня: шаги целей, привычки, задачи, события — с их состоянием.
export function dayItems(date) {
  const d = day(date), items = [], seen = new Set();
  const closed = isClosed(date);
  const push = (key, type, ref, extra) => {
    if (seen.has(key) || !ref) return;
    seen.add(key);
    const m = d.items[key] || {};
    let s = m.s || null;
    if (type === 't' && !ref.repeat && ref.status === 'done' && ref.doneAt === date) s = 'done';
    if (type === 's' && ref.step.done && ref.step.doneAt === date) s = 'done';
    if (!s && closed) s = 'missed';
    items.push({ key, type, ref, s, fact: m.fact, comment: m.comment, to: m.to,
      from: (extra && extra.from) || m.from || (type === 't' && !ref.repeat && ref.movedFrom) || (type === 'e' && !ref.repeat && ref.movedFrom) || null,
      cancelled: m.cancelled, offSchedule: extra && extra.off, dur: extra && extra.dur });
  };
  const hidden = (key) => { const m = d.items[key]; return m && (m.s === 'moved' || m.s === 'cancelled'); };
  // цели (шаги ставятся только вручную — через extra)
  for (const e of d.extra) if (e.key[0] === 's') {
    const [, gid, sid] = e.key.split(':');
    const f = findStep(gid, sid);
    if (f && f.goal.status !== 'deleted') push(e.key, 's', f, e);
  }
  for (const h of state.habits) if (habitScheduled(h, date)) push('h:' + h.id, 'h', h);
  for (const e of d.extra) {
    const [type, id] = e.key.split(':');
    if (type === 'h') push(e.key, 'h', habitById(id), e);
    if (type === 't' && !hidden(e.key)) push(e.key, 't', taskById(id), e);
    if (type === 'e' && !hidden(e.key)) push(e.key, 'e', eventById(id), e);
  }
  for (const t of state.tasks) {
    if (t.status === 'deleted') continue;
    if (!t.repeat && t.date === date) push('t:' + t.id, 't', t);
    if (t.repeat && taskOccurs(t, date)) { const key = 't:' + t.id + ':' + date; if (!hidden(key)) push(key, 't', t); }
  }
  for (const ev of state.events) {
    if (!eventOccurs(ev, date)) continue;
    const key = ev.repeat ? 'e:' + ev.id + ':' + date : 'e:' + ev.id;
    if (!hidden(key)) push(key, 'e', ev);
  }
  return items;
}

export function itemTitle(it) { return it.type === 's' ? it.ref.step.title : it.ref.title; }

export function dayStats(date) {
  const items = dayItems(date);
  const done = items.filter((i) => i.s === 'done').length;
  return { total: items.length, done, pct: items.length ? Math.round((done / items.length) * 100) : 0, items };
}

function setMark(date, key, m) {
  const d = day(date, true);
  if (m) d.items[key] = m; else delete d.items[key];
}

// Шаг цели может стоять в нескольких днях. Отметка дня — «поработала сегодня»;
// шаг закрывается, когда отмечен его последний запланированный день или вручную «Шаг выполнен целиком».
export function stepPlan(gid, sid) {
  const key = 's:' + gid + ':' + sid, out = [];
  for (const [date, d] of Object.entries(state.days)) {
    if (!d.extra.some((e) => e.key === key)) continue;
    const m = d.items[key] || {};
    out.push({ date, s: m.s || null, fact: Number(m.fact) || 0 });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
export const stepSpent = (gid, sid) => stepPlan(gid, sid).reduce((n, x) => n + (x.s === 'done' || x.s === 'partial' ? x.fact : 0), 0);
// Дни после date, где шаг ещё ждёт (не отмечен и не прошёл).
export const stepLaterDays = (gid, sid, date) => stepPlan(gid, sid).filter((x) => x.date > date && x.date >= today() && !x.s).map((x) => x.date);

function completeStep(gid, sid, date, done) {
  const f = findStep(gid, sid);
  if (!f) return;
  f.step.done = done; f.step.doneAt = done ? date : null;
  if (done) for (const d2 of stepLaterDays(gid, sid, date)) { const dd = day(d2); dd.extra = dd.extra.filter((e) => e.key !== 's:' + gid + ':' + sid); }
}

// whole: true — шаг выполнен целиком, false — ещё нет, undefined — решить само (последний ли день).
function setDoneFlags(it, date, done, whole) {
  if (it.type === 't' && !it.ref.repeat) { it.ref.status = done ? 'done' : 'open'; it.ref.doneAt = done ? date : null; }
  if (it.type === 's') {
    const [, gid, sid] = it.key.split(':');
    if (done) completeStep(gid, sid, date, whole ?? !stepLaterDays(gid, sid, date).length);
    else if (it.ref.step.doneAt === date || whole === false) completeStep(gid, sid, date, false);
  }
}

// Отметить кружком: сделано / снять отметку.
export function toggle(date, key, whole) {
  const it = dayItems(date).find((i) => i.key === key);
  if (!it) return;
  const wasDone = it.s === 'done';
  setDoneFlags(it, date, !wasDone, wasDone ? undefined : whole);
  const prev = day(date).items[key] || {};
  if (wasDone) setMark(date, key, prev.comment ? { comment: prev.comment } : null);
  else {
    let fact = prev.fact;
    if (it.type === 'h' && (it.ref.kind === 'duration' || it.ref.kind === 'count') && fact == null) fact = it.ref.target;
    if (it.type === 's' && targetOf(it) && fact == null) fact = targetOf(it);
    setMark(date, key, Object.assign({}, prev, { s: 'done', fact }));
  }
  save();
}

export function targetOf(it) {
  if (it.type === 'h') return it.ref.target;
  if (it.type === 's') return it.dur ?? it.ref.step.duration;
  return null;
}
export function kindOf(it) {
  if (it.type === 'h') return it.ref.kind || 'check';
  if (it.type === 's' && targetOf(it)) return 'duration';
  return 'check';
}

// Сохранить факт: для времени/количества сам решает «выполнено» или «частично».
export function markFact(date, key, fact, comment, whole) {
  const it = dayItems(date).find((i) => i.key === key);
  if (!it) return;
  const prev = day(date).items[key] || {};
  const k = kindOf(it);
  let s = 'done';
  if (k === 'duration' || k === 'count') s = fact >= (targetOf(it) || 0) ? 'done' : fact > 0 ? 'partial' : null;
  if (it.type === 's' && s !== 'done' && whole) s = 'done';
  setDoneFlags(it, date, s === 'done', it.type === 's' ? whole : undefined);
  setMark(date, key, { ...prev, s, fact, comment: comment || prev.comment });
  save();
}

export function setComment(date, key, comment) {
  const prev = day(date).items[key] || {};
  setMark(date, key, { ...prev, comment });
  save();
}

// Перенос. Шаги целей и привычки остаются в дне «не сделано · перенесено на…»,
// задачи и события уходят без следа.
export function move(date, key, to) {
  const [type, id, occ] = key.split(':');
  const d = day(date, true);
  const wasExtra = d.extra.findIndex((e) => e.key === key);
  if (type === 'h' || type === 's') {
    setMark(date, key, { ...(d.items[key] || {}), s: 'moved', to });
    if (type === 's') { const f = findStep(id, occ); if (f) { f.step.done = false; f.step.doneAt = null; } }
    if (to) { const td = day(to, true); if (!td.extra.some((e) => e.key === key)) td.extra.push({ key, from: date, off: type === 'h', ...(wasExtra >= 0 && d.extra[wasExtra].dur != null ? { dur: d.extra[wasExtra].dur } : {}) }); }
  } else if (type === 't' && !occ) {
    const t = taskById(id);
    t.date = to || null; t.movedFrom = to ? date : null; t.status = 'open'; t.doneAt = null;
    delete d.items[key];
    if (wasExtra >= 0) d.extra.splice(wasExtra, 1);
  } else if (type === 'e' && !occ && !eventById(id).end) {
    const e = eventById(id);
    e.start = to; e.movedFrom = date;
    delete d.items[key];
    if (wasExtra >= 0) d.extra.splice(wasExtra, 1);
  } else {
    if (wasExtra >= 0) d.extra.splice(wasExtra, 1); else setMark(date, key, { s: 'moved', to });
    if (to) day(to, true).extra.push({ key, from: date });
  }
  save();
}

// Отмена. Цели и привычки остаются с ✕, задачи и события уходят (задача — обратно в список без даты).
export function cancel(date, key) {
  const [type, id, occ] = key.split(':');
  const d = day(date, true);
  const ex = d.extra.findIndex((e) => e.key === key);
  if (type === 'h' || type === 's') {
    if (type === 'h' && ex >= 0 && d.extra[ex].off && !d.extra[ex].from) { d.extra.splice(ex, 1); delete d.items[key]; }
    else setMark(date, key, { ...(d.items[key] || {}), s: 'missed', cancelled: true });
  } else if (type === 't' && !occ) {
    const t = taskById(id);
    t.date = null; t.movedFrom = null; t.status = 'open'; t.doneAt = null;
    delete d.items[key];
    if (ex >= 0) d.extra.splice(ex, 1);
  } else {
    if (ex >= 0) d.extra.splice(ex, 1); else setMark(date, key, { s: 'cancelled' });
  }
  save();
}

export function addHabitToDay(date, id) {
  const d = day(date, true), key = 'h:' + id;
  if (!d.extra.some((e) => e.key === key)) d.extra.push({ key, off: true });
  save();
}
export function addTaskToDay(date, id) {
  const t = taskById(id);
  if (t && !t.repeat) { t.date = date; t.movedFrom = null; }
  save();
}
export function addStepToDay(date, gid, sid) {
  const d = day(date, true), key = 's:' + gid + ':' + sid;
  if (!d.extra.some((e) => e.key === key)) d.extra.push({ key });
  save();
}
// Своё время шага на этот день; null или как у шага — вернуть время шага (0 — без времени).
export function setStepDayDur(date, key, min) {
  const e = day(date, true).extra.find((x) => x.key === key);
  if (!e) return;
  const [, gid, sid] = key.split(':'), f = findStep(gid, sid);
  if (min == null || (f && min === (f.step.duration || 0))) delete e.dur; else e.dur = min;
  save();
}

export function closeDay(date) { day(date, true).closedAt = new Date().toISOString(); save(); }
export function setMemory(date, text) { day(date, true).memory = text; save(); }
export function setNote(date, text) { day(date, true).note = text; save(); }

// ---------- привычки ----------

export function saveHabit(data) {
  let h = data.id && habitById(data.id);
  if (!h) { h = { id: uid(), createdAt: today(), status: 'active' }; state.habits.push(h); }
  Object.assign(h, { title: data.title, days: data.days, kind: data.kind, target: data.target, unit: data.unit || '', goalId: data.goalId || null });
  save();
  return h;
}

export function setHabitStatus(id, status) {
  const h = habitById(id);
  if (status === 'paused') { h.pausedFrom = h.pausedFrom ? null : today(); }
  else if (status === 'archived') { h.status = 'archived'; h.archivedAt = today(); h.pausedFrom = null; }
  else if (status === 'active') { h.status = 'active'; h.archivedAt = null; }
  save();
}

export function deleteHabit(id) {
  state.habits = state.habits.filter((h) => h.id !== id);
  for (const d of Object.values(state.days)) {
    delete d.items['h:' + id];
    d.extra = d.extra.filter((e) => e.key !== 'h:' + id);
  }
  save();
}

export const habitMark = (h, date) => (day(date).items['h:' + h.id] || {});

// Серия: подряд выполненные дни по расписанию, считая назад от даты.
export function streak(h, upTo = today()) {
  let n = 0, date = upTo, guard = 0;
  if (habitMark(h, date).s !== 'done') date = addDays(date, -1);
  while (guard++ < 2000) {
    if (h.createdAt && date < h.createdAt) break;
    if (habitScheduled(h, date)) { if (habitMark(h, date).s === 'done') n++; else break; }
    date = addDays(date, -1);
  }
  return n;
}

export function bestStreak(h, from, to) {
  let best = 0, cur = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (!habitScheduled(h, d)) continue;
    if (habitMark(h, d).s === 'done') { cur++; best = Math.max(best, cur); } else cur = 0;
  }
  return best;
}

// Регулярность за период — только по дням расписания и только по прошедшим дням.
export function habitStats(h, from, to) {
  const end = to < today() ? to : today();
  let plan = 0, done = 0, minutes = 0, factN = 0;
  for (let d = from < (h.createdAt || from) ? h.createdAt : from; d <= end; d = addDays(d, 1)) {
    const m = habitMark(h, d);
    if (habitScheduled(h, d)) plan++;
    if (m.s === 'done') { done++; }
    if (m.fact != null && (m.s === 'done' || m.s === 'partial') && h.kind === 'duration') { minutes += Number(m.fact) || 0; factN++; }
  }
  return { plan, done: Math.min(done, plan || done), pct: plan ? Math.round(Math.min(done, plan) / plan * 100) : 0, minutes, avg: factN ? Math.round(minutes / factN) : 0 };
}

// ---------- задачи ----------

export function saveTask(data) {
  let t = data.id && taskById(data.id);
  if (!t) { t = { id: uid(), createdAt: today(), status: 'open' }; state.tasks.push(t); }
  Object.assign(t, { title: data.title, date: data.date || null, deadline: data.deadline || null, duration: data.duration || null, repeat: data.repeat || null });
  save();
  return t;
}

export function deleteTask(id) {
  state.tasks = state.tasks.filter((t) => t.id !== id);
  cleanupDays('t:' + id);
  save();
}

function cleanupDays(prefix) {
  for (const d of Object.values(state.days)) {
    for (const k of Object.keys(d.items)) if (k === prefix || k.startsWith(prefix + ':')) delete d.items[k];
    d.extra = d.extra.filter((e) => !(e.key === prefix || e.key.startsWith(prefix + ':')));
  }
}

export function nextOccurrence(t, from = today()) {
  for (let i = 0; i < 400; i++) { const dt = addDays(from, i); if (t.repeat ? repeatMatch(t.repeat, dt) && dt >= (t.date || t.start || t.createdAt || dt) : false) return dt; }
  return null;
}

// ---------- цели ----------

export function saveGoal(data) {
  let g = data.id && goalById(data.id);
  if (!g) { g = { id: uid(), createdAt: today(), status: 'active', stages: [] }; state.goals.push(g); }
  Object.assign(g, { title: data.title, description: data.description || '', deadline: data.deadline || null, dreamId: data.dreamId || null });
  g.stages = data.stages.map((st) => ({ id: st.id || uid(), title: st.title, steps: st.steps.filter((s) => s.title.trim()).map((s) => {
    const old = g.stages.flatMap((x) => x.steps).find((o) => o.id === s.id);
    return { id: s.id || uid(), title: s.title.trim(), duration: s.duration || null, done: old ? old.done : false, doneAt: old ? old.doneAt : null };
  }) }));
  if (g.dreamId) { const dr = dreamById(g.dreamId); if (dr) dr.goalId = g.id; }
  save();
  return g;
}

export function goalProgress(g, upTo) {
  const steps = g.stages.flatMap((s) => s.steps);
  const done = steps.filter((s) => s.done && (!upTo || (s.doneAt && s.doneAt < upTo))).length;
  return { total: steps.length, done, pct: steps.length ? Math.round(done / steps.length * 100) : 0 };
}

export function setGoalStatus(id, status) {
  const g = goalById(id);
  g.status = status;
  if (status === 'achieved') g.achievedAt = today();
  if (status === 'archived') g.archivedAt = today();
  if (status === 'active') { g.achievedAt = null; g.archivedAt = null; }
  save();
}

export function deleteGoal(id) {
  state.goals = state.goals.filter((g) => g.id !== id);
  state.habits.forEach((h) => { if (h.goalId === id) h.goalId = null; });
  state.dreams.forEach((d) => { if (d.goalId === id) d.goalId = null; });
  cleanupDays('s:' + id);
  save();
}

// История цели: каждый день, когда с её шагами что-то происходило.
export function goalHistory(g) {
  const out = [];
  for (const [date, d] of Object.entries(state.days)) {
    for (const [k, m] of Object.entries(d.items)) {
      if (!k.startsWith('s:' + g.id + ':')) continue;
      const f = findStep(g.id, k.split(':')[2]);
      if (!f) continue;
      const what = m.s === 'done' ? 'сделано' : m.s === 'partial' ? 'частично' : m.s === 'moved' ? 'перенос → ' + m.to : m.s === 'missed' ? 'не сделано' : '';
      if (what) out.push({ date, title: f.step.title, what, fact: m.fact, comment: m.comment });
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

// ---------- события ----------

export function saveEvent(data) {
  let e = data.id && eventById(data.id);
  if (!e) { e = { id: uid(), createdAt: today() }; state.events.push(e); }
  Object.assign(e, {
    type: data.type, kind: data.kind || null, title: data.title, start: data.start, end: data.type === 'trip' ? data.end : null,
    time: data.time || '', repeat: data.repeat || null, note: data.note || '', places: data.places || [], legs: data.legs || [],
    significant: !!data.significant,
  });
  save();
  return e;
}

export function deleteEvent(id) {
  for (const en of state.entries.filter((x) => x.eventId === id)) (en.photos || []).forEach(deletePhoto);
  state.entries = state.entries.filter((x) => x.eventId !== id);
  state.events = state.events.filter((e) => e.id !== id);
  cleanupDays('e:' + id);
  save();
}

export function eventTotal(e) {
  const sum = (a) => a.reduce((s, x) => s + (Number(x.price) || 0), 0);
  const entries = state.entries.filter((x) => x.eventId === e.id);
  const parts = [...(e.places || []), ...(e.legs || []), ...entries.map((x) => x.place || {})].filter((x) => Number(x.price));
  return { total: sum(e.places || []) + sum(e.legs || []) + entries.reduce((s, x) => s + (Number(x.place && x.place.price) || 0), 0), count: parts.length };
}

export function setSignificant(id, v) { const e = eventById(id); e.significant = v; save(); }

// ---------- записи и воспоминания ----------
// Запись: мысль в событии/поездке или воспоминание (без события). «Что запомнилось» дня хранится в дне.

export function saveEntry(data) {
  let en = data.id && state.entries.find((x) => x.id === data.id);
  if (!en) { en = { id: uid(), createdAt: new Date().toISOString() }; state.entries.push(en); }
  Object.assign(en, { eventId: data.eventId || null, date: data.date, time: data.time || '', text: data.text || '', place: data.place || null, photos: data.photos || [], significant: !!data.significant, title: data.title || '' });
  save();
  return en;
}

export function deleteEntry(id) {
  const en = state.entries.find((x) => x.id === id);
  if (en) (en.photos || []).forEach(deletePhoto);
  state.entries = state.entries.filter((x) => x.id !== id);
  save();
}

// Сколько фото уже есть за день у события (лимит 6).
export function photosOnDay(eventId, date, exceptEntryId) {
  return state.entries.filter((x) => x.eventId === eventId && x.date === date && x.id !== exceptEntryId).reduce((n, x) => n + (x.photos || []).length, 0);
}

// Лента воспоминаний года: «Что запомнилось», записи событий, ручные воспоминания.
export function memories(year, onlySignificant) {
  const out = [];
  for (const [date, d] of Object.entries(state.days)) {
    if (!date.startsWith(String(year)) || (!d.memory && !(d.photos || []).length)) continue;
    out.push({ kind: 'day', date, text: d.memory, photos: d.photos || [], significant: !!d.significant });
  }
  const byEvent = new Map();
  for (const en of state.entries) {
    if (!en.date.startsWith(String(year))) continue;
    if (en.eventId) {
      const e = eventById(en.eventId);
      if (!e) continue;
      if (!byEvent.has(e.id)) byEvent.set(e.id, { kind: 'event', event: e, date: e.start, text: '', photos: [], significant: e.significant, entries: [] });
      const g = byEvent.get(e.id);
      g.entries.push(en); g.photos.push(...(en.photos || [])); if (!g.text) g.text = en.text;
    } else out.push({ kind: 'memory', entry: en, date: en.date, text: en.text, photos: en.photos || [], significant: en.significant, title: en.title });
  }
  out.push(...byEvent.values());
  return out.filter((m) => !onlySignificant || m.significant).sort((a, b) => b.date.localeCompare(a.date));
}

// ---------- мечты и профиль ----------

export function addDream(title) { const d = { id: uid(), title, why: '', createdAt: today() }; state.dreams.push(d); save(); return d; }
export function saveDream(id, patch) { Object.assign(dreamById(id), patch); save(); }
export function deleteDream(id) { state.dreams = state.dreams.filter((d) => d.id !== id); save(); }
export function setProfile(p) { state.profile = Object.assign(state.profile || {}, p); save(); }
export function setAi(p) { state.ai = Object.assign(state.ai || {}, p); save(); }

// ---------- итоги ----------

export const yearMeta = (y) => (state.years[y] = state.years[y] || { word: '', manual: [], hidden: [] });
export function setReflection(k, v) { state.reflections[k] = v; save(); }

// «Главное» за период: собирается само, убранное — скрыто, своё — добавлено вручную (только для года).
export function highlights(from, to, yearKey) {
  const hidden = yearKey ? yearMeta(yearKey).hidden : [];
  const out = [];
  for (const g of state.goals) if (g.status === 'achieved' && g.achievedAt >= from && g.achievedAt <= to) out.push({ id: 'g:' + g.id, icon: 'goal', title: g.title, small: 'цель достигнута · ' + fmtDMshort(g.achievedAt) });
  for (const e of state.events) if (e.significant && e.start >= from && e.start <= to) out.push({ id: 'e:' + e.id, icon: e.type === 'trip' ? 'trip' : 'star', title: e.title, small: (e.type === 'trip' ? 'поездка · ' : 'значимый момент · ') + fmtDMshort(e.start) });
  for (const en of state.entries) if (!en.eventId && en.significant && en.date >= from && en.date <= to) out.push({ id: 'm:' + en.id, icon: 'star', title: en.title || en.text.slice(0, 60), small: 'воспоминание · ' + fmtDMshort(en.date) });
  for (const d of state.dreams) if (d.cameTrue && d.cameTrue.date >= from && d.cameTrue.date <= to) out.push({ id: 'd:' + d.id, icon: 'dream', title: d.title, small: 'мечта сбылась · ' + fmtDMshort(d.cameTrue.date) });
  for (const h of state.habits) {
    const st = habitStats(h, from, to);
    if (st.plan >= 3 && st.pct >= 70) {
      const best = bestStreak(h, from, to < today() ? to : today());
      out.push({ id: 'h:' + h.id, icon: 'habit', title: h.title + (h.kind === 'duration' && st.minutes >= 60 ? ' — ' + Math.round(st.minutes / 60) + ' ч' : ' — ' + st.pct + '%'), small: 'привычка · лучшая серия ' + best, pct: st.pct });
    }
  }
  if (yearKey) for (const m of yearMeta(yearKey).manual) out.push({ id: 'x:' + m.id, icon: 'own', title: m.title, small: 'добавлено вручную', manual: true });
  return out.filter((x) => !hidden.includes(x.id));
}

export function periodPct(from, to) {
  let total = 0, done = 0;
  const end = to < today() ? to : today();
  for (let d = from; d <= end; d = addDays(d, 1)) { const s = dayStats(d); total += s.total; done += s.done; }
  return { total, done, pct: total ? Math.round(done / total * 100) : 0 };
}

// ---------- резервная копия ----------

export async function exportJson(withPhotos) {
  state.backup.lastAt = new Date().toISOString();
  save();
  const data = JSON.parse(JSON.stringify(state));
  if (withPhotos) {
    const ph = await allPhotos(), out = {};
    for (const [id, v] of Object.entries(ph)) out[id] = { full: await blobToB64(v.full), thumb: await blobToB64(v.thumb) };
    data.photoData = out;
  }
  return JSON.stringify(data);
}

export async function importJson(text) {
  const data = JSON.parse(text);
  if (!data || data.v !== 1 || !Array.isArray(data.habits)) throw new Error('Это не файл копии приложения');
  const photos = data.photoData; delete data.photoData;
  if (photos) for (const [id, v] of Object.entries(photos)) {
    const full = await b64ToBlob(v.full), thumb = await b64ToBlob(v.thumb);
    await new Promise((res) => { const tx = db.transaction(PHOTOS, 'readwrite'); tx.objectStore(PHOTOS).put({ full, thumb }, id); tx.oncomplete = res; tx.onerror = res; });
  }
  replaceState(data);
}

export function backupDaysAgo() {
  const ref = state.backup.lastAt ? state.backup.lastAt.slice(0, 10) : state.createdAt;
  return Math.round((parse(today()) - parse(ref)) / 864e5);
}

export function habitTargetText(h) {
  if (h.kind === 'duration') return h.target ? (h.target < 60 ? h.target + ' мин' : (h.target % 60 ? Math.floor(h.target / 60) + ' ч ' + (h.target % 60) + ' мин' : h.target / 60 + ' ч')) : '';
  if (h.kind === 'count') return h.target ? Number(h.target).toLocaleString('ru-RU') + (h.unit ? ' ' + h.unit : '') : '';
  if (h.kind === 'time') return h.target || '';
  return '';
}

export { timeToMin, iso };
