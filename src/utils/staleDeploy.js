// 新版本发布后，仍在运行旧代码的页面去加载已不存在的旧分片会失败。
// 当前页面的构建号写在 index.html 的 meta 里；出错时取线上 version.json，构建号不同才说明发布了新版本，刷新一次。
// 普通网络故障不刷新，避免丢掉用户刚排好的命盘。
/** 自动刷新前记录命盘来源的会话存储键（main.js 写入，App.vue 读取后清除） */
export const RESTORE_KEY = 'xm:restore-source';
let checking = false;
/** 当前页面的构建号（开发环境没有） */
const currentBuild = () => document.querySelector('meta[name="xm-build"]')?.content || null;

async function fetchBuild() {
  // 带上查询参数绕过 Service Worker 与浏览器缓存
  const res = await fetch(`${import.meta.env.BASE_URL}version.json?v=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) return null; // 开发环境没有 version.json
  return (await res.json()).build || null;
}

/** @param {() => void} [beforeReload] 刷新前的回调（如把当前命盘写进地址栏，刷新后自动还原） */
// “已为某版本刷新过”的标记：优先存会话存储；被禁用时退回 window.name（同一标签页刷新后仍保留），保证不会反复刷新
const GUARD = 'xm:reloaded-for';
function reloadedFor() {
  // 两处都要看：有的浏览器会话存储可读不可写（如旧版 Safari 无痕模式），标记会写到 window.name
  let v = null;
  try { v = sessionStorage.getItem(GUARD); } catch (e) { /* 不可读 */ }
  return v || (window.name.startsWith(`${GUARD}=`) ? window.name.slice(GUARD.length + 1) : null);
}
function markReloaded(build) {
  try { sessionStorage.setItem(GUARD, build); } catch (e) { window.name = `${GUARD}=${build}`; }
}

export async function recoverIfStale(beforeReload) {
  if (checking || !currentBuild()) return false;
  checking = true;
  try {
    const build = await fetchBuild();
    if (build && build !== currentBuild() && reloadedFor() !== build) {
      markReloaded(build); // 每个新版本最多刷新一次
      try {
        // 旧的 Service Worker 可能仍用预缓存的旧首页应答刷新：先注销，刷新后会自动安装新版本
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(r => r.unregister()));
        }
      } catch (e) { /* 注销失败也照常刷新 */ }
      try { beforeReload && beforeReload(); } catch (e) { /* 保存失败也照常刷新 */ }
      location.reload();
      return true;
    }
    return false;
  } catch (e) {
    return false; // 离线等网络故障：不刷新
  } finally {
    checking = false;
  }
}
