import './style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// =========================================
// Scene
// =========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1e1e1e);

// =========================================
// Camera
// =========================================
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 1.5, 8);

// =========================================
// Renderer
// =========================================
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// =========================================
// Orbit Controls
// =========================================
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 1, 0);
controls.minDistance = 2;
controls.maxDistance = 15;
controls.update();

// =========================================
// Lighting
// =========================================
scene.add(new THREE.AmbientLight(0xffffff, 1.4));

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(5, 6, 5);
scene.add(dirLight);

const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight2.position.set(-5, 4, -3);
scene.add(dirLight2);

scene.add(new THREE.GridHelper(10, 10));
scene.add(new THREE.AxesHelper(2));

// =========================================
// Global state
// =========================================
let handModel = null;

const state = {
  thumb: 0,
  index: 0,
  middle: 0,
  ring: 0,
  pinky: 0
};

const fingerNodeNames = {
  thumb: 'Contr_Fin_Tumb_03_01',
  index: 'Fin_Index_03_01',
  middle: 'Fin_Middle_03_03',
  ring: 'Fin_Ring_03_06',
  pinky: 'Fig_Pinky_03_06'
};

const fingerNodes = {
  thumb: null,
  index: null,
  middle: null,
  ring: null,
  pinky: null
};

const fingerAxes = {
  thumb: 'x',
  index: 'y',
  middle: 'y',
  ring: 'y',
  pinky: 'y'
};

// Flip any one if it bends the wrong way
const fingerSigns = {
  thumb: -1,
  index: -1,
  middle: -1,
  ring: -1,
  pinky: -1
};

const sliderRefs = {};

// =========================================
// Helpers
// =========================================
function autoScaleAndCenter(object, targetSize = 4) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  if (maxDim === 0) {
    console.error('Model size is zero.');
    return;
  }

  const scale = targetSize / maxDim;
  object.scale.setScalar(scale);

  const scaledBox = new THREE.Box3().setFromObject(object);
  const center = scaledBox.getCenter(new THREE.Vector3());

  object.position.x -= center.x;
  object.position.y -= center.y;
  object.position.z -= center.z;

  const finalBox = new THREE.Box3().setFromObject(object);
  const finalSize = finalBox.getSize(new THREE.Vector3());
  object.position.y += finalSize.y / 2;
}

function findNodeByExactName(root, name) {
  let found = null;

  root.traverse((child) => {
    if (child.name === name) {
      found = child;
    }
  });

  return found;
}

function mapFingerNodes(model) {
  for (const finger of Object.keys(fingerNodeNames)) {
    const nodeName = fingerNodeNames[finger];
    fingerNodes[finger] = findNodeByExactName(model, nodeName);
  }

  console.log('========== PHASE 3 NODE MAP ==========');
  for (const finger of Object.keys(fingerNodes)) {
    console.log(finger.toUpperCase(), '=>', fingerNodes[finger]?.name || 'NOT FOUND');
  }
  console.log('======================================');
}

function applyFingerRotation(fingerName, angleDegrees) {
  const node = fingerNodes[fingerName];
  if (!node) return;

  const axis = fingerAxes[fingerName];
  const sign = fingerSigns[fingerName];

  node.rotation[axis] = sign * THREE.MathUtils.degToRad(angleDegrees);
}

function updateModelFromState() {
  applyFingerRotation('thumb', state.thumb);
  applyFingerRotation('index', state.index);
  applyFingerRotation('middle', state.middle);
  applyFingerRotation('ring', state.ring);
  applyFingerRotation('pinky', state.pinky);
}

