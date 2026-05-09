require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const db = require('./database');
const path = require('path');
const fs = require('fs');

const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');

const googleClient = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;

const API_URL = process.env.API_URL || `http://localhost:${process.env.PORT || 3001}`;

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET env var is required');
if (JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');

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

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas tentativas. Tenta novamente em 15 minutos.' },
});


// Rate limit for public read endpoints (unauthenticated)
const publicLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados pedidos. Tenta novamente em breve.' },
});

const commentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados comentários. Aguarda um momento.' },
});

// OWASP: Never expose internal error details in production
const IS_PROD = process.env.NODE_ENV === 'production';
function serverError(res, err, fallback = 'Erro interno do servidor') {
  console.error(err);
  res.status(500).json({ error: IS_PROD ? fallback : (err?.message ?? fallback) });
}

// OWASP: Input validation helpers
const VALID_DATE = /^\d{4}-\d{2}-\d{2}$/;
function isValidDate(s) {
  if (!VALID_DATE.test(s)) return false;
  const d = new Date(s);
  return !isNaN(d.getTime()) && d <= new Date();
}
function sanitizeStr(s, maxLen = 500) {
  return typeof s === 'string' ? s.trim().slice(0, maxLen) : '';
}

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: false }));

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
// Google Sign-In
app.post('/api/auth/google', authLimiter, async (req, res) => {
  try {
    if (!googleClient) return res.status(503).json({ error: 'Google Sign-In não configurado' });

    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'idToken em falta' });

    // Verify token with Google
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ error: 'Token Google inválido' });
    }

    const { sub: googleId, email, name, picture } = payload;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) return res.status(400).json({ error: 'Email em falta no token Google' });

    // Find existing user by google_id or email
    let user = await db.get(
      'SELECT id, name, first_name, last_name, username, email, avatar, bio, cooking_type, nationality, followers, following, recipes_count, email_verified, google_id, created_at FROM users WHERE google_id = ? OR email = ?',
      [googleId, normalizedEmail]
    );

    let isNew = false;

    if (!user) {
      // New user — create account
      isNew = true;
      const baseUsername = (name || 'chef')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 20) || 'chef';

      // Ensure unique username
      let username = baseUsername;
      let suffix = 1;
      while (true) {
        const exists = await db.get('SELECT id FROM users WHERE username = ?', [username]);
        if (!exists) break;
        username = `${baseUsername}${suffix++}`;
      }

      const now = new Date().toISOString();
      await db.run(
        'INSERT INTO users (name, username, email, password, avatar, google_id, email_verified, terms_accepted_at) VALUES (?, ?, ?, NULL, ?, ?, TRUE, ?)',
        [name || 'Chef', username, normalizedEmail, picture || null, googleId, now]
      );

      user = await db.get(
        'SELECT id, name, first_name, last_name, username, email, avatar, bio, cooking_type, nationality, followers, following, recipes_count, email_verified, google_id, created_at FROM users WHERE email = ?',
        [normalizedEmail]
      );
    } else if (!user.google_id) {
      // Existing email user — link google account
      await db.run('UPDATE users SET google_id = ?, email_verified = TRUE WHERE id = ?', [googleId, user.id]);
      user.google_id = googleId;
      user.email_verified = true;
    }

    if (!user) return res.status(500).json({ error: 'Erro ao criar utilizador' });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    const { google_id: _, ...userSafe } = user;
    res.json({ user: userSafe, token, is_new: isNew });
  } catch (e) {
    serverError(res, e);
  }
});

// Perfil do utilizador atual
app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const user = await db.get(
      `SELECT id, name, first_name, last_name, username, email, avatar, bio, cooking_type,
              nationality, followers, following, recipes_count, email_verified, created_at
       FROM users WHERE id = ?`,
      [req.user.id]
    );
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado' });
    res.json(user);
  } catch (e) {
    serverError(res, e);
  }
});

