import * as SQLite from 'expo-sqlite';
import { Transaction, Category } from '@/types/transaction';

let _db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!_db) {
    _db = await SQLite.openDatabaseAsync('mpesa.db');
    await migrate(_db);
  }
  return _db;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

async function migrate(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS transactions (
      id          TEXT PRIMARY KEY,
      ref         TEXT,
      type        TEXT NOT NULL,
      amount      REAL NOT NULL,
      balance     REAL,
      party       TEXT,
      phone       TEXT,
      date        INTEGER NOT NULL,
      cost        REAL DEFAULT 0,
      category    TEXT,
      raw_message TEXT,
      created_at  INTEGER DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE INDEX IF NOT EXISTS idx_tx_date     ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_tx_type     ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category);

    CREATE TABLE IF NOT EXISTS categories (
      id       TEXT PRIMARY KEY,
      name     TEXT UNIQUE NOT NULL,
      icon     TEXT DEFAULT 'label',
      color    TEXT DEFAULT '#006b13',
      budget   REAL DEFAULT 0,
      keywords TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS sync_log (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      synced_at  INTEGER,
      imported   INTEGER,
      skipped    INTEGER,
      failed     INTEGER
    );
  `);

  await seedDefaultCategories(db);
}

async function seedDefaultCategories(db: SQLite.SQLiteDatabase) {
  const existing = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories'
  );
  if ((existing?.count ?? 0) > 0) return;

  const defaults: Omit<Category, 'id'>[] = [
    { name: 'Groceries',     icon: 'local-grocery-store', color: '#006b13', budget: 25000, keywords: ['NAIVAS','CARREFOUR','QUICKMART','CLEANSHELF','UCHUMI','FOOD','SUPERMARKET','MARKET'] },
    { name: 'Transport',     icon: 'directions-car',      color: '#006190', budget: 12000, keywords: ['UBER','BOLT','MATATU','FUEL','PETROL','KENYA BUS','NTSA'] },
    { name: 'Utility Bills', icon: 'bolt',                color: '#e67e22', budget: 15000, keywords: ['KPLC','SAFARICOM','ZUKU','AIRTEL','TELKOM','NAIROBI WATER','NHIF','NSSF'] },
    { name: 'Food & Dining', icon: 'restaurant',          color: '#8e44ad', budget: 10000, keywords: ['JAVA','ARTCAFE','KFC','PIZZA','CHICKEN','RESTAURANT','CAFE','HOTEL','FOOD'] },
    { name: 'Healthcare',    icon: 'local-hospital',      color: '#c0392b', budget: 5000,  keywords: ['PHARMACY','HOSPITAL','CLINIC','DOCTOR','CHEMIST','MEDICAL'] },
    { name: 'Education',     icon: 'school',              color: '#2980b9', budget: 8000,  keywords: ['SCHOOL','COLLEGE','UNIVERSITY','TUITION','FEES','LIBRARY'] },
    { name: 'Savings',       icon: 'savings',             color: '#27ae60', budget: 20000, keywords: ['SACCO','MSHWARI','KCB MPESA','STANCHART','EQUITY','KCB','COOP'] },
    { name: 'Lifestyle',     icon: 'theater-comedy',      color: '#674ba4', budget: 10000, keywords: ['NETFLIX','SHOWMAX','DSTV','GYM','SALON','SPA','CINEMA'] },
  ];

  await db.withTransactionAsync(async () => {
    for (const cat of defaults) {
      await db.runAsync(
        `INSERT OR IGNORE INTO categories (id, name, icon, color, budget, keywords) VALUES (?, ?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), cat.name, cat.icon, cat.color, cat.budget, JSON.stringify(cat.keywords)]
      );
    }
  });
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function insertTransactions(txs: Transaction[]): Promise<{ imported: number; skipped: number }> {
  const db = await getDb();
  let imported = 0;
  let skipped = 0;

  await db.withTransactionAsync(async () => {
    for (const tx of txs) {
      const existing = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM transactions WHERE id = ? OR ref = ?',
        [tx.id, tx.ref]
      );
      if (existing) { skipped++; continue; }

      await db.runAsync(
        `INSERT INTO transactions (id, ref, type, amount, balance, party, phone, date, cost, category, raw_message)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tx.id, tx.ref, tx.type, tx.amount, tx.balance, tx.party, tx.phone, tx.date, tx.cost, tx.category, tx.rawMessage]
      );
      imported++;
    }
  });

  return { imported, skipped };
}

export async function getTransactions(opts: {
  limit?: number;
  offset?: number;
  type?: string;
  category?: string;
  from?: number;
  to?: number;
} = {}): Promise<Transaction[]> {
  const db = await getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (opts.type)     { conditions.push('type = ?');     params.push(opts.type); }
  if (opts.category) { conditions.push('category = ?'); params.push(opts.category); }
  if (opts.from)     { conditions.push('date >= ?');    params.push(opts.from); }
  if (opts.to)       { conditions.push('date <= ?');    params.push(opts.to); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit  = opts.limit  ? `LIMIT ${opts.limit}`   : 'LIMIT 200';
  const offset = opts.offset ? `OFFSET ${opts.offset}` : '';

  const rows = await db.getAllAsync<Transaction>(
    `SELECT id, ref, type, amount, balance, party, phone, date, cost, category, raw_message as rawMessage
     FROM transactions ${where} ORDER BY date DESC ${limit} ${offset}`,
    params
  );
  return rows;
}

export async function updateCategory(txId: string, category: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE transactions SET category = ? WHERE id = ?', [category, txId]);
}

export async function getUncategorized(): Promise<Transaction[]> {
  const db = await getDb();
  return db.getAllAsync<Transaction>(
    `SELECT id, ref, type, amount, balance, party, phone, date, cost, category, raw_message as rawMessage
     FROM transactions WHERE category IS NULL ORDER BY date DESC LIMIT 50`
  );
}

export async function getTransactionCount(): Promise<number> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM transactions');
  return r?.c ?? 0;
}

export async function clearAllTransactions(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM transactions');
  await db.runAsync('DELETE FROM sync_log');
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string; name: string; icon: string; color: string; budget: number; keywords: string }>(
    'SELECT * FROM categories ORDER BY name'
  );
  return rows.map((r) => ({ ...r, keywords: JSON.parse(r.keywords || '[]') }));
}

export async function upsertCategory(cat: Category): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO categories (id, name, icon, color, budget, keywords)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET icon=excluded.icon, color=excluded.color, budget=excluded.budget, keywords=excluded.keywords`,
    [cat.id, cat.name, cat.icon, cat.color, cat.budget, JSON.stringify(cat.keywords)]
  );
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
}

// ─── Auto-categorize ──────────────────────────────────────────────────────────

export async function autoCategorizePending(): Promise<number> {
  const db = await getDb();
  const categories = await getCategories();
  const uncategorized = await getUncategorized();
  let count = 0;

  for (const tx of uncategorized) {
    const party = tx.party.toUpperCase();
    for (const cat of categories) {
      if (cat.keywords.some((kw) => party.includes(kw.toUpperCase()))) {
        await db.runAsync('UPDATE transactions SET category = ? WHERE id = ?', [cat.name, tx.id]);
        count++;
        break;
      }
    }
  }
  return count;
}

// ─── Sync log ─────────────────────────────────────────────────────────────────

export async function logSync(imported: number, skipped: number, failed: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO sync_log (synced_at, imported, skipped, failed) VALUES (?, ?, ?, ?)',
    [Date.now(), imported, skipped, failed]
  );
}

export async function getLastSync(): Promise<number | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ synced_at: number }>(
    'SELECT synced_at FROM sync_log ORDER BY id DESC LIMIT 1'
  );
  return r?.synced_at ?? null;
}
