import React from 'react';
import { Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';
import { useThemeColors } from '@/core/theme/useThemeColors';
import {
  md3ButtonLabel,
  md3ButtonSurface,
  type Md3ButtonSize,
  type Md3ButtonVariant
} from './md3Surface';

interface Props {
  /** Простой текст кнопки; для сложного контента — children. */
  label?: string;
  children?: React.ReactNode;
  /** filled — CTA (lime), tonal — primaryContainer, outlined — рамка. */
  variant?: Md3ButtonVariant;
  size?: Md3ButtonSize;
  disabled?: boolean;
  onPress?: () => void;
  /** A11y-имя, если контент не текстовый или не самодостаточен. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Кнопка Material 3: filled/tonal/outlined на якорях typeScale. */
export default function Md3Button({
  label,
  children,
  variant = 'filled',
  size = 'md',
  disabled = false,
  onPress,
  accessibilityLabel,
  style
}: Props) {
  const colors = useThemeColors();
  const state = { variant, size, disabled };
  const content =
    children ??
    (label !== undefined ? <Text style={md3ButtonLabel(colors, state)}>{label}</Text> : null);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        md3ButtonSurface(colors, state),
        pressed && !disabled ? { opacity: 0.85 } : null,
        style
      ]}
    >
      {content}
    </Pressable>
  );
}
