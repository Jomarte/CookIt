const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'cookit.db');

let db = null;

async function init() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`PRAGMA foreign_keys = ON`);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      username      TEXT NOT NULL UNIQUE,
      email         TEXT NOT NULL UNIQUE,
      password      TEXT NOT NULL,
      avatar        TEXT DEFAULT NULL,
      bio           TEXT DEFAULT '',
      cooking_type  TEXT DEFAULT 'Caseiro',
      followers     INTEGER DEFAULT 0,
      following     INTEGER DEFAULT 0,
      recipes_count INTEGER DEFAULT 0,
      created_at    TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS recipes (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
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
      rating          REAL DEFAULT 0,
      rating_count    INTEGER DEFAULT 0,
      diet            TEXT DEFAULT '[]',
      tags            TEXT DEFAULT '[]',
      created_at      TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id  INTEGER NOT NULL,
      name       TEXT NOT NULL,
      amount     TEXT DEFAULT '',
      unit       TEXT DEFAULT '',
      category   TEXT DEFAULT 'Outros',
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS steps (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id   INTEGER NOT NULL,
      number      INTEGER NOT NULL,
      description TEXT NOT NULL,
      duration    INTEGER DEFAULT NULL,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ratings (
      user_id    INTEGER NOT NULL,
      recipe_id  INTEGER NOT NULL,
      rating     INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, recipe_id),
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id  INTEGER NOT NULL,
      user_id    INTEGER NOT NULL,
      text       TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE
    )
  `);

  // Migrate existing databases — safe to run multiple times
  try { db.run(`ALTER TABLE recipes ADD COLUMN cuisine TEXT DEFAULT 'Internacional'`); } catch (_) {}
  try { db.run(`ALTER TABLE recipes ADD COLUMN dish_type TEXT DEFAULT 'Prato Principal'`); } catch (_) {}
  try { db.run(`ALTER TABLE recipes ADD COLUMN cooking_method TEXT DEFAULT '[]'`); } catch (_) {}
  try { db.run(`ALTER TABLE ingredients ADD COLUMN canonical_name TEXT DEFAULT NULL`); } catch (_) {}
  try { db.run(`ALTER TABLE recipes ADD COLUMN comments_count INTEGER DEFAULT 0`); } catch (_) {}

  save();
  return db;
}

function save() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// Helpers que imitam a API síncrona do better-sqlite3
function run(sql, params = []) {
  db.run(sql, params);
  // Obter o rowid da última inserção via prepared statement
  const stmt = db.prepare('SELECT last_insert_rowid() AS lastId');
  stmt.step();
  const { lastId } = stmt.getAsObject();
  stmt.free();
  save();
  return { lastInsertRowid: lastId ?? null };
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function all(sql, params = []) {
  const result = db.exec(sql, params);
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map((row) =>
    Object.fromEntries(columns.map((col, i) => [col, row[i]]))
  );
}

module.exports = { init, run, get, all, save };
