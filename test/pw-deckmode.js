async (page) => {
  for (const p of page.context().pages()) if (p !== page) await p.close();
  await page.evaluate(() => { if (window.__SE) __SE.S.dirty = false; });
  await page.goto('http://localhost:8765/' + encodeURIComponent('슬라이드편집기.html'));
  const out = await page.evaluate(async () => {
    const E = __SE, S = E.S;
    const t = await fetch('/test/deck06.html').then(r => r.text());
    await E.openText(t, { name: 'deck06.html', key: 'dm:' + Math.random(), fh: null, dir: null, label: 'deck06.html' });
    await new Promise(r => setTimeout(r, 300));
    E.goto(1);
    document.querySelector('#bAdd').click();
    [...document.querySelectorAll('.mi')].find(b => b.textContent.includes('타이머')).click();
    document.querySelector('#bAdd').click();
    [...document.querySelectorAll('.mi')].find(b => b.textContent.includes('정답 가리개')).click();
    E.endEdit();
    // 새 슬라이드 + 슬라이드 복제 + 되돌리기
    const n0 = S.slides.length; E.goto(1);
    document.querySelector('#bNewSlide').click(); const n1 = S.slides.length;
    E.undo(); const n2 = S.slides.length; E.redo(); const n3 = S.slides.length;
    S.embed = true;
    const html = E.serialize(); S.dirty = false;
    window.__counts = [n0, n1, n2, n3];
    return html;
  });
  const counts = await page.evaluate(() => window.__counts);
  const deck = await page.context().newPage();
  await deck.setViewportSize({ width: 1440, height: 810 });
  await deck.route('**/test/dm.html', r => r.fulfill({ body: out, contentType: 'text/html; charset=utf-8' }));
  const errs = []; deck.on('pageerror', e => errs.push(e.message));
  await deck.goto('http://localhost:8765/test/dm.html#2');
  await deck.waitForTimeout(1500);
  const r = {};
  r.slides = await deck.evaluate(() => document.querySelectorAll('.slide').length);
  r.newSlideTitle = await deck.evaluate(() => document.querySelectorAll('.slide')[2].getAttribute('data-title'));
  // 정답 가리개: 가려졌다가 누르면 열림
  const rv = deck.locator('.slide.on [data-se-widget=reveal]');
  r.revealBefore = await rv.evaluate(e => getComputedStyle(e).color);
  await rv.click(); await deck.waitForTimeout(200);
  r.revealAfter = await rv.evaluate(e => [e.classList.contains('se-open'), getComputedStyle(e).color]);
  // 타이머
  const tm = deck.locator('.slide.on [data-se-widget=timer]');
  await tm.click(); await deck.waitForTimeout(2300);
  r.timer = await tm.textContent();
  await tm.dblclick(); await deck.waitForTimeout(200);
  r.timerReset = await tm.textContent();
  // E 키 → 편집기 덮개
  await deck.mouse.move(700, 400);
  await deck.keyboard.press('e'); await deck.waitForTimeout(800);
  const ov = deck.frameLocator('iframe[srcdoc]');
  r.overlay = await deck.locator('iframe[srcdoc]').count();
  r.overlayText = (await ov.locator('.welcome').innerText()).slice(0, 120);
  await deck.screenshot({ path: 'test/shot-deckmode.png' });
  await ov.locator('#bClose').click(); await deck.waitForTimeout(400);
  r.overlayAfterClose = await deck.locator('iframe[srcdoc]').count();
  r.editBtn = await deck.locator('button[title^="슬라이드 편집"]').count();
  await deck.close();
  return JSON.stringify({ counts, errs, r });
}

