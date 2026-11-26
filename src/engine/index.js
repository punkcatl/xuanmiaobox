// 引擎对外入口
import { countWuXing, describeCorrections, BaziError } from './bazi.js';
import { chartRelations } from './relations.js';
import { computeDaYun, computeLiuNian, computeLiuYue, baziYearFromPillar } from './fortune.js';
import { determineGeju, tiaoHou, buildReading } from './analysis.js';
import { computeDaily } from './daily.js';
import { computeCompat } from './compat.js';
import { computeCore } from './core.js';
import { isValidGender, birthDateError } from '../utils/validate.js';

/**
 * 完整命盘
 * @param {object} person { year, month, day, hour, minute, gender, province, city, district, useTrueSolarTime }
 */
export function computeChart(person) {
  // 性别无效时先不做排盘计算；但日期错误优先提示（日期有误时交给 computeCore 报出具体原因）
  if (!isValidGender(person.gender) && !birthDateError(person)) throw new BaziError('请选择性别'); // 影响大运顺逆排
  const { pillars, values, time, location, eightChar, weighted, balance } = computeCore(person);
  const counts = countWuXing(pillars);
  const geju = determineGeju(values);
  // 出生所属干支年：年柱按北京时间与立春比较，立春前出生属上一年
  const birthYear = baziYearFromPillar(person.year, values[0]);
  const dayun = computeDaYun(eightChar, person.gender, values, birthYear);
  return {
    input: { ...person },
    bazi: pillars,
    values,
    birthYear,
    wuXing: counts,
    weighted,
    balance,
    geju,
    tiaohou: tiaoHou(values),
    relations: chartRelations(values),
    reading: buildReading(values, weighted, balance, geju),
    大运: dayun.list,
    yunStart: dayun.start,
    trueSolarApplied: time.trueSolar.applied, // 是否实际做了真太阳时校正（有无经度数据）
    notes: describeCorrections(person, time, location)
  };
}

export { computeCore, computeCompat, computeDaily, computeLiuNian, computeLiuYue, baziYearFromPillar, BaziError };
