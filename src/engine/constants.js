// 天干 / 地支
export const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 五行与天干地支对应关系
export const GAN_WX = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水'
};
export const ZHI_WX = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
  '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水'
};
export const WX_ORDER = ['木', '火', '土', '金', '水'];
/** 四柱柱位名称 */
export const PILLAR_SHORT = ['年', '月', '日', '时'];
export const PILLAR_LABELS = PILLAR_SHORT.map(s => s + '柱');

/** 五行加权总量 */
export const wxTotal = w => WX_ORDER.reduce((s, x) => s + (w[x] || 0), 0);
/** 按五行列表映射并以“、”连接；拆成单项后去重（不同五行的列表可能有相同条目，如木、火都含“教育”） */
export const joinMap = (list, map) => [...new Set(list.flatMap(w => (map[w] || '').split('、')).filter(Boolean))].join('、');

/** 五行 → 样式类后缀（wx-wood 等） */
const WX_CLASS = { '木': 'wood', '火': 'fire', '土': 'earth', '金': 'metal', '水': 'water' };
export const wxKey = wx => WX_CLASS[wx] || 'none';

// 五行生克
export const SHENG = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
export const KE = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };

// 六十甲子
export const JIA_ZI = Array.from({ length: 60 }, (_, i) => TIAN_GAN[i % 10] + DI_ZHI[i % 12]);

// 地支藏干表（本气/中气/余气 + 权重）
export const CANG_GAN = {
  '子': [['癸', 100]],
  '丑': [['己', 100], ['癸', 60], ['辛', 30]],
  '寅': [['甲', 100], ['丙', 60], ['戊', 30]],
  '卯': [['乙', 100]],
  '辰': [['戊', 100], ['乙', 60], ['癸', 30]],
  '巳': [['丙', 100], ['庚', 60], ['戊', 30]],
  '午': [['丁', 100], ['己', 60]],
  '未': [['己', 100], ['丁', 60], ['乙', 30]],
  '申': [['庚', 100], ['壬', 60], ['戊', 30]],
  '酉': [['辛', 100]],
  '戌': [['戊', 100], ['辛', 60], ['丁', 30]],
  '亥': [['壬', 100], ['甲', 60]]
};

// 十二节（月界标志，非气）
export const JIE_TERMS = ['小寒', '立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪'];

// 同党五行（印 + 比劫）
export const ALLY = { '木': ['木', '水'], '火': ['火', '木'], '土': ['土', '火'], '金': ['金', '土'], '水': ['水', '金'] };

/** 小时 → 时辰地支序号（23 点起为子时） */
export const shiChenIndex = hour => Math.floor(((hour + 1) % 24) / 2);

/** 十神：以日干看另一天干 */
export function tenGod(dayGan, gan) {
  const d = TIAN_GAN.indexOf(dayGan);
  const g = TIAN_GAN.indexOf(gan);
  if (d < 0 || g < 0) return '';
  const dw = GAN_WX[dayGan];
  const gw = GAN_WX[gan];
  const same = d % 2 === g % 2;
  if (gw === dw) return same ? '比肩' : '劫财';
  if (SHENG[dw] === gw) return same ? '食神' : '伤官';
  if (KE[dw] === gw) return same ? '偏财' : '正财';
  if (KE[gw] === dw) return same ? '七杀' : '正官';
  if (SHENG[gw] === dw) return same ? '偏印' : '正印';
  return '';
}
/** 十神大类 */
export const GOD_CLASS = { 比肩: '比劫', 劫财: '比劫', 食神: '食伤', 伤官: '食伤', 正财: '财星', 偏财: '财星', 正官: '官杀', 七杀: '官杀', 正印: '印星', 偏印: '印星' };

/** 十二长生：天干在某地支的状态 */
const STAGES = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
const CHANGSHENG_START = { 甲: '亥', 乙: '午', 丙: '寅', 丁: '酉', 戊: '寅', 己: '酉', 庚: '巳', 辛: '子', 壬: '申', 癸: '卯' };
export function changSheng(gan, zhi) {
  const start = DI_ZHI.indexOf(CHANGSHENG_START[gan]);
  const z = DI_ZHI.indexOf(zhi);
  if (start < 0 || z < 0) return '';
  const yang = TIAN_GAN.indexOf(gan) % 2 === 0;
  return STAGES[((yang ? z - start : start - z) + 12) % 12];
}

/** 旬空：某干支所在旬的两个空亡地支 */
export function xunKong(ganZhi) {
  const i = JIA_ZI.indexOf(ganZhi);
  if (i < 0) return '';
  const start = i - (i % 10);
  return DI_ZHI[(start + 10) % 12] + DI_ZHI[(start + 11) % 12];
}

export const MONTH_NAME = { 寅: '正月', 卯: '二月', 辰: '三月', 巳: '四月', 午: '五月', 未: '六月', 申: '七月', 酉: '八月', 戌: '九月', 亥: '十月', 子: '十一月', 丑: '十二月' };
/** 日干禄位、阳干羊刃（格局与神煞共用） */
export const LU = { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' };
export const YANG_REN = { 甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子' };

/** 五行对应的幸运色（解读与每日运签共用） */
export const LUCKY_COLOR = { 木: '绿色、青色', 火: '红色、紫色', 土: '黄色、棕色', 金: '白色、金色', 水: '蓝色、黑色' };

export const SEASON = { 寅: '春', 卯: '春', 辰: '春', 巳: '夏', 午: '夏', 未: '夏', 申: '秋', 酉: '秋', 戌: '秋', 亥: '冬', 子: '冬', 丑: '冬' };
