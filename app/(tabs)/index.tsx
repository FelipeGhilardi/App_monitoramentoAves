import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Modal, TextInput, SafeAreaView, StatusBar, Alert
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getCurrentUser, logout, updateProfile, UserResponse } from '../../services/auth';
import AppAlert, { AppAlertVariant } from '../../components/AppAlert';

interface Video {
  id: number;
  title: string;
  thumbnail: string;
  duration: string;
  views: number;
  date: string;
  isLive: boolean;
}

const INITIAL_VIDEOS: Video[] = [
  {
    id: 1,
    title: 'Beija-flor-de-topete se alimentando',
    thumbnail: 'https://images.unsplash.com/photo-1555203012-f7b9d01f6662?w=400',
    duration: '12:30',
    views: 245,
    date: 'Há 2 horas',
    isLive: false,
  },
  {
    id: 2,
    title: 'AO VIVO - Comedouro Principal',
    thumbnail: 'https://images.unsplash.com/photo-1703142823953-bc43e35742ec?w=400',
    duration: '',
    views: 1834,
    date: 'Ao vivo agora',
    isLive: true,
  },
  {
    id: 3,
    title: 'Gralha-azul coletando sementes',
    thumbnail: 'https://images.unsplash.com/photo-1680484390723-f40bb320c460?w=400',
    duration: '18:45',
    views: 512,
    date: 'Há 5 horas',
    isLive: false,
  },
  {
    id: 4,
    title: 'Tucano visitando o comedouro',
    thumbnail: 'https://images.unsplash.com/photo-1581084353720-d30b23c6b593?w=400',
    duration: '15:20',
    views: 1256,
    date: '2 dias atrás',
    isLive: false,
  },
];

function NotificationsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={modal.container}>
        <View style={modal.header}>
          <TouchableOpacity onPress={onClose} style={modal.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={modal.title}>Notificações</Text>
        </View>
        <View style={modal.content}>
          <View style={[modal.notifCard, { borderLeftWidth: 4, borderLeftColor: '#3b82f6' }]}>
            <Text style={modal.notifTitle}>Novo visitante!</Text>
            <Text style={modal.notifBody}>Um Cardeal-vermelho foi visto no seu comedouro há 5 minutos.</Text>
          </View>
          <View style={[modal.notifCard, { borderWidth: 1, borderColor: '#e5e7eb' }]}>
            <Text style={modal.notifTitle}>Bateria baixa</Text>
            <Text style={modal.notifBody}>A câmera do comedouro principal está com 15% de bateria.</Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function ProfileModal({
  visible,
  onClose,
  onEdit,
  onLogout,
  user,
}: {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onLogout: () => void;
  user: UserResponse | null;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={modal.container}>
        <View style={modal.header}>
          <TouchableOpacity onPress={onClose} style={modal.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={modal.title}>Perfil</Text>
        </View>
        <View style={modal.content}>
          <View style={modal.profileCenter}>
            <Text style={modal.profileName}>{user?.name ?? 'Usuário'}</Text>
            <Text style={modal.profileEmail}>{user?.email ?? ''}</Text>
          </View>
          <TouchableOpacity style={modal.profileBtn} onPress={onEdit}>
            <Text style={modal.profileBtnText}>Editar Perfil</Text>
          </TouchableOpacity>
          <TouchableOpacity style={modal.profileBtnDanger} onPress={onLogout}>
            <Text style={modal.profileBtnDangerText}>Sair da Conta</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function EditProfileModal({
  visible,
  onClose,
  user,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  user: UserResponse | null;
  onSaved: (updated: UserResponse) => void;
}) {
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{
    visible: boolean;
    variant: AppAlertVariant;
    title: string;
    message?: string;
    onCloseAction?: () => void;
  }>({ visible: false, variant: 'error', title: '' });

  useEffect(() => {
    if (visible) {
      setName(user?.name ?? '');
      setEmail(user?.email ?? '');
    }
  }, [visible, user]);

  const showAlert = (
    variant: AppAlertVariant,
    title: string,
    message?: string,
    onCloseAction?: () => void
  ) => setAlert({ visible: true, variant, title, message, onCloseAction });

  const closeAlert = () => {
    const action = alert.onCloseAction;
    setAlert((prev) => ({ ...prev, visible: false, onCloseAction: undefined }));
    action?.();
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail) {
      showAlert('error', 'Atenção', 'Preencha nome e e-mail.');
      return;
    }

    setSaving(true);
    const result = await updateProfile(trimmedName, trimmedEmail);
    setSaving(false);

    if (result.success && result.user) {
      onSaved(result.user);
      showAlert('success', 'Perfil atualizado', 'Suas informações foram salvas.', onClose);
    } else {
      showAlert('error', 'Não foi possível salvar', result.message ?? 'Tente novamente.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={modal.container}>
        <View style={modal.header}>
          <TouchableOpacity onPress={onClose} style={modal.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={modal.title}>Editar Perfil</Text>
        </View>
        <View style={modal.content}>
          <Text style={modal.inputLabel}>Nome</Text>
          <TextInput
            style={modal.input}
            value={name}
            onChangeText={setName}
            placeholder="Seu nome"
            placeholderTextColor="rgba(0,0,0,0.4)"
          />
          <Text style={modal.inputLabel}>E-mail</Text>
          <TextInput
            style={modal.input}
            value={email}
            onChangeText={setEmail}
            placeholder="seu@email.com"
            placeholderTextColor="rgba(0,0,0,0.4)"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[modal.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={modal.saveBtnText}>
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Text>
          </TouchableOpacity>
        </View>

        <AppAlert
          visible={alert.visible}
          variant={alert.variant}
          title={alert.title}
          message={alert.message}
          onClose={closeAlert}
        />
      </SafeAreaView>
    </Modal>
  );
}

function UploadModal({ visible, onClose, onAdd }: {
  visible: boolean; onClose: () => void; onAdd: (title: string) => void;
}) {
  const [title, setTitle] = useState('');
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.uploadCard}>
          <View style={modal.uploadHeader}>
            <Text style={modal.title}>Adicionar Avistamento</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="rgba(0,0,0,0.5)" />
            </TouchableOpacity>
          </View>
          <View style={modal.uploadArea}>
            <Ionicons name="cloud-upload-outline" size={32} color="rgba(0,0,0,0.3)" />
            <Text style={modal.uploadAreaText}>Selecionar vídeo...</Text>
          </View>
          <Text style={modal.inputLabel}>Título do Vídeo</Text>
          <TextInput
            style={modal.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Ex: Pica-pau no bebedouro..."
            placeholderTextColor="rgba(0,0,0,0.4)"
          />
          <TouchableOpacity
            style={[modal.saveBtn, !title.trim() && { opacity: 0.5 }]}
            onPress={() => { if (title.trim()) { onAdd(title); setTitle(''); onClose(); } }}
            disabled={!title.trim()}
          >
            <Text style={modal.saveBtnText}>Fazer Upload</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function LiveModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={liveStyle.container}>
        <StatusBar barStyle="light-content" />
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1703142823953-bc43e35742ec?w=800' }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
        />
        <View style={liveStyle.header}>
          <View style={liveStyle.liveBadge}>
            <View style={liveStyle.liveDot} />
            <Text style={liveStyle.liveText}>AO VIVO</Text>
          </View>
          <Text style={liveStyle.feederName}>Comedouro Principal</Text>
          <TouchableOpacity onPress={onClose} style={liveStyle.closeBtn}>
            <Ionicons name="close" size={22} color="white" />
          </TouchableOpacity>
        </View>
        <View style={liveStyle.crosshair}>
          <View style={[liveStyle.corner, { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 }]} />
          <View style={[liveStyle.corner, { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 }]} />
          <View style={[liveStyle.corner, { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 }]} />
          <View style={[liveStyle.corner, { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 }]} />
        </View>
        <View style={liveStyle.controls}>
          <TouchableOpacity style={liveStyle.controlBtn}>
            <Ionicons name="mic-outline" size={22} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={liveStyle.captureBtn}>
            <Ionicons name="camera" size={28} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={liveStyle.endBtn} onPress={onClose}>
            <Ionicons name="call" size={22} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function VideoCard({ video }: { video: Video }) {
  return (
    <View style={styles.videoCard}>
      <View style={styles.videoThumb}>
        <Image source={{ uri: video.thumbnail }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        <View style={styles.playOverlay}>
          <View style={styles.playBtn}>
            <Ionicons name="play" size={14} color="#000" />
          </View>
        </View>
        {video.isLive ? (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        ) : (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{video.duration}</Text>
          </View>
        )}
      </View>
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle} numberOfLines={2}>{video.title}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="eye-outline" size={13} color="rgba(0,0,0,0.5)" />
          <Text style={styles.metaText}>{video.views} views</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={13} color="rgba(0,0,0,0.5)" />
          <Text style={styles.metaText}>{video.date}</Text>
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showLive, setShowLive] = useState(false);
  const [videos, setVideos] = useState<Video[]>(INITIAL_VIDEOS);
  const [user, setUser] = useState<UserResponse | null>(null);

  const loadUser = useCallback(async () => {
    const current = await getCurrentUser();
    setUser(current);
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const openProfile = async () => {
    await loadUser();
    setShowProfile(true);
  };

  const handleLogout = async () => {
    await logout();
    setShowProfile(false);
    setUser(null);
    router.replace('/login');
  };

  const addVideo = (title: string) => {
    setVideos(prev => [{
      id: Date.now(), title,
      thumbnail: 'https://images.unsplash.com/photo-1581084353720-d30b23c6b593?w=400',
      duration: '00:45', views: 0, date: 'Agora mesmo', isLive: false,
    }, ...prev]);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setShowNotif(true)}>
              <Ionicons name="notifications-outline" size={24} color="#000" />
              <View style={styles.notifDot}>
                <Text style={styles.notifDotText}>1</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={openProfile}>
              <Ionicons name="person-outline" size={24} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity>
              <Ionicons name="settings-outline" size={24} color="#000" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Image
            source={require('../../assets/menuImage.jpg')}
            style={styles.heroImage}
            contentFit="cover"
          />
          <Text style={styles.heroTitle}>Monitoramento{'\n'}Inteligente</Text>
          <Text style={styles.heroSubtitle}>
            Acompanhe os pássaros do seu comedouro a qualquer momento.
          </Text>

          {/* Live Button */}
          <TouchableOpacity style={styles.liveBtn} onPress={() => Alert.alert('Indisponível', 'A transmissão em tempo real está indisponível no momento.')} activeOpacity={0.85}>
            <View style={styles.liveBtnIcon}>
              <Ionicons name="videocam" size={26} color="white" />
            </View>
            <View style={styles.liveBtnTexts}>
              <Text style={styles.liveBtnTitle}>Gravação em Tempo Real</Text>
              <Text style={styles.liveBtnSub}>Acessar câmera ao vivo</Text>
            </View>
            <View style={styles.liveBtnPlay}>
              <Ionicons name="play" size={18} color="#000" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Últimos avistamentos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Últimos avistamentos</Text>
              <Text style={styles.sectionSub}>Destaques da BB TV</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.seeAll}>Ver tudo</Text>
            </TouchableOpacity>
          </View>
          {videos.slice(0, 4).map(video => (
            <VideoCard key={video.id} video={video} />
          ))}
        </View>
      </ScrollView>

      <NotificationsModal visible={showNotif} onClose={() => setShowNotif(false)} />
      <ProfileModal
        visible={showProfile}
        onClose={() => setShowProfile(false)}
        onEdit={() => { setShowProfile(false); setShowEditProfile(true); }}
        onLogout={handleLogout}
        user={user}
      />
      <EditProfileModal
        visible={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        user={user}
        onSaved={(updated) => setUser(updated)}
      />
      <UploadModal visible={showUpload} onClose={() => setShowUpload(false)} onAdd={addVideo} />
      <LiveModal visible={showLive} onClose={() => setShowLive(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },

  header: {
    flexDirection: 'row', justifyContent: 'flex-end',
    alignItems: 'center', paddingTop: 56,
    paddingHorizontal: 20, paddingBottom: 12,
  },
  viewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#000',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
  },
  viewBtnText: { fontSize: 13, fontWeight: '600', color: '#000' },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconBtn: { position: 'relative' },
  notifDot: {
    position: 'absolute', top: -4, right: -4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center',
  },
  notifDotText: { color: 'white', fontSize: 9, fontWeight: 'bold' },

  hero: { paddingHorizontal: 20, alignItems: 'center', paddingBottom: 24 },
  heroImage: { width: 96, height: 96, borderRadius: 20, marginBottom: 16, borderWidth: 2, borderColor: 'white' },
  heroTitle: { fontSize: 34, fontWeight: 'bold', color: '#000', textAlign: 'center', lineHeight: 40, marginBottom: 10 },
  heroSubtitle: { fontSize: 14, color: 'rgba(0,0,0,0.6)', textAlign: 'center', lineHeight: 20, marginBottom: 24 },

  liveBtn: {
    width: '100%', backgroundColor: '#dbeafe',
    borderRadius: 20, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  liveBtnIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center',
  },
  liveBtnTexts: { flex: 1 },
  liveBtnTitle: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  liveBtnSub: { fontSize: 12, color: 'rgba(0,0,0,0.6)', marginTop: 2 },
  liveBtnPlay: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },

  divider: { height: 4, backgroundColor: '#e5e7eb', marginVertical: 20 },

  section: { paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  sectionTitle: { fontSize: 19, fontWeight: 'bold', color: '#000' },
  sectionSub: { fontSize: 13, color: 'rgba(0,0,0,0.5)', marginTop: 2 },
  seeAll: { fontSize: 13, fontWeight: 'bold', color: '#000' },

  videoCard: {
    backgroundColor: 'white', borderRadius: 16,
    flexDirection: 'row', marginBottom: 12,
    overflow: 'hidden', padding: 10, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  videoThumb: { width: 120, height: 80, borderRadius: 10, overflow: 'hidden', backgroundColor: '#f3f4f6' },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  playBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
  },
  liveBadge: {
    position: 'absolute', top: 4, left: 4,
    backgroundColor: '#dc2626', flexDirection: 'row',
    alignItems: 'center', gap: 3,
    paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4,
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'white' },
  liveText: { color: 'white', fontSize: 9, fontWeight: 'bold' },
  durationBadge: {
    position: 'absolute', bottom: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4,
  },
  durationText: { color: 'white', fontSize: 9, fontWeight: '600' },
  videoInfo: { flex: 1, justifyContent: 'center', gap: 4 },
  videoTitle: { fontSize: 13, fontWeight: 'bold', color: '#000' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: 'rgba(0,0,0,0.5)' },

  fab: {
    position: 'absolute', bottom: 90, right: 20,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#2563eb',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
});

const modal = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 19, fontWeight: 'bold', color: '#000' },
  content: { padding: 16, gap: 12 },
  notifCard: { backgroundColor: '#f3f4f6', borderRadius: 12, padding: 14 },
  notifTitle: { fontWeight: 'bold', fontSize: 13, color: '#000', marginBottom: 4 },
  notifBody: { fontSize: 12, color: 'rgba(0,0,0,0.6)', lineHeight: 18 },
  profileCenter: { alignItems: 'center', paddingVertical: 24 },
  profileName: { fontSize: 24, fontWeight: 'bold', color: '#000' },
  profileEmail: { fontSize: 14, color: 'rgba(0,0,0,0.6)', marginTop: 6 },
  profileBtn: { backgroundColor: '#f3f4f6', borderRadius: 12, padding: 16, alignItems: 'center' },
  profileBtnText: { fontSize: 15, fontWeight: 'bold', color: '#000' },
  profileBtnDanger: { backgroundColor: '#fef2f2', borderRadius: 12, padding: 16, alignItems: 'center' },
  profileBtnDangerText: { fontSize: 15, fontWeight: 'bold', color: '#dc2626' },
  inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#000', marginBottom: 6 },
  input: { backgroundColor: '#f3f4f6', borderRadius: 12, padding: 14, fontSize: 15, color: '#000', marginBottom: 14 },
  saveBtn: { backgroundColor: '#3b82f6', borderRadius: 12, padding: 16, alignItems: 'center' },
  saveBtnText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  uploadCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, width: '100%', gap: 12 },
  uploadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  uploadArea: {
    height: 120, backgroundColor: '#f3f4f6', borderRadius: 12,
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#e5e7eb',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  uploadAreaText: { fontSize: 13, color: 'rgba(0,0,0,0.4)' },
});

const liveStyle = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 10, gap: 10,
  },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#dc2626', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'white' },
  liveText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  feederName: { flex: 1, color: 'white', fontSize: 13, fontWeight: '500' },
  closeBtn: { backgroundColor: 'rgba(0,0,0,0.4)', padding: 8, borderRadius: 20 },
  crosshair: {
    position: 'absolute', top: '50%', left: '50%',
    width: 160, height: 160, marginTop: -80, marginLeft: -80,
  },
  corner: {
    position: 'absolute', width: 16, height: 16,
    borderColor: 'rgba(255,255,255,0.6)', borderWidth: 2,
  },
  controls: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#111', paddingVertical: 24, paddingBottom: 40,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 32,
  },
  controlBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  captureBtn: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: 'white',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)',
  },
  endBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(239,68,68,0.2)', alignItems: 'center', justifyContent: 'center',
  },
});