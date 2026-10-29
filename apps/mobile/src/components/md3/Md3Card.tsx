import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useThemeColors } from '@/core/theme/useThemeColors';
import {
  md3CardPadding,
  md3Surface,
  type Md3CardPadding,
  type Md3RadiusKey,
  type Md3SurfaceVariant
} from './md3Surface';

interface Props {
  /** Тональная поверхность: flat/raised — без рамки, outlined — рамка по line. */
  variant?: Md3SurfaceVariant;
  padding?: Md3CardPadding;
  radiusKey?: Md3RadiusKey;
  accessibilityRole?: React.ComponentProps<typeof View>['accessibilityRole'];
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * Базовая карточка MD3-фазы 2: тон вместо рамки — карточка красится
 * в surfaceContainer/surfaceContainerHigh, а не в panel + border.
 */
export default function Md3Card({
  variant = 'flat',
  padding = 'md',
  radiusKey = 'card',
  accessibilityRole,
  accessibilityLabel,
  style,
  children
}: Props) {
  const colors = useThemeColors();
  return (
    <View
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      style={[md3Surface(colors, variant, radiusKey), md3CardPadding[padding], style]}
    >
      {children}
    </View>
  );
}
