<script setup>
// 根组件负责承载路由出口、底部导航和全局提示弹窗。
import { computed } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import AppBottomNav from './components/AppBottomNav.vue';
import { useNotice } from './composables/useNotice';

const route = useRoute();
const { closeNotice, notice } = useNotice();
// 通过路由 meta.tab 驱动底部导航高亮，避免每个页面重复维护选中状态。
const activeTab = computed(() => route.meta.tab || 'contract');
</script>

<template>
  <!-- 应用壳层：页面内容、底部导航和全局提示共享同一个移动端容器。 -->
  <main class="app-shell webapp-shell">
    <RouterView />
    <AppBottomNav :active-tab="activeTab" />
    <van-dialog v-model:show="notice.open" :title="notice.title" confirm-button-text="确定" @confirm="closeNotice">
      <p class="notice-dialog-message">{{ notice.message }}</p>
    </van-dialog>
  </main>
</template>
