<script setup>
import { Copy, RotateCcw, Save, Trash2 } from '@lucide/vue';
import {
  GRID_MODE_ARITHMETIC,
  GRID_MODE_GEOMETRIC,
  POSITION_INCREMENT_DIFFERENCE,
  POSITION_INCREMENT_RATIO,
} from '../strategies/contract/hedgeGrid';

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

defineEmits(['delete-strategy', 'duplicate-strategy', 'reset-form', 'save-strategy', 'set-preset']);

// 单格递增沿用普通合约网格的两种模式：按比例或按金额增加每格仓位。
const incrementModeActions = [
  { text: '比例', value: POSITION_INCREMENT_RATIO },
  { text: '金额', value: POSITION_INCREMENT_DIFFERENCE },
];

function incrementModeLabel(mode) {
  // 金额模式显示 USDT，比例模式显示百分比，减少表单额外说明文字。
  return mode === POSITION_INCREMENT_DIFFERENCE ? 'USDT' : '%';
}

function setIncrementMode(leg, action) {
  leg.positionIncrementMode = action.value;
}
</script>

<template>
  <div class="save-page">
    <section class="save-hero">
      <p class="eyebrow">Hedge Grid Plan</p>
      <h2>{{ form.name || '新对冲合约网格' }}</h2>
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
      <van-field v-model="form.name" label="策略名称" placeholder="输入策略名称" />
      <van-field v-model.number="form.longScenarioChangePercent" label="多头涨跌幅" type="number" input-align="right">
        <template #button>%</template>
      </van-field>
      <van-field v-model.number="form.shortScenarioChangePercent" label="空头涨跌幅" type="number" input-align="right">
        <template #button>%</template>
      </van-field>
    </van-cell-group>

    <van-cell-group inset title="多头合约">
      <van-field v-model="form.longLeg.name" label="合约名称" input-align="right" />
      <van-field v-model.number="form.longLeg.lowerPrice" label="下限价格" type="number" input-align="right" />
      <van-field v-model.number="form.longLeg.upperPrice" label="上限价格" type="number" input-align="right" />
      <van-field v-model.number="form.longLeg.entryPrice" label="入场价格" type="number" input-align="right" />
      <van-field v-model.number="form.longLeg.currentPrice" label="当前价格" type="number" input-align="right" />
      <van-field label="网格模式">
        <template #input>
          <van-radio-group v-model="form.longLeg.gridMode" direction="horizontal">
            <van-radio :name="GRID_MODE_ARITHMETIC">等差</van-radio>
            <van-radio :name="GRID_MODE_GEOMETRIC">等比</van-radio>
          </van-radio-group>
        </template>
      </van-field>
      <van-cell center title="创建时建仓">
        <template #right-icon>
          <van-switch v-model="form.longLeg.openOnCreate" size="22px" />
        </template>
      </van-cell>
      <van-field v-model.number="form.longLeg.gridCount" label="网格数量" type="number" input-align="right" />
      <van-field v-model.number="form.longLeg.leverage" label="杠杆倍数" type="number" input-align="right" />
      <van-field v-model.number="form.longLeg.investment" label="初始保证金" type="number" input-align="right" />
      <van-field
        v-model.number="form.longLeg.additionalInvestment"
        label="追加保证金"
        type="number"
        input-align="right"
      />
      <van-field
        v-model.number="form.longLeg.positionIncrementValue"
        label="单格递增"
        type="number"
        input-align="right"
      >
        <template #button>
          <van-popover
            :actions="incrementModeActions"
            placement="bottom-end"
            @select="setIncrementMode(form.longLeg, $event)"
          >
            <template #reference>
              <van-button class="field-suffix-button" size="small" plain type="primary">
                {{ incrementModeLabel(form.longLeg.positionIncrementMode) }}
              </van-button>
            </template>
          </van-popover>
        </template>
      </van-field>
    </van-cell-group>

    <van-cell-group inset title="空头合约">
      <van-field v-model="form.shortLeg.name" label="合约名称" input-align="right" />
      <van-field v-model.number="form.shortLeg.lowerPrice" label="下限价格" type="number" input-align="right" />
      <van-field v-model.number="form.shortLeg.upperPrice" label="上限价格" type="number" input-align="right" />
      <van-field v-model.number="form.shortLeg.entryPrice" label="入场价格" type="number" input-align="right" />
      <van-field v-model.number="form.shortLeg.currentPrice" label="当前价格" type="number" input-align="right" />
      <van-field label="网格模式">
        <template #input>
          <van-radio-group v-model="form.shortLeg.gridMode" direction="horizontal">
            <van-radio :name="GRID_MODE_ARITHMETIC">等差</van-radio>
            <van-radio :name="GRID_MODE_GEOMETRIC">等比</van-radio>
          </van-radio-group>
        </template>
      </van-field>
      <van-cell center title="创建时建仓">
        <template #right-icon>
          <van-switch v-model="form.shortLeg.openOnCreate" size="22px" />
        </template>
      </van-cell>
      <van-field v-model.number="form.shortLeg.gridCount" label="网格数量" type="number" input-align="right" />
      <van-field v-model.number="form.shortLeg.leverage" label="杠杆倍数" type="number" input-align="right" />
      <van-field v-model.number="form.shortLeg.investment" label="初始保证金" type="number" input-align="right" />
      <van-field
        v-model.number="form.shortLeg.additionalInvestment"
        label="追加保证金"
        type="number"
        input-align="right"
      />
      <van-field
        v-model.number="form.shortLeg.positionIncrementValue"
        label="单格递增"
        type="number"
        input-align="right"
      >
        <template #button>
          <van-popover
            :actions="incrementModeActions"
            placement="bottom-end"
            @select="setIncrementMode(form.shortLeg, $event)"
          >
            <template #reference>
              <van-button class="field-suffix-button" size="small" plain type="primary">
                {{ incrementModeLabel(form.shortLeg.positionIncrementMode) }}
              </van-button>
            </template>
          </van-popover>
        </template>
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

.save-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 4px 4px 16px;

  :deep(.van-button:first-child) {
    grid-column: 1 / -1;
  }
}

.field-suffix-button {
  min-width: 56px;
}
</style>
