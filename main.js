import * as TR from 'three';
import { parseGIF, decompressFrames } from 'gifuct-js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

// Constants
const MAP_SIZE = 16;
const TILE_SIZE = 1;
const TILEMAP_URL = 'assets/Tiny Swords/Terrain/Ground/Tilemap_Flat.png';
const WARRIOR_URL = 'assets/Tiny Swords/Factions/Knights/Troops/Warrior/Blue/Warrior_Blue.png';
const WARRIOR_SCALE = 2.3;
const CASTLE_URL = 'assets/Tiny Swords/Factions/Knights/Buildings/Castle/Castle_Blue.png';
const CASTLE_SCALE = 3.2;
const TREE_URL = 'assets/Tiny Swords/Resources/Trees/Tree.png';
const TREE_SCALE = 1.3;
const GRID_COLOR = 0x888888;

//let currentScene = 'map';
let currentScene = 'battlefield';
const scene = { map: new TR.Scene() };
const renderer = new TR.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = TR.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = TR.PCFSoftShadowMap;

document.body.appendChild(renderer.domElement);

// Calculate aspect ratio and adjust camera['map'] size
const aspectRatio = window.innerWidth / window.innerHeight;
const viewSize = MAP_SIZE / 2;

let camera = {};
if (aspectRatio >= 1) {
  camera['map'] = new TR.OrthographicCamera(-viewSize * aspectRatio, viewSize * aspectRatio, viewSize, -viewSize, 0.1, MAP_SIZE * 2);
} else {
  camera['map'] = new TR.OrthographicCamera(-viewSize, viewSize, viewSize / aspectRatio, -viewSize / aspectRatio, 0.1, MAP_SIZE * 2);
}

camera['map'].position.set(0, MAP_SIZE, 0);
camera['map'].lookAt(0, 0, 0);

// white outline START
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene['map'], camera['map']);
composer.addPass(renderPass);

const outlinePass = new OutlinePass(new TR.Vector2(window.innerWidth, window.innerHeight), scene['map'], camera['map']);
outlinePass.edgeStrength = 2.5; // Thickness of the outline
outlinePass.edgeGlow = 0.0; // Glow amount (set this to 0 for now)
outlinePass.edgeThickness = 1.0; // Adjust thickness for a more prominent outline
outlinePass.pulsePeriod = 0; // No pulsing effect
outlinePass.visibleEdgeColor.set('#ffffff'); // Visible outline color (white)
outlinePass.hiddenEdgeColor.set('#ff0000'); // Black hidden edge color
composer.addPass(outlinePass);

const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);
composer.addPass(gammaCorrectionPass);
// white outline END

// Raycaster and mouse setup
const raycaster = new TR.Raycaster();
const mouse = new TR.Vector2();

// Warrior animation variables
let warriorTile;
let warriorTexture;
const warriorFrames = { cols: 6, rows: 8 };
const warriorFrameCount = 6;
const warriorFrameSpeed = 100;
let currentWarriorFrame = 0;
let lastWarriorFrameTime = 0;

// Tree animation variables
let treeTile;
let treeTexture;
const treeFrames = { cols: 4, rows: 3 };
const treeFrameCount = 4;
const treeFrameSpeed = 270;
let currentTreeFrame = 0;
let lastTreeFrameTime = 0;

async function createTree(x, y) {
  treeTexture = await loadTilemapTexture(TREE_URL);
  treeTexture.wrapS = TR.ClampToEdgeWrapping;
  treeTexture.wrapT = TR.ClampToEdgeWrapping;
  treeTexture.repeat.set(1 / treeFrames.cols, 1 / treeFrames.rows);

  const tileGeometry = new TR.PlaneGeometry(TILE_SIZE * TREE_SCALE, TILE_SIZE * TREE_SCALE);

  const tileMaterial = new TR.MeshBasicMaterial({
    map: treeTexture,
    side: TR.FrontSide,
    transparent: true,
  });
  treeTile = new TR.Mesh(tileGeometry, tileMaterial);

  treeTile.position.set(x - MAP_SIZE / 2 + TILE_SIZE / 2, 0.1, y - MAP_SIZE / 2 + TILE_SIZE / 2 - TILE_SIZE * TREE_SCALE * 0.1);
  treeTile.rotation.x = -Math.PI / 2;

  scene['map'].add(treeTile);
}

