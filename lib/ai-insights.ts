import { Transaction } from '@/types/transaction';
import { AnalyticsSummary } from '@/types/transaction';
import { getApiKey, isAiParserEnabled } from '@/lib/ai-config';
import { OpenRouter } from '@openrouter/sdk';


const SYSTEM_PROMPT = `You are a concise personal finance analyst for an M-Pesa user in Kenya. You analyze their transaction data and provide actionable insights.

Keep your response short and structured. Use this exact format:

**Spending Pulse**
A 1-2 sentence overall summary of their financial health this period.

**Top Patterns**
- 3-4 bullet points on key spending/receiving patterns you notice

**Watch Out**
- 1-2 bullet points on concerning trends, unusual transactions, or areas to cut back

**Smart Moves**
- 1-2 bullet points of actionable recommendations

Use Ksh for currency. Be direct, not preachy. No generic advice — only insights specific to their data.`;

function summarizeTransactions(
  transactions: Transaction[],
  summary: AnalyticsSummary,
): string {
  // Group by type
  const byType: Record<string, { count: number; total: number }> = {};
  const byParty: Record<string, { count: number; total: number; type: string }> = {};

  for (const tx of transactions) {
    if (!byType[tx.type]) byType[tx.type] = { count: 0, total: 0 };
    byType[tx.type].count++;
    byType[tx.type].total += tx.amount;

    const partyKey = tx.party.substring(0, 40);
    if (!byParty[partyKey]) byParty[partyKey] = { count: 0, total: 0, type: tx.type };
    byParty[partyKey].count++;
    byParty[partyKey].total += tx.amount;
  }

  // Top parties by amount
  const topParties = Object.entries(byParty)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 15)
    .map(([name, d]) => `  ${name}: ${d.count} txns, Ksh ${d.total.toLocaleString()} (${d.type})`)
    .join('\n');

  const typeBreakdown = Object.entries(byType)
    .map(([type, d]) => `  ${type}: ${d.count} txns, Ksh ${d.total.toLocaleString()}`)
    .join('\n');

  return `Period: ${new Date(summary.period.start).toLocaleDateString()} - ${new Date(summary.period.end).toLocaleDateString()}
Total transactions: ${summary.transactionCount}
Total received: Ksh ${summary.totalReceived.toLocaleString()}
Total sent/spent: Ksh ${summary.totalSent.toLocaleString()}
Total fees: Ksh ${summary.totalFees.toLocaleString()}
Net: Ksh ${summary.netBalance.toLocaleString()}

By type:
${typeBreakdown}

Top counterparties:
${topParties}`;
}

export async function getAiInsights(
  transactions: Transaction[],
  summary: AnalyticsSummary,
): Promise<string> {
  const apiKey = await getApiKey();
  const enabled = await isAiParserEnabled();



  if (!enabled || !apiKey) {
    throw new Error('AI parser is not configured. Add your API key in Settings.');
  }

  if (transactions.length === 0) {
    throw new Error('No transactions to analyze. Sync your SMS first.');
  }

  const dataPrompt = summarizeTransactions(transactions, summary);

  const openRouter = new OpenRouter({
    apiKey: apiKey,
  });


  const response = await openRouter.callModel({
    model: 'openai/gpt-5.4-mini',
    instructions: SYSTEM_PROMPT,
    input: `Analyze my M-Pesa transactions:\n\n${dataPrompt}`,
  });

  const text = await response.getText();
  return await JSON.parse(text) || 'Sorry, I could not generate insights at this time.';
}
