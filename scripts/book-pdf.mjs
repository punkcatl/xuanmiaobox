// 把典籍白话对照本导出为 PDF（版式仿站内阅读器的“对照”模式）
// 用法：node scripts/book-pdf.mjs ziping [dark|light]   → exports/子平真诠-白话对照-深色.pdf
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [id = 'ziping', theme = 'dark'] = process.argv.slice(2);
const book = JSON.parse(readFileSync(join(root, `src/content/books/${id}.json`), 'utf8'));

const THEMES = {
  dark: {
    bg: '#0f1013', ink: '#e8e1d2', ink2: '#b4ad9f', ink3: '#857f74', ink4: '#575349', line: 'rgba(232,225,210,0.12)',
    gold: '#c9a96e', gold2: '#e2c895', goldDim: 'rgba(201,169,110,0.5)', hl: 'rgba(201,169,110,0.08)', cinnabar: '#c0473a',
    wood: '#86a07c', fire: '#c66a56', earth: '#b99a68', metal: '#cfc9bb', water: '#7590a6'
  },
  light: {
    bg: '#ffffff', ink: '#26221c', ink2: '#4a443a', ink3: '#857c6e', ink4: '#b3aa9a', line: 'rgba(60,50,30,0.14)',
    gold: '#9a7836', gold2: '#86642a', goldDim: 'rgba(154,120,54,0.45)', hl: 'rgba(154,120,54,0.07)', cinnabar: '#b23a2a',
    wood: '#5f7d55', fire: '#b5533f', earth: '#9a7b45', metal: '#8a8478', water: '#4f6d85'
  }
};
const T = THEMES[theme];
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const NUM = '〇一二三四五六七八九';
const cn = n => n <= 10 ? (n === 10 ? '十' : NUM[n]) : n < 20 ? '十' + NUM[n - 10] : NUM[Math.floor(n / 10)] + '十' + (n % 10 ? NUM[n % 10] : '');
const GAN_WX = { 甲: 'wood', 乙: 'wood', 丙: 'fire', 丁: 'fire', 戊: 'earth', 己: 'earth', 庚: 'metal', 辛: 'metal', 壬: 'water', 癸: 'water' };
const ZHI_WX = { 子: 'water', 丑: 'earth', 寅: 'wood', 卯: 'wood', 辰: 'earth', 巳: 'fire', 午: 'fire', 未: 'earth', 申: 'metal', 酉: 'metal', 戌: 'earth', 亥: 'water' };

const trHtml = tr => (tr || '').split('\n').filter(Boolean)
  .map(t => `<p class="tr${/^（译注/.test(t) ? ' trnote' : ''}">${esc(t)}</p>`).join('');

let figNo = 0;
function block(b) {
  switch (b.t) {
    case 'p': return `<div class="pair"><p class="orig">${esc(b.text)}</p>${trHtml(b.tr)}</div>`;
    case 'h': return `<h3 class="h">${esc(b.text)}${b.tr ? `<small>${esc(b.tr)}</small>` : ''}</h3>`;
    case 'verse': return `<div class="verse-wrap"><p class="verse">${esc(b.text)}</p>${b.tr ? `<div class="verse-tr">${trHtml(b.tr)}</div>` : ''}</div>`;
    case 'note': return `<div class="note${b.who === '任氏曰' ? ' ren' : ''}"><span class="who">${esc(b.who)}</span><div><p class="orig">${esc(b.text)}</p>${trHtml(b.tr)}</div></div>`;
    case 'chart': {
      const pil = b.pillars.map((p, i) => `<span class="pl"><small>${'年月日时'[i] || ''}</small><b style="color:${T[GAN_WX[p[0]]] || T.ink}">${p[0]}</b><b style="color:${T[ZHI_WX[p[1]]] || T.ink}">${p[1] || ''}</b></span>`).join('');
      const yun = b.dayun && b.dayun.length ? `<span class="yun"><small>大运</small>${b.dayun.map(esc).join('　')}</span>` : '';
      return `<div class="chart"><span class="pils">${pil}</span>${yun}${b.label ? `<i class="label">${esc(b.label)}</i>` : ''}</div>${b.tr ? trHtml(b.tr) : ''}`;
    }
    case 'fig': figNo++; return `<figure class="fig"><div class="svg">${b.svg}</div><figcaption>${esc(b.caption || '')}</figcaption></figure>`;
    default: return '';
  }
}

