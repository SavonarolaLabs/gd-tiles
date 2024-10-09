import * as TR from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

// Global variables for renderer, camera, scenes, and mixers
let renderer, camera;
let scenes = {};
let currentScene = 'mapScene';

// Set up the renderer
function initRenderer() {
  renderer = new TR.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
}

// Set up a camera
function initCamera() {
  camera = new TR.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 10);
  //camera.lookAt(5, 3, 0);
}

// Create the minimap as a plane in the map scene
let minimap;
function createMinimap() {
  const scene = new TR.Scene();

  const geometry = new TR.PlaneGeometry(5, 5);
  const customMaterial = new TR.ShaderMaterial({
    uniforms: {
      frontColor: { value: new TR.Color(0x009688) }, // Front side color
      backColor: { value: new TR.Color(0xff0000) }, // Back side color
    },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 frontColor;
      uniform vec3 backColor;
      varying vec3 vNormal;
      void main() {
        // gl_FrontFacing is a built-in variable to check if the face is front or back
        if (gl_FrontFacing) {
          gl_FragColor = vec4(frontColor, 1.0);
        } else {
          gl_FragColor = vec4(backColor, 1.0);
        }
      }
    `,
    side: TR.DoubleSide, // Ensure both sides of the plane are rendered
  });
  minimap = new TR.Mesh(geometry, customMaterial);
  minimap.rotation.x = 0;
  scene.add(minimap);

  {
    const geometry = new TR.PlaneGeometry(5, 5);
    const material = new TR.MeshBasicMaterial({ color: 0x009688 });
    const minimap = new TR.Mesh(geometry, material);
    //minimap.rotation.x = -Math.PI / 2;
    minimap.position.x = 6;
    scene.add(minimap);
  }

  scenes['mapScene'] = scene;
}
const rotStep = 0.1;
let axis = 'x';
function plus() {
  minimap.rotation[axis] += rotStep;
}

function minus() {
  minimap.rotation[axis] -= rotStep;
}

// Placeholder for battle screen
function createBattleScene() {
  const scene = new TR.Scene();

  // Create the battle text, then add it to the scene once the font is loaded
  createTextMesh('Battle Screen', 0xff0000, (battleText) => {
    battleText.position.set(0, 1, 0);
    scene.add(battleText);
    scenes['battleScene'] = scene;
  });
}

// Placeholder for city screen
function createCityScene() {
  const scene = new TR.Scene();

  // Create the city text, then add it to the scene once the font is loaded
  createTextMesh('City Screen', 0x0000ff, (cityText) => {
    cityText.position.set(0, 1, 0);
    scene.add(cityText);
    scenes['cityScene'] = scene;
  });
}

// Helper function to create a basic text mesh
function createTextMesh(text, color, callback) {
  const loader = new FontLoader();

  // Use the default Helvetiker font from Three.js's CDN
  loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
    const textGeometry = new TextGeometry(text, {
      font: font,
      size: 0.5,
      depth: 0.2, // Use .depth instead of deprecated .height
    });
    const textMaterial = new TR.MeshBasicMaterial({ color });
    const textMesh = new TR.Mesh(textGeometry, textMaterial);
    callback(textMesh); // Execute the callback with the created text mesh
  });
}

// Key handler to switch between scenes
function initKeyHandlers() {
  window.addEventListener('keydown', (event) => {
    switch (event.code) {
      case 'Digit1':
        currentScene = 'mapScene';
        break;
      case 'Digit2':
        currentScene = 'battleScene';
        break;
      case 'Digit3':
        currentScene = 'cityScene';
        break;
      case 'Minus':
        minus();
        break;
      case 'Equal':
        plus();
        break;
      case 'KeyX':
        axis = 'x';
        break;
      case 'KeyY':
        axis = 'y';
        break;
      case 'KeyZ':
        axis = 'z';
        break;
      case 'Digit0':
        minimap.rotation.x = 0;
        minimap.rotation.y = 0;
        minimap.rotation.z = 0;
        break;
      default:
        break;
    }
  });
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scenes[currentScene], camera);
}

// Initialize everything
function init() {
  initRenderer();
  initCamera();
  createMinimap();
  createBattleScene();
  createCityScene();
  initKeyHandlers();
  animate();
}

init();
