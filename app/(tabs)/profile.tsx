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
import { api } from '../../services/api';

const TABS = ['Receitas', 'Guardadas', 'Cozinhei'];

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
    if (!item) return <View style={[styles.gridCard, { opacity: 0, pointerEvents: 'none' as any }]} />;
    const id = String(item.id);
    const isCooked = cookedRecipes.includes(id);
    const isDeleting = deletingId === item.id;
    const isOwn = activeTab === 'Receitas';
    const totalTime = (item.prep_time ?? 0) + (item.cook_time ?? 0);

    return (
      <View style={styles.gridCard}>
        <TouchableOpacity onPress={() => router.push(`/recipe/${item.id}`)}>
          <View style={styles.gridImagePlaceholder}>
            {item.image
              ? <Image source={{ uri: item.image }} style={styles.gridPhoto} resizeMode="cover" />
              : <Ionicons name="restaurant-outline" size={24} color={COLORS.text3} />
            }
            {isOwn && (
              <>
                <TouchableOpacity
                  style={styles.editBtn2}
                  onPress={() => router.push(`/recipe/edit/${item.id}`)}
                >
                  <Ionicons name="pencil-outline" size={13} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(item.id)}
                  disabled={isDeleting}
                >
                  {isDeleting
                    ? <ActivityIndicator size="small" color={COLORS.accent} />
                    : <Ionicons name="trash-outline" size={13} color={COLORS.accent} />
                  }
                </TouchableOpacity>
              </>
            )}
          </View>
          <View style={styles.gridCardContent}>
            <Text style={styles.gridTitle} numberOfLines={2}>{item.title}</Text>
            <View style={styles.gridMeta}>
              <Ionicons name="time-outline" size={11} color={COLORS.text3} />
              <Text style={styles.gridMetaText}>{totalTime}min</Text>
            </View>
          </View>
        </TouchableOpacity>
        <View style={styles.gridActions}>
          <TouchableOpacity
            style={[styles.gridActionBtn, styles.gridActionBtnBorder, isCooked && styles.gridActionBtnActive]}
            onPress={() => toggleCooked(id)}
          >
            <Ionicons
              name={isCooked ? 'checkmark-circle' : 'checkmark-circle-outline'}
              size={14}
              color={isCooked ? COLORS.bg : COLORS.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.gridActionBtn}
            onPress={() => addToShoppingList(id, item.ingredients ?? [], item.title)}
          >
            <Ionicons name="cart-outline" size={14} color={COLORS.text2} />
          </TouchableOpacity>
        </View>
      </View>
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
          {user?.cooking_type ? (
            <View style={styles.cookingTypeBadge}>
              <Text style={styles.cookingTypeText}>{user.cooking_type}</Text>
            </View>
          ) : null}
          {user?.bio ? (
            <Text style={styles.bio}>{user.bio}</Text>
          ) : null}

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => router.push('/auth/setup-profile')}
            >
              <Ionicons name="pencil-outline" size={15} color={COLORS.primary} />
              <Text style={styles.editBtnText}>Editar Perfil</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => { logout(); router.replace('/auth/login'); }}
            >
              <Ionicons name="log-out-outline" size={18} color={COLORS.accent} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Streak Card */}
        <View style={styles.streakCard}>
          <View style={styles.streakTop}>
            <View style={styles.streakFireIcon}>
              <Ionicons name="flame" size={22} color={COLORS.star} />
            </View>
            <View style={{ flex: 1 }}>
              {streak > 0 ? (
                <Text style={styles.streakTitle}>
                  {streak} {streak === 1 ? 'dia' : 'dias'} de streak!
                </Text>
              ) : (
                <Text style={styles.streakTitle}>Sem streak ativo</Text>
              )}
              <Text style={styles.streakSub}>
                {streak > 0
                  ? 'Continua a cozinhar todos os dias'
                  : 'Cozinha hoje para começar o streak'}
              </Text>
            </View>
            <View style={styles.streakBigNum}>
              <Text style={styles.streakBigNumText}>{streak}</Text>
            </View>
          </View>
          <View style={styles.streakDays}>
            {last7.map((day) => {
              const active = cookedDateSet.has(day.date);
              return (
                <View key={day.date} style={[styles.streakDay, active && styles.streakDayActive]}>
                  <Text style={[styles.streakDayText, active && styles.streakDayTextActive]}>
                    {day.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Badges */}
        <View style={styles.badgesSection}>
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
                  ? <Ionicons name={badge.icon as any} size={18} color={badge.color} />
                  : <Ionicons name="lock-closed-outline" size={13} color={COLORS.text3} />
                }
              </View>
            ))}
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
            data={displayList.length % 2 !== 0 ? [...displayList, null] : displayList}
            renderItem={renderRecipeCard}
            keyExtractor={(item, index) => item ? String(item.id) : `spacer-${index}`}
            numColumns={2}
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
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
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
  avatarLetter: { fontSize: 34, fontWeight: '900', color: COLORS.primary },
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
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },

  statsRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statNumber: { fontSize: 24, fontWeight: '900', color: COLORS.primary, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: COLORS.text3, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  statDivider: { width: 1, height: 30, backgroundColor: COLORS.border },

  name: { fontSize: 21, fontWeight: '900', color: COLORS.text1, marginBottom: 3, letterSpacing: -0.3 },
  usernameText: { fontSize: 13, color: COLORS.text3, marginBottom: 8, fontWeight: '500' },
  cookingTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryDim,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.borderActive,
  },
  cookingTypeText: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },
  bio: { fontSize: 14, color: COLORS.text2, lineHeight: 21, marginBottom: 14 },

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
  editBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
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

  // Streak
  streakCard: {
    margin: 16,
    backgroundColor: COLORS.surface1,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  streakTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  streakFireIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,184,0,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,184,0,0.30)',
    shadowColor: COLORS.star,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  streakTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text1, letterSpacing: -0.2 },
  streakSub: { fontSize: 12, color: COLORS.text3, marginTop: 2 },
  streakBigNum: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,184,0,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,184,0,0.30)',
  },
  streakBigNumText: { fontSize: 22, fontWeight: '900', color: COLORS.star, letterSpacing: -0.5 },
  streakDays: { flexDirection: 'row', gap: 6 },
  streakDay: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  streakDayActive: {
    backgroundColor: COLORS.star,
    borderColor: COLORS.star,
    shadowColor: COLORS.star,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 8,
    elevation: 5,
  },
  streakDayText: { fontSize: 11, fontWeight: '700', color: COLORS.text3 },
  streakDayTextActive: { color: '#150F00' },

  // Badges
  badgesSection: {
    marginHorizontal: 16,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text3,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 4,
  },
  badgesIconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  badgeSmallIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 20,
    gap: 4,
  },
  badgeTooltipRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  badgeTooltipLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text1, flex: 1 },
  badgeTooltipDesc: { fontSize: 12, color: COLORS.text3, lineHeight: 17 },
  badgeTooltipLockedPill: {
    backgroundColor: COLORS.surface1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badgeTooltipLockedText: { fontSize: 10, color: COLORS.text3, fontWeight: '600' },

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
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.text3 },
  tabTextActive: { color: COLORS.primary, fontWeight: '800' },

  loadingWrap: { paddingVertical: 40, alignItems: 'center' },

  gridContent: { padding: 12, gap: 10 },
  gridRow: { gap: 10 },
  gridCard: {
    flex: 1,
    backgroundColor: COLORS.surface1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  gridImagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  gridPhoto: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    width: '100%',
    height: '100%',
  },
  editBtn2: {
    position: 'absolute',
    top: 7,
    left: 7,
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.primaryDim,
    borderWidth: 1,
    borderColor: COLORS.borderActive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,45,85,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,45,85,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCardContent: { padding: 9 },
  gridTitle: { fontSize: 12, fontWeight: '700', color: COLORS.text1, lineHeight: 17, marginBottom: 4 },
  gridMeta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  gridMetaText: { fontSize: 11, color: COLORS.text3 },
  gridActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  gridActionBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridActionBtnBorder: {
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  gridActionBtnActive: {
    backgroundColor: COLORS.primary,
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
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  emptyTabText: { fontSize: 14, color: COLORS.text2, textAlign: 'center', paddingHorizontal: 40 },
});
