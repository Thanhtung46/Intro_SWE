import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleProp, StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors } from '@/constants/colors';
import { ThemeColors } from '@/constants/theme';

interface PasswordFieldProps extends Omit<TextInputProps, 'secureTextEntry'> {
  label: string;
  required?: boolean;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  labelRight?: React.ReactNode;
  leftIcon?: React.ReactNode;
  themeColors?: ThemeColors;
}

export function PasswordField({
  label,
  required,
  error,
  style,
  containerStyle,
  labelRight,
  leftIcon,
  themeColors,
  ...inputProps
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, themeColors && { color: themeColors.textSecondaryAlt }]}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
        {labelRight}
      </View>
      <View
        style={[
          styles.inputWrapper,
          themeColors && { backgroundColor: themeColors.inputBg, borderColor: themeColors.divider },
          error ? [styles.inputError, themeColors && { borderColor: themeColors.error }] : null,
        ]}
      >
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
        <TextInput
          style={[styles.input, themeColors && { color: themeColors.textPrimary }, style]}
          placeholderTextColor={themeColors ? themeColors.textMuted : colors.placeholder}
          secureTextEntry={!visible}
          numberOfLines={1}
          {...inputProps}
        />
        <TouchableOpacity
          onPress={() => setVisible((v) => !v)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        >
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={themeColors ? themeColors.textMuted : colors.placeholder}
          />
        </TouchableOpacity>
      </View>
      {error ? (
        <Text style={[styles.errorText, themeColors && { color: themeColors.error }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    color: colors.text,
  },
  required: {
    color: colors.formError,
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
  leftIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 8,
    fontSize: 15,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.formError,
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: colors.formError,
  },
});
