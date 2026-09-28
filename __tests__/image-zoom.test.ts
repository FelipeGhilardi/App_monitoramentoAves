import { clampOffset, clampZoom, MAX_ZOOM, MIN_ZOOM } from '../utils/imageZoom';

test('limita o zoom entre 1× e 4×', () => {
  expect(clampZoom(-2)).toBe(MIN_ZOOM);
  expect(clampZoom(1.5)).toBe(1.5);
  expect(clampZoom(9)).toBe(MAX_ZOOM);
});

test('impede arrasto se a imagem ainda cabe na tela', () => {
  expect(clampOffset(80, 200, 400, 1)).toBe(0);
  expect(clampOffset(-80, 200, 400, 2)).toBe(0);
});

test('limita o arrasto ao conteúdo ampliado e permite recentralizar', () => {
  expect(clampOffset(400, 200, 400, 4)).toBe(200);
  expect(clampOffset(-400, 200, 400, 4)).toBe(-200);
  expect(clampOffset(60, 200, 400, 4)).toBe(60);
  expect(clampOffset(60, 200, 400, 1)).toBe(0);
});
