<template>
  <figure class="fig">
    <!-- 五行生克 -->
    <svg v-if="name === 'wuxing'" viewBox="-130 -125 260 250" class="fig-svg">
      <defs>
        <marker :id="arrowId" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 1L9 5L0 9z" class="fig-arrowhead"/>
        </marker>
      </defs>
      <path v-for="(a, i) in shengArcs" :key="'s' + i" :d="a" class="fig-sheng" :marker-end="`url(#${arrowId})`"/>
      <line v-for="(l, i) in keLines" :key="'k' + i" v-bind="l" class="fig-ke" :marker-end="`url(#${arrowId})`"/>
      <g v-for="n in wxNodes" :key="n.name" :transform="`translate(${n.x} ${n.y})`" :class="'wx-' + n.key">
        <circle r="22" class="fig-node"/>
        <text class="fig-node-text">{{ n.name }}</text>
      </g>
    </svg>

    <!-- 干支表 -->
    <div v-else-if="name === 'ganzhi'" class="fig-gz">
      <div class="fig-gz-row">
        <span class="fig-gz-k">天干</span>
        <span v-for="g in TIAN_GAN" :key="g" class="fig-gz-c" :class="'wx-' + wxKey(GAN_WX[g])"><b>{{ g }}</b><i>{{ GAN_WX[g] }}</i></span>
      </div>
      <div class="fig-gz-row">
        <span class="fig-gz-k">地支</span>
        <span v-for="z in DI_ZHI" :key="z" class="fig-gz-c" :class="'wx-' + wxKey(ZHI_WX[z])"><b>{{ z }}</b><i>{{ ZHI_ANIMAL[z] }}</i></span>
      </div>
    </div>

    <!-- 四柱结构 -->
    <div v-else-if="name === 'pillars'" class="fig-pillars">
      <div class="fig-p-col" v-for="(p, i) in examplePillars" :key="i" :class="{ day: i === 2 }">
        <span class="fig-p-label">{{ PILLAR_LABELS[i] }}</span>
        <span class="fig-p-cell" :class="'wx-' + wxKey(GAN_WX[p[0]])">{{ p[0] }}</span>
        <span class="fig-p-cell" :class="['wx-' + wxKey(ZHI_WX[p[1]]), { lingling: i === 1 }]">{{ p[1] }}</span>
        <span class="fig-p-note">{{ ['祖上 · 早年', '父母 · 青年', '自己 · 配偶', '子女 · 晚年'][i] }}</span>
      </div>
      <div class="fig-p-legend"><span class="dot day"></span>日元（我）<span class="dot ling"></span>月令（季节）<span class="muted">上行天干 · 下行地支</span></div>
    </div>

    <!-- 旺衰天平 -->
    <svg v-else-if="name === 'balance'" viewBox="0 0 320 150" class="fig-svg">
      <line x1="160" y1="30" x2="160" y2="128" class="fig-line"/>
      <path d="M140 132h40" class="fig-line"/>
      <g transform="rotate(-8 160 34)">
        <line x1="50" y1="34" x2="270" y2="34" class="fig-line strong"/>
        <path d="M50 34l-26 44h52z" class="fig-pan"/>
        <path d="M270 34l-26 44h52z" class="fig-pan"/>
        <text x="50" y="98" class="fig-cap">帮扶</text>
        <text x="50" y="114" class="fig-sub">印星 · 比劫</text>
        <text x="270" y="98" class="fig-cap">克泄</text>
        <text x="270" y="114" class="fig-sub">食伤 · 财星 · 官杀</text>
      </g>
      <circle cx="160" cy="34" r="4" class="fig-dot"/>
      <text x="160" y="16" class="fig-sub">日元</text>
    </svg>

    <!-- 十神关系 -->
    <svg v-else-if="name === 'shishen'" viewBox="-140 -120 280 240" class="fig-svg">
      <circle r="30" class="fig-node me"/>
      <text class="fig-node-text">我</text>
      <g v-for="(s, i) in shishenNodes" :key="s.name">
        <line :x1="s.x * 0.36" :y1="s.y * 0.36" :x2="s.x * 0.72" :y2="s.y * 0.72" class="fig-line"/>
        <text :x="s.x * 0.54 + (s.x > 0 ? 6 : s.x < 0 ? -6 : 0)" :y="s.y * 0.54 + (s.x === 0 ? 0 : -6)" class="fig-sub rel">{{ s.rel }}</text>
        <g :transform="`translate(${s.x} ${s.y})`">
          <rect x="-34" y="-18" width="68" height="36" rx="2" class="fig-box"/>
          <text y="-2" class="fig-cap">{{ s.name }}</text>
          <text y="12" class="fig-sub">{{ s.items }}</text>
        </g>
      </g>
    </svg>

    <!-- 大运时间轴 -->
    <svg v-else-if="name === 'timeline'" viewBox="0 0 340 92" class="fig-svg">
      <g v-for="i in 6" :key="i">
        <rect :x="10 + (i - 1) * 54" y="24" width="50" height="30" class="fig-seg" :class="{ cur: i === 3 }"/>
        <text :x="35 + (i - 1) * 54" y="44" class="fig-cap">{{ timelineGz[i - 1] }}</text>
        <text :x="35 + (i - 1) * 54" y="16" class="fig-sub">{{ 1 + (i - 1) * 10 }}岁</text>
      </g>
      <g v-for="j in 10" :key="'y' + j">
        <line :x1="118 + (j - 1) * 5.4" y1="58" :x2="118 + (j - 1) * 5.4" y2="64" class="fig-line"/>
      </g>
      <text x="145" y="80" class="fig-sub">每步大运十年 · 每年一个流年</text>
    </svg>
  </figure>
