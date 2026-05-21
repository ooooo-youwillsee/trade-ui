<script setup>
import { computed } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import AppBottomNav from './components/AppBottomNav.vue';
import { useNotice } from './composables/useNotice';

const route = useRoute();
const { closeNotice, notice } = useNotice();
const activeTab = computed(() => route.meta.tab || 'contract');
</script>

<template>
  <main class="app-shell webapp-shell">
    <RouterView />
    <AppBottomNav :active-tab="activeTab" />
    <van-dialog v-model:show="notice.open" :title="notice.title" confirm-button-text="确定" @confirm="closeNotice">
      <p class="notice-dialog-message">{{ notice.message }}</p>
    </van-dialog>
  </main>
</template>
