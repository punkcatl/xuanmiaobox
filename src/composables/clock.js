// 全局时钟：唯一的每秒定时器。
// 历法以北京时间为准：对外提供北京时间的字段对象 { year, month, day, hour, minute, second }，
// 不用本地 Date 承载，避免用户所在时区的夏令时影响。
// 只有显示秒的组件读取 bj；其余读取按分钟 / 按日变化的值，避免无谓重算。
import { reactive, computed } from 'vue';
import { ymd, ymdhm } from '../utils/date.js';
import { yearMonthPillarsAt } from '../engine/almanac.js';

/** 任意时刻 → 北京时间字段 */
export function beijingFields(ms) {
  const u = new Date(ms + 8 * 3600000);
  return { year: u.getUTCFullYear(), month: u.getUTCMonth() + 1, day: u.getUTCDate(), hour: u.getUTCHours(), minute: u.getUTCMinutes(), second: u.getUTCSeconds() };
}

export const clock = reactive({ ms: Date.now() });
let timer = null;
let visibilityBound = false;
const tick = () => { clock.ms = Date.now(); };
export function startClock() {
  if (timer) return;
  timer = setInterval(tick, 1000);
  // 标签页隐藏时暂停（省电），回到前台立即校准
  if (typeof document !== 'undefined' && !visibilityBound) {
    visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { clearInterval(timer); timer = null; }
      else { tick(); startClock(); }
    });
  }
}

/** 北京时间字段（每秒变化） */
export const bj = computed(() => beijingFields(clock.ms));
/** 北京日期序号（数值，跨日才变化） */
const dayIndex = computed(() => Math.floor((clock.ms + 8 * 3600000) / 86400000));
/** 今日北京日期字段（跨日才重算） */
export const todayFields = computed(() => { const t = beijingFields(dayIndex.value * 86400000 - 8 * 3600000); return { year: t.year, month: t.month, day: t.day }; });
/** YYYY-MM-DD（北京日期） */
export const todayKey = computed(() => { const t = todayFields.value; return ymd(t.year, t.month, t.day); });
/** 分钟戳（数值，每分钟变化一次） */
export const minuteStamp = computed(() => Math.floor(clock.ms / 60000));
/** 分钟戳 → 北京时间字段 */
export const fieldsOfMinute = stamp => beijingFields(stamp * 60000);
/** 当前北京时间的小时（每分钟判断；23 点为晚子时） */
export const nowHour = computed(() => fieldsOfMinute(minuteStamp.value).hour);
/** 此刻是否晚子时（23 点后，八字排盘日柱已属次日；与 bazi.js 的 setSect(1) 同一约定） */
export const isLateZi = computed(() => nowHour.value === 23);
/** 当前北京时间“YYYY-MM-DD HH:MM”（每分钟变化） */
export const nowMinuteKey = computed(() => ymdhm(fieldsOfMinute(minuteStamp.value)));
/** 当前年柱、月柱，如“丙午 己亥”（按节气交接时刻每分钟判断；返回字符串，内容不变时不触发下游） */
export const nowPillars = computed(() => yearMonthPillarsAt(fieldsOfMinute(minuteStamp.value)).join(' '));
/** 当前年柱（如“丙午”） */
export const nowYearPillar = computed(() => nowPillars.value.split(' ')[0]);
