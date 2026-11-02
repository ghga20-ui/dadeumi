/* slide-editor — HTML 슬라이드 편집기
   이 스크립트 하나가 두 역할을 한다.
   1) 편집기 화면(<html data-se-editor>)에서는 편집기를 띄운다.
   2) 덱 안에 들어가 있으면 E 키·왼쪽 아래 단추로 편집기를 덱 위에 덮어 띄운다.
   덱에 '편집 모드'를 넣을 때는 이 스크립트 글(자기 자신)을 그대로 복사해 넣는다.
   편집은 덱 스크립트를 끈 정적 사본에서 한다. 애니메이션이 돌던 상태가 저장되지 않게 하려는 것이다. */
(function(){
'use strict';
const VERSION = '1.0';
const SELF = document.currentScript;
const SRC = SELF ? SELF.textContent : '';
const UI_CSS = __SE_CSS__;
const LOGO = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="다듬이"><rect width="64" height="64" rx="14" fill="#2436ff"/><path d="M10 16H52V29A16 16 0 0 1 36 45H10Z" fill="#fff"/><path d="M57 36A24 24 0 0 1 43 53" fill="none" stroke="#93f1f7" stroke-width="6" stroke-linecap="round"/></svg>';
const RT_JS = __SE_RT_JS__;
const RT_CSS = __SE_RT_CSS__;

function shellHtml(boot){
  return '<!DOCTYPE html><html lang="ko" data-se-editor><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>다듬이</title></head><body>' +
    '<script>window.SE_BOOT=' + JSON.stringify(boot).replace(/</g, '\\u003c') + '<\/script>' +
    '<script id="slide-editor">' + SRC + '<\/script></body></html>';
}

if (!document.documentElement.hasAttribute('data-se-editor')) { deckLauncher(); return; }

/* ===================================================================
   덱 안: 편집기 여는 단추
   =================================================================== */
function deckLauncher(){
  if (window.DECK_VIEW) return;                      /* 발표자 창의 거울·미리보기 화면 */
  if (!/^(file|https?):$/.test(location.protocol)) return;  /* 미리보기(blob:)에서는 쓰지 않는다 */
  let ov = null;
  function curIdx(){
    const s = [...document.querySelectorAll('section.slide')];
    const list = s.length ? s : [...document.querySelectorAll('.slide')];
    const i = list.findIndex(x => x.classList.contains('on') || x.classList.contains('active'));
    if (i >= 0) return i;
    return Math.max(0, list.findIndex(x => getComputedStyle(x).visibility !== 'hidden' && getComputedStyle(x).display !== 'none'));
  }
  function open(){
    if (ov) return;
    const name = decodeURIComponent(location.pathname.split('/').pop() || 'index.html');
    const dirKey = location.protocol + '//' + decodeURIComponent(location.pathname.replace(/[^/]*$/, ''));
    ov = document.createElement('iframe');
    ov.setAttribute('data-presenter-hide', '');
    ov.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;border:0;z-index:2147483647;background:#efeee9';
    ov.srcdoc = shellHtml({ mode: 'deck', fileName: name, dirKey, cur: curIdx() });
    document.body.appendChild(ov);
  }
  addEventListener('message', e => {
    if (!ov || e.source !== ov.contentWindow || !e.data || e.data.type !== 'se-close') return;
    ov.remove(); ov = null;
    if (e.data.saved) location.reload();
  });
  addEventListener('keydown', e => {
    if (ov || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    if (e.key !== 'e' && e.key !== 'E') return;
    const t = e.target;
    if (t && t.closest && t.closest('input,textarea,select,[contenteditable]')) return;
    e.preventDefault(); e.stopImmediatePropagation(); open();
  }, true);
  const b = document.createElement('button');
  b.type = 'button'; b.title = '슬라이드 편집 (E)'; b.textContent = '편집';
  b.setAttribute('data-presenter-hide', '');
  b.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:2147483000;padding:8px 13px;border:0;border-radius:9px;background:rgba(30,30,34,.85);color:#fff;font:600 13px system-ui,"Malgun Gothic",sans-serif;cursor:pointer;opacity:0;pointer-events:none;transition:opacity .2s;white-space:nowrap';
  let t0;
  addEventListener('mousemove', e => {
    if (ov || e.clientX > 170 || e.clientY < innerHeight - 120) return;
    b.style.opacity = '1'; b.style.pointerEvents = 'auto';
    clearTimeout(t0); t0 = setTimeout(() => { b.style.opacity = '0'; b.style.pointerEvents = 'none'; }, 2200);
  });
  b.addEventListener('click', e => { e.stopPropagation(); b.blur(); open(); });
  const add = () => document.body.appendChild(b);
  if (document.body) add(); else addEventListener('DOMContentLoaded', add);
}

/* ===================================================================
   편집기
   =================================================================== */
const BOOT = window.SE_BOOT || { mode: 'app' };
const NS = 'http://www.w3.org/2000/svg';
let PAD = 44;
const HAS_FS = 'showOpenFilePicker' in window;

/* 편집 중에만 덱 안에 넣는 스타일 (저장할 때 빠진다) */
const EDIT_CSS = `
html[data-se-edit] [data-se-off]{display:none!important}
html[data-se-edit] [data-se-cur],html[data-se-edit] [data-se-anc]{visibility:visible!important;opacity:1!important}
html[data-se-edit][data-se-showhidden] [data-se-cur] *{visibility:visible!important;opacity:1!important}
html[data-se-edit] *,html[data-se-edit] *::before,html[data-se-edit] *::after{transition:none!important;animation-duration:0s!important;animation-delay:0s!important;animation-iteration-count:1!important;caret-color:auto}
html[data-se-edit] [data-se-ce]{outline:none!important;cursor:text;-webkit-user-select:text;user-select:text}
html[data-se-edit] [data-se-widget]{outline:2px dashed rgba(47,107,255,.5);outline-offset:4px}
html[data-se-edit] ::selection{background:rgba(47,107,255,.28)}
html[data-se-edit] [data-se-ghost]{position:absolute;inset:0;z-index:0}
html[data-se-edit] [data-se-ghost='']{opacity:.5}
html[data-se-edit] [data-se-ghost],html[data-se-edit] [data-se-ghost] *{pointer-events:none!important}
`;

const ICONS = {
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  file: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5',
  save: 'M5 3h11l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM7 3v5h8V3M7 21v-7h10v7',
  undo: 'M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
  redo: 'M15 14l5-5-5-5M20 9H9a5 5 0 0 0 0 10h3',
  plus: 'M12 5v14M5 12h14',
  play: 'M7 4v16l13-8z',
  text: 'M5 7V5h14v2M12 5v14M9 19h6',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 8.5h.01',
  square: 'M4 5h16v14H4z',
  round: 'M8 5h8a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4z',
  circle: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18',
  line: 'M4 19 20 5',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  up: 'M12 19V5M5 12l7-7 7 7',
  down: 'M12 5v14M19 12l-7 7-7-7',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6',
  code: 'M9 8l-5 4 5 4M15 8l5 4-5 4',
  x: 'M6 6l12 12M18 6 6 18',
  gear: 'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  alignL: 'M4 4v16M8 7h11v4H8zM8 13h7v4H8z',
  alignC: 'M12 4v16M5 7h14v4H5zM8 13h8v4H8z',
  alignR: 'M20 4v16M5 7h11v4H5zM9 13h7v4H9z',
  alignT: 'M4 4h16M7 8h4v11H7zM13 8h4v7h-4z',
  alignM: 'M4 12h16M7 5h4v14H7zM13 8h4v8h-4z',
  alignB: 'M4 20h16M7 5h4v11H7zM13 9h4v7h-4z',
  front: 'M9 9h11v11H9zM4 15V4h11',
  back: 'M4 4h11v11H4zM20 9v11H9',
  tl: 'M4 6h16M4 10h10M4 14h16M4 18h10',
  tc: 'M4 6h16M7 10h10M4 14h16M7 18h10',
  tr: 'M4 6h16M10 10h10M4 14h16M10 18h10',
  tj: 'M4 6h16M4 10h16M4 14h16M4 18h16',
  timer: 'M12 9v4l3 2M9 2h6M12 5a8 8 0 1 0 0 16a8 8 0 1 0 0-16',
  reveal: 'M3 3l18 18M10.6 6.1A10 10 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3 3.6M6.6 6.6C3.9 8.4 2 12 2 12s4 6 10 6c1.7 0 3.2-.4 4.5-1',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  video: 'M3 6h13v12H3zM16 10l5-3v10l-5-3',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
  layers: 'M12 3 3 8l9 5 9-5zM3 13l9 5 9-5',
  restore: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5',
  pill: 'M8 7h8a5 5 0 0 1 0 10H8A5 5 0 0 1 8 7z',
  slide: 'M3 5h18v12H3zM8 21h8M12 17v4',
  fade: 'M12 3a9 9 0 1 0 0 18M12 3v18M16 5v14M20 9v6',
  zoom: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5M9 9h6v6H9z',
  wipe: 'M4 4v16M8 12h12M16 8l4 4-4 4',
  blur: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8',
  left: 'M19 12H5M11 6l-6 6 6 6',
  right: 'M5 12h14M13 6l6 6-6 6',
  none: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M6 6l12 12',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  reset: 'M4 4v6h6M20 20v-6h-6M5 15a7 7 0 0 0 13 2M19 9A7 7 0 0 0 6 7',
  html: 'M4 4h16v16H4zM9 9l-2 3 2 3M15 9l2 3-2 3',
  pen: 'M9 11l-5 5v3h3l5-5M9 11l6-6 4 4-6 6zM13 20h7',
  lock: 'M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3',
  eyeoff: 'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.5 6.7C3.8 8.5 2 12 2 12s4 7 10 7c1.8 0 3.4-.6 4.8-1.4',
  group: 'M4 4h9v9H4zM11 11h9v9h-9z',
  search: 'M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14M20 20l-4-4',
  chev: 'M9 6l6 6-6 6',
  chevd: 'M6 9l6 6 6-6',
  check: 'M5 12l5 5 9-10'
};

const EFFECTS = [
  ['none', '없음', 'none'], ['fade', '나타나기', 'fade'], ['up', '위로', 'up'],
  ['down', '아래로', 'down'], ['left', '왼쪽에서', 'right'], ['right', '오른쪽에서', 'left'],
  ['zoom', '확대', 'zoom'], ['pop', '튕기기', 'spark'], ['wipe', '닦아내기', 'wipe'], ['blur', '초점', 'blur']
];
const EFFECT_NAME = Object.fromEntries(EFFECTS.map(e => [e[0], e[1]]));

const BASIC_COLORS = ['#000000', '#3c3c43', '#6b6b70', '#a1a1a6', '#d1d1d6', '#ffffff', '#d6453d', '#f08c2e',
  '#f5c518', '#34a853', '#1a9e8f', '#2f6bff', '#6c4cf0', '#c2459d', '#8b5a2b', '#1e3a5f'];
const WIN_FONTS = [
  ['Malgun Gothic', '맑은 고딕'], ['Batang', '바탕'], ['Dotum', '돋움'], ['Gulim', '굴림'], ['Gungsuh', '궁서'],
  ['Noto Sans KR', 'Noto Sans KR'], ['Noto Serif KR', 'Noto Serif KR'], ['Pretendard', 'Pretendard'],
  ['NanumGothic', '나눔고딕'], ['NanumMyeongjo', '나눔명조'], ['NanumSquare', '나눔스퀘어'], ['NanumBarunGothic', '나눔바른고딕'],
  ['HCR Batang', '함초롬바탕'], ['HCR Dotum', '함초롬돋움'], ['Arial', 'Arial'], ['Georgia', 'Georgia'],
  ['Times New Roman', 'Times New Roman'], ['Segoe UI', 'Segoe UI'], ['Consolas', 'Consolas'], ['Comic Sans MS', 'Comic Sans MS']
];
const SAFE_FONTS = new Set(['Malgun Gothic', 'Batang', 'Dotum', 'Gulim', 'Gungsuh', 'Arial', 'Georgia', 'Times New Roman', 'Segoe UI', 'Consolas', 'Comic Sans MS', 'Verdana', 'Tahoma']);

/* ---------- 상태 ---------- */
const S = {
  file: null, ifr: null, ewin: null, edoc: null,
  slides: [], cur: 0, mode: 'slides', root: null, box: null, activeCls: null,
  rect: { x: 0, y: 0, w: 1920, h: 1080 }, k: 1, scale: 1, zoom: 'fit',
  sel: [], hover: null, editing: null, editSnap: null, lastRange: null,
  hist: [], fut: [], live: null, dirty: false, saved: false,
  embed: false, showHidden: false, tab: 'text', clip: null, pasteN: 0,
  fonts: { vars: [], deck: [], added: [], sys: null, local: null, localData: null },
  colors: [], recentColors: [], lastPoint: null, folder: null
};

/* ---------- 작은 도구 ---------- */
const $ = id => document.getElementById(id);
function h(tag, attrs, ...kids){
  const el = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(9)) if (c != null && c !== false) el.append(c.nodeType ? c : String(c));
  return el;
}
function ic(name){
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'i'); s.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(NS, 'path'); p.setAttribute('d', ICONS[name] || ''); s.appendChild(p);
  return s;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (v, d = 0) => { const m = Math.pow(10, d); return Math.round(v * m) / m; };
function debounce(fn, ms){ let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
function stamp(){ const d = new Date(), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`; }
function when(t){ const d = new Date(t); return d.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
function kb(n){ return n > 1048576 ? (n / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(n / 1024)) + 'KB'; }
function readAs(file, how){ return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r[how](file); }); }
function cssStr(s){ return '"' + String(s).replace(/["\\]/g, '\\$&') + '"'; }
function firstFamily(v){ return String(v || '').split(',')[0].trim().replace(/^["']|["']$/g, ''); }

/* ---------- 저장소(IndexedDB): 폴더 손잡이, 임시 저장본, 백업 ---------- */
const DB = {
  db: null,
  open(){
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      const r = indexedDB.open('slide-editor', 1);
      r.onupgradeneeded = () => { const d = r.result; ['kv', 'drafts'].forEach(n => d.objectStoreNames.contains(n) || d.createObjectStore(n)); d.objectStoreNames.contains('backups') || d.createObjectStore('backups', { autoIncrement: true }); };
      r.onsuccess = () => { this.db = r.result; res(this.db); };
      r.onerror = () => rej(r.error);
    });
  },
  async run(store, mode, fn){
    try {
      const d = await this.open();
      return await new Promise((res, rej) => {
        const t = d.transaction(store, mode), s = t.objectStore(store); let out;
        const r = fn(s); if (r) r.onsuccess = () => { out = r.result; };
        t.oncomplete = () => res(out); t.onerror = () => rej(t.error);
      });
    } catch (e) { return undefined; }
  },
  get(st, k){ return this.run(st, 'readonly', s => s.get(k)); },
  set(st, k, v){ return this.run(st, 'readwrite', s => k == null ? s.add(v) : s.put(v, k)); },
  del(st, k){ return this.run(st, 'readwrite', s => s.delete(k)); },
  async entries(st){
    const out = [];
    await this.run(st, 'readonly', s => { const c = s.openCursor(); c.onsuccess = () => { const x = c.result; if (x) { out.push([x.key, x.value]); x.continue(); } }; return null; });
    return out;
  }
};

async function perm(handle, write){
  if (!handle || !handle.queryPermission) return true;
  const o = { mode: write ? 'readwrite' : 'read' };
  try {
    if ((await handle.queryPermission(o)) === 'granted') return true;
    return (await handle.requestPermission(o)) === 'granted';
  } catch (e) { return false; }
}

/* ===================================================================
   화면 만들기
   =================================================================== */
function buildUI(){
  setTheme(getTheme());
  document.head.appendChild(h('link', { rel: 'icon', type: 'image/svg+xml', href: 'data:image/svg+xml,' + encodeURIComponent(LOGO) }));
  document.head.appendChild(h('style', { id: 'se-ui-style', text: UI_CSS }));
  document.head.appendChild(h('style', { id: 'se-hostfonts' }));
  const deck = BOOT.mode === 'deck';
  const tb = (id, icon, label, title, cls) => h('button', { class: 'tb' + (label ? ' lbl-ic' : ' ic') + (cls ? ' ' + cls : ''), id, type: 'button', title: title || label }, icon ? ic(icon) : null, label ? h('span', { class: cls === 'pri' ? null : 'lbl', text: label }) : null);
  const app = h('div', { id: 'se-app' },
    h('div', { id: 'se-top' },
      h('div', { class: 'brand' }, h('b', { html: LOGO }), h('span', { text: '다듬이' })),
      deck ? null : tb('bFile', 'file', '열기', '파일·폴더 열기'),
      h('div', { id: 'se-fname' }, h('span', { text: '' }), h('i', { id: 'se-dirty', class: 'hide', title: '저장하지 않은 변경이 있어요' })),
      h('div', { class: 'sep' }),
      tb('bUndo', 'undo', '', '되돌리기 (Ctrl+Z)'), tb('bRedo', 'redo', '', '다시 하기 (Ctrl+Y)'),
      h('div', { class: 'sep' }),
      tb('bAdd', 'plus', '추가', '글상자·이미지·도형·기능 넣기'),
      tb('bFind', 'search', '', '찾아 바꾸기 (Ctrl+F)'),
      h('div', { class: 'grow' }),
      tb('bPresent', 'eye', '숨은 요소 보기', '발표할 때만 나타나는 그림·글자를 흐리게 겹쳐 보여 줘요. 저장되지는 않아요.'),
      tb('bPreview', 'play', '미리보기', '새 탭에서 덱을 실제처럼 열어 보기'),
      tb('bSet', 'gear', '', '설정·백업'),
      tb('bSave', 'save', '저장', '저장 (Ctrl+S)', 'pri'),
      deck ? tb('bClose', 'x', '닫기', '편집기 닫고 덱으로') : null
    ),
    h('div', { id: 'se-left' },
      h('div', { class: 'ph' }, h('span', { id: 'se-listt', text: '슬라이드' }), h('span', { id: 'se-count', style: 'color:var(--mute);font-weight:500' }), h('span', { class: 'grow' }),
        h('button', { class: 'tb ic', id: 'bNewSlide', type: 'button', title: '새 슬라이드 (Ctrl+M)' }, ic('plus'))),
      h('div', { id: 'se-slides' })
    ),
    h('div', { id: 'se-mid' },
      h('div', { id: 'se-canvas' },
        h('div', { id: 'se-stagewrap' },
          h('div', { id: 'se-paper' }, h('iframe', { id: 'se-frame', title: '편집 중인 슬라이드' }), h('div', { id: 'se-glass' })),
          h('div', { id: 'se-ov' })
        )
      ),
      h('div', { id: 'se-zoom' },
        h('button', { class: 'tb ic', type: 'button', id: 'bZout', title: '작게' }, '−'),
        h('button', { class: 'tb', type: 'button', id: 'bZfit', title: '화면에 맞추기' }, '100%'),
        h('button', { class: 'tb ic', type: 'button', id: 'bZin', title: '크게' }, '+')),
      h('div', { id: 'se-note', class: 'hide' }),
      h('div', { id: 'se-miss', class: 'hide' }),
      h('div', { id: 'se-empty' })
    ),
    h('div', { id: 'se-right' },
      h('div', { id: 'se-tabs' }, ...[['text', '꾸미기', 'pen'], ['anim', '움직임', 'spark']].map(([k, t, icn]) => h('button', { type: 'button', 'data-tab': k }, ic(icn), h('span', { text: t })))),
      h('div', { id: 'se-props' })
    ),
    h('div', { id: 'se-bot' },
      h('span', { id: 'se-stat' }), h('span', { id: 'se-selstat', style: 'color:var(--ink2)' }), h('span', { class: 'grow' }),
      h('span', { class: 'keys', html: '<kbd>끌기</kbd> 범위 선택 <kbd>Ctrl</kbd>+클릭 더하기 <kbd>더블클릭</kbd> 글자 고치기 <kbd>Esc</kbd> 바깥 요소' }))
  );
  document.body.appendChild(app);
  document.body.appendChild(h('div', { id: 'se-toast' }));
  S.ifr = $('se-frame');

  $('bUndo').onclick = undo; $('bRedo').onclick = redo;
  $('bSave').onclick = save; $('bPreview').onclick = preview;
  $('bAdd').onclick = e => addMenu(e.currentTarget);
  $('bFind').onclick = openFind;
  $('bSet').onclick = e => setMenu(e.currentTarget);
  $('bPresent').onclick = () => setPresent(!S.present);
  $('bPresent').appendChild(h('i', { id: 'se-hcount', class: 'hide' }));
  try { S.present = localStorage.getItem('se-present') !== '0'; } catch (e) { S.present = true; }
  $('bPresent').classList.toggle('on', S.present);
  if ($('bFile')) $('bFile').onclick = e => fileMenu(e.currentTarget);
  if ($('bClose')) $('bClose').onclick = closeDeckEditor;
  $('bNewSlide').onclick = () => newSlide();
  $('bZin').onclick = () => setZoom(S.scale * 1.2);
  $('bZout').onclick = () => setZoom(S.scale / 1.2);
  $('bZfit').onclick = () => setZoom('fit');
  document.querySelectorAll('#se-tabs button').forEach(b => b.onclick = () => { S.tab = b.dataset.tab; renderPanel(); });
  bindCanvas();
  bindKeys();
  addEventListener('resize', debounce(() => { layout(); drawOv(); }, 60));
  addEventListener('beforeunload', e => { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });
  setLoaded(false);
}

function setLoaded(on){
  ['bUndo', 'bRedo', 'bAdd', 'bFind', 'bPresent', 'bPreview', 'bSave', 'bNewSlide'].forEach(id => $(id) && ($(id).disabled = !on));
  $('se-empty').classList.toggle('hide', on);
  $('se-canvas').classList.toggle('hide', !on);
  $('se-zoom').classList.toggle('hide', !on);
  if (!on) { $('se-slides').innerHTML = ''; $('se-props').innerHTML = ''; $('se-stat').textContent = ''; }
}

/* ---------- 알림 ---------- */
function toast(msg, kind, action){
  const t = h('div', { class: 'toast' + (kind ? ' ' + kind : '') }, msg);
  if (action) {
    const b = h('button', { type: 'button', style: 'margin-left:12px;pointer-events:auto;border:0;background:rgba(255,255,255,.18);color:#fff;border-radius:6px;padding:3px 9px;font-weight:600', text: action.label });
    b.onclick = () => { action.fn(); t.remove(); };
    t.appendChild(b);
  }
  $('se-toast').appendChild(t);
  setTimeout(() => t.remove(), action ? 6000 : kind === 'bad' ? 6000 : 3200);
}

/* ---------- 대화상자 ---------- */
function modal({ title, body, ok = '확인', cancel = '취소', wide, onOk, input, danger }){
  return new Promise(res => {
    const bg = h('div', { class: 'modal-bg' });
    let inp = null;
    const content = typeof body === 'string' ? h('p', { text: body }) : body;
    if (input) inp = input.multi ? h('textarea', { class: 'f', spellcheck: 'false' }) : h('input', { class: 'f', type: 'text', spellcheck: 'false', placeholder: input.placeholder || '' });
    if (inp) inp.value = input.value || '';
    const close = v => { bg.remove(); res(v); };
    const okb = ok ? h('button', { type: 'button', class: 'btn ' + (danger ? 'bad' : 'pri'), text: ok }) : null;
    const m = h('div', { class: 'modal', style: wide ? 'width:min(900px,100%)' : '' },
      h('header', null, h('span', { text: title }), h('span', { class: 'grow' }), h('button', { type: 'button', class: 'tb ic', onclick: () => close(null) }, ic('x'))),
      h('div', { class: 'body' }, content, inp ? h('div', { style: 'margin-top:4px' }, inp) : null),
      (ok || cancel) ? h('footer', null, cancel ? h('button', { type: 'button', class: 'btn', text: cancel, onclick: () => close(null) }) : null, okb) : null);
    if (okb) okb.onclick = async () => {
      const v = inp ? inp.value : true;
      if (onOk) { const r = await onOk(v); if (r === false) return; }
      close(v);
    };
    bg.addEventListener('mousedown', e => { if (e.target === bg) close(null); });
    bg.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Escape') close(null);
      if (e.key === 'Enter' && inp && !input.multi) okb.click();
    });
    bg.appendChild(m); document.body.appendChild(bg);
    setTimeout(() => { if (inp) { inp.focus(); inp.select(); } else if (okb) okb.focus(); }, 30);
  });
}

/* ---------- 떠 있는 메뉴 ---------- */
let POP = null;
function closePop(){ if (POP) { POP.remove(); POP = null; } }
function popAt(anchor, el, opt = {}){
  closePop();
  el.classList.add('pop');
  document.body.appendChild(el); POP = el;
  const r = anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: anchor.x, right: anchor.x, top: anchor.y, bottom: anchor.y };
  const w = el.offsetWidth, hgt = el.offsetHeight;
  let x = opt.right ? r.right - w : r.left, y = r.bottom + 4;
  if (x + w > innerWidth - 8) x = innerWidth - w - 8;
  if (y + hgt > innerHeight - 8) y = Math.max(8, r.top - hgt - 4);
  el.style.left = Math.max(8, x) + 'px'; el.style.top = y + 'px';
  setTimeout(() => {
    const off = e => { if (POP === el && !el.contains(e.target) && e.target !== anchor && !(anchor.contains && anchor.contains(e.target))) { closePop(); document.removeEventListener('mousedown', off, true); } };
    document.addEventListener('mousedown', off, true);
  });
  return el;
}
function menu(anchor, items, opt){
  const m = h('div', { class: 'menu' });
  for (const it of items) {
    if (it === '-') { m.appendChild(h('div', { class: 'msep' })); continue; }
    if (it.head) { m.appendChild(h('div', { class: 'mh', text: it.head })); continue; }
    const b = h('button', { type: 'button', class: 'mi' + (it.bad ? ' bad' : ''), disabled: it.disabled || null },
      it.icon ? ic(it.icon) : h('span', { style: 'width:16px' }), h('span', { text: it.label }), it.key ? h('small', { text: it.key }) : null);
    b.onclick = () => { closePop(); it.fn(); };
    m.appendChild(b);
  }
  return popAt(anchor, m, opt);
}

/* ===================================================================
   열기
   =================================================================== */
/* 웹에 올린 판에서만: 파일로 연 편집기에는 방침 페이지가 없다 */
function policyLink(){
  if (BOOT.mode === 'deck' || !/^http/.test(location.protocol)) return null;
  return h('a', { class: 'policy', href: '/privacy', target: '_blank', rel: 'noopener', text: '개인정보처리방침' });
}
function renderWelcome(){
  const box = $('se-empty'); box.innerHTML = '';
  if (BOOT.mode === 'deck') return renderDeckWelcome(box);
  const card = h('div', { class: 'welcome' },
    h('h1', null, h('b', { html: LOGO }), '다듬이'),
    h('p', { class: 'lead', text: 'HTML 파일을 열어 고치고 원본에 저장해요. 이전 판은 백업으로 남아요.' }),
    HAS_FS ? null : h('div', { class: 'warn', style: 'margin:-8px 0 16px', text: '이 브라우저에서는 내려받기로 저장돼요. 원본에 저장하려면 크롬이나 엣지로 여세요.' }),
    h('div', { class: 'big' },
      h('button', { type: 'button', onclick: () => openSingle() }, h('b', null, ic('file'), '파일 열기'), h('span', { text: 'HTML 파일을 골라요.' })),
      h('button', { type: 'button', onclick: () => openFolder() }, h('b', null, ic('folder'), '폴더 열기'), h('span', { text: '폴더 안의 파일을 오가며 고쳐요.' }))
    ),
    h('div', { class: 'drop', id: 'se-drop', text: '파일을 여기에 끌어다 놓아도 돼요' }),
    h('div', { id: 'se-recent' }),
    policyLink()
  );
  box.appendChild(card);
  const drop = $('se-drop');
  ['dragenter', 'dragover'].forEach(t => box.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
  box.addEventListener('dragleave', e => { if (e.target === box) drop.classList.remove('over'); });
  box.addEventListener('drop', async e => {
    e.preventDefault(); drop.classList.remove('over');
    const it = e.dataTransfer.items && e.dataTransfer.items[0];
    if (it && it.getAsFileSystemHandle) {
      const hd = await it.getAsFileSystemHandle();
      if (hd && hd.kind === 'directory') return openFolder(hd);
      if (hd && hd.kind === 'file') return openFileHandle(hd);
    }
    const f = e.dataTransfer.files[0];
    if (f) openText(await f.text(), { name: f.name, key: 'drop:' + f.name, fh: null, dir: null, label: f.name });
  });
  renderRecent();
}

async function renderRecent(){
  const wrap = $('se-recent'); if (!wrap) return;
  const list = (await DB.get('kv', 'recent')) || [];
  if (!list.length) return;
  wrap.append(h('h3', { text: '최근에 연 것' }), h('div', { class: 'recent' }, list.map(r =>
    h('button', { type: 'button', onclick: () => r.kind === 'dir' ? openFolder(r.handle, r.path) : openFileHandle(r.handle) },
      ic(r.kind === 'dir' ? 'folder' : 'file'), h('span', { text: r.label || r.name }), h('small', { text: when(r.time) })))));
}
async function addRecent(item){
  let list = (await DB.get('kv', 'recent')) || [];
  list = list.filter(r => !(r.kind === item.kind && r.label === item.label));
  list.unshift({ ...item, time: Date.now() });
  await DB.set('kv', 'recent', list.slice(0, 8));
}

async function listHtml(dir, prefix = '', depth = 0, out = []){
  for await (const [name, hd] of dir.entries()) {
    if (out.length > 600) break;
    if (hd.kind === 'file' && /\.html?$/i.test(name)) out.push({ name, path: prefix + name, h: hd, dir });
    else if (hd.kind === 'directory' && depth < 3 && !/^(\.|node_modules$|__pycache__$|venv$|site-packages$)/.test(name)) await listHtml(hd, prefix + name + '/', depth + 1, out);
  }
  return out;
}

async function openFolder(handle, openPath){
  try {
    if (!handle) {
      if (!window.showDirectoryPicker) return openFallback();
      handle = await showDirectoryPicker({ id: 'slide-editor', mode: 'readwrite' });
    }
    if (!(await perm(handle, true))) return toast('폴더를 쓸 권한이 없어요.', 'bad');
    busy('폴더 안 HTML 파일을 찾는 중…');
    const files = await listHtml(handle);
    busy(false);
    files.sort((a, b) => a.path.localeCompare(b.path, 'ko'));
    S.folder = { handle, files };
    await addRecent({ kind: 'dir', name: handle.name, label: handle.name, handle });
    if (openPath) { const f = files.find(x => x.path === openPath); if (f) return openEntry(f); }
    showFileList();
  } catch (e) { busy(false); if (e.name !== 'AbortError') toast('폴더를 열지 못했어요: ' + e.message, 'bad'); }
}

function showFileList(){
  const F = S.folder; if (!F) return openFolder();
  const q = h('input', { class: 'f', type: 'search', placeholder: '파일 이름으로 찾기', spellcheck: 'false' });
  const list = h('div', { class: 'filelist' });
  const draw = () => {
    list.innerHTML = '';
    const term = q.value.trim().toLowerCase();
    const items = F.files.filter(f => !term || f.path.toLowerCase().includes(term));
    if (!items.length) list.appendChild(h('div', { class: 'empty-note', text: F.files.length ? '맞는 파일이 없어요' : '이 폴더에는 HTML 파일이 없어요' }));
    for (const f of items.slice(0, 300)) {
      const dir = f.path.includes('/') ? f.path.replace(/[^/]*$/, '') : '';
      list.appendChild(h('button', { type: 'button', onclick: () => { closeModal(); openEntry(f); } }, ic('file'),
        h('span', null, h('div', { text: f.name }), dir ? h('div', { class: 'dir', text: dir }) : null)));
    }
  };
  q.addEventListener('input', draw);
  let closeModal = () => {};
  const body = h('div', null, q, list);
  draw();
  modal({ title: `‘${F.handle.name}’ 폴더 — 열 파일 고르기`, body, ok: null, cancel: '닫기', wide: true });
  closeModal = () => { const m = document.querySelector('.modal-bg'); if (m) m.remove(); };
  setTimeout(() => q.focus(), 40);
}

async function openEntry(f){
  if (!(await confirmDiscard())) return;
  const file = await f.h.getFile();
  openText(await file.text(), { name: f.name, key: S.folder.handle.name + '/' + f.path, fh: f.h, dir: f.dir, label: f.path, mtime: file.lastModified });
}

async function openSingle(){
  if (!HAS_FS) return openFallback();
  try {
    const [fh] = await showOpenFilePicker({ id: 'slide-editor', types: [{ description: 'HTML 문서', accept: { 'text/html': ['.html', '.htm'] } }] });
    await openFileHandle(fh);
  } catch (e) { if (e.name !== 'AbortError') toast('파일을 열지 못했어요: ' + e.message, 'bad'); }
}
async function openFileHandle(fh){
  if (!(await confirmDiscard())) return;
  /* 연결해 둔 폴더가 있으면 그 손잡이로 연다(상대 경로 그림·백업 파일이 살아난다) */
  const stored = await DB.get('kv', 'link:' + fh.name);
  const dir = stored && await holds(stored, fh) && await perm(stored, true) ? stored : null;
  await perm(fh, true);
  const file = await fh.getFile();
  await addRecent({ kind: 'file', name: fh.name, label: fh.name, handle: fh });
  openText(await file.text(), { name: fh.name, key: 'file:' + fh.name, fh, dir, label: fh.name, mtime: file.lastModified });
}
/* 파일이 이 폴더 바로 아래에 있는가 */
const holds = async (dir, fh) => { try { const p = await dir.resolve(fh); return !!p && p.length === 1; } catch (e) { return false; } };
/* 파일로 열면 폴더를 모른다: 처음 저장할 때 한 번 연결해 이전 판을 파일로 남긴다 */
async function linkFolder(){
  const f = S.file;
  if (f.dir || f.noLink || !window.showDirectoryPicker) return;
  const key = 'link:' + f.name, stored = await DB.get('kv', key);
  if (stored && await holds(stored, f.fh) && await perm(stored, true)) { f.dir = stored; return; }
  const ok = await modal({ title: '백업 폴더 연결', body: `‘${f.name}’이 든 폴더를 연결하면 이전 판이 .slide-backup 폴더에 파일로 남아요.`, ok: '폴더 연결', cancel: '브라우저에 보관', onOk: async () => {
    try {
      const dir = await showDirectoryPicker({ startIn: f.fh, mode: 'readwrite' });
      if (!(await holds(dir, f.fh))) { toast(`고른 폴더에 ‘${f.name}’이 없어요.`, 'bad'); return false; }
      await DB.set('kv', key, dir); f.dir = dir;
    } catch (e) { return false; }
  } });
  if (!ok) f.noLink = true;
}
function openFallback(){
  const inp = h('input', { type: 'file', accept: '.html,.htm,text/html' });
  inp.onchange = async () => { const f = inp.files[0]; if (f) openText(await f.text(), { name: f.name, key: 'drop:' + f.name, fh: null, dir: null, label: f.name }); };
  inp.click();
}

async function confirmDiscard(){
  if (!S.dirty) return true;
  return !!(await modal({ title: '저장하지 않은 변경', body: '지금 파일에 저장하지 않은 변경이 있어요. 버리고 다른 파일을 열까요?', ok: '버리고 열기', danger: true }));
}

function busy(msg){
  let b = document.querySelector('.busy');
  if (!msg) { if (b) b.remove(); return; }
  if (!b) { b = h('div', { class: 'busy' }); document.body.appendChild(b); }
  b.textContent = msg;
}

/* 덱 안에서 열린 편집기: 덱이 든 폴더를 한 번 연결해 두면 다음부터는 단추 하나로 연다 */
async function renderDeckWelcome(box){
  const stored = await DB.get('kv', 'dir:' + BOOT.dirKey);
  const go = async pick => {
    try {
      let dir = pick ? null : stored;
      if (!dir) dir = await showDirectoryPicker({ id: 'slide-editor', mode: 'readwrite' });
      if (!(await perm(dir, true))) return toast('폴더를 쓸 권한이 없어요.', 'bad');
      let fh;
      try { fh = await dir.getFileHandle(BOOT.fileName); }
      catch (e) { return toast(`고른 폴더에 ‘${BOOT.fileName}’이 없어요. 이 덱이 들어 있는 폴더를 골라 주세요.`, 'bad'); }
      await DB.set('kv', 'dir:' + BOOT.dirKey, dir);
      const file = await fh.getFile();
      await openText(await file.text(), { name: BOOT.fileName, key: BOOT.dirKey + BOOT.fileName, fh, dir, label: BOOT.fileName, mtime: file.lastModified, startAt: BOOT.cur });
    } catch (e) { if (e.name !== 'AbortError') toast('열지 못했어요: ' + e.message, 'bad'); }
  };
  box.appendChild(h('div', { class: 'welcome' },
    h('h1', { text: `‘${BOOT.fileName}’ 편집` }),
    h('p', { class: 'lead', text: stored ? '크롬이 폴더 권한을 물으면 ‘허용’을 눌러 주세요.' : '원본에 저장하려면 이 덱이 든 폴더를 한 번 연결해야 해요.' }),
    HAS_FS ? h('div', { class: 'big' },
      h('button', { type: 'button', onclick: () => go(false) }, h('b', null, ic(stored ? 'play' : 'folder'), stored ? '편집 시작' : '덱 폴더 연결하고 시작'), h('span', { text: stored ? `연결된 폴더: ${stored.name}` : '이 덱이 든 폴더를 고르세요.' })),
      stored ? h('button', { type: 'button', onclick: () => go(true) }, h('b', null, ic('folder'), '다른 폴더 연결'), h('span', { text: '덱을 옮겼을 때' })) : h('button', { type: 'button', onclick: closeDeckEditor }, h('b', null, ic('x'), '닫기'), null)
    ) : h('div', { class: 'warn', text: '이 브라우저는 파일에 바로 저장하지 못해요. 크롬이나 엣지에서 덱을 열어 주세요.' })
  ));
}

async function closeDeckEditor(){
  if (S.dirty && !(await modal({ title: '저장하지 않은 변경', body: '저장하지 않은 변경이 있어요. 버리고 닫을까요?', ok: '버리고 닫기', danger: true }))) return;
  S.dirty = false;
  parent.postMessage({ type: 'se-close', saved: S.saved }, '*');
}

/* ---------- 문서 불러오기 ---------- */
async function openText(text, meta){
  S.hasEngine = /DeckPresenter/.test(text);
  busy('불러오는 중…');
  try {
    const draft = await DB.get('drafts', meta.key);
    if (draft && draft.html && (!meta.mtime || draft.time > meta.mtime) && draft.base === text.length) {
      busy(false);
      const use = await modal({ title: '저장하지 않은 편집본이 있어요', body: `${when(draft.time)}에 편집하다 저장하지 않은 내용이 남아 있어요. 이어서 할까요?`, ok: '이어서 하기', cancel: '원본 열기' });
      busy('불러오는 중…');
      if (use) { meta.fromDraft = true; meta.base = text; text = draft.html; }
      else await DB.del('drafts', meta.key);
    }
    const pdoc = new DOMParser().parseFromString(text, 'text/html');
    S.embed = !!pdoc.getElementById('slide-editor');
    pvInvalidate(); S.ghost = null;
    prepareDoc(pdoc);
    setLoaded(true);
    await mount('<!DOCTYPE html>\n' + pdoc.documentElement.outerHTML);
    S.file = meta; S.file.baseLen = meta.base ? meta.base.length : text.length;
    S.hist = []; S.fut = []; S.sel = []; S.editing = null; S.live = null; S.saved = S.saved || false;
    afterMount(meta.startAt || 0);
    setDirty(!!meta.fromDraft);
    $('se-fname').firstChild.textContent = meta.label || meta.name;
    document.title = (meta.name || '') + ' — 다듬이';
    busy(false);
    if (!meta.fh) toast('이 파일은 원본에 바로 저장할 수 없어서, 저장하면 내려받기로 저장돼요.');
  } catch (e) {
    busy(false); console.error(e);
    toast('문서를 열지 못했어요: ' + e.message, 'bad');
  }
}

/* 덱 스크립트·이벤트 속성을 끄고 편집용 표시를 붙인다 (저장할 때 모두 되돌린다) */
function prepareDoc(d){
  d.querySelectorAll('script').forEach(s => {
    s.setAttribute('data-se-type', s.hasAttribute('type') ? s.getAttribute('type') : '__none__');
    s.setAttribute('type', 'text/x-se-off');
  });
  d.querySelectorAll('*').forEach(el => {
    for (const a of [...el.attributes]) if (/^on/i.test(a.name)) { el.setAttribute('data-se-' + a.name, a.value); el.removeAttribute(a.name); }
  });
  d.querySelectorAll('meta[http-equiv]').forEach(m => { if (/refresh/i.test(m.getAttribute('http-equiv'))) { m.setAttribute('data-se-heq', m.getAttribute('http-equiv')); m.removeAttribute('http-equiv'); } });
  d.documentElement.setAttribute('data-se-edit', '');
  if (!d.head) d.documentElement.prepend(d.createElement('head'));
  d.head.appendChild(Object.assign(d.createElement('style'), { id: 'se-edit-style', textContent: EDIT_CSS }));
  if (!d.getElementById('se-style')) d.head.appendChild(Object.assign(d.createElement('style'), { id: 'se-style', textContent: RT_CSS }));
}

function mount(html){
  return new Promise(res => {
    const f = S.ifr;
    f.style.width = '1920px'; f.style.height = '1080px';
    f.onload = () => res();
    f.srcdoc = html;
  });
}

/* 처음엔 투명했다가 클래스가 붙으면 나타나는 요소(.x{opacity:0} + .x.on{opacity:1})는 스크립트를 멈춘 편집 화면에서 안 보인다.
   편집 전용 스타일로만 보이게 한다. 저장할 때 이 스타일은 빠지므로 발표 순서는 그대로다 */
function showBuilds(){
  S.builds = [];
  const rules = [];
  const walk = list => { for (const r of list) { if (r.selectorText) rules.push(r); else if (r.cssRules) walk(r.cssRules); } };
  for (const sh of S.edoc.styleSheets) { if (sh.ownerNode && sh.ownerNode.id === 'se-edit-style') continue; try { walk(sh.cssRules); } catch (e) {} }
  const sels = r => r.selectorText.split(',').map(x => x.trim());
  const isCls = x => /^\.[\w-]+$/.test(x);
  const shows = r => r.style.opacity !== '0' && r.style.visibility !== 'hidden' && (r.style.opacity || r.style.visibility);
  const found = new Map();
  for (const r of rules) {
    if (r.style.opacity !== '0' && r.style.visibility !== 'hidden') continue;
    for (const a of sels(r)) {
      if (!/\.[\w-]+$/.test(a) || S.slides.some(x => x.matches(a))) continue;
      if (rules.some(b => shows(b) && sels(b).some(x => (x.startsWith(a) && isCls(x.slice(a.length))) || (x.endsWith(a) && isCls(x.slice(0, -a.length)))))) found.set(a, r);
    }
  }
  if (!found.size) return;
  const scope = S.mode === 'slides' ? '[data-se-cur] ' : 'body ';
  S.builds = [...found].map(([sel, rule]) => ({ sel, rule }));
  S.edoc.getElementById('se-edit-style').textContent += [...found.keys()].map(a => `${scope}${a}{opacity:1;visibility:visible;transform:none;filter:none;transition:none}`).join(' ');
}
async function afterMount(startAt){
  S.ewin = S.ifr.contentWindow; S.edoc = S.ifr.contentDocument;
  const d = S.edoc;
  /* 링크·폼이 편집 창을 다른 곳으로 보내지 않게 막는다 */
  d.addEventListener('click', e => { if (e.target.closest && e.target.closest('a[href],button,input[type=submit]')) e.preventDefault(); }, true);
  d.addEventListener('submit', e => e.preventDefault(), true);
  d.addEventListener('keydown', onFrameKey, true);
  d.addEventListener('pointerdown', onFramePointer, true);
  d.addEventListener('paste', onFramePaste, true);
  d.addEventListener('selectionchange', () => { if (S.editing) { const s = d.getSelection(); if (s.rangeCount && S.editing.contains(s.getRangeAt(0).commonAncestorContainer)) S.lastRange = s.getRangeAt(0).cloneRange(); syncPanelSoon(); } });
  d.addEventListener('input', () => { if (S.editing) { setDirty(true); drawOv(); } });
  try { S.ewin.__SE_EDIT = 1; S.ewin.eval(RT_JS); } catch (e) {}
  detectSlides();
  showBuilds();
  setLoaded(true);
  collectStyles();
  applyShowHidden();
  goto(clamp(startAt, 0, Math.max(0, S.slides.length - 1)));
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(() => { layout(); drawOv(); });
  await resolveRelative();
  checkAssets();
}

/* 상대 경로 이미지는 폴더 손잡이로 읽어 보여 주고, 저장할 때 원래 경로로 되돌린다 */
const isRel = v => v && !/^(data:|blob:|[a-z]+:|\/\/|#|\/)/i.test(v.trim());
async function readRel(path){
  let cur = S.file.dir;
  const parts = decodeURIComponent(path.split(/[?#]/)[0]).split('/').filter(p => p && p !== '.');
  if (!parts.length || parts.includes('..')) return null;
  for (let i = 0; i < parts.length - 1; i++) cur = await cur.getDirectoryHandle(parts[i]);
  return (await cur.getFileHandle(parts[parts.length - 1])).getFile();
}
/* CSS 글 안의 상대 url()을 폴더에서 읽은 blob 주소로 바꾼다(base: CSS 파일이 있는 폴더) */
async function rewriteCssUrls(css, base){
  const urls = [...new Set([...css.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)].map(m => m[2]).filter(isRel))];
  for (const u of urls) {
    try { const f = await readRel(base + u); if (f) css = css.split(u).join(URL.createObjectURL(f)); } catch (e) {}
  }
  return css;
}
/* 상대 경로 그림·글꼴·CSS는 폴더 손잡이로 읽어 편집 화면에만 보여 주고, 저장할 때 원래대로 둔다 */
/* 문서가 옆 폴더에서 불러오는 파일 목록 */
function assetRefs(){
  const out = new Set(), add = v => { if (isRel(v)) out.add(v); };
  S.edoc.querySelectorAll('img[src],video[src],source[src],script[src]').forEach(el => add(el.getAttribute('data-se-orig-src') || el.getAttribute('src')));
  S.edoc.querySelectorAll('link[rel~="stylesheet"][href]').forEach(el => add(el.getAttribute('href')));
  S.edoc.querySelectorAll('style').forEach(st => { if (!/^se-/.test(st.id)) for (const m of st.textContent.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)) add(m[2]); });
  return [...out];
}
const isFont = v => /\.(ttf|otf|woff2?)([?#]|$)/i.test(v);
/* 못 불러온 글꼴·그림이 있으면 알린다: 폴더를 모르면 연결 단추, 폴더에 없으면 빠진 파일 이름 */
async function checkAssets(){
  const box = $('se-miss'), file = S.file;
  box.classList.add('hide'); box.innerHTML = '';
  const refs = assetRefs();
  const close = h('button', { type: 'button', class: 'ib', title: '닫기', onclick: () => box.classList.add('hide') }, ic('x'));
  if (!file.dir) {
    if (!refs.length || !window.showDirectoryPicker) return;
    const what = refs.every(isFont) ? '글꼴' : refs.some(isFont) ? '글꼴·그림' : '그림';
    box.append(h('span', { text: `${what} ${refs.length}개는 폴더를 연결해야 보여요` }), h('button', { type: 'button', class: 'btn sm pri', text: '폴더 연결', onclick: connectFolder }), close);
  } else {
    const miss = [];
    for (const r of refs) { if (r.split('/').includes('..')) continue; try { if (!(await readRel(r))) miss.push(r); } catch (e) { miss.push(r); } }
    if (S.file !== file || !miss.length) return;
    box.append(h('span', { title: miss.join('\n'), text: `이 폴더에 없는 파일 ${miss.length}개: ${miss.slice(0, 2).map(x => decodeURIComponent(x).split('/').pop()).join(', ')}${miss.length > 2 ? ' 외' : ''}` }), close);
  }
  box.classList.remove('hide');
}
async function connectFolder(){
  const f = S.file;
  try {
    const dir = await showDirectoryPicker({ ...(f.fh ? { startIn: f.fh } : {}), mode: 'readwrite' });
    if (f.fh && !(await holds(dir, f.fh))) return toast(`고른 폴더에 ‘${f.name}’이 없어요.`, 'bad');
    if (f.fh) await DB.set('kv', 'link:' + f.name, dir);
    f.dir = dir;
    await resolveRelative();
    checkAssets();
  } catch (e) { if (e.name !== 'AbortError') toast('폴더를 연결하지 못했어요: ' + e.message, 'bad'); }
}
async function resolveRelative(){
  const dir = S.file && S.file.dir;
  if (!dir) return;
  const els = [...S.edoc.querySelectorAll('img[src],video[src],source[src]')].filter(el => isRel(el.getAttribute('src')));
  for (const el of els) {
    const src = el.getAttribute('src');
    try {
      const f = await readRel(src); if (!f) continue;
      el.setAttribute('data-se-orig-src', src);
      el.setAttribute('src', URL.createObjectURL(f));
    } catch (e) {}
  }
  let extra = '';
  for (const st of S.edoc.querySelectorAll('style')) {
    if (/^se-/.test(st.id)) continue;
    const faces = (st.textContent.match(/@font-face\s*{[^}]*}/g) || []).filter(b => [...b.matchAll(/url\(\s*(['"]?)([^'")]+)\1/g)].some(m => isRel(m[2])));
    for (const b of faces) extra += await rewriteCssUrls(b, '') + '\n';
  }
  for (const ln of S.edoc.querySelectorAll('link[rel~="stylesheet"][href]')) {
    const href = ln.getAttribute('href'); if (!isRel(href)) continue;
    try { const f = await readRel(href); if (f) extra += await rewriteCssUrls(await f.text(), href.replace(/[^/]*$/, '')) + '\n'; } catch (e) {}
  }
  if (extra) S.edoc.head.appendChild(Object.assign(S.edoc.createElement('style'), { id: 'se-edit-assets', textContent: extra }));
  setTimeout(() => { collectStyles(); layout(); drawOv(); }, 120);
}

/* ===================================================================
   슬라이드
   =================================================================== */
function findSlides(d){
  let s = [...d.querySelectorAll('section.slide')];
  if (!s.length) s = [...d.querySelectorAll('.slide')].filter(x => !x.parentElement.closest('.slide'));
  if (!s.length) s = [...d.querySelectorAll('body > section')];
  return s;
}
function detectSlides(){
  S.slides = findSlides(S.edoc);
  S.mode = S.slides.length ? 'slides' : 'page';
  /* 문서에는 슬라이드 더하기·숨은 요소가 없다 */
  if ($('bPresent')) $('bPresent').classList.toggle('hide', S.mode === 'page');
  if ($('bNewSlide')) $('bNewSlide').classList.toggle('hide', S.mode === 'page');
  S.activeCls = null;
  let css = '';
  S.edoc.querySelectorAll('style').forEach(st => { if (st.id !== 'se-edit-style') css += st.textContent.replace(/url\(data:[^)]*\)/g, '') + '\n'; });
  const m = css.match(/\.slide\.(on|active|current|show|visible|is-active|present)\b/);
  if (m) S.activeCls = m[1];
}
function refreshSlides(){ S.slides = findSlides(S.edoc); }

/* ---------- 스크립트가 내용을 만드는 장 ----------
   파일 속 <section>은 비어 있고, 발표할 때 덱 스크립트가 자료(예: ANNO.rd1)로 내용을 그린다.
   편집 화면에는 덱을 몰래 돌려 그린 모습을 '참고 층'(data-se-ghost)으로 깔아 보여 준다. 참고 층은 저장되지 않는다. */
const kidsOf = n => [...n.children].filter(c => !c.hasAttribute('data-se-ghost'));
function isGenerated(s){
  for (const c of s.childNodes) {
    if (c.nodeType === 3 && c.textContent.trim()) return false;
    if (c.nodeType === 1 && !c.hasAttribute('data-se-ghost') && !c.classList.contains('se-box') && !/^(SCRIPT|STYLE|TEMPLATE)$/.test(c.tagName)) return false;
  }
  return true;
}
function withoutGhosts(fn){
  const gs = S.edoc ? [...S.edoc.querySelectorAll('[data-se-ghost]')].map(g => [g, g.parentNode]) : [];
  gs.forEach(([g]) => g.remove());
  try { return fn(); }
  finally { gs.forEach(([g, p]) => { if (p.isConnected && !p.querySelector(':scope > [data-se-ghost]')) p.insertBefore(g, p.firstChild); }); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PV = { f: null, url: null, ver: 0, loadedVer: -1, loading: null, cache: new Map(), moved: 0 };
function pvInvalidate(){ PV.ver++; PV.cache.clear(); }
/* 덱을 보이지 않는 창에 실제로 띄운다(발표자 창의 '미리보기' 모드라 소리·조작이 없다) */
function pvLoad(){
  if (PV.f && PV.loadedVer === PV.ver) return Promise.resolve(true);
  if (PV.loading && PV.loading.ver === PV.ver) return PV.loading.p;
  const ver = PV.ver;
  const p = (async () => {
    let html = serialize({ preview: true, noStart: true, quiet: true, tagK: true });
    html = html.replace(/<head[^>]*>/i, m => m + '<script>window.DECK_VIEW="peek";<\/script>');
    if (!PV.f) {
      PV.f = h('iframe', { 'aria-hidden': 'true', tabindex: '-1', style: 'position:fixed;left:0;top:0;width:1920px;height:1080px;border:0;opacity:0;pointer-events:none;z-index:-1' });
      document.body.appendChild(PV.f);
    }
    /* blob: 주소로 띄우면 편집기를 파일(file://)로 열었을 때 '다른 출처'가 되어 안을 들여다볼 수 없다.
       srcdoc은 편집기와 같은 출처를 물려받아 파일로 열어도 읽힌다. 15초 안에 안 뜨면 포기한다. */
    await new Promise(r => { const to = setTimeout(r, 15000); PV.f.onload = () => { clearTimeout(to); r(); }; PV.f.srcdoc = html; });
    let ok = false;
    for (let i = 0; i < 120 && !ok; i++) { try { ok = PV.f.contentWindow.__seDeck.ready(); } catch (e) {} if (!ok) await sleep(60); }
    if (ver === PV.ver) PV.loadedVer = ver;
    return ok;
  })();
  PV.loading = { ver, p };
  return p;
}
/* ---------- 숨은 요소 겹쳐 보기 ----------
   편집 화면은 덱 스크립트를 멈춘 사본이라, 발표 때만 보이는 것이 빠진다.
   ① 스크립트가 그려 넣는 요소(빈 <svg>에 그리는 그림 등)  ② 처음 상태가 숨김이라 애니메이션이 있어야 보이는 요소
   몰래 띄운 덱(PV)에서 그 장을 진행시킨 모습을 떠 와, 편집 화면에서 안 보이는 것만 참고 층(data-se-ghost)으로 깐다. */
function hiddenInEditor(el){
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    const c = cs(n);
    if (c.display === 'none' || c.visibility === 'hidden' || parseFloat(c.opacity) < 0.05) return true;
    const m = (c.transform || '').match(/matrix\(([^)]+)\)/);
    if (m) { const [a, b, cc, d] = m[1].split(',').map(parseFloat); if (Math.hypot(a, b) < 0.05 || Math.hypot(cc, d) < 0.05) return true; }
    if (/inset\([^)]*100%/.test(c.clipPath || '')) return true;
    if (n === S.box) break;
  }
  if (el instanceof S.ewin.SVGElement && el.hasAttribute('pathLength') && parseFloat(cs(el).strokeDashoffset) > 0.01) return true;
  return false;
}
/* 스크립트가 새로 만든 요소라도, 글자를 한 자씩 쪼개 감싼 것처럼 파일에 이미 있는 글자라면 '이미 보이는 것'으로 본다 */
const normT = s => (s || '').replace(/\s+/g, '');
function rewrapped(pvEl){
  const t = normT(pvEl.textContent);
  if (!t) return false;
  const anc = pvEl.parentElement && pvEl.parentElement.closest('[data-se-k]');
  const ed = anc ? S.pvMap[anc.getAttribute('data-se-k')] : null;
  return !!(ed && ed.isConnected && !hiddenInEditor(ed) && normT(ed.textContent).includes(t));
}
async function ghostHtml(i, step){
  if (!S.hasEngine) return null;
  const key = 'g' + i + ':' + (step == null ? 'end' : step);
  if (PV.cache.has(key)) return PV.cache.get(key);
  const ver = PV.ver;
  const ok = await pvLoad();
  /* 그사이 또 고쳤다면 실패가 아니라 '낡음': 지금 보이는 참고 층은 두고 조금 뒤 다시 읽는다 */
  if (ver !== PV.ver || PL.on) return 'stale';   /* 재생 중에는 덱 창을 움직이지 않는다 */
  if (!ok) return null;
  const w = PV.f.contentWindow;
  /* 기다리는 사이 움직임 목록이 덱을 처음으로 돌려놓으면 다시 맞춘다 */
  let tok;
  for (let n = 0; n < 5; n++) {
    tok = PV.moved;
    try { w.__seDeck.go(i, step); } catch (e) { return null; }
    await sleep(40);
    if (tok === PV.moved) break;
  }
  const s = findSlides(w.document)[i]; if (!s) return null;
  const c = s.cloneNode(true);
  const A = [...s.querySelectorAll('*')], B = [...c.querySelectorAll('*')];
  let shown = 0;
  const roots = new Set();   /* 단추에 보일 개수: 그림 한 장 안의 선들은 하나로 센다 */
  /* 끝 상태에서 납작해지거나 투명해진 요소(뒤집혀 사라진 빈칸 ? 등)는 안 보이는 것으로 친다 */
  const drawn = el => {
    const r = el.getBoundingClientRect();
    if (el instanceof w.SVGElement ? r.width < 1 && r.height < 1 : r.width < 1 || r.height < 1) return false;
    for (let n = el; n && n !== s.parentElement; n = n.parentElement) if (parseFloat(w.getComputedStyle(n).opacity) < 0.05) return false;
    return true;
  };
  for (let j = 0; j < A.length; j++) {
    const a = A[j], b = B[j];
    if (a.closest('.se-box')) continue;
    const vis = w.getComputedStyle(a).visibility === 'visible';
    const k = a.getAttribute('data-se-k'), ed = k != null ? S.pvMap[k] : null;
    /* 편집 화면에서 이미 보이는 요소는 참고 층에서 감춘다(겹쳐 두 번 그려지지 않게) */
    const show = vis && !(ed && ed.isConnected && !hiddenInEditor(ed)) && !(k == null && rewrapped(a));
    if (b.style) b.style.setProperty('visibility', show ? 'visible' : 'hidden', 'important');
    if (show && (!a.children.length || a instanceof w.SVGElement) && (a.textContent.trim() || a instanceof w.SVGElement || /^(IMG|CANVAS|VIDEO)$/.test(a.tagName)) && drawn(a)) { shown++; roots.add(a.ownerSVGElement || a); }
  }
  c.querySelectorAll('.se-box,script').forEach(n => n.remove());
  c.querySelectorAll('*').forEach(el => { for (const at of [...el.attributes]) if (/^on/i.test(at.name) || at.name === 'data-se-k') el.removeAttribute(at.name); });
  const items = [...roots].filter(r => ![...roots].some(o => o !== r && o.contains(r))).length;
  const out = { html: shown ? c.innerHTML : '', shown, items };
  if (ver === PV.ver) PV.cache.set(key, out);
  return out;
}
const needGhost = i => { const s = S.slides[i]; return S.mode === 'slides' && s && (S.present || isGenerated(s)); };
async function showGhost(i){
  const s = S.slides[i]; if (!s) return;
  if (!needGhost(i)) {
    s.querySelectorAll(':scope > [data-se-ghost]').forEach(g => g.remove()); S.ghost = null; note();
    const r = S.mode === 'slides' ? await ghostHtml(i, null) : null;
    if (S.cur === i && r && r !== 'stale') hiddenCount(r.items);
    return;
  }
  const had = s.querySelector(':scope > [data-se-ghost]');
  if (!had) { S.ghost = { i, state: 'loading' }; note(); }
  const step = isGenerated(s) ? null : S.pstep;
  const r = await ghostHtml(i, step);
  if (S.cur !== i || S.slides[i] !== s || !s.isConnected) return;
  if (r === 'stale') { refreshGhostSoon(); return; }
  s.querySelectorAll(':scope > [data-se-ghost]').forEach(g => g.remove());
  if (!r) { S.ghost = { i, state: 'fail' }; note(); hiddenCount(0); return; }
  if (r.html) {
    const g = S.edoc.createElement('div'); g.setAttribute('data-se-ghost', isGenerated(s) ? 'all' : ''); g.innerHTML = r.html;
    s.insertBefore(g, s.firstChild);
  }
  S.ghost = { i, state: r.html ? 'ok' : 'none', shown: r.shown }; note(); drawOv(); renderSlidesSoon();
  hiddenCount(isGenerated(s) ? null : r.items);
}
/* 단추의 숫자: 이 장에 숨은 요소가 몇 개인지. 없으면 눌러도 달라지는 게 없다는 뜻으로 흐리게 */
function hiddenCount(n){
  const c = $('se-hcount'), b = $('bPresent'); if (!c || !b) return;
  c.textContent = n || ''; c.classList.toggle('hide', !n);
  b.classList.toggle('empty', n === 0);
}
function refreshGhost(){ if (S.mode === 'slides' && S.slides[S.cur]) showGhost(S.cur); }
const refreshGhostSoon = debounce(() => { if (PL.on) { refreshGhostSoon(); return; } if (!S.editing && !MV && !S.marq) refreshGhost(); }, 900);
function setPresent(on){
  S.present = on; S.pstep = null;
  $('bPresent').classList.toggle('on', on);
  try { localStorage.setItem('se-present', on ? '1' : '0'); } catch (e) {}
  refreshGhost();
}
function note(){
  const n = $('se-note'); if (!n) return;
  const s = S.slides[S.cur];
  const gen = S.mode === 'slides' && s && isGenerated(s);
  const st = S.ghost && S.ghost.i === S.cur ? S.ghost.state : null;
  const on = gen || (S.present && st && st !== 'none');
  n.classList.toggle('hide', !on);
  if (!on) return;
  /* 겹쳐 보기는 위 막대 ‘숨은 요소 보기’ 단추가 켜져 있는 것으로 충분하다. 띠는 할 일이 있을 때만 */
  if (gen) n.textContent = '발표 때 그려지는 장이에요 · 글자는 오른쪽 ‘이 장의 글자’에서 고쳐요';
  else n.classList.add('hide');
}

/* ---------- 모션 목록: 그 장의 GSAP 타임라인을 읽는다 ---------- */
const META = new Set(['duration', 'ease', 'delay', 'stagger', 'overwrite', 'startAt', 'repeat', 'yoyo', 'repeatDelay', 'immediateRender', 'lazy', 'id', 'paused', 'callbackScope', 'runBackwards', 'data', 'inherit', 'keyframes', 'transformOrigin', 'reversed', 'yoyoEase', 'force3D', 'autoAlpha_']);
function describe(v){
  const back = !!v.runBackwards, from = back ? v : (v.startAt || {}), to = back ? {} : v;
  const keys = Object.keys(v).filter(k => !META.has(k) && !/^on[A-Z]/.test(k) && typeof v[k] !== 'function' && !['parent', 'scrollTrigger', 'modifiers', 'snap', 'callbackScope'].includes(k));
  if (!keys.length && !(v.startAt && Object.keys(v.startAt).length)) return { name: '' };
  const has = k => keys.includes(k) || (from && k in from);
  const num = (o, k, d) => (o && o[k] != null && !isNaN(parseFloat(o[k]))) ? parseFloat(o[k]) : d;
  const fo = num(from, 'opacity', num(from, 'autoAlpha', null)), toO = num(to, 'opacity', num(to, 'autoAlpha', null));
  const appear = (fo != null && fo < 0.5) || (back && (has('opacity') || has('autoAlpha')) && num(from, 'opacity', num(from, 'autoAlpha', 1)) < 0.5);
  const vanish = toO != null && toO < 0.1 && !appear;
  const dy = num(from, 'y', 0), dx = num(from, 'x', 0);
  const parts = [];
  let name = '', icon = 'spark';
  if (has('strokeDashoffset') || has('drawSVG')) { name = '선 그리기'; icon = 'line'; }
  else if ((has('scaleX') && num(from, 'scaleX', 1) < 0.2) || (has('scaleY') && num(from, 'scaleY', 1) < 0.2)) { name = '펼치기 (밑줄·막대)'; icon = 'wipe'; }
  else if (has('clipPath')) { name = '닦아내며 나타나기'; icon = 'wipe'; }
  else if (appear && (dy || dx)) { name = dy > 0 ? '위로 떠오르며 나타나기' : dy < 0 ? '아래로 내려오며 나타나기' : dx < 0 ? '왼쪽에서 들어오기' : '오른쪽에서 들어오기'; icon = dy > 0 ? 'up' : dy < 0 ? 'down' : dx < 0 ? 'right' : 'left'; }
  else if (appear && (has('scale') || has('scaleX'))) { name = num(from, 'scale', 1) > 1 ? '작아지며 나타나기' : '커지며 나타나기'; icon = 'zoom'; }
  else if (appear && has('rotation')) { name = '돌며 나타나기'; icon = 'reset'; }
  else if (appear) { name = '나타나기'; icon = 'fade'; }
  else if (vanish) { name = '사라지기 · 흐려지기'; icon = 'fade'; }
  else if (toO != null && has('opacity')) { name = '흐려지기'; icon = 'fade'; }
  else if (has('x') || has('y') || has('xPercent') || has('yPercent') || has('left') || has('top')) { name = '움직이기'; icon = 'right'; }
  else if (has('scale') || has('scaleX') || has('scaleY')) { name = '크기 바꾸기'; icon = 'zoom'; }
  else if (has('rotation') || has('rotate')) { name = '돌리기'; icon = 'reset'; }
  else if (has('attr')) { const at = Object.keys(v.attr || {}); name = at.some(k => /width|height|x2|y2|r$/.test(k)) ? '늘어나기' : '모양 바꾸기'; icon = at.some(k => /width|height/.test(k)) ? 'wipe' : 'square'; }
  else if (keys.some(k => /color|fill|stroke|background/i.test(k))) { name = '색 바꾸기'; icon = 'eye'; }
  else if (has('text') || has('innerHTML')) { name = '글자 바뀜'; icon = 'text'; }
  else if (keys.length) { name = '값 바꾸기'; icon = 'more'; }
  if (dy) parts.push(`${dy > 0 ? '아래' : '위'} ${Math.abs(Math.round(dy))}px에서`);
  if (dx) parts.push(`${dx > 0 ? '오른쪽' : '왼쪽'} ${Math.abs(Math.round(dx))}px에서`);
  return { name, icon, detail: parts.join(' · '), keys, appear };
}
async function motionsOf(i){
  if (!S.hasEngine) return null;
  const key = 'm' + i;
  if (PV.cache.has(key)) return PV.cache.get(key);
  const ver = PV.ver;
  const ok = await pvLoad();
  if (PV.cache.has(key)) return PV.cache.get(key);
  if (ver !== PV.ver || PL.on) return 'stale';
  if (!ok) return null;
  const w = PV.f.contentWindow, g = w.gsap;
  const before = g ? new Set(g.globalTimeline.getChildren(false, true, true)) : null;
  PV.moved++;
  try { w.__seDeck.go(i, 0); } catch (e) { return null; }
  const st = w.__seDeck.state() || {};
  const slide = findSlides(w.document)[i]; if (!slide) return null;
  const sr = slide.getBoundingClientRect();
  const out = { gsap: !!g, labels: st.labels || [], n: st.n || 0, items: [] };
  const target = el => {
    const r = el.getBoundingClientRect(), box = { x: r.left - sr.left, y: r.top - sr.top, w: r.width, h: r.height };
    const k = el.getAttribute && el.getAttribute('data-se-k'), ed = k != null ? S.pvMap[k] : null;
    if (ed && ed.isConnected) return { ed, box, status: hiddenInEditor(ed) ? 'hidden' : 'ok' };
    const anc = el.closest && el.closest('[data-se-k]'), ae = anc ? S.pvMap[anc.getAttribute('data-se-k')] : null;
    const aed = ae && ae !== S.slides[i] && ae.isConnected ? ae : null;
    /* 글자를 쪼개 감싼 것: 파일의 그 글자 요소가 움직이는 것으로 보여 준다 */
    if (aed && rewrapped(el)) return { ed: aed, box, status: hiddenInEditor(aed) ? 'hidden' : 'ok', split: true };
    return { ed: aed, box, status: 'script', tag: el.tagName.toLowerCase() };
  };
  if (g) {
    const tops = g.globalTimeline.getChildren(false, true, true).filter(c => !before.has(c));
    let main = null, best = -1;
    for (const t of tops) if (t.getChildren) { const sc = t.getChildren(true, true, false).filter(c => c.data === 'isPause').length * 1e4 + t.duration(); if (sc > best) { best = sc; main = t; } }
    const pauses = [], tws = [];
    const walk = (node, off, top, ts) => {
      for (const c of node.getChildren(false, true, true)) {
        const t0 = off + c.startTime() / ts;
        if (c.getChildren) { walk(c, t0, top, ts * c.timeScale()); continue; }
        if (c.data === 'isPause') { if (top === main) pauses.push(t0); continue; }
        tws.push({ c, t: t0, top, ts: ts * c.timeScale() });
      }
    };
    for (const t of tops) { if (t.getChildren) walk(t, 0, t, 1); else tws.push({ c: t, t: 0, top: t, ts: 1 }); }
    pauses.sort((a, b) => a - b);
    /* 재생할 때 쓰려고 타임라인의 멈춤 자리와 길이를 남겨 둔다 */
    out.pauses = pauses; out.dur = main ? main.duration() : 0;
    for (const { c, t, top, ts } of tws) {
      const els = c.targets().filter(x => x && x.nodeType === 1 && x !== slide && slide.contains(x));
      const objs = c.targets().filter(x => !x || x.nodeType !== 1);
      const d = describe(c.vars);
      if (!d.name) continue;
      if (!els.length && !objs.length) continue;
      if (!els.length && c.targets().some(x => x === slide)) continue;
      const loop = c.vars.repeat === -1 || (top.vars && top.vars.repeat === -1);
      const step = loop ? 'loop' : top === main ? pauses.filter(p => p <= t + 1e-3).length : 0;
      /* 고칠 수 있는 움직임: 메인 타임라인의 호출이고, 첫 대상이 파일에 있는 요소일 때 */
      const tag = top === main && !loop && c.vars.data && c.vars.data.se;
      const ek = tag && tag[0].getAttribute('data-se-k'), ed0 = ek != null && S.pvMap[ek];
      const edit = ed0 && ed0.isConnected ? { ed: ed0, k: tag[1], how: tag[2] } : null;
      out.items.push({ step, t: Math.max(0, t - (step && step !== 'loop' ? pauses[step - 1] : 0)), tAbs: t, inMain: top === main, d: c.duration() / ts, ...d, loop, tag: tag || null, edit,
        targets: els.map(target), obj: !els.length });
    }
  }
  /* GSAP가 아닌 움직임(CSS 애니메이션) */
  for (const a of w.document.getAnimations ? w.document.getAnimations() : []) {
    const el = a.effect && a.effect.target;
    if (!el || !slide.contains(el) || el.closest('[data-se-anim]')) continue;
    out.items.push({ step: 0, t: 0, d: (a.effect.getTiming().duration || 0) / 1000, name: '움직임', icon: 'spark', detail: '', loop: a.effect.getTiming().iterations === Infinity, targets: [target(el)] });
  }
  /* 같은 단계·같은 시각·같은 효과는 한 줄로 묶는다 */
  const groups = [];
  for (const it of out.items) {
    const st0 = it.targets.map(x => x.status).sort().join();
    const g0 = groups.find(x => (it.tag && x.tag === it.tag) || (x.step === it.step && Math.abs(x.t - it.t) < 0.02 && x.name === it.name && x.st === st0 && x.obj === it.obj));
    if (g0) {
      g0.targets.push(...it.targets); g0.d = Math.max(g0.d, it.t + it.d - g0.t);
      g0.canEdit = g0.canEdit && !!it.edit;
      if (it.edit && !g0.edits.some(e => e.ed === it.edit.ed && e.k === it.edit.k)) g0.edits.push(it.edit);
    } else groups.push({ ...it, st: st0, edits: it.edit ? [it.edit] : [], canEdit: !!it.edit });
  }
  const ord = s => s === 'loop' ? 1e6 : s;
  groups.sort((a, b) => ord(a.step) - ord(b.step) || a.t - b.t);
  out.items = groups;
  if (ver === PV.ver) PV.cache.set(key, out);
  return out;
}

/* ---------- 스크립트 속 자료에서 이 장의 글자 찾기 ---------- */
/* 문장 하나(…;)의 끝까지 따옴표·괄호·주석을 건너뛰며 훑는다 */
function scanJs(text, from, onStr){
  let i = from, depth = 0, started = false;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (c === '/' && text[i + 1] === '/') { i = text.indexOf('\n', i); if (i < 0) return n; continue; }
    if (c === '/' && text[i + 1] === '*') { i = text.indexOf('*/', i + 2); if (i < 0) return n; i += 2; continue; }
    if (c === "'" || c === '"' || c === '`') {
      let j = i + 1;
      while (j < n && text[j] !== c) { if (text[j] === '\\') j++; else if (c !== '`' && text[j] === '\n') break; j++; }
      if (onStr) onStr(i, j + 1, c);
      i = j + 1; started = true; continue;
    }
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) { depth--; if (depth < 0) return i; }
    else if (c === ';' && depth <= 0 && started) return i + 1;
    else if (!/\s/.test(c)) started = true;
    i++;
    if (i - from > 60000) return i;
  }
  return n;
}
const HANGUL = /[ㄱ-ㆎ가-힣一-鿿]/;
function jsUnescape(raw, q){
  const body = raw.slice(1, -1);
  if (q === '`') return body.replace(/\\`/g, '`');
  return body.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (m, e) => {
    if (e[0] === 'u') return String.fromCodePoint(parseInt(e.replace(/[u{}]/g, ''), 16));
    if (e[0] === 'x' && e.length === 3) return String.fromCharCode(parseInt(e.slice(1), 16));
    return { n: '\n', t: '\t', r: '\r', '0': '\0' }[e] || e;
  });
}
function jsEscape(v, q){
  if (q === '`') return '`' + v.replace(/\\/g, '\\\\').replace(/`/g, '\\`') + '`';
  return q + v.replace(/\\/g, '\\\\').replace(new RegExp(q, 'g'), '\\' + q).replace(/\n/g, '\\n') + q;
}
function dataSource(s){
  const keys = [...s.attributes].filter(a => a.name.startsWith('data-') && !/^data-(title|sec|se-)/.test(a.name) && /^[\w$]+$/.test(a.value))
    .sort((a, b) => (a.name === 'data-scene') - (b.name === 'data-scene')).map(a => a.value);
  const scripts = [...S.edoc.querySelectorAll('script')];
  for (const k of keys) {
    const re = new RegExp('(?:\\.|\\[\\s*[\'"])' + k.replace(/\$/g, '\\$') + '(?:[\'"]\\s*\\])?\\s*=(?!=)');
    for (let si = 0; si < scripts.length; si++) {
      const t = scripts[si].textContent, m = re.exec(t);
      if (!m) continue;
      const start = m.index, end = scanJs(t, m.index + m[0].length);
      return { si, key: k, start, end };
    }
  }
  return null;
}
/* 스크립트에 글자 상수로 정의된 이름(예: HA='ᄒᆞᆫ')을 모은다 */
function jsConsts(){
  const map = {};
  for (const sc of S.edoc.querySelectorAll('script')) {
    for (const m of sc.textContent.matchAll(/\b([A-Za-z_$][\w$]*)\s*=\s*(['"])((?:\\.|(?!\2)[^\\\n])*)\2(?=\s*[;,\n])/g))
      if (!(m[1] in map)) map[m[1]] = jsUnescape(m[2] + m[3] + m[2], m[2]);
  }
  return map;
}
function dataStrings(src){
  const t = S.edoc.querySelectorAll('script')[src.si].textContent, toks = [];
  src.end = scanJs(t, src.start + (t.slice(src.start).indexOf('=') + 1), (a, b, q) => {
    const raw = t.slice(a, b); if (raw.length < 2 || raw[raw.length - 1] !== q) return;
    toks.push({ a, b, q, v: jsUnescape(raw, q) });
  });
  /* '녯사'+RAM+' 풍류' 처럼 상수로 이어 붙인 글은 한 칸으로 합친다(저장할 때는 글자 하나로 쓴다) */
  const K = jsConsts(), out = [];
  const joinable = gap => { const m = gap.match(/^\s*\+\s*((?:[A-Za-z_$][\w$]*\s*\+\s*)*)$/); if (!m) return null; const ids = m[1].split('+').map(s => s.trim()).filter(Boolean); return ids.every(i => i in K) ? ids.map(i => K[i]).join('') : null; };
  for (let i = 0; i < toks.length; i++) {
    const c = { ...toks[i], q: toks[i].q === '`' ? '`' : "'" };
    while (i + 1 < toks.length && toks[i + 1].q !== '`' && c.q !== '`') {
      const mid = joinable(t.slice(c.b, toks[i + 1].a)); if (mid == null) break;
      i++; c.v += mid + toks[i].v; c.b = toks[i].b;
    }
    const tail = t.slice(c.b).match(/^\s*\+\s*([A-Za-z_$][\w$]*)(?![\w$(.[])/);
    if (tail && tail[1] in K && c.q !== '`') { c.v += K[tail[1]]; c.b += tail[0].length; }
    if (!HANGUL.test(c.v)) continue;
    const km = t.slice(Math.max(0, c.a - 24), c.a).match(/([\w$]+)\s*:\s*$/);
    c.key = km ? km[1] : '';
    out.push(c);
  }
  return out;
}

