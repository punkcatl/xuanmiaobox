// 自托管字体（按 unicode-range 分片，浏览器只下载用到的字）。
// 由 main.js 异步引入：字体样式单独成块，不阻塞首屏渲染（font-display: swap，先用系统字体显示）。
import '@fontsource/noto-serif-sc/400.css';
import '@fontsource/noto-serif-sc/600.css';
import '@fontsource/noto-sans-sc/300.css';
import '@fontsource/noto-sans-sc/400.css';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/500.css';
