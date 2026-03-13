# Quick Start Guide

## 🚀 Running the App

### Prerequisites
- Node.js (v18+)
- Android device or emulator
- USB debugging enabled (for physical device)

### Step 1: Install Dependencies
```bash
cd ~/Documents/github/projects/mpesa-analytics
npm install
```

### Step 2: Start Development Server
```bash
npm start
```

This will open Expo Dev Tools in your browser.

### Step 3: Run on Android

**Option A: Physical Device (Recommended)**
1. Install **Expo Go** app from Google Play Store
2. Connect your phone to the same WiFi as your computer
3. Scan the QR code from Expo Dev Tools
4. App will load on your device

**Option B: Android Emulator**
```bash
npm run android
```

**Option C: Direct Build (No Expo Go)**
```bash
npx expo run:android
```

---

## 📱 First Time Setup

### 1. Grant SMS Permission
When you first open the app:
- You'll see a permission request dialog
- Tap **"Allow"** to grant READ_SMS permission
- This is required to read M-Pesa messages

### 2. Initial Sync
After granting permission:
- You'll see a prompt: "Initial Sync Required"
- Tap **"Sync Now"** to read all your M-Pesa messages
- This may take 10-30 seconds depending on message count
- A success dialog will show sync results

### 3. View Dashboard
After sync:
- Current balance displayed at top
- Income/Expenses stats cards
- Recent transactions list
- Pull down to refresh data

---

## 🔧 Troubleshooting

### Permission Denied
If SMS permission is denied:
1. Go to Settings → Apps → M-Pesa Analytics
2. Tap Permissions → SMS
3. Select "Allow"
4. Restart the app

### No Messages Found
If sync returns 0 messages:
- Check that you have M-Pesa messages in your inbox
- Sender must be "MPESA" (case-insensitive)
- Try syncing again

### App Crashes on Launch
1. Clear app data:
   ```bash
   adb shell pm clear com.gibson.mpesaanalytics
   ```
2. Restart the app

### Database Issues
If you see database errors:
1. Reinstall the app
2. Or manually delete database:
   ```bash
   adb shell rm /data/data/com.gibson.mpesaanalytics/databases/mpesa_analytics.db
   ```

---

## 🧪 Testing Without Real Messages

If you don't have M-Pesa messages or want to test with sample data:

### Option 1: Use Test Messages
Create a test script to insert sample transactions:

```typescript
import { DatabaseService } from './src/services/dbService';
import { TransactionType } from './src/types';

const sampleTransactions = [
  {
    type: TransactionType.RECEIVED,
    amount: 5000,
    transactionCost: 0,
    balance: 10000,
    counterparty: 'John Doe',
    phone: '254712345678',
    timestamp: new Date(),
    rawMessage: 'Test message',
  },
  // Add more...
];

async function loadTestData() {
  await DatabaseService.initialize();
  await DatabaseService.insertTransactions(sampleTransactions);
}
```

### Option 2: Use Parser Tests
Run the test suite to see parser in action:
```bash
npm test
```

---

## 📊 What to Expect

### After Initial Sync
- **Dashboard:** Shows balance + stats
- **Recent Transactions:** Last 5 transactions
- **Pull to Refresh:** Updates data
- **Sync Button:** Sync new messages

### Transaction Types Supported
1. Received Money (P2P)
2. Sent Money (P2P)
3. Buy Goods (Till Number)
4. Pay Bill (Paybill)
5. Withdraw Cash (Agent)
6. Deposit Cash (Agent)
7. Airtime Purchase
8. Lipa na M-PESA (STK Push)

### What Gets Stored
- Transaction amount
- Transaction cost
- Balance after transaction
- Merchant/recipient name
- Phone number (if P2P)
- Account number (if Paybill)
- Transaction reference
- Timestamp
- Raw message text

---

## 🔄 Daily Usage

### Sync New Messages
1. Open app
2. Pull down to refresh
3. Or tap "Sync M-Pesa Messages" button

### View Transactions
- Dashboard shows last 5
- (Transaction list screen coming soon)

### Check Balance
- Always displayed at top of Dashboard
- Updates after sync

---

## 🐛 Reporting Issues

If you encounter any issues:
1. Check logs: `npx react-native log-android`
2. Note the error message
3. Check if SMS permission is granted
4. Try resyncing

---

## 📝 Next Steps

After testing the MVP:
- [ ] Test on multiple Android versions
- [ ] Test with large message counts (1000+)
- [ ] Verify parser accuracy
- [ ] Check performance
- [ ] Test sync reliability

---

**Ready to build!** 🚀

To run the app:
```bash
cd ~/Documents/github/projects/mpesa-analytics
npm start
# Then scan QR code with Expo Go app
```
