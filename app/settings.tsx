import { useRouter } from 'expo-router';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/Colors';
import { FONTS } from '../constants/Fonts';
import { api } from '../services/api';
import { useStore } from '../store/useStore';
import { useT } from '../i18n';

interface SettingsRowProps {
  icon: string;
  label: string;
  sublabel?: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
  badge?: string;
}

function SettingsRow({ icon, label, sublabel, onPress, danger, disabled, badge }: SettingsRowProps) {
  return (
    <TouchableOpacity
      style={[styles.row, disabled && styles.rowDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.65}
    >
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Ionicons name={icon as any} size={19} color={danger ? COLORS.accent : COLORS.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
        {sublabel ? <Text style={styles.rowSublabel}>{sublabel}</Text> : null}
      </View>
      <View style={styles.rowRight}>
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : (
          <Ionicons
            name={disabled ? 'lock-closed-outline' : 'chevron-forward'}
            size={15}
            color={COLORS.text3}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

function SectionLabel({ title }: { title: string }) {
  return <Text style={styles.sectionLabel}>{title}</Text>;
}

function Divider() {
  return <View style={styles.divider} />;
}


export default function SettingsScreen() {
  const router = useRouter();
  const { user, token, logout, language, setLanguage } = useStore();
  const t = useT();
  const s = t.settings;
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [langModal, setLangModal] = useState(false);

  async function confirmDelete() {
    setDeleting(true);
    try {
      await api.deleteMe(token!);
      try { await GoogleSignin.signOut(); } catch {}
      logout();
      setDeleteModal(false);
      router.replace('/auth/login');
    } catch (e: any) {
      setDeleting(false);
      if (Platform.OS === 'web') alert(e.message);
      else Alert.alert('Erro', e.message);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{s.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarWrap}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.userAvatarImg} />
            ) : (
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
              </View>
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userUsername}>@{user?.username}</Text>
          </View>
          <View style={[styles.userBadge, { backgroundColor: COLORS.primaryDim, borderColor: COLORS.borderActive }]}>
            <Text style={[styles.userBadgeText, { color: COLORS.primary }]}>
              {user?.cooking_type ?? 'Caseiro'}
            </Text>
          </View>
        </View>

        <SectionLabel title={s.sectionPreferences} />
        <View style={styles.card}>
          <SettingsRow
            icon="language-outline"
            label={s.language}
            sublabel={language === 'pt' ? '🇵🇹 Português' : '🇬🇧 English'}
            onPress={() => setLangModal(true)}
          />
        </View>

        <SectionLabel title={s.sectionProfile} />
        <View style={styles.card}>
          <SettingsRow
            icon="person-outline"
            label={s.editProfile}
            sublabel={s.editProfileSub}
            onPress={() => router.push('/auth/setup-profile')}
          />
          <Divider />
          <SettingsRow
            icon="at-outline"
            label={s.changeUsername}
            sublabel={s.changeUsernameSub}
            onPress={() => {}}
            disabled
            badge={t.common.soon}
          />
        </View>

        <SectionLabel title={s.sectionAccount} />
        <View style={styles.card}>
          <SettingsRow
            icon="lock-closed-outline"
            label={s.changePassword}
            sublabel={s.changePasswordSub}
            onPress={() => {}}
            disabled
            badge={t.common.soon}
          />
          <Divider />
          <SettingsRow
            icon="notifications-outline"
            label={s.notifications}
            sublabel={s.notificationsSub}
            onPress={() => {}}
            disabled
            badge={t.common.soon}
          />
          <Divider />
          <SettingsRow
            icon="log-out-outline"
            label={s.logout}
            onPress={async () => {
              try { await GoogleSignin.signOut(); } catch {}
              logout();
              router.replace('/auth/login');
            }}
          />
        </View>

        <SectionLabel title={s.sectionDanger} />
        <View style={styles.card}>
          <SettingsRow
            icon="trash-outline"
            label={s.deleteAccount}
            sublabel={s.deleteAccountSub}
            onPress={() => setDeleteModal(true)}
            danger
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal visible={deleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalDangerIcon}>
              <Ionicons name="warning-outline" size={30} color={COLORS.accent} />
            </View>
            <Text style={styles.modalTitle}>{s.deleteTitle}</Text>
            <Text style={styles.modalText}>
              {s.deleteText(<Text style={{ color: COLORS.accent, fontWeight: '700' }}>{s.deleteIrreversible}</Text> as any)}
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDeleteModal(false)}
                disabled={deleting}
              >
                <Text style={styles.modalCancelText}>{t.common.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalDeleteBtn, deleting && styles.btnDisabled]}
                onPress={confirmDelete}
                disabled={deleting}
              >
                {deleting
                  ? <ActivityIndicator color={COLORS.white} size="small" />
                  : <Text style={styles.modalDeleteText}>{s.deleteBtn}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Language Modal */}
      <Modal visible={langModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setLangModal(false)}>
          <View style={[styles.modalBox, { gap: 8 }]} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>{s.languageModalTitle}</Text>
            <TouchableOpacity
              style={[styles.langOption, language === 'pt' && styles.langOptionActive]}
              onPress={() => { setLanguage('pt'); setLangModal(false); }}
            >
              <Text style={[styles.langOptionText, language === 'pt' && styles.langOptionTextActive]}>{s.langPT}</Text>
              {language === 'pt' && <Ionicons name="checkmark" size={18} color={COLORS.primary} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langOption, language === 'en' && styles.langOptionActive]}
              onPress={() => { setLanguage('en'); setLangModal(false); }}
            >
              <Text style={[styles.langOptionText, language === 'en' && styles.langOptionTextActive]}>{s.langEN}</Text>
              {language === 'en' && <Ionicons name="checkmark" size={18} color={COLORS.primary} />}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalCancelBtn, { flex: 0, width: '100%' }]} onPress={() => setLangModal(false)}>
              <Text style={styles.modalCancelText}>{t.common.cancel}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 0,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text1, fontFamily: FONTS.bodyBold },

  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    margin: 16,
    padding: 16,
    backgroundColor: COLORS.surface1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  avatarWrap: {
    position: 'relative',
    width: 56,
    height: 56,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryDim,
    borderWidth: 2,
    borderColor: COLORS.borderActive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLoading: {
    opacity: 0.6,
  },
  userAvatarImg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: COLORS.borderActive,
  },
  userAvatarText: { fontSize: 22, fontWeight: '900', color: COLORS.primary, fontFamily: FONTS.bodyBold },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.bg,
  },

  userInfo: { flex: 1, gap: 2 },
  userName: { fontSize: 15, fontWeight: '700', color: COLORS.text1, fontFamily: FONTS.bodyBold },
  userUsername: { fontSize: 12, color: COLORS.text3, fontFamily: FONTS.body },
  addAvatarText: { fontSize: 12, color: COLORS.primary, fontWeight: '600', marginTop: 2, fontFamily: FONTS.body },
  removeAvatarText: { fontSize: 12, color: COLORS.text3, fontWeight: '500', marginTop: 2, fontFamily: FONTS.body },

  userBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  userBadgeText: { fontSize: 11, fontWeight: '700', fontFamily: FONTS.bodyBold },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text3,
    letterSpacing: 1.2,
    marginHorizontal: 20,
    marginBottom: 8,
    marginTop: 4,
    textTransform: 'uppercase',
    fontFamily: FONTS.bodyBold,
  },

  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.surface1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  rowDisabled: { opacity: 0.45 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderActive,
  },
  rowIconDanger: {
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accent,
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text1, fontFamily: FONTS.body },
  rowLabelDanger: { color: COLORS.accent },
  rowSublabel: { fontSize: 12, color: COLORS.text3, marginTop: 2, fontFamily: FONTS.body },
  rowRight: { alignItems: 'center', justifyContent: 'center' },

  badge: {
    backgroundColor: COLORS.surface2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: COLORS.text3, fontFamily: FONTS.bodyBold },

  divider: { height: 1, backgroundColor: COLORS.border, marginLeft: 66 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: COLORS.surface2,
    borderRadius: 22,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  modalDangerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.accentDim,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text1, fontFamily: FONTS.titleBold },
  modalText: { fontSize: 14, color: COLORS.text2, textAlign: 'center', lineHeight: 22, fontFamily: FONTS.body },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 8, width: '100%' },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: COLORS.surface3,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 15, fontWeight: '700', color: COLORS.text1, fontFamily: FONTS.bodyBold },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  modalDeleteText: { fontSize: 15, fontWeight: '700', color: COLORS.white, fontFamily: FONTS.bodyBold },
  btnDisabled: { opacity: 0.6 },

  langOption: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface3,
  },
  langOptionActive: {
    borderColor: COLORS.borderActive,
    backgroundColor: COLORS.primaryDim,
  },
  langOptionText: { fontSize: 15, fontWeight: '600', color: COLORS.text2, fontFamily: FONTS.body },
  langOptionTextActive: { color: COLORS.primary },
});
