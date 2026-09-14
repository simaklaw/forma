import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { colors, fonts, spacing } from '@/core/theme/tokens';
import { useFitPulseStore } from '@/state/useFitPulseStore';
import { Goal, Sex } from '@/engines/MetabolicEngine';
import ProtocolBanner from '@/components/ProtocolBanner';

export default function ProfileScreen() {
  const profile = useFitPulseStore((s) => s.profile);
  const updateProfile = useFitPulseStore((s) => s.updateProfile);
  const logWeight = useFitPulseStore((s) => s.logWeight);
  const hydrate = useFitPulseStore((s) => s.hydrate);
  const targets = useFitPulseStore((s) => s.calculateTargets());
  const fullState = useFitPulseStore((s) => s);

  const [ageInput, setAgeInput] = useState(String(profile.age));
  const [heightInput, setHeightInput] = useState(String(profile.height));
  const [weightInput, setWeightInput] = useState(String(profile.weight));

  /**
   * Обновление: this used to call updateProfile({ weight }) for the weight
   * field too, same as age/height. That silently meant weightHistory could
   * never grow from anything the user actually did — the only place it was
   * ever populated was the demo seed removed in useFitPulseStore.ts. Now a
   * committed weight edit also calls logWeight(), which is the one function
   * that both updates profile.weight and appends to weightHistory.
   */
  function commitNumber(field: 'age' | 'height' | 'weight', value: string) {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) return;
    if (field === 'weight') {
      logWeight(num);
    } else {
      updateProfile({ [field]: num } as any);
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
      setAgeInput(String(useFitPulseStore.getState().profile.age));
      setHeightInput(String(useFitPulseStore.getState().profile.height));
      setWeightInput(String(useFitPulseStore.getState().profile.weight));
      Alert.alert('Импорт', 'Данные восстановлены из файла');
    } catch (e) {
      Alert.alert('Ошибка импорта', e instanceof Error ? e.message : 'Файл повреждён или не в формате JSON');
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Аккаунт</Text>
        <Text style={styles.title}>Профиль</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Параметры и КБЖУ</Text>
          <Text style={styles.sectionCount}>Миффлин-Сан Жеор</Text>
        </View>

        <View style={styles.calcGrid}>
          <View style={styles.calcField}>
            <Text style={styles.label}>Пол</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={profile.sex} onValueChange={(v: Sex) => updateProfile({ sex: v })} dropdownIconColor={colors.paper}>
                <Picker.Item label="Мужской" value="male" />
                <Picker.Item label="Женский" value="female" />
              </Picker>
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
          <View style={styles.calcField}>
            <Text style={styles.label}>Активность (PAL)</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={profile.pal} onValueChange={(v: number) => updateProfile({ pal: v })} dropdownIconColor={colors.paper}>
                <Picker.Item label="1.2 — низкая" value={1.2} />
                <Picker.Item label="1.375 — умеренная" value={1.375} />
                <Picker.Item label="1.55 — высокая" value={1.55} />
              </Picker>
            </View>
          </View>
          <View style={styles.calcField}>
            <Text style={styles.label}>Бюджет калорий</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={profile.goal} onValueChange={(v: Goal) => updateProfile({ goal: v })} dropdownIconColor={colors.paper}>
                <Picker.Item label="Дефицит −12%" value="recomp" />
                <Picker.Item label="Поддержание" value="maintain" />
                <Picker.Item label="Профицит +10%" value="gain" />
              </Picker>
            </View>
          </View>
        </View>

        <View style={styles.calcResult}>
          <View style={styles.resultCell}>
            <Text style={styles.resultVal}>{targets.bmr}</Text>
            <Text style={styles.resultLbl}>BMR, ккал</Text>
          </View>
          <View style={styles.resultCell}>
            <Text style={styles.resultVal}>{targets.tdee}</Text>
            <Text style={styles.resultLbl}>TDEE, ккал</Text>
          </View>
          <View style={[styles.resultCell, { borderRightWidth: 0 }]}>
            <Text style={[styles.resultVal, { color: colors.lime }]}>{targets.target}</Text>
            <Text style={styles.resultLbl}>Цель, ккал</Text>
          </View>
        </View>
        <Text style={styles.macroNote}>
          Белки {targets.proteinTarget} г и жиры {targets.fatTarget} г — по протоколу ISSN (2.0 и 1.0 г на кг массы
          тела), углеводы {targets.carbTarget} г добираются из остатка калорий.
        </Text>

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
  header: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.lg, borderBottomWidth: 1, borderColor: colors.line },
  eyebrow: { color: colors.paperFaint, fontSize: 11, fontFamily: fonts.body },
  title: { color: colors.paper, fontSize: 30, fontFamily: fonts.mono },
  body: { paddingHorizontal: spacing.xxl, paddingBottom: 120, paddingTop: spacing.lg },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: 10 },
  sectionTitle: { color: colors.paperDim, fontSize: 13, fontFamily: fonts.bodySemi },
  sectionCount: { color: colors.paperFaint, fontFamily: fonts.mono, fontSize: 13 },
  calcGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  calcField: { width: '47%' },
  label: { fontSize: 10.5, color: colors.paperFaint, marginBottom: 4 },
  input: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.lineStrong, color: colors.paper, padding: 8, fontFamily: fonts.mono, fontSize: 13.5 },
  pickerWrap: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.lineStrong },
  calcResult: { flexDirection: 'row', borderWidth: 1, borderColor: colors.line, marginBottom: 8 },
  macroNote: { color: colors.paperFaint, fontSize: 11, lineHeight: 16, marginBottom: 20, fontFamily: fonts.body },
  resultCell: { flex: 1, padding: 12, alignItems: 'center', borderRightWidth: 1, borderColor: colors.line },
  resultVal: { color: colors.paper, fontSize: 19, fontFamily: fonts.mono },
  resultLbl: { color: colors.paperFaint, fontSize: 9.5, marginTop: 2 },
  settingRow: { paddingVertical: 14, borderBottomWidth: 1, borderColor: colors.line },
  settingName: { color: colors.paper, fontSize: 14, fontFamily: fonts.bodySemi },
  settingDesc: { color: colors.paperFaint, fontSize: 11.5, marginTop: 1 }
});
