import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import ScreenHeader from '../../components/ScreenHeader';

const features = [
  'Identificação automática de espécies',
  'Histórico de avistamentos',
  'Estatísticas de visitação',
  'Imagens dos avistamentos registrados',
];

function InfoCard({ icon, title, subtitle, description }: {
  icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; description: string;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTitleRow}>
        <View style={styles.icon}><Ionicons name={icon} size={24} color={theme.colors.primary} /></View>
        <Text accessibilityRole="header" style={styles.cardTitle}>{title}</Text>
      </View>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
    </View>
  );
}

export default function AboutScreen() {
  return (
    <View style={styles.container}>
      <ScreenHeader title="Sobre o Projeto" subtitle="Conheça o AvistAI" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Image source={require('../../assets/loginImage.jpg')} style={styles.heroImage} contentFit="cover" />
        <View style={styles.introduction}>
          <Text style={styles.heroTitle}>Conectando natureza e tecnologia</Text>
          <Text style={styles.cardDescription}>
            O sistema utiliza Inteligência Artificial e Visão Computacional para identificar automaticamente espécies de aves em comedouros monitorados, promovendo observação ambiental de forma inteligente e acessível.
          </Text>
        </View>
        <InfoCard
          icon="hardware-chip-outline" title="A tecnologia" subtitle="Visão Computacional aplicada às aves"
          description="A câmera captura imagens automaticamente quando detecta movimento. As imagens são processadas por modelos de IA capazes de reconhecer espécies e registrar informações como horário, frequência e quantidade de visitas."
        />
        <InfoCard
          icon="earth-outline" title="Nossa missão" subtitle="Tecnologia para preservação ambiental"
          description="Nosso objetivo é aproximar as pessoas da biodiversidade local através da tecnologia, incentivando a observação de aves e a conscientização ambiental de forma acessível e educativa."
        />
        <InfoCard
          icon="people-outline" title="A equipe" subtitle="Pesquisa, tecnologia e inovação"
          description="O projeto reúne tecnologia, Inteligência Artificial e monitoramento ambiental para desenvolver soluções voltadas à observação e preservação da avifauna brasileira."
        />
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.cardTitle}>O que você pode acompanhar</Text>
          {features.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <Ionicons name="checkmark-circle-outline" size={22} color={theme.colors.primary} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
        <InfoCard
          icon="phone-portrait-outline" title="Aplicativo mobile" subtitle="Seus registros em um só lugar"
          description="O aplicativo permite consultar imagens dos avistamentos, acessar registros das aves identificadas e visualizar estatísticas sobre a biodiversidade monitorada."
        />
        <InfoCard
          icon="leaf-outline" title="Espécies monitoradas" subtitle="Avifauna paulista"
          description="O sistema foi projetado para reconhecer espécies comuns do Estado de São Paulo, como Bem-te-vi, Sabiá-laranjeira, Sanhaço-cinzento, Tico-tico e outras aves urbanas."
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, paddingBottom: theme.spacing.lg, gap: theme.spacing.md },
  heroImage: { width: '100%', aspectRatio: 16 / 9, borderRadius: theme.radius.lg },
  introduction: { paddingVertical: theme.spacing.sm, gap: theme.spacing.sm },
  heroTitle: { color: theme.colors.textPrimary, fontSize: theme.fonts.sizes.xl, fontWeight: '700' },
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.md, gap: theme.spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  icon: { width: 44, height: 44, borderRadius: theme.radius.md, backgroundColor: theme.colors.infoSurface, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { flex: 1, fontSize: theme.fonts.sizes.lg, fontWeight: '700', color: theme.colors.textPrimary },
  cardSubtitle: { fontSize: theme.fonts.sizes.sm, color: theme.colors.primary, fontWeight: '600' },
  cardDescription: { fontSize: theme.fonts.sizes.md, color: theme.colors.textSecondary, lineHeight: 24 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  featureText: { flex: 1, fontSize: theme.fonts.sizes.md, color: theme.colors.textSecondary, lineHeight: 24 },
});
