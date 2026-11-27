// 分主题解读的命理要素：由引擎先算好“该看哪里、看到了什么”，AI 只负责讲解，不自行推算
import { GAN_WX, ZHI_WX, CANG_GAN, WX_ORDER, SHENG, KE, PILLAR_SHORT, tenGod, wxTotal } from './constants.js';
import { computeLiuNian, computeLiuYue, ganZhiTone } from './fortune.js';
import { keyRelations } from './relations.js';
import { compatFactors } from './compat.js';

export const TOPICS = {
  overall: { label: '综合', focus: '命局概览（格局与旺衰）、性格特点、事业财运、感情婚姻、健康提示、当前大运与近年流年、建议' },
  career: { label: '事业', focus: '适合的行业与工作方式、事业宫与官杀/食伤/印星的配置、当前大运对事业的影响、未来几年事业的机遇与风险年份' },
  wealth: { label: '财运', focus: '财星强弱与求财方式（正财/偏财、守财/开拓）、财库、比劫争财的风险、未来几年财运起伏与理财建议' },
  love: { label: '感情', focus: '配偶星与夫妻宫的状态、感情模式与适合的伴侣类型、婚恋时机（哪些年份易有感情进展或波动）、相处建议' },
  health: { label: '健康', focus: '五行偏旺偏弱对应的身体系统、需要留意的年份、作息饮食等养生建议（明确提示以医生诊断为准）' },
  children: { label: '子女', focus: '子女星与子女宫（时柱）的状态、与子女的缘分与相处、子女相关的时机' },
  year: { label: '今年运势', focus: '今年流年总论（事业、财运、感情、健康分述）、逐月要点（只点出较好与需留意的月份）、今年的趋避建议' }
};
export const isTopic = t => typeof t === 'string' && Object.prototype.hasOwnProperty.call(TOPICS, t);

/** 五行相对日主的十神类别 */
function classOf(dayWx, wx) {
  if (wx === dayWx) return '比劫';
  if (SHENG[wx] === dayWx) return '印星';
  if (SHENG[dayWx] === wx) return '食伤';
  if (KE[dayWx] === wx) return '财星';
  return '官杀';
}
const wxOfClass = (dayWx, cls) => WX_ORDER.find(w => classOf(dayWx, w) === cls);

/** 某五行在命局中的力量描述（藏干加权占比） */
function strength(weighted, wx) {
  const share = (weighted[wx] || 0) / (wxTotal(weighted) || 1);
  const pct = Math.round(share * 100);
  const level = share === 0 ? '命中全无' : share < 0.06 ? '极弱' : share < 0.15 ? '偏弱' : share < 0.3 ? '适中' : '偏旺';
  return `${wx}占${pct}%，${level}`;
}

/** 命局中某十神（具体名，如正官）出现的位置：天干透出 / 地支藏干 */
function godPositions(values, names) {
  const dayGan = values[2][0];
  const out = [];
  values.forEach((v, i) => {
    if (i !== 2 && names.includes(tenGod(dayGan, v[0]))) out.push(`${PILLAR_SHORT[i]}干${v[0]}（${tenGod(dayGan, v[0])}，透出）`);
    CANG_GAN[v[1]].forEach(([g], k) => {
      if (names.includes(tenGod(dayGan, g))) out.push(`${PILLAR_SHORT[i]}支${v[1]}藏${g}（${tenGod(dayGan, g)}，${k === 0 ? '本气' : '余气'}）`);
    });
  });
  return out.length ? out.join('、') : '原局不见';
}

// 各五行的库（墓）：辰为水库、戌为火库、丑为金库、未为木库，土随水寄辰
const KU = { 水: '辰', 土: '辰', 火: '戌', 金: '丑', 木: '未' };
const ORGAN = { 木: '肝胆、筋骨、眼睛', 火: '心脏血管、血压、小肠', 土: '脾胃、消化系统、肌肉', 金: '肺与呼吸道、大肠、皮肤', 水: '肾与泌尿生殖系统、耳、骨骼' };

/** 涉及某柱（按序号）的原局刑冲合害 */
const relationsAt = (chart, idx) => chart.relations.filter(r => r.between && r.between.includes(idx)).map(r => r.text);

/** 流年简表：年份 干支 十神 吉凶 + 与命局的冲合 */
function liunianLines(chart, from, count, currentYear, filter) {
  const TONE = { good: '吉', bad: '凶', mixed: '平' };
  return computeLiuNian(chart.values, from, count, currentYear, chart.balance)
    .filter(y => !filter || filter(y))
    .map(y => `${y.year} ${y.ganZhi}（${y.shiShen}，${TONE[y.tone]}）${y.relations.length ? '：' + y.relations.join('、') : ''}`);
}

