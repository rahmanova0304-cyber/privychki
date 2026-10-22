// Экраны приложения. Каждый экран — функция, возвращающая { html, mount? }.
import * as S from './store.js?v=58';
import { esc, today, addDays, wd, weekStart, parse, fmtLong, fmtShort, fmtDM, fmtDMshort, fmtMin, plural, age,
  MONTHS_NOM, WD, WD_ACC, timeToMin } from './util.js?v=58';

export const ICON = {
  goal: '<svg><use href="#i-goal"/></svg>', habit: '<svg><use href="#i-habit"/></svg>',
  task: '<svg><use href="#i-task"/></svg>', event: '<svg><use href="#i-event"/></svg>', dream: '<svg><use href="#i-dream"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M12 15V3M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>',
  plussq: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></svg>',
  phone: '<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="3"/><path d="M10 17h4"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
  shield: '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>',
};
const TAB_ICON = {
  today: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  life: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
};

// ---------- общие куски ----------

export const top = (title, { back = true, right = '' } = {}) =>
  `<div class="top">${back ? '<button class="ib" data-act="back">‹</button>' : ''}<div class="ttl"${back ? '' : ' style="padding-left:4px"'}>${title}</div>${right}</div>`;

export const tabbar = (on) => '<nav class="tabbar">' + [['list', 'Список'], ['today', 'День'], ['life', 'Жизнь']].map(([k, t]) =>
  `<button data-go="${k === 'today' ? '#/day' : '#/' + k}" class="${k === on ? 'on' : ''}"><svg viewBox="0 0 24 24">${TAB_ICON[k]}</svg>${t}</button>`).join('') + '</nav>';

export const ring = (p, big, small) => `<div class="ring" style="--p:${p}"><div><div><b>${big}</b><small>${small}</small></div></div></div>`;

export const field = (label, inner) => `<div class="field"><label>${label}</label>${inner}</div>`;

export const dayName = (date) => date === today() ? 'сегодня' : date === addDays(today(), 1) ? 'завтра' : fmtShort(date);
const addToLabel = (date) => date === today() ? 'Добавить сегодня' : date === addDays(today(), 1) ? 'Добавить на завтра' : 'Добавить в ' + WD_ACC[wd(date)];

export function scheduleText(h) {
  const d = (h.days || []).slice().sort();
  let s;
  if (d.length === 7) s = 'каждый день';
  else if (d.join() === '0,1,2,3,4') s = 'Пн–Пт';
  else if (d.join() === '5,6') s = 'Сб, Вс';
  else if (!d.length) s = 'без расписания';
  else s = d.map((i) => WD[i]).join(', ');
  const t = S.habitTargetText(h);
  return s + (t ? ' · ' + t : '');
}

export function repeatText(t) {
  const r = t.repeat;
  if (!r) return '';
  if (r.every === 'week') return 'каждую неделю, ' + (r.weekdays || []).sort().map((i) => WD[i].toLowerCase()).join(', ');
  if (r.every === 'month') return 'каждый месяц, ' + r.monthDay + '-го';
  const [m, d] = (r.yearDate || '01-01').split('-').map(Number);
  return 'каждый год, ' + d + ' ' + fmtDM('2000-' + String(m).padStart(2, '0') + '-01').split(' ')[1];
}

export function weekStrip(sel, { mode = 'day', minDate = null } = {}) {
  const ws = weekStart(sel), t = today();
  let html = '<div class="week">';
  for (let i = 0; i < 7; i++) {
    const d = addDays(ws, i), dd = parse(d).getDate();
    const cls = ['day'];
    if (d === sel) cls.push('on');
    if (d === t) cls.push('now');
    if (minDate && d < minDate) cls.push('off');
    let line = '';
    if (mode === 'day') { const p = d <= t ? S.dayStats(d).pct : 0; line = `<i style="--p:${p}%"></i>`; }
    html += `<div class="${cls.join(' ')}" data-act="pickday" data-d="${d}">${WD[i]}<b>${dd}</b>${line}</div>`;
  }
  return html + '</div>';
}

export function weekHead(sel, act) {
  const ws = weekStart(sel), we = addDays(ws, 6), a = parse(ws), b = parse(we);
  const label = MONTHS_NOM[a.getMonth()] + ' · ' + a.getDate() + '–' + (a.getMonth() === b.getMonth() ? b.getDate() : b.getDate() + ' ' + MONTHS_NOM[b.getMonth()].toLowerCase().slice(0, 3));
  return `<div class="weekhead"><span data-act="${act}" data-d="${addDays(ws, -7)}">‹</span>${label}<span data-act="${act}" data-d="${addDays(ws, 7)}">›</span></div>`;
}

export const autoGrow = (root) => root.querySelectorAll('textarea.inp').forEach((ta) => {
  const fit = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 2 + 'px'; };
  ta.addEventListener('input', fit); requestAnimationFrame(fit);
});

// ---------- фото ----------
// Плитки фото: <div data-photo="id">. Картинки подгружаются из IndexedDB после отрисовки.
export function photoGrid(ids = [], delAct, { max = 6, add = true, cls = 'ev-photos sm' } = {}) {
  const tiles = ids.map((id) => `<div class="ph" data-photo="${id}">${delAct ? `<i data-act="${delAct}" data-id="${id}">✕</i>` : ''}</div>`).join('');
  const plus = add && ids.length < max ? `<label class="ph add" style="cursor:pointer"><input type="file" accept="image/*" multiple hidden data-photoinput data-left="${max - ids.length}"></label>` : '';
  return tiles || plus ? `<div class="${cls}">${tiles}${plus}</div>` : '';
}
export function fillPhotos(root, size = 'thumb') {
  root.querySelectorAll('[data-photo]').forEach(async (el) => {
    const u = await S.photoUrl(el.dataset.photo, size);
    if (u) { el.style.background = `url(${u}) center / cover`; el.style.backgroundSize = 'cover'; }
  });
}
export function bindPhotoInput(root, onAdd) {
  root.querySelectorAll('[data-photoinput]').forEach((inp) => inp.addEventListener('change', async () => {
    const files = [...inp.files].slice(0, Number(inp.dataset.left) || 6);
    if (inp.files.length > files.length) alert('Можно добавить ещё ' + files.length + ' фото — не больше 6 за день.');
    const ids = [];
    for (const f of files) { try { ids.push(await S.addPhoto(f)); } catch (e) { alert(e.message); } }
    onAdd(ids);
  }));
}

// ---------- строка дела в дне ----------

function itemRow(it, date) {
  const r = it.ref, cls = ['row'], title = S.itemTitle(it);
  let ck = 'ck', small = '', right = '';
  if (it.s === 'done') { ck = 'ck done'; cls.push('is-done'); }
  else if (it.s === 'partial') ck = 'ck part';
  else if (it.s === 'moved') { ck = 'ck miss'; cls.push('missed'); small = 'не сделано · перенесено на ' + fmtShort(it.to); }
  else if (it.s === 'missed') { ck = 'ck no'; cls.push('missed'); small = 'не сделано'; }
  if (!small && it.from) small = 'перенесено с ' + fmtDM(it.from);
  if (!small && it.offSchedule && it.type === 'h') small = 'вне расписания';
  if (it.type === 'h' || it.type === 's') {
    const k = S.kindOf(it), tgt = it.type === 'h' ? S.habitTargetText(r) : S.targetOf(it) ? fmtMin(S.targetOf(it)) : '';
    if (it.type === 's' && !small) {
      const plan = S.stepPlan(r.goal.id, r.step.id);
      small = r.goal.title + (plan.length > 1 ? ' · день ' + (plan.findIndex((x) => x.date === date) + 1) + ' из ' + plan.length : '');
    }
    if (it.fact != null && (it.s === 'done' || it.s === 'partial')) {
      if (k === 'duration') {
        const diff = it.fact - (S.targetOf(it) || 0);
        right = `<span class="fact">${fmtMin(it.fact)}</span>` + (diff > 0 ? `<span class="chip acc">+${fmtMin(diff)}</span>` : diff < 0 ? `<span class="chip">из ${tgt}</span>` : '');
      } else if (k === 'count') {
        const diff = it.fact - (S.targetOf(it) || 0);
        right = `<span class="fact">${Number(it.fact).toLocaleString('ru-RU')}</span>` + (diff > 0 ? `<span class="chip info">+${diff.toLocaleString('ru-RU')}</span>` : diff < 0 ? `<span class="chip">из ${tgt}</span>` : '');
      } else if (k === 'time') {
        const diff = timeToMin(it.fact) - timeToMin(S.targetOf(it));
        right = `<span class="fact">${esc(it.fact)}</span>` + (diff > 0 ? `<span class="chip warn">+${fmtMin(diff)}</span>` : '');
      }
    } else if (tgt) right = `<span class="chip">${esc(tgt)}</span>`;
  } else if (it.type === 'e') {
    const pl = (r.places || [])[0];
    small = small || [r.type === 'trip' ? 'поездка · ' + fmtDMshort(r.start) + '–' + fmtDMshort(r.end) : '', pl ? pl.name : ''].filter(Boolean).join(' · ');
    if (r.time && it.s !== 'done') right = `<span class="chip">${esc(r.time)}</span>`;
  } else {
    if (r.repeat) small = small || repeatText(r);
    if (r.duration && it.s !== 'done') right = `<span class="chip">${fmtMin(r.duration)}</span>`;
  }
  const tapCk = it.s === 'moved' ? '' : ` data-act="toggle" data-key="${it.key}"`;
  if (it.type === 'e' && !small) small = '';
  return `<div class="${cls.join(' ')}" data-go="#/mark/${date}/${encodeURIComponent(it.key)}"><span class="${ck}"${tapCk}></span><div class="t"><b>${esc(title)}</b>${small ? `<small>${esc(small)}</small>` : ''}</div>${right}</div>`;
}

