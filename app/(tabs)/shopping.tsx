import React, { useState, useMemo } from 'react';
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore, ShoppingItem } from '../../store/useStore';
import { COLORS } from '../../constants/Colors';

export default function ShoppingScreen() {
  const { shoppingList, toggleShoppingItem, removeShoppingItem, removeRecipeFromList } = useStore();
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  // Group items by recipe
  const recipes = useMemo(() => {
    const map = new Map<string, { id: string; title: string; items: ShoppingItem[] }>();
    for (const item of shoppingList) {
      if (!map.has(item.recipeId)) {
        map.set(item.recipeId, { id: item.recipeId, title: item.recipeTitle || 'Receita', items: [] });
      }
      map.get(item.recipeId)!.items.push(item);
    }
    return Array.from(map.values());
  }, [shoppingList]);

  // Auto-select first recipe if none selected or selected was removed
  const activeId = recipes.find((r) => r.id === selectedRecipeId)
    ? selectedRecipeId
    : recipes[0]?.id ?? null;

  const activeRecipe = recipes.find((r) => r.id === activeId) ?? null;

  function handleRemoveRecipe(recipeId: string) {
    const confirm = () => {
      removeRecipeFromList(recipeId);
      if (selectedRecipeId === recipeId) setSelectedRecipeId(null);
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Remover todos os ingredientes desta receita?')) confirm();
    } else {
      Alert.alert('Remover receita', 'Remover todos os ingredientes desta receita da lista?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: confirm },
      ]);
    }
  }

  if (shoppingList.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Lista de Compras</Text>
        </View>
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="cart-outline" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>Lista vazia</Text>
          <Text style={styles.emptyText}>Adiciona ingredientes a partir das receitas</Text>
        </View>
      </SafeAreaView>
    );
  }

  const checkedInActive = activeRecipe?.items.filter((i) => i.checked).length ?? 0;
  const totalInActive = activeRecipe?.items.length ?? 0;
  const progress = totalInActive > 0 ? (checkedInActive / totalInActive) * 100 : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lista de Compras</Text>
        <Text style={styles.headerSub}>{recipes.length} {recipes.length === 1 ? 'receita' : 'receitas'}</Text>
      </View>

      <View style={styles.body}>
        {/* ── Left sidebar: recipe list ── */}
        <View style={styles.sidebar}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sidebarContent}>
            {recipes.map((recipe) => {
              const checked = recipe.items.filter((i) => i.checked).length;
              const total = recipe.items.length;
              const isActive = recipe.id === activeId;
              const done = checked === total;
              return (
                <TouchableOpacity
                  key={recipe.id}
                  style={[styles.recipeTab, isActive && styles.recipeTabActive]}
                  onPress={() => setSelectedRecipeId(recipe.id)}
                >
                  <View style={[styles.recipeTabDot, done && styles.recipeTabDotDone, isActive && !done && styles.recipeTabDotActive]} />
                  <Text style={[styles.recipeTabTitle, isActive && styles.recipeTabTitleActive]} numberOfLines={3}>
                    {recipe.title}
                  </Text>
                  <Text style={[styles.recipeTabCount, isActive && styles.recipeTabCountActive]}>
                    {checked}/{total}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Right: ingredients ── */}
        <View style={styles.detail}>
          {activeRecipe ? (
            <>
              {/* Mini progress bar */}
              <View style={styles.progressWrap}>
                <View style={[styles.progressBar, { width: `${progress}%` as any }]} />
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailContent}>
                <View style={styles.detailHeader}>
                  <Text style={styles.detailTitle} numberOfLines={2}>{activeRecipe.title}</Text>
                  <Text style={styles.detailSub}>{checkedInActive} de {totalInActive} marcados</Text>
                </View>

                {activeRecipe.items.map((item) => (
                  <View key={item.itemId} style={[styles.item, item.checked && styles.itemChecked]}>
                    <TouchableOpacity
                      style={[styles.checkbox, item.checked && styles.checkboxChecked]}
                      onPress={() => toggleShoppingItem(item.itemId)}
                    >
                      {item.checked && <Ionicons name="checkmark" size={13} color={COLORS.bg} />}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.itemContent}
                      onPress={() => toggleShoppingItem(item.itemId)}
                    >
                      <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>
                        {item.name}
                      </Text>
                      {(item.amount || item.unit) ? (
                        <Text style={styles.itemAmount}>
                          {[item.amount, item.unit].filter(Boolean).join(' ')}
                        </Text>
                      ) : null}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.removeItemBtn}
                      onPress={() => removeShoppingItem(item.itemId)}
                    >
                      <Ionicons name="close" size={16} color={COLORS.text3} />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Remove whole recipe */}
                <TouchableOpacity
                  style={styles.removeRecipeBtn}
                  onPress={() => handleRemoveRecipe(activeRecipe.id)}
                >
                  <Ionicons name="trash-outline" size={15} color={COLORS.accent} />
                  <Text style={styles.removeRecipeBtnText}>Remover receita da lista</Text>
                </TouchableOpacity>
              </ScrollView>
            </>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.surface1,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: COLORS.text1, letterSpacing: -0.4 },
  headerSub: { fontSize: 12, color: COLORS.text3, fontWeight: '600', letterSpacing: 0.2 },

  body: { flex: 1, flexDirection: 'row' },

  // Sidebar
  sidebar: {
    width: 112,
    backgroundColor: COLORS.surface1,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  sidebarContent: { padding: 8, gap: 5 },
  recipeTab: {
    padding: 10,
    borderRadius: 12,
    gap: 5,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  recipeTabActive: {
    backgroundColor: COLORS.primaryDim,
    borderColor: COLORS.borderActive,
  },
  recipeTabDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  recipeTabDotActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  recipeTabDotDone: { backgroundColor: COLORS.green },
  recipeTabTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text3,
    lineHeight: 15,
  },
  recipeTabTitleActive: { color: COLORS.text1, fontWeight: '700' },
  recipeTabCount: { fontSize: 10, fontWeight: '700', color: COLORS.text3 },
  recipeTabCountActive: { color: COLORS.primary },

  // Detail panel
  detail: { flex: 1 },

  progressWrap: { height: 4, backgroundColor: COLORS.surface2 },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.green,
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },

  detailContent: { padding: 16, gap: 8 },

  detailHeader: { marginBottom: 6 },
  detailTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text1, letterSpacing: -0.3 },
  detailSub: { fontSize: 12, color: COLORS.text3, marginTop: 3, fontWeight: '600' },

  item: {
    backgroundColor: COLORS.surface1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  itemChecked: { opacity: 0.35 },

  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },

  itemContent: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: COLORS.text1 },
  itemNameChecked: { textDecorationLine: 'line-through', color: COLORS.text3 },
  itemAmount: { fontSize: 12, color: COLORS.text3, marginTop: 2 },

  removeItemBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  removeRecipeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,45,85,0.25)',
    backgroundColor: 'rgba(255,45,85,0.08)',
  },
  removeRecipeBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.accent },

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
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text1, letterSpacing: -0.3 },
  emptyText: { fontSize: 14, color: COLORS.text2, textAlign: 'center', lineHeight: 22 },
});
