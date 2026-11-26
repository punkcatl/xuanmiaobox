<template>
  <div class="fortune">
    <p class="fortune-start">{{ yunStart }}<span class="muted">（年龄为虚岁）</span><b v-if="transitionHint" class="fortune-hint">{{ transitionHint }}</b></p>

    <div class="dayun" :class="{ 'has-pre': preRange }" role="tablist" aria-label="大运" data-tour="dayun">
      <!-- 起运前（童限）：出生到第一步交运之间的流年也要能查看 -->
      <button v-if="preRange" type="button" role="tab" class="dayun-item"
        :class="{ on: dIdx === -1, now: currentIdx === -1 }" :aria-selected="dIdx === -1" @click="selectDayun(-1)">
        <span class="dayun-age num">1<small>岁</small> · {{ preRange.from }}</span>
        <span class="dayun-gz">童限</span>
        <span class="dayun-god">起运前</span>
      </button>
      <button v-for="(d, i) in dayun" :key="i" type="button" role="tab" class="dayun-item"
        :class="{ on: i === dIdx, now: i === currentIdx }" :aria-selected="i === dIdx" @click="selectDayun(i)">
        <span class="dayun-age num" :title="'交运 ' + d.startAt">{{ d.startAge }}<small>岁</small> · {{ d.fromYear }}</span>
        <span class="dayun-gz">{{ d.ganZhi }}</span>
        <span class="dayun-god">{{ d.shiShen }}</span>
      </button>
    </div>

    <div v-if="curRange" class="fortune-detail">
      <p v-if="!curDayun" class="fortune-text"><b>童限</b> 尚未交入大运，此间以命局本身与流年为主。</p>
      <p v-else class="fortune-text"><b>{{ curDayun.ganZhi }}运</b> <TermText :text="curDayun.analysis" /></p>
      <p v-if="curDayun && curDayun.relations.length" class="fortune-rel">与命局：<span v-for="(r, i) in curDayun.relations" :key="i" class="rel-chip">{{ r }}</span></p>

      <h4 class="fortune-h">流年 <small>{{ curRange.from }}–{{ curRange.to }}（含交运年）</small></h4>
      <div class="liunian">
        <button v-for="y in liunian" :key="y.year" type="button" class="liunian-item" :class="{ now: y.isCurrent, on: y.year === year }" @click="year = y.year; userPicked = true">
          <span class="liunian-head"><span class="liunian-year num">{{ y.year }}</span><span class="liunian-gz">{{ y.ganZhi }}</span></span>
          <span class="liunian-god">{{ y.shiShen }}<i v-if="y.relations.length" class="dot" title="与命局有冲合"></i></span>
        </button>
      </div>

      <div v-if="curYear" class="fortune-year">
        <p class="fortune-text"><b>{{ curYear.year }} {{ curYear.ganZhi }}</b> <TermText :text="curYear.analysis" /></p>
        <p v-if="curYear.relations.length" class="fortune-rel">与命局：<span v-for="(r, i) in curYear.relations" :key="i" class="rel-chip">{{ r }}</span></p>
        <h4 class="fortune-h">流月 <small>以节气换月</small></h4>
        <div class="liuyue">
          <div v-for="m in liuyue" :key="m.label" class="liuyue-item">
            <span class="liuyue-m">{{ m.label }}<small>{{ m.jie }}</small></span>
            <span class="liuyue-gz">{{ m.ganZhi }}</span>
            <span class="liuyue-god">{{ m.shiShen }}</span>
            <span v-if="m.relations.length" class="liuyue-rel">{{ m.relations.join('　') }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// 大运 → 流年 → 流月 联动
import TermText from './TermText.vue';
import { computeLiuNian, computeLiuYue } from '../engine/index.js';
import { nowMinuteKey } from '../composables/clock.js';

export default {
  name: 'FortunePanel',
  components: { TermText },
  props: {
    values: { type: Array, required: true },
    dayun: { type: Array, required: true },
    yunStart: { type: String, default: '' },
    currentYear: { type: Number, required: true },
    birthYear: { type: Number, default: null } // 出生所属干支年，用于“起运前”的流年
  },
  data: () => ({ dIdx: 0, year: null, userPicked: false }),
  computed: {
    // 北京时间“YYYY-MM-DD HH:MM”，与交运时刻比较判断当前大运（直接读时钟，只有本组件每分钟更新）
    now() { return nowMinuteKey.value; },
    /** 今天所处大运的序号（按交运日判断），-1 表示尚未起运 */
    currentIdx() {
      // 从后往前找第一个已交运的步（交运时刻按字符串比较）；-1 为尚未起运
      // 最后一步也已走完（如 1926 年前出生，十步大运至今已结束）：返回 dayun.length，不标记任何一步为当前
      const last = this.dayun.length - 1;
      for (let i = last; i >= 0; i--) {
        if (this.dayun[i].startAt <= this.now) return i === last && this.now >= this.dayun[i].endAt ? this.dayun.length : i;
      }
      return -1;
    },
    curDayun() { return this.dayun[this.dIdx] || null; },
    /** 起运前（童限）的流年范围：出生年 ~ 第一步交运年；同年起运则不单列 */
    preRange() {
      const first = this.dayun[0];
      return first && this.birthYear != null && first.fromYear > this.birthYear ? { from: this.birthYear, to: first.fromYear } : null;
    },
    /** 当前选中项的流年范围（干支年，由引擎按交运日与立春推算，交运年前后两步都含） */
    curRange() { return this.rangeOf(this.dIdx); },
    /** 公历年内即将交入下一步大运时的提示 */
    transitionHint() {
      const next = this.dayun[this.currentIdx + 1];
      // 公历年内即将交运时提示。不说“今年”：流年列表的“今年”以立春为界，元旦至立春之间两者会指不同的年
      return next && next.startAt.slice(0, 4) === this.now.slice(0, 4) && next.startAt > this.now
        ? `将于 ${next.startDate} 交入${next.ganZhi}运` : '';
    },
    liunian() {
      if (!this.curRange) return [];
      const { from, to } = this.curRange;
      return computeLiuNian(this.values, from, to - from + 1, this.currentYear);
    },
    curYear() { return this.liunian.find(y => y.year === this.year) || null; },
    liuyue() { return this.curYear ? computeLiuYue(this.values, this.curYear.year) : []; }
  },
  watch: {
    // 新命盘或跨过立春：默认选中当前所在大运与今年
    dayun: { immediate: true, handler() { this.userPicked = false; this.resetSelection(); } },
    // 跨过立春或交运日：若用户没有手动选择，才自动跟随到当前
    currentYear() { if (!this.userPicked) this.resetSelection(); },
    currentIdx() { if (!this.userPicked) this.resetSelection(); }
  },
  methods: {
    /** 第 i 步大运的流年范围；-1 为起运前 */
    rangeOf(i) {
      if (i === -1) return this.preRange;
      const d = this.dayun[i];
      return d ? { from: d.fromYear, to: d.toYear } : null;
    },
    /** 某步大运默认选中的流年：列表含今年则选今年，否则选首年 */
    yearFor(i) {
      const range = this.rangeOf(i);
      if (!range) return null;
      const { from, to } = range;
      return this.currentYear >= from && this.currentYear <= to ? this.currentYear : from;
    },
    resetSelection() {
      // 默认展开按交运日期判断的当前大运（交运当年由“将于某日交入某运”提示说明）
      // 尚未起运：有“起运前”一项则选它，否则选第一步
      // 十步都已走完：默认展开最后一步
      this.dIdx = this.currentIdx >= this.dayun.length ? this.dayun.length - 1 : this.currentIdx >= 0 ? this.currentIdx : this.preRange ? -1 : 0;
      this.year = this.yearFor(this.dIdx);
    },
    selectDayun(i) {
      this.userPicked = true;
      this.dIdx = i;
      this.year = this.yearFor(i);
    }
  }
};
</script>