const order = (it) => it.s === 'done' ? 2 : 0;

function block(kind, title, items, date) {
  const map = { s: ['goals', ICON.goal], h: ['habits', ICON.habit], t: ['tasks', ICON.task], e: ['events', ICON.event] }[kind];
  const done = items.filter((i) => i.s === 'done').length;
  const rows = items.slice().sort((a, b) => order(a) - order(b)).map((i) => itemRow(i, date)).join('');
  return `<div class="blk ${map[0]}"><div class="bh">${map[1]}<b>${title}</b>${items.length ? `<span class="cnt">${done} из ${items.length}</span>` : ''}<button class="plus" data-go="${kind === 'e' ? '#/event/new?date=' + date : '#/pick/' + kind + '/' + date}">+</button></div>${rows ? `<div class="rows">${rows}</div>` : ''}</div>`;
}

// ---------- ДЕНЬ ----------

const VERDICT = (p) => p >= 90 ? 'Отличный день!' : p >= 70 ? 'Хороший день!' : p >= 40 ? 'Неплохо — завтра будет лучше' : 'Трудный день. Бывает.';

function dayPhrase(date, st) {
  let best = null;
  for (const it of st.items) if (it.type === 'h' && it.s === 'done') {
    const n = S.streak(it.ref, date);
    if (n >= 3 && (!best || n > best.n)) best = { n, t: it.ref.title };
  }
  if (best) return `${best.t} — ${best.n} ${plural(best.n, 'день', 'дня', 'дней')} подряд. Так держать!`;
  if (st.total && st.done === st.total) return 'Всё запланированное сделано.';
  return 'Каждый день — шаг вперёд.';
}

export function dayScreen(date) {
  const t = today(), st = S.dayStats(date), closed = S.isClosed(date), future = date > t;
  const by = (k) => st.items.filter((i) => i.type === k);
  let heroT;
  const leftMin = st.items.filter((i) => i.s !== 'done' && i.s !== 'moved' && i.s !== 'missed')
    .reduce((m, i) => m + (S.kindOf(i) === 'duration' ? S.targetOf(i) || 0 : i.type === 't' ? i.ref.duration || 0 : 0), 0);
  if (closed && st.total) heroT = `<b>${VERDICT(st.pct)}</b><small>${esc(dayPhrase(date, st))}</small>`;
  else if (future) heroT = `<b>${fmtLong(date)}</b><small>${st.total ? 'Запланировано ' + st.total + ' ' + plural(st.total, 'дело', 'дела', 'дел') + (leftMin ? ' · ≈ ' + fmtMin(leftMin) : '') : 'Пока пусто — добавь через «+»'}</small>`;
  else heroT = `<b>${date === t ? 'День в процессе' : fmtLong(date)}</b><small>${leftMin ? 'Впереди ≈ ' + fmtMin(leftMin) + '.' : st.total ? 'Отмечай сделанное.' : 'Добавь дела через «+».'}</small>`;

  let banners = '';
  if (date === t && (S.state.habits.length || S.state.tasks.length) && S.backupDaysAgo() > 7)
    banners += `<div class="banner" data-go="#/backup"><span class="ins-i" style="width:34px;height:34px">${ICON.shield}</span><div class="t"><b>Сохрани копию</b><small>последней не было ${S.backupDaysAgo()} ${plural(S.backupDaysAgo(), 'день', 'дня', 'дней')}</small></div><span class="chev">›</span></div>`;

  if (date === t && wd(t) === 6) banners += `<div class="banner" data-go="#/summary/w/${weekStart(t)}"><span class="ins-i" style="width:34px;height:34px">${ICON.shield.replace('M9 12l2 2 4-4', 'M8 13l3 3 5-6')}</span><div class="t"><b>Подвести итоги недели</b><small>что получилось и что дальше</small></div><span class="chev">›</span></div>`;
  const empty = !S.state.habits.length && !S.state.tasks.length && !S.state.goals.length && !S.state.events.length;
  const d = S.day(date);
  const note = future
    ? `<div class="notecard"><b>Заметки на день</b><textarea class="inp area" data-bind="note" rows="1" placeholder="Мысли, идеи…">${esc(d.note)}</textarea></div>`
    : `<div class="notecard"><b>Что запомнилось ${date === t ? 'сегодня' : 'в этот день'}?</b><textarea class="inp area" data-bind="memory" rows="1" placeholder="Напиши здесь…">${esc(d.memory)}</textarea>${photoGrid(d.photos, 'dayphoto')}</div>`;

  const html = `<section class="scr">
  <div class="top"><div class="ttl">${weekHead(date, 'week')}</div>${S.state.ai && S.state.ai.key ? '<button class="ib aib" data-go="#/ai">✦ ИИ</button>' : ''}</div>
  <div class="body">
    ${weekStrip(date)}
    ${banners}
    ${st.total || !empty ? `<div class="card hero">${ring(st.pct, st.done, 'из ' + st.total)}<div class="t">${heroT}</div></div>` : ''}
    ${empty ? `<div class="card empty-day"><b>Здесь будет твой день</b><p class="small" style="margin:6px 0 12px">Добавь привычки и задачи в список года — они сами встанут в дни.</p><button class="btn pri sm" data-go="#/list">Открыть список года</button></div>` : ''}
    ${block('s', 'Цели', by('s'), date)}
    ${block('h', 'Привычки', by('h'), date)}
    ${block('t', 'Задачи', by('t'), date)}
    ${block('e', 'События', by('e'), date)}
    ${note}
    ${date === t && !d.closedAt && st.total ? '<button class="btn pri" style="flex:none" data-act="close">Завершить день</button>' : ''}
    ${date === t && d.closedAt ? '<p class="small" style="text-align:center;margin:0">День закрыт. Отметки можно поправить, нажав на строку.</p>' : ''}
  </div>
  ${tabbar('today')}
</section>`;

  return {
    html,
    mount(root) {
      autoGrow(root); fillPhotos(root);
      bindPhotoInput(root, async (ids) => { const dd = S.day(date, true); dd.photos = [...dd.photos, ...ids].slice(0, 6); S.save(); window.dispatchEvent(new Event('rerender')); });
      root.querySelectorAll('[data-bind]').forEach((ta) => ta.addEventListener('input', () => ta.dataset.bind === 'note' ? S.setNote(date, ta.value) : S.setMemory(date, ta.value)));
    },
    actions: {
      week: (el, go) => go('#/day/' + el.dataset.d),
      pickday: (el, go) => go('#/day/' + el.dataset.d, true),
      toggle: (el, go, render) => { S.toggle(date, el.dataset.key); render(); },
      close: (el, go, render) => { S.closeDay(date); render(); },
      dayphoto: (el, go, render) => { if (confirm('Убрать фото?')) { const dd = S.day(date, true); dd.photos = dd.photos.filter((x) => x !== el.dataset.id); S.deletePhoto(el.dataset.id); S.save(); render(); } },
    },
  };
}

// ---------- «+» В БЛОКЕ ----------

