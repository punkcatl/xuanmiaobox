<template>
  <div v-if="active" class="tour" role="dialog" aria-label="看懂你的盘">
    <div class="tour-spot" :style="spotStyle"></div>
    <div class="tour-card" :style="cardStyle">
      <p class="tour-step num">{{ step + 1 }} / {{ steps.length }}</p>
      <h4 class="tour-title">{{ current.title }}</h4>
      <p class="tour-text">{{ current.text }}</p>
      <div class="tour-actions">
        <button type="button" class="tour-skip" @click="finish()">跳过</button>
        <button v-if="step > 0" type="button" class="tour-btn ghost" @click="go(step - 1)">上一步</button>
        <button type="button" class="tour-btn" @click="step < steps.length - 1 ? go(step + 1) : finish()">
          {{ step < steps.length - 1 ? '下一步' : '开始探索' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
// “看懂你的盘”：在用户自己的命盘上逐步高亮讲解
import { GAN_WX, WX_ORDER } from '../engine/constants.js';
import { elementPresence } from '../engine/analysis.js';
import { lookupTerm } from '../data/glossary.js';
import { storage } from '../utils/storage.js';
import { lockScroll } from '../composables/ui.js';
import { viewport } from '../composables/viewport.js';
import { placeNear } from '../composables/placement.js';

const DONE_KEY = 'xm:tour-done';
const PAD = 10;

export default {
  name: 'ChartTour',
  props: { result: { type: Object, default: null } },
  data: () => ({ active: false, step: 0, rect: null }),
  computed: {
    vw() { return viewport.w; },
    vh() { return viewport.h; },
    steps() {
      const r = this.result;
      if (!r) return [];
      const dayGan = r.values[2][0];
      const dayWx = GAN_WX[dayGan];
      const stats = r.wuXing;
      const top = Math.max(...WX_ORDER.map(w => stats[w]));
      const tops = WX_ORDER.filter(w => stats[w] === top); // 并列时全部列出
      const most = tops.join('、');
      const { none, hidden } = elementPresence(stats, r.weighted); // 与解读同一判断
      const brief = (lookupTerm(dayGan) || {}).brief || '';
      const firstYun = r.大运[0];
      return [
        { sel: '#paipan-result [data-tour=chart]', title: '这就是你的八字', text: `四列分别是年、月、日、时四柱，大字上面一行是天干、下面一行是地支，一共八个字。颜色代表五行：绿木、红火、黄土、白金、蓝水。下方几行是专业盘面信息，点开行名就有解释。` },
        { sel: '#paipan-result [data-tour=day]', title: `日元 · ${dayGan}${dayWx}，就是你`, text: `日柱的天干代表你自己。${dayGan}为${brief}整张命盘都围绕它来看。点开任何一个字，都能看到它的含义。` },
        { sel: '#paipan-result [data-tour=wuxing]', title: '五行分布', text: `你的八字表面上${most}最多（${tops.length > 1 ? '各 ' : ''}${top} 个）${none.length ? `，命中没有${none.join('、')}` : ''}${hidden.length ? `，${hidden.join('、')}只藏在地支里` : ''}${!none.length && !hidden.length ? '，五行俱全' : ''}。五行的多少和平衡，是判断命局强弱、需要什么的基础。` },
        { sel: '#paipan-result [data-tour=reading]', title: '命盘解读', text: '从命主性格、强弱到喜用神、事业方向。带虚线下划线的词都可以点开，看白话解释。' },
        { sel: '#paipan-result [data-tour=dayun]', title: '大运：十年一步', text: `你${r.yunStart.replace(/，.*/, '')}，第一步大运是${firstYun.ganZhi}（${firstYun.startDate} 交运）。点任意一步大运，下面会展开那十年的流年；再点某一年，可以看到十二个流月。` }
      ];
    },
    current() { return this.steps[this.step] || {}; },
    spotStyle() {
      if (!this.rect) return { opacity: 0 };
      const r = this.rect;
      return { top: r.top - PAD + 'px', left: r.left - PAD + 'px', width: r.width + PAD * 2 + 'px', height: r.height + PAD * 2 + 'px' };
    },
    // 优先放在下方，其次上方
    cardStyle() {
      if (!this.rect) return { left: '16px', right: '16px', bottom: '16px' };
      const w = Math.min(340, this.vw - 32);
      // 上下都放不下（手机上的高元素）就贴在屏幕底部，保证完整可见
      return placeNear(this.rect, { w, need: 240, gap: PAD + 14 }, { w: this.vw, h: this.vh }, { align: 'left', fallback: 'bottom' });
    }
  },
  watch: {
    // 导览中命盘被替换或清空（如在背后又提交了表单）：结束导览
    result() { if (this.active) this.finish(false); }, // 被打断不算看过，下次自己排盘仍会自动开始
    // 视口变化时重新定位高亮
    vw() { this.measure(); },
    vh() { this.measure(); }
  },
  mounted() {
    this.onKey = e => { if (this.active && e.key === 'Escape') this.finish(); };
    // iOS 上 overflow:hidden 不一定能阻止触摸滚动：滚动时重新定位高亮
    this.onScroll = () => { if (this.active) this.measure(); };
    window.addEventListener('keydown', this.onKey);
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('scroll', this.onScroll);
    lockScroll('tour', false);
  },
  methods: {
    /** 首次排盘后自动开始；force 为手动重新打开 */
    start(force = false) {
      if (!this.steps.length) return; // 命盘已被清空（如期间又提交了错误日期）
      if (this.active) return; // 已在导览中（如手动打开后自动开始的定时才到）：不从头再来
      if (storage.get(DONE_KEY) && !force) return;
      this.active = true;
      lockScroll('tour', true);
      window.addEventListener('scroll', this.onScroll, { passive: true }); // 只在导览期间监听
      this.go(0);
    },
    go(i) {
      this.step = i;
      const el = document.querySelector(this.steps[i].sel);
      if (!el) { this.rect = null; return; }
      const top = el.getBoundingClientRect().top + window.scrollY;
      const target = Math.max(0, top - Math.min(140, this.vh * 0.2));
      // 瞬时滚动后测量，避免平滑滚动期间位置不准
      // 'instant' 用于越过 CSS 的平滑滚动；不认识该值的旧浏览器会抛错，改为临时关闭平滑滚动后跳转
      try { window.scrollTo({ top: target, behavior: 'instant' }); } catch (e) {
        const html = document.documentElement;
        html.style.scrollBehavior = 'auto';
        window.scrollTo(0, target);
        html.style.scrollBehavior = '';
      }
      this.$nextTick(this.measure);
    },
    measure() {
      if (!this.active) return;
      const el = document.querySelector(this.current.sel);
      if (!el) return;
      const r = el.getBoundingClientRect();
      this.rect = { top: r.top, left: r.left, width: r.width, height: Math.min(r.height, this.vh * 0.55), bottom: r.top + Math.min(r.height, this.vh * 0.55) };
    },
    /** @param {boolean} seen 是否记为已看过（跳过或看完为 true；被打断为 false） */
    finish(seen = true) {
      this.active = false;
      this.rect = null;
      lockScroll('tour', false);
      window.removeEventListener('scroll', this.onScroll);
      if (seen) storage.set(DONE_KEY, 1);
    }
  }
};
</script>
