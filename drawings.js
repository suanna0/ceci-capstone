// drawings.js - Drawing helper functions for sketch.js
// Pose landmark indices:
// 0: nose, 11/12: shoulders, 13/14: elbows, 15/16: wrists
// 23/24: hips, 25/26: knees, 27/28: ankles

// Draw a circle at a pose landmark
function drawPoseCircle(landmarkIndex, size, r, g, b, a = 255) {
  let pt = getPosePoint(landmarkIndex);
  if (!pt) return;
  noStroke();
  fill(r, g, b, a);
  circle(pt.x, pt.y, size);
}

// Draw a line between two pose landmarks
function drawPoseLine(indexA, indexB, weight, r, g, b, a = 255) {
  let ptA = getPosePoint(indexA);
  let ptB = getPosePoint(indexB);
  if (!ptA || !ptB) return;
  stroke(r, g, b, a);
  strokeWeight(weight);
  line(ptA.x, ptA.y, ptB.x, ptB.y);
}

// Get the screen position of a pose landmark
function getPosePoint(landmarkIndex) {
  if (!poseLandmarks || !poseLandmarks.landmarks || poseLandmarks.landmarks.length === 0) return null;
  let pt = poseLandmarks.landmarks[0][landmarkIndex];
  if (!pt) return null;
  return {
    x: map(pt.x, 0, 1, width, 0),
    y: map(pt.y, 0, 1, 0, height),
    z: pt.z
  };
}

function drawQuadrangle() {
  drawPoseLine(15, 27, 1, 255, 0, 0, 180);
  drawPoseLine(27, 28, 1, 255, 0, 0, 180);
  drawPoseLine(28, 16, 1, 255, 0, 0, 180);
  drawPoseLine(16, 15, 1, 255, 0, 0, 180);
}

// ---- Physics Circle Grid ----
let particles = [];
let particlesInitialized = false;
let particleWord = "i";  // Default word

// Call this from keyTyped() in sketch.js
function handleParticleInput(k) {
  if (k === 'Backspace' || k === 'Delete') {
    particleWord = particleWord.slice(0, -1);
  } else if (k.length === 1) {
    particleWord += k;
  }
}

// Clear the word
function clearParticleWord() {
  particleWord = "";
}

// Set the word directly
function setParticleWord(word) {
  particleWord = word;
}

// Call once in setup() to create the grid
function initParticles(cols = 20, rows = 15, size = 8) {
  particles = [];
  let spacingX = width / (cols + 1);
  let offset = - spacingX/ 2;
  let spacingY = height / (rows + 1);

  for (let i = 1; i <= cols; i++) {
    for (let j = 1; j <= rows; j++) {
      if (j % 2 === 0) {
        offset = 0;
      } else {
        offset = spacingX / 2;
      }
      particles.push({
        x: i * spacingX + offset,
        y: j * spacingY,
        homeX: i * spacingX + offset,
        homeY: j * spacingY,
        vx: 0,
        vy: 0,
        size: size
      });
    }
  }
  particlesInitialized = true;
}

// Call in draw() to update and render particles
function updateParticles() {
  if (!particlesInitialized) initParticles();

  // Get quadrangle points
  let p1 = getPosePoint(15); // left wrist
  let p2 = getPosePoint(27); // left ankle
  let p3 = getPosePoint(28); // right ankle
  let p4 = getPosePoint(16); // right wrist

  let hasQuad = p1 && p2 && p3 && p4;

  for (let p of particles) {
    // If inside quadrangle, push outward
    if (hasQuad && pointInQuad(p.x, p.y, p1, p2, p3, p4)) {
      // Find center of quad and push away from it
      let cx = (p1.x + p2.x + p3.x + p4.x) / 4;
      let cy = (p1.y + p2.y + p3.y + p4.y) / 4;
      let dx = p.x - cx;
      let dy = p.y - cy;
      let dist = sqrt(dx * dx + dy * dy) || 1;
      let force = 20;
      p.vx += (dx / dist) * force;
      p.vy += (dy / dist) * force;
    }

    // Slowly return home
    let homeForce = 0.0015;
    p.vx += (p.homeX - p.x) * homeForce;
    p.vy += (p.homeY - p.y) * homeForce;

    // Apply velocity with damping
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.8;
    p.vy *= 0.8;
  }
}

function drawParticles(r = 100, g = 150, b = 255, a = 200) {
  noStroke();
  fill(r, g, b, a);
  let word = particleWord || "a";
  for (let p of particles) {
    text(word, p.x, p.y);
  }
}

// Check if point is inside quadrangle using cross product method
function pointInQuad(px, py, p1, p2, p3, p4) {
  return pointInTriangle(px, py, p1, p2, p3) || pointInTriangle(px, py, p1, p3, p4);
}

function pointInTriangle(px, py, a, b, c) {
  let d1 = sign(px, py, a.x, a.y, b.x, b.y);
  let d2 = sign(px, py, b.x, b.y, c.x, c.y);
  let d3 = sign(px, py, c.x, c.y, a.x, a.y);
  let hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
  let hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
  return !(hasNeg && hasPos);
}

function sign(px, py, x1, y1, x2, y2) {
  return (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
}