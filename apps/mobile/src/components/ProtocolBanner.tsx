import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fonts, radius, spacing, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { useFitPulseStore } from '@/state/useFitPulseStore';
import { isProtocolActive, detectWeightPlateau } from '@/engines/MetabolicEngine';

export default function ProtocolBanner() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const metabolic = useFitPulseStore((s) => s.metabolic);
  const weightHistory = useFitPulseStore((s) => s.weightHistory);
  const goal = useFitPulseStore((s) => s.profile.goal);
  const triggerRefeed = useFitPulseStore((s) => s.triggerRefeed);
  const triggerDietBreak = useFitPulseStore((s) => s.triggerDietBreak);

  const active = isProtocolActive(metabolic);
  const suspected = !active && detectWeightPlateau(weightHistory, goal);

  let statusText = 'Протокол не активен · цель питания рассчитывается как обычно';
  if (active && metabolic.endsAt) {
    const hoursLeft = Math.ceil((metabolic.endsAt - Date.now()) / (1000 * 60 * 60));
    const label = metabolic.type === 'refeed' ? 'Рефид' : 'Diet Break';
    const remain = hoursLeft > 48 ? `${Math.ceil(hoursLeft / 24)} дн.` : `${hoursLeft} ч.`;
    statusText = `${label} активен · осталось ${remain} · цель поднята до TDEE`;
  } else if (suspected) {
    statusText = 'Похоже на плато — вес почти не меняется при дефиците. Стоит запустить протокол.';
  }

  return (
    <View>
      <View style={[styles.status, (active || suspected) && styles.statusActive]}>
        <Text style={styles.eyebrow}>FITPULSE · метаболизм</Text>
        <Text style={[styles.statusText, (active || suspected) && styles.statusTextActive]}>
          {statusText}
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, active && styles.btnDisabled]}
          disabled={active}
          onPress={triggerRefeed}
          accessibilityRole="button"
        >
          <Text style={styles.btnTitle}>Рефид · 24ч</Text>
          <Text style={styles.btnSub}>Цель → TDEE, углеводы</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, active && styles.btnDisabled]}
          disabled={active}
          onPress={triggerDietBreak}
          accessibilityRole="button"
        >
          <Text style={styles.btnTitle}>Diet Break · 14 дней</Text>
          <Text style={styles.btnSub}>Цель → TDEE, сброс адаптации</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  status: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    backgroundColor: colors.panel,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  statusActive: { borderColor: colors.ember },
  eyebrow: {
    color: colors.lime,
    fontSize: 10,
    fontFamily: fonts.bodySemi,
    letterSpacing: 0.8,
    marginBottom: 6
  },
  statusText: { color: colors.paperDim, fontSize: 12, lineHeight: 17, fontFamily: fonts.body },
  statusTextActive: { color: colors.paper },
  actions: { flexDirection: 'row', gap: 10, marginBottom: spacing.xl },
  btn: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.control,
    backgroundColor: colors.panel
  },
  btnDisabled: { opacity: 0.35 },
  btnTitle: { color: colors.paper, fontSize: 12.5, fontFamily: fonts.bodySemi, marginBottom: 4 },
  btnSub: { color: colors.paperFaint, fontSize: 10, fontFamily: fonts.body }
});
}