// Atualizar perfil
app.put('/api/auth/me', auth, async (req, res) => {
  try {
    const { name, first_name, last_name, username, bio, cooking_type, nationality, avatar } = req.body;

    if (name && name.length > 100) return res.status(400).json({ error: 'Nome demasiado longo' });
    if (username && username.length > 50) return res.status(400).json({ error: 'Username demasiado longo' });
    if (bio && bio.length > 500) return res.status(400).json({ error: 'Bio demasiado longa' });

    if (avatar && !avatar.startsWith('https://') && avatar.length > 7 * 1024 * 1024) {
      return res.status(400).json({ error: 'Avatar demasiado grande (máx. 5 MB)' });
    }
    if (avatar && !avatar.startsWith('data:image/') && !avatar.startsWith('https://')) {
      return res.status(400).json({ error: 'Formato de avatar inválido' });
    }

    if (username) {
      const existing = await db.get('SELECT id FROM users WHERE username = ? AND id != ?', [username, req.user.id]);
      if (existing) return res.status(409).json({ error: 'Username já está a ser utilizado' });
    }

    await db.run(
      'UPDATE users SET name = ?, first_name = ?, last_name = ?, username = COALESCE(?, username), bio = ?, cooking_type = ?, nationality = ?, avatar = ? WHERE id = ?',
      [name, first_name ?? null, last_name ?? null, username ?? null, bio, cooking_type, nationality ?? null, avatar ?? null, req.user.id]
    );
    const user = await db.get(
      `SELECT id, name, first_name, last_name, username, email, avatar, bio, cooking_type,
              nationality, followers, following, recipes_count, email_verified, created_at
       FROM users WHERE id = ?`,
      [req.user.id]
    );
    res.json(user);
  } catch (e) {
    serverError(res, e);
  }
});

// Apagar conta
app.delete('/api/auth/me', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Decrement follower/following counters before cascade removes the rows
    await db.run(
      'UPDATE users SET followers = GREATEST(0, followers - 1) WHERE id IN (SELECT following_id FROM follows WHERE follower_id = ?)',
      [userId]
    );
    await db.run(
      'UPDATE users SET following = GREATEST(0, following - 1) WHERE id IN (SELECT follower_id FROM follows WHERE following_id = ?)',
      [userId]
    );

    // Decrement like/save counters on other users' recipes
    await db.run(
      'UPDATE recipes SET likes = GREATEST(0, likes - 1) WHERE id IN (SELECT recipe_id FROM recipe_likes WHERE user_id = ?)',
      [userId]
    );
    await db.run(
      'UPDATE recipes SET saves = GREATEST(0, saves - 1) WHERE id IN (SELECT recipe_id FROM saved_recipes WHERE user_id = ?)',
      [userId]
    );

    // Delete ratings made by this user (no FK cascade on user_id in ratings)
    await db.run('DELETE FROM ratings WHERE user_id = ?', [userId]);

    // Delete user's recipes — cascades ingredients, steps, comments, recipe_likes, saved_recipes, user_cooked, ratings on those recipes
    await db.run('DELETE FROM recipes WHERE author_id = ?', [userId]);

    // Delete the user — cascades follows, recipe_likes, saved_recipes, user_cooked, shopping_list, notifications, tokens, comments
    await db.run('DELETE FROM users WHERE id = ?', [userId]);

    res.json({ ok: true });
  } catch (e) {
    serverError(res, e);
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
app.get('/api/recipes', publicLimiter, async (req, res) => {
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
    serverError(res, e);
  }
});

// Receita por ID
app.get('/api/recipes/:id', publicLimiter, async (req, res) => {
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
    serverError(res, e);
  }
});

// Criar receita
app.post('/api/recipes', auth, async (req, res) => {
  try {
    const { title, image, category, cuisine, dish_type, cooking_method, difficulty, prep_time, cook_time, servings, calories, cost, diet, tags, ingredients, steps } = req.body;

    if (!title?.trim()) return res.status(400).json({ error: 'Título obrigatório' });
    if (title.trim().length > 200) return res.status(400).json({ error: 'Título demasiado longo' });

    // OWASP: Validate image field (base64 data URI, max 5MB)
    if (image && image.length > 7 * 1024 * 1024) {
      return res.status(400).json({ error: 'Imagem demasiado grande (máx. 5 MB)' });
    }
    if (image && !image.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Formato de imagem inválido' });
    }

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
    serverError(res, e);
  }
});

