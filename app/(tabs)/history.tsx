import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, Fonts } from '@/constants/theme';
import { useApp } from '@/store/app-context';
import { Transaction, TransactionType } from '@/types/transaction';
import { useMemo, useState } from 'react';
import { monthlyTrend, computeSummary } from '@/lib/analytics';

// ─── Period ───────────────────────────────────────────────────────────────────

type PeriodKey = '3m' | '6m' | '1y' | 'all';

const PERIODS: { label: string; key: PeriodKey }[] = [
  { label: '3M',  key: '3m'  },
  { label: '6M',  key: '6m'  },
  { label: '1Y',  key: '1y'  },
  { label: 'All', key: 'all' },
];

function getPeriodMonths(key: PeriodKey, transactions: Transaction[]): number {
  if (key === '3m') return 3;
  if (key === '6m') return 6;
  if (key === '1y') return 12;
  // 'all': derive from oldest transaction, capped at 36 months for chart readability
  if (!transactions.length) return 6;
  const oldest = Math.min(...transactions.map((t) => t.date));
  return Math.max(3, Math.min(Math.ceil((Date.now() - oldest) / (30 * 86400000)) + 1, 36));
}

function getPeriodStart(key: PeriodKey): number {
  if (key === 'all') return 0;
  const months = key === '3m' ? 3 : key === '6m' ? 6 : 12;
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// ─── Trend Chart ──────────────────────────────────────────────────────────────
// Dual-line chart (inflow + outflow) rendered with absolutely-positioned
// rotated Views — same technique as the home screen line chart, no SVG needed.

const CH = 110; // chart area height in px
const DR = 3;   // dot radius

type Pt = { x: number; y: number };

function lineSegments(pts: Pt[], color: string, prefix: string) {
  return pts.slice(0, -1).map((a, i) => {
    const b = pts[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    return (
      <View
        key={`${prefix}-s${i}`}
        style={{
          position: 'absolute',
          left: (a.x + b.x) / 2 - len / 2,
          top:  (a.y + b.y) / 2 - 1,
          width: len, height: 2, borderRadius: 1,
          backgroundColor: color,
          transform: [{ rotate: `${angle}deg` }],
        }}
      />
    );
  });
}

function lineDots(pts: Pt[], color: string, prefix: string) {
  return pts.map((p, i) => (
    <View
      key={`${prefix}-d${i}`}
      style={{
        position: 'absolute',
        left: p.x - DR, top: p.y - DR,
        width: DR * 2, height: DR * 2, borderRadius: DR,
        backgroundColor: Colors.surfaceContainerLowest,
        borderWidth: 1.5, borderColor: color,
      }}
    />
  ));
}

function TrendLineChart({ data }: { data: { month: string; received: number; sent: number }[] }) {
  const [w, setW] = useState(0);
  const n = data.length;
  const PAD = DR + 2;

  const maxVal = Math.max(...data.flatMap((d) => [d.received, d.sent]), 1);
  const toX = (i: number) => (n > 1 ? PAD + (i / (n - 1)) * (w - PAD * 2) : w / 2);
  const toY = (v: number) => CH - Math.max(DR * 2, (v / maxVal) * CH);

  const recvPts: Pt[] = w > 0 ? data.map((d, i) => ({ x: toX(i), y: toY(d.received) })) : [];
  const sentPts: Pt[] = w > 0 ? data.map((d, i) => ({ x: toX(i), y: toY(d.sent) }))     : [];

  // Skip labels when there are many months to avoid crowding
  const step = n <= 6 ? 1 : n <= 12 ? 2 : 3;

  return (
    <View style={{ height: CH + 24 }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && n > 1 && (
        <>
          {lineSegments(recvPts, Colors.primary, 'r')}
          {lineSegments(sentPts, Colors.error,   's')}
          {lineDots(recvPts, Colors.primary, 'r')}
          {lineDots(sentPts, Colors.error,   's')}
          {data.map((d, i) => {
            if (i % step !== 0 && i !== n - 1) return null;
            return (
              <Text
                key={`lbl-${i}`}
                style={{
                  position: 'absolute',
                  left: toX(i) - 14, top: CH + 6,
                  width: 28, textAlign: 'center',
                  fontFamily: Fonts.inter.medium, fontSize: 10,
                  color: Colors.outlineVariant,
                }}
              >
                {d.month}
              </Text>
            );
          })}
        </>
      )}
    </View>
  );
}

// ─── Type filter config ───────────────────────────────────────────────────────

const TYPE_FILTERS: { label: string; type: TransactionType | 'all' }[] = [
  { label: 'All',         type: 'all'        },
  { label: 'Received',    type: 'received'   },
  { label: 'Sent',        type: 'sent'       },
  { label: 'Payments',    type: 'payment'    },
  { label: 'Withdrawals', type: 'withdrawal' },
];

const TYPE_CONFIG: Record<TransactionType, { icon: string; color: string; sign: '+' | '-' }> = {
  received:   { icon: 'call-received',   color: Colors.primary,   sign: '+' },
  deposit:    { icon: 'call-received',   color: Colors.primary,   sign: '+' },
  reversal:   { icon: 'undo',            color: Colors.primary,   sign: '+' },
  sent:       { icon: 'call-made',       color: Colors.error,     sign: '-' },
  payment:    { icon: 'payment',         color: Colors.secondary, sign: '-' },
  withdrawal: { icon: 'atm',             color: Colors.error,     sign: '-' },
  airtime:    { icon: 'phone-android',   color: Colors.tertiary,  sign: '-' },
  fuliza:     { icon: 'account-balance', color: Colors.error,     sign: '-' },
  unknown:    { icon: 'help-outline',    color: Colors.outline,   sign: '-' },
};

function fmt(n: number) {
  return `Ksh ${n.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-KE', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const { transactions, loading } = useApp();

  const [period,       setPeriod]       = useState<PeriodKey>('3m');
  const [activeFilter, setActiveFilter] = useState<TransactionType | 'all'>('all');
  const [search,       setSearch]       = useState('');

  // Transactions within the selected period
  const periodTxs = useMemo(() => {
    const start = getPeriodStart(period);
    return transactions.filter((t) => t.date >= start);
  }, [transactions, period]);

  // Summary stats for the period (In / Out / Net)
  const summary = useMemo(() => computeSummary(periodTxs), [periodTxs]);

  // Monthly trend points for the dual-line chart
  const trendData = useMemo(
    () => monthlyTrend(transactions, getPeriodMonths(period, transactions)),
    [transactions, period],
  );

  const hasChartData = trendData.some((d) => d.received > 0 || d.sent > 0);

  // Period → type → search
  const filtered = useMemo(() => {
    let txs = periodTxs;
    if (activeFilter !== 'all') txs = txs.filter((t) => t.type === activeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      txs = txs.filter(
        (t) => t.party.toLowerCase().includes(q) || t.ref.toLowerCase().includes(q),
      );
    }
    return txs;
  }, [periodTxs, activeFilter, search]);

  // Group filtered transactions by calendar day
  const grouped = useMemo(() => {
    const groups: { date: string; txs: Transaction[] }[] = [];
    let cur = '';
    for (const tx of filtered) {
      const label = new Date(tx.date).toLocaleDateString('en-KE', {
        weekday: 'short', month: 'short', day: 'numeric',
      });
      if (label !== cur) { cur = label; groups.push({ date: label, txs: [] }); }
      groups[groups.length - 1].txs.push(tx);
    }
    return groups;
  }, [filtered]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <View style={styles.headerCount}>
          <Text style={styles.headerCountText}>{filtered.length}</Text>
        </View>
      </View>

      {/* ── Period tabs (sticky) ── */}
      <View style={styles.periodRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodBtn, period === p.key && styles.periodBtnActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Search (sticky) ── */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={18} color={Colors.outline} />
          <TextInput
            placeholder="Search by name or reference..."
            placeholderTextColor={Colors.outline}
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialIcons name="close" size={16} color={Colors.outline} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Chart card ── */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Amount Over Time</Text>
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
                <Text style={styles.legendText}>In</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.error }]} />
                <Text style={styles.legendText}>Out</Text>
              </View>
            </View>
          </View>

          {loading ? (
            <View style={styles.chartEmpty}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : !hasChartData ? (
            <View style={styles.chartEmpty}>
              <Text style={styles.chartEmptyText}>No data for this period</Text>
            </View>
          ) : (
            <TrendLineChart data={trendData} />
          )}
        </View>

        {/* ── Period summary strip ── */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>In</Text>
            <Text style={[styles.summaryValue, styles.summaryIn]} numberOfLines={1}>
              {fmt(summary.totalReceived)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Out</Text>
            <Text style={[styles.summaryValue, styles.summaryOut]} numberOfLines={1}>
              {fmt(summary.totalSent)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Net</Text>
            <Text
              style={[
                styles.summaryValue,
                summary.netBalance < 0 ? styles.summaryOut : styles.summaryIn,
              ]}
              numberOfLines={1}
            >
              {fmt(summary.netBalance)}
            </Text>
          </View>
        </View>

        {/* ── Type filter chips ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {TYPE_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.label}
              style={[styles.filterChip, activeFilter === f.type && styles.filterChipActive]}
              onPress={() => setActiveFilter(f.type)}
            >
              <Text style={[styles.filterText, activeFilter === f.type && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Transaction list ── */}
        <View style={styles.body}>
          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 40 }} />
          ) : filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="receipt-long" size={40} color={Colors.outlineVariant} />
              <Text style={styles.emptyTitle}>No transactions</Text>
              <Text style={styles.emptyText}>
                {transactions.length === 0
                  ? 'Sync your M-Pesa SMS from the Home tab to get started'
                  : 'No transactions match your filters'}
              </Text>
            </View>
          ) : (
            grouped.map((group) => (
              <View key={group.date}>
                <Text style={styles.dayLabel}>{group.date}</Text>
                <View style={styles.listCard}>
                  {group.txs.map((tx, i) => {
                    const conf = TYPE_CONFIG[tx.type] ?? TYPE_CONFIG.unknown;
                    return (
                      <TouchableOpacity
                        key={tx.id}
                        style={[styles.txRow, i < group.txs.length - 1 && styles.txRowBorder]}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.txIcon, { backgroundColor: `${conf.color}15` }]}>
                          <MaterialIcons name={conf.icon as any} size={18} color={conf.color} />
                        </View>
                        <View style={styles.txInfo}>
                          <Text style={styles.txName} numberOfLines={1}>{tx.party}</Text>
                          <View style={styles.txMeta}>
                            <Text style={styles.txRef}>{tx.ref}</Text>
                            {tx.category ? (
                              <View style={styles.catBadge}>
                                <Text style={styles.catText}>{tx.category}</Text>
                              </View>
                            ) : (
                              <View style={styles.catBadgeUncategorized}>
                                <Text style={styles.catTextUncategorized}>Uncategorized</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.txDate}>{fmtDate(tx.date)}</Text>
                        </View>
                        <View style={styles.txRight}>
                          <Text style={[styles.txAmount, { color: conf.color }]}>
                            {conf.sign}{fmt(tx.amount)}
                          </Text>
                          {tx.cost > 0 && (
                            <Text style={styles.txFee}>Fee: {fmt(tx.cost)}</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: Colors.surfaceContainerLowest, gap: 10,
  },
  headerTitle:     { flex: 1, fontFamily: Fonts.manrope.bold, fontSize: 18, color: Colors.onSurface },
  headerCount:     { backgroundColor: Colors.surfaceContainerLow, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  headerCountText: { fontFamily: Fonts.inter.semiBold, fontSize: 13, color: Colors.onSurfaceVariant },

  periodRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainerLow,
  },
  periodBtn:        { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 10, backgroundColor: Colors.surfaceContainerLow },
  periodBtnActive:  { backgroundColor: Colors.primary },
  periodText:       { fontFamily: Fonts.inter.semiBold, fontSize: 13, color: Colors.onSurfaceVariant },
  periodTextActive: { color: Colors.white },

  searchWrap: {
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainer,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 8,
  },
  searchInput: { flex: 1, fontFamily: Fonts.inter.regular, fontSize: 14, color: Colors.onSurface, padding: 0 },

  chartCard: {
    margin: 16, marginBottom: 0,
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: 16, padding: 18,
    shadowColor: Colors.onSurface, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  chartHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  chartTitle:     { fontFamily: Fonts.manrope.semiBold, fontSize: 15, color: Colors.onSurface },
  chartEmpty:     { height: CH + 24, alignItems: 'center', justifyContent: 'center' },
  chartEmptyText: { fontFamily: Fonts.inter.regular, fontSize: 13, color: Colors.outlineVariant },
  legend:         { flexDirection: 'row', gap: 12 },
  legendItem:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:      { width: 8, height: 8, borderRadius: 4 },
  legendText:     { fontFamily: Fonts.inter.medium, fontSize: 12, color: Colors.onSurfaceVariant },

  summaryRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 8,
    shadowColor: Colors.onSurface, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  summaryItem:    { flex: 1, alignItems: 'center', gap: 3 },
  summaryDivider: { width: 1, height: 36, backgroundColor: Colors.surfaceContainerLow },
  summaryLabel:   { fontFamily: Fonts.inter.regular, fontSize: 11, color: Colors.onSurfaceVariant },
  summaryValue:   { fontFamily: Fonts.manrope.bold, fontSize: 13, color: Colors.onSurface },
  summaryIn:      { color: Colors.primary },
  summaryOut:     { color: Colors.error },

  filterRow:        { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip:       { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.surfaceContainerLowest, borderWidth: 1, borderColor: Colors.surfaceContainerHigh },
  filterChipActive: { backgroundColor: Colors.primaryFixed, borderColor: Colors.primaryFixed },
  filterText:       { fontFamily: Fonts.inter.medium, fontSize: 13, color: Colors.onSurfaceVariant },
  filterTextActive: { color: Colors.primary, fontFamily: Fonts.inter.semiBold },

  body:       { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle: { fontFamily: Fonts.manrope.bold, fontSize: 18, color: Colors.onSurface },
  emptyText:  { fontFamily: Fonts.inter.regular, fontSize: 14, color: Colors.onSurfaceVariant, textAlign: 'center', paddingHorizontal: 32 },
  dayLabel:   { fontFamily: Fonts.inter.semiBold, fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 8, marginBottom: 6, paddingLeft: 4 },
  listCard:   { backgroundColor: Colors.surfaceContainerLowest, borderRadius: 16, paddingVertical: 4, shadowColor: Colors.onSurface, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  txRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  txRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainerLow },
  txIcon:      { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txInfo:      { flex: 1, gap: 2 },
  txName:      { fontFamily: Fonts.inter.semiBold, fontSize: 13, color: Colors.onSurface },
  txMeta:      { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  txRef:       { fontFamily: Fonts.inter.regular, fontSize: 10, color: Colors.outlineVariant },
  txDate:      { fontFamily: Fonts.inter.regular, fontSize: 11, color: Colors.outlineVariant },
  catBadge:              { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: Colors.primaryFixed },
  catBadgeUncategorized: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: Colors.surfaceContainerHigh },
  catText:               { fontFamily: Fonts.inter.medium, fontSize: 10, color: Colors.primary },
  catTextUncategorized:  { fontFamily: Fonts.inter.medium, fontSize: 10, color: Colors.onSurfaceVariant },
  txRight:  { alignItems: 'flex-end', gap: 2 },
  txAmount: { fontFamily: Fonts.manrope.bold, fontSize: 13 },
  txFee:    { fontFamily: Fonts.inter.regular, fontSize: 10, color: Colors.outlineVariant },
});
