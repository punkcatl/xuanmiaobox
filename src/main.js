import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import { recoverIfStale, RESTORE_KEY } from './utils/staleDeploy.js';
import { store, shareUrl, withoutShareParams } from './composables/store.js';

// 任何动态分片（典籍、字体……）加载失败都会触发该事件：统一检查是否发布了新版本。
// 不调用 preventDefault，错误仍会抛给各调用处，由它们显示各自的提示
// 刷新前把当前命盘写进地址栏（分享链接格式），刷新后自动还原，不丢刚排好的盘
window.addEventListener('vite:preloadError', () => recoverIfStale(() => {
  if (!store.result) return;
  // 保留地址栏中的其他参数（utm 等）；与分享参数同名的不带入，以免被当作命盘字段（如外部的 t 被读成区县）
  const url = new URL(shareUrl(store.result.input));
  // 其他参数按与载入分享链接时同一规则（withoutShareParams）取出；与新链接已有参数同名的不带入，append 保留同名多值
  const own = new Set(url.searchParams.keys());
  new URLSearchParams(withoutShareParams()).forEach((v, k) => { if (!own.has(k)) url.searchParams.append(k, v); });
  history.replaceState(null, '', url.pathname + url.search + location.hash); // 保留当前所在区块，不强制跳到排盘
  // 地址栏写好后再记来源：避免改写失败时残留标记，误把之后打开的他人分享链接当成自己的盘
  try { sessionStorage.setItem(RESTORE_KEY, store.resultSource); } catch (e) { /* 忽略 */ }
}));

createApp(App).mount('#app');
// 字体样式在浏览器空闲时异步加载，不与首屏争带宽；失败时保持系统字体
const loadFonts = () => import('./fonts.js').catch(() => {});
if ('requestIdleCallback' in window) requestIdleCallback(loadFonts, { timeout: 2000 });
else setTimeout(loadFonts, 200);
