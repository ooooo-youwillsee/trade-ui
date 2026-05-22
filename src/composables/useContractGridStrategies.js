import { createGridStrategyStore } from '../strategies/common/useGridStrategyStoreFactory';
import { calculateContractGrid, CONTRACT_SIDE_LONG, normalizeInput } from '../strategies/contract/grid';
import { contractGridPresets, defaultContractGridInput } from '../strategies/contract/gridDefaults';

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
  ],
});

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

export function currentYieldRate(strategyResult) {
  if (!strategyResult?.filledMargin) return 0;
  return (strategyResult.floatingProfitLoss / strategyResult.filledMargin) * 100;
}

export function getHealth(strategyResult, input) {
  if (!strategyResult || !input) return { label: '参数异常', tone: 'danger', distance: 0 };
  const liquidation = strategyResult.estimatedGridLiquidationPrice;
  const current = input.currentPrice;
  if (liquidation === 0 || current === 0) return { label: '未形成仓位', tone: 'muted', distance: 0 };

  const distance =
    input.side === CONTRACT_SIDE_LONG
      ? ((current - liquidation) / current) * 100
      : ((liquidation - current) / current) * 100;

  if (distance < 8) return { label: '强平缓冲偏窄', tone: 'danger', distance };
  if (distance < 20) return { label: '强平缓冲一般', tone: 'warning', distance };
  return { label: '强平缓冲充足', tone: 'success', distance };
}
