// 八字合盘：可解释的加减分（日柱合冲、生肖合冲、喜用互补、五行互补）
import { WX_ORDER, GAN_WX, wxTotal } from './constants.js';
import { describeCorrections, BaziError } from './bazi.js';
import { computeCore } from './core.js';
import { ganRelation, zhiRelations } from './relations.js';

function pillarsOf(person, who) {
  try {
    return computeCore(person);
  } catch (e) {
    if (e instanceof BaziError) throw new BaziError(`${who}：${e.message}`);
    throw e;
  }
}

const share = (w, el) => w[el] / (wxTotal(w) || 1);

/**
 * 计算合盘因素
 * @returns {{ score: number, factors: Array<{ label, delta, text }> }}
 */
export function compatFactors(a, b) {
  const factors = [];
  const add = (label, delta, text) => factors.push({ label, delta, text });
  const [ga, gb] = [a.values[2][0], b.values[2][0]];
  const [za, zb] = [a.values[2][1], b.values[2][1]];
  const [ya, yb] = [a.values[0][1], b.values[0][1]];

  const gr = ganRelation(ga, gb);
  if (gr && gr.type === '合') add('日干相合', 12, `${gr.text}，两人心意容易相通。`);
  if (gr && gr.type === '冲') add('日干相冲', -6, `${gr.text}，观念差异较明显，需要多沟通。`);

  for (const r of zhiRelations(za, zb)) {
    if (r.type === '合') add('夫妻宫相合', r.text.includes('六合') ? 10 : 6, `日支${r.text}，相处默契。`);
    if (r.type === '冲') add('夫妻宫相冲', -8, `日支${r.text}，生活习惯或节奏易有摩擦。`);
    if (r.type === '刑' || r.type === '害') add('夫妻宫刑害', -4, `日支${r.text}，宜多体谅对方。`);
  }
  for (const r of zhiRelations(ya, yb)) {
    if (r.type === '合') add('生肖相合', 5, `年支${r.text}，家庭背景与价值观易契合。`);
    if (r.type === '冲') add('生肖相冲', -5, `年支${r.text}，双方家庭观念可能不同。`);
  }

  // 喜用互补：对方命局中自己的喜用五行是否充足
  const [wa, wb, ba, bb] = [a.weighted, b.weighted, a.balance, b.balance];
  const helpA = ba.useGod.filter(el => share(wb, el) >= 0.22);
  const helpB = bb.useGod.filter(el => share(wa, el) >= 0.22);
  if (helpA.length) add('乙方补甲方', 8, `甲方喜${ba.useGod.join('、')}，乙方命中${helpA.join('、')}充足，能带给甲方助力。`);
  if (helpB.length) add('甲方补乙方', 8, `乙方喜${bb.useGod.join('、')}，甲方命中${helpB.join('、')}充足，能带给乙方助力。`);

  // 五行互补：一方缺失的五行，另一方有
  const lackA = WX_ORDER.filter(el => wa[el] === 0 && wb[el] > 0);
  const lackB = WX_ORDER.filter(el => wb[el] === 0 && wa[el] > 0);
  if (lackA.length || lackB.length) {
    add('五行互补', 4, [lackA.length && `甲方缺${lackA.join('、')}而乙方有`, lackB.length && `乙方缺${lackB.join('、')}而甲方有`].filter(Boolean).join('；') + '。');
  }

  const raw = 60 + factors.reduce((s, f) => s + f.delta, 0);
  return { score: Math.max(30, Math.min(98, raw)), factors };
}

export function compatReading(a, b, score, factors) {
  const da = GAN_WX[a.values[2][0]];
  const db = GAN_WX[b.values[2][0]];
  const level = score >= 80 ? '契合度高，彼此助力明显。' : score >= 65 ? '契合度良好，相处较为顺畅。' : score >= 50 ? '契合度中等，有互补也有差异，需要用心经营。' : '差异较多，需要更多理解与包容。';
  const pos = factors.filter(f => f.delta > 0);
  const neg = factors.filter(f => f.delta < 0);
  return [
    { k: '契合度', v: level },
    { k: '日主', v: da === db ? `两人日主同为${da}，性情相近，容易理解彼此，也要留意各自坚持己见。` : `甲方日主属${da}，乙方日主属${db}，性情各有所长。` },
    { k: '助力', v: pos.length ? pos.map(f => f.text).join('') : '两人命局之间没有特别明显的合与互补，关系平淡而稳定。' },
    { k: '留意', v: neg.length ? neg.map(f => f.text).join('') : '两人命局之间没有明显的冲刑，相处少有硬性摩擦。' },
    { k: '相处建议', v: '合盘只反映先天倾向。尊重差异、坦诚沟通，比任何命理结论都更重要。' }
  ];
}

export function computeCompat(p1, p2) {
  const a = pillarsOf(p1, '甲方');
  const b = pillarsOf(p2, '乙方');
  const { score, factors } = compatFactors(a, b);
  return {
    party1: { bazi: a.pillars, notes: describeCorrections(p1, a.time, a.location) },
    party2: { bazi: b.pillars, notes: describeCorrections(p2, b.time, b.location) },
    score,
    factors,
    reading: compatReading(a, b, score, factors)
  };
}
