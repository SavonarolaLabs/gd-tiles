import * as TR from 'three';

// Constants
const MAP_SIZE = 48;
const TILE_SIZE = 1;
const TILEMAP_URL = 'assets/Tiny Swords/Terrain/Ground/Tilemap_Flat.png';

// Scene, Renderer, and Camera setup
const scene = new TR.Scene();
const renderer = new TR.WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Calculate aspect ratio and adjust camera size
const aspectRatio = window.innerWidth / window.innerHeight;
const viewSize = MAP_SIZE / 2;

let camera;
if (aspectRatio >= 1) {
  // Wide screen
  camera = new TR.OrthographicCamera(-viewSize * aspectRatio, viewSize * aspectRatio, viewSize, -viewSize, 0.1, MAP_SIZE * 2);
} else {
  // Tall screen
  camera = new TR.OrthographicCamera(-viewSize, viewSize, viewSize / aspectRatio, -viewSize / aspectRatio, 0.1, MAP_SIZE * 2);
}

camera.position.set(0, MAP_SIZE, 0);
camera.lookAt(0, 0, 0);

// Raycaster and mouse setup
const raycaster = new TR.Raycaster();
const mouse = new TR.Vector2();

// Load tilemap texture and create individual tiles
async function createTileGrid() {
  const texture = await loadTilemapTexture(TILEMAP_URL);
  const tileTextures = createTileTextures(texture);

  // Create a grid of tiles
  for (let x = 0; x < MAP_SIZE; x++) {
    for (let z = 0; z < MAP_SIZE; z++) {
      const tileGeometry = new TR.PlaneGeometry(TILE_SIZE, TILE_SIZE);
      const tileMaterial = new TR.MeshBasicMaterial({ map: tileTextures[(x + z) % tileTextures.length], side: TR.DoubleSide });
      const tile = new TR.Mesh(tileGeometry, tileMaterial);

      // Position each tile and rotate to face upward
      tile.position.set(x - MAP_SIZE / 2 + TILE_SIZE / 2, 0, z - MAP_SIZE / 2 + TILE_SIZE / 2);
      tile.rotation.x = -Math.PI / 2;

      scene.add(tile);
    }
  }
}

// Load the tilemap texture
function loadTilemapTexture(url) {
  return new Promise((resolve) => {
    const loader = new TR.TextureLoader();
    loader.load(url, (texture) => {
      texture.magFilter = TR.NearestFilter;
      texture.minFilter = TR.NearestFilter;
      resolve(texture);
    });
  });
}

// Create tile textures from the tilemap
function createTileTextures(texture) {
  const tileTextures = [];
  const rows = 4; // Number of rows in the tilemap
  const cols = 10; // Number of columns in the tilemap

  // Create sub-textures from the main tilemap
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const u = col / cols;
      const v = row / rows;
      const uSize = 1 / cols;
      const vSize = 1 / rows;

      // Clone the main texture and adjust UV mapping
      const tileTexture = texture.clone();
      tileTexture.repeat.set(uSize, vSize);
      tileTexture.offset.set(u, v);
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
    console.log('Tile clicked:', { x, z });
  }
}

window.addEventListener('click', onClick);

// Render loop
renderer.setAnimationLoop(() => renderer.render(scene, camera));

// Create the tile grid
createTileGrid();

// Handle window resizing to maintain aspect ratio and fill screen
window.addEventListener('resize', onWindowResize);

function onWindowResize() {
  const newAspectRatio = window.innerWidth / window.innerHeight;

  if (newAspectRatio >= 1) {
    // Wide screen
    camera.left = -viewSize * newAspectRatio;
    camera.right = viewSize * newAspectRatio;
    camera.top = viewSize;
    camera.bottom = -viewSize;
  } else {
    // Tall screen
    camera.left = -viewSize;
    camera.right = viewSize;
    camera.top = viewSize / newAspectRatio;
    camera.bottom = -viewSize / newAspectRatio;
  }

  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
