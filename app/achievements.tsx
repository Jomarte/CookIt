import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/Colors';
import { FONTS } from '../constants/Fonts';
import { useStore, computeStreak } from '../store/useStore';

interface Achievement {
  id: string;
  label: string;
  desc: string;
  icon: string;
  lib: 'ion' | 'mci';
  color: string;
  category: string;
  check: (data: any) => boolean;
  special?: boolean;
}

const CATEGORIES = ['Cozinheiro', 'Streak', 'Coleção', 'Social', 'Lendário'];
const OWNER_EMAIL = 'jmgpcl@gmail.com';
const MAX_PINNED = 8;

export default function AchievementsScreen() {
  const router = useRouter();
  const { cookedRecipes, cookedLogs, savedRecipes, user, pinnedBadgeIds, setPinnedBadgeIds } = useStore();
  const streak = computeStreak(cookedLogs);
  const myRecipesCount = user?.recipes_count ?? 0;
  const isOwner = user?.email === OWNER_EMAIL;

  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>(pinnedBadgeIds);

  const data = isOwner
    ? { cookedRecipes: { length: 9999 }, savedRecipes: { length: 9999 }, streak: 9999, myRecipesCount: 9999, isOwner: true }
    : { cookedRecipes, savedRecipes, streak, myRecipesCount, isOwner: false };

  const achievements: Achievement[] = [
    // ── Cozinheiro ──
    { id: 'cook_1', label: 'Primeiro Prato', desc: 'Cozinha a tua primeira receita', icon: 'flame-outline', lib: 'ion', color: COLORS.star, category: 'Cozinheiro', check: ({ cookedRecipes }) => cookedRecipes.length >= 1 },
    { id: 'cook_5', label: 'Cozinheiro Ativo', desc: '5 receitas cozinhadas', icon: 'restaurant-outline', lib: 'ion', color: COLORS.green, category: 'Cozinheiro', check: ({ cookedRecipes }) => cookedRecipes.length >= 5 },
    { id: 'cook_10', label: 'Chef em Progresso', desc: '10 receitas cozinhadas', icon: 'ribbon-outline', lib: 'ion', color: COLORS.primary, category: 'Cozinheiro', check: ({ cookedRecipes }) => cookedRecipes.length >= 10 },
    { id: 'cook_25', label: 'Chef Experiente', desc: '25 receitas cozinhadas', icon: 'trophy-outline', lib: 'ion', color: COLORS.star, category: 'Cozinheiro', check: ({ cookedRecipes }) => cookedRecipes.length >= 25 },
    { id: 'cook_50', label: 'Mestre da Cozinha', desc: '50 receitas cozinhadas', icon: 'chef-hat', lib: 'mci', color: '#E07B39', category: 'Cozinheiro', check: ({ cookedRecipes }) => cookedRecipes.length >= 50 },
    { id: 'cook_100', label: 'Fogo Azul', desc: '100 receitas cozinhadas — lendário', icon: 'fire', lib: 'mci', color: '#3B8BFF', category: 'Cozinheiro', special: true, check: ({ cookedRecipes }) => cookedRecipes.length >= 100 },
    { id: 'cook_250', label: 'Chama Imortal', desc: '250 receitas cozinhadas', icon: 'fire', lib: 'mci', color: '#9B30FF', category: 'Cozinheiro', special: true, check: ({ cookedRecipes }) => cookedRecipes.length >= 250 },
    { id: 'cook_500', label: 'Deus da Cozinha', desc: '500 receitas — és uma lenda', icon: 'crown', lib: 'mci', color: '#FFD700', category: 'Cozinheiro', special: true, check: ({ cookedRecipes }) => cookedRecipes.length >= 500 },

    // ── Streak ──
    { id: 'streak_3', label: 'Fogo Aceso', desc: '3 dias de streak', icon: 'flame', lib: 'ion', color: '#FF8C00', category: 'Streak', check: ({ streak }) => streak >= 3 },
    { id: 'streak_7', label: 'Semana em Chamas', desc: '7 dias seguidos', icon: 'flame', lib: 'ion', color: COLORS.accent, category: 'Streak', check: ({ streak }) => streak >= 7 },
    { id: 'streak_14', label: 'Duas Semanas', desc: '14 dias de streak', icon: 'fire', lib: 'mci', color: '#FF4500', category: 'Streak', check: ({ streak }) => streak >= 14 },
    { id: 'streak_30', label: 'Mês de Fogo', desc: '30 dias seguidos a cozinhar', icon: 'fire', lib: 'mci', color: '#E91E63', category: 'Streak', check: ({ streak }) => streak >= 30 },
    { id: 'streak_100', label: 'Centenário', desc: '100 dias consecutivos', icon: 'fire', lib: 'mci', color: '#3B8BFF', category: 'Streak', special: true, check: ({ streak }) => streak >= 100 },
    { id: 'streak_365', label: 'Um Ano Inteiro', desc: '365 dias a cozinhar sem falhar', icon: 'earth', lib: 'mci', color: '#FFD700', category: 'Streak', special: true, check: ({ streak }) => streak >= 365 },

    // ── Coleção ──
    { id: 'saved_1', label: 'Guardador', desc: 'Guarda a primeira receita', icon: 'bookmark-outline', lib: 'ion', color: COLORS.primary, category: 'Coleção', check: ({ savedRecipes }) => savedRecipes.length >= 1 },
    { id: 'saved_5', label: 'Colecionador', desc: '5 receitas guardadas', icon: 'bookmark', lib: 'ion', color: COLORS.primary, category: 'Coleção', check: ({ savedRecipes }) => savedRecipes.length >= 5 },
    { id: 'saved_20', label: 'Arquivo Pessoal', desc: '20 receitas guardadas', icon: 'library-outline', lib: 'ion', color: '#6366F1', category: 'Coleção', check: ({ savedRecipes }) => savedRecipes.length >= 20 },
    { id: 'saved_50', label: 'Biblioteca do Chef', desc: '50 receitas guardadas', icon: 'book-outline', lib: 'ion', color: '#8B5CF6', category: 'Coleção', check: ({ savedRecipes }) => savedRecipes.length >= 50 },

    // ── Social ──
    { id: 'publisher', label: 'Publicador', desc: 'Publica a primeira receita', icon: 'paper-plane-outline', lib: 'ion', color: COLORS.green, category: 'Social', check: ({ myRecipesCount }) => myRecipesCount >= 1 },
    { id: 'publish_5', label: 'Criador', desc: '5 receitas publicadas', icon: 'create-outline', lib: 'ion', color: COLORS.green, category: 'Social', check: ({ myRecipesCount }) => myRecipesCount >= 5 },
    { id: 'publish_20', label: 'Chef Influencer', desc: '20 receitas publicadas', icon: 'megaphone-outline', lib: 'ion', color: '#EC4899', category: 'Social', check: ({ myRecipesCount }) => myRecipesCount >= 20 },
    { id: 'publish_50', label: 'Estrela da Cozinha', desc: '50 receitas publicadas', icon: 'star', lib: 'ion', color: COLORS.star, category: 'Social', check: ({ myRecipesCount }) => myRecipesCount >= 50 },

    // ── Lendário ──
    { id: 'legend_all', label: 'O Completo', desc: 'Desbloqueaste todas as conquistas normais', icon: 'diamond-outline', lib: 'ion', color: '#3B8BFF', category: 'Lendário', special: true, check: ({ isOwner }) => isOwner },
    { id: 'legend_diamond', label: 'Diamante', desc: '1000 receitas cozinhadas', icon: 'diamond', lib: 'mci', color: '#67E8F9', category: 'Lendário', special: true, check: ({ cookedRecipes }) => cookedRecipes.length >= 1000 },
  ];

  const grouped = CATEGORIES.map((cat) => ({
    cat,
    items: achievements.filter((a) => a.category === cat),
  }));

  const totalEarned = achievements.filter((a) => a.check(data)).length;

  function toggleSelect(id: string, earned: boolean) {
    if (!earned) return;
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_PINNED) return prev;
      return [...prev, id];
    });
  }

  function saveSelection() {
    setPinnedBadgeIds(selected);
    setSelecting(false);
  }


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Conquistas</Text>
        {selecting ? (
          <TouchableOpacity style={styles.saveBtn} onPress={saveSelection}>
            <Text style={styles.saveBtnText}>Guardar</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.selectBtn} onPress={() => { setSelected(pinnedBadgeIds); setSelecting(true); }}>
            <Ionicons name="apps-outline" size={16} color={COLORS.primary} />
            <Text style={styles.selectBtnText}>Escolher 8</Text>
          </TouchableOpacity>
        )}
      </View>

      {selecting && (
        <View style={styles.selectBanner}>
          <Text style={styles.selectBannerText}>
            Toca nas conquistas ganhas para mostrar no perfil ({selected.length}/{MAX_PINNED})
          </Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.totalRow}>
          <View style={styles.totalBadge}>
            <Ionicons name="trophy" size={14} color={COLORS.star} />
            <Text style={styles.totalText}>{totalEarned} / {achievements.length} desbloqueadas</Text>
          </View>
        </View>

        {grouped.map(({ cat, items }) => (
          <View key={cat} style={styles.section}>
            <Text style={styles.sectionTitle}>{cat}</Text>
            <View style={styles.grid}>
              {items.map((a) => {
                const earned = a.check(data);
                const isPinned = selecting ? selected.includes(a.id) : pinnedBadgeIds.includes(a.id);
                const canSelect = earned && selecting;
                return (
                  <TouchableOpacity
                    key={a.id}
                    activeOpacity={canSelect ? 0.7 : 1}
                    onPress={() => toggleSelect(a.id, earned)}
                    style={[
                      styles.card,
                      earned ? { borderColor: `${a.color}55` } : styles.cardLocked,
                      a.special && earned && styles.cardSpecial,
                      selecting && isPinned && styles.cardPinned,
                    ]}
                  >
                    {selecting && earned && (
                      <View style={[styles.checkCircle, isPinned && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}>
                        {isPinned && <Ionicons name="checkmark" size={10} color="#fff" />}
                      </View>
                    )}
                    <View style={[
                      styles.iconWrap,
                      earned ? { backgroundColor: `${a.color}22` } : styles.iconWrapLocked,
                      a.special && earned && { backgroundColor: `${a.color}33` },
                    ]}>
                      {earned ? (
                        a.lib === 'mci'
                          ? <MaterialCommunityIcons name={a.icon as any} size={28} color={a.color} />
                          : <Ionicons name={a.icon as any} size={26} color={a.color} />
                      ) : (
                        <Ionicons name="lock-closed-outline" size={20} color={COLORS.text3} />
                      )}
                    </View>
                    {a.special && earned && (
                      <View style={styles.specialPill}>
                        <Text style={styles.specialPillText}>LENDÁRIO</Text>
                      </View>
                    )}
                    <Text style={[styles.cardLabel, earned && { color: COLORS.text1 }]} numberOfLines={2}>{a.label}</Text>
                    <Text style={styles.cardDesc} numberOfLines={2}>{a.desc}</Text>
                    {earned && <View style={[styles.earnedDot, { backgroundColor: a.color }]} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14,
    backgroundColor: COLORS.surface1, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text1, fontFamily: FONTS.titleBold },
  selectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.primaryDim, borderWidth: 1, borderColor: COLORS.borderActive,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7,
  },
  selectBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary, fontFamily: FONTS.bodyBold },
  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8,
  },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff', fontFamily: FONTS.bodyBold },

  selectBanner: {
    backgroundColor: COLORS.primaryDim, borderBottomWidth: 1, borderBottomColor: COLORS.borderActive,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  selectBannerText: { fontSize: 13, color: COLORS.primary, fontFamily: FONTS.body, textAlign: 'center' },

  scroll: { padding: 16, gap: 24 },

  totalRow: { alignItems: 'center', marginBottom: 4 },
  totalBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.surface1, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
  },
  totalText: { fontSize: 13, fontWeight: '600', color: COLORS.text2, fontFamily: FONTS.body },

  section: { gap: 12 },
  sectionTitle: {
    fontSize: 12, fontWeight: '800', color: COLORS.text3,
    textTransform: 'uppercase', letterSpacing: 1, fontFamily: FONTS.bodyBold,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  card: {
    width: '47%', backgroundColor: COLORS.surface1,
    borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.border,
    padding: 14, gap: 6, alignItems: 'center', position: 'relative',
  },
  cardLocked: { opacity: 0.45 },
  cardSpecial: {
    borderWidth: 2,
    shadowColor: '#3B8BFF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  cardPinned: { borderColor: COLORS.primary, borderWidth: 2 },

  checkCircle: {
    position: 'absolute', top: 8, left: 8,
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
    alignItems: 'center', justifyContent: 'center',
  },

  iconWrap: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  iconWrapLocked: { backgroundColor: COLORS.surface2 },

  specialPill: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: '#3B8BFF22', borderRadius: 6,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  specialPillText: {
    fontSize: 8, fontWeight: '900', color: '#3B8BFF',
    fontFamily: FONTS.bodyBold, letterSpacing: 0.5,
  },

  cardLabel: {
    fontSize: 13, fontWeight: '700', color: COLORS.text2,
    fontFamily: FONTS.bodyBold, textAlign: 'center',
  },
  cardDesc: { fontSize: 11, color: COLORS.text3, textAlign: 'center', lineHeight: 15, fontFamily: FONTS.body },
  earnedDot: { width: 7, height: 7, borderRadius: 4, marginTop: 2 },
});
