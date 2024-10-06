import * as TR from 'three';

const MAP_SIZE = 48;
const TILE_SIZE = 1;

const scene = new TR.Scene();
const renderer = new TR.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const camera = new TR.OrthographicCamera(-MAP_SIZE / 2, MAP_SIZE / 2, MAP_SIZE / 2, -MAP_SIZE / 2, 0.1, MAP_SIZE * 2);
camera.position.set(0, MAP_SIZE, 0);
camera.lookAt(0, 0, 0);

// Create one large plane to represent the grid
const geometry = new TR.PlaneGeometry(MAP_SIZE, MAP_SIZE, MAP_SIZE, MAP_SIZE);
const material = new TR.MeshBasicMaterial({ color: 0xcccccc, wireframe: true });
const grid = new TR.Mesh(geometry, material);
grid.rotation.x = -Math.PI / 2;
scene.add(grid);

const raycaster = new TR.Raycaster();
const mouse = new TR.Vector2();

function onClick(event) {
  mouse.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObject(grid);
  if (intersects.length) {
    const { point } = intersects[0];
    const x = Math.floor(point.x + MAP_SIZE / 2);
    const z = Math.floor(point.z + MAP_SIZE / 2);
    console.log('Tile clicked:', { x, z });
  }
}
window.addEventListener('click', onClick);

renderer.setAnimationLoop(() => renderer.render(scene, camera));
