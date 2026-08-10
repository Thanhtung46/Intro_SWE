import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleProp, StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

interface PasswordFieldProps extends Omit<TextInputProps, 'secureTextEntry'> {
  label: string;
  required?: boolean;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function PasswordField({ label, required, error, style, containerStyle, ...inputProps }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={!visible}
          numberOfLines={1}
          {...inputProps}
        />
        <TouchableOpacity
          onPress={() => setVisible((v) => !v)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        >
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.placeholder} />
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 6,
  },
  required: {
    color: colors.required,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 8,
    fontSize: 15,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: colors.error,
  },
});
