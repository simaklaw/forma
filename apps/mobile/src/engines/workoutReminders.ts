/**
 * Планировщик локальных напоминаний о тренировке (expo-notifications).
 * Clean-room по разбору notification-scheduler из Forma-Google-studio (P1):
 * еженедельные календарные триггеры на выбранные дни недели, без серверной части.
 *
 * Нативный модуль expo-notifications входит в состав приложения только после
 * следующей сборки APK — до неё вызовы безопасно падают в try/catch.
 */
import * as Notifications from 'expo-notifications';
import { parseReminderTime } from '@/state/useWorkoutRemindersStore';

export const WORKOUT_REMINDERS_CHANNEL_ID = 'workout-reminders';

export interface WorkoutRemindersSchedule {
  enabled: boolean;
  /** 0=Пн … 6=Вс */
  days: number[];
  /** «HH:MM», 24-часовой формат */
  time: string;
}

/**
 * Наш индекс дня (0=Пн … 6=Вс) → expo weekday (1=вс … 7=сб):
 * Пн(0)→2, Вт(1)→3, … Сб(5)→7, Вс(6)→1.
 */
function expoWeekday(dayIndex: number): number {
  return ((dayIndex + 1) % 7) + 1;
}

/** Гасим все запланированные напоминания (идемпотентно, безопасно при пустом списке). */
export async function cancelWorkoutReminders(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn('workoutReminders: cancel failed', e);
  }
}

/**
 * Перепланировать напоминания под текущие настройки: полная отмена + расписание
 * по одному еженедельному триггеру на каждый выбранный день.
 */
export async function applyWorkoutReminders(
  schedule: WorkoutRemindersSchedule,
  content: { title: string; body: string; channelName?: string }
): Promise<void> {
  await cancelWorkoutReminders();
  if (!schedule.enabled || schedule.days.length === 0) return;
  const { hh, mm } = parseReminderTime(schedule.time);
  try {
    await Notifications.setNotificationChannelAsync(WORKOUT_REMINDERS_CHANNEL_ID, {
      name: content.channelName ?? content.title,
      importance: Notifications.AndroidImportance.DEFAULT
    });
  } catch {
    // Каналы — Android-only API; на iOS отсутствие канала не критично.
  }
  for (const day of schedule.days) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title: content.title, body: content.body },
        trigger: {
          channelId: WORKOUT_REMINDERS_CHANNEL_ID,
          weekday: expoWeekday(day),
          hour: hh,
          minute: mm,
          repeats: true
        }
      });
    } catch (e) {
      console.warn('workoutReminders: schedule failed for day', day, e);
    }
  }
}

/** Проверить/запросить разрешение на уведомления (Android 13+ требует POST_NOTIFICATIONS). */
export async function requestRemindersPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const requested = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false }
    });
    return requested.granted;
  } catch (e) {
    console.warn('workoutReminders: permission check failed', e);
    return false;
  }
}
