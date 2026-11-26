// 术语词典：入门说明、命盘点释、典籍注释共用
// 字段：term 词条 · cat 分类 · brief 一句白话 · detail 展开说明 · aliases 别名 · lesson 关联入门课
import { CANG_GAN, GAN_WX, ZHI_WX } from '../engine/constants.js';
import { SHENSHA_INFO } from '../engine/shensha.js';

const GAN_INFO = {
  '甲': ['阳', '参天大树', '刚直向上，有担当'],
  '乙': ['阴', '花草藤萝', '柔韧灵活，善于变通'],
  '丙': ['阳', '太阳之火', '热烈外放，光明磊落'],
  '丁': ['阴', '灯烛星火', '温和细腻，内敛专注'],
  '戊': ['阳', '高山城墙', '厚重稳健，守信可靠'],
  '己': ['阴', '田园湿土', '包容谦和，善于滋养'],
  '庚': ['阳', '刀剑顽铁', '刚毅果决，讲义气'],
  '辛': ['阴', '珠玉首饰', '精致敏锐，重品味'],
  '壬': ['阳', '江河大海', '奔放机敏，善谋略'],
  '癸': ['阴', '雨露泉水', '安静细腻，直觉强']
};
const ZHI_INFO = {
  '子': ['阳', '鼠', '23–1 点', '农历十一月（大雪至小寒）'],
  '丑': ['阴', '牛', '1–3 点', '农历十二月（小寒至立春）'],
  '寅': ['阳', '虎', '3–5 点', '农历正月（立春至惊蛰）'],
  '卯': ['阴', '兔', '5–7 点', '农历二月（惊蛰至清明）'],
  '辰': ['阳', '龙', '7–9 点', '农历三月（清明至立夏）'],
  '巳': ['阴', '蛇', '9–11 点', '农历四月（立夏至芒种）'],
  '午': ['阳', '马', '11–13 点', '农历五月（芒种至小暑）'],
  '未': ['阴', '羊', '13–15 点', '农历六月（小暑至立秋）'],
  '申': ['阳', '猴', '15–17 点', '农历七月（立秋至白露）'],
  '酉': ['阴', '鸡', '17–19 点', '农历八月（白露至寒露）'],
  '戌': ['阳', '狗', '19–21 点', '农历九月（寒露至立冬）'],
  '亥': ['阴', '猪', '21–23 点', '农历十月（立冬至大雪）']
};

const stems = Object.entries(GAN_INFO).map(([g, [yy, image, nature]]) => ({
  term: g, cat: '天干',
  brief: `${yy}${GAN_WX[g]}，如${image}。`,
  detail: `十天干之一，五行属${GAN_WX[g]}、性${yy}。古人以“${image}”比喻它，引申为${nature}的性情。出现在日柱天干时，代表命主本人的基本气质。`,
  lesson: 'tiangan-dizhi'
}));
/** 地支 → 生肖 */
export const ZHI_ANIMAL = Object.fromEntries(Object.entries(ZHI_INFO).map(([z, info]) => [z, info[1]]));
const branches = Object.entries(ZHI_INFO).map(([z, [yy, animal, hours, month]]) => ({
  term: z, cat: '地支',
  brief: `${yy}${ZHI_WX[z]}，生肖属${animal}，对应 ${hours}。`,
  detail: `十二地支之一，五行属${ZHI_WX[z]}。在时间上对应${month}和一天中的 ${hours}。地支里还藏着天干（藏干）：${CANG_GAN[z].map(([s]) => s + GAN_WX[s]).join('、')}，排第一个的力量最大。`,
  lesson: 'tiangan-dizhi'
}));

