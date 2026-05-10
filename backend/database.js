require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
  // Transaction pooler (Supabase/PgBouncer) doesn't support prepared statements
  query_timeout: 10000,
});

// Convert ? placeholders to $1, $2, ... for PostgreSQL
function toPositional(sql, params = []) {
  let i = 0;
  return { sql: sql.replace(/\?/g, () => `$${++i}`), params };
}

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      name          TEXT NOT NULL,
      username      TEXT NOT NULL UNIQUE,
      email         TEXT NOT NULL UNIQUE,
      password      TEXT NOT NULL,
      avatar        TEXT DEFAULT NULL,
      bio           TEXT DEFAULT '',
      cooking_type  TEXT DEFAULT 'Caseiro',
      nationality   TEXT DEFAULT NULL,
      first_name    TEXT DEFAULT NULL,
      last_name     TEXT DEFAULT NULL,
      followers     INTEGER DEFAULT 0,
      following     INTEGER DEFAULT 0,
      recipes_count INTEGER DEFAULT 0,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS recipes (
      id              SERIAL PRIMARY KEY,
      title           TEXT NOT NULL,
      image           TEXT,
      author_id       INTEGER NOT NULL,
      prep_time       INTEGER DEFAULT 0,
      cook_time       INTEGER DEFAULT 0,
      servings        INTEGER DEFAULT 2,
      difficulty      TEXT DEFAULT 'Fácil',
      category        TEXT DEFAULT 'Outros',
      cuisine         TEXT DEFAULT 'Internacional',
      dish_type       TEXT DEFAULT 'Prato Principal',
      cooking_method  TEXT DEFAULT '[]',
      calories        INTEGER,
      cost            TEXT DEFAULT '€',
      likes           INTEGER DEFAULT 0,
      saves           INTEGER DEFAULT 0,
      cooked_count    INTEGER DEFAULT 0,
      comments_count  INTEGER DEFAULT 0,
      rating          REAL DEFAULT 0,
      rating_count    INTEGER DEFAULT 0,
      diet            TEXT DEFAULT '[]',
      tags            TEXT DEFAULT '[]',
      created_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id             SERIAL PRIMARY KEY,
      recipe_id      INTEGER NOT NULL,
      name           TEXT NOT NULL,
      amount         TEXT DEFAULT '',
      unit           TEXT DEFAULT '',
      category       TEXT DEFAULT 'Outros',
      canonical_name TEXT DEFAULT NULL,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS steps (
      id          SERIAL PRIMARY KEY,
      recipe_id   INTEGER NOT NULL,
      number      INTEGER NOT NULL,
      description TEXT NOT NULL,
      duration    INTEGER DEFAULT NULL,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ratings (
      user_id    INTEGER NOT NULL,
      recipe_id  INTEGER NOT NULL,
      rating     INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, recipe_id),
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS comments (
      id         SERIAL PRIMARY KEY,
      recipe_id  INTEGER NOT NULL,
      user_id    INTEGER NOT NULL,
      text       TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS follows (
      follower_id  INTEGER NOT NULL,
      following_id INTEGER NOT NULL,
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (follower_id, following_id),
      FOREIGN KEY (follower_id)  REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_cooked (
      user_id   INTEGER NOT NULL,
      recipe_id INTEGER NOT NULL,
      cooked_at TEXT DEFAULT NULL,
      PRIMARY KEY (user_id, recipe_id),
      FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS saved_recipes (
      user_id   INTEGER NOT NULL,
      recipe_id INTEGER NOT NULL,
      saved_at  TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, recipe_id),
      FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS shopping_list (
      item_id      TEXT NOT NULL,
      user_id      INTEGER NOT NULL,
      recipe_id    TEXT NOT NULL,
      recipe_title TEXT DEFAULT '',
      recipe_image TEXT DEFAULT NULL,
      name         TEXT NOT NULL,
      amount       TEXT DEFAULT '',
      unit         TEXT DEFAULT '',
      category     TEXT DEFAULT 'Outros',
      checked      BOOLEAN DEFAULT FALSE,
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, item_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS recipe_likes (
      user_id   INTEGER NOT NULL,
      recipe_id INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, recipe_id),
      FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id           SERIAL PRIMARY KEY,
      user_id      INTEGER NOT NULL,
      type         TEXT NOT NULL,
      title        TEXT NOT NULL,
      message      TEXT NOT NULL,
      icon         TEXT NOT NULL DEFAULT 'notifications-outline',
      color        TEXT NOT NULL DEFAULT '#C2622D',
      read         INTEGER DEFAULT 0,
      recipe_id    INTEGER,
      from_user_id INTEGER,
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // New columns on users (safe to run multiple times — IF NOT EXISTS)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ DEFAULT NULL`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT DEFAULT NULL`);
  await pool.query(`ALTER TABLE users ALTER COLUMN password DROP NOT NULL`);

  // Remove stored recipe images from shopping list — fetched via JOIN with recipes now
  await pool.query(`ALTER TABLE shopping_list DROP COLUMN IF EXISTS recipe_image`);

  // AI scan quota columns on users
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_plan TEXT DEFAULT 'free'`); // 'free' | 'weekly'
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_scans_used INTEGER DEFAULT 0`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_scans_reset_at DATE DEFAULT NULL`);

  // Scanned recipes (private "Quero Cozinhar" list)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS scan_recipes (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      image       TEXT,
      title       TEXT NOT NULL,
      ingredients TEXT DEFAULT '[]',
      steps       TEXT DEFAULT '[]',
      prep_time   INTEGER DEFAULT 0,
      cook_time   INTEGER DEFAULT 0,
      servings    INTEGER DEFAULT 2,
      difficulty  TEXT DEFAULT 'Fácil',
      cuisine     TEXT DEFAULT 'Internacional',
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token      TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used       BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token      TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used       BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function run(sql, params = []) {
  const { sql: q, params: p } = toPositional(sql, params);
  const result = await pool.query(q, p);
  return { lastInsertRowid: result.rows[0]?.id ?? null };
}

async function get(sql, params = []) {
  const { sql: q, params: p } = toPositional(sql, params);
  const result = await pool.query(q, p);
  return result.rows[0] ?? null;
}

async function all(sql, params = []) {
  const { sql: q, params: p } = toPositional(sql, params);
  const result = await pool.query(q, p);
  return result.rows;
}

module.exports = { init, run, get, all };
