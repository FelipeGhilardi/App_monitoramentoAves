import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { formatSightingDate, getSightingImageUrls, getSightingTitle, SightingResponse } from '../services/sightings';

export default function SightingCard({ sighting, onPress }: { sighting: SightingResponse; onPress: () => void }) {
  const photos = getSightingImageUrls(sighting);
  const thumbnail = photos[0] || sighting.species.find((species) => species.imageUrl)?.imageUrl;
  const title = getSightingTitle(sighting);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Ver avistamento: ${title}${photos.length > 1 ? `, ${photos.length} fotos` : ''}`} style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}>
      <View style={styles.thumbnail}>
        {thumbnail ? <Image source={{ uri: thumbnail }} style={StyleSheet.absoluteFillObject} contentFit="cover" testID="sighting-cover" /> : (
          <Ionicons name="image-outline" size={30} color={theme.colors.textSecondary} />
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <Text style={styles.date}>{formatSightingDate(sighting)}</Text>
        {photos.length > 1 && <Text style={styles.photoCount}>{photos.length} fotos</Text>}
        <Text style={styles.link}>Ver avistamento</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  thumbnail: { width: 96, height: 96, borderRadius: theme.radius.md, overflow: 'hidden', backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: theme.spacing.xs },
  title: { color: theme.colors.textPrimary, fontSize: theme.fonts.sizes.md, fontWeight: '700', lineHeight: 23 },
  date: { color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.sm, lineHeight: 21 },
  photoCount: { color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.sm },
  link: { color: theme.colors.primary, fontSize: theme.fonts.sizes.sm, fontWeight: '600', marginTop: theme.spacing.xs },
});
