import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { isProfileComplete } from '@forma/core';
import { colors, fonts, radius, spacing } from '@/core/theme/tokens';
import { useFitPulseStore } from '@/state/useFitPulseStore';
import { Goal, Sex } from '@/engines/MetabolicEngine';
import ProtocolBanner from '@/components/ProtocolBanner';

function numStr(v: number | null | undefined): string {
  return typeof v === 'number' && Number.isFinite(v) ? String(v) : '';
}

export default function ProfileScreen() {
  const profile = useFitPulseStore((s) => s.profile);
  const updateProfile = useFitPulseStore((s) => s.updateProfile);
  const logWeight = useFitPulseStore((s) => s.logWeight);
  const hydrate = useFitPulseStore((s) => s.hydrate);
  const fullState = useFitPulseStore((s) => s);

  const complete = isProfileComplete({
    weightKg: profile.weight,
    heightCm: profile.height,
    age: profile.age,
    gender: profile.sex
  });
  const targets = complete ? useFitPulseStore.getState().calculateTargets() : null;

  const [ageInput, setAgeInput] = useState(numStr(profile.age));
  const [heightInput, setHeightInput] = useState(numStr(profile.height));
  const [weightInput, setWeightInput] = useState(numStr(profile.weight));

  function commitNumber(field: 'age' | 'height' | 'weight', value: string) {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) return;
    if (field === 'weight') {
      logWeight(num);
    } else {
      updateProfile({ [field]: num });
    }
  }

  async function exportData() {
    try {
      const path = FileSystem.documentDirectory + 'fitpulse_backup.json';
      await FileSystem.writeAsStringAsync(path, JSON.stringify(fullState, null, 2));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: 'application/json' });
      } else {
        Alert.alert('Экспорт', 'Файл сохранён: ' + path);
      }
    } catch (e) {
      Alert.alert('Ошибка экспорта', String(e));
    }
  }

  async function importData() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (result.canceled || !result.assets?.[0]) return;
      const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const parsed = JSON.parse(content);
      hydrate(parsed);
      const next = useFitPulseStore.getState().profile;
      setAgeInput(numStr(next.age));
      setHeightInput(numStr(next.height));
      setWeightInput(numStr(next.weight));
      Alert.alert('Импорт', 'Данные восстановлены из файла');
    } catch (e) {
      Alert.alert('Ошибка импорта', e instanceof Error ? e.message : 'Файл повреждён или не в формате JSON');
    }
  }

  const initials = profile.sex === 'female' ? 'Ж' : profile.sex === 'male' ? 'М' : '—';
  const sexLabel = profile.sex === 'female' ? 'Женский' : profile.sex === 'male' ? 'Мужской' : '—';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>FORMA · Аккаунт</Text>
        <Text style={styles.title}>Профиль</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {!complete ? (
          <View style={styles.gateBanner}>
            <Text style={styles.gateTitle}>Заполните биометрию</Text>
            <Text style={styles.gateBody}>
              Пол, вес, рост и возраст нужны для BMR/TDEE и целей КБЖУ. Без них вес по
              умолчанию не подставляется — кольцо питания и советы тренера ждут профиль.
            </Text>
          </View>
        ) : null}

        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.identityTitle}>
              {sexLabel} · {numStr(profile.age) || '—'} лет · {numStr(profile.height) || '—'} см ·{' '}
              {numStr(profile.weight) || '—'} кг
            </Text>
            <Text style={styles.identitySub}>
              {targets
                ? `Цель ${targets.target.toLocaleString('ru-RU')} ккал · BMR ${targets.bmr}`
                : 'Заполните профиль для расчёта КБЖУ'}
            </Text>
          </View>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Параметры и КБЖУ</Text>
          <Text style={styles.sectionCount}>Миффлин-Сан Жеор</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.calcGrid}>
            <View style={[styles.calcField, { width: '100%' }]}>
              <Text style={styles.label}>Пол</Text>
              <View style={styles.segmentRow}>
                {(
                  [
                    { value: 'male' as Sex, label: 'Мужской' },
                    { value: 'female' as Sex, label: 'Женский' }
                  ] as const
                ).map((opt) => {
                  const on = profile.sex === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.segmentBtn, on && styles.segmentBtnOn]}
                      onPress={() => updateProfile({ sex: opt.value })}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={opt.label}
                    >
                      <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View style={styles.calcField}>
              <Text style={styles.label}>Возраст</Text>
              <TextInput
                style={styles.input}
                value={ageInput}
                keyboardType="numeric"
                onChangeText={setAgeInput}
                onEndEditing={() => commitNumber('age', ageInput)}
              />
            </View>
            <View style={styles.calcField}>
              <Text style={styles.label}>Рост, см</Text>
              <TextInput
                style={styles.input}
                value={heightInput}
                keyboardType="numeric"
                onChangeText={setHeightInput}
                onEndEditing={() => commitNumber('height', heightInput)}
              />
            </View>
            <View style={styles.calcField}>
              <Text style={styles.label}>Вес, кг</Text>
              <TextInput
                style={styles.input}
                value={weightInput}
                keyboardType="numeric"
                onChangeText={setWeightInput}
                onEndEditing={() => commitNumber('weight', weightInput)}
              />
            </View>
            <View style={[styles.calcField, { width: '100%' }]}>
              <Text style={styles.label}>Активность (PAL)</Text>
              <View style={styles.segmentRow}>
                {(
                  [
                    { value: 1.2, label: '1.2 низкая' },
                    { value: 1.375, label: '1.375 ср.' },
                    { value: 1.55, label: '1.55 выс.' }
                  ] as const
                ).map((opt) => {
                  const on = profile.pal === opt.value;
                  return (
                    <TouchableOpacity
                      key={String(opt.value)}
                      style={[styles.segmentBtn, on && styles.segmentBtnOn]}
                      onPress={() => updateProfile({ pal: opt.value })}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={opt.label}
                    >
                      <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View style={[styles.calcField, { width: '100%' }]}>
              <Text style={styles.label}>Бюджет калорий</Text>
              <View style={styles.segmentRow}>
                {(
                  [
                    { value: 'recomp' as Goal, label: 'Дефицит −12%' },
                    { value: 'maintain' as Goal, label: 'Поддержание' },
                    { value: 'gain' as Goal, label: 'Профицит +10%' }
                  ] as const
                ).map((opt) => {
                  const on = profile.goal === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.segmentBtn, on && styles.segmentBtnOn]}
                      onPress={() => updateProfile({ goal: opt.value })}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={opt.label}
                    >
                      <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={styles.calcResult}>
            <View style={styles.resultCell}>
              <Text style={styles.resultVal}>{targets ? targets.bmr : '—'}</Text>
              <Text style={styles.resultLbl}>BMR</Text>
            </View>
            <View style={styles.resultCell}>
              <Text style={styles.resultVal}>{targets ? targets.tdee : '—'}</Text>
              <Text style={styles.resultLbl}>TDEE</Text>
            </View>
            <View style={[styles.resultCell, { borderRightWidth: 0 }]}>
              <Text style={[styles.resultVal, { color: colors.lime }]}>
                {targets ? targets.target : '—'}
              </Text>
              <Text style={styles.resultLbl}>Цель</Text>
            </View>
          </View>
          <Text style={styles.macroNote}>
            {targets
              ? `Белки ${targets.proteinTarget} г · жиры ${targets.fatTarget} г · углеводы ${targets.carbTarget} г (ISSN 2.0 / 1.0 г на кг).`
              : 'Заполните вес, рост, возраст и пол — тогда появятся цели КБЖУ.'}
          </Text>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Метаболическое плато</Text>
          <Text style={styles.sectionCount}>Refeed / Diet Break</Text>
        </View>
        <ProtocolBanner />

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Данные</Text>
        </View>
        <TouchableOpacity style={styles.settingRow} onPress={exportData} accessibilityRole="button">
          <Text style={styles.settingName}>Экспорт данных</Text>
          <Text style={styles.settingDesc}>Скачать резервную копию (JSON)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingRow} onPress={importData} accessibilityRole="button">
          <Text style={styles.settingName}>Импорт данных</Text>
          <Text style={styles.settingDesc}>Восстановить из файла резервной копии</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  header: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderColor: colors.line
  },
  eyebrow: { color: colors.lime, fontSize: 11, fontFamily: fonts.bodySemi, letterSpacing: 1 },
  title: { color: colors.paper, fontSize: 30, fontFamily: fonts.mono },
  body: { paddingHorizontal: spacing.xl, paddingBottom: 120, paddingTop: spacing.lg },
  gateBanner: {
    marginBottom: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.panelRaised,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.lineStrong
  },
  gateTitle: { color: colors.paper, fontFamily: fonts.bodySemi, fontSize: 14, marginBottom: 6 },
  gateBody: { color: colors.paperDim, fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: spacing.lg,
    backgroundColor: colors.panel,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing.md
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.lime,
    backgroundColor: colors.limeDim,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: { color: colors.lime, fontFamily: fonts.mono, fontSize: 20 },
  identityTitle: { color: colors.paper, fontSize: 15, fontFamily: fonts.bodySemi },
  identitySub: { color: colors.paperFaint, fontSize: 12, marginTop: 4, fontFamily: fonts.body },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: 10
  },
  sectionTitle: { color: colors.paperDim, fontSize: 13, fontFamily: fonts.bodySemi },
  sectionCount: { color: colors.paperFaint, fontFamily: fonts.mono, fontSize: 13 },
  card: {
    backgroundColor: colors.panel,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md
  },
  calcGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  calcField: { width: '47%' },
  label: { fontSize: 10.5, color: colors.paperFaint, marginBottom: 4 },
  input: {
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.control,
    color: colors.paper,
    padding: 10,
    fontFamily: fonts.mono,
    fontSize: 13.5
  },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.ink,
    alignItems: 'center'
  },
  segmentBtnOn: { borderColor: colors.lime, backgroundColor: colors.limeDim },
  segmentText: { color: colors.paperDim, fontFamily: fonts.bodySemi, fontSize: 12, textAlign: 'center' },
  segmentTextOn: { color: colors.lime },
  calcResult: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.control,
    overflow: 'hidden',
    marginBottom: 8
  },
  macroNote: {
    color: colors.paperFaint,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: fonts.body
  },
  resultCell: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRightWidth: 1,
    borderColor: colors.line
  },
  resultVal: { color: colors.paper, fontSize: 19, fontFamily: fonts.mono },
  resultLbl: { color: colors.paperFaint, fontSize: 9.5, marginTop: 2 },
  settingRow: {
    padding: 14,
    marginBottom: 8,
    backgroundColor: colors.panel,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line
  },
  settingName: { color: colors.paper, fontSize: 14, fontFamily: fonts.bodySemi },
  settingDesc: { color: colors.paperFaint, fontSize: 11.5, marginTop: 2 }
});
