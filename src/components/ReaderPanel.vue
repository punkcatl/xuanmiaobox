<template>
  <!-- appear：组件懒加载，首次打开时挂载即为打开状态，也要有进入动画 -->
  <transition name="reader" appear>
    <div v-if="state.kind" class="reader" role="dialog" aria-modal="true" :aria-label="doc ? doc.title : '阅读'" :style="{ '--fs': fontSize + 'px' }">
      <header class="reader-bar">
        <button type="button" class="reader-btn" :class="{ on: tocOpen }" @click="tocOpen = !tocOpen" aria-label="目录">
          <svg viewBox="0 0 20 20"><path d="M3 5h14M3 10h14M3 15h9"/></svg><span>目录</span>
        </button>
        <div class="reader-title">
          <b>{{ doc ? doc.title : '' }}</b>
          <span v-if="chapter">{{ chapterLabel(chapter) }}</span>
        </div>
        <div class="reader-tools">
          <button v-if="isBook && chapter && !loading" type="button" class="reader-btn sm" :class="{ on: markedHere }" @click="toggleBookmark" :aria-label="markedHere ? '移除书签' : '加书签'" :title="markedHere ? '移除本章书签' : '在当前位置加书签'">
            <svg viewBox="0 0 20 20"><path d="M6 3h8v14l-4-3-4 3z" :class="{ fill: markedHere }"/></svg>
          </button>
          <button type="button" class="reader-btn sm" @click="setFont(-1)" aria-label="缩小字号">A−</button>
          <button type="button" class="reader-btn sm" @click="setFont(1)" aria-label="放大字号">A+</button>
          <button ref="closeBtn" type="button" class="reader-btn close" @click="closeReader" aria-label="关闭">×</button>
        </div>
      </header>

      <div class="reader-body">
        <nav class="reader-toc" :class="{ open: tocOpen }" aria-label="目录">
          <div v-if="doc" class="toc-head">
            <b>{{ doc.title }}</b>
            <span>{{ doc.subtitle || [doc.dynasty, doc.author].filter(Boolean).join(' · ') }}</span>
          </div>
          <div v-if="isBook" class="toc-tabs" role="tablist">
            <button v-for="t in TABS" :key="t.id" type="button" role="tab" :aria-selected="tab === t.id" :class="{ on: tab === t.id }" @click="tab = t.id">
              {{ t.label }}<i v-if="t.id === 'marks' && bookmarks.length" class="num">{{ bookmarks.length }}</i>
            </button>
          </div>

          <template v-if="tab === 'toc' || !isBook">
            <template v-for="(c, i) in toc" :key="i">
              <div v-if="c.part && (i === 0 || toc[i - 1].part !== c.part)" class="toc-part">{{ c.part }}</div>
              <button type="button" class="toc-item" :class="{ on: i === index }" @click="go(i)">
                <i class="num">{{ c.no || pad(i + (hasPreface ? 0 : 1)) }}</i>{{ c.title }}
              </button>
            </template>
          </template>

          <div v-else-if="tab === 'marks'" class="toc-list">
            <p v-if="!bookmarks.length" class="toc-empty">还没有书签。阅读时点右上角的书签按钮，记住当前位置。</p>
            <div v-for="(m, i) in bookmarks" :key="i" class="toc-mark">
              <button type="button" class="toc-hit" @click="go(m.chapter, m.block)">
                <b>{{ toc[m.chapter] && toc[m.chapter].title }}</b>
                <span>{{ m.text }}</span>
              </button>
              <button type="button" class="toc-del" aria-label="删除书签" @click="removeBookmark(i)">×</button>
            </div>
          </div>

          <div v-else class="toc-list">
            <input v-model.trim="queryInput" class="toc-search" type="search" placeholder="检索全书，如：用神" aria-label="检索全书">
            <p v-if="query && !hits.length" class="toc-empty">没有找到“{{ query }}”。</p>
            <p v-else-if="hits.length" class="toc-empty">共 {{ hitTotal }} 处{{ hitTotal > hits.length ? `，显示前 ${hits.length} 处` : '' }}</p>
            <button v-for="(h, i) in hits" :key="i" type="button" class="toc-hit" @click="go(h.chapter, h.block)">
              <b>{{ toc[h.chapter].title }}</b>
              <span>{{ h.before }}<mark>{{ h.match }}</mark>{{ h.after }}</span>
            </button>
          </div>
        </nav>

        <main ref="scroller" class="reader-main" @click="tocOpen = false">
          <div v-if="loading" class="reader-loading">展卷中…</div>
          <div v-else-if="loadError" class="reader-loading">加载失败，请检查网络后重新加载页面。
            <!-- 浏览器会缓存加载失败的模块，页面内重开无效 -->
            <p><button type="button" class="btn btn-ghost sm" style="margin-top:20px" @click="reload">重新加载页面</button></p>
          </div>
          <article v-else-if="chapter" class="reader-article">
            <p class="reader-kicker">{{ kicker }}</p>
            <h2 class="reader-h">{{ chapter.title }}</h2>
            <p v-if="chapter.subtitle" class="reader-sub">{{ chapter.subtitle }}</p>

            <template v-for="(b, i) in chapter.blocks" :key="i">
              <h3 v-if="b.t === 'h'" :id="'rb-' + i" class="rb-h">{{ b.text }}</h3>
              <p v-else-if="b.t === 'p'" :id="'rb-' + i" class="rb-p"><TermText :parts="marked[i]" /></p>
              <blockquote v-else-if="b.t === 'verse'" :id="'rb-' + i" class="rb-verse">{{ b.text }}</blockquote>
              <div v-else-if="b.t === 'note'" :id="'rb-' + i" class="rb-note" :class="{ ren: b.who === '任氏曰' }">
                <span class="rb-note-who">{{ b.who }}</span>
                <p><TermText :parts="marked[i]" /></p>
              </div>
              <div v-else-if="b.t === 'chart'" :id="'rb-' + i" class="rb-chart">
                <div class="rb-chart-pillars">
                  <span v-for="(p, j) in b.pillars" :key="j" class="rb-chart-p">
                    <small>{{ PILLAR_SHORT[j] }}</small>
                    <b :class="'wx-' + wxKey(wuXingOf(p).tianGan)">{{ p[0] }}</b>
                    <b :class="'wx-' + wxKey(wuXingOf(p).diZhi)">{{ p[1] }}</b>
                  </span>
                </div>
                <div v-if="b.dayun && b.dayun.length" class="rb-chart-yun">
                  <small>大运</small>
                  <span v-for="(y, j) in b.dayun" :key="j">{{ y }}</span>
                </div>
                <span v-if="b.label" class="rb-chart-label">{{ b.label }}</span>
              </div>
              <ul v-else-if="b.t === 'list'" class="rb-list">
                <li v-for="(it, j) in b.items" :key="j"><TermText :parts="marked[i][j]" /></li>
              </ul>
              <aside v-else-if="b.t === 'tip'" class="rb-tip"><TermText :text="b.text" /></aside>
              <LessonFigure v-else-if="b.t === 'figure'" :name="b.name" />
            </template>

            <footer class="reader-pager">
              <button type="button" class="pager-btn" :disabled="index === 0" @click="go(index - 1)">
                <small>上一章</small><span>{{ index > 0 ? toc[index - 1].title : '—' }}</span>
              </button>
              <button type="button" class="pager-btn next" :disabled="index >= toc.length - 1" @click="go(index + 1)">
                <small>下一章</small><span>{{ index < toc.length - 1 ? toc[index + 1].title : '已读完' }}</span>
              </button>
            </footer>
          </article>
        </main>
      </div>
    </div>
  </transition>
