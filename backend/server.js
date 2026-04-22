require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET env var is required');

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:8081', 'http://localhost:19006'];

app.use(helmet());
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados pedidos, tenta mais tarde.' },
}));
app.use(express.json({ limit: '15mb' }));

// ── Middleware de autenticação ──────────────────────────────────────────────
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Token em falta' });
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

// ── AUTH ────────────────────────────────────────────────────────────────────

// Registar
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password)
      return res.status(400).json({ error: 'Preenche todos os campos' });

    if (password.length < 6)
      return res.status(400).json({ error: 'Password deve ter pelo menos 6 caracteres' });

    const existing = await db.get(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );
    if (existing) return res.status(409).json({ error: 'Email ou username já existe' });

    const hash = bcrypt.hashSync(password, 10);
    await db.run(
      'INSERT INTO users (name, username, email, password) VALUES (?, ?, ?, ?)',
      [name, username, email, hash]
    );

    const user = await db.get(
      'SELECT id, name, first_name, last_name, username, email, avatar, bio, cooking_type, nationality, followers, following, recipes_count, created_at FROM users WHERE email = ?',
      [email]
    );

    if (!user) return res.status(500).json({ error: 'Erro ao criar utilizador' });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ user, token });
  } catch (e) {
    console.error('Register error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'Preenche todos os campos' });

    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' });

    const { password: _, ...userSafe } = user;
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });

    res.json({ user: userSafe, token });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Perfil do utilizador atual
