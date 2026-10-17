const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FRAMES_DIR = '/tmp/glute_bridge_frames';
if (fs.existsSync(FRAMES_DIR)) {
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
}
fs.mkdirSync(FRAMES_DIR, { recursive: true });

const WIDTH = 640;
const HEIGHT = 800;
const FPS = 30;
const TOTAL_FRAMES = 90; // 3.0 seconds loop

console.log(`Rendering ${TOTAL_FRAMES} vector SVG frames for Glute Bridge (Ягодичный мост)...`);

for (let i = 0; i < TOTAL_FRAMES; i++) {
  const t = i / TOTAL_FRAMES; // 0.0 to 1.0

  // Biomechanical progression:
  // 0.0 -> 0.45: Concentric Drive (Pelvis elevation, hip extension)
  // 0.45 -> 0.55: Peak Contraction (180° shoulder-hip-knee bridge lock)
  // 0.55 -> 0.95: Eccentric Lowering (Controlled descent)
  // 0.95 -> 1.0: Reset & Touchdown
  let depth = 0;
  let phaseText = "ИСХОДНОЕ ПОЛОЖЕНИЕ";
  let breatheText = "ВДОХ";
  let breatheColor = "#3B82F6";

  if (t < 0.45) {
    const sub = t / 0.45;
    depth = (1 - Math.cos(Math.PI * sub)) / 2;
    phaseText = "ПОДЪЁМ ТАЗА";
    breatheText = "МОЩНЫЙ ВЫДОХ";
    breatheColor = "#10B981";
  } else if (t < 0.55) {
    depth = 1.0;
    phaseText = "ПИКОВОЕ СОКРАЩЕНИЕ";
    breatheText = "ФИКСАЦИЯ ЯГОДИЦ (1 СЕК)";
    breatheColor = "#EF4444";
  } else if (t < 0.95) {
    const sub = (t - 0.55) / 0.40;
    depth = (1 + Math.cos(Math.PI * sub)) / 2;
    phaseText = "ОПУСКАНИЕ";
    breatheText = "ПЛАВНЫЙ ВДОХ";
    breatheColor = "#3B82F6";
  } else {
    depth = 0.0;
    phaseText = "КАСАНИЕ ПОЛА";
    breatheText = "РАССЛАБЛЕНИЕ";
    breatheColor = "#3B82F6";
  }

  const floorY = 560;

  // Fixed Anchor: Upper Back & Shoulders on the floor
  const shoulder = { x: 210, y: floorY - 26 };
  const head = { x: 140, y: floorY - 22 };

  // Fixed Anchor: Feet / Heels on floor
  const heel = { x: 455, y: floorY - 14 };
  const toe = { x: 505, y: floorY - 10 };
  const ankle = { x: 450, y: floorY - 22 };

  // Knee coordinates (stays flexed at ~90°)
  const knee = { x: 405, y: 445 };

  // Pelvis / Hip elevation kinematics:
  // Bottom: resting on floor (y ~ 534)
  // Top: fully locked in straight bridge line with shoulder and knee (y ~ 470)
  const bottomHip = { x: 295, y: floorY - 28 };
  const topHip = { x: 308, y: 490 };
  
  const hip = {
    x: bottomHip.x + (topHip.x - bottomHip.x) * depth,
    y: bottomHip.y + (topHip.y - bottomHip.y) * depth,
  };

  // Fixed Stabilizing Arms on Floor
  const elbow = { x: 255, y: floorY - 16 };
  const hand = { x: 320, y: floorY - 14 };

  // Muscle tension colors
  const tensionColor = depth > 0.6 ? "#EF4444" : depth > 0.2 ? "#F59E0B" : "#10B981";
  const hipBridgeAngle = Math.round(130 + depth * 50); // 130° up to 180°

  const svg = `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0B0F19"/>
      <stop offset="50%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#1E293B"/>
    </linearGradient>

    <linearGradient id="gluteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
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

  <!-- Studio Floor & Radial Shadows -->
  <line x1="50" y1="${floorY}" x2="${WIDTH - 50}" y2="${floorY}" stroke="#334155" stroke-width="2" stroke-dasharray="6,6"/>
  <ellipse cx="320" cy="${floorY + 25}" rx="260" ry="40" fill="#1E293B" opacity="0.4"/>

  <!-- Contact Shadows on Floor -->
  <ellipse cx="${shoulder.x - 20}" cy="${floorY - 2}" rx="55" ry="10" fill="#000000" opacity="0.8"/>
  <ellipse cx="${(heel.x + toe.x) / 2}" cy="${floorY - 2}" rx="45" ry="10" fill="#000000" opacity="0.8"/>
  <ellipse cx="${hip.x}" cy="${floorY - 2}" rx="${60 - depth * 20}" ry="8" fill="#000000" opacity="${0.75 - depth * 0.45}"/>

  <!-- Diagonal Straight Bridge Alignment Guide Line (Top Peak) -->
  <line x1="${shoulder.x}" y1="${shoulder.y}" x2="${knee.x}" y2="${knee.y}" stroke="#38BDF8" stroke-width="2" stroke-dasharray="6,6" opacity="${0.2 + depth * 0.6}"/>

  <!-- Athlete Body: Far Leg (Depth Shadow) -->
  <g opacity="0.45">
    <line x1="${hip.x - 10}" y1="${hip.y - 12}" x2="${knee.x - 10}" y2="${knee.y - 12}" stroke="#1E293B" stroke-width="32" stroke-linecap="round"/>
    <line x1="${knee.x - 10}" y1="${knee.y - 12}" x2="${ankle.x - 10}" y2="${ankle.y - 10}" stroke="#1E293B" stroke-width="26" stroke-linecap="round"/>
  </g>

  <!-- Athlete Body: Torso & Spine -->
  <line x1="${shoulder.x}" y1="${shoulder.y}" x2="${hip.x}" y2="${hip.y}" stroke="url(#skinGrad)" stroke-width="46" stroke-linecap="round"/>

  <!-- Gluteus Maximus & Hamstrings Peak Tension Neon Wave -->
  <!-- Hip & Glute Drive Glow -->
  <line x1="${hip.x - 15}" y1="${hip.y}" x2="${hip.x + 25}" y2="${hip.y - 10}" stroke="url(#gluteGrad)" stroke-width="20" stroke-linecap="round" opacity="0.9" filter="url(#glow)"/>
  
  <!-- Near Leg: Thigh (Hamstrings & Quads) -->
  <line x1="${hip.x}" y1="${hip.y}" x2="${knee.x}" y2="${knee.y}" stroke="url(#skinGrad)" stroke-width="38" stroke-linecap="round"/>
  <line x1="${hip.x + 4}" y1="${hip.y - 4}" x2="${knee.x - 4}" y2="${knee.y + 4}" stroke="url(#gluteGrad)" stroke-width="12" stroke-linecap="round" filter="url(#glow)"/>

  <!-- Near Leg: Shin & Calves -->
  <line x1="${knee.x}" y1="${knee.y}" x2="${ankle.x}" y2="${ankle.y}" stroke="url(#skinGrad)" stroke-width="28" stroke-linecap="round"/>

  <!-- Foot / Athletic Shoe -->
  <line x1="${heel.x}" y1="${heel.y}" x2="${toe.x}" y2="${toe.y}" stroke="#F8FAFC" stroke-width="18" stroke-linecap="round"/>
  <line x1="${heel.x + 4}" y1="${heel.y + 4}" x2="${toe.x + 4}" y2="${toe.y + 4}" stroke="${tensionColor}" stroke-width="6" stroke-linecap="round"/>

  <!-- Supporting Arm on Floor -->
  <line x1="${shoulder.x}" y1="${shoulder.y}" x2="${elbow.x}" y2="${elbow.y}" stroke="url(#skinGrad)" stroke-width="22" stroke-linecap="round"/>
  <line x1="${elbow.x}" y1="${elbow.y}" x2="${hand.x}" y2="${hand.y}" stroke="url(#skinGrad)" stroke-width="18" stroke-linecap="round"/>

  <!-- Joints Nodes -->
  <circle cx="${shoulder.x}" cy="${shoulder.y}" r="16" fill="#0F172A" stroke="#F8FAFC" stroke-width="4"/>
  <circle cx="${shoulder.x}" cy="${shoulder.y}" r="6" fill="#38BDF8"/>

  <circle cx="${hip.x}" cy="${hip.y}" r="16" fill="#0F172A" stroke="${tensionColor}" stroke-width="4"/>
  <circle cx="${hip.x}" cy="${hip.y}" r="6" fill="#FFFFFF"/>

  <circle cx="${knee.x}" cy="${knee.y}" r="14" fill="#0F172A" stroke="#38BDF8" stroke-width="3"/>
  <circle cx="${ankle.x}" cy="${ankle.y}" r="10" fill="#0F172A" stroke="#38BDF8" stroke-width="3"/>

  <!-- Head & Neck resting supine on floor -->
  <line x1="${shoulder.x}" y1="${shoulder.y}" x2="${head.x}" y2="${head.y}" stroke="#334155" stroke-width="20" stroke-linecap="round"/>
  <circle cx="${head.x}" cy="${head.y}" r="28" fill="#F8FAFC"/>
  <!-- Focus Visor Gaze (Looking upwards) -->
  <line x1="${head.x - 4}" y1="${head.y - 12}" x2="${head.x - 4}" y2="${head.y - 36}" stroke="${tensionColor}" stroke-width="6" stroke-linecap="round" filter="url(#glow)"/>

  <!-- Top HUD: Exercise Name & Real-time Phase -->
  <rect x="25" y="25" width="280" height="60" rx="14" fill="#000000" fill-opacity="0.75" stroke="#334155" stroke-width="1.5"/>
  <circle cx="50" cy="55" r="8" fill="${tensionColor}"/>
  <text x="70" y="48" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="12" font-weight="700">ЯГОДИЧНЫЙ МОСТ</text>
  <text x="70" y="68" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="14" font-weight="800">${phaseText}</text>

  <!-- Cadence & Breathing Banner -->
  <rect x="${WIDTH / 2 - 135}" y="${HEIGHT - 75}" width="270" height="42" rx="12" fill="#000000" fill-opacity="0.8" stroke="${breatheColor}" stroke-width="1.5"/>
  <text x="${WIDTH / 2}" y="${HEIGHT - 48}" fill="${breatheColor}" font-family="system-ui, sans-serif" font-size="13" font-weight="800" text-anchor="middle">${breatheText}</text>

  <!-- Biomechanical Bridge Angle Badge -->
  <rect x="${WIDTH - 150}" y="25" width="125" height="60" rx="14" fill="#000000" fill-opacity="0.75" stroke="#334155" stroke-width="1.5"/>
  <text x="${WIDTH - 87}" y="48" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="11" font-weight="700" text-anchor="middle">УГОЛ МОСТА</text>
  <text x="${WIDTH - 87}" y="70" fill="#38BDF8" font-family="system-ui, sans-serif" font-size="16" font-weight="900" text-anchor="middle">${hipBridgeAngle}°</text>

  <!-- Left Side Depth Progress Bar -->
  <rect x="25" y="110" width="8" height="240" rx="4" fill="#1E293B"/>
  <rect x="25" y="${110 + (1 - depth) * 240}" width="8" height="${depth * 240}" rx="4" fill="url(#gluteGrad)"/>
  <circle cx="29" cy="${110 + (1 - depth) * 240}" r="7" fill="#FFFFFF" stroke="${tensionColor}" stroke-width="3"/>
</svg>`;

  const filename = path.join(FRAMES_DIR, `frame_${String(i).padStart(3, '0')}.svg`);
  fs.writeFileSync(filename, svg);
}

console.log('Assembling frames into 30fps continuous video with ffmpeg...');
const outputPath = path.resolve(__dirname, '../apps/web/public/exercises/glute-bridge.mp4');

execSync(
  `ffmpeg -y -r ${FPS} -i ${FRAMES_DIR}/frame_%03d.svg -c:v libx264 -pix_fmt yuv420p -profile:v main -level 4.0 -preset fast -crf 20 -movflags +faststart ${outputPath}`,
  { stdio: 'inherit' }
);

console.log('✅ glute-bridge.mp4 rendered successfully!');
