const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FRAMES_DIR = '/tmp/squat_frames';
if (fs.existsSync(FRAMES_DIR)) {
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
}
fs.mkdirSync(FRAMES_DIR, { recursive: true });

const WIDTH = 640;
const HEIGHT = 800;
const FPS = 30;
const TOTAL_FRAMES = 90; // 3.0 seconds loop

console.log(`Rendering ${TOTAL_FRAMES} vector SVG frames for Squat...`);

for (let i = 0; i < TOTAL_FRAMES; i++) {
  const t = i / TOTAL_FRAMES; // 0.0 to 1.0
  
  // Biomechanical progression:
  // 0.0 -> 0.45: Descent (Eccentric, smooth cosine)
  // 0.45 -> 0.55: Deep Parallel Hold
  // 0.55 -> 0.95: Ascent (Concentric drive, smooth cosine)
  // 0.95 -> 1.0: Top Lock
  let depth = 0;
  let phaseText = "ИСХОДНОЕ ПОЛОЖЕНИЕ";
  let breatheText = "ВДОХ";
  let breatheColor = "#10B981";

  if (t < 0.45) {
    const sub = t / 0.45;
    depth = (1 - Math.cos(Math.PI * sub)) / 2;
    phaseText = "ОПУСКАНИЕ";
    breatheText = "ВДОХ ПРИ ОПУСКАНИИ";
    breatheColor = "#3B82F6";
  } else if (t < 0.55) {
    depth = 1.0;
    phaseText = "ПАРАЛЛЕЛЬ БЁДЕР";
    breatheText = "ЗАДЕРЖКА В НИЖНЕЙ ТОЧКЕ";
    breatheColor = "#F59E0B";
  } else if (t < 0.95) {
    const sub = (t - 0.55) / 0.40;
    depth = (1 + Math.cos(Math.PI * sub)) / 2;
    phaseText = "ПОДЪЁМ";
    breatheText = "МОЩНЫЙ ВЫДОХ";
    breatheColor = "#10B981";
  } else {
    depth = 0.0;
    phaseText = "ФИКСАЦИЯ";
    breatheText = "ИСХОДНАЯ ПОЗИЦИЯ";
    breatheColor = "#10B981";
  }

  // Kinematics coordinates
  const floorY = 660;
  const cx = 310;

  // Hip hinges backwards & downwards
  const standingHip = { x: cx - 15, y: 380 };
  const bottomHip = { x: cx - 85, y: 525 };
  const hip = {
    x: standingHip.x + (bottomHip.x - standingHip.x) * depth,
    y: standingHip.y + (bottomHip.y - standingHip.y) * depth,
  };

  // Foot base
  const ankle = { x: cx - 25, y: floorY - 20 };
  const toe = { x: cx + 55, y: floorY - 10 };

  // Knee hinges forward & bends
  const standingKnee = { x: cx - 15, y: 490 };
  const bottomKnee = { x: cx + 42, y: 520 };
  const knee = {
    x: standingKnee.x + (bottomKnee.x - standingKnee.x) * depth,
    y: standingKnee.y + (bottomKnee.y - standingKnee.y) * depth,
  };

  // Torso maintains neutral spine with forward lean
  const torsoLength = 175;
  const torsoAngleDeg = 12 + depth * 28; // 12 deg to 40 deg
  const torsoAngleRad = (torsoAngleDeg * Math.PI) / 180;
  const shoulder = {
    x: hip.x + Math.sin(torsoAngleRad) * torsoLength,
    y: hip.y - Math.cos(torsoAngleRad) * torsoLength,
  };

  // Head & neck
  const headDist = 52;
  const head = {
    x: shoulder.x + Math.sin((torsoAngleDeg - 8) * Math.PI / 180) * headDist,
    y: shoulder.y - Math.cos((torsoAngleDeg - 8) * Math.PI / 180) * headDist,
  };

  // Arms reach forward for balance
  const armReach = depth;
  const elbow = {
    x: shoulder.x + 55 + armReach * 45,
    y: shoulder.y + 45 - armReach * 10,
  };
  const hand = {
    x: elbow.x + 50 + armReach * 55,
    y: elbow.y - 10 - armReach * 25,
  };

  // Muscle tension colors
  const tensionColor = depth > 0.6 ? "#EF4444" : depth > 0.2 ? "#F59E0B" : "#10B981";
  const shadowScale = 1.0 + depth * 0.4;
  const angleAtKnee = Math.round(175 - depth * 88);

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

  <!-- Studio Floor Radial Grid -->
  <ellipse cx="${cx}" cy="${floorY + 20}" rx="240" ry="45" fill="#1E293B" opacity="0.4"/>
  <ellipse cx="${ankle.x + 25}" cy="${floorY - 5}" rx="${70 * shadowScale}" ry="${16 * shadowScale}" fill="#000000" opacity="0.65"/>
  <line x1="60" y1="${floorY}" x2="${WIDTH - 60}" y2="${floorY}" stroke="#334155" stroke-width="2" stroke-dasharray="6,6"/>

  <!-- Biomechanical Angle Arc at Knee -->
  <path d="M ${knee.x} ${knee.y} L ${hip.x} ${hip.y} M ${knee.x} ${knee.y} L ${ankle.x} ${ankle.y}" stroke="#38BDF8" stroke-width="2" stroke-dasharray="4,4" opacity="0.5"/>

  <!-- Athlete Body: Far Leg (Depth Layer) -->
  <g opacity="0.45">
    <line x1="${hip.x - 20}" y1="${hip.y + 5}" x2="${knee.x - 20}" y2="${knee.y + 5}" stroke="#1E293B" stroke-width="32" stroke-linecap="round"/>
    <line x1="${knee.x - 20}" y1="${knee.y + 5}" x2="${ankle.x - 20}" y2="${ankle.y}" stroke="#1E293B" stroke-width="24" stroke-linecap="round"/>
    <line x1="${ankle.x - 20}" y1="${ankle.y}" x2="${toe.x - 20}" y2="${toe.y}" stroke="#0F172A" stroke-width="16" stroke-linecap="round"/>
  </g>

  <!-- Athlete Body: Far Arm (Depth Layer) -->
  <g opacity="0.4">
    <line x1="${shoulder.x - 15}" y1="${shoulder.y}" x2="${elbow.x - 15}" y2="${elbow.y}" stroke="#1E293B" stroke-width="20" stroke-linecap="round"/>
    <line x1="${elbow.x - 15}" y1="${elbow.y}" x2="${hand.x - 15}" y2="${hand.y}" stroke="#1E293B" stroke-width="16" stroke-linecap="round"/>
  </g>

  <!-- Athlete Body: Torso & Spine Core -->
  <line x1="${hip.x}" y1="${hip.y}" x2="${shoulder.x}" y2="${shoulder.y}" stroke="url(#skinGrad)" stroke-width="48" stroke-linecap="round"/>
  <!-- Core Compression Glow -->
  <line x1="${hip.x + 5}" y1="${hip.y - 15}" x2="${shoulder.x - 5}" y2="${shoulder.y + 35}" stroke="url(#muscleGrad)" stroke-width="16" stroke-linecap="round" opacity="0.85"/>

  <!-- Near Leg: Thigh & Quadriceps -->
  <line x1="${hip.x}" y1="${hip.y}" x2="${knee.x}" y2="${knee.y}" stroke="url(#skinGrad)" stroke-width="40" stroke-linecap="round"/>
  <line x1="${hip.x + 3}" y1="${hip.y - 4}" x2="${knee.x + 1}" y2="${knee.y - 4}" stroke="url(#muscleGrad)" stroke-width="14" stroke-linecap="round" filter="url(#glow)"/>

  <!-- Near Leg: Shin & Calves -->
  <line x1="${knee.x}" y1="${knee.y}" x2="${ankle.x}" y2="${ankle.y}" stroke="url(#skinGrad)" stroke-width="30" stroke-linecap="round"/>
  <line x1="${knee.x - 2}" y1="${knee.y + 2}" x2="${ankle.x - 2}" y2="${ankle.y - 2}" stroke="#38BDF8" stroke-width="8" stroke-linecap="round" opacity="0.7"/>

  <!-- Foot & Shoe -->
  <line x1="${ankle.x - 8}" y1="${ankle.y + 6}" x2="${toe.x + 8}" y2="${toe.y + 6}" stroke="#F8FAFC" stroke-width="20" stroke-linecap="round"/>
  <line x1="${ankle.x - 4}" y1="${ankle.y + 10}" x2="${toe.x + 6}" y2="${toe.y + 10}" stroke="${tensionColor}" stroke-width="8" stroke-linecap="round"/>

  <!-- Joints Nodes -->
  <circle cx="${hip.x}" cy="${hip.y}" r="16" fill="#0F172A" stroke="#F8FAFC" stroke-width="4"/>
  <circle cx="${hip.x}" cy="${hip.y}" r="6" fill="${tensionColor}"/>

  <circle cx="${knee.x}" cy="${knee.y}" r="15" fill="#0F172A" stroke="${tensionColor}" stroke-width="4"/>
  <circle cx="${knee.x}" cy="${knee.y}" r="5" fill="#FFFFFF"/>

  <circle cx="${ankle.x}" cy="${ankle.y}" r="12" fill="#0F172A" stroke="#38BDF8" stroke-width="3"/>

  <!-- Near Arm: Biceps / Deltoids / Forearm -->
  <line x1="${shoulder.x}" y1="${shoulder.y}" x2="${elbow.x}" y2="${elbow.y}" stroke="url(#skinGrad)" stroke-width="24" stroke-linecap="round"/>
  <line x1="${elbow.x}" y1="${elbow.y}" x2="${hand.x}" y2="${hand.y}" stroke="url(#skinGrad)" stroke-width="20" stroke-linecap="round"/>

  <circle cx="${shoulder.x}" cy="${shoulder.y}" r="18" fill="#0F172A" stroke="#F8FAFC" stroke-width="4"/>
  <circle cx="${shoulder.x}" cy="${shoulder.y}" r="7" fill="#38BDF8"/>

  <circle cx="${elbow.x}" cy="${elbow.y}" r="10" fill="#0F172A" stroke="${tensionColor}" stroke-width="3"/>
  <circle cx="${hand.x}" cy="${hand.y}" r="12" fill="#F8FAFC"/>

  <!-- Head, Neck & Visor -->
  <line x1="${shoulder.x}" y1="${shoulder.y}" x2="${head.x}" y2="${head.y}" stroke="#334155" stroke-width="22" stroke-linecap="round"/>
  <circle cx="${head.x}" cy="${head.y}" r="32" fill="#F8FAFC"/>
  <!-- Focus Visor Gaze -->
  <line x1="${head.x + 6}" y1="${head.y - 6}" x2="${head.x + 36}" y2="${head.y - 6}" stroke="${tensionColor}" stroke-width="7" stroke-linecap="round" filter="url(#glow)"/>

  <!-- Top HUD: Exercise Name & Real-time Phase -->
  <rect x="25" y="25" width="260" height="60" rx="14" fill="#000000" fill-opacity="0.75" stroke="#334155" stroke-width="1.5"/>
  <circle cx="50" cy="55" r="8" fill="${tensionColor}"/>
  <text x="70" y="48" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="12" font-weight="700">ПРИСЕДАНИЯ</text>
  <text x="70" y="68" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="14" font-weight="800">${phaseText}</text>

  <!-- Cadence & Breathing Banner -->
  <rect x="${WIDTH / 2 - 130}" y="${HEIGHT - 75}" width="260" height="42" rx="12" fill="#000000" fill-opacity="0.8" stroke="${breatheColor}" stroke-width="1.5"/>
  <text x="${WIDTH / 2}" y="${HEIGHT - 48}" fill="${breatheColor}" font-family="system-ui, sans-serif" font-size="13" font-weight="800" text-anchor="middle">${breatheText}</text>

  <!-- Biomechanical Angle Badge -->
  <rect x="${WIDTH - 150}" y="25" width="125" height="60" rx="14" fill="#000000" fill-opacity="0.75" stroke="#334155" stroke-width="1.5"/>
  <text x="${WIDTH - 87}" y="48" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="11" font-weight="700" text-anchor="middle">УГОЛ КОЛЕНА</text>
  <text x="${WIDTH - 87}" y="70" fill="#38BDF8" font-family="system-ui, sans-serif" font-size="16" font-weight="900" text-anchor="middle">${angleAtKnee}°</text>

  <!-- Left Side Depth Progress Bar -->
  <rect x="25" y="110" width="8" height="240" rx="4" fill="#1E293B"/>
  <rect x="25" y="${110 + (1 - depth) * 240}" width="8" height="${depth * 240}" rx="4" fill="url(#muscleGrad)"/>
  <circle cx="29" cy="${110 + (1 - depth) * 240}" r="7" fill="#FFFFFF" stroke="${tensionColor}" stroke-width="3"/>
</svg>`;

  const filename = path.join(FRAMES_DIR, `frame_${String(i).padStart(3, '0')}.svg`);
  fs.writeFileSync(filename, svg);
}

console.log('Assembling frames into 30fps continuous video with ffmpeg...');
const outputPath = path.resolve(__dirname, '../apps/web/public/exercises/squat.mp4');

execSync(
  `ffmpeg -y -r ${FPS} -i ${FRAMES_DIR}/frame_%03d.svg -c:v libx264 -pix_fmt yuv420p -profile:v main -level 4.0 -preset fast -crf 20 -movflags +faststart ${outputPath}`,
  { stdio: 'inherit' }
);

console.log('✅ squat.mp4 rendered successfully!');
