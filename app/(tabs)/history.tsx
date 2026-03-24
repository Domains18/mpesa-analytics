import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, Fonts } from '@/constants/theme';
import { useApp } from '@/store/app-context';
import { Transaction, TransactionType } from '@/types/transaction';
import { useMemo, useState } from 'react';

const FILTERS: { label: string; type: TransactionType | 'all' }[] = [
  { label: 'All', type: 'all' },
  { label: 'Received', type: 'received' },
  { label: 'Sent', type: 'sent' },
  { label: 'Payments', type: 'payment' },
  { label: 'Withdrawals', type: 'withdrawal' },
];

const TYPE_CONFIG: Record<TransactionType, { icon: string; color: string; sign: '+' | '-' }> = {
  received:   { icon: 'call-received',    color: Colors.primary,   sign: '+' },
  deposit:    { icon: 'call-received',    color: Colors.primary,   sign: '+' },
  reversal:   { icon: 'undo',             color: Colors.primary,   sign: '+' },
  sent:       { icon: 'call-made',        color: Colors.error,     sign: '-' },
  payment:    { icon: 'payment',          color: Colors.secondary, sign: '-' },
  withdrawal: { icon: 'atm',             color: Colors.error,     sign: '-' },
  airtime:    { icon: 'phone-android',   color: Colors.tertiary,  sign: '-' },
  fuliza:     { icon: 'account-balance', color: Colors.error,     sign: '-' },
  unknown:    { icon: 'help-outline',    color: Colors.outline,   sign: '-' },
};

