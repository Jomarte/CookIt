import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
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

const FLAG_CODES: Record<string, string> = {
  'África do Sul':'za','Alemanha':'de','Angola':'ao','Arábia Saudita':'sa','Argélia':'dz',
  'Argentina':'ar','Austrália':'au','Áustria':'at','Bangladesh':'bd','Bélgica':'be',
  'Brasil':'br','Bulgária':'bg','Cabo Verde':'cv','Canadá':'ca','Chile':'cl','China':'cn',
  'Colômbia':'co','Coreia do Sul':'kr','Croácia':'hr','Dinamarca':'dk','Egito':'eg',
  'Emirados Árabes':'ae','Eslováquia':'sk','Espanha':'es','Estados Unidos':'us','Etiópia':'et',
  'Filipinas':'ph','Finlândia':'fi','França':'fr','Gana':'gh','Grécia':'gr','Hungria':'hu',
  'Índia':'in','Indonésia':'id','Irão':'ir','Iraque':'iq','Israel':'il','Itália':'it',
  'Japão':'jp','Malásia':'my','Marrocos':'ma','México':'mx','Moçambique':'mz','Nigéria':'ng',
  'Noruega':'no','Nova Zelândia':'nz','Países Baixos':'nl','Paquistão':'pk','Peru':'pe',
  'Polónia':'pl','Portugal':'pt','Quénia':'ke','Reino Unido':'gb','República Checa':'cz',
  'Roménia':'ro','Rússia':'ru','Sérvia':'rs','Singapura':'sg','Suécia':'se','Suíça':'ch',
  'Tailândia':'th','Tunísia':'tn','Turquia':'tr','Ucrânia':'ua','Venezuela':'ve','Vietname':'vn',
};

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user: me, token, setAuth } = useStore();

  const [profile, setProfile] = useState<any>(null);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // If it's the current user, redirect to own profile tab
  useEffect(() => {
    if (me && String(me.id) === String(id)) {
      router.replace('/(tabs)/profile');
      return;
    }
    Promise.all([
      api.getUser(id),
      api.getUserRecipes(id),
      token ? api.isFollowing(token, id) : Promise.resolve({ following: false }),
    ])
      .then(([u, r, f]) => { setProfile(u); setRecipes(r); setFollowing(f.following); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleFollow = async () => {
    if (!token || followLoading) return;
    setFollowLoading(true);
    try {
      const res = following
        ? await api.unfollowUser(token, id)
        : await api.followUser(token, id);
      setFollowing(res.following);
      if (res.followers !== undefined) setProfile((p: any) => ({ ...p, followers: res.followers }));
      if (me && token && res.myFollowing !== undefined) {
        setAuth({ ...me, following: res.myFollowing }, token);
      }
    } catch {}
    finally { setFollowLoading(false); }
  };

  const renderCard = ({ item: recipe }: { item: any }) => {
    if (!recipe) return <View style={[styles.card, { opacity: 0 }]} pointerEvents="none" />;
    const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);
    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push(`/recipe/${recipe.id}`)}>
        <View style={styles.cardImg}>
          {recipe.image
            ? <Image source={{ uri: recipe.image }} style={styles.cardPhoto} resizeMode="cover" />
            : <Ionicons name="restaurant-outline" size={24} color={COLORS.text3} />
          }
          {recipe.rating > 0 && (
            <View style={styles.cardRating}>
              <Ionicons name="star" size={10} color={COLORS.star} />
              <Text style={styles.cardRatingText}>{Number(recipe.rating).toFixed(1)}</Text>
            </View>
          )}
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
          <Text style={{ color: COLORS.text3, fontSize: 14 }}>Cozinheiro não encontrado</Text>
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

                {/* Cooking type + nationality badges */}
                <View style={styles.badgeRow}>
                  {profile.cooking_type ? (
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>{profile.cooking_type}</Text>
                    </View>
                  ) : null}
                  {profile.nationality ? (
                    <View style={styles.nationalityBadge}>
                      {FLAG_CODES[profile.nationality] && (
                        <Image
                          source={{ uri: `https://flagcdn.com/w40/${FLAG_CODES[profile.nationality]}.png` }}
                          style={styles.nationalityFlag}
                        />
                      )}
                      <Text style={styles.nationalityText}>{profile.nationality}</Text>
                    </View>
                  ) : null}
                </View>

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

              {/* Follow button */}
              <TouchableOpacity
                style={[styles.followBtn, following && styles.followBtnActive]}
                onPress={handleFollow}
                disabled={followLoading}
              >
                {followLoading
                  ? <ActivityIndicator size="small" color={following ? COLORS.primary : '#fff'} />
                  : <>
                      <Ionicons
                        name={following ? 'checkmark' : 'person-add-outline'}
                        size={16}
                        color={following ? COLORS.primary : '#fff'}
                      />
                      <Text style={[styles.followBtnText, following && styles.followBtnTextActive]}>
                        {following ? 'A seguir' : 'Seguir'}
                      </Text>
                    </>
                }
              </TouchableOpacity>

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

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 6 },
  typeBadge: {
    backgroundColor: COLORS.primaryDim,
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 10, borderWidth: 1, borderColor: COLORS.borderActive,
  },
  typeBadgeText: { fontSize: 12, color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.bodyBold },
  nationalityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surface2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  nationalityFlag: { width: 20, height: 14, borderRadius: 2 },
  nationalityText: { fontSize: 12, color: COLORS.text2, fontWeight: '600', fontFamily: FONTS.body },

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

  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignSelf: 'stretch',
    marginTop: 4,
  },
  followBtnActive: {
    backgroundColor: COLORS.primaryDim,
    borderColor: COLORS.borderActive,
  },
  followBtnText: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: FONTS.bodyBold },
  followBtnTextActive: { color: COLORS.primary },

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
  cardRating: {
    position: 'absolute', top: 7, right: 7,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(6,6,26,0.65)',
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  cardRatingText: { fontSize: 11, fontWeight: '700', color: COLORS.star, fontFamily: FONTS.bodyBold },
  cardContent: { padding: 9 },
  cardTitle: { fontSize: 12, fontWeight: '700', color: COLORS.text1, marginBottom: 4, lineHeight: 17, fontFamily: FONTS.bodyBold },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardMetaText: { fontSize: 11, color: COLORS.text3, fontFamily: FONTS.body },
});
