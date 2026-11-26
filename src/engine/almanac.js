// 当日黄历（时令栏与每日运签共用）
import { Solar } from 'lunar-javascript';

let cache = { key: '', value: null };

/** @param {{ year, month, day }} t 北京日期（同一天的结果会被缓存，时令栏与每日运签共用） */
export function almanacOfDay(t) {
  const key = `${t.year}-${t.month}-${t.day}`;
  if (cache.key === key) return cache.value;
  const l = Solar.fromYmd(t.year, t.month, t.day).getLunar();
  const value = {
    lunar: `${l.getMonthInChinese()}月${l.getDayInChinese()}`,
    term: l.getJieQi() || '',
    zodiac: l.getYearShengXiao(), // 随农历年（春节）换
    dayGz: l.getDayInGanZhi(),     // 日柱按日历日
    yi: l.getDayYi().slice(0, 8),
    ji: l.getDayJi().slice(0, 8),
    chong: l.getDayChongDesc(),
    sha: l.getDaySha(),
    xi: l.getDayPositionXiDesc(),
    cai: l.getDayPositionCaiDesc(),
    fu: l.getDayPositionFuDesc(),
    pengzu: `${l.getPengZuGan()}　${l.getPengZuZhi()}`
  };
  cache = { key, value };
  return value;
}

/** 指定时刻的年柱、月柱（按节气交接时刻）
 * @param {{ year, month, day, hour, minute }} t 北京时间字段 */
export function yearMonthPillarsAt(t) {
  const l = Solar.fromYmdHms(t.year, t.month, t.day, t.hour, t.minute, 0).getLunar();
  return [l.getYearInGanZhiExact(), l.getMonthInGanZhiExact()];
}
