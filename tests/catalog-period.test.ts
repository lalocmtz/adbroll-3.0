import { describe, expect, it } from 'vitest';
import { parseReportPeriod, selectReportPeriod } from '@/lib/catalog-period';

describe('catalog report windows', () => {
  const ranges = ['2025-12-18~2026-01-16', '2026-09-10~2026-10-09', '2026-07-19~2026-08-17'];
  it('uses the recent report for all default sorts instead of Christmas history', () => {
    expect(selectReportPeriod(ranges, 'latest')?.range).toBe('2026-09-10~2026-10-09');
    expect(selectReportPeriod(ranges, '30')?.range).toBe('2026-09-10~2026-10-09');
  });
  it('does not fabricate weekly or sixty-day revenue from thirty-day snapshots', () => {
    expect(selectReportPeriod(ranges, '7')).toBeNull();
    expect(selectReportPeriod(ranges, '60')).toBeNull();
    expect(selectReportPeriod(ranges, 'all')).toBeNull();
  });
  it('handles inclusive boundaries and chooses the newest matching window', () => {
    expect(selectReportPeriod([...ranges, '2026-10-03~2026-10-09'], '7')?.days).toBe(7);
    expect(parseReportPeriod('2026-08-11~2026-10-09')?.days).toBe(60);
    expect(parseReportPeriod('2026-02-30~2026-03-29')).toBeNull();
    expect(parseReportPeriod('2026-10-09~2026-09-10')).toBeNull();
  });
});
