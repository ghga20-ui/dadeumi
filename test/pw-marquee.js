async (page) => {
  for (const p of page.context().pages()) if (p !== page) await p.close();
  await page.evaluate(() => { if (window.__SE) __SE.S.dirty = false; window.onbeforeunload = null; }).catch(() => {});
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://127.0.0.1:8766/' + encodeURIComponent('슬라이드편집기.html'));
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  const deckUrl = '/out/motion-4-02/' + encodeURIComponent('자연_그속의여유로움_모션슬라이드.html');
  await page.evaluate(async u => {
    const t = await fetch(u).then(r => r.text());
    await __SE.openText(t, { name: 'nature.html', key: 'mq:' + Math.random(), fh: null, dir: null, label: 'nature.html' });
    await new Promise(r => setTimeout(r, 400));
    __SE.goto(31);
  }, deckUrl);
  const pt = (x, y) => page.evaluate(([x, y]) => { const p = document.getElementById('se-paper').getBoundingClientRect(), s = __SE.S.scale; return [p.left + x * s, p.top + y * s]; }, [x, y]);
  const info = () => page.evaluate(() => __SE.S.sel.map(el => (el.className && el.className.baseVal == null ? el.className : el.tagName) + ':' + el.textContent.replace(/\s+/g, '').slice(0, 14)));
  const log = [];
  const drag = async (a, b, mods = []) => { const [x0, y0] = await pt(...a), [x1, y1] = await pt(...b); for (const m of mods) await page.keyboard.down(m); await page.mouse.move(x0, y0); await page.mouse.down(); await page.mouse.move((x0 + x1) / 2, (y0 + y1) / 2, { steps: 4 }); await page.mouse.move(x1, y1, { steps: 4 }); await page.waitForTimeout(80); return [x1, y1, mods]; };
  const end = async ([x, y, mods], shot) => { if (shot) await page.screenshot({ path: shot }); await page.mouse.up(); for (const m of mods) await page.keyboard.up(m); await page.waitForTimeout(80); };
  // 1. 빈 곳(줄 오른쪽 여백)에서 끌어 1행의 풀이 두 개를 고르기
  let d = await drag([1800, 330], [200, 400]);
  await end(d, 'test/mq-1-dragging.png');
  log.push(['풀이 줄 범위', await info()]);
  // 2. Shift+끌기로 아래 줄 풀이를 더하기
  d = await drag([1800, 760], [200, 900], ['Shift']); await end(d);
  log.push(['Shift 더하기', await info()]);
  await page.screenshot({ path: 'test/mq-2-multi.png' });
  // 3. 여럿 고른 채 끌어 옮기기
  const before = await page.evaluate(() => __SE.S.sel.map(el => el.style.translate || ''));
  const [gx, gy] = await page.evaluate(() => { const el = __SE.S.sel[0]; const r = el.getBoundingClientRect(); const p = document.getElementById('se-paper').getBoundingClientRect(), s = __SE.S.scale; return [p.left + (r.left + 10 - __SE.S.rect.x) * s, p.top + (r.top + r.height / 2 - __SE.S.rect.y) * s]; });
  await page.mouse.move(gx, gy); await page.mouse.down(); await page.mouse.move(gx + 30, gy + 10, { steps: 5 }); await page.mouse.up();
  log.push(['함께 옮김', before, await page.evaluate(() => __SE.S.sel.map(el => el.style.translate))]);
  await page.keyboard.press('Control+z');
  // 4. Ctrl+클릭으로 하나 빼기
  await page.keyboard.down('Control'); await page.mouse.click(gx, gy); await page.keyboard.up('Control');
  log.push(['Ctrl 빼기', await info()]);
  // 5. 슬라이드 바깥 회색에서 시작해 전체 감싸기
  const [ox, oy] = await page.evaluate(() => { const p = document.getElementById('se-paper').getBoundingClientRect(); return [p.left - 20, p.top - 20]; });
  const [ex, ey] = await pt(1900, 1060);
  await page.mouse.move(ox, oy); await page.mouse.down(); await page.mouse.move(ex, ey, { steps: 8 }); await page.mouse.up();
  log.push(['바깥에서 전체', (await info()).length, await info()]);
  // 6. 글자 위를 끌면 여전히 옮기기
  await page.mouse.click(10, 10);
  const [tx, ty] = await pt(300, 290);
  await page.mouse.move(tx, ty); await page.mouse.down(); await page.mouse.move(tx + 20, ty, { steps: 4 }); await page.mouse.up();
  log.push(['글자 위 끌기=옮기기', await info(), await page.evaluate(() => __SE.S.sel[0] && __SE.S.sel[0].style.translate)]);
  // 7. 06 덱 표 슬라이드: 빈 곳 클릭은 선택 해제
  return JSON.stringify({ errs, log });
}
