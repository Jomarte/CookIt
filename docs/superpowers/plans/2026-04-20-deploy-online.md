# CookIt Online Deployment Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move CookIt from local-only dev (hardcoded localhost + SQLite) to a production-ready online deployment with PostgreSQL, secure environment config, and proper hosting.

**Architecture:** Express.js backend deployed on Railway with a managed PostgreSQL database. Frontend web build deployed on Vercel, with the API URL injected at build time via Expo's `EXPO_PUBLIC_*` env system. Images stay as base64 in the DB (adequate for MVP scale).

**Tech Stack:** Node.js/Express, PostgreSQL (pg), Railway (backend + DB), Vercel (frontend), dotenv, express-rate-limit, helmet

---

## Files Touched

| File | Action | Why |
|------|--------|-----|
| `backend/.env` | Create | Secrets and config, never committed |
| `backend/.env.example` | Create | Template for docs/CI |
| `backend/database.js` | Rewrite | Replace sql.js with pg (PostgreSQL) |
| `backend/server.js` | Modify | Use env vars for secret/port, fix CORS, add helmet + rate limiting |
| `backend/package.json` | Modify | Add pg, dotenv, helmet, express-rate-limit |
| `.env` (root) | Create | Expo public env vars for frontend |
| `services/api.ts` | Modify | Use `EXPO_PUBLIC_API_URL` instead of hardcoded localhost |
| `.gitignore` | Modify | Ensure .env files are ignored |
| `backend/.gitignore` | Create | Ensure backend .env is ignored |

---

## Task 1: Protect .env files in git

**Files:**
- Modify: `.gitignore` (root)
- Create: `backend/.gitignore`

- [ ] **Step 1: Add .env to root .gitignore**

Open `.gitignore` (root) and ensure these lines exist (add them if missing):
```
.env
.env.local
.env*.local
backend/.env
```

- [ ] **Step 2: Create backend/.gitignore**

Create `backend/.gitignore`:
```
.env
node_modules/
cookit.db
```

- [ ] **Step 3: Verify .env is not tracked**

```bash
git status
```
Expected: no `.env` files shown as tracked. If any are tracked:
```bash
git rm --cached backend/.env .env 2>/dev/null; echo "done"
```

- [ ] **Step 4: Commit**

```bash
git add .gitignore backend/.gitignore
git commit -m "chore: ensure .env and db files are gitignored"
```

---

## Task 2: Backend environment variables

**Files:**
- Create: `backend/.env`
- Create: `backend/.env.example`
- Modify: `backend/server.js` (lines 8-9)
- Modify: `backend/package.json`

- [ ] **Step 1: Install dotenv**

```bash
cd backend && npm install dotenv
```
Expected: `dotenv` appears in `backend/package.json` dependencies.

- [ ] **Step 2: Create backend/.env**

Create `backend/.env` with your actual values:
```
PORT=3001
JWT_SECRET=change_this_to_a_random_64_char_string_use_openssl_rand_hex_32
DATABASE_URL=postgresql://localhost:5432/cookit
```

To generate a secure JWT secret, run:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output into `JWT_SECRET=`.

- [ ] **Step 3: Create backend/.env.example**

Create `backend/.env.example`:
```
PORT=3001
JWT_SECRET=your_64_char_random_secret_here
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

- [ ] **Step 4: Load dotenv at top of server.js**

In `backend/server.js`, add this as the very first line (before any other require):
```js
require('dotenv').config();
```

Then replace the hardcoded values:
```js
// Before:
const PORT = 3001;
const JWT_SECRET = 'cookit_secret_local_2024';

// After:
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET env var is required');
```

- [ ] **Step 5: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/.env.example backend/server.js
git commit -m "feat: load backend config from environment variables"
```

---

## Task 3: Replace sql.js with PostgreSQL

**Files:**
- Modify: `backend/package.json`
- Rewrite: `backend/database.js`

This is the biggest change. sql.js runs SQLite in memory (not suitable for a hosted server that restarts and loses data). PostgreSQL is the standard choice for production.

- [ ] **Step 1: Install pg**

```bash
cd backend && npm install pg
```

- [ ] **Step 2: Rewrite backend/database.js**

Replace the entire contents of `backend/database.js` with:

