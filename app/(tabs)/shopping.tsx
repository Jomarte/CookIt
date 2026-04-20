import React, { useMemo } from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore, ShoppingItem } from '../../store/useStore';
import { COLORS } from '../../constants/Colors';
import { FONTS } from '../../constants/Fonts';

export default function ShoppingScreen() {
  const { shoppingList, toggleShoppingItem, removeShoppingItem, removeRecipeFromList, clearShoppingList } = useStore();

  const recipes = useMemo(() => {
    const map = new Map<string, { id: string; title: string; image?: string; items: ShoppingItem[] }>();
    for (const item of shoppingList) {
      if (!map.has(item.recipeId)) {
        map.set(item.recipeId, { id: item.recipeId, title: item.recipeTitle || 'Receita', image: item.recipeImage, items: [] });
      }
      map.get(item.recipeId)!.items.push(item);
    }
    return Array.from(map.values());
  }, [shoppingList]);

  function handleClearAll() {
    if (Platform.OS === 'web') {
      if (window.confirm('Limpar toda a lista de compras?')) clearShoppingList();
    } else {
      Alert.alert('Limpar lista', 'Tens a certeza que queres remover tudo?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Limpar', style: 'destructive', onPress: clearShoppingList },
      ]);
    }
  }

  function handleRemoveRecipe(recipeId: string) {
    if (Platform.OS === 'web') {
      if (window.confirm('Remover esta receita da lista?')) removeRecipeFromList(recipeId);
    } else {
      Alert.alert('Remover receita', 'Remover todos os ingredientes desta receita da lista?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: () => removeRecipeFromList(recipeId) },
      ]);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.wordmark}>
          <Text style={styles.wordmarkC}>C</Text>
          <Text style={styles.wordmarkK}>K</Text>
        </View>
        {shoppingList.length > 0 && (
          <TouchableOpacity onPress={handleClearAll}>
            <Text style={styles.clearAll}>CLEAR ALL</Text>
          </TouchableOpacity>
        )}
      </View>

      {shoppingList.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="cart-outline" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>Lista vazia</Text>
          <Text style={styles.emptyText}>Adiciona ingredientes a partir das receitas</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Recipe cards */}
          {recipes.map((recipe) => (
            <View key={recipe.id} style={styles.card}>
              {/* Card header */}
              <View style={styles.cardHeader}>
                {recipe.image ? (
                  <Image source={{ uri: recipe.image }} style={styles.recipeImage} />
                ) : (
                  <View style={styles.recipeImagePlaceholder}>
                    <Ionicons name="restaurant-outline" size={24} color={COLORS.text3} />
                  </View>
                )}
                <View style={styles.cardHeaderText}>
                  <Text style={styles.recipeTitle} numberOfLines={2}>{recipe.title}</Text>
                  <Text style={styles.ingredientCount}>{recipe.items.length} ingredients</Text>
                </View>
                <TouchableOpacity style={styles.trashBtn} onPress={() => handleRemoveRecipe(recipe.id)}>
                  <Ionicons name="trash-outline" size={18} color={COLORS.text3} />
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              {/* Ingredients */}
              {recipe.items.map((item) => (
                <TouchableOpacity
                  key={item.itemId}
                  style={styles.ingredientRow}
                  onPress={() => toggleShoppingItem(item.itemId)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
                    {item.checked && <Ionicons name="checkmark" size={13} color={COLORS.white} />}
                  </View>
                  <Text style={[styles.ingredientText, item.checked && styles.ingredientTextChecked]}>
                    {[item.amount, item.unit, item.name].filter(Boolean).join(' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </ScrollView>
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
  },
  wordmark: { flexDirection: 'row', alignItems: 'center' },
  wordmarkC: { fontSize: 28, fontWeight: '900', color: COLORS.text1, letterSpacing: -1, fontFamily: FONTS.titleBlack },
  wordmarkK: { fontSize: 28, fontWeight: '900', color: COLORS.primary, letterSpacing: -1, fontFamily: FONTS.titleBlack },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 32, gap: 16 },

  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 34,
    fontFamily: FONTS.titleBold,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  clearAll: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.8,
    fontFamily: FONTS.bodyBold,
    paddingBottom: 6,
  },

  card: {
    backgroundColor: COLORS.surface1,
    borderRadius: 20,
    paddingTop: 16,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 14,
  },
  recipeImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: COLORS.surface2,
  },
  recipeImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: { flex: 1 },
  recipeTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text1,
    letterSpacing: -0.3,
    fontFamily: FONTS.titleBold,
    lineHeight: 22,
  },
  ingredientCount: {
    fontSize: 13,
    color: COLORS.text3,
    marginTop: 3,
    fontFamily: FONTS.body,
  },
  trashBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
    marginBottom: 4,
  },

  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 14,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  ingredientText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text1,
    fontFamily: FONTS.body,
  },
  ingredientTextChecked: {
    textDecorationLine: 'line-through',
    color: COLORS.text3,
  },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 40 },
  emptyIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.primaryDim,
    borderWidth: 1.5,
    borderColor: COLORS.borderActive,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text1, letterSpacing: -0.3, fontFamily: FONTS.titleBold },
  emptyText: { fontSize: 14, color: COLORS.text2, textAlign: 'center', lineHeight: 22, fontFamily: FONTS.body },
});
