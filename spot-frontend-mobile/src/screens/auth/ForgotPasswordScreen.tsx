import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FormField } from '@/components/FormField';
import { ForgotPasswordFieldErrors, forgotPasswordSchema } from '@/schemas/forgotPasswordSchema';
import { forgotPassword } from '@/services/authService';
import { useLanguage } from '@/context/LanguageContext';
import { colors } from '@/constants/colors';

export default function ForgotPasswordScreen({ onCodeSent }: { onCodeSent: (email: string) => void }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<ForgotPasswordFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setFormError(null);

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      const fieldErrors: ForgotPasswordFieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ForgotPasswordFieldErrors;
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    const response = await forgotPassword(result.data.email);
    setSubmitting(false);

    if (response.success) {
      onCodeSent(result.data.email);
      return;
    }

    setFormError(response.message || 'Something went wrong. Please try again.');
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="lock-closed" size={26} color={colors.primaryDark} />
          </View>

          <Text style={styles.title}>{t('forgotPassword.title')}</Text>
          <Text style={styles.subtitle}>{t('forgotPassword.subtitle')}</Text>

          <FormField
            label={t('forgotPassword.emailLabel')}
            placeholder={t('forgotPassword.emailPlaceholder')}
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            autoCapitalize="none"
            keyboardType="email-address"
            leftIcon={<Ionicons name="mail-outline" size={18} color={colors.placeholder} />}
          />

          {formError ? <Text style={styles.formError}>{formError}</Text> : null}

          <TouchableOpacity
            testID="send-otp-button"
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? t('forgotPassword.sending') : t('forgotPassword.sendButton')}
            </Text>
          </TouchableOpacity>

          <Link href="/auth/login" asChild>
            <TouchableOpacity style={styles.backRow}>
              <Text style={styles.backLink}>{t('forgotPassword.backToLogin')}</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.formScreenBackground,
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
  formError: {
    color: colors.formError,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: colors.primaryDark,
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
  backRow: {
    marginTop: 16,
    alignItems: 'center',
  },
  backLink: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '600',
  },
});
