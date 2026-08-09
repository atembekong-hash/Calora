/**
 * AccountSection — displayed in the Profile tab.
 *
 * Signed-out state: concise sign-in prompt with a "Sign in" button.
 * Signed-in state: account details (email, provider), Sign Out, and a
 *   Delete Account option with a two-step confirmation modal.
 *
 * ─── Delete-account architecture note ────────────────────────────────────
 * Deleting the Supabase Auth user record requires the service-role key, which
 * must never appear in the mobile bundle. The DELETE /api/v1/account endpoint
 * on the API server accepts the user's Bearer token, verifies it server-side,
 * and calls supabase.auth.admin.deleteUser() with the resolved user ID.
 */

import { Feather } from '@expo/vector-icons';
import { customFetch } from '@workspace/api-client-react';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useCalora } from '@/context/CaloraContext';
import { useAuth } from '@/context/AuthContext';
import { BRAND } from '@/lib/brand';
import { spacing, radius, typography } from '@/constants/tokens';

// ─── Types ────────────────────────────────────────────────────────────────────

type Provider = 'google' | 'email' | 'unknown';

function resolveProvider(session: NonNullable<ReturnType<typeof useAuth>['session']>): Provider {
  const identities = session.user.identities ?? [];
  if (identities.some((id) => id.provider === 'google')) return 'google';
  if (identities.some((id) => id.provider === 'email')) return 'email';
  return 'unknown';
}

function providerLabel(p: Provider): string {
  switch (p) {
    case 'google': return 'Google';
    case 'email': return 'Email & password';
    default: return 'Unknown';
  }
}

