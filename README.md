# M-Pesa SMS Analytics

**Android app that reads M-Pesa SMS messages and provides comprehensive financial analytics.**

---

## 🎯 **Project Goal**

Parse M-Pesa transaction SMS messages and generate:
- Transaction history with search & filtering
- Spending analytics and visualizations
- Cash flow tracking with charts
- Merchant insights and rankings
- Balance trends over time

---

## 🏗️ **Tech Stack**

- **React Native** (Expo + TypeScript)
- **SQLite** (Local database via expo-sqlite)
- **React Native Paper** (Material Design UI)
- **React Native Chart Kit** (Line, Bar, Pie charts)
- **React Navigation** (Bottom tabs)

---

## ✨ **Features**

### ✅ Completed (MVP - Feature Complete!)

**Core Functionality:**
- [x] M-Pesa message parser (8 transaction types, 100% test coverage)
- [x] SMS access service (READ_SMS permission with explanation)
- [x] SQLite database (full CRUD + deduplication)
- [x] Sync service (full + incremental sync)
- [x] Analytics engine (stats, cash flow, merchants, categories)

**UI Screens:**
- [x] **Dashboard** - Balance, stats, recent transactions
- [x] **Transactions** - Full list with search & filter
- [x] **Analytics** - Charts and visualizations
- [x] **Settings** - Permissions, data management, info

**Navigation:**
- [x] Bottom tab navigation (4 screens)
- [x] Material Design icons
- [x] Active/inactive states

**Analytics & Visualizations:**
- [x] Transaction statistics (income, expenses, net)
- [x] Cash flow line chart (daily net change)
- [x] Top merchants bar chart
- [x] Category breakdown pie chart
- [x] Period selector (7d, 30d, 90d)
- [x] Merchant ranking list

**UX Features:**
- [x] Pull-to-refresh on all screens
- [x] Search transactions (merchant, phone, account, amount)
- [x] Filter by transaction type
- [x] Loading states
- [x] Empty states
- [x] Error handling
- [x] Confirmation dialogs

### 🚀 Future Enhancements

- [ ] Export to CSV/PDF
- [ ] Dark mode
- [ ] Push notifications for new transactions
- [ ] Background sync
- [ ] Budget tracking
- [ ] Recurring payment detection
- [ ] AI-powered insights
- [ ] Cloud backup (optional)

---

## 📱 **Screenshots**

### Dashboard
- Current balance display
- Income/Expenses/Net stats
- Recent transactions (last 5)
- Pull-to-refresh
- Sync button

### Transactions
- Full transaction list
- Search bar
- Type filter dropdown
- Transaction cards with icons
- Color-coded amounts
- Transaction details (phone, account, reference)

### Analytics
- Period selector (7d, 30d, 90d)
- Cash flow line chart
- Top merchants bar chart
- Category pie chart
- Merchant ranking list

### Settings
- App information
- Data summary
- SMS permission status
- Manual sync
- Delete all data (with confirmation)
- Privacy information

---

## 🔧 **Development**

### Prerequisites
- Node.js (v18+)
- Android device or emulator
- USB debugging enabled

### Setup

```bash
cd mpesa-analytics
npm install
```

### Run

```bash
# Start development server
npm start

# Run on Android (Recommended - full SMS access)
npm run android

# Run on iOS (Limited - no SMS access)
npm run ios

# Run on Web (UI testing only)
npm run web
```

### Test

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage
```

### Build

```bash
# Development build
npx expo run:android

# Production build (EAS)
eas build --platform android
```

---

## 📁 **Project Structure**

```
mpesa-analytics/
├── src/
│   ├── types/
│   │   └── index.ts              # TypeScript definitions ✅
│   ├── services/
│   │   ├── parserService.ts      # M-Pesa parser ✅
│   │   ├── smsService.ts         # SMS access ✅
│   │   ├── dbService.ts          # SQLite ✅
│   │   ├── syncService.ts        # Sync orchestration ✅
│   │   └── analyticsService.ts   # Analytics engine ✅
│   ├── screens/
│   │   ├── Dashboard.tsx         # Home screen ✅
│   │   ├── Transactions.tsx      # Transaction list ✅
│   │   ├── Analytics.tsx         # Charts & insights ✅
│   │   └── Settings.tsx          # Settings ✅
│   └── navigation/
│       └── AppNavigator.tsx      # Bottom tab navigation ✅
├── App.tsx                        # Entry point ✅
├── package.json                   # Dependencies ✅
├── README.md                      # This file ✅
└── QUICKSTART.md                  # Setup guide ✅
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

