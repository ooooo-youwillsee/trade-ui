<script setup>
import { Copy, RotateCcw, Save, Trash2 } from '@lucide/vue';
import {
  createInitialCustomLayers,
  MARTINGALE_PLATFORM_BITGET,
  MARTINGALE_PLATFORM_GATE,
  MARTINGALE_SIDE_LONG,
  MARTINGALE_SIDE_SHORT,
} from '../strategies/common/martingale';
import MartingaleFreeParametersEditor from './MartingaleFreeParametersEditor.vue';
import MartingaleTipLabel from './MartingaleTipLabel.vue';

const props = defineProps({
  calculation: { type: Object, required: true },
  form: { type: Object, required: true },
  formIsSaved: { type: Boolean, required: true },
  presets: { type: Array, required: true },
  selectedId: { type: String, required: true },
});

defineEmits(['delete-strategy', 'duplicate-strategy', 'reset-form', 'save-strategy', 'set-preset']);

function updateExecutionPlatform(platform) {
  // Bitget 始终使用普通比例模式；保留 Gate 自由配置是为了平台来回切换时不丢用户输入。
  props.form.executionPlatform = platform;
  if (platform === MARTINGALE_PLATFORM_BITGET) props.form.useFreeParameters = false;
}

function updateFreeParameters(enabled) {
  // 每次关闭只切换计算模式，不销毁数组；再次开启可以恢复上一次逐层编辑结果。
  if (!enabled) {
    props.form.useFreeParameters = false;
    return;
  }
  if (!props.form.customLayers?.length) props.form.customLayers = createInitialCustomLayers();
  props.form.useFreeParameters = true;
}
</script>

