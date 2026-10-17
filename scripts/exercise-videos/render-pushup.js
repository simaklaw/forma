const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FRAMES_DIR = '/tmp/pushup_frames';
if (fs.existsSync(FRAMES_DIR)) {
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
}
fs.mkdirSync(FRAMES_DIR, { recursive: true });

const WIDTH = 640;
const HEIGHT = 800;
const FPS = 30;
const TOTAL_FRAMES = 90; // 3.0 seconds loop

console.log(`Rendering ${TOTAL_FRAMES} vector SVG frames for Pushups (Отжимания)...`);

for (let i = 0; i < TOTAL_FRAMES; i++) {
  const t = i / TOTAL_FRAMES; // 0.0 to 1.0
  
  // Biomechanical progression:
  // 0.0 -> 0.45: Descent (Eccentric phase, controlled lowering)
  // 0.45 -> 0.55: Bottom Chest Touch (90° elbow depth)
  // 0.55 -> 0.95: Ascent (Concentric drive, powerful press)
  // 0.95 -> 1.0: Top Lockout (Plank position)
  let depth = 0;
  let phaseText = "ИСХОДНОЕ ПОЛОЖЕНИЕ";
  let breatheText = "ВДОХ";
  let breatheColor = "#3B82F6";

  if (t < 0.45) {
    const sub = t / 0.45;
    depth = (1 - Math.cos(Math.PI * sub)) / 2;
    phaseText = "ОПУСКАНИЕ";
    breatheText = "ПЛАВНЫЙ ВДОХ";
    breatheColor = "#3B82F6";
  } else if (t < 0.55) {
    depth = 1.0;
    phaseText = "КАСАНИЕ ГРУДЬЮ";
    breatheText = "ФИКСАЦИЯ У ПОЛА";
    breatheColor = "#F59E0B";
  } else if (t < 0.95) {
    const sub = (t - 0.55) / 0.40;
    depth = (1 + Math.cos(Math.PI * sub)) / 2;
    phaseText = "ВЫЖИМАНИЕ";
    breatheText = "МОЩНЫЙ ВЫДОХ";
    breatheColor = "#10B981";
  } else {
    depth = 0.0;
    phaseText = "ВЕРХНЯЯ ФИКСАЦИЯ";
    breatheText = "НЕЙТРАЛЬНЫЙ КОР";
    breatheColor = "#10B981";
  }

  // Kinematics coordinates for side profile pushup
  const floorY = 560;
  
  // Fixed Anchor: Toes / Feet on floor
  const toeX = 130;
  const toeY = floorY - 12;
  const ankleX = 150;
  const ankleY = floorY - 24;

  // Fixed Anchor: Hands / Palms on floor
  const handX = 460;
  const handY = floorY - 10;

  // Body plank line kinematics:
  // In top position: shoulder is high (y ~ 380)
  // In bottom position: shoulder lowers close to floor (y ~ 505)
  const topShoulder = { x: 450, y: 380 };
  const bottomShoulder = { x: 460, y: 505 };
  
  const shoulder = {
    x: topShoulder.x + (bottomShoulder.x - topShoulder.x) * depth,
    y: topShoulder.y + (bottomShoulder.y - topShoulder.y) * depth,
  };

  // Straight line body calculation (rigid plank core)
  const plankVector = { x: shoulder.x - ankleX, y: shoulder.y - ankleY };
  
  // Hip is ~ 55% from ankle along plank
  const hip = {
    x: ankleX + plankVector.x * 0.55,
    y: ankleY + plankVector.y * 0.55,
  };

  // Knee is ~ 28% from ankle along plank
  const knee = {
    x: ankleX + plankVector.x * 0.28,
    y: ankleY + plankVector.y * 0.28,
  };

  // Head extends forward along plank line
  const headDist = 48;
  const plankAngleRad = Math.atan2(plankVector.y, plankVector.x);
  const head = {
    x: shoulder.x + Math.cos(plankAngleRad) * headDist,
    y: shoulder.y + Math.sin(plankAngleRad) * headDist,
  };

  // Elbow kinematics:
  const topElbow = { x: 455, y: 465 };
  const bottomElbow = { x: 395, y: 445 };
  const elbow = {
    x: topElbow.x + (bottomElbow.x - topElbow.x) * depth,
    y: topElbow.y + (bottomElbow.y - topElbow.y) * depth,
  };

  // Muscle tension colors
  const tensionColor = depth > 0.6 ? "#EF4444" : depth > 0.2 ? "#F59E0B" : "#10B981";
  const shadowScale = 1.0 + depth * 0.35;
  const elbowAngleDeg = Math.round(175 - depth * 85); // 175° down to 90°

  const svg = `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0B0F19"/>
      <stop offset="50%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#1E293B"/>
    </linearGradient>

    <linearGradient id="muscleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8"/>
      <stop offset="50%" stop-color="${tensionColor}"/>
      <stop offset="100%" stop-color="#10B981"/>
    </linearGradient>

    <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#334155"/>
      <stop offset="100%" stop-color="#1E293B"/>
    </linearGradient>

    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Studio Background -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bgGrad)"/>

  <!-- Studio Floor & Shadows -->
  <line x1="50" y1="${floorY}" x2="${WIDTH - 50}" y2="${floorY}" stroke="#334155" stroke-width="2" stroke-dasharray="6,6"/>
  <ellipse cx="320" cy="${floorY + 25}" rx="260" ry="40" fill="#1E293B" opacity="0.4"/>
  
  <!-- Contact Shadows under Toes and Hands -->
  <ellipse cx="${toeX + 15}" cy="${floorY - 2}" rx="35" ry="8" fill="#000000" opacity="0.75"/>
  <ellipse cx="${handX}" cy="${floorY - 2}" rx="45" ry="10" fill="#000000" opacity="0.8"/>
  
  <!-- Torso / Chest Ground Shadow (Expands on bottom descent) -->
  <ellipse cx="${(shoulder.x + hip.x) / 2}" cy="${floorY + 4}" rx="${120 * shadowScale}" ry="${22 * shadowScale}" fill="#000000" opacity="${0.35 + depth * 0.45}"/>

  <!-- Biomechanical Angle Arc at Elbow -->
  <path d="M ${shoulder.x} ${shoulder.y} L ${elbow.x} ${elbow.y} L ${handX} ${handY}" stroke="#38BDF8" stroke-width="2" stroke-dasharray="4,4" opacity="0.6"/>

  <!-- Athlete Body: Far Leg & Arm (Depth Shadows) -->
  <g opacity="0.45">
    <!-- Far Leg -->
    <line x1="${ankleX - 10}" y1="${ankleY - 8}" x2="${knee.x - 10}" y2="${knee.y - 8}" stroke="#1E293B" stroke-width="26" stroke-linecap="round"/>
    <line x1="${knee.x - 10}" y1="${knee.y - 8}" x2="${hip.x - 10}" y2="${hip.y - 8}" stroke="#1E293B" stroke-width="32" stroke-linecap="round"/>
    <!-- Far Arm -->
    <line x1="${shoulder.x - 15}" y1="${shoulder.y - 12}" x2="${elbow.x - 15}" y2="${elbow.y - 12}" stroke="#1E293B" stroke-width="22" stroke-linecap="round"/>
    <line x1="${elbow.x - 15}" y1="${elbow.y - 12}" x2="${handX - 15}" y2="${handY}" stroke="#1E293B" stroke-width="18" stroke-linecap="round"/>
  </g>

  <!-- Athlete Body: Core Plank Line (Torso, Pelvis, Glutes) -->
  <line x1="${hip.x}" y1="${hip.y}" x2="${shoulder.x}" y2="${shoulder.y}" stroke="url(#skinGrad)" stroke-width="46" stroke-linecap="round"/>
  
  <!-- Pectoral / Chest & Core Stabilization Neon Strip -->
  <line x1="${hip.x + 4}" y1="${hip.y - 10}" x2="${shoulder.x - 2}" y2="${shoulder.y + 12}" stroke="url(#muscleGrad)" stroke-width="14" stroke-linecap="round" opacity="0.85" filter="url(#glow)"/>

  <!-- Near Leg: Thigh (Glute to Knee) -->
  <line x1="${hip.x}" y1="${hip.y}" x2="${knee.x}" y2="${knee.y}" stroke="url(#skinGrad)" stroke-width="36" stroke-linecap="round"/>

  <!-- Near Leg: Calf & Shin (Knee to Ankle) -->
  <line x1="${knee.x}" y1="${knee.y}" x2="${ankleX}" y2="${ankleY}" stroke="url(#skinGrad)" stroke-width="28" stroke-linecap="round"/>
  
  <!-- Foot / Shoe -->
  <line x1="${ankleX}" y1="${ankleY}" x2="${toeX}" y2="${toeY}" stroke="#F8FAFC" stroke-width="18" stroke-linecap="round"/>
  <line x1="${ankleX + 4}" y1="${ankleY + 4}" x2="${toeX + 4}" y2="${toeY + 4}" stroke="${tensionColor}" stroke-width="6" stroke-linecap="round"/>

  <!-- Athlete Body: Near Arm (Shoulder -> Elbow -> Forearm -> Hand) -->
  <!-- Upper Arm (Biceps / Triceps tension) -->
  <line x1="${shoulder.x}" y1="${shoulder.y}" x2="${elbow.x}" y2="${elbow.y}" stroke="url(#skinGrad)" stroke-width="26" stroke-linecap="round"/>
  <line x1="${shoulder.x - 2}" y1="${shoulder.y - 2}" x2="${elbow.x - 2}" y2="${elbow.y - 2}" stroke="url(#muscleGrad)" stroke-width="10" stroke-linecap="round" filter="url(#glow)"/>

  <!-- Forearm -->
  <line x1="${elbow.x}" y1="${elbow.y}" x2="${handX}" y2="${handY}" stroke="url(#skinGrad)" stroke-width="22" stroke-linecap="round"/>

  <!-- Joints Nodes -->
  <circle cx="${hip.x}" cy="${hip.y}" r="15" fill="#0F172A" stroke="#F8FAFC" stroke-width="3.5"/>
  <circle cx="${knee.x}" cy="${knee.y}" r="12" fill="#0F172A" stroke="#38BDF8" stroke-width="3"/>
  <circle cx="${ankleX}" cy="${ankleY}" r="10" fill="#0F172A" stroke="#38BDF8" stroke-width="3"/>

  <circle cx="${shoulder.x}" cy="${shoulder.y}" r="18" fill="#0F172A" stroke="#F8FAFC" stroke-width="4"/>
  <circle cx="${shoulder.x}" cy="${shoulder.y}" r="7" fill="${tensionColor}"/>

  <circle cx="${elbow.x}" cy="${elbow.y}" r="14" fill="#0F172A" stroke="${tensionColor}" stroke-width="3.5"/>
  <circle cx="${elbow.x}" cy="${elbow.y}" r="5" fill="#FFFFFF"/>

  <circle cx="${handX}" cy="${handY}" r="12" fill="#F8FAFC" stroke="#0F172A" stroke-width="3"/>

  <!-- Head & Neck in neutral alignment -->
  <line x1="${shoulder.x}" y1="${shoulder.y}" x2="${head.x}" y2="${head.y}" stroke="#334155" stroke-width="20" stroke-linecap="round"/>
  <circle cx="${head.x}" cy="${head.y}" r="28" fill="#F8FAFC"/>
  <!-- Focus Visor Gaze -->
  <line x1="${head.x + 8}" y1="${head.y - 4}" x2="${head.x + 36}" y2="${head.y - 4}" stroke="${tensionColor}" stroke-width="6" stroke-linecap="round" filter="url(#glow)"/>

  <!-- Top HUD: Exercise Name & Real-time Phase -->
  <rect x="25" y="25" width="280" height="60" rx="14" fill="#000000" fill-opacity="0.75" stroke="#334155" stroke-width="1.5"/>
  <circle cx="50" cy="55" r="8" fill="${tensionColor}"/>
  <text x="70" y="48" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="12" font-weight="700">ОТЖИМАНИЯ ОТ ПОЛА</text>
  <text x="70" y="68" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="14" font-weight="800">${phaseText}</text>

  <!-- Cadence & Breathing Banner -->
  <rect x="${WIDTH / 2 - 130}" y="${HEIGHT - 75}" width="260" height="42" rx="12" fill="#000000" fill-opacity="0.8" stroke="${breatheColor}" stroke-width="1.5"/>
  <text x="${WIDTH / 2}" y="${HEIGHT - 48}" fill="${breatheColor}" font-family="system-ui, sans-serif" font-size="13" font-weight="800" text-anchor="middle">${breatheText}</text>

  <!-- Biomechanical Angle Badge -->
  <rect x="${WIDTH - 150}" y="25" width="125" height="60" rx="14" fill="#000000" fill-opacity="0.75" stroke="#334155" stroke-width="1.5"/>
  <text x="${WIDTH - 87}" y="48" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="11" font-weight="700" text-anchor="middle">УГОЛ ЛОКТЯ</text>
  <text x="${WIDTH - 87}" y="70" fill="#38BDF8" font-family="system-ui, sans-serif" font-size="16" font-weight="900" text-anchor="middle">${elbowAngleDeg}°</text>

  <!-- Left Side Depth Progress Bar -->
  <rect x="25" y="110" width="8" height="240" rx="4" fill="#1E293B"/>
  <rect x="25" y="${110 + (1 - depth) * 240}" width="8" height="${depth * 240}" rx="4" fill="url(#muscleGrad)"/>
  <circle cx="29" cy="${110 + (1 - depth) * 240}" r="7" fill="#FFFFFF" stroke="${tensionColor}" stroke-width="3"/>
</svg>`;

  const filename = path.join(FRAMES_DIR, `frame_${String(i).padStart(3, '0')}.svg`);
  fs.writeFileSync(filename, svg);
}

console.log('Assembling frames into 30fps continuous video with ffmpeg...');
const outputPath = path.resolve(__dirname, '../apps/web/public/exercises/pushup.mp4');

execSync(
  `ffmpeg -y -r ${FPS} -i ${FRAMES_DIR}/frame_%03d.svg -c:v libx264 -pix_fmt yuv420p -profile:v main -level 4.0 -preset fast -crf 20 -movflags +faststart ${outputPath}`,
  { stdio: 'inherit' }
);

console.log('✅ pushup.mp4 rendered successfully!');