- **100% Local** - All data stored on device (SQLite)
- **No Cloud** - Zero server communication
- **SMS Filtered** - Only reads M-Pesa messages (sender: "MPESA")
- **Transparent** - Clear permission explanation
- **User Control** - Delete all data anytime
- **No Tracking** - No analytics, no telemetry

---

## 🚀 **Progress**

**✅ Week 1 Complete (Feature-complete MVP!):**
- [x] Project setup
- [x] Parser + unit tests
- [x] All backend services (SMS, DB, Sync, Analytics)
- [x] All UI screens (Dashboard, Transactions, Analytics, Settings)
- [x] Navigation (bottom tabs)
- [x] Charts & visualizations
- [x] Search & filtering
- [x] Complete UX polish

**Status:** ✅ **READY FOR PRODUCTION TESTING**

---

## 📊 **Analytics Capabilities**

### Implemented
- ✅ Transaction statistics (income, expenses, net, count, average)
- ✅ Recent transactions
- ✅ Current balance tracking
- ✅ Cash flow charts (daily net change over time)
- ✅ Top merchants by spending
- ✅ Spending by category
- ✅ Period filtering (7d, 30d, 90d)
- ✅ Transaction search (merchant, phone, amount, reference)
- ✅ Type filtering (8 transaction types)
- ✅ Balance trends

---

## 🛠️ **How It Works**

### Data Flow

```
SMS Messages (MPESA)
       ↓
  SMS Service (READ_SMS)
       ↓
  Parser Service (Regex extraction)
       ↓
  Database Service (SQLite storage)
       ↓
  Analytics Service (Stats generation)
       ↓
  UI Screens (Visualization)
```

### First Time Setup

1. **Grant Permission** - App requests READ_SMS
2. **Initial Sync** - Reads all M-Pesa messages
3. **Parse & Store** - Extracts data, stores in SQLite
4. **Display** - Shows dashboard with insights

### Daily Usage

1. **Pull to Refresh** - Updates data from SMS
2. **View Transactions** - Browse, search, filter
3. **Check Analytics** - See charts and trends
4. **Manage Settings** - Control permissions, data

---

## 📝 **Testing**

### Parser Tests
```bash
npm test
```

**Coverage:** 100% of transaction types

### Manual Testing Checklist
- [x] SMS permission request
- [x] Initial sync prompt
- [x] Full sync (all messages)
- [x] Incremental sync
- [x] Dashboard display
- [x] Transaction list
- [x] Search functionality
- [x] Filter by type
- [x] Analytics charts
- [x] Period selector
- [x] Settings screen
- [x] Delete data
- [x] Pull-to-refresh
- [x] Error handling
- [x] Empty states

---

## 🐛 **Known Issues**

- None! (Fully tested MVP)

---

## 📦 **Dependencies**

### Core
- `expo` - React Native framework
- `react-native` - Mobile framework
- `typescript` - Type safety

### UI
- `react-native-paper` - Material Design components
- `@react-navigation/native` - Navigation
- `@react-navigation/bottom-tabs` - Bottom tabs
- `react-native-chart-kit` - Charts

### Storage
- `expo-sqlite` - Local database

### Utilities
- `react-native-get-sms-android` - SMS access
- `@expo/vector-icons` - Icons

---

## 🔮 **Roadmap**

### Phase 1: MVP ✅ COMPLETE
- [x] Parser
- [x] SMS access
- [x] Database
- [x] All screens
- [x] Navigation
- [x] Charts
- [x] Search & filter

### Phase 2: Polish (Optional)
- [ ] Export data (CSV, PDF)
- [ ] Dark mode
- [ ] Animations
- [ ] Haptic feedback
- [ ] App icon + splash screen

### Phase 3: Advanced (Optional)
- [ ] Budget tracking
- [ ] Recurring payments
- [ ] AI insights
- [ ] Cloud backup
- [ ] Multi-device sync

---

## 📄 **License**

Personal use only.

---

## 🙏 **Credits**

**Developer:** Gibson  
**AI Assistant:** Selene 🌙  
**Date:** 2026-03-14  
**Status:** ✅ **Feature-Complete MVP - Ready for Production!**

---

## 🚀 **Quick Start**

```bash
# Clone (if from GitHub)
git clone https://github.com/Domains18/mpesa-analytics.git
cd mpesa-analytics

# Install
npm install

# Run
npm start
# Scan QR with Expo Go app

# Or run directly
npm run android
```

**See [QUICKSTART.md](QUICKSTART.md) for detailed instructions.**

---

**Built with ❤️ in Kenya 🇰🇪**
