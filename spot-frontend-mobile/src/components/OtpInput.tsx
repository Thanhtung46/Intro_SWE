import React, { useRef } from 'react';
import {
  NativeSyntheticEvent,
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputKeyPressEventData,
  View,
  ViewStyle,
} from 'react-native';
import { colors } from '../theme/colors';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  error?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export function OtpInput({ length = 6, value, onChange, onComplete, error, containerStyle }: OtpInputProps) {
  const inputs = useRef<Array<TextInput | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  const setDigitAt = (index: number, digit: string) => {
    const chars = value.split('');
    chars[index] = digit;
    const joined = chars.join('').slice(0, length);
    onChange(joined);
    if (joined.length === length) {
      onComplete?.(joined);
    }
  };

  const handleChangeText = (index: number, text: string) => {
    const digitsOnly = text.replace(/\D/g, '');

    if (digitsOnly.length > 1) {
      // A paste of multiple digits landed in a single box — distribute it from here.
      const merged = (value.slice(0, index) + digitsOnly).slice(0, length);
      onChange(merged);
      if (merged.length === length) {
        onComplete?.(merged);
        inputs.current[length - 1]?.blur();
      } else {
        inputs.current[merged.length]?.focus();
      }
      return;
    }

    setDigitAt(index, digitsOnly);

    if (digitsOnly && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
      setDigitAt(index - 1, '');
    }
  };

  return (
    <View style={[styles.row, containerStyle]}>
      {digits.map((digit, index) => (
        <TextInput
          key={index}
          ref={(el) => {
            inputs.current[index] = el;
          }}
          testID={`otp-input-${index}`}
          style={[styles.box, error ? styles.boxError : null]}
          value={digit}
          onChangeText={(text) => handleChangeText(index, text)}
          onKeyPress={(e) => handleKeyPress(index, e)}
          keyboardType="number-pad"
          maxLength={length}
          textAlign="center"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  box: {
    width: 44,
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    fontSize: 20,
    color: colors.text,
    backgroundColor: colors.white,
  },
  boxError: {
    borderColor: colors.error,
  },
});
