async (page) => {
  for (const p of page.context().pages()) if (p !== page) await p.close();
  await page.evaluate(() => { if (window.__SE) __SE.S.dirty = false; }).catch(() => {});
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:8765/' + encodeURIComponent('슬라이드편집기.html'));
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.evaluate(async () => {
    const t = await fetch('/test/nature.html').then(r => r.text());
    await __SE.openText(t, { name: 'nature.html', key: 'gen:' + Math.random(), fh: null, dir: null, label: 'nature.html' });
    await new Promise(r => setTimeout(r, 400));
    __SE.goto(27);
  });
  await page.waitForFunction(() => __SE.S.ghost && __SE.S.ghost.state !== 'loading', null, { timeout: 20000 });
  const r = await page.evaluate(() => { const S = __SE.S, s = S.slides[27]; const g = s.querySelector('[data-se-ghost]');
    return { ghost: S.ghost.state, ghostText: g ? g.textContent.replace(/\s+/g, ' ').slice(0, 120) : null, note: document.getElementById('se-note').textContent,
      fields: [...document.querySelectorAll('.drow')].map(d => d.querySelector('.dk').textContent + ':' + d.querySelector('textarea').value).slice(0, 8) }; });
  await page.screenshot({ path: 'test/shot-gen.png' });
  // 글자 하나 고치기 → 다시 그려지는지
  const ta = page.locator('.drow textarea').filter({ hasText: '' }).nth(3);
  const before = await ta.inputValue();
  await ta.fill('속세에 묻힌 분들아, 이 내 삶은 어떠한가.');
  await page.locator('#se-props').click({ position: { x: 5, y: 5 } });
  await page.waitForTimeout(300);
  await page.waitForFunction(() => __SE.S.ghost && __SE.S.ghost.state === 'ok', null, { timeout: 20000 });
  r.before = before;
  r.after = await page.evaluate(() => __SE.S.slides[27].querySelector('[data-se-ghost]').textContent.includes('속세에 묻힌 분들아'));
  // 새 요소 더하기 + 저장 결과
  const out = await page.evaluate(() => { __SE.insertText('덧붙인 메모'); __SE.endEdit(); const h = __SE.serialize(); __SE.S.dirty = false; return h; });
  r.scriptEdited = out.includes('속세에 묻힌 분들아, 이 내 삶은 어떠한가.');
  r.noGhost = !out.includes('data-se-ghost');
  r.runtime = out.includes('id="se-runtime"');
  // undo 확인
  r.undo = await page.evaluate(() => { __SE.undo(); __SE.undo(); return __SE.S.edoc.querySelectorAll('script')[[...__SE.S.edoc.querySelectorAll('script')].findIndex(s => s.textContent.includes('ANNO.rd1'))].textContent.includes('속세에 묻힌 분들아'); });
  // 저장된 덱에서 덧붙인 메모가 남는지
  const deck = await page.context().newPage();
  await deck.setViewportSize({ width: 1440, height: 810 });
  await deck.route('**/test/gen-out.html', rr => rr.fulfill({ body: out, contentType: 'text/html; charset=utf-8' }));
  deck.on('pageerror', e => errs.push('deck: ' + e.message));
  await deck.goto('http://localhost:8765/test/gen-out.html#28');
  await deck.waitForTimeout(2000);
  r.deck = await deck.evaluate(() => { const s = document.querySelectorAll('.slide')[27]; return { on: s.classList.contains('on'), memo: !!s.querySelector('.se-box') && s.textContent.includes('덧붙인 메모'), edited: s.textContent.includes('속세에 묻힌 분들아'), lines: s.querySelectorAll('.aline').length }; });
  await deck.close();
  return JSON.stringify({ errs, r });
}
