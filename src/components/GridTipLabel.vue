<script setup>
import { computed } from 'vue';
import { getGridTip } from '../strategies/common/gridTips';
import StrategyTipLabel from './StrategyTipLabel.vue';

const props = defineProps({
  label: { type: String, default: '' },
  tipKey: { type: String, required: true },
  mode: { type: String, default: '' },
  side: { type: String, default: '' },
  gridMode: { type: String, default: '' },
});

const tip = computed(() =>
  getGridTip(props.tipKey, {
    mode: props.mode,
    side: props.side,
    gridMode: props.gridMode,
  }),
);
</script>

<template>
  <StrategyTipLabel :label="label" :tip="tip" />
</template>
