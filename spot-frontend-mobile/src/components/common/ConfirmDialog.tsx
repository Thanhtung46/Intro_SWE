import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * App-styled replacement for the OS's native Alert.alert confirm — used
 * anywhere a destructive/irreversible action (cancel a join request, etc.)
 * needs a "are you sure" step. Centered card over a dark scrim, matching
 * FilterSheet/JoinMatchSheet's Modal + sheetOverlay pattern rather than the
 * plain platform dialog.
 */
export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = true,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity testID="confirm-dialog-cancel" style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="confirm-dialog-confirm"
              style={[styles.confirmButton, destructive && styles.confirmButtonDestructive]}
              onPress={onConfirm}
            >
              <Text style={[styles.confirmButtonText, destructive && styles.confirmButtonTextDestructive]}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.sheetOverlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.headingText },
  message: { fontSize: 14, color: colors.bodyText, lineHeight: 20 },
  buttonRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingVertical: spacing.sm,
  },
  cancelButtonText: { fontSize: 14, fontWeight: '700', color: colors.headingText },
  confirmButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: 12,
    paddingVertical: spacing.sm,
  },
  confirmButtonDestructive: { backgroundColor: colors.error },
  confirmButtonText: { fontSize: 14, fontWeight: '700', color: colors.white },
  confirmButtonTextDestructive: { color: colors.white },
});
