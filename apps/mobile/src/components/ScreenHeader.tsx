import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { fonts, spacing, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';

interface Props {
  /** Small brand line under the mark, e.g. «Сегодня» */
  eyebrow?: string;
  title: string;
  /** Optional second line under title */
  subtitle?: string;
  /** Optional right-side control (button, badge). */
  right?: React.ReactNode;
  style?: ViewStyle;
}

/** FitPulse screen chrome: mint FP mark + title. */
export default function ScreenHeader({ eyebrow, title, subtitle, right, style }: Props) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <View style={[styles.header, style]}>
      <View style={styles.row}>
        <View style={styles.mark}>
          <Text style={styles.markText}>FP</Text>
        </View>
        <View style={styles.titles}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    header: {
      paddingHorizontal: spacing.xxl,
      paddingBottom: spacing.lg,
      borderBottomWidth: 1,
      borderColor: colors.line
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    mark: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.limeDim,
      borderWidth: 1.5,
      borderColor: colors.lime,
      alignItems: 'center',
      justifyContent: 'center'
    },
    markText: {
      color: colors.lime,
      fontFamily: fonts.mono,
      fontSize: 16,
      letterSpacing: 0.5
    },
    titles: { flex: 1 },
    eyebrow: {
      color: colors.lime,
      fontSize: 11,
      fontFamily: fonts.bodySemi,
      letterSpacing: 0.8,
      marginBottom: 2
    },
    title: {
      color: colors.paper,
      fontSize: 28,
      fontFamily: fonts.mono,
      lineHeight: 32
    },
    subtitle: {
      color: colors.paperDim,
      fontSize: 13,
      fontFamily: fonts.body,
      marginTop: 3,
      lineHeight: 18
    },
    right: { marginLeft: 4 }
  });
}
