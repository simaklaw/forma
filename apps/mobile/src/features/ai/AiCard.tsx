import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { fonts, radius, spacing } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { useT } from '@/i18n/strings';
import { selectActiveProvider, useAiAssistantStore } from './useAiAssistantStore';
import AiAssistantModal from './AiAssistantModal';

/**
 * Карточка профиля: вход в BYOK ИИ-ассистента. Ключи и модель подключает сам
 * пользователь (любая OpenAI-совместимая платформа) — серверов FitPulse нет.
 */
export default function AiCard() {
  const colors = useThemeColors();
  const t = useT();
  const active = useAiAssistantStore(selectActiveProvider);
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[styles.row, { backgroundColor: colors.panel, borderColor: colors.line }]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('aiCardName')}
      >
        <Text style={[styles.name, { color: colors.paper }]}>{t('aiCardName')}</Text>
        <Text style={[styles.desc, { color: colors.paperFaint }]}>{t('aiCardDesc')}</Text>
        <Text
          style={[
            active ? styles.statusOn : styles.desc,
            { color: active ? colors.lime : colors.paperFaint }
          ]}
        >
          {active
            ? t('aiProviderActive', { name: active.label || active.model })
            : t('aiCardNotConfigured')}
        </Text>
      </TouchableOpacity>
      <AiAssistantModal visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    marginBottom: spacing.sm
  },
  name: { fontSize: 15, fontFamily: fonts.bodySemi },
  desc: { fontSize: 12, marginTop: 4 },
  statusOn: { fontSize: 12, marginTop: 4, fontFamily: fonts.bodySemi }
});
