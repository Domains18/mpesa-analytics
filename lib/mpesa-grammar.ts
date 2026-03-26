

import { TransactionType } from '@/types/transaction';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface MatchResult {
  type: TransactionType;
  amount: number;
  party: string;
  phone?: string | null;
}

export interface ScoredMatch extends MatchResult {
  score: number;
  rule: string;
}

type Groups = Record<string, string | undefined>;


export const TOKENS = {
  // Update here if M-Pesa ever switches from "Ksh" to "KES".
  AMOUNT:          `Ksh\\s?(?<amount>[\\d,]+\\.?\\d*)`,

  REF:             `(?<ref>[A-Z0-9]{10,12})`,
  PHONE:           `(?<phone>\\d{10,})`,
  AGENT_ID:        `(?<agentId>\\d{5,})`,

  PARTY_PERSON:    `(?<party>[A-Za-z][A-Za-z\\s]+?)`,
  PARTY_MERCHANT:  `(?<party>[A-Za-z0-9][A-Za-z0-9\\s\\-\\.&,']+?)`,
  PARTY_AGENT:     `(?<agentName>[A-Za-z0-9][A-Za-z0-9\\s\\-\\.&,']+?)`,
  PARTY_ANY:       `(?<party>.+?)`,

  ON:              `\\s+on\\s+`,
  FOR_ACCOUNT:     `(?:\\s+for\\s+account\\s+[\\w]+)?`,
  NOT_AGENT:       `(?!.*\\bagent\\b)`,
} as const;

type TokenName = keyof typeof TOKENS;