<template>
  <div class="save-page">
    <section class="save-hero">
      <p class="eyebrow">Spot Martingale</p>
      <h2>{{ form.name || '新现货马丁' }}</h2>
      <span :class="['save-pill', { dirty: !formIsSaved }]">{{ formIsSaved ? '已保存' : '待保存' }}</span>
    </section>

    <van-notice-bar
      v-if="calculation.error"
      color="#9d2e1e"
      background="#fff3ef"
      left-icon="warning-o"
      :text="calculation.error"
    />

    <van-cell-group inset title="快捷预设">
      <div class="preset-chips">
        <van-button
          v-for="preset in presets"
          :key="preset.label"
          plain
          round
          size="small"
          type="primary"
          @click="$emit('set-preset', preset.value)"
        >
          {{ preset.label }}
        </van-button>
      </div>
    </van-cell-group>

    <van-cell-group inset title="基础信息">
      <van-field v-model="form.name" placeholder="输入策略名称">
        <template #label><MartingaleTipLabel label="策略名称" tip-key="strategyName" /></template>
      </van-field>
      <van-field>
        <template #label><MartingaleTipLabel label="方向" tip-key="direction" :side="form.side" /></template>
        <template #input>
          <van-radio-group v-model="form.side" direction="horizontal">
            <van-radio :name="MARTINGALE_SIDE_LONG">做多</van-radio>
            <van-radio :name="MARTINGALE_SIDE_SHORT">做空</van-radio>
          </van-radio-group>
        </template>
      </van-field>
    </van-cell-group>

    <van-cell-group class="price-group" inset title="行情价格">
      <div class="field-grid price-grid">
        <van-field v-model.number="form.entryPrice" type="number" input-align="right">
          <template #label><MartingaleTipLabel label="入场价" tip-key="entryPrice" /></template>
        </van-field>
        <van-field v-model.number="form.currentPrice" type="number" input-align="right">
          <template #label><MartingaleTipLabel label="当前价" tip-key="currentPrice" /></template>
        </van-field>
      </div>
    </van-cell-group>

    <van-cell-group inset title="加仓参数">
      <van-field>
        <template #label>
          <MartingaleTipLabel label="执行平台" tip-key="executionPlatform" :platform="form.executionPlatform" />
        </template>
        <template #input>
          <van-radio-group
            :model-value="form.executionPlatform"
            direction="horizontal"
            @update:model-value="updateExecutionPlatform"
          >
            <van-radio :name="MARTINGALE_PLATFORM_GATE">Gate</van-radio>
            <van-radio :name="MARTINGALE_PLATFORM_BITGET">Bitget</van-radio>
          </van-radio-group>
        </template>
      </van-field>
      <van-field v-if="form.executionPlatform === MARTINGALE_PLATFORM_GATE" input-align="right">
        <template #label><MartingaleTipLabel label="自由参数" tip-key="freeParameters" /></template>
        <template #input>
          <van-switch :model-value="form.useFreeParameters" size="22" @update:model-value="updateFreeParameters" />
        </template>
      </van-field>
      <div class="field-grid">
        <van-field v-model.number="form.firstOrderAmount" type="number" input-align="right">
          <template #label>
            <MartingaleTipLabel label="首单金额" tip-key="firstOrderAmount" mode="spot" />
          </template>
        </van-field>
        <van-field v-if="!form.useFreeParameters" v-model.number="form.multiplier" type="number" input-align="right">
          <template #label><MartingaleTipLabel label="加仓金额倍数" tip-key="amountMultiplier" /></template>
        </van-field>
        <van-field
          v-if="!form.useFreeParameters"
          v-model.number="form.priceGapMultiplier"
          type="number"
          input-align="right"
        >
          <template #label><MartingaleTipLabel label="加仓价差倍数" tip-key="priceGapMultiplier" /></template>
        </van-field>
        <van-field v-if="!form.useFreeParameters" v-model.number="form.maxLayers" type="number" input-align="right">
          <template #label><MartingaleTipLabel label="最大层数" tip-key="maxLayers" /></template>
        </van-field>
        <van-field
          v-if="!form.useFreeParameters"
          v-model.number="form.triggerPercent"
          type="number"
          input-align="right"
        >
          <template #label><MartingaleTipLabel label="触发幅度" tip-key="triggerPercent" /></template>
          <template #button>%</template>
        </van-field>
      </div>
      <MartingaleFreeParametersEditor
        v-if="form.executionPlatform === MARTINGALE_PLATFORM_GATE && form.useFreeParameters"
        :layers="form.customLayers"
        mode="spot"
        :side="form.side"
        @update:layers="form.customLayers = $event"
      />
    </van-cell-group>

    <van-cell-group inset title="止盈参数">
      <van-field v-model.number="form.takeProfitPercent" type="number" input-align="right">
        <template #label>
          <MartingaleTipLabel label="止盈比例" tip-key="takeProfitPercent" :side="form.side" />
        </template>
        <template #button>%</template>
      </van-field>
      <van-field v-model.number="form.feeRate" type="number" input-align="right">
        <template #label><MartingaleTipLabel label="单边手续费率" tip-key="feeRate" /></template>
        <template #button>%</template>
      </van-field>
    </van-cell-group>

    <div class="save-actions">
      <van-button
        icon-position="left"
        round
        type="primary"
        :disabled="Boolean(calculation.error)"
        @click="$emit('save-strategy')"
      >
        <template #icon><Save :size="17" /></template>
        保存策略
      </van-button>
      <van-button
        round
        plain
        type="primary"
        :disabled="Boolean(calculation.error)"
        @click="$emit('duplicate-strategy')"
      >
        <template #icon><Copy :size="17" /></template>
        复制
      </van-button>
      <van-button round plain @click="$emit('reset-form')">
        <template #icon><RotateCcw :size="17" /></template>
        重置
      </van-button>
      <van-button round plain type="danger" @click="$emit('delete-strategy', selectedId)">
        <template #icon><Trash2 :size="17" /></template>
        删除
      </van-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.save-page {
  display: grid;
  gap: 12px;
  padding-top: 12px;
}
.save-hero {
  border: 1px solid rgba(22, 199, 132, 0.22);
  border-radius: 8px;
  padding: 18px;
  background: var(--trade-save-bg);
  box-shadow: var(--trade-card-shadow);
}
.save-hero h2 {
  margin: 4px 0 0;
  color: var(--trade-text);
  font-size: var(--trade-font-display);
  font-weight: var(--trade-weight-title);
  line-height: var(--trade-line-tight);
  overflow-wrap: anywhere;
}
.eyebrow {
  margin: 0;
  color: var(--trade-subtle);
  font-size: var(--trade-font-xs);
  font-weight: var(--trade-weight-strong);
  text-transform: uppercase;
}
.save-pill {
  display: inline-flex;
  margin-top: 10px;
  border-radius: 999px;
  padding: 5px 10px;
  color: var(--trade-up);
  background: var(--trade-up-soft);
  font-size: var(--trade-font-xs);
  font-weight: var(--trade-weight-strong);
}
.save-pill.dirty {
  color: var(--trade-warn);
  background: var(--trade-warn-soft);
}
.preset-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px 14px;
}
.price-group :deep(.van-cell-group__title) {
  color: var(--trade-up);
  font-weight: var(--trade-weight-strong);
}
.price-grid :deep(.van-field__label) {
  color: var(--trade-text);
  font-weight: var(--trade-weight-strong);
}
:deep(.van-field__label) {
  width: 8.5em;
}
.save-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 4px 4px 16px;
}
.save-actions :deep(.van-button:first-child) {
  grid-column: 1 / -1;
}
@media (min-width: 640px) {
  .field-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
