import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChangeContactModal } from '@/components/ChangeContactModal';
import { FormField } from '@/components/FormField';
import { SelectField } from '@/components/SelectField';
import { genderOptions } from '@/schemas/registerSchema';
import { useUser } from '@/context/UserContext';
import { colors } from '@/constants/colors';
import { comingSoon } from '@/utils/comingSoon';
import { showAlert } from '@/utils/showAlert';
import { getProfile, updateProfile, updateSkills, SkillsUpdatePayload } from '@/services/profileService';

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

export default function EditProfileScreen({ onBack }: { onBack: () => void }) {
  const { user, setUser } = useUser();

  const [name, setName] = useState(user?.fullName || '');
  const [nameError, setNameError] = useState<string | undefined>();
  const [gender, setGender] = useState('');
  const [badmintonSkill, setBadmintonSkill] = useState('');
  const [footballSkill, setFootballSkill] = useState('');
  const [saving, setSaving] = useState(false);
  const [changeEmailModalVisible, setChangeEmailModalVisible] = useState(false);
  const [changePhoneModalVisible, setChangePhoneModalVisible] = useState(false);

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

  const displayName = user?.fullName || 'Guest';

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Name is required');
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
      showAlert('Error', result.message || 'Something went wrong. Please try again.');
      return;
    }

    const skillsPayload: SkillsUpdatePayload = {};
    if (badmintonSkill !== initialBadmintonSkill.current) skillsPayload.badminton = badmintonSkill || null;
    if (footballSkill !== initialFootballSkill.current) skillsPayload.football = footballSkill || null;

    if (Object.keys(skillsPayload).length > 0) {
      const skillsResult = await updateSkills(skillsPayload);
      if (!skillsResult.success) {
        showAlert('Error', skillsResult.message || 'Failed to update skills. Please try again.');
        return;
      }
    }

    setUser({ ...user, fullName: result.user?.fullName ?? trimmed });
    showAlert('Success', 'Profile updated');
    onBack();
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
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Edit Profile</Text>
        <TouchableOpacity
          testID="edit-profile-save"
          style={styles.topBarSideRight}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</Text>
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
            <Ionicons name="camera" size={14} color={colors.white} />
          </View>
        </TouchableOpacity>
        <Text style={styles.avatarCaption}>Tap to upload profile picture</Text>

        <FormField
          testID="edit-profile-name-input"
          label="Name"
          required
          placeholder="Enter your name"
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (nameError) setNameError(undefined);
          }}
          error={nameError}
          autoCapitalize="words"
        />

        <FormField
          testID="edit-profile-email-input"
          label="Email"
          value={user?.email || ''}
          editable={false}
        />
        <TouchableOpacity
          testID="edit-profile-change-email-button"
          style={styles.changeContactButton}
          onPress={() => setChangeEmailModalVisible(true)}
        >
          <Text style={styles.changeContactText}>Change</Text>
        </TouchableOpacity>

        <FormField
          testID="edit-profile-phone-input"
          label="Phone Number"
          value={user?.phoneNumber || ''}
          placeholder="Not set"
          editable={false}
        />
        <TouchableOpacity
          testID="edit-profile-change-phone-button"
          style={styles.changeContactButton}
          onPress={() => setChangePhoneModalVisible(true)}
        >
          <Text style={styles.changeContactText}>Change</Text>
        </TouchableOpacity>

        <SelectField
          label="Gender"
          placeholder="Select gender"
          value={gender}
          onChange={setGender}
          options={[...genderOptions]}
        />

        <SelectField
          label="Badminton Skill"
          placeholder="Select skill level"
          value={badmintonSkill}
          onChange={setBadmintonSkill}
          options={badmintonSkillOptions}
        />

        <SelectField
          label="Football Skill"
          placeholder="Select skill level"
          value={footballSkill}
          onChange={setFootballSkill}
          options={footballSkillOptions}
        />

        <TouchableOpacity
          testID="edit-profile-change-password"
          style={styles.changePasswordButton}
          onPress={() => comingSoon('Change Password')}
        >
          <Ionicons name="lock-closed-outline" size={18} color={colors.text} />
          <Text style={styles.changePasswordText}>Change Password</Text>
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
          showAlert('Success', 'Email updated');
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
          showAlert('Success', 'Phone number updated');
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.white,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    color: colors.text,
  },
  saveText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryDark,
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
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primaryDark,
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
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCaption: {
    marginTop: 12,
    marginBottom: 24,
    fontSize: 13,
    color: colors.subtitle,
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
    color: colors.primaryDark,
  },
  changePasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 8,
  },
  changePasswordText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
});
