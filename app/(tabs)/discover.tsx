import { useRouter } from 'expo-router';
import React, { useState, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
const DIFFICULTIES = ['Fácil', 'Médio', 'Difícil'];

export default function DiscoverScreen() {
  const router = useRouter();
  const { user, savedRecipes, toggleSaved } = useStore();
  const [search, setSearch] = useState('');
  const [activeCuisine, setActiveCuisine] = useState('Todas');
  const [activeDishType, setActiveDishType] = useState('Todos');
  const [activeDifficulty, setActiveDifficulty] = useState('');
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [fridgeMode, setFridgeMode] = useState(false);
  const [fridgeIngredients, setFridgeIngredients] = useState('');
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 24)
      .map(([name]) => name);
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

  const filtered = recipes.filter((r) => {
    const searchTerm = fridgeMode ? fridgeIngredients : search;
    const matchSearch = !searchTerm.trim() ||
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.tags ?? []).some((t: string) => t.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.ingredients ?? []).some((i: any) =>
        fridgeMode
          ? fridgeIngredients.split(',').some((ing) =>
              i.name.toLowerCase().includes(ing.trim().toLowerCase())
            )
          : i.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    const matchCuisine = activeCuisine === 'Todas' ||
      (r.cuisine ?? '').toLowerCase() === activeCuisine.toLowerCase();
    const matchDishType = activeDishType === 'Todos' ||
      (r.dish_type ?? '').toLowerCase() === activeDishType.toLowerCase();
    const matchDifficulty = !activeDifficulty ||
      (r.difficulty ?? '').toLowerCase() === activeDifficulty.toLowerCase();
    const matchIngredients = selectedIngredients.length === 0 ||
      selectedIngredients.every((sel) =>
        (r.ingredients ?? []).some((ing: any) =>
          (ing.canonical_name || ing.name)?.toLowerCase() === sel.toLowerCase()
        )
      );
    return matchSearch && matchCuisine && matchDishType && matchDifficulty && matchIngredients;
  });

  const renderCard = ({ item: recipe }: { item: any }) => {
    if (recipe.__placeholder) return <View style={{ flex: 1 }} />;
    const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);
    const initial = (recipe.author_name ?? '?')[0].toUpperCase();
    const isSaved = savedRecipes.includes(String(recipe.id));
    const diffColor = DIFF_COLORS[recipe.difficulty] ?? COLORS.text2;
    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push(`/recipe/${recipe.id}`)}>
        <View style={styles.cardImage}>
          {recipe.image
            ? <Image source={{ uri: recipe.image }} style={styles.cardPhoto} resizeMode="cover" />
            : <Ionicons name="restaurant-outline" size={32} color={COLORS.text3} />
          }
          {/* Save button */}
          <TouchableOpacity
            style={styles.cardSaveBtn}
            onPress={(e) => { e.stopPropagation?.(); toggleSaved(String(recipe.id)); }}
          >
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={16}
              color={isSaved ? COLORS.primary : '#fff'}
            />
          </TouchableOpacity>
          {/* Difficulty badge top-right */}
          <View style={[styles.cardDiffBadge, { borderColor: diffColor }]}>
            <Text style={[styles.cardDiffText, { color: diffColor }]}>{recipe.difficulty}</Text>
          </View>
          {/* Cuisine badge bottom-left */}
          {recipe.cuisine ? (
            <View style={styles.cardCuisineBadge}>
              <Text style={styles.cardCuisineText} numberOfLines={1}>{recipe.cuisine}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>{recipe.title}</Text>
          <View style={styles.cardMeta}>
            <Ionicons name="time-outline" size={12} color={COLORS.text3} />
            <Text style={styles.cardMetaText}>{totalTime}min</Text>
            <View style={styles.cardAuthor}>
              <Text style={styles.cardAuthorText}>{initial}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View style={styles.listHeader}>
      {/* Filter panel (inline) */}
      {filterOpen && (
        <View style={styles.filterPanel}>
          <Text style={styles.filterPanelLabel}>Culinária</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPanelRow}>
            {CUISINES.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.catPill, activeCuisine === item && styles.catPillActive]}
                onPress={() => setActiveCuisine(item)}
              >
                <Text style={[styles.catText, activeCuisine === item && styles.catTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.filterPanelLabel}>Tipo de Prato</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPanelRow}>
            {DISH_TYPES.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.catPill, activeDishType === item && styles.catPillActive]}
                onPress={() => setActiveDishType(item)}
              >
                <Text style={[styles.catText, activeDishType === item && styles.catTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.filterPanelLabel}>Ingredientes</Text>
          {popularIngredients.length === 0 ? (
            <Text style={styles.ingredientEmptyHint}>Adiciona receitas com ingredientes para filtrar aqui</Text>
          ) : (
            <View style={styles.ingredientPillsWrap}>
              {popularIngredients.map((ing) => {
                const isActive = selectedIngredients.includes(ing);
                return (
                  <TouchableOpacity
                    key={ing}
                    style={[styles.catPill, isActive && styles.catPillActive]}
                    onPress={() => toggleIngredient(ing)}
                  >
                    <Text style={[styles.catText, isActive && styles.catTextActive]}>{ing}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Active filter chips */}
      {(activeCuisine !== 'Todas' || activeDishType !== 'Todos' || selectedIngredients.length > 0 || activeDifficulty) && (
        <View style={styles.activeChips}>
          {activeDifficulty ? (
            <TouchableOpacity style={styles.activeChip} onPress={() => setActiveDifficulty('')}>
              <Text style={styles.activeChipText}>{activeDifficulty}</Text>
              <Ionicons name="close" size={11} color={COLORS.primary} />
            </TouchableOpacity>
          ) : null}
          {activeCuisine !== 'Todas' && (
            <TouchableOpacity style={styles.activeChip} onPress={() => setActiveCuisine('Todas')}>
              <Text style={styles.activeChipText}>{activeCuisine}</Text>
              <Ionicons name="close" size={11} color={COLORS.primary} />
            </TouchableOpacity>
          )}
          {activeDishType !== 'Todos' && (
            <TouchableOpacity style={styles.activeChip} onPress={() => setActiveDishType('Todos')}>
              <Text style={styles.activeChipText}>{activeDishType}</Text>
              <Ionicons name="close" size={11} color={COLORS.primary} />
            </TouchableOpacity>
          )}
          {selectedIngredients.map((ing) => (
            <TouchableOpacity key={ing} style={styles.activeChip} onPress={() => toggleIngredient(ing)}>
              <Text style={styles.activeChipText}>{ing}</Text>
              <Ionicons name="close" size={11} color={COLORS.primary} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.clearAllBtn} onPress={clearAllFilters}>
            <Text style={styles.clearAllText}>Limpar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Results count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>{filtered.length} receitas encontradas</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed header */}
      <View style={styles.header}>
        <View style={styles.wordmark}>
          <Text style={styles.wordmarkC}>C</Text>
          <Text style={styles.wordmarkK}>K</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.fridgeIconBtn, fridgeMode && styles.fridgeIconBtnActive]}
            onPress={() => setFridgeMode(!fridgeMode)}
          >
            <Ionicons
              name="restaurant-outline"
              size={18}
              color={fridgeMode ? COLORS.bg : COLORS.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterIconBtn, filterOpen && styles.filterIconBtnActive]}
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

      {/* Search bar — always visible below header */}
      <View style={styles.searchContainer}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color={COLORS.text3} />
          <TextInput
            style={styles.searchInput}
            placeholder={fridgeMode ? 'Ex: ovos, arroz, atum...' : 'Pesquisar receita...'}
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
        {fridgeMode && (
          <View style={styles.fridgeHint}>
            <Ionicons name="bulb-outline" size={13} color={COLORS.primary} />
            <Text style={styles.fridgeHintText}>Escreve os ingredientes separados por vírgula</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered.length % 2 !== 0 ? [...filtered, { id: '__placeholder__', __placeholder: true }] : filtered}
          renderItem={renderCard}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="search-outline" size={32} color={COLORS.primary} />
              </View>
              <Text style={styles.emptyTitle}>Sem resultados</Text>
              <Text style={styles.emptyText}>
                {fridgeMode
                  ? 'Experimenta adicionar outros ingredientes'
                  : 'Tenta pesquisar por outro termo'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 0,
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: COLORS.text1, letterSpacing: -0.3, fontFamily: FONTS.titleBlack },
  wordmark: { flexDirection: 'row', alignItems: 'center' },
  wordmarkC: { fontSize: 28, fontWeight: '900', color: COLORS.text1, letterSpacing: -1, fontFamily: FONTS.titleBlack },
  wordmarkK: { fontSize: 28, fontWeight: '900', color: COLORS.primary, letterSpacing: -1, fontFamily: FONTS.titleBlack },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },

  fridgeIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryDim,
    borderWidth: 1.5,
    borderColor: COLORS.borderActive,
  },
  fridgeIconBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  filterIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryDim,
    borderWidth: 1.5,
    borderColor: COLORS.borderActive,
  },
  filterIconBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.bg,
  },
  filterBadgeText: { fontSize: 9, fontWeight: '800', color: COLORS.bg, fontFamily: FONTS.bodyBold },

  searchContainer: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text1, fontFamily: FONTS.body },

  fridgeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: 8,
    backgroundColor: COLORS.primaryDim,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderActive,
  },
  fridgeHintText: { flex: 1, fontSize: 11, color: COLORS.primary, fontWeight: '500', fontFamily: FONTS.body },

  listHeader: { backgroundColor: COLORS.bg },

  filterPanel: {
    backgroundColor: COLORS.surface1,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingTop: 12,
    paddingBottom: 4,
  },
  filterPanelLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.text3,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    marginBottom: 6,
    fontFamily: FONTS.bodyBold,
  },
  filterPanelRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    flexDirection: 'row',
  },

  ingredientPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  ingredientEmptyHint: {
    fontSize: 12,
    color: COLORS.text3,
    fontStyle: 'italic',
    paddingHorizontal: 16,
    paddingBottom: 12,
    fontFamily: FONTS.body,
  },

  activeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.primaryDim,
    borderWidth: 1,
    borderColor: COLORS.borderActive,
  },
  activeChipText: { fontSize: 12, fontWeight: '700', color: COLORS.primary, fontFamily: FONTS.bodyBold },
  clearAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clearAllText: { fontSize: 12, fontWeight: '600', color: COLORS.text3, fontFamily: FONTS.body },

  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignSelf: 'flex-start',
  },
  catPillActive: {
    backgroundColor: COLORS.primaryDim,
    borderColor: COLORS.borderActive,
  },
  catText: { fontSize: 13, fontWeight: '600', color: COLORS.text3, fontFamily: FONTS.body },
  catTextActive: { color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.bodyBold },

  resultsHeader: { paddingHorizontal: 20, paddingVertical: 10 },
  resultsCount: { fontSize: 12, color: COLORS.text3, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: FONTS.body },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  gridContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  gridRow: { gap: 12 },

  card: {
    flex: 1,
    backgroundColor: COLORS.surface1,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImage: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  cardPhoto: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    width: '100%',
    height: '100%',
  },
  cardSaveBtn: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  cardDiffBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.52)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  cardDiffText: { fontSize: 10, fontWeight: '700', fontFamily: FONTS.body },
  cardCuisineBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.52)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    maxWidth: '80%',
  },
  cardCuisineText: { fontSize: 10, color: '#fff', fontWeight: '600', fontFamily: FONTS.body },
  cardContent: { padding: 10 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text1, marginBottom: 6, lineHeight: 18, fontFamily: FONTS.titleBold },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMetaText: { fontSize: 12, color: COLORS.text3, fontWeight: '500', flex: 1, fontFamily: FONTS.body },
  cardAuthor: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderActive,
  },
  cardAuthorText: { fontSize: 9, fontWeight: '800', color: COLORS.primary },

  empty: { alignItems: 'center', paddingTop: 60, gap: 14 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryDim,
    borderWidth: 1,
    borderColor: COLORS.borderActive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text1, fontFamily: FONTS.titleBold },
  emptyText: { fontSize: 14, color: COLORS.text2, textAlign: 'center', fontFamily: FONTS.body },
});
