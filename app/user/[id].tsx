import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/Colors';
import { FONTS } from '../../constants/Fonts';
import { api } from '../../services/api';
import { useStore } from '../../store/useStore';
import { useT } from '../../i18n';

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

const TABS = [
  { key: 'recipes', icon: 'chef-hat', lib: 'mci' },
  { key: 'cooked', icon: 'pot-steam-outline', lib: 'mci' },
];

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useT();
  const u = t.userProfile;
  const { user: me, token, setAuth } = useStore();

  const [profile, setProfile] = useState<any>(null);
  const [publishedRecipes, setPublishedRecipes] = useState<any[]>([]);
  const [cookedRecipes, setCookedRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('recipes');

  const loadProfile = useCallback(async () => {
    if (me && String(me.id) === String(id)) {
      router.replace('/(tabs)/profile');
      return;
    }
    const [u, r, f, c] = await Promise.all([
      api.getUser(id),
      api.getUserRecipes(id),
      token ? api.isFollowing(token, id) : Promise.resolve({ following: false }),
      api.getUserCookedRecipes(id).catch(() => []),
    ]);
    setProfile(u);
    setPublishedRecipes(r);
    setFollowing(f.following);
    setCookedRecipes(Array.isArray(c) ? c : []);
  }, [id, token]);

  useEffect(() => {
    loadProfile().catch(() => {}).finally(() => setLoading(false));
  }, [loadProfile]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfile().catch(() => {});
    setRefreshing(false);
  }, [loadProfile]);

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

  const streak = profile?.streak ?? 0;
  const cookedCount = profile?.cooked_count ?? cookedRecipes.length;

  const ai = t.achievements.items;
  const badges = [
    { id: 'cook_1',    label: ai['cook_1']?.label ?? '',    icon: 'flame-outline',       color: COLORS.star,    earned: cookedCount >= 1 },
    { id: 'cook_5',    label: ai['cook_5']?.label ?? '',    icon: 'restaurant-outline',  color: COLORS.green,   earned: cookedCount >= 5 },
    { id: 'cook_10',   label: ai['cook_10']?.label ?? '',   icon: 'ribbon-outline',      color: COLORS.primary, earned: cookedCount >= 10 },
    { id: 'cook_25',   label: ai['cook_25']?.label ?? '',   icon: 'trophy-outline',      color: COLORS.star,    earned: cookedCount >= 25 },
    { id: 'streak_3',  label: ai['streak_3']?.label ?? '',  icon: 'flame',               color: '#FF8C00',      earned: streak >= 3 },
    { id: 'streak_7',  label: ai['streak_7']?.label ?? '',  icon: 'flame',               color: COLORS.accent,  earned: streak >= 7 },
    { id: 'publisher', label: ai['publisher']?.label ?? '', icon: 'paper-plane-outline', color: COLORS.green,   earned: publishedRecipes.length >= 1 },
    { id: 'publish_5', label: ai['publish_5']?.label ?? '', icon: 'create-outline',      color: COLORS.green,   earned: publishedRecipes.length >= 5 },
  ];

  const displayList = activeTab === 'recipes' ? publishedRecipes : cookedRecipes;

  const renderRecipeCard = ({ item }: { item: any }) => {
    if (!item) return <View style={styles.gridCell} />;
    return (
      <TouchableOpacity style={styles.gridCell} activeOpacity={0.88} onPress={() => router.push(`/recipe/${item.id}`)}>
        <View style={styles.gridImageWrap}>
          {item.image
            ? <Image source={{ uri: item.image }} style={styles.gridPhoto} resizeMode="cover" />
            : <View style={styles.gridPlaceholder}><Ionicons name="restaurant-outline" size={22} color={COLORS.text3} /></View>
          }
          {item.rating > 0 && (
            <View style={styles.gridRating}>
              <Ionicons name="star" size={9} color={COLORS.star} />
              <Text style={styles.gridRatingText}>{Number(item.rating).toFixed(1)}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={17} color={COLORS.text2} />
            </TouchableOpacity>
            <View style={{ width: 34 }} />
          </View>
        </View>
        <View style={styles.loadingWrap}>
          <View style={styles.emptyTabIcon}>
            <Ionicons name="person-outline" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTabText}>{u.notFound}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
      >
        {/* Header */}
        <View style={styles.header}>
          {/* Top row: back | @username | share */}
          <View style={styles.headerTopRow}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={17} color={COLORS.text2} />
            </TouchableOpacity>
            <Text style={styles.profileUsername}>@{profile.username}</Text>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => Share.share({ message: u.shareMsg(profile.username) })}
            >
              <Ionicons name="share-outline" size={17} color={COLORS.text2} />
            </TouchableOpacity>
          </View>

          {/* Avatar + info */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrap}>
              {profile.avatar
                ? <Image source={{ uri: profile.avatar }} style={styles.avatarImg} />
                : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarLetter}>
                      {(profile.first_name ?? profile.name ?? '?')[0].toUpperCase()}
                    </Text>
                  </View>
                )
              }
              <View style={styles.avatarRing} />
            </View>

            <View style={styles.nameBlock}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>
                  {profile.first_name || profile.last_name
                    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ')
                    : (profile.name ?? '')}
                </Text>
                {streak > 0 && (
                  <View style={styles.streakPill}>
                    <Ionicons name="flame" size={12} color={COLORS.star} />
                    <Text style={styles.streakPillText}>{streak}</Text>
                  </View>
                )}
              </View>
              <View style={styles.badgeRow}>
                {profile.cooking_type ? (
                  <View style={styles.cookingTypeBadge}>
                    <Text style={styles.cookingTypeText}>{profile.cooking_type}</Text>
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
            </View>
          </View>

          {/* Bio */}
          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{profile.recipes_count ?? publishedRecipes.length}</Text>
              <Text style={styles.statLabel}>{u.statRecipes}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{profile.followers ?? 0}</Text>
              <Text style={styles.statLabel}>{u.statFollowers}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{profile.following ?? 0}</Text>
              <Text style={styles.statLabel}>{u.statFollowing}</Text>
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
              : (
                <>
                  <Ionicons
                    name={following ? 'checkmark-circle' : 'person-add-outline'}
                    size={17}
                    color={following ? COLORS.primary : COLORS.white}
                  />
                  <Text style={[styles.followBtnText, following && styles.followBtnTextActive]}>
                    {following ? u.following : u.follow}
                  </Text>
                </>
              )
            }
          </TouchableOpacity>
        </View>

        <View style={styles.headerDivider} />

        {/* Conquistas */}
        <View style={styles.cardSection}>
          <View style={styles.cardSectionHeader}>
            <Text style={styles.cardSectionTitle}>{u.achievements}</Text>
            {streak > 0 && (
              <View style={styles.streakChip}>
                <Ionicons name="flame" size={12} color={COLORS.star} />
                <Text style={styles.streakChipText}>{u.streakDays(streak)}</Text>
              </View>
            )}
          </View>
          <View style={styles.badgesIconRow}>
            {badges.map((badge) => (
              <View
                key={badge.id}
                style={[
                  styles.badgeSmallIcon,
                  badge.earned
                    ? { backgroundColor: `${badge.color}22`, borderColor: `${badge.color}55` }
                    : styles.badgeSmallIconLocked,
                ]}
              >
                {badge.earned
                  ? <Ionicons name={badge.icon as any} size={16} color={badge.color} />
                  : <Ionicons name="lock-closed-outline" size={11} color={COLORS.text3} />
                }
              </View>
            ))}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <MaterialCommunityIcons
                name={tab.icon as any}
                size={22}
                color={activeTab === tab.key ? COLORS.primary : COLORS.text3}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Grid */}
        {displayList.length === 0 ? (
          <View style={styles.emptyTab}>
            <View style={styles.emptyTabIcon}>
              <Ionicons name="restaurant-outline" size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTabText}>
              {activeTab === 'cooked' ? u.noMarked : u.noRecipes}
            </Text>
          </View>
        ) : (
          <FlatList
            data={displayList.length % 3 !== 0 ? [...displayList, ...Array(3 - (displayList.length % 3)).fill(null)] : displayList}
            renderItem={renderRecipeCard}
            keyExtractor={(item, index) => item ? String(item.id) : `spacer-${index}`}
            numColumns={3}
            scrollEnabled={false}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridContent}
          />
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },

  header: {
    backgroundColor: COLORS.bg,
    padding: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  headerDivider: {
    height: 0.5,
    backgroundColor: COLORS.border,
    marginHorizontal: 14,
  },

  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  profileUsername: {
    fontSize: 22,
    color: COLORS.text1,
    fontFamily: FONTS.titleBold,
    letterSpacing: -0.3,
  },
  iconBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: COLORS.surface2,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },

  avatarSection: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  avatarWrap: { position: 'relative', width: 76, height: 76, flexShrink: 0 },
  avatar: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: COLORS.primaryDim,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: { width: 76, height: 76, borderRadius: 38 },
  avatarLetter: { fontSize: 30, fontWeight: '900', color: COLORS.primary, fontFamily: FONTS.titleBlack },
  avatarRing: {
    position: 'absolute', top: -3, left: -3, right: -3, bottom: -3,
    borderRadius: 42, borderWidth: 2.5, borderColor: COLORS.primary,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08, shadowRadius: 10,
  },

  nameBlock: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 18, fontWeight: '900', color: COLORS.text1, letterSpacing: -0.3, fontFamily: FONTS.bodyBold },
  streakPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(217,119,6,0.12)',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(217,119,6,0.3)',
  },
  streakPillText: { fontSize: 13, fontWeight: '800', color: COLORS.star, fontFamily: FONTS.bodyBold },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 4 },
  cookingTypeBadge: {
    backgroundColor: COLORS.primaryDim,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10, borderWidth: 1, borderColor: COLORS.borderActive,
  },
  cookingTypeText: { fontSize: 12, color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.bodyBold },
  nationalityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.surface2,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  nationalityFlag: { width: 20, height: 14, borderRadius: 2 },
  nationalityText: { fontSize: 12, color: COLORS.text2, fontWeight: '600', fontFamily: FONTS.body },

  bio: { fontSize: 13, color: COLORS.text2, lineHeight: 20, marginBottom: 12, fontFamily: FONTS.body },

  statsRow: { flexDirection: 'row', marginBottom: 14 },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statNumber: { fontSize: 20, fontWeight: '800', color: COLORS.primary, letterSpacing: -0.5, fontFamily: FONTS.bodyBold },
  statLabel: { fontSize: 14, color: COLORS.primary, fontWeight: '500', fontFamily: FONTS.body },

  followBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    borderWidth: 1.5, borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 10,
    elevation: 3,
  },
  followBtnActive: {
    backgroundColor: COLORS.primaryDim,
    borderColor: COLORS.borderActive,
    shadowOpacity: 0, elevation: 0,
  },
  followBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.white, fontFamily: FONTS.bodyBold },
  followBtnTextActive: { color: COLORS.primary },

  cardSection: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 2,
    backgroundColor: COLORS.bg,
    borderRadius: 18,
    padding: 12,
    gap: 8,
  },
  cardSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardSectionTitle: {
    fontSize: 11, fontWeight: '700', color: COLORS.text3,
    textTransform: 'uppercase', letterSpacing: 1, fontFamily: FONTS.bodyBold,
  },
  streakChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(217,119,6,0.12)',
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(217,119,6,0.3)',
  },
  streakChipText: { fontSize: 11, fontWeight: '700', color: COLORS.star, fontFamily: FONTS.bodyBold },

  badgesIconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badgeSmallIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  badgeSmallIconLocked: {
    backgroundColor: COLORS.surface2,
    borderColor: COLORS.border,
    opacity: 0.35,
  },

  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginTop: 4,
  },
  tab: {
    flex: 1, paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.primary },

  gridContent: { gap: 2 },
  gridRow: { gap: 2 },
  gridCell: { flex: 1 },
  gridImageWrap: {
    width: '100%', aspectRatio: 1,
    overflow: 'hidden',
    backgroundColor: COLORS.surface2,
    position: 'relative',
  },
  gridPhoto: { width: '100%', height: '100%' },
  gridPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface2 },
  gridRating: {
    position: 'absolute', top: 5, right: 5,
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 5, paddingVertical: 2,
    borderRadius: 6,
  },
  gridRatingText: { fontSize: 9, fontWeight: '700', color: COLORS.star, fontFamily: FONTS.bodyBold },

  emptyTab: { alignItems: 'center', paddingVertical: 52, gap: 14 },
  emptyTabIcon: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: COLORS.primaryDim,
    borderWidth: 1.5, borderColor: COLORS.borderActive,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08, shadowRadius: 12,
  },
  emptyTabText: { fontSize: 14, color: COLORS.text2, textAlign: 'center', paddingHorizontal: 40, fontFamily: FONTS.body },
});
