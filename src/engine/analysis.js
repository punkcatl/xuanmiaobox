// 命局分析：旺衰、喜用、格局、调候、解盘依据与解读文案
import { GAN_WX, ZHI_WX, CANG_GAN, WX_ORDER, ALLY, TIAN_GAN, LU, YANG_REN, LUCKY_COLOR, SHENG, KE, tenGod, wxTotal, joinMap, MONTH_NAME, SEASON, PILLAR_SHORT } from './constants.js';

// —— 旺衰与喜用 ——

/**
 * 扶抑用神：由日主五行按生克关系推出
 * 身强宜克、泄、耗 → 喜官杀、食伤、财星，忌印星、比劫
 * 身弱宜生扶     → 喜印星、比劫，忌官杀、食伤、财星
 */
function fuYi(dayWx) {
  const yin = ALLY[dayWx].find(w => w !== dayWx); // 生我（ALLY = 比劫 + 印）
  const shi = SHENG[dayWx];                         // 我生
  const cai = KE[dayWx];                            // 我克
  const guan = WX_ORDER.find(w => KE[w] === dayWx); // 克我
  return { strong: [[guan, shi, cai], [yin, dayWx]], weak: [[yin, dayWx], [guan, shi, cai]] };
}
const STRONG_AT = 0.55;
const WEAK_AT = 0.45;

/**
 * 旺衰判断（标签与喜用神使用同一阈值，避免“中和”却按身强取用）
 * @param {object} weighted 藏干加权五行
 * @param {string[]} values 四柱干支
 */
export function analyzeBalance(weighted, values) {
  const dayGan = values[2][0];
  const dayWx = GAN_WX[dayGan];
  const allies = ALLY[dayWx];
  const total = wxTotal(weighted);
  const allyTotal = allies.reduce((s, w) => s + weighted[w], 0);
  // 保留一位小数参与判断，保证解盘依据中显示的百分比与结论一致
  const ratio = total > 0 ? Math.round((allyTotal / total) * 1000) / 1000 : 0.5;
  let status;
  let useGod;
  let avoidGod;
  if (ratio > STRONG_AT) {
    status = '身强';
    [useGod, avoidGod] = fuYi(dayWx).strong;
  } else if (ratio < WEAK_AT) {
    status = '身弱';
    [useGod, avoidGod] = fuYi(dayWx).weak;
  } else {
    // 中和：看偏向哪一边，只在“对侧”取用，避免喜用与旺衰方向相反（如近乎身强却喜印比）
    // 偏强（≥ 50%）：从克泄耗（官杀、食伤、财）中取最弱的两种为喜，忌生扶中最旺者；偏弱：喜印比（弱者在前），忌克泄耗中最旺者
    status = '中和';
    const byWeak = list => list.slice().sort((a, b) => weighted[a] - weighted[b]);
    const others = WX_ORDER.filter(w => !allies.includes(w));
    if (ratio >= 0.5) {
      useGod = byWeak(others).slice(0, 2);
      avoidGod = [byWeak(allies)[1]];
    } else {
      useGod = byWeak(allies);
      avoidGod = [byWeak(others)[2]];
    }
  }

  // 解盘依据：得令、得地、得势
  const monthZhi = values[1][1];
  const monthWx = ZHI_WX[monthZhi];
  const deLing = allies.includes(monthWx);
  const roots = values.flatMap((v, i) =>
    CANG_GAN[v[1]].filter(([g]) => GAN_WX[g] === dayWx).map(([g]) => `${PILLAR_SHORT[i]}支${v[1]}藏${g}`));
  const helpers = values.map((v, i) => (i === 2 ? null : v[0])).filter(g => g && allies.includes(GAN_WX[g]));
  const steps = [
    `日元${dayGan}${dayWx}，生于${monthZhi}月（${SEASON[monthZhi]}季），月令五行为${monthWx}，${deLing ? '属生扶日元的五行，得令' : '不生扶日元，失令'}。`,
    roots.length ? `地支有根：${roots.join('、')}，得地。` : '地支中没有与日元同五行的藏干，不得地。',
    helpers.length ? `天干有${helpers.join('、')}帮扶日元，得势。` : '其余天干无印比帮扶，不得势。',
    `按藏干加权，生扶日元的力量（${allies.join('、')}）占 ${(ratio * 100).toFixed(1)}%，${status === '身强' ? `高于 ${Math.round(STRONG_AT * 100)}%，判为身强` : status === '身弱' ? `低于 ${Math.round(WEAK_AT * 100)}%，判为身弱` : `介于 ${Math.round(WEAK_AT * 100)}%–${Math.round(STRONG_AT * 100)}% 之间，判为中和`}。`,
    status === '中和'
      ? (ratio >= 0.5
        ? `中和略偏强，宜稍加克泄耗：取克泄耗日元的五行中最弱的${useGod.join('、')}为喜用，忌生扶日元中较旺的${avoidGod.join('、')}。`
        : `中和略偏弱，宜稍加生扶：取生扶日元的${useGod.join('、')}为喜用，忌克泄耗日元中最旺的${avoidGod.join('、')}。`)
      : status === '身强'
        ? `身强宜克、泄、耗：喜克身的${useGod[0]}（官杀）、泄身的${useGod[1]}（食伤）、耗身的${useGod[2]}（财星），忌生扶日元的${avoidGod.join('、')}。`
        : `身弱宜生扶：喜生身的${useGod[0]}（印星）、助身的${useGod[1]}（比劫），忌克泄耗身的${avoidGod.join('、')}。`
  ];
  let special = '';
  if (ratio < 0.15) special = '生扶力量极弱，可能构成从格（弃命从势），需由专业命理师判断，上述喜忌仅供参考。';
  if (ratio > 0.85) special = '生扶力量极旺，可能构成专旺格，需由专业命理师判断，上述喜忌仅供参考。';
  if (special) steps.push(special);

  return { status, useGod, avoidGod, ratio, steps };
}

