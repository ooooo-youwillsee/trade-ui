import { describe, expect, it } from 'vitest';
import { getMartingaleTip, MARTINGALE_TIP_KEYS } from './martingaleTips';

describe('martingale tip catalog', () => {
  it('returns non-empty Chinese descriptions for every registered key', () => {
    MARTINGALE_TIP_KEYS.forEach((key) => {
      expect(getMartingaleTip(key, { mode: 'futures', side: 'long', platform: 'gate' })).toMatch(/[\u4e00-\u9fff]/);
    });
  });

  it('distinguishes Gate and Bitget platform rules', () => {
    expect(getMartingaleTip('executionPlatform', { platform: 'gate' })).toContain('上一层触发价');
    expect(getMartingaleTip('executionPlatform', { platform: 'bitget' })).toContain('入场价');
  });

  it('distinguishes contract, spot, long and short wording', () => {
    expect(getMartingaleTip('firstOrderAmount', { mode: 'futures' })).toContain('保证金');
    expect(getMartingaleTip('firstOrderAmount', { mode: 'spot' })).toContain('金额');
    expect(getMartingaleTip('customGapPercent', { side: 'long' })).toContain('下跌');
    expect(getMartingaleTip('customGapPercent', { side: 'short' })).toContain('上涨');
  });

  it('returns an empty string for an unknown semantic key', () => {
    expect(getMartingaleTip('unknown-key')).toBe('');
  });
});
