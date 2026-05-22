<script setup>
// 现货马丁详情页：根据路由 id 选中策略并渲染结果组件。
import { computed, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import SpotMartingaleResults from '../components/SpotMartingaleResults.vue';
import { useSpotMartingaleStrategies } from '../composables/useSpotMartingaleStrategies';

const route = useRoute();
const router = useRouter();
const { activeInput, result, selectedStrategy, selectStrategy } = useSpotMartingaleStrategies();

// 路由 id 与 store selectedId 保持同步。
watchEffect(() => {
  selectStrategy(String(route.params.id || ''));
});

const currentTitle = computed(() => selectedStrategy.value?.name || '现货马丁详情');
</script>

<template>
  <!-- 现货马丁详情：顶部导航控制返回和编辑动作。 -->
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
/* 详情页导航样式：复用统一的移动端顶部栏视觉。 */
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