export function pickScreen(kind, date) {
  const inDay = new Set(S.dayItems(date).map((i) => i.key.split(':').slice(0, 2).join(':')));
  const inDayKeys = new Set(S.dayItems(date).map((i) => i.key));
  const list = kind === 's'
    ? S.state.goals.filter((g) => g.status === 'active').flatMap((g) => g.stages.flatMap((st) => st.steps.filter((x) => !x.done && !inDayKeys.has('s:' + g.id + ':' + x.id)).map((x) => ({ id: g.id + ':' + x.id, title: x.title, small: g.title + ' · ' + st.title, dur: x.duration }))))
    : kind === 'h'
    ? S.state.habits.filter((h) => h.status !== 'archived' && !inDay.has('h:' + h.id)).map((h) => ({ id: h.id, title: h.title, small: scheduleText(h) }))
    : S.state.tasks.filter((t) => t.status === 'open' && !t.repeat && t.date !== date && (!t.date || t.date < today()))
      .map((t) => ({ id: t.id, title: t.title, small: t.date ? 'просрочено · было на ' + fmtDMshort(t.date) : t.deadline ? 'без даты · до ' + fmtDM(t.deadline) : 'без даты', dur: t.duration }));
  const sel = new Set();
  const title = ({ s: 'Цели', h: 'Привычки', t: 'Задачи' }[kind]) + ' · ' + dayName(date);
  const rowsFlat = (arr) => arr.map((x) => `<div class="row pick-row" data-act="sel" data-id="${x.id}"><span class="ck sq"></span><div class="t"><b>${esc(x.title)}</b><small>${esc(x.small)}</small></div>${x.dur ? `<span class="chip">${fmtMin(x.dur)}</span>` : ''}</div>`).join('');
  const rows = kind !== 's' ? rowsFlat(list) : S.state.goals.filter((g) => g.status === 'active').map((g) => {
    const mine = list.filter((x) => x.id.startsWith(g.id + ':'));
    if (!mine.length) return '';
    const p = S.goalProgress(g);
    return `<div class="gcard pick-group"><div class="gcard-h"><div class="t"><b>${esc(g.title)}</b><small>${p.done} из ${p.total} шагов</small></div></div><div class="rows">${rowsFlat(mine.map((x) => ({ ...x, small: x.small.split(' · ').slice(1).join(' · ') })))}</div></div>`;
  }).join('');
  const html = `<section class="scr">
  ${top(title)}
  <div class="body">
    <input class="inp" data-search placeholder="Найти или добавить" autocomplete="off">
    <div class="row addnew" data-act="addnew" hidden><span class="ck sq"></span><div class="t"><b>+ Добавить «<span></span>»</b><small>${kind === 'h' ? 'откроется новая привычка' : kind === 's' ? 'откроется новая цель' : 'встанет в этот день и в список года'}</small></div></div>
    <div class="blk ${{ s: 'goals', h: 'habits', t: 'tasks' }[kind]}"><div class="bh">${{ s: ICON.goal, h: ICON.habit, t: ICON.task }[kind]}<b>${{ s: 'Шаги целей', h: 'Не по расписанию в этот день', t: 'Из списка года' }[kind]}</b></div>
      ${rows ? (kind === 's' ? `<div class="gcards">${rows}</div>` : `<div class="rows" data-list>${rows}</div>`) : `<div class="empty">${{ s: 'Все шаги целей уже в днях или сделаны. Новую цель — в списке года.', h: 'Все привычки уже в этом дне. Новую — напиши выше.', t: 'Задач без даты нет. Новую — напиши выше.' }[kind]}</div>`}
    </div>
  </div>
  <div class="foot"><button class="btn pri" data-act="add">${addToLabel(date)}</button></div>
</section>`;
  let q = '';
  return {
    html,
    mount(root) {
      const inp = root.querySelector('[data-search]'), add = root.querySelector('[data-act="addnew"]');
      inp.addEventListener('input', () => {
        q = inp.value.trim();
        let found = 0;
        root.querySelectorAll('.pick-row').forEach((r) => { const hit = !q || r.querySelector('b').textContent.toLowerCase().includes(q.toLowerCase()); r.hidden = !hit; if (hit) found++; });
        root.querySelectorAll('.pick-group').forEach((g) => { g.hidden = ![...g.querySelectorAll('.pick-row')].some((r) => !r.hidden); });
        add.hidden = !q || found > 0 && list.some((x) => x.title.toLowerCase() === q.toLowerCase());
        add.querySelector('span:not(.ck)').textContent = q;
      });
    },
    actions: {
      sel: (el) => { const id = el.dataset.id; sel.has(id) ? sel.delete(id) : sel.add(id); el.querySelector('.ck').classList.toggle('done', sel.has(id)); },
      addnew: (el, go) => {
        if (kind === 'h') { go('#/habit/new?title=' + encodeURIComponent(q) + '&day=' + date, true); return; }
        if (kind === 's') { go('#/goal/new?title=' + encodeURIComponent(q), true); return; }
        const t = S.saveTask({ title: q, date });
        sel.forEach((id) => S.addTaskToDay(date, id));
        go('back');
      },
      add: (el, go) => {
        sel.forEach((id) => kind === 'h' ? S.addHabitToDay(date, id) : kind === 's' ? S.addStepToDay(date, ...id.split(':')) : S.addTaskToDay(date, id));
        if (q && kind === 't' && !sel.size && !list.some((x) => x.title.toLowerCase() === q.toLowerCase())) S.saveTask({ title: q, date });
        go('back');
      },
    },
  };
}

// ---------- ОТМЕТКА ----------

