import { useEffect, useState } from 'react';
import type { Sex } from '@/engines/MetabolicEngine';
import type { ExerciseMediaKey } from './exerciseMedia';
import { ExerciseMediaService } from './ExerciseMediaService';
import {
  genderedVideoUrlForMediaKey,
  type ExercisePresentationSex
} from './exerciseGenderedMedia';

type PlaybackSource = { uri: string } | number;

interface ResolvedSource {
  key: string;
  source: PlaybackSource | null;
}

/**
 * Exact gendered media takes priority only for an exercise/sex pair present in
 * the verified manifest. Until it resolves, callers should not show the old
 * generic clip for that same pair.
 */
export function useGenderedExerciseVideo(
  mediaKey: ExerciseMediaKey | undefined,
  sex: Sex | null
): { available: boolean; source: PlaybackSource | undefined } {
  const resolvedSex =
    sex === 'male' || sex === 'female' ? (sex as ExercisePresentationSex) : null;
  const url = genderedVideoUrlForMediaKey(mediaKey, resolvedSex);
  const key = mediaKey && resolvedSex && url ? `${mediaKey}:${resolvedSex}` : null;
  const [resolved, setResolved] = useState<ResolvedSource | null>(null);

  useEffect(() => {
    let active = true;
    setResolved(null);
    if (!mediaKey || !resolvedSex || !url) {
      return () => {
        active = false;
      };
    }

    void ExerciseMediaService.getGenderedPlaybackSource(mediaKey, resolvedSex)
      .then((source) => {
        if (active) setResolved({ key: `${mediaKey}:${resolvedSex}`, source });
      })
      .catch(() => {
        if (active) setResolved({ key: `${mediaKey}:${resolvedSex}`, source: null });
      });

    return () => {
      active = false;
    };
  }, [mediaKey, resolvedSex, url]);

  const matching = key != null && resolved?.key === key ? resolved.source ?? undefined : undefined;
  return { available: url != null, source: matching };
}