async function createWarrior() {
  warriorTexture = await loadTilemapTexture(WARRIOR_URL);
  warriorTexture.wrapS = TR.ClampToEdgeWrapping;
  warriorTexture.wrapT = TR.ClampToEdgeWrapping;
  warriorTexture.repeat.set(1 / warriorFrames.cols, 1 / warriorFrames.rows);

  const tileGeometry = new TR.PlaneGeometry(TILE_SIZE * WARRIOR_SCALE, TILE_SIZE * WARRIOR_SCALE);

  const tileMaterial = new TR.MeshBasicMaterial({
    map: warriorTexture,
    side: TR.FrontSide,
    transparent: true,
  });
  warriorTile = new TR.Mesh(tileGeometry, tileMaterial);

  setWarriorPosition(1, 1);
  warriorTile.rotation.x = -Math.PI / 2;

  scene['map'].add(warriorTile);
}

function setWarriorPosition(x, y) {
  warriorTile.position.set(x - MAP_SIZE / 2 + TILE_SIZE / 2, 0.2, y - MAP_SIZE / 2 + TILE_SIZE / 2 - 0.2);
}

async function createCastle(x, y) {
  const texture = await loadTilemapTexture(CASTLE_URL);
  const txtr = createTileTextures(texture, 1, 1);
  const tileGeometry = new TR.PlaneGeometry(TILE_SIZE * CASTLE_SCALE, TILE_SIZE * CASTLE_SCALE);

  const tileMaterial = new TR.MeshBasicMaterial({
    map: txtr[0],
    side: TR.FrontSide,
    transparent: true,
  });
  const tile = new TR.Mesh(tileGeometry, tileMaterial);

  tile.position.set(x - MAP_SIZE / 2 + TILE_SIZE / 2, 0.1, y - MAP_SIZE / 2 + TILE_SIZE / 2);
  tile.rotation.x = -Math.PI / 2;

  scene['map'].add(tile);
}

const GIF_URL = 'assets/gif/castingBig.gif';
let gifFrames = [];
let gifTexture;
let gifPlane;
let currentGifFrame = 0;
let lastGifFrameTime = 0;

async function loadGifFrames(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const gif = parseGIF(arrayBuffer);
  const frames = decompressFrames(gif, true);

  for (const frame of frames) {
    const imageData = new ImageData(new Uint8ClampedArray(frame.patch), frame.dims.width, frame.dims.height);
    const bitmap = await createImageBitmap(imageData);
    const delay = frame.delay;
    gifFrames.push({ bitmap, delay });
  }
}

async function initGif() {
  await loadGifFrames(GIF_URL);

  gifTexture = new TR.Texture(gifFrames[0].bitmap);
  gifTexture.needsUpdate = true;
  gifTexture.colorSpace = TR.SRGBColorSpace;

  const geometry = new TR.PlaneGeometry(2.5, 2.5);
  const material = new TR.MeshBasicMaterial({
    map: gifTexture,
    transparent: true,
  });
  gifPlane = new TR.Mesh(geometry, material);
  gifPlane.position.set(0, 0.1, 0);
  gifPlane.rotation.x = -Math.PI / 2;
  gifPlane.scale.y = -1;

  scene['map'].add(gifPlane);
}

function updateWarriorFrame(time) {
  if (time - lastWarriorFrameTime > warriorFrameSpeed) {
    currentWarriorFrame = (currentWarriorFrame + 1) % warriorFrameCount;
    const col = currentWarriorFrame % warriorFrames.cols;
    const row = Math.floor(currentWarriorFrame / warriorFrames.cols);

    warriorTexture.offset.x = col / warriorFrames.cols;
    warriorTexture.offset.y = 1 - (row + 1) / warriorFrames.rows;
    lastWarriorFrameTime = time;
  }
}

function updateGifFrame(time) {
  if (time - lastGifFrameTime > gifFrames[currentGifFrame].delay) {
    currentGifFrame = (currentGifFrame + 1) % gifFrames.length;
    gifTexture.image = gifFrames[currentGifFrame].bitmap;
    gifTexture.needsUpdate = true;
    lastGifFrameTime = time;
  }
}

