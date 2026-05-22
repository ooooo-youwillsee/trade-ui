<script setup>
// 底部导航组件：只接收当前 tab，具体路由入口由 tabs 配置集中声明。
defineProps({
  activeTab: {
    type: String,
    required: true,
  },
});

// 底部四个主入口与路由 meta.tab 保持同名，方便 App.vue 统一高亮。
const tabs = [
  { key: 'contract', label: '合约', icon: 'apps-o', to: '/contract' },
  { key: 'spot', label: '现货', icon: 'gold-coin-o', to: '/spot' },
  { key: 'stock', label: '股票', icon: 'chart-trending-o', to: '/stock' },
  { key: 'mine', label: '我的', icon: 'user-o', to: '/mine' },
];
</script>

<template>
  <!-- 主导航：route 模式让 Vant Tabbar 直接驱动 vue-router 跳转。 -->
  <van-tabbar class="bottom-nav" :model-value="activeTab" route safe-area-inset-bottom>
    <van-tabbar-item v-for="tab in tabs" :key="tab.key" :icon="tab.icon" :name="tab.key" :to="tab.to">
      {{ tab.label }}
    </van-tabbar-item>
  </van-tabbar>
</template>

<style scoped lang="scss">
/* 悬浮底部导航：保留安全区距离，并用半透明背景适配移动端 PWA。 */
.bottom-nav {
  right: 12px;
  bottom: calc(12px + env(safe-area-inset-bottom));
  left: 12px;
  width: auto;
  max-width: 696px;
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid var(--trade-border);
  border-radius: 8px;
  background: var(--trade-bottom-bg);
  box-shadow: 0 14px 36px rgba(15, 27, 22, 0.18);
  backdrop-filter: blur(14px);

  :deep(.van-tabbar-item) {
    color: var(--trade-muted);
    font-size: var(--trade-font-xs);
    font-weight: var(--trade-weight-medium);
  }

  :deep(.van-tabbar-item--active) {
    color: var(--trade-up);
    font-weight: var(--trade-weight-strong);
    background: transparent;
  }
}
</style>
