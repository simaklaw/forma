import { Alert } from 'react-native';
import { ActiveSessionController } from './ActiveSessionController';
import { RestTimerEngine } from '@/engines/RestTimerEngine';

export type EarlyLeaveOutcome = 'paused' | 'finished' | 'abandoned' | 'cancelled';

/**
 * P0 Early Leave dialog (FitPulse branding).
 * Pause · save progress (complete partial) · cancel session (abandon).
 */
export function presentEarlyLeave(onDone?: (outcome: EarlyLeaveOutcome) => void): void {
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
            RestTimerEngine.stopTimer();
            await ActiveSessionController.pauseSession();
            onDone?.('paused');
          })();
        }
      },
      {
        text: 'Сохранить прогресс',
        onPress: () => {
          void (async () => {
            RestTimerEngine.stopTimer();
            await ActiveSessionController.finishPartialSession();
            onDone?.('finished');
          })();
        }
      },
      {
        text: 'Отменить сессию',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            RestTimerEngine.stopTimer();
            await ActiveSessionController.leaveSession();
            onDone?.('abandoned');
          })();
        }
      }
    ],
    { cancelable: true }
  );
}
