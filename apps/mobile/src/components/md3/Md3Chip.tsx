import React from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useThemeColors } from '@/core/theme/useThemeColors';
import {
  md3ChipLabel,
  md3ChipSurface,
  type Md3ChipState,
  type Md3ChipVariant
} from './md3Surface';

interface Props {
  label: string;
  /** filter — переключаемый, assist — действие/подсказка, status — состояние. */
  variant?: Md3ChipVariant;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  /** A11y-имя, если label сам по себе недостаточен. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Чип Material 3: surfaceContainer → primaryContainer при выборе. */
export default function Md3Chip({
  label,
  variant = 'filter',
  selected = false,
  disabled = false,
  onPress,
  accessibilityLabel,
  style
}: Props) {
  const colors = useThemeColors();
  const state: Md3ChipState = { variant, selected, disabled };
  const text = <Text style={md3ChipLabel(colors, state)}>{label}</Text>;

  if (!onPress) {
    return (
      <View accessibilityLabel={accessibilityLabel} style={[md3ChipSurface(colors, state), style]}>
        {text}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        md3ChipSurface(colors, state),
        pressed && !disabled ? { opacity: 0.8 } : null,
        style
      ]}
    >
      {text}
    </Pressable>
  );
}
