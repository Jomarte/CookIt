import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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

const AVATAR_SIZE = 108;
const BANNER_HEIGHT = 120;

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: me, token, setAuth } = useStore();

  const [profile, setProfile] = useState<any>(null);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

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
      <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={() => router.push(`/recipe/${recipe.id}`)}>
        {/* Full-bleed image */}
        {recipe.image
          ? <Image source={{ uri: recipe.image }} style={styles.cardPhoto} resizeMode="cover" />
          : (
            <View style={[styles.cardPhoto, styles.cardPhotoPlaceholder]}>
              <Ionicons name="restaurant-outline" size={30} color={COLORS.text3} />
            </View>
          )
        }

        {/* Gradient overlay */}
        <View style={styles.cardOverlay} />

        {/* Rating pill top-right */}
        {recipe.rating > 0 && (
          <View style={styles.cardRating}>
            <Ionicons name="star" size={10} color={COLORS.star} />
            <Text style={styles.cardRatingText}>{Number(recipe.rating).toFixed(1)}</Text>
          </View>
        )}

        {/* Title + meta at bottom */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={2}>{recipe.title}</Text>
          {totalTime > 0 && (
            <View style={styles.cardTimePill}>
              <Ionicons name="time-outline" size={10} color="rgba(255,255,255,0.8)" />
              <Text style={styles.cardTimeText}>{totalTime} min</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View>
      {/* Banner + avatar overlap */}
      <View>
        <View style={styles.banner} />
        <View style={styles.avatarSection}>
          <View style={styles.avatarOuter}>
            {profile.avatar
              ? <Image source={{ uri: profile.avatar }} style={styles.avatarImg} />
              : (
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarLetter}>{(profile.name ?? '?')[0].toUpperCase()}</Text>
                </View>
              )
            }
          </View>
        </View>
      </View>

      {/* Profile info */}
      <View style={styles.infoSection}>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.username}>@{profile.username}</Text>

        {/* Badges */}
        {(profile.cooking_type || profile.nationality) && (
          <View style={styles.badgeRow}>
            {profile.cooking_type ? (
              <View style={styles.typeBadge}>
                <Ionicons name="flame-outline" size={11} color={COLORS.primary} />
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
        )}

        {profile.bio ? (
          <Text style={styles.bio}>{profile.bio}</Text>
        ) : null}
      </View>

      {/* Stats card */}
      <View style={styles.statsCard}>
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

      {/* Follow button */}
      <TouchableOpacity
        style={[styles.followBtn, following && styles.followBtnActive]}
        onPress={handleFollow}
        disabled={followLoading}
        activeOpacity={0.85}
      >
        {followLoading
          ? <ActivityIndicator size="small" color={following ? COLORS.primary : COLORS.white} />
          : <>
              <Ionicons
                name={following ? 'checkmark-circle' : 'person-add-outline'}
                size={17}
                color={following ? COLORS.primary : COLORS.white}
              />
              <Text style={[styles.followBtnText, following && styles.followBtnTextActive]}>
                {following ? 'A seguir' : 'Seguir'}
              </Text>
            </>
        }
      </TouchableOpacity>

      {/* Section header */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Receitas</Text>
        {recipes.length > 0 && (
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{recipes.length}</Text>
          </View>
        )}
      </View>

      {recipes.length === 0 && (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Ionicons name="restaurant-outline" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>Ainda sem receitas</Text>
          <Text style={styles.emptySubtitle}>Este cozinheiro ainda não publicou nenhuma receita</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Floating back button */}
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top > 0 ? 12 : 44 }]}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-back" size={20} color={COLORS.text2} />
      </TouchableOpacity>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : !profile ? (
        <View style={styles.loadingWrap}>
          <View style={styles.emptyIcon}>
            <Ionicons name="person-outline" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>Cozinheiro não encontrado</Text>
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
          ListHeaderComponent={<ListHeader />}
          ListEmptyComponent={null}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  /* ── Floating back button ── */
  backBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 50,
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.surface1,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 4,
  },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },

  /* ── Banner + avatar overlap ── */
  banner: {
    height: BANNER_HEIGHT,
    backgroundColor: COLORS.surface2,
    // subtle warm tone
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  avatarSection: {
    alignItems: 'center',
    marginTop: -(AVATAR_SIZE / 2),
  },

  avatarOuter: {
    width: AVATAR_SIZE + 8,
    height: AVATAR_SIZE + 8,
    borderRadius: (AVATAR_SIZE + 8) / 2,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },

  avatarImg: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },

  avatarCircle: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: COLORS.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  avatarLetter: {
    fontSize: 44,
    fontWeight: '900',
    color: COLORS.primary,
    fontFamily: FONTS.bodyBold,
  },

  /* ── Profile info ── */
  infoSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 5,
  },

  name: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.text1,
    letterSpacing: -0.6,
    fontFamily: FONTS.titleBlack,
  },
  username: {
    fontSize: 14,
    color: COLORS.text3,
    fontFamily: FONTS.body,
    letterSpacing: 0.2,
  },

  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginTop: 8,
  },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.primaryDim,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.borderActive,
  },
  typeBadgeText: {
    fontSize: 12, color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.bodyBold,
  },
  nationalityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.surface2,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
  },
  nationalityFlag: { width: 20, height: 14, borderRadius: 2 },
  nationalityText: { fontSize: 12, color: COLORS.text2, fontWeight: '600', fontFamily: FONTS.body },

  bio: {
    fontSize: 14, color: COLORS.text2, textAlign: 'center',
    lineHeight: 21, paddingHorizontal: 8, fontFamily: FONTS.body,
    marginTop: 6,
  },

  /* ── Stats ── */
  statsCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: COLORS.surface1,
    borderRadius: 18, borderWidth: 1, borderColor: COLORS.border,
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statNum: {
    fontSize: 24, fontWeight: '900', color: COLORS.primary,
    letterSpacing: -0.5, fontFamily: FONTS.bodyBold,
  },
  statLabel: {
    fontSize: 11, color: COLORS.text3, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: FONTS.bodyBold,
  },
  statDivider: { width: 1, height: 28, backgroundColor: COLORS.border },

  /* ── Follow button ── */
  followBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    borderWidth: 1.5, borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  followBtnActive: {
    backgroundColor: COLORS.primaryDim,
    borderColor: COLORS.borderActive,
    shadowOpacity: 0,
    elevation: 0,
  },
  followBtnText: {
    fontSize: 15, fontWeight: '700', color: COLORS.white, fontFamily: FONTS.bodyBold,
  },
  followBtnTextActive: { color: COLORS.primary },

  /* ── Section row ── */
  sectionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 24, paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: COLORS.text3,
    textTransform: 'uppercase', letterSpacing: 0.9, fontFamily: FONTS.bodyBold,
  },
  countPill: {
    backgroundColor: COLORS.primaryDim, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: COLORS.borderActive,
  },
  countPillText: {
    fontSize: 11, fontWeight: '700', color: COLORS.primary, fontFamily: FONTS.bodyBold,
  },

  /* ── Empty state ── */
  emptyWrap: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32, gap: 10 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.primaryDim, borderWidth: 1.5, borderColor: COLORS.borderActive,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08, shadowRadius: 12,
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text1, fontFamily: FONTS.titleBold },
  emptySubtitle: { fontSize: 13, color: COLORS.text3, textAlign: 'center', lineHeight: 20, fontFamily: FONTS.body },

  /* ── Recipe grid ── */
  gridContent: { paddingHorizontal: 12, paddingBottom: 40, gap: 10 },
  gridRow: { gap: 10 },

  /* Overlay-style cards */
  card: {
    flex: 1,
    height: 190,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: COLORS.surface2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  cardPhoto: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  },
  cardPhotoPlaceholder: {
    backgroundColor: COLORS.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  cardOverlay: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    height: 100,
    // Simulated gradient: semi-transparent black fading up
    backgroundColor: 'transparent',
    // We stack two views to fake gradient
  },

  cardRating: {
    position: 'absolute', top: 8, right: 8,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(10,10,10,0.55)',
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 8,
  },
  cardRatingText: { fontSize: 11, fontWeight: '700', color: COLORS.star, fontFamily: FONTS.bodyBold },

  cardInfo: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 10,
    paddingTop: 28,
    backgroundColor: 'rgba(0,0,0,0.52)',
    gap: 5,
  },
  cardTitle: {
    fontSize: 13, fontWeight: '700', color: '#fff',
    lineHeight: 17, fontFamily: FONTS.bodyBold,
    letterSpacing: -0.1,
  },
  cardTimePill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 6,
  },
  cardTimeText: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.85)', fontFamily: FONTS.bodyBold },
});
