import { SMSService } from './smsService';
import { DatabaseService } from './dbService';
import { MPesaParser } from './parserService';

/**
 * Sync Service
 * 
 * Orchestrates syncing M-Pesa SMS messages to the local database:
 * 1. Read SMS messages
 * 2. Parse messages
 * 3. Store in database
 */

export interface SyncResult {
  totalMessages: number;
  parsed: number;
  inserted: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export class SyncService {
  /**
   * Full sync: Read all M-Pesa messages and sync to database
   */
  static async fullSync(): Promise<SyncResult> {
    const result: SyncResult = {
      totalMessages: 0,
      parsed: 0,
      inserted: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    try {
      // Check SMS permission
      const hasPermission = await SMSService.hasPermission();
      if (!hasPermission) {
        const granted = await SMSService.requestSMSPermission();
        if (!granted) {
          throw new Error('SMS permission denied');
        }
      }

      // Initialize database
      await DatabaseService.initialize();

      // Read all M-Pesa messages
      console.log('Reading M-Pesa messages...');
      const messages = await SMSService.readMPesaMessages();
      result.totalMessages = messages.length;
      console.log(`Found ${messages.length} M-Pesa messages`);

      // Parse and insert each message
      for (const message of messages) {
        try {
          // Parse message
          const parsed = MPesaParser.parse(message.body);
          
          if (!parsed) {
            result.skipped++;
            console.warn(`Could not parse message: ${message.body.substring(0, 50)}...`);
            continue;
          }

          result.parsed++;

          // Insert to database
          await DatabaseService.insertTransaction(parsed);
          result.inserted++;
        } catch (error) {
          result.failed++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          result.errors.push(errorMsg);
          console.error('Failed to process message:', error);
        }
      }

      console.log('Sync complete:', result);
      return result;
    } catch (error) {
      console.error('Full sync failed:', error);
      throw error;
    }
  }

  /**
   * Incremental sync: Only sync new messages since last sync
   */
  static async incrementalSync(): Promise<SyncResult> {
    const result: SyncResult = {
      totalMessages: 0,
      parsed: 0,
      inserted: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    try {
      // Check permission
      const hasPermission = await SMSService.hasPermission();
      if (!hasPermission) {
        throw new Error('SMS permission not granted');
      }

      // Initialize database
      await DatabaseService.initialize();

      // Get last sync time
      const syncState = await DatabaseService.getSyncState();
      const lastSync = syncState.lastSync || new Date(0); // If no last sync, get all

      console.log(`Syncing messages since ${lastSync.toISOString()}`);

      // Read new messages
      const messages = await SMSService.readMPesaMessagesSince(lastSync);
      result.totalMessages = messages.length;
      console.log(`Found ${messages.length} new M-Pesa messages`);

      // Parse and insert
      for (const message of messages) {
        try {
          const parsed = MPesaParser.parse(message.body);
          
          if (!parsed) {
            result.skipped++;
            continue;
          }

          result.parsed++;
          await DatabaseService.insertTransaction(parsed);
          result.inserted++;
        } catch (error) {
          result.failed++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          result.errors.push(errorMsg);
        }
      }

      console.log('Incremental sync complete:', result);
      return result;
    } catch (error) {
      console.error('Incremental sync failed:', error);
      throw error;
    }
  }

  /**
   * Get sync status
   */
  static async getSyncStatus() {
    await DatabaseService.initialize();
    
    const syncState = await DatabaseService.getSyncState();
    const smsCount = await SMSService.countMPesaMessages();
    const dbCount = await DatabaseService.getTransactionCount();

    return {
      lastSync: syncState.lastSync,
      totalTransactions: syncState.totalTransactions,
      currentBalance: syncState.balance,
      smsCount,
      dbCount,
      needsSync: smsCount > dbCount,
      missedMessages: Math.max(0, smsCount - dbCount),
    };
  }

  /**
   * Check if initial sync is needed
   */
  static async needsInitialSync(): Promise<boolean> {
    await DatabaseService.initialize();
    const count = await DatabaseService.getTransactionCount();
    return count === 0;
  }
}

export default SyncService;
