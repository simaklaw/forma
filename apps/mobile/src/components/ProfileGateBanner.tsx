import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { spacing, typeScale, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import type { TabParamList } from '@/navigation/types';
import Md3Card from './md3/Md3Card';
import Md3Button from './md3/Md3Button';

type Props = {
  title?: string;
  body: string;
  /** Extra horizontal margin when parent does not already pad (e.g. Nutrition). */
  inset?: boolean;
};

/** Shared incomplete-profile callout — CTA opens tab «Профиль». */
export default function ProfileGateBanner({
  title = 'Сначала профиль',
  body,
  inset = false
}: Props) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();

  return (
    <Md3Card variant="flat" padding="lg" style={inset ? styles.inset : null}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <Md3Button
        variant="tonal"
        size="md"
        label="Открыть профиль"
        onPress={() => navigation.navigate('Профиль')}
        style={styles.cta}
      />
    </Md3Card>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    inset: { marginHorizontal: spacing.xl, marginTop: spacing.lg },
    title: { ...typeScale.titleMedium, color: colors.paper, marginBottom: 6 },
    body: { ...typeScale.bodyMedium, color: colors.paperDim },
    cta: { marginTop: spacing.md, alignSelf: 'flex-start' }
  });
}
