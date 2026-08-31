import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChangeContactModal } from '@/components/ChangeContactModal';
import { FormField } from '@/components/FormField';
import { SelectField } from '@/components/SelectField';
import { getGenderOptions } from '@/schemas/registerSchema';
import { useUser } from '@/context/UserContext';
import { comingSoon } from '@/utils/comingSoon';
import { showAlert } from '@/utils/showAlert';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/theme';
import { getProfile, updateProfile, updateSkills, SkillsUpdatePayload } from '@/services/profileService';
import { forgotPassword } from '@/services/authService';

const badmintonSkillOptions = [
  { label: 'Beginner-', value: 'BEGINNER_MINUS' },
  { label: 'Beginner', value: 'BEGINNER' },
  { label: 'Beginner+', value: 'BEGINNER_PLUS' },
  { label: 'Low avg', value: 'LOW_AVERAGE' },
  { label: 'Avg-', value: 'AVERAGE_MINUS' },
  { label: 'Avg', value: 'AVERAGE' },
  { label: 'Avg+', value: 'AVERAGE_PLUS' },
  { label: 'Fair', value: 'FAIR' },
  { label: 'Semi-pro', value: 'SEMI_PRO' },
  { label: 'Pro', value: 'PROFESSIONAL' },
];

const footballSkillOptions = [
  { label: 'Learning', value: 'LEARNING' },
  { label: 'Rec basic', value: 'REC_BASIC' },
  { label: 'Rec advanced', value: 'REC_ADVANCED' },
  { label: 'Semi-pro', value: 'SEMI_PRO' },
  { label: 'Pro', value: 'PROFESSIONAL' },
  { label: 'Elite', value: 'ELITE' },
];