</template>

<script>
import { TIAN_GAN, DI_ZHI, GAN_WX, ZHI_WX, WX_ORDER, KE, PILLAR_LABELS, wxKey } from '../engine/constants.js';
import { ZHI_ANIMAL } from '../data/glossary.js';

let figUid = 0;


// 五行节点：火在上，按相生顺时针排列（木 → 火 → 土 → 金 → 水）
const R = 88;
const ANG = { '木': 198, '火': 270, '土': 342, '金': 54, '水': 126 };
const pos = name => {
  const a = (ANG[name] * Math.PI) / 180;
  return { x: +(R * Math.cos(a)).toFixed(1), y: +(R * Math.sin(a)).toFixed(1) };
};
const wxNodes = WX_ORDER.map(name => ({ name, key: wxKey(name), ...pos(name) }));

// 相生：沿外圈的弧；相克：五角星连线。均缩短以避开节点圆
function shorten(a, b, d = 28) {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
  return { x1: a.x + (dx / len) * d, y1: a.y + (dy / len) * d, x2: b.x - (dx / len) * d, y2: b.y - (dy / len) * d };
}
const shengArcs = WX_ORDER.map((w, i) => {
  const a = (ANG[w] + 17) * Math.PI / 180;
  const b = (ANG[w] + 72 - 17) * Math.PI / 180;
  const r = R + 8;
  return `M${(r * Math.cos(a)).toFixed(1)} ${(r * Math.sin(a)).toFixed(1)} A${r} ${r} 0 0 1 ${(r * Math.cos(b)).toFixed(1)} ${(r * Math.sin(b)).toFixed(1)}`;
});
const keLines = WX_ORDER.map(w => shorten(pos(w), pos(KE[w])));

const shishenNodes = [
  { name: '印星', rel: '生我', items: '学业 · 长辈', a: 270 },
  { name: '比劫', rel: '同我', items: '兄弟 · 朋友', a: 342 },
  { name: '食伤', rel: '我生', items: '才华 · 表达', a: 54 },
  { name: '财星', rel: '我克', items: '财富 · 物质', a: 126 },
  { name: '官杀', rel: '克我', items: '事业 · 规范', a: 198 }
].map(s => ({ ...s, x: +(96 * Math.cos(s.a * Math.PI / 180)).toFixed(1), y: +(88 * Math.sin(s.a * Math.PI / 180)).toFixed(1) }));

export default {
  name: 'LessonFigure',
  props: { name: { type: String, required: true } },
  setup: () => ({
    arrowId: `fig-arrow-${++figUid}`, // 每个实例独立的 marker id：同时存在多张图（如章节切换过渡）时不冲突
    TIAN_GAN, DI_ZHI, GAN_WX, ZHI_WX, ZHI_ANIMAL, PILLAR_LABELS,
    wxNodes, shengArcs, keLines, shishenNodes,
    examplePillars: ['壬申', '壬子', '乙酉', '癸未'],
    timelineGz: ['癸丑', '甲寅', '乙卯', '丙辰', '丁巳', '戊午'],
    wxKey
  })
};
</script>
