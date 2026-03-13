import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Button, Card, ActivityIndicator } from 'react-native-paper';
import { SyncService } from '../services/syncService';
import { AnalyticsService } from '../services/analyticsService';
import { TransactionStats, Transaction } from '../types';

export default function Dashboard() {
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Check if initial sync is needed
      const needsSync = await SyncService.needsInitialSync();
      
      if (needsSync) {
        // Show sync prompt
        Alert.alert(
          'Initial Sync Required',
          'This appears to be your first time using the app. Would you like to sync your M-Pesa messages now?',
          [
            {
              text: 'Later',
              style: 'cancel',
              onPress: () => setLoading(false),
            },
            {
              text: 'Sync Now',
              onPress: () => handleSync(),
            },
          ]
        );
        return;
      }

      // Load stats
      const statsData = await AnalyticsService.getTransactionStats();
      setStats(statsData);

      // Load recent transactions
      const transactions = await AnalyticsService.getRecentTransactions(5);
      setRecentTransactions(transactions);

      setLoading(false);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to load dashboard data');
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);

      const result = await SyncService.fullSync();

      Alert.alert(
        'Sync Complete',
        `Synced ${result.inserted} transactions\n` +
        `Parsed: ${result.parsed}/${result.totalMessages}\n` +
        `Skipped: ${result.skipped}\n` +
        `Failed: ${result.failed}`,
        [{ text: 'OK', onPress: () => loadDashboardData() }]
      );
    } catch (error) {
      console.error('Sync failed:', error);
      Alert.alert('Sync Failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setSyncing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number): string => {
    return `KSh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    
    return date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>M-Pesa Analytics</Text>
        <Text style={styles.subtitle}>Your financial overview</Text>
      </View>

      {/* Balance Card */}
      <Card style={styles.balanceCard}>
        <Card.Content>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balanceAmount}>
            {stats ? formatCurrency(stats.currentBalance) : 'KSh 0.00'}
          </Text>
        </Card.Content>
      </Card>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text style={styles.statLabel}>Income</Text>
            <Text style={[styles.statValue, { color: '#4caf50' }]}>
              {stats ? formatCurrency(stats.totalIncome) : 'KSh 0.00'}
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content>
            <Text style={styles.statLabel}>Expenses</Text>
            <Text style={[styles.statValue, { color: '#f44336' }]}>
              {stats ? formatCurrency(stats.totalExpenses) : 'KSh 0.00'}
            </Text>
          </Card.Content>
        </Card>
      </View>

      <Card style={styles.netCard}>
        <Card.Content>
          <Text style={styles.statLabel}>Net Change</Text>
          <Text style={[
            styles.statValue,
            { color: stats && stats.netChange >= 0 ? '#4caf50' : '#f44336' }
          ]}>
            {stats ? formatCurrency(stats.netChange) : 'KSh 0.00'}
          </Text>
          <Text style={styles.transactionCount}>
            {stats ? `${stats.transactionCount} transactions` : 'No transactions'}
          </Text>
        </Card.Content>
      </Card>

      {/* Recent Transactions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {recentTransactions.length > 0 ? (
          recentTransactions.map((tx) => (
            <Card key={tx.id} style={styles.transactionCard}>
              <Card.Content>
                <View style={styles.transactionRow}>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionMerchant}>
                      {tx.counterparty || 'Unknown'}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {formatDate(tx.timestamp)}
                    </Text>
                  </View>
                  <Text style={[
                    styles.transactionAmount,
                    { color: tx.type === 'received' || tx.type === 'deposit' ? '#4caf50' : '#f44336' }
                  ]}>
                    {tx.type === 'received' || tx.type === 'deposit' ? '+' : '-'}
                    {formatCurrency(tx.amount)}
                  </Text>
                </View>
                <Text style={styles.transactionType}>{tx.type.replace('_', ' ')}</Text>
              </Card.Content>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>Sync your M-Pesa messages to get started</Text>
            </Card.Content>
          </Card>
        )}
      </View>

      {/* Sync Button */}
      <View style={styles.syncSection}>
        <Button
          mode="contained"
          onPress={handleSync}
          loading={syncing}
          disabled={syncing}
          style={styles.syncButton}
        >
          {syncing ? 'Syncing...' : 'Sync M-Pesa Messages'}
        </Button>
      </View>
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
  balanceCard: {
    margin: 16,
    marginBottom: 8,
    elevation: 4,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    marginRight: 8,
    elevation: 2,
  },
  netCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  transactionCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  transactionCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    elevation: 1,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionMerchant: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  transactionType: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  emptyCard: {
    marginHorizontal: 16,
    elevation: 1,
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
  syncSection: {
    padding: 16,
    paddingBottom: 32,
  },
  syncButton: {
    paddingVertical: 6,
  },
});
