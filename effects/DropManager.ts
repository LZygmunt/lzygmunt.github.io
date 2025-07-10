import type * as THREE from "three";

import Drop, { type DropParameters } from "./Drop";

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
    setTimeout(() => {
      this.resetDropAt(index);
    });
  }

  spawnDrop(dropParameters: DropParameters) {
    const index = this.activeDrops % MAX_DROPS;
    this.updateDropOn(index, dropParameters);
  }

  resetDrops() {
    this.activeDrops = 0;
    for (let i = 0; i < MAX_DROPS; i++) {
      this.resetDropAt(i);
    }
  }

  resetDropAt(index: number) {
    this.drops[index].reset();
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

export interface DropUniforms {
  drops: THREE.IUniform<Drop[]>;
  activeDrops: THREE.IUniform<number>;
}

export default DropManager;