export default function EditProfileScreen({
  onBack,
  onChangePasswordOtpSent,
}: {
  onBack: () => void;
  onChangePasswordOtpSent: (email: string) => void;
}) {
  const { user, setUser } = useUser();
  const { t } = useLanguage();
  const { colors: c } = useTheme();
  const styles = useMemo(() => getStyles(c), [c]);

  const [name, setName] = useState(user?.fullName || '');
  const [nameError, setNameError] = useState<string | undefined>();
  const [gender, setGender] = useState('');
  const [badmintonSkill, setBadmintonSkill] = useState('');
  const [footballSkill, setFootballSkill] = useState('');
  const [saving, setSaving] = useState(false);
  const [changeEmailModalVisible, setChangeEmailModalVisible] = useState(false);
  const [changePhoneModalVisible, setChangePhoneModalVisible] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const initialBadmintonSkill = useRef('');
  const initialFootballSkill = useRef('');

  useEffect(() => {
    getProfile().then((result) => {
      if (result.success && result.user?.gender) {
        setGender(result.user.gender);
      }
      if (result.success && result.user?.skills?.badminton) {
        setBadmintonSkill(result.user.skills.badminton);
        initialBadmintonSkill.current = result.user.skills.badminton;
      }
      if (result.success && result.user?.skills?.football) {
        setFootballSkill(result.user.skills.football);
        initialFootballSkill.current = result.user.skills.football;
      }
    });
  }, []);

  const displayName = user?.fullName || t('common.guestFallback');

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(t('profile.nameRequired'));
      return;
    }
    setNameError(undefined);

    setSaving(true);
    const result = await updateProfile({
      fullName: trimmed,
      ...(gender ? { gender } : {}),
    });
    setSaving(false);

    if (!result.success) {
      showAlert(t('common.error'), result.message || t('common.genericError'));
      return;
    }

    const skillsPayload: SkillsUpdatePayload = {};
    if (badmintonSkill !== initialBadmintonSkill.current) skillsPayload.badminton = badmintonSkill || null;
    if (footballSkill !== initialFootballSkill.current) skillsPayload.football = footballSkill || null;

    if (Object.keys(skillsPayload).length > 0) {
      const skillsResult = await updateSkills(skillsPayload);
      if (!skillsResult.success) {
        showAlert(t('common.error'), skillsResult.message || t('profile.skillsUpdateFailed'));
        return;
      }
    }

    setUser({ ...user, fullName: result.user?.fullName ?? trimmed });
    showAlert(t('common.success'), t('profile.profileUpdatedSuccess'));
    onBack();
  };

  const handleChangePassword = async () => {
    if (!user?.email) {
      showAlert(t('common.error'), t('profile.noEmailOnFile'));
      return;
    }
    setChangingPassword(true);
    const result = await forgotPassword(user.email);
    setChangingPassword(false);

    if (!result.success) {
      showAlert(t('common.error'), result.message || t('common.genericError'));
      return;
    }

    onChangePasswordOtpSent(user.email);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.topBar}>
        <TouchableOpacity
          testID="edit-profile-close"
          style={styles.topBarSide}
          onPress={onBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('profile.editTitle')}</Text>
        <TouchableOpacity
          testID="edit-profile-save"
          style={styles.topBarSideRight}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveText}>{saving ? t('profile.saving') : t('profile.save')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity
          testID="edit-profile-avatar-upload"
          style={styles.avatarSection}
          onPress={() => comingSoon('Photo upload')}
          activeOpacity={0.8}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={14} color={c.white} />
          </View>
        </TouchableOpacity>
        <Text style={styles.avatarCaption}>{t('profile.avatarCaption')}</Text>

        <FormField
          testID="edit-profile-name-input"
          label={t('profile.nameLabel')}
          required
          placeholder={t('profile.namePlaceholder')}
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (nameError) setNameError(undefined);
          }}
          error={nameError}
          autoCapitalize="words"
          themeColors={c}
        />

        <FormField
          testID="edit-profile-email-input"
          label={t('profile.emailLabel')}
          value={user?.email || ''}
          editable={false}
          themeColors={c}
        />
        <TouchableOpacity
          testID="edit-profile-change-email-button"
          style={styles.changeContactButton}
          onPress={() => setChangeEmailModalVisible(true)}
        >
          <Text style={styles.changeContactText}>{t('profile.change')}</Text>
        </TouchableOpacity>

        <FormField
          testID="edit-profile-phone-input"
          label={t('profile.phoneLabel')}
          value={user?.phoneNumber || ''}
          placeholder={t('profile.phoneNotSet')}
          editable={false}
          themeColors={c}
        />
        <TouchableOpacity
          testID="edit-profile-change-phone-button"
          style={styles.changeContactButton}
          onPress={() => setChangePhoneModalVisible(true)}
        >
          <Text style={styles.changeContactText}>{t('profile.change')}</Text>
        </TouchableOpacity>

        <SelectField
          label={t('profile.genderLabel')}
          placeholder={t('profile.selectGenderPlaceholder')}
          value={gender}
          onChange={setGender}
          options={getGenderOptions(t)}
          themeColors={c}
        />

        <SelectField
          label={t('profile.badmintonSkillLabel')}
          placeholder={t('profile.selectSkillPlaceholder')}
          value={badmintonSkill}
          onChange={setBadmintonSkill}
          options={badmintonSkillOptions}
          themeColors={c}
        />

        <SelectField
          label={t('profile.footballSkillLabel')}
          placeholder={t('profile.selectSkillPlaceholder')}
          value={footballSkill}
          onChange={setFootballSkill}
          options={footballSkillOptions}
          themeColors={c}
        />

        <TouchableOpacity
          testID="edit-profile-change-password"
          style={styles.changePasswordButton}
          onPress={handleChangePassword}
          disabled={changingPassword}
        >
          <Ionicons name="lock-closed-outline" size={18} color={c.textPrimary} />
          <Text style={styles.changePasswordText}>
            {changingPassword ? t('profile.sendingCode') : t('profile.changePassword')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <ChangeContactModal
        visible={changeEmailModalVisible}
        onClose={() => setChangeEmailModalVisible(false)}
        type="email"
        currentValue={user?.email || ''}
        onSuccess={(updatedUser) => {
          setUser({ ...user, email: updatedUser.email });
          setChangeEmailModalVisible(false);
          showAlert(t('common.success'), t('profile.emailUpdatedSuccess'));
        }}
      />
      <ChangeContactModal
        visible={changePhoneModalVisible}
        onClose={() => setChangePhoneModalVisible(false)}
        type="phone"
        currentValue={user?.phoneNumber || ''}
        onSuccess={(updatedUser) => {
          setUser({ ...user, phoneNumber: updatedUser.phoneNumber });
          setChangePhoneModalVisible(false);
          showAlert(t('common.success'), t('profile.phoneUpdatedSuccess'));
        }}
      />
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 48,
      paddingBottom: 12,
      backgroundColor: c.authScreenBg,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
    },
    topBarSide: {
      minWidth: 40,
      alignItems: 'flex-start',
    },
    topBarSideRight: {
      minWidth: 40,
      alignItems: 'flex-end',
    },
    topBarTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: c.textPrimary,
    },
    saveText: {
      fontSize: 15,
      fontWeight: '700',
      color: c.primary,
    },
    content: {
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 40,
    },
    avatarSection: {
      alignSelf: 'center',
      width: 112,
      height: 112,
    },
    avatar: {
      width: 112,
      height: 112,
      borderRadius: 56,
      backgroundColor: c.avatarCircleBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: c.primary,
      fontWeight: '700',
      fontSize: 36,
    },
    cameraBadge: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#22C55E',
      borderWidth: 3,
      borderColor: c.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarCaption: {
      marginTop: 12,
      marginBottom: 24,
      fontSize: 13,
      color: c.textSecondary,
      textAlign: 'center',
    },
    changeContactButton: {
      alignSelf: 'flex-end',
      marginTop: -10,
      marginBottom: 16,
    },
    changeContactText: {
      fontSize: 13,
      fontWeight: '600',
      color: c.primary,
    },
    changePasswordButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: c.divider,
      borderRadius: 10,
      paddingVertical: 14,
      marginTop: 8,
    },
    changePasswordText: {
      fontSize: 15,
      fontWeight: '600',
      color: c.textPrimary,
    },
  });
}