export function compile(template: string, flags = 'i'): RegExp {
  const source = template.replace(
    /\{(\w+)(\?)?\s*(?::(\w+))?\}/g,
    (_, name: string, optional: string | undefined, alias: string | undefined) => {
      if (!(name in TOKENS)) {
        throw new Error(`[mpesa-grammar] Unknown token: "${name}"`);
      }
      let fragment = TOKENS[name as TokenName] as string;

      if (alias) {
        fragment = fragment.replace(/\(\?<\w+>/, `(?<${alias}>`);
      }

      return optional ? `(?:${fragment})?` : fragment;
    }
  );

  return new RegExp(source, flags);
}


export const sanitizeAmount = (raw = '0'): number =>
  parseFloat(raw.replace(/[^\d.]/g, '')) || 0;


interface GrammarRule {
  name: string;
  priority: number;
  pattern: RegExp;
  transform: (groups: Groups) => MatchResult;
}

export const GRAMMAR_RULES: GrammarRule[] = [
  {
    name: 'merchant_payment',
    priority: 80,
    pattern: compile(`{AMOUNT}\\s+paid to\\s+{PARTY_MERCHANT}\\.\\s+Buy Goods Till No\\.\\s+(?<till>\\d+)`),
    transform: ({ amount, party, till }) => ({
      type: 'payment',
      amount: sanitizeAmount(amount),
      party: `${party?.trim()} (Till: ${till})`,
    }),
  },

  {
    name: 'pochi_payment',
    priority: 75,
    pattern: compile(`{AMOUNT}\\s+paid to Pochi La Biashara\\s*-\\s*{PARTY_ANY}{ON}`),
    transform: ({ amount, party }) => ({
      type: 'payment',
    amount: sanitizeAmount(amount),
      party: `Pochi: ${party?.trim()}`,
      phone: party?.match(/\d{10,}/)?.[0] ?? null,
    }),
  },

  {
    name: 'mshwari_deposit',
    priority: 80,
    pattern: compile(`{AMOUNT}\\s+transferred from M-PESA to M-Shwari`),
    transform: ({ amount }) => ({
      type: 'mshwari_deposit' as TransactionType,
      amount: sanitizeAmount(amount),
      party: 'M-Shwari Savings',
    }),
  },
  {
    name: 'mshwari_withdraw',
    priority: 80,
    pattern: compile(`{AMOUNT}\\s+transferred from M-Shwari to M-PESA`),
    transform: ({ amount }) => ({
      type: 'mshwari_withdrawal' as TransactionType,
      amount: sanitizeAmount(amount),
      party: 'M-Shwari Savings',
    }),
  },

  {
    name: 'deposit',
    priority: 70,
    pattern: compile(`received\\s+{AMOUNT}\\s+cash from agent\\s+{AGENT_ID}\\s*-?\\s*{PARTY_AGENT}{ON}`),
    transform: ({ amount, agentName }) => ({
      type: 'deposit',
      amount: sanitizeAmount(amount),
      party: `Agent: ${agentName?.trim()}`,
    }),
  },

  

  {
    name: 'withdrawal',
    priority: 70,
    pattern: compile(`{AMOUNT}\\s+withdrawn from agent\\s+{AGENT_ID}\\s*-?\\s*{PARTY_AGENT}{ON}`),
    transform: ({ amount, agentName }) => ({
      type: 'withdrawal',
      amount: sanitizeAmount(amount),
      party: `Agent: ${agentName?.trim()}`,
    }),
  },

  {
    name: 'sent',
    priority: 50,
    pattern: compile(`{AMOUNT}\\s+sent to\\s+{PARTY_PERSON}\\s+{PHONE?}\\s*on`),
    transform: ({ amount, party, phone }) => ({
      type: 'sent',
      amount: sanitizeAmount(amount),
      party: party?.trim() ?? '',
      phone: phone?.trim() ?? null,
    }),
  },


  {
    name: 'received',
    priority: 50,
    pattern: compile(`{NOT_AGENT}received\\s+{AMOUNT}\\s+from\\s+{PARTY_PERSON}\\s+{PHONE?}\\s*on`),
    transform: ({ amount, party, phone }) => ({
      type: 'received',
      amount: sanitizeAmount(amount),
      party: party?.trim() ?? '',
      phone: phone?.trim() ?? null,
    }),
  },

  {
    name: 'payment',
    priority: 40,
    pattern: compile(`{AMOUNT}\\s+paid to\\s+{PARTY_MERCHANT}\\s+(?:for account|on)`),
    transform: ({ amount, party }) => ({
      type: 'payment',
      amount: sanitizeAmount(amount),
      party: party?.trim() ?? '',
    }),
  },

  {
    name: 'fuliza',
    priority: 60,
    pattern: compile(`used\\s+{AMOUNT}\\s+from Fuliza`),
    transform: ({ amount }) => ({
      type: 'fuliza',
      amount: sanitizeAmount(amount),
      party: 'Fuliza M-PESA',
    }),
  },
];


function scoreMatch(rule: GrammarRule, match: RegExpMatchArray): number {
  const groups = match.groups ?? {};
  // Reward: each non-undefined capture group (specificity indicator)
  const capturedCount = Object.values(groups).filter((v) => v !== undefined).length;

  return (
    rule.priority +       // base: encodes how specific the rule structure is
    capturedCount * 10 +  // more captured fields = higher confidence
    match[0].length       // longer match = pattern consumed more context
  );
}

export function matchGrammar(body: string): MatchResult | null {
  const candidates: ScoredMatch[] = [];

  for (const rule of GRAMMAR_RULES) {
    const match = body.match(rule.pattern);
    if (!match?.groups) continue;

    const result = rule.transform({ ...match.groups });
    candidates.push({ ...result, score: scoreMatch(rule, match), rule: rule.name });
  }

  if (!candidates.length) return null;

  candidates.sort((a, b) => b.score - a.score);

  const { score: _s, rule: _r, ...best } = candidates[0];
  return best;
}
// e grammar produces a structural type; classify() refines it.
export function classify(result: MatchResult, body: string): MatchResult {
  if (result.type === 'payment' && /airtime/i.test(body)) {
    return { ...result, type: 'airtime' };
  }
  if (/\breversed\b|\breversal\b/i.test(body)) {
    return { ...result, type: 'reversal' };
  }
  return result;
}


export function fallbackParse(body: string): Partial<MatchResult> | null {
  const amountMatch = body.match(/Ksh\s?([\d,]+\.?\d*)/i);
  if (!amountMatch) return null;

  let type: TransactionType = 'unknown';
  if (/sent to/i.test(body))       type = 'sent';
  else if (/paid to/i.test(body))  type = 'payment';
  else if (/received/i.test(body)) type = 'received';
  else if (/withdrawn/i.test(body)) type = 'withdrawal';
  else if (/fuliza/i.test(body))   type = 'fuliza';

  const phoneMatch = body.match(/(\d{10,})/);

  return {
    type,
    amount: sanitizeAmount(amountMatch[1]),
    party: 'Unknown',
    phone: phoneMatch?.[1] ?? null,
  };
}


export function debugGrammar(
  body: string,
): { rule: string; score: number; groups: Groups }[] {
  return GRAMMAR_RULES.flatMap((rule) => {
    const match = body.match(rule.pattern);
    if (!match?.groups) return [];
    return [{ rule: rule.name, score: scoreMatch(rule, match), groups: match.groups }];
  }).sort((a, b) => b.score - a.score);
}