function updateTreeFrame(time) {
  if (time - lastTreeFrameTime > treeFrameSpeed) {
    currentTreeFrame = (currentTreeFrame + 1) % treeFrameCount;
    const col = currentTreeFrame % treeFrames.cols;
    const row = Math.floor(currentTreeFrame / treeFrames.cols);

    treeTexture.offset.x = col / treeFrames.cols;
    treeTexture.offset.y = 1 - (row + 1) / treeFrames.rows;
    lastTreeFrameTime = time;
  }
}

let previousTime = performance.now();

async function createTileGrid() {
  const texture = await loadTilemapTexture(TILEMAP_URL);
  const tileTextures = createTileTextures(texture, 4, 10);

  for (let x = 0; x < MAP_SIZE; x++) {
    for (let z = 0; z < MAP_SIZE; z++) {
      const tileGeometry = new TR.PlaneGeometry(TILE_SIZE, TILE_SIZE);

      const tileIndex =
        x === 0 && z === 0
          ? tileTextures[0]
          : x === MAP_SIZE - 1 && z === 0
          ? tileTextures[2]
          : x === 0 && z === MAP_SIZE - 1
          ? tileTextures[20]
          : x === MAP_SIZE - 1 && z === MAP_SIZE - 1
          ? tileTextures[22]
          : x === 0
          ? tileTextures[10]
          : x === MAP_SIZE - 1
          ? tileTextures[12]
          : z === 0
          ? tileTextures[1]
          : z === MAP_SIZE - 1
          ? tileTextures[21]
          : tileTextures[11];
      const tileMaterial = new TR.MeshBasicMaterial({
        map: tileIndex,
        side: TR.DoubleSide,
      });
      const tile = new TR.Mesh(tileGeometry, tileMaterial);

      tile.position.set(x - MAP_SIZE / 2 + TILE_SIZE / 2, 0, z - MAP_SIZE / 2 + TILE_SIZE / 2);
      tile.rotation.x = -Math.PI / 2;

      scene['map'].add(tile);
    }
  }

  function createThickGrid(size, divisions, thickness, color, opacity = 0.3) {
    const material = new TR.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
    });
    const halfSize = size / 2;

    const gridGroup = new TR.Group();

    for (let i = 0; i <= divisions; i++) {
      const position = -halfSize + (i * size) / divisions;

      const verticalLine = new TR.Mesh(new TR.BoxGeometry(thickness, thickness, size), material);
      verticalLine.position.set(position, 0, 0);
      gridGroup.add(verticalLine);

      const horizontalLine = new TR.Mesh(new TR.BoxGeometry(size, thickness, thickness), material);
      horizontalLine.position.set(0, 0, position);
      gridGroup.add(horizontalLine);
    }

    return gridGroup;
  }

  const thickGrid = createThickGrid(MAP_SIZE, MAP_SIZE, 0.03, GRID_COLOR);
  thickGrid.rotation.y = Math.PI / 2;
  scene['map'].add(thickGrid);
}

function loadTilemapTexture(url) {
  return new Promise((resolve) => {
    const loader = new TR.TextureLoader();
    loader.load(url, (texture) => {
      texture.colorSpace = TR.SRGBColorSpace;
      texture.magFilter = TR.NearestFilter;
      texture.minFilter = TR.NearestFilter;
      resolve(texture);
    });
  });
}

function createTileTextures(texture, rows, cols) {
  const tileTextures = [];

  for (let row = rows - 1; row > -1; row--) {
    for (let col = 0; col < cols; col++) {
      const u = col / cols;
      const v = row / rows;
      const uSize = 1 / cols;
      const vSize = 1 / rows;

      const tileTexture = texture.clone();
      tileTexture.repeat.set(uSize, vSize);
      tileTexture.offset.set(u, v);
      tileTexture.colorSpace = TR.SRGBColorSpace;
      tileTexture.needsUpdate = true;

      tileTextures.push(tileTexture);
    }
  }

  return tileTextures;
}

