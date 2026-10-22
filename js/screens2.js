// Экраны этапов 2–4: цели, карточка привычки, события и поездки, записи, воспоминания, мечты, итоги, книга года.
import * as S from './store.js?v=57';
import { esc, today, addDays, wd, weekStart, parse, fmtLong, fmtShort, fmtDM, fmtDMshort, fmtMin, plural, age, uid,
  MONTHS_NOM, WD } from './util.js?v=57';
import { ICON, top, ring, field, autoGrow, photoGrid, fillPhotos, bindPhotoInput, scheduleText, repeatText, stepSmall, stepChip } from './screens.js?v=57';
import { aiBreakdownGoal } from './ai.js?v=57';

const re = () => window.dispatchEvent(new Event('rerender'));
const menu = (items) => `<button class="ib" data-act="menu">⋯</button><div class="menu" hidden>${items.map(([a, t, s, del]) => `<span data-act="${a}"${del ? ' class="del"' : ''}>${t}<small>${s}</small></span>`).join('')}</div>`;
const menuAct = (el) => { const m = el.nextElementSibling; m.hidden = !m.hidden; };
const money = (n) => Number(n).toLocaleString('ru-RU') + ' ₽';
const PIN = '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
const KINDS = ['Встреча', 'Ресторан', 'Театр', 'Кино', 'Концерт', 'Выставка', 'Прогулка', 'Праздник', 'Другое'];
const KIND_IC = {
  'Встреча': '<circle cx="9" cy="8" r="3"/><circle cx="16" cy="9" r="2.5"/><path d="M3.5 19c.5-3.2 2.8-5 5.5-5s5 1.8 5.5 5M14 14.3c.6-.2 1.3-.3 2-.3 2.3 0 4 1.5 4.5 4.5"/>',
  'Ресторан': '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2 1-3 3.5-3 7h3"/>',
  'Театр': '<path d="M4 4h9v6a4.5 4.5 0 0 1-9 0z"/><path d="M13 8h7v6a4.5 4.5 0 0 1-8.6 1.8"/><path d="M7 11.5c.8.7 2.2.7 3 0"/>',
  'Кино': '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M7 5l2 4M12 5l2 4M17 5l2 4"/>',
  'Концерт': '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  'Выставка': '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 16l5-5 4 4 2-2 5 5"/><circle cx="15.5" cy="8.5" r="1.5"/>',
  'Прогулка': '<circle cx="13" cy="4.5" r="1.8"/><path d="M10 21l2-6 3 3v3M9 12l2-4 3 1 2 3h3M12 15l-1-4"/>',
  'Праздник': '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M4 13h16M12 9v11M12 9c-1.5-3-5-3.5-5-1.5S10 9 12 9zM12 9c1.5-3 5-3.5 5-1.5S14 9 12 9z"/>',
  'Другое': '<circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/>',
};
const kindGrid = (on) => `<div class="kindgrid">${KINDS.map((k) => `<span class="${k === on ? 'on' : ''}" data-act="kind" data-k="${k}"><i><svg viewBox="0 0 24 24">${KIND_IC[k]}</svg></i>${k}</span>`).join('')}</div>`;
const TRANSPORT = ['Самолёт', 'Поезд', 'Такси', 'Автобус', 'Машина'];
const TR_IC = {
  'Самолёт': '<path d="M10.5 13.5 3 11l1.5-1.5 7.5 1L16 6.5a1.8 1.8 0 0 1 2.5 2.5L14.5 13l1 7.5L14 22l-2.5-7.5L8 18v2.5L6.5 22 5 18.5 1.5 17 3 15.5h2.5z"/>',
  'Поезд': '<rect x="6" y="3" width="12" height="13" rx="3"/><path d="M6 10h12M9 13h.01M15 13h.01M8 20l2-4M16 20l-2-4"/>',
  'Такси': '<path d="M5 16V11l2-5h10l2 5v5M5 16h14M5 16v3M19 16v3M5 11h14M10 6l.5-2h3l.5 2"/><circle cx="8" cy="13.5" r=".6"/><circle cx="16" cy="13.5" r=".6"/>',
  'Автобус': '<rect x="5" y="3" width="14" height="15" rx="2.5"/><path d="M5 11h14M5 7h14M8 18v2M16 18v2"/><circle cx="8.5" cy="14.5" r=".6"/><circle cx="15.5" cy="14.5" r=".6"/>',
  'Машина': '<path d="M5 16V11l2-5h10l2 5v5M5 16h14M5 16v3M19 16v3M5 11h14"/><circle cx="8" cy="13.5" r=".6"/><circle cx="16" cy="13.5" r=".6"/>',
};
const trSvg = (t) => `<svg viewBox="0 0 24 24">${TR_IC[t] || TR_IC['Машина']}</svg>`;
const grab = (root) => { const v = {}; root.querySelectorAll('[data-f]').forEach((i) => { v[i.dataset.f] = i.type === 'checkbox' ? i.checked : i.value; }); return v; };

// ---------- ЦЕЛЬ: создание и изменение ----------

