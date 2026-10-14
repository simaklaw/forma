import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { fonts, radius, spacing } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { TabataEngine } from './TabataEngine';
import {
  CLASSIC_TABATA,
  FAT_BURN_TABATA,
  totalSessionSeconds,
  type TabataConfig,
  type TabataPhase,
  type TabataSnapshot
} from './tabataTypes';

const PHASE_RU: Record<TabataPhase, string> = {
  idle: 'Готов',
  prepare: 'Приготовка',
  work: 'Работа',
  rest: 'Отдых',
  done: 'Готово'
};

function formatMmSs(total: number): string {
  const s = Math.max(0, Math.floor(total));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export default function TabataPanel() {
  const colors = useThemeColors();
  const engineRef = useRef(new TabataEngine(CLASSIC_TABATA));
  const [snap, setSnap] = useState<TabataSnapshot>(() => engineRef.current.snapshot());
  const [config, setConfig] = useState<TabataConfig>(CLASSIC_TABATA);
  const [draft, setDraft] = useState({
    prepare: String(CLASSIC_TABATA.prepareSec),
    work: String(CLASSIC_TABATA.workSec),
    rest: String(CLASSIC_TABATA.restSec),
    rounds: String(CLASSIC_TABATA.rounds)
  });

  useEffect(() => engineRef.current.subscribe(setSnap), []);

  const total = useMemo(() => totalSessionSeconds(config), [config]);

  function applyPreset(preset: TabataConfig) {
    if (snap.running) return;
    setConfig(preset);
    setDraft({
      prepare: String(preset.prepareSec),
      work: String(preset.workSec),
      rest: String(preset.restSec),
      rounds: String(preset.rounds)
    });
    engineRef.current.setConfig(preset);
  }

  function applyDraft() {
    if (snap.running) return;
    const next: TabataConfig = {
      prepareSec: clampInt(draft.prepare, 0, 60),
      workSec: clampInt(draft.work, 5, 180),
      restSec: clampInt(draft.rest, 0, 120),
      rounds: clampInt(draft.rounds, 1, 30)
    };
    setConfig(next);
    engineRef.current.setConfig(next);
  }

  const phaseColor =
    snap.phase === 'work'
      ? colors.lime
      : snap.phase === 'rest'
        ? colors.paperDim
        : snap.phase === 'prepare'
          ? colors.paper
          : colors.paperFaint;

  return (
    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      <Text style={[styles.lead, { color: colors.paperDim }]}>
        Интервалы для похудения и HIIT. Классика — 20 с работа / 10 с отдых × 8. Медиа техники
        подключите позже (MP4); сейчас — чистый таймер.
      </Text>

      <View style={styles.presets}>
        <PresetChip
          label="Классика Tabata"
          active={sameConfig(config, CLASSIC_TABATA)}
          onPress={() => applyPreset(CLASSIC_TABATA)}
          colors={colors}
          disabled={snap.running}
        />
        <PresetChip
          label="Жиросжигание 30/10"
          active={sameConfig(config, FAT_BURN_TABATA)}
          onPress={() => applyPreset(FAT_BURN_TABATA)}
          colors={colors}
          disabled={snap.running}
        />
      </View>

      <View style={[styles.clockCard, { backgroundColor: colors.panel, borderColor: colors.line }]}>
        <Text style={[styles.phase, { color: phaseColor }]}>{PHASE_RU[snap.phase]}</Text>
        <Text style={[styles.clock, { color: colors.paper }]}>
          {snap.phase === 'idle' ? formatMmSs(total) : formatMmSs(snap.remainingSec)}
        </Text>
        <Text style={[styles.meta, { color: colors.paperFaint }]}>
          {snap.phase === 'idle' || snap.phase === 'done'
            ? `Сессия ~ ${formatMmSs(total)} · ${config.rounds} раундов`
            : `Раунд ${Math.max(1, snap.round)} / ${config.rounds}`}
        </Text>
      </View>

      <View style={styles.controls}>
        {!snap.running ? (
          <TouchableOpacity
            style={[styles.primary, { backgroundColor: colors.lime }]}
            onPress={() => engineRef.current.start()}
            accessibilityRole="button"
          >
            <Text style={[styles.primaryText, { color: colors.ink }]}>
              {snap.phase === 'idle' || snap.phase === 'done' ? 'Старт' : 'Продолжить'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.primary,
              { backgroundColor: colors.panel, borderColor: colors.line, borderWidth: 1 }
            ]}
            onPress={() => engineRef.current.pause()}
            accessibilityRole="button"
          >
            <Text style={[styles.primaryText, { color: colors.paper }]}>Пауза</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.secondary, { borderColor: colors.lineStrong }]}
          onPress={() => engineRef.current.reset()}
          accessibilityRole="button"
        >
          <Text style={[styles.secondaryText, { color: colors.paperDim }]}>Сброс</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.section, { color: colors.paperFaint }]}>Настройки (сек)</Text>
      <View style={styles.fields}>
        {(
          [
            ['prepare', 'Приготовка'],
            ['work', 'Работа'],
            ['rest', 'Отдых'],
            ['rounds', 'Раунды']
          ] as const
        ).map(([key, label]) => (
          <View key={key} style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.paperFaint }]}>{label}</Text>
            <TextInput
              value={draft[key]}
              onChangeText={(t) => setDraft((d) => ({ ...d, [key]: t.replace(/[^0-9]/g, '') }))}
              onBlur={applyDraft}
              editable={!snap.running}
              keyboardType="number-pad"
              style={[
                styles.input,
                {
                  color: colors.paper,
                  borderColor: colors.lineStrong,
                  backgroundColor: colors.panel,
                  opacity: snap.running ? 0.5 : 1
                }
              ]}
              accessibilityLabel={label}
            />
          </View>
        ))}
      </View>

      <Text style={[styles.footnote, { color: colors.paperFaint }]}>
        Логика как у open-source HIIT-таймеров (OpenHIIT, MIT): wall-clock интервалы, haptic на смене
        фазы. Видео для Табаты — отдельный манифест MP4, не GIF библиотеки.
      </Text>
    </ScrollView>
  );
}

