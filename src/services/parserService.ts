import { TransactionType, ParsedTransaction } from '../types';

/**
 * M-Pesa Message Parser
 * 
 * Parses M-Pesa confirmation SMS messages and extracts transaction data.
 * Handles multiple transaction types with regex patterns.
 */

export class MPesaParser {
  /**
   * Main parse function - tries all parsers
   */
  static parse(message: string): ParsedTransaction | null {
    // Normalize message (remove extra whitespace, standardize format)
    const normalized = message.replace(/\s+/g, ' ').trim();

    // Skip if not an M-PESA confirmation
    if (!normalized.includes('M-PESA') && !normalized.includes('MPESA')) {
      return null;
    }

    // Try each parser in order
    const parsers = [
      this.parseReceived,
      this.parseSent,
      this.parseBuyGoods,
      this.parsePayBill,
      this.parseWithdraw,
      this.parseDeposit,
      this.parseAirtime,
      this.parseLipaNaMpesa,
    ];

    for (const parser of parsers) {
      const result = parser.call(this, normalized);
      if (result) {
        result.rawMessage = message;
        return result;
      }
    }

    return null;
  }

  /**
   * Parse "Received Money" transaction
   * Example: "You have received Ksh500.00 from JOHN DOE 254712345678 on 14/3/26 at 1:30 AM. New M-PESA balance is Ksh2,450.00."
   */
  private static parseReceived(message: string): ParsedTransaction | null {
    const pattern = /You have received Ksh([\d,]+\.?\d*) from (.+?) (\d{12}) on (\d+\/\d+\/\d+) at (\d+:\d+ [AP]M).*?New M-PESA balance is Ksh([\d,]+\.?\d*).*?Transaction cost,? Ksh([\d,]+\.?\d*)/i;
    const match = message.match(pattern);

    if (!match) return null;

    const [, amount, name, phone, date, time, balance, cost] = match;

    return {
      type: TransactionType.RECEIVED,
      amount: this.parseAmount(amount),
      transactionCost: this.parseAmount(cost),
      balance: this.parseAmount(balance),
      counterparty: name.trim(),
      phone: phone,
      timestamp: this.parseDateTime(date, time),
      rawMessage: message,
    };
  }

  /**
   * Parse "Sent Money" transaction
   * Example: "Ksh1,000.00 sent to JANE SMITH 254798765432 on 14/3/26 at 2:15 AM. New M-PESA balance is Ksh1,450.00. Transaction cost, Ksh11.00."
   */
  private static parseSent(message: string): ParsedTransaction | null {
    const pattern = /Ksh([\d,]+\.?\d*) sent to (.+?) (\d{12}) on (\d+\/\d+\/\d+) at (\d+:\d+ [AP]M).*?New M-PESA balance is Ksh([\d,]+\.?\d*).*?Transaction cost,? Ksh([\d,]+\.?\d*)/i;
    const match = message.match(pattern);

    if (!match) return null;

    const [, amount, name, phone, date, time, balance, cost] = match;

    return {
      type: TransactionType.SENT,
      amount: this.parseAmount(amount),
      transactionCost: this.parseAmount(cost),
      balance: this.parseAmount(balance),
      counterparty: name.trim(),
      phone: phone,
      timestamp: this.parseDateTime(date, time),
      rawMessage: message,
    };
  }

  /**
   * Parse "Buy Goods" transaction (Till Number)
   * Example: "Ksh250.00 paid to SHOP NAME. on 14/3/26 at 3:00 AM. New M-PESA balance is Ksh1,200.00."
   */
  private static parseBuyGoods(message: string): ParsedTransaction | null {
    const pattern = /Ksh([\d,]+\.?\d*) paid to (.+?)\. on (\d+\/\d+\/\d+) at (\d+:\d+ [AP]M).*?New M-PESA balance is Ksh([\d,]+\.?\d*).*?(?:Transaction cost,? Ksh([\d,]+\.?\d*))?/i;
    const match = message.match(pattern);

    if (!match) return null;

    const [, amount, merchant, date, time, balance, cost] = match;

    return {
      type: TransactionType.BUY_GOODS,
      amount: this.parseAmount(amount),
      transactionCost: this.parseAmount(cost || '0'),
      balance: this.parseAmount(balance),
      counterparty: merchant.trim(),
      timestamp: this.parseDateTime(date, time),
      rawMessage: message,
    };
  }

  /**
   * Parse "Pay Bill" transaction
   * Example: "Ksh500.00 sent to COMPANY NAME for account 123456 on 14/3/26 at 4:00 AM. New M-PESA balance is Ksh700.00."
   */
  private static parsePayBill(message: string): ParsedTransaction | null {
    const pattern = /Ksh([\d,]+\.?\d*) sent to (.+?) for account (.+?) on (\d+\/\d+\/\d+) at (\d+:\d+ [AP]M).*?New M-PESA balance is Ksh([\d,]+\.?\d*).*?(?:Transaction cost,? Ksh([\d,]+\.?\d*))?/i;
    const match = message.match(pattern);

    if (!match) return null;

    const [, amount, merchant, account, date, time, balance, cost] = match;

    return {
      type: TransactionType.PAY_BILL,
      amount: this.parseAmount(amount),
      transactionCost: this.parseAmount(cost || '0'),
      balance: this.parseAmount(balance),
      counterparty: merchant.trim(),
      account: account.trim(),
      timestamp: this.parseDateTime(date, time),
      rawMessage: message,
    };
  }

