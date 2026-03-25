import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import { RawSms } from '@/types/transaction';

// ─── Types & Constants ───────────────────────────────────────────────────────

export type SmsPermissionStatus = 'granted' | 'denied' | 'never_ask_again' | 'unavailable';

interface RawAndroidSms {
  _id: string;
  address: string;
  body: string;
  date: string;
}

const BATCH_SIZE = 500;
const SMS_PERMISSION = PermissionsAndroid.PERMISSIONS.READ_SMS;

// Dynamic import for the native module to prevent crashes on iOS/Web
const SmsAndroid = Platform.OS === 'android' ? require('react-native-get-sms-android') : null;

// ─── Permission Logic ────────────────────────────────────────────────────────

const PERMISSION_STRINGS = {
  preRequest: {
    title: 'Allow SMS Access',
    message: 'We only read M-Pesa messages to import transactions and provide financial insights automatically.',
    confirm: 'Continue',
    cancel: 'Not Now',
  },
  neverAsk: {
    title: 'Permission Required',
    message: 'We need SMS access to function. Please enable it in your app settings.',
    confirm: 'Open Settings',
    cancel: 'Cancel',
  },
};

export const openAppSettings = () => Linking.openSettings();

/**
 * Orchestrates the permission flow: Check -> Pre-alert -> Request -> Handle Denial
 */
export async function requestSmsPermission(): Promise<SmsPermissionStatus> {
  if (Platform.OS !== 'android') return 'unavailable';

  // 1. Quick Check
  const hasPermission = await PermissionsAndroid.check(SMS_PERMISSION);
  if (hasPermission) return 'granted';

  // 2. Educational Pre-alert (UX Best Practice)
  const proceed = await new Promise((resolve) => {
    Alert.alert(
      PERMISSION_STRINGS.preRequest.title,
      PERMISSION_STRINGS.preRequest.message,
      [
        { text: PERMISSION_STRINGS.preRequest.cancel, style: 'cancel', onPress: () => resolve(false) },
        { text: PERMISSION_STRINGS.preRequest.confirm, onPress: () => resolve(true) },
      ]
    );
  });

  if (!proceed) return 'denied';

  // 3. System Request
  const result = await PermissionsAndroid.request(SMS_PERMISSION);

  if (result === PermissionsAndroid.RESULTS.GRANTED) return 'granted';

  if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    return new Promise((resolve) => {
      Alert.alert(
        PERMISSION_STRINGS.neverAsk.title,
        PERMISSION_STRINGS.neverAsk.message,
        [
          { text: PERMISSION_STRINGS.neverAsk.cancel, style: 'cancel', onPress: () => resolve('never_ask_again') },
          { text: PERMISSION_STRINGS.neverAsk.confirm, onPress: () => { openAppSettings(); resolve('never_ask_again'); } },
        ]
      );
    });
  }

  return 'denied';
}

// ─── Fetching Logic ──────────────────────────────────────────────────────────

/**
 * Wraps the callback-based native module in a clean Promise
 */
async function fetchSmsBatch(options: { fromDate?: number; indexFrom: number }): Promise<RawSms[]> {
  if (!SmsAndroid) return [];

  const filter = {
    box: 'inbox',
    // We filter for MPESA at the OS level to reduce data bridge overhead
    address: 'MPESA',
    maxCount: BATCH_SIZE,
    indexFrom: options.indexFrom,
    ...(options.fromDate && { minDate: options.fromDate }),
  };

  return new Promise((resolve, reject) => {
    SmsAndroid.list(
      JSON.stringify(filter),
      (fail: string) => reject(new Error(`Native SMS Error: ${fail}`)),
      (_count: number, smsList: string) => {
        try {
          const raw: RawAndroidSms[] = JSON.parse(smsList);
          const mapped = raw.map((sms) => ({
            id: sms._id,
            address: sms.address,
            body: sms.body,
            date: Number(sms.date),
          }));
          resolve(mapped);
        } catch (e) {
          reject(new Error('Failed to parse SMS JSON from native module'));
        }
      }
    );
  });
}

/**
 * High-level Generator to stream batches of SMS
 */
export async function* readMpesaSmsBatched(
  opts: { fromDate?: number } = {}
): AsyncGenerator<RawSms[]> {
  if (Platform.OS !== 'android') return;

  // Ensure we have permissions before attempting to read
  const hasPermission = await PermissionsAndroid.check(SMS_PERMISSION);
  if (!hasPermission) throw new Error('SMS Permission not granted');

  let indexFrom = 0;
  let hasMore = true;

  while (hasMore) {
    try {
      const batch = await fetchSmsBatch({
        fromDate: opts.fromDate,
        indexFrom,
      });

      if (batch.length === 0) {
        hasMore = false;
        break;
      }

      yield batch;

      // If we got fewer results than requested, we've hit the end of the inbox
      if (batch.length < BATCH_SIZE) {
        hasMore = false;
      } else {
        indexFrom += BATCH_SIZE;
      }
    } catch (error) {
      console.error('[SMS_READER_ERROR]', error);
      hasMore = false; // Stop on error to prevent infinite loops
    }
  }
}