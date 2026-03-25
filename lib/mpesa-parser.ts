import { Transaction, TransactionType } from '@/types/transaction';

// ─── Constants & Regex Fragments ─────────────────────────────────────────────

const CURRENCY_RE = /(?:Ksh|KES|Ksh\.)\s?([\d,]+\.?\d*)/i;
const PHONE_RE = /(\d{10,}|\d{3}[\s-]\d{3,}[\s-]\d{3,})/;
const DATE_RE = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+at\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i;

// ─── Types ───────────────────────────────────────────────────────────────────

interface MatchResult {
  type: TransactionType;
  amount: number;
  party: string;
  phone?: string | null;
}

interface ParserRule {
  name: string;
  regex: RegExp;
  transform: (match: RegExpMatchArray) => MatchResult;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sanitizeAmount = (raw: string): number =>
  parseFloat(raw.replace(/[^\d.]/g, '')) || 0;

const extractBalance = (body: string): number | null => {
  const match = body.match(/balance[:\s]+(?:is\s+)?Ksh\s?([\d,]+\.?\d*)/i);
  return match ? sanitizeAmount(match[1]) : null;
};

const extractCost = (body: string): number => {
  const match = body.match(/transaction cost[,\s]+Ksh\s?([\d,]+\.?\d*)/i);
  return match ? sanitizeAmount(match[1]) : 0;
};

// ─── Rules Definition ────────────────────────────────────────────────────────

const rules: ParserRule[] = [
  {
    name: 'deposit',
    regex: /received\s+Ksh\s?([\d,.]+)\s+cash from agent\s+\d+\s+-?\s*(.+?)\s+on/i,
    transform: ([_, amt, agent]) => ({
      type: 'deposit',
      amount: sanitizeAmount(amt),
      party: `Agent: ${agent.trim()}`,
    }),
  },
  {
    name: 'sent',
    regex: /Ksh\s?([\d,.]+)\s+sent to\s+(.+?)\s+(\d{10,})?\s*on/i,
    transform: ([_, amt, name, phone]) => ({
      type: 'sent',
      amount: sanitizeAmount(amt),
      party: name.trim(),
      phone: phone?.trim(),
    }),
  },
  {
    name: 'received',
    regex: /received\s+Ksh\s?([\d,.]+)\s+from\s+(.+?)\s+(\d{10,})?\s*on/i,
    transform: ([_, amt, name, phone]) => ({
      type: 'received',
      amount: sanitizeAmount(amt),
      party: name.trim(),
      phone: phone?.trim(),
    }),
  },
  {
    name: 'payment',
    regex: /Ksh\s?([\d,.]+)\s+paid to\s+(.+?)\s+(?:for account|on)/i,
    transform: (m) => ({
      type: /airtime/i.test(m.input || '') ? 'airtime' : 'payment',
      amount: sanitizeAmount(m[1]),
      party: m[2].trim(),
    }),
  },
  {
    name: 'withdrawal',
    regex: /Ksh\s?([\d,.]+)\s+withdrawn from agent\s+\d+\s+-?\s*(.+?)\s+on/i,
    transform: ([_, amt, agent]) => ({
      type: 'withdrawal',
      amount: sanitizeAmount(amt),
      party: `Agent: ${agent.trim()}`,
    }),
  },
  {
    name: 'fuliza',
    regex: /used\s+Ksh\s?([\d,.]+)\s+from Fuliza/i,
    transform: ([_, amt]) => ({
      type: 'fuliza',
      amount: sanitizeAmount(amt),
      party: 'Fuliza M-PESA',
    }),
  },
  {
    name: 'mshwari_deposit',
    // Example: "Ksh500.00 transferred from M-PESA to M-Shwari account on..."
    regex: /Ksh\s?([\d,.]+)\s+transferred from M-PESA to M-Shwari/i,
    transform: ([_, amt]) => ({
      type: 'mshwari_deposit' as TransactionType,
      amount: sanitizeAmount(amt),
      party: 'M-Shwari Savings',
    }),
  },
  {
    name: 'mshwari_withdraw',
    // Example: "Ksh1,000.00 transferred from M-Shwari to M-PESA on..."
    regex: /Ksh\s?([\d,.]+)\s+transferred from M-Shwari to M-PESA/i,
    transform: ([_, amt]) => ({
      type: 'mshwari_withdrawal' as TransactionType,
      amount: sanitizeAmount(amt),
      party: 'M-Shwari Savings',
    }),
  },
  {
    name: 'pochi_payment',
    // Example: "Ksh200.00 paid to Pochi La Biashara - 0712345678 on..."
    regex: /Ksh\s?([\d,.]+)\s+paid to Pochi La Biashara\s*-\s*(.+?)\s+on/i,
    transform: ([_, amt, party]) => ({
      type: 'payment',
      amount: sanitizeAmount(amt),
      party: `Pochi: ${party.trim()}`,
      // Pochi messages often include the phone number directly in the party string
      phone: party.match(/\d{10,}/)?.[0] || null,
    }),
  },
  {
    name: 'merchant_payment',
    // For Buy Goods/Till Numbers: "Ksh150.00 paid to SHOP NAME. Buy Goods Till No. 123456"
    regex: /Ksh\s?([\d,.]+)\s+paid to\s+(.+?)\.\s+Buy Goods Till No\.\s+(\d+)/i,
    transform: ([_, amt, name, till]) => ({
      type: 'payment',
      amount: sanitizeAmount(amt),
      party: `${name.trim()} (Till: ${till})`,
    }),
  }
];

// ─── Core Logic ──────────────────────────────────────────────────────────────

function parseMpesaDate(body: string, fallback: number): number {
  const match = body.match(DATE_RE);
  if (!match) return fallback;

  const [_, d, m, y, hr, min, meridiem] = match;
  let hour = parseInt(hr);
  if (meridiem.toUpperCase() === 'PM' && hour !== 12) hour += 12;
  if (meridiem.toUpperCase() === 'AM' && hour === 12) hour = 0;

  const year = y.length === 2 ? 2000 + parseInt(y) : parseInt(y);
  return new Date(year, parseInt(m) - 1, parseInt(d), hour, parseInt(min)).getTime();
}

/// Main export: Parses an SMS body into a Transaction object or returns null if it doesn't match
export function parseMpesaSms(sms: { body: string; date: number }): Transaction | null {
  const body = sms.body.trim();
  if (!/confirmed/i.test(body)) return null;

  // 1. Identify Reference (Safe Fallback)
  const refMatch = body.match(/^([A-Z0-9]{10,12})\s/);
  const ref = refMatch ? refMatch[1] : `ERR-${Date.now()}`;

  // 2. Iterate through rules (Stop on first match)
  let matched: MatchResult | null = null;
  for (const rule of rules) {
    const match = body.match(rule.regex);
    if (match) {
      matched = rule.transform(match);
      break;
    }
  }

  if (!matched) return null;

  const date = parseMpesaDate(body, sms.date);

  return {
    id: `${ref}-${date}`,
    ref,
    type: matched.type,
    amount: matched.amount,
    balance: extractBalance(body),
    party: matched.party,
    phone: matched.phone ?? null,
    date,
    cost: extractCost(body),
    category: null,
    rawMessage: body,
  };
}


export function parseMpesaBatch(batch: { body: string; date: number }[]): {
  parsed: Transaction[];
  failed: number;
} {
  const parsed: Transaction[] = [];
  let failed = 0;

  for (const sms of batch) {
    try {
      const tx = parseMpesaSms(sms);
      if (tx) parsed.push(tx);
    } catch (e) {
      console.warn('[PARSER_ERROR]', e, 'SMS:', sms);
      failed++;
    }
  }

  return { parsed, failed };
}