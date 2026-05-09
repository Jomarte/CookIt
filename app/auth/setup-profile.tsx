import { useRouter } from 'expo-router';
import React, { useRef, useState, useMemo, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/Colors';
import { FONTS } from '../../constants/Fonts';
import { api } from '../../services/api';
import { useStore } from '../../store/useStore';
import { useT } from '../../i18n';
import { COUNTRIES, getCountryCode, translateNationality } from '../../constants/Countries';

function flagUrl(code: string) {
  return `https://flagcdn.com/w40/${code}.png`;
}

const COOKING_TYPES = [
  { label: 'Caseiro', icon: 'home-outline' },
  { label: 'Gourmet', icon: 'restaurant-outline' },
  { label: 'Fit', icon: 'fitness-outline' },
  { label: 'Vegetariano', icon: 'leaf-outline' },
  { label: 'Vegan', icon: 'flower-outline' },
  { label: 'Street Food', icon: 'flame-outline' },
  { label: 'Internacional', icon: 'globe-outline' },
  { label: 'Pastelaria', icon: 'cafe-outline' },
];

function compressToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.onload = () => {
        const MAX = 600;
        let { width, height } = img;
        if (width > height) {
          if (width > MAX) { height = Math.round(height * MAX / width); width = MAX; }
        } else {
          if (height > MAX) { width = Math.round(width * MAX / height); height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function pickImageNative(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permissão necessária', 'Permite o acesso à galeria nas definições do dispositivo para alterar a foto.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'] as any,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.75,
    base64: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  if (!asset.base64) return null;
  return `data:image/jpeg;base64,${asset.base64}`;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const t = useT();
  const au = t.auth;
  const { user, token, updateUser, language } = useStore();

  const nameParts = (user?.name ?? '').trim().split(/\s+/);
  const [firstName, setFirstName] = useState(user?.first_name ?? nameParts[0] ?? '');
  const [lastName, setLastName] = useState(user?.last_name ?? nameParts.slice(1).join(' ') ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [cookingType, setCookingType] = useState(user?.cooking_type ?? 'Caseiro');
  const [nationality, setNationality] = useState<string | null>(user?.nationality ?? null);
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar ?? null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<any>(null);

  const filteredCountries = useMemo(() => {
    const q = countrySearch.toLowerCase().trim();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) =>
      c.pt.toLowerCase().includes(q) || c.en.toLowerCase().includes(q)
    );
  }, [countrySearch]);

  async function handleAvatarChange(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    try {
      const base64 = await compressToBase64(file);
      setAvatarPreview(base64);
    } catch {
      setError(au.setupAvatarError);
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const handlePickImage = useCallback(async () => {
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
      return;
    }
    setAvatarLoading(true);
    try {
      const b64 = await pickImageNative();
      if (b64) setAvatarPreview(b64);
    } finally {
      setAvatarLoading(false);
    }
  }, []);

  async function handleSave() {
    if (!firstName.trim() && !lastName.trim() && !name.trim()) {
      setError(au.setupErrorName);
      return;
    }
    if (username.trim().length < 3) { setError(au.setupErrorUsername); return; }
    if (/\s/.test(username.trim())) { setError(au.setupErrorUsernameSpaces); return; }
    setError('');
    setSaving(true);
    const displayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || name.trim();
    try {
      const updated = await api.updateMe(token!, {
        name: displayName,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        username: username.trim(),
        bio,
        cooking_type: cookingType,
        nationality,
        avatar: avatarPreview,
      });
      // Garantir que o avatar local é mantido caso o backend não o devolva
      updateUser({ ...updated, avatar: updated.avatar ?? avatarPreview });
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function removeAvatar() {
    setAvatarPreview(null);
  }


  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)'); }}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{au.setupHeaderTitle}</Text>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator size="small" color={COLORS.bg} />
            : <Text style={styles.saveBtnText}>{t.common.save}</Text>
          }
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={COLORS.accent} />
              <Text style={styles.errorMsg}>{error}</Text>
            </View>
          ) : null}

          {/* Avatar */}
          <View style={styles.avatarSection}>
            {/* Input de ficheiro escondido — só usado no web */}
            {Platform.OS === 'web' && (
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' } as any}
                onChange={handleAvatarChange}
              />
            )}

            <TouchableOpacity style={styles.avatarWrap} onPress={handlePickImage} activeOpacity={0.8}>
              {avatarLoading ? (
                <View style={styles.avatarCircle}>
                  <ActivityIndicator color={COLORS.primary} />
                </View>
              ) : avatarPreview ? (
                <Image source={{ uri: avatarPreview }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarLetter}>{(name || '?')[0].toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.avatarCameraBadge}>
                <Ionicons name="camera" size={13} color={COLORS.bg} />
              </View>
            </TouchableOpacity>

            <View style={styles.avatarActions}>
              <TouchableOpacity onPress={handlePickImage} disabled={avatarLoading}>
                <Text style={styles.avatarChangeText}>
                  {avatarPreview ? t.add.changePhoto : t.add.addPhoto}
                </Text>
              </TouchableOpacity>
              {avatarPreview ? (
                <TouchableOpacity onPress={removeAvatar}>
                  <Text style={styles.avatarRemoveText}>{t.common.remove}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Username */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Username</Text>
            <View style={styles.inputRow}>
              <Text style={styles.atSign}>@</Text>
              <TextInput
                style={styles.input}
                placeholder={au.setupUsernamePlaceholder}
                placeholderTextColor={COLORS.text3}
                value={username}
                onChangeText={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                autoCapitalize="none"
                maxLength={30}
              />
            </View>
          </View>

          {/* First + Last Name */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{au.setupNameLabel}</Text>
            <View style={styles.nameRow}>
              <View style={[styles.inputRow, { flex: 1 }]}>
                <TextInput
                  style={styles.input}
                  placeholder={au.setupFirstName}
                  placeholderTextColor={COLORS.text3}
                  value={firstName}
                  onChangeText={setFirstName}
                  maxLength={30}
                />
              </View>
              <View style={[styles.inputRow, { flex: 1 }]}>
                <TextInput
                  style={styles.input}
                  placeholder={au.setupLastName}
                  placeholderTextColor={COLORS.text3}
                  value={lastName}
                  onChangeText={setLastName}
                  maxLength={30}
                />
              </View>
            </View>
          </View>

          {/* Bio */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{au.setupBioLabel}</Text>
            <TextInput
              style={styles.bioInput}
              placeholder={au.setupBioPlaceholder}
              placeholderTextColor={COLORS.text3}
              multiline
              numberOfLines={3}
              maxLength={150}
              value={bio}
              onChangeText={setBio}
            />
            <Text style={styles.charCount}>{bio.length}/150</Text>
          </View>

          {/* Cooking Type */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{au.setupCookingStyleLabel}</Text>
            <View style={styles.cookingGrid}>
              {COOKING_TYPES.map((type) => {
                const active = cookingType === type.label;
                return (
                  <TouchableOpacity
                    key={type.label}
                    style={[styles.cookingOption, active && styles.cookingOptionActive]}
                    onPress={() => setCookingType(type.label)}
                  >
                    <Ionicons
                      name={type.icon as any}
                      size={15}
                      color={active ? COLORS.bg : COLORS.text3}
                    />
                    <Text style={[styles.cookingLabel, active && styles.cookingLabelActive]}>
                      {type.label}
                    </Text>
                    {active && <Ionicons name="checkmark-circle" size={13} color={COLORS.bg} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Nationality */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{au.setupNationalityLabel}</Text>
            <TouchableOpacity
              style={styles.inputRow}
              onPress={() => { setCountrySearch(''); setShowCountryPicker(true); }}
              activeOpacity={0.8}
            >
              <Ionicons name="earth-outline" size={17} color={COLORS.text3} />
              {nationality && (
                <Image
                  source={{ uri: flagUrl(getCountryCode(nationality ?? '')) }}
                  style={styles.flagImg}
                />
              )}
              <Text style={[styles.input, !nationality && { color: COLORS.text3 }]}>
                {nationality ? translateNationality(nationality, language) : au.setupNationalityPlaceholder}
              </Text>
              {nationality ? (
                <TouchableOpacity onPress={() => setNationality(null)}>
                  <Ionicons name="close-circle" size={17} color={COLORS.text3} />
                </TouchableOpacity>
              ) : (
                <Ionicons name="chevron-down" size={15} color={COLORS.text3} />
              )}
            </TouchableOpacity>
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Country picker overlay */}
      {showCountryPicker && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowCountryPicker(false)} activeOpacity={1} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{au.setupCountryModal}</Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <Ionicons name="close" size={22} color={COLORS.text2} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchRow}>
              <Ionicons name="search-outline" size={16} color={COLORS.text3} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder={au.setupCountrySearch}
                placeholderTextColor={COLORS.text3}
                value={countrySearch}
                onChangeText={setCountrySearch}
              />
              {countrySearch.length > 0 && (
                <TouchableOpacity onPress={() => setCountrySearch('')}>
                  <Ionicons name="close-circle" size={16} color={COLORS.text3} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.modalList}
              renderItem={({ item }) => {
                const isSelected = nationality === item.pt;
                return (
                  <TouchableOpacity
                    style={[styles.countryRow, isSelected && styles.countryRowSelected]}
                    onPress={() => { setNationality(item.pt); setShowCountryPicker(false); }}
                  >
                    <Image source={{ uri: flagUrl(item.code) }} style={styles.flagImg} />
                    <Text style={[styles.countryName, isSelected && styles.countryNameSelected]}>
                      {language === 'en' ? item.en : item.pt}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
          </KeyboardAvoidingView>
        </View>
      )}
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
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 14, fontWeight: '800', color: COLORS.bg, fontFamily: FONTS.bodyBold },

  inner: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, gap: 22 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.accentDim,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  errorMsg: { color: COLORS.accent, fontSize: 13, fontWeight: '600', flex: 1, fontFamily: FONTS.body },

  chefIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.primaryDim,
    borderWidth: 1,
    borderColor: COLORS.borderActive,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  chefIdentityText: { flex: 1, fontSize: 13, color: COLORS.text2, fontFamily: FONTS.body, lineHeight: 19 },
  chefIdentityHandle: { color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.bodyBold },

  avatarSection: { alignItems: 'center', gap: 12 },
  avatarWrap: { position: 'relative', width: 96, height: 96 },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primaryDim,
    borderWidth: 2.5,
    borderColor: COLORS.borderActive,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
  },
  avatarImg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2.5,
    borderColor: COLORS.borderActive,
  },
  avatarLetter: { fontSize: 38, fontWeight: '900', color: COLORS.primary, fontFamily: FONTS.bodyBold },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.bg,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  avatarActions: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  avatarChangeText: { fontSize: 14, color: COLORS.primary, fontWeight: '600', fontFamily: FONTS.body },
  avatarRemoveText: { fontSize: 14, color: COLORS.text3, fontWeight: '500', fontFamily: FONTS.body },

  field: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text3, textTransform: 'uppercase', letterSpacing: 0.7, fontFamily: FONTS.bodyBold },
  nameRow: { flexDirection: 'row', gap: 10 },
  atSign: { fontSize: 17, color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.bodyBold },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.text1,
    fontFamily: FONTS.body,
  },
  bioInput: {
    backgroundColor: COLORS.surface2,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.text1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    minHeight: 90,
    textAlignVertical: 'top',
    fontFamily: FONTS.body,
  },
  charCount: { fontSize: 12, color: COLORS.text3, textAlign: 'right', fontFamily: FONTS.body },

  // Country modal
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 24,
    zIndex: 101,
  },
  modalList: { flexShrink: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text1, fontFamily: FONTS.bodyBold },
  modalSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: COLORS.surface2,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text1,
    fontFamily: FONTS.body,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  countryRowSelected: { backgroundColor: COLORS.primaryDim },
  flagImg: { width: 28, height: 20, borderRadius: 3 },
  countryName: { flex: 1, fontSize: 15, color: COLORS.text1, fontFamily: FONTS.body },
  countryNameSelected: { color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.bodyBold },

  cookingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cookingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: COLORS.surface2,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  cookingOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cookingLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text3, fontFamily: FONTS.body },
  cookingLabelActive: { color: COLORS.bg, fontWeight: '700', fontFamily: FONTS.bodyBold },
});
