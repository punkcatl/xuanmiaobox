<template>
  <div class="chart">
    <div class="ct" role="table" aria-label="四柱命盘" data-tour="chart">
      <div class="ct-row ct-head" role="row">
        <span class="ct-k" role="rowheader"></span>
        <span v-for="(p, i) in pillars" :key="i" class="ct-c" role="columnheader">{{ p.label }}<b v-if="i === 2" class="ct-day">日元</b></span>
      </div>
      <div class="ct-row" role="row">
        <span class="ct-k" role="rowheader"><button type="button" class="term" @click="openTerm('主星', $event.currentTarget)">主星</button></span>
        <span v-for="(p, i) in pillars" :key="i" class="ct-c ct-god" :class="{ me: i === 2 }">
          <button v-if="i !== 2" type="button" class="term" @click="openTerm(p.shiShen, $event.currentTarget)">{{ p.shiShen }}</button>
          <template v-else>{{ gender === 'male' ? '元男' : '元女' }}</template>
        </span>
      </div>
      <div class="ct-row ct-big" role="row">
        <span class="ct-k" role="rowheader">天干</span>
        <button v-for="(p, i) in pillars" :key="i" type="button" class="pillar-cell" :class="['wx-' + wxKey(p.wuXing.tianGan), { 'is-day': i === 2 }]" :data-tour="i === 2 ? 'day' : null" :aria-label="p.value[0] + ' 释义'" @click="openTerm(p.value[0], $event.currentTarget)">
          <span class="han">{{ p.value[0] }}</span><span class="wx">{{ p.wuXing.tianGan }}</span>
        </button>
      </div>
      <div class="ct-row ct-big" role="row">
        <span class="ct-k" role="rowheader">地支</span>
        <button v-for="(p, i) in pillars" :key="i" type="button" class="pillar-cell" :class="'wx-' + wxKey(p.wuXing.diZhi)" :aria-label="p.value[1] + ' 释义'" @click="openTerm(p.value[1], $event.currentTarget)">
          <span class="han">{{ p.value[1] }}</span><span class="wx">{{ p.wuXing.diZhi }}</span>
          <!-- 落空亡：该柱地支在日柱旬空之内（日柱自身不计） -->
          <span v-if="i !== 2 && dayKong.includes(p.value[1])" class="hot-dot ct-kong" title="落空亡（日柱旬空）"></span>
        </button>
      </div>

      <div v-if="zhiArcs.length" ref="arcwrap" class="ct-arcwrap" :style="{ height: arcHeight + 'px' }" aria-hidden="true">
        <svg class="ct-arcs" :viewBox="`0 0 400 ${arcHeight}`" preserveAspectRatio="none">
          <path v-for="(a, i) in zhiArcs" :key="i" :d="a.d" class="ct-arc" :class="'rel-' + a.kind" vector-effect="non-scaling-stroke"/>
        </svg>
        <span v-for="(a, i) in zhiArcs" :key="'l' + i" class="ct-arc-label" :class="'rel-' + a.kind" :style="{ left: a.mid + '%', top: a.labelY + 'px' }">{{ a.text }}</span>
      </div>

      <div class="ct-row" role="row">
        <span class="ct-k" role="rowheader"><button type="button" class="term" @click="openTerm('藏干', $event.currentTarget)">藏干</button></span>
        <span v-for="(p, i) in pillars" :key="i" class="ct-c ct-hide">
          <span v-for="(h, j) in p.hide" :key="j" class="ct-h"><b :class="'wx-' + wxKey(h.wx)">{{ h.gan }}</b><small>{{ h.shiShen }}</small></span>
        </span>
      </div>
      <div class="ct-row" role="row">
        <span class="ct-k" role="rowheader"><button type="button" class="term" @click="openTerm('纳音', $event.currentTarget)">纳音</button></span>
        <span v-for="(p, i) in pillars" :key="i" class="ct-c">{{ p.naYin }}</span>
      </div>
      <div class="ct-row" role="row">
        <span class="ct-k" role="rowheader"><button type="button" class="term" @click="openTerm('星运', $event.currentTarget)">星运</button></span>
        <span v-for="(p, i) in pillars" :key="i" class="ct-c">{{ p.diShi }}</span>
      </div>
      <div class="ct-row" role="row">
        <span class="ct-k" role="rowheader"><button type="button" class="term" @click="openTerm('自坐', $event.currentTarget)">自坐</button></span>
        <span v-for="(p, i) in pillars" :key="i" class="ct-c">{{ p.ziZuo }}</span>
      </div>
      <div class="ct-row" role="row">
        <span class="ct-k" role="rowheader"><button type="button" class="term" @click="openTerm('空亡', $event.currentTarget)">空亡</button></span>
        <span v-for="(p, i) in pillars" :key="i" class="ct-c" :class="{ hot: i === 2 }">{{ p.xunKong }}</span>
      </div>
      <div class="ct-row ct-sha" role="row">
        <span class="ct-k" role="rowheader">神煞</span>
        <span v-for="(p, i) in pillars" :key="i" class="ct-c">
          <button v-for="s in p.shensha" :key="s" type="button" class="sha" :class="{ good: SHENSHA_GOOD.has(s) }" @click="openTerm(s, $event.currentTarget)">{{ s }}</button>
          <i v-if="!p.shensha.length" class="ct-none">—</i>
        </span>
      </div>
    </div>

    <div v-if="relations.length" class="rels">
      <span class="rels-k"><button type="button" class="term" @click="openTerm('刑冲合害', $event.currentTarget)">刑冲合害</button></span>
      <span v-for="(r, i) in relations" :key="i" class="rel" :class="'rel-' + kindOf(r.type)">{{ r.text }}<small>{{ r.where }}</small></span>
    </div>
    <p class="ct-foot">空亡以日柱旬空（红字）为准，<span class="hot-dot"></span>标出落空亡的地支。神煞起法各派不一，仅供参考。</p>
  </div>
