import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { fonts, radius, spacing, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import type { TabParamList } from '@/navigation/types';

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
    <View style={[styles.banner, inset && styles.inset]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <TouchableOpacity
        style={styles.cta}
        onPress={() => navigation.navigate('Профиль')}
        accessibilityRole="button"
        accessibilityLabel="Открыть профиль"
      >
        <Text style={styles.ctaText}>Открыть профиль</Text>
      </TouchableOpacity>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  banner: {
    padding: spacing.lg,
    backgroundColor: colors.panelRaised,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.lineStrong
  },
  inset: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg
  },
  title: { color: colors.paper, fontFamily: fonts.bodySemi, fontSize: 14, marginBottom: 6 },
  body: { color: colors.paperDim, fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  cta: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.control,
    backgroundColor: colors.lime
  },
  ctaText: { color: colors.ink, fontFamily: fonts.bodySemi, fontSize: 13 }
});
}
