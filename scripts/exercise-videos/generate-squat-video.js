const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

const WIDTH = 640;
const HEIGHT = 800;
const FPS = 30;
const DURATION_SEC = 3.6;
const TOTAL_FRAMES = Math.round(FPS * DURATION_SEC); // 108 frames
const OUTPUT_PATH = path.resolve(__dirname, '../apps/web/public/exercises/squat.mp4');

// Ensure output directory exists
fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

console.log(`Generating smooth 30fps continuous video for Squat: ${TOTAL_FRAMES} frames...`);

// Spawn ffmpeg with raw RGBA video pipe
const ffmpeg = spawn('ffmpeg', [
  '-y',
  '-f', 'rawvideo',
  '-vcodec', 'rawvideo',
  '-s', `${WIDTH}x${HEIGHT}`,
  '-pix_fmt', 'rgba',
  '-r', `${FPS}`,
  '-i', 'pipe:0',
  '-c:v', 'libx264',
  '-profile:v', 'main',
  '-level', '4.0',
  '-pix_fmt', 'yuv420p',
  '-preset', 'fast',
  '-crf', '18',
  '-movflags', '+faststart',
  OUTPUT_PATH
]);

ffmpeg.stderr.on('data', (data) => {
  // console.error(data.toString());
});

ffmpeg.on('close', (code) => {
  if (code === 0) {
    console.log(`✅ Successfully generated smooth squat video: ${OUTPUT_PATH}`);
  } else {
    console.error(`❌ FFmpeg exited with code ${code}`);
  }
});

// Helper functions for 2D software rendering into RGBA buffer
function createFrameBuffer() {
  return Buffer.alloc(WIDTH * HEIGHT * 4);
}

function setPixel(buffer, x, y, r, g, b, a = 255) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
  const idx = (y * WIDTH + x) * 4;
  
  if (a === 255) {
    buffer[idx] = r;
    buffer[idx + 1] = g;
    buffer[idx + 2] = b;
    buffer[idx + 3] = 255;
  } else {
    const alpha = a / 255;
    const invAlpha = 1 - alpha;
    buffer[idx] = Math.round(r * alpha + buffer[idx] * invAlpha);
    buffer[idx + 1] = Math.round(g * alpha + buffer[idx + 1] * invAlpha);
    buffer[idx + 2] = Math.round(b * alpha + buffer[idx + 2] * invAlpha);
    buffer[idx + 3] = 255;
  }
}

