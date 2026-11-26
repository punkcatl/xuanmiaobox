import { ymd } from '../utils/date.js';
// 出生时间校正：夏令时 + 真太阳时（经度时差 + 均时差）

/**
 * 中国大陆 1986–1991 年实行夏令时（钟表拨快 1 小时），起止均为当地 02:00。
 * 1987 年起规则为“4 月中旬第一个星期日至 9 月中旬第一个星期日”，与 tzdata（Asia/Shanghai）一致；
 * 1988 年起始日部分中文资料记为 4 月 10 日，tzdata 按规则为 4 月 17 日，此处取后者并对 4/10–4/16 给出提示。
 */
const CN_DST = {
  1986: [[5, 4], [9, 14]],
  1987: [[4, 12], [9, 13]],
  1988: [[4, 17], [9, 11]],
  1989: [[4, 16], [9, 17]],
  1990: [[4, 15], [9, 16]],
  1991: [[4, 14], [9, 15]]
};
export const NO_CN_DST = ['香港特别行政区', '澳门特别行政区', '台湾省']; // 不随大陆夏令时（各有当地规则）

const MIN = 60000;

/** 夏令时提示：skipped 不存在的时刻 / repeated 出现两次的时刻 / disputed 有争议的日期 / local 港澳台当地夏令时 / early 大陆 1940 年代夏令时 */
// 使用日本时间（东九区）的时期（含首尾日期）：台湾 1937-10-01 起至光复（此前 1896 年起用东八区“西部标准时”），香港为日占时期
const JP_TIME = {
  台湾省: ['1937-10-01', '1945-09-20'],
  香港特别行政区: ['1941-12-25', '1945-09-15']
};
/** 出生日期是否处于当地使用日本时间的时期 */
export function isJapanTime(year, month, day, province) {
  const range = JP_TIME[province];
  const d = ymd(year, month, day);
  return !!range && d >= range[0] && d <= range[1];
}

export function dstWarning(year, month, day, hour, province) {
  // 日本时间期间的“拨快 1 小时”就是东九区本身（另有专门提示），不再按当地夏令时提示，避免用户减两次
  if (province && isJapanTime(year, month, day, province)) return null;
  // 港澳台在 1941–1979 年间多次实行各自的夏令时，起止日期逐年不同（最长约 3 月至 11 月），此处只提示核对
  // 1942 年至 1945 年 8 月（战时）大陆部分地区与香港全年拨快 1 小时，不限月份；1945 年 9 月起恢复（上海 9 月 1 日）
  const allYear = (year >= 1942 && year <= 1944) || (year === 1945 && month <= 8);
  if (province && NO_CN_DST.includes(province)) return year >= 1941 && year <= 1979 && (allYear || (month >= 3 && month <= 11)) ? 'local' : null;
  // 大陆 1940–1949 年间部分地区（如上海）实行过夏令时，规则不一，只提示核对
  // 1945 年 9 月 1 日战时夏令时结束后当年不再拨快（香港至 11 月 18 日，走上面的当地规则）
  if (year === 1945 && month >= 9) return null;
  if (year >= 1940 && year <= 1949 && (allYear || (month >= 3 && month <= 11))) return 'early';
  // 1919 年上海曾实行夏令时（4 月 12 日至 9 月 30 日，见 tzdata）
  if (year === 1919 && month >= 4 && month <= 9) return 'early';
  const range = CN_DST[year];
  if (!range) return null;
  if (month === range[0][0] && day === range[0][1] && hour === 2) return 'skipped';
  if (month === range[1][0] && day === range[1][1] && hour === 1) return 'repeated';
  if (year === 1988 && month === 4 && day >= 10 && day <= 16) return 'disputed';
  return null;
}

export function isChinaDst(year, month, day, hour, minute, province) {
  if (province && NO_CN_DST.includes(province)) return false;
  const range = CN_DST[year];
  if (!range) return false;
  const t = Date.UTC(year, month - 1, day, hour, minute);
  const start = Date.UTC(year, range[0][0] - 1, range[0][1], 2, 0);
  const end = Date.UTC(year, range[1][0] - 1, range[1][1], 2, 0);
  return t >= start && t < end;
}

/** 均时差（分钟），近似公式，误差约 ±1 分钟 */
export function equationOfTime(year, month, day) {
  const dayOfYear = Math.round((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / 86400000) + 1;
  const B = (2 * Math.PI / 365.24) * (dayOfYear - 81);
  return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
}

/**
 * 将钟表时间换算为排盘所用时间。跨午夜时日期随之进退。
 * @param {object} p { year, month, day, hour, minute, province, longitude|null, useTrueSolarTime }
 * @returns {{ year, month, day, hour, minute, clock, dst, dstWarning, trueSolar }}
 *   年月日时分为排日柱、时柱所用时间（含真太阳时）；clock 为实际时刻（北京时间，已扣夏令时），用于比较节气交接与起运
 */
export function resolveBirthTime(p) {
  let t = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);

  const warning = dstWarning(p.year, p.month, p.day, p.hour, p.province);
  // 夏令时开始当天 02:00–02:59 并不存在：不回拨，按所填时间计并提示核对
  const dst = warning !== 'skipped' && isChinaDst(p.year, p.month, p.day, p.hour, p.minute, p.province);
  if (dst) t -= 60 * MIN;
  const tClock = t;
  const c = new Date(t);
  const clock = { year: c.getUTCFullYear(), month: c.getUTCMonth() + 1, day: c.getUTCDate(), hour: c.getUTCHours(), minute: c.getUTCMinutes() };

  const trueSolar = { applied: false };
  if (p.useTrueSolarTime && p.longitude != null) {
    const offset = (p.longitude - 120) * 4 + equationOfTime(clock.year, clock.month, clock.day);
    t += offset * MIN;
    trueSolar.applied = true;
  }

  // 向下取整到分钟：四舍五入会把时辰交界前 30 秒内的时刻推入下一个时辰（甚至跨过 23:00 换日）
  t = Math.floor(t / MIN) * MIN;
  // 显示的校正分钟数取实际生效值，保证与说明中的排盘时间一致
  if (trueSolar.applied) trueSolar.offset = Math.round((t - tClock) / MIN);
  const r = new Date(t);
  return {
    year: r.getUTCFullYear(),
    month: r.getUTCMonth() + 1,
    day: r.getUTCDate(),
    hour: r.getUTCHours(),
    minute: r.getUTCMinutes(),
    clock,
    dst,
    dstWarning: warning,
    trueSolar
  };
}

/** 校验公历日期是否存在 */
export function isValidDate(year, month, day) {
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month && d.getUTCDate() === day;
}
