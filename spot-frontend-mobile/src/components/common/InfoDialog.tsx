import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';

type Tone = 'success' | 'warning';

type Props = {
  visible: boolean;
  tone: Tone;
  title: string;
  message: string;
  buttonLabel?: string;
  onDismiss: () => void;
};

const TONE_STYLES: Record<Tone, { icon: keyof typeof Ionicons.glyphMap; iconColor: string; iconBg: string }> = {
  success: { icon: 'checkmark-circle', iconColor: colors.skillTierGreenText, iconBg: colors.skillTierGreenBg },
  warning: { icon: 'warning', iconColor: colors.skillTierOrangeText, iconBg: colors.skillTierOrangeBg },
};

/**
 * App-styled single-button dialog for one-off outcomes (join request sent,
 * with or without a skill-mismatch warning) — replaces the plain native
 * Alert.alert with something matching the app's palette, same reasoning as
 * ConfirmDialog.tsx for confirm/cancel prompts.
 */
export default function InfoDialog({ visible, tone, title, message, buttonLabel = 'OK', onDismiss }: Props) {
  const toneStyle = TONE_STYLES[tone];
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
            <Text style={styles.buttonText}>{buttonLabel}</Text>
          </TouchableOpacity>
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
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: colors.headingText, textAlign: 'center' },
  message: { fontSize: 14, color: colors.bodyText, lineHeight: 20, textAlign: 'center' },
  button: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  buttonText: { fontSize: 14, fontWeight: '700', color: colors.white },
});
