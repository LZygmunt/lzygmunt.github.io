export function getRandomArbitrary(min?: number, max?: number) {
  if (min === undefined) {
    return Math.random();
  }
  if (max === undefined) {
    return Math.random() * min;
  }
  return Math.random() * (max - min) + min;
}
