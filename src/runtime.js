/* slide-editor runtime — 편집기로 붙인 등장 애니메이션·정답 가리개·타이머를 덱에서 돌린다.
   덱 <head> 맨 앞에 들어간다. 덱의 다른 스크립트보다 먼저 키를 받아야 하기 때문이다.
   클릭 등장은 덱 자체 단계가 다 끝난 뒤에 나온다(발표자 보기 어댑터가 있을 때). */
(function(){
  if (window.__seRT) return; window.__seRT = 1;

  var EFF = {
    fade:  { o: 0 },
    up:    { o: 0, dy: 60 },
    down:  { o: 0, dy: -60 },
    left:  { o: 0, dx: -90 },
    right: { o: 0, dx: 90 },
    zoom:  { o: 0, s: 0.6 },
    pop:   { o: 0, s: 0.3, ease: 'cubic-bezier(.34,1.56,.64,1)' },
    blur:  { o: 0, blur: 14 },
    wipe:  { wipe: 1 }
  };

  function num(v, d){ v = parseFloat(v); return isNaN(v) ? d : v; }

  /* el 하나를 효과대로 재생한다. 끝나면 원래 스타일로 돌아간다(채움 없음). */
  function play(el, opt){
    opt = opt || {};
    var name = opt.anim || el.getAttribute('data-se-anim') || 'fade';
    var e = EFF[name] || EFF.fade;
    var dur = num(opt.dur != null ? opt.dur : el.getAttribute('data-se-dur'), 0.6) * 1000;
    var delay = num(opt.delay != null ? opt.delay : el.getAttribute('data-se-delay'), 0) * 1000;
    if (opt.noDelay) delay = 0;
    var cs = getComputedStyle(el);
    var from = { offset: 0 }, to = null;
    if (e.o != null) from.opacity = e.o;
    if (e.dx || e.dy) {
      var t = (cs.translate && cs.translate !== 'none') ? cs.translate.split(' ') : ['0px', '0px'];
      var bx = t[0] || '0px', by = t[1] || '0px';
      from.translate = 'calc(' + bx + ' + ' + (e.dx || 0) + 'px) calc(' + by + ' + ' + (e.dy || 0) + 'px)';
    }
    if (e.s != null) {
      var bs = (cs.scale && cs.scale !== 'none') ? parseFloat(cs.scale) || 1 : 1;
      from.scale = String(bs * e.s);
    }
    if (e.blur) from.filter = 'blur(' + e.blur + 'px)';
    var frames;
    if (e.wipe) frames = [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }];
    else frames = [from];
    try {
      return el.animate(frames, { duration: dur, delay: delay, easing: e.ease || 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
    } catch (err) { return null; }
  }
  window.__seAnimate = play;
  if (window.__SE_EDIT) return;

  /* ---------- 발표자 보기 어댑터 엿듣기: 덱 단계가 남았는지 알기 위해 ---------- */
  var A = null;
  try {
    var dp;
    Object.defineProperty(window, 'DeckPresenter', {
      configurable: true,
      get: function(){ return dp; },
      set: function(v){
        dp = v;
        if (v && typeof v === 'object') {
          var c = v.connect;
          try {
            Object.defineProperty(v, 'connect', {
              configurable: true,
              get: function(){ return function(ad){ A = ad; return c && c.apply(this, arguments); }; },
              set: function(f){ c = f; }
            });
          } catch (err) {}
        }
      }
    });
  } catch (err) {}

  var VIEW = '';
  function view(){ return window.DECK_VIEW || VIEW || ''; }

  function findSlides(){
    var s = document.querySelectorAll('section.slide');
    if (!s.length) s = document.querySelectorAll('.slide');
    if (!s.length) s = document.querySelectorAll('body > section');
    return Array.prototype.slice.call(s);
  }
  function shown(s){
    var cs = getComputedStyle(s);
    return cs.display !== 'none' && cs.visibility !== 'hidden';
  }

  var slides = [], cur = -1, steps = [], at = 0, KEEP = [];

  /* 편집기가 미리보기용으로 덱을 움직일 때 쓴다: i장을 마지막 단계까지 */
  window.__seDeck = {
    ready: function(){ return !!(A && A.go); },
    /* k: 그 장의 몇 번째 클릭까지 진행한 모습인지(없으면 끝까지) */
    go: function(i, k){ A.go(i, 0, { fresh: true }); if (k !== 0) A.go(i, k == null ? 9999 : k, {}); },
    state: function(){ try { return A.state(); } catch (e) { return null; } }
  };

  /* 이 장의 클릭 등장 묶음: 같은 순번은 한 번의 클릭에 같이 나온다 */
  function groupsOf(slide){
    var els = Array.prototype.slice.call(slide.querySelectorAll('[data-se-anim]'));
    var clicks = els.filter(function(el){ return el.getAttribute('data-se-start') === 'click'; });
    var map = {};
    clicks.forEach(function(el){ var k = num(el.getAttribute('data-se-order'), 1); (map[k] = map[k] || []).push(el); });
    return Object.keys(map).map(Number).sort(function(a, b){ return a - b; }).map(function(k){ return map[k]; });
  }

  function activate(i, back){
    cur = i; var slide = slides[i];
    if (!slide) return;
    /* 덱이 장 내용을 스크립트로 새로 그리면(innerHTML 덮어쓰기) 편집기로 넣은 요소가 사라진다: 다시 붙인다 */
    var keep = KEEP[i];
    if (keep && keep.length && !slide.querySelector(':scope > .se-box')) keep.forEach(function(h){ slide.insertAdjacentHTML('beforeend', h); });
    var v = view();
    var els = slide.querySelectorAll('[data-se-anim]');
    steps = groupsOf(slide); at = 0;
    var revealAll = back || v === 'peek' || v === 'mirror';
    Array.prototype.forEach.call(els, function(el){
      var click = el.getAttribute('data-se-start') === 'click';
      if (click && !revealAll) el.classList.add('se-wait'); else el.classList.remove('se-wait');
      if (!click && !back && v !== 'peek') play(el);
    });
    if (revealAll) at = steps.length;
  }

  function reveal(){
    var g = steps[at++]; if (!g) return;
    g.forEach(function(el){ el.classList.remove('se-wait'); play(el); });
  }
  function unreveal(){
    var g = steps[--at]; if (!g) { at = 0; return; }
    g.forEach(function(el){ el.classList.add('se-wait'); });
  }

  function deckHasMore(){
    try { var s = A && A.state && A.state(); return !!(s && s.i === cur && s.k < s.n); } catch (e) { return false; }
  }

  addEventListener('keydown', function(e){
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (view()) return;
    var t = e.target;
    if (t && t.closest && t.closest('input,textarea,select,[contenteditable],button')) return;
    var k = e.key;
    var next = ['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].indexOf(k) >= 0;
    var prev = ['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].indexOf(k) >= 0;
    if (!next && !prev) return;
    sync();
    if (next && at < steps.length && !deckHasMore()) { e.preventDefault(); e.stopImmediatePropagation(); reveal(); }
    else if (prev && at > 0) { e.preventDefault(); e.stopImmediatePropagation(); unreveal(); }
  }, true);

  /* 화면을 눌러 넘기는 덱: 왼쪽 15%는 이전, 나머지는 다음(덱과 같은 약속). 단추·링크·기능 요소는 건드리지 않는다 */
  addEventListener('click', function(e){
    if (view() || !e.isTrusted) return;
    var t = e.target;
    if (!t || !t.closest || t.closest('button,a,input,select,textarea,label,[contenteditable],[data-nonav],[data-se-widget],.opt,.bk,#overlay')) return;
    sync();
    var slide = slides[cur];
    if (!slide || !slide.contains(t)) return;
    var r = slide.getBoundingClientRect();
    var prev = (e.clientX - r.left) < r.width * 0.15;
    if (!prev && at < steps.length && !deckHasMore()) { e.preventDefault(); e.stopImmediatePropagation(); reveal(); }
    else if (prev && at > 0) { e.preventDefault(); e.stopImmediatePropagation(); unreveal(); }
  }, true);

  /* 지금 보이는 장이 바뀌었는지 확인한다 */
  function sync(){
    if (!slides.length) return;
    var idx = -1;
    for (var i = 0; i < slides.length; i++) if (shown(slides[i])) { idx = i; if (slides[i].classList.contains('on') || slides[i].classList.contains('active')) break; }
    if (idx !== -1 && idx !== cur) activate(idx, cur !== -1 && idx < cur);
  }

  /* ---------- 정답 가리개 · 타이머 ---------- */
  var timers = new WeakMap();
  function fmt(s){ s = Math.max(0, Math.ceil(s)); var m = Math.floor(s / 60); return (m < 10 ? '0' : '') + m + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }
  function timerOf(el){
    var t = timers.get(el);
    if (!t) { t = { left: num(el.getAttribute('data-se-sec'), 60), run: false, iv: 0, last: 0 }; timers.set(el, t); }
    return t;
  }
  function tickTimer(el){
    var t = timerOf(el);
    if (!el.isConnected) { clearInterval(t.iv); return; }
    var now = Date.now(); t.left -= (now - t.last) / 1000; t.last = now;
    if (t.left <= 0) { t.left = 0; t.run = false; clearInterval(t.iv); el.classList.add('se-done'); }
    el.textContent = fmt(t.left);
  }
  document.addEventListener('click', function(e){
    var w = e.target.closest && e.target.closest('[data-se-widget]');
    if (!w) return;
    var kind = w.getAttribute('data-se-widget');
    if (kind === 'reveal') w.classList.toggle('se-open');
    else if (kind === 'timer') {
      var t = timerOf(w);
      if (t.run) { t.run = false; clearInterval(t.iv); }
      else { if (t.left <= 0) { t.left = num(w.getAttribute('data-se-sec'), 60); w.classList.remove('se-done'); } t.run = true; t.last = Date.now(); t.iv = setInterval(function(){ tickTimer(w); }, 200); }
      w.classList.toggle('se-running', t.run);
    }
  });
  document.addEventListener('dblclick', function(e){
    var w = e.target.closest && e.target.closest('[data-se-widget="timer"]');
    if (!w) return;
    var t = timerOf(w); clearInterval(t.iv); t.run = false; t.left = num(w.getAttribute('data-se-sec'), 60);
    w.classList.remove('se-done', 'se-running'); w.textContent = fmt(t.left);
  });

  function boot(){
    slides = findSlides();
    if (!slides.length) {
      /* 슬라이드가 없는 문서: 시작 등장은 바로, '보일 때'는 화면에 들어올 때 재생한다 */
      document.documentElement.classList.add('se-run');
      var io = window.IntersectionObserver && new IntersectionObserver(function(es){
        es.forEach(function(x){ if (!x.isIntersecting) return; io.unobserve(x.target); x.target.classList.remove('se-wait'); play(x.target); });
      }, { threshold: 0.2 });
      Array.prototype.forEach.call(document.querySelectorAll('[data-se-anim]'), function(el){
        if (io && el.getAttribute('data-se-start') === 'view') { el.classList.add('se-wait'); io.observe(el); } else play(el);
      });
      return;
    }
    document.documentElement.classList.add('se-run');
    KEEP = slides.map(function(s){ return Array.prototype.map.call(s.querySelectorAll(':scope > .se-box'), function(e){ return e.outerHTML; }); });
    var mine = function(r){ return !r.removedNodes.length && Array.prototype.every.call(r.addedNodes, function(n){ return n.nodeType !== 1 || n.classList.contains('se-box'); }); };
    var mo = new MutationObserver(function(recs){
      var again = false;
      recs.forEach(function(r){ if (r.type === 'childList' && slides[cur] && r.target === slides[cur] && !mine(r)) again = true; });
      /* 덱이 같은 장을 처음 상태로 다시 그렸다(innerHTML 되돌림): 등장도 처음부터 */
      if (again) { activate(cur, false); return; }
      sync();
    });
    slides.forEach(function(s){ mo.observe(s, { attributes: true, attributeFilter: ['class', 'style', 'hidden'], childList: true }); });
    sync();
    if (window.SE_START != null) setTimeout(function(){
      try { if (A && A.go) A.go(window.SE_START, 0, { animate: true, fresh: true }); } catch (e) {}
    }, 400);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
