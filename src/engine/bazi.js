// 八字排盘引擎：历法与盘面（纯函数，无 UI 依赖）
import { Solar, LunarUtil } from 'lunar-javascript';
import { GAN_WX, ZHI_WX, CANG_GAN, JIA_ZI, PILLAR_LABELS, tenGod, changSheng, xunKong } from './constants.js';
import { resolveBirthTime, NO_CN_DST, isJapanTime } from './time.js';
import { lookupLongitude } from '../data/regions.js';
import { formatDateTime } from '../utils/date.js';
import { birthDateError, YEAR_MIN, YEAR_MAX } from '../utils/validate.js';
import { computeShensha } from './shensha.js';

export class BaziError extends Error {}

const BIRTH_ERROR_TEXT = {
  empty: '请填写完整的出生日期',
  nonint: '出生日期须为整数，请检查输入',
  year: `仅支持 ${YEAR_MIN}–${YEAR_MAX} 年`,
  date: '日期不存在，请检查输入',
  time: '时间不正确，请检查输入'
};


export const wuXingOf = ganZhi => ({ tianGan: GAN_WX[ganZhi.charAt(0)] || '', diZhi: ZHI_WX[ganZhi.charAt(1)] || '' });

/**
 * 校正出生时间并取得 lunar-javascript 的八字对象（晚子时日柱归次日）。
 * 节气交接是绝对时刻，年柱、月柱与起运按实际时刻（北京时间）计；真太阳时只影响日柱与时柱。
 */
export function resolveChart(person) {
  const err = birthDateError(person);
  if (err) throw new BaziError(BIRTH_ERROR_TEXT[err]);
  const location = lookupLongitude(person.province, person.city, person.district);
  const time = resolveBirthTime({ ...person, longitude: location ? location.longitude : null, useTrueSolarTime: !!person.useTrueSolarTime });
  const ec = (t) => { const e = Solar.fromYmdHms(t.year, t.month, t.day, t.hour, t.minute, 0).getLunar().getEightChar(); e.setSect(1); return e; };
  const eightChar = ec(time.clock);
  const solarChar = time.trueSolar.applied ? ec(time) : eightChar;
  return { eightChar, solarChar, time, location };
}

/** 单柱盘面详情 */
function pillarDetail(value, i, dayGan) {
  const gan = value[0];
  const zhi = value[1];
  return {
    label: PILLAR_LABELS[i],
    value,
    wuXing: wuXingOf(value),
    shiShen: i === 2 ? '日元' : tenGod(dayGan, gan),
    hide: CANG_GAN[zhi].map(([g]) => ({ gan: g, wx: GAN_WX[g], shiShen: tenGod(dayGan, g) })),
    naYin: LunarUtil.NAYIN[value] || '',
    diShi: changSheng(dayGan, zhi),   // 星运：日干在本柱地支的长生状态
    ziZuo: changSheng(gan, zhi),      // 自坐：本柱天干在本柱地支的状态
    xunKong: xunKong(value)
  };
}

/** 出生信息 → 校正后的时间 + 四柱（含盘面详情） */
export function computePillars(person) {
  const { eightChar, solarChar, time, location } = resolveChart(person);
  const values = [eightChar.getYear(), eightChar.getMonth(), solarChar.getDay(), solarChar.getTime()];
  if (!values.every(v => JIA_ZI.includes(v))) throw new BaziError('该日期超出历法可计算范围');
  const dayGan = values[2][0];
  const shensha = computeShensha(values);
  const pillars = values.map((v, i) => ({ ...pillarDetail(v, i, dayGan), shensha: shensha[i] }));
  return { pillars, values, time, location, eightChar };
}

/** 八字等权计数（天干 + 地支本气） */
export function countWuXing(pillars) {
  const stats = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  pillars.forEach(p => {
    if (p.wuXing.tianGan) stats[p.wuXing.tianGan]++;
    if (p.wuXing.diZhi) stats[p.wuXing.diZhi]++;
  });
  return stats;
}

