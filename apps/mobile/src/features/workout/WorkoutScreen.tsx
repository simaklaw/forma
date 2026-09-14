import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GorhomBottomSheet from '@gorhom/bottom-sheet';
import { colors, fonts, spacing } from '@/core/theme/tokens';
import ExerciseSheet, { ExerciseDef } from './ExerciseSheet';
import { WorkoutCoachCard } from './WorkoutCoachCard';
import { useFitPulseStore } from '@/state/useFitPulseStore';
import { DayProgress, lastNDays, ruDayWord, toDateKey } from '@/engines/WorkoutStats';

interface WorkoutDay {
  id: string;
  name: string;
  meta: string;
  exercises: ExerciseDef[];
}

const WORKOUT_PLAN: WorkoutDay[] = [
  {
    id: 'push',
    name: 'Жим — грудь, плечи, трицепс',
    meta: '≈50 мин',
    exercises: [
      {
        id: 4,
        index: 1,
        name: 'Жим штанги лёжа',
        workingWeight: 60,
        workingReps: 6,
        totalSets: 4,
        restSeconds: 120,
        targetMuscles: ['chest', 'shoulders', 'triceps'],
        note: 'Базовый жим для верха тела — лопатки сведены и прижаты к скамье весь подход, гриф идёт к нижней трети груди, а не к шее.',
        wgerSearchTerm: 'Bench Press'
      },
      {
        id: 5,
        index: 2,
        name: 'Жим гантелей сидя',
        workingWeight: 18,
        workingReps: 10,
        totalSets: 3,
        restSeconds: 90,
        targetMuscles: ['shoulders', 'triceps'],
        note: 'Изоляция передней и средней дельты после тяжёлого жима — амплитуда полная, без раскачки корпусом.',
        wgerSearchTerm: 'Dumbbell Shoulder Press'
      },
      {
        id: 6,
        index: 3,
        name: 'Разгибания на трицепс на блоке',
        workingWeight: 25,
        workingReps: 12,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['triceps'],
        note: 'Завершающая изоляция — локти прижаты к корпусу весь подход, работает только предплечье.',
        wgerSearchTerm: 'Triceps Pushdown'
      }
    ]
  },
  {
    id: 'pull',
    name: 'Тяга — спина, задняя дельта, бицепс',
    meta: '≈50 мин',
    exercises: [
      {
        id: 7,
        index: 1,
        name: 'Тяга штанги в наклоне',
        workingWeight: 60,
        workingReps: 8,
        totalSets: 4,
        restSeconds: 120,
        targetMuscles: ['back', 'lowerback', 'biceps'],
        note: 'Корпус фиксирован под 45°, спина нейтральная весь подход — тянем локтями к тазу, не руками к груди.',
        wgerSearchTerm: 'Bent Over Row'
      },
      {
        id: 8,
        index: 2,
        name: 'Тяга верхнего блока',
        workingWeight: 50,
        workingReps: 10,
        totalSets: 3,
        restSeconds: 90,
        targetMuscles: ['back', 'biceps'],
        note: 'Широчайшие в приоритете — тянем локтями вниз-назад, не грудью вверх навстречу рукояти.',
        wgerSearchTerm: 'Lat Pulldown'
      },
      {
        id: 9,
        index: 3,
        name: 'Сгибания на бицепс со штангой',
        workingWeight: 30,
        workingReps: 10,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['biceps'],
        note: 'Локти неподвижны у корпуса — амплитуда за счёт предплечья, не за счёт раскачки плечом.',
        wgerSearchTerm: 'Barbell Curl'
      }
    ]
  },
  {
    id: 'legs',
    name: 'Ноги — сила',
    meta: '≈45 мин',
    exercises: [
      {
        id: 1,
        index: 1,
        name: 'Приседания со штангой',
        workingWeight: 80,
        workingReps: 8,
        totalSets: 4,
        restSeconds: 90,
        targetMuscles: ['quads', 'glutes', 'core'],
        note: 'Почему RIR 1–3: высокопороговые волокна рекрутируются только у отказа (принцип Хеннемана) — так работает механическое напряжение на гипертрофию.',
        wgerSearchTerm: 'Barbell Squat'
      },
      {
        id: 2,
        index: 2,
        name: 'Становая тяга',
        workingWeight: 100,
        workingReps: 5,
        totalSets: 3,
        restSeconds: 120,
        targetMuscles: ['hamstrings', 'glutes', 'back', 'core'],
        note: 'Тяжёлый базовый подход низкой повторности — держите нейтральную спину и не гонитесь за амплитудой в ущерб технике на последних повторах.',
        wgerSearchTerm: 'Deadlift'
      },
      {
        id: 3,
        index: 3,
        name: 'Выпады с гантелями',
        workingWeight: 14,
        workingReps: 12,
        totalSets: 3,
        restSeconds: 60,
        targetMuscles: ['quads', 'glutes', 'hamstrings'],
        note: 'Завершающее упражнение на объём: короткий отдых держит метаболический стресс высоким, вес — умеренный, фокус на контролируемом негативе.',
        wgerSearchTerm: 'Dumbbell Lunge'
      }
    ]
  }
];

