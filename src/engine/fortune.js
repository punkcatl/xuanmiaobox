// 运程：大运（lunar-javascript 精确起运）、流年、流月
import { TIAN_GAN, DI_ZHI, GAN_WX, ZHI_WX, JIA_ZI, SHENG, KE, JIE_TERMS, MONTH_NAME, tenGod, GOD_CLASS } from './constants.js';
import { keyRelations } from './relations.js';
import { ymd, ymdhm } from '../utils/date.js';
import { yearMonthPillarsAt } from './almanac.js';

const DAYUN_TEXT = {
  比劫: '比肩劫财运，同辈助力增，人际拓展期，宜合作共事。',
  食伤: '食伤泄秀运，才华显露期，利创作表达，注意把控尺度。',
  印星: '印绶生身运，贵人扶持期，利学业深造，宜稳扎稳打。',
  财星: '财星入运，求财有道期，利投资经营，忌贪多嚼不烂。',
  官杀: '官杀临运，事业变动期，有升迁机遇，亦须防小人压力。'
};
const LIUNIAN_TEXT = {
  比劫: '比劫年，同辈竞争与合作并存，利合伙但防争财。',
  食伤: '食伤年，才思泉涌利表达创作，但忌口舌是非。',
  印星: '印星年，利学业考试晋升，长辈贵人相助。',
  财星: '财星年，求财机遇增多，但须量力而行。',
  官杀: '官杀年，事业有变动压力，亦有晋升契机。'
};

// 按喜忌分吉凶的流年文案（天干十神定事类，天干地支五行定喜忌）
const LIUNIAN_TONE = {
  比劫: { good: '比劫为喜，得同辈朋友助力，利合作、合伙与拓展人脉。', bad: '比劫为忌，同辈竞争加剧，防破财、借贷纠纷与合伙不利。' },
  食伤: { good: '食伤为喜，才华得以发挥，利创作、表达、技术与开拓新业务。', bad: '食伤为忌，易言多有失、思虑过度，忌冲动辞职与口舌是非。' },
  印星: { good: '印星为喜，利学业考试、进修晋升，长辈贵人相助。', bad: '印星为忌，易思虑重、行动迟缓、依赖他人，宜防懈怠；考证进修仍可一试。' },
  财星: { good: '财星为喜，求财机遇增多，收入有望提升。', bad: '财星为忌，财来财去，宜量入为出，忌投机与过度投资。' },
  官杀: { good: '官杀为喜，事业有晋升契机，利竞聘、考公与承担重任。', bad: '官杀为忌，工作压力与是非增多，防小人与官非，注意身体。' }
};
const DAYUN_TONE = { good: '此运干支多为喜用，整体顺遂，宜积极进取。', bad: '此运干支多为忌神，阻力较多，宜守成蓄力、稳中求进。', mixed: '此运喜忌参半，起伏互见，宜扬长避短。' };

/**
 * 外来干支对命局的喜忌：天干五行、地支本气各计 ±1（喜 +1、忌 −1）
 * @returns {{ tone: 'good'|'bad'|'mixed', score: number, note: string }}
 */
export function ganZhiTone(gz, balance) {
  if (!balance) return null;
  const { useGod = [], avoidGod = [] } = balance;
  const judge = wx => (useGod.includes(wx) ? 1 : avoidGod.includes(wx) ? -1 : 0);
  const gw = GAN_WX[gz[0]];
  const zw = ZHI_WX[gz[1]];
  const score = judge(gw) + judge(zw);
  const tag = (wx, v) => `${wx}${v > 0 ? '为喜' : v < 0 ? '为忌' : '平'}`;
  const note = gw === zw ? `干支皆${tag(gw, judge(gw))}` : `天干${tag(gw, judge(gw))}、地支${tag(zw, judge(zw))}`;
  return { tone: score > 0 ? 'good' : score < 0 ? 'bad' : 'mixed', score, note };
}

/** lunar-javascript Solar → 北京时间字段 */
const fieldsOf = t => ({ year: t.getYear(), month: t.getMonth(), day: t.getDay(), hour: t.getHour(), minute: t.getMinute() });

const yearGanZhi = year => JIA_ZI[(((year - 4) % 60) + 60) % 60];

/** 由当前年柱推出命理上的“当前年”（立春前仍属上一年） */
export const baziYearFromPillar = (gregorianYear, yearPillar) => (yearPillar === yearGanZhi(gregorianYear) ? gregorianYear : gregorianYear - 1);

function zhiNote(zhi, dayWx) {
  const zw = ZHI_WX[zhi];
  if (zw === dayWx) return '地支助身，根基稳固。';
  if (SHENG[zw] === dayWx) return '地支生身，暗中有助。';
  if (KE[zw] === dayWx) return '地支克身，暗藏压力。';
  return '';
}

/** 外来干支与命局的冲合摘要（只列冲、合，最多 3 条） */
function relationSummary(gz, values) {
  return keyRelations(gz, values, { limit: 3 }).map(r => `${r.text}（${r.where}柱）`);
}

/**
 * 大运列表（起运按出生时刻到节气的精确时差）
 * @param eightChar lunar-javascript EightChar
 * @param {'male'|'female'} gender
 * @param {string[]} values 四柱
 * @param {number} birthYear 出生所属干支年
 */
