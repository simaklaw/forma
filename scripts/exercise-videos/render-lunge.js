const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FRAMES_DIR = '/tmp/lunge_frames';
if (fs.existsSync(FRAMES_DIR)) {
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
}
fs.mkdirSync(FRAMES_DIR, { recursive: true });

const WIDTH = 640;
const HEIGHT = 800;
const FPS = 30;
const TOTAL_FRAMES = 90; // 3.0 seconds continuous loop

console.log(`Rendering ${TOTAL_FRAMES} vector SVG frames for Lunges (Выпады)...`);

for (let i = 0; i < TOTAL_FRAMES; i++) {
  const t = i / TOTAL_FRAMES; // 0.0 to 1.0

  // Biomechanical progression:
  // 0.0 -> 0.45: Descent (Eccentric phase, lowering pelvis vertically)
  // 0.45 -> 0.55: Bottom Hover (90° front and back knee angles)
  // 0.55 -> 0.95: Ascent (Concentric drive through front heel)
  // 0.95 -> 1.0: Top Lockout
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
    phaseText = "НИЖНЯЯ ТОЧКА (90°)";
    breatheText = "ФИКСАЦИЯ У ПОЛА";
    breatheColor = "#F59E0B";
  } else if (t < 0.95) {
    const sub = (t - 0.55) / 0.40;
    depth = (1 + Math.cos(Math.PI * sub)) / 2;
    phaseText = "ПОДЪЁМ";
    breatheText = "МОЩНЫЙ ВЫДОХ";
    breatheColor = "#10B981";
  } else {
    depth = 0.0;
    phaseText = "ФИКСАЦИЯ ВВЕРХУ";
    breatheText = "БАЛАНС КОРПУСА";
    breatheColor = "#10B981";
  }

  const floorY = 660;

  // Static Foot anchors on the floor
  // Front Foot (Planted flat)
  const frontAnkle = { x: 380, y: floorY - 20 };
  const frontToe = { x: 440, y: floorY - 10 };

  // Back Foot (Balancing on toes)
  const backToe = { x: 170, y: floorY - 12 };
  const backAnkle = { x: 190, y: floorY - 36 };

  // Pelvis / Hip kinematics: lowers almost vertically (with slight forward drift)
  const standingHip = { x: 275, y: 380 };
  const bottomHip = { x: 285, y: 535 };
  const hip = {
    x: standingHip.x + (bottomHip.x - standingHip.x) * depth,
    y: standingHip.y + (bottomHip.y - standingHip.y) * depth,
  };

  // Front Knee kinematics: hinges from ~170° to 90° tracking over mid-foot
  const standingFrontKnee = { x: 345, y: 475 };
  const bottomFrontKnee = { x: 385, y: 535 };
  const frontKnee = {
    x: standingFrontKnee.x + (bottomFrontKnee.x - standingFrontKnee.x) * depth,
    y: standingFrontKnee.y + (bottomFrontKnee.y - standingFrontKnee.y) * depth,
  };

  // Back Knee kinematics: lowers to hover just above floor (~2-3cm)
  const standingBackKnee = { x: 220, y: 485 };
  const bottomBackKnee = { x: 200, y: 625 };
  const backKnee = {
    x: standingBackKnee.x + (bottomBackKnee.x - standingBackKnee.x) * depth,
    y: standingBackKnee.y + (bottomBackKnee.y - standingBackKnee.y) * depth,
  };

  // Torso maintains upright posture (8° - 14° slight forward lean for spinal neutrality)
  const torsoLength = 175;
  const torsoAngleDeg = 8 + depth * 6;
  const torsoAngleRad = (torsoAngleDeg * Math.PI) / 180;
  const shoulder = {
    x: hip.x + Math.sin(torsoAngleRad) * torsoLength,
    y: hip.y - Math.cos(torsoAngleRad) * torsoLength,
  };

  // Head & Neck
  const headDist = 52;
  const head = {
    x: shoulder.x + Math.sin(torsoAngleRad) * headDist,
    y: shoulder.y - Math.cos(torsoAngleRad) * headDist,
  };

  // Athletic runner arms (Opposite arm swings forward)
  // Near Arm (swings back during bottom)
  const elbow = {
    x: shoulder.x + 35 - depth * 25,
    y: shoulder.y + 55 + depth * 15,
  };
  const hand = {
    x: elbow.x + 35 - depth * 20,
    y: elbow.y + 20 - depth * 35,
  };

  // Far Arm (swings forward during bottom)
  const farElbow = {
    x: shoulder.x - 20 + depth * 35,
    y: shoulder.y + 50 - depth * 10,
  };
  const farHand = {
    x: farElbow.x + 20 + depth * 40,
    y: farElbow.y - 10 - depth * 20,
  };

  // Muscle tension colors
  const tensionColor = depth > 0.6 ? "#EF4444" : depth > 0.2 ? "#F59E0B" : "#10B981";
  const frontKneeAngleDeg = Math.round(170 - depth * 80); // 170° to 90°

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
  <ellipse cx="320" cy="${floorY + 20}" rx="260" ry="45" fill="#1E293B" opacity="0.4"/>
  <line x1="50" y1="${floorY}" x2="${WIDTH - 50}" y2="${floorY}" stroke="#334155" stroke-width="2" stroke-dasharray="6,6"/>

  <!-- Floor Contact Shadows -->
  <ellipse cx="${frontAnkle.x + 25}" cy="${floorY - 5}" rx="55" ry="12" fill="#000000" opacity="0.75"/>
  <ellipse cx="${backToe.x + 10}" cy="${floorY - 5}" rx="35" ry="10" fill="#000000" opacity="0.7"/>
  <!-- Dropping Back Knee Shadow -->
  <ellipse cx="${backKnee.x}" cy="${floorY - 2}" rx="${20 + depth * 35}" ry="${6 + depth * 10}" fill="#000000" opacity="${0.15 + depth * 0.5}"/>

  <!-- Biomechanical Angle Arc at Front Knee -->
  <path d="M ${frontKnee.x} ${frontKnee.y} L ${hip.x} ${hip.y} M ${frontKnee.x} ${frontKnee.y} L ${frontAnkle.x} ${frontAnkle.y}" stroke="#38BDF8" stroke-width="2" stroke-dasharray="4,4" opacity="0.6"/>

  <!-- Far Arm (Depth Layer) -->
  <g opacity="0.4">
    <line x1="${shoulder.x - 15}" y1="${shoulder.y}" x2="${farElbow.x}" y2="${farElbow.y}" stroke="#1E293B" stroke-width="20" stroke-linecap="round"/>
    <line x1="${farElbow.x}" y1="${farElbow.y}" x2="${farHand.x}" y2="${farHand.y}" stroke="#1E293B" stroke-width="16" stroke-linecap="round"/>
  </g>

  <!-- Back Leg (Rear Quadriceps & Hip Flexor) -->
  <!-- Thigh -->
  <line x1="${hip.x - 10}" y1="${hip.y + 5}" x2="${backKnee.x}" y2="${backKnee.y}" stroke="url(#skinGrad)" stroke-width="32" stroke-linecap="round"/>
  <line x1="${hip.x - 8}" y1="${hip.y + 5}" x2="${backKnee.x}" y2="${backKnee.y}" stroke="url(#muscleGrad)" stroke-width="10" stroke-linecap="round" opacity="0.75"/>
  <!-- Shin -->
  <line x1="${backKnee.x}" y1="${backKnee.y}" x2="${backAnkle.x}" y2="${backAnkle.y}" stroke="url(#skinGrad)" stroke-width="24" stroke-linecap="round"/>
  <!-- Foot (on toes) -->
  <line x1="${backAnkle.x}" y1="${backAnkle.y}" x2="${backToe.x}" y2="${backToe.y}" stroke="#F8FAFC" stroke-width="18" stroke-linecap="round"/>
  
  <circle cx="${backKnee.x}" cy="${backKnee.y}" r="12" fill="#0F172A" stroke="#38BDF8" stroke-width="3"/>
  <circle cx="${backAnkle.x}" cy="${backAnkle.y}" r="9" fill="#0F172A" stroke="#38BDF8" stroke-width="2.5"/>

  <!-- Athlete Body: Torso & Spine Core -->
  <line x1="${hip.x}" y1="${hip.y}" x2="${shoulder.x}" y2="${shoulder.y}" stroke="url(#skinGrad)" stroke-width="46" stroke-linecap="round"/>
  <!-- Core Compression Glow -->
  <line x1="${hip.x + 4}" y1="${hip.y - 12}" x2="${shoulder.x - 2}" y2="${shoulder.y + 25}" stroke="url(#muscleGrad)" stroke-width="14" stroke-linecap="round" opacity="0.85"/>

  <!-- Front Leg (Lead Working Leg: Quads & Glute Maxima) -->
  <!-- Thigh -->
  <line x1="${hip.x}" y1="${hip.y}" x2="${frontKnee.x}" y2="${frontKnee.y}" stroke="url(#skinGrad)" stroke-width="38" stroke-linecap="round"/>
  <line x1="${hip.x + 2}" y1="${hip.y - 4}" x2="${frontKnee.x + 2}" y2="${frontKnee.y - 4}" stroke="url(#muscleGrad)" stroke-width="14" stroke-linecap="round" filter="url(#glow)"/>

  <!-- Shin -->
  <line x1="${frontKnee.x}" y1="${frontKnee.y}" x2="${frontAnkle.x}" y2="${frontAnkle.y}" stroke="url(#skinGrad)" stroke-width="30" stroke-linecap="round"/>
  <line x1="${frontKnee.x - 2}" y1="${frontKnee.y + 2}" x2="${frontAnkle.x - 2}" y2="${frontAnkle.y - 2}" stroke="#38BDF8" stroke-width="8" stroke-linecap="round" opacity="0.7"/>

  <!-- Front Foot & Shoe -->
  <line x1="${frontAnkle.x - 6}" y1="${frontAnkle.y + 6}" x2="${frontToe.x + 8}" y2="${frontToe.y + 6}" stroke="#F8FAFC" stroke-width="20" stroke-linecap="round"/>
  <line x1="${frontAnkle.x - 2}" y1="${frontAnkle.y + 10}" x2="${frontToe.x + 6}" y2="${frontToe.y + 10}" stroke="${tensionColor}" stroke-width="8" stroke-linecap="round"/>

  <!-- Joint Nodes -->
  <circle cx="${hip.x}" cy="${hip.y}" r="16" fill="#0F172A" stroke="#F8FAFC" stroke-width="4"/>
  <circle cx="${hip.x}" cy="${hip.y}" r="6" fill="${tensionColor}"/>

  <circle cx="${frontKnee.x}" cy="${frontKnee.y}" r="15" fill="#0F172A" stroke="${tensionColor}" stroke-width="4"/>
  <circle cx="${frontKnee.x}" cy="${frontKnee.y}" r="5" fill="#FFFFFF"/>

  <circle cx="${frontAnkle.x}" cy="${frontAnkle.y}" r="11" fill="#0F172A" stroke="#38BDF8" stroke-width="3"/>

  <!-- Near Arm (Runner posture) -->
  <line x1="${shoulder.x}" y1="${shoulder.y}" x2="${elbow.x}" y2="${elbow.y}" stroke="url(#skinGrad)" stroke-width="24" stroke-linecap="round"/>
  <line x1="${elbow.x}" y1="${elbow.y}" x2="${hand.x}" y2="${hand.y}" stroke="url(#skinGrad)" stroke-width="20" stroke-linecap="round"/>

  <circle cx="${shoulder.x}" cy="${shoulder.y}" r="18" fill="#0F172A" stroke="#F8FAFC" stroke-width="4"/>
  <circle cx="${shoulder.x}" cy="${shoulder.y}" r="7" fill="#38BDF8"/>
  <circle cx="${elbow.x}" cy="${elbow.y}" r="11" fill="#0F172A" stroke="${tensionColor}" stroke-width="3"/>
  <circle cx="${hand.x}" cy="${hand.y}" r="12" fill="#F8FAFC"/>

  <!-- Head & Neck -->
  <line x1="${shoulder.x}" y1="${shoulder.y}" x2="${head.x}" y2="${head.y}" stroke="#334155" stroke-width="22" stroke-linecap="round"/>
  <circle cx="${head.x}" cy="${head.y}" r="30" fill="#F8FAFC"/>
  <!-- Focus Visor Gaze -->
  <line x1="${head.x + 6}" y1="${head.y - 6}" x2="${head.x + 36}" y2="${head.y - 6}" stroke="${tensionColor}" stroke-width="7" stroke-linecap="round" filter="url(#glow)"/>

  <!-- Top HUD: Exercise Name & Real-time Phase -->
  <rect x="25" y="25" width="280" height="60" rx="14" fill="#000000" fill-opacity="0.75" stroke="#334155" stroke-width="1.5"/>
  <circle cx="50" cy="55" r="8" fill="${tensionColor}"/>
  <text x="70" y="48" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="12" font-weight="700">ВЫПАДЫ НА МЕСТЕ</text>
  <text x="70" y="68" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="14" font-weight="800">${phaseText}</text>

  <!-- Cadence & Breathing Banner -->
  <rect x="${WIDTH / 2 - 130}" y="${HEIGHT - 75}" width="260" height="42" rx="12" fill="#000000" fill-opacity="0.8" stroke="${breatheColor}" stroke-width="1.5"/>
  <text x="${WIDTH / 2}" y="${HEIGHT - 48}" fill="${breatheColor}" font-family="system-ui, sans-serif" font-size="13" font-weight="800" text-anchor="middle">${breatheText}</text>

  <!-- Biomechanical Angle Badge -->
  <rect x="${WIDTH - 150}" y="25" width="125" height="60" rx="14" fill="#000000" fill-opacity="0.75" stroke="#334155" stroke-width="1.5"/>
  <text x="${WIDTH - 87}" y="48" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="11" font-weight="700" text-anchor="middle">УГОЛ КОЛЕНА</text>
  <text x="${WIDTH - 87}" y="70" fill="#38BDF8" font-family="system-ui, sans-serif" font-size="16" font-weight="900" text-anchor="middle">${frontKneeAngleDeg}°</text>

  <!-- Left Side Depth Progress Bar -->
  <rect x="25" y="110" width="8" height="240" rx="4" fill="#1E293B"/>
  <rect x="25" y="${110 + (1 - depth) * 240}" width="8" height="${depth * 240}" rx="4" fill="url(#muscleGrad)"/>
  <circle cx="29" cy="${110 + (1 - depth) * 240}" r="7" fill="#FFFFFF" stroke="${tensionColor}" stroke-width="3"/>
</svg>`;

  const filename = path.join(FRAMES_DIR, `frame_${String(i).padStart(3, '0')}.svg`);
  fs.writeFileSync(filename, svg);
}

console.log('Assembling frames into 30fps continuous video with ffmpeg...');
const outputPath = path.resolve(__dirname, '../apps/web/public/exercises/lunge.mp4');

execSync(
  `ffmpeg -y -r ${FPS} -i ${FRAMES_DIR}/frame_%03d.svg -c:v libx264 -pix_fmt yuv420p -profile:v main -level 4.0 -preset fast -crf 20 -movflags +faststart ${outputPath}`,
  { stdio: 'inherit' }
);

console.log('✅ lunge.mp4 rendered successfully!');