export function markScreen(date, key) {
  const it = S.dayItems(date).find((i) => i.key === key);
  if (!it) return { html: `<section class="scr">${top('Дело')}<div class="body"><p class="small">Это дело уже не в этом дне.</p></div></section>` };
  const r = it.ref, isH = it.type === 'h' || it.type === 's', ttl = S.itemTitle(it);
  let kind = S.kindOf(it), tgt0 = S.targetOf(it);
  const isStep = it.type === 's', future = date > today(), dur0 = tgt0 || 0;
  const canMove = !(it.type === 'e' && r.end);
  const plan = it.type === 's' ? S.stepPlan(r.goal.id, r.step.id) : [];
  let whole = it.type === 's' ? (r.step.done && r.step.doneAt === date) || !S.stepLaterDays(r.goal.id, r.step.id, date).length : undefined;
  let tab = 'done', fact = it.fact, moveTo = null, weekSel = addDays(date, 1) < today() ? today() : addDays(date, 1);
  const comment = it.comment || '';
  if (fact == null) fact = kind === 'duration' || kind === 'count' ? tgt0 || 0 : kind === 'time' ? tgt0 || '08:00' : null;

  const resultHtml = () => {
    if (kind === 'duration' || kind === 'count') {
      const tgt = tgt0 || 0, diff = fact - tgt, f = (v) => kind === 'duration' ? fmtMin(v) : v.toLocaleString('ru-RU');
      if (fact >= tgt) return `<div class="kv"><span>Выполнено</span>${diff > 0 ? `<span class="chip acc">+${f(diff)} сверх плана</span>` : ''}</div>`;
      if (fact > 0) return `<div class="kv"><span>Частично</span><span class="chip warn">${Math.round(fact / tgt * 100)}% от плана</span></div><div class="kv"><span class="small">Остаток <b>${f(tgt - fact)}</b></span><span class="link" data-act="tab" data-t="move">Перенести остаток</span></div>`;
      return '<div class="kv"><span class="small">Ещё не начато</span></div>';
    }
    if (kind === 'time') { const diff = timeToMin(fact) - timeToMin(tgt0); return `<div class="kv"><span>Разница</span>${diff > 0 ? `<span class="chip warn">+${fmtMin(diff)}</span>` : diff < 0 ? `<span class="chip good">−${fmtMin(-diff)}</span>` : '<span class="chip">вовремя</span>'}</div>`; }
    return '';
  };
  // шаг цели: своё время на этот день
  const planPanel = () => !isStep ? '' : `<div class="card">${field('Время на этот день', `<div class="opts">${[[0, 'Без времени'], [15, '15 мин'], [30, '30 мин'], [45, '45 мин'], [60, '1 ч'], [90, '1,5 ч'], [120, '2 ч'], [180, '3 ч']].map(([v, l]) => `<span class="${(tgt0 || 0) === v ? 'on' : ''}" data-act="pdur" data-v="${v}">${l}</span>`).join('')}</div>`)}${future ? '<p class="small" style="margin:0">Отметить, сколько получилось, можно будет в сам день.</p>' : ''}</div>`;
  const donePanel = () => {
    if (isStep && future) return '';
    if (kind === 'duration' || kind === 'count') {
      const f = kind === 'duration' ? fmtMin(fact) : Number(fact).toLocaleString('ru-RU');
      return `<div class="card">${isStep ? '' : `<div class="kv"><span>План</span><b>${esc(S.habitTargetText(r))}</b></div>`}${field('Сколько получилось', `<div class="step"><i data-act="step" data-d="-1">−</i><span class="big">${f}</span><i data-act="step" data-d="1">+</i></div>`)}${kind === 'count' ? `<input class="inp" type="number" inputmode="numeric" data-fact value="${fact}">` : ''}<div data-res>${resultHtml()}</div></div>`;
    }
    if (kind === 'time') return `<div class="card"><div class="kv"><span>План</span><b>${esc(tgt0)}</b></div>${field('Во сколько получилось', `<input class="inp" type="time" data-fact value="${esc(fact)}">`)}<div data-res>${resultHtml()}</div></div>`;
    const done = it.s === 'done';
    return `<div class="card"><div class="row" style="padding:0"><span class="ck ${done ? 'done' : ''}" data-act="flip"></span><div class="t"><b>${done ? 'Сделано' : 'Отметить сделанным'}</b><small>${done ? 'нажми, чтобы снять отметку' : 'или просто нажми кружок в строке дня'}</small></div></div></div>`;
  };
  const wholePanel = () => {
    if (it.type !== 's' || plan.length < 2) return '';
    const later = S.stepLaterDays(r.goal.id, r.step.id, date), spent = S.stepSpent(r.goal.id, r.step.id);
    return `<div class="card"><div class="row" style="padding:0"><div class="t"><b>Шаг выполнен целиком</b><small>${spent ? 'уже потрачено ' + fmtMin(spent) + ' · ' : ''}${whole ? (later.length ? 'дни ' + later.map(fmtDMshort).join(', ') + ' уберутся' : 'шаг закроется') : later.length ? 'останется в днях ' + later.map(fmtDMshort).join(', ') : 'шаг останется открытым'}</small></div><span class="toggle ${whole ? 'on' : ''}" data-act="whole"></span></div></div>`;
  };
  const movePanel = () => {
    const min = addDays(today(), 0) > date ? today() : addDays(date, 1);
    let days = weekStrip(weekSel, { mode: 'move', minDate: min }).replace(/ on"/g, '"');
    if (moveTo) days = days.replace(`data-d="${moveTo}"`, `data-d="${moveTo}" style="background:var(--soft)"`);
    const after = moveTo ? (isH ? 'останется в этом дне: «не сделано · перенесено на ' + fmtShort(moveTo) + '»' : 'уйдёт из этого дня и встанет в ' + fmtShort(moveTo)) : 'выбери день';
    return `<div class="card">${weekHead(weekSel, 'mweek')}${days}${it.type === 't' && !r.repeat ? `<div class="opts"><span data-act="nodate" class="${moveTo === '' ? 'on' : ''}">В список без даты</span></div>` : ''}<p class="small" style="margin:0">${moveTo === '' ? 'Задача вернётся в список года без даты.' : esc(after)}</p></div>`;
  };
  const cancelPanel = () => `<div class="card"><div class="h3" style="margin:0">Не делать в этот день</div><p class="small" style="margin:0">${isH ? (it.type === 's' ? 'Шаг цели' : 'Привычка') + ' останется в дне с красным крестиком «не сделано» и посчитается в проценте.' : r.repeat ? 'Это повторение уйдёт из дня без следа. Следующее — по расписанию.' : it.type === 'e' ? 'Событие уйдёт из этого дня без следа.' : 'Задача уйдёт из дня без следа и вернётся в список года без даты.'}</p></div>`;

  const build = () => `<div class="seg"><span class="${tab === 'done' ? 'on' : ''}" data-act="tab" data-t="done">Сделано</span>${canMove ? `<span class="${tab === 'move' ? 'on' : ''}" data-act="tab" data-t="move">Перенести</span>` : ''}<span class="${tab === 'cancel' ? 'on' : ''}" data-act="tab" data-t="cancel">Отменить</span></div>
    <div data-panel>${tab === 'done' ? planPanel() + donePanel() + (future ? '' : wholePanel()) : tab === 'move' ? movePanel() : cancelPanel()}</div>
    ${field('Комментарий', `<textarea class="inp area" rows="1" data-comment placeholder="Как прошло…">${esc(comment)}</textarea>`)}`;

  const html = `<section class="scr">${top(esc(ttl) + ' · ' + fmtShort(date).replace(/ \S+$/, (m) => m.slice(0, 4)))}<div class="body" data-mbody>${build()}</div><div class="foot"><button class="btn pri" data-act="save">Сохранить</button></div></section>`;
  let rootEl;
  const rerender = () => { const c = rootEl.querySelector('[data-comment]').value; rootEl.querySelector('[data-mbody]').innerHTML = build(); rootEl.querySelector('[data-comment]').value = c; bind(); };
  const bind = () => {
    autoGrow(rootEl);
    const fi = rootEl.querySelector('[data-fact]');
    if (fi) fi.addEventListener('input', () => { fact = kind === 'time' ? fi.value : Math.max(0, Number(fi.value) || 0); const res = rootEl.querySelector('[data-res]'); if (res) res.innerHTML = resultHtml(); if (kind === 'count') rootEl.querySelector('.big').textContent = Number(fact).toLocaleString('ru-RU'); });
  };
  let flip = it.s === 'done';
  return {
    html,
    mount(root) { rootEl = root; bind(); },
    actions: {
      tab: (el) => { tab = el.dataset.t; rerender(); },
      step: (el) => {
        const stepv = kind === 'duration' ? 5 : (tgt0 >= 1000 ? 500 : tgt0 >= 100 ? 10 : 1);
        fact = Math.max(0, fact + Number(el.dataset.d) * stepv); rerender();
      },
      flip: (el) => { flip = !flip; el.classList.toggle('done', flip); el.nextElementSibling.querySelector('b').textContent = flip ? 'Сделано' : 'Отметить сделанным'; },
      whole: () => { whole = !whole; rerender(); },
      pdur: (el) => {
        const v = +el.dataset.v, wasPlan = fact === (tgt0 || 0);
        tgt0 = v || null; kind = v ? 'duration' : 'check';
        if (v && (fact == null || (wasPlan && !it.s))) fact = v;
        rerender();
      },
      mweek: (el) => { weekSel = el.dataset.d; rerender(); },
      pickday: (el) => { moveTo = el.dataset.d; rerender(); },
      nodate: () => { moveTo = ''; rerender(); },
      save: (el, go) => {
        const c = rootEl.querySelector('[data-comment]').value.trim();
        if (isStep && (tgt0 || 0) !== dur0) S.setStepDayDur(date, key, tgt0 || 0);
        if (tab === 'done' && isStep && future) { if (c !== comment) S.setComment(date, key, c); }
        else if (tab === 'done') {
          const w = plan.length > 1 ? whole : undefined;
          if (kind === 'check') {
            if (flip !== (it.s === 'done')) S.toggle(date, key, w);
            else if (flip && w !== undefined && w !== (r.step.done && r.step.doneAt === date)) { S.toggle(date, key); S.toggle(date, key, w); }
            if (c !== comment) S.setComment(date, key, c);
          } else S.markFact(date, key, fact, c, w);
        } else if (tab === 'move') {
          if (moveTo === null) { alert('Выбери день'); return; }
          if (c) S.setComment(date, key, c);
          S.move(date, key, moveTo || null);
        } else {
          if (c) S.setComment(date, key, c);
          S.cancel(date, key);
        }
        go('back');
      },
    },
  };
}

// ---------- СПИСОК ГОДА ----------

// «ещё 3 дня» для невыполненного шага
export function stepSmall(gid, sid) {
  const later = S.stepLaterDays(gid, sid, addDays(today(), -1)).length;
  return later ? 'ещё ' + later + ' ' + plural(later, 'день', 'дня', 'дней') : '';
}

// справа у шага: накопленное время из дней (розовое), пока его нет — плановая длительность
export function stepChip(gid, x) {
  const spent = S.stepSpent(gid, x.id);
  return spent ? `<span class="chip spent">${fmtMin(spent)}</span>` : x.duration ? `<span class="chip">${fmtMin(x.duration)}</span>` : '';
}

export function listScreen() {
  const y = new Date().getFullYear();
  const habits = S.state.habits.filter((h) => h.status !== 'archived');
  const harch = S.state.habits.filter((h) => h.status === 'archived');
  const open = S.state.tasks.filter((t) => t.status === 'open');
  const done = S.state.tasks.filter((t) => t.status === 'done').sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));
  const taskSmall = (t) => {
    if (t.repeat) { const n = S.nextOccurrence(t); return repeatText(t) + (n ? ' · следующий ' + fmtDMshort(n) : ''); }
    if (t.date) return (t.date < today() ? 'просрочено · ' : '') + fmtShort(t.date) + (t.deadline ? ' · до ' + fmtDM(t.deadline) : '');
    return 'без даты' + (t.deadline ? ' · до ' + fmtDM(t.deadline) : '');
  };
  open.sort((a, b) => (a.date || a.repeat && S.nextOccurrence(a) || '9999').localeCompare(b.date || b.repeat && S.nextOccurrence(b) || '9999'));
  const goals = S.state.goals.filter((g) => g.status === 'active'), garch = S.state.goals.filter((g) => g.status !== 'active');
  const grows = goals.map((g, i) => {
    const p = S.goalProgress(g);
    const steps = g.stages.map((st) => `<div class="row"><div class="t"><small>${esc(st.title)}</small></div></div>` + st.steps.map((x) => `<div class="row"><span class="ck ${x.done ? 'done' : ''}"></span><div class="t"><b>${esc(x.title)}</b>${x.done ? `<small>выполнено ${fmtDMshort(x.doneAt)}</small>` : stepSmall(g.id, x.id) ? `<small>${stepSmall(g.id, x.id)}</small>` : ''}</div>${stepChip(g.id, x)}</div>`).join('')).join('');
    return `<div class="gcard"><div class="gcard-h" data-go="#/goalcard/${g.id}"><div class="t"><b>${esc(g.title)}</b><small>${p.done} из ${p.total} шагов${g.deadline ? ' · до ' + fmtDM(g.deadline) : ''}</small><div class="gbar" style="margin-top:6px"><i class="now" style="width:${Math.max(2, p.pct)}%"></i></div></div><span class="chev">›</span></div><div class="rows">${steps}</div></div>`;
  }).join('');
  const evs = S.state.events.filter((e) => e.repeat || (e.end || e.start) >= today()).sort((a, b) => a.start.localeCompare(b.start));
  const evPast = S.state.events.filter((e) => !e.repeat && (e.end || e.start) < today()).sort((a, b) => b.start.localeCompare(a.start));
  const evSmall = (e) => (e.type === 'trip' ? 'Поездка · ' + fmtDMshort(e.start) + '–' + fmtDMshort(e.end) : (e.kind || 'Событие') + ' · ' + (e.repeat ? repeatText(e) : fmtShort(e.start))) + (e.time ? ' · ' + e.time : '');
  const erows = evs.map((e) => `<div class="row" data-go="#/eventcard/${e.id}"><div class="t"><b>${esc(e.title)}</b><small>${esc(evSmall(e))}</small></div><span class="chev">›</span></div>`).join('');
  const hrows = habits.map((h) => `<div class="row" data-go="#/habitcard/${h.id}"><div class="t"><b>${esc(h.title)}</b><small>${esc(scheduleText(h))}${h.pausedFrom ? ' · на паузе' : ''}</small></div><span class="chev">›</span></div>`).join('');
  const trows = open.map((t) => `<div class="row" data-go="#/task/${t.id}"><div class="t"><b>${esc(t.title)}</b><small${t.date && t.date < today() ? ' style="color:var(--warn)"' : ''}>${esc(taskSmall(t))}</small></div>${t.repeat ? '<span class="chip">↻</span>' : t.duration ? `<span class="chip">${fmtMin(t.duration)}</span>` : ''}</div>`).join('');
  const arch = (label, rows) => rows.length ? `<div class="arch" data-act="arch">${label} · ${rows.length}<span>›</span></div><div class="rows" hidden>${rows.join('')}</div>` : '';
  const html = `<section class="scr">
  ${top('Список · ' + y, { back: false, right: S.state.ai && S.state.ai.key ? '<button class="ib aib" data-go="#/ai">✦ ИИ</button>' : '' })}
  <div class="body">
    <div class="blk goals"><div class="bh">${ICON.goal}<b>Цели</b><button class="plus" data-go="#/goal/new">+</button></div>
      ${grows ? `<div class="gcards">${grows}</div>` : '<div class="empty">Большое, к чему идёшь шагами: найти работу, сыграть концерт…</div>'}
      ${arch('Архив', garch.map((g) => `<div class="row arch-row" data-go="#/goalcard/${g.id}"><span class="ck done"></span><div class="t"><b>${esc(g.title)}</b><small>${g.status === 'achieved' ? 'достигнута ' + fmtDM(g.achievedAt) : 'в архиве с ' + fmtDM(g.archivedAt)}</small></div></div>`))}
    </div>
    <div class="blk habits"><div class="bh">${ICON.habit}<b>Привычки</b><button class="plus" data-go="#/habit/new">+</button></div>
      ${hrows ? `<div class="rows">${hrows}</div>` : '<div class="empty">Что ты хочешь делать регулярно? Скрипка, витамины, шаги…</div>'}
      ${arch('Архив', harch.map((h) => `<div class="row arch-row" data-go="#/habit/${h.id}"><span class="ck done"></span><div class="t"><b>${esc(h.title)}</b><small>в архиве с ${fmtDM(h.archivedAt)}</small></div></div>`))}
    </div>
    <div class="blk tasks"><div class="bh">${ICON.task}<b>Задачи</b><button class="plus" data-go="#/task/new">+</button></div>
      ${trows ? `<div class="rows">${trows}</div>` : '<div class="empty">Дела один раз или с повтором: записаться к врачу, оплатить ЖКХ…</div>'}
      ${arch('Выполнено', done.map((t) => `<div class="row arch-row"><span class="ck done"></span><div class="t"><b>${esc(t.title)}</b><small>${t.doneAt ? fmtShort(t.doneAt) : ''}</small></div></div>`))}
    </div>
    <div class="blk events"><div class="bh">${ICON.event}<b>События</b><button class="plus" data-go="#/event/new">+</button></div>
      ${erows ? `<div class="rows">${erows}</div>` : '<div class="empty">Встречи, театр, поездки, дни рождения…</div>'}
      ${arch('Прошедшие', evPast.map((e) => `<div class="row arch-row" data-go="#/eventcard/${e.id}"><span class="ck done"></span><div class="t"><b>${esc(e.title)}</b><small>${esc(evSmall(e))}</small></div></div>`))}
    </div>
  </div>
  ${tabbar('list')}
</section>`;
  return { html, actions: { arch: (el) => { el.nextElementSibling.hidden = !el.nextElementSibling.hidden; el.classList.toggle('open'); } } };
}

