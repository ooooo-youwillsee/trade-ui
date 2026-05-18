<script setup>
import { computed, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import StrategyResults from '../components/StrategyResults.vue';
import { useContractGridStrategies } from '../composables/useContractGridStrategies';

const route = useRoute();
const router = useRouter();
const { activeInput, result, selectedStrategy, selectStrategy } = useContractGridStrategies();

watchEffect(() => {
  selectStrategy(String(route.params.id || ''));
});

const currentTitle = computed(() => selectedStrategy.value?.name || '策略详情');
</script>

<template>
  <section class="mobile-page contract-detail-page">
    <van-nav-bar class="detail-nav" :title="currentTitle" left-arrow fixed placeholder @click-left="router.push('/contract')">
      <template #right>
        <van-button class="detail-edit-button" icon="edit" size="small" type="primary" round @click="router.push(`/contract/${route.params.id}/edit`)">
          编辑
        </van-button>
      </template>
    </van-nav-bar>

    <StrategyResults :active-input="activeInput" :result="result" />
  </section>
</template>

<style scoped lang="scss">
.contract-detail-page {
  gap: 0;
}

.detail-nav {
  --van-nav-bar-background: var(--trade-nav-bg);

  &::after {
    border-bottom: 0;
  }

  :deep(.van-nav-bar__content) {
    box-shadow: var(--trade-nav-shadow);
    backdrop-filter: blur(12px);
  }

  :deep(.van-nav-bar__title) {
    color: var(--trade-text);
    font-size: 1.02rem;
    font-weight: 900;
  }

  :deep(.van-nav-bar__left .van-icon) {
    color: var(--trade-text);
  }
}

.detail-edit-button {
  min-width: 70px;
  box-shadow: 0 7px 18px rgba(22, 199, 132, 0.24);

  :deep(.van-button__content) {
    justify-content: center;
    gap: 3px;
    width: 100%;
  }

  :deep(.van-button__icon) {
    color: currentColor;
  }
}
</style>
