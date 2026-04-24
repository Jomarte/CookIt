import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/Colors';
import { FONTS } from '../../constants/Fonts';
import { api } from '../../services/api';
import { computeStreak, getLast7Days, useStore } from '../../store/useStore';
import { useT } from '../../i18n';

const TABS = [
  { key: 'Receitas', icon: 'chef-hat', lib: 'mci' },
  { key: 'Guardadas', icon: 'bookmark-outline', lib: 'ion' },
  { key: 'Cozinhei', icon: 'pot-steam-outline', lib: 'mci' },
];

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

interface Badge {
  id: string;
  label: string;
  desc: string;
  icon: string;
  color: string;
  earned: boolean;
}

export default function ProfileScreen() {
  const router = useRouter();
  const t = useT();
  const p = t.profile;
  const [activeTab, setActiveTab] = useState('Receitas');
  const [showCalendar, setShowCalendar] = useState(true);
  const [allRecipes, setAllRecipes] = useState<any[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const { savedRecipes, cookedRecipes, cookedLogs, toggleCooked, addToShoppingList, user, token, logout, addNotification, earnedBadgeIds, setEarnedBadgeIds, pinnedBadgeIds, language, updateUser } = useStore();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [hoveredBadge, setHoveredBadge] = useState<Badge | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [recipes, freshUser] = await Promise.all([
        api.getRecipes(),
        token ? api.me(token) : Promise.resolve(null),
      ]);
      setAllRecipes(recipes);
      if (freshUser) updateUser(freshUser);
    } catch {}
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      setLoadingRecipes(true);
      loadData().finally(() => setLoadingRecipes(false));
    }, [loadData])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const myRecipes = allRecipes.filter((r) => r.author_id === user?.id);
  const savedList = allRecipes.filter((r) => savedRecipes.includes(String(r.id)));
  const cookedList = allRecipes.filter((r) => cookedRecipes.includes(String(r.id)));

  const displayList =
    activeTab === 'Receitas' ? myRecipes :
    activeTab === 'Guardadas' ? savedList :
    cookedList;

  // Streak
  const streak = computeStreak(cookedLogs);
  const last7 = getLast7Days();
  const cookedDateSet = new Set(cookedLogs.map((l) => l.date));

  const isOwner = user?.email === 'jmgpcl@gmail.com';

  // Lista completa de badges (IDs iguais à página de conquistas)
  const allBadges: Badge[] = [
    { id: 'cook_1', label: 'Primeiro Prato', icon: 'flame-outline', color: COLORS.star, earned: isOwner || cookedRecipes.length >= 1, desc: '' },
    { id: 'cook_5', label: 'Cozinheiro Ativo', icon: 'restaurant-outline', color: COLORS.green, earned: isOwner || cookedRecipes.length >= 5, desc: '' },
    { id: 'cook_10', label: 'Chef em Progresso', icon: 'ribbon-outline', color: COLORS.primary, earned: isOwner || cookedRecipes.length >= 10, desc: '' },
    { id: 'cook_25', label: 'Chef Experiente', icon: 'trophy-outline', color: COLORS.star, earned: isOwner || cookedRecipes.length >= 25, desc: '' },
    { id: 'cook_50', label: 'Mestre da Cozinha', icon: 'chef-hat', color: '#E07B39', earned: isOwner || cookedRecipes.length >= 50, desc: '' },
    { id: 'cook_100', label: 'Fogo Azul', icon: 'flame', color: '#3B8BFF', earned: isOwner || cookedRecipes.length >= 100, desc: '' },
    { id: 'cook_250', label: 'Chama Imortal', icon: 'flame', color: '#9B30FF', earned: isOwner || cookedRecipes.length >= 250, desc: '' },
    { id: 'cook_500', label: 'Deus da Cozinha', icon: 'flame', color: '#FFD700', earned: isOwner || cookedRecipes.length >= 500, desc: '' },
    { id: 'streak_3', label: 'Fogo Aceso', icon: 'flame', color: '#FF8C00', earned: isOwner || streak >= 3, desc: '' },
    { id: 'streak_7', label: 'Semana em Chamas', icon: 'flame', color: COLORS.accent, earned: isOwner || streak >= 7, desc: '' },
    { id: 'streak_14', label: 'Duas Semanas', icon: 'flame', color: '#FF4500', earned: isOwner || streak >= 14, desc: '' },
    { id: 'streak_30', label: 'Mês de Fogo', icon: 'flame', color: '#E91E63', earned: isOwner || streak >= 30, desc: '' },
    { id: 'streak_100', label: 'Centenário', icon: 'flame', color: '#3B8BFF', earned: isOwner || streak >= 100, desc: '' },
    { id: 'streak_365', label: 'Um Ano Inteiro', icon: 'flame', color: '#FFD700', earned: isOwner || streak >= 365, desc: '' },
    { id: 'saved_1', label: 'Guardador', icon: 'bookmark-outline', color: COLORS.primary, earned: isOwner || savedRecipes.length >= 1, desc: '' },
    { id: 'saved_5', label: 'Colecionador', icon: 'bookmark', color: COLORS.primary, earned: isOwner || savedRecipes.length >= 5, desc: '' },
    { id: 'saved_20', label: 'Arquivo Pessoal', icon: 'library-outline', color: '#6366F1', earned: isOwner || savedRecipes.length >= 20, desc: '' },
    { id: 'saved_50', label: 'Biblioteca do Chef', icon: 'book-outline', color: '#8B5CF6', earned: isOwner || savedRecipes.length >= 50, desc: '' },
    { id: 'publisher', label: 'Publicador', icon: 'paper-plane-outline', color: COLORS.green, earned: isOwner || myRecipes.length >= 1, desc: '' },
    { id: 'publish_5', label: 'Criador', icon: 'create-outline', color: COLORS.green, earned: isOwner || myRecipes.length >= 5, desc: '' },
    { id: 'publish_20', label: 'Chef Influencer', icon: 'megaphone-outline', color: '#EC4899', earned: isOwner || myRecipes.length >= 20, desc: '' },
    { id: 'publish_50', label: 'Estrela da Cozinha', icon: 'star', color: COLORS.star, earned: isOwner || myRecipes.length >= 50, desc: '' },
    { id: 'legend_all', label: 'O Completo', icon: 'diamond-outline', color: '#3B8BFF', earned: isOwner, desc: '' },
    { id: 'legend_diamond', label: 'Diamante', icon: 'diamond-outline', color: '#67E8F9', earned: isOwner || cookedRecipes.length >= 1000, desc: '' },
  ];

  // Badges a mostrar no perfil: os selecionados ou os primeiros 8 por defeito
  const badges = pinnedBadgeIds.length > 0
    ? allBadges.filter((b) => pinnedBadgeIds.includes(b.id))
    : allBadges.slice(0, 8);

  const earnedBadges = allBadges.filter((b) => b.earned);
  const lockedBadges = allBadges.filter((b) => !b.earned);

  // Notificações: badges novos + milestones de streak
  useEffect(() => {
    const newlyEarned = earnedBadges.filter((b) => !earnedBadgeIds.includes(b.id));
    if (newlyEarned.length > 0) {
      newlyEarned.forEach((b) => {
        addNotification({ type: 'badge', title: p.badgeUnlocked, message: p.badgeEarned(b.label), icon: b.icon, color: b.color });
      });
      setEarnedBadgeIds(earnedBadges.map((b) => b.id));
    }
  }, [earnedBadges.map((b) => b.id).join(',')]);

  const prevStreakRef = useRef<number | null>(null);
  useEffect(() => {
    const MILESTONES = [3, 7, 14, 30];
    if (prevStreakRef.current !== null && streak > prevStreakRef.current && MILESTONES.includes(streak)) {
      addNotification({ type: 'streak', title: p.streakNotifTitle(streak), message: p.streakNotifDesc(streak), icon: 'flame', color: COLORS.star });
    }
    prevStreakRef.current = streak;
  }, [streak]);

  async function handleDelete(id: number) {
    const doDelete = async () => {
      setDeletingId(id);
      try {
        await api.deleteRecipe(token!, id);
        setAllRecipes((prev) => prev.filter((r) => r.id !== id));
      } catch (e: any) {
        if (Platform.OS === 'web') alert(e.message);
        else Alert.alert('Erro', e.message);
      } finally {
        setDeletingId(null);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(p.deleteRecipeMsg)) doDelete();
    } else {
      Alert.alert(
        p.deleteRecipeTitle,
        p.deleteRecipeMsg,
        [{ text: t.common.cancel, style: 'cancel' }, { text: t.common.delete, style: 'destructive', onPress: doDelete }]
      );
    }
  }

  const renderRecipeCard = ({ item }: { item: any }) => {
    if (!item) return <View style={styles.gridCell} />;
    const isDeleting = deletingId === item.id;
    const isOwn = activeTab === 'Receitas';

    const destination = activeTab === 'Guardadas'
      ? `/recipe/card/${item.id}`
      : `/recipe/${item.id}`;

    return (
      <TouchableOpacity style={styles.gridCell} activeOpacity={0.88} onPress={() => router.push(destination)}>
        <View style={styles.gridImageWrap}>
          {item.image
            ? <Image source={{ uri: item.image }} style={styles.gridPhoto} resizeMode="cover" />
            : <View style={styles.gridPlaceholder}>
                <Ionicons name="restaurant-outline" size={22} color={COLORS.text3} />
              </View>
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
      >
        {/* Header */}
        <View style={styles.header}>
          {/* Top row: @username + action buttons */}
          <View style={styles.headerTopRow}>
            <Text style={styles.profileUsername}>{user?.username ?? ''}</Text>
            <View style={styles.topActions}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/auth/setup-profile')}>
                <Ionicons name="pencil" size={17} color={COLORS.text2} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => {
                  const { Share: RNShare } = require('react-native');
                  RNShare.share({ message: p.shareMsg(user?.username ?? '') });
                }}
              >
                <Ionicons name="share-outline" size={17} color={COLORS.text2} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/settings')}>
                <Ionicons name="settings-outline" size={17} color={COLORS.text2} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Avatar + info */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrap}>
              {user?.avatar
                ? <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
                : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarLetter}>
                      {(user?.first_name ?? user?.name ?? '?')[0].toUpperCase()}
                    </Text>
                  </View>
                )
              }
              <View style={styles.avatarRing} />
            </View>

            <View style={styles.nameBlock}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>
                  {user?.first_name || user?.last_name
                    ? [user.first_name, user.last_name].filter(Boolean).join(' ')
                    : (user?.name ?? '')}
                </Text>
                {streak > 0 && (
                  <View style={styles.streakPill}>
                    <Ionicons name="flame" size={12} color={COLORS.star} />
                    <Text style={styles.streakPillText}>{streak}</Text>
                  </View>
                )}
              </View>
              <View style={styles.badgeRow}>
                {user?.cooking_type ? (
                  <View style={styles.cookingTypeBadge}>
                    <Text style={styles.cookingTypeText}>{user.cooking_type}</Text>
                  </View>
                ) : null}
                {user?.nationality ? (
                  <View style={styles.nationalityBadge}>
                    {FLAG_CODES[user.nationality] && (
                      <Image
                        source={{ uri: `https://flagcdn.com/w40/${FLAG_CODES[user.nationality]}.png` }}
                        style={styles.nationalityFlag}
                      />
                    )}
                    <Text style={styles.nationalityText}>{user.nationality}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* Bio */}
          {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{user?.recipes_count ?? 0}</Text>
              <Text style={styles.statLabel}>{p.statRecipes}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{user?.followers ?? 0}</Text>
              <Text style={styles.statLabel}>{p.statFollowers}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{user?.following ?? 0}</Text>
              <Text style={styles.statLabel}>{p.statFollowing}</Text>
            </View>
          </View>

        </View>

        <View style={styles.headerDivider} />

        {/* Calendário / Conquistas com toggle */}
        <View style={styles.cardSection}>
          <View style={styles.cardSectionHeader}>
            <Text style={styles.cardSectionTitle}>
              {showCalendar ? t.calendar.title : t.achievements.title}
            </Text>
            <TouchableOpacity style={styles.toggleBtn} onPress={() => setShowCalendar((v) => !v)}>
              <Ionicons name={showCalendar ? 'trophy-outline' : 'calendar-outline'} size={13} color={COLORS.primary} />
              <Text style={styles.toggleBtnText}>{showCalendar ? t.achievements.title : t.calendar.title}</Text>
            </TouchableOpacity>
          </View>

          {showCalendar ? (
            <>
              <View style={styles.streakHeader}>
                <Text style={styles.streakTitle}>
                  {new Date().toLocaleDateString(language === 'en' ? 'en-US' : 'pt-PT', { month: 'long', year: 'numeric' })}
                </Text>
                <Text style={styles.streakBigNumText}>{streak}🔥</Text>
              </View>

              {/* Semana atual */}
              {(() => {
                const now = new Date();
                const dayOfWeek = now.getDay();
                const weekDays = ['D','S','T','Q','Q','S','S'];
                const days = [];
                for (let i = 0; i < 7; i++) {
                  const d = new Date(now);
                  d.setDate(now.getDate() - dayOfWeek + i);
                  const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                  const cooked = cookedDateSet.has(dateStr);
                  const isToday = i === dayOfWeek;
                  days.push(
                    <View key={i} style={styles.weekDayCol}>
                      <Text style={styles.weekDayLabel}>{weekDays[i]}</Text>
                      <View style={[styles.weekDayCell, cooked && styles.weekDayCellCooked, isToday && !cooked && styles.weekDayCellToday]}>
                        <Text style={[styles.weekDayCellText, cooked && styles.weekDayCellTextCooked, isToday && !cooked && styles.weekDayCellTextToday]}>
                          {d.getDate()}
                        </Text>
                      </View>
                    </View>
                  );
                }
                return <View style={styles.weekRow}>{days}</View>;
              })()}

              <TouchableOpacity style={styles.fullCalBtn} onPress={() => router.push('/calendar')}>
                <Ionicons name="calendar-outline" size={13} color={COLORS.primary} />
                <Text style={styles.fullCalBtnText}>{p.viewCalendar}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.badgesIconRow}>
                {badges.map((badge) => (
                  <View
                    key={badge.id}
                    {...({
                      onMouseEnter: () => setHoveredBadge(badge),
                      onMouseLeave: () => setHoveredBadge(null),
                    } as any)}
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
              <TouchableOpacity style={styles.fullCalBtn} onPress={() => router.push('/achievements')}>
                <Ionicons name="trophy-outline" size={13} color={COLORS.primary} />
                <Text style={styles.fullCalBtnText}>{p.viewAchievements}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              {tab.lib === 'mci'
                ? <MaterialCommunityIcons name={tab.icon as any} size={22} color={activeTab === tab.key ? COLORS.primary : COLORS.text3} />
                : <Ionicons name={tab.icon as any} size={20} color={activeTab === tab.key ? COLORS.primary : COLORS.text3} />
              }
            </TouchableOpacity>
          ))}
        </View>

        {/* Grid */}
        {loadingRecipes ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : displayList.length === 0 ? (
          <View style={styles.emptyTab}>
            <View style={styles.emptyTabIcon}>
              <Ionicons name="restaurant-outline" size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTabText}>
              {activeTab === 'Guardadas' ? p.noSaved :
               activeTab === 'Cozinhei' ? p.noMarked :
               p.noRecipes}
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

      {/* Badge tooltip — absolute overlay, não afeta o layout */}
      {hoveredBadge && (
        <View style={styles.badgeTooltip} pointerEvents="none">
          <View style={styles.badgeTooltipRow}>
            {hoveredBadge.earned
              ? <Ionicons name={hoveredBadge.icon as any} size={14} color={hoveredBadge.color} />
              : <Ionicons name="lock-closed-outline" size={14} color={COLORS.text3} />
            }
            <Text style={styles.badgeTooltipLabel}>{hoveredBadge.label}</Text>
            {!hoveredBadge.earned && (
              <View style={styles.badgeTooltipLockedPill}>
                <Text style={styles.badgeTooltipLockedText}>{p.badgeLocked}</Text>
              </View>
            )}
          </View>
          <Text style={styles.badgeTooltipDesc}>{hoveredBadge.desc}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    backgroundColor: COLORS.bg,
    padding: 20,
    paddingTop: 24,
    paddingBottom: 8,
    position: 'relative',
  },
  headerDivider: {
    height: 0.5,
    backgroundColor: COLORS.border,
    marginHorizontal: 14,
  },
  settingsBtn: {
    position: 'absolute',
    top: 18,
    right: 16,
    zIndex: 1,
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  topActions: { flexDirection: 'row', gap: 8 },
  profileUsername: { fontSize: 22, color: COLORS.text1, fontFamily: FONTS.titleBold, letterSpacing: -0.3 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: COLORS.surface2,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  avatarSection: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  nameBlock: { flex: 1, gap: 2 },
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

  statsRow: { flexDirection: 'row', marginBottom: 0 },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statNumber: { fontSize: 20, fontWeight: '800', color: COLORS.primary, letterSpacing: -0.5, fontFamily: FONTS.bodyBold },
  statLabel: { fontSize: 14, color: COLORS.primary, fontWeight: '500', fontFamily: FONTS.body },
  statDivider: { width: 1, height: 30, backgroundColor: COLORS.border },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 18, fontWeight: '900', color: COLORS.text1, letterSpacing: -0.3, fontFamily: FONTS.bodyBold },
  streakPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(217,119,6,0.12)',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(217,119,6,0.3)',
  },
  streakPillText: { fontSize: 13, fontWeight: '800', color: COLORS.star, fontFamily: FONTS.bodyBold },
  usernameText: { fontSize: 12, color: COLORS.text3, fontWeight: '500', fontFamily: FONTS.body },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 4 },
  cookingTypeBadge: {
    backgroundColor: COLORS.primaryDim,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderActive,
  },
  cookingTypeText: { fontSize: 12, color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.bodyBold },
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
  bio: { fontSize: 13, color: COLORS.text2, lineHeight: 20, marginBottom: 12, fontFamily: FONTS.body },

  actionsRow: { flexDirection: 'row', gap: 8 },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.borderActive,
    backgroundColor: COLORS.primaryDim,
  },
  editBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary, fontFamily: FONTS.bodyBold },
  shareBtn: {
    width: 38, height: 38, borderRadius: 10,
    borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
    alignItems: 'center', justifyContent: 'center',
  },

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
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text3,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: FONTS.bodyBold,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryDim,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderActive,
  },
  toggleBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.primary, fontFamily: FONTS.bodyBold },

  streakCard: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  streakHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  streakFireIcon: {},
  streakTitle: { fontSize: 12, fontWeight: '700', color: COLORS.text1, flex: 1, textTransform: 'capitalize', fontFamily: FONTS.bodyBold },
  streakSub: { fontSize: 10, color: COLORS.text3, fontFamily: FONTS.body },
  streakBigNumText: { fontSize: 13, fontWeight: '900', color: COLORS.star, fontFamily: FONTS.titleBlack },

  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDayCol: { flex: 1, alignItems: 'center', gap: 4 },
  weekDayLabel: { fontSize: 10, fontWeight: '700', color: COLORS.text3, fontFamily: FONTS.bodyBold },
  weekDayCell: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surface2,
  },
  weekDayCellCooked: { backgroundColor: COLORS.star },
  weekDayCellToday: { borderWidth: 2, borderColor: COLORS.primary, backgroundColor: COLORS.primaryDim },
  weekDayCellText: { fontSize: 12, fontWeight: '600', color: COLORS.text2, fontFamily: FONTS.body },
  weekDayCellTextCooked: { color: '#fff', fontWeight: '800' },
  weekDayCellTextToday: { color: COLORS.primary, fontWeight: '800' },

  fullCalBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: COLORS.primaryDim,
    borderWidth: 1, borderColor: COLORS.borderActive,
  },
  fullCalBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary, fontFamily: FONTS.bodyBold },

  calWeekRow: { flexDirection: 'row', marginBottom: 1 },
  calWeekLabel: { flex: 1, textAlign: 'center', fontSize: 7, fontWeight: '700', color: COLORS.text3, fontFamily: FONTS.bodyBold },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  calCellCooked: { backgroundColor: COLORS.star, borderRadius: 3 },
  calCellToday: { borderRadius: 3, borderWidth: 1, borderColor: COLORS.primary },
  calCellText: { fontSize: 7, color: COLORS.text2, fontFamily: FONTS.body },
  calCellTextCooked: { color: '#fff', fontWeight: '700' },
  calCellTextToday: { color: COLORS.primary, fontWeight: '700' },

  streakDays: { flexDirection: 'row', gap: 4 },
  streakDay: { flex: 1, aspectRatio: 1, borderRadius: 8, backgroundColor: COLORS.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  streakDayActive: { backgroundColor: COLORS.star, borderColor: COLORS.star },
  streakDayText: { fontSize: 9, fontWeight: '700', color: COLORS.text3, fontFamily: FONTS.bodyBold },
  streakDayTextActive: { color: '#150F00' },

  // Badges
  badgesCard: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text3,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: FONTS.bodyBold,
  },
  badgesIconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badgeSmallIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  badgeSmallIconLocked: {
    backgroundColor: COLORS.surface2,
    borderColor: COLORS.border,
    opacity: 0.35,
  },
  badgeTooltip: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: COLORS.surface2,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    gap: 4,
  },
  badgeTooltipRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  badgeTooltipLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text1, flex: 1, fontFamily: FONTS.bodyBold },
  badgeTooltipDesc: { fontSize: 12, color: COLORS.text3, lineHeight: 17, fontFamily: FONTS.body },
  badgeTooltipLockedPill: {
    backgroundColor: COLORS.surface1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badgeTooltipLockedText: { fontSize: 10, color: COLORS.text3, fontWeight: '600', fontFamily: FONTS.body },

  // Tabs
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginTop: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.text3, fontFamily: FONTS.bodyBold },
  tabTextActive: { color: COLORS.primary, fontWeight: '800' },

  loadingWrap: { paddingVertical: 40, alignItems: 'center' },

  // Instagram-style grid — no card borders, 2px column gaps
  gridContent: { gap: 2 },
  gridRow: { gap: 2 },
  gridCell: { flex: 1 },
  gridImageWrap: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
    backgroundColor: COLORS.surface2,
    position: 'relative',
  },
  gridRating: {
    position: 'absolute',
    top: 5,
    right: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gridRatingText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.star,
    fontFamily: FONTS.bodyBold,
  },
  gridPhoto: {
    width: '100%',
    height: '100%',
  },
  gridPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface2,
  },

  emptyTab: { alignItems: 'center', paddingVertical: 52, gap: 14 },
  emptyTabIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.primaryDim,
    borderWidth: 1.5,
    borderColor: COLORS.borderActive,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  emptyTabText: { fontSize: 14, color: COLORS.text2, textAlign: 'center', paddingHorizontal: 40, fontFamily: FONTS.body },
});
