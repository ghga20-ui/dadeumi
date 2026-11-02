// 슬라이드편집기.html 만들기: node build.mjs
// src/의 편집기 코드에 화면 CSS와 덱용 런타임을 끼워 넣어 파일 하나로 묶는다.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const read = p => readFileSync(join(here, p), 'utf8');

// 인라인 <script> 안에 있으면 HTML 파서가 오작동하는 글자열을 JS가 같은 뜻으로 읽는 꼴로 바꾼다
const safe = s => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

let js = read('src/editor.js')
  .replace('__SE_CSS__', () => JSON.stringify(read('src/editor.css')))
  .replace('__SE_RT_JS__', () => JSON.stringify(read('src/runtime.js')))
  .replace('__SE_RT_CSS__', () => JSON.stringify(read('src/runtime.css')));
js = safe(js);
if (/__SE_[A-Z_]+__/.test(js)) throw new Error('자리표시가 남아 있음');

writeFileSync(join(here, 'build-check.js'), js);
execFileSync(process.execPath, ['--check', join(here, 'build-check.js')], { stdio: 'inherit' });
execFileSync(process.execPath, ['--check', join(here, 'src/runtime.js')], { stdio: 'inherit' });

const html = `<!DOCTYPE html>
<html lang="ko" data-se-editor>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>다듬이</title>
</head>
<body>
<script id="slide-editor">${js}</script>
</body>
</html>
`;
writeFileSync(join(here, '슬라이드편집기.html'), html);
console.log('슬라이드편집기.html', (html.length / 1024).toFixed(1) + 'KB');

// 웹에 올릴 파일: dist/
mkdirSync(join(here, 'dist'), { recursive: true });
writeFileSync(join(here, 'dist/index.html'), html);
copyFileSync(join(here, 'web/privacy.html'), join(here, 'dist/privacy.html'));
copyFileSync(join(here, 'logo/다듬이.svg'), join(here, 'dist/logo.svg'));