// ---------- ПРИВЫЧКА ----------

const KINDS = [['check', 'Просто сделано', 'витамины'], ['duration', 'Сколько времени', 'скрипка · 1 ч'], ['count', 'Сколько раз / штук', 'шаги · 10 000'], ['time', 'Во сколько', 'подъём · 08:00']];

export function habitScreen(id, params) {
  const h = id !== 'new' ? S.habitById(id) : null;
  const f = h ? { title: h.title, days: [...(h.days || [])], kind: h.kind || 'check', target: h.target, unit: h.unit || '', goalId: h.goalId || '' }
    : { title: params.get('title') || '', days: [0, 1, 2, 3, 4], kind: 'check', target: null, unit: '' };
  const targetField = () => {
    if (f.kind === 'duration') return field('План на день, минут', `<input class="inp" type="number" inputmode="numeric" data-f="target" value="${f.target || ''}" placeholder="например, 60"><div class="opts">${[10, 20, 30, 60].map((m) => `<span data-act="preset" data-v="${m}">${fmtMin(m)}</span>`).join('')}</div>`);
    if (f.kind === 'count') return field('Цель на день', `<input class="inp" type="number" inputmode="numeric" data-f="target" value="${f.target || ''}" placeholder="например, 10000"><input class="inp" data-f="unit" value="${esc(f.unit)}" placeholder="чего: шагов, страниц…">`);
    if (f.kind === 'time') return field('Во сколько', `<input class="inp" type="time" data-f="target" value="${esc(f.target || '08:00')}">`);
    return '<p class="small" style="margin:0">В дне — кружок: нажала, и готово.</p>';
  };
  const form = () => `${field('Название', `<input class="inp" data-f="title" value="${esc(f.title)}" placeholder="Например, Скрипка">`)}
    ${field('Дни', `<div class="opts">${WD.map((w, i) => `<span class="${f.days.includes(i) ? 'on' : ''}" data-act="day" data-i="${i}">${w}</span>`).join('')}</div>`)}
    ${field('Как отмечать выполнение', `<div class="kinds">${KINDS.map(([k, t, ex]) => `<span class="${f.kind === k ? 'on' : ''}" data-act="kind" data-k="${k}"><b>${t}</b><small>${ex}</small></span>`).join('')}</div>`)}
    ${targetField()}
    ${S.state.goals.some((g) => g.status === 'active') ? field('Для какой цели · необязательно', `<select class="inp" data-f="goalId"><option value="">Не связана</option>${S.state.goals.filter((g) => g.status === 'active').map((g) => `<option value="${g.id}"${f.goalId === g.id ? ' selected' : ''}>${esc(g.title)}</option>`).join('')}</select>`) : ''}
    ${h ? `<div class="card plain"><div class="rows">
      <div class="row" data-act="pause"><div class="t"><b>${h.pausedFrom ? 'Снять с паузы' : 'На паузу'}</b><small>${h.pausedFrom ? 'на паузе с ' + fmtDM(h.pausedFrom) : 'временно не ставится в дни'}</small></div></div>
      <div class="row" data-act="arch"><div class="t"><b>${h.status === 'archived' ? 'Вернуть из архива' : 'Убрать в архив'}</b><small>${h.status === 'archived' ? 'снова будет вставать в дни' : 'из дней уйдёт, история останется'}</small></div></div>
      <div class="row" data-act="del"><div class="t"><b style="color:var(--warn)">Удалить совсем</b><small>сотрёт вместе с историей</small></div></div>
    </div></div>` : ''}`;
  const html = `<section class="scr">${top(h ? 'Привычка' : 'Новая привычка')}<div class="body" data-form>${form()}</div><div class="foot"><button class="btn pri" data-act="save">Сохранить привычку</button></div></section>`;
  let rootEl;
  const sync = () => rootEl.querySelectorAll('[data-f]').forEach((i) => { f[i.dataset.f] = i.value; });
  const rerender = () => { sync(); rootEl.querySelector('[data-form]').innerHTML = form(); };
  return {
    html,
    mount(root) { rootEl = root; },
    actions: {
      day: (el) => { sync(); const i = +el.dataset.i; f.days = f.days.includes(i) ? f.days.filter((x) => x !== i) : [...f.days, i]; el.classList.toggle('on'); },
      kind: (el) => { sync(); if (f.kind !== el.dataset.k) { f.kind = el.dataset.k; f.target = f.kind === 'time' ? '08:00' : null; } rerender(); },
      preset: (el) => { rootEl.querySelector('[data-f="target"]').value = el.dataset.v; },
      pause: (el, go, render) => { S.setHabitStatus(h.id, 'paused'); render(); },
      arch: (el, go) => { S.setHabitStatus(h.id, h.status === 'archived' ? 'active' : 'archived'); go('back'); },
      del: (el, go) => { if (confirm('Удалить привычку «' + h.title + '» вместе со всей историей?')) { S.deleteHabit(h.id); go('back'); } },
      save: (el, go) => {
        sync();
        if (!f.title.trim()) { alert('Напиши название'); return; }
        let target = f.target;
        if (f.kind === 'duration' || f.kind === 'count') { target = Math.max(0, Number(target) || 0); if (!target) { alert('Укажи план на день'); return; } }
        if (f.kind === 'check') target = null;
        const saved = S.saveHabit({ id: h && h.id, title: f.title.trim(), days: f.days.sort(), kind: f.kind, target, unit: f.unit, goalId: f.goalId });
        const dayP = params.get('day');
        if (dayP && !f.days.includes(wd(dayP))) S.addHabitToDay(dayP, saved.id);
        go('back');
      },
    },
  };
}

