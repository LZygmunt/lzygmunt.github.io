<script setup lang="ts">
import * as THREE from 'three'
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer'
import type { Variable } from 'three/addons/misc/GPUComputationRenderer'
import { RGBELoader } from 'three/addons/loaders/RGBELoader'
import { WaterMaterial } from '~/materials/WaterMaterial'
import { useTresContext, useLoop } from '@tresjs/core'
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';
import smoothFragmentShader from '~/assets/shaders/smoothFragmentShader.glsl'
import readWaterLevelFragmentShader from '~/assets/shaders/readWaterLevelFragmentShader.glsl'
import shaderChangeHeightmapFrag from '~/assets/shaders/shaderChangeHeightmapFrag.glsl'

// ========== CONFIGURATION CONSTANTS ==========
// Simulation
const TEXTURE_WIDTH = 128 // Heightmap texture resolution
const DEFAULT_WATER_BOUNDS = 6 // Default water surface size in world units
const BOUNDS_MARGIN = 1.2 // Margin for calculated surface size (20% more)

// Mouse/interaction parameters
const MOUSE_OUTSIDE_POSITION = 10000 // Mouse position when outside surface
const MOUSE_SIZE = 0.2 // Mouse effect size
const MOUSE_COORDS_NORMALIZE_MIN = -1 // Mouse coordinate normalization (minimum)
const MOUSE_COORDS_NORMALIZE_MAX = 1 // Mouse coordinate normalization (maximum)

// Water physics parameters
const WATER_VISCOSITY = 0.93 // Water viscosity (0-1, higher = less damped)
const WATER_DEPTH = 0.01 // Water depth
const WATER_MAX_HEIGHT = 0.1 // Maximum wave height

// Noise generation
const NOISE_ITERATIONS = 15 // Number of iterations for noise generation
const NOISE_MULTIPLIER_BASE = 0.025 // Base multiplier for noise
const NOISE_MULTIPLIER_DECAY = 0.53 // Multiplier decay coefficient
const NOISE_MULTIPLIER_INCREMENT = 0.025 // Multiplier increment per iteration
const NOISE_SCALE_MULTIPLIER = 1.25 // Noise scale multiplier per iteration
const NOISE_TEXTURE_SIZE = 128 // Noise texture size

// Rendering and performance
const FRAME_SKIP_BASE = 7 // Base number of frames to skip
const DEFAULT_EFFECT_SPEED = 7 // Default effect speed
const RESIZE_DEBOUNCE_MS = 100 // Debounce delay for resize (ms)

// Colors and materials
const BACKGROUND_COLOR = 0x000000 // Scene background color
const WATER_COLOR = 0x333333 // Water color
const WATER_METALNESS = 0.9 // Water material metalness
const WATER_ROUGHNESS = 0 // Water material roughness
const WATER_OPACITY = 0.8 // Water transparency
const INVISIBLE_MATERIAL_COLOR = 0xFFFFFF // Invisible raycast material color

// Render targets
const WATER_LEVEL_RT_WIDTH = 4 // Water level render target width
const WATER_LEVEL_RT_HEIGHT = 1 // Water level render target height
const WATER_LEVEL_IMAGE_SIZE = 4 * 1 * 4 // Pixel array size (RGBA * width * height)

// Geometry
const PLANE_ROTATION_X = -Math.PI * 0.5 // Plane rotation (90 degrees down)
const RAYCAST_PLANE_SEGMENTS = 1 // Number of segments for raycast plane

// Floating point precision
const DECIMAL_PRECISION = 1 // Decimal places precision for BOUNDS values

const { renderer, camera, raycaster, scene } = useTresContext()
const { render } = useLoop()

const waterMesh = shallowRef()
const meshRay = shallowRef()

// Calculate square size based on largest dimension of visible area
const BOUNDS = computed(() => {
  if (!camera.value || typeof window === 'undefined' ) return DEFAULT_WATER_BOUNDS
  
  const aspect = window.innerWidth / window.innerHeight
  const fov = camera.value.fov * Math.PI / 180
  const distance = camera.value.position.y // Camera height above surface
  
  // Calculate visible area height at y=0 level
  const visibleHeight = 2 * Math.tan(fov / 2) * distance
  const visibleWidth = visibleHeight * aspect
  
  // Use larger dimension so surface covers entire visible area
  const maxDimension = Math.max(visibleWidth, visibleHeight)
  
  // Add margin and return square size
  return maxDimension * BOUNDS_MARGIN
})

const waterMaterial = ref(new WaterMaterial({
  color: WATER_COLOR,
  metalness: WATER_METALNESS,
  roughness: WATER_ROUGHNESS,
  transparent: false,
  opacity: WATER_OPACITY,
  side: THREE.DoubleSide
}, TEXTURE_WIDTH, BOUNDS.value))

