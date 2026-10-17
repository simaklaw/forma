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
// 1. CHAIR DIP (Обратные отжимания)
// ==========================================
function renderChairDip() {
  console.log('Rendering frames for Chair Dip (Обратные отжимания)...');
  const dir = '/tmp/chair_dip_frames';
  ensureCleanDir(dir);

  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const t = i / TOTAL_FRAMES;
    let depth = 0;
    let phaseText = "ВЕРХНЯЯ ФИКСАЦИЯ";
    let breatheText = "ВЕРХНИЙ ЗАМОК";
    let breatheColor = "#10B981";

    if (t < 0.45) {
      const sub = t / 0.45;
      depth = (1 - Math.cos(Math.PI * sub)) / 2;
      phaseText = "ОПУСКАНИЕ";
      breatheText = "ПЛАВНЫЙ ВДОХ";
      breatheColor = "#3B82F6";
    } else if (t < 0.55) {
      depth = 1.0;
      phaseText = "НИЖНЯЯ ТОЧКА (90°)";
      breatheText = "РАСТЯЖЕНИЕ ТРИЦЕПСА";
      breatheColor = "#F59E0B";
    } else if (t < 0.95) {
      const sub = (t - 0.55) / 0.40;
      depth = (1 + Math.cos(Math.PI * sub)) / 2;
      phaseText = "ВЫЖИМАНИЕ";
      breatheText = "МОЩНЫЙ ВЫДОХ";
      breatheColor = "#10B981";
    } else {
      depth = 0.0;
      phaseText = "ФИКСАЦИЯ ВВЕРХУ";
      breatheText = "ИСХОДНАЯ ПОЗИЦИЯ";
      breatheColor = "#10B981";
    }

    const floorY = 660;

    // Chair / Bench geometry
    const chairX = 140;
    const chairY = 480;
    const chairW = 110;
    const chairH = floorY - chairY;

    // Fixed Hand position on chair edge
    const hand = { x: chairX + chairW - 8, y: chairY - 6 };

    // Torso kinematics (lowers along vertical axis close to chair)
    const topShoulder = { x: 275, y: 395 };
    const bottomShoulder = { x: 275, y: 505 };
    const shoulder = {
      x: topShoulder.x,
      y: topShoulder.y + (bottomShoulder.y - topShoulder.y) * depth,
    };

    const topHip = { x: 285, y: 495 };
    const bottomHip = { x: 285, y: 605 };
    const hip = {
      x: topHip.x,
      y: topHip.y + (bottomHip.y - topHip.y) * depth,
    };

    // Elbow hinges backward to 90°
    const topElbow = { x: 260, y: 440 };
    const bottomElbow = { x: 205, y: 470 };
    const elbow = {
      x: topElbow.x + (bottomElbow.x - topElbow.x) * depth,
      y: topElbow.y + (bottomElbow.y - topElbow.y) * depth,
    };

    // Head
    const head = { x: shoulder.x + 8, y: shoulder.y - 50 };

    // Legs extended forward on heels
    const heel = { x: 490, y: floorY - 14 };
    const toe = { x: 535, y: floorY - 32 };
    const knee = { x: 385, y: hip.y + 40 + depth * 10 };

    const tensionColor = depth > 0.6 ? "#EF4444" : depth > 0.2 ? "#F59E0B" : "#10B981";
    const elbowAngle = Math.round(170 - depth * 80); // 170° to 90°

    const svg = `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#0B0F19"/><stop offset="50%" stop-color="#111827"/><stop offset="100%" stop-color="#1E293B"/>
      </linearGradient>
      <linearGradient id="muscleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
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
    <ellipse cx="320" cy="${floorY + 20}" rx="260" ry="45" fill="#1E293B" opacity="0.4"/>
    <line x1="50" y1="${floorY}" x2="${WIDTH - 50}" y2="${floorY}" stroke="#334155" stroke-width="2" stroke-dasharray="6,6"/>

    <!-- Chair / Studio Box Structure -->
    <rect x="${chairX}" y="${chairY}" width="${chairW}" height="${chairH}" rx="8" fill="#1E293B" stroke="#334155" stroke-width="3"/>
    <rect x="${chairX - 8}" y="${chairY - 6}" width="${chairW + 16}" height="14" rx="4" fill="#334155" stroke="#475569" stroke-width="2"/>
    <line x1="${chairX + 25}" y1="${chairY + 12}" x2="${chairX + 25}" y2="${floorY}" stroke="#0F172A" stroke-width="4"/>

    <!-- Contact Shadows -->
    <ellipse cx="${heel.x + 15}" cy="${floorY - 5}" rx="45" ry="10" fill="#000000" opacity="0.75"/>
    <ellipse cx="${chairX + chairW / 2}" cy="${floorY - 4}" rx="65" ry="12" fill="#000000" opacity="0.6"/>

    <!-- Angle Arc at Elbow -->
    <path d="M ${shoulder.x} ${shoulder.y} L ${elbow.x} ${elbow.y} L ${hand.x} ${hand.y}" stroke="#38BDF8" stroke-width="2" stroke-dasharray="4,4" opacity="0.6"/>

    <!-- Athlete: Torso & Spine -->
    <line x1="${hip.x}" y1="${hip.y}" x2="${shoulder.x}" y2="${shoulder.y}" stroke="url(#skinGrad)" stroke-width="46" stroke-linecap="round"/>
    
    <!-- Athlete: Legs -->
    <line x1="${hip.x}" y1="${hip.y}" x2="${knee.x}" y2="${knee.y}" stroke="url(#skinGrad)" stroke-width="36" stroke-linecap="round"/>
    <line x1="${knee.x}" y1="${knee.y}" x2="${heel.x}" y2="${heel.y}" stroke="url(#skinGrad)" stroke-width="28" stroke-linecap="round"/>
    <!-- Feet on Heels -->
    <line x1="${heel.x}" y1="${heel.y}" x2="${toe.x}" y2="${toe.y}" stroke="#F8FAFC" stroke-width="18" stroke-linecap="round"/>

    <!-- Athlete: Working Arm (Triceps & Shoulder Drive) -->
    <line x1="${shoulder.x}" y1="${shoulder.y}" x2="${elbow.x}" y2="${elbow.y}" stroke="url(#skinGrad)" stroke-width="26" stroke-linecap="round"/>
    <!-- Triceps Glowing Tension -->
    <line x1="${shoulder.x - 4}" y1="${shoulder.y + 4}" x2="${elbow.x - 2}" y2="${elbow.y}" stroke="url(#muscleGrad)" stroke-width="12" stroke-linecap="round" filter="url(#glow)"/>
    <line x1="${elbow.x}" y1="${elbow.y}" x2="${hand.x}" y2="${hand.y}" stroke="url(#skinGrad)" stroke-width="22" stroke-linecap="round"/>

    <!-- Joints Nodes -->
    <circle cx="${hip.x}" cy="${hip.y}" r="15" fill="#0F172A" stroke="#F8FAFC" stroke-width="3.5"/>
    <circle cx="${knee.x}" cy="${knee.y}" r="12" fill="#0F172A" stroke="#38BDF8" stroke-width="3"/>
    <circle cx="${shoulder.x}" cy="${shoulder.y}" r="17" fill="#0F172A" stroke="#F8FAFC" stroke-width="4"/>
    <circle cx="${shoulder.x}" cy="${shoulder.y}" r="6" fill="${tensionColor}"/>
    <circle cx="${elbow.x}" cy="${elbow.y}" r="14" fill="#0F172A" stroke="${tensionColor}" stroke-width="3.5"/>
    <circle cx="${elbow.x}" cy="${elbow.y}" r="5" fill="#FFFFFF"/>
    <circle cx="${hand.x}" cy="${hand.y}" r="12" fill="#F8FAFC" stroke="#0F172A" stroke-width="3"/>

    <!-- Head & Neck -->
    <line x1="${shoulder.x}" y1="${shoulder.y}" x2="${head.x}" y2="${head.y}" stroke="#334155" stroke-width="20" stroke-linecap="round"/>
    <circle cx="${head.x}" cy="${head.y}" r="28" fill="#F8FAFC"/>
    <line x1="${head.x + 8}" y1="${head.y - 4}" x2="${head.x + 36}" y2="${head.y - 4}" stroke="${tensionColor}" stroke-width="6" stroke-linecap="round" filter="url(#glow)"/>

    <!-- HUD -->
    <rect x="25" y="25" width="290" height="60" rx="14" fill="#000000" fill-opacity="0.75" stroke="#334155" stroke-width="1.5"/>
    <circle cx="50" cy="55" r="8" fill="${tensionColor}"/>
    <text x="70" y="48" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="12" font-weight="700">ОБРАТНЫЕ ОТЖИМАНИЯ</text>
    <text x="70" y="68" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="14" font-weight="800">${phaseText}</text>

    <rect x="${WIDTH / 2 - 130}" y="${HEIGHT - 75}" width="260" height="42" rx="12" fill="#000000" fill-opacity="0.8" stroke="${breatheColor}" stroke-width="1.5"/>
    <text x="${WIDTH / 2}" y="${HEIGHT - 48}" fill="${breatheColor}" font-family="system-ui, sans-serif" font-size="13" font-weight="800" text-anchor="middle">${breatheText}</text>

    <rect x="${WIDTH - 150}" y="25" width="125" height="60" rx="14" fill="#000000" fill-opacity="0.75" stroke="#334155" stroke-width="1.5"/>
    <text x="${WIDTH - 87}" y="48" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="11" font-weight="700" text-anchor="middle">УГОЛ ЛОКТЯ</text>
    <text x="${WIDTH - 87}" y="70" fill="#38BDF8" font-family="system-ui, sans-serif" font-size="16" font-weight="900" text-anchor="middle">${elbowAngle}°</text>

    <rect x="25" y="110" width="8" height="240" rx="4" fill="#1E293B"/>
    <rect x="25" y="${110 + (1 - depth) * 240}" width="8" height="${depth * 240}" rx="4" fill="url(#muscleGrad)"/>
    <circle cx="29" cy="${110 + (1 - depth) * 240}" r="7" fill="#FFFFFF" stroke="${tensionColor}" stroke-width="3"/>
    </svg>`;

    fs.writeFileSync(path.join(dir, `frame_${String(i).padStart(3, '0')}.svg`), svg);
  }

  compileVideo(dir, 'chair-dip');
}

