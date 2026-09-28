export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

export function clampZoom(value: number): number {
  'worklet';
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
}

export function clampOffset(
  offset: number,
  imageSize: number,
  viewportSize: number,
  scale: number
): number {
  'worklet';
  const limit = Math.max(0, (imageSize * scale - viewportSize) / 2);
  if (limit === 0) return 0;
  return Math.max(-limit, Math.min(limit, offset));
}
