import React, { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { fonts, radius, spacing } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { useLanguageStore } from '@/i18n/useLanguageStore';
import { levelLabel, programTemplateTitle, useT, type StringKey } from '@/i18n/strings';
import { useProgramStore } from '@/state/useProgramStore';
import type { TabParamList } from '@/navigation/types';
import { PROGRAM_LENGTHS, type ProgramLengthWeeks } from './program/programEngine';
import {
  READY_PROGRAM_LEVELS,
  READY_PROGRAMS,
  type ProgramTemplate,
  type ProgramTemplateId,
  type ReadyProgramLevel
} from './program/readyPrograms';

const GOAL_KEY = {
  strength: 'goalStrength',
  fatloss: 'goalFatloss',
  endurance: 'goalEndurance'
} as const;

const DESC_KEY: Record<ProgramTemplateId, StringKey> = {
  'strength-home': 'tplStrengthDesc',
  'fatloss-home': 'tplFatlossDesc',
  'endurance-home': 'tplEnduranceDesc'
};

const LENGTH_KEY: Record<ProgramLengthWeeks, StringKey> = {
  4: 'programWeeks4',
  6: 'programWeeks6',
  8: 'programWeeks8'
};

const DEFAULT_LEVELS: Record<ProgramTemplateId, ReadyProgramLevel> = {
  'strength-home': 'intermediate',
  'fatloss-home': 'intermediate',
  'endurance-home': 'intermediate'
};

export default function ProgramsPanel() {
  const colors = useThemeColors();
  const t = useT();
  const lang = useLanguageStore((s) => s.lang);
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const program = useProgramStore((s) => s.program);
  const startProgram = useProgramStore((s) => s.startProgram);
  const [levels, setLevels] = useState<Record<ProgramTemplateId, ReadyProgramLevel>>(
    DEFAULT_LEVELS
  );
  const [length, setLength] = useState<ProgramLengthWeeks>(4);

  function onStart(tpl: ProgramTemplate) {
    const begin = () => {
      startProgram(length, tpl.id, levels[tpl.id]);
      navigation.navigate('Тренировки');
    };
    if (!program) {
      begin();
      return;
    }
    Alert.alert(t('programsPanelReplaceTitle'), t('programsPanelReplaceBody'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('programsPanelReplaceConfirm'), style: 'destructive', onPress: begin }
    ]);
  }

  return (
    <FlatList
      data={[...READY_PROGRAMS]}
      keyExtractor={(tpl) => tpl.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const active = program?.templateId === item.id;
        const level = levels[item.id];
        return (
          <View
            style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}
          >
            <View style={styles.titleRow}>
              <View
                style={[
                  styles.goalChip,
                  { borderColor: colors.lime, backgroundColor: colors.limeDim }
                ]}
              >
                <Text style={[styles.goalChipText, { color: colors.lime }]}>
                  {t(GOAL_KEY[item.goal])}
                </Text>
              </View>
              {active ? (
                <View style={[styles.activeChip, { borderColor: colors.cyan }]}>
                  <Text style={[styles.activeChipText, { color: colors.cyan }]}>
                    {t('programsPanelActiveBadge')}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.title, { color: colors.paper }]}>
              {programTemplateTitle(item.id, lang)}
            </Text>
            <Text style={[styles.desc, { color: colors.paperDim }]}>{t(DESC_KEY[item.id])}</Text>

            <Text style={[styles.rowLabel, { color: colors.paperFaint }]}>
              {t('programsPanelLevelLabel')}
            </Text>
            <View style={styles.chipRow}>
              {READY_PROGRAM_LEVELS.map((value) => {
                const selected = level === value;
                return (
                  <TouchableOpacity
                    key={value}
                    onPress={() => setLevels((prev) => ({ ...prev, [item.id]: value }))}
                    style={[
                      styles.chip,
                      { borderColor: colors.lineStrong, backgroundColor: colors.panel },
                      selected && { borderColor: colors.lime, backgroundColor: colors.limeDim }
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={levelLabel(value, lang)}
                  >
                    <Text
                      style={[styles.chipText, { color: selected ? colors.lime : colors.paperDim }]}
                    >
                      {levelLabel(value, lang)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.chipRow}>
              {PROGRAM_LENGTHS.map((weeks) => {
                const selected = length === weeks;
                return (
                  <TouchableOpacity
                    key={weeks}
                    onPress={() => setLength(weeks)}
                    style={[
                      styles.chip,
                      { borderColor: colors.lineStrong, backgroundColor: colors.panel },
                      selected && { borderColor: colors.lime, backgroundColor: colors.limeDim }
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={t(LENGTH_KEY[weeks])}
                  >
                    <Text
                      style={[styles.chipText, { color: selected ? colors.lime : colors.paperDim }]}
                    >
                      {t(LENGTH_KEY[weeks])}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.startCta, { backgroundColor: colors.lime }]}
              onPress={() => onStart(item)}
              accessibilityRole="button"
              accessibilityLabel={t('programStartCta')}
            >
              <Text style={[styles.startCtaText, { color: colors.ink }]}>
                ▶  {t('programStartCta')}
              </Text>
            </TouchableOpacity>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.xl, paddingTop: 4, paddingBottom: 120, gap: 12 },
  card: {
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: 10
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalChip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  goalChipText: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 0.4 },
  activeChip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  activeChipText: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 0.4 },
  title: { fontFamily: fonts.mono, fontSize: 20 },
  desc: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  rowLabel: { fontSize: 11, fontFamily: fonts.bodySemi, letterSpacing: 1, marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 12 },
  startCta: {
    marginTop: 4,
    borderRadius: radius.control,
    paddingVertical: 12,
    alignItems: 'center'
  },
  startCtaText: { fontFamily: fonts.bodySemi, fontSize: 14, textAlign: 'center' }
});
