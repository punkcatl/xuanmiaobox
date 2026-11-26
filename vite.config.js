import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

// 构建号：写入 index.html 的 meta 与 /version.json（不注入 JS，避免每次构建都改变主包哈希），用于检测“已发布新版本”
// 每次构建（含 --watch 的重新构建）开始时重新生成
let BUILD_ID = Date.now().toString(36);
const versionFile = () => ({
  name: 'xm-version-file',
  apply: 'build',
  buildStart() { BUILD_ID = Date.now().toString(36); },
  // 页面自身的构建号写进 index.html：旧页面（含 Service Worker 缓存的旧首页）带的就是旧构建号
  transformIndexHtml: () => [{ tag: 'meta', attrs: { name: 'xm-build', content: BUILD_ID }, injectTo: 'head' }],
  generateBundle() { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD_ID }) }); }
});

export default defineConfig({
  // 开发时把 AI 解读接口转发到本地服务（node server/ai-server.mjs）
  server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
  // 允许经 Cloudflare 临时隧道（*.trycloudflare.com）访问预览服务；只对外开放 preview（构建产物），不开放 dev
  preview: { proxy: { '/api': 'http://127.0.0.1:8787' }, allowedHosts: ['.trycloudflare.com'] },
  build: {
    // 字体文件一律不内联：小字体分片若被转成 base64 塞进 fonts-*.css（还含现代浏览器用不到的 woff），会失去按 unicode-range 按需加载的意义
    assetsInlineLimit: file => (/\.woff2?$/.test(file) ? false : undefined),
    rollupOptions: {
      output: {
        // 历法库较大且很少变化：单独成块，便于浏览器长期缓存
        manualChunks: { lunar: ['lunar-javascript'] },
        // 典籍统一放在 assets/books/，PWA 配置按目录处理，新增书籍无需改配置
        chunkFileNames: chunk => (chunk.facadeModuleId && chunk.facadeModuleId.includes('/content/books/') ? 'assets/books/[name]-[hash].js' : 'assets/[name]-[hash].js')
      }
    }
  },
  plugins: [
    versionFile(),
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeManifestIcons: false, // 图标已由 globPatterns 预缓存，避免重复条目
      manifest: {
        name: '玄喵盒子 · 八字研习',
        short_name: '玄喵盒子',
        description: '八字排盘、合盘、入门课与命理典籍阅读',
        lang: 'zh-CN',
        theme_color: '#0c0d10',
        background_color: '#0c0d10',
        display: 'standalone',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // 预缓存应用外壳；典籍（约 650KB）与字体分片改为运行时缓存：打开过即可离线，不在首次访问时全部下载
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        globIgnores: ['**/assets/books/**', '**/fonts-*.css'], // version.json 不在 globPatterns 内，本就不预缓存
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/assets/books/') || /\/assets\/fonts-[\w-]+\.css$/.test(url.pathname),
            handler: 'CacheFirst',
            // 典籍分片与字体样式带哈希，发布新版本后旧文件不再被请求：限定保留时长，并在空间不足时清理
            options: { cacheName: 'xm-books', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30, purgeOnQuotaError: true } }
          },
          {
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: { cacheName: 'xm-fonts', expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 365 } } // 字体共约 414 个分片
          }
        ]
      }
    })
  ]
});
