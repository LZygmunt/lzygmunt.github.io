import type * as THREE from "three";

import DropManager, { type DropUniforms, MAX_DROPS } from "~/effects/DropManager";
import { getRandomArbitrary } from "~/utils/getRandomArbitrary";

class RainSystem {
  uniforms: { [key: string]: THREE.IUniform<any> } | DropUniforms;
  maxDrops: number;
  #intensity: number = 0;
  #dropManager: DropManager;

  constructor(
    boundsOrManager: number | DropManager,
    uniforms: { [key: string]: THREE.IUniform<any> } | DropUniforms,
    maxDrops = MAX_DROPS,
  ) {
    this.maxDrops = maxDrops;
    this.uniforms = uniforms;
    this.#dropManager =
      boundsOrManager instanceof DropManager ? boundsOrManager : new DropManager(boundsOrManager);

    this.rain = this.rain.bind(this);
    this.spawnDrops = this.spawnDrops.bind(this);
    this.resetDrops = this.resetDrops.bind(this);
  }

  setUniforms(uniforms: { [key: string]: THREE.IUniform<any> } | DropUniforms) {
    this.uniforms = uniforms;
  }

  setMaxDrops(maxDrops: number) {
    this.maxDrops = maxDrops;
  }

  spawnDrops(count: number) {
    for (let i = 0; i < count; i++) {
      const bounds = this.#dropManager.bounds;
      const size = getRandomArbitrary(0.05, 0.2);
      this.#dropManager.spawnDrop({
        x: getRandomArbitrary(bounds * -1, bounds),
        y: getRandomArbitrary(bounds * -1, bounds),
        size,
        depth: size * getRandomArbitrary(0.02, 0.04),
      });
    }

    this.#dropManager.updateUniforms(this.uniforms);
  }

  rain(intensity: number) {
    this.#intensity = intensity;
    this.spawnDrops(Math.floor(getRandomArbitrary((this.#intensity * this.maxDrops) / 10)));
  }

  resetDrops() {
    this.#dropManager.resetDrops();
  }
}

export default RainSystem;
