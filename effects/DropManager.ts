import type * as THREE from "three";

import { getRandomArbitrary } from "~/utils/getRandomArbitrary";

import Drop, { type DropParameters } from "./Drop";

const MAX_DROP_SIZE = 0.5;
const MAX_DROP_DEPTH = 0.04;
const MAX_DROP_VISCOSITY = 1;
const MIN_DROP_SIZE = 0.05;
const MIN_DROP_DEPTH = 0.001;
const MIN_DROP_VISCOSITY = 0.01;

class DropManager {
  activeDrops: number;
  drops: Drop[];
  bounds: number;

  constructor(bounds: number) {
    this.activeDrops = 0;
    this.drops = Array(MAX_DROPS)
      .fill(0)
      .map(() => new Drop());
    this.bounds = bounds;
  }

  updateDropOn(index: number, dropParameters: DropParameters) {
    this.drops[index].makeDrop(dropParameters);
    this.activeDrops++;
  }

  makeDrops(count = MAX_DROPS) {
    for (let i = 0; i < count; i++) {
      this.updateDropOn(i, {
        x: getRandomArbitrary(this.bounds * -1, this.bounds),
        y: getRandomArbitrary(this.bounds * -1, this.bounds),
        size: getRandomArbitrary(MIN_DROP_SIZE, MAX_DROP_SIZE),
        depth: getRandomArbitrary(MIN_DROP_DEPTH, MAX_DROP_DEPTH),
      });
    }
  }

  makeDropsInRadius(startPoint: { x: number; y: number }, count = MAX_DROPS, spreadRadius: number) {
    for (let i = 0; i < count; i++) {
      const radius = getRandomArbitrary(spreadRadius);
      const angle = getRandomArbitrary(Math.PI * 2);
      const offsetX = Math.cos(angle) * radius;
      const offsetY = Math.sin(angle) * radius;

      const x = startPoint.x + offsetX;
      const y = startPoint.y + offsetY;
      this.updateDropOn(i, {
        x,
        y,
        size: getRandomArbitrary(MIN_DROP_SIZE, MAX_DROP_SIZE),
        depth: getRandomArbitrary(MIN_DROP_DEPTH, MAX_DROP_DEPTH),
      });
    }
  }

  resetDrops() {
    this.activeDrops = 0;
    for (let i = 0; i < MAX_DROPS; i++) {
      this.drops[i].reset();
    }
  }

  toUniforms() {
    return {
      drops: { value: this.drops },
      activeDrops: { value: this.activeDrops },
    };
  }

  updateUniforms(uniforms: { [key: string]: THREE.IUniform<any> } | DropUniforms) {
    if ("drops" in uniforms && "activeDrops" in uniforms) {
      uniforms.drops.value = this.drops;
      uniforms.activeDrops.value = this.activeDrops;
    }
  }
}

export const MAX_DROPS = 10;

export interface DropUniforms {
  drops: THREE.IUniform<Drop[]>;
  activeDrops: THREE.IUniform<number>;
}

export default DropManager;
