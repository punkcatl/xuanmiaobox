// localStorage 安全读写。
// 写入失败（无痕模式 / 空间已满）时把值留在内存兜底层：本次访问内读取仍能拿到最新值，下次写入成功后清除。
const overlay = new Map();

export const storage = {
  /** 读取：写入失败时留在内存兜底层的值优先（需要跳过兜底层直接读存储时用 readRaw） */
  get(key, fallback = null) {
    if (overlay.has(key)) return overlay.get(key);
    try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  },
  /**
   * 直接读存储并区分“没有”与“无法解析”（跳过内存兜底层）
   * @returns {{ value: any, invalid: boolean, text: string | null }} 键不存在时 value、text 为 null；内容不是合法 JSON 时 invalid 为 true
   */
  readRaw(key) {
    let text;
    try { text = localStorage.getItem(key); } catch (e) { return { value: null, invalid: false, text: null }; }
    if (text == null) return { value: null, invalid: false, text: null };
    try { return { value: JSON.parse(text), invalid: false, text }; } catch (e) { return { value: null, invalid: true, text }; }
  },
  /** 把某键的原始文本原样复制到另一个键（用于备份无法解析的数据），返回是否成功 */
  copyRaw(from, to) {
    try {
      const text = localStorage.getItem(from);
      if (text == null) return false;
      localStorage.setItem(to, text);
      return true;
    } catch (e) { return false; }
  },
  /** @returns {boolean} 是否写入成功 */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      overlay.delete(key);
      return true;
    } catch (e) {
      overlay.set(key, value);
      return false;
    }
  }
};

// 其他标签页成功写入某键（或清空存储）：存储中已是更新的值，丢弃本页对应的兜底副本
if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => { if (e.key == null) overlay.clear(); else overlay.delete(e.key); });
}