// ==========================================
// 2. SIDE PLANK (Боковая планка)
// ==========================================
function renderSidePlank() {
  console.log('Rendering frames for Side Plank (Боковая планка)...');
  const dir = '/tmp/side_plank_frames';
  ensureCleanDir(dir);

  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const t = i / TOTAL_FRAMES;
    const pulse = 0.75 + 0.25 * Math.sin(2 * Math.PI * t);
    const breathY = ((1 - Math.cos(2 * Math.PI * t)) / 2) * 3;

    let phaseText = "СТАТИЧЕСКАЯ ФИКСАЦИЯ";
    let breatheText = "РОвное ДЫХАНИЕ И БАЛАНС";
    let breatheColor = "#10B981";

    if (t < 0.45) {
      phaseText = "СТАБИЛИЗАЦИЯ КОРПУСА";
      breatheText = "ВДОХ НОСОМ";
      breatheColor = "#3B82F6";
    } else if (t < 0.85) {
      phaseText = "ПИК КОСЫХ МЫШЦ ЖИВОТА";
      breatheText = "ПЛАВНЫЙ ВЫДОХ";
      breatheColor = "#EF4444";
    } else {
      phaseText = "ПРЯМАЯ ЛИНИЯ 180°";
      breatheText = "КОНТРОЛЬ ТАЗА";
      breatheColor = "#10B981";
    }

    const floorY = 590;

    // Base Support Elbow & Forearm
    const baseElbow = { x: 230, y: floorY - 16 };
    const baseHand = { x: 300, y: floorY - 14 };

    // Stacked Feet
    const feet = { x: 470, y: floorY - 18 };
    const toes = { x: 520, y: floorY - 14 };

    // Shoulder stacked vertically above base elbow
    const shoulder = { x: 230, y: 430 - breathY };

    // Rigid diagonal plank line from feet to shoulder
    const hip = { x: 340, y: 505 - breathY * 0.6 };
    const knee = { x: 405, y: 545 };

    // Head
    const head = { x: 180, y: 395 - breathY };

    // Top Arm extended towards ceiling (vertical line of power)
    const topElbow = { x: 230, y: 345 - breathY };
    const topHand = { x: 230, y: 265 - breathY };

    const tensionColor = t > 0.45 && t < 0.85 ? "#EF4444" : "#10B981";
    const obliquesGlow = 14 + pulse * 4;

    const svg = `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#0B0F19"/><stop offset="50%" stop-color="#111827"/><stop offset="100%" stop-color="#1E293B"/>
      </linearGradient>
      <linearGradient id="obliqueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
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
    <ellipse cx="320" cy="${floorY + 25}" rx="260" ry="40" fill="#1E293B" opacity="0.4"/>
    <line x1="50" y1="${floorY}" x2="${WIDTH - 50}" y2="${floorY}" stroke="#334155" stroke-width="2" stroke-dasharray="6,6"/>

    <!-- Contact Shadows -->
    <ellipse cx="${(baseElbow.x + baseHand.x) / 2}" cy="${floorY - 2}" rx="50" ry="10" fill="#000000" opacity="0.8"/>
    <ellipse cx="${feet.x + 20}" cy="${floorY - 2}" rx="45" ry="10" fill="#000000" opacity="0.75"/>
    <ellipse cx="${hip.x}" cy="${floorY + 2}" rx="90" ry="18" fill="#000000" opacity="0.4"/>

    <!-- 180° Axis Line -->
    <line x1="${feet.x}" y1="${feet.y}" x2="${head.x}" y2="${head.y}" stroke="#38BDF8" stroke-width="2" stroke-dasharray="6,6" opacity="0.5"/>

    <!-- Base Arm on Floor -->
    <line x1="${shoulder.x}" y1="${shoulder.y}" x2="${baseElbow.x}" y2="${baseElbow.y}" stroke="url(#skinGrad)" stroke-width="26" stroke-linecap="round"/>
    <line x1="${baseElbow.x}" y1="${baseElbow.y}" x2="${baseHand.x}" y2="${baseHand.y}" stroke="url(#skinGrad)" stroke-width="22" stroke-linecap="round"/>

    <!-- Torso & Core (Lateral Plane) -->
    <line x1="${shoulder.x}" y1="${shoulder.y}" x2="${hip.x}" y2="${hip.y}" stroke="url(#skinGrad)" stroke-width="48" stroke-linecap="round"/>
    <!-- Obliques & Core Tension Glow (Lower Flank) -->
    <line x1="${shoulder.x + 8}" y1="${shoulder.y + 12}" x2="${hip.x + 6}" y2="${hip.y + 8}" stroke="url(#obliqueGrad)" stroke-width="${obliquesGlow}" stroke-linecap="round" opacity="0.95" filter="url(#glow)"/>

    <!-- Stacked Legs -->
    <line x1="${hip.x}" y1="${hip.y}" x2="${knee.x}" y2="${knee.y}" stroke="url(#skinGrad)" stroke-width="38" stroke-linecap="round"/>
    <line x1="${knee.x}" y1="${knee.y}" x2="${feet.x}" y2="${feet.y}" stroke="url(#skinGrad)" stroke-width="30" stroke-linecap="round"/>
    <!-- Stacked Shoes -->
    <line x1="${feet.x}" y1="${feet.y}" x2="${toes.x}" y2="${toes.y}" stroke="#F8FAFC" stroke-width="20" stroke-linecap="round"/>
    <line x1="${feet.x + 4}" y1="${feet.y + 4}" x2="${toes.x + 4}" y2="${toes.y + 4}" stroke="${tensionColor}" stroke-width="7" stroke-linecap="round"/>

    <!-- Top Extended Arm -->
    <line x1="${shoulder.x}" y1="${shoulder.y}" x2="${topElbow.x}" y2="${topElbow.y}" stroke="url(#skinGrad)" stroke-width="22" stroke-linecap="round"/>
    <line x1="${topElbow.x}" y1="${topElbow.y}" x2="${topHand.x}" y2="${topHand.y}" stroke="url(#skinGrad)" stroke-width="18" stroke-linecap="round"/>
    <circle cx="${topHand.x}" cy="${topHand.y}" r="12" fill="#F8FAFC"/>

    <!-- Joints Nodes -->
    <circle cx="${shoulder.x}" cy="${shoulder.y}" r="17" fill="#0F172A" stroke="#F8FAFC" stroke-width="4"/>
    <circle cx="${shoulder.x}" cy="${shoulder.y}" r="6" fill="${tensionColor}"/>
    <circle cx="${baseElbow.x}" cy="${baseElbow.y}" r="14" fill="#0F172A" stroke="#38BDF8" stroke-width="3.5"/>
    <circle cx="${hip.x}" cy="${hip.y}" r="16" fill="#0F172A" stroke="${tensionColor}" stroke-width="4"/>
    <circle cx="${hip.x}" cy="${hip.y}" r="6" fill="#FFFFFF"/>
    <circle cx="${knee.x}" cy="${knee.y}" r="12" fill="#0F172A" stroke="#38BDF8" stroke-width="3"/>

    <!-- Head & Neck -->
    <line x1="${shoulder.x}" y1="${shoulder.y}" x2="${head.x}" y2="${head.y}" stroke="#334155" stroke-width="20" stroke-linecap="round"/>
    <circle cx="${head.x}" cy="${head.y}" r="28" fill="#F8FAFC"/>
    <line x1="${head.x - 4}" y1="${head.y - 6}" x2="${head.x - 32}" y2="${head.y - 6}" stroke="${tensionColor}" stroke-width="6" stroke-linecap="round" filter="url(#glow)"/>

    <!-- HUD -->
    <rect x="25" y="25" width="280" height="60" rx="14" fill="#000000" fill-opacity="0.75" stroke="#334155" stroke-width="1.5"/>
    <circle cx="50" cy="55" r="8" fill="${tensionColor}"/>
    <text x="70" y="48" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="12" font-weight="700">БОКОВАЯ ПЛАНКА</text>
    <text x="70" y="68" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="14" font-weight="800">${phaseText}</text>

    <rect x="${WIDTH / 2 - 135}" y="${HEIGHT - 75}" width="270" height="42" rx="12" fill="#000000" fill-opacity="0.8" stroke="${breatheColor}" stroke-width="1.5"/>
    <text x="${WIDTH / 2}" y="${HEIGHT - 48}" fill="${breatheColor}" font-family="system-ui, sans-serif" font-size="13" font-weight="800" text-anchor="middle">${breatheText}</text>

    <rect x="${WIDTH - 155}" y="25" width="130" height="60" rx="14" fill="#000000" fill-opacity="0.75" stroke="#334155" stroke-width="1.5"/>
    <text x="${WIDTH - 90}" y="48" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="11" font-weight="700" text-anchor="middle">ЛИНИЯ ТЕЛА</text>
    <text x="${WIDTH - 90}" y="70" fill="#10B981" font-family="system-ui, sans-serif" font-size="16" font-weight="900" text-anchor="middle">180° ПРЯМАЯ</text>

    <rect x="25" y="110" width="8" height="240" rx="4" fill="#1E293B"/>
    <rect x="25" y="${110 + (1 - pulse) * 240}" width="8" height="${pulse * 240}" rx="4" fill="url(#obliqueGrad)"/>
    <circle cx="29" cy="${110 + (1 - pulse) * 240}" r="7" fill="#FFFFFF" stroke="${tensionColor}" stroke-width="3"/>
    </svg>`;

    fs.writeFileSync(path.join(dir, `frame_${String(i).padStart(3, '0')}.svg`), svg);
  }

  compileVideo(dir, 'side-plank');
}

