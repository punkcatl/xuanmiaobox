// 把 content/sources/*.txt 解析为结构化章节 JSON：src/content/books/<id>.json
// 用法：npm run build:books
//
// 块类型：
//   { t: 'h', text }                  小标题
//   { t: 'p', text }                  正文段落
//   { t: 'verse', text }              原文（滴天髓诗句）
//   { t: 'note', who, text }          注文（原注 / 任氏曰）
//   { t: 'chart', pillars, dayun?, label? }  命例：四柱（年月日时）+ 大运
import { readFileSync, writeFileSync, mkdirSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { JIA_ZI, TIAN_GAN, DI_ZHI } from '../src/engine/constants.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = name => readFileSync(join(root, 'content/sources', name), 'utf8').replace(/\r/g, '');
const lines = text => text.split('\n').map(l => l.replace(/[\s　]+$/g, '').replace(/^[\s　]+/g, ''));

const CN_NUM = '[一二三四五六七八九十]+';
// 一行可能有 1–N 组干支（源文本偶有“壬辰乙未丙申”三柱同行）；
// 只要全由干支字组成即视为命例行，个别讹字（如“午辰”）保留原样并在命例上标注
const GZ_SET = new Set([...TIAN_GAN, ...DI_ZHI]);
const isGanZhiRun = l => l.length > 0 && l.length % 2 === 0 && l.length <= 24 && [...l].every(c => GZ_SET.has(c));
const isStems4 = l => l.length === 4 && [...l].every(c => TIAN_GAN.includes(c));
const isBranches4 = l => l.length === 4 && [...l].every(c => DI_ZHI.includes(c));

function newChapter(title, extra = {}) {
  return { id: '', title, ...extra, blocks: [] };
}
function finalize(book) {
  book.chapters = book.chapters.filter(c => c.blocks.length);
  book.chapters.forEach((c, i) => { c.id = `${book.id}-${String(i + 1).padStart(2, '0')}`; });
  return book;
}

// ---------------- 子平真诠 ----------------
export function parseZiping(text) {
  const book = { id: 'ziping', chapters: [] };
  const L = lines(text);
  const start = L.findIndex((l, i) => l === '序' && i > 5); // 跳过开头目录
  if (start < 0) throw new Error('子平真诠：找不到正文起始标记“序”');
  let cur = null;
  for (const l of L.slice(start)) {
    if (!l || /^[。，]$/.test(l)) continue;
    if (l === '序') { cur = newChapter('序'); book.chapters.push(cur); continue; }
    const m = l.match(new RegExp(`^(${CN_NUM})[、．.\\s]+\\s*(附?论.+)$`));
    if (m && l.length <= 20) { cur = newChapter(m[2].trim(), { no: m[1] }); book.chapters.push(cur); continue; }
    cur && cur.blocks.push({ t: 'p', text: l });
  }
  return finalize(book);
}

// ---------------- 滴天髓阐微 ----------------
export function parseDitiansui(text) {
  const book = { id: 'ditiansui', chapters: [] };
  const L = lines(text);
  const start = L.findIndex((l, i) => l === '通神论' && i > 10);
  if (start < 0) throw new Error('滴天髓：找不到正文起始标记“通神论”');
  let part = '通神论';
  let cur = null;
  let run = [];
  const flushRun = () => {
    if (!run.length) return;
    const tokens = run.flatMap(l => l.match(/../g));
    if (tokens.length >= 4 && cur) {
      const chart = { t: 'chart', pillars: tokens.slice(0, 4), dayun: tokens.slice(4) };
      if (!tokens.every(t => JIA_ZI.includes(t))) chart.label = '原文疑有讹字';
      cur.blocks.push(chart);
    } else if (cur) {
      cur.blocks.push({ t: 'p', text: run.join(' ') });
    }
    run = [];
  };
  const body = L.slice(start + 1);
  // 预先算出每行之后的第一个非空行，避免逐行向后扫描（O(n²)）
  const nextNonEmpty = new Array(body.length).fill(null);
  for (let i = body.length - 2, last = null; i >= 0; i--) {
    if (body[i + 1]) last = body[i + 1];
    nextNonEmpty[i] = last;
  }
  body.forEach((l, i) => {
    if (!l) { flushRun(); return; } // 空行结束当前命例，避免相邻两个命例被并成一个
    if (/全文终$/.test(l)) return;
    if (isGanZhiRun(l)) { run.push(l); return; }
    flushRun();
    if (l === '六亲论') { part = '六亲论'; return; }
    const h = l.match(new RegExp(`^(${CN_NUM})[、\\s　]+(\\S{1,6})$`));
    if (h) { cur = newChapter(h[2], { no: h[1], part }); book.chapters.push(cur); return; }
    if (!cur) return;
    let m;
    if ((m = l.match(/^原注[：:；;，,](.*)$/))) cur.blocks.push({ t: 'note', who: '原注', text: m[1] });
    else if ((m = l.match(/^任氏曰[：:](.*)$/))) cur.blocks.push({ t: 'note', who: '任氏曰', text: m[1] });
    else {
      // 下一非空行是“原注”的，为原文诗句
      const next = nextNonEmpty[i];
      cur.blocks.push(next && /^原注[：:；;，,]/.test(next) ? { t: 'verse', text: l } : { t: 'p', text: l });
    }
  });
  flushRun();
  return finalize(book);
}

// ---------------- 穷通宝鉴 ----------------
export function parseQiongtong(text) {
  const book = { id: 'qiongtong', chapters: [] };
  const L = lines(text);
  let cur = null;
  let pending = null;      // 正在拼的命例 { stems }
  let lastChart = null;    // 最近完成的命例（用于挂标注）
  const GZ_CHARS = TIAN_GAN.join('') + DI_ZHI.join('') + '戍';
  // 4 字且大多是干支字的残行（原书排版残缺的命例）不是标题
  const isChartish = l => l.length === 4 && [...l].filter(c => GZ_CHARS.includes(c)).length >= 3;
  const isHeading = l => l.length <= 12 && !/[，。；、]/.test(l.replace(/[：:]$/, '')) && !isChartish(l);

  for (const raw of L) {
    if (!raw || raw === '穷通宝鉴') continue;
    for (const part0 of raw.split('\t').map(s => s.trim()).filter(Boolean)) {
      // 原书命例中“戌”偶作“戍”
      const part = isChartish(part0) ? part0.replace(/戍/g, '戌') : part0;
      if (part === '时日月年') { pending = { stems: null }; continue; }
      if (pending && !pending.stems && isStems4(part)) { pending.stems = part; continue; }
      if (pending && pending.stems && isBranches4(part)) {
        // 原书顺序为 时日月年，转为 年月日时
        const p = [3, 2, 1, 0].map(i => pending.stems[i] + part[i]);
        lastChart = { t: 'chart', pillars: p };
        if (!p.every(x => JIA_ZI.includes(x))) lastChart.label = '原文疑有讹字';
        cur && cur.blocks.push(lastChart);
        pending = null;
        continue;
      }
      pending = null;
      if (isHeading(part) && /^(论|五行总论)/.test(part)) {
        cur = newChapter(part); book.chapters.push(cur); lastChart = null; continue;
      }
      if (!cur) continue;
      if (isHeading(part)) {
        // 紧跟命例的短语（如“状元”“庚运夺魁”）是命例标注
        const prev = cur.blocks[cur.blocks.length - 1];
        if (prev === lastChart && lastChart && !lastChart.label && !/[甲乙丙丁戊己庚辛壬癸][木火土金水]/.test(part) && !/月|总论/.test(part)) {
          lastChart.label = part;
        } else {
          cur.blocks.push({ t: 'h', text: part.replace(/[：:]$/, '') });
          lastChart = null;
        }
        continue;
      }
      cur.blocks.push({ t: 'p', text: part });
      lastChart = null;
    }
  }
  return finalize(book);
}

// ---------------- 元信息 + 输出 ----------------
export const META = {
  ziping: {
    title: '子平真诠', author: '沈孝瞻', dynasty: '清', level: '入门首选',
    intro: '以月令为纲、用神为要，系统讲述格局成败与取运之法。篇幅适中、条理分明，历来被视为学习子平法的第一部书。'
  },
  ditiansui: {
    title: '滴天髓', author: '原文托名刘基 · 任铁樵 阐微', dynasty: '明 · 清', level: '进阶经典',
    intro: '原文以七言诗句论五行气势、干支体用，言简意深；任铁樵逐句阐释，并附数百命例印证，是命理学的理论核心。'
  },
  qiongtong: {
    title: '穷通宝鉴', author: '余春台 编', dynasty: '清', level: '查阅工具',
    intro: '按十天干逐月论调候用神：某日主生于某月，宜取何神、忌见何物。查阅性强，可与自己的命盘对照阅读。'
  }
};

function main() {
  const out = join(root, 'src/content/books');
  mkdirSync(out, { recursive: true });
  const books = [
    parseZiping(src('ziping.txt')),
    parseDitiansui(src('ditiansui.txt')),
    parseQiongtong(src('qiongtong.txt'))
  ];
  // 先全部校验，再写文件，避免留下半成品
  for (const b of books) if (!b.chapters.length) throw new Error(`${b.id}：解析结果为空`);
  for (const b of books) {
    const full = { ...b, ...META[b.id] };
    writeFileSync(join(out, `${b.id}.json`), JSON.stringify(full));
    const n = t => b.chapters.reduce((s, c) => s + c.blocks.filter(x => x.t === t).length, 0);
    console.log(`${b.id}: ${b.chapters.length} 章, p=${n('p')} verse=${n('verse')} note=${n('note')} chart=${n('chart')} h=${n('h')}`);
  }
  // 目录索引（首屏只加载这个）
  const index = books.map(b => ({
    id: b.id, ...META[b.id],
    chapters: b.chapters.map(c => ({ id: c.id, title: c.title, part: c.part }))
  }));
  writeFileSync(join(out, 'index.json'), JSON.stringify(index));
}

// 比较真实路径：项目位于符号链接目录下时 argv[1] 与 import.meta.url 的写法不同
const isMain = () => { try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch (e) { return false; } };
if (isMain()) main();
