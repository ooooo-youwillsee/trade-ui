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
