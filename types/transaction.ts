export type TransactionType =
  | 'received'     // money in from a person
  | 'sent'         // money out to a person
  | 'payment'      // paid to a business / till / paybill
  | 'withdrawal'   // withdrawn at an agent
  | 'deposit'      // deposited at an agent
  | 'airtime'      // airtime purchase
  | 'fuliza'       // Fuliza overdraft usage
  | 'reversal'     // reversed transaction
  | 'unknown';

export interface Transaction {
  id: string;
  ref: string;
  type: TransactionType;
  amount: number;
  balance: number | null;
  party: string;         // merchant / person name
  phone: string | null;  // phone number if P2P
  date: number;          // unix timestamp ms
  cost: number;          // transaction fee
  category: string | null;
  rawMessage: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  budget: number;
  keywords: string[];    // auto-categorize keywords
}

export interface BudgetSummary extends Category {
  spent: number;
  transactionCount: number;
}

export interface AnalyticsSummary {
  totalReceived: number;
  totalSent: number;
  totalFees: number;
  netBalance: number;
  transactionCount: number;
  period: { start: number; end: number };
}

export interface DailySpend {
  date: number;           // unix timestamp ms (start of day)
  label: string;
  amount: number;
}

export interface SyncResult {
  total: number;          // total SMS found
  imported: number;       // newly imported
  skipped: number;        // already in DB
  failed: number;         // parse failures
}


export type RawSms = {
  id: string;
  address: string;
  body: string;
  date: number;
};