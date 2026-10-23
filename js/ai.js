// Помощник: Claude API прямо из телефона по ключу владелицы. Ничего не меняет сам — только предлагает.
import Anthropic from '../vendor/anthropic-sdk-0.131.0.js';
import * as S from './store.js?v=94';
import { esc, today, addDays, weekStart, fmtShort, fmtMin, WD_ACC, wd } from './util.js?v=94';
import { top } from './screens.js?v=94';

function client() {
  const key = (S.state.ai || {}).key;
  if (!key) throw new Error('Нет ключа — добавь его в настройках');
  return new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
}

// Структурированный ответ: JSON по схеме в output_config.format.
async function ask(system, user, schema) {
  const res = await client().beta.messages.create({
    model: (S.state.ai || {}).model || 'claude-opus-5-5',
    max_tokens: 8000,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system,
    messages: [{ role: 'user', content: user }],
  });
  if (res.stop_reason === 'refusal') throw new Error('помощник отказался отвечать на этот запрос');
  const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return JSON.parse(text);
}

const SYSTEM = `Ты — бережный помощник в личном приложении для планирования жизни «Привычки твоей жизни». Пользовательница — одна, пишет по-русски, обращайся на «ты», в женском роде. Отвечай коротко и по делу, без воды и без нравоучений. Предлагай, но не навязывай: в дни попадает только то, что она подтвердит.`;

export async function aiBreakdownGoal(title, description, deadline) {
  const out = await ask(SYSTEM, `Разбей цель на 2–4 этапа и по 2–5 конкретных шагов в каждом. У шага — оценка времени в минутах (15–180).\nЦель: ${title}\n${description ? 'Описание: ' + description + '\n' : ''}${deadline ? 'Срок: ' + deadline + '\n' : ''}Сегодня ${today()}.`, {
    type: 'object', additionalProperties: false, required: ['stages'],
    properties: { stages: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['title', 'steps'], properties: {
      title: { type: 'string' }, steps: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['title', 'minutes'], properties: { title: { type: 'string' }, minutes: { type: 'integer' } } } } } } } },
  });
  return out.stages;
}

// Сводка данных для вопроса: план ближайших 14 дней, что можно поставить, как шла последняя неделя.
function context(from, to) {
  const lines = [];
  const ws = weekStart(today());
  lines.push('Сегодня: ' + fmtShort(today()) + ' (' + today() + ').');
  lines.push('\nПлан на 14 дней (дата: дела; ≈ время):');
  for (let i = 0; i < 14; i++) {
    const d = addDays(today(), i), st = S.dayStats(d);
    const min = st.items.reduce((m, it) => m + (S.kindOf(it) === 'duration' ? S.targetOf(it) || 0 : it.type === 't' ? it.ref.duration || 0 : 0), 0);
    lines.push(`${d} ${fmtShort(d)}: ${st.items.map((it) => S.itemTitle(it)).join(', ') || '—'}${min ? ' ≈ ' + fmtMin(min) : ''}`);
  }
  lines.push('\nМожно поставить в дни (id: название · длительность):');
  for (const g of S.state.goals.filter((x) => x.status === 'active')) for (const st of g.stages) for (const x of st.steps) if (!x.done) lines.push(`step:${g.id}:${x.id}: ${x.title} (цель «${g.title}», ${st.title})${x.duration ? ' · ' + x.duration + ' мин' : ''}`);
  for (const t of S.state.tasks.filter((x) => x.status === 'open' && !x.repeat && !x.date)) lines.push(`task:${t.id}: ${t.title}${t.duration ? ' · ' + t.duration + ' мин' : ''}${t.deadline ? ' · срок ' + t.deadline : ''}`);
  const a = from || addDays(ws, -7), b = to || addDays(ws, -1);
  lines.push(`\nКак шли привычки ${a}…${b}:`);
  for (const h of S.state.habits.filter((x) => x.status !== 'archived')) { const s = S.habitStats(h, a, b); lines.push(`${h.title}: ${s.done} из ${s.plan} (${s.pct}%)`); }
  const p = S.periodPct(a, b); lines.push(`Всего за период выполнено ${p.done} из ${p.total} (${p.pct}%).`);
  for (let d = a; d <= b; d = addDays(d, 1)) { const dd = S.day(d); if (dd.memory) lines.push(`${d} запомнилось: ${dd.memory}`); }
  return lines.join('\n');
}

const REPLY_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['text', 'proposals'],
  properties: {
    text: { type: 'string', description: 'Ответ пользовательнице, 1–6 коротких предложений' },
    proposals: { type: 'array', description: 'Что поставить в дни; пусто, если не просили', items: { type: 'object', additionalProperties: false, required: ['ref', 'date', 'title'], properties: { ref: { type: 'string', description: 'id из списка «Можно поставить в дни», например task:abc или step:g:s' }, date: { type: 'string', description: 'YYYY-MM-DD' }, title: { type: 'string' } } } },
  },
};

let chat = [];
const friendly = (e) => e.status === 401 ? 'ключ не подходит — проверь его в настройках.' : e.status === 429 ? 'слишком много запросов, попробуй через минуту.' : e.status >= 500 ? 'сервис временно недоступен, попробуй позже.' : /fetch|network/i.test(e.message) ? 'нет интернета.' : e.message;

