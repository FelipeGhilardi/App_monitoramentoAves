import { useMemo, useState } from 'react';
import {
  ActivityIndicator, Modal, Pressable, StatusBar, StyleSheet, Text, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS, useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clampOffset, clampZoom, MAX_ZOOM, MIN_ZOOM } from '../utils/imageZoom';
import { theme } from '../constants/theme';

interface Props {
  uri: string;
  onClose: () => void;
  accessibilityLabel?: string;
}

export default function SightingImageViewer({
  uri, onClose, accessibilityLabel = 'Foto do avistamento ampliada',
}: Props) {
  const insets = useSafeAreaInsets();
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [imageError, setImageError] = useState(false);
  const [imageAttempt, setImageAttempt] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(MIN_ZOOM);
  const scale = useSharedValue(MIN_ZOOM);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const initialScale = useSharedValue(MIN_ZOOM);
  const initialX = useSharedValue(0);
  const initialY = useSharedValue(0);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  const ratio = imageSize.width / imageSize.height;
  const fittedWidth = Number.isFinite(ratio) && ratio > 0
    ? Math.min(viewport.width, viewport.height * ratio)
    : 0;
  const fittedHeight = Number.isFinite(ratio) && ratio > 0
    ? Math.min(viewport.height, viewport.width / ratio)
    : 0;
  const ready = fittedWidth > 0 && fittedHeight > 0 && !imageError;

  const gesture = useMemo(() => {
    const pinch = Gesture.Pinch()
      .enabled(ready)
      .onStart((event) => {
        initialScale.value = scale.value;
        initialX.value = x.value;
        initialY.value = y.value;
        focalX.value = event.focalX - viewport.width / 2;
        focalY.value = event.focalY - viewport.height / 2;
      })
      .onUpdate((event) => {
        const nextScale = clampZoom(initialScale.value * event.scale);
        const relativeScale = nextScale / initialScale.value;
        scale.value = nextScale;
        x.value = clampOffset(
          initialX.value + focalX.value * (1 - relativeScale),
          fittedWidth, viewport.width, nextScale
        );
        y.value = clampOffset(
          initialY.value + focalY.value * (1 - relativeScale),
          fittedHeight, viewport.height, nextScale
        );
      })
      .onEnd(() => {
        runOnJS(setZoomLevel)(Math.round(scale.value * 10) / 10);
      });

    const pan = Gesture.Pan()
      .enabled(ready)
      .maxPointers(1)
      .onStart(() => {
        initialX.value = x.value;
        initialY.value = y.value;
      })
      .onUpdate((event) => {
        x.value = clampOffset(initialX.value + event.translationX, fittedWidth, viewport.width, scale.value);
        y.value = clampOffset(initialY.value + event.translationY, fittedHeight, viewport.height, scale.value);
      });

    return Gesture.Simultaneous(pinch, pan);
  }, [fittedWidth, fittedHeight, viewport.width, viewport.height, ready]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));

  const changeZoom = (delta: number) => {
    const next = clampZoom(zoomLevel + delta);
    setZoomLevel(next);
    scale.value = withTiming(next);
    x.value = withTiming(clampOffset(x.value, fittedWidth, viewport.width, next));
    y.value = withTiming(clampOffset(y.value, fittedHeight, viewport.height, next));
  };

  const retryImage = () => {
    scale.value = MIN_ZOOM;
    x.value = 0;
    y.value = 0;
    setZoomLevel(MIN_ZOOM);
    setImageSize({ width: 0, height: 0 });
    setImageError(false);
    setImageAttempt((attempt) => attempt + 1);
  };

  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <GestureHandlerRootView style={styles.container}>
        <View
          style={styles.viewport}
          testID="viewer-viewport"
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setViewport({ width, height });
          }}
        >
          {!imageError ? (
            <GestureDetector gesture={gesture}>
              <Animated.View style={[styles.imageFrame, animatedStyle]}>
                <Image
                  key={imageAttempt}
                  source={{ uri }}
                  style={styles.image}
                  contentFit="contain"
                  testID="full-screen-photo"
                  accessibilityLabel={accessibilityLabel}
                  onLoad={({ source }) => {
                    if (source.width > 0 && source.height > 0) {
                      setImageSize({ width: source.width, height: source.height });
                    } else {
                      setImageError(true);
                    }
                  }}
                  onError={() => setImageError(true)}
                />
              </Animated.View>
            </GestureDetector>
          ) : (
            <View style={styles.message}>
              <Text style={styles.messageText}>Não foi possível carregar a imagem.</Text>
              <Pressable onPress={retryImage} accessibilityRole="button" style={styles.retry}>
                <Text style={styles.retryText}>Tentar novamente</Text>
              </Pressable>
            </View>
          )}
          {!ready && !imageError && <ActivityIndicator style={styles.loading} color="white" />}
        </View>

        <Pressable
          onPress={onClose}
          style={[styles.close, { top: insets.top + 12 }]}
          accessibilityRole="button"
          accessibilityLabel="Fechar imagem"
        >
          <Ionicons name="close" size={26} color="white" />
        </Pressable>

        {ready && (
          <View style={[styles.controls, { bottom: insets.bottom + 16 }]}>
            <Pressable
              onPress={() => changeZoom(-0.5)}
              disabled={zoomLevel <= MIN_ZOOM}
              accessibilityRole="button"
              accessibilityLabel="Diminuir zoom"
              style={[styles.control, zoomLevel <= MIN_ZOOM && styles.disabled]}
            >
              <Ionicons name="remove" size={24} color="white" />
            </Pressable>
            <Text style={styles.zoomText}>{zoomLevel.toFixed(1)}×</Text>
            <Pressable
              onPress={() => changeZoom(0.5)}
              disabled={zoomLevel >= MAX_ZOOM}
              accessibilityRole="button"
              accessibilityLabel="Aumentar zoom"
              style={[styles.control, zoomLevel >= MAX_ZOOM && styles.disabled]}
            >
              <Ionicons name="add" size={24} color="white" />
            </Pressable>
          </View>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  viewport: { flex: 1, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  imageFrame: { width: '100%', height: '100%' },
  image: { width: '100%', height: '100%' },
  close: {
    position: 'absolute', right: theme.spacing.md, width: theme.touchTarget, height: theme.touchTarget, borderRadius: theme.radius.full,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  controls: {
    position: 'absolute', alignSelf: 'center', flexDirection: 'row',
    alignItems: 'center', gap: 18, borderRadius: 28, padding: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  control: {
    width: theme.touchTarget, height: theme.touchTarget, borderRadius: theme.radius.full,
    alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.textSecondary,
  },
  disabled: { opacity: 0.4 },
  zoomText: { fontSize: 16, color: 'white', minWidth: 40, textAlign: 'center' },
  message: { alignItems: 'center', gap: 16, paddingHorizontal: 24 },
  messageText: { color: theme.colors.textLight, fontSize: theme.fonts.sizes.md, textAlign: 'center' },
  retry: { minHeight: theme.touchTarget, justifyContent: 'center', backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
  retryText: { color: theme.colors.textLight, fontSize: theme.fonts.sizes.md, fontWeight: '600' },
  loading: { position: 'absolute' },
});
