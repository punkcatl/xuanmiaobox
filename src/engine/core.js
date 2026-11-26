// 命盘核心：四柱 + 藏干加权 + 旺衰喜用（合盘与每日运签共用）
import { computePillars, weightedWuXing } from './bazi.js';
import { analyzeBalance } from './analysis.js';

function coreOf(pillarResult) {
  const weighted = weightedWuXing(pillarResult.pillars);
  return { ...pillarResult, weighted, balance: analyzeBalance(weighted, pillarResult.values) };
}

/** 轻量版命盘：四柱与喜用（不算大运、解读等） */
export const computeCore = person => coreOf(computePillars(person));
