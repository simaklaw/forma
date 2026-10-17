const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WIDTH = 640;
const HEIGHT = 800;
const FPS = 30;
const TOTAL_FRAMES = 90; // 3.0s continuous loop

const OUTPUT_BASE = path.resolve(__dirname, '../apps/web/public/exercises');

function ensureCleanDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

function compileVideo(framesDir, exerciseName) {
  console.log(`🎬 Compiling ${exerciseName}.mp4 with FFmpeg...`);
  const mp4Path = path.join(OUTPUT_BASE, `${exerciseName}.mp4`);
  const jpgPath = path.join(OUTPUT_BASE, `${exerciseName}.jpg`);

  execSync(
    `ffmpeg -y -r ${FPS} -i ${framesDir}/frame_%03d.svg -c:v libx264 -pix_fmt yuv420p -profile:v main -level 4.0 -preset fast -crf 20 -movflags +faststart ${mp4Path}`,
    { stdio: 'inherit' }
  );

  execSync(
    `ffmpeg -y -ss 00:00:01.50 -i ${mp4Path} -vframes 1 -q:v 2 ${jpgPath}`,
    { stdio: 'inherit' }
  );

  console.log(`✅ Completed ${exerciseName}.mp4 & ${exerciseName}.jpg\n`);
}

// ==========================================
// 1. DEAD BUG (Мёртвый жук)
// ==========================================
function renderDeadBug() {
  console.log('Rendering frames for Dead Bug (Мёртвый жук)...');
  const dir = '/tmp/dead_bug_frames';
  ensureCleanDir(dir);

  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const t = i / TOTAL_FRAMES;
    let depth = 0;
    let phaseText = "ИСХОДНОЕ ПОЛОЖЕНИЕ";
    let breatheText = "ВДОХ";
    let breatheColor = "#3B82F6";

    if (t < 0.45) {
      const sub = t / 0.45;
      depth = (1 - Math.cos(Math.PI * sub)) / 2;
      phaseText = "РАЗНОИМЁННОЕ ВЫТЯЖЕНИЕ";
      breatheText = "ПЛАВНЫЙ ВЫДОХ";
      breatheColor = "#10B981";
    } else if (t < 0.55) {
      depth = 1.0;
      phaseText = "ПИКОВАЯ ФИКСАЦИЯ";
      breatheText = "ПОЯСНИЦА ПРИЖАТА К ПОЛУ";
      breatheColor = "#EF4444";
    } else if (t < 0.95) {
      const sub = (t - 0.55) / 0.40;
      depth = (1 + Math.cos(Math.PI * sub)) / 2;
      phaseText = "ВОЗВРАТ В ТАБЛИЦУ";
      breatheText = "КОНТРОЛИРУЕМЫЙ ВДОХ";
      breatheColor = "#3B82F6";
    } else {
      depth = 0.0;
      phaseText = "ПОЗИЦИЯ 90°/90°";
      breatheText = "СТАБИЛИЗАЦИЯ КОРПУСА";
      breatheColor = "#3B82F6";
    }

    const floorY = 560;

    // Body on the floor (Supine neutral)
    const head = { x: 170, y: floorY - 24 };
    const shoulder = { x: 240, y: floorY - 26 };
    const hip = { x: 380, y: floorY - 26 };

    // Static Arm (Points straight up towards ceiling)
    const staticHand = { x: shoulder.x + 20, y: floorY - 150 };
    const staticElbow = { x: shoulder.x + 10, y: floorY - 90 };

    // Moving Arm (Reaches back overhead parallel to floor)
    const topHand = { x: shoulder.x, y: floorY - 150 };
    const bottomHand = { x: head.x - 65, y: floorY - 25 };
    const movingHand = {
      x: topHand.x + (bottomHand.x - topHand.x) * depth,
      y: topHand.y + (bottomHand.y - topHand.y) * depth,
    };
    const movingElbow = {
      x: shoulder.x - depth * 45,
      y: shoulder.y - 75 + depth * 55,
    };

    // Static Leg (Tabletop 90°/90°)
    const staticKnee = { x: hip.x - 10, y: floorY - 110 };
    const staticAnkle = { x: hip.x + 85, y: floorY - 110 };
    const staticToe = { x: hip.x + 125, y: floorY - 110 };

    // Moving Leg (Extends straight forward hovering 2 inches above floor)
    const tableKnee = { x: hip.x + 15, y: floorY - 110 };
    const extendedKnee = { x: hip.x + 75, y: floorY - 35 };
    const movingKnee = {
      x: tableKnee.x + (extendedKnee.x - tableKnee.x) * depth,
      y: tableKnee.y + (extendedKnee.y - tableKnee.y) * depth,
    };

    const tableAnkle = { x: hip.x + 110, y: floorY - 110 };
    const extendedAnkle = { x: hip.x + 165, y: floorY - 30 };
    const movingAnkle = {
      x: tableAnkle.x + (extendedAnkle.x - tableAnkle.x) * depth,
      y: tableAnkle.y + (extendedAnkle.y - tableAnkle.y) * depth,
    };

    const movingToe = {
      x: movingAnkle.x + 35,
      y: movingAnkle.y - 5,
    };

    const tensionColor = depth > 0.6 ? "#EF4444" : depth > 0.2 ? "#F59E0B" : "#10B981";

    const svg = `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#0B0F19"/><stop offset="50%" stop-color="#111827"/><stop offset="100%" stop-color="#1E293B"/>
      </linearGradient>
      <linearGradient id="coreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#38BDF8"/><stop offset="50%" stop-color="${tensionColor}"/><stop offset="100%" stop-color="#10B981"/>
      </linearGradient>
      <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#334155"/><stop offset="100%" stop-color="#1E293B"/>
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="6" result="blur" /><feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bgGrad)"/>
    <line x1="50" y1="${floorY}" x2="${WIDTH - 50}" y2="${floorY}" stroke="#334155" stroke-width="2" stroke-dasharray="6,6"/>
    <ellipse cx="320" cy="${floorY + 25}" rx="260" ry="40" fill="#1E293B" opacity="0.4"/>

    <!-- Contact Shadow (Back pressed completely flat on floor) -->
    <ellipse cx="${(shoulder.x + hip.x) / 2}" cy="${floorY - 2}" rx="120" ry="12" fill="#000000" opacity="0.85"/>
    <ellipse cx="${head.x}" cy="${floorY - 2}" rx="30" ry="8" fill="#000000" opacity="0.75"/>

    <!-- Moving Arm (Far/Rear Layer) -->
    <line x1="${shoulder.x}" y1="${shoulder.y}" x2="${movingElbow.x}" y2="${movingElbow.y}" stroke="#1E293B" stroke-width="22" stroke-linecap="round"/>
    <line x1="${movingElbow.x}" y1="${movingElbow.y}" x2="${movingHand.x}" y2="${movingHand.y}" stroke="#1E293B" stroke-width="18" stroke-linecap="round"/>
    <circle cx="${movingHand.x}" cy="${movingHand.y}" r="10" fill="#F8FAFC"/>

    <!-- Moving Leg (Far Layer) -->
    <line x1="${hip.x}" y1="${hip.y}" x2="${movingKnee.x}" y2="${movingKnee.y}" stroke="#1E293B" stroke-width="32" stroke-linecap="round"/>
    <line x1="${movingKnee.x}" y1="${movingKnee.y}" x2="${movingAnkle.x}" y2="${movingAnkle.y}" stroke="#1E293B" stroke-width="24" stroke-linecap="round"/>
    <line x1="${movingAnkle.x}" y1="${movingAnkle.y}" x2="${movingToe.x}" y2="${movingToe.y}" stroke="#F8FAFC" stroke-width="16" stroke-linecap="round"/>

    <!-- Athlete: Flat Torso on Floor -->
    <line x1="${head.x}" y1="${head.y}" x2="${shoulder.x}" y2="${shoulder.y}" stroke="#334155" stroke-width="22" stroke-linecap="round"/>
    <circle cx="${head.x}" cy="${head.y}" r="28" fill="#F8FAFC"/>
    <line x1="${head.x - 4}" y1="${head.y - 12}" x2="${head.x - 4}" y2="${head.y - 36}" stroke="${tensionColor}" stroke-width="6" stroke-linecap="round" filter="url(#glow)"/>

    <line x1="${shoulder.x}" y1="${shoulder.y}" x2="${hip.x}" y2="${hip.y}" stroke="url(#skinGrad)" stroke-width="46" stroke-linecap="round"/>

    <!-- Deep Core & Transverse Abdominis Stabilization Glow -->
    <line x1="${shoulder.x + 20}" y1="${shoulder.y - 12}" x2="${hip.x - 15}" y2="${hip.y - 12}" stroke="url(#coreGrad)" stroke-width="18" stroke-linecap="round" opacity="0.9" filter="url(#glow)"/>

    <!-- Static Arm (Vertical Tabletop Lock) -->
    <line x1="${shoulder.x + 15}" y1="${shoulder.y}" x2="${staticElbow.x}" y2="${staticElbow.y}" stroke="url(#skinGrad)" stroke-width="24" stroke-linecap="round"/>
    <line x1="${staticElbow.x}" y1="${staticElbow.y}" x2="${staticHand.x}" y2="${staticHand.y}" stroke="url(#skinGrad)" stroke-width="20" stroke-linecap="round"/>
    <circle cx="${staticHand.x}" cy="${staticHand.y}" r="11" fill="#F8FAFC"/>

    <!-- Static Leg (90° Knee & Hip Lock) -->
    <line x1="${hip.x - 10}" y1="${hip.y}" x2="${staticKnee.x}" y2="${staticKnee.y}" stroke="url(#skinGrad)" stroke-width="36" stroke-linecap="round"/>
    <line x1="${staticKnee.x}" y1="${staticKnee.y}" x2="${staticAnkle.x}" y2="${staticAnkle.y}" stroke="url(#skinGrad)" stroke-width="28" stroke-linecap="round"/>
    <line x1="${staticAnkle.x}" y1="${staticAnkle.y}" x2="${staticToe.x}" y2="${staticToe.y}" stroke="#F8FAFC" stroke-width="18" stroke-linecap="round"/>

    <!-- Joints Nodes -->
    <circle cx="${shoulder.x}" cy="${shoulder.y}" r="16" fill="#0F172A" stroke="#F8FAFC" stroke-width="4"/>
    <circle cx="${shoulder.x}" cy="${shoulder.y}" r="6" fill="#38BDF8"/>
    <circle cx="${hip.x}" cy="${hip.y}" r="16" fill="#0F172A" stroke="${tensionColor}" stroke-width="4"/>
    <circle cx="${hip.x}" cy="${hip.y}" r="6" fill="#FFFFFF"/>
    <circle cx="${staticKnee.x}" cy="${staticKnee.y}" r="13" fill="#0F172A" stroke="#38BDF8" stroke-width="3"/>
    <circle cx="${movingKnee.x}" cy="${movingKnee.y}" r="13" fill="#0F172A" stroke="${tensionColor}" stroke-width="3"/>

    <!-- HUD -->
    <rect x="25" y="25" width="280" height="60" rx="14" fill="#000000" fill-opacity="0.75" stroke="#334155" stroke-width="1.5"/>
    <circle cx="50" cy="55" r="8" fill="${tensionColor}"/>
    <text x="70" y="48" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="12" font-weight="700">МЕРТВЫЙ ЖУК (DEAD BUG)</text>
    <text x="70" y="68" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="14" font-weight="800">${phaseText}</text>

    <rect x="${WIDTH / 2 - 145}" y="${HEIGHT - 75}" width="290" height="42" rx="12" fill="#000000" fill-opacity="0.8" stroke="${breatheColor}" stroke-width="1.5"/>
    <text x="${WIDTH / 2}" y="${HEIGHT - 48}" fill="${breatheColor}" font-family="system-ui, sans-serif" font-size="13" font-weight="800" text-anchor="middle">${breatheText}</text>

    <rect x="${WIDTH - 155}" y="25" width="130" height="60" rx="14" fill="#000000" fill-opacity="0.75" stroke="#334155" stroke-width="1.5"/>
    <text x="${WIDTH - 90}" y="48" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="11" font-weight="700" text-anchor="middle">КОНТРОЛЬ ПОЯСНИЦЫ</text>
    <text x="${WIDTH - 90}" y="70" fill="#10B981" font-family="system-ui, sans-serif" font-size="16" font-weight="900" text-anchor="middle">ПРИЖАТА 100%</text>

    <rect x="25" y="110" width="8" height="240" rx="4" fill="#1E293B"/>
    <rect x="25" y="${110 + (1 - depth) * 240}" width="8" height="${depth * 240}" rx="4" fill="url(#coreGrad)"/>
    <circle cx="29" cy="${110 + (1 - depth) * 240}" r="7" fill="#FFFFFF" stroke="${tensionColor}" stroke-width="3"/>
    </svg>`;

    fs.writeFileSync(path.join(dir, `frame_${String(i).padStart(3, '0')}.svg`), svg);
  }

  compileVideo(dir, 'dead-bug');
}

