//import './style.css'

// src/main.js
import * as THREE from "three";

// === Global sensor state ===
const sensorState = {
  joyX: 512,
  joyY: 512,
  button: 0,
  distance: -1,
};

// Normalize helper
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function mapRange(value, inMin, inMax, outMin, outMax) {
  const t = (value - inMin) / (inMax - inMin);
  return outMin + clamp(t, 0, 1) * (outMax - outMin);
}

// === Three.js setup ===
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000020); // dark space

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 2, 8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.style.margin = "0";
document.body.appendChild(renderer.domElement);

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambient);

const directional = new THREE.DirectionalLight(0xffffff, 0.8);
directional.position.set(5, 10, 7);
scene.add(directional);

// Ship: a cube + small “cockpit”
const shipGeometry = new THREE.BoxGeometry(1, 0.5, 2);
const shipMaterial = new THREE.MeshStandardMaterial({ color: 0x00aaff });
const ship = new THREE.Mesh(shipGeometry, shipMaterial);
scene.add(ship);

const cockpitGeometry = new THREE.BoxGeometry(0.5, 0.3, 0.7);
const cockpitMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
cockpit.position.set(0, 0.3, 0.2);
ship.add(cockpit);

// “Danger ring” around the ship
const ringGeometry = new THREE.TorusGeometry(3, 0.05, 16, 64);
const ringMaterial = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  transparent: true,
  opacity: 0.7,
  //wireframe: true,
});
const dangerRing = new THREE.Mesh(ringGeometry, ringMaterial);
dangerRing.rotation.x = Math.PI / 2;
scene.add(dangerRing);

// Some stars
const starGeometry = new THREE.BufferGeometry();
const starCount = 500;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount * 3; i += 3) {
  starPositions[i] = (Math.random() - 0.5) * 100;
  starPositions[i + 1] = (Math.random() - 0.5) * 100;
  starPositions[i + 2] = (Math.random() - 0.5) * 100;
}
starGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(starPositions, 3)
);
const starMaterial = new THREE.PointsMaterial({ size: 0.2 });
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// === WebSocket – connect to Node bridge === ***caution - don't mess with this code
let lastMessageTime = 0;

function connectWebSocket() {
  const socket = new WebSocket("ws://localhost:8080");

  socket.addEventListener("open", () => {
    console.log("Connected to sensor WebSocket");
  });

  socket.addEventListener("message", (event) => {
    lastMessageTime = performance.now();
    try {
      const data = JSON.parse(event.data);
      sensorState.joyX = typeof data.joyX === "number" ? data.joyX : sensorState.joyX;
      sensorState.joyY = typeof data.joyY === "number" ? data.joyY : sensorState.joyY;
      sensorState.button =
        typeof data.button === "number" ? data.button : sensorState.button;
      sensorState.distance =
        typeof data.distance === "number" ? data.distance : sensorState.distance;
    } catch (err) {
      console.error("Bad sensor JSON:", event.data);
    }
  });

  socket.addEventListener("close", () => {
    console.warn("WebSocket closed. Reconnecting in 2 seconds...");
    setTimeout(connectWebSocket, 2000);
  });

  socket.addEventListener("error", (err) => {
    console.error("WebSocket error:", err);
    socket.close();
  });
}

connectWebSocket();

// === Animation Loop ===
let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  updateScene(dt);
  renderer.render(scene, camera);
}

function updateScene(dt, now) {
  // 1. Joystick mapping
  // Raw: 0–1023, center ~512
  const center = 512;
  const range = 400; // treat ±400 as full deflection

  const dxRaw = sensorState.joyX - center;
  const dyRaw = sensorState.joyY - center;

  // Normalize to [-1, 1]
  let dxNorm = clamp(dxRaw / range, -1, 1);
  let dyNorm = clamp(dyRaw / range, -1, 1);

  if (dxNorm < 0.25 && dxNorm > -0.25) {
    dxNorm = 0;
  }

  if (dyNorm < 0.25 && dyNorm > -0.25) {
    dyNorm = 0;
  }

  // Movement speed (units per second)
  const baseSpeed = 3;
  const boostMultiplier = sensorState.button === 1 ? 2 : 1; // button pressed = boost
  const speed = baseSpeed * boostMultiplier;

  // Apply movement: x (left/right), z (forward/back)
  ship.position.x += dxNorm * speed * dt;
  ship.position.z += dyNorm * speed * dt;

  // Slight bank/tilt based on joystick
  ship.rotation.z = -dxNorm * 0.5; // roll left/right
  ship.rotation.x = dyNorm * 0.3;  // pitch up/down

  // 2. Distance mapping to colors & danger ring
  let distance = sensorState.distance;
  let distanceValid = distance > 0;

  // Map distance range for UI; clamp 5–200 cm
  if (distanceValid) {
    distance = clamp(distance, 5, 200);
  } else {
    distance = 200; // treat unknown as "far"
  }

  // Danger ring radius based on distance
  const minRadius = 2.5;
  const maxRadius = 5.0;
  const radius = mapRange(distance, 5, 200, minRadius, maxRadius);
  const safeScale = Math.max(radius / 3, 0.1); // base torus radius is 3
  dangerRing.scale.setScalar(safeScale); 

  // Color mapping for “danger”
  // 5cm (danger) → red, 200cm (safe) → green
  const dangerT = mapRange(distance, 5, 200, 0, 1); // 0 = danger, 1 = safe

  const safeColor = new THREE.Color(0x00ff00);
  const dangerColor = new THREE.Color(0xff0000);
  const ringColor = dangerColor.clone().lerp(safeColor, dangerT);
  dangerRing.material.color.copy(ringColor);

  // Ship emissive color: red when close
  const shipBaseColor = new THREE.Color(0x00aaff);
  const shipDangerColor = new THREE.Color(0xff5500);
  const shipColor = shipDangerColor.clone().lerp(shipBaseColor, dangerT);
  ship.material.color.copy(shipColor);

  // Background slightly reacts to distance
  const bgFar = new THREE.Color(0x000033);
  const bgNear = new THREE.Color(0x660000);
  const bgColor = bgNear.clone().lerp(bgFar, dangerT);
  scene.background.copy(bgColor);

  // 3. Pulsing effect when very close
  if (distance < 10) {
    const pulse = 1 + 0.1 * Math.sin(now * 0.02);
    dangerRing.scale.multiplyScalar(pulse);
  }

  // 4. If WebSocket data stale, fade scene to gray
  const timeSinceWS = (now - lastMessageTime) / 1000;
  if (timeSinceWS > 2) {
    // no data for 2+ seconds
    scene.background.lerp(new THREE.Color(0x101010), 0.02);
  }
}

// Handle resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();