import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/Colors';
import { FONTS } from '../../constants/Fonts';
import { api } from '../../services/api';
import { useStore } from '../../store/useStore';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user: me, savedRecipes, toggleSaved } = useStore();

  const [profile, setProfile] = useState<any>(null);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // If it's the current user, redirect to own profile tab
  useEffect(() => {
    if (me && String(me.id) === String(id)) {
      router.replace('/(tabs)/profile');
      return;
    }
    Promise.all([api.getUser(id), api.getUserRecipes(id)])
      .then(([u, r]) => { setProfile(u); setRecipes(r); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const renderCard = ({ item: recipe }: { item: any }) => {
    if (!recipe) return <View style={[styles.card, { opacity: 0 }]} pointerEvents="none" />;
    const isSaved = savedRecipes.includes(String(recipe.id));
    const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);
    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push(`/recipe/${recipe.id}`)}>
        <View style={styles.cardImg}>
          {recipe.image
            ? <Image source={{ uri: recipe.image }} style={styles.cardPhoto} resizeMode="cover" />
            : <Ionicons name="restaurant-outline" size={24} color={COLORS.text3} />
          }
          <TouchableOpacity
            style={styles.cardSaveBtn}
            onPress={(e) => { e.stopPropagation?.(); toggleSaved(String(recipe.id)); }}
          >
            <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={14} color={isSaved ? COLORS.primary : '#fff'} />
          </TouchableOpacity>
          {recipe.difficulty ? (
            <View style={styles.cardDiff}>
              <Text style={styles.cardDiffText}>{recipe.difficulty}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>{recipe.title}</Text>
          <View style={styles.cardMeta}>
            <Ionicons name="time-outline" size={11} color={COLORS.text3} />
            <Text style={styles.cardMetaText}>{totalTime}min</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {profile ? `@${profile.username}` : ''}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : !profile ? (
        <View style={styles.loadingWrap}>
          <Text style={{ color: COLORS.text3, fontSize: 14 }}>Utilizador não encontrado</Text>
        </View>
      ) : (
        <FlatList
          data={recipes.length % 2 !== 0 ? [...recipes, null] : recipes}
          keyExtractor={(item, i) => item ? String(item.id) : `spacer-${i}`}
          renderItem={renderCard}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          ListHeaderComponent={
            <View>
              {/* Profile info */}
              <View style={styles.profileSection}>
                {/* Avatar */}
                <View style={styles.avatarWrap}>
                  {profile.avatar
                    ? <Image source={{ uri: profile.avatar }} style={styles.avatarImg} />
                    : (
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarLetter}>{(profile.name ?? '?')[0].toUpperCase()}</Text>
                      </View>
                    )
                  }
                  <View style={styles.avatarRing} />
                </View>

                {/* Name + username */}
                <Text style={styles.name}>{profile.name}</Text>
                <Text style={styles.username}>@{profile.username}</Text>

                {/* Cooking type badge */}
                {profile.cooking_type ? (
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{profile.cooking_type}</Text>
                  </View>
                ) : null}

                {/* Bio */}
                {profile.bio ? (
                  <Text style={styles.bio}>{profile.bio}</Text>
                ) : null}

                {/* Stats */}
                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Text style={styles.statNum}>{recipes.length}</Text>
                    <Text style={styles.statLabel}>Receitas</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.stat}>
                    <Text style={styles.statNum}>{profile.followers ?? 0}</Text>
                    <Text style={styles.statLabel}>Seguidores</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.stat}>
                    <Text style={styles.statNum}>{profile.following ?? 0}</Text>
                    <Text style={styles.statLabel}>A seguir</Text>
                  </View>
                </View>
              </View>

              {/* Section title */}
              <View style={styles.recipesHeader}>
                <Text style={styles.recipesHeaderText}>Receitas</Text>
                <Text style={styles.recipesHeaderCount}>{recipes.length}</Text>
              </View>

              {recipes.length === 0 && (
                <View style={styles.emptyRecipes}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="restaurant-outline" size={30} color={COLORS.primary} />
                  </View>
                  <Text style={styles.emptyText}>Ainda sem receitas publicadas</Text>
                </View>
              )}
            </View>
          }
          ListEmptyComponent={null}
        />
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
    paddingVertical: 14,
    backgroundColor: COLORS.surface1,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text1, flex: 1, textAlign: 'center', fontFamily: FONTS.bodyBold },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  profileSection: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 20,
    backgroundColor: COLORS.surface1,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },

  avatarWrap: { position: 'relative', width: 88, height: 88, marginBottom: 4 },
  avatarCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: COLORS.primaryDim,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: { width: 88, height: 88, borderRadius: 44 },
  avatarLetter: { fontSize: 36, fontWeight: '900', color: COLORS.primary, fontFamily: FONTS.bodyBold },
  avatarRing: {
    position: 'absolute', top: -4, left: -4, right: -4, bottom: -4,
    borderRadius: 50, borderWidth: 2.5, borderColor: COLORS.primary,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08, shadowRadius: 10,
  },

  name: { fontSize: 20, fontWeight: '900', color: COLORS.text1, letterSpacing: -0.3, fontFamily: FONTS.titleBlack },
  username: { fontSize: 13, color: COLORS.text3, fontWeight: '500', fontFamily: FONTS.body },

  typeBadge: {
    backgroundColor: COLORS.primaryDim,
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 10, borderWidth: 1, borderColor: COLORS.borderActive,
  },
  typeBadgeText: { fontSize: 12, color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.bodyBold },

  bio: { fontSize: 14, color: COLORS.text2, textAlign: 'center', lineHeight: 20, paddingHorizontal: 16, fontFamily: FONTS.body },

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 8, width: '100%',
    backgroundColor: COLORS.surface2,
    borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    paddingVertical: 14,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statNum: { fontSize: 22, fontWeight: '900', color: COLORS.primary, letterSpacing: -0.5, fontFamily: FONTS.bodyBold },
  statLabel: { fontSize: 11, color: COLORS.text3, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, fontFamily: FONTS.bodyBold },
  statDivider: { width: 1, height: 28, backgroundColor: COLORS.border },

  recipesHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8,
  },
  recipesHeaderText: { fontSize: 13, fontWeight: '700', color: COLORS.text3, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: FONTS.bodyBold },
  recipesHeaderCount: {
    fontSize: 11, fontWeight: '700', color: COLORS.primary,
    backgroundColor: COLORS.primaryDim, borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1, borderColor: COLORS.borderActive,
    fontFamily: FONTS.bodyBold,
  },

  emptyRecipes: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.primaryDim, borderWidth: 1.5, borderColor: COLORS.borderActive,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.08, shadowRadius: 10,
  },
  emptyText: { fontSize: 14, color: COLORS.text2, fontFamily: FONTS.body },

  gridContent: { paddingHorizontal: 12, paddingBottom: 30, gap: 10 },
  gridRow: { gap: 10 },

  card: {
    flex: 1, backgroundColor: COLORS.surface1, borderRadius: 16,
    overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  cardImg: {
    width: '100%', height: 140,
    backgroundColor: COLORS.surface2,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden',
  },
  cardPhoto: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  cardSaveBtn: {
    position: 'absolute', top: 7, left: 7,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(6,6,26,0.65)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  cardDiff: {
    position: 'absolute', top: 7, right: 7,
    backgroundColor: 'rgba(6,6,26,0.8)',
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  cardDiffText: { fontSize: 10, color: COLORS.text2, fontWeight: '700', fontFamily: FONTS.bodyBold },
  cardContent: { padding: 9 },
  cardTitle: { fontSize: 12, fontWeight: '700', color: COLORS.text1, marginBottom: 4, lineHeight: 17, fontFamily: FONTS.bodyBold },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardMetaText: { fontSize: 11, color: COLORS.text3, fontFamily: FONTS.body },
});
