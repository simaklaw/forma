import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { fonts, radius, spacing } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { useT, type StringKey } from '@/i18n/strings';
import { useFitPulseStore } from '@/state/useFitPulseStore';
import {
  buildBackupDocument,
  parseBackupDocument,
  type BackupModuleId
} from './backupModules';

const MODULE_OPTIONS: Array<{ id: BackupModuleId; titleKey: StringKey }> = [
  { id: 'profile', titleKey: 'backupModuleProfile' },
  { id: 'nutrition', titleKey: 'backupModuleNutrition' },
  { id: 'workout', titleKey: 'backupModuleWorkout' },
  { id: 'body', titleKey: 'backupModuleBody' }
];

/**
 * Модульная резервная копия (по мотивам free-fitness): перед экспортом
 * выбираем модули; при импорте каждый модуль восстанавливается отдельно
 * через hydrate. Старые полные дампы распознаются и тоже принимаются.
 */
export default function BackupCard({ onAfterRestore }: { onAfterRestore?: () => void }) {
  const colors = useThemeColors();
  const t = useT();
  const hydrate = useFitPulseStore((s) => s.hydrate);
  const [selected, setSelected] = useState<Record<BackupModuleId, boolean>>({
    profile: true,
    nutrition: true,
    workout: true,
    body: true
  });

  const selectedIds = MODULE_OPTIONS.filter((m) => selected[m.id]).map((m) => m.id);

  function toggle(id: BackupModuleId) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function exportBackup() {
    if (selectedIds.length === 0) return;
    try {
      const doc = buildBackupDocument(selectedIds, useFitPulseStore.getState());
      const stamp = new Date().toISOString().slice(0, 10);
      const path = FileSystem.documentDirectory + 'fitpulse_backup_' + stamp + '.json';
      await FileSystem.writeAsStringAsync(path, JSON.stringify(doc, null, 2));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: 'application/json' });
      } else {
        Alert.alert(t('profileExport'), t('profileExportDone', { path }));
      }
    } catch (e) {
      Alert.alert(t('profileExportError'), String(e));
    }
  }

  async function importBackup() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (result.canceled || !result.assets?.[0]) return;
      const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const parsed = parseBackupDocument(content);
      if (parsed.kind === 'legacy') {
        hydrate(parsed.data as unknown as Parameters<typeof hydrate>[0]);
        Alert.alert(t('profileImport'), t('profileImportDone'));
      } else {
        const restored: string[] = [];
        for (const opt of MODULE_OPTIONS) {
          const fields = parsed.modules[opt.id];
          if (!fields) continue;
          hydrate(fields as unknown as Parameters<typeof hydrate>[0]);
          restored.push(t(opt.titleKey));
        }
        Alert.alert(t('profileImport'), t('backupRestored', { modules: restored.join(', ') }));
      }
      onAfterRestore?.();
    } catch (e) {
      Alert.alert(
        t('profileImportError'),
        e instanceof Error ? e.message : t('profileImportBadFile')
      );
    }
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
      <Text style={[styles.title, { color: colors.paper }]}>{t('backupTitle')}</Text>
      <View style={styles.chipRow}>
        {MODULE_OPTIONS.map((opt) => {
          const on = selected[opt.id];
          return (
            <TouchableOpacity
              key={opt.id}
              style={[
                styles.chip,
                { borderColor: colors.lineStrong, backgroundColor: colors.ink },
                on && { borderColor: colors.lime, backgroundColor: colors.limeDim }
              ]}
              onPress={() => toggle(opt.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={t(opt.titleKey)}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: colors.paperDim },
                  on && { color: colors.lime }
                ]}
              >
                {t(opt.titleKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.exportBtn, { backgroundColor: colors.lime, opacity: selectedIds.length > 0 ? 1 : 0.4 }]}
          disabled={selectedIds.length === 0}
          onPress={() => void exportBackup()}
          accessibilityRole="button"
          accessibilityLabel={t('backupExportBtn')}
        >
          <Text style={[styles.btnText, { color: colors.ink }]}>{t('backupExportBtn')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.importBtn, { borderColor: colors.lineStrong, backgroundColor: colors.ink }]}
          onPress={() => void importBackup()}
          accessibilityRole="button"
          accessibilityLabel={t('backupImportBtn')}
        >
          <Text style={[styles.btnText, { color: colors.paper }]}>{t('backupImportBtn')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    marginBottom: spacing.sm
  },
  title: { fontSize: 15, fontFamily: fonts.bodySemi, marginBottom: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.control,
    borderWidth: 1
  },
  chipText: { fontSize: 12, fontFamily: fonts.bodySemi },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  exportBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.control,
    alignItems: 'center'
  },
  importBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.control,
    borderWidth: 1,
    alignItems: 'center'
  },
  btnText: { fontSize: 13, fontFamily: fonts.bodySemi }
});