let tmpHeightmap = null;
const mouseCoords = new THREE.Vector2();
const simplex = new SimplexNoise();
let gpuCompute: GPUComputationRenderer;
let heightmapVariable: Variable;
let smoothShader;
let readWaterLevelShader;
let readWaterLevelRenderTarget;
let readWaterLevelImage;
let frame = 0;
let mousedown = false;
let effectController = {
  speed: DEFAULT_EFFECT_SPEED
};

// Move environment loading to async function
let env: THREE.DataTexture | null = null;

async function loadEnvironment() {
  try {
    // Use THREE.RGBELoader directly instead of useLoader
    const loader = new RGBELoader();
    env = await loader.loadAsync('./textures/equirectangular/blouberg_sunrise_2_1k.hdr');
    env.mapping = THREE.EquirectangularReflectionMapping;
    
    if (scene.value) {
      scene.value.background = new THREE.Color(BACKGROUND_COLOR)
      scene.value.environment = env;
    }
  } catch (error) {
    // console.error('Error loading HDR environment:', error);
    // Fallback - set simple background
    if (scene.value) {
      scene.value.background = new THREE.Color(BACKGROUND_COLOR);
    }
  }
}

function init() {
  waterMesh.value.updateMatrix();
  meshRay.value.updateMatrix();
  gpuCompute = new GPUComputationRenderer(TEXTURE_WIDTH, TEXTURE_WIDTH, renderer.value)
  const heightmap0 = gpuCompute.createTexture()
// fillTexture(heightmap0)
  heightmapVariable = gpuCompute.addVariable('heightmap', shaderChangeHeightmapFrag, heightmap0);

  gpuCompute.setVariableDependencies(heightmapVariable, [heightmapVariable]);

  heightmapVariable.material.uniforms['mousePos'] = { value: new THREE.Vector2(MOUSE_OUTSIDE_POSITION, MOUSE_OUTSIDE_POSITION) };
  heightmapVariable.material.uniforms['mouseSize'] = { value: MOUSE_SIZE  };
  heightmapVariable.material.uniforms['viscosity'] = { value: WATER_VISCOSITY };
  heightmapVariable.material.uniforms['deep'] = { value: WATER_DEPTH };
  heightmapVariable.material.defines.BOUNDS = BOUNDS.value.toFixed(DECIMAL_PRECISION);

  const error = gpuCompute.init();
  if (error !== null) console.error(error);

  readWaterLevelShader = gpuCompute.createShaderMaterial(readWaterLevelFragmentShader, {
    point1: { value: new THREE.Vector2() },
    levelTexture: { value: null }
  });
  readWaterLevelShader.defines.WIDTH = TEXTURE_WIDTH.toFixed(DECIMAL_PRECISION);
  readWaterLevelShader.defines.BOUNDS = BOUNDS.value.toFixed(DECIMAL_PRECISION);

  readWaterLevelImage = new Uint8Array(WATER_LEVEL_IMAGE_SIZE);

  readWaterLevelRenderTarget = new THREE.WebGLRenderTarget(WATER_LEVEL_RT_WIDTH, WATER_LEVEL_RT_HEIGHT, {
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: false
  });
}

function fillTexture( texture: THREE.DataTexture ) {
  const waterMaxHeight = 0.1;

  function noise( x: number, y: number ) {
    let multR = waterMaxHeight;
    let mult = 0.025;
    let r = 0;
    for ( let i = 0; i < 15; i ++ ) {
      r += multR * simplex.noise( x * mult, y * mult );
      multR *= 0.53 + 0.025 * i;
      mult *= 1.25;
    }
    return r;
  }

  const pixels = texture.image.data;
  let p = 0;
  for ( let j = 0; j < TEXTURE_WIDTH; j ++ ) {
    for ( let i = 0; i < TEXTURE_WIDTH; i ++ ) {
      const x = i * 128 / TEXTURE_WIDTH;
      const y = j * 128 / TEXTURE_WIDTH;
      pixels[ p + 0 ] = noise( x, y );
      pixels[ p + 1 ] = pixels[ p + 0 ];
      pixels[ p + 2 ] = 0;
      pixels[ p + 3 ] = 1;
      p += 4;
    }
  }
}

function onPointerDown() {
  mousedown = true;
}

function onPointerUp() {
  mousedown = false;
}

function onPointerMove(event) {
  const dom = renderer.value.domElement;
  mouseCoords.set(
    (event.clientX / dom.clientWidth) * (MOUSE_COORDS_NORMALIZE_MAX - MOUSE_COORDS_NORMALIZE_MIN) + MOUSE_COORDS_NORMALIZE_MIN,
    -((event.clientY / dom.clientHeight) * (MOUSE_COORDS_NORMALIZE_MAX - MOUSE_COORDS_NORMALIZE_MIN) - MOUSE_COORDS_NORMALIZE_MAX)
  );
}

