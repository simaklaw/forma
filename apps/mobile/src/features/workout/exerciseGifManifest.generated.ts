/**
 * AUTO-GENERATED — uniform Gym-visual GIF technique (hasaneyldrm).
 * Re-run: node scripts/import-exercise-gifs.mjs
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

const ATTR = '© Gym visual — https://gymvisual.com/';
const SRC = 'https://github.com/hasaneyldrm/exercises-dataset';

const RAW: { id: string; gifUrl: string; sourceName: string; matchScore: number }[] = [
  { id: "lib-3-4-sit-up", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0001-2gPfomN.gif", sourceName: "3/4 sit-up", matchScore: 1 },
  { id: "lib-90-90-hamstring", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1511-99rWm7w.gif", sourceName: "hamstring stretch", matchScore: 1 },
  { id: "lib-air-bike", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0003-1ZFqTDN.gif", sourceName: "air bike", matchScore: 1 },
  { id: "lib-all-fours-quad-stretch", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1512-qBcKorM.gif", sourceName: "all fours squad stretch", matchScore: 0.71 },
  { id: "lib-alternate-heel-touchers", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0006-qaZVsGk.gif", sourceName: "alternate heel touchers", matchScore: 1 },
  { id: "lib-band-good-morning", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0044-XlZ4lAC.gif", sourceName: "barbell good morning", matchScore: 1 },
  { id: "lib-band-good-morning-pull-through", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0044-XlZ4lAC.gif", sourceName: "barbell good morning", matchScore: 1 },
  { id: "lib-band-hip-adductions", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0168-hBGWILP.gif", sourceName: "cable hip adduction", matchScore: 1 },
  { id: "lib-band-pull-apart", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0991-VtTbiP3.gif", sourceName: "band pull through", matchScore: 1 },
  { id: "lib-bent-knee-hip-raise", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0484-196HJGw.gif", sourceName: "hip raise (bent knee)", matchScore: 1 },
  { id: "lib-body-up", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0137-U6G2gk9.gif", sourceName: "body-up", matchScore: 1 },
  { id: "lib-bodyweight-squat", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1004-TUZLh71.gif", sourceName: "band squat", matchScore: 1 },
  { id: "lib-bottoms-up", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0138-CI6baTY.gif", sourceName: "bottoms-up", matchScore: 1 },
  { id: "lib-butt-ups", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0870-qcNN2FN.gif", sourceName: "butt-ups", matchScore: 1 },
  { id: "lib-butt-lift-bridge", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1409-k5ILq9k.gif", sourceName: "glute bridge two legs on bench (male)", matchScore: 1 },
  { id: "lib-calf-raises-with-bands", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0974-s3x5oQj.gif", sourceName: "band calf raise", matchScore: 1 },
  { id: "lib-clock-push-up", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0258-CMAxnsG.gif", sourceName: "clock push-up", matchScore: 1 },
  { id: "lib-cocoons", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0260-SLKj2pX.gif", sourceName: "cocoons", matchScore: 1 },
  { id: "lib-cross-body-crunch", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0262-rbu5UUb.gif", sourceName: "cross body crunch", matchScore: 1 },
  { id: "lib-cross-over-with-bands", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0152-V1fQzWn.gif", sourceName: "cable crossover", matchScore: 1 },
  { id: "lib-crunch-hands-overhead", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0267-kjJ3VoQ.gif", sourceName: "crunch (hands overhead)", matchScore: 1 },
  { id: "lib-crunches", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0265-2QHJqk8.gif", sourceName: "crunch", matchScore: 1 },
  { id: "lib-dead-bug", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0276-iny3m5y.gif", sourceName: "dead bug", matchScore: 1 },
  { id: "lib-dips-triceps-version", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0019-g5hW8jQ.gif", sourceName: "assisted triceps dip (kneeling)", matchScore: 0.95 },
  { id: "lib-double-leg-butt-kick", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1473-VOa9x0g.gif", sourceName: "walking high knees lunge", matchScore: 1 },
  { id: "lib-elbow-to-knee", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0443-jvp6DiD.gif", sourceName: "elbow-to-knee", matchScore: 1 },
  { id: "lib-external-rotation-with-band", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0293-4z1vJ8o.gif", sourceName: "dumbbell lying external shoulder rotation", matchScore: 0.95 },
  { id: "lib-fast-skipping", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/2612-Q8x9y2a.gif", sourceName: "jump rope", matchScore: 0.95 },
  { id: "lib-flat-bench-leg-pull-in", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0570-OyoZ3Pu.gif", sourceName: "leg pull in flat bench", matchScore: 1 },
  { id: "lib-freehand-jump-squat", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0514-k8Yw2Lm.gif", sourceName: "jump squat", matchScore: 1 },
  { id: "lib-frog-sit-ups", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0266-7aBcDeF.gif", sourceName: "frog crunch", matchScore: 0.95 },
  { id: "lib-glute-kickback", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0171-AbCdEf1.gif", sourceName: "cable kickback", matchScore: 1 },
  { id: "lib-handstand-push-ups", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0471-XyZ123a.gif", sourceName: "handstand push-up", matchScore: 1 },
  { id: "lib-hip-circles-prone", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1407-aBcDe12.gif", sourceName: "ankle circles", matchScore: 0.95 },
  { id: "lib-hip-extension-with-bands", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0228-Kpajagk.gif", sourceName: "cable standing hip extension", matchScore: 0.95 },
  { id: "lib-inchworm", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1471-ZgsNQ6d.gif", sourceName: "inchworm", matchScore: 1 },
  { id: "lib-internal-rotation-with-band", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0312-iNtRot1.gif", sourceName: "band seated hip internal rotation", matchScore: 0.95 },
  { id: "lib-isometric-chest-squeezes", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0251-ChSqz01.gif", sourceName: "isometric chest squeeze", matchScore: 0.95 },
  { id: "lib-isometric-wipers", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0500-11wrviz.gif", sourceName: "isometric wipers", matchScore: 1 },
  { id: "lib-jackknife-sit-up", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0507-mbkgB44.gif", sourceName: "jackknife sit-up", matchScore: 1 },
  { id: "lib-janda-sit-up", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0508-1GPHRyK.gif", sourceName: "janda sit-up", matchScore: 1 },
  { id: "lib-knee-circles", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1408-KnCir01.gif", sourceName: "circles knee stretch", matchScore: 0.95 },
  { id: "lib-lateral-raise-with-bands", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0334-LatRs01.gif", sourceName: "band lateral raise", matchScore: 1 },
  { id: "lib-leg-pull-in", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0570-OyoZ3Pu.gif", sourceName: "leg pull in flat bench", matchScore: 0.95 },
  { id: "lib-lower-back-curl", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1352-ANbbry2.gif", sourceName: "lower back curl", matchScore: 1 },
  { id: "lib-lying-crossover", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1510-LyCr001.gif", sourceName: "lying crossover stretch", matchScore: 1 },
  { id: "lib-lying-glute", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1513-LyGlu01.gif", sourceName: "lying glute stretch", matchScore: 1 },
  { id: "lib-lying-prone-quadriceps", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1514-Quad001.gif", sourceName: "quad stretch", matchScore: 0.95 },
  { id: "lib-monster-walk", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0628-O95afRA.gif", sourceName: "monster walk", matchScore: 1 },
  { id: "lib-oblique-crunches", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0634-ObCr001.gif", sourceName: "oblique crunch", matchScore: 1 },
  { id: "lib-oblique-crunches-on-the-floor", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0635-QUDd8WS.gif", sourceName: "oblique crunches floor", matchScore: 1 },
  { id: "lib-overhead-triceps", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0201-OhTri01.gif", sourceName: "cable overhead triceps extension", matchScore: 0.95 },
  { id: "lib-plank", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0464-Plank01.gif", sourceName: "front plank", matchScore: 0.95 },
  { id: "lib-plyo-push-up", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1306-Snj1wSv.gif", sourceName: "plyo push up", matchScore: 1 },
  { id: "lib-push-up-wide", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1311-JmMVpR3.gif", sourceName: "wide hand push up", matchScore: 0.75 },
  { id: "lib-push-ups-close-triceps-position", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0662-Close01.gif", sourceName: "close-grip push-up", matchScore: 1 },
  { id: "lib-push-up-to-side-plank", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0664-KhHJ338.gif", sourceName: "push-up to side plank", matchScore: 1 },
  { id: "lib-pushups", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0662-Push001.gif", sourceName: "push-up", matchScore: 1 },
  { id: "lib-pushups-close-and-wide-hand-positions", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0662-Push001.gif", sourceName: "push-up", matchScore: 1 },
  { id: "lib-rear-leg-raises", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1476-RearL01.gif", sourceName: "rear leg raise", matchScore: 0.95 },
  { id: "lib-reverse-crunch", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0872-nCU1Ekp.gif", sourceName: "reverse crunch", matchScore: 1 },
  { id: "lib-rocket-jump", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1472-uZKq7lo.gif", sourceName: "forward jump", matchScore: 1 },
  { id: "lib-russian-twist", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0687-XVDdcoj.gif", sourceName: "russian twist", matchScore: 1 },
  { id: "lib-scissor-kick", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0452-Flutter.gif", sourceName: "flutter kicks", matchScore: 1 },
  { id: "lib-scissors-jump", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3219-Eh2v5Iu.gif", sourceName: "scissor jumps (male)", matchScore: 0.95 },
  { id: "lib-seated-biceps", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0294-Bicep01.gif", sourceName: "dumbbell seated biceps curl", matchScore: 0.95 },
  { id: "lib-seated-front-deltoid", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0310-Front01.gif", sourceName: "dumbbell front raise", matchScore: 0.95 },
  { id: "lib-seated-glute", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1515-SGlu001.gif", sourceName: "seated glute stretch", matchScore: 1 },
  { id: "lib-shoulder-press-with-bands", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0405-ShPr001.gif", sourceName: "band shoulder press", matchScore: 1 },
  { id: "lib-side-bridge", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0715-SideP01.gif", sourceName: "side plank", matchScore: 1 },
  { id: "lib-side-jackknife", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0507-mbkgB44.gif", sourceName: "jackknife sit-up", matchScore: 0.95 },
  { id: "lib-side-leg-raises", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1477-SideL01.gif", sourceName: "side leg raise", matchScore: 1 },
  { id: "lib-single-arm-push-up", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0725-MUic5zN.gif", sourceName: "single arm push-up", matchScore: 1 },
  { id: "lib-single-leg-butt-kick", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1473-VOa9x0g.gif", sourceName: "walking high knees lunge", matchScore: 1 },
  { id: "lib-single-leg-glute-bridge", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3645-rmEukuS.gif", sourceName: "single leg bridge with outstretched leg", matchScore: 0.75 },
  { id: "lib-sit-up", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0735-SitUp01.gif", sourceName: "sit-up", matchScore: 1 },
  { id: "lib-speed-band-overhead-triceps", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0201-OhTri01.gif", sourceName: "cable overhead triceps extension", matchScore: 0.95 },
  { id: "lib-spider-crawl", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0778-P9GFBME.gif", sourceName: "spider crawl push up", matchScore: 0.95 },
  { id: "lib-split-jump", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3219-Eh2v5Iu.gif", sourceName: "scissor jumps (male)", matchScore: 0.95 },
  { id: "lib-squats-with-bands", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1004-TUZLh71.gif", sourceName: "band squat", matchScore: 1 },
  { id: "lib-standing-hip-circles", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0228-Kpajagk.gif", sourceName: "cable standing hip extension", matchScore: 0.63 },
  { id: "lib-standing-long-jump", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1472-uZKq7lo.gif", sourceName: "forward jump", matchScore: 1 },
  { id: "lib-standing-towel-triceps-extension", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0018-7HcfMBP.gif", sourceName: "assisted standing triceps extension (with towel)", matchScore: 0.95 },
  { id: "lib-star-jump", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3223-HtfCpfi.gif", sourceName: "star jump (male)", matchScore: 0.95 },
  { id: "lib-superman", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0803-4GqRrAk.gif", sourceName: "superman push-up", matchScore: 0.95 },
  { id: "lib-toe-touchers", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/3214-RtyAsy1.gif", sourceName: "arms apart circular toe touch (male)", matchScore: 0.95 },
  { id: "lib-tuck-crunch", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0871-BMMolZ3.gif", sourceName: "tuck crunch", matchScore: 1 },
  { id: "lib-upright-row-with-bands", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0120-UDlhcO8.gif", sourceName: "barbell upright row", matchScore: 1 },
  { id: "lib-wrist-circles", gifUrl: "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/1428-2zNKRUB.gif", sourceName: "wrist circles", matchScore: 1 },
];

export const EXERCISE_GIF_MANIFEST: ExerciseGifManifestEntry[] = RAW.map((e) => ({
  ...e,
  instructionsRu: null,
  attribution: ATTR,
  sourceUrl: SRC,
}));

export function gifEntryForLibraryId(id: string): ExerciseGifManifestEntry | undefined {
  return EXERCISE_GIF_MANIFEST.find((e) => e.id === id);
}
