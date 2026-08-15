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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import FormField from '@/components/common/FormField';
import SubmitButton from '@/components/common/SubmitButton';
import ErrorBanner from '@/components/common/ErrorBanner';
import {
  ownerRegisterSchema,
  OwnerRegisterFormInput,
  OwnerRegisterFormValues,
} from '@/schemas/ownerRegisterSchema';
import { registerOwner, getErrorMessage } from '@/services/authService';

type Props = {
  onBack: () => void;
  onRegistered: () => void;
};

/**
 * Owner venue-registration form (Figma node q7XTo3, header text adjusted to
 * "Register - Step 3" — Choose Role is Step 2 in this flow).
 * Field list follows PA/PA1.md UC U008 "Register for Venue Owner" (venue
 * name, address, contact person) + UC U009 "Submit Business License"
 * (required file attachment), not the schema_venue.venues table's phone
 * column (there isn't one — the owner's phone is already on their account
 * from signup, so it isn't re-collected here).
 */
export default function OwnerRegisterScreen({ onBack, onRegistered }: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting, errors },
  } = useForm<OwnerRegisterFormInput, unknown, OwnerRegisterFormValues>({
    resolver: zodResolver(ownerRegisterSchema),
    defaultValues: { venueName: '', address: '', contactPerson: '', licenseDocument: null },
  });

  const licenseDocument = watch('licenseDocument');

  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png'],
    });
    if (result.canceled) return;
    setValue('licenseDocument', result.assets[0], { shouldValidate: true });
  };

  // `values` here is inferred as the *validated output* type (zodResolver
  // narrows it — see the schema's comment), not the input type above, so
  // it's left unannotated rather than fighting the two types manually.
  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await registerOwner(values);
      onRegistered();
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    }
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} hitSlop={8} style={styles.headerSide}>
          <Ionicons name="arrow-back" size={30} color={colors.primaryDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Register - Step 3
        </Text>
        <View style={styles.headerSide} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />

          <View style={styles.headingBlock}>
            <Text style={styles.heading}>Register Your Venue</Text>
            <Text style={styles.subheading}>
              Tell us about your venue — an admin will review and approve it.
            </Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="venueName"
              render={({ field }) => (
                <FormField
                  label="Venue name"
                  placeholder="e.g. Sunrise Football Field"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.venueName?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="address"
              render={({ field }) => (
                <FormField
                  label="Address"
                  placeholder="Street, ward, city"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.address?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="contactPerson"
              render={({ field }) => (
                <FormField
                  label="Contact person"
                  placeholder="Full name of the person we should contact"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.contactPerson?.message}
                />
              )}
            />

            <View style={styles.fieldWrapper}>
              <Text style={styles.label}>Business license</Text>
              <TouchableOpacity
                style={[styles.filePickerButton, errors.licenseDocument && styles.filePickerButtonError]}
                onPress={handlePickDocument}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Attach business license"
              >
                <View style={styles.filePickerIconBadge}>
                  <Ionicons name="document-attach-outline" size={20} color={colors.primary} />
                </View>
                <Text style={styles.filePickerText} numberOfLines={1}>
                  {licenseDocument?.name ?? 'Choose PDF, JPG, or PNG (max 5MB)'}
                </Text>
              </TouchableOpacity>
              {errors.licenseDocument?.message ? (
                <Text style={styles.errorText}>{errors.licenseDocument.message}</Text>
              ) : null}
            </View>
          </View>

          {submitError ? <ErrorBanner message={submitError} onRetry={onSubmit} /> : null}

          <SubmitButton label="Submit for Review" loading={isSubmitting} onPress={onSubmit} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.screenBackground,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.dotInactive,
  },
  headerSide: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: '700',
  },
  flex: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  logo: {
    width: 64,
    height: 64,
  },
  headingBlock: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.headingText,
    textAlign: 'center',
  },
  subheading: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.bodyText,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    gap: spacing.md,
  },
  fieldWrapper: {
    width: '100%',
    gap: spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.headingText,
  },
  filePickerButton: {
    width: '100%',
    minHeight: 110,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.ringBorder,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  filePickerButtonError: {
    borderColor: colors.error,
  },
  filePickerIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.iconBackground,
  },
  filePickerText: {
    fontSize: 14,
    color: colors.bodyText,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.error,
  },
});
