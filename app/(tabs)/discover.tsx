import { useRouter } from 'expo-router';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import { getIngredientSuggestions, type IngredientEntry } from '../../data/ingredients';
import { useT, PT_CUISINES, PT_DISH_TYPES, PT_DIFFICULTIES } from '../../i18n';

const DIFF_COLORS: Record<string, string> = {
  'Fácil': COLORS.green,
  'Médio': COLORS.star,
  'Difícil': COLORS.red,
};

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

const SORT_KEYS = [
  { key: 'recente',   icon: 'time-outline' },
  { key: 'avaliado',  icon: 'star-outline' },
  { key: 'cozinhado', icon: 'flame-outline' },
  { key: 'rapido',    icon: 'flash-outline' },
  { key: 'popular',   icon: 'heart-outline' },
] as const;

export default function DiscoverScreen() {
  const router = useRouter();
  const { savedRecipes, toggleSaved, recipes, setRecipes, token } = useStore();
  const t = useT();
  const d = t.discover;
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
  const [fridgeFocused, setFridgeFocused] = useState(false);
  const fridgeInputRef = useRef<TextInput>(null);
  const keepFridgeFocus = useRef(false);
  const [loading, setLoading] = useState(recipes.length === 0);
  const [forYouRecipes, setForYouRecipes] = useState<any[]>([]);
  const [forYouLoading, setForYouLoading] = useState(false);
  const [forYouPersonalized, setForYouPersonalized] = useState(false);

  const fridgeSuggestions = useMemo<IngredientEntry[]>(
    () => (fridgeInput.trim().length > 0 ? getIngredientSuggestions(fridgeInput) : []),
    [fridgeInput]
  );
  const [sortBy, setSortBy] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const resultsRef = useRef<View>(null);

  useEffect(() => {
    api.getRecipes()
      .then(setRecipes)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!token) return;
    setForYouLoading(true);
    api.getDiscover(token, 1)
      .then((data) => {
        setForYouRecipes(data.recipes);
        setForYouPersonalized(data.personalized);
      })
      .catch(() => {})
      .finally(() => setForYouLoading(false));
  }, [token]);

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
    (activeDifficulty ? 1 : 0) +
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

  const handleSave = useCallback((recipeId: string) => {
    toggleSaved(recipeId);
  }, [toggleSaved]);

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
            placeholder={d.searchPlaceholder}
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
              <Text style={styles.filterLabel}>{d.cuisine}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                {PT_CUISINES.map((ptVal, idx) => (
                  <TouchableOpacity key={ptVal} style={[styles.pill, activeCuisine === ptVal && styles.pillActive]} onPress={() => setActiveCuisine(ptVal)}>
                    <Text style={[styles.pillText, activeCuisine === ptVal && styles.pillTextActive]}>{d.cuisines[idx]}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.filterLabel}>{d.dishType}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                {PT_DISH_TYPES.map((ptVal, idx) => (
                  <TouchableOpacity key={ptVal} style={[styles.pill, activeDishType === ptVal && styles.pillActive]} onPress={() => setActiveDishType(ptVal)}>
                    <Text style={[styles.pillText, activeDishType === ptVal && styles.pillTextActive]}>{d.dishTypes[idx]}</Text>
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
                  <Text style={styles.chipText}>{d.difficulties[PT_DIFFICULTIES.indexOf(activeDifficulty)] ?? activeDifficulty}</Text>
                  <Ionicons name="close" size={11} color={COLORS.primary} />
                </TouchableOpacity>
              )}
              {activeCuisine !== 'Todas' && (
                <TouchableOpacity style={styles.chip} onPress={() => setActiveCuisine('Todas')}>
                  <Text style={styles.chipText}>{d.cuisines[PT_CUISINES.indexOf(activeCuisine)] ?? activeCuisine}</Text>
                  <Ionicons name="close" size={11} color={COLORS.primary} />
                </TouchableOpacity>
              )}
              {activeDishType !== 'Todos' && (
                <TouchableOpacity style={styles.chip} onPress={() => setActiveDishType('Todos')}>
                  <Text style={styles.chipText}>{d.dishTypes[PT_DISH_TYPES.indexOf(activeDishType)] ?? activeDishType}</Text>
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
                <Text style={styles.chipClearText}>{d.clearChips}</Text>
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
              <Text style={styles.fridgeCardTitle}>{d.fridgeCardTitle}</Text>
              <Text style={styles.fridgeCardSub}>{d.fridgeCardSub}</Text>

              {/* Input row */}
              <View style={styles.fridgeInputRow}>
                <TextInput
                  ref={fridgeInputRef}
                  style={styles.fridgeInputField}
                  placeholder={d.fridgeInputExample}
                  placeholderTextColor={COLORS.text3}
                  value={fridgeInput}
                  onChangeText={setFridgeInput}
                  onFocus={() => setFridgeFocused(true)}
                  onBlur={() => setTimeout(() => {
                    if (keepFridgeFocus.current) {
                      keepFridgeFocus.current = false;
                      fridgeInputRef.current?.focus();
                    } else {
                      setFridgeFocused(false);
                    }
                  }, 150)}
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

              {/* Autocomplete suggestions */}
              {fridgeFocused && fridgeInput.trim().length > 0 && (
                <View style={styles.fridgeSuggestions}>
                  {fridgeSuggestions.map((s) => (
                    <TouchableOpacity
                      key={s.name}
                      style={styles.fridgeSuggestionItem}
                      onPress={() => {
                        keepFridgeFocus.current = true;
                        setFridgeList((prev) => prev.includes(s.name) ? prev : [...prev, s.name]);
                        setFridgeInput('');
                      }}
                    >
                      <Text style={styles.fridgeSuggestionName}>{s.name}</Text>
                      <Text style={styles.fridgeSuggestionCategory}>{s.category}</Text>
                    </TouchableOpacity>
                  ))}
                  {fridgeSuggestions.length === 0 && (
                    <TouchableOpacity
                      style={styles.fridgeSuggestionItem}
                      onPress={() => {
                        keepFridgeFocus.current = true;
                        addFridgeIngredient(fridgeInput);
                      }}
                    >
                      <Text style={styles.fridgeSuggestionName}>{d.addCustom(fridgeInput)}</Text>
                      <Text style={styles.fridgeSuggestionCategory}>{d.customIngredient}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

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
                <Text style={styles.fridgeFindBtnText}>{d.findRecipes}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Para Ti — feed personalizado */}
          {!isFiltering && (forYouLoading || forYouRecipes.length > 0) && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Para Ti</Text>
                {forYouPersonalized && !forYouLoading && (
                  <View style={styles.personalizedBadge}>
                    <Ionicons name="sparkles" size={10} color={COLORS.primary} />
                    <Text style={styles.personalizedBadgeText}>Personalizado</Text>
                  </View>
                )}
              </View>
              {forYouLoading ? (
                <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.forYouRow}
                >
                  {forYouRecipes.map((recipe) => {
                    const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);
                    const isSaved = savedRecipes.includes(String(recipe.id));
                    return (
                      <TouchableOpacity
                        key={recipe.id}
                        style={styles.forYouCard}
                        onPress={() => router.push(`/recipe/${recipe.id}`)}
                        activeOpacity={0.9}
                      >
                        <View style={styles.forYouCardImage}>
                          {recipe.image ? (
                            <Image source={{ uri: recipe.image }} style={styles.forYouCardPhoto} resizeMode="cover" />
                          ) : (
                            <View style={[styles.forYouCardPhoto, { backgroundColor: COLORS.surface3, alignItems: 'center', justifyContent: 'center' }]}>
                              <Ionicons name="restaurant-outline" size={28} color={COLORS.text3} />
                            </View>
                          )}
                          <TouchableOpacity
                            style={styles.forYouCardSave}
                            onPress={() => handleSave(String(recipe.id))}
                          >
                            <Ionicons
                              name={isSaved ? 'heart' : 'heart-outline'}
                              size={14}
                              color={isSaved ? '#E53935' : '#fff'}
                            />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.forYouCardInfo}>
                          <Text style={styles.forYouCardTitle} numberOfLines={2}>{recipe.title}</Text>
                          <View style={styles.forYouCardMeta}>
                            <Ionicons name="time-outline" size={11} color={COLORS.text3} />
                            <Text style={styles.forYouCardMetaText}>{totalTime > 0 ? `${totalTime}min` : '—'}</Text>
                            {recipe.cuisine ? (
                              <Text style={styles.forYouCardCuisine} numberOfLines={1}>{recipe.cuisine}</Text>
                            ) : null}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          )}

          {/* Explore Cuisines — bento grid */}
          {!isFiltering && cuisineGroups.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{d.exploreCuisines}</Text>
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
                          <Text style={styles.cuisineCardNameFeatured}>{d.cuisines[PT_CUISINES.indexOf(cuisine)] ?? cuisine}</Text>
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
                              <Text style={styles.cuisineCardName}>{d.cuisines[PT_CUISINES.indexOf(cuisine)] ?? cuisine}</Text>
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
                {isFiltering ? d.results : d.trendingNow}
              </Text>
              {!isFiltering && (
                <Text style={styles.viewAll}>{d.recipeCount(filtered.length)}</Text>
              )}
            </View>

            {/* Sort pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
              {SORT_KEYS.map((opt, idx) => {
                const active = sortBy === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.sortPill, active && styles.sortPillActive]}
                    onPress={() => setSortBy(active ? '' : opt.key)}
                  >
                    <Ionicons name={opt.icon as any} size={13} color={active ? COLORS.primary : COLORS.text3} />
                    <Text style={[styles.sortPillText, active && styles.sortPillTextActive]}>{d.sortOptions[idx]}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {filtered.length === 0 ? (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="search-outline" size={32} color={COLORS.primary} />
                </View>
                <Text style={styles.emptyTitle}>{d.noResults}</Text>
                <Text style={styles.emptyText}>
                  {fridgeMode ? d.noResultsFridge : d.noResultsSearch}
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
                          onPress={() => handleSave(String(recipe.id))}
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
    backgroundColor: COLORS.bg,
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
  fridgeSuggestions: {
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface1, overflow: 'hidden', marginBottom: 12,
  },
  fridgeSuggestionItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  fridgeSuggestionName: { fontSize: 14, fontWeight: '600', color: COLORS.text1, fontFamily: FONTS.body },
  fridgeSuggestionCategory: { fontSize: 11, color: COLORS.text3, fontWeight: '500', fontFamily: FONTS.body },

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

  // Para Ti
  personalizedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
    backgroundColor: COLORS.primaryDim, borderWidth: 1, borderColor: COLORS.borderActive,
  },
  personalizedBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.primary, fontFamily: FONTS.bodyBold },
  forYouRow: { gap: 12, paddingBottom: 4 },
  forYouCard: {
    width: 155, borderRadius: 16, overflow: 'hidden',
    backgroundColor: COLORS.surface1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: COLORS.border,
  },
  forYouCardImage: { width: 155, height: 115, position: 'relative' },
  forYouCardPhoto: { width: '100%', height: '100%' },
  forYouCardSave: {
    position: 'absolute', top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  forYouCardInfo: { padding: 10, gap: 5 },
  forYouCardTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text1, fontFamily: FONTS.bodyBold, lineHeight: 18 },
  forYouCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  forYouCardMetaText: { fontSize: 11, color: COLORS.text3, fontFamily: FONTS.body },
  forYouCardCuisine: { fontSize: 10, color: COLORS.text3, fontFamily: FONTS.body, marginLeft: 2 },

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
