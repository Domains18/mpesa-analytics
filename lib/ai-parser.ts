import { Transaction, TransactionType } from '@/types/transaction';
import { getApiKey, isAiParserEnabled } from '@/lib/ai-config';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AiParsedTransaction {
  ref: string;
  type: TransactionType;
  amount: number;
  balance: number | null;
  party: string;
  phone: string | null;
  date: string; // ISO 8601 from the AI, converted to timestamp
  cost: number;
}

interface SmsBatchItem {
  index: number;
  body: string;
  date: number;
}

const VALID_TYPES: TransactionType[] = [
  'received', 'sent', 'payment', 'withdrawal', 'deposit',
  'airtime', 'fuliza', 'reversal', 'unknown',
];

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_BATCH = 20; // Max SMS per API call to stay within token limits

// ─── System Prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an M-Pesa SMS transaction parser. You extract structured transaction data from Safaricom M-Pesa confirmation SMS messages.

M-Pesa messages come in many formats that change over time. Common transaction types:
- **received**: Money received from a person (e.g., "You have received Ksh1,000.00 from JOHN DOE 0712345678")
- **sent**: Money sent to a person (e.g., "Ksh500.00 sent to JANE DOE 0798765432")
- **payment**: Payment to a business/paybill/till (e.g., "Ksh150.00 paid to SHOP NAME")
- **withdrawal**: Cash withdrawn at agent (e.g., "Ksh2,000.00 withdrawn from agent 12345 - AGENT NAME")
- **deposit**: Cash deposited at agent (e.g., "You have received Ksh5,000.00 cash from agent 67890 - AGENT NAME")
- **airtime**: Airtime purchase (e.g., "Ksh100.00 paid to Airtime" or airtime-related payments)
- **fuliza**: Fuliza overdraft usage (e.g., "used Ksh300.00 from Fuliza M-PESA")
- **reversal**: Transaction reversal
- **unknown**: If you cannot determine the type

For each SMS, extract:
- **ref**: The M-Pesa transaction reference code (usually 10-12 alphanumeric chars at the start)
- **type**: One of: received, sent, payment, withdrawal, deposit, airtime, fuliza, reversal, unknown
- **amount**: The transaction amount in KES (numeric, no currency symbol)
- **balance**: The M-Pesa balance after transaction (null if not mentioned)
- **party**: The counterparty name (merchant, person, agent). Include agent number if present
- **phone**: Phone number of the counterparty (null if not present)
- **date**: The transaction date/time from the SMS in ISO 8601 format (e.g., "2024-03-15T14:30:00")
- **cost**: Transaction fee/cost in KES (0 if not mentioned)

Respond with a JSON array matching the input indices. If a message cannot be parsed at all, return null for that index.`;

// ─── Core ────────────────────────────────────────────────────────────────────

async function callClaude(
  apiKey: string,
  messages: SmsBatchItem[],
): Promise<(AiParsedTransaction | null)[]> {
  const userContent = messages
    .map((m) => `[${m.index}] ${m.body}`)
    .join('\n\n---\n\n');

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Parse these ${messages.length} M-Pesa SMS messages. Return a JSON array where each element corresponds to the message index. Use null for unparseable messages.\n\n${userContent}`,
        },
        {
          role: 'assistant',
          content: '[',
        },
      ],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Claude API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  const text = '[' + (data.content?.[0]?.text ?? '[]');

  // Extract JSON array from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return messages.map(() => null);

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return messages.map(() => null);
    return parsed;
  } catch {
    return messages.map(() => null);
  }
}

function aiResultToTransaction(
  result: AiParsedTransaction,
  originalSms: { body: string; date: number },
): Transaction | null {
  if (!result || !result.ref || !result.amount) return null;

  const type = VALID_TYPES.includes(result.type) ? result.type : 'unknown';
  const date = result.date ? new Date(result.date).getTime() : originalSms.date;
  const validDate = isNaN(date) ? originalSms.date : date;

  return {
    id: `${result.ref}-${validDate}`,
    ref: result.ref,
    type,
    amount: typeof result.amount === 'number' ? result.amount : parseFloat(String(result.amount)) || 0,
    balance: typeof result.balance === 'number' ? result.balance : null,
    party: result.party || 'Unknown',
    phone: result.phone || null,
    date: validDate,
    cost: typeof result.cost === 'number' ? result.cost : 0,
    category: null,
    rawMessage: originalSms.body,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Parse a batch of SMS messages that the regex parser failed on.
 * Returns parsed transactions and count of AI failures.
 */
export async function aiParseBatch(
  failedMessages: { body: string; date: number }[],
): Promise<{ parsed: Transaction[]; failed: number }> {
  const apiKey = await getApiKey();
  const enabled = await isAiParserEnabled();

  if (!enabled || !apiKey || failedMessages.length === 0) {
    return { parsed: [], failed: failedMessages.length };
  }

  const parsed: Transaction[] = [];
  let failed = 0;

  // Process in chunks to respect token limits
  for (let i = 0; i < failedMessages.length; i += MAX_BATCH) {
    const chunk = failedMessages.slice(i, i + MAX_BATCH);
    const batchItems: SmsBatchItem[] = chunk.map((sms, idx) => ({
      index: idx,
      body: sms.body,
      date: sms.date,
    }));

    try {
      const results = await callClaude(apiKey, batchItems);

      for (let j = 0; j < chunk.length; j++) {
        const result = results[j];
        if (!result) {
          failed++;
          continue;
        }

        const tx = aiResultToTransaction(result, chunk[j]);
        if (tx) {
          parsed.push(tx);
        } else {
          failed++;
        }
      }
    } catch (err) {
      console.warn('[AI_PARSER_ERROR]', err);
      failed += chunk.length;
    }
  }

  return { parsed, failed };
}
