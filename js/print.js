// Книга года: страницы A4 собираются на телефоне и печатаются (или сохраняются в PDF) системным окном печати.
import * as S from './store.js?v=97';
import { esc, today, addDays, fmtDM, MONTHS_NOM, age } from './util.js?v=97';
import { top, field } from './screens.js?v=97';
import { aiYearText } from './ai.js?v=97';

const opts = { photos: true, cover: true, numbers: true, text: true, goals: true, months: true };

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

const img = async (id) => id ? `<img src="${await S.photoUrl(id, 'full')}">` : '';

async function buildBook(year, myText) {
  const from = year + '-01-01', to = year + '-12-31', p = S.periodPct(from, to), ym = S.yearMeta(year);
  const photos = opts.photos ? await pickPhotos(year) : {};
  const all = Object.values(photos).flat();
  const pages = [];
  if (opts.cover) pages.push(`<section class="pg cover">${all[0] ? await img(all[0]) : ''}<div class="cv"><b>${year}</b><span>${esc(ym.word || '')}</span><small>${esc((S.state.profile || {}).name || '')}</small></div></section>`);
  if (opts.numbers) {
    let tiles = '';
    for (let m = 1; m <= 12; m++) { const mk = year + '-' + String(m).padStart(2, '0'); const st = S.periodPct(mk + '-01', mk + '-' + String(new Date(+year, m, 0).getDate()).padStart(2, '0')); tiles += `<div class="t l${st.total ? Math.min(4, Math.max(1, Math.ceil(st.pct / 25))) : 0}"><small>${MONTHS_NOM[m - 1]}</small><b>${st.total ? st.pct + '%' : '—'}</b></div>`; }
    const hl = S.highlights(from, to, year).map((x) => `<li><b>${esc(x.title)}</b> <span>${esc(x.small)}</span></li>`).join('');
    const habits = S.state.habits.map((h) => { const s = S.habitStats(h, from, to); return s.plan ? `<li><b>${esc(h.title)}</b> <span>${s.done} из ${s.plan} дней · ${s.pct}%</span></li>` : ''; }).join('');
    pages.push(`<section class="pg"><h1>Год в цифрах</h1><p class="big">${p.pct}% <small>выполнено · ${p.done} из ${p.total}</small></p><div class="tiles">${tiles}</div><h2>Главное</h2><ul>${hl || '<li>—</li>'}</ul>${habits ? `<h2>Привычки</h2><ul>${habits}</ul>` : ''}</section>`);
  }
  if (opts.text && myText) pages.push(`<section class="pg"><h1>Мой ${year}</h1>${myText.split(/\n+/).map((x) => `<p>${esc(x)}</p>`).join('')}${S.state.reflections['y:' + year] ? `<h2>Письмо себе через год</h2><p>${esc(S.state.reflections['y:' + year])}</p>` : ''}</section>`);
  if (opts.goals) {
    const goals = S.state.goals.filter((g) => g.createdAt <= to);
    if (goals.length) pages.push(`<section class="pg"><h1>Цели</h1>${goals.map((g) => { const pr = S.goalProgress(g), hs = S.goalHabits(g), hst = S.goalHabitStats(g), ms = S.goalMeasure(g); if (ms) return `<h2>${esc(g.title)} <small>${g.status === 'achieved' ? 'достигнута ' + fmtDM(g.achievedAt) : ''}</small></h2><p>${ms.start} → ${ms.cur} из ${ms.target}${ms.unit ? ' ' + esc(ms.unit) : ''}${hs.length ? ' · через привычки ' + esc(hs.map((h) => h.title).join(', ')) : ''}</p>`; if (!pr.total) return `<h2>${esc(g.title)} <small>${g.status === 'achieved' ? 'достигнута ' + fmtDM(g.achievedAt) : ''}</small></h2>${hs.length ? `<p>Через привычку ${esc(hs.map((h) => h.title).join(', '))}${hst.minutes ? ' · ' + Math.round(hst.minutes / 60) + ' ч' : hst.days ? ' · занятий: ' + hst.days : ''}</p>` : ''}`; return `<h2>${esc(g.title)} <small>${g.status === 'achieved' ? 'достигнута ' + fmtDM(g.achievedAt) : pr.pct + '%'}</small></h2><ul>${g.stages.map((st) => `<li><b>${esc(st.title)}</b>: ${st.steps.map((x) => (x.done ? '✓ ' : '') + esc(x.title)).join(', ')}</li>`).join('')}</ul>`; }).join('')}</section>`);
  }
  if (opts.months) {
    const mem = S.memories(year).reverse();
    if (mem.length) pages.push('<h1 class="pgh">По месяцам</h1>');
    for (let m = 1; m <= 12; m++) {
      const k = String(m).padStart(2, '0'), list = mem.filter((x) => x.date.slice(5, 7) === k);
      if (!list.length) continue;
      const ph = (photos[k] || []);
      pages.push(`<section class="pg mon"><h2 class="mh">${MONTHS_NOM[m - 1]}</h2>${ph.length ? `<div class="phs">${(await Promise.all(ph.map(img))).join('')}</div>` : ''}<ul class="mem">${list.map((x) => `<li><small>${fmtDM(x.date)}</small> ${x.kind === 'event' ? `<b>${esc(x.event.title)}.</b> ` : x.title ? `<b>${esc(x.title)}.</b> ` : ''}${esc(x.text || '')}</li>`).join('')}</ul></section>`);
    }
  }
  if (opts.photos && all.length > 2) pages.push(`<section class="pg"><h1>Лучшие кадры</h1><div class="collage">${(await Promise.all(all.slice(0, 12).map(img))).join('')}</div></section>`);
  // Обложка — отдельный лист, остальное идёт сплошным потоком без пустых мест.
  const cover = opts.cover ? pages.shift() : '';
  return (cover || '<style>@page :first { margin: 15mm 16mm }</style>') + `<div class="flow">${pages.join('')}</div>`;
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
    <p class="small" style="margin:0">Книга собирается на телефоне по одному шаблону. Нажми «Создать PDF» — откроется окно печати: можно распечатать или «Поделиться» → «Сохранить в Файлы» как PDF.</p>
    <div class="field"><label>Фото</label><div class="seg"><span class="${opts.photos ? 'on' : ''}" data-act="ph" data-v="1">С фото</span><span class="${!opts.photos ? 'on' : ''}" data-act="ph" data-v="0">Без фото</span></div><small class="small">1–2 кадра на месяц: сначала значимые события и поездки. В конце — коллаж лучших кадров.</small></div>
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
      const ta = root.querySelector('[data-mytext]');
      const fit = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 2 + 'px'; }; fit();
      ta.addEventListener('input', () => { fit(); S.yearMeta(year).text = ta.value; S.save(); });
    },
    actions: {
      opt: (el) => { opts[el.dataset.k] = !opts[el.dataset.k]; el.querySelector('.ck').classList.toggle('done', opts[el.dataset.k]); },
      ph: (el, go, render) => { opts.photos = el.dataset.v === '1'; render(); },
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
        el.textContent = 'Собираю…';
        const box = document.getElementById('print');
        box.innerHTML = await buildBook(year, rootEl.querySelector('[data-mytext]').value.trim());
        await Promise.all([...box.querySelectorAll('img')].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })));
        el.textContent = 'Создать PDF';
        window.print();
      },
    },
  };
}
