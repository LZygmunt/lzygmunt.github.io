<script setup lang="ts">
import { type Intersection, useLoop, useTresContext } from "@tresjs/core";
import * as THREE from "three";
import { GUI } from "three/addons/libs/lil-gui.module.min";
import { RGBELoader } from "three/addons/loaders/RGBELoader";
import type { Variable } from "three/addons/misc/GPUComputationRenderer";
import { GPUComputationRenderer } from "three/addons/misc/GPUComputationRenderer";

import readWaterLevelFragmentShader from "~/assets/shaders/readWaterLevelFragmentShader.glsl";
import shaderChangeHeightmapFrag from "~/assets/shaders/shaderChangeHeightmapFrag.glsl";
import { DEFAULT_DROP_DEPTH, DEFAULT_DROP_SIZE } from "~/effects/Drop";
import DropManager from "~/effects/DropManager";
import { WaterMaterial } from "~/materials/WaterMaterial";
import { useWindowResize } from "~/useWindowResize";

// ========== CONFIGURATION CONSTANTS ==========
// Simulation
const TEXTURE_WIDTH = 128; // Heightmap texture resolution
const DEFAULT_WATER_BOUNDS = 6; // Default water surface size in world units
const BOUNDS_MARGIN = 1.2; // Margin for calculated surface size (20% more)

// Drop/interactions parameters
const MOUSE_COORDS_NORMALIZE_MIN = -1; // Mouse coordinate normalization (minimum)
const MOUSE_COORDS_NORMALIZE_MAX = 1; // Mouse coordinate normalization (maximum)

// Rendering and performance
const FRAME_SKIP_BASE = 7; // Base number of frames to skip
const DEFAULT_EFFECT_SPEED = 6; // Default effect speed

// Colors and materials
const BACKGROUND_COLOR = 0x000000; // Scene background color
const WATER_COLOR = 0x9bd2ec; // Water color
const WATER_METALNESS = 0.9; // Water material metalness
const WATER_ROUGHNESS = 0; // Water material roughness
const WATER_OPACITY = 0.8; // Water transparency
const INVISIBLE_MATERIAL_COLOR = 0xffffff; // Invisible raycast material color

// Geometry
const PLANE_ROTATION_X = -Math.PI * 0.5; // Plane rotation (90 degrees down)
const RAYCAST_PLANE_SEGMENTS = 1; // Number of segments for raycast plane

// Floating point precision
const DECIMAL_PRECISION = 1; // Decimal places precision for BOUNDS values

const { renderer, camera, raycaster, scene } = useTresContext();
const { render } = useLoop();

const waterMesh = shallowRef();
const meshRay = shallowRef();

// Calculate square size based on largest dimension of visible area
const BOUNDS = computed(() => {
  if (!camera.value || typeof window === "undefined") return DEFAULT_WATER_BOUNDS;

  const aspect = window.innerWidth / window.innerHeight;
  // @ts-expect-error something wrong with type camera and did not see fov field
  const fov = (camera.value.fov * Math.PI) / 180;
  const distance = camera.value.position.y; // Camera height above surface

  // Calculate visible area height at y=0 level
  const visibleHeight = 2 * Math.tan(fov / 2) * distance;
  const visibleWidth = visibleHeight * aspect;

  // Use larger dimension so surface covers entire visible area
  const maxDimension = Math.max(visibleWidth, visibleHeight);

  // Add margin and return square size
  return maxDimension * BOUNDS_MARGIN;
});

const dropManager = ref(new DropManager(BOUNDS.value / 2));

const waterMaterial = ref(
  new WaterMaterial(
    {
      color: WATER_COLOR,
      metalness: WATER_METALNESS,
      roughness: WATER_ROUGHNESS,
      transparent: false,
      opacity: WATER_OPACITY,
      side: THREE.DoubleSide,
    },
    TEXTURE_WIDTH,
    BOUNDS.value,
  ),
);

let tmpHeightmap = null;
const mouseCoords = new THREE.Vector2();
let gpuCompute: GPUComputationRenderer;
let heightmapVariable: Variable;
let readWaterLevelShader: THREE.ShaderMaterial;
let frame = 0;
let mousedown = false;
const effectController = reactive({
  speed: DEFAULT_EFFECT_SPEED,
  size: DEFAULT_DROP_SIZE,
  depth: DEFAULT_DROP_DEPTH,
});