// ---------- ЗАДАЧА ----------

export function taskScreen(id, params) {
  const t = id !== 'new' ? S.taskById(id) : null;
  const r = (t && t.repeat) || {};
  const f = { title: t ? t.title : '', date: t ? t.date : params.get('date') || null, hasDate: t ? !!t.date : !!params.get('date'), deadline: t ? t.deadline : null, duration: t ? t.duration : null,
    every: r.every || '', weekdays: r.weekdays || [], monthDay: r.monthDay || new Date().getDate(), yearDate: r.yearDate || today().slice(5) };
  const form = () => `${field('Название', `<input class="inp" data-f="title" value="${esc(f.title)}" placeholder="Например, Записаться к стоматологу">`)}
    ${field('Повторять', `<div class="seg">${[['', 'Нет'], ['week', 'Неделя'], ['month', 'Месяц'], ['year', 'Год']].map(([k, l]) => `<span class="${f.every === k ? 'on' : ''}" data-act="every" data-k="${k}">${l}</span>`).join('')}</div>`)}
    ${f.every === 'week' ? field('По каким дням', `<div class="opts">${WD.map((w, i) => `<span class="${f.weekdays.includes(i) ? 'on' : ''}" data-act="wday" data-i="${i}">${w}</span>`).join('')}</div>`) : ''}
    ${f.every === 'month' ? field('Какого числа', `<input class="inp" type="number" min="1" max="31" inputmode="numeric" data-f="monthDay" value="${f.monthDay}"><small class="small">Если в месяце нет такого числа — в последний день.</small>`) : ''}
    ${f.every === 'year' ? field('Какого числа', `<input class="inp" type="date" data-f="yearFull" value="${new Date().getFullYear()}-${f.yearDate}">`) : ''}
    ${!f.every ? field('Дата', `<div class="seg"><span class="${!f.hasDate ? 'on' : ''}" data-act="hasdate" data-v="0">Без даты</span><span class="${f.hasDate ? 'on' : ''}" data-act="hasdate" data-v="1">Выбрать день</span></div>${f.hasDate ? `<input class="inp" type="date" data-f="date" value="${f.date || today()}">` : ''}`) : ''}
    ${!f.every ? field('Срок до · необязательно', `<input class="inp" type="date" data-f="deadline" value="${f.deadline || ''}">`) : ''}
    ${field('Длительность · необязательно', `<div class="opts">${[[null, 'Нет'], [15, '15 мин'], [30, '30 мин'], [60, '1 ч'], [120, '2 ч']].map(([v, l]) => `<span class="${f.duration === v ? 'on' : ''}" data-act="dur" data-v="${v ?? ''}">${l}</span>`).join('')}</div>`)}`;
  const right = t ? `<button class="ib ibdel" data-act="del" title="Удалить задачу">${ICON.trash}</button>` : '';
  const html = `<section class="scr">${top(t ? 'Задача' : 'Новая задача', { right })}<div class="body" data-form>${form()}</div><div class="foot"><button class="btn pri" data-act="save">Сохранить</button></div></section>`;
  let rootEl;
  const sync = () => rootEl.querySelectorAll('[data-f]').forEach((i) => {
    if (i.dataset.f === 'yearFull') f.yearDate = i.value.slice(5) || f.yearDate;
    else f[i.dataset.f] = i.value || null;
  });
  const rerender = () => { sync(); rootEl.querySelector('[data-form]').innerHTML = form(); };
  return {
    html,
    mount(root) { rootEl = root; },
    actions: {
      every: (el) => { f.every = el.dataset.k; if (f.every === 'week' && !f.weekdays.length) f.weekdays = [wd(today())]; rerender(); },
      wday: (el) => { sync(); const i = +el.dataset.i; f.weekdays = f.weekdays.includes(i) ? f.weekdays.filter((x) => x !== i) : [...f.weekdays, i]; rerender(); },
      hasdate: (el) => { f.hasDate = el.dataset.v === '1'; if (f.hasDate && !f.date) f.date = today(); rerender(); },
      dur: (el) => { sync(); f.duration = el.dataset.v ? +el.dataset.v : null; rerender(); },
      del: (el, go) => { if (confirm('Удалить задачу «' + t.title + '»?')) { S.deleteTask(t.id); go('back'); } },
      save: (el, go) => {
        sync();
        if (!f.title || !f.title.trim()) { alert('Напиши название'); return; }
        let repeat = null;
        if (f.every === 'week') { if (!f.weekdays.length) { alert('Выбери дни недели'); return; } repeat = { every: 'week', weekdays: f.weekdays.sort() }; }
        if (f.every === 'month') repeat = { every: 'month', monthDay: Math.min(31, Math.max(1, Number(f.monthDay) || 1)) };
        if (f.every === 'year') repeat = { every: 'year', yearDate: f.yearDate };
        S.saveTask({ id: t && t.id, title: f.title.trim(), date: repeat ? (t && t.date) || today() : f.hasDate ? f.date : null, deadline: repeat ? null : f.deadline, duration: f.duration, repeat });
        go('back');
      },
    },
  };
}

