import { CONTRACT_SIDE_LONG, CONTRACT_SIDE_SHORT, limitedGridProfitLoss } from '../common/grid';

// 只聚合仍未平仓的合约持仓，已止盈平仓的网格应在调用前剔除。
export function aggregateContractPositionEntries(entries, currentPrice, leverage) {
  const aggregate = {
    margin: 0,
    notional: 0,
    quantity: 0,
    averageEntryPrice: 0,
    floatingProfitLoss: 0,
  };

  entries.forEach((entry) => {
    const quantity = entry.notional / entry.openPrice;
    aggregate.margin += entry.notional / leverage;
    aggregate.notional += entry.notional;
    aggregate.quantity += quantity;
    // 单格浮盈亏沿用网格目标价封顶，避免顺势越过止盈价后继续放大利润。
    aggregate.floatingProfitLoss += limitedGridProfitLoss(
      currentPrice,
      entry.openPrice,
      entry.targetPrice,
      quantity,
      entry.side,
    );
  });

  if (aggregate.quantity > 0) {
    aggregate.averageEntryPrice = aggregate.notional / aggregate.quantity;
  }
  return aggregate;
}

// 简化强平估算：保证金作为可承受亏损预算，多头向下、空头向上推算风险价。
export function liquidationPrice(side, averageEntryPrice, positionNotional, margin) {
  if (positionNotional <= 0) return 0;
  if (side === CONTRACT_SIDE_LONG) return Math.max(averageEntryPrice * (1 - margin / positionNotional), 0);
  if (side === CONTRACT_SIDE_SHORT) return averageEntryPrice * (1 + margin / positionNotional);
  return 0;
}
