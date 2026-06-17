import { createGridStrategyStore } from '../strategies/common/useGridStrategyStoreFactory';
import {
  calculateContractGrid,
  CONTRACT_SIDE_LONG,
  CONTRACT_SIDE_NEUTRAL,
  normalizeInput,
} from '../strategies/contract/grid';
import { contractGridPresets, defaultContractGridInput } from '../strategies/contract/gridDefaults';

// 合约网格策略 composable：注入合约网格计算、默认参数和本地存储 key。
export const useContractGridStrategies = createGridStrategyStore({
  calculateStrategy,
  defaultInput: defaultContractGridInput,
  deleteMessage: '策略已删除',
  duplicateFallbackName: '合约网格',
  enableImportExport: true,
  newName: '新合约网格',
  normalizeInput,
  presets: contractGridPresets,
  saveMessage: '策略已保存',
  storageKey: 'contract-grid-strategies',
  stripNumericFields: [
    'gridCount',
    'lowerPrice',
    'upperPrice',
    'entryPrice',
    'currentPrice',
    'leverage',
    'investment',
    'additionalInvestment',
    'positionIncrementValue',
  ],
});

// 统一包装计算异常，避免表单输入不合法时页面渲染中断。
export function calculateStrategy(strategy) {
  try {
    const input = normalizeInput(strategy);
    return {
      error: '',
      input,
      result: calculateContractGrid(input),
    };
  } catch (error) {
    return {
      error: error.message,
      input: null,
      result: null,
    };
  }
}

// 当前收益率以已成交保证金为分母，体现实际占用资金的回报。
export function currentYieldRate(strategyResult) {
  if (!strategyResult?.filledMargin) return 0;
  return (strategyResult.totalProfitLoss / strategyResult.filledMargin) * 100;
}

// 根据当前价格与估算强平价距离生成健康度标签和颜色语义。
export function getHealth(strategyResult, input) {
  if (!strategyResult || !input) return { label: '参数异常', tone: 'danger', distance: 0 };
  const liquidation = strategyResult.estimatedGridLiquidationPrice;
  const current = input.currentPrice;
  if (liquidation === 0 || current === 0) return { label: '未形成仓位', tone: 'muted', distance: 0 };

  const distance =
    input.side === CONTRACT_SIDE_NEUTRAL
      ? (Math.abs(current - liquidation) / current) * 100
      : input.side === CONTRACT_SIDE_LONG
        ? ((current - liquidation) / current) * 100
        : ((liquidation - current) / current) * 100;

  if (distance < 8) return { label: '强平缓冲偏窄', tone: 'danger', distance };
  if (distance < 20) return { label: '强平缓冲一般', tone: 'warning', distance };
  return { label: '强平缓冲充足', tone: 'success', distance };
}
