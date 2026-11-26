// 生成译本补图（SVG）：content/translations/<book>/figs/*.svg
// 用法：node scripts/translation-figs.mjs
// 配色用网站的 CSS 变量（嵌入阅读器时随主题变化），并带浅色背景下的后备色（在 GitHub 等处直接查看时可读）。
// 干支数据取自排盘引擎（如十二长生），避免手抄出错。
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TIAN_GAN, GAN_WX, ZHI_WX, CANG_GAN, LU, YANG_REN, changSheng, tenGod } from '../src/engine/constants.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const WX_VAR = { 木: ['--wood', '#5f7d55'], 火: ['--fire', '#b5533f'], 土: ['--earth', '#9a7b45'], 金: ['--metal', '#8a8478'], 水: ['--water', '#4f6d85'] };
const wx = w => `var(${WX_VAR[w][0]},${WX_VAR[w][1]})`;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// 公共样式：类名统一加 xf- 前缀，嵌入页面时不与站内样式冲突
const STYLE = `<style>
.xf-t{font-family:"Noto Serif SC","Songti SC",serif;fill:var(--ink,#2b2620)}
.xf-s{font-family:"Noto Sans SC","PingFang SC",sans-serif;fill:var(--ink-3,#7a7064)}
.xf-g{fill:var(--gold,#a07d3c)}
.xf-ln{stroke:var(--ink-3,#9a8f80);fill:none;stroke-width:1.2}
.xf-dash{stroke:var(--ink-3,#9a8f80);fill:none;stroke-width:1;stroke-dasharray:4 4}
.xf-box{fill:none;stroke:var(--ink-4,#c9bfae);stroke-width:1}
.xf-hl{fill:var(--gold,#a07d3c);fill-opacity:.12}
</style>`;
// 箭头标记 id 每张图独立：多张图内嵌在同一页面时 id 不冲突
let figId = 'xf';
const svg = (w, h, body, title) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
${STYLE}
<defs><marker id="${figId}-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 1L9 5L0 9z" fill="var(--ink-3,#9a8f80)"/></marker></defs>
${body}
</svg>
`;
const text = (x, y, s, cls = 'xf-t', size = 15, anchor = 'middle', extra = '') => `<text x="${x}" y="${y}" class="${cls}" font-size="${size}" text-anchor="${anchor}" ${extra}>${esc(s)}</text>`;
const circle = (x, y, r, w) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${wx(w)}" fill-opacity=".14" stroke="${wx(w)}" stroke-width="1.4"/>`;
const node = (x, y, w, r = 24, size = 20) => `${circle(x, y, r, w)}<text x="${x}" y="${(Number(y) + size * 0.36).toFixed(1)}" font-size="${size}" text-anchor="middle" font-family="Noto Serif SC,serif" font-weight="600" style="fill:${wx(w)}">${w}</text>`;
const line = (x1, y1, x2, y2, cls = 'xf-ln', arrow = true) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}"${arrow ? ` marker-end="url(#${figId}-arrow)"` : ''}/>`;
/** 两圆心连线，两端各缩进 r（箭头不压在圆上） */
function between(a, b, r, cls, arrow = true) {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
  const k1 = r / d, k2 = (d - r - 4) / d;
  return line((a[0] + dx * k1).toFixed(1), (a[1] + dy * k1).toFixed(1), (a[0] + dx * k2).toFixed(1), (a[1] + dy * k2).toFixed(1), cls, arrow);
}

const figs = {};

// 图 1-1 一气 → 阴阳 → 四象 → 五行
figs['01-sixiang-wuxing'] = () => {
  const W = 640, H = 360;
  const xs = [110, 250, 390, 530];
  const four = [['太阴', '极静', '水'], ['少阴', '初静', '金'], ['少阳', '初动', '木'], ['太阳', '极动', '火']];
  let b = text(320, 38, '一气', 'xf-t', 20);
  b += line(300, 48, 190, 92) + line(340, 48, 450, 92);
  b += text(178, 70, '静', 'xf-s', 13) + text(462, 70, '动', 'xf-s', 13);
  b += text(180, 112, '阴', 'xf-t', 19) + text(460, 112, '阳', 'xf-t', 19);
  b += line(170, 122, 120, 156) + line(190, 122, 240, 156) + line(450, 122, 400, 156) + line(470, 122, 520, 156);
  four.forEach(([name, note, w], i) => {
    b += text(xs[i], 178, name, 'xf-t', 17) + text(xs[i], 198, note, 'xf-s', 12);
    b += line(xs[i], 206, xs[i], 222);
    b += node(xs[i], 252, w);
  });
  // 土：四者冲和之气所结
  b += node(320, 320, '土');
  xs.forEach(x => { b += between([x, 252], [320, 320], 26, 'xf-dash', false); });
  b += text(320, 356, '土：木火金水冲和之气所结，寄旺于四季', 'xf-s', 12);
  return svg(W, H, b, '四象与五行：一气分阴阳，阴阳分老少成四象，五行具于其中');
};

// 图 1-2 天干如官长、地支如辖地（以木为例）
figs['01-ganzhi-guanchang'] = () => {
  const W = 600, H = 250;
  let b = '';
  b += `<rect x="20" y="20" width="560" height="80" rx="4" class="xf-box"/>` + `<rect x="20" y="150" width="560" height="80" rx="4" class="xf-box"/>`;
  b += text(36, 55, '天', 'xf-g', 18, 'start') + text(36, 80, '天干 · 流动不居 · 如官长', 'xf-s', 12, 'start');
  b += text(36, 185, '地', 'xf-g', 18, 'start') + text(36, 210, '地支 · 固定不迁 · 如辖地', 'xf-s', 12, 'start');
  const cols = [[330, '甲', '阳 · 木之气'], [470, '乙', '阴 · 木之质']];
  const zhi = [['寅', '阳 · 正月'], ['卯', '阴 · 二月']];
  cols.forEach(([x, g, note], i) => {
    b += text(x, 66, g, 'xf-t', 26) + text(x, 88, note, 'xf-s', 11);
    b += line(x, 104, x, 146);
    b += text(x + 12, 130, '禄', 'xf-g', 13, 'start');
    b += text(x, 196, zhi[i][0], 'xf-t', 26) + text(x, 218, zhi[i][1], 'xf-s', 11);
  });
  b += text(36, 130, '如知府坐镇府城、知县坐镇县城，各司一月之令', 'xf-s', 11, 'start');
  return svg(W, H, b, '天干如官长，地支如辖地：甲禄在寅，乙禄在卯');
};

// 图 2-1 五行相生（实线环）与相克（虚线星）
figs['02-wuxing-shengke'] = () => {
  const W = 420, H = 400, cx = 210, cy = 200, R = 130;
  const order = ['火', '土', '金', '水', '木'];
  const ang = [-90, -18, 54, 126, 198];
  const pos = Object.fromEntries(order.map((w, i) => [w, [cx + R * Math.cos(ang[i] * Math.PI / 180), cy + R * Math.sin(ang[i] * Math.PI / 180)]]));
  let b = '';
  const sheng = [['木', '火'], ['火', '土'], ['土', '金'], ['金', '水'], ['水', '木']];
  const ke = [['木', '土'], ['土', '水'], ['水', '火'], ['火', '金'], ['金', '木']];
  sheng.forEach(([a, c]) => { b += between(pos[a], pos[c], 28, 'xf-ln'); });
  ke.forEach(([a, c]) => { b += between(pos[a], pos[c], 28, 'xf-dash'); });
  order.forEach(w => { b += node(pos[w][0].toFixed(1), pos[w][1].toFixed(1), w, 26, 21); });
  b += line(30, 372, 70, 372, 'xf-ln') + text(78, 377, '相生', 'xf-s', 12, 'start');
  b += line(150, 372, 190, 372, 'xf-dash') + text(198, 377, '相克', 'xf-s', 12, 'start');
  return svg(W, H, b, '五行相生（实线：木生火、火生土、土生金、金生水、水生木）与相克（虚线：木克土、土克水、水克火、火克金、金克木）');
};

// 图 2-2 十干的正官与七煞（同性相克为煞，异性相克为官）
figs['02-guan-sha'] = () => {
  const W = 520, rowH = 30, top = 70;
  const rows = TIAN_GAN.map((g, i) => {
    const keWx = Object.keys(WX_VAR).find(w => ({ 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' })[w] === GAN_WX[g]); // 克我者
    const pair = TIAN_GAN.filter(x => GAN_WX[x] === keWx); // [阳, 阴]
    const yang = i % 2 === 0;
    return { g, sha: yang ? pair[0] : pair[1], guan: yang ? pair[1] : pair[0] };
  });
  const H = top + rows.length * rowH + 24;
  let b = text(100, 40, '日干', 'xf-s', 13) + text(260, 40, '七煞（同性相克）', 'xf-s', 13) + text(420, 40, '正官（异性相克）', 'xf-s', 13);
  b += line(30, 52, 490, 52, 'xf-box', false);
  const focus = new Set(['甲', '乙', '庚', '辛']);
  rows.forEach((r, i) => {
    const y = top + i * rowH;
    if (focus.has(r.g)) b += `<rect x="30" y="${y - 20}" width="460" height="${rowH - 2}" class="xf-hl"/>`;
    b += `<text x="100" y="${y}" font-size="17" text-anchor="middle" font-family="Noto Serif SC,serif" style="fill:${wx(GAN_WX[r.g])}">${r.g}<tspan class="xf-s" font-size="11">（${i % 2 ? '阴' : '阳'}${GAN_WX[r.g]}）</tspan></text>`;
    b += `<text x="260" y="${y}" font-size="17" text-anchor="middle" font-family="Noto Serif SC,serif" style="fill:${wx(GAN_WX[r.sha])}">${r.sha}</text>`;
    b += `<text x="420" y="${y}" font-size="17" text-anchor="middle" font-family="Noto Serif SC,serif" style="fill:${wx(GAN_WX[r.guan])}">${r.guan}</text>`;
  });
  b += text(260, H - 8, '浅色底为本章举例的甲、乙、庚、辛', 'xf-s', 11);
  return svg(W, H, b, '十干的正官与七煞：同性相克为七煞，异性相克为正官');
};

// 图 3-1 十干十二长生表（阳干顺行、阴干逆行）
figs['03-changsheng'] = () => {
  const STAGES = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
  const ZHI_ALL = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const colW = 46, left = 70, top = 82, rowH = 30;
  const W = left + STAGES.length * colW + 20, H = top + TIAN_GAN.length * rowH + 30;
  let b = '';
  STAGES.forEach((s, j) => { b += text(left + j * colW + colW / 2, 40, s, 'xf-s', 12); });
  b += line(20, 52, W - 20, 52, 'xf-box', false);
  TIAN_GAN.forEach((g, i) => {
    const y = top + i * rowH;
    if (g === '甲' || g === '乙') b += `<rect x="20" y="${y - 20}" width="${W - 40}" height="${rowH - 2}" class="xf-hl"/>`;
    b += `<text x="44" y="${y}" font-size="17" text-anchor="middle" font-family="Noto Serif SC,serif" style="fill:${wx(GAN_WX[g])}">${g}</text>`;
    STAGES.forEach((s, j) => {
      const z = ZHI_ALL.find(z => changSheng(g, z) === s);
      b += `<text x="${left + j * colW + colW / 2}" y="${y}" font-size="16" text-anchor="middle" font-family="Noto Serif SC,serif" style="fill:${wx(ZHI_WX[z])}">${z}</text>`;
    });
  });
  b += text(W / 2, H - 8, '阳干（甲丙戊庚壬）顺行，阴干（乙丁己辛癸）逆行；浅色底为本章举例的甲、乙', 'xf-s', 11);
  return svg(W, H, b, '十干十二长生表：各天干在十二地支上的长生、沐浴……胎、养');
};

// 图 3-2 支藏人元司令（各月中各藏干当令的天数）
figs['03-renyuan-siling'] = () => {
  // 通行的《人元司令分野》：各家天数略有出入（如申月戊己合计十日，有作己七戊三者）
  const DATA = [
    ['寅', [['戊', 7], ['丙', 7], ['甲', 16]]], ['卯', [['甲', 10], ['乙', 20]]], ['辰', [['乙', 9], ['癸', 3], ['戊', 18]]],
    ['巳', [['戊', 5], ['庚', 9], ['丙', 16]]], ['午', [['丙', 10], ['己', 9], ['丁', 11]]], ['未', [['丁', 9], ['乙', 3], ['己', 18]]],
    ['申', [['戊己', 10], ['壬', 3], ['庚', 17]]], ['酉', [['庚', 10], ['辛', 20]]], ['戌', [['辛', 9], ['丁', 3], ['戊', 18]]],
    ['亥', [['戊', 7], ['甲', 5], ['壬', 18]]], ['子', [['壬', 10], ['癸', 20]]], ['丑', [['癸', 9], ['辛', 3], ['己', 18]]]
  ];
  const left = 70, unit = 15, top = 50, rowH = 30, W = left + 30 * unit + 30, H = top + DATA.length * rowH + 34;
  let b = text(left + 15 * unit, 30, '一个月约三十天：自交节之日起，依次由各藏干当令', 'xf-s', 12);
  DATA.forEach(([z, segs], i) => {
    const y = top + i * rowH;
    b += `<text x="40" y="${y + 17}" font-size="17" text-anchor="middle" font-family="Noto Serif SC,serif" style="fill:${wx(ZHI_WX[z])}">${z}</text>`;
    let x = left;
    segs.forEach(([g, d]) => {
      const w = d * unit, w5 = GAN_WX[g[0]];
      b += `<rect x="${x}" y="${y}" width="${w - 2}" height="${rowH - 8}" fill="${wx(w5)}" fill-opacity=".22" stroke="${wx(w5)}" stroke-width="1"/>`;
      b += `<text x="${x + (w - 2) / 2}" y="${y + 16}" font-size="13" text-anchor="middle" font-family="Noto Serif SC,serif" class="xf-t">${g}${d}日</text>`;
      x += w;
    });
  });
  b += text(left + 15 * unit, H - 10, '各家所载天数略有出入，此为通行之说', 'xf-s', 11);
  return svg(W, H, b, '支藏人元司令：每月自交节起，各藏干依次当令的天数');
};


// 图 4-1 天干五合：甲己化土 → 乙庚化金 → 丙辛化水 → 丁壬化木 → 戊癸化火（按相生次序）
figs['04-wuhe'] = () => {
  const pairs = [['甲', '己', '土'], ['乙', '庚', '金'], ['丙', '辛', '水'], ['丁', '壬', '木'], ['戊', '癸', '火']];
  const W = 640, H = 230, step = 120, x0 = 80;
  let b = text(W / 2, 30, '十干阴阳相配而合，合化次序从土开始，依五行相生而行', 'xf-s', 12);
  pairs.forEach(([a, c, w], i) => {
    const x = x0 + i * step;
    b += `<text x="${x - 16}" y="${82}" font-size="21" text-anchor="middle" font-family="Noto Serif SC,serif" style="fill:${wx(GAN_WX[a])}">${a}</text>`;
    b += text(x, 80, '＋', 'xf-s', 13);
    b += `<text x="${x + 16}" y="${82}" font-size="21" text-anchor="middle" font-family="Noto Serif SC,serif" style="fill:${wx(GAN_WX[c])}">${c}</text>`;
    b += text(x - 16, 102, '阳', 'xf-s', 10) + text(x + 16, 102, '阴', 'xf-s', 10);
    b += line(x, 112, x, 134);
    b += node(x, 162, w, 24, 19);
    b += text(x, 206, `化${w}`, 'xf-t', 13);
    if (i < pairs.length - 1) b += line(x + 30, 162, x + step - 32, 162, 'xf-dash');
  });
  b += text(W / 2, 226, '虚线：土生金、金生水、水生木、木生火', 'xf-s', 11);
  return svg(W, H + 6, b, '天干五合：甲己化土、乙庚化金、丙辛化水、丁壬化木、戊癸化火');
};

// 图 6-1 根与比肩的轻重（以甲木为例）
figs['06-gen-bijian'] = () => {
  const rows = [['天干一比肩', '不如', '地支一墓库', '如甲逢未、丙逢戌'], ['天干两比肩', '不如', '地支一余气', '如乙逢辰、丁逢未'], ['天干三比肩', '不如', '一长生禄刃', '如甲逢亥、寅、卯']];
  const W = 600, H = 200;
  let b = '';
  rows.forEach(([l, m, r, eg], i) => {
    const y = 40 + i * 52;
    b += `<rect x="30" y="${y - 22}" width="190" height="34" rx="3" class="xf-box"/>` + text(125, y, l, 'xf-t', 15);
    b += text(255, y, m, 'xf-s', 12);
    b += `<rect x="290" y="${y - 22}" width="170" height="34" rx="3" fill="var(--gold,#a07d3c)" fill-opacity=".1" stroke="var(--gold,#a07d3c)" stroke-width="1"/>` + text(375, y, r, 'xf-g', 15);
    b += text(472, y, eg, 'xf-s', 11, 'start');
  });
  b += text(W / 2, 190, '比劫如朋友相扶，通根如有家可住；天干多不如地支根重', 'xf-s', 12);
  return svg(W, H, b, '根与比肩的轻重：天干比肩多，不如地支有根');
};

// 图 7-1 地支六冲、六合（左）与三合局（右）
figs['07-chong-he'] = () => {
  const Z = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const R = 100, W = 620, H = 300;
  // 地支字在外圈（半径 R），线条画在内圈（半径 R - 22），互不遮挡
  const at = (cx, cy, i, r = R) => { const a = (-90 + i * 30) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
  const ring = (cx, cy) => Z.map((z, i) => { const [x, y] = at(cx, cy, i); return `<text x="${x.toFixed(1)}" y="${(y + 6).toFixed(1)}" font-size="17" text-anchor="middle" font-family="Noto Serif SC,serif" style="fill:${wx(ZHI_WX[z])}">${z}</text>`; }).join('');
  const seg = (cx, cy, i, j, cls, color) => { const [x1, y1] = at(cx, cy, i, R - 22), [x2, y2] = at(cx, cy, j, R - 22); return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="${cls}"${color ? ` style="stroke:${color}"` : ''}/>`; };
  let b = '';
  const L = [160, 150], Rc = [460, 150];
  // 六冲：相隔六位（对冲）；六合：子丑、寅亥、卯戌、辰酉、巳申、午未
  for (let i = 0; i < 6; i++) b += seg(L[0], L[1], i, i + 6, 'xf-dash', 'var(--fire,#b5533f)');
  [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]].forEach(([i, j]) => { b += seg(L[0], L[1], i, j, 'xf-ln', 'var(--gold,#a07d3c)'); });
  b += ring(L[0], L[1]);
  b += text(L[0], 282, '六冲（红虚线）　六合（金实线）', 'xf-s', 12);
  // 三合局：申子辰水、亥卯未木、寅午戌火、巳酉丑金
  [[8, 0, 4, '水'], [11, 3, 7, '木'], [2, 6, 10, '火'], [5, 9, 1, '金']].forEach(([a, c, d, w]) => {
    const pts = [a, c, d].map(i => at(Rc[0], Rc[1], i, R - 22).map(v => v.toFixed(1)).join(',')).join(' ');
    b += `<polygon points="${pts}" fill="${wx(w)}" fill-opacity=".08" stroke="${wx(w)}" stroke-width="1.2"/>`;
  });
  b += ring(Rc[0], Rc[1]);
  b += text(Rc[0], 282, '三合局：申子辰水、亥卯未木、寅午戌火、巳酉丑金', 'xf-s', 12);
  return svg(W, H, b, '地支六冲、六合与三合局');
};

// 图 8-1 用神的顺用与逆用
figs['08-shun-ni'] = () => {
  const shun = [['财', '喜食神相生', '喜生官以护财'], ['官', '喜透财相生', '喜生印以护官'], ['印', '喜官煞相生', '喜劫财以护印'], ['食', '喜身旺相生', '喜生财以护食']];
  const ni = [['七煞', '喜食神制伏', '忌财印资扶'], ['伤官', '喜佩印制伏', '喜生财化伤'], ['阳刃', '喜官煞制伏', '忌官煞俱无'], ['月劫', '喜透官制伏', '宜用财透食化劫']];
  const W = 640, rowH = 30, top = 76, H = top + 4 * rowH + 30;
  let b = text(160, 30, '善神 · 顺用', 'xf-g', 16) + text(480, 30, '不善之神 · 逆用', 'xf-g', 16);
  b += text(160, 52, '顺其性而生之、护之', 'xf-s', 11) + text(480, 52, '逆其性而制之、化之', 'xf-s', 11);
  [[shun, 20], [ni, 340]].forEach(([rows, x0]) => {
    b += `<rect x="${x0}" y="${top - 22}" width="280" height="${rows.length * rowH + 8}" rx="4" class="xf-box"/>`;
    rows.forEach(([g, a, c], i) => {
      const y = top + i * rowH;
      b += text(x0 + 34, y, g, 'xf-t', 15) + text(x0 + 130, y, a, 'xf-s', 12) + text(x0 + 225, y, c, 'xf-s', 12);
    });
  });
  b += text(W / 2, H - 8, '当顺而顺、当逆而逆，配合得宜，皆为贵格', 'xf-s', 12);
  return svg(W, H, b, '用神的顺用与逆用：财官印食顺用，煞伤刃劫逆用');
};


// 图 9-1 八格成败一览
figs['09-chengbai'] = () => {
  const rows = [
    ['正官', '官逢财、印，又无刑冲破害', '官逢伤官克、刑冲'],
    ['财', '财生官旺；财逢食生而身强带比；财格透印而位置妥帖', '财轻比重；财透七煞'],
    ['印', '印轻逢煞；官印双全；身印两旺用食伤泄秀；印多逢财而财透根轻', '印轻逢财；身强印重而透煞'],
    ['食神', '食神生财；食带煞而无财，弃食就煞而透印', '食神逢枭；生财而露煞'],
    ['七煞', '身强七煞逢制', '七煞逢财而无制'],
    ['伤官', '伤官生财；伤官佩印、伤旺印有根；伤旺身弱而透煞印；伤官带煞而无财', '非金水伤官而见官；生财带煞；佩印而伤轻身旺'],
    ['阳刃', '透官煞而露财印，不见伤官', '无官煞'],
    ['建禄月劫', '透官逢财印；透财逢食伤；透煞遇制伏', '无财官，透煞印']
  ];
  const W = 820, top = 62, rowH = 34, H = top + rows.length * rowH + 16;
  let b = text(70, 36, '格局', 'xf-s', 13) + text(320, 36, '成', 'xf-g', 15) + text(660, 36, '败', 'xf-s', 15);
  b += line(20, 46, W - 20, 46, 'xf-box', false);
  rows.forEach(([g, ok, ng], i) => {
    const y = top + i * rowH;
    if (i % 2 === 0) b += `<rect x="20" y="${y - 20}" width="${W - 40}" height="${rowH - 2}" class="xf-hl"/>`;
    b += text(70, y + 2, g, 'xf-t', 14) + text(130, y + 2, ok, 'xf-t', 11.5, 'start') + text(520, y + 2, ng, 'xf-s', 11.5, 'start');
  });
  return svg(W, H, b, '八格成败一览：各格成格与败格的条件');
};

// 图 10-1 寅中藏干如府官：甲为知府，丙为同知，戊为通判
figs['10-yin-fuguan'] = () => {
  const W = 560, H = 230;
  let b = `<rect x="40" y="30" width="480" height="150" rx="6" class="xf-box"/>`;
  b += text(80, 112, '寅', 'xf-t', 40) + text(80, 140, '月令', 'xf-s', 11);
  const rows = [['甲', '本气', '知府（本主）', 74], ['丙', '长生', '同知', 112], ['戊', '长生', '通判', 150]];
  rows.forEach(([g, a, c, y]) => {
    b += `<text x="200" y="${y}" font-size="22" text-anchor="middle" font-family="Noto Serif SC,serif" style="fill:${wx(GAN_WX[g])}">${g}</text>`;
    b += text(250, y - 3, a, 'xf-s', 11) + text(380, y - 3, c, 'xf-t', 14);
  });
  b += text(W / 2, 212, '寅月为提纲而甲不透、丙透出：如知府不在，同知可以作主——用神由此而变', 'xf-s', 11.5);
  return svg(W, H, b, '寅中所藏：甲为本主如知府，丙、戊为长生如同知、通判');
};

// 图 12-1 格局高低：有情与有力
figs['12-qing-li'] = () => {
  const W = 600, H = 300, x0 = 130, y0 = 40, cw = 200, ch = 100;
  let b = '';
  const cells = [['有情而有力', '格之最高', true], ['有力而少情', '高而次', false], ['有情而少力', '高而次', false], ['无情、无力', '格低无用', false]];
  [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([c, r], k) => {
    const x = x0 + c * cw, y = y0 + r * ch;
    b += `<rect x="${x}" y="${y}" width="${cw - 6}" height="${ch - 6}" rx="4" ${cells[k][2] ? 'fill="var(--gold,#a07d3c)" fill-opacity=".14" stroke="var(--gold,#a07d3c)"' : 'class="xf-box"'}/>`;
    b += text(x + (cw - 6) / 2, y + 42, cells[k][0], cells[k][2] ? 'xf-g' : 'xf-t', 15) + text(x + (cw - 6) / 2, y + 66, cells[k][1], 'xf-s', 12);
  });
  b += text(x0 - 40, y0 + 50, '有情', 'xf-s', 12) + text(x0 - 40, y0 + 150, '少情', 'xf-s', 12);
  b += text(x0 + 97, y0 - 12, '有力', 'xf-s', 12) + text(x0 + 297, y0 - 12, '少力', 'xf-s', 12);
  b += text(W / 2, 262, '有情：喜忌之神配合得宜（如合伤存官）；有力：喜用之神根深势足', 'xf-s', 11.5);
  b += text(W / 2, 284, '一字可有千钧之力，半字可败全局之美', 'xf-s', 11.5);
  return svg(W, H, b, '格局高低在于有情无情、有力无力');
};

// 图 14-1 调候：四季的寒暖燥湿与所需
figs['14-tiaohou'] = () => {
  const W = 640, H = 380, cx = 320, cy = 190, r = 100;
  // [季, 五行, 气候, 说明, 节点位置, 标注位置, 对齐]
  const seasons = [
    ['春', '木', '暖', '春木逢火，木火通明', [cx, cy - r], [cx, cy - r - 52], 'middle'],
    ['夏', '火', '燥', '夏木喜水，火济水、水济火', [cx + r, cy], [cx + r + 36, cy - 6], 'start'],
    ['秋', '金', '凉', '秋金遇水，金水相涵', [cx, cy + r], [cx, cy + r + 44], 'middle'],
    ['冬', '水', '寒', '冬水冻木，须火暖局', [cx - r, cy], [cx - r - 36, cy - 6], 'end']
  ];
  let b = `<circle cx="${cx}" cy="${cy}" r="${r}" class="xf-box"/>`;
  b += text(cx, cy - 4, '调候', 'xf-g', 18) + text(cx, cy + 18, '寒者暖之，燥者润之', 'xf-s', 11);
  seasons.forEach(([s, w, q, note, [x, y], [lx, ly], anchor]) => {
    b += node(x, y, w, 22, 17);
    b += text(lx, ly, `${s} · ${q}`, 'xf-t', 13, anchor) + text(lx, ly + 18, note, 'xf-s', 10.5, anchor);
  });
  return svg(W, H, b, '调候：四季寒暖燥湿不同，取用须兼顾气候');
};


// 图 15-1 用神与相神：如君之有相
figs['15-xiangshen'] = () => {
  const rows = [['官', '用神', '财', '相神', '官逢财生'], ['财', '用神', '官', '相神', '财旺生官'], ['煞', '用神', '食', '相神', '煞逢食制']];
  const W = 560, H = 230;
  let b = text(W / 2, 30, '月令得用神，别位必有辅佐它的“相神”，如君之有相', 'xf-s', 12);
  rows.forEach(([u, ul, x, xl, note], i) => {
    const y = 72 + i * 50;
    b += `<rect x="70" y="${y - 22}" width="110" height="36" rx="4" fill="var(--gold,#a07d3c)" fill-opacity=".12" stroke="var(--gold,#a07d3c)"/>`;
    b += text(110, y + 2, u, 'xf-g', 18) + text(150, y, ul, 'xf-s', 10);
    b += line(186, y - 4, 274, y - 4);
    b += `<rect x="280" y="${y - 22}" width="110" height="36" rx="4" class="xf-box"/>`;
    b += text(320, y + 2, x, 'xf-t', 18) + text(360, y, xl, 'xf-s', 10);
    b += text(410, y + 1, note, 'xf-s', 12, 'start');
  });
  b += text(W / 2, 222, '全局之格赖此一字而成者，皆谓之相；伤用神甚于伤身，伤相神甚于伤用神', 'xf-s', 11);
  return svg(W, H, b, '用神与相神：官以财为相，财以官为相，煞以食为相');
};

// 图 16-1 四墓库的藏干
figs['16-siku'] = () => {
  const rows = [['辰', '戊', '乙', '癸', '水库'], ['戌', '戊', '辛', '丁', '火库'], ['丑', '己', '癸', '辛', '金库'], ['未', '己', '丁', '乙', '木库']];
  const W = 560, top = 70, rowH = 38, H = top + rows.length * rowH + 30;
  let b = text(80, 40, '墓库', 'xf-s', 12) + text(200, 40, '本气（土）', 'xf-s', 12) + text(320, 40, '余气', 'xf-s', 12) + text(440, 40, '库中所藏', 'xf-s', 12);
  b += line(30, 52, W - 30, 52, 'xf-box', false);
  rows.forEach(([z, a, c, d, k], i) => {
    const y = top + i * rowH;
    const g = (x, ch) => `<text x="${x}" y="${y}" font-size="19" text-anchor="middle" font-family="Noto Serif SC,serif" style="fill:${wx(GAN_WX[ch])}">${ch}</text>`;
    b += `<text x="80" y="${y}" font-size="20" text-anchor="middle" font-family="Noto Serif SC,serif" style="fill:${wx(ZHI_WX[z])}">${z}</text>`;
    b += g(200, a) + g(320, c) + g(440, d) + text(476, y - 1, k, 'xf-s', 11, 'start');
  });
  b += text(W / 2, H - 8, '所藏者多、用神不一，故称“杂气”；取透干、会支之清者为用', 'xf-s', 11.5);
  return svg(W, H, b, '四墓库（辰戌丑未）的藏干：本气、余气与库中所藏');
};

// 图 19-1 四吉神能破格，四凶神能成格
figs['19-jixiong'] = () => {
  const ji = [['财', '食神带煞，透财为害'], ['官', '春木火旺，见官则忌'], ['印', '煞逢食制，透印无功'], ['食', '财旺生官，露食则杂']];
  const xiong = [['煞', '印绶根轻，透煞为助'], ['伤', '财逢比劫，伤官可解'], ['枭', '食神带煞，灵枭得用'], ['刃', '财逢七煞，刃可解厄']];
  const W = 660, rowH = 34, top = 86, H = top + 4 * rowH + 30;
  let b = text(170, 32, '四吉神 · 用之不当能破格', 'xf-t', 15) + text(490, 32, '四凶神 · 施之得宜能成格', 'xf-g', 15);
  b += text(170, 54, '（第十八章）', 'xf-s', 11) + text(490, 54, '（第十九章）', 'xf-s', 11);
  [[ji, 20, false], [xiong, 340, true]].forEach(([rows, x0, gold]) => {
    b += `<rect x="${x0}" y="${top - 24}" width="300" height="${rows.length * rowH + 8}" rx="4" ${gold ? 'fill="var(--gold,#a07d3c)" fill-opacity=".08" stroke="var(--gold,#a07d3c)"' : 'class="xf-box"'}/>`;
    rows.forEach(([g, t], i) => { const y = top + i * rowH; b += text(x0 + 34, y, g, gold ? 'xf-g' : 'xf-t', 17) + text(x0 + 66, y - 1, t, 'xf-s', 12.5, 'start'); });
  });
  b += text(W / 2, H - 8, '好坏不在神本身，而在用得当与否：如治国之长枪大戟，施之得宜可以戡乱', 'xf-s', 11.5);
  return svg(W, H, b, '四吉神能破格，四凶神能成格');
};

// 图 20-1 四柱先后如人生早晚：生克先后分吉凶
figs['20-xianhou'] = () => {
  const W = 640, H = 270, xs = [140, 260, 380, 500];
  let b = '';
  ['年', '月', '日', '时'].forEach((p, i) => { b += text(xs[i], 36, `${p}柱`, 'xf-s', 12) + text(xs[i], 54, ['早年', '青年', '中年', '晚年'][i], 'xf-s', 10.5); });
  b += line(100, 64, 560, 64, 'xf-ln') + text(580, 68, '先 → 后', 'xf-s', 11, 'start');
  const rowA = 108, rowB = 196;
  b += text(60, rowA - 18, '吉', 'xf-g', 15) + text(60, rowA + 4, '丁先戊后', 'xf-s', 11);
  b += text(60, rowB - 18, '凶', 'xf-t', 15) + text(60, rowB + 4, '戊先丁后', 'xf-s', 11);
  const cell = (x, y, ch, note) => `<text x="${x}" y="${y}" font-size="20" text-anchor="middle" font-family="Noto Serif SC,serif" style="fill:${wx(GAN_WX[ch])}">${ch}</text>` + text(x, y + 20, note, 'xf-s', 10.5);
  b += cell(xs[0], rowA, '丁', '伤官先见') + cell(xs[1], rowA, '戊', '财来解伤') + text(xs[2], rowA, '甲', 'xf-t', 20) + text(xs[2], rowA + 20, '日主', 'xf-s', 10.5) + text(xs[3], rowA + 4, '后运有结局', 'xf-g', 12);
  b += cell(xs[0], rowB, '戊', '官遇财生') + cell(xs[1], rowB, '丁', '后因伤破') + text(xs[2], rowB, '甲', 'xf-t', 20) + text(xs[2], rowB + 20, '日主', 'xf-s', 10.5) + text(xs[3], rowB + 4, '终无结局', 'xf-s', 12);
  b += text(W / 2, H - 10, '甲用酉中辛金为正官：同是财（戊）、伤（丁）并透，先后不同而吉凶迥异', 'xf-s', 11.5);
  return svg(W, H, b, '生克先后分吉凶：四柱由年至时如人生由早至晚');
};


// 图 23-1 六亲的两种配法：宫位与十神
figs['23-liuqin'] = () => {
  const W = 640, H = 290;
  let b = text(160, 32, '一、以宫位配', 'xf-g', 14) + text(470, 32, '二、以十神（用神）配', 'xf-g', 14);
  const pal = [['年', '祖上'], ['月', '父母兄弟'], ['日', '妻'], ['时', '子女']];
  pal.forEach(([p, q], i) => {
    const x = 50 + i * 72;
    b += `<rect x="${x}" y="54" width="62" height="90" rx="4" class="xf-box"/>` + text(x + 31, 86, `${p}柱`, 'xf-t', 15) + text(x + 31, 116, q, 'xf-s', 11);
  });
  b += line(50, 166, 330, 166) + text(190, 186, '自上而下：祖、父、妻、子', 'xf-s', 11);
  const ten = [['正印', '母', '生我者'], ['偏财', '父', '母之正夫'], ['正财', '妻', '我所克制'], ['官煞', '子女', '财（妻）所生'], ['比肩', '兄弟', '与我同类']];
  ten.forEach(([g, q, why], i) => {
    const y = 66 + i * 34;
    b += text(390, y, g, 'xf-t', 14) + text(430, y, '→', 'xf-s', 12) + text(470, y, q, 'xf-g', 14) + text(512, y, why, 'xf-s', 11, 'start');
  });
  b += text(W / 2, 270, '再看四柱中各宫所坐、各星所透的喜忌，参而配之，六亲得力与否即可了然', 'xf-s', 11.5);
  return svg(W, H, b, '六亲的两种配法：以年月日时宫位配，以十神配');
};

// 图 24-1 子息长生歌（以甲乙日为例：子星为庚金，看时支落在庚的哪一宫）
figs['24-zixi'] = () => {
  const ZHI_ALL = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const SONG = { 长生: ['四子', 4], 沐浴: ['一双', 2], 冠带: ['三子', 3], 临官: ['三子', 3], 帝旺: ['五子', 5], 衰: ['二子', 2], 病: ['一子', 1], 死: ['无子', 0], 墓: ['（主夭）', 0], 绝: ['一子', 1], 胎: ['头胎女', 1], 养: ['三留一', 1] };
  const STAGES = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
  const colW = 52, left = 70, base = 210, W = left + STAGES.length * colW + 20, H = 290;
  let b = text(W / 2, 28, '甲乙日主以庚金为子星（阳干长生顺行）：时支落在庚的何宫，子息多寡已有定数', 'xf-s', 12);
  b += line(left - 10, base, W - 20, base, 'xf-box', false);
  STAGES.forEach((st, j) => {
    const z = ZHI_ALL.find(z => changSheng('庚', z) === st);
    const [label, n] = SONG[st];
    const x = left + j * colW + colW / 2;
    const h = n * 24;
    if (h) b += `<rect x="${x - 14}" y="${base - h}" width="28" height="${h}" fill="var(--gold,#a07d3c)" fill-opacity=".22" stroke="var(--gold,#a07d3c)" stroke-width="1"/>`;
    b += text(x, base - h - 8, label, n ? 'xf-g' : 'xf-s', 11);
    b += text(x, base + 22, st, 'xf-s', 11);
    b += `<text x="${x}" y="${base + 46}" font-size="16" text-anchor="middle" font-family="Noto Serif SC,serif" style="fill:${wx(ZHI_WX[z])}">${z}</text>`;
  });
  b += text(left - 34, base + 22, '十二宫', 'xf-s', 10) + text(left - 34, base + 46, '时支', 'xf-s', 10);
  b += text(W / 2, H - 8, '歌诀所言为大略；更须看时干子星是否有用，有用则虽逢死绝亦主子贵', 'xf-s', 11);
  return svg(W, H, b, '子息长生歌：以甲乙日为例，时支落在庚金十二宫的子息之数');
};


// —— 命例图解：四柱 + 十神（由引擎按日干计算），关键字加金框 ——
// examples: [{ name, pillars: ['甲申', ...], keys: { 'g1': '印', 'z0': '官' }, note }]
// keys 的键：g0–g3 为年月日时天干，z0–z3 为地支；值为框旁的说明
const SHORT_GOD = { 正官: '官', 七杀: '煞', 正财: '财', 偏财: '财', 正印: '印', 偏印: '枭', 食神: '食', 伤官: '伤', 比肩: '比', 劫财: '劫' };
const godOf = (dayGan, g) => { const t = tenGod(dayGan, g); return t === '七杀' ? '七煞' : t; };
function chartFig(examples, title) {
  const colW = 74, exW = 4 * colW + 40, W = Math.max(examples.length * (exW + 20) + 20, 360), H = 250;
  let b = '';
  examples.forEach((ex, k) => {
    const x0 = 20 + k * (exW + 20) + 30;
    const day = ex.pillars[2][0];
    b += text(x0 + 2 * colW - colW / 2, 26, ex.name, 'xf-t', 14);
    ['年', '月', '日', '时'].forEach((p, i) => {
      const cx = x0 + i * colW + colW / 2 - colW / 2 + 16;
      const [g, z] = ex.pillars[i];
      const zMain = CANG_GAN[z][0][0];
      b += text(cx, 50, `${p}柱`, 'xf-s', 10.5);
      b += text(cx, 72, i === 2 ? '日元' : godOf(day, g), i === 2 ? 'xf-g' : 'xf-s', 11);
      b += `<text x="${cx}" y="${104}" font-size="26" text-anchor="middle" font-family="Noto Serif SC,serif" style="fill:${wx(GAN_WX[g])}">${g}</text>`;
      b += `<text x="${cx}" y="${144}" font-size="26" text-anchor="middle" font-family="Noto Serif SC,serif" style="fill:${wx(ZHI_WX[z])}">${z}</text>`;
      b += text(cx, 166, `${zMain}·${godOf(day, zMain)}`, 'xf-s', 10.5);
      for (const [key, y] of [[`g${i}`, 80], [`z${i}`, 120]]) {
        if (ex.keys && ex.keys[key]) {
          b += `<rect x="${cx - 19}" y="${y}" width="38" height="32" rx="3" fill="none" stroke="var(--gold,#a07d3c)" stroke-width="1.6"/>`;
          b += `<text x="${cx + 22}" y="${y + 12}" font-size="11" class="xf-g">${esc(ex.keys[key])}</text>`;
        }
      }
    });
    if (ex.note) ex.note.split('\n').forEach((ln, j) => { b += text(x0 + 2 * colW - colW / 2, 196 + j * 18, ln, 'xf-s', 11.5); });
  });
  return svg(W, H, b, title);
}

// 图 31-1 正官格命例
figs['31-zhengguan'] = () => chartFig([
  { name: '薛相公命', pillars: ['甲申', '壬申', '乙巳', '戊寅'], keys: { z1: '官', g1: '印', g3: '财' }, note: '月令申中庚金为正官；壬印、戊财\n中隔乙日，水土不相碍，故为大贵' },
  { name: '李参政命', pillars: ['庚寅', '乙酉', '甲子', '戊辰'], keys: { z1: '官', g0: '煞', g1: '合' }, note: '甲用酉官，年透庚煞混杂；\n乙庚相合，合煞留官，杂而取清' }
], '正官格命例：薛相公命、李参政命');

// 图 33-1 财格命例
figs['33-cai'] = () => chartFig([
  { name: '葛参政命', pillars: ['壬申', '壬子', '戊午', '乙卯'], keys: { g0: '财', g1: '财', g3: '官' }, note: '财星露而生乙木正官，\n劫财退避，露亦不忌' },
  { name: '李御史命', pillars: ['庚辰', '戊子', '戊寅', '甲寅'], keys: { z1: '财', g3: '煞', g0: '食' }, note: '子水为财，甲寅七煞，\n庚金食神制煞生财' }
], '财格命例：葛参政命、李御史命');

// 图 35-1 印绶格命例
figs['35-yinshou'] = () => chartFig([
  { name: '张参政命', pillars: ['丙寅', '戊戌', '辛酉', '戊子'], keys: { z1: '印', g1: '印', g0: '官' }, note: '戌中戊土为印，透戊；\n丙火正官清纯，身旺印强不嫌过' },
  { name: '茅状元命', pillars: ['己巳', '癸酉', '癸未', '庚申'], keys: { z1: '印', g3: '印', g0: '煞' }, note: '酉金为印，庚申又印，身轻印重；\n借己土七煞生印，有所不足始为有情' }
], '印绶格命例：张参政命、茅状元命');


// 图 37-1 食神格命例
figs['37-shishen'] = () => chartFig([
  { name: '梁丞相命', pillars: ['丁未', '癸卯', '癸亥', '癸丑'], keys: { z1: '食', g0: '财' }, note: '卯中乙木为食神，身强食旺；\n年透丁火为财，食神生财，大贵' },
  { name: '常国公命', pillars: ['辛卯', '辛卯', '癸酉', '己未'], keys: { z1: '食', g3: '煞', g1: '印' }, note: '食神不用财而就煞、印：\n己土七煞，辛金印化之，威权显赫' }
], '食神格命例：梁丞相命、常国公命');

// 图 39-1 偏官格命例
figs['39-pianguan'] = () => chartFig([
  { name: '极贵之造', pillars: ['乙亥', '乙酉', '乙卯', '丁丑'], keys: { z1: '煞', g3: '食' }, note: '酉中辛金为七煞，时透丁火食神制之；\n煞旺食强而身健，极等之贵' },
  { name: '脱丞相命', pillars: ['壬辰', '甲辰', '丙戌', '戊戌'], keys: { g0: '煞', g1: '印', g3: '食' }, note: '辰中暗煞，壬水透出；戊土食神太重，\n透甲木印以损其太过，印先食后' }
], '偏官（七煞）格命例');

// 图 41-1 伤官格命例
figs['41-shangguan'] = () => chartFig([
  { name: '孛罗平章命', pillars: ['壬申', '丙午', '甲午', '壬申'], keys: { z1: '伤', g0: '印', g3: '印' }, note: '午中丁火伤官旺，壬水印根深，身又弱；\n夏木逢润，伤官佩印，一品之贵' },
  { name: '罗状元命', pillars: ['甲子', '乙亥', '辛未', '戊子'], keys: { z1: '伤', g0: '财' }, note: '亥中壬水为伤官，亥未会木，\n化伤为财（甲透通根于亥），大为秀气' }
], '伤官格命例：孛罗平章命、罗状元命');


// 图 43-1 五阳干的禄与阳刃：刃在禄前一位
figs['43-yangren'] = () => {
  const yang = TIAN_GAN.filter((g, i) => i % 2 === 0);
  const W = 520, top = 76, rowH = 36, H = top + yang.length * rowH + 30;
  let b = text(100, 40, '阳干', 'xf-s', 12) + text(250, 40, '禄', 'xf-s', 12) + text(400, 40, '阳刃（禄前一位）', 'xf-s', 12);
  b += line(40, 52, W - 40, 52, 'xf-box', false);
  yang.forEach((g, i) => {
    const y = top + i * rowH;
    const z1 = LU[g], z2 = YANG_REN[g];
    b += `<text x="100" y="${y}" font-size="19" text-anchor="middle" font-family="Noto Serif SC,serif" style="fill:${wx(GAN_WX[g])}">${g}</text>`;
    b += `<text x="250" y="${y}" font-size="19" text-anchor="middle" font-family="Noto Serif SC,serif" style="fill:${wx(ZHI_WX[z1])}">${z1}</text>`;
    b += line(272, y - 6, 368, y - 6);
    b += `<rect x="381" y="${y - 22}" width="38" height="30" rx="3" fill="none" stroke="var(--fire,#b5533f)" stroke-width="1.2"/>`;
    b += `<text x="400" y="${y}" font-size="19" text-anchor="middle" font-family="Noto Serif SC,serif" style="fill:${wx(ZHI_WX[z2])}">${z2}</text>`;
  });
  b += text(W / 2, H - 8, '阳刃劫我正财，是正财的七煞；劫之甚者，故不曰劫而曰刃（惟五阳干有之）', 'xf-s', 11);
  return svg(W, H, b, '五阳干的禄与阳刃：甲禄寅刃卯，丙戊禄巳刃午，庚禄申刃酉，壬禄亥刃子');
};

// 图 45-1 十干建禄表
figs['45-jianlu'] = () => {
  const W = 700, H = 170, colW = 58, left = 100;
  let b = text(W / 2, 30, '月令逢日干之禄为建禄格，月令逢劫财为月劫格；禄即是劫，二者同一格论', 'xf-s', 12);
  b += text(left - 14, 76, '日干', 'xf-s', 11, 'end') + text(left - 14, 124, '禄（月令）', 'xf-s', 11, 'end');
  TIAN_GAN.forEach((g, i) => {
    const x = left + 20 + i * colW;
    b += `<text x="${x}" y="80" font-size="21" text-anchor="middle" font-family="Noto Serif SC,serif" style="fill:${wx(GAN_WX[g])}">${g}</text>`;
    b += line(x, 90, x, 104);
    b += `<text x="${x}" y="128" font-size="21" text-anchor="middle" font-family="Noto Serif SC,serif" style="fill:${wx(ZHI_WX[LU[g]])}">${LU[g]}</text>`;
  });
  b += text(W / 2, 160, '日主与月令同气，本身不可为用，须于四柱另取财、官、煞、食为用', 'xf-s', 11.5);
  return svg(W, H, b, '十干建禄表：甲禄寅、乙禄卯、丙戊禄巳、丁己禄午、庚禄申、辛禄酉、壬禄亥、癸禄子');
};

// 图 47-1 弃命从财、弃命从煞命例
figs['47-congge'] = () => chartFig([
  { name: '王十万命（从财）', pillars: ['庚申', '乙酉', '丙申', '乙丑'], keys: { z1: '财', z0: '财', z2: '财' }, note: '四柱皆财而丙火无根，\n舍身从财，格成大富' },
  { name: '李侍郎命（从煞）', pillars: ['乙酉', '乙酉', '乙酉', '甲申'], keys: { z1: '煞', z0: '煞', z2: '煞', z3: '官' }, note: '四柱皆金（官煞）而乙木无根，\n舍身从煞，格成大贵' }
], '弃命从财、弃命从煞命例');

// 图 48-1 五种一方专旺格
figs['48-zhuanwang'] = () => {
  const rows = [['曲直仁寿', '甲乙', '亥卯未 或 寅卯辰', '木'], ['炎上', '丙丁', '寅午戌 或 巳午未', '火'], ['稼穑', '戊己', '辰戌丑未', '土'], ['从革', '庚辛', '巳酉丑 或 申酉戌', '金'], ['润下', '壬癸', '申子辰 或 亥子丑', '水']];
  const W = 600, top = 74, rowH = 38, H = top + rows.length * rowH + 30;
  let b = text(90, 40, '格名', 'xf-s', 12) + text(220, 40, '日主', 'xf-s', 12) + text(390, 40, '地支全局', 'xf-s', 12) + text(530, 40, '偏旺', 'xf-s', 12);
  b += line(30, 52, W - 30, 52, 'xf-box', false);
  rows.forEach(([n, g, z, w], i) => {
    const y = top + i * rowH;
    b += text(90, y, n, 'xf-t', 15) + `<text x="220" y="${y}" font-size="17" text-anchor="middle" font-family="Noto Serif SC,serif" style="fill:${wx(w)}">${g}</text>` + text(390, y, z, 'xf-t', 14) + node(530, y - 6, w, 15, 14);
  });
  b += text(W / 2, H - 8, '气势偏于一方，取运大都顺其旺势；逆其势（如官煞克之）为忌', 'xf-s', 11.5);
  return svg(W, H, b, '五种一方专旺格：曲直仁寿、炎上、稼穑、从革、润下');
};

const out = join(root, 'content/translations/ziping/figs');
mkdirSync(out, { recursive: true });
for (const [name, make] of Object.entries(figs)) { figId = `xf-${name}`; writeFileSync(join(out, `${name}.svg`), make()); }
console.log('生成', Object.keys(figs).length, '张图 →', out);