/** 当前所处大运 */
function currentDayun(chart, currentYear) {
  return chart.大运.find(d => currentYear >= d.fromYear && currentYear < d.toYear) || null;
}

/**
 * 主题要素（纯文本行），附在基础命盘提示词之后
 * @param chart computeChart 的结果
 * @param {string} topic TOPICS 的键
 * @param {number} currentYear 命理当前年（立春换年）
 */
export function topicFacts(chart, topic, currentYear) {
  const { values, weighted, balance } = chart;
  const dayGan = values[2][0];
  const dayWx = GAN_WX[dayGan];
  const female = chart.input.gender === 'female';
  const cur = currentDayun(chart, currentYear);
  const lines = [
    `命理当前年：${currentYear}年`,
    `喜用主次：${balance.useGod.join(' > ')}；忌：${balance.avoidGod.join('、')}`,
    cur ? `当前大运：${cur.ganZhi}（${cur.fromYear}–${cur.toYear}，${cur.shiShen}）——${cur.analysis}` : '当前尚未起运或大运已走完'
  ];
  const next = chart.大运.find(d => d.fromYear > currentYear);
  if (next) lines.push(`下一步大运：${next.ganZhi}（${next.fromYear}年起，${next.shiShen}）——${next.analysis}`);
  const cls = c => wxOfClass(dayWx, c);
  const all = chart.bazi.flatMap(p => p.shensha.map(s => `${s}（${p.label}）`));

  switch (topic) {
    case 'career':
      lines.push(
        `格局：${chart.geju.name}`,
        `官杀（${cls('官杀')}，代表职位、规则、压力）：${strength(weighted, cls('官杀'))}；位置：${godPositions(values, ['正官', '七杀'])}`,
        `食伤（${cls('食伤')}，代表才华、技术、表达）：${strength(weighted, cls('食伤'))}；位置：${godPositions(values, ['食神', '伤官'])}`,
        `印星（${cls('印星')}，代表学历、资质、靠山）：${strength(weighted, cls('印星'))}`,
        `月柱（事业宫/门户）${values[1]}：${relationsAt(chart, 1).join('、') || '无刑冲'}`,
        '未来十年流年：', ...liunianLines(chart, currentYear, 10, currentYear)
      );
      break;
    case 'wealth': {
      const cai = cls('财星');
      const ku = KU[cai];
      const kuAt = values.map((v, i) => (v[1] === ku ? PILLAR_SHORT[i] + '支' : null)).filter(Boolean);
      lines.push(
        `财星（${cai}）：${strength(weighted, cai)}；位置：${godPositions(values, ['正财', '偏财'])}`,
        `财库（${cai}之库在${ku}）：${kuAt.length ? '原局见于' + kuAt.join('、') + (chart.relations.some(r => r.type === '冲' && r.text.includes(ku)) ? '，且逢冲（冲开财库）' : '') : '原局不见'}`,
        `比劫（${dayWx}，会分夺财星）：${strength(weighted, dayWx)}`,
        `食伤（${cls('食伤')}，食伤生财）：${strength(weighted, cls('食伤'))}`,
        '未来十年流年：', ...liunianLines(chart, currentYear, 10, currentYear)
      );
      break;
    }
    case 'love': {
      const starCls = female ? '官杀' : '财星';
      const names = female ? ['正官', '七杀'] : ['正财', '偏财'];
      const dayZhi = values[2][1];
      lines.push(
        `命主为${female ? '女命：以官杀为夫星（正官为夫、七杀为偏夫）' : '男命：以财星为妻星（正财为妻、偏财为偏缘）'}`,
        `配偶星（${cls(starCls)}）：${strength(weighted, cls(starCls))}；位置：${godPositions(values, names)}`,
        `夫妻宫（日支）${dayZhi}，藏${CANG_GAN[dayZhi].map(([g]) => g + tenGod(dayGan, g)).join('、')}；原局关系：${relationsAt(chart, 2).join('、') || '无刑冲'}`,
        `感情相关神煞：${all.filter(s => /红鸾|天喜|桃花|咸池|孤辰|寡宿|华盖/.test(s)).join('、') || '无'}`,
        '未来十年中与夫妻宫冲合、或配偶星透出的流年：',
        ...liunianLines(chart, currentYear, 10, currentYear, y => {
          const touchDay = keyRelations(y.ganZhi, values, { zhiOnly: true }).some(r => r.with === 2);
          return touchDay || classOf(dayWx, GAN_WX[y.ganZhi[0]]) === starCls || classOf(dayWx, ZHI_WX[y.ganZhi[1]]) === starCls;
        })
      );
      break;
    }
    case 'health': {
      const total = wxTotal(weighted) || 1;
      lines.push(
        '五行力量与对应身体系统（传统说法）：',
        ...WX_ORDER.map(w => `${strength(weighted, w)} → ${ORGAN[w]}${weighted[w] / total >= 0.3 ? '（过旺）' : weighted[w] / total < 0.06 ? '（不足）' : ''}`),
        `调候：${chart.tiaohou.hint}`,
        '未来十年中忌神当旺（标“凶”）的流年需多注意身体：',
        ...liunianLines(chart, currentYear, 10, currentYear, y => y.tone === 'bad')
      );
      break;
    }
    case 'children': {
      const starCls = female ? '食伤' : '官杀';
      lines.push(
        `命主为${female ? '女命：以食伤为子女星' : '男命：以官杀为子女星'}`,
        `子女星（${cls(starCls)}）：${strength(weighted, cls(starCls))}；位置：${godPositions(values, female ? ['食神', '伤官'] : ['正官', '七杀'])}`,
        `子女宫（时柱）${values[3]}：主星${chart.bazi[3].shiShen}，星运${chart.bazi[3].diShi}；原局关系：${relationsAt(chart, 3).join('、') || '无刑冲'}`,
        '未来十年流年：', ...liunianLines(chart, currentYear, 10, currentYear)
      );
      break;
    }
    case 'year': {
      const TONE = { good: '吉', bad: '凶', mixed: '平' };
      const [y] = computeLiuNian(values, currentYear, 1, currentYear, balance);
      lines.push(
        `今年流年 ${y.ganZhi}：${y.analysis}${y.relations.length ? '；与命局：' + y.relations.join('、') : ''}`,
        '今年各月（以节气换月）：',
        ...computeLiuYue(values, currentYear).map(m => {
          const t = ganZhiTone(m.ganZhi, balance);
          return `${m.label}（${m.jie}起）${m.ganZhi} ${m.shiShen} ${TONE[t.tone]}${m.relations.length ? '：' + m.relations.join('、') : ''}`;
        })
      );
      break;
    }
    default:
      lines.push('近五年流年：', ...liunianLines(chart, currentYear, 5, currentYear));
  }
  return lines;
}