function goto(i, keepSel){
  endEdit(); settle();
  const d = S.edoc; if (!d) return;
  d.querySelectorAll('[data-se-cur],[data-se-off],[data-se-anc]').forEach(el => { el.removeAttribute('data-se-cur'); el.removeAttribute('data-se-off'); el.removeAttribute('data-se-anc'); });
  d.querySelectorAll('[data-se-addcls]').forEach(el => { el.classList.remove(el.getAttribute('data-se-addcls')); el.removeAttribute('data-se-addcls'); });
  if (S.mode === 'page') {
    S.cur = 0; S.root = d.documentElement; S.box = d.body;
  } else {
    S.cur = clamp(i, 0, S.slides.length - 1);
    const s = S.slides[S.cur];
    S.root = S.box = s;
    s.setAttribute('data-se-cur', '');
    if (S.activeCls && !s.classList.contains(S.activeCls)) { s.classList.add(S.activeCls); s.setAttribute('data-se-addcls', S.activeCls); }
    let n = s;
    while (n && n !== d.body && n.parentElement) {
      const p = n.parentElement;
      for (const c of p.children) if (c !== n && !/^(SCRIPT|STYLE|LINK|META|TEMPLATE|TITLE)$/.test(c.tagName)) c.setAttribute('data-se-off', '');
      if (p !== d.body) p.setAttribute('data-se-anc', '');
      n = p;
    }
  }
  if (!keepSel) S.sel = [];
  S.sel = S.sel.filter(el => el.isConnected && S.box.contains(el) && el !== S.box);
  if (PL.on) pvHide();
  if (S.mode === 'slides') {
    const s = S.slides[S.cur];
    if (!keepSel) S.pstep = null;
    if (S.ghost && S.ghost.i !== S.cur) S.ghost = null;
    S.mhl = null;
    showGhost(S.cur);
  }
  note();
  layout(); renderSlides(); renderPanel(); drawOv();
  const it = document.querySelector('.sl.cur'); if (it) it.scrollIntoView({ block: 'nearest' });
}

