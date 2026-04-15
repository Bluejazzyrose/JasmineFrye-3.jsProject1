import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// -----------------------------
// Scene
// -----------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

// -----------------------------
// Camera
// -----------------------------
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 1, 6);

// -----------------------------
// Renderer
// -----------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// -----------------------------
// Orbit Controls
// -----------------------------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);
controls.minDistance = 2;
controls.maxDistance = 12;
controls.update();

// -----------------------------
// Lights
// -----------------------------
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);

const dirLight1 = new THREE.DirectionalLight(0xffffff, 1);
dirLight1.position.set(5, 5, 5);
scene.add(dirLight1);

const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.7);
dirLight2.position.set(-5, 3, -5);
scene.add(dirLight2);

// Optional grid for orientation
const gridHelper = new THREE.GridHelper(10, 10);
scene.add(gridHelper);

// Optional axes helper
const axesHelper = new THREE.AxesHelper(2);
scene.add(axesHelper);

// -----------------------------
// Load Hand Model
// -----------------------------
const loader = new GLTFLoader();

loader.load(
  '/models/robot_hand/scene.gltf',
  (gltf) => {
    const hand = gltf.scene;
    hand.rotation.z = Math.PI;

    // Add model first temporarily so bounding box works correctly
    scene.add(hand);

    // Compute bounding box
    const box = new THREE.Box3().setFromObject(hand);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    console.log('Original size:', size);
    console.log('Original center:', center);

    // Prevent divide-by-zero problems
    const maxDim = Math.max(size.x, size.y, size.z);

    if (maxDim === 0) {
      console.error('Model size is zero. Check the hand model export.');
      return;
    }

    // Autoscale model to fit scene
    const targetSize = 3; // change to 2, 4, etc. if desired
    const scale = targetSize / maxDim;
    hand.scale.setScalar(scale);

    // Recompute bounding box AFTER scaling
    const newBox = new THREE.Box3().setFromObject(hand);
    const newCenter = newBox.getCenter(new THREE.Vector3());
    const newSize = newBox.getSize(new THREE.Vector3());

    console.log('Scaled size:', newSize);
    console.log('Scaled center:', newCenter);

    // Center the model in the scene
    hand.position.x -= newCenter.x;
    hand.position.y -= newCenter.y;
    hand.position.z -= newCenter.z;

    // Optional: lift the hand slightly above the grid
    const finalBox = new THREE.Box3().setFromObject(hand);
    const finalSize = finalBox.getSize(new THREE.Vector3());
    hand.position.y += finalSize.y / 2;

    // Optional bounding box helper
    const boxHelper = new THREE.BoxHelper(hand, 0xff0000);
    scene.add(boxHelper);

    console.log('Model loaded successfully');
  },
  undefined,
  (error) => {
    console.error('Error loading model:', error);
  }
);

// -----------------------------
// Resize Handler
// -----------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// -----------------------------
// Animation Loop
// -----------------------------
function animate() {
  requestAnimationFrame(animate);

  controls.update();
  renderer.render(scene, camera);
}

animate();