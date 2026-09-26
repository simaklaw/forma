import React, { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import MuscleMap, { MUSCLE_LABELS } from '@/components/MuscleMap';
import ExerciseVideo from '@/components/ExerciseVideo';
import { fonts, radius, spacing } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import type { CatalogItem } from './catalogBrowser';
import { EQUIPMENT_LABELS, inferEquipment } from './catalogBrowser';
import { useExerciseReference } from './useExerciseReference';
import { isFavorite, pushRecent, toggleFavorite } from './exerciseFavorites';

interface Props {
  item: CatalogItem | null;
  visible: boolean;
  onClose: () => void;
  onFavoriteChange?: (favorited: boolean) => void;
}

export default function ExerciseDetailModal({ item, visible, onClose, onFavoriteChange }: Props) {
  const colors = useThemeColors();
  const reference = useExerciseReference(item?.wgerSearchTerm ?? null);
  const [favorited, setFavorited] = useState(false);

  useEffect(() => {
    if (!item || !visible) return;
    let cancelled = false;
    (async () => {
      await pushRecent(item.mode, item.id);
      const next = await isFavorite(item.mode, item.id);
      if (!cancelled) setFavorited(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [item, visible]);

  async function onToggleFavorite() {
    if (!item) return;
    const next = await toggleFavorite(item.mode, item.id);
    setFavorited(next);
    onFavoriteChange?.(next);
  }

  if (!item) return null;

  const equipment = inferEquipment(item);
  const loadLabel = item.workingWeight > 0 ? `${item.workingWeight} кг` : 'свой вес';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: colors.ink }]}>
        <View style={[styles.topBar, { borderBottomColor: colors.line }]}>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Закрыть"
            style={[styles.barBtn, { borderColor: colors.lineStrong }]}
          >
            <Text style={[styles.barBtnText, { color: colors.paper }]}>Закрыть</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onToggleFavorite}
            accessibilityRole="button"
            accessibilityLabel={favorited ? 'Убрать из избранного' : 'В избранное'}
            accessibilityState={{ selected: favorited }}
            style={[
              styles.barBtn,
              {
                borderColor: favorited ? colors.lime : colors.lineStrong,
                backgroundColor: favorited ? colors.limeDim : 'transparent'
              }
            ]}
          >
            <Text style={[styles.barBtnText, { color: favorited ? colors.lime : colors.paperDim }]}>
              {favorited ? '★ В избранном' : '☆ В избранное'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <Text style={[styles.eyebrow, { color: colors.lime }]}>
            {item.mode === 'gym' ? 'ЗАЛ' : 'ДОМ'} · {item.dayName.toUpperCase()}
          </Text>
          <Text style={[styles.title, { color: colors.paper }]}>{item.name}</Text>

          {reference?.imageUrl ? (
            <Image
              source={{ uri: reference.imageUrl }}
              style={[styles.photo, { borderColor: colors.lineStrong, backgroundColor: colors.panel }]}
              resizeMode="cover"
              accessibilityLabel="Справочное фото упражнения"
            />
          ) : null}

          <ExerciseVideo label="ТЕХНИКА (ПЛЕЙСХОЛДЕР)" />

          <View style={styles.statsRow}>
            <View style={[styles.stat, { borderColor: colors.line, backgroundColor: colors.panel }]}>
              <Text style={[styles.statLabel, { color: colors.paperFaint }]}>Подходы</Text>
              <Text style={[styles.statValue, { color: colors.paper }]}>{item.totalSets}</Text>
            </View>
            <View style={[styles.stat, { borderColor: colors.line, backgroundColor: colors.panel }]}>
              <Text style={[styles.statLabel, { color: colors.paperFaint }]}>Повторы</Text>
              <Text style={[styles.statValue, { color: colors.paper }]}>{item.workingReps}</Text>
            </View>
            <View style={[styles.stat, { borderColor: colors.line, backgroundColor: colors.panel }]}>
              <Text style={[styles.statLabel, { color: colors.paperFaint }]}>Отдых</Text>
              <Text style={[styles.statValue, { color: colors.paper }]}>{item.restSeconds}с</Text>
            </View>
            <View style={[styles.stat, { borderColor: colors.line, backgroundColor: colors.panel }]}>
              <Text style={[styles.statLabel, { color: colors.paperFaint }]}>Нагрузка</Text>
              <Text style={[styles.statValue, { color: colors.paper }]}>{loadLabel}</Text>
            </View>
          </View>

          <Text style={[styles.metaLine, { color: colors.paperDim }]}>
            Оборудование: {EQUIPMENT_LABELS[equipment]}
          </Text>
          <Text style={[styles.metaLine, { color: colors.paperDim }]}>
            Мышцы: {item.targetMuscles.map((key) => MUSCLE_LABELS[key]).join(' · ')}
          </Text>

          {item.note ? (
            <View style={[styles.noteBox, { borderColor: colors.line, backgroundColor: colors.panel }]}>
              <Text style={[styles.noteLabel, { color: colors.lime }]}>Подсказка</Text>
              <Text style={[styles.noteBody, { color: colors.paper }]}>{item.note}</Text>
            </View>
          ) : null}

          <MuscleMap targetMuscles={item.targetMuscles} />

          <Text style={[styles.readonlyHint, { color: colors.paperFaint }]}>
            Только просмотр. Чтобы выполнить упражнение, запустите тренировку во вкладке «Тренировки».
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    gap: 8
  },
  barBtn: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  barBtnText: { fontFamily: fonts.bodySemi, fontSize: 13 },
  body: { padding: spacing.lg, paddingBottom: 48, gap: 12 },
  eyebrow: { fontSize: 11, fontFamily: fonts.bodySemi, letterSpacing: 1 },
  title: { fontSize: 26, fontFamily: fonts.mono, marginBottom: 4 },
  photo: {
    width: '100%',
    height: 180,
    borderWidth: 1,
    borderRadius: radius.card
  },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: {
    borderWidth: 1,
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: '45%',
    flexGrow: 1
  },
  statLabel: { fontSize: 11, fontFamily: fonts.body },
  statValue: { fontSize: 18, fontFamily: fonts.mono, marginTop: 2 },
  metaLine: { fontSize: 13, fontFamily: fonts.body },
  noteBox: {
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: 6
  },
  noteLabel: { fontSize: 11, fontFamily: fonts.bodySemi, letterSpacing: 1 },
  noteBody: { fontSize: 14, fontFamily: fonts.body, lineHeight: 20 },
  readonlyHint: {
    fontSize: 12,
    fontFamily: fonts.body,
    textAlign: 'center',
    marginTop: spacing.md
  }
});