// Editar receita (própria)
app.put('/api/recipes/:id', auth, async (req, res) => {
  try {
    const recipe = await db.get('SELECT * FROM recipes WHERE id = ? AND author_id = ?', [req.params.id, req.user.id]);
    if (!recipe) return res.status(404).json({ error: 'Receita não encontrada ou sem permissão' });

    const { title, image, cuisine, dish_type, cooking_method, difficulty, prep_time, cook_time, servings, calories, cost, diet, tags, ingredients, steps } = req.body;

    if (!title?.trim()) return res.status(400).json({ error: 'Título obrigatório' });

    // OWASP: Validate image field (base64 data URI, max 5MB)
    if (image && image.length > 7 * 1024 * 1024) {
      return res.status(400).json({ error: 'Imagem demasiado grande (máx. 5 MB)' });
    }
    if (image && !image.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Formato de imagem inválido' });
    }

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
    serverError(res, e);
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
    serverError(res, e);
  }
});

// ── USERS ───────────────────────────────────────────────────────────────────
app.get('/api/users/search', publicLimiter, async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q || q.length < 2) return res.json([]);
  try {
    const pattern = `%${q}%`;
    const users = await db.all(
      `SELECT id, name, username, avatar, bio, cooking_type, nationality, followers, recipes_count
       FROM users
       WHERE name LIKE ? OR username LIKE ?
       ORDER BY followers DESC, recipes_count DESC
       LIMIT 20`,
      [pattern, pattern]
    );
    res.json(users);
  } catch (e) {
    serverError(res, e);
  }
});

app.get('/api/users/:id', publicLimiter, async (req, res) => {
  try {
    const user = await db.get(
      'SELECT id, name, first_name, last_name, username, avatar, bio, cooking_type, nationality, followers, following, recipes_count, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado' });

    // Compute streak dynamically from user_cooked
    const cookedDates = await db.all(
      'SELECT DISTINCT cooked_at as date FROM user_cooked WHERE user_id = ? AND cooked_at IS NOT NULL ORDER BY date DESC',
      [req.params.id]
    );
    const dateSet = new Set(cookedDates.map(r => r.date));
    let streak = 0;
    const cursor = new Date();
    while (true) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
      if (!dateSet.has(key)) break;
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    res.json({ ...user, streak });
  } catch (e) {
    serverError(res, e);
  }
});