export function goalEditScreen(id, params) {
  const g = id !== 'new' ? S.goalById(id) : null;
  const f = g ? JSON.parse(JSON.stringify({ title: g.title, description: g.description, deadline: g.deadline, dreamId: g.dreamId, stages: g.stages }))
    : { title: params.get('title') || '', description: '', deadline: '', dreamId: params.get('dream') || '', stages: [{ id: uid(), title: 'Этап 1', steps: [{ id: uid(), title: '', duration: null }] }] };
  if (!g && f.dreamId && !f.title) f.title = (S.dreamById(f.dreamId) || {}).title || '';
  const durSel = (si, ti, v) => `<select class="inp sdur${v ? "" : " empty"}" onchange="this.classList.toggle('empty',!this.value)" data-sd="${si}:${ti}">${[[null, 'Время'], [15, '15 мин'], [30, '30 мин'], [45, '45 мин'], [60, '1 ч'], [90, '1,5 ч'], [120, '2 ч'], [180, '3 ч']].map(([x, l]) => `<option value="${x ?? ''}"${(v ?? null) === x ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
  const form = () => `${field('Название', `<input class="inp" data-f="title" value="${esc(f.title)}" placeholder="Например, Найти новую работу">`)}
    ${field('Описание · необязательно', `<textarea class="inp area" rows="1" data-f="description">${esc(f.description)}</textarea>`)}
    ${field('Срок · необязательно', `<input class="inp" type="date" data-f="deadline" value="${esc(f.deadline || '')}">`)}
    ${S.state.dreams.length ? field('Из мечты · необязательно', `<select class="inp" data-f="dreamId"><option value="">Не связана</option>${S.state.dreams.map((d) => `<option value="${d.id}"${f.dreamId === d.id ? ' selected' : ''}>${esc(d.title)}</option>`).join('')}</select>`) : ''}
    ${f.stages.map((st, si) => `<div class="blk goals"><div class="bh"><input class="inp" style="min-height:30px;font-weight:500" data-st="${si}" value="${esc(st.title)}">${f.stages.length > 1 ? `<span class="dr-del" data-act="delstage" data-i="${si}">✕</span>` : ''}</div>
      <div class="rows">${st.steps.map((x, ti) => `<div class="row" style="gap:6px"><input class="inp" style="min-height:32px" data-stp="${si}:${ti}" value="${esc(x.title)}" placeholder="Шаг" enterkeyhint="next">${durSel(si, ti, x.duration)}${x.done ? '<span class="chip acc">✓</span>' : `<span class="dr-del" data-act="delstep" data-i="${si}:${ti}">✕</span>`}</div>`).join('')}
      <div class="addrow" style="--c:var(--accent)" data-act="addstep" data-i="${si}"><i></i>Добавить шаг</div></div></div>`).join('')}
    <div class="addcard" style="--c:var(--accent)" data-act="addstage"><div class="addrow"><i></i>Добавить этап</div></div>
    ${S.state.ai && S.state.ai.key ? '<button class="btn" style="flex:none" data-act="ai">✦ Разбить на этапы с ИИ</button>' : ''}`;
  let rootEl;
  const sync = () => {
    Object.assign(f, grab(rootEl));
    rootEl.querySelectorAll('[data-st]').forEach((i) => { f.stages[+i.dataset.st].title = i.value; });
    rootEl.querySelectorAll('[data-stp]').forEach((i) => { const [a, b] = i.dataset.stp.split(':').map(Number); f.stages[a].steps[b].title = i.value; });
    rootEl.querySelectorAll('[data-sd]').forEach((i) => { const [a, b] = i.dataset.sd.split(':').map(Number); f.stages[a].steps[b].duration = i.value ? +i.value : null; });
  };
  const rerender = () => { rootEl.querySelector('[data-form]').innerHTML = form(); autoGrow(rootEl); };
  return {
    html: `<section class="scr">${top(g ? 'Изменить цель' : 'Новая цель')}<div class="body" data-form>${form()}</div><div class="foot"><button class="btn pri" data-act="save">Сохранить цель</button></div></section>`,
    mount(root) {
      rootEl = root; autoGrow(root);
      // «Ввод» в шаге — новый шаг сразу под ним; в названии этапа — переход к первому шагу.
      root.querySelector('.scr').addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        const stp = e.target.closest('[data-stp]'), st = e.target.closest('[data-st]');
        if (!stp && !st) return;
        e.preventDefault(); sync();
        let a, b;
        if (stp) { [a, b] = stp.dataset.stp.split(':').map(Number); b += 1; f.stages[a].steps.splice(b, 0, { id: uid(), title: '', duration: null }); }
        else { a = +st.dataset.st; b = 0; if (!f.stages[a].steps.length) f.stages[a].steps.push({ id: uid(), title: '', duration: null }); }
        rerender();
        const next = root.querySelector(`[data-stp="${a}:${b}"]`); if (next) next.focus();
      });
    },
    actions: {
      addstep: (el) => { sync(); f.stages[+el.dataset.i].steps.push({ id: uid(), title: '', duration: null }); rerender(); const n = rootEl.querySelectorAll(`[data-stp^="${el.dataset.i}:"]`); if (n.length) n[n.length - 1].focus(); },
      delstep: (el) => { sync(); const [a, b] = el.dataset.i.split(':').map(Number); f.stages[a].steps.splice(b, 1); rerender(); },
      addstage: () => { sync(); f.stages.push({ id: uid(), title: 'Этап ' + (f.stages.length + 1), steps: [{ id: uid(), title: '', duration: null }] }); rerender(); },
      delstage: (el) => { sync(); f.stages.splice(+el.dataset.i, 1); rerender(); },
      ai: async (el) => {
        sync();
        if (!f.title.trim()) { alert('Сначала напиши название цели'); return; }
        el.textContent = 'Думаю…'; el.disabled = true;
        try {
          const stages = await aiBreakdownGoal(f.title, f.description, f.deadline);
          f.stages = stages.map((st) => ({ id: uid(), title: st.title, steps: st.steps.map((x) => ({ id: uid(), title: x.title, duration: x.minutes || null })) }));
          rerender();
        } catch (e) { alert('Помощник не ответил: ' + e.message); el.textContent = '✦ Разбить на этапы с ИИ'; el.disabled = false; }
      },
      save: (el, go) => {
        sync();
        if (!f.title.trim()) { alert('Напиши название'); return; }
        const saved = S.saveGoal({ id: g && g.id, ...f, title: f.title.trim(), stages: f.stages.filter((st) => st.title.trim() || st.steps.some((x) => x.title.trim())) });
        go(g ? 'back' : '#/goalcard/' + saved.id, !g);
      },
    },
  };
}

// ---------- ЦЕЛЬ: карточка ----------

export function goalCardScreen(id) {
  const g = S.goalById(id);
  if (!g) return { html: `<section class="scr">${top('Цель')}<div class="body"><p class="small">Цель удалена.</p></div></section>` };
  const allHist = S.goalHistory(g), p = S.goalProgress(g), hist = allHist.slice(0, 12), habits = S.state.habits.filter((h) => h.goalId === g.id);
  const minutes = allHist.reduce((m, x) => m + (x.what === 'сделано' || x.what === 'частично' ? Number(x.fact) || 0 : 0), 0);
  const stages = g.stages.map((st) => {
    const d = st.steps.filter((x) => x.done).length, all = st.steps.length, closed = all && d === all;
    const rows = st.steps.map((x) => `<div class="row" data-act="step" data-id="${x.id}"><span class="ck ${x.done ? 'done' : ''}" style="--c:var(--g)"></span><div class="t"><b>${esc(x.title)}</b><small>${x.done ? 'выполнено ' + fmtDMshort(x.doneAt) : stepSmall(g.id, x.id) || (S.stepPlan(g.id, x.id).length ? 'в днях' : 'не в днях')}</small></div>${stepChip(g.id, x)}</div>`).join('');
    return `<div class="blk goals"><div class="bh"><b>${esc(st.title)}</b><span class="cnt">${closed ? '✓ ' : ''}${d} из ${all}</span></div>${closed ? `<div class="empty" data-act="open">Этап завершён · <span class="link">Показать шаги</span></div><div class="rows" hidden>${rows}</div>` : `<div class="rows">${rows}</div>`}</div>`;
  }).join('');
  const right = menu([['arch', g.status === 'active' ? 'Убрать в архив' : 'Вернуть из архива', g.status === 'active' ? 'из дней уйдёт, история останется' : 'снова станет активной'], ['del', 'Удалить совсем', 'сотрёт вместе с историей', true]]);
  const html = `<section class="scr">${top(esc(g.title), { right })}<div class="body">
    <div class="card" style="--c:var(--g)"><div class="kv"><span>Прогресс</span><b>${p.done} из ${p.total} шагов · ${p.pct}%</b></div><div class="gbar"><i class="now" style="width:${p.pct}%"></i></div>
      ${minutes ? `<div class="kv"><span>Потрачено</span><b>${fmtMin(minutes)}</b></div>` : ''}${g.deadline ? `<div class="kv"><span>Срок</span><b>до ${fmtDM(g.deadline)}</b></div>` : ''}
      ${g.status === 'achieved' ? `<div class="kv"><span>Достигнута</span><b>${fmtDM(g.achievedAt)}</b></div>` : ''}${g.description ? `<p class="small" style="margin:0">${esc(g.description)}</p>` : ''}</div>
    ${habits.length ? `<div class="card plain"><div class="h3">Привычки для цели</div><div class="rows">${habits.map((h) => `<div class="row" data-go="#/habitcard/${h.id}"><div class="t"><b>${esc(h.title)}</b><small>${esc(scheduleText(h))} · ${S.habitStats(h, addDays(today(), -29), today()).pct}% за 30 дней</small></div><span class="chev">›</span></div>`).join('')}</div></div>` : ''}
    ${stages}
    ${hist.length ? `<div class="card"><div class="h3">История</div><div class="tl">${hist.map((x) => `<div>${esc(x.title)}${x.fact ? ' · ' + fmtMin(x.fact) : ''}<small>${fmtDMshort(x.date)} · ${esc(x.what.startsWith('перенос') ? 'перенос → ' + fmtDMshort(x.what.slice(10)) : x.what)}${x.comment ? ' · ' + esc(x.comment) : ''}</small></div>`).join('')}</div></div>` : ''}
  </div><div class="foot"><button class="btn" data-go="#/goal/${g.id}">Изменить</button>${g.status === 'active' ? '<button class="btn pri" data-act="achieve">Цель достигнута</button>' : ''}</div></section>`;
  return {
    html,
    actions: {
      menu: menuAct,
      open: (el) => { el.nextElementSibling.hidden = false; el.remove(); },
      step: (el, go, render) => { const x = g.stages.flatMap((s) => s.steps).find((s) => s.id === el.dataset.id); x.done = !x.done; x.doneAt = x.done ? today() : null; S.save(); render(); },
      arch: (el, go, render) => { S.setGoalStatus(g.id, g.status === 'active' ? 'archived' : 'active'); render(); },
      del: (el, go) => { if (confirm('Удалить цель «' + g.title + '» вместе с историей?')) { S.deleteGoal(g.id); go('back'); } },
      achieve: (el, go, render) => { S.setGoalStatus(g.id, 'achieved'); render(); },
    },
  };
}

