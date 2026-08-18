import { Link } from 'expo-router';
import React, { useState } from 'react';
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
import { GoogleIcon } from '@/components/GoogleIcon';
import { PasswordField } from '@/components/PasswordField';
import { useUser } from '@/context/UserContext';
import { LoginFieldErrors, loginSchema } from '@/schemas/loginSchema';
import { login } from '@/services/authService';
import { colors } from '@/constants/colors';
import { comingSoon } from '@/utils/comingSoon';
import { setRefreshToken, setToken } from '../../utils/authStorage';

export default function LoginScreen({ onLoggedIn }: { onLoggedIn: (role: string) => void }) {
  const { setUser } = useUser();

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

      // No per-role dashboards exist yet (out of SPOT-116's scope).
      // TODO: replace with real per-role dashboard routes once they exist.
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

        <Text style={styles.title}>Login</Text>
        <Text style={styles.subtitle}>Login to join and manage matches</Text>

        <View style={styles.card}>
          <FormField
            label="Email"
            required
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <PasswordField
            label="Password"
            required
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            labelRight={
              <Link href="/auth/forgot-password" asChild>
                <TouchableOpacity>
                  <Text style={styles.forgotLink}>Forgot password?</Text>
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
            <Text style={styles.loginButtonText}>{submitting ? 'Logging in...' : 'Login'}</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            testID="google-login-button"
            style={styles.googleButton}
            onPress={() => comingSoon('Login with Google')}
          >
            <GoogleIcon size={18} />
            <Text style={styles.googleButtonText}>Login with Google</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.registerRow}>
          <Text style={styles.registerText}>Don&apos;t have an account? </Text>
          <Link href="/auth/register" asChild>
            <TouchableOpacity>
              <Text style={styles.registerLink}>Register</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerCopyright}>© 2024 SPOT Sports Booking. All rights reserved.</Text>
          <View style={styles.footerLinksRow}>
            <TouchableOpacity testID="footer-privacy" onPress={() => comingSoon('Privacy Policy')}>
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.footerSeparator}> | </Text>
            <TouchableOpacity testID="footer-terms" onPress={() => comingSoon('Terms of Service')}>
              <Text style={styles.footerLink}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.footerSeparator}> | </Text>
            <TouchableOpacity testID="footer-help" onPress={() => comingSoon('Help Center')}>
              <Text style={styles.footerLink}>Help Center</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.white,
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
    color: colors.primaryDark,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.subtitle,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  card: {
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    padding: 20,
  },
  forgotLink: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  formError: {
    color: colors.formError,
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: colors.primaryDark,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerText: {
    color: colors.subtitle,
    fontSize: 14,
  },
  registerLink: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 8,
    fontSize: 12,
    color: colors.subtitle,
  },
  googleButton: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    backgroundColor: colors.white,
  },
  googleButtonText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '400',
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
  },
  footerCopyright: {
    fontSize: 12,
    color: colors.subtitle,
    textAlign: 'center',
    marginBottom: 8,
  },
  footerLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerLink: {
    fontSize: 12,
    color: colors.subtitle,
  },
  footerSeparator: {
    fontSize: 12,
    color: colors.subtitle,
  },
});
