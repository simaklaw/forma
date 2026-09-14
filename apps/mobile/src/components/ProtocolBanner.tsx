import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fonts, spacing } from '@/core/theme/tokens';
import { useFitPulseStore } from '@/state/useFitPulseStore';
import { isProtocolActive, detectWeightPlateau } from '@/engines/MetabolicEngine';

export default function ProtocolBanner() {
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
        <Text style={[styles.statusText, (active || suspected) && styles.statusTextActive]}>{statusText}</Text>
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

const styles = StyleSheet.create({
  status: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.lineStrong,
    padding: 10,
    marginBottom: spacing.md
  },
  statusActive: { borderStyle: 'solid', borderColor: colors.ember },
  statusText: { color: colors.paperDim, fontSize: 11.5, lineHeight: 16, fontFamily: fonts.body },
  statusTextActive: { color: colors.paper },
  actions: { flexDirection: 'row', gap: 10, marginBottom: spacing.xl },
  btn: { flex: 1, padding: 12, borderWidth: 1, borderColor: colors.lineStrong },
  btnDisabled: { opacity: 0.35 },
  btnTitle: { color: colors.paper, fontSize: 12.5, fontFamily: fonts.bodySemi, marginBottom: 4 },
  btnSub: { color: colors.paperFaint, fontSize: 10, fontFamily: fonts.body }
});
