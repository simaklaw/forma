import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fonts, radius, spacing } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { HealthConnectService } from './HealthConnectService';
import { isHealthExportEnabled, setHealthExportEnabled } from './healthSyncPrefs';
import type { HealthSyncStatus } from './types';

function statusLabel(status: HealthSyncStatus, enabled: boolean): string {
  if (Platform.OS !== 'android') return 'Только Android (Health Connect)';
  if (!enabled) return 'Выключено — тренировки не отправляются';
  switch (status) {
    case 'ready':
      return 'Готово · записи уйдут в Health Connect (и Samsung Health при синхронизации)';
    case 'unavailable':
      return 'Нужен dev/EAS build и приложение Health Connect на устройстве';
    case 'denied':
      return 'Нет разрешения на запись — откройте настройки Health Connect';
    case 'error':
      return 'Ошибка доступа к Health Connect';
    case 'unsupported':
      return 'Не поддерживается на этой платформе';
    default:
      return status;
  }
}

export default function HealthConnectCard() {
  const colors = useThemeColors();
  const [status, setStatus] = useState<HealthSyncStatus>('unavailable');
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const [st, on] = await Promise.all([
        HealthConnectService.getStatus(),
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
        const granted = await HealthConnectService.requestWriteAccess();
        await setHealthExportEnabled(true);
        setEnabled(true);
        if (!granted) {
          const st = await HealthConnectService.getStatus();
          setStatus(st === 'ready' ? 'denied' : st);
        } else {
          setStatus('ready');
        }
      } else {
        await setHealthExportEnabled(false);
        setEnabled(false);
      }
    } finally {
      setBusy(false);
    }
  }

  function openSettings() {
    const opened = HealthConnectService.openSettings();
    if (!opened) {
      void refresh();
    }
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
      <Text style={[styles.title, { color: colors.paper }]}>Samsung Health / Health Connect</Text>
      <Text style={[styles.desc, { color: colors.paperFaint }]}>
        FitPulse пишет тренировки и активные калории в системный{' '}
        <Text style={{ color: colors.paperDim }}>Health Connect</Text>
        {' '}(не Google Fit). На Galaxy включите синхронизацию Health Connect внутри Samsung
        Health — тогда сессии появятся в дневнике SH.
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
        disabled={busy || Platform.OS !== 'android'}
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
      {Platform.OS === 'android' ? (
        <TouchableOpacity
          style={[styles.linkBtn, { borderColor: colors.lineStrong }]}
          onPress={openSettings}
          accessibilityRole="button"
          accessibilityLabel="Открыть настройки Health Connect"
        >
          <Text style={[styles.linkText, { color: colors.cyan }]}>Настройки Health Connect</Text>
        </TouchableOpacity>
      ) : null}
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
  btnText: { fontFamily: fonts.bodySemi, fontSize: 13 },
  linkBtn: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: radius.control,
    borderWidth: 1,
    alignItems: 'center'
  },
  linkText: { fontFamily: fonts.bodySemi, fontSize: 12 }
});
