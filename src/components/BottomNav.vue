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
  max-width: 720px;
  margin: 0 auto;
  border-top: 1px solid var(--trade-border);
  background: var(--trade-bottom-bg);
  box-shadow: 0 -10px 32px rgba(15, 27, 22, 0.12);

  :deep(.van-tabbar-item) {
    color: var(--trade-muted);
  }

  :deep(.van-tabbar-item--active) {
    color: var(--trade-up);
    background: transparent;
  }
}
</style>
