import { describe, expect, it } from 'vitest';
import { getGridTip, GRID_TIP_KEYS } from './gridTips';

describe('grid tip catalog', () => {
  it('returns a Chinese description for every registered semantic key', () => {
    GRID_TIP_KEYS.forEach((key) => {
      expect(getGridTip(key, { mode: 'futures', side: 'long', gridMode: 'arithmetic' })).toMatch(/[\u4e00-\u9fff]/);
    });
  });

  it('distinguishes arithmetic and geometric grid descriptions', () => {
    expect(getGridTip('gridMode', { gridMode: 'arithmetic' })).toContain('固定价差');
    expect(getGridTip('gridMode', { gridMode: 'geometric' })).toContain('固定比例');
  });

  it('distinguishes spot, contract and direction wording', () => {
    expect(getGridTip('investment', { mode: 'spot' })).toContain('投入金额');
    expect(getGridTip('investment', { mode: 'futures' })).toContain('保证金');
    expect(getGridTip('direction', { side: 'neutral' })).toContain('做多腿和一条做空腿');
  });

  it('describes hedge scenario and capital formulas', () => {
    expect(getGridTip('hedgeMarginShortfall')).toContain('需补保证金－可转出盈利');
    expect(getGridTip('legScenarioProfit', { side: 'short' })).toContain('场景下已实现止盈收益');
  });

  it('returns an empty string for an unknown semantic key', () => {
    expect(getGridTip('unknown-key')).toBe('');
  });
});