function slideTitle(s){
  const t = s.getAttribute('data-title');
  if (t) return t;
  const hd = s.querySelector('h1,h2,h3,.title');
  return (hd && hd.textContent.trim().slice(0, 40)) || '(제목 없음)';
}
function slideSub(s){
  const t = (s.textContent || '').replace(/\s+/g, ' ').trim();
  const title = slideTitle(s);
  return t.replace(title, '').trim().slice(0, 48);
}

function renderSlides(){
  const wrap = $('se-slides'); wrap.innerHTML = '';
  if (!S.edoc) return;
  if (S.mode === 'page') {
    $('se-count').textContent = '';
    $('se-listt').textContent = '목차';
    const heads = [...S.edoc.body.querySelectorAll('h1,h2,h3')].filter(e => e.textContent.trim());
    heads.forEach(e => {
      const lv = +e.tagName[1], r = h('div', { class: 'sl', style: `padding-left:${8 + (lv - 1) * 14}px` }, h('div', { class: 'tx' }, h('div', { class: lv === 1 ? 't' : 's', text: e.textContent.trim() })));
      r.onclick = () => { select([e]); e.scrollIntoView({ block: 'center' }); };
      wrap.appendChild(r);
    });
    if (!heads.length) wrap.appendChild(h('div', { class: 'hint', style: 'padding:6px 8px', text: '제목이 없어요' }));
    $('se-stat').textContent = '일반 문서';
    return;
  }
  $('se-listt').textContent = '슬라이드';
  $('se-count').textContent = S.slides.length + '장';
  S.slides.forEach((s, i) => {
    const anims = s.querySelectorAll('[data-se-anim]').length, widgets = s.querySelectorAll('[data-se-widget]').length, gen = isGenerated(s), skip = s.hasAttribute('data-se-skip');
    const it = h('div', { class: 'sl' + (i === S.cur ? ' cur' : '') + (skip ? ' skip' : ''), draggable: 'true' },
      h('span', { class: 'n', text: i + 1 }),
      h('div', { class: 'tx' }, h('div', { class: 't', text: slideTitle(s) }), h('div', { class: 's', text: slideSub(s) || (gen ? '덱 스크립트가 그리는 장' : ' ') }),
        (anims || widgets || gen || skip) ? h('div', { class: 'bd' }, skip ? h('i', { text: '건너뜀' }) : null, gen ? h('i', { class: 'gen', text: '스크립트', title: '발표할 때 덱 스크립트가 내용을 그리는 장' }) : null, anims ? h('i', { text: '등장 ' + anims }) : null, widgets ? h('i', { text: '기능 ' + widgets }) : null) : null),
      h('div', { class: 'acts' },
        h('button', { type: 'button', title: skip ? '발표에 다시 넣기' : '발표 때 건너뛰기', onclick: e => { e.stopPropagation(); toggleSkip(i); } }, ic(skip ? 'eye' : 'eyeoff')),
        h('button', { type: 'button', title: '이 슬라이드 복제', onclick: e => { e.stopPropagation(); dupSlide(i); } }, ic('copy')),
        h('button', { type: 'button', title: '이 슬라이드 삭제', onclick: e => { e.stopPropagation(); delSlide(i); } }, ic('trash'))));
    it.onclick = () => goto(i);
    it.addEventListener('dragstart', e => { e.dataTransfer.setData('text/se-slide', String(i)); e.dataTransfer.effectAllowed = 'move'; });
    it.addEventListener('dragover', e => {
      if (![...e.dataTransfer.types].includes('text/se-slide')) return;
      e.preventDefault();
      const r = it.getBoundingClientRect(), after = e.clientY > r.top + r.height / 2;
      it.classList.toggle('drop-b', after); it.classList.toggle('drop-t', !after);
    });
    it.addEventListener('dragleave', () => it.classList.remove('drop-b', 'drop-t'));
    it.addEventListener('drop', e => {
      e.preventDefault(); it.classList.remove('drop-b', 'drop-t');
      const from = +e.dataTransfer.getData('text/se-slide');
      const r = it.getBoundingClientRect(), after = e.clientY > r.top + r.height / 2;
      moveSlide(from, i + (after ? 1 : 0));
    });
    wrap.appendChild(it);
  });
  const s = S.slides[S.cur];
  $('se-stat').textContent = `슬라이드 ${S.cur + 1} / ${S.slides.length}`;
}
const renderSlidesSoon = debounce(renderSlides, 250);

function cleanClone(s, deep){
  const n = s.cloneNode(deep);
  const strip = el => { ['data-se-cur', 'data-se-off', 'data-se-anc', 'data-se-ce', 'contenteditable'].forEach(a => el.removeAttribute(a)); const ac = el.getAttribute('data-se-addcls'); if (ac) { el.classList.remove(ac); el.removeAttribute('data-se-addcls'); } };
  strip(n); if (deep) { n.querySelectorAll('[data-se-ghost]').forEach(g => g.remove()); n.querySelectorAll('*').forEach(strip); }
  return n;
}
function newSlide(){
  if (S.mode !== 'slides') return toast('슬라이드가 없는 문서예요.');
  change('all', () => {
    const s = S.slides[S.cur], n = cleanClone(s, false);
    n.removeAttribute('id');
    n.setAttribute('data-scene', 'se-blank'); n.setAttribute('data-title', '새 슬라이드');
    n.appendChild(Object.assign(S.edoc.createElement('h2'), { className: 'se-box', textContent: '새 슬라이드 제목' }));
    n.lastChild.style.cssText = `position:absolute;left:${rnd(S.rect.w / S.k * 0.06)}px;top:${rnd(S.rect.h / S.k * 0.09)}px;margin:0;font-size:72px;line-height:1.2`;
    s.after(n);
  }, () => { refreshSlides(); goto(S.cur + 1); });
}
function dupSlide(i){
  change('all', () => { const s = S.slides[i]; s.after(cleanClone(s, true)); }, () => { refreshSlides(); goto(i + 1); });
}
function delSlide(i){
  if (S.slides.length < 2) return toast('마지막 한 장은 지울 수 없어요.');
  change('all', () => { S.slides[i].remove(); }, () => { refreshSlides(); goto(Math.min(i, S.slides.length - 1)); });
  toast(`${i + 1}번 슬라이드를 지웠어요.`, null, { label: '되돌리기', fn: undo });
}
/* 파일에는 남겨 두고 발표 때만 뺀다(저장할 때 빼는 스크립트를 넣는다) */
function toggleSkip(i){ change('all', () => S.slides[i].toggleAttribute('data-se-skip'), renderSlides); }
function moveSlide(from, to){
  if (to < 0 || to > S.slides.length || from === to || from + 1 === to) return;
  let moved = null;
  change('all', () => {
    const s = S.slides[from], ref = S.slides[to];
    moved = s;
    if (ref) ref.before(s); else S.slides[S.slides.length - 1].after(s);
  }, () => { refreshSlides(); goto(Math.max(0, S.slides.indexOf(moved))); });
}

/* ===================================================================
   화면 배치와 좌표
   =================================================================== */
function layout(){
  if (!S.edoc || !S.root) return;
  const f = S.ifr, cv = $('se-canvas');
  let r;
  if (S.mode === 'page') {
    f.style.width = '1280px';
    const hgt = Math.max(720, S.edoc.documentElement.scrollHeight);
    f.style.height = hgt + 'px';
    r = { left: 0, top: 0, width: 1280, height: hgt };
    S.k = 1;
  } else {
    r = S.root.getBoundingClientRect();
    /* 무대를 left:50% 같은 식으로 가운데 두는 덱은 창을 넓히면 무대도 따라 밀린다: 다 들어올 때까지 몇 번 넓힌다 */
    for (let n = 0; n < 6; n++) {
      const W = Math.ceil(Math.max(1920, r.right + 1)), H = Math.ceil(Math.max(1080, r.bottom + 1));
      if (parseFloat(f.style.width) >= W && parseFloat(f.style.height) >= H) break;
      f.style.width = Math.max(W, parseFloat(f.style.width)) + 'px'; f.style.height = Math.max(H, parseFloat(f.style.height)) + 'px';
      r = S.root.getBoundingClientRect();
    }
    S.k = (r.width / (S.root.offsetWidth || r.width)) || 1;
  }
  S.rect = { x: r.left, y: r.top, w: r.width || 1, h: r.height || 1 };
  PAD = Math.round(clamp(Math.min(cv.clientWidth, cv.clientHeight) * 0.05, 14, 44));
  const cw = cv.clientWidth - PAD * 2, ch = cv.clientHeight - PAD * 2;
  let sc = S.zoom === 'fit' ? (S.mode === 'page' ? Math.min(1, cw / S.rect.w) : Math.min(cw / S.rect.w, ch / S.rect.h)) : S.zoom;
  sc = clamp(sc, 0.05, 4); S.scale = sc;
  const pw = S.rect.w * sc, ph = S.rect.h * sc;
  const wrap = $('se-stagewrap'), paper = $('se-paper'), ov = $('se-ov');
  wrap.style.width = (pw + PAD * 2) + 'px'; wrap.style.height = (ph + PAD * 2) + 'px';
  for (const el of [paper, ov]) { el.style.left = PAD + 'px'; el.style.top = PAD + 'px'; el.style.width = pw + 'px'; el.style.height = ph + 'px'; }
  f.style.transform = `scale(${sc})`;
  f.style.left = (-S.rect.x * sc) + 'px'; f.style.top = (-S.rect.y * sc) + 'px';
  $('bZfit').textContent = Math.round(sc * 100) + '%';
}
function setZoom(z){ S.zoom = z === 'fit' ? 'fit' : clamp(z, 0.1, 4); layout(); drawOv(); }

/* 화면 좌표 → 편집 창 좌표 */
function toFrame(cx, cy){
  const p = $('se-paper').getBoundingClientRect();
  return { x: (cx - p.left) / S.scale + S.rect.x, y: (cy - p.top) / S.scale + S.rect.y };
}
/* 요소 사각형 (편집 창 좌표, 슬라이드 왼쪽 위 기준) */
function boxOf(el){
  const r = el.getBoundingClientRect();
  return { x: r.left - S.rect.x, y: r.top - S.rect.y, w: r.width, h: r.height };
}
function unionBox(els){
  let x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9;
  for (const el of els) { const b = boxOf(el); x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y); x2 = Math.max(x2, b.x + b.w); y2 = Math.max(y2, b.y + b.h); }
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}
const cs = el => S.ewin.getComputedStyle(el);

/* ===================================================================
   선택
   =================================================================== */
const locked = el => !!el.closest('[data-se-lock]');
function chainAt(cx, cy){
  const p = toFrame(cx, cy);
  const hits = S.edoc.elementsFromPoint(p.x, p.y);
  /* 슬라이드를 넓게 덮는 그림(svg) 자체가 잡히면 건너뛴다: 그 안의 선·도형을 눌렀을 때만 그림이 잡힌다 */
  const wide = n => n.tagName.toLowerCase() === 'svg' && (() => { const b = boxOf(n); return b.w * b.h > S.rect.w * S.rect.h * 0.4; })();
  const top = hits.find(n => n !== S.box && S.box.contains(n) && n !== S.edoc.body && n !== S.edoc.documentElement && !wide(n) && !locked(n));
  if (!top) return [];
  const chain = [];
  for (let n = top; n && n !== S.box; n = n.parentElement) chain.unshift(n);
  return chain;
}
const isMedia = el => /^(IMG|SVG|VIDEO|CANVAS|IFRAME|svg)$/.test(el.tagName) || el instanceof S.ewin.SVGElement;
/* 슬라이드를 거의 덮는 감싸개는 건너뛰고 그 안의 요소부터 고른다 */
function defaultPick(chain){
  /* 일반 문서: 누른 글자가 든 블록을 고른다(바깥 묶음은 Esc로) */
  if (S.mode === 'page') {
    const m = chain.findIndex(isMedia);
    if (m >= 0) return m;
    let i = chain.length - 1;
    while (i > 0 && cs(chain[i]).display === 'inline') i--;
    return i;
  }
  const area = S.rect.w * S.rect.h;
  let i = 0;
  while (i < chain.length - 1) {
    const el = chain[i], b = boxOf(el);
    if (isMedia(el) || el.hasAttribute('data-se-anim') || el.hasAttribute('data-se-widget')) break;
    if (b.w * b.h < area * 0.86) break;
    i++;
  }
  return i;
}
function targetFor(chain, e){
  if (!chain.length) return null;
  if (e && e.altKey) return chain[chain.length - 1];
  const cur = S.sel[0];
  if (cur && chain.includes(cur)) return cur;
  if (cur) {
    const j = chain.findIndex(n => n.parentElement === cur.parentElement);
    if (j >= 0) return chain[j];
  }
  return chain[defaultPick(chain)];
}
/* 묶음: 감싸는 요소를 새로 만들면 덱의 배치·스크립트가 깨지므로, 같은 번호(data-se-grp)를 달아 함께 고르기만 한다 */
const grpOf = el => el.getAttribute('data-se-grp');
const newGrp = () => 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
function withGroups(els){
  const out = [...els];
  els.forEach(e => { const id = grpOf(e); if (id) S.box.querySelectorAll(`[data-se-grp="${id}"]`).forEach(m => { if (!out.includes(m)) out.push(m); }); });
  return out;
}
const oneGroup = () => !!S.sel.length && !!grpOf(S.sel[0]) && S.sel.every(e => grpOf(e) === grpOf(S.sel[0]));
function groupSel(){
  if (S.sel.length < 2) return;
  const id = newGrp();
  change('slide', () => S.sel.forEach(e => e.setAttribute('data-se-grp', id)));
}
function ungroupSel(){
  if (!S.sel.some(grpOf)) return;
  change('slide', () => S.sel.forEach(e => e.removeAttribute('data-se-grp')));
}
function lockSel(on){ change('slide', () => { S.sel.forEach(e => on ? e.setAttribute('data-se-lock', '') : e.removeAttribute('data-se-lock')); if (on) S.sel = []; }); }
function arrangeItems(){
  const has = S.sel.length > 0, lk = has && S.sel.every(locked);
  return [
    S.sel.some(grpOf) ? { icon: 'group', label: '묶음 풀기', key: 'Ctrl+Shift+G', fn: ungroupSel } : { icon: 'group', label: '묶기', key: 'Ctrl+G', fn: groupSel, disabled: S.sel.length < 2 },
    { icon: 'lock', label: lk ? '잠금 풀기' : '잠그기', fn: () => lockSel(!lk), disabled: !has }
  ];
}
/* add: true면 하나씩 넣고 빼기(Shift·Ctrl+클릭), 'union'이면 더하기만(Shift+범위) */
function select(els, add, raw){
  endEdit();
  /* 참고 층 안의 사본은 고를 수 없다 */
  els = (els || []).filter(e => e && !e.closest('[data-se-ghost]'));
  if (!raw) els = withGroups(els);
  if (add) {
    const set = [...S.sel];
    for (const el of els) { const i = set.indexOf(el); if (i >= 0) { if (add !== 'union') set.splice(i, 1); } else set.push(el); }
    S.sel = set.filter(a => !set.some(b => b !== a && b.contains(a)));
  } else S.sel = els;
  renderPanel(); drawOv();
}

/* ---------- 빈 곳인가: 누른 자리에 실제로 그려진 것(글자·배경·테두리·그림)이 없으면 빈 곳 ----------
   투명한 줄 상자·감싸개가 빈 공간을 덮고 있어도 범위 선택을 시작할 수 있게 한다. */
function paintsAt(el, p){
  if (isMedia(el) || /^(INPUT|BUTTON|SELECT|TEXTAREA|HR)$/.test(el.tagName)) return true;
  const c = cs(el), b = boxOf(el);
  if (b.w * b.h < S.rect.w * S.rect.h * 0.86) {
    const bg = c.backgroundColor, alpha = bg === 'transparent' ? 0 : (bg.match(/rgba?\(([^)]+)\)/) || [, '0,0,0,1'])[1].split(/[,\s/]+/).filter(Boolean)[3];
    if ((alpha == null || +alpha > 0.02) && bg !== 'transparent') return true;
    if (c.backgroundImage !== 'none' || c.boxShadow !== 'none') return true;
    if (['Top', 'Right', 'Bottom', 'Left'].some(s => parseFloat(c['border' + s + 'Width']) > 0 && c['border' + s + 'Style'] !== 'none')) return true;
  }
  const pad = 6;
  for (const n of el.childNodes) {
    if (n.nodeType !== 3 || !n.textContent.trim()) continue;
    const r = S.edoc.createRange(); r.selectNodeContents(n);
    for (const q of r.getClientRects()) if (p.x >= q.left - pad && p.x <= q.right + pad && p.y >= q.top - pad && p.y <= q.bottom + pad) return true;
  }
  return false;
}
function blankAt(chain, cx, cy){
  if (!chain.length) return true;
  const p = toFrame(cx, cy);
  return !chain.some(el => paintsAt(el, p));
}
/* 범위 안에 통째로 든 것 가운데 가장 바깥 것을 고른다(슬라이드를 덮는 감싸개는 건너뛰고 안으로) */
function marqueePick(r){
  const out = [], area = S.rect.w * S.rect.h;
  const inside = b => b.x >= r.x - 1 && b.y >= r.y - 1 && b.x + b.w <= r.x + r.w + 1 && b.y + b.h <= r.y + r.h + 1;
  const touch = b => b.x < r.x + r.w && b.x + b.w > r.x && b.y < r.y + r.h && b.y + b.h > r.y;
  const walk = n => {
    for (const c of kidsOf(n)) {
      if (/^(SCRIPT|STYLE|TEMPLATE|BR|LINK|META)$/.test(c.tagName) || c.hasAttribute('data-se-lock')) continue;
      const st = cs(c);
      if (st.display === 'none') continue;
      const b = boxOf(c);
      const hidden = !S.showHidden && (st.visibility === 'hidden' || parseFloat(st.opacity) === 0);
      if (b.w && b.h && inside(b) && b.w * b.h < area * 0.86 && !hidden) { out.push(c); continue; }
      if (c instanceof S.ewin.SVGElement) continue;
      if (!b.w || !b.h || touch(b)) walk(c);
    }
  };
  walk(S.box);
  return out;
}
function label(el){
  if (!el) return '';
  /* 선생님 말로: 종류 + 들어 있는 글자(클래스 이름 같은 개발 용어는 쓰지 않는다) */
  const txt = snippet(el, 18);
  return kindOf(el) + (txt ? ` “${txt}”` : '');
}