// ---------- ПРИВЫЧКА: карточка ----------

export function habitCardScreen(id) {
  const h = S.habitById(id);
  if (!h) return { html: `<section class="scr">${top('Привычка')}<div class="body"><p class="small">Привычка удалена.</p></div></section>` };
  let month = today().slice(0, 7);
  const goal = h.goalId && S.goalById(h.goalId);
  const st30 = S.habitStats(h, addDays(today(), -29), today()), allSt = S.habitStats(h, h.createdAt || today(), today());
  const avg = h.kind === 'duration' ? fmtMin(allSt.avg).replace(' мин', '').replace(' ч ', ':') : null;
  const cal = () => {
    const [y, m] = month.split('-').map(Number), first = month + '-01', n = new Date(y, m, 0).getDate();
    let cells = WD.map((w) => `<span>${w}</span>`).join('') + '<i class="e"></i>'.repeat(wd(first));
    let done = 0, plan = 0;
    for (let d = 1; d <= n; d++) {
      const date = month + '-' + String(d).padStart(2, '0'), sch = S.habitScheduled(h, date), mk = S.habitMark(h, date);
      let c = '';
      if (mk.s === 'done') { c = 'ok'; if (sch) done++; } else if (!sch) c = 'off'; else if (date < today()) c = 'no';
      if (sch && date <= today()) plan++;
      if (date === today()) c += ' now';
      cells += `<i class="${c.trim()}">${d}</i>`;
    }
    return `<div class="h3"><span><span class="hb-arr" data-act="mon" data-d="-1">‹</span> ${MONTHS_NOM[m - 1]} <span class="hb-arr" data-act="mon" data-d="1">›</span></span><span class="cnt" style="--c:var(--h)">${done} из ${plan}</span></div><div class="hb-cal">${cells}</div>`;
  };
  const notes = [];
  for (const [date, d] of Object.entries(S.state.days)) { const mk = d.items['h:' + h.id]; if (mk && mk.comment) notes.push({ date, text: mk.comment, fact: mk.fact }); }
  notes.sort((a, b) => b.date.localeCompare(a.date));
  const html = `<section class="scr">${top(esc(h.title), { right: `<button class="ib" data-go="#/habit/${h.id}" title="Изменить">✎</button>` })}<div class="body">
    ${goal ? `<div class="hb-goal" data-go="#/goalcard/${goal.id}"><span class="hb-gi">${ICON.goal}</span><div class="hb-gt"><small>Ведёт к цели</small><b>${esc(goal.title)}</b><div class="hb-gbar"><i style="width:${S.goalProgress(goal).pct}%"></i></div><span>${S.goalProgress(goal).done} из ${S.goalProgress(goal).total} шагов${goal.deadline ? ' · до ' + fmtDM(goal.deadline) : ''}</span></div><span class="chev">›</span></div>` : ''}
    <div class="hb-stats"><div><b>${S.streak(h)}</b><small>${plural(S.streak(h), 'день', 'дня', 'дней')} подряд</small></div><div><b>${st30.pct}<span>%</span></b><small>за 30 дней</small></div><div><b>${avg || allSt.done}</b><small>${avg ? 'в среднем' : 'всего раз'}</small></div></div>
    <div class="card" data-cal>${cal()}</div>
    ${notes.length ? `<div class="card"><div class="h3">Заметки</div><div class="tl">${notes.slice(0, 15).map((x) => `<div>${esc(x.text)}<small>${fmtShort(x.date)}${x.fact && h.kind === 'duration' ? ' · ' + fmtMin(x.fact) : ''}</small></div>`).join('')}</div></div>` : ''}
    <p class="small" style="margin:0;text-align:center">${esc(scheduleText(h))}${h.pausedFrom ? ' · на паузе' : ''}${h.status === 'archived' ? ' · в архиве' : ''}</p>
  </div><div class="foot"><button class="btn" data-act="pause">${h.pausedFrom ? 'Снять с паузы' : 'На паузу'}</button><button class="btn" data-go="#/habit/${h.id}">Изменить</button></div></section>`;
  let rootEl;
  return {
    html, mount(root) { rootEl = root; },
    actions: {
      mon: (el) => { const [y, m] = month.split('-').map(Number); const d = new Date(y, m - 1 + Number(el.dataset.d), 1); month = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); rootEl.querySelector('[data-cal]').innerHTML = cal(); },
      pause: (el, go, render) => { S.setHabitStatus(h.id, 'paused'); render(); },
    },
  };
}

// ---------- СОБЫТИЕ / ПОЕЗДКА: создание и изменение ----------

