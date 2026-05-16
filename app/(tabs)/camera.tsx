import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

const features = [
  'Identificação automática de espécies',
  'Histórico de avistamentos',
  'Estatísticas de visitação',
  'Vídeos e imagens registrados',
  'Relatórios em tempo real',
];

function InfoCard({ emoji, title, subtitle, description, bg = 'white', dark = false }: {
  emoji: string; title: string; subtitle: string;
  description: string; bg?: string; dark?: boolean;
}) {
  return (
    <View style={[styles.card, { backgroundColor: bg }]}>
      <View style={styles.cardTitleRow}>
        <Text style={styles.cardEmoji}>{emoji}</Text>
        <Text style={[styles.cardTitle, { color: dark ? 'white' : '#000' }]}>{title}</Text>
      </View>
      <Text style={[styles.cardSubtitle, { color: dark ? 'rgba(255,255,255,0.75)' : '#2563eb' }]}>
        {subtitle}
      </Text>
      <Text style={[styles.cardDesc, { color: dark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.75)' }]}>
        {description}
      </Text>
    </View>
  );
}

export default function CameraScreen() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* Hero Image */}
      <View style={styles.heroContainer}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800' }}
          style={styles.heroImage}
          contentFit="cover"
        />
        <View style={styles.heroOverlay} />
      </View>

      {/* Hero Text */}
      <View style={styles.heroText}>
        <Text style={styles.heroTitle}>Sobre o Projeto</Text>
        <Text style={styles.heroBlue}>Conectando natureza e tecnologia</Text>
        <Text style={styles.heroDesc}>
          O sistema utiliza Inteligência Artificial e Visão Computacional para identificar automaticamente espécies de aves em comedouros monitorados, promovendo observação ambiental de forma inteligente e acessível.
        </Text>
      </View>

      <View style={styles.content}>

        <InfoCard
          emoji="🤖"
          title="A Tecnologia"
          subtitle="Visão Computacional aplicada às aves"
          description="A câmera captura imagens automaticamente quando detecta movimento. As imagens são processadas por modelos de IA capazes de reconhecer espécies e registrar informações como horário, frequência e quantidade de visitas."
        />

        <InfoCard
          emoji="🌎"
          title="Nossa Missão"
          subtitle="Tecnologia para preservação ambiental"
          description="Nosso objetivo é aproximar as pessoas da biodiversidade local através da tecnologia, incentivando a observação de aves e a conscientização ambiental de forma acessível e educativa."
          bg="#2563eb"
          dark
        />

        <InfoCard
          emoji="👨‍💻"
          title="A Equipe"
          subtitle="Pesquisa, tecnologia e inovação"
          description="O projeto reúne tecnologia, Inteligência Artificial e monitoramento ambiental para desenvolver soluções voltadas à observação e preservação da avifauna brasileira."
        />

        {/* Funcionalidades */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardEmoji}>📊</Text>
            <Text style={styles.cardTitle}>Funcionalidades</Text>
          </View>
          <Text style={styles.cardSubtitle}>Monitoramento inteligente</Text>
          <View style={styles.featureList}>
            {features.map((item, i) => (
              <View key={i} style={styles.featureRow}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#2563eb" />
                <Text style={styles.featureText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <InfoCard
          emoji="📱"
          title="Aplicativo Mobile"
          subtitle="Informações em tempo real"
          description="O aplicativo permite acompanhar transmissões, acessar registros das aves identificadas e visualizar estatísticas sobre a biodiversidade monitorada."
        />

        <InfoCard
          emoji="🐦"
          title="Espécies Monitoradas"
          subtitle="Avifauna paulista"
          description="O sistema foi projetado para reconhecer espécies comuns do Estado de São Paulo, como Bem-te-vi, Sabiá-laranjeira, Sanhaço-cinzento, Tico-tico e outras aves urbanas."
          bg="#1e293b"
          dark
        />

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },

  heroContainer: { height: 240, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(243,244,246,0.75)',
  },

  heroText: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    marginTop: -60,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 6,
  },
  heroBlue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 12,
  },
  heroDesc: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.75)',
    lineHeight: 22,
  },

  content: { padding: 16, gap: 14 },

  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  cardEmoji: { fontSize: 22 },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 10,
  },
  cardDesc: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.75)',
    lineHeight: 22,
  },

  featureList: { gap: 12, marginTop: 4 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.75)',
    fontWeight: '500',
  },
});