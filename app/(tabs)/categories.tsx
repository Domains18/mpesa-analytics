import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, Fonts } from '@/constants/theme';
import { useApp } from '@/store/app-context';
import { BudgetSummary } from '@/types/transaction';
import { useState } from 'react';

function fmt(n: number) {
  return `Ksh ${n.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
}

function ProgressBar({ spent, budget, color }: { spent: number; budget: number; color: string }) {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const isOver = spent > budget;
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: isOver ? Colors.error : color }]} />
    </View>
  );
}

function BudgetCard({ item, onCategoryPress }: { item: BudgetSummary; onCategoryPress: (item: BudgetSummary) => void }) {
  const pct = item.budget > 0 ? ((item.spent / item.budget) * 100).toFixed(1) : '0';
  const remaining = item.budget - item.spent;
  const isOver = item.spent > item.budget;

  return (
    <View style={styles.budgetCard}>
      <View style={styles.budgetCardHeader}>
        <View style={[styles.budgetIcon, { backgroundColor: `${item.color}18` }]}>
          <MaterialIcons name={item.icon as any} size={20} color={item.color} />
        </View>
        <View style={styles.budgetInfo}>
          <Text style={styles.budgetName}>{item.name}</Text>
          <Text style={styles.budgetSubtitle}>{item.transactionCount} transactions this month</Text>
        </View>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onCategoryPress(item)}>
          <MaterialIcons name="edit" size={15} color={Colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      <View style={styles.budgetAmounts}>
        <Text style={styles.amountSpent}>{fmt(item.spent)}</Text>
        <Text style={styles.amountOf}>/ {fmt(item.budget)}</Text>
        <View style={[styles.pctBadge, isOver && styles.pctBadgeOver]}>
          <Text style={[styles.pctText, isOver && styles.pctTextOver]}>{pct}%</Text>
        </View>
      </View>

      <ProgressBar spent={item.spent} budget={item.budget} color={item.color} />

      <Text style={[styles.remainingText, isOver && styles.remainingOver]}>
        {isOver ? `Over budget by ${fmt(Math.abs(remaining))}` : `${fmt(remaining)} remaining`}
      </Text>
    </View>
  );
}

export default function CategoriesScreen() {
  const { budgetSummaries, loading, monthSummary } = useApp();
  const [search, setSearch] = useState('');
  const [editTarget, setEditTarget] = useState<BudgetSummary | null>(null);

  const filtered = budgetSummaries.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalBudget = budgetSummaries.reduce((s, b) => s + b.budget, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Category Management</Text>
        <TouchableOpacity style={styles.addBtn}>
          <MaterialIcons name="add" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={18} color={Colors.outline} />
            <TextInput
              placeholder="Search categories..."
              placeholderTextColor={Colors.outline}
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {/* Overview */}
          <View style={styles.overviewCard}>
            <Text style={styles.overviewTitle}>Overview</Text>
            <Text style={styles.overviewSub}>Active Budgets — This Month</Text>
            <View style={styles.overviewRow}>
              <View>
                <Text style={styles.overviewLabel}>Total Budget</Text>
                <Text style={styles.overviewValue}>{fmt(totalBudget)}</Text>
              </View>
              <View style={styles.overviewDivider} />
              <View>
                <Text style={styles.overviewLabel}>Total Spent</Text>
                <Text style={[styles.overviewValue, { color: Colors.secondary }]}>
                  {fmt(monthSummary.totalSent)}
                </Text>
              </View>
              <View style={styles.overviewDivider} />
              <View>
                <Text style={styles.overviewLabel}>Categories</Text>
                <Text style={styles.overviewValue}>{budgetSummaries.length}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.listLabel}>Active Budgets</Text>

          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 24 }} />
          ) : filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="category" size={32} color={Colors.outlineVariant} />
              <Text style={styles.emptyText}>No categories found</Text>
            </View>
          ) : (
            filtered.map((item) => (
              <BudgetCard key={item.id} item={item} onCategoryPress={setEditTarget} />
            ))
          )}

          {/* Summary Banner */}
          {monthSummary.totalSent > 0 && (
            <View style={styles.summaryBanner}>
              <View style={styles.summaryIcon}>
                <MaterialIcons name="info-outline" size={18} color={Colors.secondary} />
              </View>
              <Text style={styles.summaryText}>
                <Text style={styles.summaryBold}>{fmt(monthSummary.totalSent)}</Text> spent this
                month across {monthSummary.transactionCount} transactions.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit budget modal (placeholder) */}
      <Modal visible={!!editTarget} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Edit Budget — {editTarget?.name}</Text>
            <Text style={styles.modalSub}>Budget editing coming soon</Text>
            <TouchableOpacity style={styles.modalClose} onPress={() => setEditTarget(null)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: Colors.surfaceContainerLowest, gap: 10,
  },
  headerTitle: { flex: 1, fontFamily: Fonts.manrope.bold, fontSize: 18, color: Colors.onSurface },
  addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 16, gap: 14 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceContainerLowest, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 8, borderWidth: 1, borderColor: Colors.surfaceContainerHigh },
  searchInput: { flex: 1, fontFamily: Fonts.inter.regular, fontSize: 14, color: Colors.onSurface, padding: 0 },
  overviewCard: { backgroundColor: Colors.surfaceContainerLowest, borderRadius: 16, padding: 18, shadowColor: Colors.onSurface, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  overviewTitle: { fontFamily: Fonts.manrope.bold, fontSize: 16, color: Colors.onSurface, marginBottom: 2 },
  overviewSub: { fontFamily: Fonts.inter.regular, fontSize: 12, color: Colors.onSurfaceVariant, marginBottom: 16 },
  overviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  overviewLabel: { fontFamily: Fonts.inter.regular, fontSize: 11, color: Colors.onSurfaceVariant, marginBottom: 3 },
  overviewValue: { fontFamily: Fonts.manrope.bold, fontSize: 15, color: Colors.onSurface },
  overviewDivider: { width: 1, height: 32, backgroundColor: Colors.surfaceContainerHigh },
  listLabel: { fontFamily: Fonts.manrope.semiBold, fontSize: 13, color: Colors.onSurfaceVariant, letterSpacing: 0.5, textTransform: 'uppercase' },
  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontFamily: Fonts.inter.medium, fontSize: 14, color: Colors.onSurfaceVariant },
  budgetCard: { backgroundColor: Colors.surfaceContainerLowest, borderRadius: 16, padding: 16, shadowColor: Colors.onSurface, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  budgetCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  budgetIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  budgetInfo: { flex: 1 },
  budgetName: { fontFamily: Fonts.manrope.semiBold, fontSize: 14, color: Colors.onSurface, marginBottom: 1 },
  budgetSubtitle: { fontFamily: Fonts.inter.regular, fontSize: 11, color: Colors.onSurfaceVariant },
  actionBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' },
  budgetAmounts: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  amountSpent: { fontFamily: Fonts.manrope.bold, fontSize: 15, color: Colors.onSurface },
  amountOf: { fontFamily: Fonts.inter.regular, fontSize: 13, color: Colors.onSurfaceVariant, flex: 1 },
  pctBadge: { backgroundColor: Colors.surfaceContainerLow, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  pctBadgeOver: { backgroundColor: '#ffefec' },
  pctText: { fontFamily: Fonts.inter.semiBold, fontSize: 11, color: Colors.onSurfaceVariant },
  pctTextOver: { color: Colors.error },
  progressTrack: { height: 6, backgroundColor: Colors.surfaceContainerLow, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', borderRadius: 3 },
  remainingText: { fontFamily: Fonts.inter.medium, fontSize: 11, color: Colors.onSurfaceVariant },
  remainingOver: { color: Colors.error },
  summaryBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#eaf4ff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.secondaryContainer, marginBottom: 8 },
  summaryIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.secondaryContainer, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  summaryText: { flex: 1, fontFamily: Fonts.inter.regular, fontSize: 13, color: Colors.secondary, lineHeight: 20 },
  summaryBold: { fontFamily: Fonts.inter.semiBold },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surfaceContainerLowest, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28 },
  modalTitle: { fontFamily: Fonts.manrope.bold, fontSize: 18, color: Colors.onSurface, marginBottom: 6 },
  modalSub: { fontFamily: Fonts.inter.regular, fontSize: 14, color: Colors.onSurfaceVariant, marginBottom: 24 },
  modalClose: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalCloseText: { fontFamily: Fonts.manrope.semiBold, fontSize: 15, color: Colors.white },
});
