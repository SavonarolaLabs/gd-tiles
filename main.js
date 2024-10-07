import * as TR from 'three';

// Constants
const MAP_SIZE = 12;
const TILE_SIZE = 1;
const TILEMAP_URL = 'assets/Tiny Swords/Terrain/Ground/Tilemap_Flat.png';
const WARRIOR_URL = 'assets/Tiny Swords/Factions/Knights/Troops/Warrior/Blue/Warrior_Blue.png';
const WARRIOR_SCALE = 2.3;
const CASTLE_URL = 'assets/Tiny Swords/Factions/Knights/Buildings/Castle/Castle_Blue.png';
const CASTLE_SCALE = 3.2;
const TREE_URL = 'assets/Tiny Swords/Resources/Trees/Tree.png';
const TREE_SCALE = 1.3;
const GRID_COLOR = 0x888888; // Gray color for the grid

import { parseGIF, decompressFrames } from 'gifuct-js';

// Scene, Renderer, and Camera setup
const scene = new TR.Scene();
const renderer = new TR.WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = TR.SRGBColorSpace; // Updated property
document.body.appendChild(renderer.domElement);

// Calculate aspect ratio and adjust camera size
const aspectRatio = window.innerWidth / window.innerHeight;
const viewSize = MAP_SIZE / 2;

let camera;
if (aspectRatio >= 1) {
  camera = new TR.OrthographicCamera(-viewSize * aspectRatio, viewSize * aspectRatio, viewSize, -viewSize, 0.1, MAP_SIZE * 2);
} else {
  camera = new TR.OrthographicCamera(-viewSize, viewSize, viewSize / aspectRatio, -viewSize / aspectRatio, 0.1, MAP_SIZE * 2);
}

camera.position.set(0, MAP_SIZE, 0);
camera.lookAt(0, 0, 0);

// Raycaster and mouse setup
const raycaster = new TR.Raycaster();
const mouse = new TR.Vector2();

// Warrior animation variables
let warriorTile;
let warriorTexture;
const warriorFrames = { cols: 6, rows: 8 }; // Define the number of columns and rows of the sprite sheet
const warriorFrameCount = 6; // Total number of frames
const warriorFrameSpeed = 100; // Milliseconds per frame
let currentWarriorFrame = 0; // Current frame
let lastWarriorFrameTime = 0; // Last frame update time

async function createTree(x, y) {
  const texture = await loadTilemapTexture(TREE_URL);
  const txtr = createTileTextures(texture, 3, 4);
  const tileGeometry = new TR.PlaneGeometry(TILE_SIZE * TREE_SCALE, TILE_SIZE * TREE_SCALE);

  const tileMaterial = new TR.MeshBasicMaterial({
    map: txtr[0],
    side: TR.FrontSide,
    transparent: true,
  });
  const tile = new TR.Mesh(tileGeometry, tileMaterial);

  // Position each tile and rotate to face upward
  tile.position.set(x - MAP_SIZE / 2 + TILE_SIZE / 2, 0.1, y - MAP_SIZE / 2 + TILE_SIZE / 2 - TILE_SIZE * TREE_SCALE * 0.1);
  tile.rotation.x = -Math.PI / 2;

  scene.add(tile);
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

  // Position each tile and rotate to face upward
  tile.position.set(x - MAP_SIZE / 2 + TILE_SIZE / 2, 0.1, y - MAP_SIZE / 2 + TILE_SIZE / 2);
  tile.rotation.x = -Math.PI / 2;

  scene.add(tile);
}

// Load warrior
async function createWarrior() {
  warriorTexture = await loadTilemapTexture(WARRIOR_URL);
  warriorTexture.wrapS = TR.ClampToEdgeWrapping;
  warriorTexture.wrapT = TR.ClampToEdgeWrapping;
  warriorTexture.repeat.set(1 / warriorFrames.cols, 1 / warriorFrames.rows);

  const tileGeometry = new TR.PlaneGeometry(TILE_SIZE * WARRIOR_SCALE, TILE_SIZE * WARRIOR_SCALE);

  // Use the correct texture and ensure transparency is enabled if needed
  const tileMaterial = new TR.MeshBasicMaterial({
    map: warriorTexture,
    side: TR.FrontSide,
    transparent: true,
  });
  warriorTile = new TR.Mesh(tileGeometry, tileMaterial);

  setWarriorPosition(1, 1);
  warriorTile.rotation.x = -Math.PI / 2; // Face upward

  scene.add(warriorTile);
}

