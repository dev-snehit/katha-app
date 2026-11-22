/**
 * Number Tally Arithmetic Engine
 * Builds raw arithmetic strings (e.g. "1 + 4 + 5 + 6 = 16 Bags") for wholesale loading audits.
 */

export interface TallyResult {
  formula: string;
  total: number;
}

export function buildSingleDayTally(quantities: number[]): TallyResult {
  if (!quantities || quantities.length === 0) {
    return { formula: '0 Bags', total: 0 };
  }

  const validNumbers = quantities.filter(q => q > 0);
  if (validNumbers.length === 0) {
    return { formula: '0 Bags', total: 0 };
  }

  const total = validNumbers.reduce((sum, n) => sum + n, 0);

  if (validNumbers.length === 1) {
    return {
      formula: `${validNumbers[0]} Bags`,
      total,
    };
  }

  const formula = `${validNumbers.join(' + ')} = ${total} Bags`;
  return { formula, total };
}

export interface DateGroupedEntry {
  date: string;
  quantities: number[];
}

export interface DateRangeTallyResult {
  dateBreakdowns: Array<{ date: string; formula: string; subtotal: number }>;
  periodTotal: number;
  periodSummaryText: string;
}

export function buildDateRangeTally(entries: DateGroupedEntry[]): DateRangeTallyResult {
  let periodTotal = 0;
  const dateBreakdowns: Array<{ date: string; formula: string; subtotal: number }> = [];

  for (const entry of entries) {
    const single = buildSingleDayTally(entry.quantities);
    if (single.total > 0) {
      dateBreakdowns.push({
        date: entry.date,
        formula: single.formula,
        subtotal: single.total,
      });
      periodTotal += single.total;
    }
  }

  const periodSummaryText = dateBreakdowns
    .map(d => `${d.date}: (${d.formula})`)
    .join(' | ') + ` | Period Total: ${periodTotal} Bags`;

  return {
    dateBreakdowns,
    periodTotal,
    periodSummaryText,
  };
}
