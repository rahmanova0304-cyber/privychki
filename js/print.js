// Книга года: страницы A4 собираются на телефоне и печатаются (или сохраняются в PDF) системным окном печати.
import * as S from './store.js?v=127';
import { esc, today, addDays, fmtDM, MONTHS_NOM, age } from './util.js?v=127';
import { top, field } from './screens.js?v=127';
import { aiYearText } from './ai.js?v=127';

const opts = { photos: true, cover: true, numbers: true, text: true, goals: true, months: true };

// все фото года (из воспоминаний) — для выбора обложки
function yearPhotos(year) { return [...new Set(S.memories(year).flatMap((m) => m.photos))]; }

async function pickPhotos(year) {
  // 1–2 фото на месяц: сначала значимые события и поездки, потом остальные воспоминания.
  const byMonth = {};
  for (const m of S.memories(year)) {
    if (!m.photos.length) continue;
    const k = m.date.slice(5, 7);
    (byMonth[k] = byMonth[k] || []).push({ id: m.photos[0], w: m.significant ? 2 : m.kind === 'event' ? 1 : 0 });
  }
  const out = {};
  for (const [k, list] of Object.entries(byMonth)) out[k] = list.sort((a, b) => b.w - a.w).slice(0, 2).map((x) => x.id);
  return out;
}

// переносы строк — явными <br> (html2canvas не рисует текст с white-space: pre-line)
const nl = (t) => esc(t).replace(/\n/g, '<br>');
const img = async (id) => id ? `<img src="${await S.photoUrl(id, 'full')}">` : '';

// Поездка в книге — одним пунктом: даты, дорога, жильё, записи по дням и итоговая сумма.
const rub = (n) => Number(n).toLocaleString('ru-RU') + ' ₽';
function bookItems(list) {
  const out = [], trips = new Map();
  for (const x of list) {
    if (x.kind === 'event' && (x.day || x.summary)) {
      if (!trips.has(x.event.id)) { const t = { trip: true, event: x.event, date: x.event.start, days: [] }; trips.set(x.event.id, t); out.push(t); }
      if (x.day) trips.get(x.event.id).days.push(x);
    } else out.push(x);
  }
  return out;
}
// Фото — рядом со своим текстом, рядом в строку, каждое в своих пропорциях (без обрезки).
// Фото — справа от текста: одно крупно, несколько — сеткой в две колонки. Не больше 4.
async function phRow(ids, n = 4) {
  if (!opts.photos || !ids || !ids.length) return '';
  const list = ids.slice(0, n);
  return `<div class="bphs n${Math.min(list.length, 2)}">${(await Promise.all(list.map(img))).join('')}</div>`;
}
// блок: шапка сверху, ниже текст слева и фото справа
const wrapBm = (cls, head, body, ph) => `<div class="bm ${cls}${ph ? ' hasph' : ''}">${head}${ph ? `<div class="bcols"><div class="btxt">${body}</div>${ph}</div>` : body}</div>`;
const enLine = (x) => { const p = x.place && x.place.name ? x.place : null; return `<div class="ben">${x.time || p ? `<small>${[x.time, p ? [p.kind, p.name].filter(Boolean).join(' · ') : ''].filter(Boolean).join(' · ')}${p && p.price ? ' · ' + rub(p.price) : ''}</small>` : ''}${x.text ? `<p>${nl(x.text)}</p>` : ''}</div>`; };
async function memBlock(x) {
  const title = x.kind === 'event' ? x.event.title : x.title;
  const body = x.kind === 'event' ? (x.dayMemory ? `<div class="ben"><p>${nl(x.dayMemory)}</p></div>` : '') + x.entries.map(enLine).join('') : x.text ? `<div class="ben"><p>${nl(x.text)}</p></div>` : '';
  return wrapBm('', `<div class="bh"><small>${fmtDM(x.date)}</small>${title ? `<b>${esc(title)}</b>` : ''}${x.significant ? '<span>★</span>' : ''}</div>`, body, await phRow(x.photos));
}
async function tripBlock(t) {
  const e = t.event, legs = e.legs || [], stay = (e.places || []).filter((p) => p.name || p.address), tot = S.eventTotal(e).total;
  const info = legs.map((l) => `<div class="brow"><span>${esc(l.route || l.transport)}<small>${esc(l.transport.toLowerCase())}${l.datetime ? ' · ' + fmtDM(l.datetime.slice(0, 10)) + ', ' + l.datetime.slice(11, 16) : ''}</small></span>${l.price ? `<b>${rub(l.price)}</b>` : ''}</div>`).join('')
    + stay.map((p) => `<div class="brow"><span>${esc(p.name || p.address)}<small>жильё</small></span>${p.price ? `<b>${rub(p.price)}</b>` : ''}</div>`).join('')
    + (tot ? `<div class="brow btot"><span>Вся поездка</span><b>${rub(tot)}</b></div>` : '');
  const n = Math.round((new Date(e.end) - new Date(e.start)) / 864e5) + 1;
  const days = [];
  for (const d of t.days.slice().sort((a, b) => a.day.localeCompare(b.day))) {
    const k = Math.round((new Date(d.day) - new Date(e.start)) / 864e5) + 1;
    days.push(`<div class="bm bday"><div class="bh"><small>${fmtDM(d.day)}</small><b>День ${k} из ${n}</b></div>${d.dayMemory ? `<div class="ben"><p>${nl(d.dayMemory)}</p></div>` : ''}${d.entries.map(enLine).join('')}${await phRow(d.photos)}</div>`);
  }
  const head = `<div class="bm bthead"><div class="bh"><small>${fmtDM(e.start)} – ${fmtDM(e.end)} · поездка</small><b>${esc(e.title)}</b>${e.significant ? '<span>★</span>' : ''}</div>${info ? `<div class="binfo">${info}</div>` : ''}</div>`;
  // шапка поездки и первый день — одним неразрывным куском, чтобы шапка не оставалась одна внизу листа
  return `<div class="btrip"><div class="bgrp">${head}${days[0] || ''}</div>${days.slice(1).join('')}</div>`;
}