/* ---------- 겹쳐 그리기: 선택 상자·손잡이·등장 표시 ---------- */
function drawOv(){
  const ov = $('se-ov'); if (!ov) return;
  ov.innerHTML = '';
  if (!S.edoc || !S.box) return;
  const sc = S.scale;
  const place = (el, b) => { el.style.left = b.x * sc + 'px'; el.style.top = b.y * sc + 'px'; el.style.width = b.w * sc + 'px'; el.style.height = b.h * sc + 'px'; return el; };
  /* 등장 표시 */
  S.box.querySelectorAll('[data-se-anim]').forEach(el => {
    const b = boxOf(el), st = el.getAttribute('data-se-start'), click = st === 'click';
    const d = h('div', { class: 'bdg' + (click ? '' : ' en'), text: click ? (el.getAttribute('data-se-order') || '1') : st === 'view' ? '↓' : '▶' });
    d.style.left = b.x * sc + 'px'; d.style.top = b.y * sc + 'px'; ov.appendChild(d);
  });
  if (S.hover && !S.sel.includes(S.hover) && S.hover.isConnected && !S.editing) ov.appendChild(place(h('div', { class: 'hov' }), boxOf(S.hover)));
  const multi = S.sel.length > 1;
  for (const el of S.sel) {
    if (!el.isConnected) continue;
    ov.appendChild(place(h('div', { class: 'selb' + (multi ? ' multi' : '') + (S.editing === el ? ' ed' : '') }), boxOf(el)));
  }
  /* 여러 개: 전체를 감싸는 바깥 틀과 개수 */
  if (multi) {
    const live = S.sel.filter(el => el.isConnected);
    if (live.length > 1) {
      const u = unionBox(live), pad = 6 / sc;
      ov.appendChild(place(h('div', { class: 'selu', 'data-n': live.length + '개' }), { x: u.x - pad, y: u.y - pad, w: u.w + pad * 2, h: u.h + pad * 2 }));
    }
  }
  if (S.sel.length === 1 && !S.editing && S.sel[0].isConnected && !locked(S.sel[0]) && !(S.sel[0] instanceof S.ewin.SVGElement && S.sel[0].tagName !== 'svg')) {
    const b = boxOf(S.sel[0]);
    const pts = { nw: [0, 0], n: [.5, 0], ne: [1, 0], e: [1, .5], se: [1, 1], s: [.5, 1], sw: [0, 1], w: [0, .5] };
    for (const k in pts) {
      if (b.w * sc < 26 && k.length === 1) continue;
      const d = h('div', { class: 'hd', 'data-h': k });
      d.style.left = (b.x + b.w * pts[k][0]) * sc + 'px'; d.style.top = (b.y + b.h * pts[k][1]) * sc + 'px';
      d.addEventListener('pointerdown', e => startResize(e, k));
      ov.appendChild(d);
    }
  }
  /* 모션 목록에서 가리키는 요소 */
  (S.mhl || []).forEach(b => ov.appendChild(place(h('div', { class: 'mhl' + (b.script ? ' scr' : '') }), b)));
  /* 범위 선택 중이면 그 사각형을 다시 얹는다(다른 그리기에 지워지지 않게) */
  if (S.marq && S.marq.mq) ov.append(S.marq.layer, S.marq.mq);
  ttUpdate();
  $('se-selstat').textContent = S.sel.length > 1 ? `${S.sel.length}개 선택` : S.sel.length ? label(S.sel[0]) : '';
}

/* ===================================================================
   캔버스 조작
   =================================================================== */
function bindCanvas(){
  const g = $('se-glass'), cv = $('se-canvas');
  let down = null;
  g.addEventListener('pointermove', e => {
    if (down || S.marq || !S.edoc) return;
    const chain = chainAt(e.clientX, e.clientY);
    const t = targetFor(chain, e);
    if (t !== S.hover) { S.hover = t; drawOv(); }
  });
  g.addEventListener('pointerleave', () => { if (S.hover) { S.hover = null; drawOv(); } });
  g.addEventListener('pointerdown', e => {
    if (!S.edoc || e.button === 2) return;
    e.preventDefault();   /* 글자 고르기·끌어 놓기 같은 브라우저 기본 동작이 끼어들지 않게 */
    closePop();
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    const chain = chainAt(e.clientX, e.clientY);
    S.lastPoint = toFrame(e.clientX, e.clientY);
    const t = targetFor(chain, e);
    const add = e.shiftKey || e.ctrlKey || e.metaKey;
    /* 빈 곳(고른 것 바깥)에서 끌면 범위 선택, 그냥 누르면 평소처럼 고르기 */
    if (!t || (!e.altKey && !S.sel.includes(t) && blankAt(chain, e.clientX, e.clientY))) {
      if (!add && !t) select([]);
      return startMarquee(e, { add, click: () => { if (t) select([t], add); else if (!add) select([]); } });
    }
    const wasSel = S.sel.includes(t) && S.sel.length === 1;
    const inMulti = S.sel.includes(t) && S.sel.length > 1;
    if (add) { select([t], true); return; }
    if (!S.sel.includes(t)) select([t]);
    down = { x: e.clientX, y: e.clientY, chain, t, wasSel, inMulti, moved: false };
    g.setPointerCapture(e.pointerId);
  });
  g.addEventListener('pointermove', e => {
    if (!down) return;
    if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 3) { down.moved = true; beginMove(down); }
    if (down.moved) doMove(e, down);
  });
  /* 끌기가 중간에 끊기면(터치 스크롤로 넘어감·창 밖으로 나감) 거기까지 옮긴 것으로 마무리한다 */
  const cancel = () => { if (!down) return; const d = down; down = null; if (d.moved) endMove(); };
  g.addEventListener('pointercancel', cancel);
  g.addEventListener('lostpointercapture', () => { if (down && down.moved) cancel(); });
  g.addEventListener('pointerup', e => {
    if (!down) return;
    const d = down; down = null;
    if (d.moved) { endMove(); return; }
    /* 여러 개 고른 채 하나를 그냥 누르면 그것만 */
    if (d.inMulti) { select([d.t], false, oneGroup()); return; }
    /* 이미 고른 것을 다시 누르면 한 단계 안쪽으로 */
    if (d.wasSel && !e.altKey) {
      const i = d.chain.indexOf(d.t);
      if (i >= 0 && i < d.chain.length - 1) select([d.chain[i + 1]]);
    }
  });
  g.addEventListener('dblclick', e => {
    const chain = chainAt(e.clientX, e.clientY);
    if (!chain.length) return;
    let t = chain[chain.length - 1];
    if (t instanceof S.ewin.SVGElement) return toast('그림(SVG) 안의 글자는 상자 탭의 ‘HTML 코드’에서 고칠 수 있어요.');
    if (/^(IMG|VIDEO|IFRAME|CANVAS|INPUT|TEXTAREA)$/.test(t.tagName)) { if (t.tagName === 'IMG') replaceImage(t); return; }
    while (t.parentElement && t.parentElement !== S.box && cs(t).display === 'inline') t = t.parentElement;
    startEdit(t, e.clientX, e.clientY);
  });
  g.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (!S.edoc) return;
    const chain = chainAt(e.clientX, e.clientY);
    const t = targetFor(chain, e);
    if (t && !S.sel.includes(t)) select([t]);
    ctxMenu({ x: e.clientX, y: e.clientY });
  });
  cv.addEventListener('wheel', e => {
    if (!e.ctrlKey || !S.edoc) return;
    e.preventDefault();
    setZoom(S.scale * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
  }, { passive: false });
  /* 슬라이드 바깥 회색 바탕에서도 범위 선택을 시작할 수 있다 */
  cv.addEventListener('pointerdown', e => {
    if (e.button !== 0 || !(e.target === cv || e.target === $('se-stagewrap') || e.target === $('se-ov'))) return;
    e.preventDefault();
    endEdit(); closePop();
    const add = e.shiftKey || e.ctrlKey || e.metaKey;
    if (!add) select([]);
    if (S.edoc) startMarquee(e, { add });
  });
  cv.addEventListener('dragover', e => { if ([...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
  cv.addEventListener('drop', async e => {
    const f = [...e.dataTransfer.files].find(f => /^image\//.test(f.type));
    if (!f || !S.edoc) return;
    e.preventDefault();
    insertImage(f, toFrame(e.clientX, e.clientY));
  });
}

/* ---------- 끌어 옮기기 ---------- */
let MV = null;
function getT(el){
  const v = cs(el).translate;
  if (!v || v === 'none') return [0, 0, null];
  if (v.includes('%')) return null;
  const p = v.split(/\s+/).map(parseFloat);
  return [p[0] || 0, p[1] || 0, p.length > 2 ? p[2] : null];
}
function setT(el, x, y, z){
  x = rnd(x, 1); y = rnd(y, 1);
  if (!x && !y && !z) { el.style.translate = ''; if (getT(el) && (getT(el)[0] || getT(el)[1])) el.style.translate = '0px 0px'; return; }
  el.style.translate = `${x}px ${y}px` + (z ? ` ${z}px` : '');
}
/* 편집기가 넣은 요소는 left/top으로, 원래 있던 요소는 translate로 옮긴다(덱 애니메이션의 transform과 겹치지 않게) */
function ownsPos(el){ return el.classList.contains('se-box') && el.style.left !== '' && el.style.top !== ''; }
function moveBy(el, dx, dy){
  if (ownsPos(el)) { el.style.left = rnd(parseFloat(el.style.left) + dx, 1) + 'px'; el.style.top = rnd(parseFloat(el.style.top) + dy, 1) + 'px'; return; }
  const t = getT(el) || [0, 0, null];
  setT(el, t[0] + dx, t[1] + dy, t[2]);
}
function beginMove(d){
  if (!S.sel.includes(d.t)) select([d.t]);
  liveStart();
  MV = { start: S.sel.map(el => ({ el, left: parseFloat(el.style.left), top: parseFloat(el.style.top), t: getT(el) || [0, 0, null], own: ownsPos(el) })), box: unionBox(S.sel), guides: snapLines(S.sel) };
}
function snapLines(skip){
  const W = S.rect.w, H = S.rect.h, xs = [0, W / 2, W], ys = [0, H / 2, H];
  const others = kidsOf(S.box).filter(el => !skip.some(s => s === el || s.contains(el) || el.contains(s)) && !/^(SCRIPT|STYLE)$/.test(el.tagName)).slice(0, 80);
  for (const el of others) {
    const b = boxOf(el); if (!b.w || !b.h || b.w * b.h > W * H * 0.8) continue;
    xs.push(b.x, b.x + b.w / 2, b.x + b.w); ys.push(b.y, b.y + b.h / 2, b.y + b.h);
  }
  return { xs, ys };
}
function snap1(vals, lines, thr){
  let best = null;
  for (const v of vals) for (const l of lines) { const d = l - v; if (Math.abs(d) <= thr && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, l }; }
  return best;
}
function doMove(e, d){
  let dx = (e.clientX - d.x) / S.scale, dy = (e.clientY - d.y) / S.scale;
  if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
  const b = MV.box, thr = 6 / S.scale, gl = [];
  if (!e.ctrlKey) {
    const sx = snap1([b.x + dx, b.x + b.w / 2 + dx, b.x + b.w + dx], MV.guides.xs, thr);
    const sy = snap1([b.y + dy, b.y + b.h / 2 + dy, b.y + b.h + dy], MV.guides.ys, thr);
    if (sx && !(e.shiftKey && !dx)) { dx += sx.d; gl.push({ x: sx.l }); }
    if (sy && !(e.shiftKey && !dy)) { dy += sy.d; gl.push({ y: sy.l }); }
  }
  const k = S.k;
  for (const s of MV.start) {
    if (s.own) { s.el.style.left = rnd(s.left + dx / k, 1) + 'px'; s.el.style.top = rnd(s.top + dy / k, 1) + 'px'; }
    else setT(s.el, s.t[0] + dx / k, s.t[1] + dy / k, s.t[2]);
  }
  setDirty(true);
  drawOv(); drawGuides(gl);
}
function drawGuides(gl){
  const ov = $('se-ov'), sc = S.scale;
  for (const g of gl) {
    const d = h('div', { class: 'gl' });
    if (g.x != null) { d.style.left = g.x * sc - .5 + 'px'; d.style.top = '-20px'; d.style.width = '1px'; d.style.height = S.rect.h * sc + 40 + 'px'; }
    else { d.style.top = g.y * sc - .5 + 'px'; d.style.left = '-20px'; d.style.height = '1px'; d.style.width = S.rect.w * sc + 40 + 'px'; }
    ov.appendChild(d);
  }
}
function endMove(){ MV = null; settle(); drawOv(); renderPanel(); }

/* ---------- 끌어서 여러 개 고르기 ---------- */
/* o.add: Shift·Ctrl을 누른 채 시작하면 지금 고른 것에 더한다 · o.click: 끌지 않고 뗐을 때 할 일 */
function startMarquee(e, o = {}){
  const ov = $('se-ov'), p0 = ov.getBoundingClientRect();
  const x0 = e.clientX, y0 = e.clientY; let mq = null, layer = null, pick = [], raf = 0;
  S.hover = null; S.marq = {};
  /* 누른 요소에 포인터를 붙잡아 두어 창 밖·다른 칸 위로 지나가도 끊기지 않게 */
  const cap = e.target; try { cap.setPointerCapture(e.pointerId); } catch (err) {}
  const mv = ev => {
    if (ev.pointerId !== e.pointerId) return;
    const x1 = Math.min(x0, ev.clientX), y1 = Math.min(y0, ev.clientY), x2 = Math.max(x0, ev.clientX), y2 = Math.max(y0, ev.clientY);
    if (!mq && (x2 - x1 > 4 || y2 - y1 > 4)) { drawOv(); mq = h('div', { class: 'mq' }); layer = h('div'); ov.append(layer, mq); S.marq = { mq, layer }; }
    if (!mq) return;
    Object.assign(mq.style, { left: x1 - p0.left + 'px', top: y1 - p0.top + 'px', width: x2 - x1 + 'px', height: y2 - y1 + 'px' });
    mq._r = { x: (x1 - p0.left) / S.scale, y: (y1 - p0.top) / S.scale, w: (x2 - x1) / S.scale, h: (y2 - y1) / S.scale };
    /* 고르게 될 것을 미리 테두리로 보여 준다 */
    if (!raf) raf = requestAnimationFrame(() => {
      raf = 0; if (!mq) return;
      pick = marqueePick(mq._r);
      layer.innerHTML = '';
      const sc = S.scale;
      pick.forEach(el => { const b = boxOf(el); const d = h('div', { class: 'hov' }); Object.assign(d.style, { left: b.x * sc + 'px', top: b.y * sc + 'px', width: b.w * sc + 'px', height: b.h * sc + 'px' }); layer.appendChild(d); });
      mq.dataset.n = pick.length ? pick.length + '개' : '';
    });
  };
  const up = ev => {
    if (ev && ev.pointerId !== e.pointerId) return;
    removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
    try { cap.releasePointerCapture(e.pointerId); } catch (err) {}
    if (raf) cancelAnimationFrame(raf);
    S.marq = null;
    if (!mq) { if (o.click && ev.type === 'pointerup') o.click(); return; }
    const r = mq._r; mq.remove(); layer.remove();
    const els = r ? marqueePick(r) : [];
    select(els, o.add ? 'union' : false);
  };
  addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
}

/* ---------- 크기 바꾸기 ---------- */
function startResize(e, hd){
  e.preventDefault(); e.stopPropagation();
  const el = S.sel[0]; if (!el) return;
  liveStart(); S.rz = true;
  const b0 = boxOf(el), k = S.k;
  const own = ownsPos(el), t0 = getT(el) || [0, 0, null];
  const l0 = parseFloat(el.style.left), tp0 = parseFloat(el.style.top);
  if (cs(el).display === 'inline') el.style.display = 'inline-block';
  const keep = isMedia(el);
  const lines = snapLines([el]);
  const x0 = e.clientX, y0 = e.clientY;
  const tip = h('div', { class: 'sizetip' });
  const mv = ev => {
    let dx = (ev.clientX - x0) / S.scale, dy = (ev.clientY - y0) / S.scale;
    let x = b0.x, y = b0.y, w = b0.w, hh = b0.h;
    if (hd.includes('e')) w = b0.w + dx;
    if (hd.includes('w')) { w = b0.w - dx; x = b0.x + dx; }
    if (hd.includes('s')) hh = b0.h + dy;
    if (hd.includes('n')) { hh = b0.h - dy; y = b0.y + dy; }
    if (!ev.ctrlKey) {
      const thr = 6 / S.scale;
      if (hd.includes('e')) { const s = snap1([x + w], lines.xs, thr); if (s) w += s.d; }
      if (hd.includes('w')) { const s = snap1([x], lines.xs, thr); if (s) { x += s.d; w -= s.d; } }
      if (hd.includes('s')) { const s = snap1([y + hh], lines.ys, thr); if (s) hh += s.d; }
      if (hd.includes('n')) { const s = snap1([y], lines.ys, thr); if (s) { y += s.d; hh -= s.d; } }
    }
    if ((keep !== ev.shiftKey) && hd.length === 2) {
      const ratio = b0.w / b0.h;
      if (Math.abs(w - b0.w) / b0.w > Math.abs(hh - b0.h) / b0.h) { const nh = w / ratio; if (hd.includes('n')) y += hh - nh; hh = nh; }
      else { const nw = hh * ratio; if (hd.includes('w')) x += w - nw; w = nw; }
    }
    w = Math.max(8, w); hh = Math.max(8, hh);
    if (hd !== 'n' && hd !== 's') setSize(el, 'width', w / k);
    if (hd !== 'e' && hd !== 'w') setSize(el, 'height', hh / k);
    else if (keep) setSize(el, 'height', (w / (b0.w / b0.h)) / k);
    const nx = x - b0.x, ny = y - b0.y;
    if (own) { el.style.left = rnd(l0 + nx / k, 1) + 'px'; el.style.top = rnd(tp0 + ny / k, 1) + 'px'; }
    else setT(el, t0[0] + nx / k, t0[1] + ny / k, t0[2]);
    /* 실제로 달라진 위치를 보정한다(가운데 정렬된 흐름 요소 등) */
    const b1 = boxOf(el), fx = x - b1.x, fy = y - b1.y;
    if (Math.abs(fx) > .5 || Math.abs(fy) > .5) moveBy(el, fx / k, fy / k);
    setDirty(true); drawOv();
    tip.textContent = `${Math.round(w / k)} × ${Math.round(hh / k)}`;
    const bb = boxOf(el);
    tip.style.left = (bb.x + bb.w / 2) * S.scale + 'px'; tip.style.top = (bb.y + bb.h) * S.scale + 'px';
    $('se-ov').appendChild(tip);
  };
  const hdEl = e.currentTarget; try { hdEl.setPointerCapture(e.pointerId); } catch (err) {}
  const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); S.rz = false; settle(); drawOv(); renderPanel(); };
  addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
}
/* box-sizing과 상관없이 보이는 크기가 맞도록 한 번 보정한다 */
function setSize(el, prop, v){
  el.style[prop] = rnd(v, 1) + 'px';
  const r = el.getBoundingClientRect(), got = (prop === 'width' ? r.width : r.height) / S.k;
  if (Math.abs(got - v) > .5) el.style[prop] = rnd(Math.max(1, v + (v - got)), 1) + 'px';
}

/* ===================================================================
   글자 고치기
   =================================================================== */
function startEdit(el, cx, cy){
  if (!el || !el.isConnected) return;
  endEdit(); settle();
  S.editSnap = snap('slide');
  el.setAttribute('contenteditable', 'true'); el.setAttribute('data-se-ce', ''); el.setAttribute('spellcheck', 'false');
  $('se-glass').classList.add('editing');
  S.editing = el; S.sel = [el]; S.hover = null;
  S.ewin.focus(); el.focus({ preventScroll: true });
  const s = S.edoc.getSelection();
  let r = null;
  if (cx != null) { const p = toFrame(cx, cy); r = S.edoc.caretRangeFromPoint ? S.edoc.caretRangeFromPoint(p.x, p.y) : null; }
  if (!r || !el.contains(r.startContainer)) { r = S.edoc.createRange(); r.selectNodeContents(el); }
  s.removeAllRanges(); s.addRange(r);
  S.lastRange = r.cloneRange();
  if (S.tab !== 'text') S.tab = 'text';
  renderPanel(); drawOv();
}
function endEdit(){
  const el = S.editing; if (!el) return;
  el.removeAttribute('contenteditable'); el.removeAttribute('data-se-ce'); el.removeAttribute('spellcheck');
  /* 꾸미다 남은 빈 감싸개를 걷어 낸다 */
  el.querySelectorAll('[style=""]').forEach(n => n.removeAttribute('style'));
  el.querySelectorAll('span[data-se-sp]:not([style])').forEach(sp => sp.replaceWith(...sp.childNodes));
  el.normalize();
  try { S.edoc.getSelection().removeAllRanges(); } catch (e) {}
  $('se-glass').classList.remove('editing');
  S.editing = null; S.lastRange = null;
  const sn = S.editSnap; S.editSnap = null;
  if (sn && S.slides[sn.idx] !== undefined || (sn && S.mode === 'page')) {
    if (snapChanged(sn)) { S.hist.push(sn); S.fut = []; setDirty(true); updateUndo(); renderSlidesSoon(); }
  }
  drawOv();
}
function onFramePointer(e){
  if (!S.editing) return;
  if (S.editing.contains(e.target)) return;
  /* 편집 중인 글자 바깥을 눌렀다: 편집을 끝내고 그 자리를 고른다 */
  e.preventDefault();
  const p = $('se-paper').getBoundingClientRect();
  const cx = p.left + (e.clientX - S.rect.x) * S.scale, cy = p.top + (e.clientY - S.rect.y) * S.scale;
  endEdit();
  const chain = chainAt(cx, cy);
  select(chain.length ? [targetFor(chain, e)] : []);
}
function onFrameKey(e){
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); save(); return; }
  if (!S.editing) { onKey(e); return; }
  if (e.key === 'Escape') { e.preventDefault(); const el = S.editing; endEdit(); select([el]); }
  e.stopPropagation();
}
function onFramePaste(e){
  if (!S.editing) return;
  e.preventDefault();
  const t = e.clipboardData.getData('text/plain');
  S.edoc.execCommand('insertText', false, t);
}
function rangeSel(){
  if (!S.editing) return null;
  const s = S.edoc.getSelection();
  let r = s.rangeCount ? s.getRangeAt(0) : null;
  if ((!r || !S.editing.contains(r.commonAncestorContainer)) && S.lastRange) r = S.lastRange;
  if (!r || r.collapsed || !S.editing.contains(r.commonAncestorContainer)) return null;
  return r;
}
function restoreRange(r){
  S.ewin.focus(); S.editing.focus({ preventScroll: true });
  const s = S.edoc.getSelection(); s.removeAllRanges(); s.addRange(r);
}
/* 고른 글자 범위를 span으로 감싸 스타일을 준다. 같은 범위를 다시 고치면 그 span을 고친다 */
function wrapSel(styles){
  const r = rangeSel(); if (!r) return false;
  const anc = r.commonAncestorContainer.nodeType === 1 ? r.commonAncestorContainer : r.commonAncestorContainer.parentElement;
  let span = anc.closest('[data-se-sp]');
  if (span && S.editing.contains(span) && span.textContent === r.toString()) { for (const k in styles) span.style.setProperty(k, styles[k]); return true; }
  span = S.edoc.createElement('span'); span.setAttribute('data-se-sp', '');
  for (const k in styles) span.style.setProperty(k, styles[k]);
  span.appendChild(r.extractContents());
  span.querySelectorAll('*').forEach(n => { for (const k in styles) n.style && n.style.removeProperty(k); });
  r.insertNode(span);
  const nr = S.edoc.createRange(); nr.selectNodeContents(span);
  restoreRange(nr); S.lastRange = nr.cloneRange();
  return true;
}
function execCmd(cmd, val){
  const r = rangeSel();
  if (!r) return false;
  restoreRange(r);
  S.edoc.execCommand('styleWithCSS', false, true);
  S.edoc.execCommand(cmd, false, val == null ? null : val);
  const s = S.edoc.getSelection(); if (s.rangeCount) S.lastRange = s.getRangeAt(0).cloneRange();
  setDirty(true); drawOv(); syncPanel();
  return true;
}

/* ===================================================================
   되돌리기
   =================================================================== */
function selPaths(){
  return S.sel.filter(el => S.box && S.box.contains(el) && !el.closest('[data-se-ghost]'))
    .map(el => { const p = []; for (let n = el; n && n !== S.box; n = n.parentElement) p.unshift(kidsOf(n.parentElement).indexOf(n)); return p; });
}
function fromPaths(paths){
  return (paths || []).map(p => { let n = S.box; for (const i of p) { n = n && kidsOf(n)[i]; } return n; }).filter(n => n && n !== S.box);
}
function snap(scope){
  if (scope && typeof scope === 'object') { const sc = S.edoc.querySelectorAll('script')[scope.script]; return { scope: 'script', si: scope.script, text: sc.textContent, idx: S.cur }; }
  if (scope === 'slide' && S.mode === 'page') scope = 'all';
  return withoutGhosts(() => {
    if (scope === 'slide') return { scope, idx: S.cur, html: S.slides[S.cur].outerHTML, sel: selPaths() };
    if (scope === 'head') { const st = S.edoc.getElementById('se-fonts'); return { scope, css: st ? st.textContent : null, idx: S.cur }; }
    return { scope: 'all', html: S.edoc.body.innerHTML, idx: S.cur, sel: selPaths() };
  });
}
function snapAgain(sn){ return snap(sn.scope === 'script' ? { script: sn.si } : sn.scope); }
function snapChanged(sn){
  if (sn.scope === 'script') return S.edoc.querySelectorAll('script')[sn.si].textContent !== sn.text;
  return withoutGhosts(() => {
    if (sn.scope === 'slide') return S.slides[sn.idx] && S.slides[sn.idx].outerHTML !== sn.html;
    if (sn.scope === 'head') { const st = S.edoc.getElementById('se-fonts'); return (st ? st.textContent : null) !== sn.css; }
    return S.edoc.body.innerHTML !== sn.html;
  });
}
function restore(sn){
  if (sn.scope === 'script') {
    S.edoc.querySelectorAll('script')[sn.si].textContent = sn.text;
    pvInvalidate();
    S.edoc.querySelectorAll('[data-se-ghost]').forEach(g => g.remove());
    goto(sn.idx, true);
  } else if (sn.scope === 'slide') {
    const old = S.slides[sn.idx]; if (!old) return;
    const t = S.edoc.createElement('template'); t.innerHTML = sn.html;
    old.replaceWith(t.content.firstElementChild);
    refreshSlides(); goto(sn.idx, true);
    S.sel = fromPaths(sn.sel);
  } else if (sn.scope === 'head') {
    let st = S.edoc.getElementById('se-fonts');
    if (sn.css == null) { if (st) st.remove(); }
    else { if (!st) { st = S.edoc.createElement('style'); st.id = 'se-fonts'; S.edoc.head.appendChild(st); } st.textContent = sn.css; }
    collectStyles();
  } else {
    S.edoc.body.innerHTML = sn.html;
    refreshSlides(); goto(Math.min(sn.idx, Math.max(0, S.slides.length - 1)), true);
    S.sel = fromPaths(sn.sel);
  }
  renderPanel(); drawOv(); renderSlides();
}
/* 한 번에 끝나는 변경 */
function change(scope, fn, after){
  endEdit(); settle();
  const sn = snap(scope);
  fn();
  if (snapChanged(sn)) { S.hist.push(sn); if (S.hist.length > 80) S.hist.shift(); S.fut = []; setDirty(true); }
  updateUndo();
  if (after) after(); else { renderPanel(); drawOv(); renderSlidesSoon(); }
}
/* 끄는 동안 이어지는 변경(끌기·색 고르기·숫자 입력): 시작할 때 한 번 찍고 끝날 때 한 번 남긴다 */
function liveStart(){ if (!S.live && !S.editing) S.live = snap('slide'); }
function live(fn){
  if (S.editing) { fn(); setDirty(true); drawOv(); return; }
  liveStart(); fn(); setDirty(true); drawOv();
}
function settle(){
  const sn = S.live; S.live = null;
  if (sn && snapChanged(sn)) { S.hist.push(sn); if (S.hist.length > 80) S.hist.shift(); S.fut = []; setDirty(true); renderSlidesSoon(); }
  updateUndo();
}
function undo(){
  if (S.editing) { S.edoc.execCommand('undo'); return; }
  settle();
  const sn = S.hist.pop(); if (!sn) return;
  if (sn.scope === 'slide' && sn.idx !== S.cur) goto(sn.idx);
  const inv = snapAgain(sn);
  S.fut.push(inv); restore(sn); setDirty(true); updateUndo();
}
function redo(){
  if (S.editing) { S.edoc.execCommand('redo'); return; }
  const sn = S.fut.pop(); if (!sn) return;
  if (sn.scope === 'slide' && sn.idx !== S.cur) goto(sn.idx);
  const inv = snapAgain(sn);
  S.hist.push(inv); restore(sn); setDirty(true); updateUndo();
}
function updateUndo(){ if ($('bUndo')) { $('bUndo').disabled = !S.hist.length && !S.live; $('bRedo').disabled = !S.fut.length; } }
function setDirty(v){
  S.dirty = v;
  const d = $('se-dirty'); if (d) d.classList.toggle('hide', !v);
  if (v) {
    saveDraftSoon();
    /* 고친 내용으로 숨은 요소·모션 목록을 다시 읽게 한다 */
    pvInvalidate();
    if (needGhost(S.cur)) refreshGhostSoon();
    if (S.tab === 'anim') renderMotionSoon();
  }
}

/* ===================================================================
   요소 다루기
   =================================================================== */
function delSel(){
  if (!S.sel.length) return;
  if (S.sel.some(locked)) return toast('잠긴 요소는 잠금을 푼 뒤 지울 수 있어요.');
  change('slide', () => { S.sel.forEach(el => el.remove()); S.sel = []; });
}
function dupSel(){
  if (!S.sel.length) return;
  change('slide', () => {
    S.sel = S.sel.map(el => { const c = cleanClone(el, true); el.after(c); moveBy(c, 24, 24); return c; });
    const ids = new Map();
    S.sel.forEach(c => { const id = grpOf(c); if (id) { if (!ids.has(id)) ids.set(id, newGrp()); c.setAttribute('data-se-grp', ids.get(id)); } });
  });
}
function nudge(dx, dy){
  if (!S.sel.length || S.sel.some(locked)) return;
  live(() => S.sel.forEach(el => moveBy(el, dx, dy)));
  settleSoon();
}
const settleSoon = debounce(() => { settle(); renderPanel(); }, 500);
function alignSel(how){
  if (!S.sel.length) return;
  const ref = S.sel.length > 1 ? unionBox(S.sel) : { x: 0, y: 0, w: S.rect.w, h: S.rect.h };
  change('slide', () => {
    for (const el of S.sel) {
      const b = boxOf(el); let dx = 0, dy = 0;
      if (how === 'l') dx = ref.x - b.x; if (how === 'c') dx = ref.x + ref.w / 2 - (b.x + b.w / 2); if (how === 'r') dx = ref.x + ref.w - (b.x + b.w);
      if (how === 't') dy = ref.y - b.y; if (how === 'm') dy = ref.y + ref.h / 2 - (b.y + b.h / 2); if (how === 'b') dy = ref.y + ref.h - (b.y + b.h);
      moveBy(el, dx / S.k, dy / S.k);
    }
  });
}
function orderSel(how){
  if (!S.sel.length) return;
  change('slide', () => {
    for (const el of S.sel) {
      const p = el.parentElement, pos = cs(el).position;
      const free = p === S.box || pos === 'absolute' || pos === 'fixed';
      if (free) {
        if (how === 'front') p.appendChild(el);
        else if (how === 'back') p.insertBefore(el, p.firstElementChild);
        else if (how === 'fwd' && el.nextElementSibling) el.nextElementSibling.after(el);
        else if (how === 'bwd' && el.previousElementSibling) el.previousElementSibling.before(el);
      } else {
        if (pos === 'static') el.style.position = 'relative';
        const z = parseInt(cs(el).zIndex) || 0;
        el.style.zIndex = how === 'front' ? 50 : how === 'back' ? 0 : how === 'fwd' ? z + 1 : Math.max(0, z - 1);
      }
    }
  });
}
function resetPos(){
  change('slide', () => S.sel.forEach(el => { el.style.translate = ''; el.style.rotate = ''; }));
}
function selectParent(){
  if (!S.sel.length) return;
  const p = S.sel[0].parentElement;
  select(p && p !== S.box && S.box.contains(p) ? [p] : []);
}

/* ---------- 복사·붙여넣기 ---------- */
function onCopy(e, cut){
  if (isTyping(e.target) || !S.sel.length || S.editing || !S.edoc) return;
  const parts = S.sel.map(el => { const b = boxOf(el); const c = cleanClone(el, true); c.setAttribute('data-se-rect', [b.x / S.k, b.y / S.k, b.w / S.k, b.h / S.k].map(v => rnd(v)).join(',')); return c.outerHTML; });
  e.clipboardData.setData('text/html', '<div data-se-clip="1">' + parts.join('') + '</div>');
  e.clipboardData.setData('text/plain', S.sel.map(el => el.textContent.trim()).join('\n'));
  e.preventDefault();
  S.pasteN = 0;
  if (cut) delSel();
}
async function onPaste(e){
  if (isTyping(e.target) || S.editing || !S.edoc) return;
  const cd = e.clipboardData;
  const img = [...cd.files].find(f => /^image\//.test(f.type));
  if (img) { e.preventDefault(); return insertImage(img); }
  const htm = cd.getData('text/html');
  if (htm && htm.includes('data-se-clip')) {
    e.preventDefault();
    const t = S.edoc.createElement('template'); t.innerHTML = htm;
    const wrap = t.content.querySelector('[data-se-clip]');
    const els = [...(wrap ? wrap.children : [])];
    S.pasteN++;
    change('slide', () => {
      S.sel = els.map(el => {
        const r = (el.getAttribute('data-se-rect') || '').split(',').map(Number); el.removeAttribute('data-se-rect');
        el.querySelectorAll('script').forEach(s => { if (!s.hasAttribute('data-se-type')) { s.setAttribute('data-se-type', s.getAttribute('type') || '__none__'); s.setAttribute('type', 'text/x-se-off'); } });
        const n = S.edoc.importNode(el, true);
        S.box.appendChild(n);
        const pos = cs(n).position;
        if (r.length === 4 && pos !== 'absolute' && pos !== 'fixed') {
          n.style.position = 'absolute'; n.style.left = r[0] + 'px'; n.style.top = r[1] + 'px'; n.style.width = r[2] + 'px'; n.style.margin = '0'; n.style.translate = '';
          n.classList.add('se-box');
        }
        moveBy(n, 24 * S.pasteN, 24 * S.pasteN);
        return n;
      });
    });
    return;
  }
  const txt = cd.getData('text/plain');
  if (txt && txt.trim()) { e.preventDefault(); insertText(txt.trim()); }
}
function isTyping(t){ return t && t.closest && !!t.closest('input,textarea,select,[contenteditable]') && !(S.edoc && S.edoc.contains(t)); }

/* ---------- 넣기 ---------- */
function slideSize(){ return { W: S.rect.w / S.k, H: S.rect.h / S.k }; }
function placeAt(w, hh){
  const { W, H } = slideSize();
  let x = (W - w) / 2, y = (H - hh) / 2;
  if (S.lastPoint) { const px = (S.lastPoint.x - S.rect.x) / S.k, py = (S.lastPoint.y - S.rect.y) / S.k; if (px > 0 && py > 0 && px < W && py < H) { x = px - w / 2; y = py - hh / 2; } }
  x = rnd(clamp(x, 0, Math.max(0, W - w))); y = rnd(clamp(y, 0, Math.max(0, H - hh)));
  /* 바로 앞에 넣은 것과 같은 자리면 비스듬히 비켜 놓는다 */
  const taken = [...S.box.querySelectorAll(':scope > .se-box')].map(el => { const b = boxOf(el); return [(b.x + b.w / 2) / S.k, (b.y + b.h / 2) / S.k, b.h / S.k]; });
  const hit = () => taken.some(([cx, cy, th]) => Math.abs(cx - (x + w / 2)) < 60 && Math.abs(cy - (y + hh / 2)) < (th + hh) / 2);
  for (let i = 0; i < 12 && hit(); i++) {
    const ny = Math.min(Math.max(0, H - hh), y + Math.max(60, hh * 0.6));
    if (ny === y) { x = Math.min(Math.max(0, W - w), x + 60); } else y = ny;
  }
  x = rnd(x); y = rnd(y);
  return { x, y };
}
function insertHTML(html, opt = {}){
  if (!S.edoc) return null;
  let el = null;
  change('slide', () => {
    const t = S.edoc.createElement('template'); t.innerHTML = html.trim();
    t.content.querySelectorAll('script').forEach(s => { s.setAttribute('data-se-type', s.getAttribute('type') || '__none__'); s.setAttribute('type', 'text/x-se-off'); });
    let nodes = [...t.content.childNodes].filter(n => n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim()));
    if (nodes.length !== 1 || nodes[0].nodeType !== 1) {
      const w = S.edoc.createElement('div'); w.className = 'se-box'; nodes.forEach(n => w.appendChild(n));
      const p = placeAt(600, 200); w.style.cssText = `position:absolute;left:${p.x}px;top:${p.y}px;width:600px`;
      nodes = [w];
    }
    el = nodes[0];
    S.box.appendChild(el);
    S.sel = [el];
  });
  if (opt.edit && el) startEdit(el);
  if (opt.tab) { S.tab = opt.tab; renderPanel(); }
  return el;
}
function insertText(txt, big){
  const w = big ? 1200 : 720, p = placeAt(w, big ? 110 : 80);
  const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const body = txt ? esc(txt).replace(/\n/g, '<br>') : (big ? '제목을 입력하세요' : '글자를 입력하세요');
  return insertHTML(`<div class="se-box" style="position:absolute;left:${p.x}px;top:${p.y}px;width:${w}px;font-size:${big ? 76 : 44}px;line-height:1.35;${big ? 'font-weight:800;letter-spacing:-0.01em;' : ''}">${body}</div>`, { edit: !txt });
}
function accent(){ const c = S.colors.find(c => /ac|accent|main|pri|lav|blue|point/i.test(c.name)) || S.colors[0]; return c ? `var(${c.name})` : '#8bb4f7'; }
function insertShape(kind){
  const w = kind === 'line' ? 600 : kind === 'circle' ? 320 : kind === 'pill' ? 360 : 520, hh = kind === 'line' ? 8 : kind === 'circle' ? 320 : kind === 'pill' ? 84 : 300;
  const p = placeAt(w, hh), base = `position:absolute;left:${p.x}px;top:${p.y}px;width:${w}px;height:${hh}px;`;
  const html = {
    rect: `<div class="se-box" style="${base}background:${accent()}"></div>`,
    round: `<div class="se-box" style="${base}background:#fff;border:3px solid ${accent()};border-radius:28px;box-shadow:0 10px 30px rgba(0,0,0,.08)"></div>`,
    circle: `<div class="se-box" style="${base}background:${accent()};border-radius:50%"></div>`,
    line: `<div class="se-box" style="${base}background:currentColor;border-radius:4px"></div>`,
    pill: `<div class="se-box" style="${base.replace(`height:${hh}px;`, '')}display:inline-flex;align-items:center;justify-content:center;width:auto;padding:16px 36px;border-radius:999px;background:${accent()};color:#fff;font-size:36px;font-weight:700;white-space:nowrap">알약 글자</div>`
  }[kind];
  insertHTML(html, { edit: kind === 'pill' });
}
async function insertImage(file, at){
  try {
    const src = await imageData(file);
    const dim = await new Promise(r => { const im = new Image(); im.onload = () => r([im.naturalWidth, im.naturalHeight]); im.onerror = () => r([800, 600]); im.src = src; });
    const { W, H } = slideSize();
    const k = Math.min(1, (W * 0.6) / dim[0], (H * 0.6) / dim[1]);
    const w = rnd(dim[0] * k), hh = rnd(dim[1] * k);
    if (at) S.lastPoint = at;
    const p = placeAt(w, hh);
    insertHTML(`<img class="se-box se-img" alt="" src="${src}" style="position:absolute;left:${p.x}px;top:${p.y}px;width:${w}px;height:${hh}px;object-fit:contain">`);
    if (file.size > 2.5e6) toast('큰 그림이라 덱 파일이 커질 수 있어요.');
  } catch (e) { toast('그림을 넣지 못했어요: ' + e.message, 'bad'); }
}
/* 그림을 덱 안에 넣는다(파일 하나로 다니도록). 너무 크면 줄인다 */
async function imageData(file, maxW = 2200){
  if (/svg|gif/.test(file.type)) return readAs(file, 'readAsDataURL');
  const bmp = await createImageBitmap(file);
  if (bmp.width <= maxW && file.size < 1.5e6) return readAs(file, 'readAsDataURL');
  const k = Math.min(1, maxW / bmp.width);
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL(file.type === 'image/png' && c.width * c.height < 3e6 ? 'image/png' : 'image/jpeg', 0.88);
}
function pickFile(accept){
  return new Promise(res => { const i = h('input', { type: 'file', accept }); i.onchange = () => res(i.files[0] || null); i.click(); });
}
async function replaceImage(img){
  const f = await pickFile('image/*'); if (!f) return;
  const src = await imageData(f);
  change('slide', () => { img.removeAttribute('data-se-orig-src'); img.removeAttribute('srcset'); img.setAttribute('src', src); });
}
function insertWidget(kind){
  if (kind === 'reveal') {
    const p = placeAt(640, 120);
    insertHTML(`<div class="se-box se-reveal" data-se-widget="reveal" data-nonav data-se-hint="클릭해서 정답 보기" style="position:absolute;left:${p.x}px;top:${p.y}px;width:640px;padding:26px 34px;border-radius:20px;background:#fff;border:3px solid currentColor;font-size:44px;font-weight:700;text-align:center;line-height:1.35">정답을 여기에 쓰세요</div>`, { edit: true });
    toast('발표할 때는 줄무늬로 가려져 있다가, 누르면 정답이 보여요.');
  } else if (kind === 'timer') {
    const p = placeAt(340, 150);
    insertHTML(`<div class="se-box se-timer" data-se-widget="timer" data-nonav data-se-sec="180" style="position:absolute;left:${p.x}px;top:${p.y}px;padding:12px 34px;border-radius:22px;background:rgba(255,255,255,.9);box-shadow:0 8px 24px rgba(0,0,0,.08);font-size:104px;font-weight:800;line-height:1.1;text-align:center">03:00</div>`, { tab: 'box' });
    toast('발표할 때 누르면 시작·멈춤, 두 번 누르면 처음으로 돌아가요.');
  } else if (kind === 'link') {
    modal({ title: '링크 단추', body: '누르면 열릴 주소를 넣으세요.', input: { placeholder: 'https://' } }).then(url => {
      if (!url) return;
      const p = placeAt(420, 90);
      insertHTML(`<a class="se-box se-btn" href="${url.replace(/"/g, '&quot;')}" target="_blank" rel="noopener" style="position:absolute;left:${p.x}px;top:${p.y}px;padding:20px 40px;border-radius:999px;background:${accent()};color:#fff;font-size:36px;font-weight:700;text-decoration:none;white-space:nowrap">자료 열기 →</a>`, { edit: true });
    });
  } else if (kind === 'embed') {
    modal({ title: '동영상·웹페이지 넣기', body: '유튜브 주소나 웹페이지 주소를 넣으세요. 발표할 때 인터넷이 연결돼 있어야 보여요.', input: { placeholder: 'https://www.youtube.com/watch?v=…' } }).then(url => {
      if (!url) return;
      let src = url.trim();
      const yt = src.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
      if (yt) src = 'https://www.youtube.com/embed/' + yt[1];
      const p = placeAt(1120, 630);
      insertHTML(`<iframe class="se-box se-embed" data-nonav src="${src.replace(/"/g, '&quot;')}" style="position:absolute;left:${p.x}px;top:${p.y}px;width:1120px;height:630px;border:0;border-radius:16px;background:#000" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe>`, { tab: 'box' });
    });
  } else if (kind === 'html') {
    modal({ title: 'HTML 직접 넣기', body: h('p', { text: 'HTML 조각을 붙여 넣으세요. <script>도 넣을 수 있고, 편집 중에는 멈춰 있다가 저장한 덱에서 돌아갑니다.' }), input: { multi: true, value: '<div style="position:absolute;left:200px;top:200px;font-size:48px">새 요소</div>' }, ok: '넣기', wide: true }).then(v => { if (v) insertHTML(v, { tab: 'box' }); });
  }
}
function editCode(){
  const el = S.sel[0]; if (!el) return;
  const c = cleanClone(el, true);
  c.querySelectorAll('[data-se-type]').forEach(s => { const t = s.getAttribute('data-se-type'); if (t === '__none__') s.removeAttribute('type'); else s.setAttribute('type', t); s.removeAttribute('data-se-type'); });
  modal({ title: 'HTML 코드 고치기 — ' + label(el), body: h('p', { text: '고른 요소의 HTML입니다. 고친 뒤 ‘적용’을 누르세요. 되돌리기(Ctrl+Z)도 됩니다.' }), input: { multi: true, value: c.outerHTML }, ok: '적용', wide: true,
    onOk: v => {
      const t = S.edoc.createElement('template'); t.innerHTML = v.trim();
      const n = t.content.firstElementChild;
      if (!n) { toast('요소가 하나 이상 있어야 해요.', 'bad'); return false; }
      t.content.querySelectorAll('script').forEach(s => { s.setAttribute('data-se-type', s.getAttribute('type') || '__none__'); s.setAttribute('type', 'text/x-se-off'); });
      change('slide', () => { const nodes = [...t.content.children]; el.replaceWith(...nodes); S.sel = [nodes[0]]; });
    } });
}

/* ---------- 메뉴 ---------- */
function addMenu(anchor){
  menu(anchor, [
    { head: '글자·그림' },
    { icon: 'text', label: '글상자', key: 'T', fn: () => insertText('') },
    { icon: 'text', label: '큰 제목', fn: () => insertText('', true) },
    { icon: 'image', label: '이미지…', fn: async () => { const f = await pickFile('image/*'); if (f) insertImage(f); } },
    { head: '도형' },
    { icon: 'square', label: '사각형', fn: () => insertShape('rect') },
    { icon: 'round', label: '둥근 카드', fn: () => insertShape('round') },
    { icon: 'circle', label: '원', fn: () => insertShape('circle') },
    { icon: 'line', label: '선', fn: () => insertShape('line') },
    { icon: 'pill', label: '알약 태그', fn: () => insertShape('pill') },
    { head: '기능' },
    { icon: 'reveal', label: '정답 가리개 (누르면 보이기)', fn: () => insertWidget('reveal') },
    { icon: 'timer', label: '타이머', fn: () => insertWidget('timer') },
    { icon: 'link', label: '링크 단추', fn: () => insertWidget('link') },
    { icon: 'video', label: '동영상·웹페이지', fn: () => insertWidget('embed') },
    { icon: 'html', label: 'HTML 직접 넣기…', fn: () => insertWidget('html') },
    ...(S.mode === 'slides' ? ['-',
      { icon: 'slide', label: '새 슬라이드', key: 'Ctrl+M', fn: newSlide },
      { icon: 'copy', label: '이 슬라이드 복제', fn: () => dupSlide(S.cur) }] : [])
  ]);
}
function ctxMenu(at){
  const has = S.sel.length > 0;
  menu(at, [
    { icon: 'text', label: '글자 고치기', key: 'Enter', fn: () => startEdit(S.sel[0]), disabled: S.sel.length !== 1 || isMedia(S.sel[0]) },
    { icon: 'copy', label: '복제', key: 'Ctrl+D', fn: dupSel, disabled: !has },
    { icon: 'trash', label: '삭제', key: 'Del', fn: delSel, disabled: !has, bad: true },
    '-',
    { icon: 'front', label: '맨 앞으로', key: 'Ctrl+]', fn: () => orderSel('front'), disabled: !has },
    { icon: 'back', label: '맨 뒤로', key: 'Ctrl+[', fn: () => orderSel('back'), disabled: !has },
    { icon: 'up', label: '바깥 요소 고르기', key: 'Esc', fn: selectParent, disabled: !has },
    '-',
    ...arrangeItems(),
    '-',
    { icon: 'spark', label: '움직임 더하기·보기', fn: () => { S.tab = 'anim'; S.openAnim = first(); renderPanel(); }, disabled: !has },
    { icon: 'code', label: 'HTML 코드 고치기…', fn: editCode, disabled: S.sel.length !== 1 },
    { icon: 'reset', label: '옮긴 위치·회전 되돌리기', fn: resetPos, disabled: !has }
  ]);
}
function fileMenu(anchor){
  menu(anchor, [
    { icon: 'file', label: '파일 열기…', fn: openSingle },
    { icon: 'folder', label: '폴더 열기…', fn: () => openFolder() },
    { icon: 'layers', label: '같은 폴더의 다른 파일…', fn: showFileList, disabled: !S.folder },
    '-',
    { icon: 'file', label: 'PDF로 내보내기…', fn: exportPdf, disabled: !S.edoc },
    { icon: 'restore', label: '백업에서 되살리기…', fn: restoreBackup, disabled: !S.file }
  ]);
}
/* 화면 색: 밝게(흰 바탕·파랑) / 어둡게(검은 바탕·사탕색) */
function getTheme(){ try { return localStorage.getItem('se-theme') || 'light'; } catch (e) { return 'light'; } }
function setTheme(v){ document.documentElement.dataset.seTheme = v; try { localStorage.setItem('se-theme', v); } catch (e) {} }
function setMenu(anchor){
  const m = h('div', { style: 'width:300px' });
  const theme = h('div', { class: 'seg' }, ...[['light', '밝게'], ['dark', '어둡게']].map(([v, t]) => {
    const b = h('button', { type: 'button', class: getTheme() === v ? 'on' : '', text: t });
    b.onclick = () => { setTheme(v); theme.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); };
    return b;
  }));
  const chk = h('input', { type: 'checkbox', style: 'width:16px;height:16px;margin:2px 0 0;flex:none' });
  chk.checked = S.embed;
  chk.onchange = () => { S.embed = chk.checked; setDirty(true); toast(S.embed ? '저장하면 덱에 편집 모드가 들어가요. 덱에서 E를 누르면 편집기가 열립니다.' : '저장하면 덱에서 편집 모드가 빠져요.'); };
  m.append(
    h('div', { class: 'row', style: 'padding:8px 10px 4px;margin:0' }, h('label', { text: '화면 색' }), theme),
    h('label', { style: 'display:flex;gap:10px;align-items:flex-start;padding:10px;cursor:pointer;border-radius:6px' }, chk,
      h('span', null, h('b', { text: '덱에 편집 모드 넣기' }), h('div', { class: 'hint', text: '덱을 띄운 채 E 키로 이 편집기를 열어요.' }))),
    (() => {
      const c2 = h('input', { type: 'checkbox', style: 'width:16px;height:16px;margin:2px 0 0;flex:none' }); c2.checked = S.showHidden;
      c2.onchange = () => { S.showHidden = c2.checked; applyShowHidden(); refreshGhost(); };
      return h('label', { style: 'display:flex;gap:10px;align-items:flex-start;padding:10px;cursor:pointer;border-radius:6px' }, c2,
        h('span', null, h('b', { text: '숨은 요소도 고치기' }), h('div', { class: 'hint', text: '처음엔 숨겨진 요소를 드러내 고를 수 있게 해요.' })));
    })(),
    h('div', { class: 'msep' }),
    h('button', { type: 'button', class: 'mi', onclick: () => { closePop(); restoreBackup(); }, disabled: !S.file || null }, ic('restore'), h('span', { text: '백업에서 되살리기…' })),
    h('button', { type: 'button', class: 'mi', onclick: () => { closePop(); exportPdf(); }, disabled: !S.edoc || null }, ic('file'), h('span', { text: 'PDF로 내보내기…' })),
    h('button', { type: 'button', class: 'mi', onclick: () => { closePop(); showHelp(); } }, ic('more'), h('span', { text: '단축키 보기' })),
    h('div', { class: 'hint', style: 'padding:6px 10px 4px', text: '다듬이 v' + VERSION }, policyLink())
  );
  popAt(anchor, m, { right: true });
}
function showHelp(){
  const rows = [['클릭', '요소 고르기 (다시 누르면 한 단계 안쪽)'], ['Alt + 클릭', '가장 안쪽 요소 바로 고르기'], ['Ctrl·Shift + 클릭', '하나씩 더하기·빼기'], ['빈 곳에서 끌기', '사각형 안에 통째로 든 요소 모두 고르기 (슬라이드 바깥 회색에서 시작해도 됨)'], ['Ctrl·Shift + 끌기', '지금 고른 것에 범위만큼 더하기'], ['여러 개 고른 채 하나 누르기', '그것만 고르기'],
    ['더블클릭 · Enter', '글자 고치기'], ['Esc', '편집 끝내기 / 바깥 요소'], ['방향키 (Shift)', '1px (10px)씩 옮기기'], ['끌기 + Shift', '가로·세로로만 옮기기'], ['끌기 + Ctrl', '자석 끄기'],
    ['Ctrl + Z / Y', '되돌리기 / 다시 하기'], ['Ctrl + C / X / V', '복사 / 잘라내기 / 붙여넣기 (다른 덱에도)'], ['Ctrl + D', '복제'], ['Delete', '삭제'], ['Ctrl + ] / [', '맨 앞 / 맨 뒤'],
    ['PageUp / PageDown', '이전 / 다음 슬라이드'], ['Ctrl + M', '새 슬라이드'], ['Ctrl + S', '저장'], ['Ctrl + 휠', '확대·축소']];
  const t = h('div', { style: 'display:grid;grid-template-columns:auto 1fr;gap:6px 18px' }, rows.map(([a, b]) => [h('kbd', { style: 'justify-self:start', text: a }), h('span', { text: b })]));
  modal({ title: '단축키', body: t, ok: '닫기', cancel: null });
}

