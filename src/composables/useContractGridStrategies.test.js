import { describe, expect, it } from 'vitest';
import { CONTRACT_SIDE_NEUTRAL } from '../strategies/common/grid';
import { getHealth } from './useContractGridStrategies';

describe('getHealth', () => {
  it('calculates neutral liquidation buffer by absolute distance to the nearest liquidation price', () => {
    const health = getHealth(
      {
        estimatedGridLiquidationPrice: 140,
      },
      {
        currentPrice: 150,
        side: CONTRACT_SIDE_NEUTRAL,
      },
    );

    expect(health.distance).toBeCloseTo(6.6666666667);
    expect(health.tone).toBe('danger');
  });
});
