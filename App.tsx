import { useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

type Member = { _id: string; email: string; matkhau: string; hoten: string; hinhanh: string };
const configuredApiUrl = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
const API_URL = Platform.OS === 'web'
  ? (typeof window === 'undefined'
    ? 'http://localhost:3000'
    : `${window.location.protocol}//${window.location.hostname}:3000`)
  : configuredApiUrl;
const blankMember = { email: '', matkhau: '', hoten: '', hinhanh: '' };

async function api<T>(path: string, token?: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (response.status === 204) return undefined as T;
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Có lỗi xảy ra.');
  return result as T;
}

export default function App() {
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const [token, setToken] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(blankMember);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);

  async function loadMembers(authToken = token) {
    const rows = await api<Member[]>('/api/users', authToken);
    setMembers(rows);
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) =>
      member.hoten.toLowerCase().includes(query) || member.email.toLowerCase().includes(query),
    );
  }, [members, search]);

  async function signIn() {
    if (!API_URL) return setError('Thiếu EXPO_PUBLIC_API_URL trong file .env ở thư mục gốc.');
    setBusy(true);
    setError('');
    try {
      const result = await api<{ token: string; email: string }>('/api/auth/login', undefined, {
        method: 'POST', body: JSON.stringify({ email, password }),
      });
      await loadMembers(result.token);
      setAdminEmail(result.email);
      setToken(result.token);
      setPassword('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể đăng nhập.');
    } finally {
      setBusy(false);
    }
  }

  function openNewMember() {
    setEditingId('');
    setForm(blankMember);
    setError('');
    setEditor(true);
  }

  function openEdit(member: Member) {
    setEditingId(member._id);
    setForm({ email: member.email, matkhau: '', hoten: member.hoten, hinhanh: member.hinhanh });
    setError('');
    setEditor(true);
  }

  async function choosePhoto() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('Cần cho phép truy cập ảnh để chọn ảnh đại diện.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.55, base64: true,
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        if (asset.base64) {
          setForm((current) => ({
            ...current,
            hinhanh: `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`,
          }));
        }
      }
    } catch {
      setError('Không thể mở thư viện ảnh trên thiết bị này.');
    }
  }

  async function saveMember() {
    setBusy(true);
    setError('');
    try {
      const body = { ...form };
      if (editingId && !body.matkhau) body.matkhau = '';
      const saved = await api<Member>(editingId ? `/api/users/${editingId}` : '/api/users', token, {
        method: editingId ? 'PUT' : 'POST', body: JSON.stringify(body),
      });
      setMembers((current) => editingId
        ? current.map((member) => member._id === editingId ? saved : member)
        : [saved, ...current]);
      setEditor(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể lưu thành viên.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteMember() {
    if (!deleteTarget) return;
    setBusy(true);
    setError('');
    try {
      await api(`/api/users/${deleteTarget._id}`, token, { method: 'DELETE' });
      setMembers((current) => current.filter((member) => member._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể xóa thành viên.');
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    setToken('');
    setMembers([]);
    setAdminEmail('');
  }

  if (!token) {
    return (
      <ScrollView
        style={styles.loginPage}
        contentContainerStyle={styles.loginPageContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <StatusBar style="dark" />
        <View style={[styles.loginArtwork, !wide && styles.loginArtworkMobile]}>
            <View style={styles.artCircleOne} /><View style={styles.artCircleTwo} />
            <Text style={[styles.artEyebrow, !wide && styles.artEyebrowMobile]}>THE PEOPLE CLUB</Text>
            <Text style={[styles.artTitle, !wide && styles.artTitleMobile]}>{wide ? `Những kết nối\ntạo nên điều\nđặc biệt.` : `Những kết nối\ntạo nên điều đặc biệt.`}</Text>
            <Text style={styles.artCaption}>Một nơi để chăm sóc cộng đồng của bạn.</Text>
            <View style={[styles.avatarStack, !wide && styles.avatarStackMobile]}>
              {['🌿', '☀️', '🌼', '🍊'].map((face, index) => <Text key={face} style={[styles.stackAvatar, !wide && styles.stackAvatarMobile, { marginLeft: index ? -10 : 0 }]}>{face}</Text>)}
              <Text style={[styles.stackLabel, !wide && styles.stackLabelMobile]}>Cộng đồng của bạn,{ '\n' }được kết nối mỗi ngày.</Text>
            </View>
        </View>
        <View style={[styles.loginPanel, !wide && styles.loginPanelMobile]}>
          <Text style={styles.brand}>mầm<Text style={styles.brandDot}>.</Text></Text>
          <Text style={[styles.loginHeading, !wide && styles.loginHeadingMobile]}>Chào mừng trở lại</Text>
          <Text style={[styles.muted, !wide && styles.mutedMobile]}>Đăng nhập bằng tài khoản quản trị viên.</Text>
          <Text style={[styles.label, !wide && styles.labelMobile]}>Email admin</Text>
          <TextInput autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="admin@example.com" style={[styles.input, !wide && styles.inputMobile]} />
          <Text style={[styles.label, !wide && styles.labelMobile]}>Mật khẩu</Text>
          <TextInput secureTextEntry value={password} onChangeText={setPassword} onSubmitEditing={signIn} placeholder="Nhập mật khẩu" style={[styles.input, !wide && styles.inputMobile]} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable onPress={signIn} disabled={busy} style={styles.primaryButton}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Đăng nhập quản trị  →</Text>}
          </Pressable>
          <Text style={styles.loginFoot}>Không có tài khoản? Xem hướng dẫn cấu hình admin trong backend/.env.</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.appShell}>
      <StatusBar style="dark" />
      {wide ? <View style={styles.sidebar}>
        <Text style={styles.brand}>mầm<Text style={styles.brandDot}>.</Text></Text>
        <Text style={styles.sideCaption}>COMMUNITY STUDIO</Text>
        <View style={styles.sideActive}><Text style={styles.sideIcon}>◉</Text><Text style={styles.sideActiveText}>Thành viên</Text></View>
        <View style={styles.sideNav}><Text style={styles.sideIcon}>⌂</Text><Text style={styles.sideNavText}>Tổng quan</Text></View>
        <View style={styles.sideProfile}><View style={styles.adminAvatar}><Text style={styles.adminAvatarText}>{adminEmail.slice(0, 1).toUpperCase()}</Text></View><View style={{ flex: 1 }}><Text style={styles.sideName}>Quản trị viên</Text><Text style={styles.sideEmail} numberOfLines={1}>{adminEmail}</Text></View><Pressable onPress={logout}><Text style={styles.logoutIcon}>↪</Text></Pressable></View>
      </View> : null}

      <ScrollView style={styles.mainScroll} contentContainerStyle={[styles.mainContent, wide && styles.mainContentWide]}>
        <View style={styles.topBar}><Text style={styles.breadcrumb}>Không gian của bạn  /  <Text style={{ color: '#285a43' }}>Thành viên</Text></Text><Text style={styles.topDate}>✦  Một ngày thật dịu dàng</Text></View>
        <View style={styles.welcomeBanner}>
          <View style={styles.bannerTextBlock}><Text style={styles.bannerEyebrow}>HỒ SƠ CỘNG ĐỒNG</Text><Text style={styles.bannerTitle}>Mỗi người là một{ '\n' }mảnh ghép tuyệt vời.</Text><Text style={styles.bannerBody}>Quản lý và lưu giữ những kết nối thân thương của câu lạc bộ.</Text></View>
          <View style={styles.bannerSun}><Text style={styles.bannerEmoji}>✿</Text><View style={styles.bannerLeaf}><Text style={styles.leafEmoji}>⌁</Text></View></View>
          <Text style={styles.bannerDecor}>✳</Text>
        </View>

        <View style={[styles.statsRow, width < 520 && styles.statsRowNarrow]}>
          <View style={styles.statCard}><Text style={styles.statLabel}>TỔNG THÀNH VIÊN</Text><Text style={styles.statValue}>{members.length.toString().padStart(2, '0')}</Text><Text style={styles.statNote}>Người trong cộng đồng</Text></View>
          <View style={[styles.statCard, styles.statCardPeach]}><Text style={styles.statLabel}>ĐANG HIỂN THỊ</Text><Text style={styles.statValue}>{filtered.length.toString().padStart(2, '0')}</Text><Text style={styles.statNote}>Hồ sơ phù hợp tìm kiếm</Text></View>
          <View style={[styles.statCard, styles.statCardLilac]}><Text style={styles.statLabel}>KẾT NỐI</Text><Text style={[styles.statValue, { color: '#8c6d9e' }]}>✦</Text><Text style={styles.statNote}>Cùng nhau lớn lên</Text></View>
        </View>

        <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>Thành viên của chúng ta</Text><Text style={styles.sectionSubtitle}>Những gương mặt làm nên câu chuyện chung.</Text></View><Pressable onPress={openNewMember} style={styles.addButton}><Text style={styles.addButtonText}>＋  Thêm thành viên</Text></Pressable></View>
        <View style={styles.searchWrap}><Text style={styles.searchIcon}>⌕</Text><TextInput value={search} onChangeText={setSearch} placeholder="Tìm theo tên hoặc email..." style={styles.searchInput} /></View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {filtered.length === 0 ? <View style={styles.emptyState}><Text style={styles.emptyFlower}>❀</Text><Text style={styles.emptyTitle}>{search ? 'Chưa tìm thấy ai' : 'Bắt đầu từ một lời chào'}</Text><Text style={styles.muted}>{search ? 'Thử tìm với tên hoặc email khác nhé.' : 'Thêm thành viên đầu tiên vào cộng đồng của bạn.'}</Text></View> : (
          <View style={styles.memberGrid}>
            {filtered.map((member, index) => (
              <View key={member._id} style={[styles.memberCard, wide && styles.memberCardWide]}>
                <View style={[styles.cardColor, cardColors[index % cardColors.length]]}>
                  <View style={styles.photoFrame}>{member.hinhanh ? <Image source={{ uri: member.hinhanh }} style={styles.memberPhoto} /> : <Text style={styles.photoPlaceholder}>{member.hoten.trim().slice(0, 1).toUpperCase()}</Text>}</View>
                  <Text style={styles.cardSpark}>✦</Text><Text style={styles.cardFlower}>✿</Text>
                </View>
                <View style={styles.memberInfo}><Text style={styles.memberName} numberOfLines={1}>{member.hoten}</Text><Text style={styles.memberEmail} numberOfLines={1}>{member.email}</Text><View style={styles.memberMeta}><Text style={styles.passwordDots}>Mật khẩu  ••••••••</Text><View style={styles.memberActions}><Pressable onPress={() => openEdit(member)} style={styles.iconButton}><Text style={styles.editIcon}>✎</Text></Pressable><Pressable onPress={() => setDeleteTarget(member)} style={[styles.iconButton, styles.deleteButton]}><Text style={styles.deleteIcon}>×</Text></Pressable></View></View></View>
              </View>
            ))}
          </View>
        )}
        <Text style={styles.footer}>ĐƯỢC TẠO BẰNG SỰ QUAN TÂM  ✿</Text>
      </ScrollView>

      <Modal visible={editor} transparent animationType="fade" onRequestClose={() => setEditor(false)}>
        <View style={styles.modalBackdrop}><ScrollView contentContainerStyle={styles.modalScroll}><View style={styles.modalCard}>
          <View style={styles.modalHeader}><View><Text style={styles.modalEyebrow}>HỒ SƠ THÀNH VIÊN</Text><Text style={styles.modalTitle}>{editingId ? 'Chỉnh sửa hồ sơ' : 'Thêm người bạn mới'}</Text></View><Pressable onPress={() => setEditor(false)} style={styles.closeButton}><Text>×</Text></Pressable></View>
          <Pressable onPress={choosePhoto} style={styles.photoPicker}>{form.hinhanh ? <Image source={{ uri: form.hinhanh }} style={styles.pickerImage} /> : <Text style={styles.pickerIcon}>＋</Text>}<Text style={styles.pickerText}>{form.hinhanh ? 'Đổi ảnh đại diện' : 'Chọn ảnh đại diện'}</Text><Text style={styles.pickerHint}>Ảnh vuông · JPG hoặc PNG</Text></Pressable>
          <Text style={styles.label}>Họ và tên</Text><TextInput value={form.hoten} onChangeText={(value) => setForm({ ...form, hoten: value })} placeholder="Ví dụ: Nguyễn An Nhiên" style={styles.input} />
          <Text style={styles.label}>Email</Text><TextInput autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={(value) => setForm({ ...form, email: value })} placeholder="ban@example.com" style={styles.input} />
          <Text style={styles.label}>Mật khẩu {editingId ? '(để trống nếu không đổi)' : ''}</Text><TextInput secureTextEntry value={form.matkhau} onChangeText={(value) => setForm({ ...form, matkhau: value })} placeholder={editingId ? 'Nhập mật khẩu mới nếu muốn đổi' : 'Tạo mật khẩu cho thành viên'} style={styles.input} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable onPress={saveMember} disabled={busy} style={[styles.primaryButton, { marginTop: 18 }]}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{editingId ? 'Lưu thay đổi' : 'Thêm vào cộng đồng'}  →</Text>}</Pressable>
        </View></ScrollView></View>
      </Modal>

      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View style={styles.modalBackdrop}><View style={styles.confirmCard}><Text style={styles.emptyFlower}>✿</Text><Text style={styles.modalTitle}>Xóa thành viên?</Text><Text style={styles.muted}>Hồ sơ của {deleteTarget?.hoten} sẽ bị xóa khỏi cộng đồng.</Text><View style={styles.confirmActions}><Pressable onPress={() => setDeleteTarget(null)} style={styles.cancelButton}><Text style={styles.cancelText}>Giữ lại</Text></Pressable><Pressable onPress={deleteMember} style={styles.confirmDelete}><Text style={styles.confirmDeleteText}>{busy ? 'Đang xóa…' : 'Xóa hồ sơ'}</Text></Pressable></View></View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  loginPage: { flex: 1, backgroundColor: '#fbf9f4' },
  loginPageContent: { flexGrow: 1, minHeight: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  loginArtwork: { flex: 1, minWidth: 320, minHeight: 560, backgroundColor: '#dce8d8', padding: 54, justifyContent: 'center', overflow: 'hidden' },
  loginArtworkMobile: { flex: 0, width: '100%', minWidth: 0, minHeight: 0, height: 245, paddingHorizontal: 25, paddingTop: 48, paddingBottom: 10, justifyContent: 'center' },
  artCircleOne: { position: 'absolute', width: 400, height: 400, borderRadius: 220, backgroundColor: '#cadcc8', top: -120, right: -130 },
  artCircleTwo: { position: 'absolute', width: 260, height: 260, borderRadius: 140, backgroundColor: '#e9cdb7', bottom: -90, left: -70 },
  artEyebrow: { color: '#52735a', fontSize: 11, fontWeight: '700', letterSpacing: 3, marginBottom: 22 },
  artEyebrowMobile: { fontSize: 9, letterSpacing: 2, marginBottom: 8 },
  artTitle: { color: '#294c38', fontSize: 42, lineHeight: 50, fontWeight: '600', letterSpacing: -1 },
  artTitleMobile: { fontSize: 25, lineHeight: 29, letterSpacing: -0.5 },
  artCaption: { color: '#58705d', fontSize: 15, marginTop: 18 },
  avatarStack: { flexDirection: 'row', alignItems: 'center', marginTop: 66 },
  avatarStackMobile: { marginTop: 14 },
  stackAvatar: { width: 42, height: 42, borderRadius: 24, backgroundColor: '#fffaf1', textAlign: 'center', textAlignVertical: 'center', fontSize: 21, borderWidth: 2, borderColor: '#dce8d8', overflow: 'hidden' },
  stackAvatarMobile: { width: 34, height: 34, borderRadius: 18, fontSize: 17 },
  stackLabel: { marginLeft: 16, color: '#54715a', fontSize: 12, lineHeight: 18 },
  stackLabelMobile: { marginLeft: 12, fontSize: 10, lineHeight: 14 },
  loginPanel: { width: 450, maxWidth: '100%', minHeight: 560, padding: 48, justifyContent: 'center', alignSelf: 'center' },
  loginPanelMobile: { width: '100%', minHeight: undefined, paddingHorizontal: 25, paddingTop: 19, paddingBottom: 24, justifyContent: 'flex-start' },
  brand: { color: '#285a43', fontSize: 29, fontWeight: '800', letterSpacing: -1 }, brandDot: { color: '#e5a06e' },
  loginHeading: { color: '#26392d', fontSize: 26, fontWeight: '700', marginTop: 38 },
  loginHeadingMobile: { fontSize: 23, marginTop: 16 },
  muted: { color: '#88877f', fontSize: 13, lineHeight: 20, marginTop: 8 },
  mutedMobile: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  label: { color: '#45534a', fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 18 },
  labelMobile: { marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e7e4dc', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, color: '#283a30', fontSize: 14, outlineStyle: 'none' } as object,
  inputMobile: { paddingVertical: 11 },
  primaryButton: { backgroundColor: '#285a43', borderRadius: 10, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  loginFoot: { color: '#92928a', fontSize: 11, textAlign: 'center', marginTop: 18, lineHeight: 18 },
  error: { color: '#b5423c', fontSize: 13, marginTop: 12, lineHeight: 19 },
  appShell: { flex: 1, minHeight: '100%', backgroundColor: '#f7f6f1', flexDirection: 'row' },
  sidebar: { width: 228, backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: '#eeece5', paddingHorizontal: 22, paddingTop: 28, paddingBottom: 16 },
  sideCaption: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: '#a6a79c', marginTop: 36, marginBottom: 14 },
  sideActive: { height: 42, borderRadius: 9, backgroundColor: '#eaf1e8', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 8 },
  sideIcon: { color: '#477452', fontSize: 16, width: 28 }, sideActiveText: { color: '#31583c', fontSize: 13, fontWeight: '700' },
  sideNav: { height: 42, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }, sideNavText: { color: '#777a72', fontSize: 13 },
  sideProfile: { flexDirection: 'row', alignItems: 'center', marginTop: 'auto', borderTopWidth: 1, borderTopColor: '#eeece5', paddingTop: 16, gap: 9 },
  adminAvatar: { width: 34, height: 34, borderRadius: 20, backgroundColor: '#f3e2d1', alignItems: 'center', justifyContent: 'center' }, adminAvatarText: { color: '#8d6544', fontWeight: '700' },
  sideName: { color: '#34463a', fontSize: 11, fontWeight: '700' }, sideEmail: { color: '#999a92', fontSize: 9, marginTop: 3 }, logoutIcon: { color: '#85877e', fontSize: 20, padding: 4 },
  mainScroll: { flex: 1 }, mainContent: { paddingHorizontal: 20, paddingBottom: 28, maxWidth: 1050, width: '100%', alignSelf: 'center' }, mainContentWide: { paddingHorizontal: 42 },
  topBar: { height: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, breadcrumb: { color: '#999b92', fontSize: 11 }, topDate: { color: '#81867c', fontSize: 11 },
  welcomeBanner: { minHeight: 204, backgroundColor: '#dfeadd', borderRadius: 17, padding: 28, flexDirection: 'row', overflow: 'hidden', alignItems: 'center', position: 'relative' },
  bannerTextBlock: { zIndex: 1, flex: 1 }, bannerEyebrow: { color: '#618064', fontSize: 9, letterSpacing: 1.8, fontWeight: '800', marginBottom: 12 },
  bannerTitle: { color: '#2e553c', fontSize: 27, lineHeight: 33, fontWeight: '700', letterSpacing: -0.5 }, bannerBody: { color: '#638068', fontSize: 11, marginTop: 10, maxWidth: 330, lineHeight: 17 },
  bannerSun: { width: 133, height: 133, borderRadius: 70, backgroundColor: '#f2c18e', alignItems: 'center', justifyContent: 'center', marginRight: 32 }, bannerEmoji: { color: '#fff3dc', fontSize: 83, lineHeight: 93 }, bannerLeaf: { position: 'absolute', right: -8, bottom: -9, width: 57, height: 76, borderTopLeftRadius: 50, borderBottomRightRadius: 50, backgroundColor: '#7e9a70', transform: [{ rotate: '25deg' }], alignItems: 'center', justifyContent: 'center' }, leafEmoji: { color: '#dce7d5', fontSize: 28 }, bannerDecor: { position: 'absolute', color: '#aec4a9', fontSize: 44, right: 8, top: 12 },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 15 }, statsRowNarrow: { flexDirection: 'column' }, statCard: { flex: 1, minHeight: 112, backgroundColor: '#fff', borderRadius: 13, padding: 16, borderWidth: 1, borderColor: '#eeece6' }, statCardPeach: { backgroundColor: '#fff8f1' }, statCardLilac: { backgroundColor: '#f8f5fa' },
  statLabel: { color: '#999a91', fontSize: 8, fontWeight: '800', letterSpacing: 1 }, statValue: { color: '#315b42', fontSize: 26, fontWeight: '700', marginTop: 8 }, statNote: { color: '#92938a', fontSize: 9, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 32, marginBottom: 16, gap: 10 }, sectionTitle: { color: '#34473a', fontSize: 19, fontWeight: '700' }, sectionSubtitle: { color: '#999a92', fontSize: 10, marginTop: 5 },
  addButton: { backgroundColor: '#285a43', borderRadius: 9, paddingHorizontal: 15, paddingVertical: 11 }, addButtonText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  searchWrap: { height: 43, borderRadius: 9, borderWidth: 1, borderColor: '#e9e7df', backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 16 }, searchIcon: { color: '#92958c', fontSize: 22, marginRight: 8 }, searchInput: { flex: 1, color: '#3b4b40', fontSize: 12, outlineStyle: 'none' } as object,
  memberGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 }, memberCard: { width: '100%', backgroundColor: '#fff', borderWidth: 1, borderColor: '#eeece6', borderRadius: 13, overflow: 'hidden' }, memberCardWide: { width: '48.7%' },
  cardColor: { height: 124, alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }, cardSage: { backgroundColor: '#e1eadc' }, cardPeach: { backgroundColor: '#f6e3d4' }, cardLilac: { backgroundColor: '#eae3ef' }, cardYellow: { backgroundColor: '#f3ebce' },
  photoFrame: { width: 82, height: 82, borderRadius: 44, borderWidth: 4, borderColor: '#fff', backgroundColor: '#f5f0e8', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, memberPhoto: { width: '100%', height: '100%' }, photoPlaceholder: { color: '#527257', fontSize: 32, fontWeight: '600' }, cardSpark: { position: 'absolute', color: '#fff', fontSize: 22, left: 25, top: 23 }, cardFlower: { position: 'absolute', color: '#fff8e8', fontSize: 30, right: 25, bottom: 18 },
  memberInfo: { padding: 14 }, memberName: { color: '#33463a', fontSize: 15, fontWeight: '700' }, memberEmail: { color: '#999a92', fontSize: 10, marginTop: 5 }, memberMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 13, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0eee9' }, passwordDots: { color: '#b0afa7', fontSize: 9 }, memberActions: { flexDirection: 'row', gap: 6 }, iconButton: { width: 28, height: 26, borderRadius: 7, backgroundColor: '#edf3eb', alignItems: 'center', justifyContent: 'center' }, editIcon: { color: '#507251', fontSize: 15 }, deleteButton: { backgroundColor: '#fbefea' }, deleteIcon: { color: '#b96e5c', fontSize: 17, lineHeight: 20 },
  emptyState: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingVertical: 42, paddingHorizontal: 20, borderWidth: 1, borderColor: '#eeece6' }, emptyFlower: { color: '#d5a775', fontSize: 36 }, emptyTitle: { color: '#405845', fontSize: 16, fontWeight: '700', marginTop: 9 }, footer: { color: '#b4b4aa', fontSize: 8, letterSpacing: 1.5, textAlign: 'center', marginTop: 30 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(29, 43, 34, 0.44)', justifyContent: 'center', padding: 18 }, modalScroll: { flexGrow: 1, justifyContent: 'center' }, modalCard: { alignSelf: 'center', width: '100%', maxWidth: 490, backgroundColor: '#fbfaf6', borderRadius: 17, padding: 24 }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }, modalEyebrow: { color: '#82947d', fontSize: 9, fontWeight: '800', letterSpacing: 1.5 }, modalTitle: { color: '#334a38', fontSize: 21, fontWeight: '700', marginTop: 7 }, closeButton: { width: 31, height: 31, borderRadius: 18, backgroundColor: '#eeeee7', alignItems: 'center', justifyContent: 'center' },
  photoPicker: { marginTop: 19, minHeight: 114, borderWidth: 1, borderStyle: 'dashed', borderColor: '#c9d5c3', borderRadius: 12, backgroundColor: '#f1f5ee', alignItems: 'center', justifyContent: 'center' }, pickerIcon: { color: '#6b8a67', fontSize: 26 }, pickerText: { color: '#4f6f50', fontSize: 11, fontWeight: '700', marginTop: 4 }, pickerHint: { color: '#a0a59a', fontSize: 9, marginTop: 4 }, pickerImage: { width: 57, height: 57, borderRadius: 30, marginBottom: 5 },
  confirmCard: { alignSelf: 'center', width: '100%', maxWidth: 360, backgroundColor: '#fff', borderRadius: 16, padding: 25, alignItems: 'center' }, confirmActions: { flexDirection: 'row', gap: 10, marginTop: 23, width: '100%' }, cancelButton: { flex: 1, minHeight: 43, borderRadius: 9, backgroundColor: '#f0f1eb', alignItems: 'center', justifyContent: 'center' }, cancelText: { color: '#5e6e61', fontSize: 12, fontWeight: '700' }, confirmDelete: { flex: 1, minHeight: 43, borderRadius: 9, backgroundColor: '#ba5c4e', alignItems: 'center', justifyContent: 'center' }, confirmDeleteText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});

const cardColors = [styles.cardSage, styles.cardPeach, styles.cardLilac, styles.cardYellow];
