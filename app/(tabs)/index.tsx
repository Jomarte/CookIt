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
  Share,
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
  const [likedRecipes, setLikedRecipes] = useState<Record<string, boolean>>({});
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
    const isLiked = likedRecipes[id] ?? false;
    const likeCount = (recipe.likes ?? 0) + (isLiked ? 1 : 0);
    const commentCount = recipe.comments_count ?? 0;
    const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);
    const diffColor = DIFF_COLORS[recipe.difficulty] ?? COLORS.text2;
    const initial = (recipe.author_name ?? '?')[0].toUpperCase();

    const handleLike = () => {
      setLikedRecipes((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handleShare = async () => {
      try {
        await Share.share({
          message: `Experimenta esta receita: "${recipe.title}" — no CookIt! 🍽️`,
          title: recipe.title,
        });
      } catch {}
    };

    return (
      <View style={styles.post}>
        {/* Author bar — top of post, acts as separator between posts */}
        <View style={styles.postHeader}>
          <TouchableOpacity
            style={styles.postHeaderLeft}
            onPress={() => router.push(`/user/${recipe.author_id}`)}
            activeOpacity={0.7}
          >
            {recipe.author_avatar
              ? <Image source={{ uri: recipe.author_avatar }} style={styles.authorAvatar} />
              : <View style={styles.authorAvatarPlaceholder}>
                  <Text style={styles.authorAvatarLetter}>{initial}</Text>
                </View>
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

        {/* Full-bleed image */}
        <TouchableOpacity activeOpacity={0.97} onPress={() => router.push(`/recipe/${recipe.id}`)}>
          <View style={styles.imageContainer}>
            {recipe.image
              ? <Image source={{ uri: recipe.image }} style={styles.image} resizeMode="cover" />
              : <View style={styles.imagePlaceholder}>
                  <Ionicons name="restaurant-outline" size={56} color={COLORS.surface3} />
                </View>
            }
            {/* Difficulty badge — top left */}
            <View style={[styles.diffBadge, { borderColor: diffColor }]}>
              <Text style={[styles.diffBadgeText, { color: diffColor }]}>{recipe.difficulty}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Social actions row */}
        <View style={styles.socialRow}>
          <TouchableOpacity style={styles.socialBtn} onPress={handleLike} activeOpacity={0.7}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={24}
              color={isLiked ? '#E53935' : COLORS.text2}
            />
            {likeCount > 0 && (
              <Text style={[styles.socialCount, isLiked && { color: '#E53935' }]}>
                {likeCount >= 1000 ? `${(likeCount / 1000).toFixed(1)}K` : likeCount}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.socialBtn}
            onPress={() => router.push(`/recipe/${recipe.id}`)}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-outline" size={22} color={COLORS.text2} />
            {commentCount > 0 && (
              <Text style={styles.socialCount}>{commentCount}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialBtn} onPress={handleShare} activeOpacity={0.7}>
            <Ionicons name="paper-plane-outline" size={22} color={COLORS.text2} />
          </TouchableOpacity>

          {/* Spacer — bookmark far right */}
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={[styles.socialBtn, isSaved && { opacity: 1 }]}
            onPress={() => toggleSaved(id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={isSaved ? COLORS.primary : COLORS.text2}
            />
          </TouchableOpacity>
        </View>

        {/* Content below image */}
        <View style={styles.postBody}>
          <TouchableOpacity onPress={() => router.push(`/recipe/${recipe.id}`)}>
            <Text style={styles.postTitle} numberOfLines={2}>{recipe.title}</Text>
          </TouchableOpacity>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={13} color={COLORS.text3} />
              <Text style={styles.metaText}>{totalTime}min</Text>
            </View>
            {recipe.calories ? (
              <View style={styles.metaItem}>
                <Ionicons name="flame-outline" size={13} color={COLORS.accent} />
                <Text style={styles.metaText}>{recipe.calories} kcal</Text>
              </View>
            ) : null}
            {recipe.cost ? (
              <View style={styles.metaItem}>
                <Text style={[styles.metaText, { color: COLORS.green }]}>{recipe.cost}</Text>
              </View>
            ) : null}
            {recipe.rating_count > 0 ? (
              <View style={styles.metaItem}>
                <Ionicons name="star" size={12} color={COLORS.star} />
                <Text style={[styles.metaText, { color: COLORS.star }]}>{Number(recipe.rating).toFixed(1)}</Text>
                <Text style={styles.metaCount}>({recipe.rating_count})</Text>
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

          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={[styles.ctaCook, isCooked && styles.ctaCookActive]}
              onPress={() => toggleCooked(id)}
            >
              <Ionicons
                name={isCooked ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={16}
                color={isCooked ? '#fff' : COLORS.primary}
              />
              <Text style={[styles.ctaCookText, isCooked && styles.ctaCookTextActive]}>
                {isCooked ? 'Cozinhei!' : 'Já cozinhei'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctaCart}
              onPress={() => addToShoppingList(id, recipe.ingredients ?? [], recipe.title)}
            >
              <Ionicons name="cart-outline" size={16} color={COLORS.text2} />
              <Text style={styles.ctaCartText}>Lista</Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.wordmark}>
          <Text style={styles.wordmarkCook}>Cook</Text>
          <Text style={styles.wordmarkIt}>It</Text>
        </View>

        {/* Filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersWrap}
          contentContainerStyle={styles.filtersContent}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterPill, activeFilter === f && styles.filterPillActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.notifBtn} onPress={() => router.push('/rankings')}>
          <Ionicons name="trophy-outline" size={20} color={COLORS.text2} />
        </TouchableOpacity>

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
    paddingVertical: 10,
    backgroundColor: COLORS.surface1,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  wordmark: { flexDirection: 'row', alignItems: 'baseline', flexShrink: 0 },
  wordmarkCook: {
    fontSize: 24,
    fontWeight: '900',
    fontStyle: 'italic',
    color: COLORS.text1,
    letterSpacing: -0.5,
    fontFamily: FONTS.titleBlack,
  },
  wordmarkIt: {
    fontSize: 24,
    fontWeight: '900',
    fontStyle: 'italic',
    color: COLORS.primary,
    letterSpacing: -0.5,
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

  filtersWrap: { flex: 1 },
  filtersContent: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: 2 },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterPillActive: { backgroundColor: COLORS.primaryDim, borderColor: COLORS.borderActive },
  filterText: { fontSize: 12, fontWeight: '600', color: COLORS.text3, fontFamily: FONTS.body },
  filterTextActive: { color: COLORS.primary, fontFamily: FONTS.bodyBold },

  feedContent: { paddingBottom: 32 },

  // ── Post ──────────────────────────────────────────────────────────────────
  post: { backgroundColor: COLORS.surface1 },

  // Author bar at top of post (acts as separator between posts)
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.surface1,
  },
  postHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  moreBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Full-bleed image
  imageContainer: {
    width: '100%',
    aspectRatio: 4 / 5,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: COLORS.surface2,
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface2,
  },

  // Difficulty badge
  diffBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(0,0,0,0.52)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  diffBadgeText: { fontSize: 11, fontWeight: '700', fontFamily: FONTS.bodyBold },

  // Social actions row
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  socialCount: {
    fontSize: 13,
    color: COLORS.text2,
    fontFamily: FONTS.bodyBold,
    fontWeight: '700',
  },

  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  authorAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorAvatarLetter: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    fontFamily: FONTS.bodyBold,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text1,
    fontFamily: FONTS.bodyBold,
  },
  authorUsername: {
    fontSize: 12,
    color: COLORS.text3,
    fontFamily: FONTS.body,
  },

  // Content below image
  postBody: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 20,
  },
  postTitle: {
    fontSize: 21,
    fontFamily: FONTS.titleBold,
    color: COLORS.text1,
    marginBottom: 10,
    lineHeight: 27,
    letterSpacing: -0.3,
  },

  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  metaText: { fontSize: 12, color: COLORS.text2, fontFamily: FONTS.body, fontWeight: '600' },
  metaCount: { fontSize: 11, color: COLORS.text3, fontFamily: FONTS.body },

  tagsScroll: { marginBottom: 14 },
  dietTag: {
    backgroundColor: COLORS.greenDim,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.22)',
  },
  dietTagText: { fontSize: 11, color: COLORS.green, fontWeight: '600', fontFamily: FONTS.body },

  ctaRow: { flexDirection: 'row', gap: 10 },
  ctaCook: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.borderActive,
    backgroundColor: COLORS.primaryDim,
  },
  ctaCookActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  ctaCookText: { fontSize: 13, fontWeight: '700', color: COLORS.primary, fontFamily: FONTS.bodyBold },
  ctaCookTextActive: { color: '#fff' },
  ctaCart: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ctaCartText: { fontSize: 13, fontWeight: '600', color: COLORS.text2, fontFamily: FONTS.body },

  // Context menu
  menuModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  cardMenu: {
    backgroundColor: COLORS.surface1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 210,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  cardMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardMenuText: { fontSize: 14, color: COLORS.text2, fontWeight: '500', fontFamily: FONTS.body },
  cardMenuDivider: { height: 1, backgroundColor: COLORS.border },

  // Notifications
  notifBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-start' },
  notifPanel: {
    backgroundColor: COLORS.surface1,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
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
  notifItemUnread: { backgroundColor: COLORS.surface2 },
  notifIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0,
  },
  notifItemBody: { flex: 1 },
  notifItemTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  notifItemTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text1, flex: 1, fontFamily: FONTS.bodyBold },
  notifUnreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.primary },
  notifItemMsg: { fontSize: 12, color: COLORS.text2, lineHeight: 17, marginBottom: 4, fontFamily: FONTS.body },
  notifItemTime: { fontSize: 10, color: COLORS.text3, fontFamily: FONTS.body },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 40 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primaryDim,
    borderWidth: 1, borderColor: COLORS.borderActive,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text1, fontFamily: FONTS.titleBold },
  emptyText: { fontSize: 14, color: COLORS.text2, textAlign: 'center', lineHeight: 22, fontFamily: FONTS.body },
});