// ---------- ЖИЗНЬ ----------

// Итоги (неделя · месяц · год), воспоминания и книга года — плитки под календарём жизни
function lifeHub() {
  const t = today(), y = t.slice(0, 4), ws = weekStart(t), we = addDays(ws, 6), mk = t.slice(0, 7);
  const wl = parse(ws).getMonth() === parse(we).getMonth() ? parse(ws).getDate() + '–' + fmtDMshort(we) : fmtDMshort(ws) + ' – ' + fmtDMshort(we);
  const cal = '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>';
  const IC = {
    w: cal + '<path d="M7.5 15h9"/>',
    m: cal + '<path d="M8 13.5h.01M12 13.5h.01M16 13.5h.01M8 17h.01M12 17h.01M16 17h.01" stroke-width="2.4"/>',
    y: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  };
  const tile = (go, k, name, sub, due) => `<div class="hub-t${due ? ' due' : ''}" data-go="${go}"><span class="hub-ti"><svg viewBox="0 0 24 24">${IC[k]}</svg></span><b>${name}</b><small>${sub}</small></div>`;
  const mems = S.memories(+y);
  return `<div class="hub"><div class="hub-lbl">Итоги</div><div class="hub-row">
      ${tile('#/summary/w/' + ws, 'w', 'Неделя', wl, wd(t) === 6).replace('class="hub-t', 'class="hub-t main')}
      ${tile('#/summary/m/' + mk, 'm', 'Месяц', MONTHS_NOM[+mk.slice(5) - 1])}
      ${tile('#/summary/y/' + y, 'y', 'Год', y)}
    </div></div>
    <div class="hub2">
      <div class="hub-m" data-go="#/memories"><span class="hub-ic">${ICON.heart}</span><div><b>Воспоминания</b><small>${mems.length ? mems.length + ' за ' + y : 'пока пусто'}</small></div></div>
      <div class="hub-b" data-go="#/print"><span class="hub-book"><i></i><em>${y}</em></span><div><b>Книга года</b><small>PDF · A4</small></div></div>
    </div>`;
}

export function lifeScreen() {
  const p = S.state.profile || {}, a = age(p.birthDate) ?? 0, hor = +p.horizon || 90, lm = +p.landmark || 60;
  let cells = '';
  // клетка = возраст: 1, 2, … 40 (сейчас) … 90 — по 10 в ряд, ряд кончается круглым числом
  for (let i = 1; i <= hor; i++) {
    const c = i < a ? 'past' : i === a ? 'now' : i <= lm ? 'pre' : 'post';
    const yr = new Date().getFullYear() - (a - i);
    cells += `<i class="${c}"${c === 'now' ? ' data-go="#/summary/y/' + yr + '"' : c === 'past' ? ' data-go="#/year/' + yr + '"' : ''}>${i}</i>`;
  }
  const dec = new Date().getMonth() === 11;
  const dreams = S.state.dreams.map((d) => `<div class="row" data-go="#/dream/${d.id}">${d.cameTrue ? '<span class="ck done"></span>' : ''}<div class="t"><b>${esc(d.title)}</b>${d.cameTrue ? `<small>сбылось · ${d.cameTrue.date.slice(0, 4)}</small>` : d.goalId && S.goalById(d.goalId) ? `<small>стала целью · ${S.goalProgress(S.goalById(d.goalId)).pct}%</small>` : ''}</div><span class="chev">›</span></div>`).join('');
  const html = `<section class="scr">
  ${top('Моя жизнь', { back: false, right: `<button class="ib ibgear" data-go="#/settings" title="Настройки">${ICON.gear}</button>` })}
  <div class="body">
    ${dec ? `<button class="btn pri" style="flex:none" data-go="#/list">Планирование ${new Date().getFullYear() + 1}</button>` : ''}
    <div class="card"><div class="h3">Календарь жизни<span class="small">${hor} лет</span></div><div class="life">${cells}</div>
      <div class="legend"><span style="--c:color-mix(in srgb, var(--muted) 50%, var(--card))">Прошло</span><span style="--c:var(--accent)">Сейчас · ${a} ${plural(a, 'год', 'года', 'лет')}</span><span style="--c:color-mix(in srgb, var(--accent) 35%, var(--card))">До ${lm}</span><span style="--c:var(--soft)">После</span></div></div>
    <div class="blk dreams"><div class="bh">${ICON.dream}<b>Мои мечты</b><button class="plus" data-act="adddream">+</button></div>
      <div class="rows">${dreams}<div class="row" data-dreamnew hidden><input class="inp" data-dreaminp placeholder="О чём мечтаешь?"></div></div>
      ${!dreams ? '<div class="empty" data-dreamempty>Мечты — без дат и плана. Например: побывать на Байкале.</div>' : ''}
    </div>
    ${lifeHub()}
  </div>
  ${tabbar('life')}
</section>`;
  let rootEl;
  return {
    html,
    mount(root) {
      rootEl = root;
      const inp = root.querySelector('[data-dreaminp]');
      const commit = () => { const v = inp.value.trim(); if (v) S.addDream(v); };
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { commit(); inp.value = ''; window.dispatchEvent(new Event('rerender')); } });
      inp.addEventListener('blur', () => { if (inp.value.trim()) { commit(); window.dispatchEvent(new Event('rerender')); } });
    },
    actions: {
      adddream: () => { const r = rootEl.querySelector('[data-dreamnew]'); r.hidden = false; const e = rootEl.querySelector('[data-dreamempty]'); if (e) e.hidden = true; r.querySelector('input').focus(); },
      deldream: (el, go, render) => { if (confirm('Удалить мечту?')) { S.deleteDream(el.dataset.id); render(); } },
    },
  };
}

// ---------- НАСТРОЙКИ И КОПИЯ ----------

export function settingsScreen() {
  const p = S.state.profile || {}, ago = S.backupDaysAgo();
  const html = `<section class="scr">${top('Настройки')}<div class="body">
    <div class="card plain"><div class="h3">О тебе</div>
      ${field('Имя', `<input class="inp" data-p="name" value="${esc(p.name || '')}">`)}
      ${field('Дата рождения', `<input class="inp" type="date" data-p="birthDate" value="${esc(p.birthDate || '')}">`)}
      ${field('Горизонт — сколько клеток в календаре жизни', `<input class="inp" type="number" inputmode="numeric" data-p="horizon" value="${p.horizon || 90}">`)}
      ${field('Ориентир — до какого возраста клетки светлее', `<input class="inp" type="number" inputmode="numeric" data-p="landmark" value="${p.landmark || 60}">`)}
    </div>
    <div class="card plain"><div class="h3">Данные</div><div class="rows">
      <div class="row" data-go="#/backup"><div class="t"><b>Резервная копия</b><small${ago > 7 ? ' style="color:var(--warn)"' : ''}>${S.state.backup.lastAt ? 'последняя: ' + fmtDM(S.state.backup.lastAt.slice(0, 10)) + ' · ' + ago + ' ' + plural(ago, 'день', 'дня', 'дней') + ' назад' : 'ещё не делалась'}</small></div><span class="chev">›</span></div>
    </div></div>
    ${field('Ключ помощника (Claude API) · необязательно', `<input class="inp" type="password" data-ai="key" value="${esc((S.state.ai || {}).key || '')}" placeholder="sk-ant-…" autocomplete="off"><small class="small">Хранится только на телефоне. Без ключа помощник скрыт. Когда спрашиваешь помощника, нужные записи отправляются в Anthropic.</small>`)}
    <p class="small" style="text-align:center;margin:0">Версия ${new URL(import.meta.url).searchParams.get('v') || '—'}</p>
  </div></section>`;
  return {
    html,
    mount(root) { root.querySelectorAll('[data-ai]').forEach((i) => i.addEventListener('change', () => S.setAi({ key: i.value.trim() }))); root.querySelectorAll('[data-p]').forEach((i) => i.addEventListener('change', () => S.setProfile({ [i.dataset.p]: i.type === 'number' ? Number(i.value) || null : i.value }))); },
  };
}

