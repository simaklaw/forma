import React, { forwardRef, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import GorhomBottomSheet from '@gorhom/bottom-sheet';
import Slider from '@react-native-community/slider';
import AppBottomSheet from '@/components/BottomSheet';
import { fonts, radius, spacing, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { useLanguageStore } from '@/i18n/useLanguageStore';
import { useT } from '@/i18n/strings';
import { useFitPulseStore } from '@/state/useFitPulseStore';
import { RestTimerEngine } from '@/engines/RestTimerEngine';
import { MET_ACTIVITIES, kcalForActivity, matchesActivityQuery, type MetActivity } from './metActivities';

interface Props {
  /** Вес из профиля — на нём считается расход ккал. */
  weightKg: number;
  onClose: () => void;
}

const MIN_DURATION_MIN = 10;
const MAX_DURATION_MIN = 180;
const DURATION_STEP = 5;
const DEFAULT_DURATION_MIN = 30;
const VISIBLE_LIMIT = 40;

/**
 * Ручной лог кардио/бытовой активности из MET-каталога: поиск → выбор →
 * длительность → превью ккал → запись в бюджет дня. Силовые тренировки и
 * импорт с часов считаются отдельно (estimateWorkoutBurnKcal) и здесь
 * не дублируются.
 */
const ActivityLogSheet = forwardRef<GorhomBottomSheet, Props>(({ weightKg, onClose }, ref) => {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const t = useT();
  const lang = useLanguageStore((s) => s.lang);
  const logUserActivity = useFitPulseStore((s) => s.logUserActivity);

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<MetActivity | null>(null);
  const [durationMin, setDurationMin] = useState(DEFAULT_DURATION_MIN);

  const visible = useMemo(() => {
    const q = query.trim();
    const list = q ? MET_ACTIVITIES.filter((a) => matchesActivityQuery(a, q)) : MET_ACTIVITIES;
    return list.slice(0, VISIBLE_LIMIT);
  }, [query]);

  const activityName = (a: MetActivity) => (lang === 'en' ? a.en : a.ru);
  const previewKcal = selected ? kcalForActivity(selected.mets, weightKg, durationMin) : 0;

  function confirm() {
    if (!selected) return;
    // Имя фиксируем на момент лога: запись не зависит от текущего языка.
    logUserActivity({
      code: selected.code,
      name: activityName(selected),
      mets: selected.mets,
      durationMin,
      burnedKcal: previewKcal
    });
    RestTimerEngine.hapticTabSwitch();
    setSelected(null);
    setDurationMin(DEFAULT_DURATION_MIN);
    setQuery('');
    onClose();
  }

  return (
    <AppBottomSheet
      ref={ref}
      eyebrow={t('activityLogEyebrow')}
      title={t('activityLogTitle')}
      onClose={onClose}
      snapPoints={['70%', '92%']}
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.searchInput}
          placeholder={t('activitySearchPlaceholder')}
          placeholderTextColor={colors.paperFaint}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
        />

        {visible.map((a) => {
          const isSel = selected?.code === a.code;
          return (
            <TouchableOpacity
              key={a.code}
              style={[styles.row, isSel && styles.rowSelected]}
              onPress={() => setSelected(a)}
              accessibilityRole="button"
              accessibilityLabel={activityName(a)}
              accessibilityState={{ selected: isSel }}
            >
              <View style={styles.rowTexts}>
                <Text style={styles.rowName}>{activityName(a)}</Text>
                <Text style={styles.rowMeta}>
                  {a.mets} MET · ≈{kcalForActivity(a.mets, weightKg, DEFAULT_DURATION_MIN)}{' '}
                  {t('kcal')} / 30 {t('activityMinShort')}
                </Text>
              </View>
              <Text style={[styles.rowPick, isSel && styles.rowPickOn]}>{isSel ? '●' : '○'}</Text>
            </TouchableOpacity>
          );
        })}
        {visible.length === 0 ? <Text style={styles.empty}>{t('activityPickHint')}</Text> : null}

        <Text style={styles.label}>
          {selected
            ? t('activityDurationLabel', { min: durationMin })
            : t('activityPickHint')}
        </Text>
        <Slider
          minimumValue={MIN_DURATION_MIN}
          maximumValue={MAX_DURATION_MIN}
          step={DURATION_STEP}
          value={durationMin}
          onValueChange={setDurationMin}
          minimumTrackTintColor={colors.lime}
          maximumTrackTintColor={colors.lineStrong}
          thumbTintColor={colors.lime}
        />

        <TouchableOpacity
          style={[styles.cta, !selected && styles.ctaDisabled]}
          onPress={confirm}
          disabled={!selected}
          accessibilityRole="button"
          accessibilityLabel={t('nutritionAdd')}
        >
          <Text style={styles.ctaText}>
            {selected
              ? `${t('nutritionAdd')} · ${t('activityKcalPreview', { kcal: previewKcal })}`
              : t('nutritionAdd')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </AppBottomSheet>
  );
});

ActivityLogSheet.displayName = 'ActivityLogSheet';

export default ActivityLogSheet;

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    searchInput: {
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.lineStrong,
      color: colors.paper,
      padding: 10,
      fontSize: 13.5,
      marginBottom: 4
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: radius.control,
      borderWidth: 1,
      borderColor: 'transparent'
    },
    rowSelected: { borderColor: colors.lime, backgroundColor: colors.limeDim },
    rowTexts: { flex: 1, minWidth: 0 },
    rowName: { color: colors.paper, fontSize: 13, fontFamily: fonts.bodySemi },
    rowMeta: { marginTop: 2, color: colors.paperFaint, fontFamily: fonts.mono, fontSize: 10.5 },
    rowPick: { color: colors.paperFaint, fontSize: 14 },
    rowPickOn: { color: colors.lime },
    empty: { color: colors.paperFaint, fontSize: 12, paddingVertical: 8 },
    label: { marginTop: 10, marginBottom: 4, fontSize: 11, color: colors.paperFaint },
    cta: { marginTop: 10, marginBottom: 30, padding: 14, backgroundColor: colors.lime, alignItems: 'center' },
    ctaDisabled: { opacity: 0.4 },
    ctaText: { color: colors.ink, fontSize: 16, fontFamily: fonts.mono }
  });
}