export function eventEditScreen(id, params) {
  const e = id !== 'new' ? S.eventById(id) : null;
  const d0 = params.get('date') || today();
  const f = e ? JSON.parse(JSON.stringify(e)) : { type: 'event', kind: 'Встреча', title: '', start: d0, end: addDays(d0, 3), time: '', repeat: null, note: '', places: [], legs: [], significant: false };
  if (!f.places.length) f.places.push({ name: '', address: '', description: '', price: '' });
  const every = () => (f.repeat ? f.repeat.every : '');
  const placeCard = (p, i) => `<div class="pl-card"><div class="pl-head"><span class="ev-pin sm">${PIN}</span><input class="inp" data-pl="${i}:name" value="${esc(p.name)}" placeholder="${f.type === 'trip' ? 'Отель, гостевой дом…' : 'Название места'}">${f.places.length > 1 ? `<span class="dr-del" data-act="delpl" data-i="${i}">✕</span>` : ''}</div>
    <input class="inp" data-pl="${i}:address" value="${esc(p.address || '')}" placeholder="Адрес или метро">
    ${f.type === 'trip' ? `<textarea class="inp area" rows="1" data-pl="${i}:description" placeholder="Даты, что важно…">${esc(p.description || '')}</textarea>` : ''}
    <input class="inp" type="number" inputmode="numeric" data-pl="${i}:price" value="${esc(p.price || '')}" placeholder="Цена, ₽ · необязательно"></div>`;
  const legCard = (l, i) => `<div class="pl-card"><div class="kindgrid">${TRANSPORT.map((t) => `<span class="${l.transport === t ? 'on' : ''}" data-act="tr" data-i="${i}" data-t="${t}"><i>${trSvg(t)}</i>${t}</span>`).join('')}</div>
    <div class="dt-row eq"><input class="inp" data-lg="${i}:from" value="${esc((l.route || '').split('→')[0].trim())}" placeholder="Откуда"><input class="inp" data-lg="${i}:to" value="${esc(((l.route || '').split('→')[1] || '').trim())}" placeholder="Куда"></div>
    <div class="lg-l"><span>Отправление</span><input class="inp" type="datetime-local" data-lg="${i}:datetime" value="${esc(l.datetime || '')}"></div>
    <div style="display:flex;gap:6px"><input class="inp" type="number" inputmode="numeric" data-lg="${i}:price" value="${esc(l.price || '')}" placeholder="Цена, ₽"><span class="dr-del" data-act="delleg" data-i="${i}" style="align-self:center">✕</span></div></div>`;
  const form = () => `<div class="seg"><span class="${f.type === 'event' ? 'on' : ''}" data-act="type" data-t="event">Событие</span><span class="${f.type === 'trip' ? 'on' : ''}" data-act="type" data-t="trip">Поездка</span></div>
    ${f.type === 'event' ? field('Что это', kindGrid(f.kind)) : ''}
    ${field('Название', `<input class="inp" data-f="title" value="${esc(f.title)}" placeholder="${f.type === 'trip' ? 'Поездка в Зеленоградск' : 'Встреча с Олей'}">`)}
    ${f.type === 'event' ? field('Дата и время', `<div class="dt-row"><input class="inp" type="date" data-f="start" value="${f.start}"><input class="inp" type="time" data-f="time" value="${esc(f.time)}"></div>`)
      : field('Даты', `<div class="dt-row eq"><input class="inp" type="date" data-f="start" value="${f.start}"><input class="inp" type="date" data-f="end" value="${f.end || f.start}"></div>`)}
    ${f.type === 'trip' ? field('Дорога · необязательно', f.legs.map(legCard).join('') + '<div class="addrow" style="--c:var(--accent)" data-act="addleg"><i></i>Добавить дорогу</div>') : ''}
    ${field(f.type === 'trip' ? 'Где живу · необязательно' : 'Место · необязательно', f.places.map(placeCard).join('') + `<div class="addrow" style="--c:var(--accent)" data-act="addpl"><i></i>${f.type === 'trip' ? 'Добавить жильё' : 'Добавить место'}</div>`)}
    ${f.type === 'event' ? field('Повторять', `<div class="seg">${[['', 'Нет'], ['week', 'Неделя'], ['month', 'Месяц'], ['year', 'Год']].map(([k, l]) => `<span class="${every() === k ? 'on' : ''}" data-act="every" data-k="${k}">${l}</span>`).join('')}</div>`) : ''}
    ${field('Заметка · необязательно', `<textarea class="inp area" rows="1" data-f="note" placeholder="Билеты, планы…">${esc(f.note)}</textarea>`)}
    <div class="card plain"><div class="row" style="padding:0"><div class="t"><b>Значимый момент</b><small>в «Главное» и в «Книгу года»</small></div><span class="toggle ${f.significant ? 'on' : ''}" data-act="sig"></span></div></div>`;
  let rootEl;
  const sync = () => {
    Object.assign(f, grab(rootEl));
    rootEl.querySelectorAll('[data-pl]').forEach((i) => { const [n, k] = i.dataset.pl.split(':'); f.places[+n][k] = i.value; });
    rootEl.querySelectorAll('[data-lg]').forEach((i) => { const [n, k] = i.dataset.lg.split(':'); f.legs[+n][k] = i.value; });
    f.legs.forEach((l) => { if (l.from !== undefined || l.to !== undefined) { l.route = [l.from, l.to].map((x) => (x || '').trim()).filter(Boolean).join(' → '); delete l.from; delete l.to; } });
  };
  const rerender = () => { rootEl.querySelector('[data-form]').innerHTML = form(); autoGrow(rootEl); };
  const right = e ? `<button class="ib ibdel" data-act="del">${ICON.trash}</button>` : '';
  return {
    html: `<section class="scr">${top(e ? 'Изменить' : 'Новое событие', { right })}<div class="body" data-form>${form()}</div><div class="foot"><button class="btn pri" data-act="save">Сохранить</button></div></section>`,
    mount(root) { rootEl = root; autoGrow(root); },
    actions: {
      type: (el) => { sync(); f.type = el.dataset.t; if (f.type === 'trip' && (!f.end || f.end < f.start)) f.end = addDays(f.start, 3); rerender(); },
      kind: (el) => { sync(); f.kind = el.dataset.k; rerender(); },
      every: (el) => { sync(); const k = el.dataset.k; f.repeat = !k ? null : k === 'week' ? { every: 'week', weekdays: [wd(f.start)] } : k === 'month' ? { every: 'month', monthDay: parse(f.start).getDate() } : { every: 'year', yearDate: f.start.slice(5) }; rerender(); },
      addpl: () => { sync(); f.places.push({ name: '', address: '', description: '', price: '' }); rerender(); },
      delpl: (el) => { sync(); f.places.splice(+el.dataset.i, 1); rerender(); },
      addleg: () => { sync(); f.legs.push({ transport: 'Поезд', route: '', datetime: '', price: '' }); rerender(); },
      delleg: (el) => { sync(); f.legs.splice(+el.dataset.i, 1); rerender(); },
      tr: (el) => { sync(); f.legs[+el.dataset.i].transport = el.dataset.t; rerender(); },
      sig: (el) => { f.significant = !f.significant; el.classList.toggle('on', f.significant); },
      del: (el, go) => { if (confirm('Удалить «' + e.title + '» вместе с записями и фото?')) { S.deleteEvent(e.id); location.replace('#/list'); } },
      save: (el, go) => {
        sync();
        if (!f.title.trim()) { alert('Напиши название'); return; }
        if (f.type === 'trip' && f.end < f.start) { alert('Дата окончания раньше начала'); return; }
        f.places = f.places.filter((p) => p.name.trim() || p.address.trim());
        const saved = S.saveEvent({ ...f, id: e && e.id, title: f.title.trim() });
        go(e ? 'back' : '#/eventcard/' + saved.id, !e);
      },
    },
  };
}

// ---------- СОБЫТИЕ / ПОЕЗДКА: карточка ----------

function entryCard(en, eventId) {
  const pl = en.place && en.place.name;
  return `<div class="ev-entry" data-go="#/entry/${eventId || 'memory'}/${en.id}">${en.time ? `<div class="ev-time">${esc(en.time)}</div>` : ''}
    ${pl ? `<div class="ev-tag">${PIN}${esc([en.place.kind, en.place.name, en.place.address].filter(Boolean).join(' · '))}${en.place.price ? `<span class="ev-price">${money(en.place.price)}</span>` : ''}</div>` : ''}
    ${en.text ? `<p>${esc(en.text)}</p>` : ''}${photoGrid(en.photos, null, { add: false })}</div>`;
}

