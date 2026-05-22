import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

// Vite 应用构建配置：集中声明 Vue 插件、PWA 清单和 GitHub Pages 部署路径。
export default defineConfig({
  plugins: [
    // 启用 Vue 单文件组件编译能力。
    vue(),
    // 将应用注册为可安装的 PWA，并让 service worker 自动更新。
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-192.png', 'pwa-512.png'],
      // PWA manifest 负责移动端安装后的名称、图标和启动入口。
      manifest: {
        name: '合约网格交易',
        short_name: '网格交易',
        description: '合约网格策略管理与计算工具',
        theme_color: '#1f8a65',
        background_color: '#f4f6f0',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './#/contract',
        scope: './',
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Hash 路由刷新时回退到入口 HTML，避免离线/刷新后 404。
        navigateFallback: 'index.html',
      },
    }),
  ],
  // GitHub Actions/Pages 会提供仓库名，生产路径需要自动带上仓库前缀。
  base: process.env.GITHUB_REPOSITORY ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/` : '/',
});