/* ===================================================================
   글꼴·색
   =================================================================== */
function collectStyles(){
  const vars = [], deck = new Set(), colors = [], seen = new Set(), sub = new Set();
  const walk = rules => {
    for (const r of rules) {
      /* unicode-range가 있는 글꼴은 기호만 맡는 보조 글꼴이다 */
      if (r.type === 5) { const f = firstFamily(r.style.getPropertyValue('font-family')); if (f) { deck.add(f); if (r.style.getPropertyValue('unicode-range')) sub.add(f); } }
      else if (r.type === 1 && /(^|,)\s*(:root|html)\b/.test(r.selectorText || '')) {
        for (let i = 0; i < r.style.length; i++) {
          const p = r.style[i]; if (!p.startsWith('--') || seen.has(p)) continue;
          const v = r.style.getPropertyValue(p).trim();
          if (/serif|sans|mono|cursive|^["']/.test(v) && /[,"']/.test(v) && !/^(#|rgb|hsl)/.test(v)) { vars.push({ name: p, value: v }); seen.add(p); }
          else if (/^(#[0-9a-f]{3,8}|rgba?\(|hsla?\(|oklch\()/i.test(v)) { colors.push({ name: p, value: v }); seen.add(p); }
        }
      }
      if (r.cssRules) walk(r.cssRules);
    }
  };
  for (const sh of S.edoc.styleSheets) { try { walk(sh.cssRules); } catch (e) {} }
  const added = [];
  const fs = S.edoc.getElementById('se-fonts');
  if (fs) (fs.textContent.match(/font-family:\s*"([^"]+)"/g) || []).forEach(m => { const n = m.replace(/font-family:\s*"|"/g, ''); if (!added.includes(n)) added.push(n); });
  added.forEach(a => deck.delete(a));
  S.fonts.vars = vars; S.fonts.deck = [...deck]; S.fonts.added = added; S.fonts.sub = sub;
  S.colors = colors.slice(0, 24);
  /* 덱 글꼴을 편집기 쪽에도 넣어 글꼴 고르기에서 미리 보이게 한다 */
  let css = '';
  for (const sh of S.edoc.styleSheets) { try { for (const r of sh.cssRules) if (r.type === 5) css += r.cssText + '\n'; } catch (e) {} }
  $('se-hostfonts').textContent = css;
}
function sysFonts(){
  if (S.fonts.sys) return S.fonts.sys;
  const c = document.createElement('canvas').getContext('2d'), txt = '가나다라마바사 Hamburgefonstiv 0123';
  const has = f => ['monospace', 'serif', 'sans-serif'].some(b => { c.font = `40px ${b}`; const w0 = c.measureText(txt).width; c.font = `40px ${cssStr(f)}, ${b}`; return c.measureText(txt).width !== w0; });
  return (S.fonts.sys = WIN_FONTS.filter(([f]) => has(f)));
}
async function loadLocalFonts(){
  if (!window.queryLocalFonts) { toast('이 브라우저에서는 컴퓨터 글꼴 목록을 볼 수 없어요. 글꼴 파일을 직접 넣어 주세요.'); return null; }
  try {
    const list = await queryLocalFonts();
    const fam = new Map();
    for (const f of list) { if (!fam.has(f.family)) fam.set(f.family, []); fam.get(f.family).push(f); }
    S.fonts.localData = fam;
    S.fonts.local = [...fam.keys()].sort((a, b) => a.localeCompare(b, 'ko'));
    return S.fonts.local;
  } catch (e) { toast('글꼴 목록을 볼 권한이 없어요.', 'bad'); return null; }
}
function fontPop(anchor, current, onPick){
  const pop = h('div', { class: 'fontpop' });
  const q = h('input', { class: 'f', type: 'search', placeholder: '글꼴 이름으로 찾기', spellcheck: 'false', style: 'width:100%' });
  const list = h('div', { class: 'fl' });
  const groups = () => {
    const g = [];
    const role = n => /^--(k?t|title|head|display|h)/i.test(n) ? '제목용' : /^--(k?b|body|text|base)/i.test(n) ? '본문용' : '';
    if (S.fonts.vars.length) g.push(['이 덱의 글꼴 묶음', S.fonts.vars.map(v => ({ v: `var(${v.name})`, name: fontLabel(v.value), note: role(v.name), fam: v.value }))]);
    const own = S.fonts.deck.filter(f => !(S.fonts.sub || new Set()).has(f));
    if (own.length) g.push(['덱에 들어 있는 글꼴', own.map(f => ({ v: cssStr(f), name: fontLabel(cssStr(f)), fam: cssStr(f) }))]);
    if (S.fonts.added.length) g.push(['내가 넣은 글꼴', S.fonts.added.map(f => ({ v: cssStr(f), name: f, fam: cssStr(f) }))]);
    g.push(['이 컴퓨터 기본 글꼴', sysFonts().map(([f, k]) => ({ v: cssStr(f) + ', sans-serif', name: k, note: k !== f ? f : '', fam: cssStr(f) }))]);
    if (S.fonts.local) g.push(['내 컴퓨터 글꼴 전체', S.fonts.local.map(f => ({ v: cssStr(f), name: f, fam: cssStr(f), local: !SAFE_FONTS.has(f) }))]);
    return g;
  };
  const draw = () => {
    list.innerHTML = '';
    const term = q.value.trim().toLowerCase();
    let n = 0;
    for (const [title, items] of groups()) {
      const its = items.filter(i => !term || (i.name + ' ' + (i.note || '')).toLowerCase().includes(term));
      if (!its.length) continue;
      list.appendChild(h('div', { class: 'mh', text: title }));
      for (const it of its.slice(0, 400)) {
        n++;
        const b = h('button', { type: 'button', class: 'fo' + (current && current.replace(/\s/g, '') === it.v.replace(/\s/g, '') ? ' on' : '') },
          h('span', { class: 'nm', style: `font-family:${it.fam}`, text: it.name + '  가나다' }), it.note ? h('small', { text: it.note }) : null);
        b.onclick = () => { closePop(); onPick(it.v, it); };
        list.appendChild(b);
      }
    }
    if (!n) list.appendChild(h('div', { class: 'empty-note', text: '찾는 글꼴이 없어요' }));
  };
  q.addEventListener('input', draw);
  pop.append(h('div', { class: 'fs' }, q), list, h('div', { class: 'ff' },
    S.fonts.local ? null : h('button', { type: 'button', class: 'btn sm', onclick: async () => { if (await loadLocalFonts()) draw(); } }, '내 컴퓨터 글꼴 더 보기'),
    h('button', { type: 'button', class: 'btn sm', onclick: () => { closePop(); embedFontFile(onPick); } }, '글꼴 파일 넣기…')));
  draw();
  popAt(anchor, pop);
  setTimeout(() => q.focus(), 30);
}
function addFontFace(css){
  change('head', () => {
    let st = S.edoc.getElementById('se-fonts');
    if (!st) { st = S.edoc.createElement('style'); st.id = 'se-fonts'; S.edoc.head.appendChild(st); }
    st.textContent += css + '\n';
  }, () => { collectStyles(); });
}
async function embedFontFile(onPick){
  const f = await pickFile('.ttf,.otf,.woff,.woff2,font/*'); if (!f) return;
  const name = await modal({ title: '글꼴 이름', body: `‘${f.name}’ (${kb(f.size)})을 덱 안에 넣습니다. 쓸 이름을 정하세요.`, input: { value: f.name.replace(/\.[^.]+$/, '').replace(/[-_](Regular|Bold|Medium|Light)$/i, '') } });
  if (!name) return;
  if (f.size > 8e6 && !(await modal({ title: '큰 글꼴 파일', body: `${kb(f.size)}나 되는 파일이라 덱이 그만큼 무거워져요. 그래도 넣을까요?`, ok: '넣기' }))) return;
  const data = await readAs(f, 'readAsDataURL');
  const fmt = /woff2/i.test(f.name) ? 'woff2' : /woff/i.test(f.name) ? 'woff' : /otf/i.test(f.name) ? 'opentype' : 'truetype';
  addFontFace(`@font-face{font-family:${cssStr(name)};src:url(${data}) format("${fmt}");font-display:block}`);
  toast(`‘${name}’ 글꼴을 덱에 넣었어요.`, 'ok');
  if (onPick) onPick(cssStr(name), { name });
}
async function embedLocalFont(family){
  const fam = S.fonts.localData && S.fonts.localData.get(family);
  if (!fam) return toast('글꼴 파일을 찾지 못했어요.', 'bad');
  const pick = [];
  for (const f of fam) {
    const st = (f.style || '').toLowerCase();
    const w = /thin|hairline/.test(st) ? 100 : /extralight|ultralight/.test(st) ? 200 : /light/.test(st) ? 300 : /medium/.test(st) ? 500 : /semibold|demibold/.test(st) ? 600 : /extrabold|ultrabold|heavy/.test(st) ? 800 : /black/.test(st) ? 900 : /bold/.test(st) ? 700 : 400;
    if (/italic|oblique/.test(st)) continue;
    if (w === 400 || w === 700) pick.push([f, w]);
  }
  if (!pick.length) pick.push([fam[0], 400]);
  const blobs = await Promise.all(pick.map(([f]) => f.blob()));
  const size = blobs.reduce((a, b) => a + b.size, 0);
  if (!(await modal({ title: '글꼴을 덱에 넣기', body: `‘${family}’ ${pick.length}개 굵기(${kb(size)})를 덱 파일 안에 넣습니다. 다른 컴퓨터에서도 같은 글꼴로 보이지만 덱이 그만큼 무거워져요.`, ok: '넣기' }))) return;
  let css = '';
  for (let i = 0; i < pick.length; i++) css += `@font-face{font-family:${cssStr(family)};font-weight:${pick[i][1]};src:url(${await readAs(blobs[i], 'readAsDataURL')});font-display:block}\n`;
  addFontFace(css);
  toast(`‘${family}’ 글꼴을 덱에 넣었어요.`, 'ok');
  renderPanel();
}

function colorPop(anchor, current, onPick, opt = {}){
  const pop = h('div', { class: 'colorpop' });
  const sw = (v, bg, title) => { const b = h('button', { type: 'button', title: title || v, class: current === v ? 'on' : '' }); b.style.background = bg || v; b.onclick = () => { pickColor(v, true); }; return b; };
  const pickColor = (v, fin) => { onPick(v, fin); if (fin) { if (!/^var/.test(v) && v && !S.recentColors.includes(v)) S.recentColors = [v, ...S.recentColors].slice(0, 8); closePop(); } };
  if (S.colors.length) {
    pop.append(h('h5', { text: '덱 색' }), h('div', { class: 'cg' }, S.colors.map(c => sw(`var(${c.name})`, S.ewin.getComputedStyle(S.edoc.documentElement).getPropertyValue(c.name) || c.value, c.name))));
  }
  pop.append(h('h5', { text: '기본 색' }), h('div', { class: 'cg' }, BASIC_COLORS.map(c => sw(c))));
  if (S.recentColors.length) pop.append(h('h5', { text: '최근' }), h('div', { class: 'cg' }, S.recentColors.map(c => sw(c))));
  const native = h('input', { type: 'color', value: toHex(current) || '#000000' });
  native.addEventListener('input', () => pickColor(native.value, false));
  native.addEventListener('change', () => pickColor(native.value, true));
  const hex = h('input', { class: 'f', type: 'text', value: toHex(current) || '', placeholder: '#000000', spellcheck: 'false' });
  hex.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' && CSS.supports('color', hex.value)) pickColor(hex.value, true); });
  pop.append(h('div', { class: 'cr' }, native, hex, opt.none ? h('button', { type: 'button', class: 'btn sm', onclick: () => pickColor('', true) }, '없음') : null));
  popAt(anchor, pop);
}
function toHex(c){
  if (!c) return '';
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  const m = String(c).match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  if (!m) return '';
  return '#' + [m[1], m[2], m[3]].map(v => Math.round(+v).toString(16).padStart(2, '0')).join('');
}
function isClear(c){ return !c || c === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(c) || c === 'rgba(0, 0, 0, 0)'; }

/* ===================================================================
   속성 칸
   =================================================================== */
let CTLS = [];
function reg(fn){ CTLS.push(fn); }
function syncPanel(){ CTLS.forEach(f => { try { f(); } catch (e) {} }); try { ttSync(); } catch (e) {} }
const syncPanelSoon = debounce(syncPanel, 80);
function first(){ return S.sel[0]; }
/* 글자 모양을 읽을 기준: 편집 중이면 커서가 있는 글자, 아니면 고른 요소 */
function textTarget(){
  if (S.editing) {
    const r = S.lastRange;
    if (r) { const n = r.startContainer; const el = n.nodeType === 1 ? n : n.parentElement; if (el && S.editing.contains(el)) return el; }
    return S.editing;
  }
  return first();
}

/* 글자가 실제로 들어 있는 요소들(바깥 상자의 값이 아니라 보이는 글자의 값을 읽으려고) */
function textParts(el){
  const out = [], w = S.edoc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode()) && out.length < 300) if (n.textContent.trim() && n.parentElement && !n.parentElement.closest('[data-se-ghost]')) out.push(n.parentElement);
  return [...new Set(out)];
}
/* 고른 것 안의 글자 모양 한 가지 값. 섞여 있으면 null */
function textVal(prop){
  const t = textTarget(); if (!t) return null;
  const els = S.editing ? [t] : S.sel.flatMap(e => { const p = textParts(e); return p.length ? p : [e]; });
  const vals = [...new Set(els.map(e => cs(e)[prop]))];
  return vals.length === 1 ? vals[0] : null;
}
/* 글꼴 이름을 읽기 쉽게: 기호 보조 글꼴은 건너뛰고, 덱에 넣은 짧은 이름은 고딕·명조로, 윈도 글꼴은 한글 이름 */
function fontLabel(f){
  if (!f) return '여러 글꼴';
  const sub = S.fonts.sub || new Set();
  const fams = f.split(',').map(x => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  const fam = fams.find(x => !sub.has(x)) || fams[0], win = WIN_FONTS.find(([e]) => e === fam);
  if (win) return win[1];
  if (S.fonts.deck.includes(fam) && /^[A-Za-z0-9]{1,8}$/.test(fam)) return /serif|myeong|batang/i.test(fam) ? '덱 명조' : /sans|gothic|dotum/i.test(fam) ? '덱 고딕' : '덱 글꼴';
  return fam;
}
const SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 44, 48, 54, 60, 66, 72, 80, 90, 100, 110, 120, 140, 160, 200];
function setFontSize(v){
  v = clamp(Math.round(v), 6, 600);
  if (S.editing) { textStyle('font-size', v + 'px'); setDirty(true); }
  else change('slide', () => styleEls('font-size', v + 'px', true));
  ttSync(); syncPanel();
}
function stepFontSize(d){
  const cur = parseFloat(textVal('fontSize'));
  if (isNaN(cur)) { bump(d > 0 ? 1.1 : 1 / 1.1); return; }
  const next = d > 0 ? SIZES.find(s => s > cur + 0.5) : [...SIZES].reverse().find(s => s < cur - 0.5);
  setFontSize(next || cur + d * 10);
}
function applyColor(prop, v, fin){
  if (S.editing) { textStyle(prop, v); }
  else if (fin) { if (S.live) { live(() => styleEls(prop, v, true)); settle(); } else change('slide', () => styleEls(prop, v, true)); }
  else live(() => styleEls(prop, v, true));
  ttSync(); syncPanel();
}

/* ---------- 글자 위에 뜨는 도구 막대 (파워포인트·구글 슬라이드처럼) ---------- */
function ttTarget(){
  if (S.editing) return S.editing;
  if (!S.sel.length || MV || S.marq || S.rz) return null;
  return S.sel.every(e => !isMedia(e) && normT(e.textContent)) ? S.sel[0] : null;
}
function ttBtn(content, title, fn, cls){
  const b = h('button', { type: 'button', class: 'ttb' + (cls ? ' ' + cls : ''), title }, content);
  b.onclick = fn; return b;
}
function buildTT(){
  const tt = h('div', { id: 'se-tt', class: 'tt hide' });
  /* 누를 때 편집 중인 글자의 선택이 풀리지 않게 */
  tt.addEventListener('mousedown', e => { if (e.target.tagName !== 'INPUT') e.preventDefault(); });
  tt.addEventListener('pointerdown', e => e.stopPropagation());
  const fontB = ttBtn([h('span', { class: 'tt-fn' }), ic('down')], '글꼴', () => fontPop(fontB, textVal('fontFamily') || '', v => { textStyleOnce('font-family', v); ttSync(); syncPanel(); }), 'tt-font');
  const size = h('input', { type: 'text', class: 'tt-size', inputmode: 'decimal', spellcheck: 'false', title: '글자 크기(px) · ↑↓로 한 단계씩' });
  size.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter') size.blur();   /* 값은 change에서 한 번만 적용 */
    else if (e.key === 'Escape') { size.blur(); ttSync(); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); stepFontSize(e.key === 'ArrowUp' ? 1 : -1); }
  });
  size.addEventListener('change', () => { const v = parseFloat(size.value); if (!isNaN(v)) setFontSize(v); });
  const deco = (k, txt, style, title) => ttBtn(h('span', { style, text: txt }), title, () => { toggleDeco(k); ttSync(); }, 'tt-deco tt-' + k);
  const colorB = ttBtn([h('span', { class: 'tt-a', text: '가' }), h('i', { class: 'tt-bar tt-cbar' })], '글자색', () => colorPop(colorB, textVal('color') || '', (v, fin) => applyColor('color', v, fin)), 'tt-color');
  const hiB = ttBtn([ic('pen'), h('i', { class: 'tt-bar tt-hbar' })], '형광펜(글자 뒤 색)', () => colorPop(hiB, textVal('backgroundColor') || '', (v, fin) => applyColor('background-color', v, fin), { none: true }), 'tt-color');
  const alignB = ttBtn(h('span', { class: 'tt-al' }), '문단 정렬', () => menu(alignB, [['left', '왼쪽', 'tl'], ['center', '가운데', 'tc'], ['right', '오른쪽', 'tr'], ['justify', '양쪽', 'tj']].map(([v, l, icn]) => ({ icon: icn, label: l + ' 맞춤', fn: () => {
    const el = S.editing; if (el) { live(() => el.style.textAlign = v); settle(); } else change('slide', () => styleEls('text-align', v)); ttSync(); syncPanel();
  } }))));
  const editB = ttBtn(h('span', { class: 'tt-ed' }), '', () => { if (S.editing) { const el = S.editing; endEdit(); select([el]); } else startEdit(S.sel[0]); }, 'tt-edit');
  tt.append(fontB, h('i', { class: 'tt-sep' }),
    ttBtn('−', '작게 (한 단계)', () => stepFontSize(-1), 'tt-pm'), size, ttBtn('+', '크게 (한 단계)', () => stepFontSize(1), 'tt-pm'), h('i', { class: 'tt-sep' }),
    deco('b', 'B', 'font-weight:800', '굵게 (Ctrl+B)'), deco('i', 'I', 'font-style:italic;font-family:Georgia,serif', '기울임 (Ctrl+I)'), deco('u', 'U', 'text-decoration:underline', '밑줄 (Ctrl+U)'),
    colorB, hiB, alignB, h('i', { class: 'tt-sep' }), editB);
  return tt;
}
function ttSync(){
  const tt = $('se-tt'); if (!tt || tt.classList.contains('hide') || !S.edoc) return;
  const fam = textVal('fontFamily'), fn = tt.querySelector('.tt-fn');
  fn.textContent = fontLabel(fam); fn.style.fontFamily = fam || '';
  const size = tt.querySelector('.tt-size');
  if (document.activeElement !== size) { const v = parseFloat(textVal('fontSize')); size.value = isNaN(v) ? '' : String(Math.round(v)); size.placeholder = '여러'; }
  const w = textVal('fontWeight'), st = textVal('fontStyle'), dl = textVal('textDecorationLine') || '';
  tt.querySelector('.tt-b').classList.toggle('on', parseInt(w) >= 600);
  tt.querySelector('.tt-i').classList.toggle('on', st === 'italic');
  tt.querySelector('.tt-u').classList.toggle('on', /underline/.test(dl));
  const col = textVal('color'), bg = textVal('backgroundColor');
  tt.querySelector('.tt-cbar').style.background = col || 'linear-gradient(90deg,#d6453d,#2f6bff)';
  tt.querySelector('.tt-hbar').style.background = isClear(bg) ? 'repeating-linear-gradient(45deg,#ddd 0 3px,#fff 3px 6px)' : bg || '#ffe66d';
  const a = cs(S.editing || S.sel[0]).textAlign, al = a === 'center' ? 'tc' : a === 'right' || a === 'end' ? 'tr' : a === 'justify' ? 'tj' : 'tl';
  const ab = tt.querySelector('.tt-al'); ab.innerHTML = ''; ab.appendChild(ic(al));
  const ed = tt.querySelector('.tt-ed'); ed.innerHTML = '';
  ed.append(ic(S.editing ? 'check' : 'text'), h('span', { text: S.editing ? '완료' : '글자 고치기' }));
  tt.querySelector('.tt-edit').title = S.editing ? '글자 고치기 끝 (Esc)' : '글자 고치기 (더블클릭·Enter)';
  tt.classList.toggle('editing', !!S.editing);
}
function ttUpdate(){
  const host = $('se-stagewrap'); if (!host) return;
  let tt = $('se-tt');
  const t = S.edoc ? ttTarget() : null;
  if (!t) { if (tt) tt.classList.add('hide'); return; }
  if (!tt) { tt = buildTT(); host.appendChild(tt); }
  const wasHidden = tt.classList.contains('hide');
  tt.classList.remove('hide');
  if (wasHidden || tt._t !== t || tt._ed !== !!S.editing) { tt._t = t; tt._ed = !!S.editing; ttSync(); }
  const u = S.sel.length > 1 && !S.editing ? unionBox(S.sel) : boxOf(t), sc = S.scale;
  const w = tt.offsetWidth, hh = tt.offsetHeight;
  let y = PAD + u.y * sc - hh - 12;
  if (y < 2) y = PAD + (u.y + u.h) * sc + 12;
  const x = clamp(PAD + u.x * sc, 2, Math.max(2, host.offsetWidth - w - 2));
  tt.style.left = x + 'px'; tt.style.top = y + 'px';
}

