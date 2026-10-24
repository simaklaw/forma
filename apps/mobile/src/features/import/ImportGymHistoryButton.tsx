import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { fonts, radius, spacing } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { useFitPulseStore } from '@/state/useFitPulseStore';
import { pickAndImportGymHistoryFile } from './importGymHistoryFile';

/** Импорт истории силовых: CSV-экспорт Hevy / Strong → setLogs. */
export default function ImportGymHistoryButton() {
  const colors = useThemeColors();
  const importSetLogs = useFitPulseStore((s) => s.importSetLogs);
  const [busy, setBusy] = useState(false);

  async function onPress() {
    setBusy(true);
    try {
      const result = await pickAndImportGymHistoryFile();
      if (result.cancelled) return;

      if (result.drafts.length === 0) {
        Alert.alert(
          'Импорт',
          result.warnings.length
            ? result.warnings.join('\n')
            : result.unmatchedNames.length
              ? 'Ни одно упражнение из файла не сопоставлено с каталогом'
              : 'Не удалось извлечь подходы из файла'
        );
        return;
      }

      const { added, skippedDuplicates } = importSetLogs(result.drafts);
      const unmatchedNote =
        result.unmatchedNames.length > 0
          ? `\n\nНе сопоставлено: ${result.unmatchedNames.slice(0, 5).join(', ')}` +
            (result.unmatchedNames.length > 5
              ? `…ещё ${result.unmatchedNames.length - 5}`
              : '')
          : '';
      const dupesNote =
        skippedDuplicates > 0 ? `\n(дубликаты пропущены: ${skippedDuplicates})` : '';
      const warnNote = result.warnings.length > 0 ? `\n\n⚠ ${result.warnings.join('; ')}` : '';

      Alert.alert('Импортировано', `Подходов добавлено: ${added}${dupesNote}${unmatchedNote}${warnNote}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: colors.panel, borderColor: colors.lineStrong }]}
      onPress={() => void onPress()}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel="Импорт истории тренировок из CSV Hevy или Strong"
    >
      {busy ? (
        <ActivityIndicator color={colors.lime} />
      ) : (
        <Text style={[styles.btnText, { color: colors.lime }]}>Импорт Hevy / Strong (CSV)</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    marginTop: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.control,
    borderWidth: 1,
    alignItems: 'center',
  },
  btnText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
  },
});
