import { Ionicons } from '@expo/vector-icons';
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
import { SelectField } from '@/components/SelectField';
import { getGenderOptions, RegisterFieldErrors, registerSchema } from '@/schemas/registerSchema';
import { register } from '@/services/authService';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/theme';

export default function RegisterScreen({
  onBack,
  onRegistered,
}: {
  onBack: () => void;
  onRegistered: (email: string) => void;
}) {
  const { t } = useLanguage();
  const { colors: c } = useTheme();
  const styles = useMemo(() => getStyles(c), [c]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errors, setErrors] = useState<RegisterFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async () => {
    setFormError(null);

    const result = registerSchema.safeParse({
      name,
      email,
      phone,
      gender: gender || undefined,
      password,
      confirmPassword,
    });

    if (!result.success) {
      const fieldErrors: RegisterFieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof RegisterFieldErrors;
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    const response = await register({
      fullName: result.data.name,
      email: result.data.email,
      phoneNumber: result.data.phone || undefined,
      gender: result.data.gender,
      password: result.data.password,
      confirmPassword: result.data.confirmPassword,
    });
    setSubmitting(false);

    if (response.success) {
      onRegistered(result.data.email);
      return;
    }

    if (response.fieldErrors) {
      setErrors(response.fieldErrors);
    } else {
      setFormError(response.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color={c.accentText} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />

        <Text style={styles.title}>{t('register.title')}</Text>
        <Text style={styles.subtitle}>{t('register.subtitle')}</Text>

        <FormField
          label={t('register.nameLabel')}
          required
          placeholder={t('register.namePlaceholder')}
          value={name}
          onChangeText={setName}
          error={errors.name}
          autoCapitalize="words"
          themeColors={c}
        />

        <FormField
          label={t('register.emailLabel')}
          required
          placeholder={t('register.emailPlaceholder')}
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          autoCapitalize="none"
          keyboardType="email-address"
          themeColors={c}
        />

        <View style={styles.row}>
          <FormField
            label={t('register.phoneLabel')}
            placeholder={t('register.phonePlaceholder')}
            value={phone}
            onChangeText={setPhone}
            error={errors.phone}
            keyboardType="phone-pad"
            containerStyle={styles.rowItem}
            themeColors={c}
          />
          <SelectField
            label={t('register.genderLabel')}
            placeholder={t('register.genderPlaceholder')}
            value={gender}
            onChange={setGender}
            options={getGenderOptions(t)}
            error={errors.gender}
            containerStyle={styles.rowItem}
            themeColors={c}
          />
        </View>

        <PasswordField
          label={t('register.passwordLabel')}
          required
          placeholder={t('register.passwordPlaceholder')}
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          themeColors={c}
        />

        <PasswordField
          label={t('register.confirmPasswordLabel')}
          required
          placeholder={t('register.confirmPasswordPlaceholder')}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          error={errors.confirmPassword}
          themeColors={c}
        />

        {formError ? <Text style={styles.formError}>{formError}</Text> : null}

        <TouchableOpacity
          testID="register-button"
          style={[styles.registerButton, submitting && styles.registerButtonDisabled]}
          onPress={handleRegister}
          disabled={submitting}
        >
          <Text style={styles.registerButtonText}>
            {submitting ? t('register.registering') : t('register.registerButton')}
          </Text>
        </TouchableOpacity>

        <View style={styles.loginRow}>
          <Text style={styles.loginText}>{t('register.haveAccount')}</Text>
          <Link href="/auth/login" asChild>
            <TouchableOpacity>
              <Text style={styles.loginLink}>{t('register.loginLink')}</Text>
            </TouchableOpacity>
          </Link>
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
    topBar: {
      height: 56,
      justifyContent: 'center',
      paddingHorizontal: 16,
      backgroundColor: c.authScreenBg,
    },
    content: {
      paddingHorizontal: 24,
      paddingBottom: 32,
      alignItems: 'stretch',
    },
    logo: {
      width: 96,
      height: 96,
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
      color: c.textSecondaryAlt,
      textAlign: 'center',
      marginTop: 4,
      marginBottom: 24,
    },
    row: {
      flexDirection: 'row',
      gap: 12,
    },
    rowItem: {
      flex: 1,
    },
    formError: {
      color: c.error,
      fontSize: 13,
      marginBottom: 12,
      textAlign: 'center',
    },
    registerButton: {
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    registerButtonDisabled: {
      opacity: 0.6,
    },
    registerButtonText: {
      color: c.textPrimary,
      fontSize: 16,
      fontWeight: '700',
    },
    loginRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 20,
    },
    loginText: {
      color: c.textSecondaryAlt,
      fontSize: 14,
    },
    loginLink: {
      color: c.accentText,
      fontSize: 14,
      fontWeight: '700',
    },
  });
}
