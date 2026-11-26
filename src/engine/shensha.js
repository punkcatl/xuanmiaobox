// 常用神煞（各流派起法不一，此处取通行口诀，并注明起法）
import { LU, YANG_REN } from './constants.js';
import { SANHE } from './relations.js';
const BY_DAY_GAN = {
  天乙贵人: { 甲: '丑未', 戊: '丑未', 庚: '丑未', 乙: '子申', 己: '子申', 丙: '亥酉', 丁: '亥酉', 壬: '卯巳', 癸: '卯巳', 辛: '寅午' },
  太极贵人: { 甲: '子午', 乙: '子午', 丙: '卯酉', 丁: '卯酉', 戊: '辰戌丑未', 己: '辰戌丑未', 庚: '寅亥', 辛: '寅亥', 壬: '巳申', 癸: '巳申' },
  文昌: { 甲: '巳', 乙: '午', 丙: '申', 丁: '酉', 戊: '申', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯' },
  禄神: LU,
  羊刃: YANG_REN
};
// 除日干外兼以年干起的神煞
const ALSO_BY_YEAR_GAN = new Set(['天乙贵人']);
// 以年支或日支所在三合局起：地支 → 所在三合局的中神（子、午、酉、卯），三合局取自 relations.js
const SANHE_MID = Object.fromEntries(SANHE.flatMap(([a, b, c]) => [a, b, c].map(z => [z, b])));
// 各神煞按三合局（以中神标记）所落地支
const BY_SANHE = {
  桃花: { 子: '酉', 午: '卯', 酉: '午', 卯: '子' },
  驿马: { 子: '寅', 午: '申', 酉: '亥', 卯: '巳' },
  华盖: { 子: '辰', 午: '戌', 酉: '丑', 卯: '未' },
  将星: { 子: '子', 午: '午', 酉: '酉', 卯: '卯' },
  劫煞: { 子: '巳', 午: '亥', 酉: '寅', 卯: '申' },
  亡神: { 子: '亥', 午: '巳', 酉: '申', 卯: '寅' }
};
// 以年支起
const HONG_LUAN = { 子: '卯', 丑: '寅', 寅: '丑', 卯: '子', 辰: '亥', 巳: '戌', 午: '酉', 未: '申', 申: '未', 酉: '午', 戌: '巳', 亥: '辰' };
const TIAN_XI = { 子: '酉', 丑: '申', 寅: '未', 卯: '午', 辰: '巳', 巳: '辰', 午: '卯', 未: '寅', 申: '丑', 酉: '子', 戌: '亥', 亥: '戌' };
const GU_GUA = { 亥: ['寅', '戌'], 子: ['寅', '戌'], 丑: ['寅', '戌'], 寅: ['巳', '丑'], 卯: ['巳', '丑'], 辰: ['巳', '丑'], 巳: ['申', '辰'], 午: ['申', '辰'], 未: ['申', '辰'], 申: ['亥', '未'], 酉: ['亥', '未'], 戌: ['亥', '未'] };
// 以月支起（查天干或地支）
const TIAN_DE = { 寅: '丁', 卯: '申', 辰: '壬', 巳: '辛', 午: '亥', 未: '甲', 申: '癸', 酉: '寅', 戌: '丙', 亥: '乙', 子: '巳', 丑: '庚' };
const YUE_DE = { 寅: '丙', 午: '丙', 戌: '丙', 申: '壬', 子: '壬', 辰: '壬', 亥: '甲', 卯: '甲', 未: '甲', 巳: '庚', 酉: '庚', 丑: '庚' };

/** 吉神（其余为中性或凶神） */
export const SHENSHA_GOOD = new Set(['天乙贵人', '太极贵人', '文昌', '禄神', '天德贵人', '月德贵人', '将星', '红鸾', '天喜']);

export const SHENSHA_INFO = {
  天乙贵人: '最吉之神，逢凶化吉，易得贵人相助。',
  太极贵人: '主聪明好学，喜神秘文化与哲理。',
  文昌: '主聪慧、文采，利读书考试。',
  禄神: '主衣食俸禄，代表自身的根基与收入。',
  羊刃: '刚烈之星，主果敢魄力，过旺则易冲动。',
  桃花: '主人缘、魅力与艺术气质，也与感情相关。',
  驿马: '主奔波、迁移、出行与变动。',
  华盖: '主孤高、悟性，与艺术、宗教、玄学有缘。',
  将星: '主领导才能与掌控力。',
  劫煞: '主波折、意外，宜谨慎行事。',
  亡神: '主心机深沉，亦主耗损，宜修身养性。',
  红鸾: '喜庆之星，主婚恋喜事。',
  天喜: '喜庆之星，主喜事、添丁。',
  孤辰: '主性情孤独，与六亲缘薄。',
  寡宿: '主性情清冷，宜多沟通。',
  天德贵人: '主仁慈宽厚，逢凶化吉。',
  月德贵人: '主心性善良，平安少灾。'
};

/**
 * 计算四柱上的神煞
 * @param {string[]} values 四柱干支
 * @returns {string[][]} 每柱的神煞名列表
 */
export function computeShensha(values) {
  const gans = values.map(v => v[0]);
  const zhis = values.map(v => v[1]);
  const [yearZhi, monthZhi, dayGan] = [zhis[0], zhis[1], gans[2]];
  const result = values.map(() => new Set());

  for (const [name, table] of Object.entries(BY_DAY_GAN)) {
    const bases = ALSO_BY_YEAR_GAN.has(name) ? [dayGan, gans[0]] : [dayGan];
    for (const g of bases) {
      const targets = table[g] || '';
      zhis.forEach((z, i) => { if (targets.includes(z)) result[i].add(name); });
    }
  }
  // 分别以年支（第 0 柱）、日支（第 2 柱）起，起算柱本身不计
  for (const baseIdx of [0, 2]) {
    const mid = SANHE_MID[zhis[baseIdx]];
    for (const [name, byMid] of Object.entries(BY_SANHE)) {
      zhis.forEach((z, i) => { if (i !== baseIdx && z === byMid[mid]) result[i].add(name); });
    }
  }
  zhis.forEach((z, i) => {
    if (i !== 0 && z === HONG_LUAN[yearZhi]) result[i].add('红鸾');
    if (i !== 0 && z === TIAN_XI[yearZhi]) result[i].add('天喜');
    if (i !== 0 && z === GU_GUA[yearZhi][0]) result[i].add('孤辰');
    if (i !== 0 && z === GU_GUA[yearZhi][1]) result[i].add('寡宿');
  });
  values.forEach((v, i) => {
    if (v.includes(TIAN_DE[monthZhi])) result[i].add('天德贵人');
    if (v[0] === YUE_DE[monthZhi]) result[i].add('月德贵人');
  });
  return result.map(s => [...s]);
}
