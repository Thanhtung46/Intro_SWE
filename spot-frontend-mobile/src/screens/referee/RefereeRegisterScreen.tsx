import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ErrorBanner from '@/components/common/ErrorBanner';
import SubmitButton from '@/components/common/SubmitButton';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useLanguage } from '@/context/LanguageContext';
import {
  refereeRegisterSchema,
  RefereeRegisterFormInput,
  RefereeRegisterFormValues,
} from '@/schemas/refereeRegisterSchema';
import { getErrorMessage } from '@/services/authService';
import { submitRefereeVerificationBatch, uploadRefereeDocument } from '@/services/refereeService';
import type { VerificationDocumentInput } from '@/types/referee';

type Props = {
  onBack: () => void;
  onSubmitted: () => void;
};

type FieldKey = 'idFront' | 'idBack' | 'vffLicense';

const KIND_BY_FIELD: Record<FieldKey, VerificationDocumentInput['documentKind']> = {
  idFront: 'ID_FRONT',
  idBack: 'ID_BACK',
  vffLicense: 'VFF_LICENSE',
};

const IMAGE_TYPES = ['image/jpeg', 'image/png'];
const LICENSE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

/** Referee "Upload Credentials" screen (Pencil "Document Submission"
 *  frame). Three documents → POST /users/me/verification-requests/batch.
 *  See refereeService.uploadRefereeDocument for the (stubbed) file→URL
 *  step; a paste-URL field per document lets manual testing bypass it. */
export default function RefereeRegisterScreen({ onBack, onSubmitted }: Props) {
  const { t } = useLanguage();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting, errors },
  } = useForm<RefereeRegisterFormInput, unknown, RefereeRegisterFormValues>({
    resolver: zodResolver(refereeRegisterSchema),
    defaultValues: {
      idFront: null,
      idFrontUrl: '',
      idBack: null,
      idBackUrl: '',
      vffLicense: null,
      vffLicenseUrl: '',
    },
  });

  const pick = async (field: FieldKey, accepted: string[]) => {
    const result = await DocumentPicker.getDocumentAsync({ type: accepted });
    if (result.canceled) return;
    setValue(field, result.assets[0], { shouldValidate: true });
  };

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const fields: FieldKey[] = ['idFront', 'idBack', 'vffLicense'];
      const documents: VerificationDocumentInput[] = [];
      for (const field of fields) {
        const pasted = values[`${field}Url` as const].trim();
        const documentUrl = pasted || (await uploadRefereeDocument(values[field]!));
        documents.push({ documentKind: KIND_BY_FIELD[field], documentUrl });
      }
      await submitRefereeVerificationBatch(documents);
      onSubmitted();
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    }
  });

  const renderPicker = (field: FieldKey, label: string, accepted: string[]) => {
    const urlKey = `${field}Url` as const;
    const asset = watch(field);
    const fieldError = (errors[field]?.message ?? errors[urlKey]?.message) as string | undefined;
    return (
      <View style={styles.pickerBlock}>
        <TouchableOpacity
          style={[styles.picker, fieldError && styles.pickerError]}
          onPress={() => pick(field, accepted)}
          activeOpacity={0.7}
        >
          <Ionicons name={asset ? 'checkmark-circle' : 'camera-outline'} size={22} color={colors.primary} />
          <Text style={styles.pickerText} numberOfLines={1}>
            {asset?.name ?? label}
          </Text>
        </TouchableOpacity>
        <TextInput
          style={styles.pasteInput}
          value={watch(urlKey)}
          onChangeText={(v) => setValue(urlKey, v, { shouldValidate: true })}
          placeholder={t('referee.register.urlHint')}
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {fieldError ? <Text style={styles.errorText}>{fieldError}</Text> : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} hitSlop={8} style={styles.headerSide}>
          <Ionicons name="arrow-back" size={28} color={colors.primaryDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SPOT Referee</Text>
        <View style={styles.headerSide} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>{t('referee.register.title')}</Text>
          <Text style={styles.subheading}>{t('referee.register.subtitle')}</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('referee.register.idHeading')}</Text>
            {renderPicker('idFront', t('referee.register.idFront'), IMAGE_TYPES)}
            {renderPicker('idBack', t('referee.register.idBack'), IMAGE_TYPES)}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('referee.register.licenseHeading')}</Text>
            {renderPicker('vffLicense', t('referee.register.license'), LICENSE_TYPES)}
          </View>

          <View style={styles.tips}>
            <Ionicons name="bulb-outline" size={18} color={colors.primary} />
            <View style={styles.flex}>
              <Text style={styles.tipsTitle}>{t('referee.register.tipsTitle')}</Text>
              <Text style={styles.tipsBody}>{t('referee.register.tips')}</Text>
            </View>
          </View>

          {submitError ? <ErrorBanner message={submitError} onRetry={onSubmit} /> : null}
          <SubmitButton label={t('referee.register.submit')} loading={isSubmitting} onPress={onSubmit} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBackground },
  flex: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.dotInactive,
  },
  headerSide: { width: 44, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: colors.primaryDark, fontSize: 18, fontWeight: '700' },
  content: { padding: spacing.md, gap: spacing.lg },
  heading: { fontSize: 24, fontWeight: '800', color: colors.headingText, textAlign: 'center' },
  subheading: { fontSize: 14, lineHeight: 20, color: colors.bodyText, textAlign: 'center' },
  section: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.headingText },
  pickerBlock: { gap: spacing.xs },
  picker: {
    minHeight: 96,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.ringBorder,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  pickerError: { borderColor: colors.error },
  pickerText: { fontSize: 14, color: colors.primary, fontWeight: '600', textAlign: 'center' },
  pasteInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 12,
    color: colors.bodyText,
  },
  errorText: { fontSize: 12, color: colors.error },
  tips: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.selectedBackground,
    borderRadius: 14,
    padding: spacing.md,
  },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: colors.headingText },
  tipsBody: { fontSize: 13, color: colors.bodyText, marginTop: 2 },
});
