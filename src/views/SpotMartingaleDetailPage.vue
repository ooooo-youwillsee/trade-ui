<script setup>
import { computed, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import SpotMartingaleResults from '../components/SpotMartingaleResults.vue';
import { useSpotMartingaleStrategies } from '../composables/useSpotMartingaleStrategies';

const route = useRoute();
const router = useRouter();
const { activeInput, result, selectedStrategy, selectStrategy } = useSpotMartingaleStrategies();

watchEffect(() => {
  selectStrategy(String(route.params.id || ''));
});

const currentTitle = computed(() => selectedStrategy.value?.name || '现货马丁详情');
</script>

<template>
  <section class="mobile-page martingale-detail-page">
    <van-nav-bar
      class="detail-nav"
      :title="currentTitle"
      left-arrow
      fixed
      placeholder
      @click-left="router.push('/spot')"
    >
      <template #right>
        <van-button
          class="detail-edit-button"
          icon="edit"
          size="small"
          type="primary"
          round
          @click="router.push(`/spot/martingale/${route.params.id}/edit`)"
        >
          编辑
        </van-button>
      </template>
    </van-nav-bar>
    <SpotMartingaleResults :active-input="activeInput" :result="result" />
  </section>
</template>

<style scoped lang="scss">
.martingale-detail-page {
  gap: 0;
}
.detail-nav {
  --van-nav-bar-background: var(--trade-nav-bg);
}
.detail-nav::after {
  border-bottom: 0;
}
.detail-nav :deep(.van-nav-bar__content) {
  box-shadow: var(--trade-nav-shadow);
  backdrop-filter: blur(12px);
}
.detail-edit-button {
  min-width: 70px;
  box-shadow: 0 7px 18px rgba(22, 199, 132, 0.24);
}
</style>
