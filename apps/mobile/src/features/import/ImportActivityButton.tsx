import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { fonts, radius, spacing } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { useFitPulseStore } from '@/state/useFitPulseStore';
import { SPORT_LABEL_RU } from '@forma/core';
import { pickAndParseActivityFile } from './importActivityFile';

/** Entry point: pick FIT/TCX/GPX → store as importedActivities. */
export default function ImportActivityButton() {
  const colors = useThemeColors();
  const addImportedActivities = useFitPulseStore((s) => s.addImportedActivities);
  const [busy, setBusy] = useState(false);

  async function onPress() {
    setBusy(true);
    try {
      const result = await pickAndParseActivityFile();
      if (result.cancelled) return;

      if (result.activities.length === 0) {
        Alert.alert(
          'Импорт',
          result.warnings.length
            ? result.warnings.join('\n')
            : 'Не удалось извлечь активность из файла',
        );
        return;
      }

      const added = addImportedActivities(result.activities);
      const summary = result.activities
        .slice(0, 3)
        .map((a) => {
          const km =
            a.distanceM != null ? ` · ${(a.distanceM / 1000).toFixed(1)} км` : '';
          const kcal = a.caloriesKcal != null ? ` · ${a.caloriesKcal} ккал` : '';
          return `${SPORT_LABEL_RU[a.sport]} ${a.dateKey}${km}${kcal}`;
        })
        .join('\n');

      const extra =
        result.activities.length > 3 ? `\n…ещё ${result.activities.length - 3}` : '';
      const warn =
        result.warnings.length > 0 ? `\n\n⚠ ${result.warnings.join('; ')}` : '';
      const dedupe =
        added < result.activities.length
          ? `\n(новых: ${added}, дубликаты пропущены)`
          : '';

      Alert.alert('Импортировано', `${summary}${extra}${dedupe}${warn}`);
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
      accessibilityLabel="Импорт тренировки из файла FIT TCX или GPX"
    >
      {busy ? (
        <ActivityIndicator color={colors.lime} />
      ) : (
        <Text style={[styles.btnText, { color: colors.lime }]}>Импорт FIT / TCX / GPX</Text>
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
