<template>
  <section class="section today" id="jinri">
    <header class="sec-head">
      <span class="sec-no">今</span>
      <div>
        <h2 class="sec-title">今日</h2>
        <p class="sec-en">TODAY · {{ dateLabel }}</p>
      </div>
      <p class="sec-desc">以今日干支对照你的日主，得一日之运；再抽一支喵签，讨个好彩头。</p>
    </header>

    <div class="today-grid">
      <!-- 每日运签 + 命猫 -->
      <article class="panel daily">
        <template v-if="me">
          <div class="daily-head">
            <MiaoCat :gan="meGan" />
            <div>
              <p class="daily-who">{{ me.entry.name }}的命猫 · {{ cat.breed }}</p>
              <h3 class="daily-cat">{{ cat.name }}<small>{{ meGan }}{{ meWx }}日主</small></h3>
              <p class="daily-motto">“{{ cat.motto }}”</p>
            </div>
          </div>
          <p class="daily-cat-text">{{ cat.text }}</p>
          <div class="daily-body">
            <p class="daily-gz">今日 <b>{{ daily.ganZhi }}</b> · <button type="button" class="term" @click="openTerm(daily.shiShen, $event.currentTarget)">{{ daily.shiShen }}</button>当值</p>
            <p v-if="lateZi" class="daily-rel">已过北京时间 23 点：运签与黄历一样按日历日；若按北京时间排盘，此刻日柱已属次日（开启真太阳时以校正后的时间为准）。</p>
            <h4 class="daily-title">{{ daily.title }}</h4>
            <p class="daily-text"><TermText :text="daily.text" /></p>
            <p class="daily-text"><TermText :text="daily.favorable" /></p>
            <p v-if="daily.relations.length" class="daily-rel">{{ daily.relations.join('；') }}</p>
            <dl class="daily-meta">
              <div><dt>宜</dt><dd>{{ daily.yi.join(' ') || '—' }}</dd></div>
              <div><dt>忌</dt><dd>{{ daily.ji.join(' ') || '—' }}</dd></div>
              <div><dt>幸运色</dt><dd>{{ daily.luckyColor }}</dd></div>
              <div><dt>财神</dt><dd>{{ daily.directions.财神 }}</dd></div>
            </dl>
          </div>
        </template>
        <div v-else class="daily-empty">
          <MiaoCat gan="壬" class="ghost" />
          <template v-if="myEntry">
            <h3>“我的命盘”无法计算</h3>
            <p>档案“{{ myEntry.name }}”的出生信息有误，请在档案中删除后重新排盘，或改设其他命盘。</p>
          </template>
          <template v-else>
            <h3>设定“我的命盘”</h3>
            <p>排盘后点击“存入档案”并设为我的命盘，这里就会每天为你生成运签，并找到属于你的命猫。</p>
            <button v-if="store.result && store.resultSource === 'form'" type="button" class="btn btn-ghost sm" @click="useCurrent">用刚排的命盘</button>
            <button v-else type="button" class="btn btn-ghost sm" @click="go">去排盘</button>
          </template>
        </div>
      </article>

      <!-- 喵签 -->
      <article class="panel qian" :class="{ drawn: !!sign }">
        <div v-if="!sign" class="qian-idle">
          <div class="qian-tube" :class="{ shake: shaking }" aria-hidden="true">
            <span v-for="i in 7" :key="i" class="qian-stick" :style="{ '--i': i }"></span>
          </div>
          <h3 class="qian-h">喵签</h3>
          <p class="qian-p">心中默念所问之事，每日可求一签。</p>
          <button type="button" class="btn btn-primary sm" :disabled="shaking" @click="draw">{{ shaking ? '摇签中…' : '求 签' }}</button>
        </div>
        <div v-else class="qian-card">
          <span class="qian-paw" aria-hidden="true">
            <svg viewBox="0 0 40 40"><ellipse cx="20" cy="26" rx="9" ry="8"/><ellipse cx="9" cy="15" rx="4" ry="5"/><ellipse cx="17" cy="9" rx="4" ry="5"/><ellipse cx="25" cy="9" rx="4" ry="5"/><ellipse cx="32" cy="15" rx="4" ry="5"/></svg>
          </span>
          <p class="qian-no num">第 {{ signIdx + 1 }} 签 · <b :class="'lv-' + levelKey">{{ sign.level }}</b></p>
          <h3 class="qian-title">{{ sign.title }}</h3>
          <p class="qian-poem"><span v-for="(l, i) in sign.poem" :key="i">{{ l }}</span></p>
          <p class="qian-explain">{{ sign.explain }}</p>
          <p class="qian-foot">明日可再求一签 · 仅供娱乐</p>
        </div>
      </article>
    </div>
  </section>
