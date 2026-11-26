// 定时辰：出生时辰不确定时，排出相邻时辰的候选命盘，用几道“过去的事”是非题比对，看哪个时辰更吻合。
// 这是民间“以事定时”的思路，只能作参考；全部在本地计算，不调用 AI。
import { computeChart } from './index.js';
import { GAN_WX, ZHI_WX, DI_ZHI, tenGod, GOD_CLASS } from './constants.js';
import { computeLiuNian } from './fortune.js';

const CHONG = z => DI_ZHI[(DI_ZHI.indexOf(z) + 6) % 12];

/** 出生信息整体平移若干小时（跨日、跨月由 Date 处理） */
export function shiftInput(input, hours) {
  const d = new Date(Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute) + hours * 3600000);
  return { ...input, year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes() };
}

/**
 * 候选命盘：所填时间及前后各一个时辰（各平移 2 小时，保持在时辰内的相对位置）
 * 四柱相同的去重（如平移后仍落在同一时辰）
 * @returns {{ offset: number, input: object, chart: object, label: string }[]} 按时间先后
 */
export function candidates(input) {
  const out = [];
  for (const offset of [-2, 0, 2]) {
    let chart;
    try { chart = computeChart(shiftInput(input, offset)); } catch (e) { continue; }
    if (out.some(c => c.chart.values.join() === chart.values.join())) continue;
    out.push({ offset, input: shiftInput(input, offset), chart, label: `${chart.values[3][1]}时（${chart.values[3]}）` });
  }
  return out;
}

// 时柱十神 → 性格倾向（时柱主晚年与内在性情，民间常用来辅助定时）
const HOUR_TRAIT = {
  比劫: '性格好强、讲义气，花钱比较大方，不太愿意服输',
  食伤: '口才或才艺不错，爱表达、爱自由，不喜欢被约束',
  财星: '务实、精打细算，对赚钱理财比较上心',
  官杀: '自律、责任心重，对自己要求严格，常有压力感',
  印星: '喜欢独处思考、钻研学问或冷门兴趣，比较依赖安全感'
};
const STRENGTH_TRAIT = {
  身强: '主意大、做事主观，不太听得进别人的劝',
  身弱: '比较在意别人的看法，做决定时容易犹豫、需要人支持'
};

/**
 * 能区分候选命盘的是非题
 * 每题 yes：答“是”时得分的候选序号；答“否”时这些候选扣分
 * @returns {{ id: string, text: string, yes: number[] }[]}
 */
export function rectifyQuestions(cands, currentYear) {
  const qs = [];
  const n = cands.length;
  const distinct = (key) => {
    const groups = new Map();
    cands.forEach((c, i) => { const k = key(c); if (k) groups.set(k, [...(groups.get(k) || []), i]); });
    return groups.size > 1 ? groups : null; // 所有候选都一样就无法区分
  };

  // 1. 时柱逢冲之年：时支被流年冲动，多应在居所、工作或子女晚辈方面的变动
  cands.forEach((c, i) => {
    const hz = c.chart.values[3][1];
    const from = c.chart.birthYear + 16;
    const hits = computeLiuNian(c.chart.values, from, Math.max(0, currentYear - from), currentYear)
      .filter(y => y.ganZhi[1] === CHONG(hz)).slice(-2);
    hits.forEach(y => {
      if (qs.some(q => q.id === `chong-${y.year}`)) return;
      // 只有本候选的时支被冲：其他候选在同年不受冲
      const yes = cands.map((cc, j) => (CHONG(cc.chart.values[3][1]) === y.ganZhi[1] ? j : -1)).filter(j => j >= 0);
      if (yes.length === n) return;
      qs.push({ id: `chong-${y.year}`, text: `${y.year} 年（${y.ganZhi}）前后，是否有搬家、换工作，或家中晚辈 / 子女方面的较大变动？`, yes });
    });
  });

  qs.sort((a, b) => Number(a.id.slice(6)) - Number(b.id.slice(6))); // 逢冲之年按年份排列

  // 2. 时柱十神的性格倾向
  const byGod = distinct(c => GOD_CLASS[tenGod(c.chart.values[2][0], c.chart.values[3][0])]);
  if (byGod) byGod.forEach((idx, cls) => qs.push({ id: `god-${cls}`, text: `你是否${HOUR_TRAIT[cls]}？`, yes: idx }));

  // 3. 旺衰不同（时辰改变了身强身弱）
  const byStrength = distinct(c => (c.chart.balance.status === '中和' ? null : c.chart.balance.status));
  if (byStrength) byStrength.forEach((idx, st) => qs.push({ id: `st-${st}`, text: `你是否${STRENGTH_TRAIT[st]}？`, yes: idx }));

  // 4. 兄弟姐妹：比劫多寡（天干与地支本气中与日主同五行的个数）
  const biJie = c => {
    const dw = GAN_WX[c.chart.values[2][0]];
    return c.chart.values.reduce((s, v, i) => s + (i !== 2 && GAN_WX[v[0]] === dw ? 1 : 0) + (ZHI_WX[v[1]] === dw ? 1 : 0), 0);
  };
  const counts = cands.map(biJie);
  const max = Math.max(...counts);
  if (max - Math.min(...counts) >= 1) {
    qs.push({ id: 'siblings', text: '你是否有两个或以上的亲兄弟姐妹？', yes: counts.map((v, i) => (v === max ? i : -1)).filter(i => i >= 0) });
  }
  return qs;
}

/**
 * 计分：是 +1、否 −1（对 yes 中的候选），不确定不计
 * @param {Record<string, 'yes'|'no'|'unsure'>} answers
 * @returns {{ scores: number[], best: number | null }} best 为得分唯一最高的候选序号；并列或未作答为 null
 */
export function scoreCandidates(cands, questions, answers) {
  const scores = cands.map(() => 0);
  questions.forEach(q => {
    const a = answers[q.id];
    if (a !== 'yes' && a !== 'no') return;
    q.yes.forEach(i => { scores[i] += a === 'yes' ? 1 : -1; });
  });
  const top = Math.max(...scores);
  const leaders = scores.map((s, i) => (s === top ? i : -1)).filter(i => i >= 0);
  const answered = questions.some(q => answers[q.id] === 'yes' || answers[q.id] === 'no');
  return { scores, best: answered && leaders.length === 1 ? leaders[0] : null };
}
