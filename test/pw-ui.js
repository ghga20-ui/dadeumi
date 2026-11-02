async (page) => {
  await page.evaluate(() => { if (window.__SE) __SE.S.dirty = false; });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:8765/' + encodeURIComponent('슬라이드편집기.html'));
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(async () => {
    const t = await fetch('/test/deck06.html').then(r => r.text());
    await __SE.openText(t, { name: 'deck06.html', key: 'ui:' + Math.random(), fh: null, dir: null, label: 'deck06.html' });
    await new Promise(r => setTimeout(r, 400));
    __SE.goto(7);
  });
  // 슬라이드 좌표 → 화면 좌표
  const pt = (x, y) => page.evaluate(([x, y]) => { const p = document.getElementById('se-paper').getBoundingClientRect(), s = __SE.S.scale; return [p.left + x * s, p.top + y * s]; }, [x, y]);
  const info = () => page.evaluate(() => { const S = __SE.S, el = S.sel[0]; return { sel: S.sel.length, label: el ? el.tagName + '.' + el.className : null, translate: el ? el.style.translate : null, editing: !!S.editing, hist: S.hist.length, text: el ? el.textContent.slice(0, 30) : null }; });
  const log = [];
  // 1. 제목 클릭
  let [x, y] = await pt(300, 110);
  await page.mouse.click(x, y); log.push(['click title', await info()]);
  // 2. 끌어 옮기기
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 40, y + 20, { steps: 6 }); await page.mouse.up();
  log.push(['drag', await info()]);
  // 3. 되돌리기
  await page.keyboard.press('Control+z'); log.push(['undo', await info()]);
  // 4. 더블클릭 → 글자 고치기
  await page.mouse.dblclick(x, y); log.push(['dblclick', await info()]);
  await page.keyboard.press('End'); await page.keyboard.type(' 편집됨');
  await page.keyboard.press('Escape'); log.push(['typed+esc', await info()]);
  // 5. 표 안의 칸: 두 번 눌러 안쪽으로
  [x, y] = await pt(1500, 600);
  await page.mouse.click(x, y); log.push(['table click1', await info()]);
  await page.mouse.click(x, y); log.push(['table click2', await info()]);
  await page.screenshot({ path: 'test/shot-ui.png' });
  // 6. 방향키로 옮기기
  await page.keyboard.press('Shift+ArrowRight'); await page.waitForTimeout(600); log.push(['nudge', await info()]);
  // 7. 글자 탭 크기 입력
  const sizeInput = page.locator('.num', { hasText: '크기' }).locator('input');
  await sizeInput.fill('60'); await sizeInput.press('Enter'); await page.waitForTimeout(100);
  log.push(['size', await page.evaluate(() => getComputedStyle(__SE.S.sel[0]).fontSize)]);
  return JSON.stringify({ errs, log });
}
