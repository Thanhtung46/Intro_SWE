import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { spacing } from '@/constants/spacing';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/constants/theme';

type Tone = 'success' | 'warning';

type Props = {
  visible: boolean;
  tone: Tone;
  title: string;
  message: string;
  buttonLabel?: string;
  onDismiss: () => void;
};

/**
 * App-styled single-button dialog for one-off outcomes (join request sent,
 * with or without a skill-mismatch warning) — replaces the plain native
 * Alert.alert with something matching the app's palette, same reasoning as
 * ConfirmDialog.tsx for confirm/cancel prompts.
 */
export default function InfoDialog({ visible, tone, title, message, buttonLabel, onDismiss }: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  const toneStyle = tone === 'success'
    ? { icon: 'checkmark-circle' as const, iconColor: colors.successText, iconBg: colors.successSurface }
    : { icon: 'warning' as const, iconColor: colors.warningText, iconBg: colors.warningSurface };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: toneStyle.iconBg }]}>
            <Ionicons name={toneStyle.icon} size={24} color={toneStyle.iconColor} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity testID="info-dialog-dismiss" style={styles.button} onPress={onDismiss}>
            <Text style={styles.buttonText}>{buttonLabel ?? t('common.confirm')}</Text>
          </TouchableOpacity>
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
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  message: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, textAlign: 'center' },
  button: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  buttonText: { fontSize: 14, fontWeight: '700', color: colors.white },
});