/**
 * “先断过去”：从近二十年（成年后）的流年中挑出命理上最可能有事发生的年份，供先生开场验证
 * 依据（按分量）：天克地冲日柱 > 流年冲夫妻宫（日支）> 交入新大运 > 冲月令（月支）> 合夫妻宫
 * @returns {{ year: number, ganZhi: string, weight: number, signs: string[] }[]} 按年份排序，最多 limit 条
 */
export function pastEvents(chart, currentYear, limit = 5) {
  const { values } = chart;
  const from = Math.max(chart.birthYear + 18, currentYear - 20);
  const out = [];
  for (const y of computeLiuNian(values, from, Math.max(0, currentYear - from), currentYear, chart.balance)) {
    const rels = keyRelations(y.ganZhi, values);
    const at = (idx, type, level) => rels.some(r => r.with === idx && r.type === type && (!level || r.level === level));
    const signs = [];
    let weight = 0;
    if (at(2, '冲', 'gan') && at(2, '冲', 'zhi')) { signs.push('流年与日柱天克地冲：本人生活有较大转折（感情、健康、居所或工作）'); weight += 5; }
    else if (at(2, '冲', 'zhi')) { signs.push(`流年${y.ganZhi[1]}冲夫妻宫（日支${values[2][1]}）：感情、婚姻或家庭关系有变动`); weight += 3; }
    const dy = chart.大运.find(d => d.fromYear === y.year);
    if (dy) { signs.push(`交入${dy.ganZhi}大运（${dy.shiShen}）：人生阶段转换`); weight += 2; }
    if (at(1, '冲', 'zhi')) { signs.push(`流年${y.ganZhi[1]}冲月令（月支${values[1][1]}）：工作、住所变动，或与父母兄弟有关的事`); weight += 2; }
    if (at(2, '合', 'zhi')) { signs.push(`流年${y.ganZhi[1]}合夫妻宫：恋爱、结婚等感情喜事的机会`); weight += 1.5; }
    if (weight) out.push({ year: y.year, ganZhi: y.ganZhi, weight, signs });
  }
  return out.sort((a, b) => b.weight - a.weight || b.year - a.year).slice(0, limit).sort((a, b) => a.year - b.year);
}