// —— 格局 ——

// 阴干月劫：月支为其劫财（同五行阳干）的禄位
const JIE_OF = g => TIAN_GAN[TIAN_GAN.indexOf(g) - 1];
const GEJU_NAME = { 正官: '正官格', 七杀: '七杀格', 正财: '正财格', 偏财: '偏财格', 正印: '正印格', 偏印: '偏印格', 食神: '食神格', 伤官: '伤官格' };

/**
 * 月令定格：
 * 1. 月支为日干禄位 → 建禄格；为阳干刃位 → 阳刃格；为阴干月劫之位 → 月劫格
 * 2. 否则取月支藏干中透出天干者（本气优先），皆不透取本气；比劫不能成格，跳过取其余藏干
 */
export function determineGeju(values) {
  const dayGan = values[2][0];
  const monthZhi = values[1][1];
  const hidden = CANG_GAN[monthZhi].map(([g]) => g);
  if (LU[dayGan] === monthZhi) {
    return { name: '建禄格', god: '比肩', basis: `月令${monthZhi}为日元${dayGan}的禄位（临官），取建禄格。` };
  }
  if (YANG_REN[dayGan] === monthZhi) {
    return { name: '阳刃格', god: '劫财', basis: `月令${monthZhi}为阳干${dayGan}的羊刃之位，取阳刃格。` };
  }
  const jie = TIAN_GAN.indexOf(dayGan) % 2 === 1 ? JIE_OF(dayGan) : null; // 阴干的劫财
  if (jie && LU[jie] === monthZhi) {
    return { name: '月劫格', god: '劫财', basis: `月令${monthZhi}为日元${dayGan}的劫财${jie}之禄位，取月劫格。` };
  }
  const stems = [values[0][0], values[1][0], values[3][0]];
  const usable = hidden.filter(g => !['比肩', '劫财'].includes(tenGod(dayGan, g)));
  const tou = usable.find(g => stems.includes(g));
  const pick = tou || usable[0];
  const god = tenGod(dayGan, pick);
  const name = GEJU_NAME[god];
  const skipped = hidden.length > usable.length ? `（${hidden.filter(g => !usable.includes(g)).join('、')}为比劫，不取）` : '';
  const basis = tou
    ? `月令${monthZhi}中藏${hidden.join('、')}${skipped}，其中${pick}透出天干，为日元之${god}，故取${name}。`
    : `月令${monthZhi}中藏${hidden.join('、')}${skipped}，均未透出，取${pick}（日元之${god}）论格，为${name}。`;
  return { name, god, basis };
}
// —— 调候 ——

