import * as THREE from "three";

export interface DropParameters {
  x: number;
  y: number;
  size?: number;
  depth?: number;
}

class Drop {
  position: THREE.Vector2;
  size: number;
  depth: number;

  constructor() {
    this.position = new THREE.Vector2(DEFAULT_DROP_OUTSIDE_POSITION, DEFAULT_DROP_OUTSIDE_POSITION);
    this.depth = DEFAULT_DROP_DEPTH;
    this.size = DEFAULT_DROP_SIZE;
  }

  makeDrop({ x, y, size = DEFAULT_DROP_SIZE, depth = DEFAULT_DROP_DEPTH }: DropParameters) {
    this.size = size;
    this.depth = depth;
    this.position.set(x, y);
  }

  reset() {
    this.depth = DEFAULT_DROP_DEPTH;
    this.size = DEFAULT_DROP_SIZE;
    this.position.set(DEFAULT_DROP_OUTSIDE_POSITION, DEFAULT_DROP_OUTSIDE_POSITION);
  }
}

export const DEFAULT_DROP_DEPTH = 0.01; // Tells how far drop goes into water surface (0-1, higher = deeper).
export const DEFAULT_DROP_SIZE = 0.2; // Tells how big drop should be (0-1, higher = bigger).
export const DEFAULT_DROP_OUTSIDE_POSITION = 10000;

export default Drop;
