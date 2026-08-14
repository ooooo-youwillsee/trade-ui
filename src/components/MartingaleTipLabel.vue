<script setup>
import { computed } from 'vue';
import { getMartingaleTip } from '../strategies/common/martingaleTips';
import StrategyTipLabel from './StrategyTipLabel.vue';

const props = defineProps({
  label: { type: String, default: '' },
  tipKey: { type: String, required: true },
  mode: { type: String, default: '' },
  side: { type: String, default: '' },
  platform: { type: String, default: '' },
});

const tip = computed(() =>
  getMartingaleTip(props.tipKey, {
    mode: props.mode,
    side: props.side,
    platform: props.platform,
  }),
);
</script>

<template>
  <StrategyTipLabel :label="label" :tip="tip" />
</template>