// 《穷通宝鉴》章节按标题定位（不依赖解析后的章节序号）
const QIONGTONG_CHAPTER = { 甲: '论木', 乙: '论木', 丙: '论丙火', 丁: '论丁火', 戊: '论戊土', 己: '论己土', 庚: '论金', 辛: '论辛金', 壬: '论壬水', 癸: '论癸水' };
const SEASON_HEAD = { 春: '三春', 夏: '三夏', 秋: '三秋', 冬: '三冬' };
// 原书合并月份的小标题，如“正二月戊土”“五六月甲木”“十一二月”
const MONTH_COMBO = { 寅: '正二月', 卯: '正二月', 午: '五六月', 未: '五六月', 酉: '八九月', 戌: '八九月', 子: '十一二月', 丑: '十一二月' };

/** 调候提示 + 《穷通宝鉴》对应章节定位 */
export function tiaoHou(values) {
  const dayGan = values[2][0];
  const monthZhi = values[1][1];
  const season = SEASON[monthZhi];
  const hint = {
    冬: '生于冬月，命局偏寒，调候以丙丁火温暖为要。',
    夏: '生于夏月，命局偏燥，调候以壬癸水润泽为要。',
    春: '生于春月，余寒未尽、木气渐旺，寒暖较为适中，调候视具体干支而定。',
    秋: '生于秋月，金气肃杀，燥气渐生，调候宜兼顾水火。'
  }[season];
  return {
    hint,
    chapter: QIONGTONG_CHAPTER[dayGan],
    anchors: [
      `${MONTH_NAME[monthZhi]}${dayGan}${GAN_WX[dayGan]}`,
      MONTH_COMBO[monthZhi] && `${MONTH_COMBO[monthZhi]}${dayGan}${GAN_WX[dayGan]}`,
      `${SEASON_HEAD[season]}${dayGan}${GAN_WX[dayGan]}`,
      MONTH_COMBO[monthZhi]
    ].filter(Boolean),
    label: `${MONTH_NAME[monthZhi]}${dayGan}${GAN_WX[dayGan]}`
  };
}

// —— 解读文案 ——

const DAY_MASTER = {
  '甲': { name: '甲木', desc: '阳木', traits: '性格刚直豪爽，有担当，有上进心，喜欢独立发展，重视原则，行事磊落。', personality: '您行动力强，有魄力，敢于承担责任。但有时可能过于固执，需学会灵活变通。' },
  '乙': { name: '乙木', desc: '阴木', traits: '性格柔和细腻，善于变通，有韧性，适应能力强，擅长沟通协调。', personality: '您温柔体贴，善解人意，有较强的适应能力。但有时可能缺乏主见，需学会果断决策。' },
  '丙': { name: '丙火', desc: '阳火', traits: '性格热烈外向，精力充沛，行动力强，有领导气质，喜欢表现自己。', personality: '您热情开朗，感染力强，善于带动气氛。但有时可能过于冲动，需注意控制情绪。' },
  '丁': { name: '丁火', desc: '阴火', traits: '性格温暖细腻，善于思考，有耐心，责任心强，适合从事细致的工作。', personality: '您心思缜密，责任感强，善于分析问题。但有时可能过于追求完美，需学会接受不完美。' },
  '戊': { name: '戊土', desc: '阳土', traits: '性格稳重厚道，诚实守信，有责任感，适合从事管理或稳定的工作。', personality: '您踏实可靠，值得信赖，有较强的领导能力。但有时可能过于保守，需敢于尝试新事物。' },
  '己': { name: '己土', desc: '阴土', traits: '性格包容豁达，善于变通，有耐心，擅长处理复杂问题。', personality: '您包容心强，善于协调，有较强的沟通能力。但有时可能过于随和，需学会坚持原则。' },
  '庚': { name: '庚金', desc: '阳金', traits: '性格刚毅果断，行动力强，有魄力，适合从事挑战性的工作。', personality: '您意志坚定，果断有力，敢于面对困难。但有时可能过于刚硬，需学会柔韧处事。' },
  '辛': { name: '辛金', desc: '阴金', traits: '性格细腻精致，善于分析，有审美眼光，适合从事精细或艺术类工作。', personality: '您追求完美，注重细节，有较强的审美能力。但有时可能过于挑剔，需学会抓大放小。' },
  '壬': { name: '壬水', desc: '阳水', traits: '性格聪明智慧，思维活跃，擅长谋略，有较强的适应能力。', personality: '您思路开阔，适应力强，善于把握机会。但有时可能过于善变，需学会专注坚持。' },
  '癸': { name: '癸水', desc: '阴水', traits: '性格温柔细腻，善于观察，有直觉力，适合从事需要洞察力的工作。', personality: '您直觉敏锐，感受力强，善于发现细节。但有时可能过于敏感，需学会调整心态。' }
};