export function computeDaYun(eightChar, gender, values, birthYear, balance) {
  // sect 2：按出生时刻到节气的分钟级时差推算起运
  const yun = eightChar.getYun(gender === 'male' ? 1 : 0, 2);
  const dayGan = values[2][0];
  const dayWx = GAN_WX[dayGan];
  const s = yun.getStartSolar(); // 第一步大运的交运时刻（之后每十年一换）
  // 各步交运时刻（2 月 29 日落到非闰年时取 2 月 28 日，由历法库处理）；第 11 个为最后一步的结束
  const starts = Array.from({ length: 11 }, (_, i) => fieldsOf(s.nextYear(i * 10)));
  // 每步按自己的交运时刻判断所属干支年（立春精确时刻换年），标注、年龄、流年范围与“当前大运”判断一致。
  // 交运时刻恰在立春前后几小时的命盘，因立春时刻逐年漂移约 6 小时，各步可能交替落在立春两侧，
  // 流年范围与年龄间隔出现 9 / 11 年交替——这是实际情况（每步的标注都与其交运时刻一致）
  const years = starts.map(f => baziYearFromPillar(f.year, yearMonthPillarsAt(f)[0]));
  const list = yun.getDaYun(11).slice(1, 11).map((d, i) => {
    const gz = d.getGanZhi();
    const god = tenGod(dayGan, gz[0]);
    const t = ganZhiTone(gz, balance);
    return {
      ganZhi: gz,
      tone: t ? t.tone : null,
      // 虚岁 = 交运时刻所属干支年 − 出生所属干支年 + 1（都以立春换年，与“起运前 1 岁”及流年范围一致）；
      // 历法库的 getStartAge 按公历年，出生或交运在元旦至立春之间时会差一岁
      startAge: years[i] - birthYear + 1,
      startDate: ymd(starts[i].year, starts[i].month, starts[i].day), // 交运日 YYYY-MM-DD
      startAt: ymdhm(starts[i]), // 交运时刻（北京时间），与 clock.js 的 nowMinuteKey 同一格式，按字符串比较
      endAt: ymdhm(starts[i + 1]), // 本步结束（即下一步交运）的时刻
      fromYear: years[i],
      toYear: years[i + 1],
      shiShen: god,
      analysis: (DAYUN_TEXT[GOD_CLASS[god]] || '') + zhiNote(gz[1], dayWx) + (t ? `${t.note}，${DAYUN_TONE[t.tone]}` : ''),
      relations: relationSummary(gz, values)
    };
  });
  const start = `出生后 ${yun.getStartYear()} 年 ${yun.getStartMonth()} 个月 ${yun.getStartDay()} 天起运，${yun.isForward() ? '顺排' : '逆排'}`;
  return { list, start };
}

/**
 * 流年：指定年份范围；currentYear 为命理当前年（见 baziYearFromPillar）
 * balance 为命局旺衰喜忌（analyzeBalance 的结果），传入时按喜忌给出吉凶文案
 */
export function computeLiuNian(values, fromYear, count, currentYear, balance) {
  const dayGan = values[2][0];
  return Array.from({ length: count }, (_, k) => {
    const year = fromYear + k;
    const gz = yearGanZhi(year);
    const god = tenGod(dayGan, gz[0]);
    const offset = year - currentYear;
    const label = offset === 0 ? '今年' : offset === 1 ? '明年' : offset === -1 ? '去年' : offset > 0 ? `${offset}年后` : `${-offset}年前`;
    const t = ganZhiTone(gz, balance);
    const cls = GOD_CLASS[god];
    const body = !t ? LIUNIAN_TEXT[cls] || ''
      : t.tone === 'mixed' ? `${t.note}，喜忌参半。${LIUNIAN_TEXT[cls] || ''}`
        : `${t.note}。${LIUNIAN_TONE[cls][t.tone]}`;
    return {
      year, ganZhi: gz, shiShen: god, isCurrent: offset === 0,
      tone: t ? t.tone : null,
      analysis: `${label}，${body}`,
      relations: relationSummary(gz, values)
    };
  });
}

/** 流月：五虎遁，寅月起（以节气换月） */
const TIGER = { 甲: '丙', 己: '丙', 乙: '戊', 庚: '戊', 丙: '庚', 辛: '庚', 丁: '壬', 壬: '壬', 戊: '甲', 癸: '甲' };
const MONTH_LABEL = [...DI_ZHI.slice(2), ...DI_ZHI.slice(0, 2)].map(z => MONTH_NAME[z]); // 寅月（正月）起
const JIE = [...JIE_TERMS.slice(1), JIE_TERMS[0]]; // 自立春起
export function computeLiuYue(values, year) {
  const dayGan = values[2][0];
  const startGan = TIAN_GAN.indexOf(TIGER[yearGanZhi(year)[0]]);
  return MONTH_LABEL.map((label, i) => {
    const gz = TIAN_GAN[(startGan + i) % 10] + DI_ZHI[(2 + i) % 12];
    return { label, jie: JIE[i], ganZhi: gz, shiShen: tenGod(dayGan, gz[0]), relations: relationSummary(gz, values) };
  });
}

