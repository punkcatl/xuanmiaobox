// 生成可粘贴到任意 AI 助手的命盘解读提示词（不调用任何外部服务）
import { formatDateTime } from './date.js';
import { TOPICS, topicFacts, chatFacts, compatFacts } from '../engine/topics.js';
export function buildAiPrompt(r) {
  const i = r.input;
  const lines = [
    '请以专业而审慎的子平命理视角，解读以下八字。要求：先说明命局结构与旺衰，再谈性格、事业、感情与健康倾向，最后给出建设性的建议；避免宿命论和绝对化断语，健康问题提示就医。',
    '',
    `性别：${i.gender === 'male' ? '男（乾造）' : '女（坤造）'}`,
    `出生：公历 ${formatDateTime(i)}，${i.province}${i.city === i.province ? '' : i.city}${i.district || ''}`,
    ...r.notes.map(n => `说明：${n}`),
    '',
    `四柱：${r.values.join(' ')}`,
    ...r.bazi.map(p => `${p.label} ${p.value}：主星${p.shiShen}；藏干${p.hide.map(h => h.gan + '(' + h.shiShen + ')').join('、')}；纳音${p.naYin}；星运${p.diShi}${p.shensha.length ? '；神煞' + p.shensha.join('、') : ''}`),
    `刑冲合害：${r.relations.map(x => x.text).join('、') || '无明显关系'}`,
    `格局：${r.geju.name}（${r.geju.basis}）`,
    `旺衰：${r.balance.status}；喜用${r.balance.useGod.join('、')}，忌${r.balance.avoidGod.join('、')}`,
    `${r.yunStart}；大运：${r.大运.map(d => `${d.ganZhi}(${d.startAge}岁)`).join(' ')}`
  ];
  return lines.join('\n');
}

/**
 * 服务端分主题解读用的提示词：基础命盘 + 引擎算好的主题要素
 * @param r computeChart 结果  @param {string} topic TOPICS 的键  @param {number} currentYear 命理当前年
 */
export function buildTopicPrompt(r, topic, currentYear) {
  const t = TOPICS[topic] || TOPICS.overall;
  return [
    buildAiPrompt(r),
    `喜用主次：${r.balance.useGod.join(' > ')}（${r.balance.steps.find(s => s.startsWith('喜用主次')) || '按扶抑取用'}）`,
    '',
    `【本次问事：${t.label}】请围绕以下重点解读：${t.focus}。`,
    '以下要素由排盘程序算出，请以此为据，不要自行推算流年干支或吉凶：',
    ...topicFacts(r, topic, currentYear)
  ].join('\n');
}

const chartLines = r => buildAiPrompt(r).split('\n').slice(2).join('\n'); // 去掉开头的通用解读要求

/**
 * 多轮问事的命盘资料：基础命盘 + 全部主题要点 + 过去的验证年份；有合盘对象时附上对方命盘与合盘要素
 * @param {{ chart: object, relation: string } | null} partner
 */
export function buildChatContext(r, currentYear, partner = null) {
  const lines = ['【命盘资料】（求测者本人）', chartLines(r), '', ...chatFacts(r, currentYear)];
  if (partner) {
    lines.push('', '【合盘对象的命盘】', chartLines(partner.chart), '', ...compatFacts(r, partner.chart, partner.relation, currentYear));
  }
  return lines.join('\n');
}
