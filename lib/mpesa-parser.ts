import { Transaction, TransactionType } from '@/types/transaction';

// ─── Amount helpers ──────────────────────────────────────────────────────────

/** Parse "Ksh5,000.00" or "KES5,000.00" → 5000 */
function parseAmount(raw: string): number {
  return parseFloat(raw.replace(/[Kk][Ss][Hh]|KES|,/g, '').trim()) || 0;
}

/** Extract Ksh amount from a substring pattern */
function extractAmount(pattern: RegExp, body: string): number {
  const m = body.match(pattern);
  return m ? parseAmount(m[1]) : 0;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/**
 * Parse M-Pesa date strings. Known formats:
 *   "24/5/23 at 12:45 PM"
 *   "24/05/2023 at 12:45 PM"
 *   "14/5/23 at 3:30 PM"
 */
function parseMpesaDate(body: string, smsDate?: number): number {
  // Try to extract from message body first
  const match = body.match(
    /(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+at\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i
  );
  if (match) {
    const [, day, month, year, hour, min, meridiem] = match;
    let h = parseInt(hour);
    if (meridiem.toUpperCase() === 'PM' && h !== 12) h += 12;
    if (meridiem.toUpperCase() === 'AM' && h === 12) h = 0;
    const fullYear = year.length === 2 ? 2000 + parseInt(year) : parseInt(year);
    return new Date(fullYear, parseInt(month) - 1, parseInt(day), h, parseInt(min)).getTime();
  }
  return smsDate ?? Date.now();
}

// ─── Ref extraction ───────────────────────────────────────────────────────────

function extractRef(body: string): string {
  // Ref appears at start: capital letters + digits e.g. "QB92J1K0L"
  const m = body.match(/^([A-Z]{2}\d{8}[A-Z0-9]?|[A-Z0-9]{10,12})\s/);
  return m ? m[1] : Math.random().toString(36).substring(2, 12).toUpperCase();
}

function extractBalance(body: string): number | null {
  const m = body.match(/[Nn]ew M-?PESA balance[:\s]+(?:is\s+)?([Kk][Ss][Hh][\d,\.]+)/i);
  return m ? parseAmount(m[1]) : null;
}

function extractCost(body: string): number {
  const m = body.match(/[Tt]ransaction cost[,\s]+([Kk][Ss][Hh][\d,\.]+)/i);
  return m ? parseAmount(m[1]) : 0;
}

// ─── Pattern matchers ─────────────────────────────────────────────────────────

function matchReceived(body: string) {
  // "You have received Ksh5,000.00 from JOHN DOE 0712345678 on ..."
  const m = body.match(
    /[Yy]ou have received\s+(Ksh[\d,\.]+)\s+from\s+(.+?)\s+(\d{10,}|\d{3}[\s-]\d{3,}[\s-]\d{3,})?\s+on\s+/i
  );
  if (m) return { type: 'received' as TransactionType, amount: parseAmount(m[1]), party: m[2].trim(), phone: m[3]?.trim() || null };

  // Variant without phone: "You have received Ksh500.00 from NAME on ..."
  const m2 = body.match(/[Yy]ou have received\s+(Ksh[\d,\.]+)\s+from\s+([A-Z][^0-9]+?)\s+on\s+/i);
  if (m2) return { type: 'received' as TransactionType, amount: parseAmount(m2[1]), party: m2[2].trim(), phone: null };

  return null;
}

function matchSent(body: string) {
  // "Ksh500.00 sent to JANE DOE 0798765432 on ..."
  const m = body.match(
    /(Ksh[\d,\.]+)\s+sent to\s+(.+?)\s+(\d{10,}|\d{3}[\s-]\d{3,}[\s-]\d{3,})?\s+on\s+/i
  );
  if (m) return { type: 'sent' as TransactionType, amount: parseAmount(m[1]), party: m[2].trim(), phone: m[3]?.trim() || null };
  return null;
}

function matchPayment(body: string) {
  // "Ksh250.00 paid to MERCHANT for account ..."
  // "Ksh1,500.00 paid to 123456 for account 987654321 ..."
  const m = body.match(/(Ksh[\d,\.]+)\s+paid to\s+(.+?)\s+(?:for account|on)\s+/i);
  if (m) {
    // Check if it's airtime
    if (/airtime/i.test(body)) {
      return { type: 'airtime' as TransactionType, amount: parseAmount(m[1]), party: m[2].trim(), phone: null };
    }
    return { type: 'payment' as TransactionType, amount: parseAmount(m[1]), party: m[2].trim(), phone: null };
  }
  return null;
}

function matchWithdrawal(body: string) {
  // "Ksh1,000.00 withdrawn from agent 098765 - AGENT NAME on ..."
  const m = body.match(/(Ksh[\d,\.]+)\s+withdrawn from agent\s+\d+\s+-?\s*(.+?)\s+on\s+/i);
  if (m) return { type: 'withdrawal' as TransactionType, amount: parseAmount(m[1]), party: `Agent: ${m[2].trim()}`, phone: null };
  return null;
}

function matchDeposit(body: string) {
  // "You have received Ksh5,000.00 cash from agent ..."
  const m = body.match(/[Yy]ou have received\s+(Ksh[\d,\.]+)\s+cash from agent\s+\d+\s+-?\s*(.+?)\s+on\s+/i);
  if (m) return { type: 'deposit' as TransactionType, amount: parseAmount(m[1]), party: `Agent: ${m[2].trim()}`, phone: null };
  return null;
}

function matchFuliza(body: string) {
  // "You have used Ksh200.00 from Fuliza M-PESA"
  const m = body.match(/[Yy]ou have used\s+(Ksh[\d,\.]+)\s+from Fuliza/i);
  if (m) return { type: 'fuliza' as TransactionType, amount: parseAmount(m[1]), party: 'Fuliza M-PESA', phone: null };
  return null;
}

function matchReversal(body: string) {
  const m = body.match(/[Rr]eversal.*?(Ksh[\d,\.]+)/i);
  if (m) return { type: 'reversal' as TransactionType, amount: parseAmount(m[1]), party: 'M-PESA Reversal', phone: null };
  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface RawSms {
  id: string;
  address: string;   // sender number/name
  body: string;
  date: number;      // unix timestamp ms
}

export function isMpesaSms(sms: RawSms): boolean {
  return /MPESA|M-PESA/i.test(sms.address) || /M-PESA|MPESA/i.test(sms.body.substring(0, 20));
}

export function parseMpesaSms(sms: RawSms): Transaction | null {
  const body = sms.body.trim();

  // Must contain "Confirmed" to be a transaction notification
  if (!/confirmed/i.test(body)) return null;

  const ref = extractRef(body);
  const date = parseMpesaDate(body, sms.date);
  const balance = extractBalance(body);
  const cost = extractCost(body);

  // Try each pattern (order matters: deposit before received, airtime before payment)
  const matched =
    matchDeposit(body) ||
    matchReceived(body) ||
    matchWithdrawal(body) ||
    matchFuliza(body) ||
    matchReversal(body) ||
    matchPayment(body) ||
    matchSent(body);

  if (!matched) return null;

  return {
    id: `${ref}-${date}`,
    ref,
    type: matched.type,
    amount: matched.amount,
    balance,
    party: matched.party,
    phone: matched.phone ?? null,
    date,
    cost,
    category: null,
    rawMessage: body,
  };
}

/** Parse a batch of raw SMS, returning only successfully parsed M-Pesa transactions */
export function parseMpesaBatch(smsList: RawSms[]): {
  parsed: Transaction[];
  failed: number;
} {
  let failed = 0;
  const parsed: Transaction[] = [];
  const seen = new Set<string>();

  for (const sms of smsList) {
    if (!isMpesaSms(sms)) continue;
    const tx = parseMpesaSms(sms);
    if (!tx) { failed++; continue; }
    if (seen.has(tx.id)) continue; // dedup
    seen.add(tx.id);
    parsed.push(tx);
  }

  return { parsed, failed };
}
