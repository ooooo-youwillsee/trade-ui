<script setup>
import { computed } from 'vue';
import { Minus, Plus } from '@lucide/vue';
import { MARTINGALE_MAX_CUSTOM_LAYERS, MARTINGALE_SIDE_LONG } from '../strategies/common/martingale';
import MartingaleTipLabel from './MartingaleTipLabel.vue';

const props = defineProps({
  layers: { type: Array, required: true },
  mode: { type: String, required: true },
  side: { type: String, required: true },
});

const emit = defineEmits(['update:layers']);

// 多空方向只改变用户文案；数值含义仍是“相对上一层的价格变化百分比”。
const gapLabel = computed(() => (props.side === MARTINGALE_SIDE_LONG ? '跌多少加仓' : '涨多少加仓'));
const sharesLabel = computed(() => (props.side === MARTINGALE_SIDE_LONG ? '买入份数' : '卖出份数'));

// 继承几何倍数时可能产生 1.2100000000000002 之类的浮点尾数，仅在输入框展示时收敛到 4 位。
// 原始数组值不在此处修改，避免仅仅打开编辑器就改变原策略计算结果。
function formatEditorValue(value) {
  if (!Number.isFinite(value)) return value;
  return String(Math.round(value * 10000) / 10000);
}

function updateLayer(index, key, value) {
  // 始终创建新数组和新层对象，使 Vue 能稳定追踪变更，也避免直接修改父组件传入的 props。
  const layers = props.layers.map((layer) => ({ ...layer }));
  layers[index][key] = Number(value);
  emit('update:layers', layers);
}

function adjust(index, key, delta) {
  // 加减按钮以 0.1 为步长；四位舍入用于消除连续点击造成的二进制浮点尾差。
  const current = Number(props.layers[index]?.[key]);
  const next = Math.round((current + delta) * 10000) / 10000;
  updateLayer(index, key, Math.max(next, key === 'gapPercent' ? 0.0001 : 0.0001));
}

function addLayer() {
  // 只在末尾增加仓位，保证层级触发顺序不会因为中间插入而产生歧义。
  if (props.layers.length >= MARTINGALE_MAX_CUSTOM_LAYERS) return;
  emit('update:layers', [...props.layers.map((layer) => ({ ...layer })), { gapPercent: 1, amountShares: 1 }]);
}

function removeLayer() {
  // 首层代表已经成交的首单，至少保留一层且只能删除最后一个加仓层。
  if (props.layers.length <= 1) return;
  emit(
    'update:layers',
    props.layers.slice(0, -1).map((layer) => ({ ...layer })),
  );
}
</script>

<template>
  <div class="free-parameters">
    <div class="free-parameters__head">
      <MartingaleTipLabel label="#" tip-key="customLayerNumber" />
      <MartingaleTipLabel :label="gapLabel" tip-key="customGapPercent" :side="side" />
      <MartingaleTipLabel :label="sharesLabel" tip-key="customAmountShares" :mode="mode" :side="side" />
    </div>

    <div v-for="(layer, index) in layers" :key="index" class="free-parameters__row">
      <strong>{{ String(index + 1).padStart(2, '0') }}</strong>
      <div :class="['step-control', { disabled: index === 0 }]">
        <button type="button" :disabled="index === 0" aria-label="减少价差" @click="adjust(index, 'gapPercent', -0.1)">
          <Minus :size="18" />
        </button>
        <input
          :value="formatEditorValue(layer.gapPercent)"
          type="number"
          inputmode="decimal"
          :disabled="index === 0"
          min="0.0001"
          max="99.9999"
          step="0.1"
          aria-label="加仓价差百分比"
          @input="updateLayer(index, 'gapPercent', $event.target.value)"
        />
        <span>%</span>
        <button type="button" :disabled="index === 0" aria-label="增加价差" @click="adjust(index, 'gapPercent', 0.1)">
          <Plus :size="18" />
        </button>
      </div>
      <div :class="['step-control', { disabled: index === 0 }]">
        <button
          type="button"
          :disabled="index === 0"
          aria-label="减少下单份数"
          @click="adjust(index, 'amountShares', -0.1)"
        >
          <Minus :size="18" />
        </button>
        <input
          :value="formatEditorValue(layer.amountShares)"
          type="number"
          inputmode="decimal"
          :disabled="index === 0"
          min="0.0001"
          step="0.1"
          aria-label="下单份数"
          @input="updateLayer(index, 'amountShares', $event.target.value)"
        />
        <button
          type="button"
          :disabled="index === 0"
          aria-label="增加下单份数"
          @click="adjust(index, 'amountShares', 0.1)"
        >
          <Plus :size="18" />
        </button>
      </div>
    </div>

    <div class="free-parameters__actions">
      <van-button round :disabled="layers.length >= MARTINGALE_MAX_CUSTOM_LAYERS" @click="addLayer"
        >添加仓位</van-button
      >
      <van-button round :disabled="layers.length <= 1" @click="removeLayer">删除仓位</van-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.free-parameters {
  padding: 12px 16px 16px;
}
.free-parameters__head,
.free-parameters__row {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
  align-items: center;
}
.free-parameters__head {
  margin-bottom: 8px;
  color: var(--trade-subtle);
  font-size: var(--trade-font-xs);
  font-weight: var(--trade-weight-strong);
}
.free-parameters__row + .free-parameters__row {
  margin-top: 10px;
}
.free-parameters__row > strong {
  color: var(--trade-subtle);
  font-size: var(--trade-font-sm);
}
.step-control {
  display: flex;
  min-width: 0;
  height: 46px;
  align-items: center;
  border-radius: 10px;
  background: var(--van-gray-1);
  overflow: hidden;
}
.step-control.disabled {
  opacity: 0.55;
}
.step-control button {
  display: grid;
  flex: 0 0 38px;
  height: 100%;
  border: 0;
  padding: 0;
  place-items: center;
  color: var(--trade-text);
  background: transparent;
}
.step-control button:disabled {
  cursor: not-allowed;
}
.step-control input {
  width: 100%;
  min-width: 0;
  border: 0;
  padding: 0;
  color: var(--trade-text);
  background: transparent;
  text-align: center;
  font: inherit;
  font-weight: var(--trade-weight-strong);
  outline: none;
  appearance: textfield;
}
.step-control input::-webkit-inner-spin-button,
.step-control input::-webkit-outer-spin-button {
  margin: 0;
  appearance: none;
}
.step-control > span {
  padding-right: 2px;
  color: var(--trade-subtle);
}
.free-parameters__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 14px;
}
@media (max-width: 420px) {
  .free-parameters {
    padding-inline: 10px;
  }
  .free-parameters__head,
  .free-parameters__row {
    grid-template-columns: 38px minmax(0, 1fr) minmax(0, 1fr);
    gap: 6px;
  }
  .step-control button {
    flex-basis: 30px;
  }
}
</style>
