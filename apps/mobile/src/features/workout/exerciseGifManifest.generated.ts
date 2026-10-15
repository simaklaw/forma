/**
 * AUTO-GENERATED — unified GIF (hasan + exercise-library). Coverage 95/96.
 * Policy: MP4 → GIF → none. Prefer hasan; fall back to EDB-style host.
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

const HASAN = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/';
const EDB = 'https://raw.githubusercontent.com/mohamedatef90/exercise-library/main/gifs/';
const ATTR_H = '© Gym visual — https://gymvisual.com/';
const ATTR_E = 'Exercise GIFs (ExerciseDB-style)';
const SRC_H = 'https://github.com/hasaneyldrm/exercises-dataset';
const SRC_E = 'https://github.com/mohamedatef90/exercise-library';

const RAW: { id: string; p: string; n: string; s: number; v: string }[] = [
  {"id":"lib-3-4-sit-up","p":"videos/0001-2gPfomN.gif","n":"3/4 sit-up","s":1.0,"v":"h"},
  {"id":"lib-90-90-hamstring","p":"videos/1511-99rWm7w.gif","n":"hamstring stretch","s":1.0,"v":"h"},
  {"id":"lib-air-bike","p":"videos/0003-1ZFqTDN.gif","n":"air bike","s":1.0,"v":"h"},
  {"id":"lib-all-fours-quad-stretch","p":"videos/1512-qBcKorM.gif","n":"all fours squad stretch","s":0.71,"v":"h"},
  {"id":"lib-alternate-heel-touchers","p":"videos/0006-qaZVsGk.gif","n":"alternate heel touchers","s":1.0,"v":"h"},
  {"id":"lib-band-good-morning","p":"videos/0044-XlZ4lAC.gif","n":"barbell good morning","s":1.0,"v":"h"},
  {"id":"lib-band-good-morning-pull-through","p":"videos/0044-XlZ4lAC.gif","n":"barbell good morning","s":1.0,"v":"h"},
  {"id":"lib-band-hip-adductions","p":"videos/0168-hBGWILP.gif","n":"cable hip adduction","s":1.0,"v":"h"},
  {"id":"lib-band-pull-apart","p":"videos/0991-VtTbiP3.gif","n":"band pull through","s":1.0,"v":"h"},
  {"id":"lib-bent-knee-hip-raise","p":"videos/0484-196HJGw.gif","n":"hip raise (bent knee)","s":1.0,"v":"h"},
  {"id":"lib-body-up","p":"videos/0137-U6G2gk9.gif","n":"body-up","s":1.0,"v":"h"},
  {"id":"lib-bodyweight-squat","p":"videos/1004-TUZLh71.gif","n":"band squat","s":1.0,"v":"h"},
  {"id":"lib-bottoms-up","p":"videos/0138-CI6baTY.gif","n":"bottoms-up","s":1.0,"v":"h"},
  {"id":"lib-butt-lift-bridge","p":"videos/1409-qKBpF7I.gif","n":"barbell glute bridge","s":1.0,"v":"h"},
  {"id":"lib-butt-ups","p":"videos/0870-qcNN2FN.gif","n":"butt-ups","s":1.0,"v":"h"},
  {"id":"lib-calf-raises-with-bands","p":"videos/0763-ywaNfuh.gif","n":"smith reverse calf raises","s":0.95,"v":"h"},
  {"id":"lib-clock-push-up","p":"videos/0258-CMAxnsG.gif","n":"clock push-up","s":1.0,"v":"h"},
  {"id":"lib-cocoons","p":"videos/0260-SLKj2pX.gif","n":"cocoons","s":1.0,"v":"h"},
  {"id":"lib-cross-body-crunch","p":"videos/0262-rbu5UUb.gif","n":"cross body crunch","s":1.0,"v":"h"},
  {"id":"lib-cross-over-with-bands","p":"videos/0153-OQ1otBN.gif","n":"cable cross-over lateral pulldown","s":0.95,"v":"h"},
  {"id":"lib-crunch-hands-overhead","p":"videos/0267-kjJ3VoQ.gif","n":"crunch (hands overhead)","s":1.0,"v":"h"},
  {"id":"lib-crunches","p":"videos/0274-TFqbd8t.gif","n":"crunch floor","s":1.0,"v":"h"},
  {"id":"lib-dead-bug","p":"videos/0276-iny3m5y.gif","n":"dead bug","s":1.0,"v":"h"},
  {"id":"lib-dips-triceps-version","p":"videos/0815-7aVz15j.gif","n":"triceps dips floor","s":0.95,"v":"h"},
  {"id":"lib-double-leg-butt-kick","p":"videos/3655-J9zIWig.gif","n":"walking high knees lunge","s":1.0,"v":"h"},
  {"id":"lib-elbow-to-knee","p":"videos/0443-jvp6DiD.gif","n":"elbow-to-knee","s":1.0,"v":"h"},
  {"id":"lib-external-rotation-with-band","p":"videos/0235-FWdVhcW.gif","n":"cable standing shoulder external rotation","s":0.95,"v":"h"},
  {"id":"lib-fast-skipping","p":"videos/2612-e1e76I2.gif","n":"jump rope","s":1.0,"v":"h"},
  {"id":"lib-flat-bench-leg-pull-in","p":"videos/0570-OyoZ3Pu.gif","n":"leg pull in flat bench","s":1.0,"v":"h"},
  {"id":"lib-freehand-jump-squat","p":"videos/0514-LIlE5Tn.gif","n":"jump squat","s":1.0,"v":"h"},
  {"id":"lib-frog-sit-ups","p":"videos/2429-FFRP97T.gif","n":"frog crunch","s":1.0,"v":"h"},
  {"id":"lib-glute-kickback","p":"videos/0860-HEJ6DIX.gif","n":"cable kickback","s":1.0,"v":"h"},
  {"id":"lib-groiners","p":"videos/0630-RJgzwny.gif","n":"mountain climber","s":1.0,"v":"h"},
  {"id":"lib-handstand-push-ups","p":"videos/0471-rQxwMxO.gif","n":"handstand push-up","s":1.0,"v":"h"},
  {"id":"lib-hip-circles-prone","p":"videos/1368-uL9CsKm.gif","n":"ankle circles","s":1.0,"v":"h"},
  {"id":"lib-hip-extension-with-bands","p":"videos/0980-wSScovH.gif","n":"band bent-over hip extension","s":0.95,"v":"h"},
  {"id":"lib-hip-flexion-with-band","p":"videos/0228-Kpajagk.gif","n":"cable standing hip extension","s":0.63,"v":"h"},
  {"id":"lib-inchworm","p":"videos/1471-ZgsNQ6d.gif","n":"inchworm","s":1.0,"v":"h"},
  {"id":"lib-internal-rotation-with-band","p":"videos/0984-vIICElP.gif","n":"band lying hip internal rotation","s":0.95,"v":"h"},
  {"id":"lib-isometric-chest-squeezes","p":"videos/0500-11wrviz.gif","n":"isometric wipers","s":1.0,"v":"h"},
  {"id":"lib-isometric-neck-exercise-front-and-back","p":"videos/1718-4CBIBOM.gif","n":"barbell seated close grip behind neck triceps extension","s":0.47,"v":"h"},
  {"id":"lib-isometric-neck-exercise-sides","p":"videos/1403-x2chWLO.gif","n":"neck side stretch","s":0.95,"v":"h"},
  {"id":"lib-isometric-wipers","p":"videos/0500-11wrviz.gif","n":"isometric wipers","s":1.0,"v":"h"},
  {"id":"lib-jackknife-sit-up","p":"videos/0507-mbkgB44.gif","n":"jackknife sit-up","s":1.0,"v":"h"},
  {"id":"lib-janda-sit-up","p":"videos/0508-1GPHRyK.gif","n":"janda sit-up","s":1.0,"v":"h"},
  {"id":"lib-knee-circles","p":"videos/0257-X7jbxra.gif","n":"circles knee stretch","s":0.95,"v":"h"},
  {"id":"lib-knee-tuck-jump","p":"videos/1473-SaDOwk7.gif","n":"backward jump","s":0.47,"v":"h"},
  {"id":"lib-lateral-bound","p":"videos/1374-iPm26QU.gif","n":"box jump down with one leg stabilization","s":0.63,"v":"h"},
  {"id":"lib-lateral-raise-with-bands","p":"videos/0178-goJ6ezq.gif","n":"cable lateral raise","s":1.0,"v":"h"},
  {"id":"lib-leg-pull-in","p":"videos/0570-OyoZ3Pu.gif","n":"leg pull in flat bench","s":0.95,"v":"h"},
  {"id":"lib-lower-back-curl","p":"videos/1352-ANbbry2.gif","n":"lower back curl","s":1.0,"v":"h"},
  {"id":"lib-lying-crossover","p":"videos/1708-GxDwDX0.gif","n":"assisted lying calves stretch","s":0.63,"v":"h"},
  {"id":"lib-lying-glute","p":"videos/1708-GxDwDX0.gif","n":"assisted lying calves stretch","s":0.63,"v":"h"},
  {"id":"lib-lying-prone-quadriceps","p":"videos/1713-YUYAMEj.gif","n":"assisted prone lying quads stretch","s":0.63,"v":"h"},
  {"id":"lib-monster-walk","p":"videos/0628-O95afRA.gif","n":"monster walk","s":1.0,"v":"h"},
  {"id":"lib-oblique-crunches","p":"videos/0635-QUDd8WS.gif","n":"oblique crunches floor","s":0.95,"v":"h"},
  {"id":"lib-oblique-crunches-on-the-floor","p":"videos/0635-QUDd8WS.gif","n":"oblique crunches floor","s":1.0,"v":"h"},
  {"id":"lib-overhead-triceps","p":"videos/0092-5uFK1xr.gif","n":"barbell seated overhead triceps extension","s":0.95,"v":"h"},
  {"id":"lib-plank","p":"videos/3544-5VXmnV5.gif","n":"bodyweight incline side plank","s":0.95,"v":"h"},
  {"id":"lib-plyo-push-up","p":"videos/1306-Snj1wSv.gif","n":"plyo push up","s":1.0,"v":"h"},
  {"id":"lib-push-up-to-side-plank","p":"videos/0664-KhHJ338.gif","n":"push-up to side plank","s":1.0,"v":"h"},
  {"id":"lib-push-up-wide","p":"videos/1311-JmMVpR3.gif","n":"wide hand push up","s":1.0,"v":"h"},
  {"id":"lib-push-ups-close-triceps-position","p":"videos/0259-x6KpKpq.gif","n":"close-grip push-up","s":1.0,"v":"h"},
  {"id":"lib-pushups","p":"videos/0662-I4hDWkc.gif","n":"push-up","s":1.0,"v":"h"},
  {"id":"lib-pushups-close-and-wide-hand-positions","p":"videos/0662-I4hDWkc.gif","n":"push-up","s":1.0,"v":"h"},
  {"id":"lib-rear-leg-raises","p":"videos/0012-UGhRD1A.gif","n":"assisted lying leg raise with lateral throw down","s":0.63,"v":"h"},
  {"id":"lib-reverse-crunch","p":"videos/0872-nCU1Ekp.gif","n":"reverse crunch","s":1.0,"v":"h"},
  {"id":"lib-rocket-jump","p":"videos/1472-uZKq7lo.gif","n":"forward jump","s":1.0,"v":"h"},
  {"id":"lib-russian-twist","p":"videos/0687-XVDdcoj.gif","n":"russian twist","s":1.0,"v":"h"},
  {"id":"lib-scissor-kick","p":"videos/0459-UVo2Qs2.gif","n":"flutter kicks","s":1.0,"v":"h"},
  {"id":"lib-scissors-jump","p":"videos/3219-Eh2v5Iu.gif","n":"scissor jumps (male)","s":0.95,"v":"h"},
  {"id":"lib-seated-biceps","p":"videos/0390-WgJnBH5.gif","n":"dumbbell seated biceps curl (on stability ball)","s":0.95,"v":"h"},
  {"id":"lib-seated-front-deltoid","p":"videos/0310-3eGE2JC.gif","n":"dumbbell front raise","s":1.0,"v":"h"},
  {"id":"lib-seated-glute","p":"videos/1424-DeDThfG.gif","n":"seated glute stretch","s":0.95,"v":"h"},
  {"id":"lib-shoulder-press-with-bands","p":"videos/0997-peAeMR3.gif","n":"band shoulder press","s":1.0,"v":"h"},
  {"id":"lib-side-bridge","p":"videos/3544-5VXmnV5.gif","n":"bodyweight incline side plank","s":0.95,"v":"h"},
  {"id":"lib-side-jackknife","p":"videos/0507-mbkgB44.gif","n":"jackknife sit-up","s":1.0,"v":"h"},
  {"id":"lib-side-leg-raises","p":"videos/0012-UGhRD1A.gif","n":"assisted lying leg raise with lateral throw down","s":0.63,"v":"h"},
  {"id":"lib-single-arm-push-up","p":"videos/0725-MUic5zN.gif","n":"single arm push-up","s":1.0,"v":"h"},
  {"id":"lib-single-leg-butt-kick","p":"videos/3655-J9zIWig.gif","n":"walking high knees lunge","s":1.0,"v":"h"},
  {"id":"lib-single-leg-glute-bridge","p":"videos/3645-rmEukuS.gif","n":"single leg bridge with outstretched leg","s":0.95,"v":"h"},
  {"id":"lib-sit-up","p":"videos/1758-aumB2IV.gif","n":"assisted sit-up","s":1.0,"v":"h"},
  {"id":"lib-speed-band-overhead-triceps","p":"videos/0092-5uFK1xr.gif","n":"barbell seated overhead triceps extension","s":0.95,"v":"h"},
  {"id":"lib-spider-crawl","p":"videos/0778-P9GFBME.gif","n":"spider crawl push up","s":0.95,"v":"h"},
  {"id":"lib-split-jump","p":"videos/3219-Eh2v5Iu.gif","n":"scissor jumps (male)","s":0.95,"v":"h"},
  {"id":"lib-squats-with-bands","p":"videos/1004-TUZLh71.gif","n":"band squat","s":1.0,"v":"h"},
  {"id":"lib-standing-hip-circles","p":"videos/0228-Kpajagk.gif","n":"cable standing hip extension","s":0.63,"v":"h"},
  {"id":"lib-standing-long-jump","p":"videos/1472-uZKq7lo.gif","n":"forward jump","s":1.0,"v":"h"},
  {"id":"lib-standing-towel-triceps-extension","p":"videos/0018-7HcfMBP.gif","n":"assisted standing triceps extension (with towel)","s":1.0,"v":"h"},
  {"id":"lib-star-jump","p":"videos/3223-HtfCpfi.gif","n":"star jump (male)","s":0.95,"v":"h"},
  {"id":"lib-superman","p":"videos/0803-4GqRrAk.gif","n":"superman push-up","s":0.95,"v":"h"},
  {"id":"lib-toe-touchers","p":"videos/3214-RtyAsy1.gif","n":"arms apart circular toe touch (male)","s":0.95,"v":"h"},
  {"id":"lib-tuck-crunch","p":"videos/0871-BMMolZ3.gif","n":"tuck crunch","s":1.0,"v":"h"},
  {"id":"lib-upright-row-with-bands","p":"videos/0120-UDlhcO8.gif","n":"barbell upright row","s":1.0,"v":"h"},
  {"id":"lib-wrist-circles","p":"videos/1428-2zNKRUB.gif","n":"wrist circles","s":1.0,"v":"h"}
];

export const EXERCISE_GIF_MANIFEST: ExerciseGifManifestEntry[] = RAW.map((e) => ({
  id: e.id,
  gifUrl: (e.v === 'h' ? HASAN : EDB) + e.p,
  sourceName: e.n,
  matchScore: e.s,
  instructionsRu: null,
  attribution: e.v === 'h' ? ATTR_H : ATTR_E,
  sourceUrl: e.v === 'h' ? SRC_H : SRC_E,
}));

export function gifEntryForLibraryId(id: string): ExerciseGifManifestEntry | undefined {
  return EXERCISE_GIF_MANIFEST.find((e) => e.id === id);
}