function providerIcon(p: Provider): keyof typeof Feather.glyphMap {
  switch (p) {
    case 'google': return 'globe';
    case 'email': return 'mail';
    default: return 'user';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface AccountSectionProps {
  /** font scale multiplier — pass same value used by the parent screen */
  fontScale?: number;
  /** clearAllData from CaloraContext — called during account deletion */
  clearAllData: () => Promise<void>;
}

export function AccountSection({ fontScale = 1, clearAllData }: AccountSectionProps) {
  const { colors, clearProfilePhoto } = useCalora();
  const { session, signOut } = useAuth();

  const [signOutLoading, setSignOutLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const f = fontScale;

  // ── Derived ────────────────────────────────────────────────────────────────

  const provider = session ? resolveProvider(session) : null;
  const email = session?.user.email ?? null;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSignOut = useCallback(async () => {
    Alert.alert(
      'Sign out?',
      `You'll stay signed out of ${BRAND.name} on this device. Your local data stays intact.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            setSignOutLoading(true);
            try {
              await clearProfilePhoto();
              await signOut();
            } finally {
              setSignOutLoading(false);
            }
          },
        },
      ],
    );
  }, [signOut, clearProfilePhoto]);

  const handleOpenDeleteModal = useCallback(() => {
    setDeleteConfirmText('');
    setDeleteModal(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') return;
    if (deleteLoading) return;
    if (!session) return;

    setDeleteLoading(true);
    try {
      // Call the server-side endpoint which uses the service-role key to
      // permanently remove the Supabase Auth user record. The user's JWT is
      // sent as a Bearer token; the server verifies and resolves the user ID.
      await customFetch('/api/v1/account', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      // Cloud record deleted — now clear local data and sign out.
      await clearAllData();
      await signOut();

      setDeleteModal(false);

      setTimeout(() => {
        Alert.alert(
          'Account deleted',
          `Your ${BRAND.name} account and all associated data have been permanently removed.`,
        );
      }, 300);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      Alert.alert('Deletion failed', message);
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteConfirmText, deleteLoading, session, clearAllData, signOut]);

  // ── Signed-out state ───────────────────────────────────────────────────────

  if (!session) {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, fontSize: 18 * f }]}>Account</Text>
        <View style={[styles.signInCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.signInIconWrap, { backgroundColor: colors.accent }]}>
            <Feather name="cloud" size={20} color={colors.accentForeground} />
          </View>
          <View style={styles.signInTextGroup}>
            <Text style={[styles.signInTitle, { color: colors.foreground, fontSize: 15 * f }]}>
              Sync across devices
            </Text>
            <Text style={[styles.signInBody, { color: colors.mutedForeground, fontSize: 12 * f }]}>
              Sign in to back up your diary and progress securely.
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Sign in to CaloraApp"
            onPress={() => router.push('/auth/sign-in' as any)}
            style={[styles.signInButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.signInButtonText, { color: colors.primaryForeground, fontSize: 13 * f }]}>
              Sign in
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Signed-in state ────────────────────────────────────────────────────────

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.foreground, fontSize: 18 * f }]}>Account</Text>

      {/* Account info card */}
      <View style={[styles.accountCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Avatar + email row */}
        <View style={styles.accountRow}>
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Feather name="user" size={18} color={colors.accentForeground} />
          </View>
          <View style={styles.accountTextGroup}>
            <Text style={[styles.accountEmail, { color: colors.foreground, fontSize: 14 * f }]} numberOfLines={1}>
              {email ?? 'Unknown email'}
            </Text>
            <View style={styles.providerRow}>
              <Feather name={providerIcon(provider!)} size={11} color={colors.mutedForeground} />
              <Text style={[styles.providerText, { color: colors.mutedForeground, fontSize: 11 * f }]}>
                {providerLabel(provider!)}
              </Text>
            </View>
          </View>
          <View style={[styles.activeBadge, { backgroundColor: colors.accent }]}>
            <Feather name="check-circle" size={13} color={colors.accentForeground} />
            <Text style={[styles.activeBadgeText, { color: colors.accentForeground, fontSize: 10 * f }]}>Active</Text>
          </View>
        </View>

        <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

        {/* Sign out row */}
        <Pressable
          accessibilityLabel="Sign out"
          onPress={handleSignOut}
          disabled={signOutLoading}
          style={styles.accountAction}
        >
          {signOutLoading
            ? <ActivityIndicator size="small" color={colors.mutedForeground} />
            : <Feather name="log-out" size={16} color={colors.mutedForeground} />}
          <Text style={[styles.accountActionText, { color: colors.foreground, fontSize: 14 * f }]}>Sign out</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} style={{ marginLeft: 'auto' }} />
        </Pressable>

        <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

        {/* Delete account row */}
        <Pressable
          accessibilityLabel="Delete account"
          onPress={handleOpenDeleteModal}
          style={styles.accountAction}
        >
          <Feather name="trash-2" size={16} color={colors.destructive} />
          <Text style={[styles.accountActionText, { color: colors.destructive, fontSize: 14 * f }]}>Delete account</Text>
          <Feather name="chevron-right" size={16} color={colors.destructive} style={{ marginLeft: 'auto' }} />
        </Pressable>
      </View>

      {/* ── Delete confirmation modal ── */}
      <Modal
        visible={deleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!deleteLoading) setDeleteModal(false); }}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.background }]}>
            {/* Icon */}
            <View style={[styles.modalIcon, { backgroundColor: `${colors.destructive}18` }]}>
              <Feather name="alert-triangle" size={24} color={colors.destructive} />
            </View>

            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Delete your account?</Text>
            <Text style={[styles.modalBody, { color: colors.mutedForeground }]}>
              This will permanently delete your account and all data — diary entries, weight logs, meals, and profile — from this device and our servers. This cannot be undone.
              {'\n\n'}
              To confirm, type <Text style={{ fontFamily: 'Inter_700Bold', color: colors.destructive }}>DELETE</Text> below.
            </Text>

            <TextInput
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="Type DELETE to confirm"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!deleteLoading}
              style={[
                styles.deleteInput,
                {
                  color: colors.foreground,
                  backgroundColor: colors.card,
                  borderColor: deleteConfirmText.trim().toUpperCase() === 'DELETE'
                    ? colors.destructive
                    : colors.input,
                },
              ]}
            />

            <Pressable
              accessibilityLabel="Confirm account deletion"
              onPress={handleConfirmDelete}
              disabled={deleteLoading || deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
              style={[
                styles.deleteButton,
                {
                  backgroundColor: colors.destructive,
                  opacity: (deleteLoading || deleteConfirmText.trim().toUpperCase() !== 'DELETE') ? 0.4 : 1,
                },
              ]}
            >
              {deleteLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.deleteButtonText}>Delete account and data</Text>}
            </Pressable>

            <Pressable
              accessibilityLabel="Cancel account deletion"
              disabled={deleteLoading}
              onPress={() => setDeleteModal(false)}
              style={[styles.cancelButton, { backgroundColor: colors.muted, opacity: deleteLoading ? 0.5 : 1 }]}
            >
              <Text style={[styles.cancelButtonText, { color: colors.foreground }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  section: { marginBottom: 4 },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.3,
    marginTop: 25,
    marginBottom: 11,
  },

  // Signed-out card
  signInCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  signInIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInTextGroup: { gap: 3, flex: 1 },
  signInTitle: { fontFamily: 'Inter_700Bold' },
  signInBody: { fontFamily: 'Inter_400Regular', lineHeight: 17 },
  signInButton: {
    alignSelf: 'flex-start',
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  signInButtonText: { fontFamily: 'Inter_700Bold' },

  // Signed-in card
  accountCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountTextGroup: { flex: 1, gap: 3 },
  accountEmail: { fontFamily: 'Inter_600SemiBold' },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  providerText: { fontFamily: 'Inter_400Regular' },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  activeBadgeText: { fontFamily: 'Inter_700Bold', letterSpacing: 0.3 },
  cardDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: spacing.lg },
  accountAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg - 2,
    minHeight: 52,
  },
  accountActionText: { fontFamily: 'Inter_400Regular' },

  // Delete modal
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  modalIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    letterSpacing: -0.4,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  deleteInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: spacing.lg,
    letterSpacing: 2,
  },
  deleteButton: {
    width: '100%',
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  deleteButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#fff',
  },
  cancelButton: {
    width: '100%',
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
});
