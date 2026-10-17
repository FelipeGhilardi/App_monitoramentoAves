import { act, fireEvent, render } from '@testing-library/react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import SightingImageViewer from '../components/SightingImageViewer';

jest.mock('expo-image', () => ({ Image: require('react-native').Image }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}));
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  type MockGesture = {
    start?: (event: unknown) => void;
    update?: (event: unknown) => void;
    end?: (event: { translationX: number; translationY: number }) => void;
    enabled: () => MockGesture;
    maxPointers: () => MockGesture;
    onStart: (callback: (event: unknown) => void) => MockGesture;
    onUpdate: (callback: (event: unknown) => void) => MockGesture;
    onEnd: (callback: (event: { translationX: number; translationY: number }) => void) => MockGesture;
  };
  const gesture = () => {
    const result: MockGesture = {
      enabled: () => result,
      maxPointers: () => result,
      onStart: (callback) => { result.start = callback; return result; },
      onUpdate: (callback) => { result.update = callback; return result; },
      onEnd: (callback) => { result.end = callback; return result; },
    };
    return result;
  };
  return {
    Gesture: { Pinch: gesture, Pan: gesture, Simultaneous: (...gestures: unknown[]) => gestures },
    GestureDetector: ({ children, gesture }: { children: React.ReactNode; gesture: unknown }) =>
      React.createElement(View, { testID: 'viewer-gestures', gesture }, children),
    GestureHandlerRootView: View,
  };
});
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: require('react-native').View },
  useSharedValue: (value: number) => ({ value }),
  useAnimatedStyle: () => ({}),
  withTiming: (value: number) => value,
  runOnJS: (fn: (...args: number[]) => void) => fn,
}));

test('o visualizador tem controles acessíveis, respeita 1×–4× e fecha', async () => {
  const onClose = jest.fn();
  const screen = await render(<SightingImageViewer uri="https://example.test/photo.jpg" onClose={onClose} />);
  await fireEvent(screen.getByTestId('viewer-viewport'), 'layout', {
    nativeEvent: { layout: { width: 400, height: 800 } },
  });
  await fireEvent(screen.getByTestId('full-screen-photo'), 'load', {
    source: { width: 1200, height: 800 },
  });

  expect(screen.getByText('1.0×')).toBeTruthy();
  expect(screen.getByLabelText('Diminuir zoom').props.accessibilityState.disabled).toBe(true);
  for (let i = 0; i < 6; i += 1) await fireEvent.press(screen.getByLabelText('Aumentar zoom'));
  expect(screen.getByText('4.0×')).toBeTruthy();
  expect(screen.getByLabelText('Aumentar zoom').props.accessibilityState.disabled).toBe(true);

  await fireEvent.press(screen.getByLabelText('Fechar imagem'));
  expect(onClose).toHaveBeenCalledTimes(1);
  await screen.unmount();
  const reopened = await render(<SightingImageViewer uri="https://example.test/photo.jpg" onClose={onClose} />);
  await fireEvent(reopened.getByTestId('viewer-viewport'), 'layout', {
    nativeEvent: { layout: { width: 400, height: 800 } },
  });
  await fireEvent(reopened.getByTestId('full-screen-photo'), 'load', {
    source: { width: 1200, height: 800 },
  });
  expect(reopened.getByText('1.0×')).toBeTruthy();
  for (let i = 0; i < 6; i += 1) await fireEvent.press(reopened.getByLabelText('Aumentar zoom'));
  for (let i = 0; i < 6; i += 1) await fireEvent.press(reopened.getByLabelText('Diminuir zoom'));
  expect(reopened.getByText('1.0×')).toBeTruthy();
});

test('falha ao carregar a foto é explícita e permite repetir', async () => {
  const screen = await render(<SightingImageViewer uri="https://example.test/photo.jpg" onClose={jest.fn()} />);
  await fireEvent(screen.getByTestId('full-screen-photo'), 'error');
  expect(screen.getByText('Não foi possível carregar a imagem.')).toBeTruthy();
  await fireEvent.press(screen.getByText('Tentar novamente'));
  expect(screen.getByTestId('full-screen-photo')).toBeTruthy();
});

test('libera a rotação somente enquanto o visualizador está aberto', async () => {
  const screen = await render(<SightingImageViewer uri="https://example.test/photo.jpg" onClose={jest.fn()} />);

  expect(ScreenOrientation.lockAsync).toHaveBeenCalledWith(ScreenOrientation.OrientationLock.DEFAULT);
  await screen.unmount();
  expect(ScreenOrientation.lockAsync).toHaveBeenLastCalledWith(ScreenOrientation.OrientationLock.PORTRAIT_UP);
});

test('troca a foto ampliada com arrasto horizontal em 1×', async () => {
  const onChangePhoto = jest.fn();
  const screen = await render(
    <SightingImageViewer
      uri="https://example.test/photo.jpg"
      onClose={jest.fn()}
      photoIndex={0}
      photoCount={2}
      canGoNext
      onChangePhoto={onChangePhoto}
    />
  );
  await fireEvent(screen.getByTestId('viewer-viewport'), 'layout', {
    nativeEvent: { layout: { width: 400, height: 800 } },
  });
  await fireEvent(screen.getByTestId('full-screen-photo'), 'load', {
    source: { width: 1200, height: 800 },
  });

  const gestures = screen.getByTestId('viewer-gestures').props.gesture as { end?: (event: object) => void }[];
  const pan = gestures[1];
  await act(async () => { pan?.end?.({ translationX: -80, translationY: 0 }); });

  expect(onChangePhoto).toHaveBeenCalledWith(1);
  expect(screen.getByText('1 de 2')).toBeTruthy();
});
