import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SPORT_LABEL_RU, type ImportedActivity } from '@forma/core';
import { fonts, radius, spacing } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { useFitPulseStore } from '@/state/useFitPulseStore';

function formatDuration(sec: number): string {
  if (sec <= 0) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}ч ${m}м`;
  return `${m} мин`;
}

function Row({
  item,
  onRemove,
}: {
  item: ImportedActivity;
  onRemove: (id: string) => void;
}) {
  const colors = useThemeColors();
  const km =
    item.distanceM != null ? `${(item.distanceM / 1000).toFixed(2)} км` : null;
  const kcal = item.caloriesKcal != null ? `${item.caloriesKcal} ккал` : null;
  const meta = [formatDuration(item.durationSec), km, kcal, item.source.toUpperCase()]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={[styles.row, { backgroundColor: colors.surfaceContainerHigh }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.paper }]}>
          {SPORT_LABEL_RU[item.sport]}
          {item.name && item.name !== item.sourceFileName ? ` · ${item.name}` : ''}
        </Text>
        <Text style={[styles.meta, { color: colors.paperFaint }]}>
          {item.dateKey} · {meta}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => onRemove(item.id)}
        accessibilityRole="button"
        accessibilityLabel="Удалить импортированную активность"
        hitSlop={8}
      >
        <Text style={{ color: colors.ember, fontFamily: fonts.bodySemi }}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ImportedActivitiesList({ limit = 8 }: { limit?: number }) {
  const colors = useThemeColors();
  const items = useFitPulseStore((s) => s.importedActivities);
  const remove = useFitPulseStore((s) => s.removeImportedActivity);

  const sorted = useMemo(
    () => [...items].sort((a, b) => b.startedAtMs - a.startedAtMs).slice(0, limit),
    [items, limit],
  );

  if (sorted.length === 0) {
    return (
      <Text style={[styles.empty, { color: colors.paperFaint }]}>
        Пока нет импортов с часов. Можно загрузить .fit / .tcx / .gpx.
      </Text>
    );
  }

  return (
    <View style={styles.list}>
      {sorted.map((item) => (
        <Row key={item.id} item={item} onRemove={remove} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8, marginTop: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.card,
  },
  title: { fontFamily: fonts.bodySemi, fontSize: 14 },
  meta: { fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  empty: { fontFamily: fonts.body, fontSize: 12, marginTop: spacing.sm, lineHeight: 18 },
});