export function aiScreen(params) {
  const preset = params.get('ask');
  const msgs = () => chat.map((m) => m.role === 'me' ? `<div class="msg me">${esc(m.text)}</div>` : m.role === 'wait' ? '<div class="msg bot">Думаю…</div>'
    : `<div class="msg bot">${esc(m.text)}</div>${m.proposals && m.proposals.length ? `<div class="ai-card">${m.proposals.map((p, i) => `<div class="ai-it" data-act="psel" data-m="${chat.indexOf(m)}" data-i="${i}"><span class="ck sq ${p.on ? 'done' : ''}"></span><div class="t"><b>${esc(p.title)}</b></div><span class="ai-day-chip">${fmtShort(p.date).slice(0, 2)}, ${+p.date.slice(8)}</span></div>`).join('')}<div class="ai-act">${m.applied ? '<span class="small">Добавлено в дни ✓</span>' : `<span></span><button class="btn pri sm" data-act="apply" data-m="${chat.indexOf(m)}">Добавить ${m.proposals.filter((p) => p.on).length} в дни</button>`}</div></div>` : ''}`).join('');
  const chips = ['Заполни мне следующую неделю', 'Разбор прошлой недели', 'Где я перегружена?', 'Что мне мешает с привычками?'];
  const html = `<section class="scr">${top('✦ Помощник')}<div class="body"><div class="chat" data-chat>${msgs() || '<p class="small">Спроси что угодно про свои планы. Помощник видит план на 2 недели, задачи без даты, шаги целей и как шли привычки. Предложения добавляются в дни только после твоего «Добавить».</p>'}</div></div>
    <div class="ai-foot"><div class="ai-chips">${chips.map((c) => `<span data-act="chip">${c}</span>`).join('')}</div><div class="ai-input"><textarea class="inp" rows="1" data-q placeholder="Спроси или попроси…"></textarea><button class="ai-send" data-act="send"><svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg></button></div></div></section>`;
  let rootEl;
  const redraw = () => { rootEl.querySelector('[data-chat]').innerHTML = msgs(); const b = rootEl.querySelector('.body'); b.scrollTop = b.scrollHeight; };
  const send = async (q) => {
    if (!q.trim()) return;
    chat.push({ role: 'me', text: q }); chat.push({ role: 'wait' }); redraw();
    try {
      const hist = chat.filter((m) => m.role !== 'wait').slice(-8).map((m) => (m.role === 'me' ? 'Она: ' : 'Ты: ') + m.text).join('\n');
      const out = await ask(SYSTEM, `${context(params.get('from'), params.get('to'))}\n\nРазговор:\n${hist}\n\nОтветь на последний вопрос. Если просят заполнить дни — предложи конкретные id и даты из списка «Можно поставить в дни», не ставь больше ≈3 ч дел в день и учитывай уже запланированное.`, REPLY_SCHEMA);
      chat.pop();
      chat.push({ role: 'bot', text: out.text, proposals: (out.proposals || []).filter((p) => /^(task|step):/.test(p.ref) && /^\d{4}-\d{2}-\d{2}$/.test(p.date) && p.date >= today()).map((p) => ({ ...p, on: true })) });
    } catch (e) { chat.pop(); chat.push({ role: 'bot', text: 'Не получилось: ' + friendly(e) }); }
    redraw();
  };
  return {
    html,
    mount(root) {
      rootEl = root; redraw();
      const ta = root.querySelector('[data-q]');
      ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 2 + 'px'; });
      if (preset && !chat.some((m) => m.text === preset)) send(preset);
    },
    actions: {
      chip: (el) => send(el.textContent),
      send: () => { const ta = rootEl.querySelector('[data-q]'); const v = ta.value; ta.value = ''; send(v); },
      psel: (el) => { const p = chat[+el.dataset.m].proposals[+el.dataset.i]; p.on = !p.on; redraw(); },
      apply: (el) => {
        const m = chat[+el.dataset.m];
        for (const p of m.proposals.filter((x) => x.on)) {
          const [kind, a, b] = p.ref.split(':');
          if (kind === 'task' && S.taskById(a)) S.addTaskToDay(p.date, a);
          if (kind === 'step' && S.findStep(a, b)) S.addStepToDay(p.date, a, b);
        }
        m.applied = true; redraw();
      },
    },
  };
}

// Текст «Мой год» для книги года.
export async function aiYearText(year) {
  const from = year + '-01-01', to = year + '-12-31';
  const hl = S.highlights(from, to, year).map((x) => '- ' + x.title + ' (' + x.small + ')').join('\n');
  const mem = S.memories(year).slice(0, 60).map((m) => '- ' + m.date + ': ' + (m.kind === 'event' ? m.event.title + '. ' : '') + (m.text || '')).join('\n');
  const out = await ask(SYSTEM, `Напиши тёплый связный текст «Мой ${year}» от первого лица (женский род), 150–250 слов, без пафоса, по фактам ниже. Слово года: ${S.yearMeta(year).word || 'не задано'}.\nГлавное:\n${hl}\nВоспоминания:\n${mem}`, { type: 'object', additionalProperties: false, required: ['text'], properties: { text: { type: 'string' } } });
  return out.text;
}
