import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { spacing } from '@/constants/spacing';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/theme';

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
  cancelLabel,
  destructive = true,
  onConfirm,
  onCancel,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity testID="confirm-dialog-cancel" style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>{cancelLabel ?? t('common.cancel')}</Text>
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.modalOverlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  message: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  buttonRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    paddingVertical: spacing.sm,
  },
  cancelButtonText: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  confirmButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.sm,
  },
  confirmButtonDestructive: { backgroundColor: colors.error },
  confirmButtonText: { fontSize: 14, fontWeight: '700', color: colors.white },
  confirmButtonTextDestructive: { color: colors.white },
});
