import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { FormField } from '@/components/FormField';
import { SelectField } from '@/components/SelectField';
import { genderOptions } from '@/schemas/registerSchema';
import { useUser } from '@/context/UserContext';
import { colors } from '@/constants/colors';
import { comingSoon } from '@/utils/comingSoon';

// Not part of user_profiles per any BE spec/AC — placeholder options for the
// Figma-required UI only, confirm real values with team/PO later.
const skillLevelOptions = [
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' },
  { label: 'Pro', value: 'pro' },
];

export default function EditProfileScreen({ onBack }: { onBack: () => void }) {
  const { user, setUser } = useUser();

  const [name, setName] = useState(user?.fullName || '');
  const [nameError, setNameError] = useState<string | undefined>();
  const [gender, setGender] = useState('');
  const [skillLevel, setSkillLevel] = useState('');
  const [skillDescription, setSkillDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProfile().then((result) => {
      if (result.success && result.user?.gender) {
        setGender(result.user.gender);
      }
    });
  }, []);

  const displayName = user?.fullName || 'Guest';

  const showComingSoon = (feature: string) => {
    Alert.alert('Coming soon', `${feature} is not available yet.`);
  };

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
      Alert.alert('Error', result.message || 'Something went wrong. Please try again.');
      return;
    }

    setUser({ ...user, fullName: result.user?.fullName ?? trimmed });
    Alert.alert('Success', 'Profile updated');
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

        <FormField
          testID="edit-profile-phone-input"
          label="Phone Number"
          value={user?.phoneNumber || ''}
          placeholder="Not set"
          editable={false}
        />

        <Text style={styles.lockedCaption}>
          Changing email or phone requires OTP verification — coming soon.
        </Text>

        <SelectField
          label="Gender"
          placeholder="Select gender"
          value={gender}
          onChange={setGender}
          options={[...genderOptions]}
        />

        <SelectField
          label="Skill Level"
          placeholder="Select skill level"
          value={skillLevel}
          onChange={setSkillLevel}
          options={skillLevelOptions}
        />

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Skill Description</Text>
          <TextInput
            testID="edit-profile-skill-description-input"
            style={styles.textarea}
            placeholder="Describe your skill level"
            placeholderTextColor={colors.placeholder}
            value={skillDescription}
            onChangeText={setSkillDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          testID="edit-profile-change-password"
          style={styles.changePasswordButton}
          onPress={() => comingSoon('Change Password')}
        >
          <Ionicons name="lock-closed-outline" size={18} color={colors.text} />
          <Text style={styles.changePasswordText}>Change Password</Text>
        </TouchableOpacity>
      </ScrollView>
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
  lockedCaption: {
    marginTop: -8,
    marginBottom: 16,
    fontSize: 12,
    color: colors.subtitle,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 6,
  },
  textarea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.white,
    minHeight: 96,
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
