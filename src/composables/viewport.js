// 共享视口尺寸：全站只有一个 resize 监听
import { reactive } from 'vue';

export const viewport = reactive({ w: window.innerWidth, h: window.innerHeight });
window.addEventListener('resize', () => {
  viewport.w = window.innerWidth;
  viewport.h = window.innerHeight;
});
