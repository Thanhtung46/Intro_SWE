import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { OtpInput } from '@/components/OtpInput';
import { PasswordField } from '@/components/PasswordField';
import { ResetPasswordFieldErrors, resetPasswordSchema } from '@/schemas/resetPasswordSchema';
import { resetPassword } from '@/services/authService';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/theme';

export default function ResetPasswordScreen({
  email,
  otp,
  onBack,
  onResetComplete,
}: {
  email: string;
  /** Collected on the previous OTP screen — this screen only asks for the
   * new password, per the split-flow design (SPOT flow fix, 2026-08-16). */
  otp: string;
  onBack: () => void;
  onResetComplete: () => void;
}) {
  const { t } = useLanguage();
  const { colors: c } = useTheme();
  const styles = useMemo(() => getStyles(c), [c]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<ResetPasswordFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setFormError(null);

    const result = resetPasswordSchema.safeParse({ otp, newPassword, confirmPassword });
    if (!result.success) {
      const fieldErrors: ResetPasswordFieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ResetPasswordFieldErrors;
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    const response = await resetPassword({
      email,
      otp: result.data.otp,
      newPassword: result.data.newPassword,
      confirmPassword: result.data.confirmPassword,
    });
    setSubmitting(false);

    if (response.success) {
      onResetComplete();
      return;
    }

    if (response.attemptsRemaining !== undefined) {
      setFormError(`${response.message} (${response.attemptsRemaining} attempt(s) remaining)`);
    } else {
      setFormError(response.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('resetPassword.topBarTitle')}</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="lock-open" size={26} color={c.primary} />
          </View>

          <Text style={styles.title}>{t('resetPassword.title')}</Text>
          <Text style={styles.subtitle}>{t('resetPassword.subtitle')}</Text>

          <PasswordField
            label={t('resetPassword.newPasswordLabel')}
            placeholder={t('resetPassword.newPasswordPlaceholder')}
            value={newPassword}
            onChangeText={setNewPassword}
            error={errors.newPassword}
            leftIcon={<Ionicons name="lock-closed-outline" size={18} color={c.textMuted} />}
            themeColors={c}
          />

          <PasswordField
            label={t('resetPassword.confirmPasswordLabel')}
            placeholder={t('resetPassword.confirmPasswordPlaceholder')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={errors.confirmPassword}
            leftIcon={<Ionicons name="reload-outline" size={18} color={c.textMuted} />}
            themeColors={c}
          />

          {formError ? <Text style={styles.formError}>{formError}</Text> : null}

          <TouchableOpacity
            testID="update-password-button"
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? t('resetPassword.updating') : t('resetPassword.updateButton')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: c.background,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 56,
      paddingHorizontal: 16,
      backgroundColor: c.background,
    },
    topBarTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
    },
    topBarSpacer: {
      width: 22,
    },
    content: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: c.surface,
      borderRadius: 20,
      paddingHorizontal: 24,
      paddingVertical: 32,
      alignItems: 'stretch',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    iconCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.tintedSurface,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: c.textPrimary,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      color: c.textSecondary,
      textAlign: 'center',
      marginTop: 8,
      marginBottom: 24,
    },
    otpLabel: {
      fontSize: 14,
      color: c.textPrimary,
      marginBottom: 6,
    },
    otpRow: {
      marginBottom: 4,
    },
    otpError: {
      marginTop: 4,
      marginBottom: 12,
      fontSize: 12,
      color: c.error,
    },
    formError: {
      color: c.error,
      fontSize: 13,
      textAlign: 'center',
      marginBottom: 12,
    },
    submitButton: {
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      color: c.textPrimary,
      fontSize: 16,
      fontWeight: '700',
    },
  });
}
