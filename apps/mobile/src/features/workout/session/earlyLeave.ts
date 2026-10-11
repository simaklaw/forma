import { Alert } from 'react-native';
import { ActiveSessionController, dayIdFromTemplate } from './ActiveSessionController';
import { RestTimerEngine } from '@/engines/RestTimerEngine';
import { useSessionFeedbackStore, type EarlyLeaveReason } from '@/state/useSessionFeedbackStore';

export type EarlyLeaveOutcome = 'paused' | 'finished' | 'abandoned' | 'cancelled';

const REASON_LABELS: Record<EarlyLeaveReason, string> = {
  no_time: 'Нет времени',
  too_tired: 'Устал(а)',
  pain: 'Боль/дискомфорт',
  equipment: 'Нет инвентаря',
  not_motivated: 'Нет настроя',
  other: 'Другое'
};

function askEarlyLeaveReason(sessionId: string | undefined, dayId: string | undefined): void {
  if (!sessionId || !dayId) return;
  const { recordEarlyLeave } = useSessionFeedbackStore.getState();
  Alert.alert(
    'Почему прерываем?',
    'Это поможет нам точнее планировать тренировки',
    (Object.keys(REASON_LABELS) as EarlyLeaveReason[]).map((reason) => ({
      text: REASON_LABELS[reason],
      onPress: () => recordEarlyLeave(sessionId, dayId, reason)
    })),
    { cancelable: true }
  );
}

/**
 * P0 Early Leave dialog (FitPulse branding).
 * Stops rest timer synchronously before the Alert (no race with background tick).
 * Pause · save progress (complete partial) · cancel session (abandon).
 */
export function presentEarlyLeave(onDone?: (outcome: EarlyLeaveOutcome) => void): void {
  // Sync stop — must happen before Alert so a wall-clock tick cannot fire mid-dialog.
  RestTimerEngine.stopTimer();

  Alert.alert(
    'Выйти из тренировки?',
    'Можно поставить на паузу, сохранить сделанный объём или отменить сессию.',
    [
      {
        text: 'Продолжить',
        style: 'cancel',
        onPress: () => onDone?.('cancelled')
      },
      {
        text: 'Пауза',
        onPress: () => {
          void (async () => {
            const session = await ActiveSessionController.pauseSession();
            if (!session) {
              Alert.alert('Не удалось', 'Не получилось поставить сессию на паузу. Попробуйте ещё раз.');
              onDone?.('cancelled');
              return;
            }
            onDone?.('paused');
          })();
        }
      },
      {
        text: 'Сохранить прогресс',
        onPress: () => {
          void (async () => {
            const session = await ActiveSessionController.finishPartialSession();
            if (!session) {
              Alert.alert(
                'Не удалось',
                'Не получилось сохранить прогресс. Данные сессии на устройстве не потеряны — попробуйте ещё раз.'
              );
              onDone?.('cancelled');
              return;
            }
            const dayId = dayIdFromTemplate(session.templateRevisionId);
            askEarlyLeaveReason(session.sessionId, dayId ?? undefined);
            onDone?.('finished');
          })();
        }
      },
      {
        text: 'Отменить сессию',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const session = await ActiveSessionController.leaveSession();
            if (!session) {
              Alert.alert('Не удалось', 'Не получилось отменить сессию. Попробуйте ещё раз.');
              onDone?.('cancelled');
              return;
            }
            const dayId = dayIdFromTemplate(session.templateRevisionId);
            askEarlyLeaveReason(session.sessionId, dayId ?? undefined);
            onDone?.('abandoned');
          })();
        }
      }
    ],
    { cancelable: true }
  );
}
