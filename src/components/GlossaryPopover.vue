<template>
  <transition name="pop">
    <div v-if="entry" class="gloss-layer" :class="{ anchored: !isSheet }" @click.self="closeTerm">
      <div ref="card" class="gloss" :class="{ sheet: isSheet }" :style="style" role="dialog" :aria-label="entry.term + ' 释义'" tabindex="-1">
        <header class="gloss-head">
          <span class="gloss-term">{{ entry.term }}</span>
          <span class="gloss-cat">{{ entry.cat }}</span>
          <button type="button" class="gloss-x" aria-label="关闭" @click="closeTerm">×</button>
        </header>
        <p class="gloss-brief">{{ entry.brief }}</p>
        <p class="gloss-detail">{{ entry.detail }}</p>
        <button v-if="lesson" type="button" class="gloss-more" @click="openReader('lesson', lesson.id)">
          入门课 · {{ lesson.title }} <i>→</i>
        </button>
      </div>
    </div>
  </transition>
</template>

<script>
// 术语释义：桌面端为锚定气泡，手机端为底部抽屉
import { glossaryState, closeTerm, openReader, termAnchor } from '../composables/ui.js';
import { lookupTerm } from '../data/glossary.js';
import { lessonById } from '../data/lessons.js';
import { viewport } from '../composables/viewport.js';
import { placeNear } from '../composables/placement.js';

const W = 320;

export default {
  name: 'GlossaryPopover',
  setup: () => ({ state: glossaryState, closeTerm, openReader }),
  computed: {
    vw() { return viewport.w; },
    vh() { return viewport.h; },
    entry() { return this.state.term ? lookupTerm(this.state.term) : null; },
    lesson() { return this.entry && this.entry.lesson ? lessonById(this.entry.lesson) : null; },
    isSheet() { return this.vw <= 760 || !this.state.rect; },
    style() {
      if (this.isSheet) return {};
      return placeNear(this.state.rect, { w: W, need: 240, gap: 10 }, { w: this.vw, h: this.vh }, { fallback: 'top' });
    }
  },
  watch: {
    // 窗口尺寸变化：与滚动同样按锚点实际位移判断（位移不大时保留，如平板浏览器工具栏收起只改变高度）
    vw() { this.checkAnchor(); },
    vh() { this.checkAnchor(); },
    entry(v, old) {
      // 打开时记下触发的术语按钮；用 Esc / × 关闭时把焦点还给它（点页面别处关闭时焦点随点击走，不抢回）
      if (v && !old) { this.returnEl = termAnchor(); this.closedByOutside = false; }
      if (!v && old) {
        if (!this.closedByOutside && this.returnEl && this.returnEl.isConnected) this.returnEl.focus({ preventScroll: true });
        this.returnEl = null;
      }
      // 桌面锚定气泡：在捕获阶段监听页面别处的按下来关闭，点击照常落到目标上（不需要再点一次）
      document.removeEventListener('pointerdown', this.onOutside, true);
      if (v) document.addEventListener('pointerdown', this.onOutside, true);
      // 只在弹窗打开期间监听滚动
      window.removeEventListener('scroll', this.onScroll, { capture: true });
      if (v) window.addEventListener('scroll', this.onScroll, { passive: true, capture: true });
      if (v) this.$nextTick(() => this.$refs.card && this.$refs.card.focus({ preventScroll: true }));
    }
  },
  methods: {
    /** 锚点相对打开时的位置移动超过 40px（或已不在页面中）时关闭气泡；页面、阅读器等任何滚动容器与窗口缩放都适用 */
    checkAnchor() {
      if (!this.state.term || this.isSheet) return;
      const el = termAnchor();
      if (!el || !el.isConnected) { closeTerm(); return; }
      const r = el.getBoundingClientRect();
      if (Math.abs(r.top - this.state.rect.top) > 40 || Math.abs(r.left - this.state.rect.left) > 40) closeTerm();
    }
  },
  mounted() {
    // 捕获阶段处理：Esc 只关闭弹窗，并阻止事件再传给阅读器等其他监听者
    this.onKey = e => {
      if (e.key === 'Escape' && this.state.term) {
        closeTerm();
        e.stopPropagation();
      }
    };
    // 明显滚动后关闭气泡（锚点已移走）；小幅滚动（如点击时浏览器自动对齐）不关闭
    this.onScroll = () => this.checkAnchor();
    this.onOutside = e => {
      if (this.isSheet || !this.state.term || (this.$refs.card && this.$refs.card.contains(e.target))) return;
      this.closedByOutside = true;
      closeTerm();
    };
    window.addEventListener('keydown', this.onKey, { capture: true });
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.onKey, { capture: true });
    window.removeEventListener('scroll', this.onScroll, { capture: true });
    document.removeEventListener('pointerdown', this.onOutside, true);
  }
};
</script>
