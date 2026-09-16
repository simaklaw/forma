# Web workout-session adapter

Bridges Forma web player to `@forma/workout-domain` (same aggregate as FitPulse mobile).

| Layer | Web | Mobile |
|-------|-----|--------|
| Domain | `@forma/workout-domain` | same |
| Persistence | in-memory (`WebMemorySessionRepository`) | SQLite + memory |
| UI state | Zustand `session` (primary for player UX) | dual-write + projections |

`dualWrite.ts` records prepare/start/complete_set/complete|abandon **best-effort**. Sequential domain rules may skip sets if the player jumps exercises out of order (web player still allows free navigation).

Next: localStorage persistence of domain journal, sequential UI gate parity with mobile.
