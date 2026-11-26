<template>
  <div class="site">
    <div class="grain" aria-hidden="true"></div>

    <!-- 顶栏 -->
    <nav class="nav">
      <a class="brand" href="#top" @click.prevent="scrollTo('top')">
        <SealMark class="brand-seal" />
        <span class="brand-name">玄喵盒子</span>
      </a>
      <div class="nav-links">
        <a href="#jinri" @click.prevent="scrollTo('jinri')">今日</a>
        <a href="#paipan" @click.prevent="scrollTo('paipan')">排盘</a>
        <a href="#hepan" @click.prevent="scrollTo('hepan')">合盘</a>
        <a href="#rumen" @click.prevent="scrollTo('rumen')">入门</a>
        <a href="#dianji" @click.prevent="scrollTo('dianji')">典籍</a>
      </div>
    </nav>

    <!-- 首屏 -->
    <header class="hero" id="top">
      <div class="hero-stage">
      <LuopanDial :day-gan="store.result ? store.result.values[2][0] : ''" :use-god="store.result ? store.result.balance.useGod : NO_GODS" />

      <div class="hero-core">
        <h1 class="hero-title">玄喵盒子</h1>
        <div class="hero-verse">观天干地支<br>知命理流转</div>
        <SealMark class="hero-seal" />
      </div>
      </div>

      <div class="hero-foot">
        <p class="hero-en">XUANMIAO · A STUDY OF THE FOUR PILLARS</p>
        <button class="btn btn-ghost" @click="scrollTo('paipan')">起 盘</button>
      </div>
    </header>

    <!-- 时令 · 黄历 -->
    <AlmanacBar />

    <main class="main">
      <KnowledgeNote />
      <TodaySection />

      <!-- 壹 排盘 -->
      <section class="section" id="paipan">
        <header class="sec-head">
          <span class="sec-no">壹</span>
          <div>
            <h2 class="sec-title">八字排盘</h2>
            <p class="sec-en">FOUR PILLARS OF DESTINY</p>
          </div>
          <p class="sec-desc">以出生之年、月、日、时，排列天干地支，观五行生克，推演一生格局。</p>
        </header>
        <BaziForm />
        <transition name="rise">
          <ChartResult v-if="store.result" :r="store.result" :current-year="fortuneYear" @tour="$refs.tour.start(true)" />
        </transition>
      </section>

      <!-- 贰 合盘 -->
      <CompatPanel />

      <!-- 叁 入门 · 肆 典籍 -->
      <LearnSection />
      <ClassicsSection />
    </main>

    <GlossaryPopover />
    <ReaderPanel v-if="readerUsed" />
    <ChartTour ref="tour" :result="store.result" />
    <transition name="toast"><div v-if="toast.msg" :key="toast.id" class="toast" role="status">{{ toast.msg }}</div></transition>

    <footer class="footer">
      <SealMark class="footer-seal" line />
      <p>玄喵盒子 · 八字研习</p>
      <p class="footer-sub">© {{ currentYear }} · 本站内容仅供传统文化研习与娱乐参考，不构成任何决策建议</p>
    </footer>
  </div>
</template>

<script>
import SealMark from './components/SealMark.vue';
import LuopanDial from './components/LuopanDial.vue';
import AlmanacBar from './components/AlmanacBar.vue';
import KnowledgeNote from './components/KnowledgeNote.vue';
import TodaySection from './components/TodaySection.vue';
import BaziForm from './components/BaziForm.vue';
import ChartResult from './components/ChartResult.vue';
import CompatPanel from './components/CompatPanel.vue';
import LearnSection from './components/LearnSection.vue';
import ClassicsSection from './components/ClassicsSection.vue';
import GlossaryPopover from './components/GlossaryPopover.vue';
import ChartTour from './components/ChartTour.vue';
import { defineAsyncComponent, h, ref, onMounted, onBeforeUnmount } from 'vue';
import { RESTORE_KEY } from './utils/staleDeploy.js';
import { store, calculateChart, inputFromUrl, hasShareParams, withoutShareParams } from './composables/store.js';
import { toastState, scrollToId, readerState, glossaryState, closeReader, lockScroll } from './composables/ui.js';
import { baziYearFromPillar } from './engine/index.js';
import { startClock, todayFields, nowYearPillar } from './composables/clock.js';


