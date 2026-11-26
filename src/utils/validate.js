import { isValidDate } from '../engine/time.js';

/** 支持的出生年份范围 */
export const YEAR_MIN = 1900;
export const YEAR_MAX = 2100;

/** 是否为 [lo, hi] 范围内的整数 */
export const isIntIn = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;

/**
 * 出生日期时间的问题类型（排盘入口、档案、分享链接共用同一套规则）
 * @returns {'empty'|'nonint'|'year'|'date'|'time'|null}
 */
export function birthDateError(i) {
  const empty = v => v === '' || v == null || Number.isNaN(v);
  if ([i.year, i.month, i.day].some(empty)) return 'empty';
  if (![i.year, i.month, i.day].every(Number.isInteger)) return 'nonint';
  if (!isIntIn(i.year, YEAR_MIN, YEAR_MAX)) return 'year';
  if (!isIntIn(i.month, 1, 12) || !isIntIn(i.day, 1, 31) || !isValidDate(i.year, i.month, i.day)) return 'date';
  if (!isIntIn(i.hour, 0, 23) || !isIntIn(i.minute, 0, 59)) return 'time';
  return null;
}

export const isValidGender = g => g === 'male' || g === 'female';

/** 出生信息是否完整合法（含性别） */
export function isValidBirth(i) {
  return !!i && !birthDateError(i) && isValidGender(i.gender);
}
