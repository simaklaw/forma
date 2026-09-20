import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fonts, radius, spacing } from '@/core/theme/tokens';

type Props = { children: ReactNode };
type State = { error: Error | null };

const LAST_ERROR_KEY = 'fitpulse_last_error';

export class WorkoutErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const payload = JSON.stringify({
      name: error.name,
      message: error.message,
      stack: error.stack ?? '',
      componentStack: info.componentStack ?? '',
      at: Date.now()
    });
    void AsyncStorage.setItem(LAST_ERROR_KEY, payload).catch(() => undefined);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.box}>
        <Text style={styles.title}>Не удалось открыть тренировку</Text>
        <Text style={styles.body}>
          Данные сессии сохранены. Это страховочная сетка — неожиданная ошибка, не отсутствие веса.
        </Text>
        <Text style={styles.msg}>{this.state.error.message}</Text>
        <View style={styles.row}>
          <TouchableOpacity style={styles.btn} onPress={() => this.setState({ error: null })}>
            <Text style={styles.btnText}>Повторить</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

export async function readLastError(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(LAST_ERROR_KEY)) ?? 'Ошибок пока нет.';
  } catch {
    return 'Не удалось прочитать лог.';
  }
}

const styles = StyleSheet.create({
  box: {
    margin: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
    gap: spacing.sm
  },
  title: { color: colors.paper, fontFamily: fonts.mono, fontSize: 22 },
  body: { color: colors.paperDim, fontSize: 13, lineHeight: 19 },
  msg: { color: colors.paperFaint, fontFamily: fonts.mono, fontSize: 11 },
  row: { flexDirection: 'row', marginTop: spacing.sm },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.control,
    backgroundColor: colors.lime
  },
  btnText: { color: colors.ink, fontFamily: fonts.bodySemi }
});