// Move environment loading to async function
let env: THREE.DataTexture | null = null;

async function loadEnvironment() {
  try {
    // Use THREE.RGBELoader directly instead of useLoader
    const loader = new RGBELoader();
    env = await loader.loadAsync("./textures/equirectangular/blouberg_sunrise_2_1k.hdr");
    env.mapping = THREE.EquirectangularReflectionMapping;

    if (scene.value) {
      scene.value.background = new THREE.Color(BACKGROUND_COLOR);
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

function initGui() {
  const gui = new GUI();
  gui.domElement.style.right = "0px";

  gui.add(effectController, "size", 0.05, 0.25, 0.01);
  gui.add(effectController, "depth", 0.001, 0.04, 0.001);
}

function init() {
  waterMesh.value.updateMatrix();
  meshRay.value.updateMatrix();
  gpuCompute = new GPUComputationRenderer(TEXTURE_WIDTH, TEXTURE_WIDTH, renderer.value);
  const heightmap0 = gpuCompute.createTexture();

  heightmapVariable = gpuCompute.addVariable("heightmap", shaderChangeHeightmapFrag, heightmap0);
  gpuCompute.setVariableDependencies(heightmapVariable, [heightmapVariable]);

  heightmapVariable.material.uniforms = dropManager.value.toUniforms();
  heightmapVariable.material.defines.BOUNDS = BOUNDS.value.toFixed(DECIMAL_PRECISION);

  const error = gpuCompute.init();
  if (error !== null) console.error(error);

  readWaterLevelShader = gpuCompute.createShaderMaterial(readWaterLevelFragmentShader, {
    point1: { value: new THREE.Vector2() },
    levelTexture: { value: null },
  });
  readWaterLevelShader.defines.WIDTH = TEXTURE_WIDTH.toFixed(DECIMAL_PRECISION);
  readWaterLevelShader.defines.BOUNDS = BOUNDS.value.toFixed(DECIMAL_PRECISION);
}

function onPointerDown() {
  mousedown = true;
}

function onPointerUp() {
  mousedown = false;
}

function onPointerMove(event: PointerEvent & Intersection) {
  const dom = renderer.value.domElement;
  mouseCoords.set(
    (event.clientX / dom.clientWidth) * (MOUSE_COORDS_NORMALIZE_MAX - MOUSE_COORDS_NORMALIZE_MIN) +
      MOUSE_COORDS_NORMALIZE_MIN,
    -(
      (event.clientY / dom.clientHeight) *
        (MOUSE_COORDS_NORMALIZE_MAX - MOUSE_COORDS_NORMALIZE_MIN) -
      MOUSE_COORDS_NORMALIZE_MAX
    ),
  );
}

function raycast() {
  if (mousedown) {
    const uniforms = heightmapVariable.material.uniforms;
    raycaster.value.setFromCamera(mouseCoords, camera.value!);
    const intersects = raycaster.value.intersectObject(meshRay.value);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      dropManager.value.updateDropOn(0, {
        x: point.x,
        y: point.z,
        size: effectController.size,
        depth: effectController.depth,
      });

      dropManager.value.updateUniforms(uniforms);
    } else {
      dropManager.value.resetDrops();
    }
  } else {
    dropManager.value.resetDrops();
  }
}

function handleResize() {
  if (waterMesh.value && meshRay.value) {
    // Update geometries with new square size
    waterMesh.value.geometry.dispose();
    meshRay.value.geometry.dispose();

    waterMesh.value.geometry = new THREE.PlaneGeometry(
      BOUNDS.value,
      BOUNDS.value,
      TEXTURE_WIDTH - 1,
      TEXTURE_WIDTH - 1,
    );
    meshRay.value.geometry = new THREE.PlaneGeometry(
      BOUNDS.value,
      BOUNDS.value,
      RAYCAST_PLANE_SEGMENTS,
      RAYCAST_PLANE_SEGMENTS,
    );

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
}

onMounted(async () => {
  init();

  // Load environment asynchronously
  await loadEnvironment();

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

useWindowResize(handleResize);
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