// 阅读器组件下载期间 / 失败时的占位：保证点击后立即有反馈，且可以关闭
const readerShell = (text, failed = false) => ({
  // 与阅读器一致：Esc 关闭，打开时焦点移到关闭按钮（阅读器组件未加载时由占位层负责）
  setup() {
    const closeBtn = ref(null);
    const onKey = e => { if (e.key === 'Escape' && readerState.kind && !glossaryState.term) closeReader(); };
    onMounted(() => { window.addEventListener('keydown', onKey); closeBtn.value && closeBtn.value.focus({ preventScroll: true }); });
    onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
    // 只在阅读器处于打开状态时显示；关闭后不再遮挡页面
    return () => !readerState.kind ? null : h('div', { class: 'reader', role: 'dialog', 'aria-modal': 'true' }, [
    h('header', { class: 'reader-bar' }, [
      h('div', { class: 'reader-title' }, [h('b', readerState.kind === 'lesson' ? '八字入门' : '典籍')]),
      h('button', { ref: closeBtn, type: 'button', class: 'reader-btn close', 'aria-label': '关闭', onClick: closeReader }, '×')
    ]),
    h('div', { class: 'reader-loading' }, [
      text,
      // 浏览器会缓存加载失败的模块，页面内无法重试：提供刷新页面
      failed ? h('p', [h('button', { type: 'button', class: 'btn btn-ghost sm', style: 'margin-top:20px', onClick: () => location.reload() }, '重新加载页面')]) : null
    ])
    ]);
  }
});
const NO_GODS = Object.freeze([]); // 无命盘时传给罗盘的空数组：固定引用，避免每次渲染都触发罗盘更新
const readerLoaded = ref(false);
const ReaderPanel = defineAsyncComponent({
  loader: () => import('./components/ReaderPanel.vue').then(m => { readerLoaded.value = true; return m; }),
  timeout: 20000, // 请求挂起时也能给出失败提示
  loadingComponent: readerShell('展卷中…'),
  errorComponent: readerShell('阅读器加载失败，请检查网络后重新加载页面。', true),
  delay: 0
});

export default {
  name: 'App',
  components: { SealMark, LuopanDial, AlmanacBar, KnowledgeNote, TodaySection, BaziForm, ChartResult, CompatPanel, LearnSection, ClassicsSection, GlossaryPopover, ReaderPanel, ChartTour },
  setup: () => ({ store, toast: toastState, readerState, NO_GODS }),
  computed: {
    // 阅读器首次打开时才加载（不进首屏包）；加载成功后常驻（保留关闭动画）。
    // 加载失败后 Vue 与浏览器都会缓存这次失败，页内无法重试，故失败提示里提供“重新加载页面”
    readerUsed() { return readerLoaded.value || !!readerState.kind; },
    currentYear() { return todayFields.value.year; },
    // 运程“今年”：由当前年柱（与时令栏同一次计算）推出，立春时刻换年
    fortuneYear() { return baziYearFromPillar(this.currentYear, nowYearPillar.value); }
  },
  watch: {
    // 阅读器打开期间锁定页面滚动；放在这里统一管理，组件下载中 / 失败的占位层也同样生效
    'readerState.kind': { immediate: true, handler(kind) { lockScroll('reader', !!kind); } },
    'store.result'(val) {
      clearTimeout(this.tourTimer); // 任何新结果（含清空、静默恢复）都取消上一次排盘留下的导览定时
      if (!val) return;
      // 静默恢复的命盘（发布新版本后自动刷新）：不滚动、不弹导览，保持用户原来的位置
      if (store.resultSilent) return;
      this.$nextTick(() => this.scrollTo('paipan-result'));
      // 首次自己提交排盘后启动“看懂你的盘”导览（分享链接、档案里可能是别人的盘，不自动开始）
      if (store.resultSource === 'form') {
        this.tourTimer = setTimeout(() => {
          // 期间用户已打开阅读器或术语弹窗：不再叠加导览
          if (this.$refs.tour && !readerState.kind && !glossaryState.term) this.$refs.tour.start();
        }, 900);
      }
    }
  },
  mounted() {
    startClock();
    // 发布新版本后自动刷新时记下的命盘来源：无论本次是否带有效分享链接，都先读出并清除，避免残留影响之后打开的链接
    let saved = null;
    try {
      saved = sessionStorage.getItem(RESTORE_KEY);
      sessionStorage.removeItem(RESTORE_KEY);
    } catch (e) { /* 无法读取会话存储：按分享链接处理 */ }
    // 分享链接：地址栏带出生信息时直接排盘
    if (hasShareParams()) {
      const input = inputFromUrl();
      if (input) {
        Object.assign(store.form, input);
        // 自动刷新恢复的：沿用刷新前的来源（自己排的盘仍按“自己排的”对待）
        let source = 'url';
        if (saved === 'form' || saved === 'archive') source = saved;
        calculateChart(input, source, { silent: saved !== null }); // 任何来源的恢复都静默（含刷新前打开的他人分享链接）
      } else {
        store.chartError = '分享链接不完整或无效，请让对方重新复制链接';
        this.$nextTick(() => this.scrollTo('paipan'));
      }
      // 处理后去掉地址栏中的分享参数（其他参数保留），避免刷新时重复载入
      history.replaceState(null, '', location.pathname + withoutShareParams() + location.hash);
    }
  },
  methods: {
    scrollTo: scrollToId
  }
};
</script>
