import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, TextInput
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BirdDetection {
  id: string;
  species: string;
  scientificName: string;
  timestamp: Date;
  duration: number;
  thumbnail: string;
  confidence: number;
  description: string;
}

const MOCK_DETECTIONS: BirdDetection[] = [
  {
    id: '1',
    species: 'Beija-flor-de-topete',
    scientificName: 'Stephanoxis lalandi',
    timestamp: new Date('2026-03-21T08:15:00'),
    duration: 12,
    thumbnail: 'https://images.unsplash.com/photo-1555203012-f7b9d01f6662?w=800',
    confidence: 98.5,
    description: 'Pequeno beija-flor com plumagem verde-brilhante e topete característico. Muito comum em jardins e áreas urbanas.',
  },
  {
    id: '2',
    species: 'Cardeal',
    scientificName: 'Paroaria coronata',
    timestamp: new Date('2026-03-21T07:45:00'),
    duration: 25,
    thumbnail: 'https://images.unsplash.com/photo-1694987807364-b5f849310906?w=800',
    confidence: 95.2,
    description: 'Ave de porte médio com topete vermelho característico. Conhecida por seu canto melodioso e comportamento territorial.',
  },
  {
    id: '3',
    species: 'Gralha-azul',
    scientificName: 'Cyanocorax caeruleus',
    timestamp: new Date('2026-03-20T16:30:00'),
    duration: 18,
    thumbnail: 'https://images.unsplash.com/photo-1680484390723-f40bb320c460?w=800',
    confidence: 99.1,
    description: 'Ave símbolo do Paraná, com plumagem azul vibrante e comportamento social. Importante dispersora de sementes de araucária.',
  },
  {
    id: '4',
    species: 'Pardal',
    scientificName: 'Passer domesticus',
    timestamp: new Date('2026-03-20T14:20:00'),
    duration: 8,
    thumbnail: 'https://images.unsplash.com/photo-1544378315-47efdfd4064b?w=800',
    confidence: 92.7,
    description: 'Ave pequena e comum em áreas urbanas. Espécie introduzida que se adaptou muito bem a ambientes modificados pelo homem.',
  },
  {
    id: '5',
    species: 'Pica-pau-de-banda-branca',
    scientificName: 'Dryocopus lineatus',
    timestamp: new Date('2026-03-19T09:10:00'),
    duration: 15,
    thumbnail: 'https://images.unsplash.com/photo-1754262870648-355b3b80dad1?w=800',
    confidence: 96.8,
    description: 'Grande pica-pau com plumagem preta e branca. Conhecido pelo som característico ao bicar árvores em busca de insetos.',
  },
  {
    id: '6',
    species: 'Sabiá-laranjeira',
    scientificName: 'Turdus rufiventris',
    timestamp: new Date('2026-03-19T06:00:00'),
    duration: 22,
    thumbnail: 'https://images.unsplash.com/photo-1681653105766-3c8750a9d026?w=800',
    confidence: 97.3,
    description: 'Ave símbolo do Brasil, famosa por seu canto melodioso. Possui plumagem marrom nas costas e laranja no peito.',
  },
];

function BirdCard({ bird }: { bird: BirdDetection }) {
  const date = format(bird.timestamp, "d 'de' MMM, HH:mm", { locale: ptBR });

  return (
    <View style={styles.card}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: bird.thumbnail }}
          style={styles.image}
          contentFit="cover"
        />
        <View style={styles.confidenceBadge}>
          <Text style={styles.confidenceText}>{bird.confidence}% precisão</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.species}>{bird.species}</Text>
        <Text style={styles.scientificName}>{bird.scientificName}</Text>

        <View style={styles.descriptionBox}>
          <Ionicons name="information-circle-outline" size={16} color="#3b82f6" style={{ marginTop: 1 }} />
          <Text style={styles.descriptionText}>{bird.description}</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerItem}>
            <Ionicons name="calendar-outline" size={13} color="rgba(0,0,0,0.5)" />
            <Text style={styles.footerText}>{date}</Text>
          </View>
          <View style={styles.footerItem}>
            <Ionicons name="time-outline" size={13} color="rgba(0,0,0,0.5)" />
            <Text style={styles.footerText}>{bird.duration} min</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

type FilterType = 'all' | 'favorites' | 'recent';

export default function CollectionScreen() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  const filtered = MOCK_DETECTIONS.filter(b =>
    b.species.toLowerCase().includes(search.toLowerCase())
  );

  const getFiltered = () => {
    switch (filter) {
      case 'favorites': return filtered.slice(0, 3);
      case 'recent': return filtered.slice(0, 4);
      default: return filtered;
    }
  };

  const tabs: { key: FilterType; label: string }[] = [
    { key: 'all', label: `Todas (${MOCK_DETECTIONS.length})` },
    { key: 'favorites', label: 'Favoritas (3)' },
    { key: 'recent', label: 'Recentes (4)' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Minha Coleção</Text>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.7)" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar espécie..."
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity style={styles.filterIconBtn}>
            <Ionicons name="options-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, filter === tab.key && styles.tabActive]}
            onPress={() => setFilter(tab.key)}
          >
            <Text style={[styles.tabText, filter === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={getFiltered()}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <BirdCard bird={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },

  header: {
    backgroundColor: '#2563eb',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 16,
    gap: 14,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: 'white',
  },
  filterIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tabActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  tabText: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.6)',
    fontWeight: '500',
  },
  tabTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },

  list: {
    padding: 16,
    gap: 20,
    paddingBottom: 40,
  },

  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 220,
  },
  confidenceBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  confidenceText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },

  cardBody: {
    padding: 16,
    gap: 6,
  },
  species: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  scientificName: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.5)',
    fontStyle: 'italic',
    marginBottom: 4,
  },

  descriptionBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#f0f7ff',
    borderRadius: 10,
    padding: 12,
    marginVertical: 4,
  },
  descriptionText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(0,0,0,0.7)',
    lineHeight: 19,
  },

  footer: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 4,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.5)',
  },
});