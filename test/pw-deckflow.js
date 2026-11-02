async (page) => {
  for (const p of page.context().pages()) if (p !== page) await p.close();
  await page.evaluate(() => { if (window.__SE) __SE.S.dirty = false; });
  await page.goto('http://localhost:8765/' + encodeURIComponent('슬라이드편집기.html'));
  // 편집 모드가 든 덱 만들기
  const out = await page.evaluate(async () => {
    const t = await fetch('/test/deck06.html').then(r => r.text());
    await __SE.openText(t, { name: 'flow.html', key: 'fl:' + Math.random(), fh: null, dir: null, label: 'flow.html' });
    __SE.S.embed = true; const html = __SE.serialize(); __SE.S.dirty = false; return html;
  });
  const deck = await page.context().newPage();
  await deck.setViewportSize({ width: 1440, height: 810 });
  const errs = []; deck.on('pageerror', e => errs.push(e.message));
  // 덱은 OPFS에 있는 내용을 그대로 내보낸다(저장하면 바뀐 내용이 보이도록)
  await deck.route('**/test/flow.html', async r => {
    const body = await page.evaluate(async () => { const root = await navigator.storage.getDirectory(); return await (await (await root.getFileHandle('flow.html')).getFile()).text(); });
    r.fulfill({ body, contentType: 'text/html; charset=utf-8' });
  });
  await page.evaluate(async html => {
    const root = await navigator.storage.getDirectory();
    const fh = await root.getFileHandle('flow.html', { create: true }); const w = await fh.createWritable(); await w.write(html); await w.close();
    const req = indexedDB.open('slide-editor', 1); const db = await new Promise(r => req.onsuccess = () => r(req.result));
    await new Promise(r => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(root, 'dir:http:///test/'); tx.oncomplete = r; });
  }, out);
  await deck.goto('http://localhost:8765/test/flow.html#5');
  await deck.waitForTimeout(1500);
  await deck.keyboard.press('e'); await deck.waitForTimeout(600);
  const ov = deck.frameLocator('iframe[srcdoc]');
  await ov.locator('.welcome .big button').first().click();
  await deck.waitForTimeout(1500);
  const r = {};
  const fr = deck.frames().find(f => f.url() === 'about:srcdoc' && f.parentFrame() === deck.mainFrame());
  r.opened = await fr.evaluate(() => ({ cur: __SE.S.cur, slides: __SE.S.slides.length, file: __SE.S.file && __SE.S.file.name, embed: __SE.S.embed }));
  await fr.evaluate(async () => { const t = __SE.insertText('덱 안에서 고친 글자'); __SE.endEdit(); await __SE.save(); });
  await deck.waitForTimeout(400);
  await deck.screenshot({ path: 'test/shot-overlay.png' });
  await ov.locator('#bClose').click();
  await deck.waitForTimeout(2500);
  r.afterReload = await deck.evaluate(() => ({ overlay: document.querySelectorAll('iframe[srcdoc]').length, found: document.body.innerHTML.includes('덱 안에서 고친 글자'), editor: !!document.getElementById('slide-editor'), on: [...document.querySelectorAll('.slide')].findIndex(s => s.classList.contains('on')) }));
  await deck.close();
  return JSON.stringify({ errs, r });
}
