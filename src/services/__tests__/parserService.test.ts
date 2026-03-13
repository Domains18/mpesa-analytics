import { MPesaParser } from '../parserService';
import { TransactionType } from '../../types';

describe('MPesaParser', () => {
  describe('parseReceived', () => {
    it('should parse received money message', () => {
      const message = 'You have received Ksh500.00 from JOHN DOE 254712345678 on 14/3/26 at 1:30 AM. New M-PESA balance is Ksh2,450.00. Transaction cost, Ksh0.00. Amount you can transact within the day is 499,500.00.';
      
      const result = MPesaParser.parse(message);
      
      expect(result).toBeTruthy();
      expect(result?.type).toBe(TransactionType.RECEIVED);
      expect(result?.amount).toBe(500);
      expect(result?.balance).toBe(2450);
      expect(result?.transactionCost).toBe(0);
      expect(result?.counterparty).toBe('JOHN DOE');
      expect(result?.phone).toBe('254712345678');
    });
  });

  describe('parseSent', () => {
    it('should parse sent money message', () => {
      const message = 'Ksh1,000.00 sent to JANE SMITH 254798765432 on 14/3/26 at 2:15 AM. New M-PESA balance is Ksh1,450.00. Transaction cost, Ksh11.00. Amount you can transact within the day is 498,489.00.';
      
      const result = MPesaParser.parse(message);
      
      expect(result).toBeTruthy();
      expect(result?.type).toBe(TransactionType.SENT);
      expect(result?.amount).toBe(1000);
      expect(result?.balance).toBe(1450);
      expect(result?.transactionCost).toBe(11);
      expect(result?.counterparty).toBe('JANE SMITH');
      expect(result?.phone).toBe('254798765432');
    });
  });

  describe('parseBuyGoods', () => {
    it('should parse buy goods message', () => {
      const message = 'Ksh250.00 paid to SHOP NAME. on 14/3/26 at 3:00 AM. New M-PESA balance is Ksh1,200.00. Transaction cost, Ksh0.00. STK Ref: ABC123XYZ';
      
      const result = MPesaParser.parse(message);
      
      expect(result).toBeTruthy();
      expect(result?.type).toBe(TransactionType.BUY_GOODS);
      expect(result?.amount).toBe(250);
      expect(result?.balance).toBe(1200);
      expect(result?.counterparty).toBe('SHOP NAME');
    });
  });

  describe('parsePayBill', () => {
    it('should parse paybill message', () => {
      const message = 'Ksh500.00 sent to COMPANY NAME for account 123456 on 14/3/26 at 4:00 AM. New M-PESA balance is Ksh700.00. Transaction cost, Ksh0.00. Reference: XYZ789.';
      
      const result = MPesaParser.parse(message);
      
      expect(result).toBeTruthy();
      expect(result?.type).toBe(TransactionType.PAY_BILL);
      expect(result?.amount).toBe(500);
      expect(result?.balance).toBe(700);
      expect(result?.counterparty).toBe('COMPANY NAME');
      expect(result?.account).toBe('123456');
    });
  });

  describe('parseWithdraw', () => {
    it('should parse withdraw message', () => {
      const message = 'Ksh1,000.00 withdrawn from agent AGENT NAME 12345 on 14/3/26 at 5:00 AM. New M-PESA balance is Ksh-300.00. Transaction cost, Ksh28.00.';
      
      const result = MPesaParser.parse(message);
      
      expect(result).toBeTruthy();
      expect(result?.type).toBe(TransactionType.WITHDRAW);
      expect(result?.amount).toBe(1000);
      expect(result?.balance).toBe(-300);
      expect(result?.transactionCost).toBe(28);
      expect(result?.counterparty).toBe('AGENT NAME 12345');
    });
  });

  describe('parseDeposit', () => {
    it('should parse deposit message', () => {
      const message = 'Ksh2,000.00 deposited to account 254712345678 on 14/3/26 at 6:00 AM. New M-PESA balance is Ksh1,700.00. Transaction cost, Ksh0.00.';
      
      const result = MPesaParser.parse(message);
      
      expect(result).toBeTruthy();
      expect(result?.type).toBe(TransactionType.DEPOSIT);
      expect(result?.amount).toBe(2000);
      expect(result?.balance).toBe(1700);
      expect(result?.account).toBe('254712345678');
    });
  });

  describe('parseAirtime', () => {
    it('should parse airtime purchase message', () => {
      const message = 'You bought Ksh50.00 of airtime on 14/3/26 at 7:00 AM. New M-PESA balance is Ksh1,650.00. Transaction cost, Ksh0.00.';
      
      const result = MPesaParser.parse(message);
      
      expect(result).toBeTruthy();
      expect(result?.type).toBe(TransactionType.AIRTIME);
      expect(result?.amount).toBe(50);
      expect(result?.balance).toBe(1650);
      expect(result?.counterparty).toBe('Airtime');
    });
  });

  describe('parseLipaNaMpesa', () => {
    it('should parse Lipa na M-PESA message', () => {
      const message = 'Ksh150.00 paid to MERCHANT NAME. on 14/3/26 at 8:00 AM. New M-PESA balance is Ksh1,500.00. Transaction cost, Ksh0.00. STK Ref: DEF456GHI.';
      
      const result = MPesaParser.parse(message);
      
      expect(result).toBeTruthy();
      expect(result?.type).toBe(TransactionType.LIPA_NA_MPESA);
      expect(result?.amount).toBe(150);
      expect(result?.balance).toBe(1500);
      expect(result?.counterparty).toBe('MERCHANT NAME');
      expect(result?.reference).toBe('DEF456GHI');
    });
  });

  describe('edge cases', () => {
    it('should return null for non-MPESA message', () => {
      const message = 'This is a random SMS message';
      const result = MPesaParser.parse(message);
      expect(result).toBeNull();
    });

    it('should handle messages with extra whitespace', () => {
      const message = '  You  have  received  Ksh500.00  from  JOHN DOE 254712345678 on 14/3/26 at 1:30 AM. New M-PESA balance is Ksh2,450.00. Transaction cost, Ksh0.00.  ';
      
      const result = MPesaParser.parse(message);
      expect(result).toBeTruthy();
      expect(result?.type).toBe(TransactionType.RECEIVED);
    });
  });

  describe('generateTransactionId', () => {
    it('should use reference if available', () => {
      const transaction: any = {
        type: TransactionType.LIPA_NA_MPESA,
        amount: 100,
        reference: 'ABC123',
        timestamp: new Date(),
      };
      
      const id = MPesaParser.generateTransactionId(transaction);
      expect(id).toBe('ABC123');
    });

    it('should generate ID from transaction data if no reference', () => {
      const transaction: any = {
        type: TransactionType.SENT,
        amount: 100,
        timestamp: new Date(),
        counterparty: 'Test',
      };
      
      const id = MPesaParser.generateTransactionId(transaction);
      expect(id).toBeTruthy();
      expect(id.length).toBe(16);
    });
  });
});
