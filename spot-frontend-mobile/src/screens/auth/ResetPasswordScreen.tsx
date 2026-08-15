import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { OtpInput } from '../../components/OtpInput';
import { PasswordField } from '../../components/PasswordField';
import { ResetPasswordFieldErrors, resetPasswordSchema } from '../../schemas/resetPasswordSchema';
import { resetPassword } from '../../services/authService';
import { colors } from '../../theme/colors';

export default function ResetPasswordScreen({
  email,
  onBack,
  onResetComplete,
}: {
  email: string;
  onBack: () => void;
  onResetComplete: () => void;
}) {
  const [otp, setOtp] = useState('');
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
      Alert.alert(
        'Success',
        response.message || 'Password has been reset successfully. You can now log in.',
        [{ text: 'OK', onPress: onResetComplete }]
      );
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
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Reset Password</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="lock-open" size={26} color={colors.primary} />
          </View>

          <Text style={styles.title}>Create New Password</Text>
          <Text style={styles.subtitle}>
            Your new password must be different from previous used passwords.
          </Text>

          <Text style={styles.otpLabel}>OTP Code</Text>
          <OtpInput value={otp} onChange={setOtp} error={!!errors.otp} containerStyle={styles.otpRow} />
          {errors.otp ? <Text style={styles.otpError}>{errors.otp}</Text> : null}

          <PasswordField
            label="New Password"
            placeholder="Enter new password"
            value={newPassword}
            onChangeText={setNewPassword}
            error={errors.newPassword}
            leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.placeholder} />}
          />

          <PasswordField
            label="Confirm Password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={errors.confirmPassword}
            leftIcon={<Ionicons name="reload-outline" size={18} color={colors.placeholder} />}
          />

          {formError ? <Text style={styles.formError}>{formError}</Text> : null}

          <TouchableOpacity
            testID="update-password-button"
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Updating...' : 'Update Password →'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.screenBackground,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: colors.screenBackground,
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
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
    backgroundColor: colors.white,
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
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.subtitle,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  otpLabel: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 6,
  },
  otpRow: {
    marginBottom: 4,
  },
  otpError: {
    marginTop: 4,
    marginBottom: 12,
    fontSize: 12,
    color: colors.error,
  },
  formError: {
    color: colors.error,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
