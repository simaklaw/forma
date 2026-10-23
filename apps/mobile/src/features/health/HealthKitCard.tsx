import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fonts, radius, spacing } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { HealthKitService } from './HealthKitService';
import { isHealthExportEnabled, setHealthExportEnabled } from './healthSyncPrefs';
import type { HealthSyncStatus } from './types';

function statusLabel(status: HealthSyncStatus, enabled: boolean): string {
  if (Platform.OS !== 'ios') return 'Только iOS (Apple Здоровье)';
  if (!enabled) return 'Выключено — тренировки не отправляются';
  switch (status) {
    case 'ready':
      return 'Готово · записи уйдут в Apple Здоровье (тренировки, калории, вес)';
    case 'unavailable':
      return 'HealthKit недоступен — нужен iPhone с Apple Здоровьем и dev/EAS build';
    case 'denied':
      return 'Нет разрешения на запись — Настройки › Здоровье › FitPulse';
    case 'error':
      return 'Ошибка доступа к Apple Здоровью';
    case 'unsupported':
      return 'Не поддерживается на этой платформе';
    default:
      return status;
  }
}

export default function HealthKitCard() {
  const colors = useThemeColors();
  const [status, setStatus] = useState<HealthSyncStatus>('unavailable');
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const [st, on] = await Promise.all([
        HealthKitService.getStatus(),
        isHealthExportEnabled()
      ]);
      setStatus(st);
      setEnabled(on);
    } finally {
      setBusy(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  async function toggle() {
    setBusy(true);
    try {
      if (!enabled) {
        const granted = await HealthKitService.requestWriteAccess();
        await setHealthExportEnabled(true);
        setEnabled(true);
        // HealthKit never reports write denial — stay optimistic, hint in status.
        setStatus(granted ? 'ready' : (await HealthKitService.getStatus()));
      } else {
        await setHealthExportEnabled(false);
        setEnabled(false);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
      <Text style={[styles.title, { color: colors.paper }]}>Apple Здоровье (HealthKit)</Text>
      <Text style={[styles.desc, { color: colors.paperFaint }]}>
        FitPulse пишет тренировки, активные калории и вес в{' '}
        <Text style={{ color: colors.paperDim }}>Apple Здоровье</Text>. HealthKit не сообщает
        об отказе в записи: если данные не появились — включите доступ в Настройки › Здоровье ›
        Приложения и доступ › FitPulse.
      </Text>
      <Text style={[styles.status, { color: colors.paperDim }]}>
        {busy ? '…' : statusLabel(status, enabled)}
      </Text>
      <TouchableOpacity
        style={[
          styles.btn,
          {
            borderColor: enabled ? colors.lime : colors.lineStrong,
            backgroundColor: enabled ? colors.limeDim : colors.ink
          }
        ]}
        onPress={() => void toggle()}
        disabled={busy || Platform.OS !== 'ios'}
        accessibilityRole="switch"
        accessibilityState={{ checked: enabled }}
      >
        {busy ? (
          <ActivityIndicator color={colors.lime} />
        ) : (
          <Text style={[styles.btnText, { color: enabled ? colors.lime : colors.paperDim }]}>
            {enabled ? 'Экспорт включён' : 'Включить экспорт'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    marginBottom: spacing.md
  },
  title: { fontFamily: fonts.bodySemi, fontSize: 15, marginBottom: 6 },
  desc: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, marginBottom: 8 },
  status: { fontFamily: fonts.body, fontSize: 12, marginBottom: 12, lineHeight: 17 },
  btn: {
    paddingVertical: 12,
    borderRadius: radius.control,
    borderWidth: 1,
    alignItems: 'center'
  },
  btnText: { fontFamily: fonts.bodySemi, fontSize: 13 }
});
