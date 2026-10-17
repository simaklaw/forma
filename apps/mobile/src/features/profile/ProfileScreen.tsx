import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { isProfileComplete } from '@forma/core';
import { fonts, radius, spacing } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import {
  useFitPulseStore,
  BODY_MEASUREMENT_LABELS,
  type BodyMeasurementType
} from '@/state/useFitPulseStore';
import { useThemeStore } from '@/state/useThemeStore';
import { useLanguageStore } from '@/i18n/useLanguageStore';
import { useT, measurementLabel } from '@/i18n/strings';
import { useVoiceCuesStore } from '@/state/useVoiceCuesStore';
import { Goal, Sex } from '@/engines/MetabolicEngine';
import ProtocolBanner from '@/components/ProtocolBanner';
import HealthConnectCard from '@/features/health/HealthConnectCard';
import SyncAccountCard from '@/features/auth/SyncAccountCard';
import { buildStamp } from '@/core/buildInfo';

function numStr(v: number | null | undefined): string {
  return typeof v === 'number' && Number.isFinite(v) ? String(v) : '';
}

export default function ProfileScreen() {
  const colors = useThemeColors();
  const t = useT();
  const lang = useLanguageStore((s) => s.lang);
  const setLang = useLanguageStore((s) => s.setLang);
  const themePreference = useThemeStore((s) => s.preference);
  const setThemePreference = useThemeStore((s) => s.setPreference);
  const voiceCuesEnabled = useVoiceCuesStore((s) => s.enabled);
  const setVoiceCuesEnabled = useVoiceCuesStore((s) => s.setEnabled);

  const profile = useFitPulseStore((s) => s.profile);
  const updateProfile = useFitPulseStore((s) => s.updateProfile);
  const logWeight = useFitPulseStore((s) => s.logWeight);
  const bodyMeasurements = useFitPulseStore((s) => s.bodyMeasurements);
  const logBodyMeasurement = useFitPulseStore((s) => s.logBodyMeasurement);
  const deleteBodyMeasurement = useFitPulseStore((s) => s.deleteBodyMeasurement);
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
  const [measureType, setMeasureType] = useState<BodyMeasurementType>('waist');
  const [measureInput, setMeasureInput] = useState('');
  const measurementValue = Number(measureInput.trim().replace(',', '.'));
  const canAddMeasurement = Number.isFinite(measurementValue) && measurementValue > 0;

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
        Alert.alert(t('profileExport'), t('profileExportDone', { path }));
      }
    } catch (e) {
      Alert.alert(t('profileExportError'), String(e));
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
      Alert.alert(t('profileImport'), t('profileImportDone'));
    } catch (e) {
      Alert.alert(t('profileImportError'), e instanceof Error ? e.message : t('profileImportBadFile'));
    }
  }

  const initials =
    profile.sex === 'female' ? t('femaleShort') : profile.sex === 'male' ? t('maleShort') : '—';
  const sexLabel =
    profile.sex === 'female' ? t('female') : profile.sex === 'male' ? t('male') : '—';

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.ink }]} edges={['top']}>
      <View style={[styles.header, { borderColor: colors.line }]}>
        <Text style={[styles.eyebrow, { color: colors.lime }]}>{t('profileHeaderEyebrow')}</Text>
        <Text style={[styles.title, { color: colors.paper }]}>{t('tabProfile')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.paperDim }]}>{t('sectionTheme')}</Text>
          <Text style={[styles.sectionCount, { color: colors.paperFaint }]}>{t('sectionThemeCount')}</Text>
        </View>
        <View style={[styles.themeCard, { backgroundColor: colors.panel, borderColor: colors.line }]}>
          <Text style={[styles.settingName, { color: colors.paper }]}>{t('themeSchemeName')}</Text>
          <Text style={[styles.settingDesc, { color: colors.paperFaint }]}>
            {t('themeSchemeDesc')}
          </Text>
          <View style={styles.themeRow}>
            {(
              [
                { id: 'dark' as const, label: t('profileThemeDark') },
                { id: 'light' as const, label: t('profileThemeLight') },
                { id: 'system' as const, label: t('profileThemeSystem') }
              ] as const
            ).map((opt) => {
              const on = themePreference === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.themeBtn,
                    { borderColor: colors.lineStrong, backgroundColor: colors.ink },
                    on && { borderColor: colors.lime, backgroundColor: colors.limeDim }
                  ]}
                  onPress={() => setThemePreference(opt.id)}
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

        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.paperDim }]}>{t('languageTitle')}</Text>
        </View>
        <View style={[styles.themeCard, { backgroundColor: colors.panel, borderColor: colors.line }]}>
          <View style={styles.themeRow}>
            {(
              [
                { id: 'ru' as const, label: t('languageRu') },
                { id: 'en' as const, label: t('languageEn') }
              ] as const
            ).map((opt) => {
              const on = lang === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.themeBtn,
                    { borderColor: colors.lineStrong, backgroundColor: colors.ink },
                    on && { borderColor: colors.lime, backgroundColor: colors.limeDim }
                  ]}
                  onPress={() => setLang(opt.id)}
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
            <Text style={[styles.gateTitle, { color: colors.paper }]}>{t('profileGateTitle')}</Text>
            <Text style={[styles.gateBody, { color: colors.paperDim }]}>{t('profileGateBody')}</Text>
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
              {t('profileStatsLine', {
                sex: sexLabel,
                age: numStr(profile.age) || '—',
                height: numStr(profile.height) || '—',
                weight: numStr(profile.weight) || '—'
              })}
            </Text>
            <Text style={[styles.identitySub, { color: colors.paperFaint }]}>
              {targets
                ? t('profileTargetLine', {
                    target: targets.target.toLocaleString(lang === 'en' ? 'en-US' : 'ru-RU'),
                    bmr: targets.bmr
                  })
                : t('profileFillForTargets')}
            </Text>
          </View>
        </View>

        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.paperDim }]}>{t('sectionVoice')}</Text>
          <Text style={[styles.sectionCount, { color: colors.paperFaint }]}>{t('sectionVoiceCount')}</Text>
        </View>
        <View style={[styles.themeCard, { backgroundColor: colors.panel, borderColor: colors.line }]}>
          <Text style={[styles.settingName, { color: colors.paper }]}>{t('voiceCuesName')}</Text>
          <Text style={[styles.settingDesc, { color: colors.paperFaint }]}>{t('voiceCuesDesc')}</Text>
          <View style={styles.themeRow}>
            {(
              [
                { id: false, label: t('off') },
                { id: true, label: t('on') }
              ] as const
            ).map((opt) => {
              const on = voiceCuesEnabled === opt.id;
              return (
                <TouchableOpacity
                  key={String(opt.id)}
                  style={[
                    styles.themeBtn,
                    { borderColor: colors.lineStrong, backgroundColor: colors.ink },
                    on && { borderColor: colors.lime, backgroundColor: colors.limeDim }
                  ]}
                  onPress={() => setVoiceCuesEnabled(opt.id)}
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

        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.paperDim }]}>{t('sectionParams')}</Text>
          <Text style={[styles.sectionCount, { color: colors.paperFaint }]}>{t('sectionParamsCount')}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
          <View style={styles.calcGrid}>
            <View style={[styles.calcField, { width: '100%' }]}>
              <Text style={[styles.label, { color: colors.paperFaint }]}>{t('labelSex')}</Text>
              <View style={styles.segmentRow}>
                {(
                  [
                    { value: 'male' as Sex, label: t('male') },
                    { value: 'female' as Sex, label: t('female') }
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
              <Text style={[styles.label, { color: colors.paperFaint }]}>{t('labelAge')}</Text>
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
              <Text style={[styles.label, { color: colors.paperFaint }]}>{t('labelHeight')}</Text>
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
              <Text style={[styles.label, { color: colors.paperFaint }]}>{t('labelWeight')}</Text>
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
              <Text style={[styles.label, { color: colors.paperFaint }]}>{t('labelActivity')}</Text>
              <View style={styles.segmentRow}>
                {(
                  [
                    { value: 1.2, label: t('profileActivityLow') },
                    { value: 1.375, label: t('profileActivityMid') },
                    { value: 1.55, label: t('profileActivityHigh') }
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
              <Text style={[styles.label, { color: colors.paperFaint }]}>{t('labelBudget')}</Text>
              <View style={styles.segmentRow}>
                {(
                  [
                    { value: 'recomp' as Goal, label: t('profileGoalDeficit') },
                    { value: 'maintain' as Goal, label: t('profileGoalMaintain') },
                    { value: 'gain' as Goal, label: t('profileGoalSurplus') }
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
              <Text style={[styles.resultLbl, { color: colors.paperFaint }]}>{t('resultTarget')}</Text>
            </View>
          </View>
          <Text style={[styles.macroNote, { color: colors.paperFaint }]}>
            {targets
              ? t('profileMacrosLine', {
                  protein: targets.proteinTarget,
                  fat: targets.fatTarget,
                  carbs: targets.carbTarget
                })
              : t('profileFillBody')}
          </Text>
        </View>

        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.paperDim }]}>{t('sectionMeasurements')}</Text>
          <Text style={[styles.sectionCount, { color: colors.paperFaint }]}>{t('sectionMeasurementsCount')}</Text>
        </View>
        <View style={[styles.themeCard, { backgroundColor: colors.panel, borderColor: colors.line }]}>
          <View style={styles.measureTypeRow}>
            {(Object.keys(BODY_MEASUREMENT_LABELS) as BodyMeasurementType[]).map((type) => {
              const on = measureType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.measureTypeChip,
                    { borderColor: colors.lineStrong, backgroundColor: colors.ink },
                    on && { borderColor: colors.lime, backgroundColor: colors.limeDim }
                  ]}
                  onPress={() => setMeasureType(type)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={measurementLabel(type, lang)}
                >
                  <Text
                    style={[
                      styles.measureTypeChipText,
                      { color: colors.paperDim },
                      on && { color: colors.lime }
                    ]}
                  >
                    {measurementLabel(type, lang)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.measureInputRow}>
            <TextInput
              style={[
                styles.measureInput,
                {
                  backgroundColor: colors.ink,
                  borderColor: colors.lineStrong,
                  color: colors.paper
                }
              ]}
              value={measureInput}
              onChangeText={setMeasureInput}
              placeholder={t('cm')}
              placeholderTextColor={colors.paperFaint}
              keyboardType="numeric"
              accessibilityLabel={t('profileMeasureA11y', { name: measurementLabel(measureType, lang) })}
            />
            <TouchableOpacity
              style={[styles.measureAddBtn, { backgroundColor: colors.lime, opacity: canAddMeasurement ? 1 : 0.4 }]}
              disabled={!canAddMeasurement}
              accessibilityState={{ disabled: !canAddMeasurement }}
              onPress={() => {
                if (canAddMeasurement) {
                  logBodyMeasurement(measureType, measurementValue);
                  setMeasureInput('');
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={t('profileMeasureAdd')}
            >
              <Text style={[styles.measureAddBtnText, { color: colors.ink }]}>{t('measureAddBtn')}</Text>
            </TouchableOpacity>
          </View>

          {bodyMeasurements
            .filter((e) => e.type === measureType)
            .slice(-5)
            .reverse()
            .map((e) => (
              <View key={e.id} style={styles.measureHistoryRow}>
                <Text style={[styles.measureHistoryDate, { color: colors.paperFaint }]}>
                  {e.dateKey}
                </Text>
                <Text style={[styles.measureHistoryVal, { color: colors.paper }]}>
                  {t('measureValueCm', { value: e.valueCm })}
                </Text>
                <TouchableOpacity
                  onPress={() => deleteBodyMeasurement(e.id)}
                  accessibilityRole="button"
                  accessibilityLabel={t('profileMeasureDelete')}
                >
                  <Text style={[styles.measureHistoryDel, { color: colors.paperFaint }]}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
        </View>

        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.paperDim }]}>{t('sectionPlateau')}</Text>
          <Text style={[styles.sectionCount, { color: colors.paperFaint }]}>Refeed / Diet Break</Text>
        </View>
        <ProtocolBanner />

        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.paperDim }]}>{t('sectionHealth')}</Text>
          <Text style={[styles.sectionCount, { color: colors.paperFaint }]}>Health Connect</Text>
        </View>
        <HealthConnectCard />

        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.paperDim }]}>{t('sectionSync')}</Text>
          <Text style={[styles.sectionCount, { color: colors.paperFaint }]}>{t('sectionSyncCount')}</Text>
        </View>
        <SyncAccountCard />

        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.paperDim }]}>{t('sectionData')}</Text>
        </View>
        <TouchableOpacity
          style={[styles.settingRow, { backgroundColor: colors.panel, borderColor: colors.line }]}
          onPress={exportData}
          accessibilityRole="button"
        >
          <Text style={[styles.settingName, { color: colors.paper }]}>{t('dataExportName')}</Text>
          <Text style={[styles.settingDesc, { color: colors.paperFaint }]}>{t('dataExportDesc')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.settingRow, { backgroundColor: colors.panel, borderColor: colors.line }]}
          onPress={importData}
          accessibilityRole="button"
        >
          <Text style={[styles.settingName, { color: colors.paper }]}>{t('dataImportName')}</Text>
          <Text style={[styles.settingDesc, { color: colors.paperFaint }]}>{t('dataImportDesc')}</Text>
        </TouchableOpacity>

        <Text style={[styles.buildStamp, { color: colors.paperFaint }]}>{buildStamp()}</Text>
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
  themeBtnText: { fontSize: 14, fontFamily: fonts.bodySemi },
  gateBanner: {
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    marginBottom: spacing.md
  },
  gateTitle: { fontSize: 16, fontFamily: fonts.mono, marginBottom: 6 },
  gateBody: { fontSize: 13, lineHeight: 18 },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    marginBottom: spacing.lg
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: { fontSize: 20, fontFamily: fonts.mono },
  identityTitle: { fontSize: 15, fontFamily: fonts.bodySemi },
  identitySub: { fontSize: 12, marginTop: 4 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
    marginTop: spacing.md
  },
  sectionTitle: { fontSize: 13, fontFamily: fonts.bodySemi, letterSpacing: 0.4 },
  sectionCount: { fontSize: 11 },
  card: {
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    marginBottom: spacing.md
  },
  calcGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  calcField: { width: '47%' },
  label: { fontSize: 11, marginBottom: 6, fontFamily: fonts.bodySemi },
  input: {
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: fonts.body
  },
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segmentBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.control,
    borderWidth: 1
  },
  segmentText: { fontSize: 13, fontFamily: fonts.bodySemi },
  calcResult: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    borderTopWidth: 1,
    paddingTop: spacing.md
  },
  resultCell: {
    flex: 1,
    alignItems: 'center',
    borderRightWidth: 1,
    paddingVertical: 4
  },
  resultVal: { fontSize: 22, fontFamily: fonts.mono },
  resultLbl: { fontSize: 11, marginTop: 2 },
  macroNote: { fontSize: 12, marginTop: spacing.md, lineHeight: 17 },
  settingRow: {
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    marginBottom: spacing.sm
  },
  settingName: { fontSize: 15, fontFamily: fonts.bodySemi },
  settingDesc: { fontSize: 12, marginTop: 4 },
  measureTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  measureTypeChip: {
    paddingHorizontal: 10,
    height: 30,
    borderRadius: radius.control,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  measureTypeChipText: { fontSize: 12, fontFamily: fonts.body },
  measureInputRow: { flexDirection: 'row', gap: 8 },
  measureInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: 12,
    fontFamily: fonts.mono,
    fontSize: 16
  },
  measureAddBtn: {
    paddingHorizontal: 16,
    height: 44,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center'
  },
  measureAddBtnText: { fontFamily: fonts.bodySemi, fontSize: 13 },
  measureHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    marginTop: 8
  },
  measureHistoryDate: { flex: 1, fontFamily: fonts.mono, fontSize: 12 },
  measureHistoryVal: { fontFamily: fonts.mono, fontSize: 13 },
  measureHistoryDel: { width: 20, textAlign: 'center', fontSize: 15 },
  /** issue #171: штамп сборки в подвале профиля. */
  buildStamp: { fontFamily: fonts.mono, fontSize: 11, textAlign: 'center', marginTop: spacing.lg }
});