app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const user = await db.get(
      'SELECT id, name, first_name, last_name, username, email, avatar, bio, cooking_type, nationality, followers, following, recipes_count, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Atualizar perfil
app.put('/api/auth/me', auth, async (req, res) => {
  try {
    const { name, first_name, last_name, username, bio, cooking_type, nationality, avatar } = req.body;

    if (username) {
      const existing = await db.get('SELECT id FROM users WHERE username = ? AND id != ?', [username, req.user.id]);
      if (existing) return res.status(409).json({ error: 'Username já está a ser utilizado' });
    }

    await db.run(
      'UPDATE users SET name = ?, first_name = ?, last_name = ?, username = COALESCE(?, username), bio = ?, cooking_type = ?, nationality = ?, avatar = ? WHERE id = ?',
      [name, first_name ?? null, last_name ?? null, username ?? null, bio, cooking_type, nationality ?? null, avatar ?? null, req.user.id]
    );
    const user = await db.get(
      'SELECT id, name, first_name, last_name, username, email, avatar, bio, cooking_type, nationality, followers, following, recipes_count, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Apagar conta
app.delete('/api/auth/me', auth, async (req, res) => {
  try {
    await db.run('DELETE FROM users WHERE id = ?', [req.user.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── RECIPES ─────────────────────────────────────────────────────────────────

function parseRecipe(row) {
  if (!row) return null;
  return {
    ...row,
    tags: JSON.parse(row.tags || '[]'),
    diet: JSON.parse(row.diet || '[]'),
    cooking_method: JSON.parse(row.cooking_method || '[]'),
    ingredients: [],
    steps: [],
  };
}

// Listar receitas (feed)
app.get('/api/recipes', async (req, res) => {
  try {
    const recipes = await db.all(`
      SELECT r.*, u.name as author_name, u.username as author_username, u.avatar as author_avatar, u.cooking_type as author_cooking_type
      FROM recipes r
      LEFT JOIN users u ON r.author_id = u.id
      ORDER BY r.created_at DESC
    `);

    const result = await Promise.all(recipes.map(async (r) => {
      const recipe = parseRecipe(r);
      recipe.ingredients = await db.all('SELECT * FROM ingredients WHERE recipe_id = ? ORDER BY id', [r.id]);
      recipe.steps = await db.all('SELECT * FROM steps WHERE recipe_id = ? ORDER BY number', [r.id]);
      return recipe;
    }));

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Receita por ID
app.get('/api/recipes/:id', async (req, res) => {
  try {
    const r = await db.get(`
      SELECT r.*, u.name as author_name, u.username as author_username, u.avatar as author_avatar, u.cooking_type as author_cooking_type
      FROM recipes r
      LEFT JOIN users u ON r.author_id = u.id
      WHERE r.id = ?
    `, [req.params.id]);

    if (!r) return res.status(404).json({ error: 'Receita não encontrada' });

    const recipe = parseRecipe(r);
    recipe.ingredients = await db.all('SELECT * FROM ingredients WHERE recipe_id = ? ORDER BY id', [r.id]);
    recipe.steps = await db.all('SELECT * FROM steps WHERE recipe_id = ? ORDER BY number', [r.id]);

    res.json(recipe);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Criar receita
app.post('/api/recipes', auth, async (req, res) => {
  try {
    const { title, image, category, cuisine, dish_type, cooking_method, difficulty, prep_time, cook_time, servings, calories, cost, diet, tags, ingredients, steps } = req.body;

    if (!title?.trim()) return res.status(400).json({ error: 'Título obrigatório' });

    await db.run(
      `INSERT INTO recipes (title, image, category, cuisine, dish_type, cooking_method, difficulty, prep_time, cook_time, servings, calories, cost, diet, tags, author_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, image || null, category || cuisine || 'Outro', cuisine || 'Internacional', dish_type || 'Prato Principal',
       JSON.stringify(cooking_method || []),
       difficulty || 'Fácil', prep_time || 0, cook_time || 0,
       servings || 2, calories || null, cost || '€',
       JSON.stringify(diet || []), JSON.stringify(tags || []), req.user.id]
    );

    const recipe = await db.get('SELECT * FROM recipes WHERE author_id = ? ORDER BY id DESC LIMIT 1', [req.user.id]);
    const recipeId = recipe.id;

    if (ingredients?.length) {
      for (const ing of ingredients) {
        if (ing.name?.trim()) {
          await db.run(
            'INSERT INTO ingredients (recipe_id, name, amount, unit, category, canonical_name) VALUES (?, ?, ?, ?, ?, ?)',
            [recipeId, ing.name, ing.amount || '', ing.unit || '', ing.category || 'Outros', ing.canonical_name || null]
          );
        }
      }
    }

    if (steps?.length) {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (step.description?.trim()) {
          await db.run(
            'INSERT INTO steps (recipe_id, number, description, duration) VALUES (?, ?, ?, ?)',
            [recipeId, i + 1, step.description, step.duration || null]
          );
        }
      }
    }

    await db.run('UPDATE users SET recipes_count = recipes_count + 1 WHERE id = ?', [req.user.id]);

    const full = await db.get(`
      SELECT r.*, u.name as author_name, u.username as author_username, u.avatar as author_avatar
      FROM recipes r LEFT JOIN users u ON r.author_id = u.id WHERE r.id = ?
    `, [recipeId]);
    const result = parseRecipe(full);
    result.ingredients = await db.all('SELECT * FROM ingredients WHERE recipe_id = ?', [recipeId]);
    result.steps = await db.all('SELECT * FROM steps WHERE recipe_id = ?', [recipeId]);

    res.status(201).json(result);
  } catch (e) {
    console.error('Create recipe error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Editar receita (própria)
app.put('/api/recipes/:id', auth, async (req, res) => {
  try {
    const recipe = await db.get('SELECT * FROM recipes WHERE id = ? AND author_id = ?', [req.params.id, req.user.id]);
    if (!recipe) return res.status(404).json({ error: 'Receita não encontrada ou sem permissão' });

    const { title, image, cuisine, dish_type, cooking_method, difficulty, prep_time, cook_time, servings, calories, cost, diet, tags, ingredients, steps } = req.body;

    if (!title?.trim()) return res.status(400).json({ error: 'Título obrigatório' });

    await db.run(
      `UPDATE recipes SET title=?, image=?, cuisine=?, dish_type=?, cooking_method=?, difficulty=?, prep_time=?, cook_time=?, servings=?, calories=?, cost=?, diet=?, tags=? WHERE id=?`,
      [title, image ?? recipe.image, cuisine || 'Internacional', dish_type || 'Prato Principal',
       JSON.stringify(cooking_method || []), difficulty || 'Fácil',
       prep_time || 0, cook_time || 0, servings || 2, calories || null, cost || '€',
       JSON.stringify(diet || []), JSON.stringify(tags || []), req.params.id]
    );

    await db.run('DELETE FROM ingredients WHERE recipe_id = ?', [req.params.id]);
    await db.run('DELETE FROM steps WHERE recipe_id = ?', [req.params.id]);

    if (ingredients?.length) {
      for (const ing of ingredients) {
        if (ing.name?.trim()) {
          await db.run(
            'INSERT INTO ingredients (recipe_id, name, amount, unit, category, canonical_name) VALUES (?, ?, ?, ?, ?, ?)',
            [req.params.id, ing.name, ing.amount || '', ing.unit || '', ing.category || 'Outros', ing.canonical_name || null]
          );
        }
      }
    }

    if (steps?.length) {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (step.description?.trim()) {
          await db.run('INSERT INTO steps (recipe_id, number, description, duration) VALUES (?, ?, ?, ?)',
            [req.params.id, i + 1, step.description, step.duration || null]);
        }
      }
    }

    const full = await db.get(`SELECT r.*, u.name as author_name FROM recipes r LEFT JOIN users u ON r.author_id = u.id WHERE r.id = ?`, [req.params.id]);
    const result = parseRecipe(full);
    result.ingredients = await db.all('SELECT * FROM ingredients WHERE recipe_id = ?', [req.params.id]);
    result.steps = await db.all('SELECT * FROM steps WHERE recipe_id = ?', [req.params.id]);
    res.json(result);
  } catch (e) {
    console.error('Update recipe error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Apagar receita (própria)
app.delete('/api/recipes/:id', auth, async (req, res) => {
  try {
    const recipe = await db.get('SELECT * FROM recipes WHERE id = ? AND author_id = ?', [req.params.id, req.user.id]);
    if (!recipe) return res.status(404).json({ error: 'Receita não encontrada ou sem permissão' });
    await db.run('DELETE FROM ingredients WHERE recipe_id = ?', [req.params.id]);
    await db.run('DELETE FROM steps WHERE recipe_id = ?', [req.params.id]);
    await db.run('DELETE FROM recipes WHERE id = ?', [req.params.id]);
    await db.run('UPDATE users SET recipes_count = GREATEST(0, recipes_count - 1) WHERE id = ?', [req.user.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── USERS ───────────────────────────────────────────────────────────────────
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await db.get(
      'SELECT id, name, first_name, last_name, username, avatar, bio, cooking_type, nationality, followers, following, recipes_count, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/users/:id/recipes', async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT r.*, u.name as author_name, u.username as author_username, u.avatar as author_avatar
      FROM recipes r LEFT JOIN users u ON r.author_id = u.id
      WHERE r.author_id = ?
      ORDER BY r.created_at DESC
    `, [req.params.id]);
    res.json(rows.map(parseRecipe));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/users/:id/cooked', async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT r.*, u.name as author_name, u.username as author_username, u.avatar as author_avatar
      FROM user_cooked uc
      JOIN recipes r ON uc.recipe_id = r.id
      LEFT JOIN users u ON r.author_id = u.id
      WHERE uc.user_id = ?
      ORDER BY uc.cooked_at DESC
    `, [req.params.id]);
    res.json(rows.map(parseRecipe));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── FOLLOWS ─────────────────────────────────────────────────────────────────

app.get('/api/users/:id/follow', auth, async (req, res) => {
  try {
    const row = await db.get('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?', [req.user.id, req.params.id]);
    res.json({ following: !!row });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/users/:id/follow', auth, async (req, res) => {
  try {
    const targetId = req.params.id;
    if (String(req.user.id) === String(targetId)) return res.status(400).json({ error: 'Não podes seguir-te a ti próprio' });
    const already = await db.get('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?', [req.user.id, targetId]);
    if (already) return res.json({ following: true });
    await db.run('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)', [req.user.id, targetId]);
    await db.run('UPDATE users SET following = following + 1 WHERE id = ?', [req.user.id]);
    await db.run('UPDATE users SET followers = followers + 1 WHERE id = ?', [targetId]);
    const target = await db.get('SELECT followers FROM users WHERE id = ?', [targetId]);
    const me = await db.get('SELECT following FROM users WHERE id = ?', [req.user.id]);
    res.json({ following: true, followers: target.followers, myFollowing: me.following });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/users/:id/follow', auth, async (req, res) => {
  try {
    const targetId = req.params.id;
    const exists = await db.get('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?', [req.user.id, targetId]);
    if (!exists) return res.json({ following: false });
    await db.run('DELETE FROM follows WHERE follower_id = ? AND following_id = ?', [req.user.id, targetId]);
    await db.run('UPDATE users SET following = GREATEST(0, following - 1) WHERE id = ?', [req.user.id]);
    await db.run('UPDATE users SET followers = GREATEST(0, followers - 1) WHERE id = ?', [targetId]);
    const target = await db.get('SELECT followers FROM users WHERE id = ?', [targetId]);
    const me = await db.get('SELECT following FROM users WHERE id = ?', [req.user.id]);
    res.json({ following: false, followers: target.followers, myFollowing: me.following });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── SHOPPING LIST ────────────────────────────────────────────────────────────

app.get('/api/users/me/shopping', auth, async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM shopping_list WHERE user_id = ? ORDER BY created_at ASC', [req.user.id]);
    res.json(rows.map(r => ({
      itemId: r.item_id,
      recipeId: r.recipe_id,
      recipeTitle: r.recipe_title,
      recipeImage: r.recipe_image,
      name: r.name,
      amount: r.amount,
      unit: r.unit,
      category: r.category,
      checked: r.checked,
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users/me/shopping', auth, async (req, res) => {
  try {
    const items = req.body?.items ?? [];
    for (const item of items) {
      await db.run(
        `INSERT INTO shopping_list (item_id, user_id, recipe_id, recipe_title, recipe_image, name, amount, unit, category, checked)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (user_id, item_id) DO NOTHING`,
        [item.itemId, req.user.id, item.recipeId, item.recipeTitle ?? '', item.recipeImage ?? null,
         item.name, item.amount ?? '', item.unit ?? '', item.category ?? 'Outros', false]
      );
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/users/me/shopping/:itemId/check', auth, async (req, res) => {
  try {
    await db.run(
      'UPDATE shopping_list SET checked = NOT checked WHERE user_id = ? AND item_id = ?',
      [req.user.id, req.params.itemId]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/users/me/shopping/:itemId', auth, async (req, res) => {
  try {
    await db.run('DELETE FROM shopping_list WHERE user_id = ? AND item_id = ?', [req.user.id, req.params.itemId]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/users/me/shopping', auth, async (req, res) => {
  try {
    const { checked_only } = req.query;
    if (checked_only === 'true') {
      await db.run('DELETE FROM shopping_list WHERE user_id = ? AND checked = TRUE', [req.user.id]);
    } else {
      await db.run('DELETE FROM shopping_list WHERE user_id = ?', [req.user.id]);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── LIKES ───────────────────────────────────────────────────────────────────

app.get('/api/users/me/liked', auth, async (req, res) => {
  try {
    const rows = await db.all('SELECT recipe_id FROM recipe_likes WHERE user_id = ?', [req.user.id]);
    res.json(rows.map(r => String(r.recipe_id)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/recipes/:id/like', auth, async (req, res) => {
  try {
    const already = await db.get('SELECT 1 FROM recipe_likes WHERE user_id = ? AND recipe_id = ?', [req.user.id, req.params.id]);
    if (!already) {
      await db.run('INSERT INTO recipe_likes (user_id, recipe_id) VALUES (?, ?)', [req.user.id, req.params.id]);
      await db.run('UPDATE recipes SET likes = likes + 1 WHERE id = ?', [req.params.id]);
    }
    res.json({ liked: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/recipes/:id/like', auth, async (req, res) => {
  try {
    await db.run('DELETE FROM recipe_likes WHERE user_id = ? AND recipe_id = ?', [req.user.id, req.params.id]);
    await db.run('UPDATE recipes SET likes = GREATEST(0, likes - 1) WHERE id = ?', [req.params.id]);
    res.json({ liked: false });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── SAVED ───────────────────────────────────────────────────────────────────

app.get('/api/users/me/saved', auth, async (req, res) => {
  try {
    const rows = await db.all('SELECT recipe_id FROM saved_recipes WHERE user_id = ?', [req.user.id]);
    res.json(rows.map(r => String(r.recipe_id)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/recipes/:id/save', auth, async (req, res) => {
  try {
    const already = await db.get('SELECT 1 FROM saved_recipes WHERE user_id = ? AND recipe_id = ?', [req.user.id, req.params.id]);
    if (!already) await db.run('INSERT INTO saved_recipes (user_id, recipe_id) VALUES (?, ?)', [req.user.id, req.params.id]);
    res.json({ saved: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/recipes/:id/save', auth, async (req, res) => {
  try {
    await db.run('DELETE FROM saved_recipes WHERE user_id = ? AND recipe_id = ?', [req.user.id, req.params.id]);
    res.json({ saved: false });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── COOKED ──────────────────────────────────────────────────────────────────

app.get('/api/users/me/cooked', auth, async (req, res) => {
  try {
    const rows = await db.all('SELECT recipe_id, cooked_at FROM user_cooked WHERE user_id = ? ORDER BY cooked_at ASC', [req.user.id]);
    res.json(rows.map(r => ({
      recipeId: String(r.recipe_id),
      date: r.cooked_at ? r.cooked_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/recipes/:id/cooked', auth, async (req, res) => {
  try {
    const already = await db.get('SELECT 1 FROM user_cooked WHERE user_id = ? AND recipe_id = ?', [req.user.id, req.params.id]);
    if (already) {
      const recipe = await db.get('SELECT cooked_count FROM recipes WHERE id = ?', [req.params.id]);
      return res.json({ cooked_count: recipe?.cooked_count ?? 0 });
    }
    const cookedAt = req.body?.cooked_at ?? new Date().toISOString().slice(0, 10);
    await db.run('INSERT INTO user_cooked (user_id, recipe_id, cooked_at) VALUES (?, ?, ?)', [req.user.id, req.params.id, cookedAt]);
    await db.run('UPDATE recipes SET cooked_count = cooked_count + 1 WHERE id = ?', [req.params.id]);
    const recipe = await db.get('SELECT cooked_count FROM recipes WHERE id = ?', [req.params.id]);
    res.json({ cooked_count: recipe?.cooked_count ?? 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/recipes/:id/cooked', auth, async (req, res) => {
  try {
    const exists = await db.get('SELECT 1 FROM user_cooked WHERE user_id = ? AND recipe_id = ?', [req.user.id, req.params.id]);
    if (!exists) {
      const recipe = await db.get('SELECT cooked_count FROM recipes WHERE id = ?', [req.params.id]);
      return res.json({ cooked_count: recipe?.cooked_count ?? 0 });
    }
    await db.run('DELETE FROM user_cooked WHERE user_id = ? AND recipe_id = ?', [req.user.id, req.params.id]);
    await db.run('UPDATE recipes SET cooked_count = GREATEST(0, cooked_count - 1) WHERE id = ?', [req.params.id]);
    const recipe = await db.get('SELECT cooked_count FROM recipes WHERE id = ?', [req.params.id]);
    res.json({ cooked_count: recipe?.cooked_count ?? 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── RATINGS ─────────────────────────────────────────────────────────────────

app.get('/api/users/me/ratings', auth, async (req, res) => {
  try {
    const rows = await db.all('SELECT recipe_id, rating FROM ratings WHERE user_id = ?', [req.user.id]);
    const result = {};
    rows.forEach(r => { result[String(r.recipe_id)] = r.rating; });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/recipes/:id/rate', auth, async (req, res) => {
  try {
    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating inválido (1-5)' });
    const recipeId = req.params.id;

    await db.run(
      `INSERT INTO ratings (user_id, recipe_id, rating) VALUES (?, ?, ?)
       ON CONFLICT (user_id, recipe_id) DO UPDATE SET rating = EXCLUDED.rating, created_at = NOW()`,
      [req.user.id, recipeId, rating]
    );

    const stats = await db.get(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as rating_count FROM ratings WHERE recipe_id = ?',
      [recipeId]
    );
    await db.run(
      'UPDATE recipes SET rating = ?, rating_count = ? WHERE id = ?',
      [Math.round((parseFloat(stats.avg_rating ?? 0)) * 10) / 10, parseInt(stats.rating_count ?? 0), recipeId]
    );

    const recipe = await db.get('SELECT author_id, title FROM recipes WHERE id = ?', [recipeId]);
    if (recipe && recipe.author_id !== req.user.id) {
      const rater = await db.get('SELECT name FROM users WHERE id = ?', [req.user.id]);
      await db.run(
        `INSERT INTO notifications (user_id, type, title, message, icon, color, recipe_id, from_user_id)
         VALUES (?, 'rating', ?, ?, 'star', '#D97706', ?, ?)`,
        [recipe.author_id, 'Nova avaliação', `${rater?.name ?? 'Alguém'} avaliou "${recipe.title}" com ${rating}★`, recipeId, req.user.id]
      );
    }

    res.json({ rating: Math.round((parseFloat(stats.avg_rating ?? 0)) * 10) / 10, rating_count: parseInt(stats.rating_count ?? 0) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── COMMENTS ────────────────────────────────────────────────────────────────

app.get('/api/recipes/:id/comments', async (req, res) => {
  try {
    const comments = await db.all(`
      SELECT c.id, c.text, c.created_at, c.user_id,
             u.name as author_name, u.username as author_username, u.avatar as author_avatar
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.recipe_id = ?
      ORDER BY c.created_at ASC
    `, [req.params.id]);
    res.json(comments);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/recipes/:id/comments', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Comentário não pode ser vazio' });
    if (text.trim().length > 500) return res.status(400).json({ error: 'Comentário demasiado longo (máx. 500 caracteres)' });

    const recipe = await db.get('SELECT id FROM recipes WHERE id = ?', [req.params.id]);
    if (!recipe) return res.status(404).json({ error: 'Receita não encontrada' });

    await db.run(
      'INSERT INTO comments (recipe_id, user_id, text) VALUES (?, ?, ?)',
      [req.params.id, req.user.id, text.trim()]
    );

    await db.run('UPDATE recipes SET comments_count = comments_count + 1 WHERE id = ?', [req.params.id]);

    const recipeForNotif = await db.get('SELECT author_id, title FROM recipes WHERE id = ?', [req.params.id]);
    if (recipeForNotif && recipeForNotif.author_id !== req.user.id) {
      const commenter = await db.get('SELECT name FROM users WHERE id = ?', [req.user.id]);
      await db.run(
        `INSERT INTO notifications (user_id, type, title, message, icon, color, recipe_id, from_user_id)
         VALUES (?, 'comment', ?, ?, 'chatbubble-outline', '#C2622D', ?, ?)`,
        [recipeForNotif.author_id, 'Novo comentário', `${commenter?.name ?? 'Alguém'} comentou em "${recipeForNotif.title}"`, req.params.id, req.user.id]
      );
    }

    const comment = await db.get(`
      SELECT c.id, c.text, c.created_at, c.user_id,
             u.name as author_name, u.username as author_username, u.avatar as author_avatar
      FROM comments c LEFT JOIN users u ON c.user_id = u.id
      WHERE c.recipe_id = ? AND c.user_id = ?
      ORDER BY c.id DESC LIMIT 1
    `, [req.params.id, req.user.id]);

    res.status(201).json(comment);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── NOTIFICATIONS ───────────────────────────────────────────────────────────

app.get('/api/notifications', auth, async (req, res) => {
  try {
    const notifs = await db.all(`
      SELECT n.*, u.name as from_name, u.username as from_username, r.title as recipe_title
      FROM notifications n
      LEFT JOIN users u ON n.from_user_id = u.id
      LEFT JOIN recipes r ON n.recipe_id = r.id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT 50
    `, [req.user.id]);
    res.json(notifs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/notifications/read', auth, async (req, res) => {
  try {
    await db.run('UPDATE notifications SET read = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/notifications/unread-count', auth, async (req, res) => {
  try {
    const row = await db.get('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0', [req.user.id]);
    res.json({ count: parseInt(row?.count ?? 0) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── HEALTH ──────────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ ok: true, db: 'postgresql', time: new Date().toISOString() }));

// ── 404 e erros — sempre JSON ────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.path}` });
});

app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message ?? 'Erro interno do servidor' });
});

// ── INICIAR ──────────────────────────────────────────────────────────────────
db.init().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🍳 Cookit backend a correr em http://localhost:${PORT}`);
    console.log(`   Base de dados: PostgreSQL`);
    console.log(`   Health check:  http://localhost:${PORT}/api/health\n`);
  });
}).catch((err) => {
  console.error('Erro ao iniciar a base de dados:', err);
  process.exit(1);
});
