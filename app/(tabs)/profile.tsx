import { useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore, computeStreak, getLast7Days } from '../../store/useStore';
import { COLORS } from '../../constants/Colors';
import { FONTS } from '../../constants/Fonts';
import { api } from '../../services/api';

const TABS = ['Receitas', 'Guardadas', 'Cozinhei'];

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
  const [activeTab, setActiveTab] = useState('Receitas');
  const [allRecipes, setAllRecipes] = useState<any[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const { savedRecipes, cookedRecipes, cookedLogs, toggleCooked, addToShoppingList, user, token, logout, addNotification, earnedBadgeIds, setEarnedBadgeIds } = useStore();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [hoveredBadge, setHoveredBadge] = useState<Badge | null>(null);

  useFocusEffect(
    useCallback(() => {
      setLoadingRecipes(true);
      api.getRecipes()
        .then(setAllRecipes)
        .catch(() => {})
        .finally(() => setLoadingRecipes(false));
    }, [])
  );

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

  // Badges
  const badges: Badge[] = [
    {
      id: 'first_cook',
      label: 'Primeiro Prato',
      desc: 'Cozinha a tua primeira receita',
      icon: 'flame-outline',
      color: COLORS.star,
      earned: cookedRecipes.length >= 1,
    },
    {
      id: 'cook_5',
      label: 'Cozinheiro Ativo',
      desc: '5 receitas cozinhadas',
      icon: 'restaurant-outline',
      color: COLORS.green,
      earned: cookedRecipes.length >= 5,
    },
    {
      id: 'cook_10',
      label: 'Chef em Progresso',
      desc: '10 receitas cozinhadas',
      icon: 'ribbon-outline',
      color: COLORS.primary,
      earned: cookedRecipes.length >= 10,
    },
    {
      id: 'cook_25',
      label: 'Chef Experiente',
      desc: '25 receitas cozinhadas',
      icon: 'trophy-outline',
      color: COLORS.star,
      earned: cookedRecipes.length >= 25,
    },
    {
      id: 'streak_3',
      label: 'Fogo Aceso',
      desc: '3 dias de streak',
      icon: 'flame',
      color: '#FF8C00',
      earned: streak >= 3,
    },
    {
      id: 'streak_7',
      label: 'Semana em Chamas',
      desc: '7 dias seguidos a cozinhar',
      icon: 'flame',
      color: COLORS.accent,
      earned: streak >= 7,
    },
    {
      id: 'saved_5',
      label: 'Colecionador',
      desc: '5 receitas guardadas',
      icon: 'bookmark',
      color: COLORS.primary,
      earned: savedRecipes.length >= 5,
    },
    {
      id: 'publisher',
      label: 'Publicador',
      desc: 'Publicaste a primeira receita',
      icon: 'paper-plane-outline',
      color: COLORS.green,
      earned: myRecipes.length >= 1,
    },
  ];

  const earnedBadges = badges.filter((b) => b.earned);
  const lockedBadges = badges.filter((b) => !b.earned);

  // Notificações: badges novos + milestones de streak
  useEffect(() => {
    const newlyEarned = earnedBadges.filter((b) => !earnedBadgeIds.includes(b.id));
    if (newlyEarned.length > 0) {
      newlyEarned.forEach((b) => {
        addNotification({ type: 'badge', title: 'Conquista desbloqueada!', message: `Ganhaste: ${b.label} — ${b.desc}`, icon: b.icon, color: b.color });
      });
      setEarnedBadgeIds(earnedBadges.map((b) => b.id));
    }
  }, [earnedBadges.map((b) => b.id).join(',')]);

  const prevStreakRef = useRef<number | null>(null);
  useEffect(() => {
    const MILESTONES = [3, 7, 14, 30];
    if (prevStreakRef.current !== null && streak > prevStreakRef.current && MILESTONES.includes(streak)) {
      addNotification({ type: 'streak', title: `${streak} dias de streak!`, message: `Incrível! Já cozinhaste ${streak} dias seguidos.`, icon: 'flame', color: COLORS.star });
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
      if (window.confirm('Apagar esta receita? Esta ação é irreversível.')) doDelete();
    } else {
      Alert.alert(
        'Apagar receita',
        'Esta ação é irreversível. Tens a certeza?',
        [{ text: 'Cancelar', style: 'cancel' }, { text: 'Apagar', style: 'destructive', onPress: doDelete }]
      );
    }
  }

  const renderRecipeCard = ({ item }: { item: any }) => {
    if (!item) return <View style={styles.gridCell} />;
    const isDeleting = deletingId === item.id;
    const isOwn = activeTab === 'Receitas';

    return (
      <TouchableOpacity style={styles.gridCell} activeOpacity={0.88} onPress={() => router.push(`/recipe/${item.id}`)}>
        <View style={styles.gridImageWrap}>
          {item.image
            ? <Image source={{ uri: item.image }} style={styles.gridPhoto} resizeMode="cover" />
            : <View style={styles.gridPlaceholder}>
                <Ionicons name="restaurant-outline" size={22} color={COLORS.text3} />
              </View>
          }
          {isOwn && (
            <View style={styles.gridActions}>
              <TouchableOpacity
                style={styles.gridActionBtn}
                onPress={(e) => { (e as any).stopPropagation?.(); router.push(`/recipe/edit/${item.id}`); }}
              >
                <Ionicons name="pencil-outline" size={11} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.gridActionBtn, styles.gridActionBtnDel]}
                onPress={(e) => { (e as any).stopPropagation?.(); handleDelete(item.id); }}
                disabled={isDeleting}
              >
                {isDeleting
                  ? <ActivityIndicator size={10} color="#fff" />
                  : <Ionicons name="trash-outline" size={11} color="#fff" />
                }
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push('/settings')}>
            <Ionicons name="settings-outline" size={20} color={COLORS.text2} />
          </TouchableOpacity>

          <View style={styles.headerTop}>
            <View style={styles.avatarWrap}>
              {user?.avatar
                ? <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
                : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarLetter}>
                      {(user?.name ?? '?')[0].toUpperCase()}
                    </Text>
                  </View>
                )
              }
              <View style={styles.avatarRing} />
            </View>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{user?.recipes_count ?? 0}</Text>
                <Text style={styles.statLabel}>Receitas</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{user?.followers ?? 0}</Text>
                <Text style={styles.statLabel}>Seguidores</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{user?.following ?? 0}</Text>
                <Text style={styles.statLabel}>A seguir</Text>
              </View>
            </View>
          </View>

          <Text style={styles.name}>{user?.name ?? ''}</Text>
          <Text style={styles.usernameText}>@{user?.username ?? ''}</Text>
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
          {user?.bio ? (
            <Text style={styles.bio}>{user.bio}</Text>
          ) : null}

        </View>

        {/* Streak + Badges lado a lado */}
        <View style={styles.rowCards}>
          {/* Streak — calendário */}
          <View style={styles.streakCard}>
            {/* Header */}
            <View style={styles.streakHeader}>
              <Ionicons name="flame" size={14} color={COLORS.star} />
              <Text style={styles.streakTitle}>
                {new Date().toLocaleDateString('pt-PT', { month: 'long' })}
              </Text>
              <Text style={styles.streakBigNumText}>{streak}🔥</Text>
            </View>

            {/* Dias da semana */}
            <View style={styles.calWeekRow}>
              {['D','S','T','Q','Q','S','S'].map((d, i) => (
                <Text key={i} style={styles.calWeekLabel}>{d}</Text>
              ))}
            </View>

            {/* Grelha do mês */}
            <View style={styles.calGrid}>
              {(() => {
                const now = new Date();
                const year = now.getFullYear();
                const month = now.getMonth();
                const firstDay = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const cells = [];
                for (let i = 0; i < firstDay; i++) {
                  cells.push(<View key={`e-${i}`} style={styles.calCell} />);
                }
                for (let d = 1; d <= daysInMonth; d++) {
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  const cooked = cookedDateSet.has(dateStr);
                  const isToday = d === now.getDate();
                  cells.push(
                    <View key={d} style={[styles.calCell, cooked && styles.calCellCooked, isToday && !cooked && styles.calCellToday]}>
                      <Text style={[styles.calCellText, cooked && styles.calCellTextCooked, isToday && !cooked && styles.calCellTextToday]}>{d}</Text>
                    </View>
                  );
                }
                return cells;
              })()}
            </View>
          </View>

          {/* Badges */}
          <View style={styles.badgesCard}>
            <Text style={styles.sectionTitle}>Conquistas</Text>
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
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
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
              {activeTab === 'Guardadas' ? 'Ainda sem receitas guardadas' :
               activeTab === 'Cozinhei' ? 'Ainda sem receitas marcadas' :
               'Ainda sem receitas publicadas'}
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
                <Text style={styles.badgeTooltipLockedText}>Bloqueada</Text>
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
    backgroundColor: COLORS.surface1,
    padding: 20,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
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
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 16 },
  avatarWrap: { position: 'relative', width: 84, height: 84 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: COLORS.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: { width: 84, height: 84, borderRadius: 42 },
  avatarLetter: { fontSize: 34, fontWeight: '900', color: COLORS.primary, fontFamily: FONTS.titleBlack },
  avatarRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 48,
    borderWidth: 2.5,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },

  statsRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statNumber: { fontSize: 24, fontWeight: '900', color: COLORS.primary, letterSpacing: -0.5, fontFamily: FONTS.titleBlack },
  statLabel: { fontSize: 11, color: COLORS.text3, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, fontFamily: FONTS.body },
  statDivider: { width: 1, height: 30, backgroundColor: COLORS.border },

  name: { fontSize: 21, fontWeight: '900', color: COLORS.text1, marginBottom: 3, letterSpacing: -0.3, fontFamily: FONTS.titleBold },
  usernameText: { fontSize: 13, color: COLORS.text3, marginBottom: 8, fontWeight: '500', fontFamily: FONTS.body },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
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
  bio: { fontSize: 14, color: COLORS.text2, lineHeight: 21, marginBottom: 14, fontFamily: FONTS.body },

  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.borderActive,
    backgroundColor: COLORS.primaryDim,
  },
  editBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.primary, fontFamily: FONTS.bodyBold },
  logoutBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,45,85,0.25)',
    backgroundColor: 'rgba(255,45,85,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Streak + Badges row
  rowCards: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    gap: 10,
  },
  streakCard: {
    flex: 1,
    backgroundColor: COLORS.surface1,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  streakHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  streakFireIcon: {},
  streakTitle: { fontSize: 12, fontWeight: '700', color: COLORS.text1, flex: 1, textTransform: 'capitalize', fontFamily: FONTS.bodyBold },
  streakSub: { fontSize: 10, color: COLORS.text3, fontFamily: FONTS.body },
  streakBigNumText: { fontSize: 13, fontWeight: '900', color: COLORS.star, fontFamily: FONTS.titleBlack },

  calWeekRow: { flexDirection: 'row', marginBottom: 3 },
  calWeekLabel: { flex: 1, textAlign: 'center', fontSize: 8, fontWeight: '700', color: COLORS.text3, fontFamily: FONTS.bodyBold },

  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  calCellCooked: { backgroundColor: COLORS.star, borderRadius: 4 },
  calCellToday: { borderRadius: 4, borderWidth: 1, borderColor: COLORS.primary },
  calCellText: { fontSize: 8, color: COLORS.text2, fontFamily: FONTS.body },
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
    backgroundColor: COLORS.surface1,
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
    backgroundColor: COLORS.surface1,
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
  gridActions: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    gap: 4,
  },
  gridActionBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridActionBtnDel: {
    backgroundColor: 'rgba(255,90,90,0.70)',
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
