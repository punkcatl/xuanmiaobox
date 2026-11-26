<template>
  <div class="luopan" aria-hidden="true">
    <div class="luopan-turn" :style="{ transform: `rotate(${turn}deg)` }">
    <svg viewBox="-300 -300 600 600" v-once>
      <g class="ring ring-ticks">
        <circle r="292" class="lp-line"/>
        <circle r="282" class="lp-line faint"/>
        <line v-for="i in 120" :key="'t'+i" :x1="0" :y1="-282" :x2="0" :y2="i % 5 === 0 ? -270 : -276" :transform="`rotate(${i * 3})`" class="lp-tick"/>
      </g>
      <g class="ring ring-shan">
        <circle r="262" class="lp-line faint"/>
        <circle r="214" class="lp-line faint"/>
        <g v-for="(c, i) in shan24" :key="'s'+i" :transform="`rotate(${i * 15})`">
          <line x1="0" y1="-262" x2="0" y2="-214" :transform="'rotate(7.5)'" class="lp-line faint"/>
          <text x="0" y="-230" class="lp-char" :class="{ 'is-zhi': diZhi.includes(c) }">{{ c }}</text>
        </g>
      </g>
      <g class="ring ring-gua">
        <circle r="196" class="lp-line"/>
        <circle r="150" class="lp-line faint"/>
        <g v-for="(g, i) in bagua" :key="'g'+i" :transform="`rotate(${i * 45 + 180})`">
          <g v-for="(yao, j) in g" :key="j">
            <rect v-if="yao" x="-16" :y="-184 + j * 9" width="32" height="4" class="lp-yao"/>
            <template v-else>
              <rect x="-16" :y="-184 + j * 9" width="13" height="4" class="lp-yao"/>
              <rect x="3" :y="-184 + j * 9" width="13" height="4" class="lp-yao"/>
            </template>
          </g>
        </g>
      </g>
    </svg>
    <!-- 联动层：喜用方位亮金 -->
    <svg viewBox="-300 -300 600 600" class="luopan-hl">
      <path v-for="a in sectors" :key="a.el" :d="a.d" class="lp-sector"/>
      <circle v-if="useGod.includes('土')" r="140" class="lp-center"/>
    </svg>
    </div>
  </div>
</template>

<script>
// 罗盘：刻度与文字为静态内容（v-once）；联动层随命盘变化：
// 整盘转到日主五行方位，喜用五行所在方位亮金（子在上为北，卯东、午南、酉西）
import { DI_ZHI as DZ, GAN_WX } from '../engine/constants.js';

const DIR = { 水: 0, 木: 90, 火: 180, 金: 270 };
function sector(deg, r1 = 214, r2 = 262, half = 37.5) {
  const p = (r, a) => { const t = (a - 90) * Math.PI / 180; return `${(r * Math.cos(t)).toFixed(1)} ${(r * Math.sin(t)).toFixed(1)}`; };
  return `M${p(r1, deg - half)} L${p(r2, deg - half)} A${r2} ${r2} 0 0 1 ${p(r2, deg + half)} L${p(r1, deg + half)} A${r1} ${r1} 0 0 0 ${p(r1, deg - half)}Z`;
}
const SHAN_24 = ['子', '癸', '丑', '艮', '寅', '甲', '卯', '乙', '辰', '巽', '巳', '丙', '午', '丁', '未', '坤', '申', '庚', '酉', '辛', '戌', '乾', '亥', '壬'];
// 先天八卦（乾南坤北、离东坎西），自外向内为上爻→初爻（1 阳 0 阴）；数组从乾起顺时针，绘制时整体转 180° 使乾居南（下）
const BAGUA = [[1, 1, 1], [1, 1, 0], [0, 1, 0], [1, 0, 0], [0, 0, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1]];

export default {
  name: 'LuopanDial',
  props: {
    dayGan: { type: String, default: '' },
    useGod: { type: Array, default: () => [] }
  },
  setup: () => ({ shan24: SHAN_24, diZhi: DZ, bagua: BAGUA }),
  computed: {
    // 日主五行方位转到正上方；土居中不转
    turn() { const d = DIR[GAN_WX[this.dayGan]]; return d == null ? 0 : -d; },
    sectors() { return this.useGod.filter(el => DIR[el] != null).map(el => ({ el, d: sector(DIR[el]) })); }
  }
};
</script>
