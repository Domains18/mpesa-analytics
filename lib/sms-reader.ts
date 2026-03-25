import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import { RawSms } from '@/types/transaction';
import { insertTransactions, logSync } from '@/lib/database';
import { parseMpesaBatch } from '@/lib/mpesa-parser';

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

export const openAppSettings = () => Linking.openSettings();

/**
 * Checks / requests READ_SMS. The onboarding screen handles the initial
 * prompt, so this path (sync button) skips any pre-alert and goes straight
 * to the system dialog. If the user previously denied with "Don't ask again"
 * we surface a Settings shortcut.
 */
export async function requestSmsPermission(): Promise<SmsPermissionStatus> {
  if (Platform.OS !== 'android') return 'unavailable';

  const hasPermission = await PermissionsAndroid.check(SMS_PERMISSION);
  if (hasPermission) return 'granted';

  const result = await PermissionsAndroid.request(SMS_PERMISSION);

  if (result === PermissionsAndroid.RESULTS.GRANTED) return 'granted';

  if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    return new Promise((resolve) => {
      Alert.alert(
        'Permission Required',
        'SMS access was blocked. Please enable it in Settings to sync your M-Pesa transactions.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve('never_ask_again') },
          { text: 'Open Settings', onPress: () => { openAppSettings(); resolve('never_ask_again'); } },
        ],
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

/**
 * Sync all MPESA SMS messages by reading batches, parsing, and storing them.
 * This function iterates over all batches provided by readMpesaSmsBatched(),
 * parses each batch into transactions, inserts them into the database, and
 * logs the synchronization result.
 */
export async function syncAllMpesaSms(): Promise<void> {
  let totalImported = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  let batchCount = 0;

  for await (const batch of readMpesaSmsBatched()) {
    batchCount++;
    const { parsed, failed } = parseMpesaBatch(batch);
    const result = await insertTransactions(parsed);
    totalImported += result.imported;
    totalSkipped += result.skipped;
    totalFailed += failed;
  }

  await logSync(totalImported, totalSkipped, totalFailed);
  console.log(`[MPESA_SYNC] Completed ${batchCount} batches: imported=${totalImported}, skipped=${totalSkipped}, failed=${totalFailed}`);
}