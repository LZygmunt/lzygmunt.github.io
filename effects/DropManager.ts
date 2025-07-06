import type * as THREE from "three";

import Drop, { DEFAULT_DROP_OUTSIDE_POSITION, type DropParameters } from "./Drop";

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
    this.activeDrops = this.activeDrops + (1 % MAX_DROPS);
  }

  spawnDrop(dropParameters: DropParameters) {
    const index = this.activeDrops % MAX_DROPS;
    this.updateDropOn(index, dropParameters);
    setTimeout(() => {
      this.updateDropOn(index, {
        x: DEFAULT_DROP_OUTSIDE_POSITION,
        y: DEFAULT_DROP_OUTSIDE_POSITION,
      });
    });
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

  setBounds(bounds: number) {
    this.bounds = bounds;
  }
}

export const MAX_DROPS = 100;
export const MAX_DROP_SIZE = 0.5;
export const MAX_DROP_DEPTH = 0.04;
export const MIN_DROP_SIZE = 0.05;
export const MIN_DROP_DEPTH = 0.01;

export interface DropUniforms {
  drops: THREE.IUniform<Drop[]>;
  activeDrops: THREE.IUniform<number>;
}

export default DropManager;