</template>

<script>
// 专业排盘表：主星、天干地支、藏干副星、纳音、星运、自坐、空亡、神煞，及地支关系连线
import { openTerm } from '../composables/ui.js';
import { wxKey } from '../engine/constants.js';
import { SHENSHA_GOOD } from '../engine/shensha.js';

const kindOf = t => ({ 合: 'he', 冲: 'chong', 刑: 'xing', 害: 'hai' }[t] || 'he');
// 四列中心（百分比）的默认值；挂载后按地支格的实际位置测量（列间有间距，不能简单按 12.5% 等分）
const COL_X = [12.5, 37.5, 62.5, 87.5];

export default {
  name: 'ChartTable',
  props: {
    pillars: { type: Array, required: true },
    relations: { type: Array, default: () => [] },
    gender: { type: String, default: 'male' }
  },
  setup: () => ({ openTerm, SHENSHA_GOOD, kindOf }),
  data: () => ({ colX: COL_X }),
  computed: {
    dayKong() { return this.pillars[2].xunKong; },
    // 地支两两关系画成弧线：跨度越大弧越深，同跨度的错开
    zhiArcs() {
      // 按跨度排序后逐条加深：每条弧（及其标签）的深度都不同，不会互相遮挡
      const pairs = this.relations.filter(r => r.level === 'zhi' && r.between.length === 2)
        .sort((a, b) => (a.between[1] - a.between[0]) - (b.between[1] - b.between[0]));
      return pairs.map((r, k) => {
        const [i, j] = r.between;
        const depth = 22 + k * 16;
        const x1 = this.colX[i] * 4;
        const x2 = this.colX[j] * 4;
        return {
          d: `M${x1} 0 C${x1} ${depth} ${x2} ${depth} ${x2} 0`,
          mid: (this.colX[i] + this.colX[j]) / 2,
          labelY: depth * 0.75 - 8,
          text: r.text,
          kind: kindOf(r.type)
        };
      });
    },
    arcHeight() { return this.zhiArcs.length ? Math.max(...this.zhiArcs.map(a => a.labelY)) + 22 : 0; }
  },
  mounted() {
    // 尺寸变化（窗口缩放、字体加载）时重新测量列中心
    this.ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => this.measure()) : null;
    if (this.ro) this.ro.observe(this.$el);
    this.$nextTick(this.measure);
  },
  // 命盘变化（换盘、关系弧线增减）时重测；尺寸变化由 ResizeObserver 负责
  watch: { pillars() { this.$nextTick(this.measure); }, relations() { this.$nextTick(this.measure); } },
  beforeUnmount() { if (this.ro) this.ro.disconnect(); },
  methods: {
    wxKey,
    /** 按地支格的实际位置算出四列中心相对弧线区域的百分比 */
    measure() {
      const wrap = this.$refs.arcwrap;
      const cells = this.$el.querySelectorAll('.ct-big .pillar-cell');
      if (!wrap || cells.length < 8) return;
      const box = wrap.getBoundingClientRect();
      if (!box.width) return;
      const zhiCells = [...cells].slice(4, 8); // 第二个 .ct-big 行为地支
      const xs = zhiCells.map(c => { const r = c.getBoundingClientRect(); return Math.round(((r.left + r.width / 2 - box.left) / box.width) * 1000) / 10; });
      if (xs.some((x, k) => x !== this.colX[k])) this.colX = xs;
    }
  }
};
</script>
