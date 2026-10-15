import { useMemo } from "react";
import { Box } from "@/components/ui/box";
import { Tag, Tags } from "@/components/ui/tag";

export type ExerciseReferenceMeta = {
  name: string;
  gifUrl?: string | null;
  thumbUrl?: string | null;
  instructionsEn?: string[];
  secondaryMuscles?: string[];
  target?: string | null;
  bodyPart?: string | null;
  attribution?: string | null;
};

/**
 * Offline-friendly exercise reference: GIF (or thumb) + English steps.
 * For use beside Excalidraw canvas or in the player.
 */
export function ExerciseReferencePanel({ meta }: { meta: ExerciseReferenceMeta | null }) {
  const media = useMemo(() => meta?.gifUrl || meta?.thumbUrl || null, [meta]);
  if (!meta) return null;

  return (
    <Box className="fp-block space-y-3">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-accent">
          Reference · offline
        </p>
        <h3 className="mt-1 font-display text-lg text-fg">{meta.name}</h3>
      </div>

      {media ? (
        <div className="overflow-hidden rounded-xl border border-border bg-surface-2">
          <img
            src={media}
            alt={meta.name}
            className="mx-auto max-h-48 w-full object-contain"
            loading="lazy"
          />
        </div>
      ) : null}

      {(meta.secondaryMuscles?.length || meta.target || meta.bodyPart) && (
        <Tags>
          {meta.target ? <Tag tone="accent">{meta.target}</Tag> : null}
          {meta.bodyPart ? <Tag>{meta.bodyPart}</Tag> : null}
          {(meta.secondaryMuscles ?? []).slice(0, 4).map((m) => (
            <Tag key={m}>{m}</Tag>
          ))}
        </Tags>
      )}

      {meta.instructionsEn && meta.instructionsEn.length > 0 ? (
        <ol className="list-decimal space-y-1 pl-4 text-sm leading-snug text-muted">
          {meta.instructionsEn.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      ) : null}

      {meta.attribution ? (
        <p className="text-[10px] text-muted">{meta.attribution}</p>
      ) : null}
    </Box>
  );
}
