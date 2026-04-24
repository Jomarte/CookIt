import { create } from 'zustand';
import { api } from '../services/api';

export interface Ingredient {
  id: string;
  name: string;
  amount: string;
  unit: string;
  category: string;
}

export interface ShoppingItem extends Ingredient {
  itemId: string;
  recipeId: string;
  recipeTitle: string;
  recipeImage?: string;
  checked: boolean;
}

export interface CookLog {
  recipeId: string;
  date: string; // YYYY-MM-DD in device local time
}

export interface AppNotification {
  id: string;
  type: 'badge' | 'streak' | 'recipe' | 'system';
  title: string;
  message: string;
  icon: string;
  color: string;
  read: boolean;
  createdAt: string;
}

export interface AuthUser {
  id: number;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  username: string;
  email: string;
  avatar: string | null;
  bio: string;
  cooking_type: string;
  nationality?: string | null;
  followers: number;
  following: number;
  recipes_count: number;
  email_verified: boolean;
  created_at: string;
}

// Returns today's date in YYYY-MM-DD using device local timezone
function localToday(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

// Computes streak: consecutive days ending today where ≥1 recipe was cooked
export function computeStreak(logs: CookLog[]): number {
  const cookedDates = new Set(logs.map((l) => l.date));
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = [
      cursor.getFullYear(),
      String(cursor.getMonth() + 1).padStart(2, '0'),
      String(cursor.getDate()).padStart(2, '0'),
    ].join('-');
    if (!cookedDates.has(key)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// Returns the last 7 calendar days (oldest → newest) with their day labels
export function getLast7Days(): Array<{ label: string; date: string }> {
  const PT_DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']; // Sun=0 … Sat=6
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    result.push({
      label: PT_DAYS[d.getDay()],
      date: [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0'),
      ].join('-'),
    });
  }
  return result;
}

interface AppState {
  // Auth
  user: AuthUser | null;
  token: string | null;
  setAuth: (user: AuthUser, token: string) => void;
  updateUser: (user: AuthUser) => void;
  logout: () => void;

  // Language
  language: 'pt' | 'en';
  setLanguage: (lang: 'pt' | 'en') => void;

  // App
  shoppingList: ShoppingItem[];
  savedRecipes: string[];
  likedRecipes: string[];
  cookedRecipes: string[];
  cookedLogs: CookLog[];
  userRatings: Record<string, number>;

  notifications: AppNotification[];
  earnedBadgeIds: string[];
  pinnedBadgeIds: string[];
  addNotification: (n: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => void;
  markAllRead: () => void;
  setEarnedBadgeIds: (ids: string[]) => void;
  setPinnedBadgeIds: (ids: string[]) => void;

  recipes: any[];
  setRecipes: (recipes: any[]) => void;

  addToShoppingList: (recipeId: string, ingredients: Ingredient[], recipeTitle?: string, recipeImage?: string) => void;
  toggleShoppingItem: (itemId: string) => void;
  removeShoppingItem: (itemId: string) => void;
  removeRecipeFromList: (recipeId: string) => void;
  clearChecked: () => void;
  clearShoppingList: () => void;
  toggleSaved: (recipeId: string) => void;
  toggleLiked: (recipeId: string) => void;
  toggleCooked: (recipeId: string) => void;
  setRating: (recipeId: string, rating: number) => void;
}

export const useStore = create<AppState>()((set, get) => ({
  // Auth
  user: null,
  token: null,
  language: 'pt' as 'pt' | 'en',
  setLanguage: (lang) => set({ language: lang }),
  setAuth: (user, token) => set({ user, token }),
  updateUser: (user) => set((state) => ({
    user,
    recipes: state.recipes.map((r) =>
      String(r.author_id) === String(user.id)
        ? { ...r, author_avatar: user.avatar, author_name: user.name, author_username: user.username }
        : r
    ),
  })),
  logout: () => set({
    user: null,
    token: null,
    cookedRecipes: [],
    cookedLogs: [],
    savedRecipes: [],
    likedRecipes: [],
    shoppingList: [],
    userRatings: {},
  }),

  // App
  recipes: [],
  shoppingList: [],
  savedRecipes: [],
  likedRecipes: [],
  cookedRecipes: [],
  cookedLogs: [],
  userRatings: {},
  notifications: [],
  earnedBadgeIds: [],
  pinnedBadgeIds: [],

  addNotification: (n) => set((state) => ({
    notifications: [{
      ...n,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      read: false,
      createdAt: new Date().toISOString(),
    }, ...state.notifications].slice(0, 50),
  })),
  markAllRead: () => set((state) => ({
    notifications: state.notifications.map((n) => ({ ...n, read: true })),
  })),
  setEarnedBadgeIds: (ids) => set({ earnedBadgeIds: ids }),
  setPinnedBadgeIds: (ids) => set({ pinnedBadgeIds: ids }),

  addToShoppingList: (recipeId, ingredients, recipeTitle = '', recipeImage) => {
    const { token, shoppingList } = get();
    const existingIds = new Set(shoppingList.map((i) => i.itemId));
    const newItems: ShoppingItem[] = ingredients.map((ing) => ({
      ...ing,
      itemId: `${recipeId}-${ing.id ?? ing.name}`,
      recipeId,
      recipeTitle,
      recipeImage,
      checked: false,
    }));
    const toAdd = newItems.filter((i) => !existingIds.has(i.itemId));
    if (toAdd.length === 0) return;
    set((state) => ({ shoppingList: [...state.shoppingList, ...toAdd] }));
    if (token) api.addShoppingItems(token, toAdd).catch(() => {});
  },

  toggleShoppingItem: (itemId) => {
    const { token } = get();
    set((state) => ({
      shoppingList: state.shoppingList.map((item) =>
        item.itemId === itemId ? { ...item, checked: !item.checked } : item
      ),
    }));
    if (token) api.toggleShoppingItemServer(token, itemId).catch(() => {});
  },

  removeShoppingItem: (itemId) => {
    const { token } = get();
    set((state) => ({
      shoppingList: state.shoppingList.filter((i) => i.itemId !== itemId),
    }));
    if (token) api.removeShoppingItemServer(token, itemId).catch(() => {});
  },

  removeRecipeFromList: (recipeId) => {
    const { token, shoppingList } = get();
    const toRemove = shoppingList.filter((i) => i.recipeId === recipeId);
    set((state) => ({
      shoppingList: state.shoppingList.filter((i) => i.recipeId !== recipeId),
    }));
    if (token) {
      toRemove.forEach((i) => api.removeShoppingItemServer(token, i.itemId).catch(() => {}));
    }
  },

  clearChecked: () => {
    const { token } = get();
    set((state) => ({
      shoppingList: state.shoppingList.filter((i) => !i.checked),
    }));
    if (token) api.clearShoppingListServer(token, true).catch(() => {});
  },

  clearShoppingList: () => {
    const { token } = get();
    set({ shoppingList: [] });
    if (token) api.clearShoppingListServer(token, false).catch(() => {});
  },

  setRecipes: (recipes) => set({ recipes }),

  toggleSaved: (recipeId) => {
    const { token, savedRecipes } = get();
    const isSaved = savedRecipes.includes(recipeId);
    set((state) => ({
      savedRecipes: isSaved
        ? state.savedRecipes.filter((id) => id !== recipeId)
        : [...state.savedRecipes, recipeId],
    }));
    if (token) {
      const call = isSaved ? api.unsaveRecipe(token, recipeId) : api.saveRecipe(token, recipeId);
      call.catch(() => {
        set((state) => ({
          savedRecipes: isSaved
            ? [...state.savedRecipes, recipeId]
            : state.savedRecipes.filter((id) => id !== recipeId),
        }));
      });
    }
  },

  toggleLiked: (recipeId) => {
    const { token, likedRecipes } = get();
    const isLiked = likedRecipes.includes(recipeId);
    const delta = isLiked ? -1 : 1;
    set((state) => ({
      likedRecipes: isLiked
        ? state.likedRecipes.filter((id) => id !== recipeId)
        : [...state.likedRecipes, recipeId],
      recipes: state.recipes.map((r) =>
        String(r.id) === recipeId
          ? { ...r, likes: Math.max(0, (r.likes ?? 0) + delta) }
          : r
      ),
    }));
    if (token) {
      const call = isLiked ? api.unlikeRecipe(token, recipeId) : api.likeRecipe(token, recipeId);
      call.catch(() => {
        set((state) => ({
          likedRecipes: isLiked
            ? [...state.likedRecipes, recipeId]
            : state.likedRecipes.filter((id) => id !== recipeId),
          recipes: state.recipes.map((r) =>
            String(r.id) === recipeId
              ? { ...r, likes: Math.max(0, (r.likes ?? 0) - delta) }
              : r
          ),
        }));
      });
    }
  },

  toggleCooked: (recipeId) => {
    const { token, cookedRecipes } = get();
    const isCooked = cookedRecipes.includes(recipeId);
    const today = localToday();
    set((state) => {
      if (isCooked) {
        return {
          cookedRecipes: state.cookedRecipes.filter((id) => id !== recipeId),
          cookedLogs: state.cookedLogs.filter((l) => l.recipeId !== recipeId),
        };
      } else {
        return {
          cookedRecipes: [...state.cookedRecipes, recipeId],
          cookedLogs: [...state.cookedLogs, { recipeId, date: today }],
        };
      }
    });
    if (token) {
      const call = isCooked ? api.uncookRecipe(token, recipeId) : api.cookRecipe(token, recipeId, today);
      call.catch(() => {
        // Revert on failure
        set((state) => {
          if (isCooked) {
            return {
              cookedRecipes: [...state.cookedRecipes, recipeId],
              cookedLogs: [...state.cookedLogs, { recipeId, date: today }],
            };
          } else {
            return {
              cookedRecipes: state.cookedRecipes.filter((id) => id !== recipeId),
              cookedLogs: state.cookedLogs.filter((l) => l.recipeId !== recipeId),
            };
          }
        });
      });
    }
  },

  setRating: (recipeId, rating) => {
    set((state) => ({
      userRatings: { ...state.userRatings, [recipeId]: rating },
    }));
  },
}));
