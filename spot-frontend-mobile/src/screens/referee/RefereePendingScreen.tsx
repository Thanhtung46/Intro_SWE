import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useLanguage } from '@/context/LanguageContext';
import type { TranslationKey } from '@/i18n/translations';
import { getErrorMessage } from '@/services/apiErrors';
import { getMyVerificationRequests } from '@/services/refereeService';
import type { RefereeCertification } from '@/types/referee';

type Props = {
  onLogout: () => void;
  /** Route to the document-upload screen. Shown only when nothing has been
   *  submitted yet (a referee who quit the upload step never gets back here
   *  otherwise). */
  onSubmitDocuments: () => void;
};

const SUPPORT_EMAIL = 'support@spot.example.com';

const KIND_LABEL_KEY: Record<string, TranslationKey> = {
  ID_FRONT: 'referee.docKind.ID_FRONT',
  ID_BACK: 'referee.docKind.ID_BACK',
  VFF_LICENSE: 'referee.docKind.VFF_LICENSE',
  CERT_UPDATE: 'referee.docKind.CERT_UPDATE',
};

/** "Application Under Review" (Pencil "Document Verification" frame).
 *  Step tracker derived from the submitted documents' review status. */
export default function RefereePendingScreen({ onLogout, onSubmitDocuments }: Props) {
  const { t } = useLanguage();
  const docKindLabel = (kind?: string | null) => {
    const key = kind ? KIND_LABEL_KEY[kind] : undefined;
    return key ? t(key) : t('referee.docKind.fallback');
  };
  const [certs, setCerts] = useState<RefereeCertification[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyVerificationRequests()
      .then(setCerts)
      .catch((e) => setError(getErrorMessage(e)));
  }, []);

  const allApproved = certs != null && certs.length > 0 && certs.every((c) => c.status === 'APPROVED');
  const anyReviewed = certs != null && certs.some((c) => c.status !== 'PENDING');
  const nothingSubmitted = certs != null && certs.length === 0;

  const steps = [
    { label: t('referee.pending.stepProfile'), state: 'done' as const },
    {
      label: t('referee.pending.stepDocs'),
      hint: anyReviewed ? undefined : t('referee.pending.stepDocsChecking'),
      state: allApproved ? ('done' as const) : ('active' as const),
    },
    {
      label: t('referee.pending.stepActivation'),
      hint: t('referee.pending.stepActivationPending'),
      state: allApproved ? ('active' as const) : ('todo' as const),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Text style={styles.brand}>SPOT</Text>
        <TouchableOpacity style={styles.logout} onPress={onLogout}>
          <Text style={styles.logoutText}>{t('referee.pending.logout')}</Text>
          <Ionicons name="exit-outline" size={16} color={colors.bodyText} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="hourglass-outline" size={34} color={colors.primary} />
        </View>
        <Text style={styles.title}>{t('referee.pending.title')}</Text>
        <Text style={styles.body}>{t('referee.pending.body')}</Text>

        <View style={styles.tracker}>
          {steps.map((step, i) => (
            <View key={step.label} style={styles.step}>
              <View style={styles.stepRail}>
                <View
                  style={[
                    styles.stepDot,
                    step.state === 'done' && styles.stepDotDone,
                    step.state === 'active' && styles.stepDotActive,
                  ]}
                >
                  {step.state === 'done' ? <Ionicons name="checkmark" size={12} color={colors.white} /> : null}
                </View>
                {i < steps.length - 1 ? <View style={styles.stepLine} /> : null}
              </View>
              <View style={styles.stepText}>
                <Text style={styles.stepLabel}>{step.label}</Text>
                {step.hint ? <Text style={styles.stepHint}>{step.hint}</Text> : null}
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.docsHeading}>{t('referee.pending.submittedDocs')}</Text>
        {error ? <Text style={styles.docError}>{error}</Text> : null}
        {certs == null && !error ? <ActivityIndicator color={colors.primary} /> : null}
        {nothingSubmitted ? <Text style={styles.noDocs}>{t('referee.pending.noDocsYet')}</Text> : null}
        {(certs ?? []).map((cert) => (
          <View key={cert.verificationReqId} style={styles.docRow}>
            <Ionicons
              name={cert.documentKind === 'VFF_LICENSE' ? 'document-text-outline' : 'id-card-outline'}
              size={20}
              color={colors.primary}
            />
            <Text style={styles.docName}>{docKindLabel(cert.documentKind)}</Text>
            <Ionicons
              name={
                cert.status === 'APPROVED'
                  ? 'checkmark-circle'
                  : cert.status === 'REJECTED'
                    ? 'close-circle'
                    : 'time-outline'
              }
              size={18}
              color={cert.status === 'APPROVED' ? colors.success : cert.status === 'REJECTED' ? colors.error : colors.outline}
            />
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        {nothingSubmitted ? (
          <TouchableOpacity style={styles.submitBtn} onPress={onSubmitDocuments}>
            <Ionicons name="cloud-upload-outline" size={16} color={colors.white} />
            <Text style={styles.supportText}>{t('referee.pending.submitDocuments')}</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={styles.supportBtn}
          onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => undefined)}
        >
          <Ionicons name="headset-outline" size={16} color={colors.white} />
          <Text style={styles.supportText}>{t('referee.pending.contactSupport')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBackground },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  brand: { fontSize: 20, fontWeight: '900', color: colors.primaryDark },
  logout: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  logoutText: { fontSize: 13, color: colors.bodyText },
  content: { padding: spacing.lg, gap: spacing.md, alignItems: 'center' },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.headingText, textAlign: 'center' },
  body: { fontSize: 14, lineHeight: 20, color: colors.bodyText, textAlign: 'center' },
  tracker: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  step: { flexDirection: 'row', gap: spacing.md },
  stepRail: { alignItems: 'center', width: 24 },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  stepDotActive: { borderColor: colors.primary },
  stepLine: { flex: 1, width: 2, backgroundColor: colors.border, minHeight: 20 },
  stepText: { flex: 1, paddingBottom: spacing.md },
  stepLabel: { fontSize: 15, fontWeight: '700', color: colors.headingText },
  stepHint: { fontSize: 13, color: colors.primary, marginTop: 2 },
  docsHeading: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '700',
    color: colors.subtitle,
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
  docError: { alignSelf: 'flex-start', color: colors.error, fontSize: 13 },
  noDocs: { alignSelf: 'flex-start', color: colors.bodyText, fontSize: 13 },
  docRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  docName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.headingText },
  footer: { padding: spacing.md, gap: spacing.sm },
  submitBtn: {
    flexDirection: 'row',
    gap: spacing.sm,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportBtn: {
    flexDirection: 'row',
    gap: spacing.sm,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.headingText,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});
