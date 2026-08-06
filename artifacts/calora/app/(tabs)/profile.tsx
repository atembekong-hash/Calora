import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemePreference, useCalora } from '@/context/CaloraContext';

const themes: { key: ThemePreference; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'system', label: 'System', icon: 'smartphone' },
  { key: 'light', label: 'Light', icon: 'sun' },
  { key: 'dark', label: 'Dark', icon: 'moon' },
];

export default function ProfileScreen() {
  const { colors, themePreference, setThemePreference } = useCalora();
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [billingModal, setBillingModal] = useState<'purchase' | 'restore' | 'manage' | null>(null);
  const annualMonthlyEquivalent = (69.99 / 12).toFixed(2);
  const annualSavings = (9.99 * 12 - 69.99).toFixed(2);
  const selectedPrice = selectedPlan === 'annual' ? '$69.99' : '$9.99';
  const selectedPeriod = selectedPlan === 'annual' ? 'year' : 'month';

  const handlePurchase = () => setBillingModal('purchase');
  const handleRestore = () => setBillingModal('restore');
  const handleManage = () => setBillingModal('manage');

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: insets.bottom + 104 }} showsVerticalScrollIndicator={false}>
        <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>YOUR SPACE</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Profile & settings</Text>
        <View style={[styles.profileCard, { backgroundColor: colors.hero }]}>
          <View style={[styles.largeAvatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.largeAvatarText, { color: colors.primaryForeground }]}>A</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: colors.onHero }]}>Alex Morgan</Text>
            <Text style={[styles.profileSub, { color: colors.heroMuted }]}>Building a steadier relationship with food</Text>
          </View>
          <Feather name="edit-2" size={17} color={colors.heroMuted} />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Appearance</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Choose how Calora should feel at any hour.</Text>
        <View style={[styles.themePicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {themes.map((theme) => {
            const selected = themePreference === theme.key;
            return (
              <Pressable key={theme.key} accessibilityLabel={`${theme.label} mode`} testID={`theme-${theme.key}`} onPress={() => setThemePreference(theme.key)} style={[styles.themeOption, selected && { backgroundColor: colors.accent }]}>
                <Feather name={theme.icon} size={16} color={selected ? colors.accentForeground : colors.mutedForeground} />
                <Text style={[styles.themeLabel, { color: selected ? colors.accentForeground : colors.mutedForeground }]}>{theme.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.planHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Calora Plus</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>The complete experience, without the noise.</Text>
          </View>
          <View style={[styles.betaPill, { backgroundColor: colors.accent }]}><Text style={[styles.betaText, { color: colors.accentForeground }]}>PLUS</Text></View>
        </View>
        <View style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
          <Text style={[styles.planEyebrow, { color: colors.mutedForeground }]}>CHOOSE YOUR PACE</Text>
          <View style={styles.planChoices}>
            <Pressable
              accessibilityLabel="Choose monthly plan"
              testID="billing-plan-monthly"
              onPress={() => setSelectedPlan('monthly')}
              style={[styles.planChoice, { borderColor: selectedPlan === 'monthly' ? colors.primary : colors.border, backgroundColor: selectedPlan === 'monthly' ? colors.accent : colors.card }]}
            >
              <View style={[styles.radio, { borderColor: selectedPlan === 'monthly' ? colors.primary : colors.mutedForeground }]}>
                {selectedPlan === 'monthly' && <View style={[styles.radioSelected, { backgroundColor: colors.primary }]} />}
              </View>
              <View style={styles.planChoiceCopy}>
                <Text style={[styles.planName, { color: colors.foreground }]}>Monthly</Text>
                <Text style={[styles.planHint, { color: colors.mutedForeground }]}>Cancel anytime</Text>
              </View>
              <Text style={[styles.planPrice, { color: colors.foreground }]}>$9.99<Text style={[styles.planPeriod, { color: colors.mutedForeground }]}> / mo</Text></Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Choose annual plan"
              testID="billing-plan-annual"
              onPress={() => setSelectedPlan('annual')}
              style={[styles.planChoice, { borderColor: selectedPlan === 'annual' ? colors.primary : colors.border, backgroundColor: selectedPlan === 'annual' ? colors.accent : colors.card }]}
            >
              <View style={[styles.radio, { borderColor: selectedPlan === 'annual' ? colors.primary : colors.mutedForeground }]}>
                {selectedPlan === 'annual' && <View style={[styles.radioSelected, { backgroundColor: colors.primary }]} />}
              </View>
              <View style={styles.planChoiceCopy}>
                <Text style={[styles.planName, { color: colors.foreground }]}>Annual <Text style={[styles.savePill, { color: colors.accentForeground, backgroundColor: colors.accent }]}>SAVE 42%</Text></Text>
                <Text style={[styles.planHint, { color: colors.mutedForeground }]}>${annualMonthlyEquivalent} / month equivalent</Text>
              </View>
              <Text style={[styles.planPrice, { color: colors.foreground }]}>$69.99<Text style={[styles.planPeriod, { color: colors.mutedForeground }]}> / yr</Text></Text>
            </Pressable>
          </View>
          <View style={[styles.valueLine, { backgroundColor: colors.muted }]}>
            <Feather name="check-circle" size={15} color={colors.success} />
            <Text style={[styles.valueLineText, { color: colors.foreground }]}>You save ${annualSavings} with annual billing.</Text>
          </View>
          <View style={styles.featureList}>
            {['Unlimited photo and voice logging', 'Verified food confidence and source history', 'Adaptive calorie targets and deeper insights', 'Ad-free, offline-first diary'].map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <Feather name="check" size={15} color={colors.success} />
                <Text style={[styles.featureText, { color: colors.foreground }]}>{feature}</Text>
              </View>
            ))}
          </View>
          <Pressable accessibilityLabel="Continue to billing" testID="billing-continue" onPress={handlePurchase} style={({ pressed }) => [styles.planButton, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}>
            <Text style={[styles.planButtonText, { color: colors.primaryForeground }]}>Continue with {selectedPrice} / {selectedPeriod}</Text>
            <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
          </Pressable>
          <Text style={[styles.billingNote, { color: colors.mutedForeground }]}>Subscription renews automatically unless canceled at least 24 hours before the renewal date. Final price may vary by local taxes and currency.</Text>
          <View style={styles.billingLinks}>
            <Pressable accessibilityLabel="Restore purchases" onPress={handleRestore}><Text style={[styles.billingLink, { color: colors.primary }]}>Restore purchases</Text></Pressable>
            <View style={[styles.linkDot, { backgroundColor: colors.border }]} />
            <Pressable accessibilityLabel="Manage subscription" onPress={handleManage}><Text style={[styles.billingLink, { color: colors.primary }]}>Manage subscription</Text></Pressable>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 25, marginBottom: 11 }]}>Trust & privacy</Text>
        {[
          { icon: 'shield', title: 'Your food data stays yours', body: 'Local-first logging with export and delete controls.' },
          { icon: 'eye-off', title: 'No surveillance ads', body: 'Your meals are never used to target advertisements.' },
          { icon: 'help-circle', title: 'Need a hand?', body: 'Reach a real person when something does not look right.' },
        ].map((item) => (
          <View key={item.title} style={[styles.settingRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.settingIcon, { backgroundColor: colors.muted }]}><Feather name={item.icon as keyof typeof Feather.glyphMap} size={17} color={colors.primary} /></View>
            <View style={{ flex: 1 }}><Text style={[styles.settingTitle, { color: colors.foreground }]}>{item.title}</Text><Text style={[styles.settingBody, { color: colors.mutedForeground }]}>{item.body}</Text></View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </View>
        ))}
        <Text style={[styles.version, { color: colors.mutedForeground }]}>Calora 1.0 preview · Made for steadier days</Text>
      </ScrollView>
      <Modal visible={billingModal !== null} transparent animationType="fade" onRequestClose={() => setBillingModal(null)}>
        <View style={[styles.dialogBackdrop, { backgroundColor: 'rgba(0,0,0,0.46)' }]}>
          <View style={[styles.dialogCard, { backgroundColor: colors.card }]}>
            <View style={[styles.dialogIcon, { backgroundColor: colors.accent }]}>
              <Feather name={billingModal === 'purchase' ? 'lock' : billingModal === 'restore' ? 'rotate-ccw' : 'external-link'} size={20} color={colors.accentForeground} />
            </View>
            <Text style={[styles.dialogTitle, { color: colors.foreground }]}>
              {billingModal === 'purchase' ? 'Billing is ready for setup' : billingModal === 'restore' ? 'Restore purchases' : 'Manage subscription'}
            </Text>
            <Text style={[styles.dialogBody, { color: colors.mutedForeground }]}>
              {billingModal === 'purchase'
                ? `You chose the ${selectedPlan} plan at ${selectedPrice} per ${selectedPeriod}. The App Store and Google Play connection must be enabled before a real charge can be made.`
                : billingModal === 'restore'
                  ? 'Once store billing is connected, this will look up your active Calora Plus entitlement on this device.'
                  : 'Once store billing is connected, this will open the platform subscription settings so cancellation stays one tap away.'}
            </Text>
            <View style={[styles.dialogStatus, { backgroundColor: colors.muted }]}>
              <Feather name="info" size={15} color={colors.primary} />
              <Text style={[styles.dialogStatusText, { color: colors.foreground }]}>No payment has been taken.</Text>
            </View>
            <Pressable accessibilityLabel="Close billing dialog" onPress={() => setBillingModal(null)} style={[styles.dialogButton, { backgroundColor: colors.primary }]}>
              <Text style={[styles.dialogButtonText, { color: colors.primaryForeground }]}>Got it</Text>
            </Pressable>
            <Pressable accessibilityLabel="View billing help" onPress={() => {
              setBillingModal(null);
              Alert.alert('Billing help', 'Calora will support App Store and Google Play subscriptions. Your plan, renewal date, and cancellation path will always be visible here.');
            }} style={styles.dialogSecondaryButton}>
              <Text style={[styles.dialogSecondaryText, { color: colors.primary }]}>How billing works</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  eyebrow: { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1.4, marginBottom: 7 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.7, marginBottom: 20 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 23, padding: 16, marginBottom: 26 },
  largeAvatar: { width: 47, height: 47, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  largeAvatarText: { fontFamily: 'Inter_700Bold', fontSize: 19 },
  profileName: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  profileSub: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 4, maxWidth: 230 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: -0.3 },
  sectionSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 4, marginBottom: 12 },
  themePicker: { flexDirection: 'row', gap: 5, borderWidth: 1, padding: 5, borderRadius: 16, marginBottom: 26 },
  themeOption: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderRadius: 11, paddingVertical: 10 },
  themeLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 11 },
  betaPill: { borderRadius: 7, paddingHorizontal: 7, paddingVertical: 5 },
  betaText: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 1 },
  planCard: { borderWidth: 1.5, borderRadius: 22, padding: 16 },
  planEyebrow: { fontFamily: 'Inter_600SemiBold', fontSize: 9, letterSpacing: 1.1, marginBottom: 8 },
  planChoices: { gap: 8 },
  planChoice: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 15, padding: 11, gap: 9 },
  radio: { width: 19, height: 19, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { width: 9, height: 9, borderRadius: 5 },
  planChoiceCopy: { flex: 1 },
  planName: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  planHint: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 5 },
  planPrice: { fontFamily: 'Inter_700Bold', fontSize: 19 },
  planPeriod: { fontFamily: 'Inter_400Regular', fontSize: 10 },
  savePill: { fontFamily: 'Inter_700Bold', fontSize: 9, paddingHorizontal: 5 },
  valueLine: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginTop: 10 },
  valueLineText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  featureList: { gap: 9, paddingVertical: 15 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  planButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 13, paddingVertical: 13, marginTop: 16 },
  planButtonText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  billingNote: { fontFamily: 'Inter_400Regular', fontSize: 9, lineHeight: 14, textAlign: 'center', marginTop: 12 },
  billingLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 13 },
  billingLink: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  linkDot: { width: 3, height: 3, borderRadius: 2 },
  dialogBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialogCard: { width: '100%', borderRadius: 24, padding: 20 },
  dialogIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  dialogTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, letterSpacing: -0.4 },
  dialogBody: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginTop: 8 },
  dialogStatus: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 11, padding: 10, marginTop: 15 },
  dialogStatusText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  dialogButton: { alignItems: 'center', justifyContent: 'center', borderRadius: 13, paddingVertical: 13, marginTop: 16 },
  dialogButtonText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  dialogSecondaryButton: { alignItems: 'center', paddingTop: 14 },
  dialogSecondaryText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderRadius: 17, padding: 12, marginBottom: 8 },
  settingIcon: { width: 34, height: 34, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  settingTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  settingBody: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 4 },
  version: { fontFamily: 'Inter_400Regular', fontSize: 10, textAlign: 'center', marginTop: 18 },
});