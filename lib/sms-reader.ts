import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import { RawSms } from './mpesa-parser';

// Type declaration for react-native-get-sms-android
declare module 'react-native-get-sms-android' {
  type FailCallback = (error: string) => void;
  type SuccessCallback = (count: number, smsList: string) => void;
  function list(filter: string, fail: FailCallback, success: SuccessCallback): void;
}

export type SmsPermissionStatus =
  | 'granted'
  | 'denied'
  | 'never_ask_again'
  | 'unavailable';

export function openAppSettings(): void {
  Linking.openSettings();
}

/**
 * Request READ_SMS with an explanation Alert first, so the user understands
 * why the permission is needed before the OS dialog appears.
 * If previously denied (no dialog possible), guides the user to Settings.
 */
export function requestSmsPermission(): Promise<SmsPermissionStatus> {
  if (Platform.OS !== 'android') return Promise.resolve('unavailable');

  return new Promise(async (resolve) => {
    // Already granted — nothing to do
    const alreadyGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_SMS
    );
    if (alreadyGranted) {
      resolve('granted');
      return;
    }

    // Show a pre-request explanation first so the user isn't surprised
    Alert.alert(
      'Allow SMS Access',
      'M-Pesa Analytics needs to read your SMS inbox to import your M-Pesa transactions automatically.\n\nOnly messages from MPESA are read — no other SMS is accessed.',
      [
        {
          text: 'Not Now',
          style: 'cancel',
          onPress: () => resolve('denied'),
        },
        {
          text: 'Continue',
          onPress: async () => {
            const result = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.READ_SMS,
              {
                title: 'SMS Permission',
                message: 'Allow M-Pesa Analytics to read SMS messages.',
                buttonPositive: 'Allow',
                buttonNegative: 'Deny',
              }
            );

            if (result === PermissionsAndroid.RESULTS.GRANTED) {
              resolve('granted');
              return;
            }

            // Permission blocked — OS won't show dialog again.
            // Guide user to enable it manually in Settings.
            const status =
              result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
                ? 'never_ask_again'
                : 'denied';

            if (status === 'never_ask_again') {
              Alert.alert(
                'Permission Required',
                'SMS permission was blocked. To enable it, open Android Settings → Apps → M-Pesa Analytics → Permissions → SMS → Allow.',
                [
                  { text: 'Cancel', style: 'cancel', onPress: () => resolve('never_ask_again') },
                  {
                    text: 'Open Settings',
                    onPress: () => {
                      Linking.openSettings();
                      resolve('never_ask_again');
                    },
                  },
                ]
              );
            } else {
              resolve('denied');
            }
          },
        },
      ]
    );
  });
}

interface RawAndroidSms {
  _id: string;
  address: string;
  body: string;
  date: string;
}

/**
 * Read M-Pesa SMS from Android inbox. Caller must ensure READ_SMS is granted.
 * Returns [] on iOS/web.
 */
export function readMpesaSms(opts: { fromDate?: number } = {}): Promise<RawSms[]> {
  if (Platform.OS !== 'android') return Promise.resolve([]);

  return new Promise((resolve, reject) => {
    const SmsAndroid = require('react-native-get-sms-android');

    const filter: Record<string, unknown> = {
      box: 'inbox',
      maxCount: 2000,
      // 'MPESA' is the standard sender name on Safaricom Kenya
      address: 'MPESA',
    };

    if (opts.fromDate) {
      filter.minDate = opts.fromDate;
    }
    
    SmsAndroid.list(
      JSON.stringify(filter),
      (err: string) => reject(new Error(`SMS read failed: ${err}`)),
      (_count: number, smsList: string) => {
        try {
          const raw: RawAndroidSms[] = JSON.parse(smsList);
          resolve(
            raw.map((s) => ({
              id: s._id,
              address: s.address,
              body: s.body,
              date: parseInt(s.date, 10),
            }))
          );
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}
