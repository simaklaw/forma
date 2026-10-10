import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { fonts, radius, spacing } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import {
  IMPORTED_EXERCISE_LIBRARY,
  type ImportedExercise
} from './importedExerciseLibrary.generated';
import { IMPORTED_EXERCISE_IMAGES } from './importedExerciseImages.generated';
import { filterImportedLibrary } from './importedLibraryFilter';

const CATEGORY_LABELS: Record<ImportedExercise['category'], string> = {
  chest: 'Грудь',
  back: 'Спина',
  legs: 'Ноги',
  abs: 'Кор',
  arms: 'Руки',
  glutes: 'Ягодицы'
};

function displayName(ex: ImportedExercise): string {
  return ex.nameRu ?? ex.nameEn;
}

export default function ImportedLibraryPanel() {
  const colors = useThemeColors();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ImportedExercise['category'] | null>(null);
  const [selected, setSelected] = useState<ImportedExercise | null>(null);

  const filtered = useMemo(
    () => filterImportedLibrary(IMPORTED_EXERCISE_LIBRARY, query, category),
    [query, category]
  );

  const categories = useMemo(
    () =>
      (Object.keys(CATEGORY_LABELS) as ImportedExercise['category'][]).filter((key) =>
        IMPORTED_EXERCISE_LIBRARY.some((ex) => ex.category === key)
      ),
    []
  );

  return (
    <View style={styles.flex}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Поиск в справочнике (EN / RU)"
        placeholderTextColor={colors.paperFaint}
        style={[
          styles.search,
          { backgroundColor: colors.panel, borderColor: colors.lineStrong, color: colors.paper }
        ]}
        accessibilityLabel="Поиск в справочнике упражнений"
        returnKeyType="search"
      />
      <FlatList
        data={categories}
        horizontal
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        renderItem={({ item }) => {
          const active = category === item;
          return (
            <TouchableOpacity
              onPress={() => setCategory(active ? null : item)}
              style={[
                styles.chip,
                { borderColor: colors.lineStrong, backgroundColor: colors.panel },
                active && { borderColor: colors.lime, backgroundColor: colors.limeDim }
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, { color: active ? colors.lime : colors.paperDim }]}>
                {CATEGORY_LABELS[item]}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
      <Text style={[styles.count, { color: colors.paperFaint }]}>
        {filtered.length} из {IMPORTED_EXERCISE_LIBRARY.length} · bodyweight / резинки · Unlicense
      </Text>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const thumbKey = item.imageKeys[0];
          const src = thumbKey ? IMPORTED_EXERCISE_IMAGES[thumbKey] : undefined;
          return (
            <TouchableOpacity
              style={[styles.row, { borderColor: colors.line, backgroundColor: colors.panel }]}
              onPress={() => setSelected(item)}
              accessibilityRole="button"
              accessibilityLabel={displayName(item)}
            >
              {src ? (
                <Image source={src} style={styles.thumb} resizeMode="cover" />
              ) : (
                <View style={[styles.thumb, { backgroundColor: colors.ink }]} />
              )}
              <View style={styles.rowBody}>
                <View style={styles.titleRow}>
                  <Text style={[styles.name, { color: colors.paper }]} numberOfLines={2}>
                    {displayName(item)}
                  </Text>
                  {!item.nameRu ? (
                    <View style={[styles.enBadge, { borderColor: colors.lineStrong }]}>
                      <Text style={[styles.enBadgeText, { color: colors.paperFaint }]}>EN</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.meta, { color: colors.paperFaint }]}>
                  {CATEGORY_LABELS[item.category]} ·{' '}
                  {item.equipment === 'bands' ? 'резинки' : 'свой вес'}
                  {item.level ? ` · ${item.level}` : ''}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <Modal
        visible={selected != null}
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        {selected ? (
          <View style={[styles.modalRoot, { backgroundColor: colors.ink }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelected(null)} accessibilityRole="button">
                <Text style={[styles.close, { color: colors.lime }]}>Закрыть</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              {selected.imageKeys.map((imageKey) => {
                const source = IMPORTED_EXERCISE_IMAGES[imageKey];
                return source ? (
                  <Image key={imageKey} source={source} style={styles.hero} resizeMode="contain" />
                ) : null;
              })}
              <View style={styles.titleRow}>
                <Text style={[styles.modalTitle, { color: colors.paper }]}>
                  {displayName(selected)}
                </Text>
                {!selected.nameRu ? (
                  <View style={[styles.enBadge, { borderColor: colors.lineStrong }]}>
                    <Text style={[styles.enBadgeText, { color: colors.paperFaint }]}>EN</Text>
                  </View>
                ) : null}
              </View>
              {selected.nameRu ? (
                <Text style={[styles.meta, { color: colors.paperFaint }]}>{selected.nameEn}</Text>
              ) : null}
              <Text style={[styles.meta, { color: colors.paperDim, marginTop: 6 }]}>
                {CATEGORY_LABELS[selected.category]} ·{' '}
                {selected.equipment === 'bands' ? 'резинки' : 'свой вес'} · источник Unlicense
              </Text>

              {selected.instructionsEn.length > 0 ? (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: colors.paperFaint }]}>
                    Техника (на английском, перевод скоро)
                  </Text>
                  {selected.instructionsEn.map((line, i) => (
                    <Text key={i} style={[styles.instruction, { color: colors.paperDim }]}>
                      {i + 1}. {line}
                    </Text>
                  ))}
                </View>
              ) : null}
            </ScrollView>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  search: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.body,
    fontSize: 14
  },
  chips: { paddingHorizontal: spacing.xl, paddingVertical: 10, gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.control,
    borderWidth: 1,
    marginRight: 8
  },
  chipText: { fontSize: 13, fontFamily: fonts.bodySemi },
  count: {
    marginHorizontal: spacing.xl,
    marginBottom: 8,
    fontSize: 11,
    fontFamily: fonts.mono
  },
  list: { paddingHorizontal: spacing.xl, paddingBottom: 120, gap: 8 },
  row: {
    flexDirection: 'row',
    gap: 12,
    padding: 10,
    borderRadius: radius.card,
    borderWidth: 1,
    marginBottom: 8
  },
  thumb: { width: 64, height: 64, borderRadius: radius.control },
  rowBody: { flex: 1, justifyContent: 'center', gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 15, fontFamily: fonts.bodySemi },
  meta: { fontSize: 12, fontFamily: fonts.body },
  enBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  enBadgeText: { fontSize: 10, fontFamily: fonts.mono },
  modalRoot: { flex: 1 },
  modalHeader: {
    paddingTop: 56,
    paddingHorizontal: spacing.xl,
    paddingBottom: 8
  },
  close: { fontFamily: fonts.bodySemi, fontSize: 15 },
  modalBody: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  hero: { width: '100%', height: 220, marginBottom: 12 },
  modalTitle: { flex: 1, fontSize: 22, fontFamily: fonts.mono },
  section: { marginTop: spacing.lg, gap: 8 },
  sectionLabel: { fontSize: 12, fontFamily: fonts.bodySemi, letterSpacing: 0.3 },
  instruction: { fontSize: 14, lineHeight: 20, fontFamily: fonts.body }
});
