import { DatabaseService } from './dbService';
import {
  TransactionStats,
  CashFlowData,
  MerchantStats,
  CategoryStats,
  TransactionType,
  Transaction,
} from '../types';

/**
 * Analytics Service
 * 
 * Generates analytics and insights from transaction data
 */

export class AnalyticsService {
  /**
   * Get transaction statistics for a date range
   */
  static async getTransactionStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<TransactionStats> {
    await DatabaseService.initialize();

    let transactions: Transaction[];
    
    if (startDate && endDate) {
      transactions = await DatabaseService.getTransactionsByDateRange(startDate, endDate);
    } else {
      transactions = await DatabaseService.getAllTransactions();
    }

    let totalIncome = 0;
    let totalExpenses = 0;
    let largestTransaction = 0;

    for (const tx of transactions) {
      // Income: received money, deposits
      if (tx.type === TransactionType.RECEIVED || tx.type === TransactionType.DEPOSIT) {
        totalIncome += tx.amount;
      }
      // Expenses: sent, paybill, buy goods, withdraw, airtime, lipa na mpesa
      else {
        totalExpenses += tx.amount + tx.transactionCost;
      }

      if (tx.amount > largestTransaction) {
        largestTransaction = tx.amount;
      }
    }

    const netChange = totalIncome - totalExpenses;
    const transactionCount = transactions.length;
    const averageTransaction = transactionCount > 0 ? totalIncome + totalExpenses / transactionCount : 0;
    const currentBalance = await DatabaseService.getLatestBalance();

    return {
      totalIncome,
      totalExpenses,
      netChange,
      transactionCount,
      averageTransaction,
      largestTransaction,
      currentBalance,
    };
  }

  /**
   * Get cash flow data (daily aggregation)
   */
  static async getCashFlowData(
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<CashFlowData[]> {
    await DatabaseService.initialize();

    const transactions = await DatabaseService.getTransactionsByDateRange(startDate, endDate);

    // Group transactions by date
    const dataMap = new Map<string, { income: number; expenses: number }>();

    for (const tx of transactions) {
      const dateKey = this.getDateKey(tx.timestamp, groupBy);
      
      if (!dataMap.has(dateKey)) {
        dataMap.set(dateKey, { income: 0, expenses: 0 });
      }

      const data = dataMap.get(dateKey)!;

      if (tx.type === TransactionType.RECEIVED || tx.type === TransactionType.DEPOSIT) {
        data.income += tx.amount;
      } else {
        data.expenses += tx.amount + tx.transactionCost;
      }
    }

    // Convert to array and sort
    const cashFlowData: CashFlowData[] = Array.from(dataMap.entries())
      .map(([date, data]) => ({
        date,
        income: data.income,
        expenses: data.expenses,
        net: data.income - data.expenses,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return cashFlowData;
  }

  /**
   * Get top merchants by spending
   */
  static async getTopMerchants(limit: number = 10): Promise<MerchantStats[]> {
    await DatabaseService.initialize();

    const transactions = await DatabaseService.getAllTransactions();

    // Group by merchant/counterparty
    const merchantMap = new Map<string, { totalSpent: number; count: number }>();

    for (const tx of transactions) {
      // Only count expense transactions
      if (tx.type === TransactionType.RECEIVED || tx.type === TransactionType.DEPOSIT) {
        continue;
      }

      const merchant = tx.counterparty || 'Unknown';
      
      if (!merchantMap.has(merchant)) {
        merchantMap.set(merchant, { totalSpent: 0, count: 0 });
      }

      const data = merchantMap.get(merchant)!;
      data.totalSpent += tx.amount + tx.transactionCost;
      data.count++;
    }

    // Convert to array, sort, and limit
    const merchantStats: MerchantStats[] = Array.from(merchantMap.entries())
      .map(([merchant, data]) => ({
        merchant,
        totalSpent: data.totalSpent,
        transactionCount: data.count,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, limit);

    return merchantStats;
  }

  /**
   * Get spending by category
   */
  static async getSpendingByCategory(): Promise<CategoryStats[]> {
    await DatabaseService.initialize();

    const transactions = await DatabaseService.getAllTransactions();

    // Category mapping (simple categorization by transaction type)
    const categoryMap = new Map<string, number>();
    let totalSpending = 0;

    for (const tx of transactions) {
      // Skip income transactions
      if (tx.type === TransactionType.RECEIVED || tx.type === TransactionType.DEPOSIT) {
        continue;
      }

      const category = this.categorizeTransaction(tx);
      const amount = tx.amount + tx.transactionCost;

      categoryMap.set(category, (categoryMap.get(category) || 0) + amount);
      totalSpending += amount;
    }

    // Convert to array with percentages
    const categoryStats: CategoryStats[] = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalSpending > 0 ? (amount / totalSpending) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return categoryStats;
  }

  /**
   * Get recent transactions
   */
  static async getRecentTransactions(limit: number = 10): Promise<Transaction[]> {
    await DatabaseService.initialize();
    return DatabaseService.getTransactions(limit, 0);
  }

  /**
   * Helper: Get date key for grouping
   */
  private static getDateKey(date: Date, groupBy: 'day' | 'week' | 'month'): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    switch (groupBy) {
      case 'day':
        return `${year}-${month}-${day}`;
      case 'week':
        const weekNum = this.getWeekNumber(date);
        return `${year}-W${String(weekNum).padStart(2, '0')}`;
      case 'month':
        return `${year}-${month}`;
      default:
        return `${year}-${month}-${day}`;
    }
  }

  /**
   * Helper: Get ISO week number
   */
  private static getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * Helper: Categorize transaction
   */
  private static categorizeTransaction(tx: Transaction): string {
    switch (tx.type) {
      case TransactionType.SENT:
        return 'Transfers';
      case TransactionType.BUY_GOODS:
      case TransactionType.LIPA_NA_MPESA:
        return 'Shopping';
      case TransactionType.PAY_BILL:
        return 'Bills & Utilities';
      case TransactionType.WITHDRAW:
        return 'Cash Withdrawals';
      case TransactionType.AIRTIME:
        return 'Airtime';
      default:
        return 'Other';
    }
  }
}

export default AnalyticsService;