async function sendHandToArduino() {
  try {
    const response = await fetch('http://localhost:3000/hand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    });

    const result = await response.json();
    console.log('Server response:', result);
  } catch (error) {
    console.error('Error sending to Arduino:', error);
  }
}

let sendTimeout = null;

function queueSendToArduino() {
  clearTimeout(sendTimeout);
  sendTimeout = setTimeout(() => {
    sendHandToArduino();
  }, 80);
}

function setFingerValue(key, value) {
  state[key] = value;

  if (sliderRefs[key]) {
    sliderRefs[key].slider.value = String(value);
    sliderRefs[key].valueEl.textContent = String(value);
  }
}

function syncAll() {
  updateModelFromState();
  queueSendToArduino();
}

function addAxisHelperToNode(node, size = 0.2) {
  if (!node) return;
  const helper = new THREE.AxesHelper(size);
  node.add(helper);
}

// =========================================
// UI
// =========================================
function createSliderRow(label, key) {
  const row = document.createElement('div');
  row.className = 'slider-row';

  const labelEl = document.createElement('label');
  labelEl.textContent = `${label}:`;

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '90';
  slider.value = '0';

  const valueEl = document.createElement('span');
  valueEl.className = 'value';
  valueEl.textContent = '0';

  slider.addEventListener('input', () => {
    state[key] = Number(slider.value);
    valueEl.textContent = slider.value;
    updateModelFromState();
    queueSendToArduino();
  });

  row.appendChild(labelEl);
  row.appendChild(slider);
  row.appendChild(valueEl);

  sliderRefs[key] = { slider, valueEl };
  return row;
}

function buildUI() {
  const panel = document.createElement('div');
  panel.id = 'control-panel';

  const title = document.createElement('h2');
  title.textContent = 'Phase 3: Digital / Physical Hand';
  panel.appendChild(title);

  const desc = document.createElement('p');
  desc.textContent =
    'Move the sliders to control both the 3D robot hand and the Arduino servo hand.';
  panel.appendChild(desc);

  panel.appendChild(createSliderRow('Thumb', 'thumb'));
  panel.appendChild(createSliderRow('Index', 'index'));
  panel.appendChild(createSliderRow('Middle', 'middle'));
  panel.appendChild(createSliderRow('Ring', 'ring'));
  panel.appendChild(createSliderRow('Pinky', 'pinky'));

  const buttonRow = document.createElement('div');
  buttonRow.className = 'button-row';

  const openBtn = document.createElement('button');
  openBtn.textContent = 'Close Hand';
  openBtn.onclick = () => {
    setFingerValue('thumb', 0);
    setFingerValue('index', 0);
    setFingerValue('middle', 0);
    setFingerValue('ring', 0);
    setFingerValue('pinky', 0);
    syncAll();
  };

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Open Hand';
  closeBtn.onclick = () => {
    setFingerValue('thumb', 45);
    setFingerValue('index', 45);
    setFingerValue('middle', 45);
    setFingerValue('ring', 45);
    setFingerValue('pinky', 45);
    syncAll();
  };

  const pointBtn = document.createElement('button');
  pointBtn.textContent = 'Point';
  pointBtn.onclick = () => {
    setFingerValue('thumb', 20);
    setFingerValue('index', 0);
    setFingerValue('middle', 45);
    setFingerValue('ring', 45);
    setFingerValue('pinky', 45);
    syncAll();
  };

  buttonRow.appendChild(openBtn);
  buttonRow.appendChild(closeBtn);
  buttonRow.appendChild(pointBtn);
  panel.appendChild(buttonRow);

  const notes = document.createElement('div');
  notes.id = 'notes';
  notes.innerHTML = `
    <strong>Mapped nodes</strong><br>
    Thumb → <code>Contr_Fin_Tumb_03_01</code> on X<br>
    Index → <code>Fin_Index_03_01</code> on Y<br>
    Middle → <code>Fin_Middle_03_03</code> on Y<br>
    Ring → <code>Fin_Ring_03_06</code> on Y<br>
    Pinky → <code>Fig_Pinky_03_06</code> on Y
  `;
  panel.appendChild(notes);

  document.body.appendChild(panel);
}

buildUI();

// =========================================
// Load Model
// =========================================
const loader = new GLTFLoader();

loader.load(
  '/models/robot_hand/scene.gltf',
  (gltf) => {
    handModel = gltf.scene;
    handModel.rotation.z = Math.PI;
    scene.add(handModel);

    autoScaleAndCenter(handModel, 4);
    mapFingerNodes(handModel);

    addAxisHelperToNode(fingerNodes.thumb, 0.2);
    addAxisHelperToNode(fingerNodes.index, 0.2);
    addAxisHelperToNode(fingerNodes.middle, 0.2);
    addAxisHelperToNode(fingerNodes.ring, 0.2);
    addAxisHelperToNode(fingerNodes.pinky, 0.2);

    updateModelFromState();

    window.handModel = handModel;
    window.fingerNodes = fingerNodes;
    window.state = state;
  },
  undefined,
  (error) => {
    console.error('Error loading model:', error);
  }
);

// =========================================
// Resize
// =========================================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// =========================================
// Animate
// =========================================
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();