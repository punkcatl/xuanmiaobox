<template>
  <section class="almanac-wrap">
    <div class="almanac">
      <div class="almanac-item">
        <span class="k">公历</span>
        <span class="v num">{{ solarDate }}</span>
      </div>
      <div class="almanac-item">
        <span class="k">农历{{ day.zodiac ? ' · ' + day.zodiac + '年' : '' }}</span>
        <span class="v">{{ day.lunar }}<em v-if="day.term" class="term-tag">{{ day.term }}</em></span>
      </div>
      <div class="almanac-item">
        <span class="k">今日干支</span>
        <!-- 黄历按日历日换日；八字排盘 23 点后（晚子时）日柱已按次日，23 点内给出提示 -->
        <span class="v gz" title="黄历日柱按日历日；八字排盘时北京时间 23 点后（晚子时）日柱按次日（开启真太阳时则以校正后的时间为准）">{{ day.ganZhi }}<em v-if="lateZi" class="term-tag">排盘已属次日</em></span>
      </div>
      <div class="almanac-item">
        <span class="k">北京时间 · {{ shiChen }}</span>
        <ClockText />
      </div>
    </div>
    <button type="button" class="almanac-toggle" :aria-expanded="open" @click="open = !open">
      {{ open ? '收起黄历' : '展开今日黄历' }} <i :class="{ up: open }">⌄</i>
    </button>
    <transition name="fold">
      <div v-if="open" class="huangli">
        <div class="hl-row"><span class="hl-k yi">宜</span><span class="hl-v">{{ day.yi.join('　') || '—' }}</span></div>
        <div class="hl-row"><span class="hl-k ji">忌</span><span class="hl-v">{{ day.ji.join('　') || '—' }}</span></div>
        <div class="hl-grid">
          <div><span>冲煞</span><b>冲{{ day.chong }} · 煞{{ day.sha }}</b></div>
          <div><span>喜神</span><b>{{ day.xi }}</b></div>
          <div><span>财神</span><b>{{ day.cai }}</b></div>
          <div><span>福神</span><b>{{ day.fu }}</b></div>
        </div>
        <p class="hl-pengzu">彭祖百忌　{{ day.pengzu }}</p>
      </div>
    </transition>
  </section>
</template>

<script>
// 时令栏 + 黄历：秒级时钟在 ClockText 子组件；年月柱与时辰每分钟更新，黄历按日更新
import { DI_ZHI, shiChenIndex } from '../engine/constants.js';
import ClockText from './ClockText.vue';
import { todayKey, todayFields, nowHour, isLateZi, nowPillars } from '../composables/clock.js';
import { almanacOfDay } from '../engine/almanac.js';


export default {
  name: 'AlmanacBar',
  components: { ClockText },
  data: () => ({ open: false }),
  computed: {
    solarDate() { return todayKey.value; },
    // 年柱月柱按时刻判断节气交接：每分钟重算一次
    dayData() { return almanacOfDay(todayFields.value); },
    yearMonth() { return nowPillars.value; },
    day() { return { ...this.dayData, ganZhi: `${this.yearMonth} ${this.dayData.dayGz}` }; },
    hour() { return nowHour.value; },
    shiChen() { return DI_ZHI[shiChenIndex(this.hour)] + '时'; },
    lateZi() { return isLateZi.value; }
  },
};
</script>