function onClick(event) {
  mouse.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(mouse, camera['map']);

  const intersects = raycaster.intersectObjects(scene['map'].children);
  if (intersects.length) {
    const { point } = intersects[0];
    const x = Math.floor(point.x + MAP_SIZE / 2);
    const z = Math.floor(point.z + MAP_SIZE / 2);
    setWarriorPosition(x, z);
    console.log('Tile clicked:', { x, z });
  }
}

window.addEventListener('click', onClick);

//lights

const ambientLight = new TR.AmbientLight(0xffffff, 0.8);
scene['map'].add(ambientLight);

const directionalLight = new TR.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 20, 10);
scene['map'].add(directionalLight);

// Create the tile grid and entities
await createTileGrid();
await createCastle(2, 4);
await createWarrior();
await createTree(0, 1);

// Holy Elemental model and animation variables
let holyElementalMixer = undefined;
let activeAction;
const clock = new TR.Clock();
let elementalModel = null;

// Load and play the main Holy Elemental model
async function loadHolyElemental() {
  const loader = new GLTFLoader();

  const gltf = await new Promise((resolve, reject) => {
    loader.load(
      '3d/HolyElemental/SK_HolyElemental.glb',
      (gltf) => resolve(gltf),
      undefined,
      (error) => reject(error)
    );
  });

  const model = gltf.scene;
  model.position.set(0, 1, 0);
  model.rotation.x = -Math.PI / 2;
  model.scale.set(2, 2, 2);
  elementalModel = model;
  scene['map'].add(model);

  holyElementalMixer = new TR.AnimationMixer(model);
}

// Function to load and switch animations
let animations = [];
async function loadElementalAnimation(url, name) {
  const loader = new GLTFLoader();

  const gltf = await new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => resolve(gltf),
      undefined,
      (error) => reject(error)
    );
  });

  const clip = gltf.animations[0];
  animations[name] = holyElementalMixer.clipAction(clip);
}

// Play the selected animation
function playAnimation(name) {
  if (activeAction) {
    activeAction.fadeOut(0.5);
  }

  activeAction = animations[name];
  activeAction.reset();
  activeAction.fadeIn(0.5);
  activeAction.play();
}

// Load all the additional animations
async function loadAllAnimations() {
  await loadElementalAnimation('3d/HolyElemental/A_HolyElemental_Attack.glb', 'attack');
  await loadElementalAnimation('3d/HolyElemental/A_HolyElemental_Attack01.glb', 'attack01');
  await loadElementalAnimation('3d/HolyElemental/A_HolyElemental_Death.glb', 'death');
  await loadElementalAnimation('3d/HolyElemental/A_HolyElemental_Hit.glb', 'hit');
  await loadElementalAnimation('3d/HolyElemental/A_HolyElemental_Idle.glb', 'idle');
  await loadElementalAnimation('3d/HolyElemental/A_HolyElemental_Idle01.glb', 'idle01');
  await loadElementalAnimation('3d/HolyElemental/A_HolyElemental_Ready.glb', 'ready');
  await loadElementalAnimation('3d/HolyElemental/A_HolyElemental_Stun.glb', 'stun');
  await loadElementalAnimation('3d/HolyElemental/A_HolyElemental_Talk.glb', 'talk');
  await loadElementalAnimation('3d/HolyElemental/A_HolyElemental_Walk.glb', 'walk');
}

window.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'Digit1':
      playAnimation('attack');
      break;
    case 'Digit2':
      playAnimation('attack01');
      break;
    case 'Digit3':
      playAnimation('death');
      break;
    case 'Digit4':
      playAnimation('hit');
      break;
    case 'Digit5':
      playAnimation('idle');
      break;
    case 'Digit6':
      playAnimation('idle01');
      break;
    case 'Digit7':
      playAnimation('ready');
      break;
    case 'Digit8':
      playAnimation('stun');
      break;
    case 'Digit9':
      playAnimation('talk');
      break;
    case 'Digit0':
      playAnimation('walk');
      break;
    case 'KeyW':
      rotateTop();
      break;
    case 'KeyS':
      rotateBot();
      break;
    case 'KeyA':
      rotateLeft();
      break;
    case 'KeyD':
      rotateRight();
      break;
    case 'KeyO':
      currentScene = 'map';
      break;
    case 'KeyP':
      currentScene = 'battlefield';
      break;
    default:
      break;
  }
});

