// Запуск приложения: загрузка данных, переходы между экранами, нажатия.
import * as S from './store.js?v=79';
import * as V from './screens.js?v=79';
import * as W from './screens2.js?v=79';
import { aiScreen } from './ai.js?v=79';
import { printScreen } from './print.js?v=79';
import { today } from './util.js?v=79';

const app = document.getElementById('app');
let current = null, currentRoute = '';

function route() {
  const raw = location.hash.slice(1) || '/';
  const [path, query] = raw.split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const params = new URLSearchParams(query || '');
  const p = S.state.profile;
  if (!p || !p.onboarded) {
    const ob = { welcome: V.welcomeScreen, install: V.installScreen, profile: V.profileScreen, dreams: V.dreamsScreen, intro: V.introScreen };
    if (!ob[parts[0]]) return V.welcomeScreen();
    return ob[parts[0]]();
  }
  switch (parts[0]) {
    case 'list': return V.listScreen();
    case 'life': return V.lifeScreen();
    case 'pick': return V.pickScreen(parts[1], parts[2]);
    case 'mark': return V.markScreen(parts[1], parts[2]);
    case 'habit': return V.habitScreen(parts[1], params);
    case 'task': return V.taskScreen(parts[1], params);
    case 'settings': return V.settingsScreen();
    case 'backup': return V.backupScreen();
    case 'day': return V.dayScreen(parts[1] || today());
    case 'goal': return W.goalEditScreen(parts[1], params);
    case 'goalcard': return W.goalCardScreen(parts[1]);
    case 'habitcard': return W.habitCardScreen(parts[1]);
    case 'event': return W.eventEditScreen(parts[1], params);
    case 'eventcard': return W.eventCardScreen(parts[1]);
    case 'entry': return W.entryScreen(parts[1], parts[2], params);
    case 'memories': return W.memoriesScreen(params);
    case 'search': return W.searchScreen();
    case 'dream': return W.dreamScreen(parts[1]);
    case 'summary': return W.summaryScreen(parts[1] || 'w', parts[2]);
    case 'year': return +parts[1] < +S.state.createdAt.slice(0, 4) ? W.yearPastScreen(parts[1]) : W.summaryScreen('y', parts[1]);
    case 'print': return printScreen(params);
    case 'ai': return aiScreen(params);
    default: return V.dayScreen(today());
  }
}

let prevDepth = 0;
function render() {
  const same = location.hash === currentRoute;
  const prevBody = app.querySelector('.body');
  const scroll = same && prevBody ? prevBody.scrollTop : 0;
  // кольца на том же экране дорастают от прежнего процента, на новом — от нуля
  const oldRings = same ? [...app.querySelectorAll('.ring')].map((r) => r.style.getPropertyValue('--rp')) : [];
  current = route();
  currentRoute = location.hash;
  app.innerHTML = current.html;
  if (current.mount) current.mount(app);
  const body = app.querySelector('.body');
  if (body && scroll) body.scrollTop = scroll;
  app.querySelectorAll('.ring').forEach((r, i) => { if (oldRings[i]) r.style.setProperty('--rp0', oldRings[i]); });
  // переход между экранами: вперёд — выезжает справа, назад — слева, вкладки — проявляются
  const depth = (history.state && history.state.depth) || 0, scr = app.querySelector('.scr');
  if (!same && scr) scr.classList.add(depth > prevDepth ? 'in-fwd' : depth < prevDepth ? 'in-back' : 'in-fade');
  prevDepth = depth;
}

// Лёгкий тактильный «тик». Обычной вибрации у сайтов на iPhone нет; с iOS 18 тик даёт нажатие
// на системный переключатель (input switch), поэтому щёлкаем по скрытому. На Android — navigator.vibrate.
function haptic() {
  if (navigator.vibrate && !/iPhone|iPad/.test(navigator.userAgent)) { navigator.vibrate(12); return; }
  const label = document.createElement('label'), input = document.createElement('input');
  input.type = 'checkbox'; input.setAttribute('switch', '');
  label.style.display = 'none'; label.setAttribute('aria-hidden', 'true');
  label.appendChild(input); document.head.appendChild(label);
  label.click(); label.remove();
}
// Где тикает: отметка дела, «Сделано» в окне отметки, переключатели, «Завершить день», «Цель достигнута», «Отменить».
const HAPTIC = new Set(['toggle', 'flip', 'whole', 'close', 'achieve']);

