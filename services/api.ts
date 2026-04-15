const BASE_URL = 'http://localhost:3001/api';

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

  updateMe: (token: string, body: { name: string; bio: string; cooking_type: string; avatar?: string | null }) =>
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

  rateRecipe: (token: string, id: number | string, rating: number) =>
    request(`/recipes/${id}/rate`, { method: 'POST', headers: authHeader(token), body: JSON.stringify({ rating }) }),

  getUser: (id: number | string) => request(`/users/${id}`),

  getUserRecipes: (id: number | string) => request(`/users/${id}/recipes`),

  health: () => request('/health'),
};