function raycast() {
  const uniforms = heightmapVariable.material.uniforms;
  // if (mousedown) {
    raycaster.value.setFromCamera(mouseCoords, camera.value!);
    const intersects = raycaster.value.intersectObject(meshRay.value);
    if (intersects.length > 0) {
      const point = intersects[0].point;
      uniforms['mousePos'].value.set(Math.random() * BOUNDS.value * 2 - BOUNDS.value, Math.random() * BOUNDS.value * 2- BOUNDS.value);
    } else {
      uniforms['mousePos'].value.set(MOUSE_OUTSIDE_POSITION, MOUSE_OUTSIDE_POSITION);
    }
  // } else {
  //   uniforms['mousePos'].value.set(MOUSE_OUTSIDE_POSITION, MOUSE_OUTSIDE_POSITION);
  // }
}

function makeDrop() {
  mousedown = true;
  const uniforms = heightmapVariable.material.uniforms;
  uniforms['mousePos'].value.set(Math.random() * BOUNDS.value * 2 - BOUNDS.value, Math.random() * BOUNDS.value * 2- BOUNDS.value);
  // console.log( `Drop at -> [${uniforms['mousePos'].value.x}, ${uniforms['mousePos'].value.y}]`, )
  // setTimeout(() => { mousedown = false; }, 400)
}

// Listen for window resize changes
let resizeTimeout: NodeJS.Timeout
function handleResize() {
  clearTimeout(resizeTimeout)
  resizeTimeout = setTimeout(() => {
    if (waterMesh.value && meshRay.value) {
      // Update geometries with new square size
      waterMesh.value.geometry.dispose()
      meshRay.value.geometry.dispose()
      
      waterMesh.value.geometry = new THREE.PlaneGeometry(BOUNDS.value, BOUNDS.value, TEXTURE_WIDTH - 1, TEXTURE_WIDTH - 1)
      meshRay.value.geometry = new THREE.PlaneGeometry(BOUNDS.value, BOUNDS.value, RAYCAST_PLANE_SEGMENTS, RAYCAST_PLANE_SEGMENTS)
      
      // Update BOUNDS in shaders
      if (heightmapVariable) {
        heightmapVariable.material.defines.BOUNDS = BOUNDS.value.toFixed(DECIMAL_PRECISION);
        heightmapVariable.material.needsUpdate = true;
      }
      if (readWaterLevelShader) {
        readWaterLevelShader.defines.BOUNDS = BOUNDS.value.toFixed(DECIMAL_PRECISION);
        readWaterLevelShader.needsUpdate = true;
      }
    }
  }, RESIZE_DEBOUNCE_MS)
}

defineExpose({
  makeDrop,
})

onMounted(async () => {
  init();

  // Load environment asynchronously
  await loadEnvironment();
  
  // Add window resize listener
  window.addEventListener('resize', handleResize)
  
  render(({ renderer, scene, camera }) => {
    raycast();
    frame++;

    if (frame >= FRAME_SKIP_BASE - effectController.speed) {
      gpuCompute.compute();
      tmpHeightmap = gpuCompute.getCurrentRenderTarget(heightmapVariable).texture;

      if (waterMesh.value) waterMesh.value.material.heightmap = tmpHeightmap;
      frame = 0;
    }

    renderer.render(scene, camera);
  });
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }
})
</script>

<template>
  <TresMesh
    ref="waterMesh"
    :material="waterMaterial"
    receive-shadow
    cast-shadow
    matrix-auto-update
    :rotation-x="PLANE_ROTATION_X"
    @pointer-down="onPointerDown"
    @pointer-move="onPointerMove"
    @pointer-up="onPointerUp"
  >
    <TresPlaneGeometry :args="[BOUNDS, BOUNDS, TEXTURE_WIDTH - 1, TEXTURE_WIDTH - 1]" />
<!--    <TresWaterMaterial :args="[{-->
<!--          color: WATER_COLOR,-->
<!--          metalness: WATER_METALNESS,-->
<!--          roughness: WATER_ROUGHNESS,-->
<!--          transparent: false,-->
<!--          opacity: WATER_OPACITY,-->
<!--          side: THREE.DoubleSide-->
<!--        }, TEXTURE_WIDTH, BOUNDS]"/>-->
  </TresMesh>
  <TresMesh ref="meshRay" matrix-auto-update :rotation-x="PLANE_ROTATION_X">
    <TresPlaneGeometry :args="[BOUNDS, BOUNDS, RAYCAST_PLANE_SEGMENTS, RAYCAST_PLANE_SEGMENTS]" />
    <TresMeshBasicMaterial :color="INVISIBLE_MATERIAL_COLOR" :visible="false" />
  </TresMesh>
</template>

<style scoped>

</style>