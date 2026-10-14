/**
 * AUTO-GENERATED — ExerciseDB-family GIFs (exercise-library / EDB media set).
 * Coverage 77/96. Policy: MP4 → GIF → none.
 * Re-run: node scripts/import-exercisedb-gifs.mjs
 */

export interface ExerciseGifManifestEntry {
  id: string;
  gifUrl: string;
  thumbUrl?: string;
  sourceName: string;
  matchScore: number;
  instructionsRu: string | null;
  attribution: string;
  sourceUrl: string;
}

const BASE = 'https://raw.githubusercontent.com/mohamedatef90/exercise-library/main/gifs/';
const ATTR = 'Exercise GIFs (ExerciseDB-style)';
const SRC = 'https://github.com/mohamedatef90/exercise-library';

const RAW: { id: string; path: string; name: string; score: number }[] = [
  {"id":"lib-3-4-sit-up","path":"2gPfomN.gif","name":"3/4 sit-up","score":1},
  {"id":"lib-90-90-hamstring","path":"yRYyfdA.gif","name":"exercise ball seated hamstring stretch","score":0.95},
  {"id":"lib-air-bike","path":"1ZFqTDN.gif","name":"air bike","score":1},
  {"id":"lib-all-fours-quad-stretch","path":"qBcKorM.gif","name":"all fours squad stretch","score":0.71},
  {"id":"lib-alternate-heel-touchers","path":"qaZVsGk.gif","name":"alternate heel touchers","score":1},
  {"id":"lib-band-good-morning","path":"XlZ4lAC.gif","name":"barbell good morning","score":1},
  {"id":"lib-band-good-morning-pull-through","path":"XlZ4lAC.gif","name":"barbell good morning","score":1},
  {"id":"lib-band-hip-adductions","path":"hBGWILP.gif","name":"cable hip adduction","score":1},
  {"id":"lib-band-pull-apart","path":"VtTbiP3.gif","name":"band pull through","score":1},
  {"id":"lib-body-up","path":"U6G2gk9.gif","name":"body-up","score":1},
  {"id":"lib-bodyweight-squat","path":"TUZLh71.gif","name":"band squat","score":1},
  {"id":"lib-bottoms-up","path":"CI6baTY.gif","name":"bottoms-up","score":1},
  {"id":"lib-butt-lift-bridge","path":"qKBpF7I.gif","name":"barbell glute bridge","score":1},
  {"id":"lib-butt-ups","path":"qcNN2FN.gif","name":"butt-ups","score":1},
  {"id":"lib-calf-raises-with-bands","path":"ywaNfuh.gif","name":"smith reverse calf raises","score":0.95},
  {"id":"lib-clock-push-up","path":"CMAxnsG.gif","name":"clock push-up","score":1},
  {"id":"lib-cocoons","path":"SLKj2pX.gif","name":"cocoons","score":1},
  {"id":"lib-cross-body-crunch","path":"rbu5UUb.gif","name":"cross body crunch","score":1},
  {"id":"lib-cross-over-with-bands","path":"OQ1otBN.gif","name":"cable cross-over lateral pulldown","score":0.95},
  {"id":"lib-crunch-hands-overhead","path":"kjJ3VoQ.gif","name":"crunch (hands overhead)","score":1},
  {"id":"lib-crunches","path":"TFqbd8t.gif","name":"crunch floor","score":1},
  {"id":"lib-dead-bug","path":"iny3m5y.gif","name":"dead bug","score":1},
  {"id":"lib-dips-triceps-version","path":"7aVz15j.gif","name":"triceps dips floor","score":0.95},
  {"id":"lib-double-leg-butt-kick","path":"J9zIWig.gif","name":"walking high knees lunge","score":1},
  {"id":"lib-elbow-to-knee","path":"jvp6DiD.gif","name":"elbow-to-knee","score":1},
  {"id":"lib-external-rotation-with-band","path":"FWdVhcW.gif","name":"cable standing shoulder external rotation","score":0.95},
  {"id":"lib-flat-bench-leg-pull-in","path":"WhuFnR7.gif","name":"lying leg raise flat bench","score":0.57},
  {"id":"lib-freehand-jump-squat","path":"1gFNTZV.gif","name":"barbell jump squat","score":1},
  {"id":"lib-glute-kickback","path":"HEJ6DIX.gif","name":"cable kickback","score":1},
  {"id":"lib-handstand-push-ups","path":"I4hDWkc.gif","name":"push-up","score":0.67},
  {"id":"lib-hip-circles-prone","path":"uL9CsKm.gif","name":"ankle circles","score":1},
  {"id":"lib-hip-extension-with-bands","path":"wSScovH.gif","name":"band bent-over hip extension","score":0.95},
  {"id":"lib-internal-rotation-with-band","path":"vIICElP.gif","name":"band lying hip internal rotation","score":0.95},
  {"id":"lib-jackknife-sit-up","path":"2gPfomN.gif","name":"3/4 sit-up","score":0.63},
  {"id":"lib-janda-sit-up","path":"2gPfomN.gif","name":"3/4 sit-up","score":0.63},
  {"id":"lib-knee-circles","path":"X7jbxra.gif","name":"circles knee stretch","score":0.95},
  {"id":"lib-lateral-raise-with-bands","path":"goJ6ezq.gif","name":"cable lateral raise","score":1},
  {"id":"lib-leg-pull-in","path":"UQr48Oi.gif","name":"pull-in (on stability ball)","score":0.63},
  {"id":"lib-lower-back-curl","path":"ANbbry2.gif","name":"lower back curl","score":1},
  {"id":"lib-lying-prone-quadriceps","path":"YUYAMEj.gif","name":"assisted prone lying quads stretch","score":0.63},
  {"id":"lib-monster-walk","path":"O95afRA.gif","name":"monster walk","score":1},
  {"id":"lib-oblique-crunches","path":"QUDd8WS.gif","name":"oblique crunches floor","score":0.95},
  {"id":"lib-oblique-crunches-on-the-floor","path":"QUDd8WS.gif","name":"oblique crunches floor","score":1},
  {"id":"lib-overhead-triceps","path":"5uFK1xr.gif","name":"barbell seated overhead triceps extension","score":0.95},
  {"id":"lib-plank","path":"5VXmnV5.gif","name":"bodyweight incline side plank","score":0.95},
  {"id":"lib-plyo-push-up","path":"Snj1wSv.gif","name":"plyo push up","score":1},
  {"id":"lib-push-up-to-side-plank","path":"KhHJ338.gif","name":"push-up to side plank","score":1},
  {"id":"lib-push-up-wide","path":"JmMVpR3.gif","name":"wide hand push up","score":1},
  {"id":"lib-push-ups-close-triceps-position","path":"x6KpKpq.gif","name":"close-grip push-up","score":1},
  {"id":"lib-pushups","path":"I4hDWkc.gif","name":"push-up","score":1},
  {"id":"lib-rear-leg-raises","path":"UGhRD1A.gif","name":"assisted lying leg raise with lateral throw down","score":0.63},
  {"id":"lib-reverse-crunch","path":"nCU1Ekp.gif","name":"reverse crunch","score":1},
  {"id":"lib-russian-twist","path":"XVDdcoj.gif","name":"russian twist","score":1},
  {"id":"lib-scissors-jump","path":"Eh2v5Iu.gif","name":"scissor jumps (male)","score":0.95},
  {"id":"lib-seated-biceps","path":"WgJnBH5.gif","name":"dumbbell seated biceps curl (on stability ball)","score":0.95},
  {"id":"lib-seated-front-deltoid","path":"3eGE2JC.gif","name":"dumbbell front raise","score":1},
  {"id":"lib-seated-glute","path":"DeDThfG.gif","name":"seated glute stretch","score":0.95},
  {"id":"lib-shoulder-press-with-bands","path":"peAeMR3.gif","name":"band shoulder press","score":1},
  {"id":"lib-side-bridge","path":"5VXmnV5.gif","name":"bodyweight incline side plank","score":0.95},
  {"id":"lib-side-jackknife","path":"2gPfomN.gif","name":"3/4 sit-up","score":0.63},
  {"id":"lib-side-leg-raises","path":"UGhRD1A.gif","name":"assisted lying leg raise with lateral throw down","score":0.63},
  {"id":"lib-single-arm-push-up","path":"MUic5zN.gif","name":"single arm push-up","score":1},
  {"id":"lib-single-leg-butt-kick","path":"J9zIWig.gif","name":"walking high knees lunge","score":1},
  {"id":"lib-single-leg-glute-bridge","path":"rmEukuS.gif","name":"single leg bridge with outstretched leg","score":0.95},
  {"id":"lib-sit-up","path":"2gPfomN.gif","name":"3/4 sit-up","score":0.95},
  {"id":"lib-speed-band-overhead-triceps","path":"5uFK1xr.gif","name":"barbell seated overhead triceps extension","score":0.95},
  {"id":"lib-spider-crawl","path":"P9GFBME.gif","name":"spider crawl push up","score":0.95},
  {"id":"lib-split-jump","path":"Eh2v5Iu.gif","name":"scissor jumps (male)","score":0.95},
  {"id":"lib-squats-with-bands","path":"TUZLh71.gif","name":"band squat","score":1},
  {"id":"lib-standing-hip-circles","path":"Kpajagk.gif","name":"cable standing hip extension","score":0.63},
  {"id":"lib-standing-towel-triceps-extension","path":"7HcfMBP.gif","name":"assisted standing triceps extension (with towel)","score":0.95},
  {"id":"lib-star-jump","path":"HtfCpfi.gif","name":"star jump (male)","score":0.95},
  {"id":"lib-superman","path":"4GqRrAk.gif","name":"superman push-up","score":0.95},
  {"id":"lib-toe-touchers","path":"RtyAsy1.gif","name":"arms apart circular toe touch (male)","score":0.95},
  {"id":"lib-tuck-crunch","path":"BMMolZ3.gif","name":"tuck crunch","score":1},
  {"id":"lib-upright-row-with-bands","path":"UDlhcO8.gif","name":"barbell upright row","score":1},
  {"id":"lib-wrist-circles","path":"2zNKRUB.gif","name":"wrist circles","score":1}
];

export const EXERCISE_GIF_MANIFEST: ExerciseGifManifestEntry[] = RAW.map((e) => ({
  id: e.id,
  gifUrl: BASE + e.path,
  sourceName: e.name,
  matchScore: e.score,
  instructionsRu: null,
  attribution: ATTR,
  sourceUrl: SRC,
}));

export function gifEntryForLibraryId(id: string): ExerciseGifManifestEntry | undefined {
  return EXERCISE_GIF_MANIFEST.find((e) => e.id === id);
}
