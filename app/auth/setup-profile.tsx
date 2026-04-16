import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/Colors';
import { FONTS } from '../../constants/Fonts';
import { api } from '../../services/api';
import { useStore } from '../../store/useStore';

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

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, token, updateUser } = useStore();

  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [cookingType, setCookingType] = useState(user?.cooking_type ?? 'Caseiro');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar ?? null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<any>(null);

  async function handleAvatarChange(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    try {
      const base64 = await compressToBase64(file);
      setAvatarPreview(base64);
    } catch {
      setError('Erro ao carregar imagem');
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSave() {
    if (!name.trim()) { setError('O nome não pode estar vazio'); return; }
    setError('');
    setSaving(true);
    try {
      const updated = await api.updateMe(token!, {
        name: name.trim(),
        bio,
        cooking_type: cookingType,
        avatar: avatarPreview,
      });
      // Garantir que o avatar local é mantido caso o backend não o devolva
      updateUser({ ...updated, avatar: updated.avatar ?? avatarPreview });
      router.back();
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
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>O teu perfil de cozinheiro</Text>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator size="small" color={COLORS.bg} />
            : <Text style={styles.saveBtnText}>Guardar</Text>
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

          {/* Identidade */}
          <View style={styles.chefIdentity}>
            <Ionicons name="restaurant" size={18} color={COLORS.primary} />
            <Text style={styles.chefIdentityText}>
              És conhecido na comunidade como{' '}
              <Text style={styles.chefIdentityHandle}>@{user?.username}</Text>
            </Text>
          </View>

          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarWrap}
              onPress={() => Platform.OS === 'web' && fileInputRef.current?.click()}
              activeOpacity={0.8}
            >
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
              <TouchableOpacity
                onPress={() => Platform.OS === 'web' && fileInputRef.current?.click()}
                disabled={avatarLoading}
              >
                <Text style={styles.avatarChangeText}>
                  {avatarPreview ? 'Alterar foto' : 'Adicionar foto'}
                </Text>
              </TouchableOpacity>
              {avatarPreview ? (
                <TouchableOpacity onPress={removeAvatar}>
                  <Text style={styles.avatarRemoveText}>Remover</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {Platform.OS === 'web' && (
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
              />
            )}
          </View>

          {/* Name */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Nome do cozinheiro</Text>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={17} color={COLORS.text3} />
              <TextInput
                style={styles.input}
                placeholder="Como te chamas, cozinheiro?"
                placeholderTextColor={COLORS.text3}
                value={name}
                onChangeText={setName}
                maxLength={50}
              />
            </View>
          </View>

          {/* Bio */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sobre a tua cozinha</Text>
            <TextInput
              style={styles.bioInput}
              placeholder="Descreve o teu estilo de cozinha..."
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
            <Text style={styles.fieldLabel}>Estilo de cozinha</Text>
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

          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingVertical: 14,
    backgroundColor: COLORS.surface1,
    borderBottomWidth: 1,
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
