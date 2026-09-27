import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { isProfileComplete } from '@forma/core';
import { fonts, radius, spacing } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { useFitPulseStore } from '@/state/useFitPulseStore';
import { useThemeStore } from '@/state/useThemeStore';
import { Goal, Sex } from '@/engines/MetabolicEngine';
import ProtocolBanner from '@/components/ProtocolBanner';
import HealthConnectCard from '@/features/health/HealthConnectCard';

function numStr(v: number | null | undefined): string {
  return typeof v === 'number' && Number.isFinite(v) ? String(v) : '';
}

export default function ProfileScreen() {
  const colors = useThemeColors();
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);

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
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.ink }]} edges={['top']}>
      <View style={[styles.header, { borderColor: colors.line }]}>
        <Text style={[styles.eyebrow, { color: colors.lime }]}>FITPULSE · Аккаунт</Text>
        <Text style={[styles.title, { color: colors.paper }]}>Профиль</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.paperDim }]}>Оформление</Text>
          <Text style={[styles.sectionCount, { color: colors.paperFaint }]}>тема</Text>
        </View>
        <View style={[styles.themeCard, { backgroundColor: colors.panel, borderColor: colors.line }]}>
          <Text style={[styles.settingName, { color: colors.paper }]}>Цветовая схема</Text>
          <Text style={[styles.settingDesc, { color: colors.paperFaint }]}>
            Тёмная ink или светлая спортивная — mint-акценты сохраняются
          </Text>
          <View style={styles.themeRow}>
            {(
              [
                { id: 'dark' as const, label: 'Тёмная' },
                { id: 'light' as const, label: 'Светлая' }
              ] as const
            ).map((opt) => {
              const on = themeMode === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.themeBtn,
                    { borderColor: colors.lineStrong, backgroundColor: colors.ink },
                    on && { borderColor: colors.lime, backgroundColor: colors.limeDim }
                  ]}
                  onPress={() => setThemeMode(opt.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={opt.label}
                >
                  <Text
                    style={[
                      styles.themeBtnText,
                      { color: colors.paperDim },
                      on && { color: colors.lime }
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {!complete ? (
          <View
            style={[
              styles.gateBanner,
              { backgroundColor: colors.panelRaised, borderColor: colors.lineStrong }
            ]}
          >
            <Text style={[styles.gateTitle, { color: colors.paper }]}>Заполните биометрию</Text>
            <Text style={[styles.gateBody, { color: colors.paperDim }]}>
              Пол, вес, рост и возраст нужны для BMR/TDEE и целей КБЖУ. Без них вес по
              умолчанию не подставляется — кольцо питания и советы тренера ждут профиль.
            </Text>
          </View>
        ) : null}

        <View
          style={[
            styles.identityCard,
            { backgroundColor: colors.panel, borderColor: colors.line }
          ]}
        >
          <View
            style={[
              styles.avatar,
              { borderColor: colors.lime, backgroundColor: colors.limeDim }
            ]}
          >
            <Text style={[styles.avatarText, { color: colors.lime }]}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.identityTitle, { color: colors.paper }]}>
              {sexLabel} · {numStr(profile.age) || '—'} лет · {numStr(profile.height) || '—'} см ·{' '}
              {numStr(profile.weight) || '—'} кг
            </Text>
            <Text style={[styles.identitySub, { color: colors.paperFaint }]}>
              {targets
                ? `Цель ${targets.target.toLocaleString('ru-RU')} ккал · BMR ${targets.bmr}`
                : 'Заполните профиль для расчёта КБЖУ'}
            </Text>
          </View>
        </View>

        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.paperDim }]}>Параметры и КБЖУ</Text>
          <Text style={[styles.sectionCount, { color: colors.paperFaint }]}>Миффлин-Сан Жеор</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
          <View style={styles.calcGrid}>
            <View style={[styles.calcField, { width: '100%' }]}>
              <Text style={[styles.label, { color: colors.paperFaint }]}>Пол</Text>
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
                      style={[
                        styles.segmentBtn,
                        { borderColor: colors.lineStrong, backgroundColor: colors.ink },
                        on && { borderColor: colors.lime, backgroundColor: colors.limeDim }
                      ]}
                      onPress={() => updateProfile({ sex: opt.value })}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={opt.label}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          { color: colors.paperDim },
                          on && { color: colors.lime }
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View style={styles.calcField}>
              <Text style={[styles.label, { color: colors.paperFaint }]}>Возраст</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.ink,
                    borderColor: colors.lineStrong,
                    color: colors.paper
                  }
                ]}
                value={ageInput}
                keyboardType="numeric"
                onChangeText={setAgeInput}
                onEndEditing={() => commitNumber('age', ageInput)}
              />
            </View>
            <View style={styles.calcField}>
              <Text style={[styles.label, { color: colors.paperFaint }]}>Рост, см</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.ink,
                    borderColor: colors.lineStrong,
                    color: colors.paper
                  }
                ]}
                value={heightInput}
                keyboardType="numeric"
                onChangeText={setHeightInput}
                onEndEditing={() => commitNumber('height', heightInput)}
              />
            </View>
            <View style={styles.calcField}>
              <Text style={[styles.label, { color: colors.paperFaint }]}>Вес, кг</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.ink,
                    borderColor: colors.lineStrong,
                    color: colors.paper
                  }
                ]}
                value={weightInput}
                keyboardType="numeric"
                onChangeText={setWeightInput}
                onEndEditing={() => commitNumber('weight', weightInput)}
              />
            </View>
            <View style={[styles.calcField, { width: '100%' }]}>
              <Text style={[styles.label, { color: colors.paperFaint }]}>Активность (PAL)</Text>
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
                      style={[
                        styles.segmentBtn,
                        { borderColor: colors.lineStrong, backgroundColor: colors.ink },
                        on && { borderColor: colors.lime, backgroundColor: colors.limeDim }
                      ]}
                      onPress={() => updateProfile({ pal: opt.value })}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={opt.label}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          { color: colors.paperDim },
                          on && { color: colors.lime }
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View style={[styles.calcField, { width: '100%' }]}>
              <Text style={[styles.label, { color: colors.paperFaint }]}>Бюджет калорий</Text>
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
                      style={[
                        styles.segmentBtn,
                        { borderColor: colors.lineStrong, backgroundColor: colors.ink },
                        on && { borderColor: colors.lime, backgroundColor: colors.limeDim }
                      ]}
                      onPress={() => updateProfile({ goal: opt.value })}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={opt.label}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          { color: colors.paperDim },
                          on && { color: colors.lime }
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={[styles.calcResult, { borderColor: colors.line }]}>
            <View style={[styles.resultCell, { borderColor: colors.line }]}>
              <Text style={[styles.resultVal, { color: colors.paper }]}>
                {targets ? targets.bmr : '—'}
              </Text>
              <Text style={[styles.resultLbl, { color: colors.paperFaint }]}>BMR</Text>
            </View>
            <View style={[styles.resultCell, { borderColor: colors.line }]}>
              <Text style={[styles.resultVal, { color: colors.paper }]}>
                {targets ? targets.tdee : '—'}
              </Text>
              <Text style={[styles.resultLbl, { color: colors.paperFaint }]}>TDEE</Text>
            </View>
            <View style={[styles.resultCell, { borderRightWidth: 0, borderColor: colors.line }]}>
              <Text style={[styles.resultVal, { color: colors.lime }]}>
                {targets ? targets.target : '—'}
              </Text>
              <Text style={[styles.resultLbl, { color: colors.paperFaint }]}>Цель</Text>
            </View>
          </View>
          <Text style={[styles.macroNote, { color: colors.paperFaint }]}>
            {targets
              ? `Белки ${targets.proteinTarget} г · жиры ${targets.fatTarget} г · углеводы ${targets.carbTarget} г (ISSN 2.0 / 1.0 г на кг).`
              : 'Заполните вес, рост, возраст и пол — тогда появятся цели КБЖУ.'}
          </Text>
        </View>

        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.paperDim }]}>Метаболическое плато</Text>
          <Text style={[styles.sectionCount, { color: colors.paperFaint }]}>Refeed / Diet Break</Text>
        </View>
        <ProtocolBanner />

        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.paperDim }]}>Здоровье</Text>
          <Text style={[styles.sectionCount, { color: colors.paperFaint }]}>Health Connect</Text>
        </View>
        <HealthConnectCard />

        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.paperDim }]}>Данные</Text>
        </View>
        <TouchableOpacity
          style={[styles.settingRow, { backgroundColor: colors.panel, borderColor: colors.line }]}
          onPress={exportData}
          accessibilityRole="button"
        >
          <Text style={[styles.settingName, { color: colors.paper }]}>Экспорт данных</Text>
          <Text style={[styles.settingDesc, { color: colors.paperFaint }]}>
            Скачать резервную копию (JSON)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.settingRow, { backgroundColor: colors.panel, borderColor: colors.line }]}
          onPress={importData}
          accessibilityRole="button"
        >
          <Text style={[styles.settingName, { color: colors.paper }]}>Импорт данных</Text>
          <Text style={[styles.settingDesc, { color: colors.paperFaint }]}>
            Восстановить из файла резервной копии
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1
  },
  eyebrow: { fontSize: 11, fontFamily: fonts.bodySemi, letterSpacing: 1 },
  title: { fontSize: 30, fontFamily: fonts.mono },
  body: { paddingHorizontal: spacing.xl, paddingBottom: 120, paddingTop: spacing.lg },
  themeCard: {
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    marginBottom: spacing.md
  },
  themeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  themeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.control,
    borderWidth: 1,
    alignItems: 'center'
  },
  themeBtnText: { fontFamily: fonts.bodySemi, fontSize: 13 },
  gateBanner: {
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1
  },
  gateTitle: { fontFamily: fonts.bodySemi, fontSize: 14, marginBottom: 6 },
  gateBody: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    marginBottom: spacing.md
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: { fontFamily: fonts.bodySemi, fontSize: 16 },
  identityTitle: { fontFamily: fonts.bodySemi, fontSize: 14 },
  identitySub: { fontFamily: fonts.body, fontSize: 12, marginTop: 4 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
    marginTop: spacing.sm
  },
  sectionTitle: { fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 0.5 },
  sectionCount: { fontFamily: fonts.body, fontSize: 11 },
  card: {
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    marginBottom: spacing.md
  },
  calcGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  calcField: { width: '48%' },
  label: { fontFamily: fonts.body, fontSize: 11, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.body,
    fontSize: 15
  },
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segmentBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.control,
    borderWidth: 1
  },
  segmentText: { fontFamily: fonts.bodySemi, fontSize: 12 },
  calcResult: {
    flexDirection: 'row',
    borderTopWidth: 1,
    marginTop: spacing.lg,
    paddingTop: spacing.md
  },
  resultCell: {
    flex: 1,
    alignItems: 'center',
    borderRightWidth: 1
  },
  resultVal: { fontFamily: fonts.mono, fontSize: 20 },
  resultLbl: { fontFamily: fonts.body, fontSize: 11, marginTop: 4 },
  macroNote: { fontFamily: fonts.body, fontSize: 12, marginTop: spacing.md, lineHeight: 18 },
  settingRow: {
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    marginBottom: spacing.sm
  },
  settingName: { fontFamily: fonts.bodySemi, fontSize: 14 },
  settingDesc: { fontFamily: fonts.body, fontSize: 12, marginTop: 4 }
});
