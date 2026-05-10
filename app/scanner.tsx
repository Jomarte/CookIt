import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/Colors';
import { FONTS } from '../constants/Fonts';
import { api } from '../services/api';
import { useStore } from '../store/useStore';
import { useT } from '../i18n';

type Phase = 'picking' | 'loading' | 'result';

export default function ScannerScreen() {
  const router = useRouter();
  const t = useT();
  const s = t.scanner;
  const { token, aiScansUsed, aiPlan, setAiData } = useStore();
  const [phase, setPhase] = useState<Phase>('picking');
  const [photo, setPhoto] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { pickImage(); }, []);

  const analyzePhoto = async (dataUrl: string) => {
    if (!token) {
      Alert.alert(t.common.error, s.loginRequired);
      router.back();
      return;
    }
    setPhoto(dataUrl);
    setPhase('loading');
    try {
      const data = await api.scanRecipe(token, dataUrl);
      setRecipe(data.recipe);
      setAiData(data.scansUsed, data.aiPlan);
      setPhase('result');
    } catch (err: any) {
      const msg = err.message ?? '';
      if (msg.includes('Limite') || msg.includes('exclusivo') || msg.includes('upgrade')) {
        Alert.alert(s.quotaTitle, s.quotaMsg, [{ text: t.common.ok, onPress: () => router.back() }]);
      } else {
        Alert.alert(t.common.error, s.analyzeError);
        router.back();
      }
    }
  };

  const pickImage = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) { router.back(); return; }
        const reader = new FileReader();
        reader.onload = (ev) => analyzePhoto(ev.target?.result as string);
        reader.readAsDataURL(file);
      };
      input.click();
      return;
    }
    Alert.alert(s.photoTitle, s.photoQuestion, [
      {
        text: s.camera,
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert(s.permissionTitle, s.permissionCamera);
            router.back();
            return;
          }
          const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.75, base64: true });
          if (result.canceled) { router.back(); return; }
          analyzePhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
        },
      },
      {
        text: s.gallery,
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.75,
            base64: true,
          });
          if (result.canceled) { router.back(); return; }
          analyzePhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
        },
      },
      { text: t.common.cancel, style: 'cancel', onPress: () => router.back() },
    ]);
  };

  const handleSaveWantToCook = async () => {
    if (!token || !recipe) return;
    setSaving(true);
    try {
      await api.saveScanRecipe(token, {
        image: photo,
        title: recipe.title,
        ingredients: recipe.ingredients ?? [],
        steps: recipe.steps ?? [],
        prep_time: recipe.prep_time ?? 0,
        cook_time: recipe.cook_time ?? 0,
        servings: recipe.servings ?? 2,
        difficulty: recipe.difficulty ?? 'Fácil',
        cuisine: recipe.cuisine ?? 'Internacional',
      });
      Alert.alert(s.savedTitle, s.savedMsg, [{ text: t.common.ok, onPress: () => router.back() }]);
    } catch (err: any) {
      Alert.alert(t.common.error, err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublishNow = () => {
    if (!recipe) return;
    router.push({ pathname: '/(tabs)/add', params: { scanData: JSON.stringify(recipe) } } as any);
  };

  const limit = 10;

  if (phase === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{s.analyzing}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'result' && recipe) {
    const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={COLORS.text1} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{s.resultTitle}</Text>
          <Text style={styles.quota}>{s.scansLeft(aiScansUsed, limit)}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.resultContent} showsVerticalScrollIndicator={false}>
          {photo && (
            <View style={styles.previewWrap}>
              <Image source={{ uri: photo }} style={styles.previewImage} resizeMode="cover" />
            </View>
          )}
          <View style={styles.card}>
            <Text style={styles.recipeTitle}>{recipe.title}</Text>
            <View style={styles.metaRow}>
              {totalTime > 0 && (
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={13} color={COLORS.text2} />
                  <Text style={styles.metaText}>{totalTime} min</Text>
                </View>
              )}
              {recipe.servings > 0 && (
                <View style={styles.metaItem}>
                  <Ionicons name="people-outline" size={13} color={COLORS.text2} />
                  <Text style={styles.metaText}>{recipe.servings}</Text>
                </View>
              )}
              {recipe.difficulty && (
                <View style={styles.metaItem}>
                  <Text style={styles.metaText}>{recipe.difficulty}</Text>
                </View>
              )}
            </View>

            {recipe.ingredients?.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>{s.ingredients}</Text>
                {recipe.ingredients.map((ing: any, i: number) => (
                  <Text key={i} style={styles.listItem}>
                    • {ing.amount ? `${ing.amount} ${ing.unit} ` : ''}{ing.name}
                  </Text>
                ))}
              </>
            )}

            {recipe.steps?.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>{s.steps}</Text>
                {recipe.steps.map((step: string, i: number) => (
                  <Text key={i} style={styles.listItem}>{i + 1}. {step}</Text>
                ))}
              </>
            )}
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.btnStar]} onPress={handleSaveWantToCook} disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.btnText}>⭐ {s.wantToCook}</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnPublish]} onPress={handlePublishNow}>
            <Text style={styles.btnText}>🚀 {s.publishNow}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { fontSize: 16, color: COLORS.text2, fontFamily: FONTS.body },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: COLORS.text1, fontFamily: FONTS.titleBold },
  quota: { fontSize: 12, color: COLORS.text3, fontFamily: FONTS.body },

  resultContent: { padding: 16, gap: 12, paddingBottom: 32 },
  previewWrap: { borderRadius: 16, overflow: 'hidden', aspectRatio: 4 / 3 },
  previewImage: { width: '100%', height: '100%' },

  card: {
    backgroundColor: COLORS.surface1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 8,
  },
  recipeTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text1, fontFamily: FONTS.titleBlack, lineHeight: 26 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  metaItem: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4,
  },
  metaText: { fontSize: 12, color: COLORS.text2, fontFamily: FONTS.body, fontWeight: '600' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text1, fontFamily: FONTS.bodyBold, marginTop: 8 },
  listItem: { fontSize: 13, color: COLORS.text2, fontFamily: FONTS.body, lineHeight: 20 },

  actions: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  btn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  btnStar: { backgroundColor: COLORS.star },
  btnPublish: { backgroundColor: COLORS.primary },
  btnText: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: FONTS.bodyBold },
});
