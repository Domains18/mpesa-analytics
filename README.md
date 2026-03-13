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
- **SQLite** (Local database)
- **React Native Paper** (Material Design UI)
- **React Native Chart Kit** (Visualizations)

---

## 📊 **Features**

### MVP (Week 1-3)
- [x] Project setup
- [x] M-Pesa message parser (8 transaction types)
- [x] Parser unit tests
- [ ] SMS access (Android READ_SMS permission)
- [ ] SQLite database service
- [ ] Transaction list screen
- [ ] Dashboard with basic analytics
- [ ] Charts (cash flow, spending by merchant)

### Phase 2 (Week 4-5)
- [ ] Category auto-detection
- [ ] Merchant tracking
- [ ] Advanced analytics (insights, trends)
- [ ] Export to CSV/PDF
- [ ] Settings & preferences

---

## 🔧 **Development**

### Setup

```bash
cd mpesa-analytics
npm install
```

### Run

```bash
# Android
npm run android

# iOS (limited - no SMS access)
npm run ios

# Web (for testing UI)
npm run web
```

### Test

```bash
npm test
```

---

## 📁 **Project Structure**

```
src/
├── types/
│   └── index.ts              # TypeScript interfaces
├── services/
│   ├── parserService.ts      # M-Pesa message parser ✅
│   ├── smsService.ts         # SMS access (TODO)
│   ├── dbService.ts          # SQLite operations (TODO)
│   └── analyticsService.ts   # Analytics engine (TODO)
├── screens/
│   ├── Dashboard.tsx         # Home screen (TODO)
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

---

## 🚀 **Progress**

**Week 1 (Current):**
- [x] Project initialized ✅
- [x] Dependencies installed ✅
- [x] TypeScript types defined ✅
- [x] M-Pesa message parser implemented ✅
- [x] Parser unit tests (100% coverage) ✅
- [ ] SMS access service
- [ ] SQLite database service

**Next:**
- Implement SMS access (react-native-get-sms-android)
- Build SQLite database service
- Create basic UI (Dashboard + Transaction list)

---

## 📝 **Notes**

- **Platform:** Android-only (iOS SMS access severely limited)
- **Scope:** Personal use (no multi-user, no auth)
- **Storage:** SQLite (local-first, no cloud)
- **Testing:** Unit tests with Jest + React Native Testing Library

---

**Author:** Gibson  
**Assistant:** Selene 🌙  
**Date:** 2026-03-14  
**Status:** 🚧 In Development (Week 1)
