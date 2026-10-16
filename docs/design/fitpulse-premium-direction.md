# FitPulse — Premium Performance design direction

## Intent
Polish, don't rebuild. Preserve FitPulse's existing dark/light themes and workout/nutrition logic while making the app feel more intentional, contemporary, and premium.

## Signature
- **Mood:** performance studio, precision, calm confidence.
- **Base:** Ink `#0B0F14`, panel `#121820`, raised surface `#182028`.
- **Action accent:** electric mint `#00E5A8`; reserve it for the primary action, active navigation, and meaningful progress.
- **Typography:** Barlow Condensed for high-impact numbers/headlines; Inter for body text and controls.
- **Surfaces:** rounded 16–22px cards, low-contrast borders, layered charcoal surfaces; avoid excessive pills and thick outlines.
- **Icons:** consistent 1.7px line icons rather than emoji, to avoid Android font/rendering differences.
- **Motion:** subtle press feedback and restrained progress animation; respect reduced-motion/accessibility preferences.

## What this polish changes
1. Bottom navigation now uses a consistent set of native SVG line icons, a quiet active dot, and more deliberate spacing.
2. Workout header uses a cleaner editorial label, stronger title hierarchy, and less redundant metadata.
3. Workout hero card has a more elevated surface, softer larger corners, improved typography, and more breathing room.
4. Workout metrics are slightly more legible; active controls remain mint so primary actions are easy to find.

## Guardrails
- No new dependencies.
- No workout, nutrition, persistence, or calculation logic changes.
- Do not turn every card green or add decorative gradients everywhere.
- Keep contrast and tap targets comfortable on small Android screens.
- Treat `fitpulse-premium-concept.svg` as a visual direction board, not a claim that every concept metric is live app data.

## Follow-up visual QA
Review on a narrow Android viewport in both dark and light themes. Check bottom safe-area spacing, tab labels, long localized workout names, contrast, and existing navigation behavior before merging.
