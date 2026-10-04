import { Feather } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScalePressable } from '@/components/ScalePressable';

export interface ConfirmedDeletionControlProps {
  itemName: string;
  /** Return false when the durable delete intent could not be saved. */
  onConfirm: () => boolean | Promise<boolean>;
  destructiveColor: string;
  foregroundColor: string;
  mutedForegroundColor: string;
  surfaceColor: string;
  borderColor: string;
}

/**
 * Keeps destructive diary actions behind an explicit, reversible confirmation
 * step that behaves consistently on iOS, Android, and web.
 */
export function ConfirmedDeletionControl({
  itemName,
  onConfirm,
  destructiveColor,
  foregroundColor,
  mutedForegroundColor,
  surfaceColor,
  borderColor,
}: ConfirmedDeletionControlProps) {
  const [confirming, setConfirming] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const committedRef = useRef(false);

  const requestConfirmation = () => {
    committedRef.current = false;
    setFailure(null);
    setConfirming(true);
  };

  const cancelConfirmation = () => {
    committedRef.current = false;
    setFailure(null);
    setConfirming(false);
  };

  const commitDeletion = async () => {
    if (committedRef.current) return;
    committedRef.current = true;
    setIsCommitting(true);
    setFailure(null);
    try {
      const removed = await onConfirm();
      if (removed === false) {
        committedRef.current = false;
        setFailure("Couldn't save this deletion safely. Please try again.");
      }
    } catch {
      committedRef.current = false;
      setFailure("Couldn't save this deletion safely. Please try again.");
    } finally {
      setIsCommitting(false);
    }
  };

  if (!confirming) {
    return (
      <ScalePressable
        accessibilityLabel="Delete edited entry"
        accessibilityHint="Opens a confirmation before deleting"
        testID="request-delete-entry"
        onPress={requestConfirmation}
        scale={0.98}
        haptic="none"
        style={styles.deleteEntry}
      >
        <Feather name="trash-2" size={15} color={destructiveColor} />
        <Text style={[styles.deleteEntryText, { color: destructiveColor }]}>Delete this entry</Text>
      </ScalePressable>
    );
  }

  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={`Confirm deletion of ${itemName}`}
      style={[styles.confirmation, { backgroundColor: surfaceColor, borderColor }]}
      testID="delete-entry-confirmation"
    >
      <Text style={[styles.confirmationTitle, { color: foregroundColor }]}>Delete this entry?</Text>
      <Text style={[styles.confirmationBody, { color: mutedForegroundColor }]}>This removes {itemName} from your diary. This action cannot be undone.</Text>
      {failure ? <Text accessibilityRole="alert" style={[styles.confirmationFailure, { color: destructiveColor }]}>{failure}</Text> : null}
      <View style={styles.confirmationActions}>
        <ScalePressable
          accessibilityLabel="Cancel entry deletion"
          testID="cancel-delete-entry"
          onPress={cancelConfirmation}
          disabled={isCommitting}
          scale={0.98}
          haptic="none"
          style={[styles.confirmationButton, { borderColor }]}
        >
          <Text style={[styles.confirmationButtonText, { color: foregroundColor }]}>Cancel</Text>
        </ScalePressable>
        <ScalePressable
          accessibilityLabel="Confirm entry deletion"
          accessibilityHint="Permanently removes this diary entry"
          testID="confirm-delete-entry"
          onPress={() => void commitDeletion()}
          disabled={isCommitting}
          scale={0.96}
          haptic="medium"
          style={[styles.confirmationButton, { backgroundColor: destructiveColor, borderColor: destructiveColor }]}
        >
          <Text style={[styles.confirmationButtonText, styles.confirmationButtonTextOnDestructive]}>{isCommitting ? 'Saving…' : 'Delete entry'}</Text>
        </ScalePressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  deleteEntry: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  deleteEntryText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  confirmation: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    marginTop: 14,
    padding: 14,
  },
  confirmationTitle: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 14,
  },
  confirmationBody: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  confirmationFailure: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  confirmationActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  confirmationButton: {
    alignItems: 'center',
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  confirmationButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  confirmationButtonTextOnDestructive: {
    color: '#FFFFFF',
  },
});
