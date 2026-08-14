<script setup>
import { GRID_MODE_ARITHMETIC, GRID_MODE_GEOMETRIC } from '../strategies/contract/hedgeGrid';
import GridTipLabel from './GridTipLabel.vue';

defineProps({
  leg: {
    type: Object,
    required: true,
  },
  side: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
});
</script>

<template>
  <van-cell-group inset :title="title">
    <van-field v-model="leg.name" input-align="right">
      <template #label><GridTipLabel label="合约名称" tip-key="contractName" /></template>
    </van-field>
    <van-field v-model.number="leg.lowerPrice" type="number" input-align="right">
      <template #label><GridTipLabel label="下限价格" tip-key="lowerPrice" /></template>
    </van-field>
    <van-field v-model.number="leg.upperPrice" type="number" input-align="right">
      <template #label><GridTipLabel label="上限价格" tip-key="upperPrice" /></template>
    </van-field>
    <van-field v-model.number="leg.entryPrice" type="number" input-align="right">
      <template #label><GridTipLabel label="入场价格" tip-key="entryPrice" /></template>
    </van-field>
    <van-field v-model.number="leg.currentPrice" type="number" input-align="right">
      <template #label><GridTipLabel label="当前价格" tip-key="currentPrice" /></template>
    </van-field>
    <van-field>
      <template #label><GridTipLabel label="网格模式" tip-key="gridMode" :grid-mode="leg.gridMode" /></template>
      <template #input>
        <van-radio-group v-model="leg.gridMode" direction="horizontal">
          <van-radio :name="GRID_MODE_ARITHMETIC">等差</van-radio>
          <van-radio :name="GRID_MODE_GEOMETRIC">等比</van-radio>
        </van-radio-group>
      </template>
    </van-field>
    <van-cell center>
      <template #title><GridTipLabel label="创建时建仓" tip-key="openOnCreate" :side="side" /></template>
      <template #right-icon>
        <van-switch v-model="leg.openOnCreate" size="22px" />
      </template>
    </van-cell>
    <van-field v-model.number="leg.gridCount" type="number" input-align="right">
      <template #label><GridTipLabel label="网格数量" tip-key="gridCount" /></template>
    </van-field>
    <van-field v-model.number="leg.leverage" type="number" input-align="right">
      <template #label><GridTipLabel label="杠杆倍数" tip-key="leverage" /></template>
    </van-field>
    <van-field v-model.number="leg.investment" type="number" input-align="right">
      <template #label><GridTipLabel label="初始保证金" tip-key="investment" mode="futures" /></template>
    </van-field>
    <van-field v-model.number="leg.additionalInvestment" type="number" input-align="right">
      <template #label><GridTipLabel label="追加保证金" tip-key="additionalInvestment" /></template>
    </van-field>
    <van-field v-model.number="leg.minTradeQuantity" type="number" input-align="right">
      <template #label><GridTipLabel label="最小成交数量" tip-key="minTradeQuantity" /></template>
    </van-field>
  </van-cell-group>
</template>