</template>

<script>
// 阅读器：入门课（同步数据）与典籍（按书懒加载 JSON）共用；典籍支持书签与全文检索
import { markRaw } from 'vue';
import TermText from './TermText.vue';
import LessonFigure from './LessonFigure.vue';
import { readerState, glossaryState, closeReader, showToast, readerOpenerEl } from '../composables/ui.js';
import { splitTerms } from '../data/glossary.js';
import { lessons } from '../data/lessons.js';
import { wxKey, PILLAR_SHORT } from '../engine/constants.js';
import { wuXingOf } from '../engine/bazi.js';
import { storage } from '../utils/storage.js';
import { progressOf, setProgress } from '../composables/progress.js';
import { pad } from '../utils/date.js';
import { findAnchorIndex } from '../utils/anchor.js';

const bookLoaders = import.meta.glob(['../content/books/*.json', '!../content/books/index.json'], { import: 'default' });
const loadBook = id => bookLoaders[`../content/books/${id}.json`]();
const LESSON_DOC = markRaw({ id: 'lessons', title: '八字入门', subtitle: '八节课，零基础读懂命盘', chapters: lessons });
const TABS = [{ id: 'toc', label: '目录' }, { id: 'marks', label: '书签' }, { id: 'search', label: '检索' }];
const MAX_HITS = 80;
const clampFont = v => (Number.isFinite(v) ? Math.min(22, Math.max(14, v)) : 17);

const blockText = b => b.text || (b.items ? b.items.join('') : '');

