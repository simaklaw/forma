import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fonts, spacing, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { useFitPulseStore } from '@/state/useFitPulseStore';
import { isProtocolActive, detectWeightPlateau } from '@/engines/MetabolicEngine';
import Md3Card from './md3/Md3Card';
import Md3Button from './md3/Md3Button';

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
      <Md3Card
        variant={active || suspected ? 'outlined' : 'flat'}
        padding="md"
        style={[styles.statusWrap, (active || suspected) && { borderColor: colors.ember }]}
      >
        <Text style={styles.eyebrow}>FITPULSE · метаболизм</Text>
        <Text style={[styles.statusText, (active || suspected) && styles.statusTextActive]}>
          {statusText}
        </Text>
      </Md3Card>
      <View style={styles.actions}>
        <Md3Button variant="tonal" disabled={active} onPress={triggerRefeed} style={styles.btn}>
          <Text style={styles.btnTitle}>Рефид · 24ч</Text>
          <Text style={styles.btnSub}>Цель → TDEE, углеводы</Text>
        </Md3Button>
        <Md3Button variant="tonal" disabled={active} onPress={triggerDietBreak} style={styles.btn}>
          <Text style={styles.btnTitle}>Diet Break · 14 дней</Text>
          <Text style={styles.btnSub}>Цель → TDEE, сброс адаптации</Text>
        </Md3Button>
      </View>
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
  statusWrap: { marginBottom: spacing.md },
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
  btn: { flex: 1 },
  btnTitle: { color: colors.paper, fontSize: 12.5, fontFamily: fonts.bodySemi, marginBottom: 4 },
  btnSub: { color: colors.paperFaint, fontSize: 10, fontFamily: fonts.body }
});
}
