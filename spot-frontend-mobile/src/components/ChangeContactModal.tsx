import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { z } from 'zod';
import { FormField } from '@/components/FormField';
import { OtpInput } from '@/components/OtpInput';
import { colors } from '@/constants/colors';
import {
  ProfileUpdateUser,
  confirmEmailChange,
  confirmPhoneChange,
  requestEmailChange,
  requestPhoneChange,
} from '@/services/profileService';

const RESEND_COOLDOWN_SECONDS = 60;

const emailSchema = z.string().trim().email('Enter a valid email address');
const PHONE_REGEX = /^0(2|3|5|7|8|9)[0-9]{8}$/;

interface ChangeContactModalProps {
  visible: boolean;
  onClose: () => void;
  type: 'email' | 'phone';
  currentValue: string;
  onSuccess: (user: ProfileUpdateUser) => void;
}

function formatCountdown(seconds: number) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export function ChangeContactModal({ visible, onClose, type, onSuccess }: ChangeContactModalProps) {
  const [step, setStep] = useState<'input' | 'otp'>('input');
  const [newValue, setNewValue] = useState('');
  const [inputError, setInputError] = useState<string | undefined>();
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (visible) {
      setStep('input');
      setNewValue('');
      setInputError(undefined);
      setOtp('');
      setOtpError(undefined);
    }
  }, [visible]);

  useEffect(() => {
    if (step !== 'otp' || cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, cooldown]);

  const label = type === 'email' ? 'Email' : 'Phone Number';

  const handleSendCode = async () => {
    const trimmed = newValue.trim();
    if (type === 'email') {
      const result = emailSchema.safeParse(trimmed);
      if (!result.success) {
        setInputError(result.error.issues[0].message);
        return;
      }
    } else if (!PHONE_REGEX.test(trimmed)) {
      setInputError('Enter a valid Vietnamese phone number');
      return;
    }
    setInputError(undefined);

    setSending(true);
    const result = type === 'email' ? await requestEmailChange(trimmed) : await requestPhoneChange(trimmed);
    setSending(false);

    if (!result.success) {
      setInputError(result.message || 'Something went wrong. Please try again.');
      return;
    }

    setNewValue(trimmed);
    setCooldown(result.resendAvailableInSeconds ?? RESEND_COOLDOWN_SECONDS);
    setStep('otp');
  };

  const runConfirm = async (code: string) => {
    if (confirming) return;
    setOtpError(undefined);
    setConfirming(true);
    const result =
      type === 'email' ? await confirmEmailChange(newValue, code) : await confirmPhoneChange(newValue, code);
    setConfirming(false);

    if (!result.success) {
      if (result.attemptsRemaining !== undefined) {
        setOtpError(`${result.message} (${result.attemptsRemaining} attempt(s) remaining)`);
      } else {
        setOtpError(result.message || 'Something went wrong. Please try again.');
      }
      return;
    }

    onSuccess(result.user as ProfileUpdateUser);
    onClose();
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setOtpError(undefined);
    const result = type === 'email' ? await requestEmailChange(newValue) : await requestPhoneChange(newValue);
    setResending(false);

    if (result.success) {
      setOtp('');
      setCooldown(result.resendAvailableInSeconds ?? RESEND_COOLDOWN_SECONDS);
    } else {
      setOtpError(result.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.card} activeOpacity={1} onPress={() => {}}>
          {step === 'input' ? (
            <>
              <Text style={styles.title}>Change {label}</Text>
              <FormField
                testID={`change-contact-${type}-input`}
                label={`New ${label}`}
                placeholder={type === 'email' ? 'Enter new email' : 'Enter new phone number'}
                value={newValue}
                onChangeText={(text) => {
                  setNewValue(text);
                  if (inputError) setInputError(undefined);
                }}
                error={inputError}
                keyboardType={type === 'email' ? 'email-address' : 'phone-pad'}
                autoCapitalize="none"
              />
              <TouchableOpacity
                testID="change-contact-send-code"
                style={[styles.primaryButton, sending && styles.primaryButtonDisabled]}
                onPress={handleSendCode}
                disabled={sending}
              >
                <Text style={styles.primaryButtonText}>{sending ? 'Sending...' : 'Send Code'}</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="change-contact-cancel" style={styles.linkButton} onPress={onClose}>
                <Text style={styles.linkText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>Enter Code</Text>
              <Text style={styles.subtitle}>
                {type === 'email' ? `Code sent to ${newValue}` : 'Code sent to your current email'}
              </Text>

              <OtpInput value={otp} onChange={setOtp} onComplete={runConfirm} error={!!otpError} containerStyle={styles.otpRow} />

              {otpError ? <Text style={styles.errorText}>{otpError}</Text> : null}

              <View style={styles.resendRow}>
                <Text style={styles.resendText}>
                  Resend code in <Text style={styles.resendCountdown}>{formatCountdown(cooldown)}</Text>
                </Text>
                <TouchableOpacity testID="change-contact-resend" onPress={handleResend} disabled={cooldown > 0 || resending}>
                  <Text style={[styles.resendLink, cooldown > 0 && styles.resendLinkDisabled]}>
                    {resending ? 'Resending...' : 'Resend code now'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                testID="change-contact-confirm"
                style={[styles.primaryButton, confirming && styles.primaryButtonDisabled]}
                onPress={() => runConfirm(otp)}
                disabled={confirming}
              >
                <Text style={styles.primaryButtonText}>{confirming ? 'Confirming...' : 'Confirm'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                testID="change-contact-back"
                style={styles.linkButton}
                onPress={() => {
                  setStep('input');
                  setOtp('');
                  setOtpError(undefined);
                  setCooldown(RESEND_COOLDOWN_SECONDS);
                }}
              >
                <Text style={styles.linkText}>Change {label.toLowerCase()}</Text>
              </TouchableOpacity>
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 13,
    color: colors.subtitle,
    marginBottom: 16,
  },
  otpRow: {
    marginBottom: 4,
  },
  errorText: {
    color: colors.formError,
    fontSize: 13,
    marginTop: 8,
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
  primaryButton: {
    backgroundColor: colors.primaryDark,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  linkButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: colors.primaryDark,
    fontWeight: '600',
  },
});
