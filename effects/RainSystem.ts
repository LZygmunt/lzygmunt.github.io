import type * as THREE from "three";

import DropManager, { type DropUniforms, MAX_DROPS } from "~/effects/DropManager";
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
    this.spawnDropsWithDelay = this.spawnDropsWithDelay.bind(this);
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

  spawnDropsWithoutDelay(count: number) {
    for (let i = 0; i < count; i++) {
      this.#dropManager.spawnDrop(this.#computeDropParameters());
      this.#dropManager.updateUniforms(this.uniforms);
    }
  }

  spawnDropsWithDelay(count: number) {
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

  rain(intensity: number, delayed = true) {
    if (delayed) {
      this.spawnDropsWithDelay(this.#computeRandomCount(intensity));
      return;
    }
    this.spawnDropsWithoutDelay(this.#computeRandomCount(intensity));
  }

  resetDrops() {
    this.#dropManager.resetDrops();
  }
}

export const MIN_DROPS = 5;
export const MAX_INTENSITY = 15;
export const MAX_DROP_SIZE = 0.25;
export const MIN_DROP_SIZE = 0.05;
export const DROP_SIZE_FACTOR = 10;
export const MAX_DROP_DEPTH = 0.04;
export const MIN_DROP_DEPTH = 0.02;
export const BASE_DROP_DEPTH = MIN_DROP_DEPTH;

export default RainSystem;
