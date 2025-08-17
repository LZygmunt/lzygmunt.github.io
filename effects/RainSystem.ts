import type * as THREE from "three";

import DropManager, { type DropUniforms, MAX_DROPS } from "~/effects/DropManager";
import type { ValueOf } from "~/types/valueOf";
import { getRandomArbitrary } from "~/utils/getRandomArbitrary";
import { lerp } from "~/utils/lerp";

const MIN_DROP_DELAY = 0;
const MAX_DROP_DELAY = 1000;

class RainSystem {
  uniforms: { [key: string]: THREE.IUniform } | DropUniforms;
  maxDrops: number;
  #intensity: number = 0;
  #dropManager: DropManager;

  constructor(
    boundsOrManager: number | DropManager,
    uniforms: { [key: string]: THREE.IUniform } | DropUniforms,
    maxDrops = MAX_DROPS,
  ) {
    this.maxDrops = maxDrops;
    this.uniforms = uniforms;
    this.#dropManager =
      boundsOrManager instanceof DropManager ? boundsOrManager : new DropManager(boundsOrManager);

    this.rain = this.rain.bind(this);
    this.spawnDropsOneByOne = this.spawnDropsOneByOne.bind(this);
    this.spawnDropsAllAtOnce = this.spawnDropsAllAtOnce.bind(this);
    this.resetDrops = this.resetDrops.bind(this);
    this.setMaxDrops = this.setMaxDrops.bind(this);
    this.setUniforms = this.setUniforms.bind(this);
  }

  #randomBounds() {
    const bounds = this.#dropManager.bounds;
    const halfWindowWidth = window.innerWidth / 2;
    const halfWindowHeight = window.innerHeight / 2;
    const boundsStepX = bounds / halfWindowWidth;
    const boundsStepY = bounds / halfWindowHeight;
    const boundsX = Math.min(boundsStepX, boundsStepY) * halfWindowWidth;
    const boundsY = Math.min(boundsStepX, boundsStepY) * halfWindowHeight;
    return {
      x: getRandomArbitrary(boundsX * -1, boundsX),
      y: getRandomArbitrary(boundsY * -1, boundsY),
    };
  }

  #computeDropMetrics() {
    const min = (MAX_DROP_SIZE * DROP_SIZE_FACTOR) / MAX_INTENSITY;
    const size = getRandomArbitrary(min, min * (this.#intensity / DROP_SIZE_FACTOR) + min);

    return {
      size,
      depth: size * BASE_DROP_DEPTH,
    };
  }

  #computeDropParameters() {
    return {
      ...this.#randomBounds(),
      ...this.#computeDropMetrics(),
    };
  }

  #computeRandomCount(intensity: number) {
    this.#intensity = intensity;
    const maxWithRatio = (MAX_DROPS * MAX_INTENSITY) / 100;
    const min = Math.floor(lerp(MIN_DROPS, maxWithRatio, this.#intensity / MAX_INTENSITY));
    const max = Math.floor(lerp(maxWithRatio, MAX_DROPS, this.#intensity / MAX_INTENSITY));
    return Math.floor(getRandomArbitrary(min, max));
  }

  setUniforms(uniforms: { [key: string]: THREE.IUniform<any> } | DropUniforms) {
    this.uniforms = uniforms;
  }

  setMaxDrops(maxDrops: number) {
    this.maxDrops = maxDrops;
  }

  spawnDropsAllAtOnce(count: number) {
    for (let i = 0; i < count; i++) {
      this.#dropManager.spawnDrop(this.#computeDropParameters());
      this.#dropManager.updateUniforms(this.uniforms);
    }
  }

  spawnDropsOneByOne(count: number) {
    const spawnOne = (remaining: number) => {
      if (remaining <= 0) return;

      this.#dropManager.spawnDrop(this.#computeDropParameters());
      this.#dropManager.updateUniforms(this.uniforms);

      setTimeout(() => {
        spawnOne(remaining - 1);
      }, getRandomArbitrary(MIN_DROP_DELAY, MAX_DROP_DELAY) / this.#intensity);
    };

    spawnOne(count);
  }

  rain(intensity: number, mode: RainMode = RAIN_MODE.ONE_BY_ONE) {
    if (isAllAtOnce(mode)) {
      this.spawnDropsAllAtOnce(this.#computeRandomCount(intensity));
      return;
    }
    this.spawnDropsOneByOne(this.#computeRandomCount(intensity));
  }

  resetDrops() {
    this.#dropManager.resetDrops();
  }
}

export const MIN_DROPS = 5;
export const MAX_INTENSITY = 15;
export const MIN_INTENSITY = 0;
export const STEP_INTENSITY = 1;
export const MAX_DROP_SIZE = 0.25;
export const MIN_DROP_SIZE = 0.05;
export const STEP_DROP_SIZE = 0.01;
export const DROP_SIZE_FACTOR = 10;
export const MAX_DROP_DEPTH = 0.04;
export const MIN_DROP_DEPTH = 0.02;
export const STEP_DROP_DEPTH = 0.001;
export const BASE_DROP_DEPTH = MIN_DROP_DEPTH;

export const RAIN_MODE = {
  ONE_BY_ONE: "one_by_one",
  ALL_AT_ONCE: "all_at_once",
} as const;

export type RainMode = ValueOf<typeof RAIN_MODE>;

export function isOnByOne(mode: RainMode) {
  return mode === RAIN_MODE.ONE_BY_ONE;
}
export function isAllAtOnce(mode: RainMode) {
  return mode === RAIN_MODE.ALL_AT_ONCE;
}

export default RainSystem;