```js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL?.includes('railway') || process.env.DATABASE_URL?.includes('render') ? { rejectUnauthorized: false } : false });

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
      rating          REAL DEFAULT 0,
      rating_count    INTEGER DEFAULT 0,
      comments_count  INTEGER DEFAULT 0,
      diet            TEXT DEFAULT '[]',
      tags            TEXT DEFAULT '[]',
      created_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id             SERIAL PRIMARY KEY,
      recipe_id      INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      name           TEXT NOT NULL,
      canonical_name TEXT DEFAULT NULL,
      amount         TEXT DEFAULT '',
      unit           TEXT DEFAULT '',
      category       TEXT DEFAULT 'Outros'
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS steps (
      id          SERIAL PRIMARY KEY,
      recipe_id   INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      number      INTEGER NOT NULL,
      description TEXT NOT NULL,
      duration    INTEGER DEFAULT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ratings (
      user_id    INTEGER NOT NULL,
      recipe_id  INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      rating     INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, recipe_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS comments (
      id         SERIAL PRIMARY KEY,
      recipe_id  INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text       TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS follows (
      follower_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (follower_id, following_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_cooked (
      user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, recipe_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id           SERIAL PRIMARY KEY,
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type         TEXT NOT NULL,
      title        TEXT NOT NULL,
      message      TEXT NOT NULL,
      icon         TEXT NOT NULL DEFAULT 'notifications-outline',
      color        TEXT NOT NULL DEFAULT '#C2622D',
      read         INTEGER DEFAULT 0,
      recipe_id    INTEGER,
      from_user_id INTEGER,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  console.log('Database initialised');
}

// Run a write query, return { lastInsertRowid }
async function run(sql, params = []) {
  // Convert sql.js ? placeholders to PostgreSQL $1, $2, ...
  let i = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++i}`);
  // Append RETURNING id for INSERT statements
  const isInsert = pgSql.trim().toUpperCase().startsWith('INSERT');
  const finalSql = isInsert ? `${pgSql} RETURNING id` : pgSql;
  const result = await pool.query(finalSql, params);
  return { lastInsertRowid: isInsert ? (result.rows[0]?.id ?? null) : null };
}

// Get a single row
async function get(sql, params = []) {
  let i = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++i}`);
  const result = await pool.query(pgSql, params);
  return result.rows[0] ?? null;
}

// Get all rows
async function all(sql, params = []) {
  let i = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++i}`);
  const result = await pool.query(pgSql, params);
  return result.rows;
}

// No-op for compatibility (no manual save needed with PostgreSQL)
function save() {}

module.exports = { init, run, get, all, save, pool };
```

- [ ] **Step 3: Verify the ? → $N conversion handles all queries**

Run a quick check — search server.js for any raw SQL that uses named parameters or syntax that won't work in PostgreSQL:

```bash
grep -n "INTEGER PRIMARY KEY AUTOINCREMENT\|datetime('now')\|last_insert_rowid" backend/server.js
```
Expected: no matches (those were in database.js which is now replaced).

- [ ] **Step 4: Fix async calls in server.js**

The old `database.js` had synchronous `run/get/all`. The new ones are **async**. Every call to `db.run()`, `db.get()`, `db.all()` in `server.js` must now be `await`ed, and the route handlers must be `async`.

Search for all usages:
```bash
grep -n "db\.run\|db\.get\|db\.all" backend/server.js | head -60
```

For each route handler that calls these functions, ensure:
```js
// Before (sync):
app.get('/api/example', (req, res) => {
  const row = db.get('SELECT ...', [id]);
  res.json(row);
});