async function buildBook(year, myText) {
  const from = year + '-01-01', to = year + '-12-31', p = S.periodPct(from, to), ym = S.yearMeta(year);
  const photos = opts.photos ? await pickPhotos(year) : {};
  const all = Object.values(photos).flat(); // для обложки
  const pages = [];
  const coverId = ym.cover && yearPhotos(year).includes(ym.cover) ? ym.cover : all[0];
  const coverUrl = coverId ? await S.photoUrl(coverId, 'full') : '';
  if (opts.cover) pages.push(`<section class="pg cover">${coverUrl ? `<div class="cvimg" style="background-image:url(${coverUrl})"></div>` : ''}<div class="cv"><b>${year}</b><span>${esc(ym.word || '')}</span><small>${esc((S.state.profile || {}).name || '')}</small></div></section>`);
  if (opts.numbers) {
    let tiles = '';
    for (let m = 1; m <= 12; m++) { const mk = year + '-' + String(m).padStart(2, '0'); const st = S.periodPct(mk + '-01', mk + '-' + String(new Date(+year, m, 0).getDate()).padStart(2, '0')); tiles += `<div class="t l${st.total ? Math.min(4, Math.max(1, Math.ceil(st.pct / 25))) : 0}"><small>${MONTHS_NOM[m - 1]}</small><b>${st.total ? st.pct + '%' : '—'}</b></div>`; }
    const hl = S.highlights(from, to, year).map((x) => `<li><b>${esc(x.title)}</b> <span>${esc(x.small)}</span></li>`).join('');
    const habits = S.state.habits.map((h) => { const s = S.habitStats(h, from, to); return s.plan ? `<li><b>${esc(h.title)}</b> <span>${s.done} из ${s.plan} дней · ${s.pct}%</span></li>` : ''; }).join('');
    pages.push(`<section class="pg"><h1>Год в цифрах</h1><p class="big">${p.pct}% <small>выполнено · ${p.done} из ${p.total}</small></p><div class="tiles">${tiles}</div><h2>Главное</h2><ul>${hl || '<li>—</li>'}</ul>${habits ? `<h2>Привычки</h2><ul>${habits}</ul>` : ''}</section>`);
  }
  if (opts.text && myText) pages.push(`<section class="pg"><h1>Мой ${year}</h1>${myText.split(/\n+/).map((x) => `<p>${nl(x)}</p>`).join('')}${S.state.reflections['y:' + year] ? `<h2>Письмо себе через год</h2><p>${nl(S.state.reflections['y:' + year])}</p>` : ''}</section>`);
  if (opts.goals) {
    const goals = S.state.goals.filter((g) => g.createdAt <= to);
    if (goals.length) pages.push(`<section class="pg"><h1>Цели</h1>${goals.map((g) => { const pr = S.goalProgress(g), hs = S.goalHabits(g), hst = S.goalHabitStats(g), ms = S.goalMeasure(g); if (ms) return `<h2>${esc(g.title)} <small>${g.status === 'achieved' ? 'достигнута ' + fmtDM(g.achievedAt) : ''}</small></h2><p>${ms.start} → ${ms.cur} из ${ms.target}${ms.unit ? ' ' + esc(ms.unit) : ''}${hs.length ? ' · через привычки ' + esc(hs.map((h) => h.title).join(', ')) : ''}</p>`; if (!pr.total) return `<h2>${esc(g.title)} <small>${g.status === 'achieved' ? 'достигнута ' + fmtDM(g.achievedAt) : ''}</small></h2>${hs.length ? `<p>Через привычку ${esc(hs.map((h) => h.title).join(', '))}${hst.minutes ? ' · ' + Math.round(hst.minutes / 60) + ' ч' : hst.days ? ' · занятий: ' + hst.days : ''}</p>` : ''}`; return `<h2>${esc(g.title)} <small>${g.status === 'achieved' ? 'достигнута ' + fmtDM(g.achievedAt) : pr.pct + '%'}</small></h2><ul>${g.stages.map((st) => `<li><b>${esc(st.title)}</b>: ${st.steps.map((x) => (x.done ? '✓ ' : '') + esc(x.title)).join(', ')}</li>`).join('')}</ul>`; }).join('')}</section>`);
  }
  if (opts.months) {
    const mem = S.memories(year).reverse();
    for (let m = 1; m <= 12; m++) {
      const k = String(m).padStart(2, '0'), list = mem.filter((x) => x.date.slice(5, 7) === k);
      if (!list.length) continue;
      let blocks = '';
      for (const x of bookItems(list)) blocks += x.trip ? await tripBlock(x) : await memBlock(x);
      pages.push(`<section class="pg mon"><h2 class="mh">${MONTHS_NOM[m - 1]}</h2>${blocks}</section>`);
    }
  }
  // Обложка — отдельный лист, остальное идёт сплошным потоком без пустых мест.
  const cover = opts.cover ? pages.shift() : '';
  return cover + `<div class="flow">${pages.join('')}</div>`;
}

