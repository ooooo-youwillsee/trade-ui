<script setup>
// 现货网格详情页：根据路由 id 读取策略，并展示现货网格结果。
import { computed, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import SpotGridResults from '../components/SpotGridResults.vue';
import { useSpotGridStrategies } from '../composables/useSpotGridStrategies';

const route = useRoute();
const router = useRouter();
const { activeInput, result, selectedStrategy, selectStrategy } = useSpotGridStrategies();

// 路由 id 是详情页唯一数据入口，变化时同步选中策略。
watchEffect(() => {
  selectStrategy(String(route.params.id || ''));
});

const currentTitle = computed(() => selectedStrategy.value?.name || '现货网格详情');
</script>

<template>
  <!-- 现货网格详情：顶部导航负责返回和进入编辑页。 -->
  <section class="mobile-page spot-grid-detail-page">
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
          @click="router.push(`/spot/grid/${route.params.id}/edit`)"
        >
          编辑
        </van-button>
      </template>
    </van-nav-bar>
    <SpotGridResults :active-input="activeInput" :result="result" />
  </section>
</template>

<style scoped lang="scss">
/* 详情页导航样式：复用合约详情的视觉规格。 */
.spot-grid-detail-page {
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