const STRONG_TEXT = { 水: '水气旺盛', 火: '火气兴旺', 木: '木气充盈', 金: '金气有力', 土: '土气厚实' };

/** 命中全无（藏干加权为 0）的五行 */
const absentElements = weighted => WX_ORDER.filter(w => weighted[w] === 0);

/**
 * 五行有无：none 连藏干都没有（命中无）；hidden 天干地支本气没有、只藏在地支藏干里
 * @param counts 八字等权计数  @param weighted 藏干加权
 */
export function elementPresence(counts, weighted) {
  return {
    none: absentElements(weighted),
    hidden: WX_ORDER.filter(w => counts[w] === 0 && weighted[w] > 0)
  };
}

/** 五行强弱描述：统一按藏干加权占比（旺 ≥ 30%，弱 < 6%，0 为无） */
export function describeElements(weighted) {
  const total = wxTotal(weighted) || 1;
  const parts = [];
  WX_ORDER.forEach(w => { if (weighted[w] / total >= 0.3) parts.push(STRONG_TEXT[w]); });
  const none = absentElements(weighted); // “无”的判定与导览共用
  WX_ORDER.forEach(w => {
    if (none.includes(w)) parts.push(`命中无${w}`);
    else if (weighted[w] / total < 0.06) parts.push(`${w}气微弱`);
  });
  return parts;
}

export function buildReading(values, weighted, balance, geju) {
  const dayGan = values[2][0];
  const { name, desc, traits, personality } = DAY_MASTER[dayGan];
  const { status, useGod, avoidGod } = balance;
  const wxDesc = describeElements(weighted);
  const career = joinMap(useGod, { 火: '教育、互联网、能源电力、餐饮', 土: '建筑、房地产、矿产', 木: '林业、教育、家具、文化', 金: '金融、珠宝、机械加工、法务', 水: '物流、运输、旅游、贸易' });
  const health = joinMap(avoidGod, { 火: '心血管', 水: '泌尿系统', 木: '肝胆', 金: '呼吸系统', 土: '消化系统' });
  const useStr = useGod.join('、');
  return [
    { k: '命主属性', v: `您是${name}（${desc}），${traits}` },
    { k: '格局', v: `${geju.name}。${geju.basis}` },
    { k: '命局旺衰', v: `${status}之命。${wxDesc.length ? wxDesc.join('，') + '。' : '五行分布较为均衡。'}` },
    { k: '五行喜忌', v: `命局喜用神为${useStr}，忌${avoidGod.join('、')}。建议多接触属${useStr}的事物，可起到调和命局的作用。` },
    { k: '性格特点', v: personality },
    { k: '事业方向', v: `适合从事${career}等行业，这些方向有助于发挥您的命局优势。` },
    { k: '养生提示', v: `平时宜多关注${health}方面的保养，保持良好的生活习惯和作息规律。此为传统命理之说，身体状况请以医生诊断为准。` },
    { k: '幸运颜色', v: joinMap(useGod, LUCKY_COLOR) + '。' },
    { k: '幸运数字', v: joinMap(useGod, { 木: '3、8', 火: '2、7', 土: '5、10', 金: '4、9', 水: '1、6' }) + '。' }
  ];
}

