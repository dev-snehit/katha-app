import { describe, it, expect } from 'vitest';
import { buildSingleDayTally, buildDateRangeTally } from '../src/lib/tallyEngine';

describe('Number Tally Arithmetic Engine', () => {
  it('formats single day sales into raw additive breakdown string', () => {
    const res = buildSingleDayTally([1, 4, 5, 6]);
    expect(res.formula).toBe('1 + 4 + 5 + 6 = 16 Bags');
    expect(res.total).toBe(16);
  });

  it('handles single order quantity without plus sign', () => {
    const res = buildSingleDayTally([10]);
    expect(res.formula).toBe('10 Bags');
    expect(res.total).toBe(10);
  });

  it('handles zero and empty sales cleanly', () => {
    expect(buildSingleDayTally([]).formula).toBe('0 Bags');
    expect(buildSingleDayTally([0, 0]).formula).toBe('0 Bags');
  });

  it('builds date-grouped breakdowns for date ranges', () => {
    const entries = [
      { date: '2026-11-20', quantities: [2, 3] },
      { date: '2026-11-21', quantities: [5, 5, 10] },
      { date: '2026-11-22', quantities: [1, 4] },
    ];

    const result = buildDateRangeTally(entries);
    expect(result.periodTotal).toBe(30);
    expect(result.dateBreakdowns).toHaveLength(3);
    expect(result.dateBreakdowns[0].formula).toBe('2 + 3 = 5 Bags');
    expect(result.dateBreakdowns[1].formula).toBe('5 + 5 + 10 = 20 Bags');
    expect(result.dateBreakdowns[2].formula).toBe('1 + 4 = 5 Bags');
    expect(result.periodSummaryText).toContain('Period Total: 30 Bags');
  });
});
