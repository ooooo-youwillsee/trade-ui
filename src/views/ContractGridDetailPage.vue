<script setup>
// 合约网格详情页：根据路由 id 选中策略，并展示只读计算结果。
import { computed, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ContractGridResults from '../components/ContractGridResults.vue';
import { useContractGridStrategies } from '../composables/useContractGridStrategies';

const route = useRoute();
const router = useRouter();
const { activeInput, result, selectedStrategy, selectStrategy } = useContractGridStrategies();

// 路由参数变化时同步 store 选中项，支持详情页之间直接跳转。
watchEffect(() => {
  selectStrategy(String(route.params.id || ''));
});

const currentTitle = computed(() => selectedStrategy.value?.name || '策略详情');
</script>

<template>
  <!-- 详情页主体：顶部导航提供返回和编辑入口，下方展示计算结果。 -->
  <section class="mobile-page contract-detail-page">
    <van-nav-bar
      class="detail-nav"
      :title="currentTitle"
      left-arrow
      fixed
      placeholder
      @click-left="router.push('/contract')"
    >
      <template #right>
        <van-button
          class="detail-edit-button"
          icon="edit"
          size="small"
          type="primary"
          round
          @click="router.push(`/contract/grid/${route.params.id}/edit`)"
        >
          编辑
        </van-button>
      </template>
    </van-nav-bar>

    <ContractGridResults :active-input="activeInput" :result="result" />
  </section>
</template>

<style scoped lang="scss">
/* 详情页导航样式：与应用顶部导航保持一致的毛玻璃和阴影。 */
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
    font-size: var(--trade-font-lg);
    font-weight: var(--trade-weight-title);
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
