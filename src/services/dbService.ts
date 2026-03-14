import { open, type DB } from '@op-engineering/op-sqlite';
import { Transaction, ParsedTransaction, SyncState } from '../types';
import { MPesaParser } from './parserService';

export class DatabaseService {
  private static db: DB | null = null;
  private static readonly DB_NAME = 'mpesa_analytics.db';

  static async initialize(): Promise<void> {
    if (this.db) {
      console.log('Database already initialized');
      return;
    }

    try {
      this.db = open({ name: this.DB_NAME });
      await this.createTables();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private static async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.executeAsync(`
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

    await this.db.executeAsync(
      `CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);`
    );
    await this.db.executeAsync(
      `CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);`
    );
    await this.db.executeAsync(
      `CREATE INDEX IF NOT EXISTS idx_transactions_counterparty ON transactions(counterparty);`
    );

    await this.db.executeAsync(`
      CREATE TABLE IF NOT EXISTS sync_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        last_sync INTEGER,
        total_transactions INTEGER DEFAULT 0,
        balance REAL DEFAULT 0
      );
    `);

    await this.db.executeAsync(`
      INSERT OR IGNORE INTO sync_state (id, total_transactions, balance)
      VALUES (1, 0, 0);
    `);

    console.log('Database tables created');
  }

  static async insertTransaction(transaction: ParsedTransaction): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const id = MPesaParser.generateTransactionId(transaction);

    const existing = await this.db.executeAsync(
      'SELECT id FROM transactions WHERE id = ?',
      [id]
    );

    if (existing.rows._array.length > 0) {
      console.log(`Transaction ${id} already exists, skipping`);
      return id;
    }

    await this.db.executeAsync(
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
        transaction.counterparty ?? null,
        transaction.phone ?? null,
        transaction.account ?? null,
        transaction.reference ?? null,
        transaction.timestamp.getTime(),
        transaction.rawMessage,
      ]
    );

    await this.updateSyncState();

    console.log(`Transaction ${id} inserted`);
    return id;
  }

  static async insertTransactions(transactions: ParsedTransaction[]): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    let inserted = 0;

    await this.db.transactionAsync(async (tx) => {
      for (const transaction of transactions) {
        try {
          const id = MPesaParser.generateTransactionId(transaction);

          const existing = await tx.executeAsync(
            'SELECT id FROM transactions WHERE id = ?',
            [id]
          );
          if (existing.rows._array.length > 0) continue;

          await tx.executeAsync(
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
              transaction.counterparty ?? null,
              transaction.phone ?? null,
              transaction.account ?? null,
              transaction.reference ?? null,
              transaction.timestamp.getTime(),
              transaction.rawMessage,
            ]
          );
          inserted++;
        } catch (error) {
          console.error('Failed to insert transaction:', error);
        }
      }
    });

    await this.updateSyncState();

    console.log(`Bulk inserted ${inserted}/${transactions.length} transactions`);
    return inserted;
  }

  static async getAllTransactions(): Promise<Transaction[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.executeAsync(
      'SELECT * FROM transactions ORDER BY timestamp DESC'
    );

    return result.rows._array.map(this.rowToTransaction);
  }

  static async getTransactions(
    limit: number = 50,
    offset: number = 0
  ): Promise<Transaction[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.executeAsync(
      'SELECT * FROM transactions ORDER BY timestamp DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    return result.rows._array.map(this.rowToTransaction);
  }

  static async getTransactionsByType(type: string): Promise<Transaction[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.executeAsync(
      'SELECT * FROM transactions WHERE type = ? ORDER BY timestamp DESC',
      [type]
    );

    return result.rows._array.map(this.rowToTransaction);
  }

  static async getTransactionsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<Transaction[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.executeAsync(
      'SELECT * FROM transactions WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC',
      [startDate.getTime(), endDate.getTime()]
    );

    return result.rows._array.map(this.rowToTransaction);
  }

  static async searchTransactions(query: string): Promise<Transaction[]> {
    if (!this.db) throw new Error('Database not initialized');

    const searchQuery = `%${query}%`;
    const result = await this.db.executeAsync(
      `SELECT * FROM transactions
       WHERE counterparty LIKE ?
          OR phone LIKE ?
          OR account LIKE ?
          OR reference LIKE ?
       ORDER BY timestamp DESC`,
      [searchQuery, searchQuery, searchQuery, searchQuery]
    );

    return result.rows._array.map(this.rowToTransaction);
  }

  static async getTransactionCount(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.executeAsync(
      'SELECT COUNT(*) as count FROM transactions'
    );

    return result.rows._array[0]?.count ?? 0;
  }

  static async getLatestBalance(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.executeAsync(
      'SELECT balance FROM transactions ORDER BY timestamp DESC LIMIT 1'
    );

    return result.rows._array[0]?.balance ?? 0;
  }

  static async getSyncState(): Promise<SyncState> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.executeAsync(
      'SELECT * FROM sync_state WHERE id = 1'
    );

    if (result.rows._array.length === 0) {
      return { totalTransactions: 0, balance: 0 };
    }

    const row = result.rows._array[0];
    return {
      lastSync: row.last_sync ? new Date(row.last_sync * 1000) : undefined,
      totalTransactions: row.total_transactions,
      balance: row.balance,
    };
  }

  private static async updateSyncState(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const count = await this.getTransactionCount();
    const balance = await this.getLatestBalance();
    const now = Math.floor(Date.now() / 1000);

    await this.db.executeAsync(
      'UPDATE sync_state SET last_sync = ?, total_transactions = ?, balance = ? WHERE id = 1',
      [now, count, balance]
    );
  }

  static async deleteAllTransactions(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.executeAsync('DELETE FROM transactions');
    await this.db.executeAsync(
      'UPDATE sync_state SET last_sync = NULL, total_transactions = 0, balance = 0 WHERE id = 1'
    );

    console.log('All transactions deleted');
  }

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

  static close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('Database connection closed');
    }
  }
}

export default DatabaseService;