// Раскладка по страницам: всё, что не помещается в остаток листа (блок, фото, заголовок), уходит на новый лист.
// Лист A4 с полями 12 мм сверху/снизу — рабочая высота 273 мм. PDF собирает само приложение, поэтому границы точные.
function paginate(box, Hmm) {
  box.querySelectorAll('.pb').forEach((x) => x.remove());
  const px = (mm) => mm * 96 / 25.4, H = px(Hmm);
  const y0 = () => box.getBoundingClientRect().top;
  const rect = (el) => { const r = el.getBoundingClientRect(), o = y0(); return { t: r.top - o, b: r.bottom - o }; };
  let start = 0;
  const brk = (el) => { const d = document.createElement('div'); d.className = 'pb'; el.parentNode.insertBefore(d, el); start = rect(el).t; };
  const kids = (el) => [...el.children].filter((k) => k.offsetHeight > 0 && !k.classList.contains('pb') && !k.classList.contains('cv'));
  const place = (el, force) => {
    let { t, b } = rect(el);
    if (force && t > start + 1) { brk(el); ({ t, b } = rect(el)); }
    if (b - start <= H) return;
    if (b - t <= H) { brk(el); return; }
    const ks = kids(el);
    if (ks.length && !el.classList.contains('bcols')) { ks.forEach((k) => place(k)); return; }
    while (b - start > H) start += H; // огромный текст — пусть перенесётся сам
  };
  const secs = [...box.querySelectorAll(':scope > .pg, :scope > .flow > .pg')];
  secs.forEach((sec, i) => place(sec, i > 0 && (sec.classList.contains('mon') || secs[i - 1].classList.contains('cover'))));
}