/** 多轮问事用的全部要素：通用头部 + 各主题要点（流年表只列一次）+ 过去的验证年份 */
export function chatFacts(chart, currentYear) {
  const lines = topicFacts(chart, 'career', currentYear);
  // 其他主题去掉与事业篇重复的头部和流年表
  const body = topic => topicFacts(chart, topic, currentYear)
    .filter(l => !lines.includes(l) && !/^\d{4} /.test(l) && !/流年：$|的流年/.test(l));
  for (const t of ['wealth', 'love', 'health', 'children']) lines.push(`—— ${TOPICS[t].label} ——`, ...body(t));
  lines.push(`—— ${TOPICS.year.label} ——`, ...topicFacts(chart, 'year', currentYear).filter(l => !lines.includes(l)));
  const past = pastEvents(chart, currentYear);
  lines.push('—— 过去可供验证的年份（用于“先断过去”）——', ...(past.length ? past.map(p => `${p.year} ${p.ganZhi}：${p.signs.join('；')}`) : ['（成年后暂无明显的验证年份）']));
  return lines;
}

// —— 合盘 ——
export const RELATIONS = {
  lover: { label: '恋人', focus: '性格是否合拍、感情发展的走向、适合结婚的年份、相处中的摩擦点与化解办法' },
  spouse: { label: '夫妻', focus: '婚姻中的互补与摩擦、家庭分工、双方运势如何互相影响、需要共同留意的年份' },
  business: { label: '合伙人', focus: '能力与性格的互补、分工建议（谁主外谁主内）、合作中的风险点、适合共同发力或需要谨慎的年份' },
  friend: { label: '朋友', focus: '相处是否投缘、彼此能带来的助力、容易产生分歧的地方' },
  family: { label: '家人', focus: '性格差异与沟通方式、彼此的助力与牵挂、相处建议' }
};
export const isRelation = r => typeof r === 'string' && Object.prototype.hasOwnProperty.call(RELATIONS, r);

/**
 * 合盘要素：分数与加减因素、双方概况、未来十年两人的同步与冲突年份
 * @param a 求测者 computeChart 结果  @param b 合盘对象 computeChart 结果
 */
export function compatFacts(a, b, relation, currentYear) {
  const TONE = { good: '吉', bad: '凶', mixed: '平' };
  const { score, factors } = compatFactors(a, b);
  const brief = (c, who) => {
    const cur = currentDayun(c, currentYear);
    return `${who}：${c.input.gender === 'female' ? '女' : '男'}，四柱 ${c.values.join(' ')}，日主${c.values[2][0]}${GAN_WX[c.values[2][0]]}，${c.balance.status}，喜用 ${c.balance.useGod.join(' > ')}、忌 ${c.balance.avoidGod.join('、')}；当前大运 ${cur ? `${cur.ganZhi}（${cur.fromYear}–${cur.toYear}，${TONE[cur.tone] || ''}）` : '未起运或已走完'}`;
  };
  const lnA = computeLiuNian(a.values, currentYear, 10, currentYear, a.balance);
  const lnB = computeLiuNian(b.values, currentYear, 10, currentYear, b.balance);
  const years = lnA.map((ya, i) => {
    const yb = lnB[i];
    const notes = [`甲方${TONE[ya.tone]}、乙方${TONE[yb.tone]}`];
    const touch = (c, who) => keyRelations(ya.ganZhi, c.values, { zhiOnly: true }).filter(r => r.with === 2).map(r => `${who}夫妻宫${r.text}`);
    notes.push(...touch(a, '甲方'), ...touch(b, '乙方'));
    return `${ya.year} ${ya.ganZhi}：${notes.join('；')}`;
  });
  return [
    `【合盘对象：${RELATIONS[relation].label}】（下称甲方为求测者本人，乙方为合盘对象）`,
    brief(a, '甲方'),
    brief(b, '乙方'),
    `合盘分数：${score}（以 60 为基础按下列因素加减，范围 30–98）`,
    ...(factors.length ? factors.map(f => `${f.delta > 0 ? '+' : '−'}${Math.abs(f.delta)} ${f.label}：${f.text}`) : ['两人命局之间没有明显的合冲与互补']),
    `乙方原局刑冲合害：${b.relations.map(r => r.text).join('、') || '无明显关系'}`,
    '未来十年两人流年对照（吉凶 + 流年与各自夫妻宫的冲合）：',
    ...years,
    `本次合盘关注：${RELATIONS[relation].focus}`
  ];
}