// ==========================================
// 2. PULLUP (Подтягивания на перекладине)
// ==========================================
function renderPullup() {
  console.log('Rendering frames for Pullup (Подтягивания)...');
  const dir = '/tmp/pullup_frames';
  ensureCleanDir(dir);

  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const t = i / TOTAL_FRAMES;
    let depth = 0;
    let phaseText = "ВИС НА ТУРНИКЕ";
    let breatheText = "ВДОХ";
    let breatheColor = "#3B82F6";

    if (t < 0.45) {
      const sub = t / 0.45;
      depth = (1 - Math.cos(Math.PI * sub)) / 2;
      phaseText = "ПОДТЯГИВАНИЕ";
      breatheText = "МОЩНЫЙ ВЫДОХ";
      breatheColor = "#10B981";
    } else if (t < 0.55) {
      depth = 1.0;
      phaseText = "ПОДБОРОДОК НАД ПЕРЕКЛАДИНОЙ";
      breatheText = "ПИКОВОЕ СОКРАЩЕНИЕ СПИНЫ";
      breatheColor = "#EF4444";
    } else if (t < 0.95) {
      const sub = (t - 0.55) / 0.40;
      depth = (1 + Math.cos(Math.PI * sub)) / 2;
      phaseText = "ПЛАВНОЕ ОПУСКАНИЕ";
      breatheText = "КОНТРОЛИРУЕМЫЙ ВДОХ";
      breatheColor = "#3B82F6";
    } else {
      depth = 0.0;
      phaseText = "АКТИВНЫЙ ВИС";
      breatheText = "РАСТЯЖЕНИЕ ШИРОЧАЙШИХ";
      breatheColor = "#3B82F6";
    }

    const cx = 320;
    const barY = 175;

    // Fixed Hands gripping the pull-up bar
    const handL = { x: cx - 65, y: barY };
    const handR = { x: cx + 65, y: barY };

    // Body vertical kinematics:
    // Bottom: hanging low (shoulders at y: 340, chin at y: 290)
    // Top: pulled high (shoulders at y: 215, chin at y: 160 above bar)
    const bottomShoulderY = 340;
    const topShoulderY = 215;
    const currentShoulderY = bottomShoulderY + (topShoulderY - bottomShoulderY) * depth;

    const shoulderL = { x: cx - 55, y: currentShoulderY };
    const shoulderR = { x: cx + 55, y: currentShoulderY };
    const chest = { x: cx, y: currentShoulderY + 25 };
    const head = { x: cx, y: currentShoulderY - 55 };

    // Elbow kinematics:
    // Bottom: straight arms (elbows at ~ 265)
    // Top: flaring down and back to ribs (elbows at cx +- 75, y: 285)
    const bottomElbowL = { x: cx - 60, y: 260 };
    const topElbowL = { x: cx - 75, y: 280 };
    const elbowL = {
      x: bottomElbowL.x + (topElbowL.x - bottomElbowL.x) * depth,
      y: bottomElbowL.y + (topElbowL.y - bottomElbowL.y) * depth,
    };

    const bottomElbowR = { x: cx + 60, y: 260 };
    const topElbowR = { x: cx + 75, y: 280 };
    const elbowR = {
      x: bottomElbowR.x + (topElbowR.x - bottomElbowR.x) * depth,
      y: bottomElbowR.y + (topElbowR.y - bottomElbowR.y) * depth,
    };

    // Torso & Legs (Slight hollow body or crossed ankles)
    const hip = { x: cx, y: currentShoulderY + 140 };
    const knee = { x: cx + 15, y: currentShoulderY + 235 };
    const ankle = { x: cx + 25, y: currentShoulderY + 315 };

    const tensionColor = depth > 0.6 ? "#EF4444" : depth > 0.2 ? "#F59E0B" : "#10B981";

    const svg = `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#0B0F19"/><stop offset="50%" stop-color="#111827"/><stop offset="100%" stop-color="#1E293B"/>
      </linearGradient>
      <linearGradient id="latGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#38BDF8"/><stop offset="50%" stop-color="${tensionColor}"/><stop offset="100%" stop-color="#10B981"/>
      </linearGradient>
      <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#334155"/><stop offset="100%" stop-color="#1E293B"/>
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="6" result="blur" /><feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bgGrad)"/>

    <!-- Pull-Up Rig Structure -->
    <!-- Vertical Posts -->
    <line x1="80" y1="120" x2="80" y2="760" stroke="#1E293B" stroke-width="14"/>
    <line x1="${WIDTH - 80}" y1="120" x2="${WIDTH - 80}" y2="760" stroke="#1E293B" stroke-width="14"/>
    <!-- Pullup Bar with Neon Accents -->
    <line x1="70" y1="${barY}" x2="${WIDTH - 70}" y2="${barY}" stroke="#334155" stroke-width="12" stroke-linecap="round"/>
    <line x1="120" y1="${barY}" x2="${WIDTH - 120}" y2="${barY}" stroke="#38BDF8" stroke-width="4" stroke-linecap="round" opacity="0.6"/>

    <!-- Studio Floor -->
    <line x1="50" y1="740" x2="${WIDTH - 50}" y2="740" stroke="#334155" stroke-width="2" stroke-dasharray="6,6"/>

    <!-- Athlete: Back / Torso -->
    <line x1="${chest.x}" y1="${chest.y}" x2="${hip.x}" y2="${hip.y}" stroke="url(#skinGrad)" stroke-width="48" stroke-linecap="round"/>
    <line x1="${shoulderL.x}" y1="${shoulderL.y}" x2="${shoulderR.x}" y2="${shoulderR.y}" stroke="url(#skinGrad)" stroke-width="36" stroke-linecap="round"/>

    <!-- V-Taper Lats (Широчайшие крылья) Neon Glow -->
    <path d="M ${shoulderL.x} ${shoulderL.y + 10} Q ${cx - 35} ${chest.y + 35} ${hip.x - 10} ${hip.y - 15} M ${shoulderR.x} ${shoulderR.y + 10} Q ${cx + 35} ${chest.y + 35} ${hip.x + 10} ${hip.y - 15}" stroke="url(#latGrad)" stroke-width="14" stroke-linecap="round" opacity="0.9" filter="url(#glow)"/>

    <!-- Athlete: Left Arm Pull -->
    <line x1="${handL.x}" y1="${handL.y}" x2="${elbowL.x}" y2="${elbowL.y}" stroke="url(#skinGrad)" stroke-width="22" stroke-linecap="round"/>
    <line x1="${elbowL.x}" y1="${elbowL.y}" x2="${shoulderL.x}" y2="${shoulderL.y}" stroke="url(#skinGrad)" stroke-width="24" stroke-linecap="round"/>

    <!-- Athlete: Right Arm Pull -->
    <line x1="${handR.x}" y1="${handR.y}" x2="${elbowR.x}" y2="${elbowR.y}" stroke="url(#skinGrad)" stroke-width="22" stroke-linecap="round"/>
    <line x1="${elbowR.x}" y1="${elbowR.y}" x2="${shoulderR.x}" y2="${shoulderR.y}" stroke="url(#skinGrad)" stroke-width="24" stroke-linecap="round"/>

    <!-- Athlete: Crossed Legs & Ankles -->
    <line x1="${hip.x}" y1="${hip.y}" x2="${knee.x}" y2="${knee.y}" stroke="url(#skinGrad)" stroke-width="32" stroke-linecap="round"/>
    <line x1="${knee.x}" y1="${knee.y}" x2="${ankle.x}" y2="${ankle.y}" stroke="url(#skinGrad)" stroke-width="26" stroke-linecap="round"/>
    <!-- Crossed Athletic Shoes -->
    <circle cx="${ankle.x}" cy="${ankle.y + 6}" r="12" fill="#F8FAFC"/>
    <circle cx="${ankle.x - 10}" cy="${ankle.y + 10}" r="12" fill="#F8FAFC"/>

    <!-- Joints & Grips -->
    <rect x="${handL.x - 12}" y="${handL.y - 10}" width="24" height="20" rx="6" fill="#F8FAFC" stroke="#0F172A" stroke-width="2"/>
    <rect x="${handR.x - 12}" y="${handR.y - 10}" width="24" height="20" rx="6" fill="#F8FAFC" stroke="#0F172A" stroke-width="2"/>

    <circle cx="${shoulderL.x}" cy="${shoulderL.y}" r="15" fill="#0F172A" stroke="#F8FAFC" stroke-width="3.5"/>
    <circle cx="${shoulderR.x}" cy="${shoulderR.y}" r="15" fill="#0F172A" stroke="#F8FAFC" stroke-width="3.5"/>
    <circle cx="${elbowL.x}" cy="${elbowL.y}" r="13" fill="#0F172A" stroke="${tensionColor}" stroke-width="3.5"/>
    <circle cx="${elbowR.x}" cy="${elbowR.y}" r="13" fill="#0F172A" stroke="${tensionColor}" stroke-width="3.5"/>

    <!-- Head & Neck -->
    <line x1="${chest.x}" y1="${chest.y}" x2="${head.x}" y2="${head.y}" stroke="#334155" stroke-width="22" stroke-linecap="round"/>
    <circle cx="${head.x}" cy="${head.y}" r="28" fill="#F8FAFC"/>
    <!-- Focus Visor Gaze (Looking slightly upward) -->
    <line x1="${head.x - 14}" y1="${head.y - 8}" x2="${head.x + 14}" y2="${head.y - 8}" stroke="${tensionColor}" stroke-width="6" stroke-linecap="round" filter="url(#glow)"/>

    <!-- HUD -->
    <rect x="25" y="25" width="280" height="60" rx="14" fill="#000000" fill-opacity="0.75" stroke="#334155" stroke-width="1.5"/>
    <circle cx="50" cy="55" r="8" fill="${tensionColor}"/>
    <text x="70" y="48" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="12" font-weight="700">ПОДТЯГИВАНИЯ</text>
    <text x="70" y="68" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="14" font-weight="800">${phaseText}</text>

    <rect x="${WIDTH / 2 - 140}" y="${HEIGHT - 75}" width="280" height="42" rx="12" fill="#000000" fill-opacity="0.8" stroke="${breatheColor}" stroke-width="1.5"/>
    <text x="${WIDTH / 2}" y="${HEIGHT - 48}" fill="${breatheColor}" font-family="system-ui, sans-serif" font-size="13" font-weight="800" text-anchor="middle">${breatheText}</text>

    <rect x="${WIDTH - 150}" y="25" width="125" height="60" rx="14" fill="#000000" fill-opacity="0.75" stroke="#334155" stroke-width="1.5"/>
    <text x="${WIDTH - 87}" y="48" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="11" font-weight="700" text-anchor="middle">ВЫСОТА ПОДЪЕМА</text>
    <text x="${WIDTH - 87}" y="70" fill="#38BDF8" font-family="system-ui, sans-serif" font-size="16" font-weight="900" text-anchor="middle">${Math.round(depth * 100)}%</text>

    <rect x="25" y="110" width="8" height="240" rx="4" fill="#1E293B"/>
    <rect x="25" y="${110 + (1 - depth) * 240}" width="8" height="${depth * 240}" rx="4" fill="url(#latGrad)"/>
    <circle cx="29" cy="${110 + (1 - depth) * 240}" r="7" fill="#FFFFFF" stroke="${tensionColor}" stroke-width="3"/>
    </svg>`;

    fs.writeFileSync(path.join(dir, `frame_${String(i).padStart(3, '0')}.svg`), svg);
  }

  compileVideo(dir, 'pullup');
}

console.log('🚀 Starting rendering for final 2 exercises...\n');
renderDeadBug();
renderPullup();
console.log('🎉 ALL EXERCISES RENDERED SUCCESSFULLY!');
