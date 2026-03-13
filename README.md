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

## 📄 **License**
MIT
---

