// 全局 UI 状态：术语释义弹窗 + 阅读器（入门课 / 典籍）
import { reactive } from 'vue';
import { lookupTerm } from '../data/glossary.js';

export const glossaryState = reactive({ term: null, rect: null });

// 当前术语的锚点元素（不放进响应式状态）：滚动时据此判断气泡是否已偏离
let anchorEl = null;
export const termAnchor = () => anchorEl;
export function openTerm(term, el) {
  if (!lookupTerm(term)) return; // 词典未收录：不进入“弹窗打开”状态（否则会屏蔽阅读器按键）
  anchorEl = el || null;
  const r = el && el.getBoundingClientRect();
  glossaryState.rect = r ? { top: r.top, left: r.left, bottom: r.bottom, width: r.width } : null;
  glossaryState.term = term;
}
export function closeTerm() {
  glossaryState.term = null;
  anchorEl = null; // 不再持有已关闭气泡的锚点（避免阻止旧章节 / 旧命盘 DOM 被回收）
}

// kind: 'lesson' | 'book'；docId；chapter：章节序号
export const readerState = reactive({ kind: null, docId: null, chapter: null, anchors: null, nonce: 0 });

// 打开阅读器前的焦点元素（关闭阅读器时还给它）；阅读器内部跳转不覆盖
let readerOpener = null;
export const readerOpenerEl = () => readerOpener;
/** chapter：章节序号或章节标题；anchors：可选的小标题文本列表，按顺序尝试，命中则滚动到该处 */
export function openReader(kind, docId, chapter = null, anchors = null) {
  const active = typeof document !== 'undefined' ? document.activeElement : null;
  // 从术语气泡里点“去入门课”时，关闭后焦点还给最初点的术语
  const opener = active && active.closest('.gloss') ? anchorEl : active;
  if (!readerState.kind && opener && !opener.closest('.reader')) readerOpener = opener;
  closeTerm();
  readerState.kind = kind;
  readerState.docId = docId;
  readerState.chapter = chapter;
  readerState.anchors = anchors;
  readerState.nonce++; // 阅读器已打开时也能跳转
}
export function closeReader() {
  readerState.kind = null;
}

// 轻提示
export const toastState = reactive({ msg: '', id: 0 });
let toastTimer = null;
export function showToast(msg) {
  toastState.msg = msg;
  toastState.id++;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastState.msg = ''; }, 2400);
}

// 页面滚动锁：多个浮层（阅读器、导览）共用，全部释放后才恢复滚动
const scrollLocks = new Set();
export function lockScroll(owner, on) {
  if (on) scrollLocks.add(owner); else scrollLocks.delete(owner);
  document.body.style.overflow = scrollLocks.size ? 'hidden' : '';
}

/** 滚动到页面某个区块（不指定 behavior，交给 CSS scroll-behavior，尊重“减少动画”设置） */
export function scrollToId(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ block: 'start' });
}
