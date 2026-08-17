import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { OtpInput } from '@/components/OtpInput';
import { otpSchema } from '@/schemas/otpSchema';
import { resendOtp, verifyOtp } from '@/services/authService';
import { colors } from '@/constants/colors';

const RESEND_COOLDOWN_SECONDS = 60;

function formatCountdown(seconds: number) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function OtpScreen({ email, onVerified }: { email: string; onVerified: () => void }) {
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
    if (verifiedRef.current || submitting) return;

    const result = otpSchema.safeParse(code);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setError(null);
    setSubmitting(true);
    const response = await verifyOtp(email, result.data);
    setSubmitting(false);

    if (response.success) {
      verifiedRef.current = true;
      // Next step after OTP verification is outside SPOT-113's scope.
      // TODO: navigate to the real post-verification route once that ticket exists.
      onVerified();
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
    const response = await resendOtp(email);
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
          <Ionicons name="shield-checkmark" size={28} color={colors.primaryDark} />
        </View>

        <Text style={styles.title}>OTP Verification</Text>
        <Text style={styles.subtitle}>Enter the 6-digit code sent to your email.</Text>

        <OtpInput
          value={otp}
          onChange={setOtp}
          onComplete={runVerify}
          error={!!error}
          containerStyle={styles.otpRow}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.resendRow}>
          <Text style={styles.resendText}>
            Resend code in <Text style={styles.resendCountdown}>{formatCountdown(cooldown)}</Text>
          </Text>
          <TouchableOpacity
            testID="resend-link"
            onPress={handleResend}
            disabled={cooldown > 0 || resending}
          >
            <Text style={[styles.resendLink, cooldown > 0 && styles.resendLinkDisabled]}>
              {resending ? 'Resending...' : 'Resend code now'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          testID="verify-button"
          style={[styles.verifyButton, submitting && styles.verifyButtonDisabled]}
          onPress={() => runVerify(otp)}
          disabled={submitting}
        >
          <Text style={styles.verifyButtonText}>{submitting ? 'Verifying...' : 'Verify'}</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Ionicons name="help-circle-outline" size={16} color={colors.subtitle} />
          <Text style={styles.footerText}> Need help? Contact us</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.formScreenBackground,
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
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.subtitle,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  otpRow: {
    width: '100%',
  },
  errorText: {
    color: colors.formError,
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
    color: colors.text,
  },
  resendCountdown: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
  resendLink: {
    fontSize: 14,
    color: colors.primaryDark,
    fontWeight: '600',
    marginTop: 4,
  },
  resendLinkDisabled: {
    color: colors.placeholder,
  },
  verifyButton: {
    width: '100%',
    backgroundColor: colors.primaryDark,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    color: colors.white,
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
    color: colors.subtitle,
  },
});
