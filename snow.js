// Snow particle system - designed to be called from sketch.js
// Uses WebGL shaders for efficient particle rendering

// Vertex shader - positions each particle
const snowVertShader = `
precision highp float;

attribute vec3 aPosition;
attribute vec4 aVertexColor;
attribute float aPointSize;

uniform mat4 uProjectionMatrix;
uniform mat4 uModelViewMatrix;

varying vec4 vColor;

void main() {
  vec4 positionVec4 = vec4(aPosition, 1.0);
  gl_Position = uProjectionMatrix * uModelViewMatrix * positionVec4;
  gl_PointSize = aPointSize;
  vColor = aVertexColor;
}
`;

// Fragment shader - renders each particle as a soft circle
const snowFragShader = `
precision highp float;

varying vec4 vColor;

void main() {
  // gl_PointCoord gives us coordinates within the point sprite (0-1)
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);

  // Soft circle with glow
  float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
  float glow = exp(-dist * 4.0) * 0.5;

  vec3 color = vColor.rgb * (alpha + glow);
  float finalAlpha = alpha + glow * 0.5;

  if (finalAlpha < 0.01) discard;

  gl_FragColor = vec4(color, finalAlpha);
}
`;

// Snow configuration
let snowConfig = {
  numParticles: 20000,
  gravity: 1,
  size: 0.85,
  repelRadius: 30,
  attraction: 1.5,
  trailAlpha: 40,
  turbulence: 0.15
};

let snowShader;
let snowParticles = [];
let snowWind = { x: 0, y: 0 };
let snowPrevControlX = 0;
let snowPrevControlY = 0;

// Control position (in WEBGL coords, origin at center)
let snowControlX = 0;
let snowControlY = 0;

// Set control position from external source (e.g., pose landmark)
function setSnowControlPosition(x, y) {
  snowControlX = x;
  snowControlY = y;
}

class SnowParticle {
  constructor() {
    this.reset();
  }

  reset(startAtTop = false) {
    this.x = random(-width / 2, width / 2);
    this.y = startAtTop ? -height / 2 - random(50) : random(-height / 2, height / 2);
    this.z = random(-50, 50);

    this.vx = 0;
    this.vy = 0;
    this.vz = 0;

    // Fall speed varies by particle
    this.fallSpeed = random(0.5, 10);

    this.size = 0.85;

    // White with varying brightness
    this.brightness = random(0.6, 1);
  }

  update() {
    // Apply wind from wrist movement
    this.vx += snowWind.x * 1.5;
    this.vy += snowWind.y * 0.05;

    // Wrist/control point interaction (already in WEBGL coords)
    let dx = snowControlX - this.x;
    let dy = snowControlY - this.y;
    let distSq = dx * dx + dy * dy;
    let dist = Math.sqrt(distSq);

    // Repulsion zone - push particles away
    let repelRadius = snowConfig.repelRadius;
    if (dist < repelRadius && dist > 1) {
      let strength = 1 - dist / repelRadius;
      let repulsion = strength * strength * 1.5;
      this.vx -= (dx / dist) * repulsion;
      this.vy -= (dy / dist) * repulsion;
    }
    // Gentle attraction toward control point (creates density around wrist)
    else {
      let attractRadius = 800;
      if (dist < attractRadius && dist > 1) {
        let strength = 1 - dist / attractRadius;
        let attraction = strength * strength * snowConfig.attraction;
        this.vx += (dx / dist) * attraction;
        this.vy += (dy / dist) * attraction;
      }
    }

    // Gravity - snow falls down (positive y in p5 WEBGL)
    this.vy += this.fallSpeed * 0.05 * snowConfig.gravity;

    // Add gentle turbulence
    let turb = snowConfig.turbulence;
    this.vx += random(-turb, turb);
    this.vy += random(-turb * 0.8, turb * 0.8);

    // Damping
    this.vx *= 0.95;
    this.vy *= 0.98;

    // Update position
    this.x += this.vx;
    this.y += this.vy;

    // Wrap horizontally
    let margin = 50;
    if (this.x < -width / 2 - margin) this.x = width / 2 + margin;
    if (this.x > width / 2 + margin) this.x = -width / 2 - margin;

    // Reset to top when falling off bottom
    if (this.y > height / 2 + margin) {
      this.reset(true);
    }
  }

  getColor() {
    let b = this.brightness;
    return [b, b, b];
  }
}

// Initialize snow system - call this from setup()
function initSnow(numParticles = 20000) {
  snowConfig.numParticles = numParticles;
  snowShader = createShader(snowVertShader, snowFragShader);

  snowParticles = [];
  for (let i = 0; i < snowConfig.numParticles; i++) {
    snowParticles.push(new SnowParticle());
  }
}

// Update snow configuration
function setSnowConfig(config) {
  Object.assign(snowConfig, config);
}

// Initialize slider controls
function initSnowControls() {
  const sliders = [
    { id: 'gravity', key: 'gravity', valId: 'gravity-val' },
    { id: 'size', key: 'size', valId: 'size-val' },
    { id: 'repel', key: 'repelRadius', valId: 'repel-val' },
    { id: 'attraction', key: 'attraction', valId: 'attraction-val' },
    { id: 'trail', key: 'trailAlpha', valId: 'trail-val' },
    { id: 'turbulence', key: 'turbulence', valId: 'turbulence-val' }
  ];

  sliders.forEach(({ id, key, valId }) => {
    const slider = document.getElementById(id);
    const valSpan = document.getElementById(valId);
    if (slider && valSpan) {
      slider.addEventListener('input', () => {
        const val = parseFloat(slider.value);
        snowConfig[key] = val;
        valSpan.textContent = val;
      });
    }
  });
}

// Draw snow - call this from draw()
function drawSnow() {
  if (!snowShader || snowParticles.length === 0) return;

  // Draw fading overlay for motion trails
  push();
  resetShader();
  blendMode(BLEND);
  noStroke();
  fill(0, snowConfig.trailAlpha);
  rect(-width/2, -height/2, width, height);
  pop();

  // Calculate wind from wrist/control movement
  let controlVelX = snowControlX - snowPrevControlX;
  let controlVelY = snowControlY - snowPrevControlY;
  snowWind.x += (controlVelX * 0.1 - snowWind.x) * 0.25;
  snowWind.y += (controlVelY * 0.1 - snowWind.y) * 0.05;
  snowPrevControlX = snowControlX;
  snowPrevControlY = snowControlY;

  shader(snowShader);

  // Enable additive blending for glow effect
  blendMode(ADD);

  // Update and draw particles
  beginShape(POINTS);

  for (let p of snowParticles) {
    p.update();

    let [r, g, b] = p.getColor();

    strokeWeight(snowConfig.size);

    stroke(r * 255, g * 255, b * 255);
    vertex(p.x, p.y, p.z);
  }

  endShape();

  blendMode(BLEND);
  resetShader();
}
