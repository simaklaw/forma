const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WIDTH = 640;
const HEIGHT = 800;
const FPS = 30;
const TOTAL_FRAMES = 90;

const dir = '/tmp/hip_thrust_frames';
if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });

console.log('Rendering frames for Hip Thrust (Ягодичный мост с опорой на скамью)...');

for (let i = 0; i < TOTAL_FRAMES; i++) {
  const t = i / TOTAL_FRAMES;
  let depth = 0;
  let phaseText = "ИСХОДНОЕ ПОЛОЖЕНИЕ";
  let breatheText = "ВДОХ";
  let breatheColor = "#3B82F6";

  if (t < 0.45) {
    const sub = t / 0.45;
    depth = (1 - Math.cos(Math.PI * sub)) / 2;
    phaseText = "ПОДЪЁМ ТАЗА (МОСТ)";
    breatheText = "МОЩНЫЙ ВЫДОХ";
    breatheColor = "#10B981";
  } else if (t < 0.55) {
    depth = 1.0;
    phaseText = "ПИКОВАЯ ПАРАЛЛЕЛЬ (180°)";
    breatheText = "МАКСИМАЛЬНОЕ СЖАТИЕ ЯГОДИЦ";
    breatheColor = "#EF4444";
  } else if (t < 0.95) {
    const sub = (t - 0.55) / 0.40;
    depth = (1 + Math.cos(Math.PI * sub)) / 2;
    phaseText = "ОПУСКАНИЕ ТАЗА";
    breatheText = "КОНТРОЛИРУЕМЫЙ ВДОХ";
    breatheColor = "#3B82F6";
  } else {
    depth = 0.0;
    phaseText = "НИЖНЯЯ ТОЧКА";
    breatheText = "РАСТЯЖЕНИЕ";
    breatheColor = "#3B82F6";
  }

  const floorY = 660;

  // Bench structure
  const benchX = 140;
  const benchY = 490;
  const benchW = 100;
  const benchH = floorY - benchY;

  // Fixed Anchor: Upper back / Scapulae on bench
  const shoulder = { x: 235, y: 480 };
  const head = { x: 200, y: 440 };

  // Fixed Feet on floor
  const foot = { x: 440, y: floorY - 14 };
  const ankle = { x: 435, y: floorY - 22 };

  // Knee at ~ 90° angle in top lock
  const knee = { x: 410, y: 480 };

  // Pelvis / Hip elevation:
  // Bottom: pelvis drops low (y ~ 590)
  // Top: pelvis locks horizontal with shoulder and knee at y ~ 480
  const bottomHip = { x: 300, y: 590 };
  const topHip = { x: 315, y: 480 };
  const hip = {
    x: bottomHip.x + (topHip.x - bottomHip.x) * depth,
    y: bottomHip.y + (topHip.y - bottomHip.y) * depth,
  };

  // Barbells on hips (optional visual cue)
  const barbell = { x: hip.x + 5, y: hip.y - 15 };

  const tensionColor = depth > 0.6 ? "#EF4444" : depth > 0.2 ? "#F59E0B" : "#10B981";
  const hipAngle = Math.round(115 + depth * 65);

  const svg = `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0B0F19"/><stop offset="50%" stop-color="#111827"/><stop offset="100%" stop-color="#1E293B"/>
    </linearGradient>
    <linearGradient id="gluteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
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

  <!-- Gym Soft Plyo Bench -->
  <rect x="${benchX}" y="${benchY}" width="${benchW}" height="${benchH}" rx="8" fill="#1E293B" stroke="#334155" stroke-width="3"/>
  <rect x="${benchX - 6}" y="${benchY - 6}" width="${benchW + 12}" height="14" rx="4" fill="#334155" stroke="#475569" stroke-width="2"/>

  <!-- Contact Shadows -->
  <ellipse cx="${benchX + benchW / 2}" cy="${floorY - 4}" rx="55" ry="10" fill="#000000" opacity="0.6"/>
  <ellipse cx="${foot.x + 15}" cy="${floorY - 4}" rx="45" ry="10" fill="#000000" opacity="0.75"/>
  <ellipse cx="${hip.x}" cy="${floorY - 2}" rx="${50 - depth * 15}" ry="8" fill="#000000" opacity="${0.6 - depth * 0.4}"/>

  <!-- Horizontal Hip Thrust Axis Guide Line -->
  <line x1="${shoulder.x}" y1="${shoulder.y}" x2="${knee.x}" y2="${knee.y}" stroke="#38BDF8" stroke-width="2" stroke-dasharray="6,6" opacity="${0.2 + depth * 0.6}"/>

  <!-- Torso (Scapula pivot on bench to Hip) -->
  <line x1="${shoulder.x}" y1="${shoulder.y}" x2="${hip.x}" y2="${hip.y}" stroke="url(#skinGrad)" stroke-width="46" stroke-linecap="round"/>

  <!-- Gluteus & Pelvic Extension Glow Wave -->
  <line x1="${hip.x - 15}" y1="${hip.y}" x2="${hip.x + 20}" y2="${hip.y - 12}" stroke="url(#gluteGrad)" stroke-width="20" stroke-linecap="round" opacity="0.95" filter="url(#glow)"/>

  <!-- Thigh (Hip to Knee) -->
  <line x1="${hip.x}" y1="${hip.y}" x2="${knee.x}" y2="${knee.y}" stroke="url(#skinGrad)" stroke-width="38" stroke-linecap="round"/>
  <line x1="${hip.x + 4}" y1="${hip.y - 4}" x2="${knee.x - 4}" y2="${knee.y + 2}" stroke="url(#gluteGrad)" stroke-width="12" stroke-linecap="round" filter="url(#glow)"/>

  <!-- Shin (Knee to Foot) -->
  <line x1="${knee.x}" y1="${knee.y}" x2="${ankle.x}" y2="${ankle.y}" stroke="url(#skinGrad)" stroke-width="30" stroke-linecap="round"/>
  <line x1="${ankle.x - 8}" y1="${ankle.y + 6}" x2="${foot.x + 25}" y2="${foot.y + 6}" stroke="#F8FAFC" stroke-width="18" stroke-linecap="round"/>

  <!-- Barbell Pad & Plate on Hip -->
  <ellipse cx="${barbell.x}" cy="${barbell.y}" rx="14" ry="14" fill="#0F172A" stroke="${tensionColor}" stroke-width="4"/>
  <circle cx="${barbell.x}" cy="${barbell.y}" r="4" fill="#FFFFFF"/>

  <!-- Joints Nodes -->
  <circle cx="${shoulder.x}" cy="${shoulder.y}" r="16" fill="#0F172A" stroke="#F8FAFC" stroke-width="4"/>
  <circle cx="${shoulder.x}" cy="${shoulder.y}" r="6" fill="#38BDF8"/>
  <circle cx="${hip.x}" cy="${hip.y}" r="16" fill="#0F172A" stroke="${tensionColor}" stroke-width="4"/>
  <circle cx="${hip.x}" cy="${hip.y}" r="6" fill="#FFFFFF"/>
  <circle cx="${knee.x}" cy="${knee.y}" r="14" fill="#0F172A" stroke="#38BDF8" stroke-width="3"/>

  <!-- Head & Neck -->
  <line x1="${shoulder.x}" y1="${shoulder.y}" x2="${head.x}" y2="${head.y}" stroke="#334155" stroke-width="20" stroke-linecap="round"/>
  <circle cx="${head.x}" cy="${head.y}" r="28" fill="#F8FAFC"/>
  <line x1="${head.x + 8}" y1="${head.y - 4}" x2="${head.x + 36}" y2="${head.y - 4}" stroke="${tensionColor}" stroke-width="6" stroke-linecap="round" filter="url(#glow)"/>

  <!-- HUD -->
  <rect x="25" y="25" width="280" height="60" rx="14" fill="#000000" fill-opacity="0.75" stroke="#334155" stroke-width="1.5"/>
  <circle cx="50" cy="55" r="8" fill="${tensionColor}"/>
  <text x="70" y="48" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="12" font-weight="700">ЯГОДИЧНЫЙ МОСТ СО СКАМЬИ</text>
  <text x="70" y="68" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="14" font-weight="800">${phaseText}</text>

  <rect x="${WIDTH / 2 - 135}" y="${HEIGHT - 75}" width="270" height="42" rx="12" fill="#000000" fill-opacity="0.8" stroke="${breatheColor}" stroke-width="1.5"/>
  <text x="${WIDTH / 2}" y="${HEIGHT - 48}" fill="${breatheColor}" font-family="system-ui, sans-serif" font-size="13" font-weight="800" text-anchor="middle">${breatheText}</text>

  <rect x="${WIDTH - 150}" y="25" width="125" height="60" rx="14" fill="#000000" fill-opacity="0.75" stroke="#334155" stroke-width="1.5"/>
  <text x="${WIDTH - 87}" y="48" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="11" font-weight="700" text-anchor="middle">УГОЛ МОСТА</text>
  <text x="${WIDTH - 87}" y="70" fill="#38BDF8" font-family="system-ui, sans-serif" font-size="16" font-weight="900" text-anchor="middle">${hipAngle}°</text>

  <rect x="25" y="110" width="8" height="240" rx="4" fill="#1E293B"/>
  <rect x="25" y="${110 + (1 - depth) * 240}" width="8" height="${depth * 240}" rx="4" fill="url(#gluteGrad)"/>
  <circle cx="29" cy="${110 + (1 - depth) * 240}" r="7" fill="#FFFFFF" stroke="${tensionColor}" stroke-width="3"/>
</svg>`;

  fs.writeFileSync(path.join(dir, `frame_${String(i).padStart(3, '0')}.svg`), svg);
}

const outputPath = path.resolve(__dirname, '../apps/web/public/exercises/hip-thrust.mp4');
const jpgPath = path.resolve(__dirname, '../apps/web/public/exercises/hip-thrust.jpg');

execSync(
  `ffmpeg -y -r ${FPS} -i ${dir}/frame_%03d.svg -c:v libx264 -pix_fmt yuv420p -profile:v main -level 4.0 -preset fast -crf 20 -movflags +faststart ${outputPath}`,
  { stdio: 'inherit' }
);
execSync(
  `ffmpeg -y -ss 00:00:01.50 -i ${outputPath} -vframes 1 -q:v 2 ${jpgPath}`,
  { stdio: 'inherit' }
);
console.log('✅ hip-thrust.mp4 and hip-thrust.jpg generated successfully!');
