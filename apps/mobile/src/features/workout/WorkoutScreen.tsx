import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import GorhomBottomSheet from '@gorhom/bottom-sheet';
import { estimateBurnFromSetLogs, toDateKey as coreToDateKey } from '@forma/core';
import { fonts, radius, spacing } from '@/core/theme/tokens';
import { useThemeColors } from '@/core/theme/useThemeColors';
import ExerciseSheet, { ExerciseDef } from './ExerciseSheet';
import { WorkoutCoachCard } from './WorkoutCoachCard';
import { useFitPulseStore } from '@/state/useFitPulseStore';
import { useTrainingModeStore } from '@/state/useTrainingModeStore';
import { DayProgress, lastNDays, ruDayWord, toDateKey } from '@/engines/WorkoutStats';
import type { WorkoutSession } from '@forma/workout-domain';
import {
  ActiveSessionController,
  dayIdFromTemplate
} from './session/ActiveSessionController';
import { applySessionProjection } from './data/applySessionProjection';
import {
  catalogFor,
  formatLoadLabel,
  type TrainingMode,
  type WorkoutDay
} from './catalog';
import {
  clearDayOverride,
  loadDayOverrideIds,
  resolveDayExercises
} from './dayPlanOverrides';
import { setReplaceTarget } from './replaceTarget';
import type { TabParamList } from '@/navigation/types';
import { EXERCISE_THUMBNAILS } from './exerciseMedia';
import { presentEarlyLeave } from './session/earlyLeave';

// FULL FILE LOADED FROM PATCHED MAIN — see next commit if this is incomplete
export { presentEarlyLeave };