const concepts = [
  // —— 基础 ——
  { term: '阴阳', cat: '基础', brief: '万物一分为二的两种性质：动与静、刚与柔。', detail: '阳主动、外放、刚强，阴主静、内敛、柔顺。天干地支都分阴阳，阴阳搭配决定了五行之间是“同类相助”还是“异性相吸”。', lesson: 'yinyang-wuxing' },
  { term: '五行', cat: '基础', brief: '木、火、土、金、水五种基本能量。', detail: '五行不是五种物质，而是五种运动状态：木生发、火上炎、土承载、金收敛、水润下。它们之间有相生、相克的循环关系，是八字分析的底层语言。', lesson: 'yinyang-wuxing' },
  { term: '相生', cat: '基础', brief: '木生火、火生土、土生金、金生水、水生木。', detail: '一方滋养、扶助另一方。生我者如父母（印），我生者如子女（食伤）。生得太多也会“泄”掉自己的力量。', aliases: ['五行相生'], lesson: 'yinyang-wuxing' },
  { term: '相克', cat: '基础', brief: '木克土、土克水、水克火、火克金、金克木。', detail: '一方约束、制衡另一方。克并不全是坏事：适度的克让能量有方向，过度的克才会造成损伤。', aliases: ['五行相克', '生克'], lesson: 'yinyang-wuxing' },
  { term: '天干', cat: '基础', brief: '甲乙丙丁戊己庚辛壬癸，共十个。', detail: '天干代表“天”的气，外显、直接。每个天干都有固定的五行与阴阳：甲乙木、丙丁火、戊己土、庚辛金、壬癸水，单数为阳、双数为阴。', aliases: ['十天干', '十干'], lesson: 'tiangan-dizhi' },
  { term: '地支', cat: '基础', brief: '子丑寅卯辰巳午未申酉戌亥，共十二个。', detail: '地支代表“地”的气，内藏、复杂。它们对应十二个月、十二时辰和十二生肖，每个地支内部还藏有一到三个天干。', aliases: ['十二地支', '十二支'], lesson: 'tiangan-dizhi' },
  { term: '干支', cat: '基础', brief: '一个天干配一个地支，如“甲子”。', detail: '天干与地支按顺序两两相配，循环一周共六十组，称为六十甲子，古人用它来记年、月、日、时。', aliases: ['六十甲子'], lesson: 'tiangan-dizhi' },
  { term: '藏干', cat: '基础', brief: '藏在地支里面的天干。', detail: '地支比天干复杂，一个地支里藏着一到三个天干，分为本气、中气、余气，力量依次递减。分析五行强弱时要把藏干算进去。', aliases: ['人元'], lesson: 'tiangan-dizhi' },

  // —— 命盘结构 ——
  { term: '八字', cat: '命盘', brief: '出生年、月、日、时对应的八个字。', detail: '把出生时间换算成四组干支（四柱），每柱两字，共八字。八字是一个人出生那一刻天地之气的“快照”。', aliases: ['四柱八字'], lesson: 'sizhu' },
  { term: '四柱', cat: '命盘', brief: '年柱、月柱、日柱、时柱。', detail: '每一柱上面是天干、下面是地支。传统上年柱看祖上与早年，月柱看父母兄弟与青年，日柱看自己与配偶，时柱看子女与晚年。', lesson: 'sizhu' },
  { term: '年柱', cat: '命盘', brief: '出生年份的干支，以立春为界。', detail: '年柱以立春而不是元旦或春节换年。它代表祖辈、家世背景和十六岁前的早年环境。', lesson: 'sizhu' },
  { term: '月柱', cat: '命盘', brief: '出生月份的干支，以“节”为界换月。', detail: '八字的月份按节气划分（如立春到惊蛰为寅月），而不是农历初一。月柱的地支叫月令，是判断五行强弱最关键的位置。', lesson: 'sizhu' },
  { term: '日柱', cat: '命盘', brief: '出生那天的干支，最重要的一柱。', detail: '日柱的天干就是“日元”，代表你自己；日柱的地支叫夫妻宫，与配偶、婚姻相关。', lesson: 'sizhu' },
  { term: '时柱', cat: '命盘', brief: '出生时辰的干支。', detail: '一天分十二个时辰，每个时辰两小时。时柱的天干由日干推出（五鼠遁），代表子女、晚年与理想。出生时间不准，时柱就会出错。', lesson: 'sizhu' },
  { term: '日元', cat: '命盘', brief: '日柱的天干，代表“我”。', detail: '整张命盘都围绕日元来看：其他七个字与日元是生是克，决定了它们对你意味着什么（十神）。也叫日主、日干、命主。', aliases: ['日主', '日干', '命主'], lesson: 'rizhu' },
  { term: '月令', cat: '命盘', brief: '月柱的地支，代表出生的季节。', detail: '月令决定了五行在这个季节谁当令、谁休囚。古人说“月令为提纲”，判断日元强弱、定格局都先看月令。', aliases: ['月支', '提纲'], lesson: 'wangshuai' },
  { term: '时辰', cat: '命盘', brief: '古代计时单位，一个时辰等于两小时。', detail: '子时 23–1 点、丑时 1–3 点……依次类推，共十二个时辰。', lesson: 'sizhu' },
  { term: '乾造', cat: '命盘', brief: '男命的称呼。', detail: '命理书中称男命为乾造、女命为坤造，取自乾坤二卦。性别会影响大运的顺排或逆排。', aliases: ['乾'], lesson: 'dayun' },
  { term: '坤造', cat: '命盘', brief: '女命的称呼。', detail: '与乾造相对。', aliases: ['坤'], lesson: 'dayun' },

  // —— 强弱喜忌 ——
  { term: '旺衰', cat: '分析', brief: '日元力量的强弱程度。', detail: '看日元在月令是否当令、在地支有没有根、有没有生扶，综合判断身强、身弱或中和。这是取用神的前提。', aliases: ['衰旺', '强弱'], lesson: 'wangshuai' },
  { term: '身强', cat: '分析', brief: '日元力量偏强。', detail: '生扶日元的五行（印、比劫）占优。身强的人需要“泄”和“克”来平衡，喜用神通常是食伤、财、官杀。', aliases: ['身旺'], lesson: 'wangshuai' },
  { term: '身弱', cat: '分析', brief: '日元力量偏弱。', detail: '克泄日元的五行占优。身弱需要扶助，喜用神通常是印星和比劫。', lesson: 'wangshuai' },
  { term: '中和', cat: '分析', brief: '日元强弱适中，五行较为平衡。', detail: '命理以中和为贵。中和的命局喜忌较轻，本站看略偏哪一边：略偏强取克泄耗中最弱者为喜，略偏弱取生扶为喜；实际论命还要结合流通和调候。', lesson: 'wangshuai' },
  { term: '喜用神', cat: '分析', brief: '对命局有益、能让它趋于平衡的五行。', detail: '用神是命局最需要的五行，喜神是辅助用神的五行，合称喜用神。大运、流年遇到喜用神，往往顺遂。', aliases: ['用神', '喜神'], lesson: 'wangshuai' },
  { term: '忌神', cat: '分析', brief: '让命局更失衡的五行。', detail: '与喜用神相反。忌神当令的年份运势容易起伏，宜守不宜攻。', aliases: ['忌'], lesson: 'wangshuai' },
  { term: '通根', cat: '分析', brief: '天干在地支里找到同五行的“根”。', detail: '天干有根才有力，好比树木扎根于土。日元通根越多越强。', aliases: ['有根'], lesson: 'wangshuai' },
  { term: '透干', cat: '分析', brief: '地支藏干中的某个五行，也出现在天干上。', detail: '藏在地支里的力量“透”到天干，就更加显露、更有作用。定格局时尤其看月令藏干透出哪一个。', aliases: ['透出'], lesson: 'wangshuai' },
  { term: '格局', cat: '分析', brief: '命局的整体结构类型。', detail: '多以月令藏干透出的十神定格，如正官格、食神格。格局反映一生的主线和层次，是《子平真诠》的核心。', lesson: 'jiedu' },
  { term: '调候', cat: '分析', brief: '调节命局的寒暖燥湿。', detail: '冬天生的人命局偏寒，需要火来温暖；夏天生的偏燥，需要水来润泽。《穷通宝鉴》专论调候。', aliases: ['调候用神'], lesson: 'jiedu' },

  // —— 十神 ——
  { term: '十神', cat: '十神', brief: '以日元为中心，其他干支与“我”的十种关系。', detail: '由五行生克加阴阳同异组合而成：比肩、劫财、食神、伤官、正财、偏财、正官、七杀、正印、偏印。十神把抽象的五行翻译成人事：财富、事业、学业、人际等。', aliases: ['十神关系'], lesson: 'shishen' },
  { term: '比肩', cat: '十神', brief: '与日元同五行、同阴阳：兄弟朋友。', detail: '代表自我、同辈、合作者。身弱时比肩是帮手，身强时比肩多则易固执、与人争。', lesson: 'shishen' },
  { term: '劫财', cat: '十神', brief: '与日元同五行、异阴阳：竞争者。', detail: '代表同辈中的竞争者，也有冲劲、魄力。劫财旺时需防破财、合伙纠纷。', lesson: 'shishen' },
  { term: '食神', cat: '十神', brief: '日元所生、同阴阳：才华与享受。', detail: '代表口福、才艺、温和的表达和福气。食神能制七杀，被视为吉神。', lesson: 'shishen' },
  { term: '伤官', cat: '十神', brief: '日元所生、异阴阳：锋芒与创造力。', detail: '代表聪明、叛逆、表现欲和创新。伤官能生财，但会克正官，古书说“伤官见官，为祸百端”。', lesson: 'shishen' },
  { term: '正财', cat: '十神', brief: '日元所克、异阴阳：稳定收入。', detail: '代表勤劳所得、稳定的财富，男命也代表妻子。', lesson: 'shishen' },
  { term: '偏财', cat: '十神', brief: '日元所克、同阴阳：意外之财。', detail: '代表投资、生意、流动的财富，为人慷慨大方。男命也代表父亲。', lesson: 'shishen' },
  { term: '正官', cat: '十神', brief: '克日元、异阴阳：规范与名誉。', detail: '代表纪律、地位、职位与名声，女命也代表丈夫。正官清纯的人多守规矩、有责任心。', lesson: 'shishen' },
  { term: '七杀', cat: '十神', brief: '克日元、同阴阳：压力与魄力。', detail: '也叫偏官。代表挑战、权力、压力和魄力。七杀有制（有食神或印化）则化压力为权威。', aliases: ['七煞', '偏官'], lesson: 'shishen' },
  { term: '正印', cat: '十神', brief: '生日元、异阴阳：庇护与学识。', detail: '代表母亲、长辈、学业、文凭与贵人。身弱的人最喜正印生扶。', aliases: ['印绶'], lesson: 'shishen' },
  { term: '偏印', cat: '十神', brief: '生日元、同阴阳：偏门学问与灵感。', detail: '也叫枭神。代表独特的思维、玄学宗教、偏门技艺。偏印旺会克食神，古称“枭神夺食”。', aliases: ['枭神'], lesson: 'shishen' },
  { term: '比劫', cat: '十神', brief: '比肩与劫财的合称：同类。', detail: '和日元同五行的力量，代表自我与同辈。', aliases: ['比肩劫财', '比劫年', '比肩劫财运'], lesson: 'shishen' },
  { term: '食伤', cat: '十神', brief: '食神与伤官的合称：我生者。', detail: '日元所生的五行，代表表达、才华、创造和子女（女命）。', aliases: ['食伤泄秀', '食伤年', '食伤泄秀运'], lesson: 'shishen' },
  { term: '财星', cat: '十神', brief: '正财与偏财的合称：我克者。', detail: '日元所克的五行，代表财富、物质和（男命的）妻子。', aliases: ['财星年', '财星入运'], lesson: 'shishen' },
  { term: '官杀', cat: '十神', brief: '正官与七杀的合称：克我者。', detail: '克制日元的五行，代表事业、规范、压力和（女命的）丈夫。', aliases: ['官杀年', '官杀临运', '官星'], lesson: 'shishen' },
  { term: '印星', cat: '十神', brief: '正印与偏印的合称：生我者。', detail: '生扶日元的五行，代表学业、长辈、贵人和庇护。', aliases: ['印星年', '印绶生身运'], lesson: 'shishen' },

  // —— 运程 ——
  { term: '大运', cat: '运程', brief: '每十年一换的人生阶段运势。', detail: '从月柱出发顺排或逆排干支，每一组管十年。大运好比季节，决定一段时间的大环境；流年则是其中每一年的天气。', aliases: ['行运', '运'], lesson: 'dayun' },
  { term: '流年', cat: '运程', brief: '每一年的干支，如 2026 年为丙午。', detail: '流年干支与命局、大运相互作用，决定当年的具体事件和起伏。', aliases: ['岁运'], lesson: 'dayun' },
  { term: '起运', cat: '运程', brief: '开始走第一步大运的年龄。', detail: '顺排者数出生后到下一个“节”的时间，逆排者数出生前到上一个“节”的时间，约每三天折合一岁。起运之前，主要看命局本身和流年。', aliases: ['起运岁数'], lesson: 'dayun' },
  { term: '顺排', cat: '运程', brief: '大运按六十甲子向后排。', detail: '阳年出生的男命、阴年出生的女命，大运顺排；反之逆排。', lesson: 'dayun' },
  { term: '逆排', cat: '运程', brief: '大运按六十甲子向前倒排。', detail: '阴年出生的男命、阳年出生的女命，大运逆排；反之顺排。', lesson: 'dayun' },

  // —— 历法 ——
  { term: '节气', cat: '历法', brief: '一年二十四个太阳位置节点。', detail: '二十四节气按太阳运行划分，比农历更能反映季节。其中立春、惊蛰等十二个“节”是八字换月的分界。', aliases: ['二十四节气', '十二节'], lesson: 'sizhu' },
  { term: '立春', cat: '历法', brief: '八字新一年的起点，约在每年 2 月 4 日前后。', detail: '八字不以元旦或春节换年，而以立春换年。立春前出生的人，年柱仍算上一年。', lesson: 'sizhu' },
  { term: '真太阳时', cat: '历法', brief: '按出生地太阳实际位置校正后的时间。', detail: '北京时间以东经 120° 为准。出生地越往西，太阳越晚到正午，例如乌鲁木齐比北京时间晚约两小时。排八字应使用真太阳时，否则时柱可能出错。', lesson: 'sizhu' },
  { term: '晚子时', cat: '历法', brief: '23:00–24:00 出生。', detail: '子时跨越两天。按“子时换日”的规则，23 点后出生的日柱算作次日。不同流派对此有分歧。', aliases: ['子时换日'], lesson: 'sizhu' },
  { term: '早子时', cat: '历法', brief: '0:00–1:00 出生。', detail: '子时的后半段，已过午夜，日柱按当天排，时柱为当天的子时。与之相对的“晚子时”（23 点后）在本站按次日排日柱。', lesson: 'sizhu' },
  { term: '夏令时', cat: '历法', brief: '1986–1991 年中国曾把钟表拨快一小时。', detail: '这几年夏季出生的人，出生证明上的时间比标准时间快一小时，排盘前要回拨。', lesson: 'sizhu' },

  // —— 合盘 ——
  { term: '合盘', cat: '合盘', brief: '把两个人的八字放在一起比较。', detail: '看两人五行是否互补、日柱是否相合、对方能否补自己的喜用神。合盘结果只是参考，相处之道终究在人。', lesson: 'jiedu' },
  { term: '契合度', cat: '合盘', brief: '本站合盘给出的参考分数。', detail: '以 60 分为基础，按日干合冲、日支（夫妻宫）合冲刑害、生肖合冲、喜用互补与五行互补加减分，范围 30–98，每一项加减都会列出。仅作参考。', lesson: 'jiedu' }
];

