import { Transaction, AnalyticsSummary, DailySpend, BudgetSummary } from '@/types/transaction';

const OUTFLOW_TYPES = new Set(['sent', 'payment', 'withdrawal', 'airtime', 'fuliza']);
const INFLOW_TYPES  = new Set(['received', 'deposit', 'reversal']);

// ─── Summary ──────────────────────────────────────────────────────────────────

export function computeSummary(
  transactions: Transaction[],
  period?: { start: number; end: number }
): AnalyticsSummary {
  const txs = period
    ? transactions.filter((t) => t.date >= period.start && t.date <= period.end)
    : transactions;

  let totalReceived = 0;
  let totalSent = 0;
  let totalFees = 0;

  for (const tx of txs) {
    if (INFLOW_TYPES.has(tx.type))  totalReceived += tx.amount;
    if (OUTFLOW_TYPES.has(tx.type)) totalSent += tx.amount;
    totalFees += tx.cost;
  }

  const dates = txs.map((t) => t.date);
  return {
    totalReceived,
    totalSent,
    totalFees,
    netBalance: totalReceived - totalSent,
    transactionCount: txs.length,
    period: period ?? {
      start: dates.length ? Math.min(...dates) : 0,
      end:   dates.length ? Math.max(...dates) : 0,
    },
  };
}

// ─── Current month ────────────────────────────────────────────────────────────

export function currentMonthBounds(): { start: number; end: number } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
  return { start, end };
}

export function lastNDaysBounds(n: number): { start: number; end: number } {
  const end   = Date.now();
  const start = end - n * 24 * 60 * 60 * 1000;
  return { start, end };
}

// ─── Daily spend chart ────────────────────────────────────────────────────────

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHORT_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function dailySpendLast7Days(transactions: Transaction[]): DailySpend[] {
  const { start } = lastNDaysBounds(7);

  const buckets: Record<string, number> = {};
  const dayInfo: Record<string, { label: string; date: number }> = {};

  // Initialise 7 day buckets
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    buckets[key] = 0;
    dayInfo[key]  = {
      label: SHORT_LABELS[d.getDay()],
      date: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
    };
  }

  for (const tx of transactions) {
    if (tx.date < start) continue;
    if (!OUTFLOW_TYPES.has(tx.type)) continue;
    const d = new Date(tx.date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (key in buckets) buckets[key] += tx.amount;
  }

  return Object.keys(buckets).map((key) => ({
    date:   dayInfo[key].date,
    label:  dayInfo[key].label,
    amount: Math.round(buckets[key]),
  }));
}

// ─── Category spend ───────────────────────────────────────────────────────────

export function spendByCategory(
  transactions: Transaction[],
  period?: { start: number; end: number }
): Record<string, number> {
  const txs = period
    ? transactions.filter((t) => t.date >= period.start && t.date <= period.end)
    : transactions;

  const result: Record<string, number> = {};
  for (const tx of txs) {
    if (!OUTFLOW_TYPES.has(tx.type)) continue;
    const cat = tx.category ?? 'Uncategorized';
    result[cat] = (result[cat] ?? 0) + tx.amount;
  }
  return result;
}

// ─── Budget summaries ─────────────────────────────────────────────────────────

import { Category } from '@/types/transaction';

export function computeBudgetSummaries(
  categories: Category[],
  transactions: Transaction[],
  period?: { start: number; end: number }
): BudgetSummary[] {
  const spend = spendByCategory(transactions, period ?? currentMonthBounds());
  const txCount: Record<string, number> = {};

  const txs = period
    ? transactions.filter((t) => t.date >= period.start && t.date <= period.end)
    : transactions.filter((t) => t.date >= currentMonthBounds().start);

  for (const tx of txs) {
    if (!OUTFLOW_TYPES.has(tx.type) || !tx.category) continue;
    txCount[tx.category] = (txCount[tx.category] ?? 0) + 1;
  }

  return categories.map((cat) => ({
    ...cat,
    spent: spend[cat.name] ?? 0,
    transactionCount: txCount[cat.name] ?? 0,
  }));
}

// ─── Month-over-month trend ───────────────────────────────────────────────────

export function monthlyTrend(transactions: Transaction[], months = 6): {
  month: string;
  received: number;
  sent: number;
}[] {
  const result = [];
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = d.getTime();
    const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
    const summary = computeSummary(transactions, { start, end });
    result.push({
      month: MONTH_NAMES[d.getMonth()],
      received: summary.totalReceived,
      sent: summary.totalSent,
    });
  }
  return result;
}
