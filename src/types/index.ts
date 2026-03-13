// Transaction Types
export enum TransactionType {
  RECEIVED = 'received',
  SENT = 'sent',
  BUY_GOODS = 'buy_goods',
  PAY_BILL = 'pay_bill',
  WITHDRAW = 'withdraw',
  DEPOSIT = 'deposit',
  AIRTIME = 'airtime',
  LIPA_NA_MPESA = 'lipa_na_mpesa',
  UNKNOWN = 'unknown',
}

export interface Transaction {
  id: string; // Generated from message or transaction ref
  type: TransactionType;
  amount: number;
  transactionCost: number;
  balance: number;
  counterparty?: string; // Person/merchant name
  phone?: string; // Phone number (for P2P)
  account?: string; // Paybill account number
  reference?: string; // Transaction reference (M-PESA ref)
  timestamp: Date;
  rawMessage: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParsedTransaction extends Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> {
  // Parsed data before DB insertion
}

export interface Merchant {
  id: number;
  name: string;
  displayName: string;
  category?: string;
  phone?: string;
  paybill?: string;
  tillNumber?: string;
  totalSpent: number;
  transactionCount: number;
  firstSeen: Date;
  lastSeen: Date;
}

export interface Category {
  id: number;
  transactionId: string;
  category: string;
  confidence: number;
}

export interface SyncState {
  lastSync?: Date;
  totalTransactions: number;
  balance: number;
}

// Analytics Types
export interface CashFlowData {
  date: string;
  income: number;
  expenses: number;
  net: number;
}

export interface TransactionStats {
  totalIncome: number;
  totalExpenses: number;
  netChange: number;
  transactionCount: number;
  averageTransaction: number;
  largestTransaction: number;
  currentBalance: number;
}

export interface MerchantStats {
  merchant: string;
  totalSpent: number;
  transactionCount: number;
  category?: string;
}

export interface CategoryStats {
  category: string;
  amount: number;
  percentage: number;
}

// SMS Message
export interface SMSMessage {
  id: string;
  address: string; // Sender (e.g., "MPESA")
  body: string;
  date: number; // Unix timestamp
}
