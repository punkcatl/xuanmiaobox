// 分享卡片：Canvas 绘制竖版“墨夜鎏金”海报（不依赖第三方截图库）
import { WX_ORDER } from '../engine/constants.js';
import { formatDateTime } from './date.js';
import { SEAL, SEAL_FRAME, GLYPH } from '../data/seal.js';

// 配色取自 style.css 的 CSS 变量（单一来源）；读不到时用同值兜底
const VARS = { bg: ['--bg', '#0c0d10'], ink: ['--ink', '#e8e1d2'], dim: ['--ink-3', '#7c776d'], gold: ['--gold', '#c9a96e'], cinnabar: ['--cinnabar', '#b23a2a'],
  木: ['--wood', '#86a07c'], 火: ['--fire', '#c66a56'], 土: ['--earth', '#b99a68'], 金: ['--metal', '#cfc9bb'], 水: ['--water', '#7590a6'] };
const C = { line: 'rgba(232,225,210,0.12)' };
function loadPalette() {
  const css = typeof document !== 'undefined' ? getComputedStyle(document.documentElement) : null;
  for (const [k, [name, fallback]] of Object.entries(VARS)) C[k] = (css && css.getPropertyValue(name).trim()) || fallback;
}
const SERIF = '"Noto Serif SC", "Songti SC", serif';
const SANS = '"Noto Sans SC", "PingFang SC", sans-serif';

function seal(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 52, s / 52);
  ctx.translate(-6, -3);
  ctx.fillStyle = C.cinnabar;
  ctx.fill(new Path2D(SEAL));
  ctx.strokeStyle = '#f3ebdd';
  ctx.lineWidth = 1.2;
  ctx.stroke(new Path2D(SEAL_FRAME));
  ctx.fillStyle = '#f3ebdd';
  ctx.fill(new Path2D(GLYPH)); // 与网页印章同一字形路径
  ctx.restore();
}

const summaryRows = r => [
  ['格局', r.geju.name],
  ['旺衰', `${r.balance.status} · 喜${r.balance.useGod.join('、')}`],
  ['五行', WX_ORDER.map(w => `${w}${r.wuXing[w]}`).join('　')],
  ['大运', r.大运.slice(0, 5).map(d => d.ganZhi).join('　')]
];

/**
 * @param {object} result computeChart 的结果
 * @param {string} name 命主称呼（可空）
 * @returns {Promise<Blob>}
 */
export async function drawShareCard(result, name = '') {
  loadPalette();
  const rows = summaryRows(result);
  // 字体样式是异步加载的：先确保 @font-face 已注册；失败（如离线）则用系统字体继续绘制
  let fontsReady = true;
  try { await import('../fonts.js'); } catch (e) { fontsReady = false; }
  if (fontsReady && document.fonts) {
    // 字体按 unicode-range 分片：用卡片上实际出现的文字预加载每个字重
    const text = ['玄喵盒子乾造坤造年月日时柱日元', name, result.values.join(''), result.bazi.map(p => p.shiShen + p.naYin).join(''),
      rows.flat().join(''), '知命而不困于命仅供文化研习参考0123456789:·'].join('');
    // 个别字体分片下载失败（离线 / 404）时继续用系统字体绘制
    await Promise.allSettled([`600 120px ${SERIF}`, `400 30px ${SERIF}`, `400 30px ${SANS}`].map(f => document.fonts.load(f, text)));
  }
  const W = 1080;
  const H = 1500;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d');

  // 底色与光晕
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, 420, 40, W / 2, 420, 640);
  g.addColorStop(0, 'rgba(201,169,110,0.16)');
  g.addColorStop(1, 'rgba(201,169,110,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(201,169,110,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(48, 48, W - 96, H - 96);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  seal(ctx, W / 2 - 30, 110, 60);
  ctx.fillStyle = C.ink;
  ctx.font = `600 52px ${SERIF}`;
  ctx.fillText('玄 喵 盒 子', W / 2, 250);
  ctx.fillStyle = C.dim;
  ctx.font = `400 26px ${SANS}`;
  const i = result.input;
  ctx.fillText(`${name ? name + ' · ' : ''}${i.gender === 'male' ? '乾造' : '坤造'} · ${formatDateTime(i)}`, W / 2, 300, W - 200); // 限宽：长称呼时自动压缩，不超出边框

  // 四柱
  const colW = 200;
  const x0 = W / 2 - colW * 1.5;
  result.bazi.forEach((p, k) => {
    const x = x0 + k * colW;
    ctx.fillStyle = C.dim;
    ctx.font = `400 26px ${SANS}`;
    ctx.fillText(p.label, x, 400);
    ctx.fillStyle = k === 2 ? C.cinnabar : C.gold;
    ctx.font = `400 24px ${SANS}`;
    ctx.fillText(k === 2 ? '日元' : p.shiShen, x, 445);
    ctx.font = `600 120px ${SERIF}`;
    ctx.fillStyle = C[p.wuXing.tianGan];
    ctx.fillText(p.value[0], x, 590);
    ctx.fillStyle = C[p.wuXing.diZhi];
    ctx.fillText(p.value[1], x, 740);
    ctx.fillStyle = C.dim;
    ctx.font = `400 24px ${SANS}`;
    ctx.fillText(p.naYin, x, 800);
  });

  // 分隔
  ctx.strokeStyle = C.line;
  ctx.beginPath();
  ctx.moveTo(140, 860);
  ctx.lineTo(W - 140, 860);
  ctx.stroke();

  // 摘要
  ctx.textAlign = 'left';
  rows.forEach(([k, v], r) => {
    const y = 950 + r * 92;
    ctx.fillStyle = C.gold;
    ctx.font = `400 28px ${SERIF}`;
    ctx.fillText(k, 160, y);
    ctx.fillStyle = C.ink;
    ctx.font = `400 34px ${SERIF}`;
    ctx.fillText(v, 290, y);
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = C.dim;
  ctx.font = `400 22px ${SANS}`;
  ctx.fillText('知命而不困于命 · 仅供文化研习参考', W / 2, H - 110);

  // 画布过大 / 内存不足时 toBlob 回调 null：视为失败，走“生成失败”提示
  return new Promise((resolve, reject) => cv.toBlob(b => (b ? resolve(b) : reject(new Error('画布导出失败'))), 'image/png'));
}