function setWarriorPosition(x, y) {
  warriorTile.position.set(x - MAP_SIZE / 2 + TILE_SIZE / 2, 0.2, y - MAP_SIZE / 2 + TILE_SIZE / 2 - 0.2);
}

// GIF animation variables
const GIF_URL = 'assets/gif/castingBig.gif';
//const GIF_URL = 'assets/gif/idle.jpg';
let gifFrames = [];
let gifTexture;
let gifPlane;
let currentGifFrame = 0;
let lastGifFrameTime = 0;

// Frame switching logic
async function loadGifFrames(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const gif = parseGIF(arrayBuffer);
  const frames = decompressFrames(gif, true);

  // Store each frame's ImageBitmap and delay (convert delay to milliseconds)
  for (const frame of frames) {
    const imageData = new ImageData(new Uint8ClampedArray(frame.patch), frame.dims.width, frame.dims.height);
    const bitmap = await createImageBitmap(imageData);
    //const delay = frame.delay * 2.5; // Convert from hundredths of a second to milliseconds
    const delay = frame.delay; // Convert from hundredths of a second to milliseconds
    gifFrames.push({ bitmap, delay });
  }
}

async function initGif() {
  // Load GIF frames
  await loadGifFrames(GIF_URL);

  // Create a texture with the first frame
  gifTexture = new TR.Texture(gifFrames[0].bitmap);
  gifTexture.needsUpdate = true;
  gifTexture.colorSpace = TR.SRGBColorSpace;

  // Create plane geometry to display the GIF
  const geometry = new TR.PlaneGeometry(2.5, 2.5);
  const material = new TR.MeshBasicMaterial({
    map: gifTexture,
    transparent: true,
  });
  gifPlane = new TR.Mesh(geometry, material);
  gifPlane.position.set(0, 0.1, 0); // Adjust position as needed
  gifPlane.rotation.x = -Math.PI / 2; // Face upward
  gifPlane.scale.y = -1;

  scene.add(gifPlane);
}
await initGif();

// Function to update the warrior frame
function updateWarriorFrame(time) {
  if (time - lastWarriorFrameTime > warriorFrameSpeed) {
    currentWarriorFrame = (currentWarriorFrame + 1) % warriorFrameCount; // Loop frames
    const col = currentWarriorFrame % warriorFrames.cols;
    const row = Math.floor(currentWarriorFrame / warriorFrames.cols);

    // Calculate texture offset based on the frame position
    warriorTexture.offset.x = col / warriorFrames.cols;
    warriorTexture.offset.y = 1 - (row + 1) / warriorFrames.rows; // Adjust for Three.js Y-up coordinate system
    lastWarriorFrameTime = time;
  }
}

// Function to update the GIF frame
function updateGifFrame(time) {
  if (time - lastGifFrameTime > gifFrames[currentGifFrame].delay) {
    currentGifFrame = (currentGifFrame + 1) % gifFrames.length;
    //currentGifFrame = (currentGifFrame + 1) % 3;
    gifTexture.image = gifFrames[currentGifFrame].bitmap;
    gifTexture.needsUpdate = true;
    lastGifFrameTime = time;
  }
}

// Render loop
renderer.setAnimationLoop((time) => {
  if (warriorTile) {
    updateWarriorFrame(time);
  }
  if (gifPlane) {
    updateGifFrame(time);
  }
  renderer.render(scene, camera);
});

