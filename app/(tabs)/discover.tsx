import { useRouter } from 'expo-router';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/Colors';
import { FONTS } from '../../constants/Fonts';
import { api } from '../../services/api';
import { useStore } from '../../store/useStore';

const DIFF_COLORS: Record<string, string> = {
  'Fácil': COLORS.green,
  'Médio': COLORS.star,
  'Difícil': COLORS.accent,
};

const CUISINES = ['Todas', 'Portuguesa', 'Italiana', 'Japonesa', 'Mexicana', 'Indiana', 'Francesa', 'Mediterrânica', 'Americana', 'Brasileira', 'Coreana', 'Chinesa', 'Tailandesa', 'Árabe', 'Africana', 'Fusão', 'Internacional'];
const DISH_TYPES = ['Todos', 'Entrada', 'Sopa', 'Prato Principal', 'Acompanhamento', 'Snack', 'Sobremesa', 'Pequeno-Almoço', 'Brunch', 'Lanche', 'Bebida', 'Molho', 'Pão / Pastelaria'];

const CUISINE_META: Record<string, { emoji: string; color: string }> = {
  'Portuguesa':    { emoji: '🇵🇹', color: '#8B3A1A' },
  'Italiana':      { emoji: '🍝', color: '#C2622D' },
  'Japonesa':      { emoji: '🍱', color: '#C2185B' },
  'Mexicana':      { emoji: '🌮', color: '#E67E22' },
  'Indiana':       { emoji: '🍛', color: '#FF8F00' },
  'Francesa':      { emoji: '🥐', color: '#6A1B9A' },
  'Mediterrânica': { emoji: '🫒', color: '#0277BD' },
  'Americana':     { emoji: '🍔', color: '#B71C1C' },
  'Brasileira':    { emoji: '🇧🇷', color: '#2E7D32' },
  'Coreana':       { emoji: '🍜', color: '#BF360C' },
  'Chinesa':       { emoji: '🥢', color: '#C62828' },
  'Tailandesa':    { emoji: '🍲', color: '#00695C' },
  'Árabe':         { emoji: '🧆', color: '#E65100' },
  'Africana':      { emoji: '🌍', color: '#4E342E' },
  'Fusão':         { emoji: '✨', color: '#283593' },
  'Internacional': { emoji: '🌎', color: '#37474F' },
};

const SORT_OPTIONS = [
  { key: 'recente',   label: 'Recente',        icon: 'time-outline' },
  { key: 'avaliado',  label: 'Melhor avaliado', icon: 'star-outline' },
  { key: 'cozinhado', label: 'Mais cozinhado',  icon: 'flame-outline' },
  { key: 'rapido',    label: 'Mais rápido',     icon: 'flash-outline' },
  { key: 'popular',   label: 'Mais popular',    icon: 'heart-outline' },
] as const;