export default {
  name: 'ReaderPanel',
  components: { TermText, LessonFigure },
  setup: () => ({ state: readerState, closeReader, TABS, pad, PILLAR_SHORT }),
  data: () => ({
    doc: null, index: 0, loading: false, loadError: false, tocOpen: false, tab: 'toc',
    queryInput: '', query: '', bookmarks: [], fontSize: clampFont(storage.get('xm:fs'))
  }),
  computed: {
    isBook() { return this.state.kind === 'book'; },
    toc() { return this.doc ? this.doc.chapters : []; },
    chapter() { return this.toc[this.index] || null; },
    hasPreface() { return this.toc.length > 0 && this.toc[0].title === '序'; },
    kicker() {
      if (!this.doc) return '';
      if (!this.isBook) return `第 ${this.index + 1} 课 / 共 ${this.toc.length} 课`;
      return [this.doc.title, this.chapter && this.chapter.part].filter(Boolean).join(' · ');
    },
    // 整章切分术语：同一术语在本章只标注第一次
    marked() {
      if (!this.chapter) return [];
      const seen = new Set();
      return this.chapter.blocks.map(b => {
        if (b.t === 'p' || b.t === 'note') return splitTerms(b.text, { once: true, seen });
        if (b.t === 'list') return b.items.map(it => splitTerms(it, { once: true, seen }));
        return null;
      });
    },
    markedHere() { return this.bookmarks.some(m => m.chapter === this.index); },
    searchResult() {
      const q = this.query;
      if (!q || !this.isBook) return { hits: [], total: 0 };
      const hits = [];
      let total = 0;
      this.toc.forEach((c, ci) => c.blocks.forEach((b, bi) => {
        const text = blockText(b);
        let at = text.indexOf(q);
        while (at >= 0) {
          total++;
          if (hits.length < MAX_HITS) {
            hits.push({ chapter: ci, block: bi, before: text.slice(Math.max(0, at - 14), at), match: q, after: text.slice(at + q.length, at + q.length + 18) });
          }
          at = text.indexOf(q, at + q.length);
        }
      }));
      return { hits, total };
    },
    hits() { return this.searchResult.hits; },
    hitTotal() { return this.searchResult.total; }
  },
  watch: {
    // 打开时把焦点移入阅读器（关闭按钮），关闭时还给打开前的元素；组件懒加载，首次挂载时可能已是打开状态
    'state.kind': {
      immediate: true,
      handler(kind, old) {
        if (kind && !old) {
          this.$nextTick(() => this.$refs.closeBtn && this.$refs.closeBtn.focus({ preventScroll: true }));
        } else if (!kind && old) {
          const el = readerOpenerEl();
          if (el && el.isConnected) el.focus({ preventScroll: true });
        }
      }
    },
    'state.nonce': {
      immediate: true, // 组件按需加载，挂载时打开指令可能已发出
      async handler() {
        const { kind, docId, chapter, anchors, nonce } = this.state;
        if (!kind) return;
        this.tocOpen = false;
        this.tab = 'toc';
        this.query = this.queryInput = '';
        this.loadError = false;
        if (kind === 'lesson') {
          this.loading = false;
          this.doc = LESSON_DOC;
          this.index = Math.max(0, lessons.findIndex(l => l.id === docId));
          this.bookmarks = [];
        } else if (this.doc && this.doc.id === docId) {
          // 同一本书已打开：不重新加载，只跳到指定章节（未指定则回到保存的进度）
          this.index = this.startChapter(this.doc, chapter);
          this.refreshBookmarks(); // 其他标签页可能改过书签
        } else {
          this.loading = true;
          this.doc = null;
          this.bookmarks = []; // 换书时先清空，避免加载中或失败时显示上一本书的书签
          let book;
          try {
            book = await loadBook(docId);
          } catch (e) {
            if (nonce === this.state.nonce) { this.loadError = true; this.loading = false; }
            return;
          }
          // 加载期间用户又打开了别的内容：丢弃过期结果
          if (nonce !== this.state.nonce) return;
          this.doc = markRaw(book); // 只读的大块数据：不做响应式代理
          this.loading = false;
          this.refreshBookmarks();
          this.index = this.startChapter(book, chapter);
        }
        this.scrollToBlock(this.findAnchor(anchors));
      }
    },
    // 输入防抖，避免每敲一个字就扫描全书
    queryInput(v) {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => { this.query = v; }, 250);
    },
  },
  mounted() {
    // 其他标签页增删了当前这本书的书签：同步过来（书签数与本章书签状态保持准确）
    this.onStorage = e => {
      if (this.isBook && this.doc && (e.key === null || e.key === `xm:bm:${this.doc.id}`)) this.refreshBookmarks();
    };
    window.addEventListener('storage', this.onStorage);
    this.onKey = e => {
      // 术语弹窗打开时按键交给弹窗处理；带修饰键（如 Alt+← 浏览器后退）或在可编辑控件中时不翻章
      const t = e.target;
      const editable = t && (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable);
      if (!this.state.kind || glossaryState.term) return;
      if (e.key === 'Escape') { closeReader(); return; } // 检索框中也可按 Esc 关闭
      if (editable || e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
      if (e.key === 'ArrowRight' && this.index < this.toc.length - 1) this.go(this.index + 1);
      if (e.key === 'ArrowLeft' && this.index > 0) this.go(this.index - 1);
    };
    window.addEventListener('keydown', this.onKey);
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('storage', this.onStorage);
    clearTimeout(this.searchTimer);
  },
  methods: {
    reload() { location.reload(); },
    /** 打开时的章节：指定的序号或标题 → 保存的进度 → 第一章 */
    startChapter(book, chapter) {
      const n = book.chapters.length;
      if (Number.isInteger(chapter) && chapter >= 0 && chapter < n) return chapter;
      const byTitle = typeof chapter === 'string' ? book.chapters.findIndex(c => c.title === chapter) : -1;
      if (byTitle >= 0) return byTitle;
      const saved = progressOf(book.id, n);
      return saved != null ? saved : 0;
    },
    go(i, block = null) {
      if (!Number.isInteger(i) || i < 0 || i >= this.toc.length) return; // 过期书签（书籍重新解析后章节变少）
      this.index = i;
      // 只在用户主动翻章时记录进度（单纯打开或深链跳入不算）
      if (this.isBook && this.doc) setProgress(this.doc.id, i);
      this.tocOpen = false;
      this.scrollToBlock(block);
    },
    /** 滚动到指定块；null 则回到顶部 */
    scrollToBlock(block) {
      this.$nextTick(() => {
        const sc = this.$refs.scroller;
        if (!sc) return;
        const el = block != null && sc.querySelector(`#rb-${block}`);
        if (el) {
          sc.scrollTo(0, this.offsetIn(sc, el) - 24);
          el.classList.add('rb-flash');
          setTimeout(() => el.classList.remove('rb-flash'), 1600);
        } else {
          sc.scrollTo(0, 0);
        }
      });
    },
    /** 元素相对滚动容器内容顶部的位置（不依赖 offsetParent） */
    offsetIn(sc, el) {
      return el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop;
    },
    findAnchor(anchors) { return this.chapter ? findAnchorIndex(this.chapter.blocks, anchors) : null; },
    /** 当前视口顶部的块序号 */
    topBlock() {
      const sc = this.$refs.scroller;
      const els = sc ? [...sc.querySelectorAll('[id^="rb-"]')] : [];
      const el = els.find(e => this.offsetIn(sc, e) + e.offsetHeight > sc.scrollTop + 30) || els[0];
      return el ? Number(el.id.slice(3)) : 0;
    },
    saveBookmarks() {
      const ok = storage.set(`xm:bm:${this.doc.id}`, this.bookmarks); // 失败时存储工具会在内存中兜底
      if (!ok) showToast('浏览器禁止了本地存储，书签仅在本次访问有效');
      return ok;
    },
    /** 修改书签前读取存储中的最新列表（其他标签页可能已修改） */
    refreshBookmarks() {
      // 本页写入失败时读到的是内存兜底副本；其他标签页成功写入后兜底副本会被丢弃（见 storage.js）
      const marks = storage.get(`xm:bm:${this.doc.id}`, null);
      const n = this.doc.chapters.length;
      // 存储中没有（从未加过或已被其他标签页清除）即为空列表，避免把旧书签写回去
      this.bookmarks = (Array.isArray(marks) ? marks : []).filter(m => m && typeof m === 'object' && Number.isInteger(m.chapter) && m.chapter >= 0 && m.chapter < n && Number.isInteger(m.block) && m.block >= 0);
    },
    toggleBookmark() {
      if (!this.doc || !this.chapter) return;
      this.refreshBookmarks();
      if (this.markedHere) {
        this.bookmarks = this.bookmarks.filter(m => m.chapter !== this.index);
        if (this.saveBookmarks()) showToast('已移除本章书签');
        return;
      }
      const block = this.topBlock();
      const text = blockText(this.chapter.blocks[block] || {}).slice(0, 28) || this.chapter.title;
      this.bookmarks = [...this.bookmarks, { chapter: this.index, block, text }].sort((a, b) => a.chapter - b.chapter);
      if (this.saveBookmarks()) showToast('已加入书签');
    },
    removeBookmark(i) {
      const target = this.bookmarks[i];
      this.refreshBookmarks();
      this.bookmarks = this.bookmarks.filter(m => !(m.chapter === target.chapter && m.block === target.block));
      this.saveBookmarks();
    },
    setFont(d) {
      this.fontSize = clampFont(this.fontSize + d);
      storage.set('xm:fs', this.fontSize);
    },
    chapterLabel(c) { return c.no ? `${c.no} · ${c.title}` : c.title; },
    wxKey,
    wuXingOf
  }
};
</script>
