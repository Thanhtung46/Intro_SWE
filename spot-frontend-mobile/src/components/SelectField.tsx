import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { FlatList, Modal, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors } from '@/constants/colors';
import type { ThemeColors } from '@/constants/theme';

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectFieldProps {
  label: string;
  required?: boolean;
  placeholder: string;
  value?: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  /** Read-only, greyed-out display — used when the value came from a trusted source (e.g. an existing DB venue) instead of manual pick. */
  disabled?: boolean;
  themeColors?: ThemeColors;
}

export function SelectField({ label, required, placeholder, value, options, onChange, error, containerStyle, disabled, themeColors }: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.label, themeColors && { color: themeColors.textSecondary }]}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TouchableOpacity
        style={[styles.input, themeColors && { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder }, error ? styles.inputError : null, disabled ? styles.inputDisabled : null]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={disabled ? 1 : 0.7}
        disabled={disabled}
      >
        <Text style={[selected ? styles.valueText : styles.placeholderText, themeColors && { color: selected ? themeColors.textPrimary : themeColors.textMuted }]} numberOfLines={1} ellipsizeMode="tail">
          {selected ? selected.label : placeholder}
        </Text>
        {!disabled && <Ionicons name="chevron-down" size={18} color={themeColors?.textMuted ?? colors.placeholder} />}
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={[styles.overlay, themeColors && { backgroundColor: themeColors.modalOverlay }]} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={[styles.sheet, themeColors && { backgroundColor: themeColors.surface, borderColor: themeColors.surfaceBorder, borderWidth: 1 }]}>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.optionText, themeColors && { color: themeColors.textPrimary }]}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
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
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.white,
  },
  inputError: {
    borderColor: colors.formError,
  },
  inputDisabled: {
    backgroundColor: colors.formScreenBackground,
  },
  valueText: {
    flexShrink: 1,
    marginRight: 8,
    fontSize: 15,
    color: colors.text,
  },
  placeholderText: {
    flexShrink: 1,
    marginRight: 8,
    fontSize: 15,
    color: colors.placeholder,
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: colors.formError,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  sheet: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 8,
    maxHeight: 240,
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  optionText: {
    fontSize: 15,
    color: colors.text,
  },
});
