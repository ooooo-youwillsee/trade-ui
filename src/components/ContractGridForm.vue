<script setup>
// 合约网格编辑表单：负责采集策略参数，并把保存/复制/删除等动作交给页面处理。
import { Copy, RotateCcw, Save, Trash2 } from '@lucide/vue';
import {
  CONTRACT_SIDE_LONG,
  CONTRACT_SIDE_NEUTRAL,
  CONTRACT_SIDE_SHORT,
  GRID_MODE_ARITHMETIC,
  GRID_MODE_GEOMETRIC,
} from '../strategies/common/grid';
import GridTipLabel from './GridTipLabel.vue';

// 父页面传入响应式 form 和计算状态，表单只负责展示和触发事件。
const props = defineProps({
  calculation: {
    type: Object,
    required: true,
  },
  form: {
    type: Object,
    required: true,
  },
  formIsSaved: {
    type: Boolean,
    required: true,
  },
  presets: {
    type: Array,
    required: true,
  },
  selectedId: {
    type: String,
    required: true,
  },
});

// 事件命名保持业务动作语义，父页面根据当前路由决定具体跳转和提示。
defineEmits(['delete-strategy', 'duplicate-strategy', 'reset-form', 'save-strategy', 'set-preset']);
</script>

<template>
  <!-- 合约网格保存页主体：按预设、基础信息、价格区间和资金网格分组。 -->
  <div class="save-page">
    <section class="save-hero">
      <p class="eyebrow">Fresh Grid Plan</p>
      <h2>{{ form.name || '新合约网格' }}</h2>
      <span :class="['save-pill', { dirty: !formIsSaved }]">
        {{ formIsSaved ? '已保存' : '待保存' }}
      </span>
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
        <template #label><GridTipLabel label="策略名称" tip-key="strategyName" /></template>
      </van-field>
      <van-field>
        <template #label><GridTipLabel label="方向" tip-key="direction" :side="form.side" /></template>
        <template #input>
          <van-radio-group v-model="form.side" direction="horizontal">
            <van-radio :name="CONTRACT_SIDE_LONG">做多</van-radio>
            <van-radio :name="CONTRACT_SIDE_SHORT">做空</van-radio>
            <van-radio :name="CONTRACT_SIDE_NEUTRAL">中性</van-radio>
          </van-radio-group>
        </template>
      </van-field>
      <van-field>
        <template #label>
          <GridTipLabel label="网格模式" tip-key="gridMode" :grid-mode="form.gridMode" />
        </template>
        <template #input>
          <van-radio-group v-model="form.gridMode" direction="horizontal">
            <van-radio :name="GRID_MODE_ARITHMETIC">等差</van-radio>
            <van-radio :name="GRID_MODE_GEOMETRIC">等比</van-radio>
          </van-radio-group>
        </template>
      </van-field>
      <van-cell center>
        <template #title>
          <GridTipLabel label="创建时立即建仓" tip-key="openOnCreate" :side="form.side" />
        </template>
        <template #right-icon>
          <van-switch v-model="form.openOnCreate" size="22px" />
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group inset title="价格区间">
      <van-field v-model.number="form.lowerPrice" type="number" input-align="right">
        <template #label><GridTipLabel label="下限价格" tip-key="lowerPrice" /></template>
      </van-field>
      <van-field v-model.number="form.upperPrice" type="number" input-align="right">
        <template #label><GridTipLabel label="上限价格" tip-key="upperPrice" /></template>
      </van-field>
      <van-field v-model.number="form.entryPrice" type="number" input-align="right">
        <template #label><GridTipLabel label="入场价格" tip-key="entryPrice" /></template>
      </van-field>
      <van-field v-model.number="form.currentPrice" type="number" input-align="right">
        <template #label><GridTipLabel label="当前价格" tip-key="currentPrice" /></template>
      </van-field>
    </van-cell-group>

    <van-cell-group inset title="资金与网格">
      <van-field v-model.number="form.gridCount" type="number" input-align="right">
        <template #label><GridTipLabel label="网格数量" tip-key="gridCount" /></template>
      </van-field>
      <van-field v-model.number="form.leverage" type="number" input-align="right">
        <template #label><GridTipLabel label="杠杆倍数" tip-key="leverage" /></template>
      </van-field>
      <van-field v-model.number="form.investment" type="number" input-align="right">
        <template #label><GridTipLabel label="初始保证金" tip-key="investment" mode="futures" /></template>
      </van-field>
      <van-field v-model.number="form.additionalInvestment" type="number" input-align="right">
        <template #label><GridTipLabel label="追加保证金" tip-key="additionalInvestment" /></template>
      </van-field>
      <van-field v-model.number="form.feeRate" type="number" input-align="right">
        <template #label><GridTipLabel label="单边手续费率" tip-key="feeRate" /></template>
        <template #button>%</template>
      </van-field>
      <van-field v-model.number="form.minTradeQuantity" type="number" input-align="right">
        <template #label><GridTipLabel label="最小成交数量" tip-key="minTradeQuantity" /></template>
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
      <van-button round plain type="primary" @click="$emit('duplicate-strategy')">
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
/* 表单页面布局：通过网格间距让移动端多个输入分组保持清晰。 */
.save-page {
  display: grid;
  gap: 12px;
  padding-top: 12px;
}

.save-hero {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(22, 199, 132, 0.22);
  border-radius: 8px;
  padding: 18px;
  background: var(--trade-save-bg);
  box-shadow: var(--trade-card-shadow);

  h2 {
    margin: 4px 0 0;
    color: var(--trade-text);
    font-size: var(--trade-font-display);
    font-weight: var(--trade-weight-title);
    line-height: var(--trade-line-tight);
    overflow-wrap: anywhere;
  }
}

.eyebrow {
  margin: 0;
  color: var(--trade-subtle);
  font-size: var(--trade-font-xs);
  font-weight: var(--trade-weight-strong);
  letter-spacing: 0;
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

  &.dirty {
    color: var(--trade-warn);
    background: var(--trade-warn-soft);
  }
}

.preset-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px 14px;
}

:deep(.van-field__label) {
  width: 8.5em;
}

.save-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 4px 4px 16px;

  :deep(.van-button:first-child) {
    grid-column: 1 / -1;
  }
}
</style>