export default function DiscoverScreen() {
  const router = useRouter();
  const { savedRecipes, toggleSaved } = useStore();
  const [search, setSearch] = useState('');
  const [activeCuisine, setActiveCuisine] = useState('Todas');
  const [activeDishType, setActiveDishType] = useState('Todos');
  const [activeDifficulty, setActiveDifficulty] = useState('');
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [fridgeMode, setFridgeMode] = useState(false);
  const [fridgeIngredients, setFridgeIngredients] = useState('');
  const [fridgeList, setFridgeList] = useState<string[]>([]);
  const [fridgeInput, setFridgeInput] = useState('');
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const resultsRef = useRef<View>(null);

  useEffect(() => {
    api.getRecipes()
      .then(setRecipes)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const popularIngredients = useMemo(() => {
    const counts: Record<string, number> = {};
    recipes.forEach((r) => {
      (r.ingredients ?? []).forEach((ing: any) => {
        const key = ing.canonical_name || ing.name;
        if (key?.trim()) counts[key.trim()] = (counts[key.trim()] || 0) + 1;
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 24).map(([name]) => name);
  }, [recipes]);

  const cuisineGroups = useMemo(() => {
    const map = new Map<string, any>();
    recipes.forEach((r) => {
      if (r.cuisine) {
        if (!map.has(r.cuisine)) map.set(r.cuisine, r);
      }
    });
    return Array.from(map.entries()).slice(0, 10);
  }, [recipes]);

  const toggleIngredient = (name: string) =>
    setSelectedIngredients((prev) =>
      prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]
    );

  const activeFilterCount =
    (activeCuisine !== 'Todas' ? 1 : 0) +
    (activeDishType !== 'Todos' ? 1 : 0) +
    selectedIngredients.length;

  const clearAllFilters = () => {
    setActiveCuisine('Todas');
    setActiveDishType('Todos');
    setActiveDifficulty('');
    setSelectedIngredients([]);
  };

  const addFridgeIngredient = (val: string) => {
    const parts = val.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) {
      setFridgeList((prev) => {
        const next = [...prev];
        parts.forEach((p) => { if (!next.includes(p)) next.push(p); });
        return next;
      });
    }
    setFridgeInput('');
  };

  const isFiltering = !!search || fridgeList.length > 0 || activeCuisine !== 'Todas' ||
    activeDishType !== 'Todos' || !!activeDifficulty || selectedIngredients.length > 0;

  const hasActiveChips = activeCuisine !== 'Todas' || activeDishType !== 'Todos' ||
    selectedIngredients.length > 0 || !!activeDifficulty;

  const filtered = recipes.filter((r) => {
    const searchTerm = search;
    const matchSearch = !searchTerm.trim() ||
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.tags ?? []).some((t: string) => t.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.ingredients ?? []).some((i: any) => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchFridge = !fridgeMode || fridgeList.length === 0 ||
      fridgeList.every((ing) =>
        (r.ingredients ?? []).some((i: any) => i.name.toLowerCase().includes(ing.toLowerCase()))
      );
    const matchCuisine = activeCuisine === 'Todas' || (r.cuisine ?? '').toLowerCase() === activeCuisine.toLowerCase();
    const matchDishType = activeDishType === 'Todos' || (r.dish_type ?? '').toLowerCase() === activeDishType.toLowerCase();
    const matchDifficulty = !activeDifficulty || (r.difficulty ?? '').toLowerCase() === activeDifficulty.toLowerCase();
    const matchIngredients = selectedIngredients.length === 0 ||
      selectedIngredients.every((sel) =>
        (r.ingredients ?? []).some((ing: any) => (ing.canonical_name || ing.name)?.toLowerCase() === sel.toLowerCase())
      );
    return matchSearch && matchFridge && matchCuisine && matchDishType && matchDifficulty && matchIngredients;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'avaliado':  return (b.rating ?? 0) - (a.rating ?? 0);
      case 'cozinhado': return (b.cooked_count ?? 0) - (a.cooked_count ?? 0);
      case 'rapido':    return ((a.prep_time ?? 0) + (a.cook_time ?? 0)) - ((b.prep_time ?? 0) + (b.cook_time ?? 0));
      case 'popular':   return (b.likes ?? 0) - (a.likes ?? 0);
      default:          return 0;
    }
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.wordmark}>
          <Text style={styles.wordmarkC}>C</Text>
          <Text style={styles.wordmarkK}>K</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerBtn, fridgeMode && styles.headerBtnActive]}
            onPress={() => setFridgeMode(!fridgeMode)}
          >
            <Ionicons name="restaurant-outline" size={18} color={fridgeMode ? COLORS.bg : COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerBtn, filterOpen && styles.headerBtnActive]}
            onPress={() => setFilterOpen(!filterOpen)}
          >
            <Ionicons name="options-outline" size={18} color={filterOpen ? COLORS.bg : COLORS.primary} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color={COLORS.text3} />
          <TextInput
            style={styles.searchInput}
            placeholder="Pesquisar receitas, ingredientes..."
            placeholderTextColor={COLORS.text3}
            value={fridgeMode ? fridgeIngredients : search}
            onChangeText={fridgeMode ? setFridgeIngredients : setSearch}
          />
          {(search || fridgeIngredients) ? (
            <TouchableOpacity onPress={() => { setSearch(''); setFridgeIngredients(''); }}>
              <Ionicons name="close-circle" size={16} color={COLORS.text3} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : (
        <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Filter panel */}
          {filterOpen && (
            <View style={styles.filterPanel}>
              <Text style={styles.filterLabel}>Culinária</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                {CUISINES.map((item) => (
                  <TouchableOpacity key={item} style={[styles.pill, activeCuisine === item && styles.pillActive]} onPress={() => setActiveCuisine(item)}>
                    <Text style={[styles.pillText, activeCuisine === item && styles.pillTextActive]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.filterLabel}>Tipo de Prato</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                {DISH_TYPES.map((item) => (
                  <TouchableOpacity key={item} style={[styles.pill, activeDishType === item && styles.pillActive]} onPress={() => setActiveDishType(item)}>
                    <Text style={[styles.pillText, activeDishType === item && styles.pillTextActive]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Active chips */}
          {hasActiveChips && (
            <View style={styles.activeChips}>
              {activeDifficulty && (
                <TouchableOpacity style={styles.chip} onPress={() => setActiveDifficulty('')}>
                  <Text style={styles.chipText}>{activeDifficulty}</Text>
                  <Ionicons name="close" size={11} color={COLORS.primary} />
                </TouchableOpacity>
              )}
              {activeCuisine !== 'Todas' && (
                <TouchableOpacity style={styles.chip} onPress={() => setActiveCuisine('Todas')}>
                  <Text style={styles.chipText}>{activeCuisine}</Text>
                  <Ionicons name="close" size={11} color={COLORS.primary} />
                </TouchableOpacity>
              )}
              {activeDishType !== 'Todos' && (
                <TouchableOpacity style={styles.chip} onPress={() => setActiveDishType('Todos')}>
                  <Text style={styles.chipText}>{activeDishType}</Text>
                  <Ionicons name="close" size={11} color={COLORS.primary} />
                </TouchableOpacity>
              )}
              {selectedIngredients.map((ing) => (
                <TouchableOpacity key={ing} style={styles.chip} onPress={() => toggleIngredient(ing)}>
                  <Text style={styles.chipText}>{ing}</Text>
                  <Ionicons name="close" size={11} color={COLORS.primary} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.chipClear} onPress={clearAllFilters}>
                <Text style={styles.chipClearText}>Limpar</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Fridge Mode card */}
          {fridgeMode && (
            <View style={styles.fridgeCard}>
              <View style={styles.fridgeCardTag}>
                <Ionicons name="restaurant-outline" size={11} color={COLORS.primary} />
                <Text style={styles.fridgeCardTagText}>FRIDGE MODE</Text>
              </View>
              <Text style={styles.fridgeCardTitle}>O que tens{'\n'}no frigorífico?</Text>
              <Text style={styles.fridgeCardSub}>
                Adiciona os ingredientes que tens e encontramos a receita perfeita para ti.
              </Text>

              {/* Input row */}
              <View style={styles.fridgeInputRow}>
                <TextInput
                  style={styles.fridgeInputField}
                  placeholder="Ex: ovos, tomate..."
                  placeholderTextColor={COLORS.text3}
                  value={fridgeInput}
                  onChangeText={setFridgeInput}
                  onSubmitEditing={() => addFridgeIngredient(fridgeInput)}
                  blurOnSubmit={false}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={[styles.fridgeAddIconBtn, !fridgeInput.trim() && { opacity: 0.35 }]}
                  onPress={() => addFridgeIngredient(fridgeInput)}
                  disabled={!fridgeInput.trim()}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Ingredient chips */}
              {fridgeList.length > 0 && (
                <View style={styles.fridgeChips}>
                  {fridgeList.map((ing) => (
                    <TouchableOpacity
                      key={ing}
                      style={styles.fridgeChip}
                      onPress={() => setFridgeList((prev) => prev.filter((i) => i !== ing))}
                    >
                      <Text style={styles.fridgeChipText}>{ing}</Text>
                      <Ionicons name="close" size={12} color={COLORS.primary} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[styles.fridgeFindBtn, fridgeList.length === 0 && styles.fridgeFindBtnDisabled]}
                disabled={fridgeList.length === 0}
                onPress={() => {
                  resultsRef.current?.measureLayout(
                    scrollRef.current as any,
                    (_x, y) => scrollRef.current?.scrollTo({ y, animated: true }),
                    () => scrollRef.current?.scrollToEnd({ animated: true }),
                  );
                }}
              >
                <Ionicons name="search-outline" size={16} color="#fff" />
                <Text style={styles.fridgeFindBtnText}>Encontrar Receitas</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Explore Cuisines — bento grid */}
          {!isFiltering && cuisineGroups.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Explorar Culinárias</Text>
              <View style={styles.cuisineGrid}>
                {cuisineGroups.map(([cuisine, recipe]: [string, any], index: number) => {
                  const meta = CUISINE_META[cuisine] ?? { emoji: '🍽️', color: COLORS.primary };
                  // Layout: index 0 = full width tall, 1+2 = side by side, 3 = full width, 4+5 = side by side...
                  const posInGroup = index % 3;
                  const isFeatured = posInGroup === 0;
                  const isFirst = index === 0;

                  if (isFeatured) {
                    return (
                      <TouchableOpacity
                        key={cuisine}
                        style={[styles.cuisineFeatured, isFirst && { marginTop: 0 }]}
                        onPress={() => { setActiveCuisine(cuisine); }}
                        activeOpacity={0.88}
                      >
                        {recipe.image
                          ? <Image source={{ uri: recipe.image }} style={styles.cuisineCardBg} resizeMode="cover" />
                          : <View style={[styles.cuisineCardBg, { backgroundColor: meta.color }]} />
                        }
                        <View style={styles.cuisineCardOverlay} />
                        <View style={styles.cuisineCardInfo}>
                          <Text style={styles.cuisineCardEmoji}>{meta.emoji}</Text>
                          <Text style={styles.cuisineCardNameFeatured}>{cuisine}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  }
                  return null; // small cards rendered in pairs below
                })}
                {/* Render pairs */}
                {Array.from({ length: Math.ceil((cuisineGroups.length - 1) / 2) }).map((_, pairIdx) => {
                  const a = cuisineGroups[pairIdx * 2 + 1];
                  const b = cuisineGroups[pairIdx * 2 + 2];
                  if (!a) return null;
                  return (
                    <View key={pairIdx} style={styles.cuisinePairRow}>
                      {[a, b].filter(Boolean).map(([cuisine, recipe]: [string, any]) => {
                        const meta = CUISINE_META[cuisine] ?? { emoji: '🍽️', color: COLORS.primary };
                        return (
                          <TouchableOpacity
                            key={cuisine}
                            style={styles.cuisineSmall}
                            onPress={() => { setActiveCuisine(cuisine); }}
                            activeOpacity={0.88}
                          >
                            {recipe.image
                              ? <Image source={{ uri: recipe.image }} style={styles.cuisineCardBg} resizeMode="cover" />
                              : <View style={[styles.cuisineCardBg, { backgroundColor: meta.color }]} />
                            }
                            <View style={styles.cuisineCardOverlay} />
                            <View style={styles.cuisineCardInfo}>
                              <Text style={styles.cuisineCardEmoji}>{meta.emoji}</Text>
                              <Text style={styles.cuisineCardName}>{cuisine}</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Trending Now / Results */}
          <View ref={resultsRef} style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                {isFiltering ? 'Resultados' : 'Trending Now'}
              </Text>
              {!isFiltering && (
                <Text style={styles.viewAll}>{filtered.length} receitas</Text>
              )}
            </View>

            {/* Sort pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
              {SORT_OPTIONS.map((opt) => {
                const active = sortBy === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.sortPill, active && styles.sortPillActive]}
                    onPress={() => setSortBy(active ? '' : opt.key)}
                  >
                    <Ionicons name={opt.icon as any} size={13} color={active ? COLORS.primary : COLORS.text3} />
                    <Text style={[styles.sortPillText, active && styles.sortPillTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {filtered.length === 0 ? (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="search-outline" size={32} color={COLORS.primary} />
                </View>
                <Text style={styles.emptyTitle}>Sem resultados</Text>
                <Text style={styles.emptyText}>
                  {fridgeMode ? 'Experimenta adicionar outros ingredientes' : 'Tenta pesquisar por outro termo'}
                </Text>
              </View>
            ) : (
              <View style={styles.recipeList}>
                {filtered.map((recipe) => {
                  const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);
                  const isSaved = savedRecipes.includes(String(recipe.id));
                  const diffColor = DIFF_COLORS[recipe.difficulty] ?? COLORS.text3;
                  return (
                    <TouchableOpacity
                      key={recipe.id}
                      style={styles.recipeCard}
                      onPress={() => router.push(`/recipe/${recipe.id}`)}
                      activeOpacity={0.92}
                    >
                      <View style={styles.recipeCardImage}>
                        {recipe.image ? (
                          <Image source={{ uri: recipe.image }} style={styles.recipeCardPhoto} resizeMode="cover" />
                        ) : (
                          <View style={[styles.recipeCardPhoto, { backgroundColor: COLORS.surface3, alignItems: 'center', justifyContent: 'center' }]}>
                            <Ionicons name="restaurant-outline" size={40} color={COLORS.text3} />
                          </View>
                        )}
                        <View style={styles.recipeCardGradient} />
                        <TouchableOpacity
                          style={styles.recipeCardSaveBtn}
                          onPress={(e) => { e.stopPropagation?.(); toggleSaved(String(recipe.id)); }}
                        >
                          <Ionicons
                            name={isSaved ? 'heart' : 'heart-outline'}
                            size={18}
                            color={isSaved ? '#E53935' : '#fff'}
                          />
                        </TouchableOpacity>
                        <View style={styles.recipeCardOverlay}>
                          <Text style={styles.recipeCardTitle} numberOfLines={2}>{recipe.title}</Text>
                          <View style={styles.recipeCardMeta}>
                            <View style={styles.recipeCardMetaItem}>
                              <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.8)" />
                              <Text style={styles.recipeCardMetaText}>{totalTime}min</Text>
                            </View>
                            <View style={[styles.recipeCardDiff, { borderColor: diffColor }]}>
                              <Text style={[styles.recipeCardDiffText, { color: diffColor }]}>{recipe.difficulty}</Text>
                            </View>
                            {recipe.cuisine ? (
                              <View style={styles.recipeCardCuisine}>
                                <Text style={styles.recipeCardCuisineText}>{recipe.cuisine}</Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  wordmark: { flexDirection: 'row', alignItems: 'center' },
  wordmarkC: { fontSize: 28, fontWeight: '900', color: COLORS.text1, letterSpacing: -1, fontFamily: FONTS.titleBlack },
  wordmarkK: { fontSize: 28, fontWeight: '900', color: COLORS.primary, letterSpacing: -1, fontFamily: FONTS.titleBlack },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primaryDim,
    borderWidth: 1.5, borderColor: COLORS.borderActive,
  },
  headerBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterBadge: {
    position: 'absolute', top: -3, right: -3,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: COLORS.bg,
  },
  filterBadgeText: { fontSize: 9, fontWeight: '800', color: COLORS.bg, fontFamily: FONTS.bodyBold },

  // Search
  searchContainer: { paddingHorizontal: 16, paddingBottom: 12 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surface2,
    paddingHorizontal: 12, paddingVertical: 11,
    borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text1, fontFamily: FONTS.body },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Filter panel
  filterPanel: {
    backgroundColor: COLORS.surface1,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    paddingTop: 12, paddingBottom: 4,
  },
  filterLabel: {
    fontSize: 11, fontWeight: '800', color: COLORS.text3,
    textTransform: 'uppercase', letterSpacing: 0.6,
    paddingHorizontal: 16, marginBottom: 6, fontFamily: FONTS.bodyBold,
  },
  filterRow: { paddingHorizontal: 16, paddingBottom: 12, gap: 8, flexDirection: 'row' },
  filterEmptyHint: { fontSize: 12, color: COLORS.text3, fontStyle: 'italic', paddingHorizontal: 16, paddingBottom: 12, fontFamily: FONTS.body },
  ingredientWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingHorizontal: 16, paddingBottom: 12 },

  pill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border, alignSelf: 'flex-start',
  },
  pillActive: { backgroundColor: COLORS.primaryDim, borderColor: COLORS.borderActive },
  pillText: { fontSize: 13, fontWeight: '600', color: COLORS.text3, fontFamily: FONTS.body },
  pillTextActive: { color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.bodyBold },

  // Active chips
  activeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, paddingBottom: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    backgroundColor: COLORS.primaryDim, borderWidth: 1, borderColor: COLORS.borderActive,
  },
  chipText: { fontSize: 12, fontWeight: '700', color: COLORS.primary, fontFamily: FONTS.bodyBold },
  chipClear: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
  },
  chipClearText: { fontSize: 12, fontWeight: '600', color: COLORS.text3, fontFamily: FONTS.body },

  // Fridge Mode card
  fridgeCard: {
    marginHorizontal: 16, marginBottom: 20,
    backgroundColor: COLORS.surface1,
    borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: COLORS.borderActive,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 3,
  },
  fridgeCardTag: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  fridgeCardTagText: { fontSize: 11, fontWeight: '800', color: COLORS.primary, letterSpacing: 1, fontFamily: FONTS.bodyBold },
  fridgeCardTitle: { fontSize: 26, fontWeight: '800', color: COLORS.text1, fontFamily: FONTS.titleBold, letterSpacing: -0.5, lineHeight: 32, marginBottom: 8 },
  fridgeCardSub: { fontSize: 13, color: COLORS.text2, lineHeight: 20, fontFamily: FONTS.body, marginBottom: 14 },
  fridgeInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12,
  },
  fridgeInputField: {
    flex: 1, backgroundColor: COLORS.surface2,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, color: COLORS.text1, fontFamily: FONTS.body,
  },
  fridgeAddIconBtn: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  fridgeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  fridgeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.borderActive,
    backgroundColor: COLORS.primaryDim,
  },
  fridgeChipText: { fontSize: 13, fontWeight: '600', color: COLORS.primary, fontFamily: FONTS.body },
  fridgeFindBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 14,
    paddingVertical: 14,
  },
  fridgeFindBtnDisabled: { opacity: 0.4 },
  fridgeFindBtnText: { fontSize: 15, fontWeight: '700', color: '#fff', fontFamily: FONTS.bodyBold },

  // Section
  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text1, fontFamily: FONTS.titleBold, letterSpacing: -0.3 },
  resultsCount: { fontSize: 13, color: COLORS.text3, fontWeight: '600', fontFamily: FONTS.body },
  viewAll: { fontSize: 13, fontWeight: '700', color: COLORS.primary, fontFamily: FONTS.bodyBold },

  // Cuisine bento grid
  cuisineGrid: { gap: 10 },
  cuisineFeatured: {
    width: '100%', height: 160, borderRadius: 18, overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  cuisinePairRow: { flexDirection: 'row', gap: 10 },
  cuisineSmall: {
    flex: 1, height: 110, borderRadius: 18, overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  cuisineCardBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  cuisineCardOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  cuisineCardInfo: { padding: 12 },
  cuisineCardEmoji: { fontSize: 20, marginBottom: 2 },
  cuisineCardNameFeatured: { fontSize: 18, fontWeight: '800', color: '#fff', fontFamily: FONTS.titleBold },
  cuisineCardName: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: FONTS.bodyBold },

  // Sort pills
  sortRow: { gap: 8, flexDirection: 'row', marginBottom: 16 },
  sortPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: COLORS.surface1, borderWidth: 1, borderColor: COLORS.border,
  },
  sortPillActive: { backgroundColor: COLORS.primaryDim, borderColor: COLORS.borderActive },
  sortPillText: { fontSize: 12, fontWeight: '600', color: COLORS.text3, fontFamily: FONTS.body },
  sortPillTextActive: { color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.bodyBold },

  // Recipe cards (full width editorial)
  recipeList: { gap: 16 },
  recipeCard: {
    borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  recipeCardImage: { width: '100%', height: 220, position: 'relative' },
  recipeCardPhoto: { width: '100%', height: '100%' },
  recipeCardGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%',
    backgroundColor: 'transparent',
    // Simulated gradient via background — real gradient needs expo-linear-gradient
    backgroundImage: 'linear-gradient(transparent, rgba(0,0,0,0.75))' as any,
  },
  recipeCardSaveBtn: {
    position: 'absolute', top: 12, right: 12,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  recipeCardOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0)',
    backgroundImage: 'linear-gradient(transparent, rgba(0,0,0,0.72))' as any,
  },
  recipeCardTitle: {
    fontSize: 18, fontWeight: '800', color: '#fff',
    fontFamily: FONTS.titleBold, letterSpacing: -0.3, marginBottom: 8, lineHeight: 24,
  },
  recipeCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recipeCardMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  recipeCardMetaText: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontFamily: FONTS.body },
  recipeCardDiff: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
    borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.3)',
  },
  recipeCardDiffText: { fontSize: 11, fontWeight: '700', fontFamily: FONTS.bodyBold },
  recipeCardCuisine: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  recipeCardCuisineText: { fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: '600', fontFamily: FONTS.body },

  // Empty
  empty: { alignItems: 'center', paddingTop: 48, gap: 14 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.primaryDim, borderWidth: 1, borderColor: COLORS.borderActive,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text1, fontFamily: FONTS.titleBold },
  emptyText: { fontSize: 14, color: COLORS.text2, textAlign: 'center', fontFamily: FONTS.body },
});
