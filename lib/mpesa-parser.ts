import { Transaction } from '@/types/transaction';
import { classify, fallbackParse, matchGrammar } from './mpesa-grammar';

// ─── Constants ────────────────────────────────────────────────────────────────

const DATE_RE = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+at\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const extractBalance = (body: string): number | null => {
  const match = body.match(/balance[:\s]+(?:is\s+)?Ksh\s?([\d,]+\.?\d*)/i);
  return match ? parseFloat(match[1].replace(/[^\d.]/g, '')) : null;
};

const extractCost = (body: string): number => {
  const match = body.match(/transaction cost[,\s]+Ksh\s?([\d,]+\.?\d*)/i);
  return match ? parseFloat(match[1].replace(/[^\d.]/g, '')) : 0;
};

// ─── Date Parsing ─────────────────────────────────────────────────────────────

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

// ─── Main Export ──────────────────────────────────────────────────────────────

export function parseMpesaSms(sms: { body: string; date: number }): Transaction | null {
  const body = sms.body.trim();
  if (!/confirmed/i.test(body)) return null;

  const refMatch = body.match(/^([A-Z0-9]{10,12})\s/);
  const ref = refMatch ? refMatch[1] : `ERR-${Date.now()}`;

  // Stage 1: Grammar match (structural parse)
  let matched = matchGrammar(body);

  // Stage 2: Semantic classification (airtime, reversal, etc.)
  if (matched) matched = classify(matched, body);

  // Stage 3: Partial fallback — extract what we can rather than dropping the message
  if (!matched) {
    const partial = fallbackParse(body);
    if (!partial) return null;
    matched = {
      type: partial.type ?? 'unknown',
      amount: partial.amount ?? 0,
      party: partial.party ?? 'Unknown',
      phone: partial.phone ?? null,
    };
  }

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
  failedMessages: { body: string; date: number }[];
} {
  const parsed: Transaction[] = [];
  const failedMessages: { body: string; date: number }[] = [];
  let failed = 0;

  for (const sms of batch) {
    try {
      const tx = parseMpesaSms(sms);
      if (tx) {
        parsed.push(tx);
      } else {
        failedMessages.push(sms);
        failed++;
      }
    } catch (e) {
      console.warn('[PARSER_ERROR]', e, 'SMS:', sms);
      failedMessages.push(sms);
      failed++;
    }
  }

  return { parsed, failed, failedMessages };
}
