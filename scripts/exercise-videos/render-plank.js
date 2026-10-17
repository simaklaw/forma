const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FRAMES_DIR = '/tmp/plank_frames';
if (fs.existsSync(FRAMES_DIR)) {
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
}
fs.mkdirSync(FRAMES_DIR, { recursive: true });

const WIDTH = 640;
const HEIGHT = 800;
const FPS = 30;
const TOTAL_FRAMES = 90; // 3.0 seconds continuous isometric loop

console.log(`Rendering ${TOTAL_FRAMES} vector SVG frames for Forearm Plank (Планка на предплечьях)...`);

for (let i = 0; i < TOTAL_FRAMES; i++) {
  const t = i / TOTAL_FRAMES; // 0.0 to 1.0

  // Isometric breathing & muscle pulsation cycle (diaphragmatic wave)
  // Breath cycle: 0 -> 0.5 (inhale expansion), 0.5 -> 1.0 (exhale core brace)
  const breathPhase = (1 - Math.cos(2 * Math.PI * t)) / 2; // 0.0 to 1.0
  const tensionPulse = 0.75 + 0.25 * Math.sin(2 * Math.PI * t);

  let phaseText = "СТАТИЧЕСКАЯ ФИКСАЦИЯ";
  let breatheText = "РОвное ДИАФРАГМАЛЬНОЕ ДЫХАНИЕ";
  let breatheColor = "#10B981";

  if (t < 0.45) {
    phaseText = "СТАБИЛИЗАЦИЯ КОРПУСА";
    breatheText = "МЯГКИЙ ВДОХ НОСОМ";
    breatheColor = "#3B82F6";
  } else if (t < 0.85) {
    phaseText = "ПИКОВОЕ НАПРЯЖЕНИЕ ПРЕССА";
    breatheText = "ПЛАВНЫЙ ВЫДОХ РТОМ";
    breatheColor = "#EF4444";
  } else {
    phaseText = "НЕЙТРАЛЬНЫЙ ПОЗВОНОЧНИК";
    breatheText = "УДЕРЖАНИЕ БАЛАНСА";
    breatheColor = "#10B981";
  }

  const floorY = 560;

  // Fixed Anchor: Toes / Feet on floor
  const toeX = 130;
  const toeY = floorY - 12;
  const ankleX = 150;
  const ankleY = floorY - 24;

  // Fixed Anchor: Elbows & Forearms flat on floor
  const elbowX = 465;
  const elbowY = floorY - 16;
  const handX = 535;
  const handY = floorY - 12;

  // Upper Body Alignment (Shoulder stacked vertically above elbow)
  // Subtle micro-movement of breathing (+- 2px)
  const breathY = breathPhase * 3;
  const shoulderX = 465;
  const shoulderY = 425 - breathY;

  // Plank line from ankle to shoulder (Perfect 180° biomechanical plane)
  const plankVector = { x: shoulderX - ankleX, y: shoulderY - ankleY };
  
  // Hip is ~ 55% from ankle along plank
  const hip = {
    x: ankleX + plankVector.x * 0.55,
    y: ankleY + plankVector.y * 0.55 - breathY * 0.5,
  };

  // Knee is ~ 28% from ankle along plank
  const knee = {
    x: ankleX + plankVector.x * 0.28,
    y: ankleY + plankVector.y * 0.28,
  };

  // Head extends along plank line (neutral cervical spine)
  const headDist = 48;
  const plankAngleRad = Math.atan2(plankVector.y, plankVector.x);
  const head = {
    x: shoulderX + Math.cos(plankAngleRad) * headDist,
    y: shoulderY + Math.sin(plankAngleRad) * headDist,
  };

  // Muscle tension colors (Glowing neon pulse)
  const tensionColor = t > 0.45 && t < 0.85 ? "#EF4444" : "#10B981";
  const coreGlowWidth = 14 + tensionPulse * 4;

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

  <!-- Studio Floor & Radial Shadows -->
  <line x1="50" y1="${floorY}" x2="${WIDTH - 50}" y2="${floorY}" stroke="#334155" stroke-width="2" stroke-dasharray="6,6"/>
  <ellipse cx="320" cy="${floorY + 25}" rx="260" ry="40" fill="#1E293B" opacity="0.4"/>

  <!-- Floor Contact Shadows -->
  <ellipse cx="${toeX + 15}" cy="${floorY - 2}" rx="35" ry="8" fill="#000000" opacity="0.75"/>
  <ellipse cx="${(elbowX + handX) / 2}" cy="${floorY - 2}" rx="50" ry="10" fill="#000000" opacity="0.8"/>
  <ellipse cx="${(shoulderX + hip.x) / 2}" cy="${floorY + 4}" rx="130" ry="24" fill="#000000" opacity="0.55"/>

  <!-- Ideal Neutral Spine Axis Guide Line (180°) -->
  <line x1="${ankleX}" y1="${ankleY}" x2="${head.x}" y2="${head.y}" stroke="#38BDF8" stroke-width="2" stroke-dasharray="6,6" opacity="0.55"/>

  <!-- Athlete Body: Far Leg & Arm (Depth Layer) -->
  <g opacity="0.45">
    <!-- Far Leg -->
    <line x1="${ankleX - 10}" y1="${ankleY - 8}" x2="${knee.x - 10}" y2="${knee.y - 8}" stroke="#1E293B" stroke-width="26" stroke-linecap="round"/>
    <line x1="${knee.x - 10}" y1="${knee.y - 8}" x2="${hip.x - 10}" y2="${hip.y - 8}" stroke="#1E293B" stroke-width="32" stroke-linecap="round"/>
    <!-- Far Arm -->
    <line x1="${shoulderX - 15}" y1="${shoulderY - 10}" x2="${elbowX - 15}" y2="${elbowY - 8}" stroke="#1E293B" stroke-width="22" stroke-linecap="round"/>
    <line x1="${elbowX - 15}" y1="${elbowY - 8}" x2="${handX - 15}" y2="${handY}" stroke="#1E293B" stroke-width="18" stroke-linecap="round"/>
  </g>

  <!-- Athlete Body: Main Core Trunk & Glutes -->
  <line x1="${hip.x}" y1="${hip.y}" x2="${shoulderX}" y2="${shoulderY}" stroke="url(#skinGrad)" stroke-width="48" stroke-linecap="round"/>
  
  <!-- Core / Abdominal Isometric Tension Glow -->
  <line x1="${hip.x + 4}" y1="${hip.y - 12}" x2="${shoulderX - 4}" y2="${shoulderY + 12}" stroke="url(#muscleGrad)" stroke-width="${coreGlowWidth}" stroke-linecap="round" opacity="0.9" filter="url(#glow)"/>

  <!-- Near Leg: Thigh (Glute to Knee) -->
  <line x1="${hip.x}" y1="${hip.y}" x2="${knee.x}" y2="${knee.y}" stroke="url(#skinGrad)" stroke-width="36" stroke-linecap="round"/>

  <!-- Near Leg: Calf & Shin (Knee to Ankle) -->
  <line x1="${knee.x}" y1="${knee.y}" x2="${ankleX}" y2="${ankleY}" stroke="url(#skinGrad)" stroke-width="28" stroke-linecap="round"/>

  <!-- Foot / Shoe -->
  <line x1="${ankleX}" y1="${ankleY}" x2="${toeX}" y2="${toeY}" stroke="#F8FAFC" stroke-width="18" stroke-linecap="round"/>
  <line x1="${ankleX + 4}" y1="${ankleY + 4}" x2="${toeX + 4}" y2="${toeY + 4}" stroke="${tensionColor}" stroke-width="6" stroke-linecap="round"/>

  <!-- Near Arm: Upper Arm (Shoulder vertically above Elbow) -->
  <line x1="${shoulderX}" y1="${shoulderY}" x2="${elbowX}" y2="${elbowY}" stroke="url(#skinGrad)" stroke-width="26" stroke-linecap="round"/>
  
  <!-- Forearm flat on ground -->
  <line x1="${elbowX}" y1="${elbowY}" x2="${handX}" y2="${handY}" stroke="url(#skinGrad)" stroke-width="22" stroke-linecap="round"/>
  <line x1="${elbowX + 4}" y1="${elbowY - 2}" x2="${handX - 4}" y2="${handY - 2}" stroke="#38BDF8" stroke-width="6" stroke-linecap="round" opacity="0.8"/>

  <!-- Joints Nodes -->
  <circle cx="${hip.x}" cy="${hip.y}" r="15" fill="#0F172A" stroke="#F8FAFC" stroke-width="3.5"/>
  <circle cx="${knee.x}" cy="${knee.y}" r="12" fill="#0F172A" stroke="#38BDF8" stroke-width="3"/>
  <circle cx="${ankleX}" cy="${ankleY}" r="10" fill="#0F172A" stroke="#38BDF8" stroke-width="3"/>

  <circle cx="${shoulderX}" cy="${shoulderY}" r="18" fill="#0F172A" stroke="#F8FAFC" stroke-width="4"/>
  <circle cx="${shoulderX}" cy="${shoulderY}" r="7" fill="${tensionColor}"/>

  <circle cx="${elbowX}" cy="${elbowY}" r="14" fill="#0F172A" stroke="${tensionColor}" stroke-width="3.5"/>
  <circle cx="${elbowX}" cy="${elbowY}" r="5" fill="#FFFFFF"/>

  <circle cx="${handX}" cy="${handY}" r="12" fill="#F8FAFC" stroke="#0F172A" stroke-width="3"/>

  <!-- Head & Neck in neutral cervical alignment -->
  <line x1="${shoulderX}" y1="${shoulderY}" x2="${head.x}" y2="${head.y}" stroke="#334155" stroke-width="20" stroke-linecap="round"/>
  <circle cx="${head.x}" cy="${head.y}" r="28" fill="#F8FAFC"/>
  <!-- Focus Visor Gaze -->
  <line x1="${head.x + 8}" y1="${head.y - 4}" x2="${head.x + 36}" y2="${head.y - 4}" stroke="${tensionColor}" stroke-width="6" stroke-linecap="round" filter="url(#glow)"/>

  <!-- Top HUD: Exercise Name & Real-time Phase -->
  <rect x="25" y="25" width="290" height="60" rx="14" fill="#000000" fill-opacity="0.75" stroke="#334155" stroke-width="1.5"/>
  <circle cx="50" cy="55" r="8" fill="${tensionColor}"/>
  <text x="70" y="48" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="12" font-weight="700">ПЛАНКА НА ПРЕДПЛЕЧЬЯХ</text>
  <text x="70" y="68" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="14" font-weight="800">${phaseText}</text>

  <!-- Cadence & Breathing Banner -->
  <rect x="${WIDTH / 2 - 145}" y="${HEIGHT - 75}" width="290" height="42" rx="12" fill="#000000" fill-opacity="0.8" stroke="${breatheColor}" stroke-width="1.5"/>
  <text x="${WIDTH / 2}" y="${HEIGHT - 48}" fill="${breatheColor}" font-family="system-ui, sans-serif" font-size="13" font-weight="800" text-anchor="middle">${breatheText}</text>

  <!-- Biomechanical Spine Alignment Badge -->
  <rect x="${WIDTH - 155}" y="25" width="130" height="60" rx="14" fill="#000000" fill-opacity="0.75" stroke="#334155" stroke-width="1.5"/>
  <text x="${WIDTH - 90}" y="48" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="11" font-weight="700" text-anchor="middle">ЛИНИЯ КОРПУСА</text>
  <text x="${WIDTH - 90}" y="70" fill="#10B981" font-family="system-ui, sans-serif" font-size="16" font-weight="900" text-anchor="middle">180° ПРЯМАЯ</text>

  <!-- Left Side Core Tension Pulsing Meter -->
  <rect x="25" y="110" width="8" height="240" rx="4" fill="#1E293B"/>
  <rect x="25" y="${110 + (1 - tensionPulse) * 240}" width="8" height="${tensionPulse * 240}" rx="4" fill="url(#muscleGrad)"/>
  <circle cx="29" cy="${110 + (1 - tensionPulse) * 240}" r="7" fill="#FFFFFF" stroke="${tensionColor}" stroke-width="3"/>
</svg>`;

  const filename = path.join(FRAMES_DIR, `frame_${String(i).padStart(3, '0')}.svg`);
  fs.writeFileSync(filename, svg);
}

console.log('Assembling frames into 30fps continuous video with ffmpeg...');
const outputPath = path.resolve(__dirname, '../apps/web/public/exercises/plank.mp4');

execSync(
  `ffmpeg -y -r ${FPS} -i ${FRAMES_DIR}/frame_%03d.svg -c:v libx264 -pix_fmt yuv420p -profile:v main -level 4.0 -preset fast -crf 20 -movflags +faststart ${outputPath}`,
  { stdio: 'inherit' }
);

console.log('✅ plank.mp4 rendered successfully!');
