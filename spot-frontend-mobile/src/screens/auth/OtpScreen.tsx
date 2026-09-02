import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { OtpInput } from '@/components/OtpInput';
import { otpSchema } from '@/schemas/otpSchema';
import { resendOtp, verifyOtp, VerifyOtpResult } from '@/services/authService';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/theme';

const RESEND_COOLDOWN_SECONDS = 60;

function formatCountdown(seconds: number) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function OtpScreen({
  email,
  onVerified,
  purpose = 'REGISTER',
  mode = 'verify',
}: {
  email: string;
  /** Receives the 6-digit code, plus (in 'verify' mode) the full
   * /auth/otp/verify response — a PENDING Owner/Referee gets an
   * accessToken/refreshToken + `nextStep` there. Callers that don't need
   * either argument can ignore them. */
  onVerified: (otp: string, result?: VerifyOtpResult) => void;
  /** OTP purpose sent to the backend (REGISTER, FORGOT_PASSWORD, ...). */
  purpose?: string;
  /**
   * 'verify' (default): calls the real /auth/otp/verify endpoint — this is
   * REGISTER-only server-side (it hard-codes markEmailVerified()), so only
   * use it for the register flow.
   * 'collect': no API call here — just format-checks the code and forwards
   * it via onVerified. Used by flows (like forgot-password) whose backend
   * endpoint verifies the OTP itself together with the next step, so a
   * separate verify call here would consume the OTP and break that later
   * call.
   */
  mode?: 'verify' | 'collect';
}) {
  const { t } = useLanguage();
  const { colors: c } = useTheme();
  const styles = useMemo(() => getStyles(c), [c]);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const runVerify = async (code: string) => {
    if ((mode === 'verify' && verifiedRef.current) || submitting) return;

    const result = otpSchema.safeParse(code);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setError(null);

    if (mode === 'collect') {
      verifiedRef.current = true;
      onVerified(result.data);
      return;
    }

    setSubmitting(true);
    const response = await verifyOtp(email, result.data, purpose);
    setSubmitting(false);

    if (response.success) {
      verifiedRef.current = true;
      onVerified(result.data, response);
      return;
    }

    if (response.attemptsRemaining !== undefined) {
      setError(`${response.message} (${response.attemptsRemaining} attempt(s) remaining)`);
    } else {
      setError(response.message || 'Something went wrong. Please try again.');
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;

    setResending(true);
    setError(null);
    const response = await resendOtp(email, purpose);
    setResending(false);

    if (response.success) {
      setOtp('');
      setCooldown(response.resendAvailableInSeconds ?? RESEND_COOLDOWN_SECONDS);
    } else {
      setError(response.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons name="shield-checkmark" size={28} color={c.primary} />
        </View>

        <Text style={styles.title}>{t('otp.title')}</Text>
        <Text style={styles.subtitle}>{t('otp.subtitle')}</Text>

        <OtpInput
          value={otp}
          onChange={setOtp}
          onComplete={mode === 'verify' ? runVerify : undefined}
          error={!!error}
          containerStyle={styles.otpRow}
          themeColors={c}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.resendRow}>
          <Text style={styles.resendText}>
            {t('otp.resendPrefix')}
            <Text style={styles.resendCountdown}>{formatCountdown(cooldown)}</Text>
          </Text>
          <TouchableOpacity
            testID="resend-link"
            onPress={handleResend}
            disabled={cooldown > 0 || resending}
          >
            <Text style={[styles.resendLink, cooldown > 0 && styles.resendLinkDisabled]}>
              {resending ? t('otp.resending') : t('otp.resendNow')}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          testID="verify-button"
          style={[styles.verifyButton, submitting && styles.verifyButtonDisabled]}
          onPress={() => runVerify(otp)}
          disabled={submitting}
        >
          <Text style={styles.verifyButtonText}>
            {submitting ? t('otp.verifying') : mode === 'collect' ? t('otp.continueButton') : t('otp.verifyButton')}
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Ionicons name="help-circle-outline" size={16} color={c.textSecondary} />
          <Text style={styles.footerText}>{t('otp.helpText')}</Text>
        </View>
      </View>
    </View>
  );
}

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.background,
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
      alignItems: 'center',
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
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: c.textPrimary,
    },
    subtitle: {
      fontSize: 14,
      color: c.textSecondary,
      textAlign: 'center',
      marginTop: 8,
      marginBottom: 24,
    },
    otpRow: {
      width: '100%',
    },
    errorText: {
      color: c.error,
      fontSize: 13,
      textAlign: 'center',
      marginTop: 12,
    },
    resendRow: {
      marginTop: 16,
      alignItems: 'center',
    },
    resendText: {
      fontSize: 14,
      color: c.textSecondaryAlt,
    },
    resendCountdown: {
      color: c.accentText,
      fontWeight: '600',
    },
    resendLink: {
      fontSize: 14,
      color: c.accentText,
      fontWeight: '600',
      marginTop: 4,
    },
    resendLinkDisabled: {
      color: c.textMuted,
    },
    verifyButton: {
      width: '100%',
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 24,
    },
    verifyButtonDisabled: {
      opacity: 0.6,
    },
    verifyButtonText: {
      color: c.textPrimary,
      fontSize: 16,
      fontWeight: '700',
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 20,
    },
    footerText: {
      fontSize: 13,
      color: c.textSecondary,
    },
  });
}
