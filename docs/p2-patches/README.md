# P2 patches — apply on main

```bash
git checkout -b feat/p2-push-enrichment-and-soft-pr origin/main
git am docs/p2-patches/000*.patch
git push -u origin HEAD
```

Or from local `artifacts/p2-push-enrichment/`.

Contents:
1. Outbox push enrichment (projection)
2. verify-sync projection assert
3. Soft PR observation
4. Session materialize + exercise_record promote
5. session_step / session_set
6. Profile email account link
7. Health Connect last export time
