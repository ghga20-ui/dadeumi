async (page) => {
  for (const p of page.context().pages()) if (p !== page) await p.close();
  const base = 'http://localhost:8765/out/motion-4-02/';
  const name = encodeURIComponent('자연_그속의여유로움_모션슬라이드.html');
  const urls = { old: base + encodeURIComponent('_백업_정적변환전_20261026') + '/' + name, neu: base + name };
  const res = {}, errs = [];
  for (const k of ['old', 'neu']) {
    const pg = await page.context().newPage();
    pg.on('pageerror', e => errs.push(k + ': ' + e.message));
    await pg.setViewportSize({ width: 1920, height: 1080 });
    await pg.goto(urls[k]);
    await pg.waitForFunction(() => window.__ready === true, null, { timeout: 20000 });
    res[k] = await pg.evaluate(async () => {
      const out = [];
      for (let i = 0; i < DECK.slides.length; i++) {
        DECK.go(i); const tl = DECK.tl; tl.pause(); tl.seek(tl.duration(), false);
        await new Promise(r => setTimeout(r, 30));
        const s = DECK.slides[i];
        out.push({ i, anno: s.dataset.anno || '', stops: DECK.stops.map(x => +x.toFixed(2)).join(','), text: s.textContent.replace(/\s+/g, '') });
      }
      return out;
    });
    for (const i of [9, 27, 31, 33, 37]) {
      await pg.evaluate(i => { DECK.go(i); const tl = DECK.tl; tl.pause(); tl.seek(tl.duration(), false); }, i);
      await pg.waitForTimeout(300);
      await pg.screenshot({ path: `test/cmp-${i + 1}-${k}.png`, scale: 'css' });
      await pg.evaluate(i => { DECK.go(i); const tl = DECK.tl; tl.pause(); tl.seek(DECK.stops[2] ?? tl.duration(), false); }, i);
      await pg.waitForTimeout(300);
      await pg.screenshot({ path: `test/cmp-${i + 1}-${k}-step1.png`, scale: 'css' });
    }
    await pg.close();
  }
  const diff = [];
  res.old.forEach((o, i) => { const n = res.neu[i]; if (o.stops !== n.stops || o.text !== n.text) diff.push({ i: i + 1, anno: o.anno, stops: [o.stops, n.stops], textSame: o.text === n.text, oldT: o.text.slice(0, 60), newT: n.text.slice(0, 60) }); });
  return JSON.stringify({ errs, slides: res.neu.length, diff });
}