  /**
   * Parse "Withdraw" transaction
   * Example: "Ksh1,000.00 withdrawn from agent AGENT NAME 12345 on 14/3/26 at 5:00 AM. New M-PESA balance is Ksh-300.00. Transaction cost, Ksh28.00."
   */
  private static parseWithdraw(message: string): ParsedTransaction | null {
    const pattern = /Ksh([\d,]+\.?\d*) withdrawn from agent (.+?) on (\d+\/\d+\/\d+) at (\d+:\d+ [AP]M).*?New M-PESA balance is Ksh(-?[\d,]+\.?\d*).*?Transaction cost,? Ksh([\d,]+\.?\d*)/i;
    const match = message.match(pattern);

    if (!match) return null;

    const [, amount, agent, date, time, balance, cost] = match;

    return {
      type: TransactionType.WITHDRAW,
      amount: this.parseAmount(amount),
      transactionCost: this.parseAmount(cost),
      balance: this.parseAmount(balance),
      counterparty: agent.trim(),
      timestamp: this.parseDateTime(date, time),
      rawMessage: message,
    };
  }

  /**
   * Parse "Deposit" transaction
   * Example: "Ksh2,000.00 deposited to account 254712345678 on 14/3/26 at 6:00 AM. New M-PESA balance is Ksh1,700.00."
   */
  private static parseDeposit(message: string): ParsedTransaction | null {
    const pattern = /Ksh([\d,]+\.?\d*) deposited to account (\d+) on (\d+\/\d+\/\d+) at (\d+:\d+ [AP]M).*?New M-PESA balance is Ksh([\d,]+\.?\d*).*?(?:Transaction cost,? Ksh([\d,]+\.?\d*))?/i;
    const match = message.match(pattern);

    if (!match) return null;

    const [, amount, account, date, time, balance, cost] = match;

    return {
      type: TransactionType.DEPOSIT,
      amount: this.parseAmount(amount),
      transactionCost: this.parseAmount(cost || '0'),
      balance: this.parseAmount(balance),
      account: account,
      timestamp: this.parseDateTime(date, time),
      rawMessage: message,
    };
  }

  /**
   * Parse "Airtime Purchase" transaction
   * Example: "You bought Ksh50.00 of airtime on 14/3/26 at 7:00 AM. New M-PESA balance is Ksh1,650.00."
   */
  private static parseAirtime(message: string): ParsedTransaction | null {
    const pattern = /You bought Ksh([\d,]+\.?\d*) of airtime on (\d+\/\d+\/\d+) at (\d+:\d+ [AP]M).*?New M-PESA balance is Ksh([\d,]+\.?\d*).*?(?:Transaction cost,? Ksh([\d,]+\.?\d*))?/i;
    const match = message.match(pattern);

    if (!match) return null;

    const [, amount, date, time, balance, cost] = match;

    return {
      type: TransactionType.AIRTIME,
      amount: this.parseAmount(amount),
      transactionCost: this.parseAmount(cost || '0'),
      balance: this.parseAmount(balance),
      counterparty: 'Airtime',
      timestamp: this.parseDateTime(date, time),
      rawMessage: message,
    };
  }

  /**
   * Parse "Lipa na M-PESA" (STK Push) transaction
   * Example: "Ksh150.00 paid to MERCHANT NAME. on 14/3/26 at 8:00 AM. New M-PESA balance is Ksh1,500.00. STK Ref: DEF456GHI."
   */
  private static parseLipaNaMpesa(message: string): ParsedTransaction | null {
    const pattern = /Ksh([\d,]+\.?\d*) paid to (.+?)\. on (\d+\/\d+\/\d+) at (\d+:\d+ [AP]M).*?New M-PESA balance is Ksh([\d,]+\.?\d*).*?STK Ref: ([A-Z0-9]+)/i;
    const match = message.match(pattern);

    if (!match) return null;

    const [, amount, merchant, date, time, balance, stkRef] = match;

    return {
      type: TransactionType.LIPA_NA_MPESA,
      amount: this.parseAmount(amount),
      transactionCost: 0, // Usually no cost for Lipa na M-PESA
      balance: this.parseAmount(balance),
      counterparty: merchant.trim(),
      reference: stkRef,
      timestamp: this.parseDateTime(date, time),
      rawMessage: message,
    };
  }

  /**
   * Helper: Parse amount string (handles commas)
   */
  private static parseAmount(amountStr: string): number {
    return parseFloat(amountStr.replace(/,/g, ''));
  }

  /**
   * Helper: Parse date/time string
   * Format: "14/3/26" and "1:30 AM"
   */
  private static parseDateTime(dateStr: string, timeStr: string): Date {
    // Parse date: "14/3/26" -> day, month, year
    const [day, month, year] = dateStr.split('/').map(Number);
    const fullYear = 2000 + year; // Assume 20xx

    // Parse time: "1:30 AM"
    const [timePart, period] = timeStr.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);

    // Convert to 24-hour format
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }

    return new Date(fullYear, month - 1, day, hours, minutes);
  }

  /**
   * Generate transaction ID from parsed data
   */
  static generateTransactionId(transaction: ParsedTransaction): string {
    // Use reference if available, otherwise hash of key fields
    if (transaction.reference) {
      return transaction.reference;
    }

    // Create a unique string from transaction data
    const key = `${transaction.type}_${transaction.amount}_${transaction.timestamp.getTime()}_${transaction.counterparty || ''}`;
    
    // Simple hash (for production, use a real hash function)
    return btoa(key).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }
}

export default MPesaParser;