const WEEKDAY_RU_FULL = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

function isDayPlanComplete(dayProgress: DayProgress, dateKey: string, exercises: { id: number; totalSets: number }[]): boolean {
  const progress = dayProgress[dateKey];
  if (!progress) return false;
  return exercises.every((ex) => (progress[ex.id] ?? 0) >= ex.totalSets);
}

function isAnyPlanComplete(dayProgress: DayProgress, dateKey: string): boolean {
  return WORKOUT_PLAN.some((day) => isDayPlanComplete(dayProgress, dateKey, day.exercises));
}

function selectPlanWeekDaysCompleted(dayProgress: DayProgress, days = 7, now: Date = new Date()): number {
  return lastNDays(days, now).filter((d) => isAnyPlanComplete(dayProgress, toDateKey(d))).length;
}

function selectPlanCurrentStreak(dayProgress: DayProgress, now: Date = new Date()): number {
  const cursor = new Date(now);
  if (!isAnyPlanComplete(dayProgress, toDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (isAnyPlanComplete(dayProgress, toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

type DayStatus = 'done' | 'today-in-progress' | 'missed';

function selectPlanStreakDays(dayProgress: DayProgress, days = 7, now: Date = new Date()): DayStatus[] {
  const window = lastNDays(days, now);
  const todayKey = toDateKey(now);
  return window.map((d) => {
    const key = toDateKey(d);
    if (isAnyPlanComplete(dayProgress, key)) return 'done';
    return key === todayKey ? 'today-in-progress' : 'missed';
  });
}

export default function WorkoutScreen() {
  const sheetRef = useRef<GorhomBottomSheet>(null);
  const [selectedDayId, setSelectedDayId] = useState('legs');
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);

  const dayProgress = useFitPulseStore((s) => s.dayProgress);
  const completedSetsToday = useFitPulseStore((s) => s.completedSetsToday);
  const personalRecords = useFitPulseStore((s) => s.personalRecords);

  const activeDay = WORKOUT_PLAN.find((d) => d.id === selectedDayId) ?? WORKOUT_PLAN[0];
  const selectedExercise = activeDay.exercises.find((e) => e.id === selectedExerciseId) ?? null;
  const todayLabel = WEEKDAY_RU_FULL[new Date().getDay()];

  const todayDoneCount = activeDay.exercises.filter((ex) => completedSetsToday(ex.id) >= ex.totalSets).length;
  const anyDoneToday = useMemo(
    () => isAnyPlanComplete(dayProgress, toDateKey(new Date())),
    [dayProgress]
  );
  const weekDaysCompleted = useMemo(() => selectPlanWeekDaysCompleted(dayProgress), [dayProgress]);
  const overallPr = useMemo(() => {
    const values = Object.values(personalRecords);
    return values.length ? Math.max(...values) : null;
  }, [personalRecords]);
  const currentStreak = useMemo(() => selectPlanCurrentStreak(dayProgress), [dayProgress]);
  const streakDays = useMemo(() => selectPlanStreakDays(dayProgress), [dayProgress]);

  function openExercise(id: number) {
    setSelectedExerciseId(id);
    sheetRef.current?.expand();
  }

  function selectDay(id: string) {
    setSelectedDayId(id);
    setSelectedExerciseId(null);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{todayLabel}, тренировочный день</Text>
        <Text style={styles.title}>Тренировка</Text>
      </View>

      <View style={styles.dayTabs} accessibilityRole="tablist">
        {WORKOUT_PLAN.map((day) => {
          const active = day.id === activeDay.id;
          return (
            <TouchableOpacity
              key={day.id}
              style={[styles.dayTab, active && styles.dayTabActive]}
              onPress={() => selectDay(day.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.dayTabText, active && styles.dayTabTextActive]}>{day.name.split(' — ')[0]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.ticket}>
          <View style={styles.ticketMain}>
            <View>
              <Text style={styles.ticketLabel}>План дня</Text>
              <Text style={styles.ticketName}>{activeDay.name}</Text>
              <Text style={styles.ticketMeta}>
                {activeDay.exercises.length} упражнения · {activeDay.meta}
              </Text>
            </View>
            <TouchableOpacity style={styles.startBtn} accessibilityRole="button" accessibilityLabel="Начать тренировку">
              <Text style={styles.startBtnText}>▶</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.ticketPerf}>
            <View style={styles.perfCell}>
              <Text style={styles.perfVal}>{weekDaysCompleted}/7</Text>
              <Text style={styles.perfLbl}>Дней выполнено на неделе</Text>
            </View>
            <View style={[styles.perfCell, { borderRightWidth: 0 }]}>
              <Text style={styles.perfVal}>{overallPr !== null ? `${overallPr} кг` : '—'}</Text>
              <Text style={styles.perfLbl}>Личный рекорд</Text>
            </View>
          </View>
        </View>

        <View style={styles.streakRow}>
          <Text style={{ fontSize: 20 }}>🔥</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.streakText}>
              {currentStreak > 0 ? (
                <>
                  <Text style={{ color: colors.ember, fontFamily: fonts.bodySemi }}>
                    {currentStreak} {ruDayWord(currentStreak)}
                  </Text>{' '}
                  подряд без пропуска
                </>
              ) : (
                'Пока нет серии — выполните любой день плана полностью, чтобы начать'
              )}
            </Text>
            <View style={styles.ticks}>
              {streakDays.map((status, i) => (
                <View
                  key={i}
                  style={[styles.tick, status === 'done' ? styles.tickDone : status === 'today-in-progress' ? styles.tickToday : styles.tickMissed]}
                />
              ))}
            </View>
          </View>
        </View>

        <WorkoutCoachCard dayName={activeDay.name} anyDoneToday={anyDoneToday} />

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Упражнения дня</Text>
          <Text style={styles.sectionCount}>
            {todayDoneCount}/{activeDay.exercises.length} готово
          </Text>
        </View>

        {activeDay.exercises.map((ex, i) => {
          const done = completedSetsToday(ex.id) >= ex.totalSets;
          const inProgress = !done && completedSetsToday(ex.id) > 0;
          const exPr = personalRecords[ex.id] ?? null;
          return (
            <TouchableOpacity
              key={ex.id}
              style={styles.logRow}
              accessibilityRole="button"
              accessibilityLabel={ex.name}
              onPress={() => openExercise(ex.id)}
            >
              <Text style={styles.logIndex}>{String(i + 1).padStart(2, '0')}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.logName}>{ex.name}</Text>
                <Text style={styles.logSpec}>
                  {ex.totalSets}×{ex.workingReps} · {ex.workingWeight} кг · отдых {ex.restSeconds}с
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.logPr}>{exPr !== null ? exPr : '—'}</Text>
                <Text style={styles.logPrLbl}>
                  {done ? 'готово ✓' : inProgress ? 'в процессе' : exPr !== null ? 'рекорд, кг' : 'пока нет данных'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ExerciseSheet ref={sheetRef} exercise={selectedExercise} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  header: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.lg, borderBottomWidth: 1, borderColor: colors.line },
  eyebrow: { color: colors.paperFaint, fontSize: 11, fontFamily: fonts.body },
  title: { color: colors.paper, fontSize: 30, fontFamily: fonts.mono },
  dayTabs: { flexDirection: 'row', marginHorizontal: spacing.xxl, marginTop: spacing.md, gap: 8 },
  dayTab: { flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: colors.lineStrong, alignItems: 'center' },
  dayTabActive: { borderColor: colors.lime, backgroundColor: colors.limeDim },
  dayTabText: { color: colors.paperDim, fontSize: 12.5, fontFamily: fonts.bodySemi },
  dayTabTextActive: { color: colors.lime },
  body: { paddingBottom: 120 },
  ticket: { margin: spacing.xxl, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.panel },
  ticketMain: { flexDirection: 'row', justifyContent: 'space-between', padding: 18 },
  ticketLabel: { color: colors.paperFaint, fontSize: 11, marginBottom: 6 },
  ticketName: { color: colors.paper, fontSize: 24, fontFamily: fonts.mono },
  ticketMeta: { color: colors.paperDim, fontSize: 12.5, marginTop: 6, fontFamily: fonts.body },
  startBtn: { width: 46, height: 46, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  startBtnText: { color: colors.ink, fontSize: 16 },
  ticketPerf: { flexDirection: 'row', borderTopWidth: 1, borderColor: colors.lineStrong, borderStyle: 'dashed' },
  perfCell: { flex: 1, padding: 14, borderRightWidth: 1, borderColor: colors.lineStrong, borderStyle: 'dashed' },
  perfVal: { color: colors.paper, fontSize: 20, fontFamily: fonts.mono },
  perfLbl: { color: colors.paperFaint, fontSize: 10.5, marginTop: 1 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: spacing.xxl, paddingVertical: 12 },
  streakText: { color: colors.paper, fontSize: 13, fontFamily: fonts.body },
  ticks: { flexDirection: 'row', gap: 4, marginTop: 8 },
  tick: { width: 22, height: 4 },
  tickDone: { backgroundColor: colors.ember },
  tickToday: { borderWidth: 1, borderColor: colors.ember },
  tickMissed: { backgroundColor: colors.lineStrong },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: spacing.xxl,
    marginTop: spacing.lg,
    marginBottom: 10
  },
  sectionTitle: { color: colors.paperDim, fontSize: 13, fontFamily: fonts.bodySemi },
  sectionCount: { color: colors.paperFaint, fontFamily: fonts.mono, fontSize: 13 },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: spacing.xxl,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: colors.line
  },
  logIndex: { color: colors.paperFaint, fontFamily: fonts.mono, fontSize: 15, width: 20 },
  logName: { color: colors.paper, fontSize: 15, fontFamily: fonts.bodySemi },
  logSpec: { color: colors.paperFaint, fontSize: 12, marginTop: 2, fontFamily: fonts.body },
  logPr: { color: colors.paper, fontSize: 17, fontFamily: fonts.mono },
  logPrLbl: { color: colors.paperFaint, fontSize: 9.5 }
});
