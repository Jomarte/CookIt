import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store/useStore';
import { COLORS } from '../../constants/Colors';
import { FONTS } from '../../constants/Fonts';
import { api } from '../../services/api';
import { useT } from '../../i18n';

const TAB_KEYS = ['Receita', 'Comentários'] as const;

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useT();
  const r = t.recipe;
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<typeof TAB_KEYS[number]>('Receita');
  const [servings, setServings] = useState(2);
  const { savedRecipes, cookedRecipes, shoppingList, toggleSaved, toggleCooked, addToShoppingList, setRating, userRatings, token, user, language } = useStore();
  const userRating = userRatings[String(id)] ?? 0;
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cookedCountOffset, setCookedCountOffset] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    api.getRecipe(id).then((data) => {
      setRecipe(data);
      setServings(data.servings ?? 2);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (activeTab !== 'Comentários') return;
    setCommentsLoading(true);
    api.getComments(id).then(setComments).catch(() => {}).finally(() => setCommentsLoading(false));
  }, [activeTab, id]);

  const insets = useSafeAreaInsets();

  const handlePostComment = async () => {
    if (!commentText.trim() || !token) return;
    setSubmitting(true);
    try {
      const newComment = await api.postComment(token, id, commentText.trim());
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
      setRecipe((prev: any) => prev ? { ...prev, comments_count: (prev.comments_count ?? 0) + 1 } : prev);
    } catch (e: any) {
      if (Platform.OS === 'web') alert(e.message);
      else Alert.alert(t.common.error, e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={[styles.floatBackBtn, { top: insets.top + 16 }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text1} />
        </TouchableOpacity>
        <View style={styles.loadingWrap}>
          <Text style={styles.notFoundText}>{r.notFound}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isSaved = savedRecipes.includes(String(recipe.id));
  const isCooked = cookedRecipes.includes(String(recipe.id));
  const isInList = shoppingList.some((i) => i.recipeId === String(recipe.id));
  const isOwn = user && String(recipe.author_id) === String(user.id);

  const handleDelete = () => {
    const doDelete = async () => {
      try {
        await api.deleteRecipe(token!, recipe.id);
        router.back();
      } catch (e: any) {
        if (Platform.OS === 'web') alert(e.message);
        else Alert.alert(t.common.error, e.message);
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(r.deleteMsg)) doDelete();
    } else {
      Alert.alert(r.deleteTitle, r.deleteMsg, [
        { text: t.common.cancel, style: 'cancel' },
        { text: t.common.delete, style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const ratio = servings / (recipe.servings || 1);
  const initial = (recipe.author_name ?? '?')[0].toUpperCase();

  const handleRate = async (star: number) => {
    setRating(String(recipe.id), star);
    if (token) {
      try {
        const stats = await api.rateRecipe(token, recipe.id, star);
        setRecipe((prev: any) => ({ ...prev, rating: stats.rating, rating_count: stats.rating_count }));
      } catch {}
    }
  };

  const formatAmount = (amount: string): string => {
    if (amount === 'q.b.') return 'q.b.';
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;
    const result = num * ratio;
    return result % 1 === 0 ? result.toString() : result.toFixed(1);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Back button fixo */}
      <TouchableOpacity style={[styles.floatBackBtn, { top: insets.top + 16 }]} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </TouchableOpacity>

      {/* 3 pontos fixo */}
      <TouchableOpacity style={[styles.floatMenuBtn, { top: insets.top + 16 }]} onPress={() => setMenuOpen(true)}>
        <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
      </TouchableOpacity>

      {/* Menu overlay */}
      {menuOpen && (
        <>
          <TouchableOpacity style={styles.menuBackdrop} activeOpacity={1} onPress={() => setMenuOpen(false)} />
          <View style={[styles.menuCard, { top: insets.top + 56, right: 16 }]}>
            {!isOwn && (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuOpen(false); router.push(`/user/${recipe.author_id}`); }}>
                  <Ionicons name="person-outline" size={15} color={COLORS.text2} />
                  <Text style={styles.menuItemText}>{r.viewProfile}</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
              </>
            )}
            <TouchableOpacity style={styles.menuItem} onPress={() => { toggleSaved(String(recipe.id)); setMenuOpen(false); }}>
              <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={15} color={isSaved ? COLORS.primary : COLORS.text2} />
              <Text style={[styles.menuItemText, isSaved && { color: COLORS.primary }]}>
                {isSaved ? t.feed.unsave : t.feed.saveRecipe}
              </Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={async () => {
                setMenuOpen(false);
                try {
                  await Share.share({ message: r.shareMsg(recipe.title), title: recipe.title });
                } catch {}
              }}
            >
              <Ionicons name="share-social-outline" size={15} color={COLORS.text2} />
              <Text style={styles.menuItemText}>{r.shareRecipe}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          {recipe.image
            ? <Image source={{ uri: recipe.image }} style={styles.heroImage} resizeMode="cover" />
            : <View style={styles.heroPlaceholder}>
                <Ionicons name="restaurant-outline" size={64} color={COLORS.surface3} />
              </View>
          }
          <View style={styles.heroGradient} />
        </View>

        <View style={styles.content}>
          {/* Title */}
          <Text style={styles.title}>{recipe.title}</Text>

          {/* Owner actions */}
          {isOwn && (
            <View style={styles.ownerActions}>
              <TouchableOpacity style={styles.ownerEditBtn} onPress={() => router.push(`/recipe/edit/${recipe.id}`)}>
                <Ionicons name="pencil-outline" size={15} color={COLORS.primary} />
                <Text style={styles.ownerEditText}>{t.common.edit}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ownerDeleteBtn} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={15} color="#FF5A5A" />
                <Text style={styles.ownerDeleteText}>{t.common.delete}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Meta chips */}
          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Ionicons name="time-outline" size={14} color={COLORS.primary} />
              <Text style={styles.metaChipText}>{(recipe.prep_time ?? 0) + (recipe.cook_time ?? 0)}min</Text>
            </View>
            <View style={styles.metaChip}>
              <Ionicons name="bar-chart-outline" size={14} color={COLORS.primary} />
              <Text style={styles.metaChipText}>{recipe.difficulty}</Text>
            </View>
            {recipe.calories ? (
              <View style={styles.metaChip}>
                <Ionicons name="flame-outline" size={14} color={COLORS.accent} />
                <Text style={styles.metaChipText}>{recipe.calories} kcal</Text>
              </View>
            ) : null}
            {recipe.cost ? (
              <View style={styles.metaChip}>
                <Text style={[styles.metaChipText, { color: COLORS.green }]}>{recipe.cost}</Text>
              </View>
            ) : null}
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statIcon}>
                <Ionicons name="time-outline" size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.statValue}>{recipe.prep_time ?? 0}min</Text>
              <Text style={styles.statLabel}>{r.prep}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIcon}>
                <Ionicons name="flame-outline" size={18} color={COLORS.accent} />
              </View>
              <Text style={styles.statValue}>{recipe.cook_time ?? 0}min</Text>
              <Text style={styles.statLabel}>{r.cookTime}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIcon}>
                <Ionicons name="people-outline" size={18} color={COLORS.green} />
              </View>
              <Text style={styles.statValue}>{recipe.servings ?? 2}</Text>
              <Text style={styles.statLabel}>{r.statDoses}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIcon}>
                <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.star} />
              </View>
              <Text style={styles.statValue}>{Math.max(0, (recipe.cooked_count ?? 0) + cookedCountOffset)}</Text>
              <Text style={styles.statLabel}>{r.statCooked}</Text>
            </View>
          </View>

          {/* Diet tags — junto às stats */}
          {recipe.diet?.length > 0 && (
            <View style={styles.dietRow}>
              {recipe.diet.map((d: string) => (
                <View key={d} style={styles.dietBadge}>
                  <Text style={styles.dietBadgeText}>{d}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Tabs */}
          <View style={styles.tabs}>
            {TAB_KEYS.map((tab, idx) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {idx === 0 ? r.tabRecipe : r.tabComments}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'Receita' && (
            <>
              {/* Ingredients */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{r.ingredients}</Text>
                  <View style={styles.servingsRow}>
                    <TouchableOpacity
                      style={styles.servingsBtn}
                      onPress={() => setServings(Math.max(1, servings - 1))}
                    >
                      <Ionicons name="remove" size={14} color={COLORS.primary} />
                    </TouchableOpacity>
                    <Text style={styles.servingsCount}>{r.doses(servings)}</Text>
                    <TouchableOpacity
                      style={styles.servingsBtn}
                      onPress={() => setServings(servings + 1)}
                    >
                      <Ionicons name="add" size={14} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
                {recipe.ingredients.map((ing: any) => (
                  <View key={ing.id} style={styles.ingredientRow}>
                    <View style={styles.ingredientDot} />
                    <Text style={styles.ingredientName}>{ing.name}</Text>
                    <Text style={styles.ingredientAmount}>
                      {formatAmount(ing.amount)}{ing.unit ? ' ' + ing.unit : ''}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Steps */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{r.preparation}</Text>
                <View style={{ height: 12 }} />
                {recipe.steps.map((step: any) => (
                  <View key={step.number} style={styles.stepRow}>
                    <View style={styles.stepNum}>
                      <Text style={styles.stepNumText}>{step.number}</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepText}>{step.description}</Text>
                      {step.duration ? (
                        <View style={styles.stepTimer}>
                          <Ionicons name="timer-outline" size={12} color={COLORS.primary} />
                          <Text style={styles.stepTimerText}>{step.duration} min</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>

              {/* Rate */}
              <View style={styles.rateSection}>
                <Text style={styles.rateSectionTitle}>{r.rateIt}</Text>
                {recipe.rating_count > 0 && (
                  <View style={styles.rateAvgRow}>
                    <Ionicons name="star" size={16} color={COLORS.star} />
                    <Text style={styles.rateAvgNum}>{Number(recipe.rating).toFixed(1)}</Text>
                    <Text style={styles.rateAvgCount}>{r.ratingCount(recipe.rating_count)}</Text>
                  </View>
                )}
                <View style={styles.rateStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => handleRate(star)}>
                      <Ionicons
                        name={star <= userRating ? 'star' : 'star-outline'}
                        size={34}
                        color={star <= userRating ? COLORS.star : COLORS.text3}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                {userRating > 0 && (
                  <Text style={styles.ratedText}>{r.ratedText(userRating)}</Text>
                )}
              </View>
            </>
          )}

          {activeTab === 'Comentários' && (
            <View style={styles.commentsSection}>
              {commentsLoading ? (
                <View style={styles.commentsLoading}>
                  <ActivityIndicator color={COLORS.primary} />
                </View>
              ) : comments.length === 0 ? (
                <View style={styles.emptyTab}>
                  <View style={styles.emptyTabIcon}>
                    <Ionicons name="chatbubbles-outline" size={32} color={COLORS.primary} />
                  </View>
                  <Text style={styles.emptyTabTitle}>{r.noComments}</Text>
                  <Text style={styles.emptyTabText}>{r.firstComment}</Text>
                </View>
              ) : (
                comments.map((c) => {
                  const initial = (c.author_name ?? '?')[0].toUpperCase();
                  const date = new Date(c.created_at).toLocaleDateString(language === 'en' ? 'en-US' : 'pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                  return (
                    <View key={c.id} style={styles.commentItem}>
                      {c.author_avatar
                        ? <Image source={{ uri: c.author_avatar }} style={styles.commentAvatar} />
                        : <View style={styles.commentAvatarPlaceholder}>
                            <Text style={styles.commentAvatarLetter}>{initial}</Text>
                          </View>
                      }
                      <View style={styles.commentBody}>
                        <View style={styles.commentHeader}>
                          <Text style={styles.commentAuthor}>{c.author_name ?? t.feed.defaultAuthor}</Text>
                          <Text style={styles.commentDate}>{date}</Text>
                        </View>
                        <Text style={styles.commentText}>{c.text}</Text>
                      </View>
                    </View>
                  );
                })
              )}

              {/* Input para escrever comentário */}
              {token ? (
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                  <View style={styles.commentInputRow}>
                    <TextInput
                      style={styles.commentInput}
                      placeholder={r.commentPlaceholder}
                      placeholderTextColor={COLORS.text3}
                      value={commentText}
                      onChangeText={setCommentText}
                      multiline
                      maxLength={500}
                    />
                    <TouchableOpacity
                      style={[styles.commentSendBtn, (!commentText.trim() || submitting) && styles.commentSendBtnDisabled]}
                      onPress={handlePostComment}
                      disabled={!commentText.trim() || submitting}
                    >
                      {submitting
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Ionicons name="paper-plane" size={18} color="#fff" />
                      }
                    </TouchableOpacity>
                  </View>
                </KeyboardAvoidingView>
              ) : (
                <View style={styles.commentLoginNote}>
                  <Text style={styles.commentLoginNoteText}>{r.loginToComment}</Text>
                </View>
              )}
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.bottomBtnCooked, isCooked && styles.bottomBtnCookedActive]}
          onPress={() => {
            const wasCooked = cookedRecipes.includes(String(recipe.id));
            toggleCooked(String(recipe.id));
            setCookedCountOffset((prev) => prev + (wasCooked ? -1 : 1));
          }}
        >
          <Ionicons
            name={isCooked ? 'checkmark-circle' : 'checkmark-circle-outline'}
            size={20}
            color={isCooked ? COLORS.primary : COLORS.bg}
          />
          <Text style={[styles.bottomBtnCookedText, isCooked && styles.bottomBtnCookedTextActive]}>
            {isCooked ? r.cookedDone : r.cookIt}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bottomBtnList, isInList && styles.bottomBtnListActive]}
          onPress={() => addToShoppingList(String(recipe.id), recipe.ingredients ?? [], recipe.title, recipe.image)}
        >
          <Ionicons name={isInList ? 'cart' : 'cart-outline'} size={20} color={isInList ? COLORS.primary : COLORS.bg} />
          <Text style={[styles.bottomBtnListText, isInList && styles.bottomBtnListTextActive]}>
            {isInList ? r.inList : r.addToList}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, color: COLORS.text2, fontFamily: FONTS.body },

  hero: {
    height: 320,
    position: 'relative',
    backgroundColor: COLORS.surface2,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0, left: 0,
  },
  heroPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'transparent',
  },
  floatBackBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,90,90,0.3)',
  },
  floatMenuBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBackdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 30,
  },
  menuCard: {
    position: 'absolute',
    zIndex: 40,
    backgroundColor: COLORS.surface1,
    borderRadius: 16,
    paddingVertical: 6,
    minWidth: 210,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  menuItemText: { fontSize: 14, fontWeight: '600', color: COLORS.text2, fontFamily: FONTS.body },
  menuDivider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 12 },

  floatSaveBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,90,90,0.3)',
  },
  floatSaveBtnActive: {
    backgroundColor: COLORS.primaryDim,
    borderColor: COLORS.borderActive,
  },

  content: { backgroundColor: COLORS.bg, padding: 16 },

  title: {
    fontSize: 24,
    fontWeight: '900',
    fontFamily: FONTS.titleBold,
    color: COLORS.text1,
    marginBottom: 12,
    letterSpacing: -0.5,
    lineHeight: 30,
  },

  ownerActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  ownerEditBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.borderActive,
    backgroundColor: COLORS.primaryDim,
  },
  ownerEditText: { fontSize: 13, fontWeight: '700', color: COLORS.primary, fontFamily: FONTS.bodyBold },
  ownerDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,90,90,0.3)',
    backgroundColor: 'rgba(255,90,90,0.1)',
  },
  ownerDeleteText: { fontSize: 13, fontWeight: '700', color: '#FF5A5A', fontFamily: FONTS.bodyBold },

  metaRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surface2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metaChipText: { fontSize: 12, color: COLORS.text2, fontWeight: '600', fontFamily: FONTS.body },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: { fontSize: 13, fontWeight: '800', color: COLORS.text1, fontFamily: FONTS.bodyBold },
  statLabel: { fontSize: 10, color: COLORS.text3, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, fontFamily: FONTS.body },
  statDivider: { width: 1, backgroundColor: COLORS.border, alignSelf: 'stretch', marginVertical: 4 },

  dietRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  dietBadge: {
    backgroundColor: COLORS.greenDim,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.green,
  },
  dietBadgeText: { fontSize: 12, color: COLORS.green, fontWeight: '600', fontFamily: FONTS.body },

  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface1,
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 11 },
  tabActive: { backgroundColor: COLORS.primaryDim, borderWidth: 1, borderColor: COLORS.borderActive },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.text3, fontFamily: FONTS.body },
  tabTextActive: { color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.bodyBold },

  section: {
    backgroundColor: COLORS.surface1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text1, fontFamily: FONTS.titleBold },

  servingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primaryDim,
    borderRadius: 20,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.borderActive,
  },
  servingsBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  servingsCount: { fontSize: 13, fontWeight: '700', color: COLORS.primary, minWidth: 56, textAlign: 'center', fontFamily: FONTS.body },

  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  ingredientDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.primary, flexShrink: 0 },
  ingredientName: { flex: 1, fontSize: 14, color: COLORS.text1, fontWeight: '500', fontFamily: FONTS.bodyBold },
  ingredientAmount: { fontSize: 13, color: COLORS.text2, fontWeight: '600', fontFamily: FONTS.body },

  stepRow: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  stepNum: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  stepNumText: { fontSize: 14, fontWeight: '800', color: COLORS.bg, fontFamily: FONTS.bodyBold },
  stepContent: { flex: 1 },
  stepText: { fontSize: 14, color: COLORS.text1, lineHeight: 22, fontFamily: FONTS.body },
  stepTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: COLORS.primaryDim,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderActive,
  },
  stepTimerText: { fontSize: 12, color: COLORS.primary, fontWeight: '600', fontFamily: FONTS.body },

  rateSection: {
    backgroundColor: COLORS.surface1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rateSectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text1, marginBottom: 12, fontFamily: FONTS.titleBold },
  rateAvgRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 14 },
  rateAvgNum: { fontSize: 18, fontWeight: '900', color: COLORS.star, fontFamily: FONTS.bodyBold },
  rateAvgCount: { fontSize: 13, color: COLORS.text3, fontWeight: '500', fontFamily: FONTS.body },
  rateStars: { flexDirection: 'row', gap: 8 },
  ratedText: { fontSize: 14, color: COLORS.star, fontWeight: '700', marginTop: 12, fontFamily: FONTS.body },

  emptyTab: { alignItems: 'center', padding: 48, gap: 14 },
  emptyTabIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryDim,
    borderWidth: 1,
    borderColor: COLORS.borderActive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTabTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text1, fontFamily: FONTS.titleBold },
  emptyTabText: { fontSize: 14, color: COLORS.text2, textAlign: 'center', fontFamily: FONTS.body },

  // Comments
  commentsSection: { gap: 0 },
  commentsLoading: { paddingVertical: 40, alignItems: 'center' },
  commentItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  commentAvatar: { width: 38, height: 38, borderRadius: 19, flexShrink: 0 },
  commentAvatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primaryDim,
    borderWidth: 1.5,
    borderColor: COLORS.borderActive,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  commentAvatarLetter: { fontSize: 14, fontWeight: '800', color: COLORS.primary, fontFamily: FONTS.bodyBold },
  commentBody: { flex: 1 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  commentAuthor: { fontSize: 13, fontWeight: '700', color: COLORS.text1, fontFamily: FONTS.bodyBold, flex: 1 },
  commentDate: { fontSize: 11, color: COLORS.text3, fontFamily: FONTS.body },
  commentText: { fontSize: 14, color: COLORS.text1, lineHeight: 20, fontFamily: FONTS.body },

  commentInputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  commentInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: COLORS.surface2,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text1,
    fontFamily: FONTS.body,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  commentSendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  commentSendBtnDisabled: { opacity: 0.45 },
  commentLoginNote: {
    marginTop: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
  },
  commentLoginNoteText: { fontSize: 13, color: COLORS.text3, fontFamily: FONTS.body },

  bottomBar: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    paddingBottom: 24,
    backgroundColor: COLORS.surface1,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  bottomBtnCooked: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  bottomBtnCookedActive: {
    backgroundColor: COLORS.primaryDim,
    borderColor: COLORS.borderActive,
    shadowOpacity: 0,
  },
  bottomBtnCookedText: { fontSize: 14, fontWeight: '700', color: COLORS.bg, fontFamily: FONTS.bodyBold },
  bottomBtnCookedTextActive: { color: COLORS.primary },
  bottomBtnList: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  bottomBtnListActive: {
    backgroundColor: COLORS.primaryDim,
    borderColor: COLORS.borderActive,
    shadowOpacity: 0,
  },
  bottomBtnListText: { fontSize: 14, fontWeight: '700', color: COLORS.bg, fontFamily: FONTS.bodyBold },
  bottomBtnListTextActive: { color: COLORS.primary },
});