// Поля даты и времени: на iPhone родное поле шире, чем кажется, и вылезает за экран.
// Показываем аккуратный текст, а родное поле кладём прозрачно поверх — нажатие открывает обычный выбор даты.
const MON = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
function dateText(inp) {
  const v = inp.value;
  if (!v) return inp.type === 'time' ? 'время' : inp.type === 'datetime-local' ? 'дата, время' : 'дата';
  if (inp.type === 'time') return v;
  const [d, t] = v.split('T'), [y, m, dd] = d.split('-').map(Number);
  return dd + ' ' + MON[m - 1] + ' ' + y + (t ? ', ' + t.slice(0, 5) : '');
}
function enhanceDates(root) {
  root.querySelectorAll('input.inp[type="date"], input.inp[type="time"], input.inp[type="datetime-local"]').forEach((inp) => {
    if (inp.parentElement.classList.contains('dbox')) return;
    const box = document.createElement('div'), txt = document.createElement('span');
    box.className = 'inp dbox'; box.style.cssText = inp.getAttribute('style') || '';
    inp.removeAttribute('style'); inp.classList.remove('inp');
    inp.replaceWith(box); box.append(txt, inp);
    const upd = () => { txt.textContent = dateText(inp); txt.classList.toggle('muted', !inp.value); };
    inp.addEventListener('input', upd); inp.addEventListener('change', upd); upd();
  });
}

function go(target, replace, reset) {
  if (target === 'back') {
    if (history.state && history.state.depth > 0) history.back();
    else location.replace('#/day');
    return;
  }
  const depth = reset ? 0 : ((history.state && history.state.depth) || 0) + (replace ? 0 : 1);
  if (replace || reset) history.replaceState({ depth }, '', target);
  else history.pushState({ depth }, '', target);
  render();
}

app.addEventListener('click', (e) => {
  const act = e.target.closest('[data-act]');
  if (act && act.dataset.act === 'back') { e.preventDefault(); go('back'); return; }
  if (act && current && current.actions && current.actions[act.dataset.act]) {
    e.preventDefault();
    const name = act.dataset.act;
    if (HAPTIC.has(name) || (name === 'save' && currentRoute.startsWith('#/mark/'))) haptic();
    current.actions[name](act, go, render);
    // только что отмеченный кружок — «прыгает»
    if (name === 'toggle') { const ck = app.querySelector(`[data-act="toggle"][data-key="${CSS.escape(act.dataset.key)}"]`); if (ck && ck.classList.contains('done')) ck.classList.add('pop'); }
    return;
  }
  const link = e.target.closest('[data-go]');
  if (link) {
    e.preventDefault();
    const target = link.dataset.go;
    const tab = link.closest('.tabbar');
    go(target, link.hasAttribute('data-replace'), !!tab);
  }
});

// Любая перерисовка (и всего экрана, и части формы) — сразу оформляем новые поля дат.
new MutationObserver(() => enhanceDates(app)).observe(app, { childList: true, subtree: true });
// «Назад» вызывает и popstate, и hashchange — рисуем один раз, иначе пропадает анимация перехода.
const renderIfMoved = () => { if (location.hash !== currentRoute) render(); };
window.addEventListener('popstate', renderIfMoved);
window.addEventListener('hashchange', renderIfMoved);
window.addEventListener('rerender', render);

// Плашка «Перенесено · Отменить» после действий, которые можно вернуть (см. S.undo).
const toast = document.createElement('div');
toast.className = 'toast undo';
document.body.appendChild(toast);
let toastTimer;
window.addEventListener('undoable', (e) => {
  clearTimeout(toastTimer);
  toast.innerHTML = `<span></span><button type="button">Отменить</button>`;
  toast.firstChild.textContent = e.detail;
  toast.classList.add('on');
  toastTimer = setTimeout(() => { toast.classList.remove('on'); S.dropUndo(); }, 5000);
});
toast.addEventListener('click', (e) => {
  if (!e.target.closest('button')) return;
  haptic();
  clearTimeout(toastTimer);
  toast.classList.remove('on');
  if (S.undo()) render();
});
// После полуночи «сегодня» меняется — перерисуем, когда приложение снова открыли.
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

S.load().then(() => {
  V.applyTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => V.applyTheme());
  if (!history.state) history.replaceState({ depth: 0 }, '', location.hash || '#/day');
  render();
});

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  // пришла новая версия — сразу перезагрузиться в неё (первый запуск без старой версии не трогаем)
  if (navigator.serviceWorker.controller) navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
  navigator.serviceWorker.register('sw.js');
}