function rotateTop() {
  elementalModel.rotation.x = elementalModel.rotation.x - 0.2;
}
function rotateBot() {
  elementalModel.rotation.x = elementalModel.rotation.x + 0.2;
}
function rotateLeft() {
  elementalModel.rotation.y = elementalModel.rotation.y - 0.2;
}
function rotateRight() {
  elementalModel.rotation.y = elementalModel.rotation.y + 0.2;
}

await loadHolyElemental();
await loadAllAnimations();
outlinePass.selectedObjects.push(elementalModel);
//playAnimation('idle');

window.addEventListener('resize', onWindowResize);

let mixers = [];

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

function onWindowResize() {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  const newAspectRatio = window.innerWidth / window.innerHeight;

  if (newAspectRatio >= 1) {
    camera['map'].left = -viewSize * newAspectRatio;
    camera['map'].right = viewSize * newAspectRatio;
    camera['map'].top = viewSize;
    camera['map'].bottom = -viewSize;
  } else {
    camera['map'].left = -viewSize;
    camera['map'].right = viewSize;
    camera['map'].top = viewSize / newAspectRatio;
    camera['map'].bottom = -viewSize / newAspectRatio;
  }

  camera['map'].updateProjectionMatrix();

  // Update battlefield camera (assuming it's a perspective camera)
  if (camera['battlefield']) {
    camera['battlefield'].aspect = newAspectRatio; // Update aspect ratio
    camera['battlefield'].updateProjectionMatrix(); // Update projection matrix
  }
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  composer.setSize(window.innerWidth, window.innerHeight);
}