// After (async):
app.get('/api/example', async (req, res) => {
  try {
    const row = await db.get('SELECT ...', [id]);
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
```

This step requires manually going through every route in `backend/server.js` and adding `async`/`await`/`try-catch`. There are approximately 25 routes — work top to bottom.

- [ ] **Step 5: Fix server.js init call**

Find the server start code (near the bottom of server.js). It likely calls `db.init()`. Make sure it awaits it:

```js
// Before:
db.init().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});

// After (no change needed if already like this — just verify):
db.init().then(() => {
  app.listen(PORT, () => console.log(`Server on port ${PORT}`));
}).catch(err => {
  console.error('Failed to init DB:', err);
  process.exit(1);
});
```

- [ ] **Step 6: Test locally with PostgreSQL**

Install PostgreSQL locally if not already installed (https://www.postgresql.org/download/).

Create the local database:
```bash
psql -U postgres -c "CREATE DATABASE cookit;"
```

Update `backend/.env`:
```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/cookit
```

Start the backend:
```bash
cd backend && npm start
```
Expected: `Database initialised` and `Server on port 3001` with no errors.

Test the health endpoint:
```bash
curl http://localhost:3001/api/health
```
Expected: `{"status":"ok"}` or similar.

- [ ] **Step 7: Commit**

```bash
git add backend/database.js backend/package.json backend/package-lock.json
git commit -m "feat: migrate database from sql.js/SQLite to PostgreSQL"
```

---

## Task 4: Security hardening (helmet + rate limiting + CORS)

**Files:**
- Modify: `backend/server.js`
- Modify: `backend/package.json`

- [ ] **Step 1: Install packages**

```bash
cd backend && npm install helmet express-rate-limit
```

- [ ] **Step 2: Add helmet and rate limiting to server.js**

Near the top of `backend/server.js`, after the existing `require` statements:

```js
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Security headers
app.use(helmet());

// Rate limiting — 100 requests per 15 minutes per IP
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Stricter limit for auth endpoints
app.use('/api/auth/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
}));
```

- [ ] **Step 3: Fix CORS to use an allowlist**

Replace the existing `app.use(cors())` with:

```js
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:8081').split(',');

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (native apps, curl)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
```

Add to `backend/.env`:
```
ALLOWED_ORIGINS=http://localhost:8081
```

(When deployed, you'll add the Vercel URL here, e.g. `https://cookit.vercel.app`.)

- [ ] **Step 4: Commit**

```bash
git add backend/server.js backend/package.json backend/package-lock.json backend/.env.example
git commit -m "feat: add helmet, rate limiting, and CORS allowlist"
```

---

## Task 5: Frontend API URL from environment

**Files:**
- Create: `.env` (root)
- Create: `.env.example` (root)
- Modify: `services/api.ts` (line 1)

Expo exposes env vars prefixed with `EXPO_PUBLIC_` to the client bundle.

- [ ] **Step 1: Create root .env**

Create `.env` in the project root:
```
EXPO_PUBLIC_API_URL=http://localhost:3001/api
```

- [ ] **Step 2: Create root .env.example**

```
EXPO_PUBLIC_API_URL=https://your-backend.railway.app/api
```

- [ ] **Step 3: Update services/api.ts**

Open `services/api.ts`. Line 1 likely reads:
```ts
const BASE_URL = 'http://localhost:3001/api';
```

Replace with:
```ts
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api';
```

- [ ] **Step 4: Verify the app still works locally**

```bash
npx expo start --web
```
Open the app, log in, check the network tab in DevTools to confirm requests go to `http://localhost:3001/api`.

- [ ] **Step 5: Commit**

```bash
git add services/api.ts .env.example
git commit -m "feat: use EXPO_PUBLIC_API_URL instead of hardcoded localhost"
```

---

## Task 6: Deploy backend to Railway

Railway is a hosting platform with a managed PostgreSQL add-on. Free tier available.

- [ ] **Step 1: Create a Railway account**

Go to https://railway.app and sign up (GitHub login recommended).

- [ ] **Step 2: Create a new project**

In Railway dashboard → "New Project" → "Deploy from GitHub repo" → select your CookIt repo.

Set the **Root Directory** to `backend` (Railway only needs to deploy the backend folder).

- [ ] **Step 3: Add PostgreSQL**

In your Railway project → "+ New" → "Database" → "Add PostgreSQL".

Railway automatically creates a `DATABASE_URL` env var in your service. Copy it — it looks like:
```
postgresql://postgres:xxxx@containers-us-west-xxx.railway.app:5432/railway
```

- [ ] **Step 4: Set environment variables in Railway**

In your backend service → "Variables" tab, add:
```
JWT_SECRET=<your 64-char random string from Task 2>
ALLOWED_ORIGINS=https://your-cookit.vercel.app
PORT=3001
```

`DATABASE_URL` is already set automatically by Railway.

- [ ] **Step 5: Add a Procfile for Railway**