// 五行单字词条
const elements = [
  ['木', '生发、条达，如春天的草木。', '对应春季、东方、青色，代表仁、成长与规划。'],
  ['火', '炎上、光明，如夏天的烈日。', '对应夏季、南方、红色，代表礼、热情与表达。'],
  ['土', '承载、包容，如大地。', '对应四季之末、中央、黄色，代表信、稳定与积累。'],
  ['金', '收敛、肃杀，如秋天的金属。', '对应秋季、西方、白色，代表义、决断与规则。'],
  ['水', '润下、流动，如冬天的江河。', '对应冬季、北方、黑色，代表智、变通与思考。']
].map(([term, brief, detail]) => ({ term, cat: '五行', brief, detail, lesson: 'yinyang-wuxing' }));

const shensha = Object.entries(SHENSHA_INFO).map(([term, brief]) => ({
  term, cat: '神煞', brief,
  detail: '神煞是依据干支组合推出的吉凶星，起法各派不一，本站取通行口诀。神煞只作参考，论命仍以五行旺衰与格局为主。',
  lesson: 'jiedu'
}));
// 盘面栏目
const panel = [
  { term: '主星', cat: '盘面', brief: '天干对日元的十神。', detail: '每柱天干相对日元是什么十神，就是该柱的主星。日柱天干即日元本身。', lesson: 'shishen' },
  { term: '副星', cat: '盘面', brief: '地支藏干对日元的十神。', detail: '地支里藏的天干也各有十神，称为副星，力量比主星含蓄。', lesson: 'shishen' },
  { term: '纳音', cat: '盘面', brief: '六十甲子各配一种五行意象，如“海中金”。', detail: '纳音把每两组干支归为一种带意象的五行，共三十种，古法常用于论年命，现代多作参考。', lesson: 'tiangan-dizhi' },
  { term: '星运', cat: '盘面', brief: '日元在各柱地支的十二长生状态。', detail: '十二长生描述五行力量的生命周期：长生、沐浴、冠带、临官、帝旺、衰、病、死、墓、绝、胎、养。星运看日元落在各地支时的强弱。', aliases: ['十二长生', '长生'], lesson: 'wangshuai' },
  { term: '自坐', cat: '盘面', brief: '各柱天干在本柱地支的十二长生状态。', detail: '看每柱天干坐在自己地支上是否有力，如“壬申”壬水坐申为长生。', lesson: 'wangshuai' },
  { term: '空亡', cat: '盘面', brief: '每旬十天中轮空的两个地支。', detail: '十天干配十二地支，每一旬总有两个地支没有天干相配，称为旬空或空亡。落空亡的地支力量减弱。', aliases: ['旬空'], lesson: 'tiangan-dizhi' },
  { term: '刑冲合害', cat: '盘面', brief: '干支之间的合、冲、刑、害关系。', detail: '合主和谐、牵绊；冲主变动、对立；刑主摩擦、波折；害主暗损。它们会改变五行的力量，是看命局动态的重要线索。', aliases: ['合冲', '冲合'], lesson: 'jiedu' }
];
export const glossary = [...concepts, ...elements, ...stems, ...branches, ...shensha, ...panel];

const byKey = new Map();
glossary.forEach(e => {
  byKey.set(e.term, e);
  (e.aliases || []).forEach(a => { if (!byKey.has(a)) byKey.set(a, e); });
});

/** 查词条（支持别名） */
export const lookupTerm = key => byKey.get(key) || null;

// 正文自动识别：只匹配两个字及以上的词，避免把每个“木”“甲”都标出来
const multiChar = [...byKey.keys()].filter(k => k.length >= 2).sort((a, b) => b.length - a.length);
const TERM_RE = new RegExp(multiChar.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');

/**
 * 把文本切分为普通片段和术语片段
 * @param {string} text
 * @param {{ once?: boolean, seen?: Set }} opts once：同一词条只标注第一次出现；seen：跨多段文本共享的已标注集合
 * @returns {Array<{ text: string, term?: string }>}
 */
export function splitTerms(text, { once = false, seen = new Set() } = {}) {
  const parts = [];
  let last = 0;
  for (const m of text.matchAll(TERM_RE)) {
    const entry = byKey.get(m[0]);
    if (once && seen.has(entry.term)) continue;
    seen.add(entry.term);
    if (m.index > last) parts.push({ text: text.slice(last, m.index) });
    parts.push({ text: m[0], term: entry.term });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}
