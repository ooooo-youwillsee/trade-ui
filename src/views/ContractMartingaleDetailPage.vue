<script setup>
// 合约马丁详情页：选中路由策略并展示马丁计算结果。
import { computed, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ContractMartingaleResults from '../components/ContractMartingaleResults.vue';
import { useContractMartingaleStrategies } from '../composables/useContractMartingaleStrategies';

const route = useRoute();
const router = useRouter();
const { activeInput, result, selectedStrategy, selectStrategy } = useContractMartingaleStrategies();

// 路由参数变化时刷新当前选中策略。
watchEffect(() => {
  selectStrategy(String(route.params.id || ''));
});

const currentTitle = computed(() => selectedStrategy.value?.name || '合约马丁详情');
</script>

<template>
  <!-- 合约马丁详情：导航区提供返回列表和编辑当前策略。 -->
  <section class="mobile-page martingale-detail-page">
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
          @click="router.push(`/contract/martingale/${route.params.id}/edit`)"
        >
          编辑
        </van-button>
      </template>
    </van-nav-bar>
    <ContractMartingaleResults :active-input="activeInput" :result="result" />
  </section>
</template>

<style scoped lang="scss">
/* 详情页导航样式：保证马丁详情与网格详情一致。 */
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
