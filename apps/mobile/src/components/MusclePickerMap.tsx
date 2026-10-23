import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { fonts } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import { useLanguageStore } from '@/i18n/useLanguageStore';
import { useT } from '@/i18n/strings';
import {
  MUSCLE_MAP_BODY_PATHS,
  MUSCLE_MAP_GROUPS,
  MUSCLE_MAP_VIEWBOX
} from './musclePickerShapes.generated';
import { muscleGroupLabel, type MusclePickerGroupKey } from './musclePickerGroups';

interface MusclePickerMapProps {
  selected: readonly MusclePickerGroupKey[];
  onToggleGroup: (key: MusclePickerGroupKey) => void;
}

/**
 * Интерактивная карта мышц: тап по группе фильтрует справочник.
 * Геометрия — порт SVG из Snouzy/workout-cool (MIT), см. musclePickerShapes.generated.
 */
export default function MusclePickerMap({ selected, onToggleGroup }: MusclePickerMapProps) {
  const colors = useThemeColors();
  const t = useT();
  const lang = useLanguageStore((s) => s.lang);
  const viewBox = '0 0 ' + MUSCLE_MAP_VIEWBOX.width + ' ' + MUSCLE_MAP_VIEWBOX.height;

  return (
    <View>
      <Svg
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        style={styles.svg}
        accessibilityLabel={t('panelMuscleMapA11y')}
      >
        {MUSCLE_MAP_BODY_PATHS.map((p, i) =>
          p.kind === 'outline' ? (
            <Path
              key={'body-' + i}
              d={p.d}
              fill={colors.panel}
              stroke={colors.lineStrong}
              strokeWidth={1}
            />
          ) : (
            <Path key={'body-' + i} d={p.d} fill={colors.lineStrong} />
          )
        )}
        {MUSCLE_MAP_GROUPS.map((group) => {
          const groupKey = group.key as MusclePickerGroupKey;
          const isGroupSelected = selected.includes(groupKey);
          const press = { onPress: () => onToggleGroup(groupKey) } as { onPress?: () => void };
          return (
            <React.Fragment key={group.key}>
              {group.shapes.map((shape, j) => {
                if (shape.kind === 'detail') {
                  return <Path key={'s-' + j} d={shape.d} fill={colors.lineStrong} />;
                }
                if (shape.kind === 'hit') {
                  return (
                    <Path
                      key={'s-' + j}
                      d={shape.d}
                      fill={isGroupSelected ? colors.lime : colors.paperDim}
                      fillOpacity={isGroupSelected ? 0.18 : 0.01}
                      {...press}
                    />
                  );
                }
                return (
                  <Path
                    key={'s-' + j}
                    d={shape.d}
                    fill={isGroupSelected ? colors.lime : colors.paperDim}
                    stroke={isGroupSelected ? colors.lime : undefined}
                    strokeWidth={1}
                    {...press}
                  />
                );
              })}
            </React.Fragment>
          );
        })}
      </Svg>
      <Text style={[styles.caption, { color: colors.paperDim }]}>
        {selected.length > 0
          ? selected.map((key) => muscleGroupLabel(key, lang)).join(', ')
          : t('panelMuscleMapHint')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  svg: {
    width: '100%',
    aspectRatio: MUSCLE_MAP_VIEWBOX.width / MUSCLE_MAP_VIEWBOX.height
  },
  caption: { fontFamily: fonts.mono, fontSize: 11, marginTop: 6, textAlign: 'center' }
});