function fmt(n: number) {
  return `Ksh ${n.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
}

function fmtDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function HistoryScreen() {
  const { transactions, loading, monthSummary } = useApp();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<TransactionType | 'all'>('all');

  const filtered = useMemo(() => {
    let txs = transactions;
    if (activeFilter !== 'all') txs = txs.filter((t) => t.type === activeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      txs = txs.filter((t) => t.party.toLowerCase().includes(q) || t.ref.toLowerCase().includes(q));
    }
    return txs;
  }, [transactions, activeFilter, search]);

  // Group by day
  const grouped = useMemo(() => {
    const groups: { date: string; txs: Transaction[] }[] = [];
    let currentDate = '';
    for (const tx of filtered) {
      const d = new Date(tx.date);
      const label = d.toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' });
      if (label !== currentDate) {
        currentDate = label;
        groups.push({ date: label, txs: [] });
      }
      groups[groups.length - 1].txs.push(tx);
    }
    return groups;
  }, [filtered]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <View style={styles.headerCount}>
          <Text style={styles.headerCountText}>{transactions.length}</Text>
        </View>
      </View>

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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.label}
            style={[styles.filterChip, activeFilter === f.type && styles.filterChipActive]}
            onPress={() => setActiveFilter(f.type)}>
            <Text style={[styles.filterText, activeFilter === f.type && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          {/* Month summary strip */}
          <View style={styles.monthSummary}>
            <Text style={styles.monthLabel}>This month</Text>
            <View style={styles.monthStats}>
              <View style={styles.monthStat}>
                <MaterialIcons name="call-received" size={13} color={Colors.primary} />
                <Text style={styles.monthStatIn}>{fmt(monthSummary.totalReceived)}</Text>
              </View>
              <View style={styles.monthStatDiv} />
              <View style={styles.monthStat}>
                <MaterialIcons name="call-made" size={13} color={Colors.error} />
                <Text style={styles.monthStatOut}>{fmt(monthSummary.totalSent)}</Text>
              </View>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 40 }} />
          ) : filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="receipt-long" size={40} color={Colors.outlineVariant} />
              <Text style={styles.emptyTitle}>No transactions</Text>
              <Text style={styles.emptyText}>
                {transactions.length === 0
                  ? 'Sync your M-Pesa SMS from the Home tab to get started'
                  : 'No transactions match your filter'}
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
                        activeOpacity={0.7}>
                        <View style={[styles.txIcon, { backgroundColor: `${conf.color}15` }]}>
                          <MaterialIcons name={conf.icon as any} size={18} color={conf.color} />
                        </View>
                        <View style={styles.txInfo}>
                          <Text style={styles.txName} numberOfLines={1}>{tx.party}</Text>
                          <View style={styles.txMeta}>
                            <Text style={styles.txRef}>{tx.ref}</Text>
                            {tx.category && (
                              <View style={styles.catBadge}>
                                <Text style={styles.catText}>{tx.category}</Text>
                              </View>
                            )}
                            {!tx.category && (
                              <View style={styles.catBadgeUncategorized}>
                                <Text style={styles.catTextUncategorized}>Uncategorized</Text>
                              </View>
                            )}
                          </View>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: Colors.surfaceContainerLowest, gap: 10 },
  headerTitle: { flex: 1, fontFamily: Fonts.manrope.bold, fontSize: 18, color: Colors.onSurface },
  headerCount: { backgroundColor: Colors.surfaceContainerLow, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  headerCountText: { fontFamily: Fonts.inter.semiBold, fontSize: 13, color: Colors.onSurfaceVariant },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, backgroundColor: Colors.surfaceContainerLowest },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceContainerLow, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, fontFamily: Fonts.inter.regular, fontSize: 14, color: Colors.onSurface, padding: 0 },
  filterRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.surfaceContainerLowest, borderWidth: 1, borderColor: Colors.surfaceContainerHigh },
  filterChipActive: { backgroundColor: Colors.primaryFixed, borderColor: Colors.primaryFixed },
  filterText: { fontFamily: Fonts.inter.medium, fontSize: 13, color: Colors.onSurfaceVariant },
  filterTextActive: { color: Colors.primary, fontFamily: Fonts.inter.semiBold },
  body: { padding: 16, gap: 10 },
  monthSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  monthLabel: { fontFamily: Fonts.manrope.semiBold, fontSize: 14, color: Colors.onSurfaceVariant },
  monthStats: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  monthStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  monthStatIn: { fontFamily: Fonts.inter.semiBold, fontSize: 13, color: Colors.primary },
  monthStatOut: { fontFamily: Fonts.inter.semiBold, fontSize: 13, color: Colors.error },
  monthStatDiv: { width: 1, height: 16, backgroundColor: Colors.outlineVariant },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle: { fontFamily: Fonts.manrope.bold, fontSize: 18, color: Colors.onSurface },
  emptyText: { fontFamily: Fonts.inter.regular, fontSize: 14, color: Colors.onSurfaceVariant, textAlign: 'center', paddingHorizontal: 32 },
  dayLabel: { fontFamily: Fonts.inter.semiBold, fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 8, marginBottom: 6, paddingLeft: 4 },
  listCard: { backgroundColor: Colors.surfaceContainerLowest, borderRadius: 16, paddingVertical: 4, shadowColor: Colors.onSurface, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  txRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainerLow },
  txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1, gap: 3 },
  txName: { fontFamily: Fonts.inter.semiBold, fontSize: 13, color: Colors.onSurface },
  txMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  txRef: { fontFamily: Fonts.inter.regular, fontSize: 10, color: Colors.outlineVariant },
  catBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: Colors.primaryFixed },
  catBadgeUncategorized: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: Colors.surfaceContainerHigh },
  catText: { fontFamily: Fonts.inter.medium, fontSize: 10, color: Colors.primary },
  catTextUncategorized: { fontFamily: Fonts.inter.medium, fontSize: 10, color: Colors.onSurfaceVariant },
  txRight: { alignItems: 'flex-end', gap: 2 },
  txAmount: { fontFamily: Fonts.manrope.bold, fontSize: 13 },
  txFee: { fontFamily: Fonts.inter.regular, fontSize: 10, color: Colors.outlineVariant },
});
