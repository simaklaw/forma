import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  buildMailruAuthorizeUrl,
  buildVkAuthorizeUrl,
  clearPendingOidc,
  configuredOidcProviders,
  createMutex,
  exchangeVkCode,
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
  getOidcClientConfig,
  isOidcProviderConfigured,
  loadPendingOidc,
  parseOAuthCallback,
  savePendingOidc,
} from './oidcClient';
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

export default function SyncAccountCard() {
  const colors = useThemeColors();
  const [subject, setSubject] = useState<string | null>(null);
  const [creds, setCreds] = useState<SyncCredentials | null>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cfg = useMemo(() => getOidcClientConfig(), []);
  const oidcProviders = useMemo(() => configuredOidcProviders(cfg), [cfg]);
  const runExclusive = useMemo(() => createMutex(), []);
  const handlingUrl = useRef(false);

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
      const parsed = parseOAuthCallback(url);
      if (!parsed) return;
      if (handlingUrl.current) return;

      await runExclusive(async () => {
        handlingUrl.current = true;
        setBusy(true);
        setError(null);
        setMessage(null);
        try {
          const pending = await loadPendingOidc(AsyncStorage);
          if (!pending) {
            setError('OAuth: сессия входа истекла. Нажми VK / Mail.ru ещё раз.');
            return;
          }
          if (!parsed.state || parsed.state !== pending.state) {
            setError('OAuth: неверный state (возможна подмена). Повтори вход.');
            await clearPendingOidc(AsyncStorage);
            return;
          }
          if (parsed.kind === 'error') {
            setError(
              parsed.error === 'access_denied'
                ? 'Вход отменён.'
                : `OAuth ошибка: ${parsed.error}`,
            );
            await clearPendingOidc(AsyncStorage);
            return;
          }

          const base = cfg.syncApiUrl;
          if (!base) {
            setError('Синхронизация не настроена: задайте EXPO_PUBLIC_SYNC_API_URL.');
            return;
          }

          let idToken: string | null = null;
          let provider = pending.provider;

          if (parsed.kind === 'code') {
            if (pending.provider !== 'vk' || !pending.codeVerifier || !cfg.vkClientId) {
              setError('OAuth: получен code, но PKCE-сессия VK недоступна.');
              await clearPendingOidc(AsyncStorage);
              return;
            }
            try {
              const tokens = await exchangeVkCode({
                clientId: cfg.vkClientId,
                code: parsed.code,
                codeVerifier: pending.codeVerifier,
                deviceId: parsed.deviceId,
              });
              idToken = tokens.id_token ?? null;
              if (!idToken && tokens.access_token) {
                setError(
                  'VK не вернул id_token. Проверь scope/настройки приложения в id.vk.ru.',
                );
                await clearPendingOidc(AsyncStorage);
                return;
              }
            } catch {
              setError('Не удалось обменять code VK на токен. Повтори вход.');
              await clearPendingOidc(AsyncStorage);
              return;
            }
          } else if (parsed.kind === 'id_token') {
            idToken = parsed.token;
          } else if (parsed.kind === 'access_token') {
            setError(
              'Mail.ru вернул access_token. Нужен id_token (OIDC). Проверь тип приложения o2.mail.ru.',
            );
            await clearPendingOidc(AsyncStorage);
            return;
          }

          if (!idToken || idToken.split('.').length !== 3) {
            setError('OAuth: токен не похож на JWT id_token.');
            await clearPendingOidc(AsyncStorage);
            return;
          }

          const next = await exchangeOidcCredentials({
            baseUrl: base,
            storage: AsyncStorage,
            provider,
            idToken,
          });
          setCreds(next);
          const s = await loadAuthSubject(AsyncStorage);
          setSubject(s);
          setMessage(
            provider === 'vk'
              ? 'Вход через VK ID выполнен.'
              : 'Вход через Mail.ru выполнен.',
          );
          await clearPendingOidc(AsyncStorage);
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
          handlingUrl.current = false;
        }
      });
    };

    const sub = Linking.addEventListener('url', onUrl);
    void Linking.getInitialURL().then((url) => {
      if (url) void onUrl({ url });
    });
    return () => sub.remove();
  }, [cfg, runExclusive]);

  async function onLink() {
    await runExclusive(async () => {
      setError(null);
      setMessage(null);
      const base = cfg.syncApiUrl;
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
    });
  }

  async function onOidc(provider: OidcProvider) {
    await runExclusive(async () => {
      setError(null);
      setMessage(null);
      if (!cfg.syncApiUrl) {
        setError('Синхронизация не настроена: задайте EXPO_PUBLIC_SYNC_API_URL.');
        return;
      }
      if (!isOidcProviderConfigured(provider, cfg)) {
        setError(
          provider === 'vk'
            ? 'Задай EXPO_PUBLIC_OIDC_VK_CLIENT_ID (кабинет id.vk.ru).'
            : 'Задай EXPO_PUBLIC_OIDC_MAILRU_CLIENT_ID (o2.mail.ru).',
        );
        return;
      }

      const state = generateState();
      let url: string;
      if (provider === 'vk') {
        const verifier = generateCodeVerifier();
        const challenge = await generateCodeChallenge(verifier);
        await savePendingOidc(AsyncStorage, {
          provider: 'vk',
          state,
          codeVerifier: verifier,
          createdAt: Date.now(),
        });
        url = await buildVkAuthorizeUrl(cfg.vkClientId!, state, challenge);
      } else {
        await savePendingOidc(AsyncStorage, {
          provider: 'mailru',
          state,
          createdAt: Date.now(),
        });
        url = buildMailruAuthorizeUrl(cfg.mailruClientId!, state);
      }

      const ok = await Linking.canOpenURL(url);
      if (!ok) {
        setError('Не удалось открыть браузер для входа.');
        await clearPendingOidc(AsyncStorage);
        return;
      }
      setMessage(
        provider === 'vk'
          ? 'Открываю VK ID… После входа вернись в приложение.'
          : 'Открываю Mail.ru… После входа вернись в приложение.',
      );
      await Linking.openURL(url);
    });
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
        { backgroundColor: colors.panel, borderColor: colors.line },
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
          Локальный режим — привяжи email
          {oidcProviders.length > 0 ? ' или войди через VK / Mail.ru' : ''}.
        </Text>
      )}

      {oidcProviders.length > 0 ? (
        <>
          <Text style={[styles.hint, { color: colors.paperDim }]}>
            Вход через VK ID или Mail.ru (без Google / Apple). Redirect URI:
            fitpulse://oauth
          </Text>
          <View style={styles.row}>
            {oidcProviders.includes('vk') ? (
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
            ) : null}
            {oidcProviders.includes('mailru') ? (
              <TouchableOpacity
                onPress={() => void onOidc('mailru')}
                disabled={busy}
                style={[
                  styles.btnSecondary,
                  { borderColor: colors.line, opacity: busy ? 0.5 : 1 },
                ]}
              >
                <Text style={[styles.btnText, { color: colors.paper }]}>
                  Mail.ru
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </>
      ) : (
        <Text style={[styles.hint, { color: colors.paperDim }]}>
          OIDC не настроен (нет EXPO_PUBLIC_OIDC_*_CLIENT_ID). Доступна привязка
          email.
        </Text>
      )}

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