export function backupScreen() {
  const st = S.state, ago = S.backupDaysAgo();
  const days = Object.keys(st.days).length;
  const html = `<section class="scr">${top('Резервная копия')}<div class="body">
    <div class="card bk-status" style="flex-direction:row;align-items:center"><span class="bk-ic">${ICON.shield}</span><div class="t"><b>${st.backup.lastAt ? 'Последняя копия — ' + fmtDM(st.backup.lastAt.slice(0, 10)) : 'Копии ещё нет'}</b><small>${st.backup.lastAt ? ago + ' ' + plural(ago, 'день', 'дня', 'дней') + ' назад · ' : ''}${st.habits.length} привычек, ${st.tasks.length} задач, ${days} дней с отметками</small></div></div>
    <button class="btn pri" style="flex:none" data-act="export">Сохранить копию сейчас</button>
    <p class="small" style="margin:-4px 0 0">Файл со всеми записями. Сохрани его в «Файлы» или iCloud Drive.</p>
    <div class="card plain"><div class="rows"><label class="row" style="cursor:pointer"><div class="t"><b>Восстановить из копии</b><small>для нового телефона — выбрать файл</small></div><span class="chev">›</span><input type="file" accept=".json,application/json" data-import hidden></label></div></div>
    <p class="small" style="margin:0">Всё хранится только на этом телефоне. Копия — единственная защита при смене телефона.</p>
  </div></section>`;
  return {
    html,
    mount(root) {
      const inp = root.querySelector('[data-import]');
      inp.addEventListener('change', async () => {
        const file = inp.files[0];
        if (!file) return;
        try {
          const text = await file.text();
          if (!confirm('Заменить все текущие данные данными из копии?')) return;
          await S.importJson(text);
          alert('Копия восстановлена');
          location.hash = '#/day';
        } catch (e) { alert('Не получилось: ' + e.message); }
      });
    },
    actions: {
      export: async (el, go, render) => {
        const name = 'privychki-' + today() + '.json';
        const file = new File([await S.exportJson(true)], name, { type: 'application/json' });
        try {
          if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: name });
          else { const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
        } catch (e) { /* пользователь закрыл окно «Поделиться» */ }
        render();
      },
    },
  };
}

// ---------- ПЕРВЫЙ ЗАПУСК ----------

export function welcomeScreen() {
  return { html: `<section class="scr"><div class="splash"><div class="small">ПРИВЫЧКИ ТВОЕЙ ЖИЗНИ</div><h1>Планируй и анализируй</h1><p class="muted">Мечты, цели, привычки и воспоминания в одном месте. Всё хранится только на твоём телефоне.</p></div><div class="foot col"><button class="btn pri" data-go="${standalone() ? '#/profile' : '#/install'}">Начать</button></div></section>` };
}

export const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

export function installScreen() {
  const step = (n, t, s, ic) => `<div class="ins-step"><span class="ins-n">${n}</span><div class="t"><b>${t}</b><small>${s}</small></div><span class="ins-i">${ic}</span></div>`;
  return { html: `<section class="scr"><div class="body" style="padding-top:28px">
    <div class="ptitle"><p>Перед началом</p><h1>Поставь приложение на экран «Домой»</h1><p>Так записи будут надёжно храниться на телефоне, а приложение откроется одним нажатием.</p></div>
    <div class="ins">${step(1, 'Нажми «Поделиться»', 'внизу экрана Safari', ICON.share)}${step(2, 'Выбери «На экран Домой»', 'пролистай список вниз', ICON.plussq)}${step(3, 'Открой приложение с экрана «Домой»', 'и продолжи там', ICON.phone)}</div>
  </div><div class="foot col"><button class="btn ghost" data-go="#/profile">Продолжить в Safari</button></div></section>` };
}

export function profileScreen() {
  const p = S.state.profile || {};
  const html = `<section class="scr"><div class="body" style="padding-top:28px">
    <div class="ptitle"><p>Шаг 1 из 2</p><h1>Давай познакомимся</h1></div>
    ${field('Имя', `<input class="inp" data-p="name" value="${esc(p.name || '')}" placeholder="Как к тебе обращаться">`)}
    ${field('Дата рождения', `<input class="inp" type="date" data-p="birthDate" value="${esc(p.birthDate || '')}">`)}
    <div class="card"><div class="kv"><span>Горизонт</span><input class="inp" style="width:90px;min-height:32px" type="number" data-p="horizon" value="${p.horizon || 90}"></div><div class="kv"><span>Ориентир</span><input class="inp" style="width:90px;min-height:32px" type="number" data-p="landmark" value="${p.landmark || 60}"></div><p class="small" style="margin:0">Горизонт — сколько клеток в календаре жизни, ориентир — до какого возраста клетки светлее. Оба можно поменять в настройках.</p></div>
  </div><div class="foot"><button class="btn pri" data-act="next">Продолжить</button></div></section>`;
  let rootEl;
  return {
    html, mount(root) { rootEl = root; },
    actions: {
      next: (el, go) => {
        const v = {}; rootEl.querySelectorAll('[data-p]').forEach((i) => { v[i.dataset.p] = i.type === 'number' ? Number(i.value) || null : i.value; });
        if (!v.birthDate) { alert('Укажи дату рождения — по ней строится календарь жизни'); return; }
        S.setProfile(v); go('#/dreams');
      },
    },
  };
}

export function dreamsScreen() {
  const rows = S.state.dreams.map((d) => `<div class="row"><div class="t"><b>${esc(d.title)}</b></div><span class="dr-del" data-act="del" data-id="${d.id}">✕</span></div>`).join('');
  const html = `<section class="scr"><div class="body" style="padding-top:28px">
    <div class="ptitle"><p>Шаг 2 из 2</p><h1>О чём ты мечтаешь?</h1></div>
    <div class="blk dreams"><div class="bh">${ICON.dream}<b>Мои мечты</b></div><div class="rows">${rows}<div class="row"><input class="inp" data-dreaminp placeholder="Напиши мечту и нажми «Ввод»"></div></div></div>
  </div><div class="foot"><button class="btn" data-act="done">Пропустить</button><button class="btn pri" data-act="done">Готово</button></div></section>`;
  return {
    html,
    mount(root) {
      const inp = root.querySelector('[data-dreaminp]');
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && inp.value.trim()) { S.addDream(inp.value.trim()); window.dispatchEvent(new Event('rerender')); } });
    },
    actions: {
      del: (el, go, render) => { S.deleteDream(el.dataset.id); render(); },
      done: (el, go) => { const inp = document.querySelector('[data-dreaminp]'); if (inp && inp.value.trim()) S.addDream(inp.value.trim()); go('#/intro'); },
    },
  };
}

export function introScreen() {
  const b = (cls, ic, t, d) => `<div class="blk ${cls}"><div class="bh">${ic}<b>${t}</b></div><div class="empty">${d}</div></div>`;
  return {
    html: `<section class="scr"><div class="body" style="padding-top:28px">
    <div class="ptitle"><p>Планирование ${new Date().getFullYear()}</p><h1>Как устроен план на год</h1><p>Записываешь всё в список года. То, у чего есть расписание или дата, само встаёт в дни.</p></div>
    ${b('habits', ICON.habit, 'Привычка', 'Повторяется по расписанию — сама появляется в нужные дни.')}
    ${b('tasks', ICON.task, 'Задача', 'Один раз или с повтором (каждый месяц 20-го). С датой — встаёт в день сама, без даты — ждёт в списке.')}
    ${b('goals', ICON.goal, 'Цель', 'Проект из этапов и шагов. Появится на следующем этапе.')}
    ${b('events', ICON.event, 'Событие', 'Встреча, поездка, важная дата. Появится на следующем этапе.')}
  </div><div class="foot"><button class="btn pri" data-act="go">Далее</button></div></section>`,
    actions: { go: (el, go) => { S.setProfile({ onboarded: true }); go('#/list', false, true); } },
  };
}
