/**
 * BottomSheet.tsx
 *
 * Wraps @gorhom/bottom-sheet — a real native gesture-driven sheet (drag to
 * dismiss, backdrop tap, spring physics), which is what the report asked for
 * ("нативная обработка жестов сдваивания и перехват фокуса ввода"). The HTML
 * prototype's .sheet/.sheet-scrim divs with CSS transforms were the closest
 * approximation possible in a browser; this replaces them outright rather
 * than reimplementing gesture handling by hand.
 */

import React, { forwardRef, useCallback, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import GorhomBottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { colors, fonts, spacing } from '@/core/theme/tokens';

interface Props {
  title: string;
  eyebrow?: string;
  snapPoints?: (string | number)[];
  onClose?: () => void;
  children: React.ReactNode;
}

const AppBottomSheet = forwardRef<GorhomBottomSheet, Props>(({ title, eyebrow, snapPoints, onClose, children }, ref) => {
  const points = useMemo(() => snapPoints ?? ['60%', '85%'], [snapPoints]);

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />,
    []
  );

  return (
    <GorhomBottomSheet
      ref={ref}
      index={-1}
      snapPoints={points}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={styles.content}>
        <View style={styles.header}>
          <View>
            {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
            <Text style={styles.title}>{title}</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityLabel="Закрыть" accessibilityRole="button">
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>
        </View>
        {children}
      </BottomSheetView>
    </GorhomBottomSheet>
  );
});

AppBottomSheet.displayName = 'AppBottomSheet';
export default AppBottomSheet;

const styles = StyleSheet.create({
  background: { backgroundColor: colors.panelRaised, borderTopWidth: 1, borderColor: colors.lineStrong },
  handle: { backgroundColor: colors.lineStrong, width: 36 },
  content: { flex: 1, paddingHorizontal: spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing.md
  },
  eyebrow: { color: colors.paperFaint, fontSize: 11, marginBottom: 4, fontFamily: fonts.body },
  title: { color: colors.paper, fontSize: 26, fontFamily: fonts.mono },
  closeBtn: {
    width: 30,
    height: 30,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeText: { color: colors.paperDim, fontSize: 18, lineHeight: 18 }
});
