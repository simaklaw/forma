import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fonts, radius, spacing } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import {
  isEmailSubject,
  linkSyncAccount,
  loadAuthSubject,
  loadSyncCredentials,
  SyncAuthError,
  type SyncCredentials,
} from './syncAuth';

function syncBaseUrl(): string {
  const base =
    (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SYNC_API_URL) ||
    '';
  return typeof base === 'string' ? base.replace(/\/$/, '') : '';
}

/**
 * Profile section: show current sync identity and let the user link an email
 * subject so the same account recovers on a new device.
 */
export default function SyncAccountCard() {
  const colors = useThemeColors();
  const [subject, setSubject] = useState<string | null>(null);
  const [creds, setCreds] = useState<SyncCredentials | null>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [s, c] = await Promise.all([
      loadAuthSubject(AsyncStorage),
      loadSyncCredentials(AsyncStorage),
    ]);
    setSubject(s);
    setCreds(c);
    if (s && isEmailSubject(s)) setEmail(s);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onLink() {
    setError(null);
    setMessage(null);
    const base = syncBaseUrl();
    if (!base) {
      setError('Синхронизация не настроена: задайте EXPO_PUBLIC_SYNC_API_URL.');
      return;
    }
    const normalized = email.trim().toLowerCase();
    if (!isEmailSubject(normalized)) {
      setError('Укажи корректный email (например you@example.com).');
      return;
    }
    setBusy(true);
    try {
      const next = await linkSyncAccount({
        baseUrl: base,
        storage: AsyncStorage,
        subject: normalized,
      });
      setCreds(next);
      setSubject(normalized);
      setMessage('Аккаунт привязан. Данные синка пойдут под этим email.');
    } catch (e) {
      if (e instanceof SyncAuthError && e.status === 409) {
        setError('Этот email уже привязан к другому аккаунту.');
      } else if (e instanceof SyncAuthError && e.message === 'email_already_linked') {
        setError('Этот email уже привязан к другому аккаунту.');
      } else {
        setError(
          e instanceof Error ? e.message : 'Не удалось привязать аккаунт',
        );
      }
    } finally {
      setBusy(false);
    }
  }

  const shortId = creds?.user_id ? creds.user_id.slice(0, 3) + '…' : null;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.panel, borderColor: colors.line },
      ]}
    >
      <Text style={[styles.kicker, { color: colors.paperFaint }]}>АККАУНТ</Text>
      <Text style={[styles.title, { color: colors.paper }]}>Синхронизация</Text>

      {subject ? (
        <Text style={[styles.meta, { color: colors.paperDim }]}>
          Subject: {subject}
          {shortId ? ` · id ${shortId}` : ''}
        </Text>
      ) : (
        <Text style={[styles.meta, { color: colors.paperDim }]}>
          Локальный режим — привяжи email, чтобы восстановить прогресс на новом
          устройстве.
        </Text>
      )}

      <Text style={[styles.hint, { color: colors.paperFaint }]}>
        Email станет стабильным ключом аккаунта (JWT). Пароль не нужен.
      </Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="you@example.com"
        placeholderTextColor={colors.paperFaint}
        style={[
          styles.input,
          {
            color: colors.paper,
            borderColor: colors.line,
            backgroundColor: colors.ink,
          },
        ]}
      />

      <TouchableOpacity
        onPress={() => void onLink()}
        disabled={
          busy ||
          !email.trim() ||
          (subject != null &&
            isEmailSubject(subject) &&
            subject === email.trim().toLowerCase())
        }
        style={[
          styles.btn,
          {
            backgroundColor: colors.lime,
            opacity:
              busy ||
              !email.trim() ||
              (subject != null &&
                isEmailSubject(subject) &&
                subject === email.trim().toLowerCase())
                ? 0.5
                : 1,
          },
        ]}
      >
        {busy ? (
          <ActivityIndicator color={colors.ink} />
        ) : (
          <Text style={[styles.btnText, { color: colors.ink }]}>
            {subject != null && isEmailSubject(subject)
              ? 'Обновить привязку'
              : 'Привязать email'}
          </Text>
        )}
      </TouchableOpacity>

      {message ? (
        <Text style={[styles.msg, { color: colors.lime }]}>{message}</Text>
      ) : null}
      {error ? (
        <Text style={[styles.msg, { color: colors.paperDim }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.xs,
  },
  kicker: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  title: {
    fontFamily: fonts.mono,
    fontSize: 22,
  },
  meta: {
    fontSize: 13,
  },
  hint: {
    fontSize: 13,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  input: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
  },
  btn: {
    marginTop: spacing.sm,
    minHeight: 44,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontFamily: fonts.mono,
    fontSize: 16,
  },
  msg: {
    fontSize: 13,
    marginTop: spacing.xs,
  },
});
