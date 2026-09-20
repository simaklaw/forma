import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { isProfileComplete } from '@forma/core';
import { colors, fonts, radius, spacing } from '@/core/theme/tokens';
import type { Sex } from '@/engines/MetabolicEngine';

export type ProfileFormValues = {
  weight: number | null;
  height: number | null;
  age: number | null;
  sex: Sex | null;
};

type Props = {
  initial: ProfileFormValues;
  submitLabel: string;
  onSubmit: (values: ProfileFormValues) => void;
};

export function ProfileForm({ initial, submitLabel, onSubmit }: Props) {
  const [weight, setWeight] = useState(initial.weight != null ? String(initial.weight) : '');
  const [height, setHeight] = useState(initial.height != null ? String(initial.height) : '');
  const [age, setAge] = useState(initial.age != null ? String(initial.age) : '');
  const [sex, setSex] = useState<Sex | null>(initial.sex);

  const draft = useMemo(() => {
    const w = Number(weight.replace(',', '.'));
    const h = Number(height.replace(',', '.'));
    const a = Number.parseInt(age, 10);
    return {
      weight: Number.isFinite(w) && w > 0 ? w : null,
      height: Number.isFinite(h) && h > 0 ? h : null,
      age: Number.isInteger(a) && a > 0 ? a : null,
      sex
    };
  }, [weight, height, age, sex]);

  const ready = isProfileComplete({
    weightKg: draft.weight,
    heightCm: draft.height,
    age: draft.age,
    gender: draft.sex
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.sexRow}>
        {(['male', 'female'] as const).map((g) => (
          <TouchableOpacity
            key={g}
            style={[styles.sexBtn, sex === g && styles.sexBtnOn]}
            onPress={() => setSex(g)}
            accessibilityRole="button"
          >
            <Text style={[styles.sexText, sex === g && styles.sexTextOn]}>
              {g === 'male' ? 'Мужской' : 'Женский'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Field label="Вес, кг" value={weight} onChange={setWeight} placeholder="78" />
      <Field label="Рост, см" value={height} onChange={setHeight} placeholder="178" />
      <Field label="Возраст" value={age} onChange={setAge} placeholder="28" />
      <TouchableOpacity
        style={[styles.cta, !ready && styles.ctaDisabled]}
        disabled={!ready}
        onPress={() => ready && onSubmit(draft)}
        accessibilityRole="button"
      >
        <Text style={styles.ctaText}>{submitLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.paperFaint}
        keyboardType="numeric"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  sexRow: { flexDirection: 'row', gap: spacing.sm },
  sexBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sexBtnOn: { borderColor: colors.lime, backgroundColor: colors.limeDim },
  sexText: { color: colors.paperDim, fontFamily: fonts.bodySemi, fontSize: 14 },
  sexTextOn: { color: colors.lime },
  field: { gap: 6 },
  label: {
    color: colors.paperFaint,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.control,
    backgroundColor: colors.panelRaised,
    color: colors.paper,
    paddingHorizontal: 12,
    fontFamily: fonts.mono,
    fontSize: 20
  },
  cta: {
    marginTop: spacing.sm,
    height: 52,
    borderRadius: radius.control,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center'
  },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { color: colors.ink, fontFamily: fonts.mono, fontSize: 18 }
});
