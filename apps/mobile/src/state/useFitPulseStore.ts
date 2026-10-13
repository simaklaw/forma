/**
 * useFitPulseStore — React Native Zustand store for FitPulse.
 * Metabolic math lives in @forma/core; this file is persistence + UI state.
 *
 * Profile fields start as null until onboarding. Domain calculateTargets is only
 * called when isProfileComplete (App gate / screen guards).
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MetabolicStatus,
  Targets,
  Goal,
  Sex,
  calculateTargets as calcTargets,
  detectWeightPlateau as detectPlateau,
  startRefeed,
  startDietBreak,
  type ProfileState
} from '@/engines/MetabolicEngine';
import { SetLogEntry, DayProgress, toDateKey, pruneOldSetLogs } from '@/engines/WorkoutStats';
import { uuidv7 } from '@/features/workout/data/ids';
import type { MuscleKey } from '@/components/MuscleMap';
import type { ImportedActivity } from '@forma/core';

export type { SetLogEntry, DayProgress } from '@/engines/WorkoutStats';

const SET_LOG_RETENTION_DAYS = 180;

// NOTE: Full file is large — this push is incomplete and must be fixed.
// See local /tmp/forma for complete source.
export const useFitPulseStore = create(() => ({}));
