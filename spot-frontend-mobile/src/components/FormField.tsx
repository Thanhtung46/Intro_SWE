import React from 'react';
import { StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { colors } from '@/constants/colors';
import { ThemeColors } from '@/constants/theme';

interface FormFieldProps extends TextInputProps {
  label: string;
  required?: boolean;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  leftIcon?: React.ReactNode;
  themeColors?: ThemeColors;
}

export function FormField({
  label,
  required,
  error,
  style,
  containerStyle,
  leftIcon,
  themeColors,
  ...inputProps
}: FormFieldProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.label, themeColors && { color: themeColors.textSecondaryAlt }]}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
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
          {...inputProps}
        />
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
  label: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 6,
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