/** 藏干加权：天干 100；地支本气 100 / 中气 60 / 余气 30；月令本气 ×1.5 */
export function weightedWuXing(pillars) {
  const stats = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  pillars.forEach(p => { const wx = GAN_WX[p.value[0]]; if (wx) stats[wx] += 100; });
  pillars.forEach((p, i) => {
    (CANG_GAN[p.value[1]] || []).forEach(([stem, weight], j) => {
      const wx = GAN_WX[stem];
      if (wx) stats[wx] += weight * (i === 1 && j === 0 ? 1.5 : 1);
    });
  });
  return stats;
}

/** 夏令时相关提示（time.dstWarning → 文案） */
const DST_NOTE = {
  skipped: '该时刻处于夏令时开始当天被跳过的一小时（02:00–02:59），实际并不存在，已按所填时间排盘（未回拨），请核对出生时间。',
  repeated: '该时刻在夏令时结束当天出现了两次（01:00–01:59），本站按第一次（夏令时）回拨 1 小时计算；若实际为第二次（标准时间），真实时刻比本结果晚 1 小时，时柱可能有误。',
  local: '港澳台在 1941–1979 年间曾多次实行当地夏令时，本站未自动校正；若出生时值夏令时，请将出生时间减 1 小时后重排。',
  early: '民国时期（1919 年，以及 1940 年代）大陆部分地区（如上海）曾实行夏令时，规则不一，本站未自动校正；若出生时值夏令时，请将出生时间减 1 小时后重排。',
  jpTime: '该时期当地使用日本时间（东九区，比北京时间快 1 小时），本站按北京时间计算；若记录的是当时的当地时间，请先减 1 小时再排盘。',
  zone: '1949 年及以前大陆各地曾分用不同标准时（如四川、云南等地用东七区，新疆、西藏用东六区），本站按北京时间（东八区）计算；若记录的是当地标准时，请先换算为北京时间。',
  disputed: '1988 年夏令时起始日存在 4 月 10 日与 4 月 17 日两种记载，本站按 4 月 17 日计；如出生证明时间为夏令时，请自行减 1 小时。'
};

/** 给用户看的校正说明 */
export function describeCorrections(person, time, location) {
  const notes = [];
  if (time.dst) notes.push('出生时值夏令时，已回拨 1 小时。');
  if (time.dstWarning) notes.push(DST_NOTE[time.dstWarning]); // 日本时间期间 dstWarning 不提示当地夏令时（见 time.js）
  if (person.year <= 1949 && !NO_CN_DST.includes(person.province)) notes.push(DST_NOTE.zone); // 大陆 1949 年及以前的分区标准时（统一用北京时间始于建国后）
  if (isJapanTime(person.year, person.month, person.day, person.province)) notes.push(DST_NOTE.jpTime);
  if (person.useTrueSolarTime) {
    if (time.trueSolar.applied) {
      const where = location.level === 'district' ? '区县' : '市';
      const sign = time.trueSolar.offset >= 0 ? '+' : '−';
      notes.push(`已按真太阳时校正：出生地经度 ${location.longitude.toFixed(2)}°E（${where}级），${sign}${Math.abs(time.trueSolar.offset)} 分钟，排盘时间 ${formatDateTime(time)}。若实际出生地不在列表中而选了附近城市，经度每差 1° 约差 4 分钟，临近时辰交界时请留意。`);
    } else {
      notes.push('该地区暂无经度数据，未做真太阳时校正。');
    }
  }
  if (time.trueSolar.applied) notes.push('年柱、月柱按出生的北京时间与节气交接时刻比较，真太阳时只用于日柱与时柱。');
  if (time.hour === 23) notes.push('排盘时间（校正后）在晚子时（23 点后），日柱按次日排。');
  // 新疆民间常用新疆时间（UTC+6），本站按北京时间计算
  if (person.province === '新疆维吾尔自治区') notes.push('请确认所填为北京时间；若出生证明记录的是新疆时间，请先加 2 小时再排盘。');
  return notes;
}

