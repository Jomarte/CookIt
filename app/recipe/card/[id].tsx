import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../constants/Colors';
import { FONTS } from '../../../constants/Fonts';
import { api } from '../../../services/api';
import { useStore } from '../../../store/useStore';

export default function RecipeCardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [servings, setServings] = useState(2);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  const { cookedRecipes, toggleCooked, addToShoppingList } = useStore();

  useEffect(() => {
    api.getRecipe(id)
      .then((data) => { setRecipe(data); setServings(data.servings ?? 2); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const toggleIngredient = (idx: number) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const toggleStep = (num: number) => {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      next.has(num) ? next.delete(num) : next.add(num);
      return next;
    });
  };

  const insets = useSafeAreaInsets();

  const formatAmount = (amount: string): string => {
    if (!recipe) return amount;
    if (amount === 'q.b.') return 'q.b.';
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;
    const ratio = servings / (recipe.servings || 1);
    const result = num * ratio;
    return result % 1 === 0 ? result.toString() : result.toFixed(1);
  };


  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={[styles.backBtn, { top: insets.top + 16 }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.centered}>
          <Text style={{ color: COLORS.text3, fontFamily: FONTS.body }}>Receita não encontrada</Text>
        </View>
      </SafeAreaView>
    );
  }

  const initial = (recipe.author_name ?? '?')[0].toUpperCase();
  const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);
  const checkedCount = checkedIngredients.size;
  const totalIngredients = recipe.ingredients?.length ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Back button flutuante */}
      <TouchableOpacity style={[styles.backBtn, { top: insets.top + 16 }]} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Notebook rings — dentro do scroll para desaparecer */}
        <View style={styles.ringsStrip}>
          <View style={styles.ringsShadowLine} />
          {[...Array(9)].map((_, i) => (
            <View key={i} style={styles.ringOuter}>
              <View style={styles.ringInner} />
            </View>
          ))}
        </View>

        {/* Hero card — foto esquerda, info direita */}
        <View style={styles.heroCard}>
          <View style={styles.heroLeft}>
            {recipe.image
              ? <Image source={{ uri: recipe.image }} style={styles.heroPhoto} resizeMode="cover" />
              : (
                <View style={styles.heroPhotoPlaceholder}>
                  <Ionicons name="restaurant-outline" size={36} color={COLORS.text3} />
                </View>
              )
            }
            {recipe.rating > 0 && (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={11} color={COLORS.star} />
                <Text style={styles.ratingBadgeText}>{Number(recipe.rating).toFixed(1)}</Text>
              </View>
            )}
          </View>

          <View style={styles.heroRight}>
            <Text style={styles.heroTitle} numberOfLines={3}>{recipe.title}</Text>

            <View style={styles.authorRow}>
              <View style={styles.authorAvatar}>
                <Text style={styles.authorAvatarText}>{initial}</Text>
              </View>
              <View>
                <Text style={styles.authorName}>{recipe.author_name ?? 'Cozinheiro'}</Text>
                <Text style={styles.authorUsername}>@{recipe.author_username ?? ''}</Text>
              </View>
            </View>

            {recipe.diet?.length > 0 && (
              <View style={styles.dietRow}>
                {recipe.diet.slice(0, 2).map((d: string) => (
                  <View key={d} style={styles.dietBadge}>
                    <Text style={styles.dietBadgeText}>{d}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Stats strip */}
        <View style={styles.statsStrip}>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={18} color={COLORS.primary} />
            <Text style={styles.statValue}>{recipe.prep_time ?? 0}min</Text>
            <Text style={styles.statLabel}>Prep</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="flame-outline" size={18} color={COLORS.accent} />
            <Text style={styles.statValue}>{recipe.cook_time ?? 0}min</Text>
            <Text style={styles.statLabel}>Cozedura</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="people-outline" size={18} color={COLORS.green} />
            <Text style={styles.statValue}>{recipe.servings ?? 2}</Text>
            <Text style={styles.statLabel}>Doses</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="bar-chart-outline" size={18} color={COLORS.text2} />
            <Text style={styles.statValue}>{recipe.difficulty ?? '—'}</Text>
            <Text style={styles.statLabel}>Nível</Text>
          </View>
        </View>

        {/* Ingredients */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>Ingredientes</Text>
            </View>
            <View style={styles.sectionRight}>
              {checkedCount > 0 && (
                <Text style={styles.checkedCount}>{checkedCount}/{totalIngredients}</Text>
              )}
              <View style={styles.servingsRow}>
                <TouchableOpacity style={styles.servingsBtn} onPress={() => setServings(Math.max(1, servings - 1))}>
                  <Ionicons name="remove" size={13} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.servingsText}>{servings}</Text>
                <TouchableOpacity style={styles.servingsBtn} onPress={() => setServings(servings + 1)}>
                  <Ionicons name="add" size={13} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {recipe.ingredients?.map((ing: any, idx: number) => {
            const checked = checkedIngredients.has(idx);
            return (
              <TouchableOpacity
                key={ing.id ?? idx}
                style={[styles.ingredientRow, checked && styles.ingredientRowChecked]}
                onPress={() => toggleIngredient(idx)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                  {checked && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
                <Text style={[styles.ingredientName, checked && styles.ingredientNameChecked]}>
                  {ing.name}
                </Text>
                <Text style={[styles.ingredientAmount, checked && styles.ingredientAmountChecked]}>
                  {formatAmount(ing.amount)}{ing.unit ? ' ' + ing.unit : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Steps */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionAccent, { backgroundColor: COLORS.accent }]} />
            <Text style={styles.sectionTitle}>Preparação</Text>
          </View>

          <View style={{ height: 14 }} />

          {recipe.steps?.map((step: any) => {
            const checked = checkedSteps.has(step.number);
            return (
              <TouchableOpacity
                key={step.number}
                style={[styles.stepRow, checked && styles.stepRowChecked]}
                onPress={() => toggleStep(step.number)}
                activeOpacity={0.75}
              >
                <View style={[styles.stepNum, checked && styles.stepNumChecked]}>
                  {checked
                    ? <Ionicons name="checkmark" size={14} color="#fff" />
                    : <Text style={styles.stepNumText}>{step.number}</Text>
                  }
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepText, checked && styles.stepTextChecked]}>
                    {step.description}
                  </Text>
                  {step.duration && !checked ? (
                    <View style={styles.stepTimer}>
                      <Ionicons name="timer-outline" size={11} color={COLORS.primary} />
                      <Text style={styles.stepTimerText}>{step.duration} min</Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Bottom bar */}
      {recipe && (() => {
        const isCooked = cookedRecipes.includes(String(recipe.id));
        return (
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={[styles.bottomBtnCooked, isCooked && styles.bottomBtnCookedActive]}
              onPress={() => toggleCooked(String(recipe.id))}
            >
              <Ionicons
                name={isCooked ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={20}
                color={isCooked ? COLORS.primary : COLORS.bg}
              />
              <Text style={[styles.bottomBtnCookedText, isCooked && styles.bottomBtnCookedTextActive]}>
                {isCooked ? 'Cozinhado!' : 'Cozinhar'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bottomBtnList}
              onPress={() => addToShoppingList(String(recipe.id), recipe.ingredients ?? [], recipe.title)}
            >
              <Ionicons name="cart-outline" size={20} color={COLORS.bg} />
              <Text style={styles.bottomBtnListText}>Adicionar à lista</Text>
            </TouchableOpacity>
          </View>
        );
      })()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface2 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 20 },

  backBtn: {
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

  // Notebook rings
  ringsStrip: {
    height: 28,
    backgroundColor: COLORS.surface2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    position: 'relative',
  },
  ringsShadowLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.surface3,
  },
  ringOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.surface1,
    borderWidth: 2.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  ringInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.surface2,
  },

  // Hero card
  heroCard: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: COLORS.surface1,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  heroLeft: {
    width: '42%',
    aspectRatio: 0.85,
    position: 'relative',
  },
  heroPhoto: { width: '100%', height: '100%' },
  heroPhotoPlaceholder: {
    flex: 1,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingBadge: {
    position: 'absolute', bottom: 8, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 8,
  },
  ratingBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.star, fontFamily: FONTS.bodyBold },

  heroRight: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.text1,
    lineHeight: 23,
    fontFamily: FONTS.titleBold,
    marginBottom: 10,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  authorAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.primaryDim,
    borderWidth: 1.5, borderColor: COLORS.borderActive,
    alignItems: 'center', justifyContent: 'center',
  },
  authorAvatarText: { fontSize: 12, fontWeight: '800', color: COLORS.primary, fontFamily: FONTS.bodyBold },
  authorName: { fontSize: 12, fontWeight: '700', color: COLORS.text1, fontFamily: FONTS.bodyBold },
  authorUsername: { fontSize: 11, color: COLORS.text3, fontFamily: FONTS.body },

  dietRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  dietBadge: {
    backgroundColor: COLORS.greenDim,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1, borderColor: COLORS.green,
  },
  dietBadgeText: { fontSize: 10, color: COLORS.green, fontWeight: '600', fontFamily: FONTS.body },

  // Stats
  statsStrip: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.surface1,
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { fontSize: 13, fontWeight: '800', color: COLORS.text1, fontFamily: FONTS.bodyBold },
  statLabel: { fontSize: 10, color: COLORS.text3, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, fontFamily: FONTS.body },
  statDivider: { width: 1, backgroundColor: COLORS.border, alignSelf: 'stretch', marginVertical: 4 },

  // Sections
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.surface1,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionAccent: { width: 4, height: 20, borderRadius: 2, backgroundColor: COLORS.primary },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text1, fontFamily: FONTS.titleBold },
  sectionRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkedCount: { fontSize: 12, fontWeight: '700', color: COLORS.primary, fontFamily: FONTS.bodyBold },

  servingsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primaryDim,
    borderRadius: 16, paddingVertical: 3, paddingHorizontal: 4,
    borderWidth: 1, borderColor: COLORS.borderActive,
  },
  servingsBtn: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.surface1,
    alignItems: 'center', justifyContent: 'center',
  },
  servingsText: { fontSize: 13, fontWeight: '700', color: COLORS.primary, minWidth: 16, textAlign: 'center', fontFamily: FONTS.bodyBold },

  // Ingredients
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  ingredientRowChecked: { opacity: 0.45 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  ingredientName: { flex: 1, fontSize: 14, color: COLORS.text1, fontWeight: '500', fontFamily: FONTS.body },
  ingredientNameChecked: { textDecorationLine: 'line-through', color: COLORS.text3 },
  ingredientAmount: { fontSize: 13, color: COLORS.text2, fontWeight: '600', fontFamily: FONTS.body },
  ingredientAmountChecked: { textDecorationLine: 'line-through', color: COLORS.text3 },

  // Steps
  stepRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepRowChecked: { opacity: 0.4, backgroundColor: COLORS.surface2 },
  stepNum: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 1,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2, shadowRadius: 6,
  },
  stepNumChecked: { backgroundColor: COLORS.green },
  stepNumText: { fontSize: 14, fontWeight: '800', color: '#fff', fontFamily: FONTS.bodyBold },
  stepContent: { flex: 1 },
  stepText: { fontSize: 14, color: COLORS.text1, lineHeight: 22, fontFamily: FONTS.body },
  stepTextChecked: { textDecorationLine: 'line-through', color: COLORS.text3 },
  stepTimer: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 6, alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryDim,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1, borderColor: COLORS.borderActive,
  },
  stepTimerText: { fontSize: 11, color: COLORS.primary, fontWeight: '600', fontFamily: FONTS.body },

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
  },
  bottomBtnCookedActive: {
    backgroundColor: COLORS.primaryDim,
    borderColor: COLORS.borderActive,
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
  },
  bottomBtnListText: { fontSize: 14, fontWeight: '700', color: COLORS.bg, fontFamily: FONTS.bodyBold },
});
