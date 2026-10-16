import React, { useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import MuscleMap, { MUSCLE_LABELS } from '@/components/MuscleMap';
import ExerciseVideo from '@/components/ExerciseVideo';
import { fonts, radius, spacing } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import type { TabParamList } from '@/navigation/types';
import type { CatalogItem } from './catalogBrowser';
import { EQUIPMENT_LABELS, inferEquipment } from './catalogBrowser';
import { useExerciseReference } from './useExerciseReference';
import { isFavorite, pushRecent, toggleFavorite } from './exerciseFavorites';
import { catalogFor } from './catalog';
import { replaceDaySlot } from './dayPlanOverrides';
import {
  clearReplaceTarget,
  getReplaceTarget,
  subscribeReplaceTarget,
  type ReplaceTarget
} from './replaceTarget';
import { EXERCISE_VIDEOS } from './exerciseMedia';
import { techniqueCuesFromNote } from '@/lib/techniqueCues';

interface Props {
  item: CatalogItem | null;
  visible: boolean;
  onClose: () => void;
  onFavoriteChange?: (favorited: boolean) => void;
}

export default function ExerciseDetailModal({ item, visible, onClose, onFavoriteChange }: Props) {
  const colors = useThemeColors();
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const reference = useExerciseReference(item?.wgerSearchTerm ?? null);
  const [favorited, setFavorited] = useState(false);
  const [replaceTarget, setReplaceTargetState] = useState<ReplaceTarget | null>(getReplaceTarget());
  const [replacing, setReplacing] = useState(false);

  useEffect(() => subscribeReplaceTarget(() => setReplaceTargetState(getReplaceTarget())), []);

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

  async function onConfirmReplace() {
    if (!item || !replaceTarget || replaceTarget.mode !== item.mode) return;
    const day = catalogFor(replaceTarget.mode).find((d) => d.id === replaceTarget.dayId);
    if (!day) return;
    setReplacing(true);
    try {
      await replaceDaySlot(
        replaceTarget.mode,
        replaceTarget.dayId,
        replaceTarget.slotIndex,
        item.id,
        day.exercises
      );
      clearReplaceTarget();
      onClose();
      navigation.navigate('Ð¢ÑÐµÐ½Ð¸ÑÐ¾Ð²ÐºÐ¸');
    } finally {
      setReplacing(false);
    }
  }

  if (!item) return null;

  const equipment = inferEquipment(item);
  const loadLabel = item.workingWeight > 0 ? `${item.workingWeight} ÐºÐ³` : 'ÑÐ²Ð¾Ð¹ Ð²ÐµÑ';
  const canReplace =
    replaceTarget != null &&
    replaceTarget.mode === item.mode &&
    replaceTarget.currentExerciseId !== item.id;
  const cues = techniqueCuesFromNote(item.note);
  const videoSource =
    item.mediaKey && EXERCISE_VIDEOS[item.mediaKey]
      ? EXERCISE_VIDEOS[item.mediaKey]
      : undefined;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: colors.ink }]}>
        <View style={[styles.topBar, { borderBottomColor: colors.line }]}>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="ÐÐ°ÐºÑÑÑÑ"
            style={[styles.barBtn, { borderColor: colors.lineStrong }]}
          >
            <Text style={[styles.barBtnText, { color: colors.lime }]}>ÐÐ°ÐºÑÑÑÑ</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onToggleFavorite}
            accessibilityRole="button"
            accessibilityLabel={favorited ? 'Ð£Ð±ÑÐ°ÑÑ Ð¸Ð· Ð¸Ð·Ð±ÑÐ°Ð½Ð½Ð¾Ð³Ð¾' : 'Ð Ð¸Ð·Ð±ÑÐ°Ð½Ð½Ð¾Ðµ'}
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
              {favorited ? 'â Ð Ð¸Ð·Ð±ÑÐ°Ð½Ð½Ð¾Ð¼' : 'â Ð Ð¸Ð·Ð±ÑÐ°Ð½Ð½Ð¾Ðµ'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <Text style={[styles.eyebrow, { color: colors.lime }]}>
            {item.mode === 'gym' ? 'ÐÐÐ' : 'ÐÐÐ'} Â· {item.dayName.toUpperCase()}
          </Text>
          <Text style={[styles.title, { color: colors.paper }]}>{item.name}</Text>

          {canReplace ? (
            <TouchableOpacity
              onPress={() => void onConfirmReplace()}
              disabled={replacing}
              style={[styles.replaceCta, { backgroundColor: colors.lime }]}
              accessibilityRole="button"
              accessibilityLabel="ÐÐ¾Ð´ÑÑÐ°Ð²Ð¸ÑÑ Ð² Ð¿Ð»Ð°Ð½ Ð´Ð½Ñ"
            >
              <Text style={[styles.replaceCtaText, { color: colors.ink }]}>
                {replacing
                  ? 'Ð¡Ð¾ÑÑÐ°Ð½ÑÐµÐ¼â¦'
                  : `ÐÐ¾Ð´ÑÑÐ°Ð²Ð¸ÑÑ Ð²Ð¼ÐµÑÑÐ¾ Â«${replaceTarget!.currentName}Â»`}
              </Text>
            </TouchableOpacity>
          ) : null}

          <ExerciseVideo source={videoSource} posterUri={reference?.imageUrl} cues={cues} />

          <View style={styles.statsRow}>
            <View style={[styles.stat, { borderColor: colors.line, backgroundColor: colors.panel }]}>
              <Text style={[styles.statLabel, { color: colors.paperFaint }]}>ÐÐ¾Ð´ÑÐ¾Ð´Ñ</Text>
              <Text style={[styles.statValue, { color: colors.paper }]}>{item.totalSets}</Text>
            </View>
            <View style={[styles.stat, { borderColor: colors.line, backgroundColor: colors.panel }]}>
              <Text style={[styles.statLabel, { color: colors.paperFaint }]}>ÐÐ¾Ð²ÑÐ¾ÑÑ</Text>
              <Text style={[styles.statValue, { color: colors.paper }]}>{item.workingReps}</Text>
            </View>
            <View style={[styles.stat, { borderColor: colors.line, backgroundColor: colors.panel }]}>
              <Text style={[styles.statLabel, { color: colors.paperFaint }]}>ÐÑÐ´ÑÑ</Text>
              <Text style={[styles.statValue, { color: colors.paper }]}>{item.restSeconds}Ñ</Text>
            </View>
            <View style={[styles.stat, { borderColor: colors.line, backgroundColor: colors.panel }]}>
              <Text style={[styles.statLabel, { color: colors.paperFaint }]}>ÐÐ°Ð³ÑÑÐ·ÐºÐ°</Text>
              <Text style={[styles.statValue, { color: colors.paper }]}>{loadLabel}</Text>
            </View>
          </View>

          <Text style={[styles.metaLine, { color: colors.paperDim }]}>
            ÐÐ±Ð¾ÑÑÐ´Ð¾Ð²Ð°Ð½Ð¸Ðµ: {EQUIPMENT_LABELS[equipment]}
          </Text>
          <Text style={[styles.metaLine, { color: colors.paperDim }]}>
            ÐÑÑÑÑ: {item.targetMuscles.map((key) => MUSCLE_LABELS[key]).join(' Â· ')}
          </Text>

          {item.note ? (
            <View style={[styles.noteBox, { borderColor: colors.line, backgroundColor: colors.panel }]}>
              <Text style={[styles.noteLabel, { color: colors.lime }]}>ÐÐ¾Ð´ÑÐºÐ°Ð·ÐºÐ°</Text>
              <Text style={[styles.noteBody, { color: colors.paper }]}>{item.note}</Text>
            </View>
          ) : null}

          <MuscleMap targetMuscles={item.targetMuscles} />

          <Text style={[styles.readonlyHint, { color: colors.paperFaint }]}>
            {canReplace
              ? 'ÐÐ°Ð¼ÐµÐ½Ð° ÑÐ¾ÑÑÐ°Ð½Ð¸ÑÑÑ ÑÐ¾Ð»ÑÐºÐ¾ Ð´Ð»Ñ ÑÑÐ¾Ð³Ð¾ Ð´Ð½Ñ Ð¿Ð»Ð°Ð½Ð° (Ð¼Ð¾Ð¶Ð½Ð¾ ÑÐ±ÑÐ¾ÑÐ¸ÑÑ Ð½Ð° ÑÐºÑÐ°Ð½Ðµ Â«Ð¢ÑÐµÐ½Ð¸ÑÐ¾Ð²ÐºÐ¸Â»).'
              : 'Ð¢Ð¾Ð»ÑÐºÐ¾ Ð¿ÑÐ¾ÑÐ¼Ð¾ÑÑ. Ð§ÑÐ¾Ð±Ñ Ð²ÑÐ¿Ð¾Ð»Ð½Ð¸ÑÑ ÑÐ¿ÑÐ°Ð¶Ð½ÐµÐ½Ð¸Ðµ, Ð·Ð°Ð¿ÑÑÑÐ¸ÑÐµ ÑÑÐµÐ½Ð¸ÑÐ¾Ð²ÐºÑ Ð²Ð¾ Ð²ÐºÐ»Ð°Ð´ÐºÐµ Â«Ð¢ÑÐµÐ½Ð¸ÑÐ¾Ð²ÐºÐ¸Â». ÐÐ¾Ð»Ð³Ð¾Ðµ Ð½Ð°Ð¶Ð°ÑÐ¸Ðµ Ð½Ð° ÑÐ¿ÑÐ°Ð¶Ð½ÐµÐ½Ð¸Ðµ Ð´Ð½Ñ Ð¾ÑÐºÑÑÐ²Ð°ÐµÑ Ð·Ð°Ð¼ÐµÐ½Ñ.'}
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
  replaceCta: {
    borderRadius: radius.pill,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center'
  },
  replaceCtaText: { fontFamily: fonts.bodySemi, fontSize: 14, textAlign: 'center' },
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
