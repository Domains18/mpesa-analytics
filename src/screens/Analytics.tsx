import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Card, ActivityIndicator, SegmentedButtons } from 'react-native-paper';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { AnalyticsService } from '../services/analyticsService';
import {
  TransactionStats,
  CashFlowData,
  MerchantStats,
  CategoryStats,
} from '../types';

const screenWidth = Dimensions.get('window').width;

export default function Analytics() {
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);
  const [topMerchants, setTopMerchants] = useState<MerchantStats[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      startDate.setDate(startDate.getDate() - days);

      // Load all analytics data
      const [statsData, cashFlow, merchants, categories] = await Promise.all([
        AnalyticsService.getTransactionStats(startDate, endDate),
        AnalyticsService.getCashFlowData(startDate, endDate, 'day'),
        AnalyticsService.getTopMerchants(5),
        AnalyticsService.getSpendingByCategory(),
      ]);

      setStats(statsData);
      setCashFlowData(cashFlow);
      setTopMerchants(merchants);
      setCategoryData(categories);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number): string => {
    return `KSh ${amount.toLocaleString('en-KE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const prepareCashFlowChart = () => {
    if (cashFlowData.length === 0) {
      return {
        labels: [],
        datasets: [{ data: [] }],
      };
    }

    // Sample data for display (take every nth point if too many)
    const maxPoints = 7;
    const step = Math.ceil(cashFlowData.length / maxPoints);
    const sampledData = cashFlowData.filter((_, i) => i % step === 0);

    return {
      labels: sampledData.map((d) => d.date.split('-').slice(1).join('/')),
      datasets: [
        {
          data: sampledData.map((d) => d.net),
          color: (opacity = 1) => `rgba(0, 102, 204, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };
  };

  const prepareTopMerchantsChart = () => {
    if (topMerchants.length === 0) {
      return {
        labels: [],
        datasets: [{ data: [] }],
      };
    }

    return {
      labels: topMerchants.map((m) => m.merchant.substring(0, 10)),
      datasets: [
        {
          data: topMerchants.map((m) => m.totalSpent),
        },
      ],
    };
  };

  const prepareCategoryPieChart = () => {
    if (categoryData.length === 0) {
      return [];
    }

    const colors = ['#0066CC', '#4caf50', '#f44336', '#ff9800', '#9c27b0', '#607d8b'];

    return categoryData.slice(0, 6).map((cat, index) => ({
      name: cat.category,
      amount: cat.amount,
      color: colors[index % colors.length],
      legendFontColor: '#333',
      legendFontSize: 12,
    }));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 102, 204, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(51, 51, 51, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#0066CC',
    },
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
        <Text style={styles.subtitle}>Financial insights</Text>
      </View>

      {/* Period Selector */}
      <View style={styles.periodContainer}>
        <SegmentedButtons
          value={period}
          onValueChange={(value) => setPeriod(value as any)}
          buttons={[
            { value: '7d', label: '7 Days' },
            { value: '30d', label: '30 Days' },
            { value: '90d', label: '90 Days' },
          ]}
        />
      </View>

      {/* Summary Stats */}
      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text style={styles.statLabel}>Total Income</Text>
            <Text style={[styles.statValue, { color: '#4caf50' }]}>
              {stats ? formatCurrency(stats.totalIncome) : 'KSh 0'}
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content>
            <Text style={styles.statLabel}>Total Expenses</Text>
            <Text style={[styles.statValue, { color: '#f44336' }]}>
              {stats ? formatCurrency(stats.totalExpenses) : 'KSh 0'}
            </Text>
          </Card.Content>
        </Card>
      </View>

      {/* Cash Flow Chart */}
      {cashFlowData.length > 0 && (
        <Card style={styles.chartCard}>
          <Card.Content>
            <Text style={styles.chartTitle}>Net Cash Flow</Text>
            <Text style={styles.chartSubtitle}>Daily net change</Text>
            <LineChart
              data={prepareCashFlowChart()}
              width={screenWidth - 48}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withInnerLines={false}
              withOuterLines={true}
              withVerticalLabels={true}
              withHorizontalLabels={true}
            />
          </Card.Content>
        </Card>
      )}

      {/* Top Merchants */}
      {topMerchants.length > 0 && (
        <Card style={styles.chartCard}>
          <Card.Content>
            <Text style={styles.chartTitle}>Top Merchants</Text>
            <Text style={styles.chartSubtitle}>Your biggest expenses</Text>
            <BarChart
              data={prepareTopMerchantsChart()}
              width={screenWidth - 48}
              height={220}
              chartConfig={chartConfig}
              style={styles.chart}
              showValuesOnTopOfBars
              fromZero
              yAxisLabel="KSh "
            />
            <View style={styles.merchantList}>
              {topMerchants.map((merchant, index) => (
                <View key={index} style={styles.merchantRow}>
                  <Text style={styles.merchantRank}>{index + 1}</Text>
                  <Text style={styles.merchantName}>{merchant.merchant}</Text>
                  <Text style={styles.merchantAmount}>
                    {formatCurrency(merchant.totalSpent)}
                  </Text>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Category Breakdown */}
      {categoryData.length > 0 && (
        <Card style={styles.chartCard}>
          <Card.Content>
            <Text style={styles.chartTitle}>Spending by Category</Text>
            <Text style={styles.chartSubtitle}>Where your money goes</Text>
            <PieChart
              data={prepareCategoryPieChart()}
              width={screenWidth - 48}
              height={220}
              chartConfig={chartConfig}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="15"
              center={[10, 0]}
              absolute
            />
          </Card.Content>
        </Card>
      )}

      {/* Empty State */}
      {(!stats || stats.transactionCount === 0) && (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text style={styles.emptyText}>No data available</Text>
            <Text style={styles.emptySubtext}>
              Sync your M-Pesa messages to see analytics
            </Text>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#0066CC',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#e3f2fd',
    marginTop: 4,
  },
  periodContainer: {
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  chartCard: {
    margin: 16,
    marginTop: 8,
    elevation: 4,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  merchantList: {
    marginTop: 16,
  },
  merchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  merchantRank: {
    width: 24,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  merchantName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  merchantAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f44336',
  },
  emptyCard: {
    margin: 16,
    elevation: 2,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
});