function sameConfig(a: TabataConfig, b: TabataConfig): boolean {
  return (
    a.prepareSec === b.prepareSec &&
    a.workSec === b.workSec &&
    a.restSec === b.restSec &&
    a.rounds === b.rounds
  );
}

function clampInt(raw: string, min: number, max: number): number {
  const n = parseInt(raw || '0', 10);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function PresetChip({
  label,
  active,
  onPress,
  colors,
  disabled
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useThemeColors>;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.chip,
        { borderColor: colors.lineStrong, backgroundColor: colors.panel },
        active && { borderColor: colors.lime, backgroundColor: colors.limeDim },
        disabled && { opacity: 0.5 }
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
    >
      <Text style={[styles.chipText, { color: active ? colors.lime : colors.paperDim }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.xl, paddingBottom: 120, gap: 12 },
  lead: { fontSize: 13, lineHeight: 18, fontFamily: fonts.body, marginTop: spacing.sm },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.control,
    borderWidth: 1
  },
  chipText: { fontSize: 13, fontFamily: fonts.bodySemi },
  clockCard: {
    borderWidth: 1,
    borderRadius: radius.card,
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8
  },
  phase: { fontSize: 16, fontFamily: fonts.bodySemi, letterSpacing: 0.5 },
  clock: { fontSize: 64, fontFamily: fonts.mono, fontVariant: ['tabular-nums'] },
  meta: { fontSize: 13, fontFamily: fonts.body },
  controls: { flexDirection: 'row', gap: 10 },
  primary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.control,
    alignItems: 'center'
  },
  primaryText: { fontFamily: fonts.bodySemi, fontSize: 16 },
  secondary: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: radius.control,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  secondaryText: { fontFamily: fonts.bodySemi, fontSize: 15 },
  section: { marginTop: 8, fontSize: 12, fontFamily: fonts.bodySemi },
  fields: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  field: { width: '47%', gap: 4 },
  fieldLabel: { fontSize: 11, fontFamily: fonts.mono },
  input: {
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: fonts.mono
  },
  footnote: { fontSize: 11, lineHeight: 16, fontFamily: fonts.body, marginTop: 8 }
});