Create `backend/Procfile`:
```
web: node server.js
```

Commit:
```bash
git add backend/Procfile
git commit -m "chore: add Procfile for Railway deployment"
```

- [ ] **Step 6: Deploy and verify**

Push to GitHub. Railway auto-deploys on push.

```bash
git push origin master
```

In Railway dashboard, watch the build logs. Expected: `Database initialised` + `Server on port XXXX`.

Copy your Railway public URL (e.g. `https://cookit-production.up.railway.app`) and test:
```bash
curl https://cookit-production.up.railway.app/api/health
```
Expected: JSON health response.

---

## Task 7: Deploy frontend to Vercel

- [ ] **Step 1: Create a Vercel account**

Go to https://vercel.com and sign up (GitHub login).

- [ ] **Step 2: Import project**

Vercel dashboard → "New Project" → import your CookIt GitHub repo.

Settings:
- **Framework Preset:** Other
- **Root Directory:** `.` (project root, not backend)
- **Build Command:** `npx expo export --platform web`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

- [ ] **Step 3: Set environment variable in Vercel**

In Vercel → Project Settings → Environment Variables:
```
EXPO_PUBLIC_API_URL = https://cookit-production.up.railway.app/api
```

- [ ] **Step 4: Deploy**

Click "Deploy". Vercel builds the Expo web bundle and hosts it.

After deploy succeeds, copy your Vercel URL (e.g. `https://cookit.vercel.app`).

- [ ] **Step 5: Update ALLOWED_ORIGINS on Railway**

Go back to Railway → your backend service → Variables:
```
ALLOWED_ORIGINS=https://cookit.vercel.app
```

Railway auto-redeploys with the new var.

- [ ] **Step 6: End-to-end test**

Open `https://cookit.vercel.app` in a browser.
- Register a new account
- Create a recipe
- Rate it, leave a comment
- Log out and log back in — verify data persists (it's in PostgreSQL now, not localStorage)

---

## Task 8: Migrate existing data (optional)

If you want to keep the recipes/users from your local SQLite database:

- [ ] **Step 1: Export from SQLite**

```bash
cd backend
node -e "
const initSqlJs = require('sql.js');
const fs = require('fs');
initSqlJs().then(SQL => {
  const db = new SQL.Database(fs.readFileSync('cookit.db'));
  const tables = ['users','recipes','ingredients','steps','ratings','comments','follows','user_cooked','notifications'];
  const out = {};
  tables.forEach(t => {
    const r = db.exec('SELECT * FROM ' + t);
    out[t] = r.length ? r[0] : { columns: [], values: [] };
  });
  fs.writeFileSync('export.json', JSON.stringify(out, null, 2));
  console.log('Done');
});
"
```

- [ ] **Step 2: Write an import script**

Create `backend/import.js`:

```js
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const data = JSON.parse(fs.readFileSync('export.json', 'utf8'));

async function main() {
  for (const [table, { columns, values }] of Object.entries(data)) {
    if (!values.length) continue;
    for (const row of values) {
      const cols = columns.join(', ');
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      await pool.query(`INSERT INTO ${table} (${cols}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`, row);
    }
    console.log(`Imported ${values.length} rows into ${table}`);
  }
  await pool.end();
  console.log('Import complete');
}

main().catch(console.error);
```

- [ ] **Step 3: Run import against Railway DB**

```bash
DATABASE_URL=<your-railway-url> node backend/import.js
```

- [ ] **Step 4: Clean up**

```bash
rm backend/export.json backend/import.js
```

---

## Security Checklist Before Going Public

- [ ] JWT_SECRET is a random 64-char string (not the original `cookit_secret_local_2024`)
- [ ] `.env` files are not committed to git
- [ ] Railway variables are set (JWT_SECRET, ALLOWED_ORIGINS)
- [ ] HTTPS is enforced on both Railway and Vercel (automatic on both platforms)
- [ ] Rate limiting is active on auth routes
- [ ] CORS only allows your Vercel domain

---

## Summary of Costs (Free Tier)

| Service | Free Tier |
|---------|-----------|
| Railway | $5 credit/month (enough for small app + PostgreSQL) |
| Vercel | Unlimited static/SSR deployments |
| Total | ~$0–5/month |
