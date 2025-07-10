/**
 * Returns a random floating-point number between `min` (inclusive) and `max` (exclusive).
 * If `min` is greater than `max`, the values are automatically swapped.
 *
 * @param {number} [min=0] - The lower bound of the range.
 * @param {number} [max=1] - The upper bound of the range (exclusive).
 * @returns {number} A random number in the range [min, max).
 *
 * @example
 * getRandomArbitrary(5, 10); // → e.g. 7.345
 * getRandomArbitrary(10, 5); // → still returns a number between 5 and 10
 * getRandomArbitrary();      // → number between 0 and 1
 */
export function getRandomArbitrary(min: number = 0, max: number = 1): number {
  if (min > max) [min, max] = [max, min];

  return Math.random() * (max - min) + min;
}
