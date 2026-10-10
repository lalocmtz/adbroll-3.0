export type CatalogPeriod = '7' | '30';
export const CATALOG_PERIODS: { value: CatalogPeriod; label: string }[] = [
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
];

export function parseReportPeriod(range: string) {
  const match = /^(\d{4}-\d{2}-\d{2})~(\d{4}-\d{2}-\d{2})$/.exec(range);
  if (!match) return null;
  const start = Date.parse(`${match[1]}T00:00:00Z`);
  const end = Date.parse(`${match[2]}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start ||
      new Date(start).toISOString().slice(0, 10) !== match[1] ||
      new Date(end).toISOString().slice(0, 10) !== match[2]) return null;
  return { range, start: match[1], end: match[2], days: (end - start) / 86400000 + 1 };
}

// Never combine overlapping snapshots or silently substitute a different window.
export function selectReportPeriod(ranges: string[], period: CatalogPeriod) {
  return ranges.map(parseReportPeriod)
    .filter((r): r is NonNullable<typeof r> => !!r && r.days === Number(period))
    .sort((a, b) => b.end.localeCompare(a.end) || a.days - b.days)[0] ?? null;
}

export function formatReportPeriod(range: string) {
  const period = parseReportPeriod(range);
  if (!period) return 'Periodo no disponible';
  const format = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return `${format(period.start)} – ${format(period.end)}`;
}