</template>

<script>
import MiaoCat from './MiaoCat.vue';
import TermText from './TermText.vue';
import { CATS } from '../data/cats.js';
import { QIAN, qianIndex } from '../data/qian.js';
import { computeCore, computeDaily } from '../engine/index.js';
import { GAN_WX } from '../engine/constants.js';
import { store, meEntry, saveChart, STORAGE_FAIL_MSG } from '../composables/store.js';
import { todayKey, todayFields, isLateZi } from '../composables/clock.js';
import { storage } from '../utils/storage.js';
import { openTerm, showToast, scrollToId } from '../composables/ui.js';

// 当天已求的签：{ date, idx }
const QIAN_KEY = 'xm:qian';

export default {
  name: 'TodaySection',
  components: { MiaoCat, TermText },
  setup: () => ({ store, openTerm }),
  data: () => ({ shaking: false, signIdx: null }),
  computed: {
    today() { return todayKey.value; },
    dateLabel() { return this.today.replace(/-/g, '.'); },
    lateZi() { return isLateZi.value; },
    myEntry() { return meEntry(); },
    // “我的命盘”的四柱与喜用
    // 档案刷新时内容未变的条目沿用原对象，因此只有“我的命盘”本身变化才会重算
    meChart() {
      if (!this.myEntry) return null;
      try {
        return computeCore(this.myEntry.input);
      } catch (e) {
        console.error('“我的命盘”无法计算:', e);
        return null;
      }
    },
    me() { return this.myEntry && this.meChart ? { entry: this.myEntry, chart: this.meChart } : null; },
    meGan() { return this.me.chart.values[2][0]; },
    meWx() { return GAN_WX[this.meGan]; },
    cat() { return CATS[this.meGan]; },
    daily() {
      return computeDaily(this.me.chart.values, this.me.chart.balance.useGod, todayFields.value);
    },
    seed() { return this.me ? this.me.chart.values.join('') : ''; },
    sign() { return this.signIdx == null ? null : QIAN[this.signIdx]; },
    levelKey() { return { 上上: 'top', 上吉: 'good', 中吉: 'mid', 小吉: 'small', 平: 'flat' }[this.sign.level]; },
  },
  watch: {
    today: { immediate: true, handler() { this.restore(); } }
  },
  mounted() {
    // 其他标签页求过签：同步过来（每日一签）
    this.onStorage = e => { if (e.key === QIAN_KEY || e.key === null) this.restoreSign(); };
    window.addEventListener('storage', this.onStorage);
  },
  beforeUnmount() { clearTimeout(this.drawTimer); window.removeEventListener('storage', this.onStorage); },
  methods: {
    restore() {
      // 跨日：取消进行中的摇签，避免把昨天的签记到今天
      clearTimeout(this.drawTimer);
      this.shaking = false;
      // 只保存当天的签：{ date, idx }
      this.restoreSign();
    },
    /** 读取今天已求的签（每日一签：当天求过就保留，设置或更换“我的命盘”也不能重求） */
    storedSign(date) {
      const v = storage.get(QIAN_KEY);
      return v && v.date === date && Number.isInteger(v.idx) && v.idx >= 0 && v.idx < QIAN.length ? v.idx : null;
    },
    restoreSign() { this.signIdx = this.storedSign(this.today); },
    draw() {
      this.shaking = true;
      const date = this.today; // 以开始求签的日期为准
      const seed = this.seed;
      this.drawTimer = setTimeout(() => {
        // 摇签期间其他标签页已求过：沿用那一签
        const existing = this.storedSign(date);
        this.signIdx = existing ?? qianIndex(date, seed);
        if (existing == null) storage.set(QIAN_KEY, { date, idx: this.signIdx });
        this.shaking = false;
      }, 1300);
    },
    useCurrent() {
      // 已在档案中则只标记为“我”，不改动原有称呼
      const saved = saveChart({ name: '我', tag: '自己', asMe: true, keepName: true });
      if (saved) showToast(saved.ok ? `已将“${saved.entry.name}”设为我的命盘` : STORAGE_FAIL_MSG);
    },
    go() { scrollToId('paipan'); }
  }
};
</script>
