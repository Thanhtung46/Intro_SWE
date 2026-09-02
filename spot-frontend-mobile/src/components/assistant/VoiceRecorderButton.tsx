import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';
import { showAlert } from '@/utils/showAlert';

type Props = {
  /** Called with the recognized text once the player finishes speaking. */
  onTranscribed: (text: string) => void;
  /** Called on permission denial or any other recognition failure. */
  onFailed: () => void;
};

/**
 * Voice input is disabled on this build. On-device speech-to-text needs
 * `expo-speech-recognition` (a native module → Dev Client only); this
 * branch runs on Expo Go, so the mic just tells the user to type instead.
 * Kept as a same-signature stub so AssistantScreen needs no change.
 */
export default function VoiceRecorderButton({ onTranscribed: _onTranscribed, onFailed }: Props) {
  const handlePress = () => {
    showAlert('Nhập bằng giọng nói chưa khả dụng trên bản này. Vui lòng gõ tin nhắn.');
    onFailed();
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="Voice input (unavailable)"
    >
      <Ionicons name="mic-off-outline" size={18} color={colors.subtitle} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.glassBackground,
  },
});
