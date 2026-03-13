import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { List, Switch, Button, Card, Dialog, Portal } from 'react-native-paper';
import { DatabaseService } from '../services/dbService';
import { SyncService } from '../services/syncService';
import { SMSService } from '../services/smsService';

export default function Settings() {
  const [smsPermission, setSmsPermission] = useState(false);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [lastSync, setLastSync] = useState<Date | undefined>();
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Check SMS permission
      const hasPermission = await SMSService.hasPermission();
      setSmsPermission(hasPermission);

      // Load sync state
      await DatabaseService.initialize();
      const syncState = await DatabaseService.getSyncState();
      setTotalTransactions(syncState.totalTransactions);
      setCurrentBalance(syncState.balance);
      setLastSync(syncState.lastSync);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleRequestSMSPermission = async () => {
    try {
      const granted = await SMSService.requestSMSPermission();
      setSmsPermission(granted);

      if (granted) {
        Alert.alert('Success', 'SMS permission granted!');
      } else {
        Alert.alert('Permission Denied', 'SMS permission is required to read M-Pesa messages.');
      }
    } catch (error) {
      console.error('Failed to request SMS permission:', error);
      Alert.alert('Error', 'Failed to request SMS permission');
    }
  };

  const handleSync = async () => {
    try {
      Alert.alert(
        'Sync M-Pesa Messages',
        'This will read all M-Pesa messages and update your transaction history.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Full Sync',
            onPress: async () => {
              const result = await SyncService.fullSync();
              Alert.alert(
                'Sync Complete',
                `Synced ${result.inserted} transactions\n` +
                `Parsed: ${result.parsed}/${result.totalMessages}\n` +
                `Skipped: ${result.skipped}`,
                [{ text: 'OK', onPress: loadSettings }]
              );
            },
          },
        ]
      );
    } catch (error) {
      console.error('Sync failed:', error);
      Alert.alert('Error', 'Failed to sync messages');
    }
  };

  const handleDeleteAllData = async () => {
    try {
      await DatabaseService.deleteAllTransactions();
      setDeleteDialogVisible(false);
      Alert.alert('Success', 'All transaction data has been deleted.', [
        { text: 'OK', onPress: loadSettings },
      ]);
    } catch (error) {
      console.error('Failed to delete data:', error);
      Alert.alert('Error', 'Failed to delete data');
    }
  };

  const formatCurrency = (amount: number): string => {
    return `KSh ${amount.toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage your preferences</Text>
      </View>

      {/* App Info */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>App Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Platform</Text>
            <Text style={styles.infoValue}>{Platform.OS}</Text>
          </View>
        </Card.Content>
      </Card>

      {/* Data Summary */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Data Summary</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Transactions</Text>
            <Text style={styles.infoValue}>{totalTransactions}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Current Balance</Text>
            <Text style={styles.infoValue}>{formatCurrency(currentBalance)}</Text>
          </View>
          {lastSync && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Sync</Text>
              <Text style={styles.infoValue}>{formatDate(lastSync)}</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Permissions */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Permissions</Text>
          <List.Item
            title="SMS Permission"
            description={
              smsPermission
                ? 'Granted - Can read M-Pesa messages'
                : 'Not granted - Required to read M-Pesa messages'
            }
            left={(props) => (
              <List.Icon
                {...props}
                icon={smsPermission ? 'check-circle' : 'alert-circle'}
                color={smsPermission ? '#4caf50' : '#f44336'}
              />
            )}
            right={() =>
              !smsPermission ? (
                <Button mode="outlined" onPress={handleRequestSMSPermission}>
                  Grant
                </Button>
              ) : null
            }
          />
        </Card.Content>
      </Card>

      {/* Actions */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Actions</Text>

          <Button
            mode="contained"
            onPress={handleSync}
            style={styles.actionButton}
            icon="sync"
          >
            Sync M-Pesa Messages
          </Button>

          <Button
            mode="outlined"
            onPress={() => setDeleteDialogVisible(true)}
            style={styles.actionButton}
            icon="delete"
            buttonColor="#fff"
            textColor="#f44336"
          >
            Delete All Data
          </Button>
        </Card.Content>
      </Card>

      {/* About */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>About</Text>
          <Text style={styles.aboutText}>
            M-Pesa SMS Analytics reads your M-Pesa transaction messages and provides
            financial insights.
          </Text>
          <Text style={styles.aboutText}>
            All data is stored locally on your device. No data is sent to any server.
          </Text>
        </Card.Content>
      </Card>

      {/* Privacy */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Privacy & Security</Text>
          <List.Item
            title="Local Storage Only"
            description="All data stored on your device"
            left={(props) => <List.Icon {...props} icon="lock" />}
          />
          <List.Item
            title="No Cloud Sync"
            description="No data sent to servers"
            left={(props) => <List.Icon {...props} icon="cloud-off-outline" />}
          />
          <List.Item
            title="M-Pesa Only"
            description="Only reads M-Pesa messages"
            left={(props) => <List.Icon {...props} icon="shield-check" />}
          />
        </Card.Content>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={deleteDialogVisible}
          onDismiss={() => setDeleteDialogVisible(false)}
        >
          <Dialog.Title>Delete All Data?</Dialog.Title>
          <Dialog.Content>
            <Text>
              This will permanently delete all transaction data from your device. This
              action cannot be undone.
            </Text>
            <Text style={styles.warningText}>
              You can re-sync your M-Pesa messages after deletion.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleDeleteAllData} textColor="#f44336">
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  card: {
    margin: 16,
    marginTop: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  actionButton: {
    marginTop: 8,
  },
  aboutText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  warningText: {
    marginTop: 12,
    fontSize: 14,
    color: '#f44336',
    fontWeight: '600',
  },
});
