import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Searchbar,
  Card,
  Chip,
  ActivityIndicator,
  Menu,
  Button,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { DatabaseService } from '../services/dbService';
import { Transaction, TransactionType } from '../types';

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [menuVisible, setMenuVisible] = useState(false);

  const filterOptions = [
    { label: 'All', value: 'all' },
    { label: 'Received', value: TransactionType.RECEIVED },
    { label: 'Sent', value: TransactionType.SENT },
    { label: 'Buy Goods', value: TransactionType.BUY_GOODS },
    { label: 'Pay Bill', value: TransactionType.PAY_BILL },
    { label: 'Withdraw', value: TransactionType.WITHDRAW },
    { label: 'Deposit', value: TransactionType.DEPOSIT },
    { label: 'Airtime', value: TransactionType.AIRTIME },
    { label: 'Lipa na M-PESA', value: TransactionType.LIPA_NA_MPESA },
  ];

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    filterAndSearchTransactions();
  }, [searchQuery, selectedFilter, transactions]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      await DatabaseService.initialize();
      const txs = await DatabaseService.getAllTransactions();
      setTransactions(txs);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      setLoading(false);
    }
  };

  const filterAndSearchTransactions = () => {
    let filtered = transactions;

    // Apply type filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter((tx) => tx.type === selectedFilter);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (tx) =>
          tx.counterparty?.toLowerCase().includes(query) ||
          tx.phone?.toLowerCase().includes(query) ||
          tx.account?.toLowerCase().includes(query) ||
          tx.reference?.toLowerCase().includes(query) ||
          tx.amount.toString().includes(query)
      );
    }

    setFilteredTransactions(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number): string => {
    return `KSh ${amount.toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatType = (type: string): string => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getTransactionIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case TransactionType.RECEIVED:
      case TransactionType.DEPOSIT:
        return 'arrow-down-circle';
      case TransactionType.SENT:
        return 'arrow-up-circle';
      case TransactionType.BUY_GOODS:
      case TransactionType.LIPA_NA_MPESA:
        return 'cart';
      case TransactionType.PAY_BILL:
        return 'document-text';
      case TransactionType.WITHDRAW:
        return 'cash';
      case TransactionType.AIRTIME:
        return 'phone-portrait';
      default:
        return 'swap-horizontal';
    }
  };

  const isIncome = (type: string): boolean => {
    return type === TransactionType.RECEIVED || type === TransactionType.DEPOSIT;
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <Card style={styles.transactionCard}>
      <Card.Content>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionIconContainer}>
            <Ionicons
              name={getTransactionIcon(item.type)}
              size={24}
              color={isIncome(item.type) ? '#4caf50' : '#f44336'}
            />
          </View>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionMerchant}>
              {item.counterparty || 'Unknown'}
            </Text>
            <Text style={styles.transactionType}>{formatType(item.type)}</Text>
            <Text style={styles.transactionDate}>{formatDate(item.timestamp)}</Text>
          </View>
          <View style={styles.transactionAmountContainer}>
            <Text
              style={[
                styles.transactionAmount,
                { color: isIncome(item.type) ? '#4caf50' : '#f44336' },
              ]}
            >
              {isIncome(item.type) ? '+' : '-'}
              {formatCurrency(item.amount)}
            </Text>
            {item.transactionCost > 0 && (
              <Text style={styles.transactionCost}>
                Fee: {formatCurrency(item.transactionCost)}
              </Text>
            )}
          </View>
        </View>

        {item.phone && (
          <Text style={styles.transactionDetail}>📞 {item.phone}</Text>
        )}
        {item.account && (
          <Text style={styles.transactionDetail}>🏦 Account: {item.account}</Text>
        )}
        {item.reference && (
          <Text style={styles.transactionDetail}>🔖 Ref: {item.reference}</Text>
        )}

        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>Balance:</Text>
          <Text style={styles.balanceValue}>{formatCurrency(item.balance)}</Text>
        </View>
      </Card.Content>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="file-tray-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>
        {searchQuery || selectedFilter !== 'all'
          ? 'No transactions found'
          : 'No transactions yet'}
      </Text>
      <Text style={styles.emptySubtext}>
        {searchQuery || selectedFilter !== 'all'
          ? 'Try adjusting your filters'
          : 'Sync your M-Pesa messages to get started'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <Text style={styles.subtitle}>
          {filteredTransactions.length} of {transactions.length} transactions
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search transactions..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
      </View>

      {/* Filter */}
      <View style={styles.filterContainer}>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setMenuVisible(true)}
              icon="filter"
              style={styles.filterButton}
            >
              {filterOptions.find((f) => f.value === selectedFilter)?.label}
            </Button>
          }
        >
          {filterOptions.map((option) => (
            <Menu.Item
              key={option.value}
              onPress={() => {
                setSelectedFilter(option.value);
                setMenuVisible(false);
              }}
              title={option.label}
            />
          ))}
        </Menu>

        {selectedFilter !== 'all' && (
          <Chip
            onClose={() => setSelectedFilter('all')}
            style={styles.filterChip}
          >
            {filterOptions.find((f) => f.value === selectedFilter)?.label}
          </Chip>
        )}
      </View>

      {/* Transaction List */}
      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
      />
    </View>
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
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchbar: {
    elevation: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterButton: {
    marginRight: 8,
  },
  filterChip: {
    backgroundColor: '#e3f2fd',
  },
  listContent: {
    paddingBottom: 16,
  },
  transactionCard: {
    marginHorizontal: 16,
    marginVertical: 4,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionMerchant: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  transactionType: {
    fontSize: 11,
    color: '#999',
    textTransform: 'capitalize',
    marginTop: 2,
  },
  transactionDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  transactionCost: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  transactionDetail: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  balanceLabel: {
    fontSize: 12,
    color: '#999',
  },
  balanceValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});