function sec(title, ...kids){ return h('div', { class: 'sec' }, title ? h('h4', null, title) : null, ...kids); }
function row(lbl, ...kids){ return h('div', { class: 'row' }, lbl ? h('label', { text: lbl }) : null, ...kids); }
function numCtl(lbl, unit, get, set, o = {}){
  const inp = h('input', { type: 'text', inputmode: 'decimal', spellcheck: 'false', title: o.title || null });
  const lab = h('b', { text: lbl, title: '좌우로 끌어서 바꾸기' });
  const w = h('div', { class: 'num' }, lab, inp, unit ? h('i', { text: unit }) : null);
  /* 이름표 길이만큼 입력칸 왼쪽을 비운다(한글 한 자 ≈ 11px) */
  inp.style.paddingLeft = (14 + [...lbl].reduce((a, c) => a + (/[ㄱ-힝]/.test(c) ? 11 : 7.5), 0)) + 'px';
  if (unit) inp.style.paddingRight = (10 + [...unit].reduce((a, c) => a + (/[ㄱ-힝]/.test(c) ? 11 : 7), 0)) + 'px';
  const dec = o.dec || 0;
  if (o.ph) inp.placeholder = o.ph;
  const sync = () => { if (document.activeElement === inp) return; const v = get(); inp.value = (v === '' || v == null || isNaN(v)) ? '' : String(rnd(v, dec)); };
  const apply = v => { if (o.min != null) v = Math.max(o.min, v); if (o.max != null) v = Math.min(o.max, v); live(() => set(v)); };
  inp.addEventListener('input', () => { const v = parseFloat(inp.value); if (!isNaN(v)) apply(v); });
  inp.addEventListener('change', () => { settle(); });
  inp.addEventListener('blur', () => { settle(); sync(); });
  inp.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const v = rnd((parseFloat(inp.value) || 0) + (o.step || 1) * (e.shiftKey ? 10 : 1) * (e.key === 'ArrowUp' ? 1 : -1), dec);
      inp.value = v; apply(v);
    } else if (e.key === 'Enter' || e.key === 'Escape') inp.blur();
  });
  lab.addEventListener('pointerdown', e => {
    e.preventDefault();
    const x0 = e.clientX, v0 = parseFloat(inp.value) || 0;
    lab.setPointerCapture(e.pointerId);
    const mv = ev => { const v = rnd(v0 + Math.round((ev.clientX - x0) / 3) * (o.step || 1), dec); inp.value = v; apply(v); };
    const up = () => { lab.removeEventListener('pointermove', mv); lab.removeEventListener('pointerup', up); settle(); syncPanel(); };
    lab.addEventListener('pointermove', mv); lab.addEventListener('pointerup', up);
  });
  reg(sync);
  return w;
}
function colorCtl(get, set, o = {}){
  const sw = h('button', { type: 'button', class: 'sw', title: o.title || '색 고르기' });
  /* 색 이름 대신 ‘없음’·‘여러 색’처럼 상태만 글로 */
  const txt = h('span', { class: 'cv' });
  const sync = () => {
    const v = get();
    if (v == null) { sw.classList.remove('none'); sw.style.background = 'conic-gradient(#d6453d,#f5c518,#34a853,#2f6bff,#c2459d,#d6453d)'; txt.textContent = '여러 색'; return; }
    sw.classList.toggle('none', isClear(v)); sw.style.background = isClear(v) ? '' : v; txt.textContent = isClear(v) ? '없음' : '';
  };
  sw.addEventListener('mousedown', e => { if (S.editing) e.preventDefault(); });
  sw.onclick = () => colorPop(sw, get(), (v, fin) => {
    if (S.editing) { set(v); setDirty(true); drawOv(); }
    else if (fin) { if (S.live) { live(() => set(v)); settle(); } else change('slide', () => set(v)); }
    else live(() => set(v));
    syncPanel();
  }, o);
  reg(sync);
  return o.bare ? sw : h('div', { class: 'colorrow' }, sw, txt);
}
function segCtl(items, get, set){
  const w = h('div', { class: 'seg' });
  const bs = items.map(it => {
    const b = h('button', { type: 'button', title: it.title || '' }, it.icon ? ic(it.icon) : h('span', { style: it.style || '', text: it.text }));
    b.addEventListener('mousedown', e => { if (S.editing) e.preventDefault(); });
    b.onclick = () => set(it.v);
    w.appendChild(b); return [b, it];
  });
  reg(() => { const v = get(); bs.forEach(([b, it]) => b.classList.toggle('on', Array.isArray(v) ? v.includes(it.v) : v === it.v)); });
  return w;
}
function btn(label, fn, o = {}){
  const b = h('button', { type: 'button', class: 'btn' + (o.cls ? ' ' + o.cls : ''), title: o.title || null }, o.icon ? ic(o.icon) : null, label ? h('span', { text: label }) : null);
  b.addEventListener('mousedown', e => { if (S.editing) e.preventDefault(); });
  b.onclick = fn; return b;
}

/* 요소 스타일을 바꾼다. 안쪽 요소에 같은 인라인 값이 있으면 지워 바깥 값이 보이게 한다 */
function styleEls(prop, val, inner){
  for (const el of S.sel) {
    if (val === '' || val == null) el.style.removeProperty(prop); else el.style.setProperty(prop, val);
    if (inner) el.querySelectorAll('[style]').forEach(n => n.style.removeProperty(prop));
  }
}
/* 글자 모양: 편집 중에 범위를 골랐으면 그 범위만, 아니면 고른 요소 전체 */
function textStyle(prop, val){
  if (S.editing && rangeSel()) { wrapSel({ [prop]: val }); setDirty(true); drawOv(); return; }
  if (S.editing) { S.editing.style.setProperty(prop, val); setDirty(true); drawOv(); return; }
  styleEls(prop, val, true);
}
function textStyleOnce(prop, val){
  if (S.editing) { textStyle(prop, val); syncPanel(); return; }
  change('slide', () => styleEls(prop, val, true));
}

/* ===================================================================
   오른쪽 패널: 꾸미기 / 움직임 두 모드
   꾸미기 — 고른 것의 이름 카드 + 그 요소에 맞는 칸만(글자 → 모양 → 맞추기 → 위치·크기 → 움직임 요약)
   움직임 — 이 장의 클릭 순서를 단계마다 묶어 보여 준다(파워포인트 애니메이션 창처럼)
   =================================================================== */
function renderPanel(){
  const P = $('se-props'); if (!P) return;
  CTLS = []; P.innerHTML = '';
  const motion = S.tab === 'anim';
  $('se-right').dataset.mode = motion ? 'anim' : 'style';
  document.querySelectorAll('#se-tabs button').forEach(b => b.classList.toggle('on', (b.dataset.tab === 'anim') === motion));
  if (!S.edoc) return;
  /* 모드나 고른 것이 바뀌면 맨 위부터 */
  const key = (motion ? 'm' : 's') + S.cur + ':' + S.sel.map(e => e.tagName + snippet(e, 8)).join('|');
  const keepScroll = key === S.pkey ? P.scrollTop : 0; S.pkey = key;
  if (motion) motionPanel(P); else stylePanel(P);
  syncPanel();
  P.scrollTop = keepScroll;
}
function stylePanel(P){
  if (!S.sel.length) { slidePanel(P); return; }
  P.appendChild(selCard());
  const multi = S.sel.length > 1;
  const hasText = S.sel.some(e => !isMedia(e) && normT(e.textContent));
  if (hasText) textPanel(P);
  boxPanel(P);
  if (!multi) widgetSection(P, first());
  motionSummary(P);
}

/* 요소의 종류를 선생님 말로 */
function kindOf(el){
  if (!el) return '';
  const t = el.tagName.toLowerCase(), w = el.getAttribute('data-se-widget');
  if (w === 'timer') return '타이머';
  if (w === 'reveal') return '정답 가리개';
  if (t === 'img' || t === 'svg' || t === 'canvas') return '그림';
  if (el instanceof S.ewin.SVGElement) return '그림 조각';
  if (t === 'video') return '동영상';
  if (t === 'iframe') return '웹·영상';
  if (t === 'a') return '링크 단추';
  if (/^h[1-6]$/.test(t)) return '제목';
  if (t === 'p' || t === 'blockquote') return '문단';
  if (/^(span|b|strong|em|i|small|mark|u|s|sub|sup|ruby|rt)$/.test(t)) return '글자';
  if (t === 'table') return '표';
  if (/^(td|th)$/.test(t)) return '표 칸';
  if (t === 'ul' || t === 'ol') return '목록';
  if (t === 'li') return '목록 항목';
  const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
  const kids = [...el.children].filter(c => !/^(SCRIPT|STYLE|BR)$/.test(c.tagName)).length;
  if (own && kids < 2) return '글상자';
  return own ? '글상자' : '상자';
}
const nameOf = (el, n = 18) => { const s = snippet(el, n); return kindOf(el) + (s ? ` “${s}”` : ''); };
function snippet(el, n = 40){
  if (!el) return '';
  if (el.tagName === 'IMG') return el.getAttribute('alt') || '';
  const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}
function iconBtn(icon, title, fn, cls){
  const b = h('button', { type: 'button', class: 'ib' + (cls ? ' ' + cls : ''), title, 'aria-label': title }, ic(icon));
  b.addEventListener('mousedown', e => { if (S.editing) e.preventDefault(); });
  b.onclick = fn; return b;
}
/* 고른 것 카드 */
function selCard(){
  const el = first(), multi = S.sel.length > 1;
  const more = iconBtn('more', '더 보기', e => moreMenu(e.currentTarget));
  return h('div', { class: 'pcard' },
    h('div', { class: 'pc-top' },
      h('span', { class: 'pc-kind', text: multi ? `${S.sel.length}개를 골랐어요` : kindOf(el) }),
      h('span', { class: 'grow' }),
      multi && !S.sel.some(grpOf) ? iconBtn('group', '묶기 (Ctrl+G)', groupSel) : null,
      iconBtn('copy', '복제 (Ctrl+D)', dupSel), more),
    h('div', { class: 'pc-text', text: multi ? S.sel.map(e => snippet(e, 14) || kindOf(e)).slice(0, 3).join(' · ') : (snippet(el) || '글자가 없는 ' + kindOf(el)) }),
    multi ? null : pathBar(el));
}
/* 위치 경로: 슬라이드 › 상자 › 제목. 바깥으로 나가도 안쪽 칸을 남겨 다시 들어갈 수 있다 */
function pathBar(el){
  const same = (a, b) => { const x = boxOf(a), y = boxOf(b); return ['x', 'y', 'w', 'h'].every(k => Math.abs(x[k] - y[k]) < 2); };
  S.ptail = S.ptail && S.ptail.isConnected && el.contains(S.ptail) ? S.ptail : el;
  const list = [];
  for (let n = S.ptail; n && n !== S.box; n = n.parentElement) list.unshift(n);
  /* 눈에 보이는 차이가 없는 겹은 뺀다 */
  const shown = list.filter((n, i) => n === el || n === S.ptail || !(n.children.length === 1 && same(n, list[i + 1])));
  const go = t => { S.hover = null; t ? select([t], false, true) : select([]); };
  const chip = (t, text) => {
    const b = h('button', { type: 'button', class: t === el ? 'on' : t && el.contains(t) ? 'in' : null, title: t ? snippet(t, 30) || null : null, 'aria-current': t === el ? 'true' : null, text, onclick: () => go(t) });
    b.onmouseenter = () => { S.hover = t; drawOv(); };
    b.onmouseleave = () => { S.hover = null; drawOv(); };
    return b;
  };
  return h('nav', { class: 'pc-path', 'aria-label': '위치' }, chip(null, S.mode === 'page' ? '문서' : '슬라이드'),
    shown.map(t => [ic('chev'), chip(t, kindOf(t))]));
}
function moreMenu(anchor){
  const one = S.sel.length === 1, el = first();
  const parent = one && el.parentElement && el.parentElement !== S.box ? el.parentElement : null;
  menu(anchor, [
    { icon: 'text', label: '글자 고치기', key: 'Enter', fn: () => startEdit(el), disabled: !one || isMedia(el) },
    { icon: 'up', label: '바깥 요소 고르기', key: 'Esc', fn: () => select([parent]), disabled: !parent },
    '-',
    { icon: 'front', label: '맨 앞으로', key: 'Ctrl+]', fn: () => orderSel('front') },
    { icon: 'back', label: '맨 뒤로', key: 'Ctrl+[', fn: () => orderSel('back') },
    { icon: 'reset', label: '옮긴 위치·회전 되돌리기', fn: resetPos },
    ...arrangeItems(),
    '-',
    { icon: 'code', label: 'HTML 코드 고치기 (고급)', fn: editCode, disabled: !one },
    '-',
    { icon: 'trash', label: '삭제', key: 'Del', fn: delSel, bad: true }
  ], { right: true });
}
/* 아무것도 안 골랐을 때: 이 슬라이드 */
function slidePanel(P){
  if (S.mode === 'slides') {
    const s = S.slides[S.cur];
    const title = s.getAttribute('data-title') || slideTitle(s);
    const ti = h('input', { class: 'pc-title', type: 'text', value: title, spellcheck: 'false', title: '목차와 발표자 창에 나오는 이름 · 눌러서 고치기' });
    ti.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'Escape') ti.blur(); });
    ti.addEventListener('change', () => change('slide', () => { const v = ti.value.trim(); if (v) S.slides[S.cur].setAttribute('data-title', v); else S.slides[S.cur].removeAttribute('data-title'); }, () => { renderSlides(); }));
    const more = iconBtn('more', '슬라이드 더 보기', e => menu(e.currentTarget, [
      { icon: 'up', label: '위로 옮기기', fn: () => moveSlide(S.cur, S.cur - 1), disabled: S.cur === 0 },
      { icon: 'down', label: '아래로 옮기기', fn: () => moveSlide(S.cur, S.cur + 2), disabled: S.cur === S.slides.length - 1 },
      { icon: 'plus', label: '뒤에 새 슬라이드', key: 'Ctrl+M', fn: newSlide },
      { icon: S.slides[S.cur].hasAttribute('data-se-skip') ? 'eye' : 'eyeoff', label: S.slides[S.cur].hasAttribute('data-se-skip') ? '발표에 다시 넣기' : '발표 때 건너뛰기', fn: () => toggleSkip(S.cur) },
      '-',
      { icon: 'trash', label: '이 슬라이드 삭제', fn: () => delSlide(S.cur), bad: true }
    ], { right: true }));
    P.appendChild(h('div', { class: 'pcard' },
      h('div', { class: 'pc-top' }, h('span', { class: 'pc-kind', text: `슬라이드 ${S.cur + 1}` }), h('span', { class: 'grow' }), iconBtn('copy', '이 슬라이드 복제', () => dupSlide(S.cur)), more),
      ti));
    if (isGenerated(s)) dataPanel(P, s);
  }
  const root = S.mode === 'slides' ? S.slides[S.cur] : S.edoc.body;
  P.appendChild(sec('배경',
    row('색', colorCtl(() => cs(root).backgroundColor, v => { root.style.backgroundColor = v; }, { none: true })),
    row('그림', btn('그림 고르기', async () => { const f = await pickFile('image/*'); if (!f) return; const src = await imageData(f); change('slide', () => { root.style.backgroundImage = `url(${src})`; root.style.backgroundSize = 'cover'; root.style.backgroundPosition = 'center'; }); }, { icon: 'image' }),
      root.style.backgroundImage ? iconBtn('x', '배경 그림 빼기', () => change('slide', () => { root.style.backgroundImage = ''; root.style.backgroundSize = ''; root.style.backgroundPosition = ''; })) : null)));
  P.appendChild(treePanel());
}

/* 스크립트가 그리는 장: 자료 속 글자를 칸마다 고친다 */
const DATA_KEY = { t: '글', title: '제목', eyebrow: '머리', tag: '꼬리표', label: '이름', q: '질문', a: '답', txt: '글', text: '글', sub: '부제' };
function dataPanel(P, s){
  const src = dataSource(s);
  if (!src) {
    P.appendChild(sec('이 장의 글자', h('div', { class: 'hint', text: '이 장의 글자는 고칠 수 없어요. 새 요소는 위에 더할 수 있어요.' })));
    return;
  }
  const strs = dataStrings(src);
  const list = h('div', { class: 'dlist' });
  strs.forEach((it, k) => {
    const ta = h('textarea', { class: 'f dta', spellcheck: 'false', rows: String(Math.min(4, Math.max(1, Math.ceil(it.v.length / 20)))) });
    ta.value = it.v;
    ta.addEventListener('keydown', e => e.stopPropagation());
    ta.addEventListener('change', () => setDataString(k, ta.value));
    list.appendChild(h('div', { class: 'drow' }, h('span', { class: 'dk', text: DATA_KEY[it.key] || '·' }), ta));
  });
  if (!strs.length) list.appendChild(h('div', { class: 'hint', text: '고칠 글자가 없어요.' }));
  P.appendChild(sec('이 장의 글자', list));
}
function setDataString(k, v){
  const s = S.slides[S.cur], src = s && dataSource(s); if (!src) return;
  const it = dataStrings(src)[k]; if (!it || it.v === v) return;
  const sc = S.edoc.querySelectorAll('script')[src.si];
  change({ script: src.si }, () => { const t = sc.textContent; sc.textContent = t.slice(0, it.a) + jsEscape(v, it.q) + t.slice(it.b); });
  pvInvalidate();
  S.edoc.querySelectorAll('[data-se-ghost]').forEach(g => g.remove());
  showGhost(S.cur);
}

/* 글자: 글꼴·크기·굵게·색·정렬은 글자 위 막대가 맡고, 여기에는 막대에 없는 것만 */
function textPanel(P){
  const tt = () => textTarget();
  const warnBox = h('div');
  reg(() => {
    warnBox.innerHTML = '';
    const f = firstFamily(textVal('fontFamily') || '');
    if (S.fonts.local && S.fonts.local.includes(f) && !SAFE_FONTS.has(f) && !S.fonts.deck.includes(f) && !S.fonts.added.includes(f))
      warnBox.appendChild(h('div', { class: 'warn' }, h('span', { text: `‘${f}’는 이 컴퓨터에만 있는 글꼴이라 다른 컴퓨터에서는 다르게 보여요.` }), btn('덱에 넣기', () => embedLocalFont(f), { cls: 'sm' })));
  });
  const wsel = h('select', { class: 'f', title: '글자 굵기' }, h('option', { value: '', text: '여러 굵기', disabled: true, hidden: true }), [[300, '가늘게'], [400, '보통'], [500, '중간'], [600, '조금 굵게'], [700, '굵게'], [800, '아주 굵게'], [900, '가장 굵게']].map(([v, t]) => h('option', { value: v, text: t })));
  wsel.addEventListener('change', () => textStyleOnce('font-weight', wsel.value));
  reg(() => { const w = parseInt(textVal('fontWeight')); wsel.value = isNaN(w) ? '' : String(Math.round(w / 100) * 100); });
  P.appendChild(sec(h('span', null, '글자', S.editing ? h('span', { class: 'sub', text: '고른 글자에만' }) : null),
    warnBox,
    row('굵기', wsel),
    h('div', { class: 'g2' },
      numCtl('줄 간격', '배', () => { const c = cs(S.editing || first()); const lh = parseFloat(c.lineHeight); return isNaN(lh) ? 1.4 : lh / parseFloat(c.fontSize); }, v => { (S.editing ? [S.editing] : S.sel).forEach(el => el.style.lineHeight = String(v)); }, { step: 0.05, dec: 2, min: 0.5, max: 4 }),
      numCtl('자간', '', () => { const v = parseFloat(textVal('letterSpacing')); return isNaN(v) ? 0 : v; }, v => textStyle('letter-spacing', v + 'px'), { step: 0.5, dec: 1, title: '글자 사이 간격' })),
    btn('덱 원래 글자 모양으로', clearFormat, { icon: 'reset', cls: 'full quiet', title: '편집기에서 바꾼 글꼴·크기·색을 지워요' })));
}

function toggleDeco(v){
  const cmd = { b: 'bold', i: 'italic', u: 'underline', s: 'strikeThrough' }[v];
  if (S.editing && rangeSel()) { execCmd(cmd); return; }
  const target = S.editing ? [S.editing] : S.sel;
  const apply = () => target.forEach(el => {
    const c = cs(el);
    if (v === 'b') el.style.fontWeight = parseInt(c.fontWeight) >= 600 ? '400' : '700';
    if (v === 'i') el.style.fontStyle = c.fontStyle === 'italic' ? 'normal' : 'italic';
    if (v === 'u' || v === 's') {
      const name = v === 'u' ? 'underline' : 'line-through';
      const set = new Set(c.textDecorationLine.split(' ').filter(x => x && x !== 'none'));
      set.has(name) ? set.delete(name) : set.add(name);
      el.style.textDecorationLine = set.size ? [...set].join(' ') : 'none';
    }
  });
  if (S.editing) { apply(); setDirty(true); } else change('slide', apply);
  syncPanel();
}
function bump(k){
  const el = textTarget(); if (!el) return;
  const v = Math.max(6, Math.round(parseFloat(cs(el).fontSize) * k));
  if (S.editing) { textStyle('font-size', v + 'px'); syncPanel(); }
  else change('slide', () => S.sel.forEach(e => {
    /* 크기가 섞여 있으면 글자 조각마다 같은 비율로 키우고 줄인다(제목은 크게, 본문은 작게 그대로) */
    const parts = textParts(e), sizes = parts.map(p => parseFloat(cs(p).fontSize));
    if (new Set(sizes).size > 1) { parts.forEach((p, j) => { p.style.fontSize = Math.max(6, Math.round(sizes[j] * k)) + 'px'; }); return; }
    e.style.fontSize = Math.max(6, Math.round(parseFloat(cs(e).fontSize) * k)) + 'px'; e.querySelectorAll('[style]').forEach(n => n.style.removeProperty('font-size'));
  }));
  ttSync(); syncPanel();
}
function clearFormat(){
  const props = ['font-family', 'font-size', 'font-weight', 'font-style', 'color', 'background-color', 'text-decoration-line', 'letter-spacing'];
  if (S.editing && rangeSel()) { execCmd('removeFormat'); return; }
  change('slide', () => (S.editing ? [S.editing] : S.sel).forEach(el => {
    [el, ...el.querySelectorAll('[style]')].forEach(n => props.forEach(p => n.style.removeProperty(p)));
    el.querySelectorAll('span[data-se-sp]').forEach(sp => { if (!sp.getAttribute('style')) sp.replaceWith(...sp.childNodes); });
  }));
}

