import { Platform, PermissionsAndroid } from 'react-native';
import { RawSms } from './mpesa-parser';

// Type declaration for react-native-get-sms-android
declare module 'react-native-get-sms-android' {
  interface SmsFilter {
    box?: 'inbox' | 'sent' | 'draft' | 'outbox' | 'failed' | 'queued';
    minDate?: number;
    maxDate?: number;
    bodyRegex?: string;
    address?: string;
    read?: 0 | 1;
    _id?: string;
    thread_id?: string;
    maxCount?: number;
    indexFrom?: number;
  }
  type FailCallback = (error: string) => void;
  type SuccessCallback = (count: number, smsList: string) => void;
  function list(filter: string, fail: FailCallback, success: SuccessCallback): void;
}

export type SmsPermissionStatus = 'granted' | 'denied' | 'unavailable';

export async function requestSmsPermission(): Promise<SmsPermissionStatus> {
  if (Platform.OS !== 'android') return 'unavailable';

  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      {
        title: 'M-Pesa Analytics needs SMS access',
        message:
          'To read your M-Pesa transaction history, the app needs permission to access your SMS messages. Only MPESA messages are read.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );
    return result === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

export async function checkSmsPermission(): Promise<SmsPermissionStatus> {
  if (Platform.OS !== 'android') return 'unavailable';
  const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
  return granted ? 'granted' : 'denied';
}

interface RawAndroidSms {
  _id: string;
  address: string;
  body: string;
  date: string;
  read: string;
  type: string;
}

/**
 * Reads M-Pesa SMS messages from Android inbox.
 * Returns normalised RawSms array or empty array on iOS/web.
 */
export function readMpesaSms(opts: { fromDate?: number } = {}): Promise<RawSms[]> {
  if (Platform.OS !== 'android') {
    return Promise.resolve([]);
  }

  return new Promise((resolve, reject) => {
    const SmsAndroid = require('react-native-get-sms-android');

    const filter: Record<string, unknown> = {
      box: 'inbox',
      maxCount: 2000,
      address: 'MPESA',
    };

    if (opts.fromDate) {
      filter.minDate = opts.fromDate;
    }

    SmsAndroid.list(
      JSON.stringify(filter),
      (err: string) => reject(new Error(err)),
      (_count: number, smsList: string) => {
        try {
          const raw: RawAndroidSms[] = JSON.parse(smsList);
          const normalised: RawSms[] = raw.map((s) => ({
            id: s._id,
            address: s.address,
            body: s.body,
            date: parseInt(s.date, 10),
          }));
          resolve(normalised);
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}
