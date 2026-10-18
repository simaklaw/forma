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
import MuscleMap from '@/components/MuscleMap';
import ExerciseVideo from '@/components/ExerciseVideo';
import { fonts, radius, spacing } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import type { TabParamList } from '@/navigation/types';
import type { CatalogItem } from './catalogBrowser';
import { inferEquipment } from './catalogBrowser';
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
import { realGifForMediaKey } from './exerciseRealMedia';
import { exercisePosterAsset } from './exercisePosterMedia';
import { verifiedMediaKeyForExercise } from './verifiedExerciseMedia';
import { techniqueCuesFromNote } from '@/lib/techniqueCues';
import { useLanguageStore } from '@/i18n/useLanguageStore';
import { useT, equipmentLabel, muscleLabel } from '@/i18n/strings';

interface Props {
  item: CatalogItem | null;
  visible: boolean;
  onClose: () => void;
  onFavoriteChange?: (favorited: boolean) => void;
}

export default function ExerciseDetailModal({ item, visible, onClose, onFavoriteChange }: Props) {
  const colors = useThemeColors();
  const t = useT();
  const lang = useLanguageStore((s) => s.lang);
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
      navigation.navigate('Тренировки');
    } finally {
      setReplacing(false);
    }
  }

  if (!item) return null;

  const equipment = inferEquipment(item);
  const loadLabel =
    item.workingWeight > 0
      ? `${item.workingWeight} ${t('kg')}`
      : t('bodyweightLabel');
  const canReplace =
    replaceTarget != null &&
    replaceTarget.mode === item.mode &&
    replaceTarget.currentExerciseId !== item.id;
  const cues = techniqueCuesFromNote(item.note);
  const verifiedMediaKey = verifiedMediaKeyForExercise(item.mediaKey, item.wgerSearchTerm);
  const videoSource =
    verifiedMediaKey && EXERCISE_VIDEOS[verifiedMediaKey]
      ? EXERCISE_VIDEOS[verifiedMediaKey]
      : undefined;
  const gifAsset = realGifForMediaKey(verifiedMediaKey);
  const posterAsset = exercisePosterAsset(item.id, item.mediaKey, item.wgerSearchTerm);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: colors.ink }]}>
        <View style={[styles.topBar, { borderBottomColor: colors.line }]}>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('close')}
            style={[styles.barBtn, { borderColor: colors.lineStrong }]}
          >
            <Text style={[styles.barBtnText, { color: colors.lime }]}>{t('close')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onToggleFavorite}
            accessibilityRole="button"
            accessibilityLabel={favorited ? t('favoriteRemove') : t('favoriteAdd')}
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
              {favorited ? t('favoriteOn') : t('favoriteOff')}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <Text style={[styles.eyebrow, { color: colors.lime }]}>
            {item.mode === 'gym' ? t('gymShort') : t('homeShort')} · {item.dayName.toUpperCase()}
          </Text>
          <Text style={[styles.title, { color: colors.paper }]}>{item.name}</Text>

          {canReplace ? (
            <TouchableOpacity
              onPress={() => void onConfirmReplace()}
              disabled={replacing}
              style={[styles.replaceCta, { backgroundColor: colors.lime }]}
              accessibilityRole="button"
              accessibilityLabel={t('panelSubstituteIntoDay')}
            >
              <Text style={[styles.replaceCtaText, { color: colors.ink }]}>
                {replacing
                  ? t('panelSaving')
                  : t('panelSubstituteFor', { name: replaceTarget!.currentName })}
              </Text>
            </TouchableOpacity>
          ) : null}

          <ExerciseVideo
            source={videoSource}
            gifAsset={gifAsset}
            posterAsset={posterAsset}
            posterUri={reference?.imageUrl}
            cues={cues}
          />

          <View style={styles.statsRow}>
            <View style={[styles.stat, { borderColor: colors.line, backgroundColor: colors.panel }]}>
              <Text style={[styles.statLabel, { color: colors.paperFaint }]}>{t('statSets')}</Text>
              <Text style={[styles.statValue, { color: colors.paper }]}>{item.totalSets}</Text>
            </View>
            <View style={[styles.stat, { borderColor: colors.line, backgroundColor: colors.panel }]}>
              <Text style={[styles.statLabel, { color: colors.paperFaint }]}>{t('statReps')}</Text>
              <Text style={[styles.statValue, { color: colors.paper }]}>{item.workingReps}</Text>
            </View>
            <View style={[styles.stat, { borderColor: colors.line, backgroundColor: colors.panel }]}>
              <Text style={[styles.statLabel, { color: colors.paperFaint }]}>{t('statRest')}</Text>
              <Text style={[styles.statValue, { color: colors.paper }]}>{item.restSeconds}{t('secShort')}</Text>
            </View>
            <View style={[styles.stat, { borderColor: colors.line, backgroundColor: colors.panel }]}>
              <Text style={[styles.statLabel, { color: colors.paperFaint }]}>{t('statLoad')}</Text>
              <Text style={[styles.statValue, { color: colors.paper }]}>{loadLabel}</Text>
            </View>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.paperFaint }]}>
            {t('importedModalMuscles')}
          </Text>
          <View style={styles.chipWrapRow}>
            <View style={[styles.metaChip, { borderColor: colors.lineStrong }]}>
              <Text style={[styles.metaChipText, { color: colors.paperDim }]}>
                {equipmentLabel(equipment, lang)}
              </Text>
            </View>
            {item.targetMuscles.map((key) => (
              <View key={key} style={[styles.metaChip, { borderColor: colors.lineStrong }]}>
                <Text style={[styles.metaChipText, { color: colors.paperDim }]}>
                  {muscleLabel(key, lang)}
                </Text>
              </View>
            ))}
          </View>

          {item.note ? (
            <View style={[styles.noteBox, { borderColor: colors.line, backgroundColor: colors.panel }]}>
              <Text style={[styles.noteLabel, { color: colors.lime }]}>{t('tip')}</Text>
              <Text style={[styles.noteBody, { color: colors.paper }]}>{item.note}</Text>
            </View>
          ) : null}

          <MuscleMap targetMuscles={item.targetMuscles} />

          <Text style={[styles.readonlyHint, { color: colors.paperFaint }]}>
            {canReplace ? t('modalReplaceNote') : t('modalOnlyView')}
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
  sectionLabel: { fontSize: 11, fontFamily: fonts.bodySemi, letterSpacing: 1 },
  chipWrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaChip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  metaChipText: { fontSize: 12, fontFamily: fonts.body },
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
