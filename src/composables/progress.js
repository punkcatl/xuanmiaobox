// 典籍阅读进度：响应式状态 + 持久化（阅读器写入，典籍栏目读取）
import { reactive } from 'vue';
import index from '../content/books/index.json';
import { storage } from '../utils/storage.js';

const KEY = id => `xm:progress:book:${id}`;
// 启动时为每本书读入一次，之后只通过 setProgress 修改
const progress = reactive(Object.fromEntries(index.map(b => [b.id, storage.get(KEY(b.id))])));

/** 读取进度；越界（如书籍重新解析后章节变少）返回 null */
export function progressOf(id, chapterCount) {
  const v = progress[id];
  return Number.isInteger(v) && v >= 0 && v < chapterCount ? v : null;
}
// 其他标签页读到别处：同步过来（“续读”按钮与打开位置都以最新进度为准）
if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    for (const b of index) if (e.key === null || e.key === KEY(b.id)) progress[b.id] = storage.get(KEY(b.id));
  });
}
export function setProgress(id, chapter) {
  progress[id] = chapter;
  storage.set(KEY(id), chapter);
}
