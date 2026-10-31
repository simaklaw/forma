import React, { useEffect } from 'react';
import { Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { fonts, radius, spacing } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { useT, type StringKey } from '@/i18n/strings';
import {
  parseReminderTime,
  useWorkoutRemindersStore
} from '@/state/useWorkoutRemindersStore';
import {
  applyWorkoutReminders,
  cancelWorkoutReminders,
  requestRemindersPermission
} from '@/engines/workoutReminders';

// Иначе уведомление молчит, когда приложение открыто на переднем плане.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    // SDK 53: NotificationBehavior также требует баннер и список уведомлений
    // (Android 15+/16 показывают уведомления как banner и/или в списке).
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
});

const DAY_KEYS: StringKey[] = [
  'reminderDay0',
  'reminderDay1',
  'reminderDay2',
  'reminderDay3',
  'reminderDay4',
  'reminderDay5',
  'reminderDay6'
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Карточка «Напоминания о тренировке» в профиле (P1 из разбора студии):
 * локальные еженедельные уведомления в выбранные дни и время.
 */
export function WorkoutRemindersPanel() {
  const colors = useThemeColors();
  const t = useT();
  const enabled = useWorkoutRemindersStore((s) => s.enabled);
  const days = useWorkoutRemindersStore((s) => s.days);
  const time = useWorkoutRemindersStore((s) => s.time);
  const setEnabled = useWorkoutRemindersStore((s) => s.setRemindersEnabled);
  const setDays = useWorkoutRemindersStore((s) => s.setReminderDays);
  const setTime = useWorkoutRemindersStore((s) => s.setReminderTime);

  const { hh, mm } = parseReminderTime(time);

  // Перепланируем уведомления при любом изменении настроек (идемпотентно).
  useEffect(() => {
    if (!enabled) {
      void cancelWorkoutReminders();
      return;
    }
    void applyWorkoutReminders(
      { enabled, days, time },
      { title: t('reminderNotifTitle'), body: t('reminderNotifBody') }
    );
    // t меняется только со сменой языка — перепланирование при смене дня достаточно
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, days, time]);

  const handleToggle = (on: boolean) => {
    if (!on) {
      setEnabled(false);
      return;
    }
    void requestRemindersPermission().then((granted) => {
      if (granted) {
        setEnabled(true);
      } else {
        Alert.alert(t('remindersPermissionDeniedTitle'), t('remindersPermissionDenied'), [
          { text: t('remindersOk') }
        ]);
      }
    });
  };

  const toggleDay = (day: number) => {
    setDays(days.includes(day) ? days.filter((d) => d !== day) : [...days, day]);
  };

  const bumpHour = (delta: number) => {
    const next = ((hh + delta) % 24 + 24) % 24;
    setTime(`${pad2(next)}:${pad2(mm)}`);
  };

  const bumpMinute = (delta: number) => {
    const next = ((mm + delta) % 60 + 60) % 60;
    setTime(`${pad2(hh)}:${pad2(next)}`);
  };

  const stepper = (label: string, onMinus: () => void, onPlus: () => void) => (
    <View style={styles.stepper} accessibilityLabel={label}>
      <TouchableOpacity
        style={[styles.stepperBtn, { backgroundColor: colors.surfaceContainer }]}
        onPress={onMinus}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel={`${t('remindersMinus')} ${label}`}
      >
        <Text style={[styles.stepperBtnText, { color: colors.paperDim }]}>−</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.stepperBtn, { backgroundColor: colors.surfaceContainer }]}
        onPress={onPlus}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel={`${t('remindersPlus')} ${label}`}
      >
        <Text style={[styles.stepperBtnText, { color: colors.paperDim }]}>+</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceContainer }]}>
      <View style={styles.nameRow}>
        <View style={styles.nameTexts}>
          <Text style={[styles.name, { color: colors.paper }]}>{t('remindersName')}</Text>
          <Text style={[styles.desc, { color: colors.paperFaint }]}>{t('remindersDesc')}</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={handleToggle}
          trackColor={{ false: colors.line, true: colors.lime }}
          thumbColor={colors.ink}
          accessibilityLabel={t('remindersName')}
        />
      </View>

      {enabled ? (
        <View style={styles.config}>
          <View style={styles.dayRow}>
            {DAY_KEYS.map((key, day) => {
              const on = days.includes(day);
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.dayChip,
                    { backgroundColor: colors.surfaceContainer },
                    on && { backgroundColor: colors.primaryContainer }
                  ]}
                  onPress={() => toggleDay(day)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={t(key)}
                >
                  <Text
                    style={[
                      styles.dayChipText,
                      { color: colors.paperDim },
                      on && { color: colors.onPrimaryContainer }
                    ]}
                  >
                    {t(key)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.timeRow}>
            <Text style={[styles.timeLabel, { color: colors.paperDim }]}>
              {t('remindersTimeLabel')}
            </Text>
            <View style={styles.timeControls}>
              {stepper(t('reminderHoursA11y'), () => bumpHour(-1), () => bumpHour(1))}
              <Text style={[styles.timeValue, { color: colors.paper }]}>{time}</Text>
              {stepper(t('reminderMinutesA11y'), () => bumpMinute(-15), () => bumpMinute(15))}
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.sm
  },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  nameTexts: { flex: 1 },
  name: { fontSize: 14, fontFamily: fonts.bodySemi },
  desc: { fontSize: 12, fontFamily: fonts.body, marginTop: 3 },
  config: { marginTop: spacing.md },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayChip: {
    borderRadius: radius.control,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: 'center'
  },
  dayChipText: { fontSize: 12, fontFamily: fonts.bodySemi },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md
  },
  timeLabel: { fontSize: 12, fontFamily: fonts.body },
  timeControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepper: { flexDirection: 'row', gap: 6 },
  stepperBtn: {
    borderRadius: radius.control,
    width: 34,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepperBtnText: { fontSize: 16, fontFamily: fonts.bodySemi },
  timeValue: { fontSize: 16, fontFamily: fonts.mono, minWidth: 52, textAlign: 'center' }
});