function drawLine(buffer, x0, y0, x1, y1, r, g, b, a = 255, thickness = 1) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;

  const halfThick = Math.floor(thickness / 2);

  while (true) {
    if (thickness <= 1) {
      setPixel(buffer, x, y, r, g, b, a);
    } else {
      for (let ox = -halfThick; ox <= halfThick; ox++) {
        for (let oy = -halfThick; oy <= halfThick; oy++) {
          if (ox * ox + oy * oy <= (thickness * thickness) / 4) {
            setPixel(buffer, x + ox, y + oy, r, g, b, a);
          }
        }
      }
    }

    if (Math.abs(x - x1) < 0.5 && Math.abs(y - y1) < 0.5) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

function drawCircle(buffer, cx, cy, radius, r, g, b, a = 255, filled = true) {
  cx = Math.round(cx);
  cy = Math.round(cy);
  const rad = Math.round(radius);

  for (let y = cy - rad; y <= cy + rad; y++) {
    for (let x = cx - rad; x <= cx + rad; x++) {
      const distSq = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      if (distSq <= rad * rad) {
        if (filled || distSq >= (rad - 2) * (rad - 2)) {
          // Antialiasing edge
          const edgeDist = rad - Math.sqrt(distSq);
          const alphaFactor = edgeDist < 1 ? edgeDist : 1;
          setPixel(buffer, x, y, r, g, b, Math.round(a * Math.max(0, Math.min(1, alphaFactor))));
        }
      }
    }
  }
}

function drawCapsule(buffer, x0, y0, x1, y1, radius, r, g, b, a = 255) {
  drawLine(buffer, x0, y0, x1, y1, r, g, b, a, radius * 2);
  drawCircle(buffer, x0, y0, radius, r, g, b, a, true);
  drawCircle(buffer, x1, y1, radius, r, g, b, a, true);
}

// Render each frame of smooth continuous kinematic motion
for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
  const t = frame / TOTAL_FRAMES; // 0.0 to 1.0
  const buffer = createFrameBuffer();

  // 1. Dark Studio Gradient Background (#0F1117 to #181C26)
  for (let y = 0; y < HEIGHT; y++) {
    const factor = y / HEIGHT;
    const bgR = Math.round(15 + factor * 12);
    const bgG = Math.round(17 + factor * 14);
    const bgB = Math.round(23 + factor * 18);
    for (let x = 0; x < WIDTH; x++) {
      setPixel(buffer, x, y, bgR, bgG, bgB, 255);
    }
  }

  // 2. Perspective Studio Floor Grid & Lighting
  const floorY = 680;
  // Floor subtle glow
  drawCircle(buffer, WIDTH / 2, floorY + 30, 260, 20, 30, 45, 120, true);
  
  // Floor grid lines
  for (let i = -4; i <= 4; i++) {
    const startX = WIDTH / 2 + i * 45;
    const endX = WIDTH / 2 + i * 110;
    drawLine(buffer, startX, floorY - 20, endX, HEIGHT - 10, 45, 55, 75, 70, 1);
  }
  drawLine(buffer, 80, floorY, WIDTH - 80, floorY, 60, 75, 100, 110, 2);

  // 3. Biomechanical Kinematics Calculation (Smooth cosine ease-in-out cycle)
  // t: 0..0.48 = descent, 0.48..0.52 = bottom hold, 0.52..0.96 = ascent, 0.96..1.0 = top reset
  let depthProgress = 0;
  let phaseName = "ИСХОДНОЕ ПОЛОЖЕНИЕ";
  let inhalePhase = true;

  if (t < 0.48) {
    // Descent (Eccentric phase)
    const subT = t / 0.48;
    depthProgress = (1 - Math.cos(Math.PI * subT)) / 2; // 0 -> 1 smooth
    phaseName = "ОПУСКАНИЕ (ВДОХ)";
    inhalePhase = true;
  } else if (t < 0.52) {
    // Bottom inflection
    depthProgress = 1.0;
    phaseName = "НИЖНЯЯ ТОЧКА (ПАРАЛЛЕЛЬ)";
    inhalePhase = false;
  } else if (t < 0.96) {
    // Ascent (Concentric drive)
    const subT = (t - 0.52) / 0.44;
    depthProgress = (1 + Math.cos(Math.PI * subT)) / 2; // 1 -> 0 smooth
    phaseName = "ПОДЪЁМ (ВЫДОХ)";
    inhalePhase = false;
  } else {
    // Top lock
    depthProgress = 0.0;
    phaseName = "ФИКСАЦИЯ";
    inhalePhase = true;
  }

  // Kinematic parameters (Side/3/4 athletic view)
  const centerX = WIDTH / 2 - 10;
  
  // Standing base points
  const standingHipY = 380;
  const bottomHipY = 540;
  const hipY = standingHipY + (bottomHipY - standingHipY) * depthProgress;
  const hipX = centerX - depthProgress * 55; // Hip hinges back

  const ankleX = centerX - 25;
  const ankleY = floorY - 25;
  const toeX = centerX + 45;
  const toeY = floorY - 15;

  // Knee kinematics: hinges forward and down
  const standingKneeX = centerX - 10;
  const standingKneeY = 490;
  const bottomKneeX = centerX + 35; // tracks slightly over toes
  const bottomKneeY = 535;
  const kneeX = standingKneeX + (bottomKneeX - standingKneeX) * depthProgress;
  const kneeY = standingKneeY + (bottomKneeY - standingKneeY) * depthProgress;

  // Torso / Spine kinematics: hinges forward to maintain balance
  const torsoLength = 175;
  const torsoAngleDeg = 10 + depthProgress * 28; // 10 deg to 38 deg forward lean
  const torsoAngleRad = (torsoAngleDeg * Math.PI) / 180;
  
  const shoulderX = hipX + Math.sin(torsoAngleRad) * torsoLength;
  const shoulderY = hipY - Math.cos(torsoAngleRad) * torsoLength;

  // Head kinematics
  const headDist = 52;
  const headX = shoulderX + Math.sin((torsoAngleDeg - 10) * Math.PI / 180) * headDist;
  const headY = shoulderY - Math.cos((torsoAngleDeg - 10) * Math.PI / 180) * headDist;

  // Arm kinematics (counterbalance reach forward during descent)
  const armExtend = depthProgress;
  const elbowX = shoulderX + 55 + armExtend * 45;
  const elbowY = shoulderY + 55 - armExtend * 15;
  const handX = elbowX + 50 + armExtend * 50;
  const handY = elbowY - 10 - armExtend * 25;

  // 4. Contact Shadow on Floor (Scales with depth)
  const shadowWidth = 90 + depthProgress * 30;
  const shadowAlpha = 160 + Math.round(depthProgress * 60);
  drawCircle(buffer, ankleX + 25, floorY - 8, shadowWidth, 5, 8, 15, shadowAlpha, true);

  // 5. Draw Biomechanical Athlete Body (Modern High-Tech Cyber-Athletic Style)
  
  // Highlight muscle tension color: Emerald #10B981 during rest, Amber/Orange #F59E0B / #EF4444 during max tension
  const tensionR = Math.round(52 + depthProgress * 200);
  const tensionG = Math.round(211 - depthProgress * 80);
  const tensionB = Math.round(153 - depthProgress * 100);

  // Far Leg (depth shadow)
  drawCapsule(buffer, hipX - 15, hipY + 5, kneeX - 15, kneeY + 5, 18, 50, 60, 80, 200);
  drawCapsule(buffer, kneeX - 15, kneeY + 5, ankleX - 15, ankleY, 15, 45, 55, 75, 200);
  drawCapsule(buffer, ankleX - 15, ankleY, toeX - 15, toeY, 12, 40, 50, 70, 200);

  // Far Arm
  drawCapsule(buffer, shoulderX - 12, shoulderY, elbowX - 15, elbowY, 12, 50, 65, 85, 180);
  drawCapsule(buffer, elbowX - 15, elbowY, handX - 15, handY, 10, 45, 60, 80, 180);

  // Torso / Spine / Core
  drawCapsule(buffer, hipX, hipY, shoulderX, shoulderY, 26, 30, 41, 59, 255);
  // Chest / Ribcage accent
  drawCircle(buffer, shoulderX - 8, shoulderY + 25, 20, 40, 55, 80, 220, true);
  // Core / Abs accent (Glows with intra-abdominal pressure)
  drawCapsule(buffer, hipX + 8, hipY - 20, shoulderX - 2, shoulderY + 45, 14, tensionR, tensionG, tensionB, 180);

  // Near Leg (Main highlighted quad/hamstring/glute)
  // Glute & Thigh (Quad)
  drawCapsule(buffer, hipX, hipY, kneeX, kneeY, 24, 28, 38, 56, 255);
  // Active Quad Muscle Glow Strip
  drawLine(buffer, hipX + 4, hipY - 4, kneeX + 2, kneeY - 4, tensionR, tensionG, tensionB, 240, 7);

  // Shin & Calf
  drawCapsule(buffer, kneeX, kneeY, ankleX, ankleY, 18, 35, 45, 65, 255);
  drawLine(buffer, kneeX - 2, kneeY + 2, ankleX - 2, ankleY - 4, 70, 95, 130, 200, 4);

  // Foot / Athletic Shoe
  drawCapsule(buffer, ankleX - 6, ankleY + 4, toeX + 8, toeY + 4, 14, 220, 230, 240, 255);
  drawCapsule(buffer, ankleX - 4, ankleY + 8, toeX + 6, toeY + 8, 8, tensionR, tensionG, tensionB, 255);

  // Joint Nodes (Biomechanical Markers)
  drawCircle(buffer, kneeX, kneeY, 9, tensionR, tensionG, tensionB, 255, true);
  drawCircle(buffer, kneeX, kneeY, 4, 255, 255, 255, 255, true);
  
  drawCircle(buffer, hipX, hipY, 10, 240, 245, 255, 255, true);
  drawCircle(buffer, hipX, hipY, 5, tensionR, tensionG, tensionB, 255, true);

  drawCircle(buffer, ankleX, ankleY, 8, 200, 215, 235, 255, true);

  // Near Arm (Shoulder -> Elbow -> Hand)
  drawCapsule(buffer, shoulderX, shoulderY, elbowX, elbowY, 15, 35, 48, 70, 255);
  drawCapsule(buffer, elbowX, elbowY, handX, handY, 13, 40, 55, 78, 255);
  drawCircle(buffer, shoulderX, shoulderY, 11, 240, 245, 255, 255, true);
  drawCircle(buffer, elbowX, elbowY, 7, tensionR, tensionG, tensionB, 255, true);
  drawCircle(buffer, handX, handY, 9, 230, 235, 245, 255, true);

  // Head & Neck
  drawLine(buffer, shoulderX, shoulderY, headX, headY, 40, 52, 75, 255, 14);
  drawCircle(buffer, headX, headY, 23, 235, 240, 250, 255, true);
  // Athletic Visor / Focus Gaze line
  drawCapsule(buffer, headX + 4, headY - 4, headX + 24, headY - 4, 5, tensionR, tensionG, tensionB, 240);

  // 6. Real-Time HUD Overlay on Video
  // Rep Cadence Arc (Top Right)
  const hudCenterX = WIDTH - 55;
  const hudCenterY = 55;
  drawCircle(buffer, hudCenterX, hudCenterY, 26, 30, 40, 55, 180, false);
  drawCircle(buffer, hudCenterX, hudCenterY, 22, tensionR, tensionG, tensionB, 220, false);
  drawCircle(buffer, hudCenterX, hudCenterY, 8, tensionR, tensionG, tensionB, 255, true);

  // Depth percentage bar (Left Edge)
  const barX = 35;
  const barY = 160;
  const barH = 260;
  drawLine(buffer, barX, barY, barX, barY + barH, 40, 50, 70, 150, 6);
  drawLine(buffer, barX, barY + barH - depthProgress * barH, barX, barY + barH, tensionR, tensionG, tensionB, 255, 6);
  drawCircle(buffer, barX, barY + barH - depthProgress * barH, 7, 255, 255, 255, 255, true);

  // Push frame to ffmpeg pipe
  ffmpeg.stdin.write(buffer);
}

ffmpeg.stdin.end();
