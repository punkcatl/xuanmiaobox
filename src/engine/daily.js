// 每日运签：流日干支对照日主 + 黄历宜忌
import { GAN_WX, ZHI_WX, LUCKY_COLOR, tenGod, GOD_CLASS, joinMap } from './constants.js';
import { keyRelations } from './relations.js';
import { almanacOfDay } from './almanac.js';

const DAY_TEXT = {
  比劫: { title: '同气相求', text: '今日比劫当值，朋友同伴的力量明显。适合协作、聚会、运动；涉及钱财往来宜谨慎，不必与人争长短。' },
  食伤: { title: '灵感涌动', text: '今日食伤当值，表达欲与创造力旺盛。适合写作、创作、分享与学习新技能；说话留三分，避免口舌。' },
  财星: { title: '务实进取', text: '今日财星当值，适合处理财务、谈合作、推进具体事务。量入为出，不宜冲动消费或冒进投资。' },
  官杀: { title: '担当之日', text: '今日官杀当值，事务与压力较多，也是展现责任与能力的时机。按部就班，遵守规则，注意休息。' },
  印星: { title: '静心蓄力', text: '今日印星当值，适合读书、思考、请教长辈或独处充电。宜静不宜躁，好好照顾自己。' }
};

/**
 * @param {string[]} values 用户命局四柱
 * @param {string[]} useGod 喜用五行
 * @param {{ year, month, day }} day 北京日期
 */
export function computeDaily(values, useGod, day) {
  const al = almanacOfDay(day);
  const gz = al.dayGz;
  const dayGan = values[2][0];
  const god = tenGod(dayGan, gz[0]);
  const cls = GOD_CLASS[god];
  const rels = keyRelations(gz, values, { zhiOnly: true });
  const favorable = [GAN_WX[gz[0]], ZHI_WX[gz[1]]].filter(w => useGod.includes(w));
  return {
    ganZhi: gz,
    shiShen: god,
    title: DAY_TEXT[cls].title,
    text: DAY_TEXT[cls].text,
    favorable: favorable.length
      ? `今日干支含${[...new Set(favorable)].join('、')}，为您的喜用五行，整体顺遂。`
      : '今日干支不含您的喜用五行，宜稳中求进。',
    relations: rels.map(r => `流日${r.text}（${r.where}支）`),
    luckyColor: joinMap(useGod, LUCKY_COLOR),
    yi: al.yi,
    ji: al.ji,
    directions: { 喜神: al.xi, 财神: al.cai, 福神: al.fu }
  };
}
