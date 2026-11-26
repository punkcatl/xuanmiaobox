// 省 / 市 / 区县级联（排盘与合盘表单共用）
import { regions, own } from '../data/regions.js';

export const provinces = Object.keys(regions);
// 用 own 只取自身键：地名可能来自分享链接（如 constructor、__proto__）
export const citiesOf = province => Object.keys(own(regions, province) || {});
export const districtsOf = (province, city) => own(own(regions, province), city) || [];

/** 旧版地区列表中的错字 / 旧名 → 现名（保证旧档案与旧分享链接仍能匹配） */
export const CITY_ALIAS = { 凼仔岛: '氹仔岛' };

/** 某市的默认区县（第一项） */
export const firstDistrict = (province, city) => districtsOf(province, city)[0] || '';

/** 省变化：市、区县重置为第一项 */
export function onProvinceChange(f) {
  f.city = citiesOf(f.province)[0] || '';
  onCityChange(f);
}
/** 市变化：区县重置为第一项 */
export function onCityChange(f) {
  f.district = firstDistrict(f.province, f.city);
}
