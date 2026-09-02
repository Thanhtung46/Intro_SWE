import { Link } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FormField } from '@/components/FormField';
import { PasswordField } from '@/components/PasswordField';
import { useUser } from '@/context/UserContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/theme';
import { LoginFieldErrors, loginSchema } from '@/schemas/loginSchema';
import { login } from '@/services/authService';
import { comingSoon } from '@/utils/comingSoon';
import { setRefreshToken, setToken } from '../../utils/authStorage';

export default function LoginScreen({ onLoggedIn }: { onLoggedIn: (role: string) => void }) {
  const { setUser } = useUser();
  const { t } = useLanguage();
  const { colors: c } = useTheme();
  const styles = useMemo(() => getStyles(c), [c]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    setFormError(null);

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: LoginFieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof LoginFieldErrors;
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    const response = await login(result.data);
    setSubmitting(false);

    if (response.success && response.accessToken && response.refreshToken) {
      try {
        await setToken(response.accessToken);
        await setRefreshToken(response.refreshToken);
      } catch {
        setFormError('Could not save session. Please try again.');
        return;
      }
      setUser(response.user || null);
      onLoggedIn(response.user?.role || '');
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
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />

        <Text style={styles.title}>{t('login.title')}</Text>
        <Text style={styles.subtitle}>{t('login.subtitle')}</Text>

        <View style={styles.card}>
          <FormField
            label={t('login.emailLabel')}
            required
            placeholder={t('login.emailPlaceholder')}
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            autoCapitalize="none"
            keyboardType="email-address"
            themeColors={c}
          />

          <PasswordField
            label={t('login.passwordLabel')}
            required
            placeholder={t('login.passwordPlaceholder')}
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            themeColors={c}
            labelRight={
              <Link href="/auth/forgot-password" asChild>
                <TouchableOpacity>
                  <Text style={styles.forgotLink}>{t('login.forgotPassword')}</Text>
                </TouchableOpacity>
              </Link>
            }
          />

          {formError ? <Text style={styles.formError}>{formError}</Text> : null}

          <TouchableOpacity
            testID="login-button"
            style={[styles.loginButton, submitting && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={submitting}
          >
            <Text style={styles.loginButtonText}>{submitting ? t('login.loggingIn') : t('login.loginButton')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.registerRow}>
          <Text style={styles.registerText}>{t('login.noAccount')}</Text>
          <Link href="/auth/register" asChild>
            <TouchableOpacity>
              <Text style={styles.registerLink}>{t('login.register')}</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerCopyright}>{t('login.copyright')}</Text>
          <View style={styles.footerLinksRow}>
            <TouchableOpacity testID="footer-privacy" onPress={() => comingSoon('Privacy Policy')}>
              <Text style={styles.footerLink}>{t('login.privacyPolicy')}</Text>
            </TouchableOpacity>
            <Text style={styles.footerSeparator}> | </Text>
            <TouchableOpacity testID="footer-terms" onPress={() => comingSoon('Terms of Service')}>
              <Text style={styles.footerLink}>{t('login.termsOfService')}</Text>
            </TouchableOpacity>
            <Text style={styles.footerSeparator}> | </Text>
            <TouchableOpacity testID="footer-help" onPress={() => comingSoon('Help Center')}>
              <Text style={styles.footerLink}>{t('login.helpCenter')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: c.authScreenBg,
    },
    content: {
      paddingHorizontal: 24,
      paddingTop: 48,
      paddingBottom: 32,
      alignItems: 'stretch',
    },
    logo: {
      width: 72,
      height: 72,
      alignSelf: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 26,
      fontWeight: '700',
      color: c.accentText,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      color: c.textSecondary,
      textAlign: 'center',
      marginTop: 4,
      marginBottom: 24,
    },
    card: {
      backgroundColor: c.loginCardBg,
      borderRadius: 16,
      padding: 20,
    },
    forgotLink: {
      fontSize: 13,
      color: c.accentText,
      fontWeight: '600',
    },
    formError: {
      color: c.error,
      fontSize: 13,
      marginBottom: 12,
      textAlign: 'center',
    },
    loginButton: {
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    loginButtonDisabled: {
      opacity: 0.6,
    },
    loginButtonText: {
      color: c.textPrimary,
      fontSize: 16,
      fontWeight: '700',
    },
    registerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 24,
    },
    registerText: {
      color: c.textSecondaryAlt,
      fontSize: 14,
    },
    registerLink: {
      color: c.accentText,
      fontSize: 14,
      fontWeight: '700',
    },
    footer: {
      alignItems: 'center',
      marginTop: 32,
    },
    footerCopyright: {
      fontSize: 12,
      color: c.textSecondary,
      textAlign: 'center',
      marginBottom: 8,
    },
    footerLinksRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    footerLink: {
      fontSize: 12,
      color: c.textSecondary,
    },
    footerSeparator: {
      fontSize: 12,
      color: c.textSecondary,
    },
  });
}
