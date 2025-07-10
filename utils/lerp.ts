/**
 * Linearly interpolates between `min` and `max` using a given factor.
 *
 * @param {number} min - The start value (returned when factor is 0).
 * @param {number} max - The end value (returned when factor is 1).
 * @param {number} factor - A number between 0 and 1 representing the interpolation factor.
 * @returns {number} Interpolated value between `min` and `max`.
 *
 * @example
 * lerp(10, 20, 0.5); // returns 15
 */
export function lerp(min: number, max: number, factor: number) {
  return (1 - factor) * min + factor * max;
}
