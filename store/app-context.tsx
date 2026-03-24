import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { Transaction, Category, AnalyticsSummary, DailySpend, BudgetSummary, SyncResult } from '@/types/transaction';
import {
  getTransactions,
  getUncategorized,
  getCategories,
  insertTransactions,
  updateCategory,
  autoCategorizePending,
  logSync,
  getLastSync,
  clearAllTransactions,
  getTransactionCount,
} from '@/lib/database';
import { readMpesaSms } from '@/lib/sms-reader';
import { parseMpesaBatch } from '@/lib/mpesa-parser';
import {
  computeSummary,
  currentMonthBounds,
  dailySpendLast7Days,
  computeBudgetSummaries,
} from '@/lib/analytics';

// ─── State ────────────────────────────────────────────────────────────────────

interface AppState {
  transactions: Transaction[];
  uncategorized: Transaction[];
  categories: Category[];
  budgetSummaries: BudgetSummary[];
  monthSummary: AnalyticsSummary;
  chartData: DailySpend[];
  totalCount: number;
  lastSync: number | null;
  loading: boolean;
  syncing: boolean;
  error: string | null;
}

const EMPTY_SUMMARY: AnalyticsSummary = {
  totalReceived: 0,
  totalSent: 0,
  totalFees: 0,
  netBalance: 0,
  transactionCount: 0,
  period: { start: 0, end: 0 },
};

const INITIAL_STATE: AppState = {
  transactions: [],
  uncategorized: [],
  categories: [],
  budgetSummaries: [],
  monthSummary: EMPTY_SUMMARY,
  chartData: [],
  totalCount: 0,
  lastSync: null,
  loading: true,
  syncing: false,
  error: null,
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; payload: Partial<AppState> }
  | { type: 'LOAD_ERROR'; error: string }
  | { type: 'SYNC_START' }
  | { type: 'SYNC_END' }
  | { type: 'SET_ERROR'; error: string | null };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, loading: true, error: null };
    case 'LOAD_SUCCESS':
      return { ...state, loading: false, ...action.payload };
    case 'LOAD_ERROR':
      return { ...state, loading: false, error: action.error };
    case 'SYNC_START':
      return { ...state, syncing: true, error: null };
    case 'SYNC_END':
      return { ...state, syncing: false };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppContextValue extends AppState {
  syncSms: () => Promise<SyncResult>;
  setCategory: (txId: string, category: string) => Promise<void>;
  refreshData: () => Promise<void>;
  clearData: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const loadData = useCallback(async () => {
    dispatch({ type: 'LOAD_START' });
    try {
      const [transactions, uncategorized, categories, totalCount, lastSync] = await Promise.all([
        getTransactions({ limit: 200 }),
        getUncategorized(),
        getCategories(),
        getTransactionCount(),
        getLastSync(),
      ]);

      const monthBounds  = currentMonthBounds();
      const monthSummary = computeSummary(transactions, monthBounds);
      const chartData    = dailySpendLast7Days(transactions);
      const budgetSummaries = computeBudgetSummaries(categories, transactions, monthBounds);

      dispatch({
        type: 'LOAD_SUCCESS',
        payload: { transactions, uncategorized, categories, totalCount, lastSync, monthSummary, chartData, budgetSummaries },
      });
    } catch (e: any) {
      dispatch({ type: 'LOAD_ERROR', error: e.message ?? 'Failed to load data' });
    }
  }, []);

  // Initial load
  useEffect(() => { loadData(); }, [loadData]);

  const syncSms = useCallback(async (): Promise<SyncResult> => {
    dispatch({ type: 'SYNC_START' });
    const result: SyncResult = { total: 0, imported: 0, skipped: 0, failed: 0 };

    try {
      const rawSms = await readMpesaSms({ fromDate: state.lastSync ?? undefined });
      result.total = rawSms.length;

      const { parsed, failed } = parseMpesaBatch(rawSms);
      result.failed = failed;

      if (parsed.length > 0) {
        const { imported, skipped } = await insertTransactions(parsed);
        result.imported = imported;
        result.skipped  = skipped;

        await autoCategorizePending();
        await logSync(imported, skipped, failed);
        await loadData();
      }
    } catch (e: any) {
      dispatch({ type: 'SET_ERROR', error: e.message ?? 'Sync failed' });
    } finally {
      dispatch({ type: 'SYNC_END' });
    }

    return result;
  }, [state.lastSync, loadData]);

  const setCategory = useCallback(async (txId: string, category: string) => {
    await updateCategory(txId, category);
    await loadData();
  }, [loadData]);

  const clearData = useCallback(async () => {
    await clearAllTransactions();
    await loadData();
  }, [loadData]);

  return (
    <AppContext.Provider
      value={{ ...state, syncSms, setCategory, refreshData: loadData, clearData }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
