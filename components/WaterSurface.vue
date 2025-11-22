<script setup lang="ts">
import { type Intersection, useLoop, useTresContext } from "@tresjs/core";
import * as THREE from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader";
import type { Variable } from "three/addons/misc/GPUComputationRenderer";
import { GPUComputationRenderer } from "three/addons/misc/GPUComputationRenderer";

import readWaterLevelFragmentShader from "~/assets/shaders/readWaterLevelFragmentShader.glsl";
import shaderChangeHeightmapFrag from "~/assets/shaders/shaderChangeHeightmapFrag.glsl";
import { useWindowResize } from "~/composables/useWindowResize";
import { MAX_EFFECT_SPEED } from "~/constants";
import DropManager, { MAX_DROPS } from "~/effects/DropManager";
import RainSystem from "~/effects/RainSystem";
import { WaterMaterial } from "~/materials/WaterMaterial";
import { useControlsGUIStore } from "~/stores/useControlsGUIStore";

// ========== CONFIGURATION CONSTANTS ==========
// Simulation
const TEXTURE_WIDTH = 128; // Heightmap texture resolution
const DEFAULT_WATER_BOUNDS = 6; // Default water surface size in world units
const BOUNDS_MARGIN = 1.2; // Margin for calculated surface size (20% more)

// Drop/interactions parameters
const MOUSE_COORDS_NORMALIZE_MIN = -1; // Mouse coordinate normalization (minimum)
const MOUSE_COORDS_NORMALIZE_MAX = 1; // Mouse coordinate normalization (maximum)

// Rendering and performance
const RAIN_FRAME_SKIP_BASE = 90;
const FRAME_SKIP_BASE = MAX_EFFECT_SPEED; // Base number of frames to skip
const FRAME_RATE_LIMIT = 60;
const FRAME_DELAY = 1 / FRAME_RATE_LIMIT; // elapsed jest w sekundach

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
  if (!camera.value || typeof window === "undefined") {
    return DEFAULT_WATER_BOUNDS;
  }

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
  return Math.ceil(maxDimension * BOUNDS_MARGIN);
});

const dropManager = ref(new DropManager(BOUNDS.value / 2));
const rainSystem = ref<RainSystem | null>(null);

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
let rainFrames = 0;
let lastFrameTime = 0;

const controlsGUIStore = useControlsGUIStore();
const { showCursorDrop, isCursorDrop, hideCursorDrop } = useCursorDrop(
  () => controlsGUIStore.controls.cursorDropEnabled,
);

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

function init() {
  waterMesh.value.updateMatrix();
  meshRay.value.updateMatrix();
  gpuCompute = new GPUComputationRenderer(TEXTURE_WIDTH, TEXTURE_WIDTH, renderer.value);
  const heightmap0 = gpuCompute.createTexture();

  heightmapVariable = gpuCompute.addVariable("heightmap", shaderChangeHeightmapFrag, heightmap0);
  gpuCompute.setVariableDependencies(heightmapVariable, [heightmapVariable]);

  heightmapVariable.material.uniforms = dropManager.value.toUniforms();
  heightmapVariable.material.defines.BOUNDS = BOUNDS.value.toFixed(DECIMAL_PRECISION);

  rainSystem.value = new RainSystem(
    dropManager.value,
    heightmapVariable.material.uniforms,
    MAX_DROPS,
  );

  const error = gpuCompute.init();
  if (error !== null) {
    console.error(error);
  }

  readWaterLevelShader = gpuCompute.createShaderMaterial(readWaterLevelFragmentShader, {
    point1: { value: new THREE.Vector2() },
    levelTexture: { value: null },
  });
  readWaterLevelShader.defines.WIDTH = TEXTURE_WIDTH.toFixed(DECIMAL_PRECISION);
  readWaterLevelShader.defines.BOUNDS = BOUNDS.value.toFixed(DECIMAL_PRECISION);
}

function onPointerDown() {
  showCursorDrop();
}

function onPointerUp() {
  hideCursorDrop();
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
  if (isCursorDrop.value) {
    const uniforms = heightmapVariable.material.uniforms;
    raycaster.value.setFromCamera(mouseCoords, camera.value!);
    const intersects = raycaster.value.intersectObject(meshRay.value);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      dropManager.value.updateDropOn(0, {
        x: point.x,
        y: point.z,
        size: controlsGUIStore.controls.cursorDropSize,
        depth: controlsGUIStore.controls.cursorDropDepth,
      });

      dropManager.value.updateUniforms(uniforms);
    }
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

  render(({ renderer, scene, camera, elapsed }) => {
    if (elapsed - lastFrameTime < FRAME_DELAY) {
      return;
    }

    lastFrameTime = elapsed;

    raycast();
    frame++;
    rainFrames++;

    if (rainFrames > RAIN_FRAME_SKIP_BASE / controlsGUIStore.controls.rainIntensity) {
      rainSystem.value?.rain(
        controlsGUIStore.controls.rainIntensity,
        controlsGUIStore.controls.rainMode,
      );
      rainFrames = 0;
    }
    if (frame >= FRAME_SKIP_BASE - controlsGUIStore.controls.speed) {
      gpuCompute.compute();
      tmpHeightmap = gpuCompute.getCurrentRenderTarget(heightmapVariable).texture;

      if (waterMesh.value) {
        waterMesh.value.material.heightmap = tmpHeightmap;
      }
      frame = 0;
    }

    renderer.render(scene, camera);
  });
});

useWindowResize(handleResize);
function useCursorDrop(enabled: MaybeRefOrGetter<boolean>) {
  const isCursorDrop = ref(false);
  const isEnabled = computed(() => toValue(enabled));

  function showCursorDrop() {
    if (isEnabled.value) {
      isCursorDrop.value = true;
    }
  }
  function hideCursorDrop() {
    if (isEnabled.value) {
      isCursorDrop.value = false;
    }
  }

  return {
    isCursorDrop: readonly(isCursorDrop),
    showCursorDrop,
    hideCursorDrop,
  };
}
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
    <TresPlaneGeometry :args="[BOUNDS, BOUNDS, TEXTURE_WIDTH - 1, TEXTURE_WIDTH - 1]"/>
  </TresMesh>
  <TresMesh ref="meshRay" matrix-auto-update :rotation-x="PLANE_ROTATION_X">
    <TresPlaneGeometry :args="[BOUNDS, BOUNDS, RAYCAST_PLANE_SEGMENTS, RAYCAST_PLANE_SEGMENTS]"/>
    <TresMeshBasicMaterial :color="INVISIBLE_MATERIAL_COLOR" :visible="false"/>
  </TresMesh>
</template>

<style scoped>

</style>