// Разрезать книгу по разрывам .pb на отдельные листы: всё после разрыва переезжает в копию «родителей».
function splitPages(box) {
  const pages = [];
  let rest = box;
  for (const m of [...box.querySelectorAll('.pb')]) {
    const root = rest, next = root.cloneNode(false);
    next.removeAttribute('id'); next.classList.remove('measure');
    let child = m, parent = m.parentNode, carry = null;
    for (;;) {
      const clone = parent === root ? next : parent.cloneNode(false);
      if (carry) clone.appendChild(carry);
      for (let sib = child.nextSibling; sib;) { const n = sib.nextSibling; clone.appendChild(sib); sib = n; }
      if (child === m) m.remove();
      if (parent === root) break;
      carry = clone; child = parent; parent = parent.parentNode;
    }
    pages.push(root); rest = next;
  }
  pages.push(rest);
  return pages;
}

const loaded = {};
const loadScript = (src) => loaded[src] || (loaded[src] = new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = src; sc.onload = res; sc.onerror = () => { delete loaded[src]; rej(new Error('Не загрузилась библиотека PDF')); }; document.head.appendChild(sc); }));

// PDF собирается в приложении: каждый лист рисуется картинкой и кладётся на страницу A4. Печать iPhone не участвует —
// поэтому нет его серой строки с адресом, и листы режутся ровно там, где решило приложение.
async function makePdf(year, myText, progress) {
  await Promise.all([loadScript('vendor/html2canvas-1.4.1.min.js'), loadScript('vendor/jspdf-2.5.1.umd.min.js')]);
  const box = document.getElementById('print');
  box.className = 'book measure';
  box.innerHTML = await buildBook(year, myText);
  await Promise.all([...box.querySelectorAll('img')].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })));
  paginate(box, 273);
  const pages = splitPages(box);
  const holder = document.createElement('div'); holder.className = 'bkpages';
  document.body.appendChild(holder);
  const pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true });
  try {
    for (let i = 0; i < pages.length; i++) {
      progress(i + 1, pages.length);
      const pg = pages[i]; pg.removeAttribute('id'); pg.classList.remove('measure');
      const w = document.createElement('div');
      w.className = 'bkpage' + (pg.querySelector('.pg.cover') ? ' bkcover' : '');
      w.appendChild(pg); holder.replaceChildren(w);
      const canvas = await window.html2canvas(w, { scale: 2, backgroundColor: '#ffffff', logging: false, windowWidth: 900, windowHeight: 1300, scrollX: 0, scrollY: 0 });
      if (i) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 210, 297);
    }
  } finally { holder.remove(); box.innerHTML = ''; box.className = 'book'; }
  return { file: new File([pdf.output('blob')], 'Книга ' + year + '.pdf', { type: 'application/pdf' }), n: pages.length };
}

function bookText(year) {
  const from = year + '-01-01', to = year + '-12-31';
  const lines = [`Мой ${year}`, 'Слово года: ' + (S.yearMeta(year).word || '—'), '', 'Главное:'];
  S.highlights(from, to, year).forEach((x) => lines.push('— ' + x.title + ' (' + x.small + ')'));
  lines.push('', 'Воспоминания:');
  S.memories(year).reverse().forEach((m) => lines.push(m.date + ' — ' + (m.kind === 'event' ? m.event.title + '. ' : '') + (m.text || '')));
  return lines.join('\n');
}