const chapters = book.chapters.map((c, i) => `
<section class="chapter" id="c${i}">
  <div class="eyebrow">${esc(book.title)}　·　${i === 0 && c.title === '序' ? '序' : '第' + cn(book.chapters[0].title === '序' ? i : i + 1) + '篇'}</div>
  <h2 class="title">${esc(c.title)}</h2>
  ${c.blocks.map(block).join('\n')}
</section>`).join('\n');

const toc = book.chapters.map((c, i) => `<li><a href="#c${i}"><span class="n">${c.title === '序' ? '' : cn(book.chapters[0].title === '序' ? i : i + 1)}</span>${esc(c.title)}</a></li>`).join('');

const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>
:root{
  --ink:${T.ink};--ink-2:${T.ink2};--ink-3:${T.ink3};--ink-4:${T.ink4};--gold:${T.gold};
  --wood:${T.wood};--fire:${T.fire};--earth:${T.earth};--metal:${T.metal};--water:${T.water};
  --serif:'Noto Serif CJK SC','Noto Serif SC','Songti SC',serif;--sans:'Noto Sans CJK SC','Noto Sans SC','PingFang SC',sans-serif;
}
@page{size:A4;margin:16mm 17mm 15mm;background:${T.bg};
  @top-left{content:'${book.title}';font-family:'Noto Sans CJK SC',sans-serif;font-size:7pt;color:${T.ink3};letter-spacing:.15em;vertical-align:bottom;padding-bottom:3mm}
  @top-right{content:'白话对照本';font-family:'Noto Sans CJK SC',sans-serif;font-size:7pt;color:${T.ink3};letter-spacing:.15em;vertical-align:bottom;padding-bottom:3mm}
  @bottom-center{content:counter(page);font-family:'Noto Sans CJK SC',sans-serif;font-size:7.5pt;color:${T.ink3};vertical-align:top;padding-top:3mm}}
@page :first{margin:0;@top-left{content:none}@top-right{content:none}@bottom-center{content:none}}
html,body{background:${T.bg}}
body{margin:0;color:${T.ink};font-family:var(--serif);font-size:10.4pt;-webkit-print-color-adjust:exact;print-color-adjust:exact}
p{margin:0}
.cover{height:297mm;width:210mm;box-sizing:border-box;padding:62mm 28mm 24mm;display:flex;flex-direction:column;break-after:page;
  background:${T.bg};position:relative}
