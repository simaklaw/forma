import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
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
  exchangeOidcCredentials,
  isEmailSubject,
  linkSyncAccount,
  loadAuthSubject,
  loadSyncCredentials,
  SyncAuthError,
  type OidcProvider,
  type SyncCredentials,
} from './syncAuth';

function syncBaseUrl(): string {
  const base =
    (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SYNC_API_URL) ||
    '';
  return typeof base === 'string' ? base.replace(/\/$/, '') : '';
}

function envClientId(provider: OidcProvider): string {
  const key =
    provider === 'vk'
      ? 'EXPO_PUBLIC_OIDC_VK_CLIENT_ID'
      : 'EXPO_PUBLIC_OIDC_MAILRU_CLIENT_ID';
  const v =
    (typeof process !== 'undefined' &&
      (process.env as Record<string, string | undefined>)?.[key]) ||
    '';
  return typeof v === 'string' ? v.trim() : '';
}

function oauthRedirectUri(): string {
  return 'fitpulse://oauth';
}

function mailruAuthUrl(clientId: string): string {
  const q = new URLSearchParams({
    client_id: clientId,
    response_type: 'token',
    redirect_uri: oauthRedirectUri(),
    scope: 'userinfo',
  });
  return `https://o2.mail.ru/login?${q.toString()}`;
}

function vkAuthUrl(clientId: string): string {
  const q = new URLSearchParams({
    response_type: 'token',
    client_id: clientId,
    redirect_uri: oauthRedirectUri(),
    scope: 'email',
  });
  return `https://id.vk.ru/authorize?${q.toString()}`;
}

function parseTokenFromUrl(url: string): string | null {
  try {
    const hash = url.includes('#') ? url.split('#')[1] : '';
    const query = url.includes('?') ? url.split('?')[1].split('#')[0] : '';
    const params = new URLSearchParams(hash || query);
    return params.get('id_token') || params.get('access_token') || null;
  } catch {
    return null;
  }
}

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

  useEffect(() => {
    const onUrl = async ({ url }: { url: string }) => {
      if (!url.startsWith('fitpulse://oauth')) return;
      const token = parseTokenFromUrl(url);
      if (!token || token.length < 20) {
        setError(
          'OAuth: токен не получен. Проверь redirect URI в кабинете провайдера.',
        );
        return;
      }
      const base = syncBaseUrl();
      if (!base) {
        setError('Синхронизация не настроена: задайте EXPO_PUBLIC_SYNC_API_URL.');
        return;
      }
      const provider: OidcProvider =
        token.split('.').length === 3
          ? envClientId('mailru')
            ? 'mailru'
            : 'vk'
          : envClientId('vk')
            ? 'vk'
            : 'mailru';
      setBusy(true);
      setError(null);
      setMessage(null);
      try {
        const next = await exchangeOidcCredentials({
          baseUrl: base,
          storage: AsyncStorage,
          provider,
          idToken: token,
        });
        setCreds(next);
        const s = await loadAuthSubject(AsyncStorage);
        setSubject(s);
        setMessage(
          provider === 'vk'
            ? 'Вход через VK ID выполнен.'
            : 'Вход через Mail.ru выполнен.',
        );
      } catch (e) {
        if (e instanceof SyncAuthError) {
          setError(
            e.status === 429
              ? 'Слишком много попыток. Подожди минуту.'
              : e.status === 503
                ? 'OIDC на сервере не настроен.'
                : `Не удалось войти (${e.message}).`,
          );
        } else {
          setError('Не удалось войти через провайдера.');
        }
      } finally {
        setBusy(false);
      }
    };

    const sub = Linking.addEventListener('url', onUrl);
    void Linking.getInitialURL().then((url) => {
      if (url) void onUrl({ url });
    });
    return () => sub.remove();
  }, []);

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
      } else if (e instanceof SyncAuthError && e.message === 'network') {
        setError('Нет сети. Проверь соединение и повтори.');
      } else {
        setError('Не удалось привязать. Попробуй ещё раз.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function onOidc(provider: OidcProvider) {
    setError(null);
    setMessage(null);
    const base = syncBaseUrl();
    if (!base) {
      setError('Синхронизация не настроена: задайте EXPO_PUBLIC_SYNC_API_URL.');
      return;
    }
    const clientId = envClientId(provider);
    if (!clientId) {
      setError(
        provider === 'vk'
          ? 'Задай EXPO_PUBLIC_OIDC_VK_CLIENT_ID (кабинет id.vk.ru).'
          : 'Задай EXPO_PUBLIC_OIDC_MAILRU_CLIENT_ID (o2.mail.ru).',
      );
      return;
    }
    const url =
      provider === 'vk' ? vkAuthUrl(clientId) : mailruAuthUrl(clientId);
    const ok = await Linking.canOpenURL(url);
    if (!ok) {
      setError('Не удалось открыть браузер для входа.');
      return;
    }
    setMessage(
      provider === 'vk'
        ? 'Открываю VK ID… После входа вернись в приложение.'
        : 'Открываю Mail.ru… После входа вернись в приложение.',
    );
    await Linking.openURL(url);
  }

  const linkedEmail =
    subject != null && isEmailSubject(subject) ? subject : null;
  const shortId =
    creds?.user_id != null
      ? `${creds.user_id.slice(0, 8)}…`
      : subject != null
        ? `${subject.slice(0, 12)}${subject.length > 12 ? '…' : ''}`
        : null;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.line },
      ]}
    >
      <Text style={[styles.kicker, { color: colors.paperDim }]}>
        СИНХРОНИЗАЦИЯ
      </Text>
      <Text style={[styles.title, { color: colors.paper }]}>Аккаунт</Text>

      {shortId ? (
        <Text style={[styles.meta, { color: colors.paperDim }]}>
          {linkedEmail
            ? `Email: ${linkedEmail}`
            : subject?.startsWith('oidc:')
              ? `OIDC: ${subject}`
              : `ID: ${shortId}`}
        </Text>
      ) : (
        <Text style={[styles.meta, { color: colors.paperDim }]}>
          Локальный режим — привяжи email или войди через VK / Mail.ru.
        </Text>
      )}

      <Text style={[styles.hint, { color: colors.paperDim }]}>
        Вход через VK ID или Mail.ru (без Google / Apple). Redirect URI:
        fitpulse://oauth
      </Text>

      <View style={styles.row}>
        <TouchableOpacity
          onPress={() => void onOidc('vk')}
          disabled={busy}
          style={[
            styles.btnSecondary,
            { borderColor: colors.line, opacity: busy ? 0.5 : 1 },
          ]}
        >
          <Text style={[styles.btnText, { color: colors.paper }]}>VK ID</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => void onOidc('mailru')}
          disabled={busy}
          style={[
            styles.btnSecondary,
            { borderColor: colors.line, opacity: busy ? 0.5 : 1 },
          ]}
        >
          <Text style={[styles.btnText, { color: colors.paper }]}>Mail.ru</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.hint, { color: colors.paperDim }]}>
        Или привяжи email — тот же аккаунт на новом устройстве.
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
        <Text style={[styles.msg, { color: colors.paperDim }]}>{error}</Text>
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
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
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
  btnSecondary: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.control,
    borderWidth: 1,
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
