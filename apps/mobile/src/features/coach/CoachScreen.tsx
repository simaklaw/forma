import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CoachEngine, estimateBurnFromSetLogs, isProfileComplete, toDateKey } from '@forma/core';
import { getMobileTrainerProgress } from '@/ai/trainerProgress';
import { fonts, radius, spacing, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import ProfileGateBanner from '@/components/ProfileGateBanner';
import { mobileCoachSnapshot } from '@/lib/coachSnapshot';
import { COACH_WELCOME, selectDailyTotals, useFitPulseStore } from '@/state/useFitPulseStore';
import type { ProfileState, Sex } from '@/engines/MetabolicEngine';

const CHIPS = [
  'Сколько белка?',
  'Калории сегодня',
  'Совет на тренировку',
  'Восстановление',
  'Сон и восстановление',
  'Вода сегодня'
];

function toDomainProfile(profile: {
  sex: Sex | null;
  age: number | null;
  height: number | null;
  weight: number | null;
  pal: number;
  goal: ProfileState['goal'];
}): ProfileState | null {
  if (
    !isProfileComplete({
      weightKg: profile.weight,
      heightCm: profile.height,
      age: profile.age,
      gender: profile.sex
    })
  ) {
    return null;
  }
  return {
    sex: profile.sex as Sex,
    age: profile.age as number,
    height: profile.height as number,
    weight: profile.weight as number,
    pal: profile.pal,
    goal: profile.goal
  };
}

export default function CoachScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const profile = useFitPulseStore((s) => s.profile);
  const todayMeals = useFitPulseStore((s) => s.todayMeals);
  const setLogs = useFitPulseStore((s) => s.setLogs);
  const messages = useFitPulseStore((s) => s.coachMessages);
  const setCoachMessages = useFitPulseStore((s) => s.setCoachMessages);
  const clearCoachMessages = useFitPulseStore((s) => s.clearCoachMessages);

  const domainProfile = useMemo(() => toDomainProfile(profile), [profile]);
  const targets = useMemo(() => {
    if (!domainProfile) return null;
    return useFitPulseStore.getState().calculateTargets();
  }, [domainProfile]);

  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [llmReady, setLlmReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const listRef = useRef<FlatList<(typeof messages)[number]>>(null);

  const safeWeightKg =
    typeof profile.weight === 'number' && Number.isFinite(profile.weight) && profile.weight > 0
      ? profile.weight
      : 0;

  const mealTotals = useMemo(() => selectDailyTotals(todayMeals), [todayMeals]);

  const snapshot = useMemo(() => {
    if (!domainProfile || !targets) return null;
    return mobileCoachSnapshot({
      profile: domainProfile,
      todayMeals,
      targetCalories: targets.target,
      proteinTarget: targets.proteinTarget,
      burnedCalories: estimateBurnFromSetLogs({
        weightKg: safeWeightKg,
        setLogs,
        dateKey: toDateKey(new Date())
      })
    });
  }, [domainProfile, todayMeals, targets, safeWeightKg, setLogs]);

  useEffect(() => {
    const id = setInterval(() => {
      setLlmReady(CoachEngine.isLlmReady());
      setProgress(getMobileTrainerProgress());
    }, 500);
    return () => clearInterval(id);
  }, []);

  async function send(raw?: string) {
    const q = (raw ?? input).trim();
    if (!q || busy || !snapshot) return;
    setInput('');
    const userId = `u-${Date.now()}`;
    const coachId = `c-${Date.now()}`;
    setCoachMessages([
      ...messages,
      { id: userId, role: 'user', text: q },
      { id: coachId, role: 'coach', text: '' }
    ]);
    setBusy(true);
    try {
      let acc = '';
      await CoachEngine.getTrainer().streamAdvice(snapshot, q, (token) => {
        acc += token;
        const current = useFitPulseStore.getState().coachMessages;
        setCoachMessages(current.map((row) => (row.id === coachId ? { ...row, text: acc } : row)));
      });
    } finally {
      setBusy(false);
    }
  }

  const status = llmReady
    ? 'llama.rn · on-device'
    : progress > 0 && progress < 1
      ? `Загрузка · ${Math.round(progress * 100)}%`
      : 'Подсказки · offline';

  const proteinLine =
    targets != null
      ? `Белок ${Math.round(mealTotals.protein)} / ${targets.proteinTarget} г · ${targets.target} ккал`
      : null;

  const visible = messages.filter((m) => m.text.length > 0);
  const canClear = messages.some((m) => m.id !== 'welcome' && m.text.length > 0);

  if (!snapshot) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>FITPULSE</Text>
          <Text style={styles.title}>Тренер</Text>
          <Text style={styles.sub}>
            Без полного профиля цели КБЖУ и советы не считаются — вес по умолчанию не
            подставляется.
          </Text>
        </View>
        <ProfileGateBanner
          inset
          title="Профиль неполный"
          body="Откройте «Профиль» и сохраните пол, вес, рост и возраст. После этого здесь появятся чипы и локальный тренер."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>FITPULSE · локальные подсказки</Text>
              <Text style={styles.title}>Тренер</Text>
              <Text style={styles.sub}>{status}</Text>
              {proteinLine ? <Text style={styles.metrics}>{proteinLine}</Text> : null}
            </View>
            {canClear && (
              <Pressable
                onPress={clearCoachMessages}
                accessibilityRole="button"
                accessibilityLabel="Очистить чат"
                style={styles.clearBtn}
              >
                <Text style={styles.clear}>Очистить</Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.chips}>
          {CHIPS.map((c) => (
            <Pressable
              key={c}
              disabled={busy}
              onPress={() => void send(c)}
              style={[styles.chip, busy && styles.chipDisabled]}
            >
              <Text style={styles.chipText}>{c}</Text>
            </Pressable>
          ))}
        </View>

        <FlatList
          ref={listRef}
          data={visible.length ? visible : [{ id: 'welcome', role: 'coach' as const, text: COACH_WELCOME }]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.coachBubble]}>
              <Text style={item.role === 'user' ? styles.userBubbleText : styles.bubbleText}>{item.text}</Text>
            </View>
          )}
          ListFooterComponent={busy ? <Text style={styles.thinking}>Думаю…</Text> : null}
        />

        <View style={styles.composer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Спроси про день, белок…"
            placeholderTextColor={colors.paperFaint}
            style={styles.input}
            editable={!busy}
            onSubmitEditing={() => void send()}
            returnKeyType="send"
          />
          <Pressable
            onPress={() => void send()}
            disabled={busy || !input.trim()}
            style={[styles.send, (busy || !input.trim()) && styles.sendDisabled]}
          >
            <Text style={styles.sendText}>Ок</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  eyebrow: { color: colors.lime, fontSize: 11, fontFamily: fonts.bodySemi, letterSpacing: 1.2 },
  title: {
    color: colors.paper,
    fontSize: 30,
    fontFamily: fonts.mono,
    marginTop: 2
  },
  sub: { color: colors.paperDim, fontSize: 13, fontFamily: fonts.body, marginTop: 4, lineHeight: 18 },
  metrics: {
    color: colors.paperFaint,
    fontSize: 12,
    fontFamily: fonts.mono,
    marginTop: 6
  },
  clearBtn: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.panel
  },
  clear: { color: colors.paperDim, fontSize: 12, fontFamily: fonts.bodySemi },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    marginBottom: spacing.sm
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.panel,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  chipDisabled: { opacity: 0.5 },
  chipText: { color: colors.paperDim, fontSize: 12, fontFamily: fonts.bodySemi },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md, paddingTop: spacing.sm },
  bubble: {
    maxWidth: '88%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: spacing.sm,
    borderRadius: radius.card
  },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.lime },
  coachBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line
  },
  bubbleText: { color: colors.paper, fontSize: 14, lineHeight: 20, fontFamily: fonts.body },
  userBubbleText: { color: colors.ink, fontSize: 14, lineHeight: 20, fontFamily: fonts.body },
  thinking: {
    color: colors.paperFaint,
    fontSize: 12,
    fontFamily: fonts.body,
    marginTop: 4,
    marginLeft: 4
  },
  composer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.ink
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.control,
    backgroundColor: colors.panel,
    color: colors.paper,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: 14
  },
  send: {
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.lime,
    borderRadius: radius.control,
    paddingHorizontal: 14
  },
  sendDisabled: { opacity: 0.4 },
  sendText: { color: colors.ink, fontFamily: fonts.bodySemi, fontSize: 14 }
});
}
