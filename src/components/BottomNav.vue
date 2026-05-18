<script setup>
defineProps({
  activeTab: {
    type: String,
    required: true,
  },
});

const tabs = [
  { key: 'contract', label: '合约网格', icon: 'apps-o', to: '/contract' },
  { key: 'stock', label: '股票网格', icon: 'chart-trending-o', to: '/stock' },
  { key: 'mine', label: '我的', icon: 'user-o', to: '/mine' },
];
</script>

<template>
  <van-tabbar class="bottom-nav" :model-value="activeTab" route safe-area-inset-bottom>
    <van-tabbar-item
      v-for="tab in tabs"
      :key="tab.key"
      :icon="tab.icon"
      :name="tab.key"
      :to="tab.to"
    >
      {{ tab.label }}
    </van-tabbar-item>
  </van-tabbar>
</template>

<style scoped lang="scss">
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
  }

  :deep(.van-tabbar-item--active) {
    color: var(--trade-up);
    background: transparent;
  }
}
</style>