.cover .seal{width:16mm;height:16mm;border:1.4px solid ${T.cinnabar};color:${T.cinnabar};font-size:9pt;display:flex;align-items:center;justify-content:center;letter-spacing:.1em;writing-mode:vertical-rl;margin-bottom:14mm}
.cover h1{font-size:40pt;font-weight:600;letter-spacing:.3em;margin:0;color:${T.ink}}
.cover .sub{font-size:14pt;letter-spacing:.5em;color:${T.gold2};margin-top:8mm}
.cover .rule{width:30mm;height:1px;background:${T.goldDim};margin:12mm 0}
.cover .by{font-size:11pt;color:${T.ink2};letter-spacing:.2em}
.cover .intro{font-family:var(--sans);font-size:9.5pt;line-height:2;color:${T.ink3};max-width:120mm;margin-top:8mm}
.cover .foot{margin-top:auto;font-family:var(--sans);font-size:8.5pt;color:${T.ink3};line-height:1.9;letter-spacing:.05em}
.toc{break-after:page}
.toc h2{font-size:18pt;letter-spacing:.4em;font-weight:600;margin:4mm 0 8mm}
.toc ol{list-style:none;padding:0;margin:0;columns:2;column-gap:12mm}
.toc li{break-inside:avoid;font-size:10.5pt;line-height:2.15;border-bottom:1px dotted ${T.line}}
.toc a{color:${T.ink};text-decoration:none;display:block}
.toc .n{display:inline-block;width:3.2em;color:${T.ink3};font-size:9pt}
.howto{font-family:var(--sans);font-size:8.6pt;line-height:1.9;color:${T.ink3};margin-top:9mm;padding:3mm 4mm;border:1px solid ${T.line}}
.howto b{color:${T.gold};font-weight:500}
.chapter{margin-top:11mm;padding-top:6mm;border-top:1px solid ${T.line}}
.toc + .chapter{margin-top:0;padding-top:0;border-top:0}
.eyebrow{break-after:avoid}
.eyebrow{font-family:var(--sans);font-size:8pt;letter-spacing:.3em;color:${T.cinnabar};margin-bottom:2mm}
.title{font-size:20pt;font-weight:600;letter-spacing:.16em;margin:0 0 7mm;line-height:1.35;break-after:avoid}
.pair{margin:0 0 3.4mm}
.orig{font-family:var(--serif);font-size:10.4pt;line-height:1.86;color:${T.ink2};text-align:justify;border-left:1.5px solid ${T.goldDim};padding-left:3.2mm;break-after:avoid}
.tr{font-family:var(--sans);font-weight:${theme === 'dark' ? 350 : 400};font-size:9.5pt;line-height:1.82;color:${T.ink};text-align:justify;padding-left:3.7mm;margin-top:1.4mm;orphans:2;widows:2}
.tr.trnote{font-size:8.4pt;color:${T.ink3};margin-top:.8mm}
.h{font-size:12pt;font-weight:600;letter-spacing:.12em;color:${T.gold2};margin:6mm 0 3mm;break-after:avoid}
.h small{display:block;font-family:var(--sans);font-size:8.5pt;font-weight:400;color:${T.ink3};letter-spacing:.05em;margin-top:.6mm}
.verse-wrap{margin:5mm 0 4mm;break-inside:avoid}
.verse{font-size:12pt;line-height:1.8;letter-spacing:.1em;color:${T.gold2};border-left:2px solid ${T.cinnabar};padding:1mm 0 1mm 4mm}
.verse-tr{border-left:1.5px solid ${T.goldDim};padding-left:.5mm;margin-top:1.6mm}
.note{display:grid;grid-template-columns:13mm 1fr;gap:2mm;margin:0 0 3.4mm}
.note .who{font-size:8pt;letter-spacing:.1em;color:${T.ink3};padding-top:1mm}
.note.ren .who{color:${T.gold}}
.chart{display:flex;align-items:center;flex-wrap:wrap;gap:2mm 6mm;border:1px solid ${T.line};background:${T.hl};padding:2.2mm 4mm;margin:2mm 0 3mm;position:relative;break-inside:avoid}
.pils{display:flex;gap:1mm}
.pl{display:flex;flex-direction:column;align-items:center;width:9mm}
.pl small{font-family:var(--sans);font-size:6.5pt;color:${T.ink4}}
.pl b{font-size:13pt;font-weight:600;line-height:1.3}
.yun{font-size:9pt;color:${T.ink3};flex:1}
.yun small{font-family:var(--sans);font-size:7.5pt;color:${T.ink4};letter-spacing:.2em;margin-right:2mm}
.label{position:absolute;top:1.6mm;right:2mm;font-style:normal;font-size:7.5pt;color:#f6eee0;background:${T.cinnabar};padding:0 1.6mm;line-height:4.4mm}
.fig{margin:4mm 0 5mm;text-align:center;break-inside:avoid}
.fig .svg svg{max-width:100%;height:auto;max-height:235mm}
.fig figcaption{font-family:var(--sans);font-size:8pt;color:${T.ink3};line-height:1.7;margin-top:1.6mm}
</style></head><body>
<section class="cover">
  <div class="seal">白话对照</div>
  <h1>${esc(book.title)}</h1>
  <div class="sub">白话对照本</div>
  <div class="rule"></div>
  <div class="by">${esc(book.dynasty || '')}　·　${esc(book.author || '')}　著</div>
  <div class="intro">${esc(book.intro || '')}</div>
  <div class="foot">原文据通行本逐字校录，白话为意译，讹字在“译注”中说明。<br>文中补图均为译者所绘，原书无图。<br>玄喵盒子 · 典籍白话对照</div>
</section>
<section class="toc">
  <h2>目录</h2>
  <ol>${toc}</ol>
  <div class="howto"><b>阅读说明</b>　每段先列原文（宋体，左侧金线），其下为白话（黑体）；灰色小字为译注。命例以四柱彩字标示五行。</div>
</section>
${chapters}
</body></html>`;

const out = join(root, 'exports');
mkdirSync(out, { recursive: true });
const file = join(out, `${book.title}-白话对照-${theme === 'dark' ? '深色' : '浅色'}.pdf`);
const browser = await puppeteer.launch({ headless: 'new', executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
await page.evaluateHandle('document.fonts.ready');
await page.pdf({
  path: file, format: 'A4', printBackground: true, preferCSSPageSize: true, outline: true, tagged: true,
});
await browser.close();
console.log('已生成', file);
