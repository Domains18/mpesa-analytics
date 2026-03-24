import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Colors, Fonts } from '@/constants/theme';
import { useApp } from '@/store/app-context';

type SettingRowProps = {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  chevron?: boolean;
  danger?: boolean;
};

function SettingRow({ icon, label, value, onPress, chevron = true, danger = false }: SettingRowProps) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.settingIcon, danger && styles.settingIconDanger]}>
        <MaterialIcons name={icon as any} size={18} color={danger ? Colors.error : Colors.onSurfaceVariant} />
      </View>
      <Text style={[styles.settingLabel, danger && styles.settingLabelDanger]}>{label}</Text>
      {value && <Text style={styles.settingValue}>{value}</Text>}
      {chevron && (
        <MaterialIcons
          name="chevron-right"
          size={20}
          color={danger ? Colors.error : Colors.outlineVariant}
        />
      )}
    </TouchableOpacity>
  );
}

type ToggleRowProps = {
  icon: string;
  label: string;
  subtitle?: string;
  value: boolean;
  onToggle: (v: boolean) => void;
};

function ToggleRow({ icon, label, subtitle, value, onToggle }: ToggleRowProps) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingIcon}>
        <MaterialIcons name={icon as any} size={18} color={Colors.onSurfaceVariant} />
      </View>
      <View style={styles.toggleInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {subtitle && <Text style={styles.toggleSubtitle}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Colors.surfaceContainerHigh, true: Colors.primaryFixed }}
        thumbColor={value ? Colors.primary : Colors.outline}
        ios_backgroundColor={Colors.surfaceContainerHigh}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const { totalCount, lastSync, clearData } = useApp();
  const [faceId, setFaceId] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [budgetAlerts, setBudgetAlerts] = useState(true);
  const [loginActivity, setLoginActivity] = useState(false);

  const lastSyncLabel = lastSync
    ? new Date(lastSync).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Never';

  function confirmClear() {
    Alert.alert(
      'Clear All Data',
      `This will permanently delete all ${totalCount} imported transactions. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: clearData },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <MaterialIcons name="person" size={36} color={Colors.white} />
            </View>
            <View style={styles.avatarBadge}>
              <MaterialIcons name="verified" size={14} color={Colors.primary} />
            </View>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Alex Chen</Text>
            <Text style={styles.profileRole}>Financial Architect</Text>
            <View style={styles.tierBadge}>
              <MaterialIcons name="workspace-premium" size={12} color={Colors.secondary} />
              <Text style={styles.tierText}>Premium Account</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.editProfileBtn}>
            <MaterialIcons name="edit" size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.emailRow}>
          <MaterialIcons name="email" size={14} color={Colors.onSurfaceVariant} />
          <Text style={styles.emailText}>alex.chen@architect.finance</Text>
        </View>

        <View style={styles.body}>
          {/* Profile Information */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Profile Information</Text>
            <SettingRow icon="badge" label="Display Name" value="Alex Chen" />
            <SettingRow icon="phone" label="Phone Number" value="+254 7xx xxx xxx" />
            <SettingRow icon="language" label="Currency" value="KES" />
          </View>

          {/* Security */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Security & Access</Text>
            <ToggleRow
              icon="fingerprint"
              label="Face ID / Touch ID"
              subtitle="Use biometrics to unlock"
              value={faceId}
              onToggle={setFaceId}
            />
            <SettingRow icon="lock-outline" label="Change PIN" />
            <SettingRow icon="devices" label="Active Sessions" value="2 devices" />
          </View>

          {/* Notifications */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Alerts & Notifications</Text>
            <ToggleRow
              icon="bar-chart"
              label="Weekly Smart Report"
              subtitle="Every Monday at 8:00 AM"
              value={weeklyReport}
              onToggle={setWeeklyReport}
            />
            <ToggleRow
              icon="notification-important"
              label="Budget Overrun Alerts"
              subtitle="When you exceed a budget"
              value={budgetAlerts}
              onToggle={setBudgetAlerts}
            />
            <ToggleRow
              icon="security"
              label="Login Activity"
              subtitle="Notify on new sign-ins"
              value={loginActivity}
              onToggle={setLoginActivity}
            />
          </View>

          {/* Data */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Data Portability</Text>
            <SettingRow icon="file-download" label="Export Data" value="CSV / PDF" />
            <SettingRow icon="storage" label="Transactions Stored" value={`${totalCount}`} chevron={false} />
            <SettingRow icon="sync" label="Last Synced" value={lastSyncLabel} chevron={false} />
            <SettingRow icon="delete-forever" label="Clear All Data" danger onPress={confirmClear} />
          </View>

          {/* About */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>About Analytics</Text>
            <SettingRow icon="info-outline" label="Version" value="v2.4.12-pro" chevron={false} />
            <SettingRow icon="privacy-tip" label="Privacy Policy" />
            <SettingRow icon="gavel" label="Terms of Service" />
            <SettingRow icon="help-outline" label="Help & Support" />
          </View>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.85}>
            <MaterialIcons name="logout" size={18} color={Colors.error} />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  headerTitle: {
    fontFamily: Fonts.manrope.bold,
    fontSize: 22,
    color: Colors.onSurface,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    gap: 14,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.surfaceContainerLowest,
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontFamily: Fonts.manrope.extraBold,
    fontSize: 20,
    color: Colors.onSurface,
  },
  profileRole: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    backgroundColor: '#eaf4ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  tierText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 11,
    color: Colors.secondary,
  },
  editProfileBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  emailText: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  body: {
    padding: 16,
    gap: 14,
  },
  sectionCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    paddingVertical: 4,
    shadowColor: Colors.onSurface,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontFamily: Fonts.manrope.semiBold,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerLow,
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingIconDanger: {
    backgroundColor: '#ffefec',
  },
  settingLabel: {
    flex: 1,
    fontFamily: Fonts.inter.medium,
    fontSize: 14,
    color: Colors.onSurface,
  },
  settingLabelDanger: {
    color: Colors.error,
  },
  settingValue: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    marginRight: 4,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleSubtitle: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffefec',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f9563030',
  },
  logoutText: {
    fontFamily: Fonts.manrope.semiBold,
    fontSize: 15,
    color: Colors.error,
  },
});