/* 모양 → 맞추기 → 위치·크기(접힘) */
function boxPanel(P){
  const multi = S.sel.length > 1;
  const pos = () => (multi ? unionBox(S.sel) : boxOf(first()));
  /* 테두리 굵기는 숫자 대신 네 단계로 */
  const bw = () => parseFloat(cs(first()).borderTopWidth) || 0;
  const setBw = v => S.sel.forEach(e => { e.style.borderWidth = v + 'px'; e.style.borderStyle = v ? (cs(e).borderTopStyle === 'none' ? 'solid' : cs(e).borderTopStyle) : ''; });
  const more = h('details', { class: 'fold sub-fold' });
  if (S.shapeOpen) more.open = true;
  more.addEventListener('toggle', () => { S.shapeOpen = more.open; });
  more.append(h('summary', null, h('span', { text: '모서리·여백·투명도' })),
    h('div', { class: 'g2' },
      numCtl('모서리', '', () => parseFloat(cs(first()).borderTopLeftRadius) || 0, v => styleEls('border-radius', v + 'px'), { min: 0, max: 999, title: '모서리 둥글기' }),
      numCtl('여백', '', () => parseFloat(cs(first()).paddingTop) || 0, v => styleEls('padding', v + 'px'), { min: 0, max: 400, title: '안쪽 여백' })),
    h('div', { class: 'g2' },
      numCtl('투명도', '%', () => rnd(100 - parseFloat(cs(first()).opacity) * 100), v => S.sel.forEach(e => e.style.opacity = v <= 0 ? '' : String(1 - v / 100)), { min: 0, max: 100 }), h('span')));
  P.appendChild(sec('모양',
    row('배경', colorCtl(() => cs(first()).backgroundColor, v => styleEls('background-color', v), { none: true })),
    row('테두리',
      colorCtl(() => bw() ? cs(first()).borderTopColor : 'transparent', v => S.sel.forEach(e => { e.style.borderColor = v; if (!parseFloat(cs(e).borderTopWidth)) { e.style.borderWidth = '4px'; e.style.borderStyle = 'solid'; } }), { bare: true }),
      segCtl([{ v: 0, text: '없음' }, { v: 2, text: '얇게' }, { v: 4, text: '보통' }, { v: 8, text: '굵게' }],
        () => { const w = bw(); return w === 0 ? 0 : w < 3 ? 2 : w < 6 ? 4 : 8; },
        v => change('slide', () => setBw(v)))),
    row('그림자', segCtl([{ v: 'none', text: '없음' }, { v: 's', text: '약하게' }, { v: 'm', text: '보통' }, { v: 'l', text: '강하게' }],
      () => { const b = first().style.boxShadow; return !b || b === 'none' ? 'none' : b.includes('60px') ? 'l' : b.includes('30px') ? 'm' : 's'; },
      v => change('slide', () => styleEls('box-shadow', { none: '', s: '0 4px 14px rgba(0,0,0,.10)', m: '0 12px 30px rgba(0,0,0,.14)', l: '0 24px 60px rgba(0,0,0,.22)' }[v])))),
    more));
  const ab = (icon, how, t) => { const b = h('button', { type: 'button', title: t, 'aria-label': t }, ic(icon)); b.onclick = () => alignSel(how); return b; };
  P.appendChild(sec(h('span', null, '맞추기', h('span', { class: 'sub', text: multi ? '고른 것끼리' : '슬라이드에 맞춰' })),
    h('div', { class: 'seg ico' }, ab('alignL', 'l', '왼쪽'), ab('alignC', 'c', '가로 가운데'), ab('alignR', 'r', '오른쪽'),
      ab('alignT', 't', '위'), ab('alignM', 'm', '세로 가운데'), ab('alignB', 'b', '아래'))));
  /* 위치·크기: 선생님이 숫자로 맞출 일은 드물어 접어 둔다 */
  const det = h('details', { class: 'sec fold' });
  if (S.geoOpen) det.open = true;
  det.addEventListener('toggle', () => { S.geoOpen = det.open; });
  const sum = h('summary', null, h('span', { text: '위치·크기' }), h('span', { class: 'sub' }));
  reg(() => { const b = pos(); sum.lastChild.textContent = `${Math.round(b.w / S.k)} × ${Math.round(b.h / S.k)}`; });
  det.append(sum,
    h('div', { class: 'g2' },
      numCtl('가로 위치', '', () => pos().x / S.k, v => { const d = v - pos().x / S.k; S.sel.forEach(e => moveBy(e, d, 0)); }, { title: '슬라이드 왼쪽에서 떨어진 거리' }),
      numCtl('세로 위치', '', () => pos().y / S.k, v => { const d = v - pos().y / S.k; S.sel.forEach(e => moveBy(e, 0, d)); }, { title: '슬라이드 위에서 떨어진 거리' })),
    multi ? null : h('div', { class: 'g2' },
      numCtl('너비', '', () => boxOf(first()).w / S.k, v => { const e = first(); if (cs(e).display === 'inline') e.style.display = 'inline-block'; setSize(e, 'width', Math.max(1, v)); if (e.tagName === 'IMG') e.style.height = 'auto'; }, { min: 1 }),
      numCtl('높이', '', () => boxOf(first()).h / S.k, v => { const e = first(); if (cs(e).display === 'inline') e.style.display = 'inline-block'; setSize(e, 'height', Math.max(1, v)); }, { min: 1 })),
    h('div', { class: 'g2' },
      numCtl('회전', '°', () => parseFloat(cs(first()).rotate) || 0, v => S.sel.forEach(e => e.style.rotate = v ? v + 'deg' : ''), { min: -360, max: 360 }), h('span')));
  P.appendChild(det);
}
/* 꾸미기 모드 맨 아래: 이 요소에 걸린 움직임 한눈에 */
function motionSummary(P){
  const body = h('div', { class: 'msum' });
  P.appendChild(sec('움직임', body));
  const els = S.sel.slice(), i = S.cur;
  motionsOf(i).then(m => {
    if (!body.isConnected || S.cur !== i) return;
    body.innerHTML = '';
    const lines = [];
    if (m && m !== 'stale') for (const it of m.items) if (it.targets.some(t => t.ed && els.some(e => e === t.ed || e.contains(t.ed)))) lines.push({ step: it.step, name: it.name, lock: true });
    els.forEach(e => { if (e.hasAttribute('data-se-anim')) lines.push({ step: e.getAttribute('data-se-start') === 'click' ? 'c' + (e.getAttribute('data-se-order') || 1) : 0, name: EFFECT_NAME[e.getAttribute('data-se-anim')], mine: true }); });
    if (!lines.length) { body.append(btn('움직임 더하기', addMotion, { icon: 'plus', cls: 'full' })); return; }
    /* 줄을 누르면 움직임 모드에서 이어 본다 */
    const go = () => { S.tab = 'anim'; renderPanel(); };
    for (const l of lines.slice(0, 6)) body.appendChild(h('button', { type: 'button', class: 'msl', onclick: go },
      h('span', { class: 'mstep-n', text: l.step === 'loop' ? '↻' : l.step === 0 ? '시작' : typeof l.step === 'string' ? '+' + l.step.slice(1) : String(l.step) }),
      h('span', { text: l.name }), l.lock ? h('span', { class: 'lock', title: '덱에 있던 움직임 · 볼 수만 있어요' }, ic('lock')) : h('span', { class: 'mb mine', text: '편집기' })));
  });
}

function widgetSection(P, el){
  const w = el.getAttribute('data-se-widget');
  if (el.tagName === 'IMG') {
    P.appendChild(sec('이미지',
      h('div', { class: 'g2' }, btn('그림 바꾸기', () => replaceImage(el), { icon: 'image' }),
        btn('원래 비율로', () => change('slide', () => { el.style.height = 'auto'; }), { icon: 'reset' })),
      row('채우기', segCtl([{ v: 'contain', text: '다 보이게' }, { v: 'cover', text: '꽉 채우기' }, { v: 'fill', text: '늘이기' }], () => cs(el).objectFit, v => change('slide', () => el.style.objectFit = v)))));
  }
  if (w === 'timer') {
    P.appendChild(sec('타이머',
      h('div', { class: 'g2' },
        numCtl('분', '', () => Math.floor((+el.getAttribute('data-se-sec') || 0) / 60), v => setTimer(el, v * 60 + (+el.getAttribute('data-se-sec') || 0) % 60), { min: 0, max: 180 }),
        numCtl('초', '', () => (+el.getAttribute('data-se-sec') || 0) % 60, v => setTimer(el, Math.floor((+el.getAttribute('data-se-sec') || 0) / 60) * 60 + v), { min: 0, max: 59 })),
      h('div', { class: 'hint', text: '발표 때 누르면 시작·멈춤, 두 번 누르면 처음으로.' })));
  }
  if (w === 'reveal') {
    const inp = h('input', { class: 'f', type: 'text', value: el.getAttribute('data-se-hint') || '', spellcheck: 'false' });
    inp.addEventListener('keydown', e => e.stopPropagation());
    inp.addEventListener('change', () => change('slide', () => el.setAttribute('data-se-hint', inp.value)));
    P.appendChild(sec('정답 가리개', row('안내 글', inp), h('div', { class: 'hint', text: '발표 때는 가려져 있다가 누르면 보여요.' })));
  }
  const a = el.closest('a') || (el.tagName === 'A' ? el : null);
  if (a || el.tagName === 'IFRAME') {
    const attr = a ? 'href' : 'src', node = a || el;
    const inp = h('input', { class: 'f', type: 'text', value: node.getAttribute(attr) || '', spellcheck: 'false' });
    inp.addEventListener('keydown', e => e.stopPropagation());
    inp.addEventListener('change', () => change('slide', () => node.setAttribute(attr, inp.value.trim())));
    P.appendChild(sec(a ? '링크' : '웹·영상 주소', row('주소', inp)));
  }
}
function setTimer(el, s){
  s = Math.max(1, Math.round(s));
  el.setAttribute('data-se-sec', String(s));
  el.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

/* ---------- 움직임 재생: 몰래 띄운 덱을 슬라이드 자리에 꺼내 그 구간만 실제로 돌린다 ---------- */
const PL = { on: false, raf: 0, hide: 0, tw: null, again: null, auto: 0 };
function pvMainTl(w){
  const g = w.gsap; if (!g) return null;
  let best = null, sc = -1;
  for (const t of g.globalTimeline.getChildren(false, false, true)) {
    const s = t.getChildren(true, true, false).filter(c => c.data === 'isPause').length * 1e4 + t.duration();
    if (s > sc) { sc = s; best = t; }
  }
  return best;
}
/* 편집 화면의 슬라이드 자리에 맞춰 덱 창을 겹친다(슬라이드 밖은 잘라 낸다) */
function pvPlace(){
  if (!PL.on || !PV.f) return;
  const f = PV.f, w = f.contentWindow, paper = $('se-paper').getBoundingClientRect();
  const s = findSlides(w.document)[S.cur];
  if (s) {
    const r = s.getBoundingClientRect(), k = paper.width / (r.width || 1);
    const vw = f.clientWidth, vh = f.clientHeight;
    Object.assign(f.style, { left: paper.left - r.left * k + 'px', top: paper.top - r.top * k + 'px', transform: `scale(${k})`, transformOrigin: '0 0',
      clipPath: `inset(${r.top}px ${vw - r.right}px ${vh - r.bottom}px ${r.left}px)` });
  }
  PL.raf = requestAnimationFrame(pvPlace);
}
function pvShow(label, again){
  PL.on = true; PL.again = again; clearTimeout(PL.hide);
  Object.assign(PV.f.style, { opacity: '1', zIndex: '45', pointerEvents: 'none', boxShadow: '0 0 0 3px #f59e0b' });
  cancelAnimationFrame(PL.raf); pvPlace();
  let bar = $('se-play');
  if (!bar) {
    bar = h('div', { id: 'se-play' }, ic('play'), h('span', { class: 'pl-t' }),
      h('button', { type: 'button', class: 'linkb', text: '다시', onclick: () => PL.again && PL.again() }),
      h('button', { type: 'button', class: 'ib', title: '재생 화면 닫기 (Esc)', onclick: pvHide }, ic('x')));
    $('se-mid').appendChild(bar);
  }
  bar.querySelector('.pl-t').textContent = label;
  bar.classList.remove('hide');
  $('se-note').classList.add('hide');
}
function pvHide(){
  PL.on = false; clearTimeout(PL.hide); cancelAnimationFrame(PL.raf);
  if (PL.tw) { try { PL.tw.kill(); } catch (e) {} PL.tw = null; }
  if (PV.f) Object.assign(PV.f.style, { opacity: '0', zIndex: '-1', left: '0px', top: '0px', transform: '', clipPath: '', boxShadow: '' });
  const bar = $('se-play'); if (bar) bar.classList.add('hide');
  note();
}
/* 타임라인 [from, to] 구간을 재생한다. 끝나면 1.5초 뒤 닫는다 */
async function playRange(from, to, label, cont){
  const ver = PV.ver;
  if (!(await pvLoad()) || ver !== PV.ver) return toast('덱을 아직 띄우지 못했어요. 잠시 뒤 다시 눌러 주세요.');
  const w = PV.f.contentWindow, again = () => playRange(from, to, label);
  if (PL.tw) { try { PL.tw.kill(); } catch (e) {} PL.tw = null; }
  /* 이어서 재생할 때(처음부터 보기)는 장을 새로 열지 않는다 */
  let here = null; try { here = w.__seDeck.state(); } catch (e) {}
  if (!cont || !here || here.i !== S.cur) { try { w.__seDeck.go(S.cur, 0); } catch (e) { return toast('이 덱은 움직임을 재생할 수 없어요.'); } }
  const tl = pvMainTl(w);
  pvShow(label, again);
  if (!tl || to == null) { PL.hide = setTimeout(pvHide, 3000); return; }
  tl.pause(); tl.seek(Math.max(0, from), false);
  PL.tw = tl.tweenFromTo(Math.max(0, from), Math.max(from + 0.05, to), {
    onComplete: () => { PL.tw = null; clearTimeout(PL.hide); PL.hide = setTimeout(pvHide, 1500); }
  });
}
function stepRange(m, s){
  const p = m.pauses || [], end = m.dur || 0;
  if (s === 0) return [0, p.length ? p[0] : end];
  return [p[s - 1] + 0.001, (p[s] != null ? p[s] - 0.001 : end)];
}
function playStep(m, s){
  if (s === 'loop') { playRange(0, null, '계속 반복되는 움직임'); return; }
  const [a, b] = stepRange(m, s);
  playRange(a, b, s === 0 ? '열리자마자 나오는 움직임' : `클릭 ${s}의 움직임`);
}
function playItem(m, it){
  if (it.loop || !it.inMain) { playRange(0, null, it.name); return; }
  /* 그 움직임이 시작하는 자리부터 끝날 때까지(같이 시작하는 움직임도 함께 움직인다) */
  playRange(it.tAbs, it.tAbs + it.d + 0.05, it.name);
}
/* 이 장 전체: 단계마다 잠깐 쉬며 처음부터 끝까지 */
async function playAll(m){
  const steps = (m.pauses || []).length;
  for (let s = 0; s <= steps; s++) {
    if (s > 0 && !PL.on) return;
    const [a, b] = stepRange(m, s);
    await playRange(a, b, `처음부터 · ${s === 0 ? '열리자마자' : '클릭 ' + s}`, s > 0);
    await sleep(Math.max(0, (b - a) * 1000) + 700);
    clearTimeout(PL.hide);
  }
  PL.hide = setTimeout(pvHide, 1500);
}

/* ---------- 움직임 모드: 이 장의 클릭 순서 ---------- */
const STATUS = { hidden: ['처음엔 숨김', '편집 화면에서는 처음 상태라 안 보여요'], script: ['발표 때 생기는 그림', '발표할 때 덱이 그려 넣는 요소예요'] };
function motionPanel(P){
  const box = h('div', { class: 'mtl' }, h('div', { class: 'hint', style: 'padding:18px 16px', text: '움직임을 읽는 중…' }));
  P.appendChild(box);
  fillMotion(box);
}
/* 고치는 중인 칸에서 손을 떼기 전에는 다시 그리지 않는다 */
const renderMotionSoon = debounce(() => {
  const b = document.querySelector('.mtl'), ae = document.activeElement;
  if (!b || S.tab !== 'anim' || (ae && b.contains(ae) && /^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName))) return;
  fillMotion(b);
}, 900);
function addMotion(){
  if (!S.sel.length) return toast('움직일 요소를 먼저 고르세요.');
  if (!S.sel.every(e => e.hasAttribute('data-se-anim'))) setAnim('fade');
  S.openAnim = first(); S.tab = 'anim'; renderPanel();
}
/* 덱 움직임이 고른 요소(또는 그 안)를 움직이는가 */
const hitsSel = (it, els) => it.targets.some(t => t.ed && els.some(e => e === t.ed || e.contains(t.ed)));
async function fillMotion(box){
  const i = S.cur;
  const page = S.mode !== 'slides', bs = page || S.hasEngine ? [] : buildEls();
  const m = page || bs.length ? false : await motionsOf(i);
  if (S.cur !== i || !box.isConnected) return;
  if (m === 'stale') { renderMotionSoon(); return; }
  box.innerHTML = '';
  const mine = animList(), n = bs.length || (m ? m.n : 0), nDeck = bs.length || (m ? m.items.length : 0);
  /* 머리: 이 장 요약 */
  const line1 = [n ? `클릭 ${n}번` : '', nDeck + mine.length ? `움직임 ${nDeck + mine.length}개` : ''].filter(Boolean).join(' · ');
  box.appendChild(h('div', { class: 'mhead' },
    h('div', null, h('div', { class: 'mh-t', text: page ? '이 문서의 움직임' : '이 장의 움직임' }),
      line1 ? h('div', { class: 'mh-s' }, h('div', { text: line1 })) : null),
    m && m.items.length ? btn('처음부터', () => playAll(m), { icon: 'play', cls: 'sm pri', title: '이 장의 움직임을 처음부터 끝까지 재생' })
      : bs.length ? btn('처음부터', () => playBuilds(bs), { icon: 'play', cls: 'sm pri', title: '이 장의 움직임을 처음부터 끝까지 재생' })
      : mine.length ? btn('처음부터', playSlide, { icon: 'play', cls: 'sm pri', title: '이 장의 움직임을 처음부터 끝까지 재생' }) : null));
  /* 고른 요소: 움직임 더하기는 여기서 */
  if (S.sel.length) {
    const has = S.sel.every(e => e.hasAttribute('data-se-anim'));
    const deckOn = m && m.items.some(it => hitsSel(it, S.sel));
    box.appendChild(h('div', { class: 'msel' },
      h('div', { class: 'msel-t' }, h('span', { class: 'pc-kind', text: '고른 요소' }), h('span', { text: S.sel.length > 1 ? `${S.sel.length}개` : nameOf(first()) }),
        deckOn && !has ? h('span', { class: 'msel-w', text: '덱 움직임이 있어 겹칠 수 있어요' }) : null),
      has ? null : btn('움직임 더하기', addMotion, { icon: 'plus', cls: 'pri' })));
  } else if (nDeck + mine.length) box.appendChild(h('div', { class: 'mtip', text: '요소를 고르면 움직임을 더할 수 있어요.' }));
  if (m === null) box.appendChild(h('div', { class: 'warn', style: 'margin:0 14px 10px', text: '이 덱의 움직임은 읽지 못했어요. 편집기로 넣은 움직임만 보여요.' }));
  if (m) {
    const nHidden = m.items.filter(x => x.targets.some(t => t.status !== 'ok')).length;
    if (nHidden && !S.present) box.appendChild(h('div', { class: 'mnote' }, h('span', { text: `편집 화면에서 안 보이는 요소의 움직임이 ${nHidden}개 있어요.` }),
      h('button', { type: 'button', class: 'linkb', text: '숨은 요소 보기', onclick: () => { setPresent(true); fillMotion(box); } })));
  }
  /* 단계마다 묶기: 덱 움직임 → 편집기 움직임은 덱 단계가 끝난 뒤 */
  const groups = new Map();
  const G = (key, order, title, lb, step) => { if (!groups.has(key)) groups.set(key, { key, order, title, lb, step, deck: [], mine: [], build: [] }); return groups.get(key); };
  /* 단계 이름표는 덱 작성자가 한글로 붙인 것만(영문 장면 이름은 감춘다) */
  const lbOf = s => { const l = (m && m.labels[s - 1]) || ''; return /[가-힣]/.test(l) ? l : ''; };
  if (m) for (const it of m.items) {
    const s = it.step;
    (s === 'loop' ? G('loop', 1e6, '계속 반복', '', null) : G('s' + s, s, s === 0 ? '열리자마자' : `클릭 ${s}`, s > 0 ? lbOf(s) : '', s)).deck.push(it);
  }
  bs.forEach((b, x) => G('s' + (x + 1), x + 1, `클릭 ${x + 1}`, '', null).build.push(b));
  for (const e of mine) {
    if (e.getAttribute('data-se-start') === 'view') G('view', 5e5, '보일 때', '', null).mine.push(e);
    else if (e.getAttribute('data-se-start') === 'click') { const st = n + (+e.getAttribute('data-se-order') || 1); G('s' + st, st, `클릭 ${st}`, '', null).mine.push(e); }
    else G('s0', 0, '열리자마자', '', 0).mine.push(e);
  }
  const list = [...groups.values()].sort((a, b) => a.order - b.order);
  if (!list.length) box.appendChild(h('div', { class: 'mempty' }, h('b', { text: page ? '이 문서에는 움직임이 없어요' : '이 장에는 움직임이 없어요' }),
    S.sel.length ? null : h('span', { text: '요소를 고르면 움직임을 더할 수 있어요.' })));
  /* 접기: 움직임이 적으면 다 펼치고, 많으면 고른 요소가 든 단계만. 직접 여닫은 단계는 그대로 둔다 */
  if (S.mFoldSlide !== i) { S.mFold = new Map(); S.mFoldSlide = i; }
  const total = nDeck + mine.length;
  const autoOpen = g => total <= 6 || g.deck.some(it => hitsSel(it, S.sel)) || g.mine.some(e => S.sel.includes(e)) || g.build.some(b => S.sel.includes(b.el));
  for (const g of list) {
    const open = S.mFold.has(g.key) ? S.mFold.get(g.key) : autoOpen(g);
    const cnt = g.deck.length + g.mine.length + g.build.length;
    /* 단계 재생: 덱 움직임은 몰래 띄운 덱으로, 편집기 움직임만 있는 단계는 편집 화면에서 */
    const play = g.deck.length ? () => playStep(m, g.order === 1e6 ? 'loop' : g.step) : () => { g.build.forEach(playBuild); g.mine.forEach(e => playOne(e)); };
    const head = h('div', { class: 'mg-h', role: 'button', tabindex: '0', 'aria-expanded': String(open) },
      h('span', { class: 'chev' }, ic(open ? 'chevd' : 'chev')),
      h('span', { class: 'mstep-n' + (g.order === 1e6 ? ' loop' : g.order === 0 ? ' start' : ''), text: g.order === 1e6 ? '↻' : g.order === 0 ? '시작' : g.order === 5e5 ? '↓' : String(g.order) }),
      h('span', { class: 'mg-t' }, h('b', { text: g.title }), h('span', { text: [g.lb, open ? '' : `움직임 ${cnt}개`].filter(Boolean).join(' · ') })),
      h('button', { type: 'button', class: 'playb', title: '이 단계 재생', onclick: ev => { ev.stopPropagation(); play(); } }, ic('play'), h('span', { text: '재생' })));
    const toggle = () => { S.mFold.set(g.key, !open); fillMotion(box); };
    head.onclick = toggle;
    head.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggle(); } };
    head.onmouseenter = () => { S.mhl = [...g.deck.flatMap(it => it.targets.map(t => t.status === 'ok' && t.ed ? { ...boxOf(t.ed) } : { ...t.box, script: true })), ...g.mine.map(e => boxOf(e)), ...g.build.map(b => boxOf(b.el))]; drawOv(); };
    head.onmouseleave = () => { S.mhl = null; drawOv(); };
    const grp = h('div', { class: 'mgrp' + (open ? ' open' : '') }, head);
    if (open) {
      g.build.forEach(b => grp.appendChild(buildRow(b)));
      g.deck.forEach(it => { grp.appendChild(motionRow(it, m)); if (it.canEdit && !it.loop && S.openMo === moKey(it)) grp.appendChild(deckEditor(it, m)); });
      g.mine.forEach(e => { grp.appendChild(mineRow(e)); if (S.openAnim === e && S.sel.includes(e)) grp.appendChild(animEditor(e, m && m.items.some(it => hitsSel(it, [e])))); });
    }
    box.appendChild(grp);
  }
  /* 늦게 그린 칸들의 값 채우기 */
  syncPanel();
}
function motionRow(it, m){
  const eds = [...new Set(it.targets.map(t => t.ed).filter(Boolean))];
  const st = it.targets.find(t => t.status !== 'ok');
  const uniq = [];
  it.targets.forEach(t => { if (t.ed && t.status !== 'script' && uniq.some(u => u.ed === t.ed && u.status === t.status)) return; uniq.push(t); });
  const split = it.targets.some(t => t.split), t0 = uniq[0];
  const tgt = it.obj ? '그림 속 장식(해·별의 위치 등)' : t0 ? (t0.status === 'script' ? (t0.ed ? `${kindOf(t0.ed)} 안에 그려지는 것` : '슬라이드에 그려지는 것') : nameOf(t0.ed, 16)) + (split ? ' · 한 글자씩' : '') + (uniq.length > 1 ? ` 외 ${uniq.length - 1}개` : '') : '';
  const key = moKey(it), can = it.canEdit && !it.loop, open = can && S.openMo === key, mod = it.edits.some(e => Object.keys(moGet(e)).length);
  const r = h('div', { class: 'mrow' + (eds.some(e => S.sel.includes(e)) ? ' on' : '') + (st ? ' miss' : '') + (open ? ' open' : '') },
    ic(it.icon || 'spark'),
    h('div', { class: 'mt' },
      h('div', { class: 'mn' }, h('span', { text: (it.loop ? '계속 ' : '') + it.name }), mod ? h('i', { class: 'mb mine', text: '고침' }) : null, can ? null : h('span', { class: 'lock', title: '이 움직임은 바꿀 수 없어요' }, ic('lock'))),
      h('div', { class: 'mg' }, st ? h('i', { class: 'mb ' + st.status, title: STATUS[st.status][1], text: STATUS[st.status][0] }) : null, tgt),
      h('div', { class: 'mtime', text: (it.t ? `${rnd(it.t, 1)}초 뒤 · ` : '') + `${rnd(it.d, 1)}초 동안` })),
    h('button', { type: 'button', class: 'ib rowplay', title: '이 움직임 재생', onclick: ev => { ev.stopPropagation(); playItem(m, it); } }, ic('play')),
    can ? h('span', { class: 'chev' }, ic(open ? 'chevd' : 'chev')) : null);
  r.onmouseenter = () => { S.mhl = it.targets.map(t => t.status === 'ok' && t.ed ? { ...boxOf(t.ed) } : { ...t.box, script: true }); drawOv(); };
  r.onmouseleave = () => { S.mhl = null; drawOv(); };
  r.onclick = () => {
    if (can) S.openMo = open ? null : key;
    if (eds.length) select(eds); else renderPanel();
  };
  return r;
}
/* ---------- 덱 움직임 고치기 ----------
   덱 스크립트는 건드리지 않는다. 고친 값을 그 요소의 data-se-mo에 '이 요소의 k번째 호출' 단위로 적어 두면,
   저장할 때 GSAP 바로 뒤에 넣는 작은 스크립트(MO_JS)가 그 호출을 바꿔서 실행한다. */