// Load tilemap texture and create individual tiles
async function createTileGrid() {
  const texture = await loadTilemapTexture(TILEMAP_URL);
  const tileTextures = createTileTextures(texture, 4, 10);

  // Create a grid of tiles
  for (let x = 0; x < MAP_SIZE; x++) {
    for (let z = 0; z < MAP_SIZE; z++) {
      const tileGeometry = new TR.PlaneGeometry(TILE_SIZE, TILE_SIZE);

      // prettier-ignore
      const tileIndex = (x === 0 && z === 0) ? tileTextures[0] :
                  (x === MAP_SIZE - 1 && z === 0) ? tileTextures[2] :
                  (x === 0 && z === MAP_SIZE - 1) ? tileTextures[20] :
                  (x === MAP_SIZE - 1 && z === MAP_SIZE - 1) ? tileTextures[22] :
                  (x === 0) ? tileTextures[10] :
                  (x === MAP_SIZE - 1) ? tileTextures[12] :
                  (z === 0) ? tileTextures[1] :
                  (z === MAP_SIZE - 1) ? tileTextures[21] : 
                  tileTextures[11];
      const tileMaterial = new TR.MeshBasicMaterial({
        map: tileIndex,
        side: TR.DoubleSide,
      });
      const tile = new TR.Mesh(tileGeometry, tileMaterial);

      // Position each tile and rotate to face upward
      tile.position.set(x - MAP_SIZE / 2 + TILE_SIZE / 2, 0, z - MAP_SIZE / 2 + TILE_SIZE / 2);
      tile.rotation.x = -Math.PI / 2;

      scene.add(tile);
    }
  }

  // Add grid helper for a clean, elegant grid
  function createThickGrid(size, divisions, thickness, color, opacity = 0.3) {
    const material = new TR.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
    });
    const halfSize = size / 2;

    // Create a group to hold all grid lines
    const gridGroup = new TR.Group();

    // Create vertical lines
    for (let i = 0; i <= divisions; i++) {
      const position = -halfSize + (i * size) / divisions;

      // Vertical line geometry
      const verticalLine = new TR.Mesh(new TR.BoxGeometry(thickness, thickness, size), material);
      verticalLine.position.set(position, 0, 0);
      gridGroup.add(verticalLine);

      // Horizontal line geometry
      const horizontalLine = new TR.Mesh(new TR.BoxGeometry(size, thickness, thickness), material);
      horizontalLine.position.set(0, 0, position);
      gridGroup.add(horizontalLine);
    }

    return gridGroup;
  }

  // Usage
  const thickGrid = createThickGrid(MAP_SIZE, MAP_SIZE, 0.03, GRID_COLOR);
  thickGrid.rotation.y = Math.PI / 2;
  scene.add(thickGrid);
}

// Load the tilemap texture
function loadTilemapTexture(url) {
  return new Promise((resolve) => {
    const loader = new TR.TextureLoader();
    loader.load(url, (texture) => {
      texture.colorSpace = TR.SRGBColorSpace; // Updated property
      texture.magFilter = TR.NearestFilter;
      texture.minFilter = TR.NearestFilter;
      resolve(texture);
    });
  });
}

// Create tile textures from the tilemap
function createTileTextures(texture, rows, cols) {
  const tileTextures = [];

  // Create sub-textures from the main tilemap
  for (let row = rows - 1; row > -1; row--) {
    for (let col = 0; col < cols; col++) {
      const u = col / cols;
      const v = row / rows;
      const uSize = 1 / cols;
      const vSize = 1 / rows;

      // Clone the main texture and adjust UV mapping
      const tileTexture = texture.clone();
      tileTexture.repeat.set(uSize, vSize);
      tileTexture.offset.set(u, v);
      tileTexture.colorSpace = TR.SRGBColorSpace; // Ensure colorSpace is set
      tileTexture.needsUpdate = true;

      tileTextures.push(tileTexture);
    }
  }

  return tileTextures;
}

// Handle tile clicking
function onClick(event) {
  mouse.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(scene.children);
  if (intersects.length) {
    const { point } = intersects[0];
    const x = Math.floor(point.x + MAP_SIZE / 2);
    const z = Math.floor(point.z + MAP_SIZE / 2);
    setWarriorPosition(x, z);
    console.log('Tile clicked:', { x, z });
  }
}

window.addEventListener('click', onClick);

// Create the tile grid and entities
await createTileGrid();
await createCastle(2, 4);
await createWarrior();
await createTree(0, 1);

// Handle window resizing to maintain aspect ratio and fill screen
window.addEventListener('resize', onWindowResize);

function onWindowResize() {
  const newAspectRatio = window.innerWidth / window.innerHeight;

  if (newAspectRatio >= 1) {
    camera.left = -viewSize * newAspectRatio;
    camera.right = viewSize * newAspectRatio;
    camera.top = viewSize;
    camera.bottom = -viewSize;
  } else {
    camera.left = -viewSize;
    camera.right = viewSize;
    camera.top = viewSize / newAspectRatio;
    camera.bottom = -viewSize / newAspectRatio;
  }

  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
