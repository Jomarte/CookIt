import { API_URL } from '../config';
const BASE_URL = API_URL;

async function request(path: string, options: RequestInit = {}) {
  const { headers: optHeaders, ...restOptions } = options;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(optHeaders as Record<string, string>),
    },
  });

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Servidor offline ou erro inesperado (${res.status})`);
  }

  if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido');
  return data;
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export const api = {
  register: (body: { name: string; username: string; email: string; password: string }) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  me: (token: string) =>
    request('/auth/me', { headers: authHeader(token) }),

  updateMe: (token: string, body: { name: string; first_name?: string | null; last_name?: string | null; username?: string; bio: string; cooking_type: string; nationality?: string | null; avatar?: string | null }) =>
    request('/auth/me', { method: 'PUT', headers: authHeader(token), body: JSON.stringify(body) }),

  deleteMe: (token: string) =>
    request('/auth/me', { method: 'DELETE', headers: authHeader(token) }),

  // Receitas
  getRecipes: () => request('/recipes'),

  getRecipe: (id: number | string) => request(`/recipes/${id}`),

  createRecipe: (token: string, body: {
    title: string; image?: string; category?: string; difficulty: string;
    cuisine?: string; dish_type?: string; cooking_method?: string[];
    prep_time: number; cook_time: number; servings: number;
    calories?: number; cost: string; diet: string[]; tags: string[];
    ingredients: { name: string; amount: string; unit: string; category: string; canonical_name?: string | null }[];
    steps: { description: string; duration?: number }[];
  }) => request('/recipes', { method: 'POST', headers: authHeader(token), body: JSON.stringify(body) }),

  updateRecipe: (token: string, id: number, body: {
    title: string; image?: string | null; cuisine?: string; dish_type?: string; cooking_method?: string[];
    difficulty: string; prep_time: number; cook_time: number; servings: number;
    cost: string; diet: string[]; tags: string[];
    ingredients: { name: string; amount: string; unit: string; category: string; canonical_name?: string | null }[];
    steps: { description: string }[];
  }) => request(`/recipes/${id}`, { method: 'PUT', headers: authHeader(token), body: JSON.stringify(body) }),

  deleteRecipe: (token: string, id: number) =>
    request(`/recipes/${id}`, { method: 'DELETE', headers: authHeader(token) }),

  cookRecipe: (token: string, id: number | string, cookedAt?: string) =>
    request(`/recipes/${id}/cooked`, { method: 'POST', headers: authHeader(token), body: JSON.stringify({ cooked_at: cookedAt }) }),

  uncookRecipe: (token: string, id: number | string) =>
    request(`/recipes/${id}/cooked`, { method: 'DELETE', headers: authHeader(token) }),

  getSavedRecipes: (token: string): Promise<string[]> =>
    request('/users/me/saved', { headers: authHeader(token) }),

  saveRecipe: (token: string, id: number | string) =>
    request(`/recipes/${id}/save`, { method: 'POST', headers: authHeader(token) }),

  unsaveRecipe: (token: string, id: number | string) =>
    request(`/recipes/${id}/save`, { method: 'DELETE', headers: authHeader(token) }),

  getCookedRecipes: (token: string): Promise<{ recipeId: string; date: string }[]> =>
    request('/users/me/cooked', { headers: authHeader(token) }),

  getUserRatings: (token: string): Promise<Record<string, number>> =>
    request('/users/me/ratings', { headers: authHeader(token) }),

  rateRecipe: (token: string, id: number | string, rating: number) =>
    request(`/recipes/${id}/rate`, { method: 'POST', headers: authHeader(token), body: JSON.stringify({ rating }) }),

  getComments: (recipeId: number | string) =>
    request(`/recipes/${recipeId}/comments`),

  postComment: (token: string, recipeId: number | string, text: string) =>
    request(`/recipes/${recipeId}/comments`, { method: 'POST', headers: authHeader(token), body: JSON.stringify({ text }) }),

  getUser: (id: number | string) => request(`/users/${id}`),

  getUserRecipes: (id: number | string) => request(`/users/${id}/recipes`),

  isFollowing: (token: string, id: number | string) =>
    request(`/users/${id}/follow`, { headers: authHeader(token) }),
  followUser: (token: string, id: number | string) =>
    request(`/users/${id}/follow`, { method: 'POST', headers: authHeader(token) }),
  unfollowUser: (token: string, id: number | string) =>
    request(`/users/${id}/follow`, { method: 'DELETE', headers: authHeader(token) }),

  getNotifications: (token: string) =>
    request('/notifications', { headers: authHeader(token) }),

  markNotificationsRead: (token: string) =>
    request('/notifications/read', { method: 'PUT', headers: authHeader(token) }),

  getUnreadCount: (token: string) =>
    request('/notifications/unread-count', { headers: authHeader(token) }),

  health: () => request('/health'),
};