export function eventCardScreen(id) {
  const e = S.eventById(id);
  if (!e) return { html: `<section class="scr">${top('Событие')}<div class="body"><p class="small">Событие удалено.</p></div></section>` };
  const trip = e.type === 'trip', t = today();
  const entries = S.state.entries.filter((x) => x.eventId === e.id).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const tot = S.eventTotal(e);
  const placeHtml = (p) => `<div class="ev-place"><span class="ev-pin">${PIN}</span><div class="t"><b>${esc(p.name)}</b>${p.address ? `<small>${esc(p.address)}</small>` : ''}${p.description ? `<small class="pl-d">${esc(p.description)}</small>` : ''}${p.price ? `<small class="pl-price">${money(p.price)}</small>` : ''}</div>${p.address || p.name ? `<a class="link" style="color:var(--e)" href="https://maps.apple.com/?q=${encodeURIComponent([p.name, p.address].filter(Boolean).join(', '))}" target="_blank">Карта</a>` : ''}</div>`;
  let chips;
  if (trip) {
    const n = Math.round((parse(e.end) - parse(e.start)) / 864e5) + 1, k = Math.round((parse(t) - parse(e.start)) / 864e5) + 1;
    chips = `<span class="chip">${fmtDMshort(e.start)} – ${fmtDMshort(e.end)}</span>${t >= e.start && t <= e.end ? `<span class="chip">идёт · день ${k} из ${n}</span>` : ''}`;
  } else chips = `<span class="chip">${esc(e.kind || 'Событие')}</span><span class="chip">${e.repeat ? repeatText(e) : fmtShort(e.start)}${e.time ? ' · ' + e.time : ''}</span>`;
  if (tot.count > 1) chips += `<span class="chip ev-sum">${money(tot.total)}</span>`;
  const entryDate = trip ? (t >= e.start && t <= e.end ? t : t > e.end ? e.end : e.start) : (e.repeat ? t : e.start);
  let diary;
  if (trip) {
    const days = [];
    for (let d = e.end; d >= e.start; d = addDays(d, -1)) {
      const list = entries.filter((x) => x.date === d), dm = S.day(d).memory;
      if (!list.length && !dm) continue;
      days.push(`<div class="ev-day"><div class="ev-dh">${fmtShort(d)}${d === t ? '<span>сегодня</span>' : ''}</div>${dm ? `<div class="ev-entry" data-go="#/day/${d}"><div class="ev-time">Что запомнилось</div><p>${esc(dm)}</p></div>` : ''}${list.map((x) => entryCard(x, e.id)).join('')}</div>`);
    }
    diary = days.join('') || '<p class="small" style="margin:0">Записей пока нет.</p>';
  } else diary = entries.map((x) => entryCard(x, e.id)).join('') || '<p class="small" style="margin:0">Мысли до, во время и после — с фото.</p>';
  const right = menu([['edit', 'Изменить', 'даты, места, цены'], ['del', 'Удалить', 'вместе с записями и фото', true]]);
  const html = `<section class="scr">${top(esc(e.title), { right })}<div class="body">
    <div class="ev-when">${chips}</div>
    ${trip && e.legs.length ? `<div class="h3">Дорога</div><div class="legs">${e.legs.map((l) => `<div class="leg"><span class="leg-i">${trSvg(l.transport)}</span><div class="t"><b>${esc(l.route || l.transport)}</b><small>${esc(l.transport)}${l.datetime ? ' · ' + fmtDM(l.datetime.slice(0, 10)) + ', ' + l.datetime.slice(11, 16) : ''}</small></div>${l.price ? `<span class="leg-p">${money(l.price)}</span>` : ''}</div>`).join('')}</div>` : ''}
    ${e.places.length ? (trip ? '<div class="h3">Где живу</div>' : '') + e.places.map(placeHtml).join('') : ''}
    ${e.note ? `<p class="small" style="margin:0">${esc(e.note)}</p>` : ''}
    <div class="h3" style="margin-top:4px">${trip ? 'Дневник' : 'Мысли и фото'}</div>
    <div class="addcard" style="--c:var(--e)" data-go="#/entry/${e.id}/new?date=${entryDate}"><div class="addrow"><i></i>${trip ? 'Запись · ' + fmtShort(entryDate) : 'Добавить мысль'}</div></div>
    ${diary}
    <div class="card plain"><div class="row" style="padding:0"><div class="t"><b>Значимый момент</b><small>в «Главное» и в «Книгу года»</small></div><span class="toggle ${e.significant ? 'on' : ''}" data-act="sig"></span></div></div>
  </div></section>`;
  return {
    html, mount: (root) => fillPhotos(root),
    actions: {
      menu: menuAct,
      edit: (el, go) => go('#/event/' + e.id),
      del: (el, go) => { if (confirm('Удалить «' + e.title + '» вместе с записями и фото?')) { S.deleteEvent(e.id); go('back'); } },
      sig: (el) => { S.setSignificant(e.id, !e.significant); el.classList.toggle('on', e.significant); },
    },
  };
}

// ---------- ЗАПИСЬ (мысль в событии) и ВОСПОМИНАНИЕ ----------

