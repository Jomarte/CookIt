import { useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store/useStore';
import { COLORS } from '../../constants/Colors';
import { FONTS } from '../../constants/Fonts';
import { api } from '../../services/api';

const FILTERS = ['Todos', 'Popular', 'Rápido', 'Saudável'];

const DIFF_COLORS: Record<string, string> = {
  'Fácil': COLORS.green,
  'Médio': COLORS.star,
  'Difícil': COLORS.accent,
};

export default function FeedScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuRecipe, setMenuRecipe] = useState<any | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const { savedRecipes, cookedRecipes, toggleSaved, toggleCooked, addToShoppingList, notifications, markAllRead } = useStore();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const loadRecipes = useCallback(async () => {
    try {
      const data = await api.getRecipes();
      setRecipes(data);
    } catch {
      // backend offline
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadRecipes(); }, [loadRecipes]);

  const onRefresh = () => { setRefreshing(true); loadRecipes(); };

  const filtered = recipes.filter((r) => {
    if (activeFilter === 'Popular') return (r.likes ?? 0) >= 0;
    if (activeFilter === 'Rápido') return (r.prep_time + r.cook_time) <= 30;
    if (activeFilter === 'Saudável') return r.diet?.includes('Vegan') || r.diet?.includes('Vegetariano');
    return true;
  });

  const renderPost = ({ item: recipe }: { item: any }) => {
    const id = String(recipe.id);
    const isSaved = savedRecipes.includes(id);
    const isCooked = cookedRecipes.includes(id);
    const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);
    const diffColor = DIFF_COLORS[recipe.difficulty] ?? COLORS.text2;
    const initial = (recipe.author_name ?? '?')[0].toUpperCase();

    return (
      <View style={styles.card}>
        {/* Author Row */}
        <View style={styles.cardHeader}>
          <TouchableOpacity
            style={styles.cardHeaderLeft}
            onPress={() => router.push(`/user/${recipe.author_id}`)}
            activeOpacity={0.7}
          >
            {recipe.author_avatar
              ? <Image source={{ uri: recipe.author_avatar }} style={styles.avatarImg} />
              : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarLetter}>{initial}</Text>
                </View>
              )
            }
            <View>
              <Text style={styles.authorName}>{recipe.author_name ?? 'Utilizador'}</Text>
              <Text style={styles.authorUsername}>@{recipe.author_username ?? ''}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.moreBtn}
            onPress={(e) => {
              const target = (e.target as any);
              if (target?.measure) {
                target.measure((_x: number, _y: number, width: number, height: number, pageX: number, pageY: number) => {
                  setMenuPos({ top: pageY + height + 4, right: window.innerWidth - pageX - width });
                  setMenuRecipe(recipe);
                });
              } else {
                setMenuPos({ top: 80, right: 16 });
                setMenuRecipe(recipe);
              }
            }}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={COLORS.text3} />
          </TouchableOpacity>
        </View>

        {/* Image */}
        <TouchableOpacity activeOpacity={0.9} onPress={() => router.push(`/recipe/${recipe.id}`)}>
          <View style={styles.imageWrap}>
            {recipe.image
              ? <Image source={{ uri: recipe.image }} style={styles.imagePhoto} resizeMode="cover" />
              : <View style={styles.imagePlaceholder}>
                  <Ionicons name="restaurant-outline" size={44} color={COLORS.surface3} />
                </View>
            }
            {/* Badges */}
            <View style={styles.imageBadges}>
              <View style={[styles.diffBadge, { borderColor: diffColor }]}>
                <Text style={[styles.diffBadgeText, { color: diffColor }]}>{recipe.difficulty}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.saveOverlayBtn, isSaved && styles.saveOverlayBtnActive]}
              onPress={() => toggleSaved(id)}
            >
              <Ionicons
                name={isSaved ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={isSaved ? COLORS.primary : COLORS.text2}
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* Content */}
        <View style={styles.cardContent}>
          <TouchableOpacity onPress={() => router.push(`/recipe/${recipe.id}`)}>
            <Text style={styles.recipeTitle} numberOfLines={2}>{recipe.title}</Text>
          </TouchableOpacity>

          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Ionicons name="time-outline" size={13} color={COLORS.primary} />
              <Text style={styles.metaChipText}>{totalTime}min</Text>
            </View>
            {recipe.calories ? (
              <View style={styles.metaChip}>
                <Ionicons name="flame-outline" size={13} color={COLORS.accent} />
                <Text style={styles.metaChipText}>{recipe.calories} kcal</Text>
              </View>
            ) : null}
            {recipe.cost ? (
              <View style={styles.metaChip}>
                <Text style={[styles.metaChipText, { color: COLORS.green }]}>{recipe.cost}</Text>
              </View>
            ) : null}
            {recipe.rating_count > 0 ? (
              <View style={[styles.metaChip, styles.ratingChip]}>
                <Ionicons name="star" size={12} color={COLORS.star} />
                <Text style={[styles.metaChipText, { color: COLORS.star }]}>
                  {Number(recipe.rating).toFixed(1)}
                </Text>
                <Text style={styles.ratingCount}>({recipe.rating_count})</Text>
              </View>
            ) : null}
          </View>

          {recipe.diet?.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsScroll}>
              {recipe.diet.map((d: string) => (
                <View key={d} style={styles.dietTag}>
                  <Text style={styles.dietTagText}>{d}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          {/* CTAs */}
          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={[styles.ctaPrimary, isCooked && styles.ctaPrimaryActive]}
              onPress={() => toggleCooked(id)}
            >
              <Ionicons
                name={isCooked ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={17}
                color={isCooked ? COLORS.bg : COLORS.primary}
              />
              <Text style={[styles.ctaPrimaryText, isCooked && styles.ctaPrimaryTextActive]}>
                {isCooked ? 'Cozinhei!' : 'Já cozinhei'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctaGhost}
              onPress={() => addToShoppingList(id, recipe.ingredients ?? [], recipe.title)}
            >
              <Ionicons name="cart-outline" size={17} color={COLORS.text2} />
              <Text style={styles.ctaGhostText}>Lista</Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header + Filters numa linha */}
      <View style={styles.header}>
        <View style={styles.wordmark}>
          <Text style={styles.wordmarkCook}>Cook</Text>
          <Text style={styles.wordmarkIt}>It</Text>
        </View>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.notifBtn} onPress={() => setNotifOpen(true)}>
          <Ionicons name={unreadCount > 0 ? 'notifications' : 'notifications-outline'} size={20} color={unreadCount > 0 ? COLORS.primary : COLORS.text2} />
          {unreadCount > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Ionicons name="restaurant-outline" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>Sem receitas ainda</Text>
          <Text style={styles.emptyText}>Sê o primeiro a publicar uma receita!</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderPost}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.feedContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        />
      )}
      {/* Modal menu dos 3 pontos */}
      <Modal visible={menuRecipe !== null} transparent animationType="fade" onRequestClose={() => setMenuRecipe(null)}>
        <TouchableOpacity style={styles.menuModalBackdrop} activeOpacity={1} onPress={() => setMenuRecipe(null)}>
          <View style={[styles.cardMenu, { position: 'absolute', top: menuPos.top, right: menuPos.right }]} onStartShouldSetResponder={() => true}>
            <TouchableOpacity
              style={styles.cardMenuItem}
              onPress={() => { setMenuRecipe(null); router.push(`/user/${menuRecipe?.author_id}`); }}
            >
              <Ionicons name="person-outline" size={15} color={COLORS.text2} />
              <Text style={styles.cardMenuText}>Ver perfil</Text>
            </TouchableOpacity>
            <View style={styles.cardMenuDivider} />
            <TouchableOpacity
              style={styles.cardMenuItem}
              onPress={() => { toggleSaved(String(menuRecipe?.id)); setMenuRecipe(null); }}
            >
              <Ionicons
                name={savedRecipes.includes(String(menuRecipe?.id)) ? 'bookmark' : 'bookmark-outline'}
                size={15}
                color={savedRecipes.includes(String(menuRecipe?.id)) ? COLORS.primary : COLORS.text2}
              />
              <Text style={[styles.cardMenuText, savedRecipes.includes(String(menuRecipe?.id)) && { color: COLORS.primary }]}>
                {savedRecipes.includes(String(menuRecipe?.id)) ? 'Remover dos guardados' : 'Guardar receita'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Painel de Notificações */}
      <Modal visible={notifOpen} transparent animationType="fade" onRequestClose={() => setNotifOpen(false)}>
        <TouchableOpacity style={styles.notifBackdrop} activeOpacity={1} onPress={() => setNotifOpen(false)}>
          <View style={styles.notifPanel} onStartShouldSetResponder={() => true}>
            <View style={styles.notifPanelHeader}>
              <Text style={styles.notifPanelTitle}>Notificações</Text>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={() => { markAllRead(); }}>
                  <Text style={styles.notifMarkRead}>Marcar todas como lidas</Text>
                </TouchableOpacity>
              )}
            </View>
            {notifications.length === 0 ? (
              <View style={styles.notifEmpty}>
                <Ionicons name="notifications-off-outline" size={36} color={COLORS.text3} />
                <Text style={styles.notifEmptyText}>Sem notificações</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {notifications.map((n) => (
                  <View key={n.id} style={[styles.notifItem, !n.read && styles.notifItemUnread]}>
                    <View style={[styles.notifIconWrap, { backgroundColor: `${n.color}20`, borderColor: `${n.color}40` }]}>
                      <Ionicons name={n.icon as any} size={18} color={n.color} />
                    </View>
                    <View style={styles.notifItemBody}>
                      <View style={styles.notifItemTop}>
                        <Text style={styles.notifItemTitle}>{n.title}</Text>
                        {!n.read && <View style={styles.notifUnreadDot} />}
                      </View>
                      <Text style={styles.notifItemMsg}>{n.message}</Text>
                      <Text style={styles.notifItemTime}>
                        {new Date(n.createdAt).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
    backgroundColor: COLORS.surface1,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  wordmark: { flexDirection: 'row', alignItems: 'baseline', flexShrink: 0 },
  wordmarkCook: {
    fontSize: 26,
    fontWeight: '900',
    fontStyle: 'italic',
    color: COLORS.text1,
    letterSpacing: -0.5,
    fontFamily: FONTS.titleBlack,
  },
  wordmarkIt: {
    fontSize: 26,
    fontWeight: '900',
    fontStyle: 'italic',
    color: COLORS.primary,
    letterSpacing: -0.5,
    textShadowColor: COLORS.primaryGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    fontFamily: FONTS.titleBlack,
  },
  notifBtn: { position: 'relative', width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  notifBadge: {
    position: 'absolute', top: 4, right: 4,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: COLORS.surface1,
  },
  notifBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },

  notifBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
  },
  notifPanel: {
    backgroundColor: COLORS.bg, borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
    maxHeight: '75%', borderBottomWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 12,
  },
  notifPanelHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  notifPanelTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text1, fontFamily: FONTS.titleBold },
  notifMarkRead: { fontSize: 12, fontWeight: '600', color: COLORS.primary, fontFamily: FONTS.body },
  notifEmpty: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  notifEmptyText: { fontSize: 14, color: COLORS.text3, fontFamily: FONTS.body },
  notifItem: {
    flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  notifItemUnread: { backgroundColor: COLORS.surface1 },
  notifIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0,
  },
  notifItemBody: { flex: 1 },
  notifItemTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  notifItemTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text1, flex: 1, fontFamily: FONTS.bodyBold },
  notifUnreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.primary },
  notifItemMsg: { fontSize: 12, color: COLORS.text2, lineHeight: 17, marginBottom: 4, fontFamily: FONTS.body },
  notifItemTime: { fontSize: 10, color: COLORS.text3, fontWeight: '500', fontFamily: FONTS.body },

  filtersWrap: { flex: 1 },
  filtersContent: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    paddingVertical: 2,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterPillActive: {
    backgroundColor: COLORS.primaryDim,
    borderColor: COLORS.borderActive,
  },
  filterText: { fontSize: 11, fontWeight: '600', color: COLORS.text3, fontFamily: FONTS.body },
  filterTextActive: { color: COLORS.primary, fontFamily: FONTS.bodyBold },

  feedContent: { paddingTop: 14, paddingBottom: 28, gap: 14 },

  card: {
    backgroundColor: COLORS.surface1,
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryDim,
    borderWidth: 2,
    borderColor: COLORS.borderActive,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  avatarImg: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: COLORS.borderActive },
  avatarLetter: { fontSize: 15, fontWeight: '800', color: COLORS.primary, fontFamily: FONTS.bodyBold },
  authorName: { fontSize: 14, fontWeight: '700', color: COLORS.text1, letterSpacing: -0.2, fontFamily: FONTS.bodyBold },
  authorUsername: { fontSize: 12, color: COLORS.text3, marginTop: 1, fontFamily: FONTS.body },
  moreBtn: { padding: 6 },
  menuModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  cardMenu: {
    backgroundColor: COLORS.surface2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 210,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 30,
    overflow: 'hidden',
  },
  cardMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardMenuText: { fontSize: 14, color: COLORS.text2, fontWeight: '500' },
  cardMenuDivider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 10 },
  imageWrap: {
    height: 300,
    backgroundColor: COLORS.surface2,
    position: 'relative',
    overflow: 'hidden',
  },
  imagePhoto: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageBadges: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    gap: 6,
  },
  diffBadge: {
    backgroundColor: 'rgba(9,9,18,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  diffBadgeText: { fontSize: 11, fontWeight: '700' },
  saveOverlayBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(9,9,18,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  saveOverlayBtnActive: {
    backgroundColor: COLORS.primaryDim,
    borderColor: COLORS.borderActive,
  },

  cardContent: { padding: 14 },
  recipeTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.text1,
    marginBottom: 10,
    letterSpacing: -0.4,
    lineHeight: 25,
    fontFamily: FONTS.titleBold,
  },

  metaRow: { flexDirection: 'row', gap: 7, marginBottom: 10, flexWrap: 'wrap' },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surface2,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metaChipText: { fontSize: 12, color: COLORS.text2, fontWeight: '600', fontFamily: FONTS.body },
  ratingChip: { borderColor: `${COLORS.star}40` },
  ratingCount: { fontSize: 11, color: COLORS.text3, fontWeight: '500' },

  tagsScroll: { marginBottom: 12 },
  dietTag: {
    backgroundColor: COLORS.greenDim,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.3)',
  },
  dietTagText: { fontSize: 11, color: COLORS.green, fontWeight: '600', fontFamily: FONTS.body },

  ctaRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  ctaPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.borderActive,
    backgroundColor: COLORS.primaryDim,
  },
  ctaPrimaryActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  ctaPrimaryText: { fontSize: 13, fontWeight: '700', color: COLORS.primary, fontFamily: FONTS.bodyBold },
  ctaPrimaryTextActive: { color: COLORS.bg },
  ctaGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ctaGhostText: { fontSize: 13, fontWeight: '600', color: COLORS.text2, fontFamily: FONTS.body },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 40 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryDim,
    borderWidth: 1,
    borderColor: COLORS.borderActive,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text1, fontFamily: FONTS.titleBold },
  emptyText: { fontSize: 14, color: COLORS.text2, textAlign: 'center', lineHeight: 22, fontFamily: FONTS.body },
});
