import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

import { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

type Props = {
  /** Called with the recognized text once the player finishes speaking. */
  onTranscribed: (text: string) => void;
  /** Called on permission denial or any other recognition failure. */
  onFailed: () => void;
};

/**
 * Microphone control for voice input (spec User Story 4, FR-012/FR-014).
 * Speech-to-text now happens on-device (Android/iOS's built-in recognizer,
 * via expo-speech-recognition) rather than sending raw audio to
 * nlp-assistant for Gemini to transcribe — that path measured 15-50s per
 * clip (Gemini's inline-audio handling is not fast enough for a
 * conversational UI), while on-device recognition is near-instant. The
 * recognized text is sent through the exact same `inputMode: "text"` path
 * as typing, so nothing downstream (backend, nlp-assistant) needed to
 * change.
 */
export default function VoiceRecorderButton({ onTranscribed, onFailed }: Props) {
  const { colors: themeColors } = useTheme();
  const styles = useMemo(() => getStyles(themeColors), [themeColors]);
  const [isRecording, setIsRecording] = useState(false);

  useSpeechRecognitionEvent('result', (event) => {
    if (!event.isFinal) return;
    const transcript = event.results[0]?.transcript?.trim();
    setIsRecording(false);
    if (transcript) {
      onTranscribed(transcript);
    } else {
      onFailed();
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.warn('[VoiceRecorderButton] recognition error', event.error, event.message);
    setIsRecording(false);
    onFailed();
  });

  useSpeechRecognitionEvent('end', () => {
    setIsRecording(false);
  });

  const startRecording = async () => {
    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        onFailed();
        return;
      }
      setIsRecording(true);
      ExpoSpeechRecognitionModule.start({
        lang: 'vi-VN',
        interimResults: false,
        continuous: false,
      });
    } catch (error) {
      console.warn('[VoiceRecorderButton] failed to start recognition', error);
      setIsRecording(false);
      onFailed();
    }
  };

  const stopRecording = () => {
    ExpoSpeechRecognitionModule.stop();
  };

  return (
    <View style={isRecording ? styles.recordingWrap : undefined}>
      <TouchableOpacity
        style={[styles.button, isRecording && styles.buttonRecording]}
        onPress={isRecording ? stopRecording : startRecording}
        accessibilityRole="button"
        accessibilityLabel={isRecording ? 'Stop recording' : 'Voice input'}
      >
        <Ionicons
          name={isRecording ? 'stop' : 'mic-outline'}
          size={18}
          color={isRecording ? themeColors.white : themeColors.accentText}
        />
      </TouchableOpacity>
      {isRecording ? <Text style={styles.recordingLabel}>Đang nghe... bấm để dừng</Text> : null}
    </View>
  );
}

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
    button: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: c.glassRingBorder,
      backgroundColor: c.glassButtonBg,
    },
    buttonRecording: {
      backgroundColor: c.error,
      borderColor: c.error,
    },
    recordingWrap: {
      position: 'relative',
    },
    recordingLabel: {
      position: 'absolute',
      top: -18,
      left: -20,
      width: 76,
      fontSize: 9,
      color: c.error,
      fontWeight: '600',
      textAlign: 'center',
    },
  });
}