export function entryScreen(eventId, entryId, params) {
  const isMem = eventId === 'memory', ev = !isMem && S.eventById(eventId);
  const en = entryId !== 'new' ? S.state.entries.find((x) => x.id === entryId) : null;
  const now = new Date();
  const f = en ? JSON.parse(JSON.stringify(en)) : { date: params.get('date') || today(), time: String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'), text: '', place: null, photos: [], significant: false, title: '' };
  let editWhen = false, showPlace = !!(f.place && f.place.name);
  const left = () => isMem ? 6 - f.photos.length : 6 - S.photosOnDay(eventId, f.date, en && en.id) - f.photos.length;
  const form = () => `${editWhen || isMem ? `<div class="dt-row"><input class="inp" type="date" data-f="date" value="${f.date}"><input class="inp" type="time" data-f="time" value="${esc(f.time)}"></div>`
    : `<div class="ev-whenrow">${f.date === today() ? 'Сейчас · ' : ''}${fmtShort(f.date)}, ${esc(f.time)}<span class="link" style="color:var(--e)" data-act="when">Изменить</span></div>`}
    ${isMem ? field('Заголовок · необязательно', `<input class="inp" data-f="title" value="${esc(f.title)}" placeholder="Например, Концерт в филармонии">`) : ''}
    ${field('Что было', `<textarea class="inp area" rows="2" data-f="text" placeholder="Что запомнилось…">${esc(f.text)}</textarea>`)}
    ${showPlace ? field('Место', `<div class="pl-card">${kindGrid((f.place || {}).kind)}<div class="pl-head"><span class="ev-pin sm">${PIN}</span><input class="inp" data-p="name" value="${esc((f.place || {}).name || '')}" placeholder="Название"></div><input class="inp" data-p="address" value="${esc((f.place || {}).address || '')}" placeholder="Адрес или метро"><input class="inp" type="number" inputmode="numeric" data-p="price" value="${esc((f.place || {}).price || '')}" placeholder="Цена, ₽ · необязательно"></div>`)
      : '<div class="addrow" style="--c:var(--accent)" data-act="place"><i></i>Добавить место</div>'}
    <div class="field"><label class="ev-lab">Фото<span>${isMem ? f.photos.length + ' из 6' : 'за день ещё можно ' + Math.max(0, left())}</span></label>${photoGrid(f.photos, 'delph', { max: f.photos.length + Math.max(0, left()) })}</div>
    ${isMem ? `<div class="card plain"><div class="row" style="padding:0"><div class="t"><b>Значимый момент</b><small>в «Главное» и в «Книгу года»</small></div><span class="toggle ${f.significant ? 'on' : ''}" data-act="sig"></span></div></div>` : ''}`;
  let rootEl;
  const sync = () => {
    Object.assign(f, grab(rootEl));
    if (showPlace) { f.place = f.place || {}; rootEl.querySelectorAll('[data-p]').forEach((i) => { f.place[i.dataset.p] = i.value; }); }
  };
  const rerender = () => { rootEl.querySelector('[data-form]').innerHTML = form(); bind(); };
  const bind = () => { autoGrow(rootEl); fillPhotos(rootEl); bindPhotoInput(rootEl, (ids) => { sync(); f.photos.push(...ids); rerender(); }); };
  const right = en ? `<button class="ib ibdel" data-act="del">${ICON.trash}</button>` : '';
  return {
    html: `<section class="scr">${top(isMem ? (en ? 'Воспоминание' : 'Новое воспоминание') : en ? 'Запись' : 'Новая запись', { right })}<div class="body" data-form>${form()}</div><div class="foot"><button class="btn pri" data-act="save">Сохранить</button></div></section>`,
    mount(root) { rootEl = root; bind(); },
    actions: {
      when: () => { sync(); editWhen = true; rerender(); },
      place: () => { sync(); showPlace = true; f.place = f.place || { kind: 'Ресторан' }; rerender(); },
      kind: (el) => { sync(); f.place.kind = el.dataset.k; rerender(); },
      sig: (el) => { f.significant = !f.significant; el.classList.toggle('on', f.significant); },
      delph: (el) => { sync(); f.photos = f.photos.filter((x) => x !== el.dataset.id); S.deletePhoto(el.dataset.id); rerender(); },
      del: (el, go) => { if (confirm('Удалить запись вместе с фото?')) { S.deleteEntry(en.id); go('back'); } },
      save: (el, go) => {
        sync();
        if (!f.text.trim() && !f.photos.length) { alert('Напиши пару слов или добавь фото'); return; }
        if (f.place && !f.place.name) f.place = null;
        S.saveEntry({ ...f, id: en && en.id, eventId: isMem ? null : eventId });
        go('back');
      },
    },
  };
}

// ---------- ВОСПОМИНАНИЯ ----------

export function memoriesScreen(params) {
  const years = [...new Set([new Date().getFullYear(), ...Object.keys(S.state.days).map((d) => +d.slice(0, 4)), ...S.state.entries.map((x) => +x.date.slice(0, 4))])].sort();
  const y = +(params.get('y') || new Date().getFullYear()), star = params.get('star') === '1';
  const list = S.memories(y, star);
  let html = '', cur = '';
  const counts = {};
  list.forEach((m) => { const k = m.date.slice(0, 7); counts[k] = (counts[k] || 0) + 1; });
  for (const m of list) {
    const k = m.date.slice(0, 7);
    if (k !== cur) { cur = k; const n = counts[k]; html += `<div class="mm-month">${MONTHS_NOM[+k.slice(5) - 1]}<span>${n} ${plural(n, 'воспоминание', 'воспоминания', 'воспоминаний')}</span></div>`; }
    const go = m.kind === 'event' ? '#/eventcard/' + m.event.id : m.kind === 'memory' ? '#/entry/memory/' + m.entry.id : '#/day/' + m.date;
    const title = m.kind === 'event' ? m.event.title : m.title;
    const src = m.kind === 'event' ? (m.event.type === 'trip' ? 'Поездка' : m.event.kind || 'Событие') : 'Воспоминание';
    if (m.photos.length) {
      html += `<div class="mm-card" data-go="${go}"><div class="mm-cover ph" data-photo="${m.photos[0]}" data-size="full"><span class="mm-date">${m.kind === 'event' && m.event.end ? fmtDMshort(m.event.start) + '–' + fmtDMshort(m.event.end) : fmtDMshort(m.date)}</span>${m.significant ? '<span class="mm-star">★</span>' : ''}${m.photos.length > 1 ? `<span class="mm-count">+${m.photos.length - 1} фото</span>` : ''}</div><div class="mm-body">${m.kind !== 'day' ? `<div class="mm-src" style="color:var(--e)">${esc(src)}</div>` : ''}${title ? `<b>${esc(title)}</b>` : ''}${m.text ? `<p>${esc(m.text)}</p>` : ''}</div></div>`;
    } else if (m.kind === 'day') {
      html += `<div class="mm-quote" data-go="${go}"><p>«${esc(m.text)}»</p><small>Что запомнилось · ${fmtShort(m.date)}</small></div>`;
    } else {
      html += `<div class="mm-card mm-nophoto" data-go="${go}"><div class="mm-body"><div class="mm-src" style="color:var(--e)">${esc(src)} · ${fmtDMshort(m.date)}</div>${title ? `<b>${esc(title)}</b>` : ''}${m.text ? `<p>${esc(m.text)}</p>` : ''}</div></div>`;
    }
  }
  return {
    html: `<section class="scr">${top('Воспоминания', { right: `<button class="ib ibplus" data-go="#/entry/memory/new">+</button>` })}<div class="body">
      <div class="opts">${years.map((x) => `<span class="${x === y && !star ? 'on' : ''}" data-go="#/memories?y=${x}">${x}</span>`).join('')}<span class="${star ? 'on' : ''}" data-go="#/memories?y=${y}&star=${star ? 0 : 1}">★ Значимые</span></div>
      ${html || '<p class="small">Здесь соберутся «Что запомнилось» из дней, мысли из событий и поездок. Прошлые годы можно дописать через «+».</p>'}
    </div></section>`,
    mount(root) { root.querySelectorAll('[data-photo]').forEach(async (el) => { const u = await S.photoUrl(el.dataset.photo, el.dataset.size || 'thumb'); if (u) el.style.background = `url(${u}) center / cover`; }); },
  };
}

// ---------- МЕЧТА ----------

export function dreamScreen(id) {
  const d = S.dreamById(id);
  if (!d) return { html: `<section class="scr">${top('Мечта')}<div class="body"><p class="small">Мечта удалена.</p></div></section>` };
  const g = d.goalId && S.goalById(d.goalId), ct = d.cameTrue;
  const html = `<section class="scr">${top('Мечта', { right: menu([['del', 'Удалить мечту', 'цель, если есть, останется', true]]) })}<div class="body">
    <div class="dr-head"><span class="dr-ic">${ICON.dream.replace('<svg>', '<svg viewBox="0 0 24 24">')}</span><b>${esc(d.title)}</b><small>мечта с ${d.createdAt.slice(0, 4)} года</small></div>
    ${field('Почему хочу', `<textarea class="inp area" rows="1" data-why placeholder="Чтобы помнить, зачем">${esc(d.why || '')}</textarea>`)}
    ${g ? `<div class="hb-goal" data-go="#/goalcard/${g.id}"><span class="hb-gi">${ICON.goal}</span><div class="hb-gt"><small>Стала целью</small><b>${esc(g.title)}</b><div class="hb-gbar"><i style="width:${S.goalProgress(g).pct}%"></i></div><span>${S.goalProgress(g).done} из ${S.goalProgress(g).total} шагов</span></div><span class="chev">›</span></div>`
      : `<div class="addcard" style="--c:var(--accent)" data-go="#/goal/new?dream=${d.id}"><div class="addrow"><i></i>Сделать целью</div></div>`}
    <div class="card plain"><div class="row" style="padding:0" data-act="came"><span class="ck ${ct ? 'done' : ''}"></span><div class="t"><b>Сбылось</b><small>${ct ? fmtDM(ct.date) + ' ' + ct.date.slice(0, 4) : 'отметь — добавишь дату, мысли и фото'}</small></div></div>
      ${ct ? `<input class="inp" type="date" data-ct="date" value="${ct.date}"><textarea class="inp area" rows="1" data-ct="text" placeholder="Как это было">${esc(ct.text || '')}</textarea>${photoGrid(ct.photos || [], 'delph')}` : ''}</div>
  </div></section>`;
  return {
    html,
    mount(root) {
      autoGrow(root); fillPhotos(root);
      root.querySelector('[data-why]').addEventListener('input', (e) => S.saveDream(d.id, { why: e.target.value }));
      root.querySelectorAll('[data-ct]').forEach((i) => i.addEventListener('change', () => { d.cameTrue[i.dataset.ct] = i.value; S.save(); }));
      bindPhotoInput(root, (ids) => { d.cameTrue.photos = [...(d.cameTrue.photos || []), ...ids].slice(0, 6); S.save(); re(); });
    },
    actions: {
      menu: menuAct,
      del: (el, go) => { if (confirm('Удалить мечту?')) { S.deleteDream(d.id); go('back'); } },
      came: (el, go, render) => { if (d.cameTrue) { if (!confirm('Снять отметку «Сбылось»?')) return; d.cameTrue = null; } else d.cameTrue = { date: today(), text: '', photos: [] }; S.save(); render(); },
      delph: (el, go, render) => { d.cameTrue.photos = d.cameTrue.photos.filter((x) => x !== el.dataset.id); S.deletePhoto(el.dataset.id); S.save(); render(); },
    },
  };
}

// ---------- ИТОГИ: неделя · месяц · год ----------

const VERDICT_P = (p, w) => p >= 90 ? 'Отличн' + w : p >= 70 ? 'Хорош' + w : p >= 40 ? 'Неплох' + w : 'Трудн' + w;
const HL_IC = { goal: ['var(--g-bg)', 'var(--g)', '◎'], habit: ['var(--h-bg)', 'var(--h)', '♪'], star: ['var(--soft)', 'var(--accent)', '★'], trip: ['var(--e-bg)', 'var(--e)', '✈'], dream: ['var(--soft)', 'var(--accent)', '✦'], own: ['var(--soft)', 'var(--accent)', '•'] };
const lv = (p) => p >= 85 ? 4 : p >= 70 ? 3 : p >= 50 ? 2 : 1;

export function summaryScreen(period, key) {
  const t = today();
  let from, to, label, prevKey, nextKey, yearKey = null;
  if (period === 'w') { from = weekStart(key || t); to = addDays(from, 6); label = fmtDMshort(from) + ' – ' + fmtDMshort(to); prevKey = addDays(from, -7); nextKey = addDays(from, 7); }
  else if (period === 'm') {
    key = key || t.slice(0, 7); const [y, m] = key.split('-').map(Number); from = key + '-01'; to = key + '-' + String(new Date(y, m, 0).getDate()).padStart(2, '0'); label = MONTHS_NOM[m - 1] + ' ' + y;
    const pm = new Date(y, m - 2, 1), nm = new Date(y, m, 1); prevKey = pm.getFullYear() + '-' + String(pm.getMonth() + 1).padStart(2, '0'); nextKey = nm.getFullYear() + '-' + String(nm.getMonth() + 1).padStart(2, '0');
  } else { key = key || t.slice(0, 4); yearKey = key; from = key + '-01-01'; to = key + '-12-31'; label = key; prevKey = String(+key - 1); nextKey = String(+key + 1); }
  const P = S.periodPct(from, to), ym = yearKey ? S.yearMeta(yearKey) : null;
  let cover;
  if (period === 'w') cover = `<div class="card hero">${ring(P.pct, P.pct + '%', '')}<div class="t"><b>${P.total ? VERDICT_P(P.pct, 'ая неделя') : 'Неделя'}</b><small>${P.done} из ${P.total}</small></div></div>`;
  else if (period === 'm') {
    let cells = WD.map((w) => `<span class="mh-d">${w}</span>`).join('') + '<i class="e"></i>'.repeat(wd(from));
    for (let d = from; d <= to; d = addDays(d, 1)) { const s = d <= t ? S.dayStats(d) : null; cells += `<i class="${s && s.total ? 'l' + lv(s.pct) : ''}">${parse(d).getDate()}</i>`; }
    cover = `<div class="card"><div class="mh-top">${ring(P.pct, P.pct + '%', '')}<div class="t"><b>${P.total ? VERDICT_P(P.pct, 'ий месяц').replace('Хороший', 'Хороший').replace('Отличний', 'Отличный').replace('Неплохий', 'Неплохой').replace('Трудний', 'Трудный') : label}</b><small>${P.done} из ${P.total}</small></div></div><div class="mh-cal">${cells}</div></div>`;
  } else {
    const a = age((S.state.profile || {}).birthDate, key + '-12-31');
    let tiles = '', best = null, worst = null;
    const mp = [];
    for (let m = 1; m <= 12; m++) { const mk = key + '-' + String(m).padStart(2, '0'); const st = S.periodPct(mk + '-01', mk + '-' + String(new Date(+key, m, 0).getDate()).padStart(2, '0')); mp.push(st); if (st.total) { if (!best || st.pct > best.p) best = { m, p: st.pct }; if (!worst || st.pct < worst.p) worst = { m, p: st.pct }; } }
    const withData = mp.filter((x) => x.total).length; if (withData < 2 || !best || !best.p) best = null; if (withData < 2) worst = null;
    mp.forEach((st, i) => { const b = best && best.m === i + 1, w = worst && worst.m === i + 1 && worst.p < 60 && !b; tiles += `<div class="yt ${st.total ? (w ? 'low' : 'l' + lv(st.pct)) : 'l0'}${b ? ' best' : ''}"><small>${MONTHS_NOM[i].slice(0, 3)}</small><b>${st.total ? st.pct + '%' : '—'}</b>${b ? '<em>лучший</em>' : w ? '<em>трудный</em>' : ''}</div>`; });
    cover = `<div class="card yc"><div class="yc-top"><div><small>Итоги года${a != null ? ' · тебе ' + a : ''}</small><b>${key}</b></div>${P.total ? ring(P.pct, P.pct + '%', '').replace('class="ring"', 'class="ring sm"') : ''}</div>
      <div class="yc-word">Слово года — <input class="inp" data-word value="${esc(ym.word)}" placeholder="одно слово" style="display:inline-block;width:150px;min-height:30px;padding:4px 8px"></div><div class="yt-grid">${tiles}</div></div>`;
  }
  const hl = S.highlights(from, to, yearKey);
  const hlHtml = `<div class="card"><div class="h3">Главное за ${period === 'w' ? 'неделю' : period === 'm' ? 'месяц' : 'год'}</div>${hl.map((x) => { const [bg, c, ic] = HL_IC[x.icon] || HL_IC.own; return `<div class="hl"><span class="hl-i" style="background:${bg};color:${c}">${ic}</span><div class="t"><b>${esc(x.title)}</b><small>${esc(x.small)}</small></div>${yearKey ? `<span class="dr-del" data-act="hide" data-id="${x.id}">✕</span>` : ''}</div>`; }).join('') || '<p class="small" style="margin:0">Пока пусто: достигнутые цели, значимые события и рекорды привычек появятся здесь сами.</p>'}${yearKey ? '<div class="addrow" style="--c:var(--accent)" data-act="own"><i></i>Добавить своё</div>' : ''}</div>`;
  // цифры: цели
  const goals = S.state.goals.filter((g) => g.createdAt <= to && (g.status === 'active' || (g.achievedAt || g.archivedAt || '') >= from));
  const gHtml = goals.length ? `<div class="blk goals"><div class="bh">${ICON.goal}<b>Цели</b></div><div class="rows">${goals.map((g) => {
    const now = S.goalProgress(g), was = S.goalProgress(g, from), plus = now.pct - was.pct;
    const stepsDone = g.stages.flatMap((s) => s.steps).filter((x) => x.done && x.doneAt >= from && x.doneAt <= to).map((x) => x.title);
    return `<div class="grow" data-go="#/goalcard/${g.id}"><div class="mrow-h"><b>${esc(g.title)}</b><small></small><span style="color:var(--g)">${now.pct}%</span></div><div class="gbar"><i class="now" style="width:${Math.max(1, now.pct)}%"></i>${plus > 0 ? `<i class="tick" style="left:${was.pct}%"></i>` : ''}</div><small class="mrow-s">${plus > 0 ? `было ${was.pct}% → <b class="gplus">+${plus}%</b> · ${esc(stepsDone.join(', '))}` : 'не двигалась'}</small></div>`;
  }).join('')}</div></div>` : '';
  // цифры: привычки
  const habits = S.state.habits.filter((h) => (h.createdAt || '') <= to && (h.status !== 'archived' || (h.archivedAt || '') >= from));
  let hRows = '';
  for (const h of habits) {
    if (period === 'y') { const st = S.habitStats(h, from, to); hRows += `<div class="row"><div class="t"><b>${esc(h.title)}</b><small>${esc(scheduleText(h).split(' · ')[0])} · ${st.done} из ${st.plan} дней${st.minutes >= 60 ? ' · ' + Math.round(st.minutes / 60) + ' ч' : ''}</small><div class="ybar"><i style="width:${st.pct}%"></i></div></div><span class="fact">${st.pct}%</span></div>`; continue; }
    let segs = '', done = 0, plan = 0;
    for (let d = from; d <= to; d = addDays(d, 1)) {
      const sch = S.habitScheduled(h, d), mk = S.habitMark(h, d);
      let c = mk.s === 'done' ? 'ok' : !sch ? 'off' : d > t ? 'fut' : 'no';
      if (sch && d <= t) plan++; if (mk.s === 'done' && sch) done++;
      segs += `<i class="${c}"></i>`;
    }
    if (period === 'w') hRows += `<div class="wrow" data-go="#/habitcard/${h.id}"><div class="t"><b>${esc(h.title)}</b></div><div class="wcells">${segs}</div><span class="wcnt${done === plan && plan ? ' full' : ''}">${done}/${plan}</span></div>`;
    else hRows += `<div class="mrow" data-go="#/habitcard/${h.id}"><div class="mrow-h"><b>${esc(h.title)}</b><small>${esc(scheduleText(h).split(' · ')[0])}</small><span>${plan ? Math.round(done / plan * 100) : 0}%</span></div><div class="mdots" style="grid-template-columns:repeat(${Math.round((parse(to) - parse(from)) / 864e5) + 1},1fr)">${segs}</div><small class="mrow-s">${done} из ${plan} · пропущено ${plan - done}</small></div>`;
  }
  const hHtml = hRows ? `<div class="blk habits"><div class="bh">${ICON.habit}<b>Привычки</b></div><div class="rows">${hRows}</div></div>` : '';
  const tDone = S.state.tasks.filter((x) => x.doneAt && x.doneAt >= from && x.doneAt <= to).length;
  const evs = S.state.events.filter((e) => !e.repeat && e.start >= from && e.start <= to);
  const tHtml = `<div class="blk tasks"><div class="bh">${ICON.task}<b>Задачи</b></div><div class="rows"><div class="row"><div class="t"><b>Выполнено</b></div><span class="fact">${tDone}</span></div></div></div>`;
  const eHtml = evs.length ? `<div class="blk events"><div class="bh">${ICON.event}<b>События</b></div><div class="rows">${evs.map((e) => `<div class="row" data-go="#/eventcard/${e.id}"><div class="t"><b>${esc(e.title)}</b><small>${fmtShort(e.start)}</small></div><span class="chev">›</span></div>`).join('')}</div></div>` : '';
  const rk = period + ':' + (period === 'w' ? from : key), q = { w: 'Что получилось лучше всего?', m: 'Что изменить в следующем месяце?', y: 'Письмо себе через год' }[period];
  const coach = S.state.ai && S.state.ai.key ? `<div class="card"><div class="h3">Помощник</div><p class="small" style="margin:0">Разберёт ${period === 'w' ? 'неделю' : period === 'm' ? 'месяц' : 'год'}: что получилось, где сбивалась, что поменять.</p><span class="link" data-go="#/ai?ask=${encodeURIComponent('Разбор: ' + label)}&from=${from}&to=${to}">Спросить</span></div>` : '';
  const foot = period === 'w' ? `<div class="foot"><button class="btn pri" data-go="#/day/${addDays(from, 7)}">Заполнить следующую неделю</button></div>` : period === 'y' ? `<div class="foot"><button class="btn pri" data-go="#/print?y=${key}">Книга года</button></div>` : '';
  const html = `<section class="scr">${top('Итоги')}<div class="body">
    <div class="seg">${[['w', 'Неделя'], ['m', 'Месяц'], ['y', 'Год']].map(([k, l]) => `<span class="${period === k ? 'on' : ''}" data-go="#/summary/${k}" data-replace>${l}</span>`).join('')}</div>
    <div class="weekhead" style="justify-content:center"><span data-go="#/summary/${period}/${prevKey}" data-replace>‹</span>${label}<span data-go="#/summary/${period}/${nextKey}" data-replace>›</span></div>
    ${cover}${hlHtml}<div class="h3" style="margin-top:6px">Цифры</div>${gHtml}${hHtml}${tHtml}${eHtml}
    <div class="notecard"><b>${q}</b><textarea class="inp area" rows="1" data-refl placeholder="Напиши здесь…">${esc(S.state.reflections[rk] || '')}</textarea></div>
    ${coach}
  </div>${foot}</section>`;
  return {
    html,
    mount(root) {
      autoGrow(root);
      root.querySelector('[data-refl]').addEventListener('input', (e) => S.setReflection(rk, e.target.value));
      const w = root.querySelector('[data-word]'); if (w) w.addEventListener('change', () => { ym.word = w.value.trim(); S.save(); });
    },
    actions: {
      hide: (el, go, render) => { if (el.dataset.id.startsWith('x:')) ym.manual = ym.manual.filter((m) => 'x:' + m.id !== el.dataset.id); else ym.hidden.push(el.dataset.id); S.save(); render(); },
      own: (el, go, render) => { const v = prompt('Что ещё было главным в этом году?'); if (v && v.trim()) { ym.manual.push({ id: uid(), title: v.trim() }); S.save(); render(); } },
    },
  };
}

// ---------- ПРОШЛЫЙ ГОД (до приложения) ----------

export function yearPastScreen(y) {
  const ym = S.yearMeta(y), a = age((S.state.profile || {}).birthDate, y + '-12-31');
  const mem = S.memories(y);
  const cnt = Array(12).fill(0); mem.forEach((m) => cnt[+m.date.slice(5, 7) - 1]++);
  const lvl = (n) => n === 0 ? 'l0' : n <= 1 ? 'l1' : n <= 3 ? 'l2' : n <= 5 ? 'l3' : 'l4';
  const tiles = cnt.map((n, i) => `<div class="yt ${lvl(n)}"><small>${MONTHS_NOM[i].slice(0, 3)}</small><b>${n || '—'}</b></div>`).join('');
  const html = `<section class="scr">${top('Прошлый год')}<div class="body">
    <div class="card yc"><div class="yc-top"><div><small>Год до приложения</small><b>${y}</b></div>${a != null ? `<div class="yc-age"><b>${a}</b><small>${plural(a, 'год', 'года', 'лет')}</small></div>` : ''}</div>
      <div class="yc-word">Слово года — <input class="inp" data-word value="${esc(ym.word)}" placeholder="одно слово" style="display:inline-block;width:150px;min-height:30px;padding:4px 8px"></div>
      <div class="h3" style="font-size:13px;color:var(--muted);font-weight:400">Воспоминания по месяцам · ${mem.length}<span class="link" data-go="#/memories?y=${y}">Раскрыть все</span></div><div class="yt-grid">${tiles}</div></div>
    <div class="card"><div class="h3">Главное за год</div>${ym.manual.map((m) => `<div class="hl"><span class="hl-i" style="background:var(--soft);color:var(--accent)">★</span><div class="t"><b>${esc(m.title)}</b></div><span class="dr-del" data-act="delm" data-id="${m.id}">✕</span></div>`).join('')}<div class="addrow" style="--c:var(--accent)" data-act="own"><i></i>Добавить своё</div></div>
  </div><div class="foot"><button class="btn pri" data-go="#/entry/memory/new?date=${y}-06-01">+ Воспоминание</button></div></section>`;
  return {
    html,
    mount(root) { const w = root.querySelector('[data-word]'); w.addEventListener('change', () => { ym.word = w.value.trim(); S.save(); }); },
    actions: {
      own: (el, go, render) => { const v = prompt('Что было главным в ' + y + '?'); if (v && v.trim()) { ym.manual.push({ id: uid(), title: v.trim() }); S.save(); render(); } },
      delm: (el, go, render) => { ym.manual = ym.manual.filter((m) => m.id !== el.dataset.id); S.save(); render(); },
    },
  };
}
