import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, Fonts } from '@/constants/theme';
import { useApp } from '@/store/app-context';
import { requestSmsPermission, openAppSettings } from '@/lib/sms-reader';
import { useState, useCallback } from 'react';
import { router } from 'expo-router';
import { getAiInsights } from '@/lib/ai-insights';

// ─── Spending Line Chart ──────────────────────────────────────────────────────
// Draws a 7-day line graph using absolutely-positioned Views + rotation math.
// No SVG library required.

const CHART_H = 100; // line area height (labels sit below this)
const PT_R    = 4;   // point dot radius

function SpendingLineChart({
  data,
  maxVal,
}: {
  data: { amount: number; label: string }[];
  maxVal: number;
}) {
  const [w, setW] = useState(0);
  const n = data.length;

  // Compute (x, y) canvas coords for each point
  const pts = w > 0 && n > 1
    ? data.map((d, i) => ({
        x: PT_R + (i / (n - 1)) * (w - PT_R * 2),
        y: maxVal > 0
          ? CHART_H - Math.max(PT_R * 2, (d.amount / maxVal) * CHART_H)
          : CHART_H * 0.5,
        label: d.label,
        today: i === n - 1,
      }))
    : [];

  return (
    <View
      style={{ height: CHART_H + 28 }}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
    >
      {pts.length > 1 && (
        <>
          {/* Line segments: thin View rotated to connect adjacent points */}
          {pts.slice(0, -1).map((a, i) => {
            const b = pts[i + 1];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.hypot(dx, dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            return (
              <View
                key={`l${i}`}
                style={{
                  position: 'absolute',
                  left: (a.x + b.x) / 2 - len / 2,
                  top:  (a.y + b.y) / 2 - 1,
                  width: len,
                  height: 2,
                  borderRadius: 1,
                  backgroundColor: Colors.primary,
                  transform: [{ rotate: `${angle}deg` }],
                }}
              />
            );
          })}

          {/* Dots — today gets a soft halo ring */}
          {pts.map((p, i) => (
            <View key={`d${i}`}>
              {p.today && (
                <View
                  style={{
                    position: 'absolute',
                    left: p.x - PT_R * 2.5,
                    top:  p.y - PT_R * 2.5,
                    width:  PT_R * 5,
                    height: PT_R * 5,
                    borderRadius: PT_R * 2.5,
                    backgroundColor: Colors.primaryFixed,
                  }}
                />
              )}
              <View
                style={{
                  position: 'absolute',
                  left: p.x - PT_R,
                  top:  p.y - PT_R,
                  width:  PT_R * 2,
                  height: PT_R * 2,
                  borderRadius: PT_R,
                  backgroundColor: p.today ? Colors.primary : Colors.surfaceContainerLowest,
                  borderWidth: 1.5,
                  borderColor: Colors.primary,
                }}
              />
            </View>
          ))}

          {/* Day labels */}
          {pts.map((p, i) => (
            <Text
              key={`lbl${i}`}
              style={{
                position: 'absolute',
                left: p.x - 12,
                top: CHART_H + 8,
                width: 24,
                textAlign: 'center',
                fontFamily: p.today ? Fonts.inter.bold : Fonts.inter.medium,
                fontSize: 11,
                color: p.today ? Colors.primary : Colors.outlineVariant,
              }}
            >
              {p.label}
            </Text>
          ))}
        </>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `Ksh ${n.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
}

function fmtDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const TX_ICON: Record<string, string> = {
  received: 'call-received',
  deposit:  'call-received',
  sent:     'call-made',
  payment:  'payment',
  withdrawal: 'atm',
  airtime:  'phone-android',
  fuliza:   'account-balance',
  reversal: 'undo',
  unknown:  'help-outline',
};

export default function DashboardScreen() {
  const { monthSummary, chartData, uncategorized, transactions, syncing, loading, lastSync, syncSms, error } = useApp();
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleAiAnalysis = useCallback(async () => {
    setAiLoading(true);
    setAiError(null);
    setAiInsights(null);
    try {
      const insights = await getAiInsights(transactions, monthSummary);
      setAiInsights(insights);
    } catch (e: any) {
      setAiError(e.message ?? 'AI analysis failed');
    } finally {
      setAiLoading(false);
    }
  }, [transactions, monthSummary]);

  const handleSync = useCallback(async () => {
    if (Platform.OS === 'android') {
      const status = await requestSmsPermission();
      if (status === 'never_ask_again') {
        setSyncResult('Permission blocked — tap to open Settings');
        return;
      }
      if (status === 'denied') {
        setSyncResult('SMS permission denied');
        return;
      }
    }
    const result = await syncSms();
    if (result.total === 0) {
      setSyncResult('No M-Pesa SMS found in inbox');
    } else {
      setSyncResult(`Synced: ${result.imported} new, ${result.skipped} already imported`);
    }
    setTimeout(() => setSyncResult(null), 5000);
  }, [syncSms]);

  const maxBar = Math.max(...chartData.map((d) => d.amount), 1);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={22} color={Colors.white} />
          </View>
          <Text style={styles.headerTitle}>M-Pesa Analytics</Text>
          <TouchableOpacity
            style={[styles.syncButton, aiLoading && styles.aiButtonActive]}
            onPress={handleAiAnalysis}
            disabled={aiLoading}>
            {aiLoading
              ? <ActivityIndicator size="small" color={Colors.white} />
              : <MaterialIcons name="auto-awesome" size={20} color={aiInsights ? Colors.white : Colors.secondary} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.syncButton} onPress={handleSync} disabled={syncing}>
            {syncing
              ? <ActivityIndicator size="small" color={Colors.primary} />
              : <MaterialIcons name="sync" size={22} color={Colors.onSurface} />}
          </TouchableOpacity>
        </View>

        {/* Sync feedback */}
        {syncResult && (
          <TouchableOpacity
            style={styles.syncBanner}
            onPress={syncResult.includes('Settings') ? openAppSettings : undefined}
            activeOpacity={syncResult.includes('Settings') ? 0.7 : 1}>
            <MaterialIcons name="check-circle" size={14} color={Colors.primary} />
            <Text style={styles.syncBannerText}>{syncResult}</Text>
            {syncResult.includes('Settings') && (
              <MaterialIcons name="open-in-new" size={13} color={Colors.primary} />
            )}
          </TouchableOpacity>
        )}
        {error && (
          <View style={[styles.syncBanner, styles.syncBannerError]}>
            <MaterialIcons name="error-outline" size={14} color={Colors.error} />
            <Text style={[styles.syncBannerText, { color: Colors.error }]}>{error}</Text>
          </View>
        )}

        {/* AI Insights */}
        {aiError && (
          <View style={[styles.syncBanner, styles.syncBannerError]}>
            <MaterialIcons name="error-outline" size={14} color={Colors.error} />
            <Text style={[styles.syncBannerText, { color: Colors.error }]}>{aiError}</Text>
            <TouchableOpacity onPress={() => setAiError(null)}>
              <MaterialIcons name="close" size={16} color={Colors.error} />
            </TouchableOpacity>
          </View>
        )}
        {aiInsights && (
          <View style={styles.aiCard}>
            <View style={styles.aiCardHeader}>
              <View style={styles.aiIconWrap}>
                <MaterialIcons name="auto-awesome" size={16} color={Colors.white} />
              </View>
              <Text style={styles.aiCardTitle}>AI Insights</Text>
              <TouchableOpacity onPress={() => setAiInsights(null)} style={styles.aiCloseBtn}>
                <MaterialIcons name="close" size={16} color={Colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            <Text style={styles.aiCardBody}>{aiInsights}</Text>
            <TouchableOpacity style={styles.aiRefreshBtn} onPress={handleAiAnalysis} disabled={aiLoading}>
              <MaterialIcons name="refresh" size={14} color={Colors.secondary} />
              <Text style={styles.aiRefreshText}>Refresh analysis</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.body}>
          {/* Net Portfolio Card */}
          <View style={styles.portfolioCard}>
            <Text style={styles.portfolioLabel}>Net Balance (this month)</Text>
            <View style={styles.portfolioRow}>
              {loading
                ? <ActivityIndicator color={Colors.white} />
                : <Text style={styles.portfolioValue}>{fmt(monthSummary.netBalance)}</Text>}
              <View style={[styles.trendBadge, monthSummary.netBalance < 0 && styles.trendBadgeNeg]}>
                <MaterialIcons
                  name={monthSummary.netBalance >= 0 ? 'trending-up' : 'trending-down'}
                  size={13}
                  color={monthSummary.netBalance >= 0 ? Colors.primary : Colors.error}
                />
                <Text style={[styles.trendText, monthSummary.netBalance < 0 && styles.trendTextNeg]}>
                  {monthSummary.transactionCount} txns
                </Text>
              </View>
            </View>
            <Text style={styles.portfolioSub}>
              {lastSync ? `Last synced ${fmtDate(lastSync)}` : 'Tap ↑ sync to import SMS'}
            </Text>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statIconWrap}>
                <MaterialIcons name="call-received" size={16} color={Colors.primary} />
              </View>
              <Text style={styles.statValue} numberOfLines={1}>{fmt(monthSummary.totalReceived)}</Text>
              <Text style={styles.statLabel}>Inflow</Text>
              <Text style={styles.statPeriod}>this month</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconWrap, styles.statIconOut]}>
                <MaterialIcons name="call-made" size={16} color={Colors.error} />
              </View>
              <Text style={[styles.statValue, styles.statValueOut]} numberOfLines={1}>
                {fmt(monthSummary.totalSent)}
              </Text>
              <Text style={styles.statLabel}>Outflow</Text>
              <Text style={styles.statPeriod}>this month</Text>
            </View>
          </View>

          {/* Spending Flow Chart */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Spending Flow</Text>
              <Text style={styles.chartPeriod}>Last 7 days</Text>
            </View>
            {loading ? (
              <View style={styles.chartLoading}>
                <ActivityIndicator color={Colors.primary} />
              </View>
            ) : (
              <SpendingLineChart data={chartData} maxVal={maxBar} />
            )}
          </View>

          {/* Fees */}
          {monthSummary.totalFees > 0 && (
            <View style={styles.alertBanner}>
              <View style={styles.alertIcon}>
                <MaterialIcons name="receipt" size={16} color={Colors.secondary} />
              </View>
              <Text style={styles.alertText}>
                You paid <Text style={styles.alertBold}>{fmt(monthSummary.totalFees)}</Text> in M-Pesa
                transaction fees this month
              </Text>
            </View>
          )}

          {/* Uncategorized Transactions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Uncategorized</Text>
              {uncategorized.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{uncategorized.length}</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.seeAllLink}
                onPress={() => router.push('/(tabs)/history')}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} />
            ) : uncategorized.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="check-circle" size={28} color={Colors.primaryFixed} />
                <Text style={styles.emptyText}>All transactions are categorized!</Text>
              </View>
            ) : (
              uncategorized.slice(0, 5).map((tx, i) => (
                <View
                  key={tx.id}
                  style={[styles.txRow, i < Math.min(uncategorized.length, 5) - 1 && styles.txRowBorder]}>
                  <View style={styles.txIconWrap}>
                    <MaterialIcons name={TX_ICON[tx.type] as any ?? 'help-outline'} size={18} color={Colors.onSurfaceVariant} />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txName} numberOfLines={1}>{tx.party}</Text>
                    <Text style={styles.txDate}>{fmtDate(tx.date)}</Text>
                  </View>
                  <View style={styles.txRight}>
                    <Text style={[styles.txAmount, tx.type === 'received' || tx.type === 'deposit' ? styles.txAmountIn : null]}>
                      {tx.type === 'received' || tx.type === 'deposit' ? '+' : '-'}{fmt(tx.amount)}
                    </Text>
                    <TouchableOpacity style={styles.categorizeBtn}>
                      <Text style={styles.categorizeBtnText}>Categorize</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* iOS notice */}
          {Platform.OS === 'ios' && (
            <View style={styles.iosNotice}>
              <MaterialIcons name="info-outline" size={16} color={Colors.onSurfaceVariant} />
              <Text style={styles.iosNoticeText}>
                iOS does not allow reading SMS. Android is required for automatic sync.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: Colors.surfaceContainerLowest, gap: 10,
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontFamily: Fonts.manrope.bold, fontSize: 16, color: Colors.onSurface },
  syncButton: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center',
  },
  syncBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: Colors.primaryFixed,
  },
  syncBannerError: { backgroundColor: '#ffefec' },
  syncBannerText: { fontFamily: Fonts.inter.medium, fontSize: 12, color: Colors.primary },
  body: { padding: 16, gap: 14 },
  portfolioCard: {
    backgroundColor: Colors.primary, borderRadius: 20, padding: 22,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 6,
  },
  portfolioLabel: { fontFamily: Fonts.inter.medium, fontSize: 12, color: 'rgba(210,255,198,0.8)', marginBottom: 6, letterSpacing: 0.5 },
  portfolioRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  portfolioValue: { fontFamily: Fonts.manrope.extraBold, fontSize: 28, color: Colors.white, letterSpacing: -0.5, flexShrink: 1 },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.primaryFixed, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  trendBadgeNeg: { backgroundColor: '#ffefec' },
  trendText: { fontFamily: Fonts.inter.semiBold, fontSize: 11, color: Colors.primary },
  trendTextNeg: { color: Colors.error },
  portfolioSub: { fontFamily: Fonts.inter.regular, fontSize: 12, color: 'rgba(210,255,198,0.6)' },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, backgroundColor: Colors.surfaceContainerLowest, borderRadius: 16, padding: 16,
    shadowColor: Colors.onSurface, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.primaryFixed, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statIconOut: { backgroundColor: '#ffefec' },
  statValue: { fontFamily: Fonts.manrope.bold, fontSize: 15, color: Colors.onSurface, marginBottom: 2 },
  statValueOut: { color: Colors.error },
  statLabel: { fontFamily: Fonts.inter.semiBold, fontSize: 12, color: Colors.onSurface },
  statPeriod: { fontFamily: Fonts.inter.regular, fontSize: 11, color: Colors.onSurfaceVariant },
  chartCard: { backgroundColor: Colors.surfaceContainerLowest, borderRadius: 16, padding: 18, shadowColor: Colors.onSurface, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  chartTitle: { fontFamily: Fonts.manrope.semiBold, fontSize: 15, color: Colors.onSurface },
  chartPeriod: { fontFamily: Fonts.inter.regular, fontSize: 12, color: Colors.onSurfaceVariant },
  chartLoading: { height: CHART_H + 28, alignItems: 'center', justifyContent: 'center' },
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#eaf4ff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.secondaryContainer },
  alertIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.secondaryContainer, alignItems: 'center', justifyContent: 'center' },
  alertText: { flex: 1, fontFamily: Fonts.inter.regular, fontSize: 13, color: Colors.secondary, lineHeight: 18 },
  alertBold: { fontFamily: Fonts.inter.semiBold },
  section: { backgroundColor: Colors.surfaceContainerLowest, borderRadius: 16, padding: 16, shadowColor: Colors.onSurface, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  sectionTitle: { fontFamily: Fonts.manrope.semiBold, fontSize: 15, color: Colors.onSurface },
  countBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center' },
  countText: { fontFamily: Fonts.inter.bold, fontSize: 10, color: Colors.white },
  seeAllLink: { marginLeft: 'auto' },
  seeAllText: { fontFamily: Fonts.inter.medium, fontSize: 12, color: Colors.primary },
  emptyState: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyText: { fontFamily: Fonts.inter.medium, fontSize: 13, color: Colors.onSurfaceVariant },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  txRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainerLow },
  txIconWrap: { width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1 },
  txName: { fontFamily: Fonts.inter.semiBold, fontSize: 13, color: Colors.onSurface, marginBottom: 2 },
  txDate: { fontFamily: Fonts.inter.regular, fontSize: 11, color: Colors.onSurfaceVariant },
  txRight: { alignItems: 'flex-end', gap: 4 },
  txAmount: { fontFamily: Fonts.manrope.bold, fontSize: 13, color: Colors.onSurface },
  txAmountIn: { color: Colors.primary },
  categorizeBtn: { backgroundColor: Colors.surfaceContainerLow, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  categorizeBtnText: { fontFamily: Fonts.inter.medium, fontSize: 10, color: Colors.primary },
  iosNotice: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: Colors.surfaceContainerLow, borderRadius: 12, padding: 12 },
  iosNoticeText: { flex: 1, fontFamily: Fonts.inter.regular, fontSize: 12, color: Colors.onSurfaceVariant, lineHeight: 18 },
  aiButtonActive: { backgroundColor: Colors.secondary },
  aiCard: {
    marginHorizontal: 16, marginTop: 10,
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.secondaryContainer,
    shadowColor: Colors.secondary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  aiCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  aiIconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.secondary, alignItems: 'center', justifyContent: 'center' },
  aiCardTitle: { flex: 1, fontFamily: Fonts.manrope.bold, fontSize: 14, color: Colors.onSurface },
  aiCloseBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' },
  aiCardBody: { fontFamily: Fonts.inter.regular, fontSize: 13, color: Colors.onSurface, lineHeight: 20 },
  aiRefreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginTop: 12, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.surfaceContainerLow },
  aiRefreshText: { fontFamily: Fonts.inter.medium, fontSize: 11, color: Colors.secondary },
});
