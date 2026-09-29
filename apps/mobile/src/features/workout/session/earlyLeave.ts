import { Alert } from 'react-native';
import { ActiveSessionController } from './ActiveSessionController';
import { RestTimerEngine } from '@/engines/RestTimerEngine';

export type EarlyLeaveOutcome = 'paused' | 'finished' | 'abandoned' | 'cancelled';

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
            onDone?.('abandoned');
          })();
        }
      }
    ],
    { cancelable: true }
  );
}
