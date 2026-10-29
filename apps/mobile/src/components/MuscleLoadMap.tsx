/**
 * MuscleLoadMap — тепловая карта недельной нагрузки по мышцам: раскраска
 * групп тела по статусу MEV/MRV (недобор — циан, оптимум — акцент,
 * junk volume — предупреждение). Геометрия общая с MusclePickerMap
 * (порт SVG из Snouzy/workout-cool, MIT), данные — muscleVolumeStats
 * из @forma/core. Чистый оффлайн-рендер, без внешних API.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { fonts, type ColorTokens } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { useLanguageStore } from '@/i18n/useLanguageStore';
import { useT } from '@/i18n/strings';
import type { MuscleLoadStatus } from '@forma/core';
import {
  MUSCLE_MAP_BODY_PATHS,
  MUSCLE_MAP_GROUPS,
  MUSCLE_MAP_VIEWBOX
} from './musclePickerShapes.generated';
import { muscleGroupLabel, type MusclePickerGroupKey } from './musclePickerGroups';
import { groupLoads, type MuscleLoadEntry } from './muscleLoadGroups';

interface Props {
  loads: readonly MuscleLoadEntry[];
}

/** Цвет статуса: недобор — инфо-акцент, оптимум — положительный, junk — предупреждение. */
function statusColor(status: MuscleLoadStatus, colors: ColorTokens): string {
  if (status === 'optimal') return colors.lime;
  if (status === 'junk') return colors.ember;
  return colors.cyan;
}

/** Группы без данных отрисовываются как невыбранные в MusclePickerMap. */
export default function MuscleLoadMap({ loads }: Props) {
  const colors = useThemeColors();
  const t = useT();
  const lang = useLanguageStore((s) => s.lang);
  const groups = groupLoads(loads);
  const byGroup = new Map(groups.map((g) => [g.group, g]));
  const viewBox = '0 0 ' + MUSCLE_MAP_VIEWBOX.width + ' ' + MUSCLE_MAP_VIEWBOX.height;

  const legend = [
    { status: 'under', label: t('volumeStatusUnder') },
    { status: 'optimal', label: t('volumeStatusOptimal') },
    { status: 'junk', label: t('volumeStatusJunk') }
  ] as const;

  const a11y =
    groups.length > 0
      ? groups.map((g) => `${muscleGroupLabel(g.group, lang)}: ${g.weeklySets}`).join(", ")
      : t('volumeKicker');

  return (
    <View>
      <Svg
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        style={styles.svg}
        accessibilityLabel={a11y}
      >
        {MUSCLE_MAP_BODY_PATHS.map((p, i) =>
          p.kind === 'outline' ? (
            <Path
              key={'body-' + i}
              d={p.d}
              fill={colors.surfaceContainer}
              stroke={colors.lineStrong}
              strokeWidth={1}
            />
          ) : (
            <Path key={'body-' + i} d={p.d} fill={colors.lineStrong} />
          )
        )}
        {MUSCLE_MAP_GROUPS.map((group) => {
          const load = byGroup.get(group.key as MusclePickerGroupKey);
          const active = load != null;
          const fill = load ? statusColor(load.status, colors) : colors.paperDim;
          return (
            <React.Fragment key={group.key}>
              {group.shapes.map((shape, j) => {
                if (shape.kind === 'detail') {
                  return <Path key={'s-' + j} d={shape.d} fill={active ? fill : colors.lineStrong} />;
                }
                if (shape.kind === 'hit') {
                  return (
                    <Path key={'s-' + j} d={shape.d} fill={fill} fillOpacity={active ? 0.16 : 0.01} />
                  );
                }
                return (
                  <Path
                    key={'s-' + j}
                    d={shape.d}
                    fill={fill}
                    stroke={active ? fill : undefined}
                    strokeWidth={1}
                  />
                );
              })}
            </React.Fragment>
          );
        })}
      </Svg>
      <View style={styles.legend}>
        {legend.map((item) => (
          <View key={item.status} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: statusColor(item.status, colors) }]} />
            <Text style={[styles.legendText, { color: colors.paperFaint }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  svg: {
    width: '100%',
    aspectRatio: MUSCLE_MAP_VIEWBOX.width / MUSCLE_MAP_VIEWBOX.height
  },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  swatch: { width: 8, height: 8, borderRadius: 2 },
  legendText: { fontFamily: fonts.mono, fontSize: 10 }
});
