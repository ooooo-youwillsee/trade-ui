<script setup>
import { computed } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import BottomNav from './components/BottomNav.vue';
import ToastModal from './components/ToastModal.vue';
import { useNotice } from './composables/useNotice';

const route = useRoute();
const { closeNotice, notice } = useNotice();
const activeTab = computed(() => route.meta.tab || 'contract');
</script>

<template>
  <main class="app-shell webapp-shell">
    <RouterView />
    <BottomNav :active-tab="activeTab" />
    <ToastModal :message="notice.message" :open="notice.open" :title="notice.title" @close="closeNotice" />
  </main>
</template>
