# M-Pesa SMS Analytics

**Android app that reads M-Pesa SMS messages and provides financial analytics.**

---

## 🎯 **Project Goal**

Parse M-Pesa transaction SMS messages and generate:
- Transaction history
- Spending analytics
- Cash flow tracking
- Merchant insights
- Balance trends

---

## 🏗️ **Tech Stack**

- **React Native** (Expo + TypeScript)
- **SQLite** (Local database via expo-sqlite)
- **React Native Paper** (Material Design UI)
- **React Native Chart Kit** (Visualizations - upcoming)

---

## 📊 **Features**

### ✅ Completed (MVP - Week 1)
- [x] Project setup
- [x] M-Pesa message parser (8 transaction types)
- [x] Parser unit tests (100% coverage)
- [x] SMS access service (READ_SMS permission)
- [x] SQLite database service (full CRUD operations)
- [x] Sync service (orchestrate SMS → Parser → Database)
- [x] Analytics service (stats, cash flow, merchants)
- [x] Dashboard UI (balance, stats, recent transactions)
- [x] Pull-to-refresh
- [x] Initial sync prompt

### 🚧 In Progress (Week 2)
- [ ] Transaction list screen (with search & filter)
- [ ] Analytics screen (charts & visualizations)
- [ ] Settings screen
- [ ] Navigation (bottom tabs)

### Phase 2 (Week 3-4)
- [ ] Category auto-detection
- [ ] Merchant tracking & insights
- [ ] Advanced analytics (spending trends, predictions)
- [ ] Export to CSV/PDF
- [ ] Dark mode

---

## 🔧 **Development**

### Setup

```bash
cd mpesa-analytics
npm install
```

### Run

```bash
# Android (Recommended - full SMS access)
npm run android

# iOS (Limited - no SMS access)
npm run ios

# Web (For testing UI only - no SMS)
npm run web
```

### Test

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

### Build

```bash
# Development build
npx expo run:android

# Production build
eas build --platform android
```

---

## 📁 **Project Structure**

```
src/
├── types/
│   └── index.ts              # TypeScript interfaces ✅
├── services/
│   ├── parserService.ts      # M-Pesa message parser ✅
│   ├── smsService.ts         # SMS access ✅
│   ├── dbService.ts          # SQLite operations ✅
│   ├── syncService.ts        # Sync orchestration ✅
│   └── analyticsService.ts   # Analytics engine ✅
├── screens/
│   ├── Dashboard.tsx         # Home screen ✅
│   ├── Transactions.tsx      # Transaction list (TODO)
│   ├── Analytics.tsx         # Charts & insights (TODO)
│   └── Settings.tsx          # Settings (TODO)
├── components/
│   ├── TransactionCard.tsx   # Transaction list item (TODO)
│   ├── Chart.tsx             # Chart components (TODO)
│   └── StatsCard.tsx         # Stats display (TODO)
└── navigation/
    └── AppNavigator.tsx      # Navigation setup (TODO)
```

---

## 📱 **Supported M-Pesa Transaction Types**

1. ✅ **Received Money** (P2P / C2B)
2. ✅ **Sent Money** (P2P)
3. ✅ **Buy Goods** (Till Number)
4. ✅ **Pay Bill** (Paybill)
5. ✅ **Withdraw Cash** (Agent)
6. ✅ **Deposit Cash** (Agent)
7. ✅ **Airtime Purchase**
8. ✅ **Lipa na M-PESA** (STK Push)

---

## 🔒 **Privacy & Security**

- **Local-only:** All data stored on device (SQLite)
- **No cloud sync:** No backend, no data transmission
- **SMS filtering:** Only reads M-PESA messages (sender: "MPESA")
- **Permission:** Requires READ_SMS (Android only)
- **Transparent:** Clear permission request with explanation

---

## 🚀 **Progress**

**Week 1 (Current - Day 1):**
- [x] Project initialized ✅
- [x] Dependencies installed ✅
- [x] TypeScript types defined ✅
- [x] M-Pesa message parser implemented ✅
- [x] Parser unit tests (100% coverage) ✅
- [x] SMS access service ✅
- [x] SQLite database service ✅
- [x] Sync service ✅
- [x] Analytics service ✅
- [x] Dashboard UI ✅

**Next (Day 2):**
- [ ] Transaction list screen
- [ ] Analytics screen with charts
- [ ] Bottom tab navigation
- [ ] Settings screen

**Week 2:**
- [ ] Polish UI/UX
- [ ] Add loading states
- [ ] Error handling improvements
- [ ] Chart visualizations

---

## 🎨 **UI Screenshots**

### Dashboard
- **Balance Card:** Shows current M-Pesa balance
- **Stats Cards:** Total income, expenses, net change
- **Recent Transactions:** Last 5 transactions
- **Sync Button:** Sync M-Pesa messages on demand

---

## 📊 **Analytics Capabilities**

### Implemented
- ✅ Transaction statistics (income, expenses, net, count)
- ✅ Recent transactions
- ✅ Current balance tracking
- ✅ Transaction deduplication
- ✅ Date range queries

### Upcoming
- 📈 Cash flow charts (daily/weekly/monthly)
- 📊 Top merchants by spending
- 🎯 Spending by category
- 📉 Balance trends over time
- 🔍 Advanced search & filtering

---

## 🛠️ **How It Works**

1. **SMS Access:** App requests READ_SMS permission
2. **Read Messages:** Filters and reads only M-Pesa messages
3. **Parse:** Extracts transaction data using regex patterns
4. **Store:** Saves to local SQLite database
5. **Deduplicate:** Prevents duplicate transactions
6. **Analyze:** Generates insights and statistics
7. **Display:** Beautiful UI with Material Design

---

## 📝 **Testing**

### Parser Tests
```bash
npm test
```

**Coverage:**
- ✅ All 8 transaction types
- ✅ Edge cases (whitespace, malformed messages)
- ✅ Transaction ID generation
- ✅ Date/time parsing

### Manual Testing Checklist
- [ ] SMS permission request
- [ ] Initial sync prompt
- [ ] Full sync (all messages)
- [ ] Incremental sync (new messages only)
- [ ] Dashboard stats update
- [ ] Pull-to-refresh
- [ ] Transaction list display
- [ ] Error handling

---

## 🐛 **Known Issues**

- None yet! (Fresh build)

---

## 🔮 **Future Enhancements**

- 📲 Push notifications for new M-Pesa transactions
- 🔄 Background sync
- 📤 Export data (CSV, PDF, Excel)
- 🎨 Dark mode
- 🔍 Advanced search & filtering
- 📊 More chart types
- 🤖 AI-powered insights
- 💾 Cloud backup (optional)
- 👥 Multi-device sync (optional)

---

## 📄 **License**

Personal use only.

---

**Author:** Gibson  
**Assistant:** Selene 🌙  
**Date:** 2026-03-14  
**Status:** ✅ MVP Ready for Testing!
