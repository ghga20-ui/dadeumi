async (page) => {
  for (const p of page.context().pages()) if (p !== page) await p.close();
  await page.evaluate(() => { if (window.__SE) __SE.S.dirty = false; });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:8765/' + encodeURIComponent('슬라이드편집기.html'));
  const out = await page.evaluate(async () => {
    const E = __SE;
    const t = await fetch('/test/deck06.html').then(r => r.text());
    await E.openText(t, { name: 'deck06.html', key: 'pw:x', fh: null, dir: null, label: 'deck06.html' });
    await new Promise(r => setTimeout(r, 400));
    E.goto(7);
    const tb = E.insertText('클릭하면 떠오르는 글상자'); E.select([tb]); E.setAnim('up');
    const tb2 = E.insertText('장이 열릴 때 나타나는 글자'); E.select([tb2]); E.setAnim('fade');
    E.change('slide', () => { tb2.setAttribute('data-se-start', 'enter'); tb2.style.top = '620px'; });
    const html = E.serialize(); E.S.dirty = false; return html;
  });
  const deck = await page.context().newPage();
  await deck.setViewportSize({ width: 1440, height: 810 });
  await deck.route('**/test/out06.html', r => r.fulfill({ body: out, contentType: 'text/html; charset=utf-8' }));
  const errs = []; deck.on('pageerror', e => errs.push(e.message));
  await deck.goto('http://localhost:8765/test/out06.html#8');
  await deck.waitForTimeout(1500);
  const st = () => deck.evaluate(() => {
    const s = [...document.querySelectorAll('.slide')]; const i = s.findIndex(x => x.classList.contains('on')); const c = s[7];
    return { at: i, dots: [...document.querySelectorAll('#dots i')].filter(x=>x.className).length+'/'+document.querySelectorAll('#dots i').length,
      wait: [...c.querySelectorAll('[data-se-start="click"]')].map(e => e.classList.contains('se-wait')),
      enterOp: [...c.querySelectorAll('[data-se-start="enter"]')].map(e => getComputedStyle(e).opacity) };
  });
  const log = [await st()];
  for (let i = 0; i < 24; i++) { await deck.mouse.click(900,450); await deck.waitForTimeout(700); const s = await st(); log.push(s); if (s.at !== 7) break; }
  await deck.mouse.click(60,450); await deck.waitForTimeout(700); log.push({ back: await st() });
  await deck.mouse.click(60,450); await deck.waitForTimeout(700); log.push({ back2: await st() });
  await deck.close();
  return JSON.stringify({ errs, log });
}


