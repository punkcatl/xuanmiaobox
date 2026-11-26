// 干支关系：天干五合 / 相冲；地支六合、三合、半合、三会、六冲、相刑、自刑、六害
import { PILLAR_SHORT as LABELS } from './constants.js';
const pairKey = (a, b) => [a, b].sort().join('');

const GAN_HE = { '甲己': '土', '乙庚': '金', '丙辛': '水', '丁壬': '木', '戊癸': '火' };
const GAN_CHONG = ['甲庚', '乙辛', '丙壬', '丁癸'];
const ZHI_LIUHE = { '子丑': '土', '寅亥': '木', '卯戌': '火', '辰酉': '金', '巳申': '水', '午未': '土' };
const ZHI_CHONG = ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'];
const ZHI_HAI = ['子未', '丑午', '寅巳', '卯辰', '申亥', '酉戌'];
const ZHI_XING = ['寅巳', '巳申', '寅申', '丑戌', '戌未', '丑未', '子卯'];
const ZI_XING = ['辰', '午', '酉', '亥'];
export const SANHE = [['申', '子', '辰', '水'], ['亥', '卯', '未', '木'], ['寅', '午', '戌', '火'], ['巳', '酉', '丑', '金']];
// 三刑（三支俱全时另列全称；两两之间的相刑仍逐对列出）
const SANXING = [['寅', '巳', '申', '无恩之刑'], ['丑', '戌', '未', '恃势之刑']];
const SANHUI = [['亥', '子', '丑', '水'], ['寅', '卯', '辰', '木'], ['巳', '午', '未', '火'], ['申', '酉', '戌', '金']];

const norm = list => new Set(list.map(s => pairKey(s[0], s[1])));
const GAN_CHONG_SET = norm(GAN_CHONG);
const ZHI_CHONG_SET = norm(ZHI_CHONG);
const ZHI_HAI_SET = norm(ZHI_HAI);
const ZHI_XING_SET = norm(ZHI_XING);
const GAN_HE_MAP = Object.fromEntries(Object.entries(GAN_HE).map(([k, v]) => [pairKey(k[0], k[1]), v]));
const LIUHE_MAP = Object.fromEntries(Object.entries(ZHI_LIUHE).map(([k, v]) => [pairKey(k[0], k[1]), v]));

/** 两个天干之间的关系 */
export function ganRelation(a, b) {
  const k = pairKey(a, b);
  if (GAN_HE_MAP[k]) return { type: '合', text: `${a}${b}合化${GAN_HE_MAP[k]}` };
  if (GAN_CHONG_SET.has(k)) return { type: '冲', text: `${a}${b}相冲` };
  return null;
}

/** 两个地支之间的关系（可能同时有多种，如丑未既冲又刑） */
export function zhiRelations(a, b) {
  const k = pairKey(a, b);
  const out = [];
  if (LIUHE_MAP[k]) out.push({ type: '合', text: `${a}${b}六合` });
  if (a !== b) {
    for (const [x, y, z, wx] of SANHE) {
      const g = [x, y, z];
      if (g.includes(a) && g.includes(b) && (a === y || b === y)) out.push({ type: '合', text: `${a}${b}半合${wx}局` });
    }
  }
  if (ZHI_CHONG_SET.has(k)) out.push({ type: '冲', text: `${a}${b}相冲` });
  if (ZHI_XING_SET.has(k)) out.push({ type: '刑', text: `${a}${b}相刑` });
  if (a === b && ZI_XING.includes(a)) out.push({ type: '刑', text: `${a}${a}自刑` });
  if (ZHI_HAI_SET.has(k)) out.push({ type: '害', text: `${a}${b}相害` });
  return out;
}


/**
 * 四柱内部的全部关系
 * @param {string[]} values 四柱干支，如 ['壬申','壬子','乙酉','癸未']
 * @returns {Array<{ level: 'gan'|'zhi', type, text, between: number[] }>}
 */
export function chartRelations(values) {
  const gans = values.map(v => v[0]);
  const zhis = values.map(v => v[1]);
  const out = [];
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const g = ganRelation(gans[i], gans[j]);
      if (g) out.push({ level: 'gan', ...g, between: [i, j] });
      zhiRelations(zhis[i], zhis[j]).forEach(r => out.push({ level: 'zhi', ...r, between: [i, j] }));
    }
  }
  // 三合、三会（三支俱全）
  for (const [group, kind] of [[SANHE, '三合'], [SANHUI, '三会']]) {
    for (const [x, y, z, wx] of group) {
      const idx = [x, y, z].map(c => zhis.indexOf(c));
      if (idx.every(i => i >= 0)) out.push({ level: 'zhi', type: '合', text: `${x}${y}${z}${kind}${wx}局`, between: idx.sort((a, b) => a - b) });
    }
  }
  for (const [x, y, z, name] of SANXING) {
    const idx = [x, y, z].map(c => zhis.indexOf(c));
    if (idx.every(i => i >= 0)) out.push({ level: 'zhi', type: '刑', text: `${x}${y}${z}三刑（${name}）`, between: idx.sort((a, b) => a - b) });
  }
  return out.map(r => ({ ...r, where: r.between.map(i => LABELS[i]).join('') }));
}

// 截取前若干条时的优先级：冲先于合；日柱（自身 / 夫妻宫）最要紧，其次月柱（提纲）、年柱、时柱
const PILLAR_RANK = [2, 1, 0, 3];
/**
 * 外来干支与命局的冲、合（用于大运 / 流年 / 流月 / 流日的摘要）
 * @param {{ zhiOnly?: boolean, limit?: number }} opts
 */
export function keyRelations(ganZhi, values, { zhiOnly = false, limit = Infinity } = {}) {
  const rank = r => (r.type === '冲' ? 0 : 10) + PILLAR_RANK[r.with];
  return externalRelations(ganZhi, values)
    .filter(r => (r.type === '冲' || r.type === '合') && (!zhiOnly || r.level === 'zhi'))
    .sort((a, b) => rank(a) - rank(b)) // 稳定排序：同级保持干先支后
    .slice(0, limit);
}

/** 外来干支（大运 / 流年 / 流日）与命局四柱的冲合 */
function externalRelations(ganZhi, values) {
  const out = [];
  values.forEach((v, i) => {
    const g = ganRelation(ganZhi[0], v[0]);
    if (g) out.push({ ...g, level: 'gan', with: i, where: LABELS[i] });
    zhiRelations(ganZhi[1], v[1]).forEach(r => out.push({ ...r, level: 'zhi', with: i, where: LABELS[i] }));
  });
  return out;
}
