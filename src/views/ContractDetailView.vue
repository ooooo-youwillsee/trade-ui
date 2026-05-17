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
  <section class="mobile-page">
    <van-nav-bar :title="currentTitle" left-arrow fixed placeholder @click-left="router.push('/contract')">
      <template #right>
        <van-button icon="edit" size="small" type="primary" round @click="router.push(`/contract/${route.params.id}/edit`)">
          编辑
        </van-button>
      </template>
    </van-nav-bar>

    <StrategyResults :active-input="activeInput" :result="result" />
  </section>
</template>
