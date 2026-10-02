import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { getCurrentUser, logout, UserResponse } from '../../services/auth';
import { fetchSightings, SightingResponse } from '../../services/sightings';
import { theme } from '../../constants/theme';
import { EditProfileModal, ProfileModal } from '../../components/AccountModals';
import AppAlert from '../../components/AppAlert';
import IconButton from '../../components/IconButton';
import ScreenHeader from '../../components/ScreenHeader';
import ScreenState from '../../components/ScreenState';
import SettingsModal from '../../components/SettingsModal';
import SightingCard from '../../components/SightingCard';

function NotificationsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView edges={['bottom']} style={styles.container}>
        <ScreenHeader title="Notificações" onBack={onClose} />
        <ScrollView contentContainerStyle={styles.section}>
          <View style={styles.notification}>
            <Text style={styles.cardTitle}>Novo visitante!</Text>
            <Text style={styles.bodyText}>Um Cardeal-vermelho foi visto no seu comedouro há 5 minutos.</Text>
          </View>
          <View style={styles.notification}>
            <Text style={styles.cardTitle}>Bateria baixa</Text>
            <Text style={styles.bodyText}>A câmera do comedouro principal está com 15% de bateria.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function AllSightingsModal({ visible, onClose, sightings, onSelect }: {
  visible: boolean; onClose: () => void; sightings: SightingResponse[]; onSelect: (id: string) => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView edges={['bottom']} style={styles.container}>
        <ScreenHeader title="Todos os avistamentos" onBack={onClose} />
        <FlatList
          data={sightings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.section}
          renderItem={({ item }) => <SightingCard sighting={item} onPress={() => onSelect(item.id)} />}
          ListEmptyComponent={<ScreenState title="Nenhum avistamento ainda" message="Quando houver registros, eles aparecerão aqui." />}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </Modal>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAllSightings, setShowAllSightings] = useState(false);
  const [sightings, setSightings] = useState<SightingResponse[]>([]);
  const [loadingSightings, setLoadingSightings] = useState(true);
  const [sightingsError, setSightingsError] = useState<string | null>(null);
  const [user, setUser] = useState<UserResponse | null>(null);
  const [accountError, setAccountError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  const loadUser = useCallback(async () => {
    try {
      const current = await getCurrentUser();
      setUser(current);
      return true;
    } catch {
      setAccountError('Não foi possível carregar seus dados. Tente novamente.');
      return false;
    }
  }, []);

  const loadSightings = useCallback(async () => {
    setLoadingSightings(true);
    const result = await fetchSightings();
    if (result.success && result.data) {
      setSightings(result.data);
      setSightingsError(null);
    } else {
      setSightings([]);
      setSightingsError(result.message ?? 'Erro ao carregar avistamentos.');
    }
    setLoadingSightings(false);
  }, []);

  useEffect(() => {
    void loadUser();
    void loadSightings();
  }, [loadUser, loadSightings]);

  const openProfile = async () => {
    if (await loadUser()) setShowProfile(true);
  };

  const openSettings = async () => {
    if (await loadUser()) setShowSettings(true);
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      setAccountError('Não foi possível sair da conta. Tente novamente.');
      return;
    } finally {
      setLoggingOut(false);
    }
    setShowProfile(false);
    setShowSettings(false);
    setUser(null);
    router.replace('/login');
  };

  const openSighting = (id: string) => {
    setShowAllSightings(false);
    router.push({ pathname: '/sightings/[id]', params: { id } });
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <ScreenHeader
          title="AvistAI"
          actions={<>
            <View>
              <IconButton icon="notifications-outline" label="Notificações" onPress={() => setShowNotif(true)} />
              <View pointerEvents="none" style={styles.notifDot}><Text style={styles.notifDotText}>1</Text></View>
            </View>
            <IconButton icon="person-outline" label="Abrir perfil" onPress={openProfile} />
            <IconButton icon="settings-outline" label="Abrir configurações" onPress={openSettings} />
          </>}
        />
        <View style={styles.welcome}>
          <Image source={require('../../assets/menuImage.jpg')} style={styles.welcomeImage} contentFit="cover" />
          <View style={styles.welcomeText}>
            <Text style={styles.welcomeTitle}>Natureza mais perto</Text>
            <Text style={styles.bodyText}>Acompanhe os pássaros do seu comedouro.</Text>
          </View>
        </View>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Últimos avistamentos</Text>
            {sightings.length > 0 && (
              <Pressable accessibilityRole="button" style={styles.seeAllButton} onPress={() => setShowAllSightings(true)}>
                <Text style={styles.seeAll}>Ver tudo</Text>
              </Pressable>
            )}
          </View>
          {loadingSightings ? <ScreenState loading title="Carregando avistamentos..." /> : sightingsError ? (
            <ScreenState title="Não foi possível carregar" message={sightingsError} icon="cloud-offline-outline" actionLabel="Tentar novamente" onAction={loadSightings} />
          ) : sightings.length === 0 ? (
            <ScreenState title="Nenhum avistamento ainda" message="Assim que novos avistamentos forem registrados, eles aparecerão aqui." />
          ) : sightings.slice(0, 5).map((sighting) => (
            <SightingCard key={sighting.id} sighting={sighting} onPress={() => openSighting(sighting.id)} />
          ))}
        </View>
      </ScrollView>
      <NotificationsModal visible={showNotif} onClose={() => setShowNotif(false)} />
      <ProfileModal visible={showProfile} onClose={() => setShowProfile(false)} onEdit={() => { setShowProfile(false); setShowEditProfile(true); }} onLogout={handleLogout} user={user} loggingOut={loggingOut} />
      <EditProfileModal visible={showEditProfile} onClose={() => setShowEditProfile(false)} user={user} onSaved={setUser} />
      <SettingsModal
        visible={showSettings} user={user} onClose={() => setShowSettings(false)}
        onEdit={() => { setShowSettings(false); setShowEditProfile(true); }}
        onAbout={() => { setShowSettings(false); router.navigate('/(tabs)/camera'); }}
        onLogout={handleLogout} loggingOut={loggingOut}
      />
      <AllSightingsModal visible={showAllSightings} onClose={() => setShowAllSightings(false)} sightings={sightings} onSelect={openSighting} />
      <AppAlert visible={Boolean(accountError)} title="Erro na conta" message={accountError} onClose={() => setAccountError('')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { paddingBottom: theme.spacing.lg },
  welcome: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.md, paddingTop: theme.spacing.lg },
  welcomeImage: { width: 64, height: 64, borderRadius: theme.radius.lg },
  welcomeText: { flex: 1, gap: theme.spacing.xs },
  welcomeTitle: { fontSize: theme.fonts.sizes.lg, fontWeight: '700', color: theme.colors.textPrimary },
  bodyText: { fontSize: theme.fonts.sizes.sm, lineHeight: 22, color: theme.colors.textSecondary },
  section: { padding: theme.spacing.md, gap: theme.spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  sectionTitle: { flex: 1, color: theme.colors.textPrimary, fontSize: theme.fonts.sizes.lg, fontWeight: '700' },
  seeAllButton: { minHeight: theme.touchTarget, minWidth: theme.touchTarget, justifyContent: 'center', paddingHorizontal: theme.spacing.sm },
  seeAll: { color: theme.colors.primary, fontSize: theme.fonts.sizes.sm, fontWeight: '600' },
  notification: { padding: theme.spacing.md, gap: theme.spacing.sm, backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg },
  cardTitle: { fontSize: theme.fonts.sizes.md, fontWeight: '600', color: theme.colors.textPrimary },
  notifDot: { position: 'absolute', top: 2, right: 4, minWidth: 18, minHeight: 18, paddingHorizontal: 4, backgroundColor: theme.colors.danger, borderRadius: theme.radius.full, alignItems: 'center', justifyContent: 'center' },
  notifDotText: { color: theme.colors.textLight, fontSize: 10, fontWeight: '700' },
});