// ==========================================
// 3. RESISTANCE BAND ROW (Тяга резиновой ленты)
// ==========================================
function renderRowBand() {
  console.log('Rendering frames for Resistance Band Row (Тяга резиновой ленты)...');
  const dir = '/tmp/row_band_frames';
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
      phaseText = "ТЯГА К ПОЯСУ";
      breatheText = "МОЩНЫЙ ВЫДОХ";
      breatheColor = "#10B981";
    } else if (t < 0.55) {
      depth = 1.0;
      phaseText = "СВЕДЕНИЕ ЛОПАТОК";
      breatheText = "ПИКОВОЕ СОКРАЩЕНИЕ СПИНЫ";
      breatheColor = "#EF4444";
    } else if (t < 0.95) {
      const sub = (t - 0.55) / 0.40;
      depth = (1 + Math.cos(Math.PI * sub)) / 2;
      phaseText = "ВОЗВРАТ РУК";
      breatheText = "КОНТРОЛИРУЕМЫЙ ВДОХ";
      breatheColor = "#3B82F6";
    } else {
      depth = 0.0;
      phaseText = "РАСТЯЖЕНИЕ СПИНЫ";
      breatheText = "ИСХОДНАЯ ПОЗИЦИЯ";
      breatheColor = "#3B82F6";
    }

    const floorY = 660;

    // Stable Hinged Base Stance
    const foot = { x: 260, y: floorY - 14 };
    const knee = { x: 245, y: 510 };
    const hip = { x: 215, y: 410 };
    const shoulder = { x: 335, y: 330 };
    const head = { x: 375, y: 285 };

    // Resistance Band Anchor on Wall/Post
    const anchor = { x: 575, y: 390 };

    // Arm kinematics (reaching forward -> pulling elbows back behind torso)
    const extendedElbow = { x: 420, y: 370 };
    const pulledElbow = { x: 265, y: 360 };
    const elbow = {
      x: extendedElbow.x + (pulledElbow.x - extendedElbow.x) * depth,
      y: extendedElbow.y + (pulledElbow.y - extendedElbow.y) * depth,
    };

    const extendedHand = { x: 495, y: 385 };
    const pulledHand = { x: 325, y: 380 };
    const hand = {
      x: extendedHand.x + (pulledHand.x - extendedHand.x) * depth,
      y: extendedHand.y + (pulledHand.y - extendedHand.y) * depth,
    };

    const tensionColor = depth > 0.6 ? "#EF4444" : depth > 0.2 ? "#F59E0B" : "#10B981";
    const bandThickness = 4 + depth * 5;

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
    <ellipse cx="320" cy="${floorY + 20}" rx="260" ry="45" fill="#1E293B" opacity="0.4"/>
    <line x1="50" y1="${floorY}" x2="${WIDTH - 50}" y2="${floorY}" stroke="#334155" stroke-width="2" stroke-dasharray="6,6"/>

    <!-- Contact Shadow -->
    <ellipse cx="${foot.x + 10}" cy="${floorY - 5}" rx="55" ry="12" fill="#000000" opacity="0.75"/>

    <!-- Resistance Band Anchor Post -->
    <rect x="${anchor.x + 8}" y="240" width="16" height="${floorY - 240}" rx="4" fill="#1E293B" stroke="#334155" stroke-width="2"/>
    <circle cx="${anchor.x}" cy="${anchor.y}" r="12" fill="#0F172A" stroke="#38BDF8" stroke-width="3"/>

    <!-- Elastic Resistance Band -->
    <line x1="${anchor.x}" y1="${anchor.y}" x2="${hand.x}" y2="${hand.y}" stroke="${tensionColor}" stroke-width="${bandThickness}" stroke-linecap="round" filter="url(#glow)"/>

    <!-- Athlete: Hinged Legs -->
    <line x1="${hip.x}" y1="${hip.y}" x2="${knee.x}" y2="${knee.y}" stroke="url(#skinGrad)" stroke-width="38" stroke-linecap="round"/>
    <line x1="${knee.x}" y1="${knee.y}" x2="${foot.x}" y2="${foot.y}" stroke="url(#skinGrad)" stroke-width="30" stroke-linecap="round"/>
    <line x1="${foot.x - 10}" y1="${foot.y + 6}" x2="${foot.x + 40}" y2="${foot.y + 6}" stroke="#F8FAFC" stroke-width="20" stroke-linecap="round"/>

    <!-- Athlete: Torso & Back -->
    <line x1="${hip.x}" y1="${hip.y}" x2="${shoulder.x}" y2="${shoulder.y}" stroke="url(#skinGrad)" stroke-width="46" stroke-linecap="round"/>
    
    <!-- Latissimus Dorsi & Rhomboids Glow -->
    <line x1="${hip.x + 12}" y1="${hip.y - 15}" x2="${shoulder.x - 8}" y2="${shoulder.y + 15}" stroke="url(#latGrad)" stroke-width="16" stroke-linecap="round" opacity="0.9" filter="url(#glow)"/>

    <!-- Athlete: Working Arm (Lat Pull) -->
    <line x1="${shoulder.x}" y1="${shoulder.y}" x2="${elbow.x}" y2="${elbow.y}" stroke="url(#skinGrad)" stroke-width="24" stroke-linecap="round"/>
    <line x1="${elbow.x}" y1="${elbow.y}" x2="${hand.x}" y2="${hand.y}" stroke="url(#skinGrad)" stroke-width="20" stroke-linecap="round"/>

    <!-- Joints Nodes -->
    <circle cx="${hip.x}" cy="${hip.y}" r="15" fill="#0F172A" stroke="#F8FAFC" stroke-width="3.5"/>
    <circle cx="${knee.x}" cy="${knee.y}" r="12" fill="#0F172A" stroke="#38BDF8" stroke-width="3"/>
    <circle cx="${shoulder.x}" cy="${shoulder.y}" r="17" fill="#0F172A" stroke="#F8FAFC" stroke-width="4"/>
    <circle cx="${shoulder.x}" cy="${shoulder.y}" r="6" fill="#38BDF8"/>
    <circle cx="${elbow.x}" cy="${elbow.y}" r="14" fill="#0F172A" stroke="${tensionColor}" stroke-width="3.5"/>
    <circle cx="${elbow.x}" cy="${elbow.y}" r="5" fill="#FFFFFF"/>
    <circle cx="${hand.x}" cy="${hand.y}" r="12" fill="#F8FAFC" stroke="#0F172A" stroke-width="3"/>

    <!-- Head & Neck -->
    <line x1="${shoulder.x}" y1="${shoulder.y}" x2="${head.x}" y2="${head.y}" stroke="#334155" stroke-width="20" stroke-linecap="round"/>
    <circle cx="${head.x}" cy="${head.y}" r="28" fill="#F8FAFC"/>
    <line x1="${head.x + 6}" y1="${head.y - 4}" x2="${head.x + 36}" y2="${head.y - 4}" stroke="${tensionColor}" stroke-width="6" stroke-linecap="round" filter="url(#glow)"/>

    <!-- HUD -->
    <rect x="25" y="25" width="290" height="60" rx="14" fill="#000000" fill-opacity="0.75" stroke="#334155" stroke-width="1.5"/>
    <circle cx="50" cy="55" r="8" fill="${tensionColor}"/>
    <text x="70" y="48" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="12" font-weight="700">ТЯГА РЕЗИНОВОЙ ЛЕНТЫ</text>
    <text x="70" y="68" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="14" font-weight="800">${phaseText}</text>

    <rect x="${WIDTH / 2 - 140}" y="${HEIGHT - 75}" width="280" height="42" rx="12" fill="#000000" fill-opacity="0.8" stroke="${breatheColor}" stroke-width="1.5"/>
    <text x="${WIDTH / 2}" y="${HEIGHT - 48}" fill="${breatheColor}" font-family="system-ui, sans-serif" font-size="13" font-weight="800" text-anchor="middle">${breatheText}</text>

    <rect x="${WIDTH - 150}" y="25" width="125" height="60" rx="14" fill="#000000" fill-opacity="0.75" stroke="#334155" stroke-width="1.5"/>
    <text x="${WIDTH - 87}" y="48" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="11" font-weight="700" text-anchor="middle">НАТЯЖЕНИЕ</text>
    <text x="${WIDTH - 87}" y="70" fill="#38BDF8" font-family="system-ui, sans-serif" font-size="16" font-weight="900" text-anchor="middle">${Math.round(depth * 100)}%</text>

    <rect x="25" y="110" width="8" height="240" rx="4" fill="#1E293B"/>
    <rect x="25" y="${110 + (1 - depth) * 240}" width="8" height="${depth * 240}" rx="4" fill="url(#latGrad)"/>
    <circle cx="29" cy="${110 + (1 - depth) * 240}" r="7" fill="#FFFFFF" stroke="${tensionColor}" stroke-width="3"/>
    </svg>`;

    fs.writeFileSync(path.join(dir, `frame_${String(i).padStart(3, '0')}.svg`), svg);
  }

  compileVideo(dir, 'row-band');
}

// ==========================================
// 4. SHOULDER PRESS (Жим стоя)
// ==========================================
function renderShoulderPress() {
  console.log('Rendering frames for Shoulder Press (Жим стоя)...');
  const dir = '/tmp/shoulder_press_frames';
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
      phaseText = "ВЫЖИМАНИЕ ВВЕРХ";
      breatheText = "МОЩНЫЙ ВЫДОХ";
      breatheColor = "#10B981";
    } else if (t < 0.55) {
      depth = 1.0;
      phaseText = "ВЕРХНЯЯ БЛОКИРОВКА";
      breatheText = "ФИКСАЦИЯ НАД ГОЛОВОЙ";
      breatheColor = "#EF4444";
    } else if (t < 0.95) {
      const sub = (t - 0.55) / 0.40;
      depth = (1 + Math.cos(Math.PI * sub)) / 2;
      phaseText = "ОПУСКАНИЕ К ПЛЕЧАМ";
      breatheText = "КОНТРОЛИРУЕМЫЙ ВДОХ";
      breatheColor = "#3B82F6";
    } else {
      depth = 0.0;
      phaseText = "ИСХОДНАЯ ПОЗИЦИЯ";
      breatheText = "СТАБИЛИЗАЦИЯ КОРПУСА";
      breatheColor = "#3B82F6";
    }

    const floorY = 680;
    const cx = 320;

    // Athlete Standing Neutral (Front/3Q Athletic View)
    const footL = { x: cx - 45, y: floorY - 14 };
    const footR = { x: cx + 45, y: floorY - 14 };

    const kneeL = { x: cx - 40, y: 550 };
    const kneeR = { x: cx + 40, y: 550 };

    const hip = { x: cx, y: 440 };
    const chest = { x: cx, y: 350 };
    const shoulderL = { x: cx - 65, y: 330 };
    const shoulderR = { x: cx + 65, y: 330 };
    const head = { x: cx, y: 260 };

    // Overhead Press Arm Kinematics
    // Bottom: hands at shoulder height, elbows tucked
    // Top: hands locked overhead, elbows fully extended
    const bottomHandL = { x: cx - 75, y: 310 };
    const topHandL = { x: cx - 35, y: 155 };
    const handL = {
      x: bottomHandL.x + (topHandL.x - bottomHandL.x) * depth,
      y: bottomHandL.y + (topHandL.y - bottomHandL.y) * depth,
    };

    const bottomHandR = { x: cx + 75, y: 310 };
    const topHandR = { x: cx + 35, y: 155 };
    const handR = {
      x: bottomHandR.x + (topHandR.x - bottomHandR.x) * depth,
      y: bottomHandR.y + (topHandR.y - bottomHandR.y) * depth,
    };

    const bottomElbowL = { x: cx - 80, y: 385 };
    const topElbowL = { x: cx - 55, y: 245 };
    const elbowL = {
      x: bottomElbowL.x + (topElbowL.x - bottomElbowL.x) * depth,
      y: bottomElbowL.y + (topElbowL.y - bottomElbowL.y) * depth,
    };

    const bottomElbowR = { x: cx + 80, y: 385 };
    const topElbowR = { x: cx + 55, y: 245 };
    const elbowR = {
      x: bottomElbowR.x + (topElbowR.x - bottomElbowR.x) * depth,
      y: bottomElbowR.y + (topElbowR.y - bottomElbowR.y) * depth,
    };

    const tensionColor = depth > 0.6 ? "#EF4444" : depth > 0.2 ? "#F59E0B" : "#10B981";

    const svg = `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#0B0F19"/><stop offset="50%" stop-color="#111827"/><stop offset="100%" stop-color="#1E293B"/>
      </linearGradient>
      <linearGradient id="deltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
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
    <ellipse cx="320" cy="${floorY + 20}" rx="260" ry="45" fill="#1E293B" opacity="0.4"/>
    <line x1="50" y1="${floorY}" x2="${WIDTH - 50}" y2="${floorY}" stroke="#334155" stroke-width="2" stroke-dasharray="6,6"/>

    <!-- Contact Shadows under Feet -->
    <ellipse cx="${footL.x}" cy="${floorY - 5}" rx="35" ry="10" fill="#000000" opacity="0.75"/>
    <ellipse cx="${footR.x}" cy="${floorY - 5}" rx="35" ry="10" fill="#000000" opacity="0.75"/>

    <!-- Athlete: Legs -->
    <line x1="${hip.x - 15}" y1="${hip.y}" x2="${kneeL.x}" y2="${kneeL.y}" stroke="url(#skinGrad)" stroke-width="32" stroke-linecap="round"/>
    <line x1="${hip.x + 15}" y1="${hip.y}" x2="${kneeR.x}" y2="${kneeR.y}" stroke="url(#skinGrad)" stroke-width="32" stroke-linecap="round"/>
    <line x1="${kneeL.x}" y1="${kneeL.y}" x2="${footL.x}" y2="${footL.y}" stroke="url(#skinGrad)" stroke-width="26" stroke-linecap="round"/>
    <line x1="${kneeR.x}" y1="${kneeR.y}" x2="${footR.x}" y2="${footR.y}" stroke="url(#skinGrad)" stroke-width="26" stroke-linecap="round"/>

    <!-- Shoes -->
    <ellipse cx="${footL.x}" cy="${footL.y + 4}" rx="22" ry="10" fill="#F8FAFC"/>
    <ellipse cx="${footR.x}" cy="${footR.y + 4}" rx="22" ry="10" fill="#F8FAFC"/>

    <!-- Athlete: Torso & Deltoid Width -->
    <line x1="${hip.x}" y1="${hip.y}" x2="${chest.x}" y2="${chest.y}" stroke="url(#skinGrad)" stroke-width="52" stroke-linecap="round"/>
    <line x1="${shoulderL.x}" y1="${shoulderL.y}" x2="${shoulderR.x}" y2="${shoulderR.y}" stroke="url(#skinGrad)" stroke-width="38" stroke-linecap="round"/>

    <!-- Deltoid / Shoulder Caps Glow -->
    <circle cx="${shoulderL.x}" cy="${shoulderL.y}" r="22" fill="url(#deltGrad)" opacity="0.85" filter="url(#glow)"/>
    <circle cx="${shoulderR.x}" cy="${shoulderR.y}" r="22" fill="url(#deltGrad)" opacity="0.85" filter="url(#glow)"/>

    <!-- Athlete: Left Arm Press -->
    <line x1="${shoulderL.x}" y1="${shoulderL.y}" x2="${elbowL.x}" y2="${elbowL.y}" stroke="url(#skinGrad)" stroke-width="24" stroke-linecap="round"/>
    <line x1="${elbowL.x}" y1="${elbowL.y}" x2="${handL.x}" y2="${handL.y}" stroke="url(#skinGrad)" stroke-width="20" stroke-linecap="round"/>

    <!-- Athlete: Right Arm Press -->
    <line x1="${shoulderR.x}" y1="${shoulderR.y}" x2="${elbowR.x}" y2="${elbowR.y}" stroke="url(#skinGrad)" stroke-width="24" stroke-linecap="round"/>
    <line x1="${elbowR.x}" y1="${elbowR.y}" x2="${handR.x}" y2="${handR.y}" stroke="url(#skinGrad)" stroke-width="20" stroke-linecap="round"/>

    <!-- Dumbbells / Weights in Hands -->
    <rect x="${handL.x - 22}" y="${handL.y - 10}" width="44" height="20" rx="6" fill="#0F172A" stroke="${tensionColor}" stroke-width="3"/>
    <rect x="${handR.x - 22}" y="${handR.y - 10}" width="44" height="20" rx="6" fill="#0F172A" stroke="${tensionColor}" stroke-width="3"/>

    <!-- Joints Nodes -->
    <circle cx="${shoulderL.x}" cy="${shoulderL.y}" r="15" fill="#0F172A" stroke="#F8FAFC" stroke-width="3.5"/>
    <circle cx="${shoulderR.x}" cy="${shoulderR.y}" r="15" fill="#0F172A" stroke="#F8FAFC" stroke-width="3.5"/>
    <circle cx="${elbowL.x}" cy="${elbowL.y}" r="12" fill="#0F172A" stroke="${tensionColor}" stroke-width="3"/>
    <circle cx="${elbowR.x}" cy="${elbowR.y}" r="12" fill="#0F172A" stroke="${tensionColor}" stroke-width="3"/>
    <circle cx="${handL.x}" cy="${handL.y}" r="10" fill="#F8FAFC"/>
    <circle cx="${handR.x}" cy="${handR.y}" r="10" fill="#F8FAFC"/>

    <!-- Head & Neck -->
    <line x1="${chest.x}" y1="${chest.y}" x2="${head.x}" y2="${head.y}" stroke="#334155" stroke-width="22" stroke-linecap="round"/>
    <circle cx="${head.x}" cy="${head.y}" r="30" fill="#F8FAFC"/>
    <line x1="${head.x - 16}" y1="${head.y - 4}" x2="${head.x + 16}" y2="${head.y - 4}" stroke="${tensionColor}" stroke-width="6" stroke-linecap="round" filter="url(#glow)"/>

    <!-- HUD -->
    <rect x="25" y="25" width="280" height="60" rx="14" fill="#000000" fill-opacity="0.75" stroke="#334155" stroke-width="1.5"/>
    <circle cx="50" cy="55" r="8" fill="${tensionColor}"/>
    <text x="70" y="48" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="12" font-weight="700">АРМЕЙСКИЙ ЖИМ СТОЯ</text>
    <text x="70" y="68" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="14" font-weight="800">${phaseText}</text>

    <rect x="${WIDTH / 2 - 135}" y="${HEIGHT - 75}" width="270" height="42" rx="12" fill="#000000" fill-opacity="0.8" stroke="${breatheColor}" stroke-width="1.5"/>
    <text x="${WIDTH / 2}" y="${HEIGHT - 48}" fill="${breatheColor}" font-family="system-ui, sans-serif" font-size="13" font-weight="800" text-anchor="middle">${breatheText}</text>

    <rect x="${WIDTH - 150}" y="25" width="125" height="60" rx="14" fill="#000000" fill-opacity="0.75" stroke="#334155" stroke-width="1.5"/>
    <text x="${WIDTH - 87}" y="48" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="11" font-weight="700" text-anchor="middle">ВЫСОТА ЖИМА</text>
    <text x="${WIDTH - 87}" y="70" fill="#38BDF8" font-family="system-ui, sans-serif" font-size="16" font-weight="900" text-anchor="middle">${Math.round(depth * 100)}%</text>

    <rect x="25" y="110" width="8" height="240" rx="4" fill="#1E293B"/>
    <rect x="25" y="${110 + (1 - depth) * 240}" width="8" height="${depth * 240}" rx="4" fill="url(#deltGrad)"/>
    <circle cx="29" cy="${110 + (1 - depth) * 240}" r="7" fill="#FFFFFF" stroke="${tensionColor}" stroke-width="3"/>
    </svg>`;

    fs.writeFileSync(path.join(dir, `frame_${String(i).padStart(3, '0')}.svg`), svg);
  }

  compileVideo(dir, 'shoulder-press');
}

// Run all 4 sequentially
console.log('🚀 Starting batch rendering of 4 exercises...\n');
renderChairDip();
renderSidePlank();
renderRowBand();
renderShoulderPress();
console.log('🎉 ALL 4 EXERCISES RENDERED SUCCESSFULLY!');
