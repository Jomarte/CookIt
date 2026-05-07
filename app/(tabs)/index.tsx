import { useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store/useStore';
import { COLORS } from '../../constants/Colors';
import { FONTS } from '../../constants/Fonts';
import { api } from '../../services/api';
import { useT } from '../../i18n';

const DIFF_COLORS: Record<string, string> = {
  'Fácil': COLORS.green,
  'Médio': COLORS.star,
  'Difícil': COLORS.red,
};

export default function FeedScreen() {
  const router = useRouter();
  const t = useT();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuRecipe, setMenuRecipe] = useState<any | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [serverUnread, setServerUnread] = useState(0);
  const { savedRecipes, toggleSaved, likedRecipes, toggleLiked, notifications, token, recipes, setRecipes } = useStore();
  const localUnread = notifications.filter((n) => !n.read).length;
  const unreadCount = localUnread + serverUnread;

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

  useEffect(() => {
    if (!token) return;
    api.getUnreadCount(token).then((r) => setServerUnread(r.count ?? 0)).catch(() => {});
  }, [token]);

  const onRefresh = () => { setRefreshing(true); loadRecipes(); };

  const filtered = recipes;

  const renderPost = ({ item: recipe }: { item: any }) => {
    const id = String(recipe.id);
    const isSaved = savedRecipes.includes(id);
    const isLiked = likedRecipes.includes(id);
    const likeCount = recipe.likes ?? 0;
    const commentCount = recipe.comments_count ?? 0;
    const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);
    const diffColor = DIFF_COLORS[recipe.difficulty] ?? COLORS.text2;
    const initial = (recipe.author_name ?? '?')[0].toUpperCase();

    const handleLikeToggle = () => toggleLiked(id);

    const handleShare = async () => {
      try {
        await Share.share({
          message: t.feed.shareMsg(recipe.title),
          title: recipe.title,
        });
      } catch {}
    };

    return (
      <View style={styles.post}>
        {/* Image (taller, 4:3 ratio) */}
        <TouchableOpacity activeOpacity={0.97} onPress={() => router.push(`/recipe/${recipe.id}`)}>
          <View style={styles.imageContainer}>
            {recipe.image
              ? <Image source={{ uri: recipe.image }} style={styles.image} resizeMode="cover" />
              : <View style={styles.imagePlaceholder}>
                  <Ionicons name="restaurant-outline" size={56} color={COLORS.surface3} />
                </View>
            }
          </View>
        </TouchableOpacity>

        {/* Meta row: difficulty badge + time + rating */}
        <View style={styles.postBody}>
          <View style={styles.metaRow}>
            <View style={[styles.diffBadgeFilled, { backgroundColor: diffColor }]}>
              <Text style={styles.diffBadgeFilledText}>{recipe.difficulty}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={13} color={COLORS.text3} />
              <Text style={styles.metaText}>{totalTime} min</Text>
            </View>
            {recipe.rating_count > 0 && (
              <View style={styles.metaItem}>
                <Ionicons name="star" size={12} color={COLORS.star} />
                <Text style={[styles.metaText, { color: COLORS.star }]}>{Number(recipe.rating).toFixed(1)}</Text>
              </View>
            )}
          </View>

          {/* Title */}
          <TouchableOpacity onPress={() => router.push(`/recipe/${recipe.id}`)}>
            <Text style={styles.postTitle} numberOfLines={2}>{recipe.title}</Text>
          </TouchableOpacity>

          {/* Diet tags */}
          {recipe.diet?.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsScroll}>
              {recipe.diet.map((d: string) => (
                <View key={d} style={styles.dietTag}>
                  <Text style={styles.dietTagText}>{d}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Author row */}
          <TouchableOpacity
            style={styles.authorRow}
            onPress={() => router.push(`/user/${recipe.author_id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.authorAvatarWrap}>
              {recipe.author_avatar
                ? <Image source={{ uri: recipe.author_avatar }} style={styles.authorAvatar} />
                : <View style={styles.authorAvatarPlaceholder}>
                    <Text style={styles.authorAvatarLetter}>{initial}</Text>
                  </View>
              }
            </View>
            <Text style={styles.authorName}>{recipe.author_name ?? t.feed.defaultAuthor}</Text>
            {recipe.author_nationality && (
              <Text style={styles.authorFlag}>{recipe.author_nationality}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Social actions */}
        <View style={styles.socialRow}>
          <TouchableOpacity style={styles.socialBtn} onPress={handleLikeToggle} activeOpacity={0.7}>
            <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={22} color={isLiked ? '#E53935' : COLORS.text2} />
            <Text style={[styles.socialCount, isLiked && { color: '#E53935' }]}>
              {likeCount >= 1000 ? `${(likeCount / 1000).toFixed(1)}K` : likeCount}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialBtn} onPress={() => router.push(`/recipe/${recipe.id}?tab=Coment%C3%A1rios`)} activeOpacity={0.7}>
            <Ionicons name="chatbubble-outline" size={20} color={COLORS.text2} />
            {commentCount > 0 && <Text style={styles.socialCount}>{commentCount}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialBtn} onPress={handleShare} activeOpacity={0.7}>
            <Ionicons name="paper-plane-outline" size={20} color={COLORS.text2} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.socialBtn} onPress={() => toggleSaved(id)} activeOpacity={0.7}>
            <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={20} color={isSaved ? COLORS.primary : COLORS.text2} />
          </TouchableOpacity>
        </View>

        {/* 3-dot menu (top-right corner of card) */}
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
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.wordmark}>
          <Text style={styles.wordmarkCook}>C</Text>
          <Text style={styles.wordmarkIt}>K</Text>
        </View>

        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.notifBtn} onPress={() => router.push('/rankings')}>
          <Ionicons name="trophy-outline" size={20} color={COLORS.text2} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.notifBtn} onPress={() => { setServerUnread(0); router.push('/notifications'); }}>
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
          <Text style={styles.emptyTitle}>{t.feed.emptyTitle}</Text>
          <Text style={styles.emptyText}>{t.feed.emptyDesc}</Text>
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
              <Text style={styles.cardMenuText}>{t.feed.viewProfile}</Text>
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
                {savedRecipes.includes(String(menuRecipe?.id)) ? t.feed.unsave : t.feed.saveRecipe}
              </Text>
            </TouchableOpacity>
            <View style={styles.cardMenuDivider} />
            <TouchableOpacity
              style={styles.cardMenuItem}
              onPress={async () => {
                const recipe = menuRecipe;
                setMenuRecipe(null);
                try {
                  await Share.share({
                    message: t.feed.shareMsg(recipe?.title ?? ''),
                    title: recipe?.title,
                  });
                } catch {}
              }}
            >
              <Ionicons name="share-social-outline" size={15} color={COLORS.text2} />
              <Text style={styles.cardMenuText}>{t.feed.share}</Text>
            </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 0,
    gap: 10,
  },
  wordmark: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  wordmarkCook: { fontSize: 28, fontWeight: '900', color: COLORS.text1, letterSpacing: -1, fontFamily: FONTS.titleBlack },
  wordmarkIt: { fontSize: 28, fontWeight: '900', color: COLORS.primary, letterSpacing: -1, fontFamily: FONTS.titleBlack },
  notifBtn: { position: 'relative', width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  notifBadge: {
    position: 'absolute', top: 4, right: 4,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: COLORS.surface1,
  },
  notifBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },

  feedContent: { paddingBottom: 32, paddingHorizontal: 12, paddingTop: 12 },

  // ── Post ──────────────────────────────────────────────────────────────────
  post: {
    backgroundColor: COLORS.surface1,
    borderRadius: 20,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative' as const,
  },

  moreBtn: {
    position: 'absolute' as const,
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  // Image (4:3 ratio)
  imageContainer: {
    width: '100%' as const,
    aspectRatio: 4 / 3,
    position: 'relative' as const,
    overflow: 'hidden' as const,
    backgroundColor: COLORS.surface2,
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: COLORS.surface2,
  },

  // Difficulty badge (filled)
  diffBadgeFilled: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  diffBadgeFilledText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#fff',
    fontFamily: FONTS.bodyBold,
  },

  // Social actions row
  socialRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
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

  authorRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    marginTop: 12,
  },
  authorAvatarWrap: {
    width: 32,
    height: 32,
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  authorAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  authorAvatarLetter: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: '#fff',
    fontFamily: FONTS.bodyBold,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: COLORS.text2,
    fontFamily: FONTS.bodyBold,
  },
  authorFlag: {
    fontSize: 16,
  },

  // Content below image
  postBody: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  postTitle: {
    fontSize: 19,
    fontFamily: FONTS.titleBlack,
    color: COLORS.text1,
    marginBottom: 6,
    lineHeight: 25,
    letterSpacing: -0.4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metaText: { fontSize: 12, color: COLORS.text2, fontFamily: FONTS.body, fontWeight: '600' },

  tagsScroll: { marginTop: 10 },
  dietTag: {
    backgroundColor: COLORS.greenDim,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.22)',
  },
  dietTagText: { fontSize: 11, color: COLORS.green, fontWeight: '600', fontFamily: FONTS.body },

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