const MO_JS = `(function(){var g=window.gsap;if(!g||!g.core||!g.core.Timeline)return;
var P=g.core.Timeline.prototype,seen=new WeakMap(),
FX={fade:{},up:{y:60},down:{y:-60},left:{x:-100},right:{x:100},zoom:{scale:.6},pop:{scale:.3}},
VIS=['opacity','autoAlpha','x','y','xPercent','yPercent','scale','scaleX','scaleY','rotation','rotate','skewX','skewY'];
function strip(v,add){var o={},k;for(k in v)if(VIS.indexOf(k)<0)o[k]=v[k];for(k in add)o[k]=add[k];return o}
function stretch(tl,tag,dur){var c=tl.getChildren(true,true,true).filter(function(x){return x.vars&&x.vars.data===tag})[0];if(!c)return;
while(c.parent&&c.parent!==tl)c=c.parent;c.timeScale(c.totalDuration()/Math.max(dur,.001))}
['to','from','fromTo'].forEach(function(m){var o=P[m];P[m]=function(t,a,b,c){
var el=this.vars&&this.vars.paused?g.utils.toArray(t)[0]:null;
if(!el||el.nodeType!==1)return o.apply(this,arguments);
var s=seen.get(this);if(!s)seen.set(this,s=new Map());
var k=s.get(el)||0;s.set(el,k+1);
var p=null;try{p=JSON.parse(el.getAttribute('data-se-mo')||'{}')[k]}catch(e){}
var two=m==='fromTo',to=Object.assign({},two?b:a),fr=two?a:null,tag={se:[el,k,m]};
if(to.data===undefined)to.data=tag;
if(p&&p.ease)to.ease=p.ease;
if(p&&p.fx&&FX[p.fx]&&m!=='to'){var f=Object.assign({autoAlpha:0},FX[p.fx]);
if(p.fx==='pop'&&!p.ease)to.ease='back.out(2.5)';
if(two){fr=strip(fr,f);to=strip(to,{autoAlpha:1,x:0,y:0,scale:1,rotation:0})}else to=strip(to,f)}
var r=two?o.call(this,t,fr,to,c):o.call(this,t,to,b);
if(p&&p.dur!=null)stretch(this,tag,p.dur);
return r}})})();`;
const moIds = new WeakMap();
let moSeq = 0;
function moKey(it){
  const e = it.edits[0];
  if (!e) return `t${it.step}:${rnd(it.t, 2)}:${it.name}`;
  if (!moIds.has(e.ed)) moIds.set(e.ed, ++moSeq);
  return `e${moIds.get(e.ed)}:${e.k}`;
}
function moAll(el){ try { return JSON.parse(el.getAttribute('data-se-mo') || '{}'); } catch (e) { return {}; } }
const moGet = e => moAll(e.ed)[e.k] || {};
function moWrite(edits, fn){
  edits.forEach(e => {
    const all = moAll(e.ed), p = all[e.k] || {};
    fn(p);
    Object.keys(p).forEach(x => { if (p[x] === '' || p[x] == null) delete p[x]; });
    if (Object.keys(p).length) all[e.k] = p; else delete all[e.k];
    if (Object.keys(all).length) e.ed.setAttribute('data-se-mo', JSON.stringify(all)); else e.ed.removeAttribute('data-se-mo');
  });
}
const MO_FX = ['fade', 'up', 'down', 'left', 'right', 'zoom', 'pop'];
const MO_EASE = [['', '원래 느낌'], ['power2.out', '부드럽게'], ['back.out(1.8)', '튕기듯'], ['bounce.out', '통통'], ['none', '일정하게']];
function deckEditor(it, m){
  const ed = it.edits, p = moGet(ed[0]);
  const set = fn => { change('slide', () => moWrite(ed, fn)); previewMo(it); };
  const pick = (title, opts, val, fn) => {
    const s = h('select', { class: 'f', title }, opts.map(([v, text]) => h('option', { value: v, text })));
    s.value = val; s.addEventListener('change', () => { fn(s.value); s.blur(); });
    return s;
  };
  /* 다음 클릭 자리를 넘기면 그 클릭까지 멈춰 버리므로 그 앞까지만 늘린다 */
  const next = (m.pauses || []).find(x => x > it.tAbs + 0.001);
  const max = next != null ? Math.max(0.1, rnd(next - it.tAbs, 1)) : 10;
  return h('div', { class: 'medit' },
    it.appear && ed.every(e => e.how !== 'to') ? row('효과', pick('움직임 효과', [['', '원래 효과'], ...MO_FX.map(k => [k, EFFECT_NAME[k]])], p.fx || '', v => set(x => { x.fx = v; }))) : null,
    row('느낌', pick('움직임 느낌', MO_EASE, p.ease || '', v => set(x => { x.ease = v; }))),
    row('길이', numCtl('', '초', () => p.dur != null ? p.dur : rnd(it.d, 1), v => { p.dur = v; moWrite(ed, x => { x.dur = v; }); previewMo(it, 250); }, { step: 0.1, dec: 1, min: 0, max })),
    Object.keys(p).length ? btn('원래대로', () => set(x => { Object.keys(x).forEach(k => delete x[k]); }), { icon: 'reset', cls: 'full' }) : null);
}
/* 고치면 그 움직임을 바로 재생한다. 숫자는 값이 멈출 때까지 잠깐 기다린다 */
function previewMo(it, wait = 0){
  const key = moKey(it), i = S.cur;
  pvHide(); clearTimeout(PL.auto);
  PL.auto = setTimeout(async () => {
    const m = await motionsOf(i);
    if (!m || m === 'stale' || S.cur !== i) return;
    const now = m.items.find(x => moKey(x) === key);
    if (now) playItem(m, now);
  }, wait);
}
/* 스크립트 없이 클래스로 나타나는 요소: 파일 순서대로 한 클릭씩으로 본다 */
function buildEls(){
  const list = S.builds || [];
  if (!list.length) return [];
  return [...S.box.querySelectorAll(list.map(x => x.sel).join(','))].filter(e => !e.closest('[data-se-ghost]')).map(el => ({ el, rule: list.find(x => el.matches(x.sel)).rule }));
}
function buildInfo(rule){
  const t = rule.style.transform || '', num = re => { const x = t.match(re); return x ? parseFloat(x[1]) : 0; };
  const y = num(/translateY\((-?[\d.]+)/), x = num(/translateX\((-?[\d.]+)/);
  const name = y > 0 ? '위로 떠오르며 나타나기' : y < 0 ? '아래로 내려오며 나타나기' : x > 0 ? '왼쪽으로 들어오며 나타나기' : x < 0 ? '오른쪽으로 들어오며 나타나기' : /scale/.test(t) ? '커지며 나타나기' : '나타나기';
  return { name, dur: parseFloat(rule.style.transitionDuration) || 0.4 };
}
function playBuild(b){
  const s = b.rule.style;
  b.el.animate([{ opacity: 0, transform: s.transform || 'none', filter: s.filter || 'none' }, { opacity: 1, transform: 'none', filter: 'none' }], { duration: buildInfo(b.rule).dur * 1000, easing: 'ease' });
}
async function playBuilds(list){
  list.forEach(b => { b.el.style.visibility = 'hidden'; });
  for (const b of list) { b.el.style.visibility = ''; playBuild(b); await sleep(buildInfo(b.rule).dur * 1000 + 350); }
  list.forEach(b => { if (!b.el.getAttribute('style')) b.el.removeAttribute('style'); });
}
function buildRow(b){
  const inf = buildInfo(b.rule), e = b.el;
  const r = h('div', { class: 'mrow' + (S.sel.includes(e) ? ' on' : '') },
    ic('spark'),
    h('div', { class: 'mt' },
      h('div', { class: 'mn' }, h('span', { text: inf.name }), h('span', { class: 'lock', title: '이 움직임은 바꿀 수 없어요' }, ic('lock'))),
      h('div', { class: 'mg', text: nameOf(e, 16) }),
      h('div', { class: 'mtime', text: `${rnd(inf.dur, 2)}초 동안` })),
    h('button', { type: 'button', class: 'ib rowplay', title: '이 움직임 재생', onclick: ev => { ev.stopPropagation(); playBuild(b); } }, ic('play')));
  r.onmouseenter = () => { S.mhl = [boxOf(e)]; drawOv(); };
  r.onmouseleave = () => { S.mhl = null; drawOv(); };
  r.onclick = () => select([e]);
  return r;
}
function mineRow(e){
  const start = e.getAttribute('data-se-start'), click = start === 'click', open = S.openAnim === e && S.sel.includes(e);
  const r = h('div', { class: 'mrow mine' + (S.sel.includes(e) ? ' on' : '') + (open ? ' open' : '') },
    ic('spark'),
    h('div', { class: 'mt' },
      h('div', { class: 'mn' }, h('span', { text: EFFECT_NAME[e.getAttribute('data-se-anim')] || '' }), h('i', { class: 'mb mine', text: '편집기' })),
      h('div', { class: 'mg', text: nameOf(e, 16) }),
      h('div', { class: 'mtime', text: (click ? '클릭하면' : start === 'view' ? '보이면' : '열리면') + ((+e.getAttribute('data-se-delay') || 0) ? ` ${e.getAttribute('data-se-delay')}초 뒤` : '') + ` · ${e.getAttribute('data-se-dur') || 0.6}초 동안` })),
    h('button', { type: 'button', class: 'ib rowplay', title: '이 움직임 재생', onclick: ev => { ev.stopPropagation(); playOne(e); } }, ic('play')),
    h('span', { class: 'chev' }, ic(open ? 'chevd' : 'chev')));
  r.onmouseenter = () => { S.mhl = [boxOf(e)]; drawOv(); };
  r.onmouseleave = () => { S.mhl = null; drawOv(); };
  r.onclick = () => { S.openAnim = open ? null : e; select([e]); };
  return r;
}
/* 편집기로 넣은 움직임을 그 줄 아래에서 고친다 */
function animEditor(e, deckOn){
  const efs = h('select', { class: 'f', title: '움직임 효과' }, EFFECTS.filter(x => x[0] !== 'none').map(([k, name]) => h('option', { value: k, text: name })));
  efs.value = e.getAttribute('data-se-anim');
  efs.addEventListener('change', () => setAnim(efs.value));
  const click = e.getAttribute('data-se-start') === 'click';
  return h('div', { class: 'medit' },
    row('효과', efs),
    row('언제', segCtl([{ v: 'enter', text: '열릴 때' }, S.mode === 'page' ? { v: 'view', text: '보일 때' } : { v: 'click', text: '클릭할 때' }], () => { const v = e.getAttribute('data-se-start'); return v === 'click' || v === 'view' ? v : 'enter'; },
      v => change('slide', () => S.sel.forEach(x => { x.setAttribute('data-se-start', v); if (v === 'click' && !x.getAttribute('data-se-order')) x.setAttribute('data-se-order', String(nextOrder())); })))),
    click ? row('순서', numCtl('', '번째', () => +e.getAttribute('data-se-order') || 1, v => S.sel.forEach(x => x.setAttribute('data-se-order', String(Math.max(1, Math.round(v))))), { min: 1, max: 99, title: '같은 순서끼리는 한 번의 클릭에 같이 나와요' })) : null,
    h('div', { class: 'g2' },
      numCtl('기다림', '초', () => +e.getAttribute('data-se-delay') || 0, v => S.sel.forEach(x => v ? x.setAttribute('data-se-delay', String(v)) : x.removeAttribute('data-se-delay')), { step: 0.1, dec: 1, min: 0, max: 20, title: '시작하기 전에 기다리는 시간' }),
      numCtl('길이', '초', () => +(e.getAttribute('data-se-dur') || 0.6), v => { S.sel.forEach(x => x.setAttribute('data-se-dur', String(v))); playSelSoon(); }, { step: 0.1, dec: 1, min: 0.1, max: 10 })),
    h('div', { class: 'g2' }, btn('미리 보기', () => S.sel.forEach(x => playOne(x)), { icon: 'play' }), btn('움직임 빼기', () => { S.openAnim = null; setAnim('none'); }, { icon: 'trash', cls: 'bad' })),
    deckOn ? h('div', { class: 'hint', text: '덱 움직임과 겹칠 수 있어요. 재생해서 확인해 보세요.' }) : null);
}

function animList(){
  const els = [...S.box.querySelectorAll('[data-se-anim]')];
  const en = els.filter(e => e.getAttribute('data-se-start') !== 'click').sort((a, b) => (+a.getAttribute('data-se-delay') || 0) - (+b.getAttribute('data-se-delay') || 0));
  const cl = els.filter(e => e.getAttribute('data-se-start') === 'click').sort((a, b) => (+a.getAttribute('data-se-order') || 1) - (+b.getAttribute('data-se-order') || 1));
  return [...en, ...cl];
}
function nextOrder(){ return Math.max(0, ...[...S.box.querySelectorAll('[data-se-start="click"]')].filter(e => !S.sel.includes(e)).map(e => +e.getAttribute('data-se-order') || 1)) + 1; }
function setAnim(k){
  change('slide', () => S.sel.forEach(e => {
    if (k === 'none') { ['data-se-anim', 'data-se-start', 'data-se-order', 'data-se-delay', 'data-se-dur'].forEach(a => e.removeAttribute(a)); return; }
    const had = e.hasAttribute('data-se-anim');
    e.setAttribute('data-se-anim', k);
    if (!had && S.mode === 'page') e.setAttribute('data-se-start', 'view');
    else if (!had) { e.setAttribute('data-se-start', 'click'); e.setAttribute('data-se-order', String(nextOrder())); }
  }));
  if (k !== 'none') setTimeout(() => S.sel.forEach(e => playOne(e)), 30);
}
function playOne(el){ if (S.ewin.__seAnimate) S.ewin.__seAnimate(el, { noDelay: true }); }
const playSelSoon = debounce(() => S.sel.forEach(e => playOne(e)), 250);
function playSlide(){
  const list = animList(); if (!list.length || !S.ewin.__seAnimate) return;
  const en = list.filter(e => e.getAttribute('data-se-start') !== 'click');
  const groups = [];
  list.filter(e => e.getAttribute('data-se-start') === 'click').forEach(e => { const k = +e.getAttribute('data-se-order') || 1; let g = groups.find(x => x.k === k); if (!g) groups.push(g = { k, els: [] }); g.els.push(e); });
  const all = list;
  all.forEach(e => e.style.visibility = 'hidden');
  let t = 0;
  en.forEach(e => { e.style.visibility = ''; S.ewin.__seAnimate(e); t = Math.max(t, ((+e.getAttribute('data-se-delay') || 0) + (+(e.getAttribute('data-se-dur') || 0.6))) * 1000); });
  t += 500;
  groups.forEach(g => {
    setTimeout(() => g.els.forEach(e => { e.style.visibility = ''; S.ewin.__seAnimate(e); }), t);
    t += Math.max(...g.els.map(e => ((+e.getAttribute('data-se-delay') || 0) + (+(e.getAttribute('data-se-dur') || 0.6))) * 1000)) + 700;
  });
  setTimeout(() => all.forEach(e => { if (e.style.visibility === 'hidden') e.style.visibility = ''; }), t + 100);
}

/* 이 장의 요소: 겹쳐 있거나 숨어 있어 누르기 어려운 요소를 여기서 고른다 */
function treePanel(){
  const wrap = h('div', { class: 'tree' });
  const selSet = new Set(S.sel);
  const open = new Set();
  S.sel.forEach(el => { for (let n = el.parentElement; n && n !== S.box; n = n.parentElement) open.add(n); });
  let count = 0;
  const kids = n => kidsOf(n).filter(c => !/^(SCRIPT|STYLE|BR|TEMPLATE|LINK|META)$/.test(c.tagName) && !(c instanceof S.ewin.SVGElement && c.tagName !== 'svg'));
  const node = (el, depth) => {
    if (count++ > 500) return;
    const ch = kids(el), isOpen = open.has(el) || el._seOpen;
    const c = cs(el), ghost = c.display === 'none' || c.visibility === 'hidden' || parseFloat(c.opacity) === 0;
    const tw = h('span', { class: 'tw' }, ch.length ? ic(isOpen ? 'chevd' : 'chev') : null);
    const lk = el.hasAttribute('data-se-lock');
    const lockB = h('button', { type: 'button', class: 'tlk' + (lk ? ' on' : ''), title: lk ? '잠금 풀기' : '잠그기', onclick: e => { e.stopPropagation(); change('slide', () => { lk ? el.removeAttribute('data-se-lock') : el.setAttribute('data-se-lock', ''); S.sel = S.sel.filter(x => x !== el); }); } }, ic('lock'));
    const r = h('div', { class: 'tn' + (selSet.has(el) ? ' on' : ''), style: `padding-left:${8 + depth * 16}px`, title: (el.getAttribute('class') || '').trim() || null },
      tw, h('span', { class: 'tk', text: kindOf(el) }), h('span', { class: 'tnl', text: snippet(el, 30) }),
      ghost ? h('i', { class: 'mb hidden', text: '숨김' }) : null, grpOf(el) ? h('i', { class: 'mb mine', text: '묶임' }) : null, el.hasAttribute('data-se-anim') ? h('i', { class: 'mb mine', text: '움직임' }) : null, lockB);
    tw.onclick = e => { e.stopPropagation(); el._seOpen = !isOpen; if (!el._seOpen) open.delete(el); renderPanel(); };
    r.onclick = e => select([el], e.shiftKey || e.ctrlKey || e.metaKey);
    r.onmouseenter = () => { S.hover = el; drawOv(); };
    r.onmouseleave = () => { S.hover = null; drawOv(); };
    wrap.appendChild(r);
    if (isOpen) ch.forEach(k => node(k, depth + 1));
  };
  if (S.box) kids(S.box).forEach(k => node(k, 0));
  return sec(S.mode === 'page' ? '이 문서의 요소' : '이 장의 요소', wrap);
}

/* ---------- 찾아 바꾸기: 슬라이드의 글자. '모두 바꾸기'는 장 제목(data-title·data-sec)도 같이 바꾼다 ---------- */
function findHits(q, attrs){
  const out = []; if (!q) return out;
  (S.mode === 'slides' ? S.slides : [S.edoc.body]).forEach((s, i) => {
    const add = (get, set, el) => { const t = get(); for (let p = t.indexOf(q); p >= 0; p = t.indexOf(q, p + q.length)) out.push({ i, p, get, set, el }); };
    if (attrs) ['data-title', 'data-sec'].forEach(a => { if (s.hasAttribute(a)) add(() => s.getAttribute(a), v => s.setAttribute(a, v), s); });
    const w = S.edoc.createTreeWalker(s, 4);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const node = n, pe = n.parentElement;
      if (/^(SCRIPT|STYLE|TEMPLATE)$/.test(pe.tagName) || pe.closest('[data-se-ghost]')) continue;
      add(() => node.data, v => { node.data = v; }, pe);
    }
  });
  return out;
}
function openFind(){
  if (!S.edoc) return;
  let box = $('se-find');
  if (box) { box.querySelector('input').select(); return; }
  let at = -1;
  const q = h('input', { class: 'f', type: 'text', placeholder: '찾을 글자', spellcheck: 'false' });
  const r = h('input', { class: 'f', type: 'text', placeholder: '바꿀 글자', spellcheck: 'false' });
  const cnt = h('span', { class: 'fd-n' });
  const hits = () => findHits(q.value);
  const show = () => { const n = hits().length; cnt.textContent = !q.value ? '' : !n ? '없음' : at >= 0 ? `${at + 1}/${n}` : `${n}곳`; };
  const go = d => {
    const list = hits(); if (!list.length) return show();
    at = (at + d + list.length) % list.length;
    const x = list[at];
    if (x.i !== S.cur && S.mode === 'slides') goto(x.i);
    select([x.el], false, true);
    if (S.mode !== 'slides') x.el.scrollIntoView({ block: 'center' });
    show();
  };
  const one = () => {
    if (at < 0) return go(1);
    const x = hits()[at]; if (!x) return;
    const len = q.value.length;
    change('slide', () => { const t = x.get(); x.set(t.slice(0, x.p) + r.value + t.slice(x.p + len)); });
    at--; go(1);
  };
  const all = () => {
    const list = findHits(q.value, true), len = q.value.length, n = hits().length; if (!list.length) return;
    change('all', () => list.slice().reverse().forEach(x => { const t = x.get(); x.set(t.slice(0, x.p) + r.value + t.slice(x.p + len)); }), () => { renderPanel(); drawOv(); renderSlides(); });
    at = -1; show();
    toast(`${n}곳을 바꿨어요.`, null, { label: '되돌리기', fn: undo });
  };
  const close = () => box.remove();
  const keys = fn => e => { e.stopPropagation(); if (e.key === 'Escape') close(); else if (e.key === 'Enter') { e.preventDefault(); fn(e); } };
  q.addEventListener('input', () => { at = -1; show(); });
  q.addEventListener('keydown', keys(e => go(e.shiftKey ? -1 : 1)));
  r.addEventListener('keydown', keys(one));
  box = h('div', { id: 'se-find' },
    h('div', { class: 'fd-r' }, q, cnt,
      h('button', { type: 'button', class: 'ib', title: '이전 (Shift+Enter)', onclick: () => go(-1) }, ic('up')),
      h('button', { type: 'button', class: 'ib', title: '다음 (Enter)', onclick: () => go(1) }, ic('down')),
      h('button', { type: 'button', class: 'ib', title: '닫기 (Esc)', onclick: close }, ic('x'))),
    h('div', { class: 'fd-r' }, r, btn('바꾸기', one, { cls: 'sm' }), btn('모두 바꾸기', all, { cls: 'sm pri' })));
  $('se-mid').appendChild(box);
  q.focus();
}

function applyShowHidden(){
  if (S.edoc) { if (S.showHidden) S.edoc.documentElement.setAttribute('data-se-showhidden', ''); else S.edoc.documentElement.removeAttribute('data-se-showhidden'); }
  drawOv();
}

/* ===================================================================
   저장
   =================================================================== */
function serialize(opt = {}){
  if (!opt.quiet) { endEdit(); settle(); }
  const root = S.edoc.documentElement.cloneNode(true);
  /* 미리 띄우는 덱(PV)에서는 요소마다 번호를 달아, 거기서 움직이는 요소가 편집 화면의 어느 요소인지 찾는다 */
  if (opt.tagK) {
    const a = S.edoc.body.querySelectorAll('*'), b = root.querySelector('body').querySelectorAll('*');
    S.pvMap = [];
    for (let i = 0; i < a.length; i++) { b[i].setAttribute('data-se-k', i); S.pvMap[i] = a[i]; }
  }
  root.removeAttribute('data-se-edit'); root.removeAttribute('data-se-showhidden');
  root.querySelectorAll('#se-edit-style,#se-edit-assets,[data-se-ghost]').forEach(n => n.remove());
  root.querySelectorAll('[data-se-addcls]').forEach(el => { el.classList.remove(el.getAttribute('data-se-addcls')); el.removeAttribute('data-se-addcls'); });
  ['data-se-cur', 'data-se-off', 'data-se-anc', 'data-se-sp'].forEach(a => root.querySelectorAll(`[${a}]`).forEach(el => el.removeAttribute(a)));
  root.querySelectorAll('[data-se-ce]').forEach(el => { el.removeAttribute('contenteditable'); el.removeAttribute('data-se-ce'); el.removeAttribute('spellcheck'); });
  root.querySelectorAll('[data-se-orig-src]').forEach(el => { el.setAttribute('src', el.getAttribute('data-se-orig-src')); el.removeAttribute('data-se-orig-src'); });
  root.querySelectorAll('[data-se-heq]').forEach(el => { el.setAttribute('http-equiv', el.getAttribute('data-se-heq')); el.removeAttribute('data-se-heq'); });
  [root, ...root.querySelectorAll('*')].forEach(el => { for (const a of [...el.attributes]) if (a.name.startsWith('data-se-on')) { el.setAttribute(a.name.slice(8), a.value); el.removeAttribute(a.name); } });
  root.querySelectorAll('script[data-se-type]').forEach(s => { const t = s.getAttribute('data-se-type'); if (t === '__none__') s.removeAttribute('type'); else s.setAttribute('type', t); s.removeAttribute('data-se-type'); });
  root.querySelectorAll('[style=""]').forEach(el => el.removeAttribute('style'));
  /* 등장·기능을 돌리는 작은 스크립트: 쓰는 곳이 있을 때만 넣는다 */
  root.querySelectorAll('#se-runtime,#se-style,#se-mo,#se-skip').forEach(n => n.remove());
  const head = root.querySelector('head');
  /* 덱 움직임 고침: GSAP 바로 뒤, 장면을 짜는 스크립트보다 앞에서 돌아야 한다 */
  if (opt.preview || root.querySelector('[data-se-mo]')) {
    const gs = [...root.querySelectorAll('script')].find(s => /gsap/i.test(s.getAttribute('src') || '') || /gsap\.com|greensock/i.test(s.textContent.slice(0, 800)));
    if (gs) { const sc = S.edoc.createElement('script'); sc.id = 'se-mo'; sc.textContent = MO_JS; gs.after(sc); }
  }
  /* 건너뛰는 장: 덱 엔진이 슬라이드를 세기 전에 뺀다. 미리 띄우는 덱은 장 번호가 어긋나지 않게 그대로 둔다 */
  if (!opt.preview && root.querySelector('[data-se-skip]')) {
    const sl = findSlides(root), sc = S.edoc.createElement('script');
    sc.id = 'se-skip'; sc.textContent = "document.querySelectorAll('[data-se-skip]').forEach(function(e){e.remove()})";
    if (sl.length) sl[sl.length - 1].after(sc);
  }
  /* 스크립트가 그리는 장에 넣은 요소는 런타임이 다시 붙여 줘야 남는다 */
  const keep = findSlides(root).some(s => s.querySelector(':scope > .se-box') && isGenerated(s));
  const uses = keep || root.querySelector('[data-se-anim],[data-se-widget]');
  if (uses || opt.preview) {
    const meta = head.querySelector('meta[charset]');
    const st = S.edoc.createElement('style'); st.id = 'se-style'; st.textContent = RT_CSS;
    const sc = S.edoc.createElement('script'); sc.id = 'se-runtime';
    sc.textContent = (opt.preview && !opt.noStart ? `window.SE_START=${S.cur};` : '') + RT_JS;
    if (meta) meta.after(st, sc); else head.prepend(st, sc);
  }
  /* 덱 안 편집 모드 */
  root.querySelectorAll('script#slide-editor').forEach(n => n.remove());
  if (S.embed && !opt.preview && SRC) {
    const body = root.querySelector('body');
    const sc = S.edoc.createElement('script'); sc.id = 'slide-editor'; sc.textContent = SRC;
    body.appendChild(sc);
  }
  return '<!DOCTYPE html>\n' + root.outerHTML;
}

async function save(){
  if (!S.edoc || !S.file || S.saving) return;
  S.saving = true;
  try { await saveNow(); } finally { S.saving = false; }
}
async function saveNow(){
  let html;
  try { html = serialize(); } catch (e) { console.error(e); return toast('저장할 내용을 만들지 못했어요: ' + e.message, 'bad'); }
  if (!S.file.fh) { download(html, S.file.name); setDirty(false); DB.del('drafts', S.file.key); return; }
  try {
    if (!(await perm(S.file.fh, true))) throw new Error('파일에 쓸 권한이 없어요');
    const old = await (await S.file.fh.getFile()).text();
    let where = null;
    if (old !== html) { await linkFolder(); where = await backup(old); }
    const w = await S.file.fh.createWritable(); await w.write(html); await w.close();
    setDirty(false); S.saved = true; DB.del('drafts', S.file.key);
    S.file.baseLen = html.length;
    toast('저장했어요' + (where ? ` · 이전 판은 ${where}` : ''), 'ok');
  } catch (e) { console.error(e); toast('저장하지 못했어요: ' + e.message, 'bad'); }
}
async function backup(text){
  const base = S.file.name.replace(/\.html?$/i, '');
  let name = `${base}.${stamp()}.html`;
  if (S.file.dir) {
    try {
      const bd = await S.file.dir.getDirectoryHandle('.slide-backup', { create: true });
      /* 같은 초에 두 번 저장해도 앞 백업을 덮지 않게 */
      for (let i = 2; i < 50; i++) { try { await bd.getFileHandle(name); name = `${base}.${stamp()}-${i}.html`; } catch (e) { break; } }
      const fh = await bd.getFileHandle(name, { create: true });
      const w = await fh.createWritable(); await w.write(text); await w.close();
      return '.slide-backup 폴더에 남겼어요';
    } catch (e) {}
  }
  await DB.set('backups', null, { key: S.file.key, name, time: Date.now(), text });
  const all = (await DB.entries('backups')).filter(([, v]) => v.key === S.file.key).sort((a, b) => b[1].time - a[1].time);
  for (const [k] of all.slice(12)) await DB.del('backups', k);
  return '브라우저에 보관했어요';
}
function download(html, name){
  const a = h('a', { href: URL.createObjectURL(new Blob([html], { type: 'text/html' })), download: name });
  document.body.appendChild(a); a.click(); a.remove();
  toast('내려받기로 저장했어요. 원본 자리에 덮어써 주세요.');
}
const saveDraftSoon = debounce(async () => {
  if (!S.dirty || !S.file || !S.edoc || S.editing) return;
  try { await DB.set('drafts', S.file.key, { html: serialize(), time: Date.now(), base: S.file.baseLen }); } catch (e) {}
}, 4000);

async function restoreBackup(){
  if (!S.file) return;
  const items = [];
  const base = S.file.name.replace(/\.html?$/i, '');
  if (S.file.dir) {
    try {
      const bd = await S.file.dir.getDirectoryHandle('.slide-backup');
      for await (const [n, hd] of bd.entries()) if (hd.kind === 'file' && n.startsWith(base + '.') && /\.\d{8}-\d{6}(-\d+)?\.html$/.test(n)) {
        const f = await hd.getFile(); items.push({ name: n, time: f.lastModified, size: f.size, get: () => f.text() });
      }
    } catch (e) {}
  }
  (await DB.entries('backups')).forEach(([, v]) => { if (v.key === S.file.key) items.push({ name: v.name, time: v.time, size: v.text.length, get: async () => v.text }); });
  items.sort((a, b) => b.time - a.time);
  const list = h('div', { class: 'filelist' });
  if (!items.length) list.appendChild(h('div', { class: 'empty-note', text: '아직 백업이 없어요. 저장할 때마다 이전 판이 쌓여요.' }));
  items.forEach(it => list.appendChild(h('button', { type: 'button', onclick: async () => {
    document.querySelector('.modal-bg').remove();
    const text = await it.get();
    const meta = { ...S.file, fromDraft: false };
    await DB.del('drafts', S.file.key);
    await openText(text, meta);
    setDirty(true);
    toast('백업을 불러왔어요. 저장하면 원본이 이 판으로 바뀝니다(지금 판은 다시 백업돼요).');
  } }, ic('restore'), h('span', { text: when(it.time) }), h('small', { text: kb(it.size) }))));
  modal({ title: '백업에서 되살리기', body: h('div', null, h('p', { text: `‘${S.file.name}’의 이전 판입니다. 고르면 편집기로 불러와요(아직 저장되지는 않아요).` }), list), ok: null, cancel: '닫기' });
}

/* PDF: 장마다 다 나타난 모습을 한 쪽씩 깐 인쇄용 문서를 만들어 브라우저 인쇄 창을 연다 */
async function pdfSlide(i, w){
  const src = S.slides[i];
  if (!w) return src.cloneNode(true);
  PV.moved++;
  try { w.__seDeck.go(i, null); } catch (e) { return src.cloneNode(true); }
  await sleep(40);
  const s = findSlides(w.document)[i]; if (!s) return src.cloneNode(true);
  const c = s.cloneNode(true);
  /* 캔버스는 그림으로, 상대 경로 그림은 편집 화면의 주소로 */
  const A = [...s.querySelectorAll('canvas')], B = [...c.querySelectorAll('canvas')];
  B.forEach((x, n) => { try { const m = w.document.createElement('img'); m.src = A[n].toDataURL(); m.style.cssText = x.style.cssText; m.className = x.className; x.replaceWith(m); } catch (e) {} });
  c.querySelectorAll('img[data-se-k]').forEach(m => { const ed = S.pvMap[m.getAttribute('data-se-k')]; if (ed && ed.currentSrc) m.src = ed.currentSrc; });
  return c;
}
async function pdfHtml(){
  const doc = S.edoc.documentElement.cloneNode(true);
  doc.removeAttribute('data-se-edit'); doc.removeAttribute('data-se-showhidden');
  const body = doc.querySelector('body');
  const clean = n => n.querySelectorAll('script,[data-se-ghost]').forEach(x => x.remove());
  let css = `*{-webkit-print-color-adjust:exact;print-color-adjust:exact;transition:none!important;animation-duration:0s!important;animation-delay:0s!important}`;
  if (S.mode === 'page') { clean(doc); css += '@page{margin:12mm}'; }
  else {
    const cur = S.slides[S.cur], W = cur.offsetWidth, H = cur.offsetHeight, disp = cs(cur).display, bg = S.ewin.getComputedStyle(S.edoc.body).backgroundColor;
    const pv = S.hasEngine && await pvLoad() ? PV.f.contentWindow : null;
    body.innerHTML = '';
    for (let i = 0; i < S.slides.length; i++) {
      const src = S.slides[i];
      if (src.hasAttribute('data-se-skip')) continue;
      const c = S.edoc.importNode(await pdfSlide(i, pv), true);
      clean(c);
      c.removeAttribute('data-se-off'); c.setAttribute('data-se-cur', '');
      if (S.activeCls) c.classList.add(S.activeCls);
      c.style.cssText += `;position:absolute;left:0;top:0;width:${W}px;height:${H}px;margin:0;display:${disp};opacity:1;visibility:visible;transform:none;translate:none`;
      /* 덱 CSS의 '#stage .slide' 같은 규칙이 맞도록 바깥 겹을 비운 채 되살린다 */
      let node = c;
      for (let p = src.parentElement; p && p !== S.edoc.body; p = p.parentElement) {
        const o = p.cloneNode(false);
        ['data-se-anc', 'data-se-off'].forEach(a => o.removeAttribute(a));
        o.style.cssText += ';position:static;transform:none;width:auto;height:auto;margin:0;padding:0;display:block;overflow:visible';
        o.appendChild(node); node = o;
      }
      const page = S.edoc.createElement('div'); page.className = 'se-page'; page.style.background = bg; page.appendChild(node);
      body.appendChild(page);
    }
    css += `@page{size:${W}px ${H}px;margin:0}html,body{margin:0!important;padding:0!important;width:auto!important;height:auto!important;overflow:visible!important;display:block!important;background:none!important;transform:none!important}.se-page{position:relative;width:${W}px;height:${H}px;overflow:hidden;break-after:page;break-inside:avoid}.se-page:last-child{break-after:auto}`;
  }
  const st = S.edoc.createElement('style'); st.textContent = css;
  doc.querySelector('head').appendChild(st);
  const t = doc.querySelector('title'); if (t) t.textContent = S.file.name.replace(/\.html?$/i, '');
  return '<!DOCTYPE html>\n' + doc.outerHTML;
}
async function exportPdf(){
  if (!S.edoc || !S.file) return;
  endEdit(); settle(); if (PL.on) pvHide();
  busy('PDF로 만들 쪽을 준비하는 중…');
  try {
    const html = await pdfHtml();
    const f = h('iframe', { 'aria-hidden': 'true', tabindex: '-1', style: 'position:fixed;left:-99999px;top:0;width:1920px;height:1080px;border:0' });
    document.body.appendChild(f);
    await new Promise(r => { f.onload = r; f.srcdoc = html; });
    try { await f.contentDocument.fonts.ready; } catch (e) {}
    await sleep(300);
    busy(false);
    f.contentWindow.addEventListener('afterprint', () => f.remove());
    f.contentWindow.print();
  } catch (e) { busy(false); console.error(e); toast('PDF를 만들지 못했어요: ' + e.message, 'bad'); }
}

function preview(){
  if (!S.edoc) return;
  const html = serialize({ preview: true });
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  const w = window.open(url, '_blank');
  if (!w) toast('팝업이 막혔어요. 주소창 오른쪽에서 팝업을 허용해 주세요.', 'bad');
  else toast('새 탭에서 미리보기를 열었어요. 저장한 것은 아니에요.');
}

/* ===================================================================
   키보드
   =================================================================== */
function bindKeys(){
  document.addEventListener('keydown', onKey);
  document.addEventListener('copy', e => onCopy(e, false));
  document.addEventListener('cut', e => onCopy(e, true));
  document.addEventListener('paste', onPaste);
}
function onKey(e){
  const mod = e.ctrlKey || e.metaKey, k = e.key;
  if (mod && k.toLowerCase() === 's') { e.preventDefault(); save(); return; }
  if (document.querySelector('.modal-bg')) return;
  if (k === 'Escape' && POP) { closePop(); return; }
  if (k === 'Escape' && PL.on) { pvHide(); return; }
  if (mod && S.edoc && /^[fh]$/i.test(k)) { e.preventDefault(); openFind(); return; }
  if (isTyping(e.target) || !S.edoc || S.editing) return;
  const lk = k.toLowerCase();
  if (mod && lk === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && lk === 'y') { e.preventDefault(); redo(); return; }
  if (mod && lk === 'd') { e.preventDefault(); dupSel(); return; }
  if (mod && lk === 'g') { e.preventDefault(); e.shiftKey ? ungroupSel() : groupSel(); return; }
  if (mod && lk === 'm') { e.preventDefault(); newSlide(); return; }
  if (mod && lk === 'a') { e.preventDefault(); select(kidsOf(S.box).filter(el => !/^(SCRIPT|STYLE)$/.test(el.tagName) && boxOf(el).w > 0 && !locked(el))); return; }
  if (mod && k === ']') { e.preventDefault(); orderSel('front'); return; }
  if (mod && k === '[') { e.preventDefault(); orderSel('back'); return; }
  if (mod) return;
  if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); delSel(); return; }
  if (k === 'Escape') { e.preventDefault(); selectParent(); return; }
  if ((k === 'Enter' || k === 'F2') && S.sel.length === 1 && !isMedia(S.sel[0])) { e.preventDefault(); startEdit(S.sel[0]); return; }
  if (k === 'PageDown') { e.preventDefault(); goto(S.cur + 1); return; }
  if (k === 'PageUp') { e.preventDefault(); goto(S.cur - 1); return; }
  if (k === 't' || k === 'T') { e.preventDefault(); insertText(''); return; }
  const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  if (arrows[k]) {
    e.preventDefault();
    if (!S.sel.length) { if (k === 'ArrowDown' || k === 'ArrowRight') goto(S.cur + 1); else goto(S.cur - 1); return; }
    const m = e.shiftKey ? 10 : 1; nudge(arrows[k][0] * m, arrows[k][1] * m); return;
  }
}

/* ===================================================================
   시작
   =================================================================== */
buildUI();
renderWelcome();
window.__SE = { S, checkAssets, pdfHtml, motionsOf, openText, openFileHandle, openFolder, save, restoreBackup, serialize, goto, select, insertText, insertShape, setAnim, change, undo, redo, startEdit, endEdit, textStyle, layout, drawOv, renderPanel, wrapSel };
})();
