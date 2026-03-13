import * as SQLite from 'expo-sqlite';
import { Transaction, ParsedTransaction, SyncState } from '../types';
import { MPesaParser } from './parserService';

/**
 * Database Service
 * 
 * Handles all SQLite operations:
 * - Initialize database schema
 * - CRUD operations for transactions
 * - Transaction deduplication
 * - Analytics queries
 */

export class DatabaseService {
  private static db: SQLite.SQLiteDatabase | null = null;
  private static readonly DB_NAME = 'mpesa_analytics.db';

  /**
   * Initialize database connection and create tables
   */
  static async initialize(): Promise<void> {
    if (this.db) {
      console.log('Database already initialized');
      return;
    }

    try {
      this.db = await SQLite.openDatabaseAsync(this.DB_NAME);
      await this.createTables();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Create database tables
   */
  private static async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Transactions table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        transaction_cost REAL NOT NULL DEFAULT 0,
        balance REAL NOT NULL,
        counterparty TEXT,
        phone TEXT,
        account TEXT,
        reference TEXT,
        timestamp INTEGER NOT NULL,
        raw_message TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);

    // Indexes for performance
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
      CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);
      CREATE INDEX IF NOT EXISTS idx_transactions_counterparty ON transactions(counterparty);
    `);

    // Sync state table (single row)
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        last_sync INTEGER,
        total_transactions INTEGER DEFAULT 0,
        balance REAL DEFAULT 0
      );
    `);

    // Initialize sync state if not exists
    await this.db.execAsync(`
      INSERT OR IGNORE INTO sync_state (id, total_transactions, balance) 
      VALUES (1, 0, 0);
    `);

    console.log('Database tables created');
  }

  /**
   * Insert a transaction (with deduplication)
   */
  static async insertTransaction(transaction: ParsedTransaction): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const id = MPesaParser.generateTransactionId(transaction);

    // Check if transaction already exists
    const existing = await this.db.getFirstAsync<{ id: string }>(
      'SELECT id FROM transactions WHERE id = ?',
      [id]
    );

    if (existing) {
      console.log(`Transaction ${id} already exists, skipping`);
      return id;
    }

    // Insert new transaction
    await this.db.runAsync(
      `INSERT INTO transactions (
        id, type, amount, transaction_cost, balance,
        counterparty, phone, account, reference, timestamp, raw_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        transaction.type,
        transaction.amount,
        transaction.transactionCost,
        transaction.balance,
        transaction.counterparty || null,
        transaction.phone || null,
        transaction.account || null,
        transaction.reference || null,
        transaction.timestamp.getTime(),
        transaction.rawMessage,
      ]
    );

    // Update sync state
    await this.updateSyncState();

    console.log(`Transaction ${id} inserted`);
    return id;
  }

  /**
   * Bulk insert transactions (optimized)
   */
  static async insertTransactions(transactions: ParsedTransaction[]): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    let inserted = 0;

    // Use transaction for better performance
    await this.db.withTransactionAsync(async () => {
      for (const transaction of transactions) {
        try {
          await this.insertTransaction(transaction);
          inserted++;
        } catch (error) {
          console.error('Failed to insert transaction:', error);
          // Continue with next transaction
        }
      }
    });

    console.log(`Bulk inserted ${inserted}/${transactions.length} transactions`);
    return inserted;
  }

  /**
   * Get all transactions
   */
  static async getAllTransactions(): Promise<Transaction[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM transactions ORDER BY timestamp DESC'
    );

    return rows.map(this.rowToTransaction);
  }

  /**
   * Get transactions with pagination
   */
  static async getTransactions(
    limit: number = 50,
    offset: number = 0
  ): Promise<Transaction[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM transactions ORDER BY timestamp DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    return rows.map(this.rowToTransaction);
  }

  /**
   * Get transactions by type
   */
  static async getTransactionsByType(type: string): Promise<Transaction[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM transactions WHERE type = ? ORDER BY timestamp DESC',
      [type]
    );

    return rows.map(this.rowToTransaction);
  }

  /**
   * Get transactions within date range
   */
  static async getTransactionsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<Transaction[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM transactions WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC',
      [startDate.getTime(), endDate.getTime()]
    );

    return rows.map(this.rowToTransaction);
  }

  /**
   * Search transactions
   */
  static async searchTransactions(query: string): Promise<Transaction[]> {
    if (!this.db) throw new Error('Database not initialized');

    const searchQuery = `%${query}%`;
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM transactions 
       WHERE counterparty LIKE ? 
          OR phone LIKE ? 
          OR account LIKE ?
          OR reference LIKE ?
       ORDER BY timestamp DESC`,
      [searchQuery, searchQuery, searchQuery, searchQuery]
    );

    return rows.map(this.rowToTransaction);
  }

  /**
   * Get transaction count
   */
  static async getTransactionCount(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM transactions'
    );

    return result?.count || 0;
  }

  /**
   * Get latest balance
   */
  static async getLatestBalance(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<{ balance: number }>(
      'SELECT balance FROM transactions ORDER BY timestamp DESC LIMIT 1'
    );

    return result?.balance || 0;
  }

  /**
   * Get sync state
   */
  static async getSyncState(): Promise<SyncState> {
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.getFirstAsync<any>(
      'SELECT * FROM sync_state WHERE id = 1'
    );

    if (!row) {
      return {
        totalTransactions: 0,
        balance: 0,
      };
    }

    return {
      lastSync: row.last_sync ? new Date(row.last_sync * 1000) : undefined,
      totalTransactions: row.total_transactions,
      balance: row.balance,
    };
  }

  /**
   * Update sync state
   */
  private static async updateSyncState(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const count = await this.getTransactionCount();
    const balance = await this.getLatestBalance();
    const now = Math.floor(Date.now() / 1000);

    await this.db.runAsync(
      'UPDATE sync_state SET last_sync = ?, total_transactions = ?, balance = ? WHERE id = 1',
      [now, count, balance]
    );
  }

  /**
   * Delete all transactions (reset database)
   */
  static async deleteAllTransactions(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync('DELETE FROM transactions');
    await this.db.runAsync(
      'UPDATE sync_state SET last_sync = NULL, total_transactions = 0, balance = 0 WHERE id = 1'
    );

    console.log('All transactions deleted');
  }

  /**
   * Convert database row to Transaction object
   */
  private static rowToTransaction(row: any): Transaction {
    return {
      id: row.id,
      type: row.type,
      amount: row.amount,
      transactionCost: row.transaction_cost,
      balance: row.balance,
      counterparty: row.counterparty,
      phone: row.phone,
      account: row.account,
      reference: row.reference,
      timestamp: new Date(row.timestamp),
      rawMessage: row.raw_message,
      createdAt: new Date(row.created_at * 1000),
      updatedAt: new Date(row.updated_at * 1000),
    };
  }

  /**
   * Close database connection
   */
  static async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      console.log('Database connection closed');
    }
  }
}

export default DatabaseService;
