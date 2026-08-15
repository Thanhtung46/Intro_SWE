import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
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
import { FormField } from '../../src/components/FormField';
import { PasswordField } from '../../src/components/PasswordField';
import { SelectField } from '../../src/components/SelectField';
import { genderOptions, RegisterFieldErrors, registerSchema } from '../../src/schemas/registerSchema';
import { register } from '../../src/services/authService';
import { colors } from '../../src/theme/colors';

export default function RegisterScreen() {
  const router = useRouter();

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
      router.push({ pathname: '/auth/otp', params: { email: result.data.email } });
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
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />

        <Text style={styles.title}>Register</Text>
        <Text style={styles.subtitle}>Enter basic information</Text>

        <FormField
          label="Name"
          required
          placeholder="Enter full name"
          value={name}
          onChangeText={setName}
          error={errors.name}
          autoCapitalize="words"
        />

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

        <View style={styles.row}>
          <FormField
            label="Phone number"
            placeholder="Phone number"
            value={phone}
            onChangeText={setPhone}
            error={errors.phone}
            keyboardType="phone-pad"
            containerStyle={styles.rowItem}
          />
          <SelectField
            label="Gender"
            placeholder="Select"
            value={gender}
            onChange={setGender}
            options={[...genderOptions]}
            error={errors.gender}
            containerStyle={styles.rowItem}
          />
        </View>

        <PasswordField
          label="Password"
          required
          placeholder="Min 8 chars, incl. A-Z, 0-9, symbol"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
        />

        <PasswordField
          label="Confirm password"
          required
          placeholder="Confirm your password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          error={errors.confirmPassword}
        />

        {formError ? <Text style={styles.formError}>{formError}</Text> : null}

        <TouchableOpacity
          testID="register-button"
          style={[styles.registerButton, submitting && styles.registerButtonDisabled]}
          onPress={handleRegister}
          disabled={submitting}
        >
          <Text style={styles.registerButtonText}>{submitting ? 'Registering...' : 'Register'}</Text>
        </TouchableOpacity>

        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <Link href="/auth/login" asChild>
            <TouchableOpacity>
              <Text style={styles.loginLink}>Login</Text>
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
    backgroundColor: colors.background,
  },
  topBar: {
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: colors.background,
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
    color: colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.subtitle,
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
    color: colors.error,
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  registerButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: {
    color: colors.subtitle,
    fontSize: 14,
  },
  loginLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
