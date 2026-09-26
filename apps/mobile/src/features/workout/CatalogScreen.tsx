import React, { useMemo, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { fonts, radius, spacing } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import type { MuscleKey } from '@/components/MuscleMap';
import type { ExerciseDef } from './ExerciseSheet';
import { CATALOGS, type TrainingMode } from './catalog';

const MUSCLE_LABELS: Record<MuscleKey, string> = {
  chest: 'грудь',
  shoulders: 'плечи',
  biceps: 'бицепс',
  triceps: 'трицепс',
  core: 'кор',
  quads: 'квадрицепс',
  hamstrings: 'бицепс бедра',
  glutes: 'ягодицы',
  lowerback: 'поясница',
  back: 'спина',
  calves: 'икры'
};

type CatalogItem = ExerciseDef & { mode: TrainingMode; dayName: string };

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('ru-RU');
}

function buildItems(mode: TrainingMode): CatalogItem[] {
  return CATALOGS[mode].flatMap((day) =>
    day.exercises.map((exercise) => ({ ...exercise, mode, dayName: day.name }))
  );
}

export default function CatalogScreen() {
  const colors = useThemeColors();
  const [mode, setMode] = useState<TrainingMode>('gym');
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleKey | null>(null);
  const items = useMemo(() => buildItems(mode), [mode]);
  const muscles = useMemo(
    () => Array.from(new Set(items.flatMap((item) => item.targetMuscles))),
    [items]
  );
  const filtered = useMemo(() => {
    const q = normalize(query);
    return items.filter((item) => {
      const matchesQuery = !q || normalize(`${item.name} ${item.dayName} ${item.note}`).includes(q);
      const matchesMuscle = !muscle || item.targetMuscles.includes(muscle);
      return matchesQuery && matchesMuscle;
    });
  }, [items, muscle, query]);

  function changeMode(next: TrainingMode) {
    setMode(next);
    setMuscle(null);
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.ink }]}>
      <View style={[styles.header, { borderBottomColor: colors.line }]}>
        <Text style={[styles.eyebrow, { color: colors.lime }]}>FITPULSE · БИБЛИОТЕКА</Text>
        <Text style={[styles.title, { color: colors.paper }]}>Каталог</Text>
        <Text style={[styles.subtitle, { color: colors.paperDim }]}>Офлайн-список упражнений для дома и зала</Text>
      </View>
      <View style={styles.modeTabs} accessibilityRole="tablist">
        {(['gym', 'home'] as const).map((item) => {
          const active = mode === item;
          return (
            <TouchableOpacity
              key={item}
              onPress={() => changeMode(item)}
              style={[styles.modeTab, { borderColor: colors.lineStrong, backgroundColor: colors.panel }, active && { borderColor: colors.lime, backgroundColor: colors.limeDim }]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.modeText, { color: active ? colors.lime : colors.paperDim }]}>{item === 'gym' ? 'Зал' : 'Дом'}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Найти упражнение или группу мышц"
        placeholderTextColor={colors.paperFaint}
        style={[styles.search, { backgroundColor: colors.panel, borderColor: colors.lineStrong, color: colors.paper }]}
        accessibilityLabel="Поиск упражнений"
        returnKeyType="search"
      />
      <FlatList
        data={muscles}
        horizontal
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        renderItem={({ item }) => {
          const active = muscle === item;
          return (
            <TouchableOpacity
              onPress={() => setMuscle(active ? null : item)}
              style={[styles.chip, { borderColor: colors.lineStrong, backgroundColor: colors.panel }, active && { borderColor: colors.cyan, backgroundColor: colors.limeDim }]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, { color: active ? colors.cyan : colors.paperDim }]}>{MUSCLE_LABELS[item]}</Text>
            </TouchableOpacity>
          );
        }}
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => `${item.mode}-${item.id}-${item.dayName}`}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
            <View style={styles.cardTop}>
              <Text style={[styles.index, { color: colors.lime }]}>{String(index + 1).padStart(2, '0')}</Text>
              <View style={styles.cardCopy}>
                <Text style={[styles.name, { color: colors.paper }]}>{item.name}</Text>
                <Text style={[styles.meta, { color: colors.paperFaint }]}>{item.dayName}</Text>
              </View>
              <Text style={[styles.load, { color: colors.paperDim }]}>{item.workingWeight > 0 ? `${item.workingWeight} кг` : 'свой вес'}</Text>
            </View>
            <Text style={[styles.muscles, { color: colors.paperDim }]}>{item.targetMuscles.map((key) => MUSCLE_LABELS[key]).join(' · ')}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.paperFaint }]}>Ничего не найдено. Измените запрос или фильтр.</Text>}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md, borderBottomWidth: 1 },
  eyebrow: { fontSize: 11, fontFamily: fonts.bodySemi, letterSpacing: 1 },
  title: { fontSize: 30, fontFamily: fonts.mono },
  subtitle: { fontSize: 13, fontFamily: fonts.body, marginTop: 3 },
  modeTabs: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  modeTab: { flex: 1, borderWidth: 1, borderRadius: radius.pill, alignItems: 'center', paddingVertical: 11 },
  modeText: { fontFamily: fonts.bodySemi, fontSize: 14 },
  search: { marginHorizontal: spacing.lg, borderWidth: 1, borderRadius: radius.control, paddingHorizontal: spacing.md, paddingVertical: 11, fontFamily: fonts.body, fontSize: 14 },
  chips: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: 8 },
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 12 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 110, gap: 8 },
  card: { borderWidth: 1, borderRadius: radius.card, padding: spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  index: { fontFamily: fonts.mono, fontSize: 14, width: 24 },
  cardCopy: { flex: 1 },
  name: { fontFamily: fonts.bodySemi, fontSize: 15 },
  meta: { fontFamily: fonts.body, fontSize: 11, marginTop: 3 },
  load: { fontFamily: fonts.mono, fontSize: 12 },
  muscles: { fontFamily: fonts.body, fontSize: 12, marginTop: 9 },
  empty: { fontFamily: fonts.body, fontSize: 13, textAlign: 'center', paddingVertical: 24 }
});