app.get('/api/users/:id/recipes', publicLimiter, async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT r.*, u.name as author_name, u.username as author_username, u.avatar as author_avatar
      FROM recipes r LEFT JOIN users u ON r.author_id = u.id
      WHERE r.author_id = ?
      ORDER BY r.created_at DESC
    `, [req.params.id]);
    res.json(rows.map(parseRecipe));
  } catch (e) {
    serverError(res, e);
  }
});

app.get('/api/users/:id/cooked', publicLimiter, async (req, res) => {
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
    serverError(res, e);
  }
});

// ── RANKINGS ─────────────────────────────────────────────────────────────────

app.get('/api/rankings', publicLimiter, async (req, res) => {
  try {
    const users = await db.all(`
      SELECT
        u.id, u.name, u.username, u.avatar, u.nationality, u.cooking_type,
        COUNT(DISTINCT r.id) as recipe_count,
        COALESCE(SUM(r.likes), 0) + COALESCE(SUM(r.cooked_count), 0) as score,
        COALESCE(AVG(rat.rating), 0) as avg_rating,
        COUNT(DISTINCT rat.user_id) as total_ratings
      FROM users u
      JOIN recipes r ON r.author_id = u.id
      LEFT JOIN ratings rat ON rat.recipe_id = r.id
      GROUP BY u.id
      HAVING COUNT(DISTINCT r.id) >= 1
      ORDER BY avg_rating DESC, total_ratings DESC
      LIMIT 50
    `);

    const result = await Promise.all(users.map(async (u, i) => {
      const best = await db.get(`
        SELECT r.id, r.title, r.difficulty, r.prep_time, r.cook_time, r.dish_type,
               COALESCE(AVG(rat.rating), 0) as avg_r, r.likes
        FROM recipes r
        LEFT JOIN ratings rat ON rat.recipe_id = r.id
        WHERE r.author_id = ?
        GROUP BY r.id
        ORDER BY avg_r DESC, r.likes DESC
        LIMIT 1
      `, [u.id]);

      return {
        id: String(u.id),
        rank: i + 1,
        name: u.name,
        username: u.username,
        avatar: u.avatar,
        nationality: u.nationality,
        cookingType: u.cooking_type,
        averageRating: parseFloat(u.avg_rating) || 0,
        totalRatingsCount: parseInt(u.total_ratings) || 0,
        recipeCount: parseInt(u.recipe_count) || 0,
        score: parseInt(u.score) || 0,
        bestRecipe: best ? {
          id: String(best.id),
          title: best.title,
          difficulty: best.difficulty,
          totalTime: (best.prep_time || 0) + (best.cook_time || 0),
          dishType: best.dish_type,
        } : null,
      };
    }));

    res.json(result);
  } catch (e) { serverError(res, e); }
});

// ── FOLLOWS ─────────────────────────────────────────────────────────────────

app.get('/api/users/:id/follow', auth, async (req, res) => {
  try {
    const row = await db.get('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?', [req.user.id, req.params.id]);
    res.json({ following: !!row });
  } catch (e) {
    serverError(res, e);
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
    serverError(res, e);
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
    serverError(res, e);
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
  } catch (e) { serverError(res, e); }
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
  } catch (e) { serverError(res, e); }
});

app.patch('/api/users/me/shopping/:itemId/check', auth, async (req, res) => {
  try {
    await db.run(
      'UPDATE shopping_list SET checked = NOT checked WHERE user_id = ? AND item_id = ?',
      [req.user.id, req.params.itemId]
    );
    res.json({ ok: true });
  } catch (e) { serverError(res, e); }
});

app.delete('/api/users/me/shopping/:itemId', auth, async (req, res) => {
  try {
    await db.run('DELETE FROM shopping_list WHERE user_id = ? AND item_id = ?', [req.user.id, req.params.itemId]);
    res.json({ ok: true });
  } catch (e) { serverError(res, e); }
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
  } catch (e) { serverError(res, e); }
});

// ── LIKES ───────────────────────────────────────────────────────────────────

app.get('/api/users/me/liked', auth, async (req, res) => {
  try {
    const rows = await db.all('SELECT recipe_id FROM recipe_likes WHERE user_id = ?', [req.user.id]);
    res.json(rows.map(r => String(r.recipe_id)));
  } catch (e) { serverError(res, e); }
});

app.post('/api/recipes/:id/like', auth, async (req, res) => {
  try {
    const already = await db.get('SELECT 1 FROM recipe_likes WHERE user_id = ? AND recipe_id = ?', [req.user.id, req.params.id]);
    if (!already) {
      await db.run('INSERT INTO recipe_likes (user_id, recipe_id) VALUES (?, ?)', [req.user.id, req.params.id]);
      await db.run('UPDATE recipes SET likes = likes + 1 WHERE id = ?', [req.params.id]);
    }
    res.json({ liked: true });
  } catch (e) { serverError(res, e); }
});

app.delete('/api/recipes/:id/like', auth, async (req, res) => {
  try {
    await db.run('DELETE FROM recipe_likes WHERE user_id = ? AND recipe_id = ?', [req.user.id, req.params.id]);
    await db.run('UPDATE recipes SET likes = GREATEST(0, likes - 1) WHERE id = ?', [req.params.id]);
    res.json({ liked: false });
  } catch (e) { serverError(res, e); }
});

// ── SAVED ───────────────────────────────────────────────────────────────────

app.get('/api/users/me/saved', auth, async (req, res) => {
  try {
    const rows = await db.all('SELECT recipe_id FROM saved_recipes WHERE user_id = ?', [req.user.id]);
    res.json(rows.map(r => String(r.recipe_id)));
  } catch (e) { serverError(res, e); }
});

app.post('/api/recipes/:id/save', auth, async (req, res) => {
  try {
    const already = await db.get('SELECT 1 FROM saved_recipes WHERE user_id = ? AND recipe_id = ?', [req.user.id, req.params.id]);
    if (!already) await db.run('INSERT INTO saved_recipes (user_id, recipe_id) VALUES (?, ?)', [req.user.id, req.params.id]);
    res.json({ saved: true });
  } catch (e) { serverError(res, e); }
});

app.delete('/api/recipes/:id/save', auth, async (req, res) => {
  try {
    await db.run('DELETE FROM saved_recipes WHERE user_id = ? AND recipe_id = ?', [req.user.id, req.params.id]);
    res.json({ saved: false });
  } catch (e) { serverError(res, e); }
});

// ── COOKED ──────────────────────────────────────────────────────────────────

app.get('/api/users/me/cooked', auth, async (req, res) => {
  try {
    const rows = await db.all('SELECT recipe_id, cooked_at FROM user_cooked WHERE user_id = ? ORDER BY cooked_at ASC', [req.user.id]);
    res.json(rows.map(r => ({
      recipeId: String(r.recipe_id),
      date: r.cooked_at ? r.cooked_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
    })));
  } catch (e) { serverError(res, e); }
});

app.post('/api/recipes/:id/cooked', auth, async (req, res) => {
  try {
    const already = await db.get('SELECT 1 FROM user_cooked WHERE user_id = ? AND recipe_id = ?', [req.user.id, req.params.id]);
    if (already) {
      const recipe = await db.get('SELECT cooked_count FROM recipes WHERE id = ?', [req.params.id]);
      return res.json({ cooked_count: recipe?.cooked_count ?? 0 });
    }
    const rawDate = req.body?.cooked_at;
    const cookedAt = (rawDate && isValidDate(rawDate)) ? rawDate : new Date().toISOString().slice(0, 10);
    await db.run('INSERT INTO user_cooked (user_id, recipe_id, cooked_at) VALUES (?, ?, ?)', [req.user.id, req.params.id, cookedAt]);
    await db.run('UPDATE recipes SET cooked_count = cooked_count + 1 WHERE id = ?', [req.params.id]);
    const recipe = await db.get('SELECT cooked_count FROM recipes WHERE id = ?', [req.params.id]);
    res.json({ cooked_count: recipe?.cooked_count ?? 0 });
  } catch (e) {
    serverError(res, e);
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
    serverError(res, e);
  }
});

// ── RATINGS ─────────────────────────────────────────────────────────────────

app.get('/api/users/me/ratings', auth, async (req, res) => {
  try {
    const rows = await db.all('SELECT recipe_id, rating FROM ratings WHERE user_id = ?', [req.user.id]);
    const result = {};
    rows.forEach(r => { result[String(r.recipe_id)] = r.rating; });
    res.json(result);
  } catch (e) { serverError(res, e); }
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
    serverError(res, e);
  }
});

// ── COMMENTS ────────────────────────────────────────────────────────────────

app.get('/api/recipes/:id/comments', publicLimiter, async (req, res) => {
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
    serverError(res, e);
  }
});

app.post('/api/recipes/:id/comments', auth, commentLimiter, async (req, res) => {
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
    serverError(res, e);
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
    serverError(res, e);
  }
});

app.put('/api/notifications/read', auth, async (req, res) => {
  try {
    await db.run('UPDATE notifications SET read = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ ok: true });
  } catch (e) {
    serverError(res, e);
  }
});

app.get('/api/notifications/unread-count', auth, async (req, res) => {
  try {
    const row = await db.get('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0', [req.user.id]);
    res.json({ count: parseInt(row?.count ?? 0) });
  } catch (e) {
    serverError(res, e);
  }
});

// ── DISCOVER (Feed Personalizado) ────────────────────────────────────────────

app.get('/api/discover', auth, async (req, res) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(5, parseInt(req.query.pageSize) || 20));
    const userId   = req.user.id;
    const now      = Date.now();

    // Decaimento temporal: interações recentes pesam mais
    // 0 dias = 100%, 30 dias ≈ 40%, 60 dias ≈ 16%
    function timeDecay(dateStr) {
      if (!dateStr) return 1;
      const ageDays = (now - new Date(dateStr).getTime()) / 86400000;
      return Math.pow(0.97, ageDays);
    }

    // Peso base por tipo de interação
    function baseWeight(type) {
      return { cook: 6, save: 4, like: 3, rating5: 8, rating4: 5, rating3: 2, rating2: -2, rating1: -5 }[type] ?? 1;
    }

    // 1. Todas as fontes de sinal em paralelo
    const [liked, saved, cooked, ownRecipes, userRatings, following, trending] = await Promise.all([
      db.all('SELECT recipe_id, created_at FROM recipe_likes  WHERE user_id = ?', [userId]),
      db.all('SELECT recipe_id, saved_at   FROM saved_recipes WHERE user_id = ?', [userId]),
      db.all('SELECT recipe_id             FROM user_cooked   WHERE user_id = ?', [userId]),
      db.all('SELECT id                    FROM recipes       WHERE author_id = ?', [userId]),
      db.all('SELECT recipe_id, rating     FROM ratings       WHERE user_id = ?', [userId]),
      db.all('SELECT following_id          FROM follows        WHERE follower_id = ?', [userId]),
      // Receitas em tendência: mais likes nos últimos 7 dias
      db.all(`SELECT recipe_id, COUNT(*) AS cnt
              FROM recipe_likes
              WHERE created_at > NOW() - INTERVAL '7 days'
              GROUP BY recipe_id
              ORDER BY cnt DESC
              LIMIT 100`),
    ]);

    const likedMap   = Object.fromEntries(liked.map(r  => [r.recipe_id, r.created_at]));
    const savedMap   = Object.fromEntries(saved.map(r  => [r.recipe_id, r.saved_at]));
    const cookedSet  = new Set(cooked.map(r  => r.recipe_id));
    const ratingsMap = Object.fromEntries(userRatings.map(r => [r.recipe_id, r.rating]));
    const followedAuthorIds = new Set(following.map(r => r.following_id));
    const trendingMap = Object.fromEntries(trending.map(r => [r.recipe_id, parseInt(r.cnt)]));

    const interactedIds = new Set([
      ...Object.keys(likedMap).map(Number),
      ...Object.keys(savedMap).map(Number),
      ...cookedSet,
      ...Object.keys(ratingsMap).map(Number),
    ]);
    // Só exclui receitas próprias — receitas já vistas continuam elegíveis
    // (o utilizador pode querer re-cozinhar, partilhar, ou simplesmente redescobrir)
    const excludeIds = new Set([...ownRecipes.map(r => r.id)]);

    // 2. Constrói perfil ponderado com decaimento temporal e avaliações
    const profile = { tags: {}, categories: {}, cuisines: {} };

    function applyWeight(recipe, weight) {
      const diet = JSON.parse(recipe.diet || '[]');
      const tags = JSON.parse(recipe.tags || '[]');
      [...diet, ...tags].forEach(tag => {
        profile.tags[tag] = (profile.tags[tag] || 0) + weight;
      });
      if (recipe.category) profile.categories[recipe.category] = (profile.categories[recipe.category] || 0) + weight;
      if (recipe.cuisine)  profile.cuisines[recipe.cuisine]    = (profile.cuisines[recipe.cuisine]    || 0) + weight;
    }

    if (interactedIds.size > 0) {
      const idList   = [...interactedIds].join(',');
      const interacted = await db.all(
        `SELECT id, diet, tags, category, cuisine FROM recipes WHERE id IN (${idList})`
      );

      for (const r of interacted) {
        const id = r.id;
        // Avaliação sobrepõe-se às outras interações (sinal mais forte e explícito)
        if (ratingsMap[id] !== undefined) {
          const ratingKey = `rating${ratingsMap[id]}`;
          applyWeight(r, baseWeight(ratingKey));
        } else if (cookedSet.has(id)) {
          applyWeight(r, baseWeight('cook'));
        } else if (savedMap[id] !== undefined) {
          applyWeight(r, baseWeight('save') * timeDecay(savedMap[id]));
        } else if (likedMap[id] !== undefined) {
          applyWeight(r, baseWeight('like') * timeDecay(likedMap[id]));
        }
      }
    }

    const hasProfile = Object.keys(profile.tags).length > 0 || Object.keys(profile.categories).length > 0;

    // 3. Candidatas
    const excludeClause = excludeIds.size > 0
      ? `AND r.id NOT IN (${[...excludeIds].join(',')})`
      : '';

    const candidates = await db.all(`
      SELECT r.id, r.title, r.image, r.category, r.cuisine, r.dish_type,
             r.diet, r.tags, r.prep_time, r.cook_time, r.difficulty,
             r.likes, r.saves, r.cooked_count, r.rating, r.rating_count,
             r.author_id, r.created_at,
             u.name as author_name, u.username as author_username, u.avatar as author_avatar
      FROM recipes r
      LEFT JOIN users u ON r.author_id = u.id
      WHERE 1=1 ${excludeClause}
      ORDER BY r.likes DESC, r.created_at DESC
      LIMIT 300
    `);

    // 4. Score composto
    const scored = candidates.map(recipe => {
      let score = 0;

      // ── Conteúdo (tags, categoria, cozinha) ──
      if (hasProfile) {
        const diet = JSON.parse(recipe.diet || '[]');
        const tags = JSON.parse(recipe.tags || '[]');
        [...diet, ...tags].forEach(tag => { score += (profile.tags[tag] || 0); });
        score += (profile.categories[recipe.category] || 0) * 0.8;
        score += (profile.cuisines[recipe.cuisine]    || 0) * 0.6;
      } else {
        // Cold start: trending da semana com ruído mínimo
        score = Math.log1p(trendingMap[recipe.id] || 0) * 3 + Math.random() * 2;
      }

      // ── Social: boost de quem segues ──
      if (followedAuthorIds.has(recipe.author_id)) score += 18;

      // ── Trending: likes nos últimos 7 dias ──
      score += Math.log1p(trendingMap[recipe.id] || 0) * 5;

      // ── Popularidade global (logarítmica) ──
      score += Math.log1p(recipe.likes        || 0) * 1.5;
      score += Math.log1p(recipe.saves        || 0) * 2.5;
      score += Math.log1p(recipe.cooked_count || 0) * 3.5;
      score += (recipe.rating || 0) * 1.5;

      // ── Recência da receita (primeiros 7 dias) ──
      const ageDays = (now - new Date(recipe.created_at).getTime()) / 86400000;
      if (ageDays < 7) score += (7 - ageDays) * 1.5;

      return { ...recipe, _score: score };
    });

    scored.sort((a, b) => b._score - a._score);

    // 5. Diversidade dupla: categoria E cozinha (máx. 35% cada)
    const maxPerBucket = Math.ceil(pageSize * page * 0.35);
    const catCounts     = {};
    const cuisineCounts = {};
    const diversified   = [];
    const overflow      = [];

    for (const recipe of scored) {
      const cat     = recipe.category || 'Outros';
      const cuisine = recipe.cuisine  || 'Internacional';
      catCounts[cat]         = (catCounts[cat]         || 0) + 1;
      cuisineCounts[cuisine] = (cuisineCounts[cuisine] || 0) + 1;
      const fits = catCounts[cat] <= maxPerBucket && cuisineCounts[cuisine] <= maxPerBucket;
      (fits ? diversified : overflow).push(recipe);
    }

    // 6. Paginação
    const allSorted = [...diversified, ...overflow];
    const start     = (page - 1) * pageSize;
    const results   = allSorted.slice(start, start + pageSize).map(({ _score, diet, tags, ...r }) => ({
      ...r,
      diet: JSON.parse(diet || '[]'),
      tags: JSON.parse(tags || '[]'),
    }));

    res.json({ recipes: results, page, hasMore: results.length === pageSize, personalized: hasProfile });
  } catch (e) {
    console.error('Discover error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── PRIVACY POLICY & TERMS ──────────────────────────────────────────────────
app.get('/privacy', (_, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(fs.readFileSync(path.join(__dirname, 'privacy-policy.html')));
});

app.get('/terms', (_, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(fs.readFileSync(path.join(__dirname, 'terms.html')));
});

app.get('/delete-account', (_, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(fs.readFileSync(path.join(__dirname, 'delete-account.html')));
});

// ── HEALTH ──────────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ ok: true, db: 'postgresql', time: new Date().toISOString() }));

// ── 404 e erros — sempre JSON ────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

app.use((err, req, res, _next) => {
  serverError(res, err);
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
