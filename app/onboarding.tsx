import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, Fonts } from '@/constants/theme';

export default function OnboardingScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.iconRow}>
          <View style={styles.iconChip}>
            <MaterialIcons name="account-balance-wallet" size={22} color={Colors.primary} />
          </View>
          <View style={[styles.iconChip, styles.iconChipCenter]}>
            <MaterialIcons name="sms" size={22} color={Colors.primary} />
          </View>
          <View style={styles.iconChip}>
            <MaterialIcons name="analytics" size={22} color={Colors.primary} />
          </View>
        </View>

        <Text style={styles.appName}>M-Pesa Analytics</Text>

        <View style={styles.smsCard}>
          <Text style={styles.smsLabel}>MPESA MESSAGE</Text>
          <Text style={styles.smsBody}>
            KHS5,240.00 paid to ARTCAFE. 24/05/23 12:45 PM. Ref: QB92J1K0L.
          </Text>
          <View style={styles.smsDivider} />
          <View style={styles.smsFooter}>
            <MaterialIcons name="auto-awesome" size={12} color={Colors.primary} />
            <Text style={styles.smsFooterText}>Auto-detected & categorized</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Automated Financial Tracking</Text>
        <Text style={styles.bodyText}>
          We transform your M-Pesa SMS alerts into beautiful, actionable insights. No manual entry.
          No bank sync. Just clarity.
        </Text>

        <View style={styles.featureList}>
          {FEATURES.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <MaterialIcons name={f.icon as any} size={16} color={Colors.primary} />
              </View>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.ctaButton}
          activeOpacity={0.85}
          onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.ctaText}>Get Started</Text>
          <MaterialIcons name="arrow-forward" size={18} color={Colors.white} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.signInLink} activeOpacity={0.7}>
          <Text style={styles.signInText}>Already have an account? </Text>
          <Text style={styles.signInAction}>Sign In</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const FEATURES = [
  { icon: 'pie-chart', label: 'Spending breakdown by category' },
  { icon: 'trending-up', label: 'Monthly inflow & outflow trends' },
  { icon: 'notifications-active', label: 'Budget overrun alerts' },
  { icon: 'file-download', label: 'Export your financial data' },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 40,
    alignItems: 'center',
  },
  iconRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  iconChip: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.onSurface,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  iconChipCenter: {
    backgroundColor: Colors.primaryFixed,
  },
  appName: {
    fontFamily: Fonts.manrope.extraBold,
    fontSize: 30,
    color: Colors.onSurface,
    marginBottom: 28,
    letterSpacing: -0.5,
  },
  smsCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 28,
    shadowColor: Colors.onSurface,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  smsLabel: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 9,
    color: Colors.primary,
    letterSpacing: 2,
    marginBottom: 8,
  },
  smsBody: {
    fontFamily: Fonts.inter.regular,
    fontSize: 14,
    color: Colors.onSurface,
    lineHeight: 22,
  },
  smsDivider: {
    height: 1,
    backgroundColor: Colors.surfaceContainerHigh,
    marginVertical: 12,
  },
  smsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  smsFooterText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 11,
    color: Colors.primary,
  },
  sectionTitle: {
    fontFamily: Fonts.manrope.bold,
    fontSize: 20,
    color: Colors.onSurface,
    textAlign: 'center',
    marginBottom: 12,
  },
  bodyText: {
    fontFamily: Fonts.inter.regular,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  featureList: {
    width: '100%',
    gap: 10,
    marginBottom: 36,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    fontFamily: Fonts.inter.medium,
    fontSize: 14,
    color: Colors.onSurface,
  },
  ctaButton: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaText: {
    fontFamily: Fonts.manrope.bold,
    fontSize: 16,
    color: Colors.white,
  },
  signInLink: {
    flexDirection: 'row',
  },
  signInText: {
    fontFamily: Fonts.inter.regular,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  signInAction: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.primary,
  },
});