export function printScreen(params) {
  const year = params.get('y') || today().slice(0, 4);
  let myText = (S.yearMeta(year).text) || '';
  const row = (k, t, s) => `<div class="row" data-act="opt" data-k="${k}"><span class="ck sq ${opts[k] ? 'done' : ''}"></span><div class="t"><b>${t}</b>${s ? `<small>${s}</small>` : ''}</div></div>`;
  const html = `<section class="scr">${top('Книга года ' + year)}<div class="body">
    <p class="small" style="margin:0">Книга собирается на телефоне по одному шаблону. Нажми «Создать PDF» — приложение соберёт файл A4, потом «Поделиться PDF» → «Сохранить в Файлы», отправить или распечатать.</p>
    <div class="field"><label>Фото</label><div class="seg"><span class="${opts.photos ? 'on' : ''}" data-act="ph" data-v="1">С фото</span><span class="${!opts.photos ? 'on' : ''}" data-act="ph" data-v="0">Без фото</span></div><small class="small">Фото стоят справа от своих записей: до 4 на воспоминание или день поездки. </small></div>
    ${(() => { const ids = yearPhotos(year); if (!ids.length) return ''; const cur = S.yearMeta(year).cover && ids.includes(S.yearMeta(year).cover) ? S.yearMeta(year).cover : null; return `<div class="field"><label>Фото на обложку</label><div class="bk-cv">${ids.map((id, i) => `<div class="ph${(cur ? id === cur : false) ? ' on' : ''}" data-photo-pick="${id}" data-act="cover" data-id="${id}"></div>`).join('')}</div><small class="small">${cur ? 'Выбрано своё фото.' : 'Нажми на фото, чтобы поставить его на обложку. Пока стоит фото из самого значимого события.'}</small></div>`; })()}
    <div class="card plain"><div class="h3">Что включить</div><div class="rows">
      ${row('cover', 'Обложка и слово года')}${row('numbers', 'Год в цифрах', 'месяцы, главное, привычки за год')}${row('text', 'Текст «Мой ' + year + '»', S.state.ai && S.state.ai.key ? 'напишет помощник, можно поправить' : 'напиши сама ниже')}${row('goals', 'Цели и путь к ним')}${row('months', 'По месяцам: события и воспоминания')}
    </div></div>
    ${field('Текст «Мой ' + year + '»', `<textarea class="inp area" rows="3" data-mytext placeholder="Каким был этот год…">${esc(myText)}</textarea>${S.state.ai && S.state.ai.key ? '<span class="link" data-act="aitext">✦ Написать с помощником</span>' : ''}`)}
  </div><div class="foot"><button class="btn" data-act="txt">Текстом</button><button class="btn pri" data-act="pdf">Создать PDF</button></div></section>`;
  let rootEl;
  return {
    html,
    mount(root) {
      rootEl = root;
      // превью для выбора обложки (не через data-photo, чтобы нажатие не открывало просмотр)
      root.querySelectorAll('[data-photo-pick]').forEach(async (el) => { const u = await S.photoUrl(el.dataset.photoPick); if (u) el.style.background = `url(${u}) center / cover`; });
      const ta = root.querySelector('[data-mytext]');
      const fit = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 2 + 'px'; }; fit();
      ta.addEventListener('input', () => { fit(); S.yearMeta(year).text = ta.value; S.save(); });
    },
    actions: {
      opt: (el) => { opts[el.dataset.k] = !opts[el.dataset.k]; el.querySelector('.ck').classList.toggle('done', opts[el.dataset.k]); },
      ph: (el, go, render) => { opts.photos = el.dataset.v === '1'; render(); },
      cover: (el, go, render) => { const ym = S.yearMeta(year); ym.cover = ym.cover === el.dataset.id ? null : el.dataset.id; S.save(); render(); },
      aitext: async (el) => {
        el.textContent = 'Пишу…';
        try { const t = await aiYearText(year); const ta = rootEl.querySelector('[data-mytext]'); ta.value = t; S.yearMeta(year).text = t; S.save(); ta.dispatchEvent(new Event('input')); }
        catch (e) { alert('Помощник не ответил: ' + e.message); }
        el.textContent = '✦ Написать с помощником';
      },
      txt: async () => {
        const name = 'moy-' + year + '.txt', file = new File([bookText(year)], name, { type: 'text/plain' });
        try { if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file] }); else { const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; a.click(); } } catch (e) { /* закрыли окно */ }
      },
      pdf: async (el) => {
        if (el._file) { // готовый PDF — отдать в «Поделиться» (нужно отдельное нажатие: так требует iPhone)
          const f = el._file;
          try { if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f] }); else { const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; a.click(); } } catch (e) { /* закрыли окно */ }
          return;
        }
        el.disabled = true;
        try {
          const { file, n } = await makePdf(year, rootEl.querySelector('[data-mytext]').value.trim(), (i, k) => { el.textContent = 'Собираю ' + i + ' из ' + k + '…'; });
          el._file = file; el.textContent = 'Поделиться PDF · ' + n + ' стр.';
        } catch (e) { alert('Не получилось собрать PDF: ' + e.message); el.textContent = 'Создать PDF'; }
        el.disabled = false;
      },
    },
  };
}
