import { PermissionsAndroid, Platform } from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import { SMSMessage } from '../types';

/**
 * SMS Service
 * 
 * Handles SMS access on Android:
 * - Request READ_SMS permission
 * - Read M-Pesa messages
 * - Filter by sender (MPESA)
 */

export class SMSService {
  private static readonly MPESA_SENDER = 'MPESA';
  
  /**
   * Request READ_SMS permission
   */
  static async requestSMSPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.warn('SMS access is only available on Android');
      return false;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: 'M-Pesa Analytics SMS Permission',
          message: 'This app needs access to your SMS messages to analyze M-Pesa transactions. Only M-Pesa messages will be read and processed locally on your device.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Deny',
          buttonPositive: 'Allow',
        }
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.error('Error requesting SMS permission:', err);
      return false;
    }
  }

  /**
   * Check if READ_SMS permission is granted
   */
  static async hasPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_SMS
      );
      return hasPermission;
    } catch (err) {
      console.error('Error checking SMS permission:', err);
      return false;
    }
  }

  /**
   * Read all M-Pesa SMS messages
   * @param maxCount Maximum number of messages to read (default: 1000)
   */
  static async readMPesaMessages(maxCount: number = 1000): Promise<SMSMessage[]> {
    if (Platform.OS !== 'android') {
      throw new Error('SMS access is only available on Android');
    }

    // Check permission first
    const hasPermission = await this.hasPermission();
    if (!hasPermission) {
      throw new Error('SMS permission not granted');
    }

    return new Promise((resolve, reject) => {
      const filter = {
        box: 'inbox', // Read from inbox
        indexFrom: 0, // Start from most recent
        maxCount: maxCount,
        address: this.MPESA_SENDER, // Filter by M-Pesa sender
      };

      SmsAndroid.list(
        JSON.stringify(filter),
        (fail: string) => {
          console.error('Failed to read SMS:', fail);
          reject(new Error(fail));
        },
        (count: number, smsList: string) => {
          try {
            const messages: any[] = JSON.parse(smsList);
            
            const mpesaMessages: SMSMessage[] = messages.map((msg) => ({
              id: msg._id.toString(),
              address: msg.address,
              body: msg.body,
              date: msg.date,
            }));

            console.log(`Read ${mpesaMessages.length} M-Pesa messages`);
            resolve(mpesaMessages);
          } catch (err) {
            console.error('Error parsing SMS list:', err);
            reject(err);
          }
        }
      );
    });
  }

  /**
   * Read M-Pesa messages since a specific date
   * @param sinceDate Only read messages after this date
   */
  static async readMPesaMessagesSince(sinceDate: Date): Promise<SMSMessage[]> {
    const allMessages = await this.readMPesaMessages();
    
    // Filter messages by date
    return allMessages.filter((msg) => msg.date >= sinceDate.getTime());
  }

  /**
   * Read the most recent M-Pesa message
   */
  static async readLatestMPesaMessage(): Promise<SMSMessage | null> {
    const messages = await this.readMPesaMessages(1);
    return messages.length > 0 ? messages[0] : null;
  }

  /**
   * Count total M-Pesa messages
   */
  static async countMPesaMessages(): Promise<number> {
    if (Platform.OS !== 'android') {
      return 0;
    }

    const hasPermission = await this.hasPermission();
    if (!hasPermission) {
      return 0;
    }

    return new Promise((resolve) => {
      const filter = {
        box: 'inbox',
        address: this.MPESA_SENDER,
      };

      SmsAndroid.list(
        JSON.stringify(filter),
        (fail: string) => {
          console.error('Failed to count SMS:', fail);
          resolve(0);
        },
        (count: number) => {
          resolve(count);
        }
      );
    });
  }
}

export default SMSService;