function createBattleField() {
  scene['battlefield'] = new TR.Scene();
  const FIELD_SIZE = 16;

  const planeGeometry = new TR.PlaneGeometry(FIELD_SIZE * 1.8, FIELD_SIZE * 2.5);
  const groundMaterial = new TR.MeshPhongMaterial({ color: 0x333333 }); // Changed material to Phong
  const groundMesh = new TR.Mesh(planeGeometry, groundMaterial);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;

  //scene['battlefield'].add(groundMesh);
  let c = [];
  for (let i = 0; i < 12; i++) {
    c[i] = clone(elementalModel);
    c[i].traverse((child) => {
      if (child instanceof TR.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    if (i < 6) {
      c[i].position.z = i > 2 ? -3 : -(3 + 6);
    } else {
      c[i].position.z = i < 9 ? 8 : 8 + 6;
      c[i].rotation.y = Math.PI;
    }
    c[i].position.x = 7 * ((i % 3) - 1);
    c[i].rotation.x = 0;
    scene['battlefield'].add(c[i]);

    let mixer = new TR.AnimationMixer(c[i]);
    const idleClip = animations['idle']._clip;
    const idleAction = mixer.clipAction(idleClip);
    idleAction.startAt(Math.random());
    idleAction.play();

    mixers.push(mixer);
  }

  // Lighting
  const ambientLight = new TR.AmbientLight(0x404040, 2); // Soft ambient light
  scene['battlefield'].add(ambientLight);

  const directionalLight = new TR.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(10, 20, 10); // Adjust light position for better shadows
  directionalLight.castShadow = true; // Enable shadow casting
  directionalLight.shadow.mapSize.width = 2048; // Increase shadow resolution for sharper shadows
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
  directionalLight.shadow.camera.left = -FIELD_SIZE;
  directionalLight.shadow.camera.right = FIELD_SIZE;
  directionalLight.shadow.camera.top = FIELD_SIZE;
  directionalLight.shadow.camera.bottom = -FIELD_SIZE;
  scene['battlefield'].add(directionalLight);

  camera['battlefield'] = createPerspectiveCamera();
  //camera['battlefield'] = createIsometricCamera();
}

function createPerspectiveCamera() {
  const aspectRatio = window.innerWidth / window.innerHeight;

  const camera = new TR.PerspectiveCamera(
    35, // Field of View (FOV)
    aspectRatio, // Aspect ratio
    0.1, // Near plane
    1000 // Far plane
  );

  camera.position.set(-24, 24, 36);
  camera.lookAt(0, 4, 8); // Center on the battlefield

  return camera;
}

async function loadArena() {
  const loader = new GLTFLoader();

  const gltf = await new Promise((resolve, reject) => {
    loader.load(
      // '3d/arena/hell_arena.glb',
      // '3d/arena/older_castle_ruins.glb',
      '3d/arena/dwarf_modelkit.glb',
      // '3d/arena/battlefield.glb',
      (gltf) => resolve(gltf),
      undefined,
      (error) => reject(error)
    );
  });

  const model = gltf.scene;
  model.traverse((child) => {
    if (child instanceof TR.Mesh) {
      //child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  const scale = 1;
  model.position.y = 0.5;
  model.position.x = +160;
  model.position.z = -10;
  model.rotation.y = -Math.PI / 2;

  model.scale.set(scale, scale, scale);
  scene['battlefield'].add(model);
}

async function loadGargoyle() {
  const loader = new GLTFLoader();

  const gltf = await new Promise((resolve, reject) => {
    loader.load(
      '3d/env/snow-covered_gargoyle_statue.glb',
      (gltf) => resolve(gltf),
      undefined,
      (error) => reject(error)
    );
  });

  const model = gltf.scene;

  // Traverse the model and adjust materials
  model.traverse((child) => {
    if (child instanceof TR.Mesh) {
      // Enable shadows
      child.receiveShadow = true;
      child.castShadow = true;

      // Check if the mesh has a material
      if (child.material) {
        // Ensure the material will respond to updates
        child.material.needsUpdate = true;

        // Option 1: Adjust the material color to make it darker
        if (child.material.color) {
          // Multiply the color by a factor less than 1 to darken
          child.material.color.multiplyScalar(0.3); // Darken by 50%
        }

        // Option 2: If using a standard or physical material, adjust roughness and metalness
        if (child.material instanceof TR.MeshStandardMaterial || child.material instanceof TR.MeshPhysicalMaterial) {
          child.material.roughness = Math.min(child.material.roughness + 0.5, 1);
          child.material.metalness = Math.max(child.material.metalness - 0.5, 0);
        }

        // Option 3: Adjust the emissive property
        if (child.material.emissive) {
          child.material.emissive.multiplyScalar(0.5); // Reduce emissiveness
        }

        // Option 4: Replace the material with a darker one (e.g., a dark gray material)
        /*
        child.material = new TR.MeshStandardMaterial({
          color: 0x333333, // Dark gray
          roughness: 1,
          metalness: 0,
        });
        */
      }
    }
  });

  const scale = 20;
  model.position.set(-16, 2, 5);
  model.scale.set(scale, scale, scale);
  scene['battlefield'].add(model);
}

async function loadGargoyle2() {
  const loader = new GLTFLoader();

  const gltf = await new Promise((resolve, reject) => {
    loader.load(
      '3d/env/snow-covered_gargoyle_statue.glb',
      (gltf) => resolve(gltf),
      undefined,
      (error) => reject(error)
    );
  });

  const model = gltf.scene;

  // Traverse the model and adjust materials
  model.traverse((child) => {
    if (child instanceof TR.Mesh) {
      // Enable shadows
      child.receiveShadow = true;
      child.castShadow = true;

      // Check if the mesh has a material
      if (child.material) {
        // Ensure the material will respond to updates
        child.material.needsUpdate = true;

        // Option 1: Adjust the material color to make it darker
        if (child.material.color) {
          // Multiply the color by a factor less than 1 to darken
          child.material.color.multiplyScalar(0.3); // Darken by 50%
        }

        // Option 2: If using a standard or physical material, adjust roughness and metalness
        if (child.material instanceof TR.MeshStandardMaterial || child.material instanceof TR.MeshPhysicalMaterial) {
          child.material.roughness = Math.min(child.material.roughness + 0.5, 1);
          child.material.metalness = Math.max(child.material.metalness - 0.5, 0);
        }

        // Option 3: Adjust the emissive property
        if (child.material.emissive) {
          child.material.emissive.multiplyScalar(0.5); // Reduce emissiveness
        }

        // Option 4: Replace the material with a darker one (e.g., a dark gray material)
        /*
        child.material = new TR.MeshStandardMaterial({
          color: 0x333333, // Dark gray
          roughness: 1,
          metalness: 0,
        });
        */
      }
    }
  });

  const scale = 18;
  model.position.set(25, 2, -6);
  model.rotation.y = Math.PI;
  model.scale.set(scale, scale, scale);
  scene['battlefield'].add(model);
}

async function initBattlefield() {
  createBattleField(); // Initialize the battlefield
  await loadArena(); // Wait for the arena to load
  await loadGargoyle(); // Wait for the arena to load
  await loadGargoyle2(); // Wait for the arena to load
}

await initBattlefield(); // Call the async function

// SNOW

const parameters = {};
parameters.count = 2000;
parameters.randomness = 0.5; //?
parameters.randomnessPower = 3; //?
parameters.sizeMin = 1.0;
parameters.sizeMax = 4.0;
parameters.opacityMin = 0.1;
parameters.opacityMax = 0.4;
parameters.gravity = 25.0;

let geometry = null;
let material = null;
let points = null;

let wind = {
  //?
  current: 0,
  force: 0.1,
  target: 0.1,
  min: 0.1,
  max: 0.2,
  easing: 0.005,
};

const generateSnow = () => {
  if (points !== null) {
    geometry.dispose();
    material.dispose();
    scene['battlefield'].remove(points); // Remove from scene instead of camera
  }

  /**
   * Geometry
   */
  geometry = new TR.BufferGeometry();

  const positions = new Float32Array(parameters.count * 3);
  const scales = new Float32Array(parameters.count * 1);
  const randomness = new Float32Array(parameters.count * 3);
  const speeds = new Float32Array(parameters.count * 3);
  const rotations = new Float32Array(parameters.count * 3);
  const opacities = new Float32Array(parameters.count * 1);

  for (let i = 0; i < parameters.count; i++) {
    const i3 = i * 3;

    // Position in camera space
    positions[i3] = (Math.random() - 0.5) * 20; // X positions between -10 and +10
    positions[i3 + 1] = (Math.random() - 0.5) * 20; // Y positions between -10 and +10
    positions[i3 + 2] = -Math.random() * 30; // Z positions between 0 and -30 (in front of the camera)

    // Randomness
    const randomX = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness;
    const randomY = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness;
    const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness;

    // Random Positioning
    randomness[i3 + 0] = randomX;
    randomness[i3 + 1] = randomY;
    randomness[i3 + 2] = randomZ;

    // Random Opacity
    opacities[i] = Math.random() * (parameters.opacityMax - parameters.opacityMin) + parameters.opacityMin;

    // Scale
    scales[i] = Math.random() * (parameters.sizeMax - parameters.sizeMin) + parameters.sizeMin;

    // Speeds
    speeds[i3 + 0] = 1 + Math.random();
    speeds[i3 + 1] = Math.random() * (0.06 - 0.05) + 0.05;
    speeds[i3 + 2] = Math.random() * (0.2 - 0.05) + 0.05;

    // Rotations
    rotations[i3 + 0] = Math.random() * 2 * Math.PI;
    rotations[i3 + 1] = Math.random() * 20;
    rotations[i3 + 2] = Math.random() * 10;
  }

  geometry.setAttribute('position', new TR.BufferAttribute(positions, 3));
  geometry.setAttribute('aScale', new TR.BufferAttribute(scales, 1));
  geometry.setAttribute('aRandomness', new TR.BufferAttribute(randomness, 3));
  geometry.setAttribute('aSpeed', new TR.BufferAttribute(speeds, 3));
  geometry.setAttribute('aRotation', new TR.BufferAttribute(rotations, 3));
  geometry.setAttribute('aOpacity', new TR.BufferAttribute(opacities, 1));

  /**
   * Textures
   */
  const textureLoader = new TR.TextureLoader();
  const particleTexture = textureLoader.load('https://assets.codepen.io/122136/snowflake_1.png');

  /**
   * Material
   */
  material = new TR.ShaderMaterial({
    depthWrite: false,
    blending: TR.AdditiveBlending,
    transparent: true,
    vertexColors: true,
    vertexShader: `
      precision mediump float;

      attribute vec4 aPosition;
      attribute float aOpacity;
      attribute float aScale;
      attribute vec3 aRotation;
      attribute float aSize;
      attribute vec3 aSpeed;

      uniform float uTime;
      uniform float uSize;
      uniform float uGravity;
      uniform vec3 uSpeed;
      uniform vec3 uWorldSize;
      uniform mat4 uProjection;
      uniform float uWind;

      varying float vRotation;
      varying float vOpacity;

      void main() {

        vec4 modelPosition = vec4(position, 1.0);

        vOpacity = aOpacity;

        vRotation = aRotation.x + uTime * aRotation.y;

        modelPosition.x = mod(modelPosition.x + uTime + uWind * aSpeed.x, uWorldSize.x * 2.0) - uWorldSize.x;

        modelPosition.y = mod(modelPosition.y - uTime * aSpeed.y * uGravity, uWorldSize.y * 2.0) - uWorldSize.y;

        modelPosition.x += (sin(uTime * aSpeed.z) * aRotation.z);
        modelPosition.z += cos(uTime * aSpeed.z) * aRotation.z;

        // Since the particle system is attached to the camera, modelViewMatrix is identity
        vec4 viewPosition = modelViewMatrix * modelPosition;
        vec4 projectedPosition = projectionMatrix * viewPosition;
        gl_Position = projectedPosition;

        gl_PointSize = uSize * aScale;
        gl_PointSize *= (1.0 / -viewPosition.z);
      }
    `,
    fragmentShader: `
      precision mediump float;
      varying float vOpacity;
      uniform sampler2D uTexture;

      varying float vRotation;

      void main() {

        vec2 rotated = vec2(
          cos(vRotation) * (gl_PointCoord.x - 0.5) + sin(vRotation) * (gl_PointCoord.y - 0.5) + 0.5,
          cos(vRotation) * (gl_PointCoord.y - 0.5) - sin(vRotation) * (gl_PointCoord.x - 0.5) + 0.5
        );

        vec4 snowflake = texture2D(uTexture, rotated);

        gl_FragColor = vec4(snowflake.rgb, snowflake.a * vOpacity);
      }
    `,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: 40 * renderer.getPixelRatio() },
      uSpeed: { value: new TR.Vector3(0.0000001, 0.02, Math.random()) },
      uGravity: { value: parameters.gravity },
      uWorldSize: { value: new TR.Vector3(10, 10, 10) }, // Adjusted size
      uTexture: { value: particleTexture },
      uRotation: { value: new TR.Vector3(1, 1, 1) },
      uWind: { value: 0 },
    },
  });

  points = new TR.Points(geometry, material);

  // Add the points to the scene instead of the camera
  scene['battlefield'].add(points);
};

scene['battlefield'].background = null;

generateSnow();

function updateWindAndSnowMaterial(deltaTime, elapsedTime) {
  wind.force += (wind.target - wind.force) * wind.easing;
  wind.current += wind.force * (deltaTime * 0.2);

  // Current Wind Uniform
  material.uniforms.uWind.value = wind.current;

  if (Math.random() > 0.995) {
    wind.target = (wind.min + Math.random() * (wind.max - wind.min)) * (Math.random() > 0.5 ? -1 : 1) * 100;
  }

  // Elapsed Time Uniform update
  material.uniforms.uTime.value = elapsedTime;
}

renderer.setAnimationLoop((time) => {
  const deltaTime = clock.getDelta();

  if (warriorTile) {
    updateWarriorFrame(time);
  }
  if (treeTile) {
    updateTreeFrame(time);
  }
  if (gifPlane) {
    updateGifFrame(time);
  }
  if (holyElementalMixer) {
    holyElementalMixer.update(deltaTime);
  }

  mixers.forEach((mixer) => {
    mixer.update(deltaTime);
  });

  updateWindAndSnowMaterial(deltaTime, clock.getElapsedTime());

  // Update particle system position to match the camera's position
  if (points) {
    points.position.copy(camera['battlefield'].position);
  }
  renderer.render(scene[currentScene], camera[currentScene]);
  // Disable white outline
  // composer.render();
});
