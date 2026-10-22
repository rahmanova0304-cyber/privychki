// Запуск приложения: загрузка данных, переходы между экранами, нажатия.
import * as S from './store.js?v=61';
import * as V from './screens.js?v=61';
import * as W from './screens2.js?v=61';
import { aiScreen } from './ai.js?v=61';
import { printScreen } from './print.js?v=61';
import { today } from './util.js?v=61';

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
    case 'dream': return W.dreamScreen(parts[1]);
    case 'summary': return W.summaryScreen(parts[1] || 'w', parts[2]);
    case 'year': return +parts[1] < +S.state.createdAt.slice(0, 4) ? W.yearPastScreen(parts[1]) : W.summaryScreen('y', parts[1]);
    case 'print': return printScreen(params);
    case 'ai': return aiScreen(params);
    default: return V.dayScreen(today());
  }
}

function render() {
  const same = location.hash === currentRoute;
  const prevBody = app.querySelector('.body');
  const scroll = same && prevBody ? prevBody.scrollTop : 0;
  current = route();
  currentRoute = location.hash;
  app.innerHTML = current.html;
  if (current.mount) current.mount(app);
  const body = app.querySelector('.body');
  if (body && scroll) body.scrollTop = scroll;
}

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
    current.actions[act.dataset.act](act, go, render);
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
window.addEventListener('popstate', render);
window.addEventListener('hashchange', render);
window.addEventListener('rerender', render);
// После полуночи «сегодня» меняется — перерисуем, когда приложение снова открыли.
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

S.load().then(() => {
  if (!history.state) history.replaceState({ depth: 0 }, '', location.hash || '#/day');
  render();
});

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  // пришла новая версия — сразу перезагрузиться в неё (первый запуск без старой версии не трогаем)
  if (navigator.serviceWorker.controller) navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
  navigator.serviceWorker.register('sw.js');
}
