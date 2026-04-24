# Production Auth & Legal Compliance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make CookIt's auth system production-ready with email verification, password reset, terms acceptance, and in-app legal screens — everything required to submit to the App Store and Google Play.

**Architecture:** Backend gets secure token tables (PostgreSQL), Resend for transactional email, and HTML-based password reset form (no deep links needed). Frontend adds a terms checkbox + password strength bar to register, a forgot-password screen, in-app privacy/terms screens, and an email verification banner inside the tabs layout.

**Tech Stack:** Node.js/Express + PostgreSQL (existing), Resend (email), Expo Router, React Native, Zustand, i18n hook (existing pattern).

> **Social login (Google + Apple) is a separate plan** — implement this plan first, social login after.

---

## File Structure

**Create:**
- `app/auth/forgot-password.tsx` — forgot password screen (email input → success message)
- `app/auth/privacy-policy.tsx` — scrollable privacy policy screen
- `app/auth/terms.tsx` — scrollable terms of service screen

**Modify:**
- `backend/database.js` — add 2 new tables + 2 ALTER TABLE columns to users
- `backend/server.js` — rate limits per auth route, updated register, 4 new endpoints
- `services/api.ts` — 2 new API calls (forgotPassword, sendVerification)
- `store/useStore.ts` — add `email_verified: boolean` to AuthUser interface
- `app/auth/register.tsx` — terms checkbox + password strength indicator
- `app/auth/login.tsx` — forgot password link below the form
- `app/(tabs)/_layout.tsx` — email verification banner above tab navigator
- `i18n/index.ts` — ~15 new auth keys

---

## Task 1: Database — Token Tables + User Columns

**Files:**
- Modify: `backend/database.js`

- [ ] **Step 1: Add the new schema inside `init()`**

Open `backend/database.js`. At the bottom of the `init()` function, just before the closing `}`, add:

```javascript
  // New columns on users (safe to run multiple times — IF NOT EXISTS)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ DEFAULT NULL`);

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
```

- [ ] **Step 2: Restart the backend and confirm no errors**

```bash
cd backend && npm run dev
```

Expected: server starts, logs DB tables created, no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/database.js
git commit -m "feat: add email_verified, terms_accepted_at to users + token tables"
```

---

## Task 2: Backend — Install Resend + Helper Functions

**Files:**
- Modify: `backend/server.js`, `backend/package.json`

- [ ] **Step 1: Install Resend**

```bash
cd backend && npm install resend
```

Expected: `resend` appears in `backend/package.json` dependencies.

- [ ] **Step 2: Add Resend + token helper at the top of `server.js`**

After `const db = require('./database');` add:

```javascript
const crypto = require('crypto');
const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const API_URL = process.env.API_URL || `http://localhost:${process.env.PORT || 3001}`;
const FROM_EMAIL = process.env.FROM_EMAIL || 'CookIt <onboarding@resend.dev>';

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function sendVerificationEmail(userId, email, name) {
  const token = generateToken();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  await db.run(
    'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
    [userId, token, expires.toISOString()]
  );
  if (!resend) {
    console.log(`[DEV] Verify email link: ${API_URL}/api/auth/verify-email?token=${token}`);
    return;
  }
  const verifyUrl = `${API_URL}/api/auth/verify-email?token=${token}`;
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Confirma o teu email — CookIt',
    html: `
      <!DOCTYPE html><html><body style="font-family:sans-serif;max-width:480px;margin:40px auto;padding:20px;background:#FBF5EF;">
        <h2 style="color:#C2622D;margin-bottom:8px;">CookIt</h2>
        <p style="color:#1A1A1A;">Olá ${name},</p>
        <p style="color:#555;">Clica no botão abaixo para confirmar o teu endereço de email:</p>
        <a href="${verifyUrl}" style="display:inline-block;background:#C2622D;color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700;margin:16px 0;">
          Confirmar email
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px;">Este link expira em 24 horas. Se não criaste uma conta no CookIt, ignora este email.</p>
      </body></html>
    `,
  });
}

async function sendPasswordResetEmail(email, name, token) {
  if (!resend) {
    console.log(`[DEV] Reset link: ${API_URL}/api/auth/reset-password?token=${token}`);
    return;
  }
  const resetUrl = `${API_URL}/api/auth/reset-password?token=${token}`;
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Recuperar password — CookIt',
    html: `
      <!DOCTYPE html><html><body style="font-family:sans-serif;max-width:480px;margin:40px auto;padding:20px;background:#FBF5EF;">
        <h2 style="color:#C2622D;">CookIt — Recuperar password</h2>
        <p style="color:#1A1A1A;">Olá ${name},</p>
        <p style="color:#555;">Clica no link abaixo para definir uma nova password. O link expira em 1 hora.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#C2622D;color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700;margin:16px 0;">
          Redefinir password
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px;">Se não pediste um reset de password, ignora este email.</p>
      </body></html>
    `,
  });
}
```

- [ ] **Step 3: Add `express.urlencoded` middleware** (needed for the HTML reset form)

After `app.use(express.json({ limit: '15mb' }));` add:

```javascript
app.use(express.urlencoded({ extended: false }));
```

- [ ] **Step 4: Restart backend and confirm no crash**

```bash
npm run dev
```

Expected: starts cleanly. If `RESEND_API_KEY` is not in `.env`, that's fine — verify links print to console instead.

- [ ] **Step 5: Add to `.env`** (your local file — do NOT commit)

```
RESEND_API_KEY=re_xxxxxxxx        # get at resend.com
API_URL=https://your-app.onrender.com   # or http://localhost:3001 for local
FROM_EMAIL=CookIt <noreply@yourdomain.com>
```

> **Resend setup note:** Go to resend.com → create account → API Keys → New API Key. For testing without a domain, you can only send to your own verified email. For production, add and verify your domain at Domains → Add Domain.

- [ ] **Step 6: Commit**

```bash
git add backend/server.js backend/package.json backend/package-lock.json
git commit -m "feat: add Resend email helper + token generator to backend"
```

---

## Task 3: Backend — Update Auth Rate Limits + Register Endpoint

**Files:**
- Modify: `backend/server.js`

- [ ] **Step 1: Add per-route rate limiters**

Find the existing global `app.use(rateLimit({...}))` block (around line 28). After it, add:

```javascript
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas tentativas. Tenta novamente em 15 minutos.' },
});

const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados pedidos de reset. Tenta novamente mais tarde.' },
});
```

- [ ] **Step 2: Apply `authLimiter` to login and register routes**

Change the route signatures from:
```javascript
app.post('/api/auth/register', async (req, res) => {
app.post('/api/auth/login', async (req, res) => {
```
To:
```javascript
app.post('/api/auth/register', authLimiter, async (req, res) => {
app.post('/api/auth/login', authLimiter, async (req, res) => {
```

- [ ] **Step 3: Update the register route body**

Replace the entire register route with:

```javascript
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { name, username, email, password, terms_accepted } = req.body;

    if (!name || !username || !email || !password)
      return res.status(400).json({ error: 'Preenche todos os campos' });
    if (password.length < 8)
      return res.status(400).json({ error: 'A password deve ter pelo menos 8 caracteres' });
    if (!terms_accepted)
      return res.status(400).json({ error: 'Tens de aceitar os Termos e a Política de Privacidade' });

    const existing = await db.get(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );
    if (existing) return res.status(409).json({ error: 'Email ou username já existe' });

    const hash = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();
    await db.run(
      'INSERT INTO users (name, username, email, password, terms_accepted_at) VALUES (?, ?, ?, ?, ?)',
      [name, username, email, hash, now]
    );

    const user = await db.get(
      `SELECT id, name, first_name, last_name, username, email, avatar, bio, cooking_type,
              nationality, followers, following, recipes_count, email_verified, created_at
       FROM users WHERE email = ?`,
      [email]
    );
    if (!user) return res.status(500).json({ error: 'Erro ao criar utilizador' });

    // Send verification email — non-blocking, don't fail registration if email fails
    sendVerificationEmail(user.id, user.email, user.name).catch(e =>
      console.error('Verification email error:', e.message)
    );

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ user, token });
  } catch (e) {
    console.error('Register error:', e);
    res.status(500).json({ error: e.message });
  }
});
```

- [ ] **Step 4: Update login and `/api/auth/me` to return `email_verified`**

In the login route, change the SELECT to include `email_verified`:

```javascript
// In login route, replace:
const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);

// Keep as-is — SELECT * already includes email_verified since we added the column.
// But the destructure excludes password, which is correct. No change needed here.
```

Update the `/api/auth/me` GET endpoint. Find this query:
```javascript
'SELECT id, name, first_name, last_name, username, email, avatar, bio, cooking_type, nationality, followers, following, recipes_count, created_at FROM users WHERE id = ?'
```
Add `email_verified` to the select list:
```javascript
`SELECT id, name, first_name, last_name, username, email, avatar, bio, cooking_type,
        nationality, followers, following, recipes_count, email_verified, created_at
 FROM users WHERE id = ?`
```

Also update the profile update endpoint `PUT /api/auth/me` similarly — find the SELECT after the UPDATE and add `email_verified`.

- [ ] **Step 5: Restart and test register with curl**

```bash
curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","username":"testuser99","email":"test@example.com","password":"12345678","terms_accepted":true}' \
  | jq .
```

Expected: `{ user: { ..., email_verified: false }, token: "..." }`.

```bash
curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","username":"testuser99","email":"test@example.com","password":"123","terms_accepted":true}' \
  | jq .
```

Expected: `{ error: "A password deve ter pelo menos 8 caracteres" }`.

- [ ] **Step 6: Commit**

```bash
git add backend/server.js
git commit -m "feat: register requires 8-char password + terms acceptance, returns email_verified"
```

---

## Task 4: Backend — Email Verification + Password Reset Endpoints

**Files:**
- Modify: `backend/server.js`

- [ ] **Step 1: Add email verification endpoints**

After the `PUT /api/auth/me` route, add:

```javascript
// ── EMAIL VERIFICATION ──────────────────────────────────────────────────────

app.post('/api/auth/send-verification', auth, async (req, res) => {
  try {
    const user = await db.get(
      'SELECT id, email, name, email_verified FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado' });
    if (user.email_verified) return res.json({ ok: true });

    await sendVerificationEmail(user.id, user.email, user.name);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/auth/verify-email', async (req, res) => {
  const { token } = req.query;
  res.setHeader('Content-Type', 'text/html');

  if (!token) {
    return res.status(400).send('<h2>Link inválido.</h2>');
  }

  try {
    const row = await db.get(
      'SELECT * FROM email_verification_tokens WHERE token = ? AND used = FALSE',
      [token]
    );

    if (!row) {
      return res.send(`<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:400px;margin:60px auto;padding:20px;text-align:center;">
        <h2 style="color:#D4A853;">Link expirado ou já utilizado</h2>
        <p>Abre o CookIt e pede um novo link de verificação.</p>
      </body></html>`);
    }

    if (new Date(row.expires_at) < new Date()) {
      return res.send(`<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:400px;margin:60px auto;padding:20px;text-align:center;">
        <h2 style="color:#D4A853;">Link expirado</h2>
        <p>Abre o CookIt e pede um novo link de verificação.</p>
      </body></html>`);
    }

    await db.run('UPDATE users SET email_verified = TRUE WHERE id = ?', [row.user_id]);
    await db.run('UPDATE email_verification_tokens SET used = TRUE WHERE id = ?', [row.id]);

    res.send(`<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:400px;margin:60px auto;padding:20px;text-align:center;">
      <h2 style="color:#C2622D;">Email confirmado!</h2>
      <p>A tua conta está verificada. Abre o CookIt e continua a cozinhar.</p>
      <p style="margin-top:24px;"><a href="cookit://" style="color:#C2622D;font-weight:700;">Abrir CookIt</a></p>
    </body></html>`);
  } catch (e) {
    res.status(500).send(`<h2>Erro: ${e.message}</h2>`);
  }
});
```

- [ ] **Step 2: Add forgot password + reset password endpoints**

```javascript
// ── PASSWORD RESET ──────────────────────────────────────────────────────────

app.post('/api/auth/forgot-password', forgotLimiter, async (req, res) => {
  const { email } = req.body;
  // Always return 200 — don't reveal whether email exists
  try {
    const user = await db.get('SELECT id, email, name FROM users WHERE email = ?', [email]);
    if (user) {
      const token = generateToken();
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1h
      await db.run(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
        [user.id, token, expires.toISOString()]
      );
      await sendPasswordResetEmail(user.email, user.name, token);
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('Forgot password error:', e.message);
    res.json({ ok: true }); // still return ok to not reveal errors
  }
});

app.get('/api/auth/reset-password', async (req, res) => {
  const { token } = req.query;
  res.setHeader('Content-Type', 'text/html');

  if (!token) return res.status(400).send('<h2>Link inválido.</h2>');

  const row = await db.get(
    'SELECT * FROM password_reset_tokens WHERE token = ? AND used = FALSE',
    [token]
  ).catch(() => null);

  if (!row || new Date(row.expires_at) < new Date()) {
    return res.send(`<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:400px;margin:60px auto;padding:20px;text-align:center;">
      <h2 style="color:#D4A853;">Link expirado ou inválido</h2>
      <p>Pede um novo link na app CookIt.</p>
    </body></html>`);
  }

  res.send(`<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:400px;margin:60px auto;padding:20px;">
    <h2 style="color:#C2622D;margin-bottom:4px;">CookIt</h2>
    <h3 style="margin-top:0;">Nova password</h3>
    <form method="POST" action="/api/auth/reset-password" id="f">
      <input type="hidden" name="token" value="${token}" />
      <input type="password" name="password" placeholder="Nova password (mín. 8 caracteres)"
             required minlength="8"
             style="width:100%;padding:12px;margin:8px 0;border:1.5px solid #ccc;border-radius:10px;box-sizing:border-box;font-size:15px;" />
      <input type="password" name="confirm" placeholder="Confirmar password"
             required minlength="8"
             style="width:100%;padding:12px;margin:8px 0;border:1.5px solid #ccc;border-radius:10px;box-sizing:border-box;font-size:15px;" />
      <p id="err" style="color:#C2622D;display:none;">As passwords não coincidem.</p>
      <button type="submit"
              style="background:#C2622D;color:white;padding:14px;border:none;border-radius:10px;cursor:pointer;width:100%;font-size:16px;font-weight:700;margin-top:8px;">
        Guardar nova password
      </button>
    </form>
    <script>
      document.getElementById('f').onsubmit = function(e) {
        var p = this.password.value, c = this.confirm.value;
        if (p !== c) { e.preventDefault(); document.getElementById('err').style.display='block'; }
      };
    </script>
  </body></html>`);
});

app.post('/api/auth/reset-password', async (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  const { token, password, confirm } = req.body;

  if (!token || !password) return res.status(400).send('<h2>Dados em falta.</h2>');
  if (password !== confirm) return res.status(400).send('<h2>As passwords não coincidem.</h2>');
  if (password.length < 8) return res.status(400).send('<h2>Password demasiado curta (mín. 8 caracteres).</h2>');

  try {
    const row = await db.get(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND used = FALSE',
      [token]
    );

    if (!row || new Date(row.expires_at) < new Date()) {
      return res.send(`<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:400px;margin:60px auto;text-align:center;">
        <h2 style="color:#D4A853;">Link expirado</h2><p>Pede um novo link na app.</p>
      </body></html>`);
    }

    const hash = bcrypt.hashSync(password, 10);
    await db.run('UPDATE users SET password = ? WHERE id = ?', [hash, row.user_id]);
    await db.run('UPDATE password_reset_tokens SET used = TRUE WHERE id = ?', [row.id]);

    res.send(`<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:400px;margin:60px auto;padding:20px;text-align:center;">
      <h2 style="color:#C2622D;">Password alterada!</h2>
      <p>Abre o CookIt e inicia sessão com a nova password.</p>
      <p style="margin-top:24px;"><a href="cookit://" style="color:#C2622D;font-weight:700;">Abrir CookIt</a></p>
    </body></html>`);
  } catch (e) {
    res.status(500).send(`<h2>Erro: ${e.message}</h2>`);
  }
});
```

- [ ] **Step 3: Restart and test forgot password**

```bash
curl -s -X POST http://localhost:3001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"yourreal@email.com"}' | jq .
```

Expected: `{ "ok": true }`. Check console for the reset link (printed when `RESEND_API_KEY` is absent).

Open the printed link in a browser. Expected: HTML form with password fields appears.

- [ ] **Step 4: Commit**

```bash
git add backend/server.js
git commit -m "feat: email verification endpoint + forgot/reset password (HTML form)"
```

---

## Task 5: Frontend — Update AuthUser Interface + API Service

**Files:**
- Modify: `store/useStore.ts:36-51`
- Modify: `services/api.ts`

- [ ] **Step 1: Add `email_verified` to AuthUser**

In `store/useStore.ts`, find the `AuthUser` interface (around line 36) and add `email_verified`:

```typescript
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
```

- [ ] **Step 2: Add new API calls to `services/api.ts`**

At the end of the `api` object (before the closing `}`), add:

```typescript
  forgotPassword: (email: string): Promise<{ ok: boolean }> =>
    request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  sendVerification: (token: string): Promise<{ ok: boolean }> =>
    request('/auth/send-verification', { method: 'POST', headers: authHeader(token) }),
```

- [ ] **Step 3: Update `api.register` to send `terms_accepted`**

Find the `register` call in `services/api.ts`:

```typescript
  register: (body: { name: string; username: string; email: string; password: string }) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
```

Change to:

```typescript
  register: (body: { name: string; username: string; email: string; password: string; terms_accepted: boolean }) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to `AuthUser` or `api.register`.

- [ ] **Step 5: Commit**

```bash
git add store/useStore.ts services/api.ts
git commit -m "feat: add email_verified to AuthUser, forgotPassword + sendVerification API calls"
```

---

## Task 6: Frontend — i18n Keys

**Files:**
- Modify: `i18n/index.ts`

- [ ] **Step 1: Add new PT keys to the `auth` section**

In `i18n/index.ts`, find the `auth: {` object in the Portuguese (`pt`) section. Add these keys to the end of that object:

```typescript
    forgotPassword: 'Esqueci a password',
    forgotPasswordTitle: 'Recuperar password',
    forgotPasswordSubtitle: 'Insere o teu email e enviamos um link de recuperação.',
    forgotPasswordSent: 'Se este email estiver registado, vais receber um link em breve.',
    forgotPasswordBtn: 'Enviar link',
    termsCheckboxPrefix: 'Li e aceito os ',
    termsLink: 'Termos de Serviço',
    andText: ' e a ',
    privacyLink: 'Política de Privacidade',
    passwordTooShort: 'Mínimo 8 caracteres',
    termsRequired: 'Tens de aceitar os Termos e a Política de Privacidade',
    passwordStrengthWeak: 'Fraca',
    passwordStrengthMedium: 'Média',
    passwordStrengthStrong: 'Forte',
    verifyBanner: 'Confirma o teu email',
    verifyResend: 'Reenviar',
    verifyDone: 'Já verifiquei',
    verifySent: 'Enviado!',
    privacyTitle: 'Política de Privacidade',
    termsTitle: 'Termos de Serviço',
```

- [ ] **Step 2: Add the same keys (in English) to the EN `auth` section**

```typescript
    forgotPassword: 'Forgot password',
    forgotPasswordTitle: 'Reset password',
    forgotPasswordSubtitle: 'Enter your email and we\'ll send you a reset link.',
    forgotPasswordSent: 'If this email is registered, you\'ll receive a link shortly.',
    forgotPasswordBtn: 'Send link',
    termsCheckboxPrefix: 'I have read and accept the ',
    termsLink: 'Terms of Service',
    andText: ' and the ',
    privacyLink: 'Privacy Policy',
    passwordTooShort: 'Minimum 8 characters',
    termsRequired: 'You must accept the Terms and Privacy Policy',
    passwordStrengthWeak: 'Weak',
    passwordStrengthMedium: 'Medium',
    passwordStrengthStrong: 'Strong',
    verifyBanner: 'Confirm your email',
    verifyResend: 'Resend',
    verifyDone: 'Already verified',
    verifySent: 'Sent!',
    privacyTitle: 'Privacy Policy',
    termsTitle: 'Terms of Service',
```

- [ ] **Step 3: Confirm TypeScript compiles (EN must match PT structure)**

```bash
npx tsc --noEmit
```

Expected: no errors (the `en: typeof pt` constraint enforces identical structure).

- [ ] **Step 4: Commit**

```bash
git add i18n/index.ts
git commit -m "feat: add i18n keys for auth flow (verify email, forgot password, terms, privacy)"
```

---

## Task 7: Frontend — Privacy Policy Screen

**Files:**
- Create: `app/auth/privacy-policy.tsx`

- [ ] **Step 1: Create the privacy policy screen**

```tsx
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/Colors';
import { FONTS } from '../../constants/Fonts';
import { useT } from '../../i18n';

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const t = useT();
  const au = t.auth;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{au.privacyTitle}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Última atualização: 23 de abril de 2026</Text>

        <Section title="1. Quem somos">
          {`O CookIt é uma aplicação de partilha e descoberta de receitas. O responsável pelo tratamento de dados é o criador do CookIt. Para questões de privacidade, contacta: suporte@cookit.app`}
        </Section>

        <Section title="2. Dados que recolhemos">
          {`• Nome, username e email (para criar conta)\n• Password (guardada de forma segura com hash — nunca em texto simples)\n• Foto de perfil e bio (opcionais, fornecidos por ti)\n• Receitas, ingredientes e passos que publicas\n• Receitas que guardas, cozinhas ou gostas\n• Data e hora das ações na app (para estatísticas pessoais)`}
        </Section>

        <Section title="3. Como usamos os dados">
          {`Usamos os teus dados exclusivamente para:\n• Prestar o serviço CookIt (mostrar receitas, perfis, feed)\n• Autenticar-te de forma segura\n• Enviar emails transacionais (verificação de conta, reset de password)\n\nNão vendemos, partilhamos nem usamos os teus dados para publicidade de terceiros.`}
        </Section>

        <Section title="4. Com quem partilhamos">
          {`Os teus dados são processados pelos seguintes subprocessadores, com salvaguardas adequadas de proteção de dados:\n\n• Supabase (base de dados — servidores na UE): armazenamento dos dados de utilizador e receitas\n• Render (servidor da app — EUA, com Standard Contractual Clauses): processamento de pedidos\n• Resend (emails transacionais — EUA, com SCC): envio de emails de verificação e reset`}
        </Section>

        <Section title="5. Os teus direitos (RGPD)">
          {`Ao abrigo do Regulamento Geral sobre a Proteção de Dados (RGPD), tens direito a:\n\n• Acesso: pedir uma cópia dos teus dados\n• Retificação: corrigir dados incorretos\n• Apagamento: eliminar a tua conta e todos os dados associados\n• Portabilidade: exportar os teus dados\n• Oposição: opor-te a determinados tratamentos\n\nPara exerceres qualquer destes direitos, contacta: suporte@cookit.app`}
        </Section>

        <Section title="6. Retenção de dados">
          {`Os teus dados são mantidos enquanto tiveres conta no CookIt. Ao eliminares a conta (disponível em Definições), todos os dados são apagados permanentemente das nossas bases de dados no prazo de 30 dias.`}
        </Section>

        <Section title="7. Segurança">
          {`Implementamos medidas de segurança técnicas e organizativas adequadas, incluindo:\n• Passwords guardadas com hash bcrypt\n• Comunicações cifradas via HTTPS\n• Tokens de sessão com expiração de 30 dias`}
        </Section>

        <Section title="8. Cookies e armazenamento local">
          {`A app não utiliza cookies de rastreio. Usamos armazenamento local no teu dispositivo (AsyncStorage) apenas para manter a tua sessão ativa e preferências da app (como o idioma).`}
        </Section>

        <Section title="9. Alterações a esta política">
          {`Podemos atualizar esta Política de Privacidade. Em caso de alterações significativas, serás notificado através da app. O uso continuado da app após a notificação constitui aceitação das alterações.`}
        </Section>

        <Section title="10. Contacto">
          {`Para qualquer questão sobre privacidade ou para exercer os teus direitos:\nEmail: suporte@cookit.app`}
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.surface2,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17, fontWeight: '700', color: COLORS.text1,
    fontFamily: FONTS.bodyBold,
  },
  content: { padding: 20 },
  updated: {
    fontSize: 12, color: COLORS.text3,
    fontFamily: FONTS.body, marginBottom: 20,
  },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 15, fontWeight: '700', color: COLORS.text1,
    fontFamily: FONTS.bodyBold, marginBottom: 6,
  },
  sectionBody: {
    fontSize: 14, color: COLORS.text2, lineHeight: 22,
    fontFamily: FONTS.body,
  },
});
```

- [ ] **Step 2: Register the route in `app/_layout.tsx`**

In the `AppStack` function in `app/_layout.tsx`, add:

```tsx
<Stack.Screen name="auth/privacy-policy" options={{ headerShown: false }} />
<Stack.Screen name="auth/terms" options={{ headerShown: false }} />
```

- [ ] **Step 3: Commit**

```bash
git add app/auth/privacy-policy.tsx app/_layout.tsx
git commit -m "feat: add Privacy Policy screen"
```

---

## Task 8: Frontend — Terms of Service Screen

**Files:**
- Create: `app/auth/terms.tsx`

- [ ] **Step 1: Create the terms screen**

```tsx
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/Colors';
import { FONTS } from '../../constants/Fonts';
import { useT } from '../../i18n';

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  );
}

export default function TermsScreen() {
  const router = useRouter();
  const t = useT();
  const au = t.auth;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{au.termsTitle}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Última atualização: 23 de abril de 2026</Text>

        <Section title="1. Aceitação dos Termos">
          {`Ao criares uma conta e usares o CookIt, aceitas estes Termos de Serviço. Se não concordares, não uses a app. Ao aceitares, confirmas que tens pelo menos 13 anos de idade.`}
        </Section>

        <Section title="2. A tua conta">
          {`• És responsável por manter a confidencialidade da tua password\n• Não podes criar contas em nome de outra pessoa\n• Tens de fornecer informações verdadeiras no registo\n• Podes eliminar a tua conta a qualquer momento em Definições`}
        </Section>

        <Section title="3. Conteúdo que publicas">
          {`Ao publicares receitas, fotos ou outro conteúdo no CookIt:\n\n• Confirmas que tens os direitos necessários sobre esse conteúdo\n• Concedes ao CookIt uma licença não exclusiva, gratuita e mundial para exibir esse conteúdo dentro da app\n• Não publiques receitas ou conteúdo protegido por direitos de autor de terceiros sem autorização\n• Mantens a propriedade total do teu conteúdo`}
        </Section>

        <Section title="4. Regras de utilização">
          {`É proibido:\n• Usar a app para fins ilegais\n• Tentar aceder a contas ou dados de outros utilizadores\n• Publicar conteúdo ofensivo, discriminatório ou que viole direitos de terceiros\n• Fazer spam, publicidade não autorizada ou comportamento abusivo\n• Tentar comprometer a segurança da plataforma`}
        </Section>

        <Section title="5. Suspensão e terminação">
          {`Podemos suspender ou eliminar a tua conta, com ou sem aviso prévio, se violar estes Termos ou se o comportamento for prejudicial para a comunidade ou para a plataforma.`}
        </Section>

        <Section title="6. Disponibilidade do serviço">
          {`O CookIt é fornecido "tal como está", sem garantias de disponibilidade ininterrupta. Podemos alterar, suspender ou descontinuar o serviço a qualquer momento, sem responsabilidade.`}
        </Section>

        <Section title="7. Limitação de responsabilidade">
          {`Na máxima extensão permitida pela lei aplicável, o CookIt não é responsável por danos diretos, indiretos, incidentais ou consequenciais resultantes do uso ou incapacidade de uso da app.`}
        </Section>

        <Section title="8. Alterações aos Termos">
          {`Podemos atualizar estes Termos. Serás notificado através da app em caso de alterações significativas. O uso continuado da app após a notificação constitui aceitação das alterações.`}
        </Section>

        <Section title="9. Lei aplicável">
          {`Estes Termos são regidos pela lei portuguesa e pela legislação da União Europeia. Qualquer litígio será submetido aos tribunais competentes em Portugal.`}
        </Section>

        <Section title="10. Contacto">
          {`Para questões sobre estes Termos:\nEmail: suporte@cookit.app`}
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.surface2,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17, fontWeight: '700', color: COLORS.text1,
    fontFamily: FONTS.bodyBold,
  },
  content: { padding: 20 },
  updated: {
    fontSize: 12, color: COLORS.text3,
    fontFamily: FONTS.body, marginBottom: 20,
  },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 15, fontWeight: '700', color: COLORS.text1,
    fontFamily: FONTS.bodyBold, marginBottom: 6,
  },
  sectionBody: {
    fontSize: 14, color: COLORS.text2, lineHeight: 22,
    fontFamily: FONTS.body,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/auth/terms.tsx
git commit -m "feat: add Terms of Service screen"
```

---

## Task 9: Frontend — Update Register Screen (Terms + Password Strength)

**Files:**
- Modify: `app/auth/register.tsx`

- [ ] **Step 1: Add state for terms and password strength helper**

At the top of `RegisterScreen`, add new state and a helper function:

```tsx
const [termsAccepted, setTermsAccepted] = useState(false);

function getPasswordStrength(pw: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (pw.length === 0) return { level: 0, label: '', color: 'transparent' };
  if (pw.length < 8) return { level: 1, label: au.passwordTooShort, color: COLORS.accent };
  const hasUpper = /[A-Z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  const score = [hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  if (score >= 2) return { level: 3, label: au.passwordStrengthStrong, color: COLORS.green };
  if (score === 1) return { level: 2, label: au.passwordStrengthMedium, color: COLORS.star };
  return { level: 1, label: au.passwordStrengthWeak, color: COLORS.accent };
}

const strength = getPasswordStrength(password);
```

- [ ] **Step 2: Update `handleRegister` to validate and send terms**

Replace the `handleRegister` function:

```tsx
async function handleRegister() {
  setError('');
  if (!termsAccepted) {
    setError(au.termsRequired);
    return;
  }
  if (password.length < 8) {
    setError(au.passwordTooShort);
    return;
  }
  setLoading(true);
  try {
    const { user, token } = await api.register({ name, username, email, password, terms_accepted: true });
    setAuth(user, token);
    router.replace('/auth/setup-profile');
  } catch (e: any) {
    setError(e.message);
  } finally {
    setLoading(false);
  }
}
```

- [ ] **Step 3: Add password strength bar after the password field**

After the password `<View style={styles.inputWrap}>` closing tag, add:

```tsx
{password.length > 0 && (
  <View style={styles.strengthWrap}>
    <View style={styles.strengthBars}>
      {[1, 2, 3].map((n) => (
        <View
          key={n}
          style={[
            styles.strengthBar,
            { backgroundColor: strength.level >= n ? strength.color : COLORS.border },
          ]}
        />
      ))}
    </View>
    {strength.label ? (
      <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
    ) : null}
  </View>
)}
```

- [ ] **Step 4: Add terms checkbox before the submit button**

Inside the `<View style={styles.form}>`, just before the submit `<TouchableOpacity>` button:

```tsx
<TouchableOpacity
  style={styles.termsRow}
  onPress={() => setTermsAccepted(!termsAccepted)}
  activeOpacity={0.7}
>
  <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
    {termsAccepted && <Ionicons name="checkmark" size={13} color={COLORS.bg} />}
  </View>
  <Text style={styles.termsText}>
    {au.termsCheckboxPrefix}
    <Text style={styles.termsLink} onPress={() => router.push('/auth/terms')}>
      {au.termsLink}
    </Text>
    {au.andText}
    <Text style={styles.termsLink} onPress={() => router.push('/auth/privacy-policy')}>
      {au.privacyLink}
    </Text>
  </Text>
</TouchableOpacity>
```

- [ ] **Step 5: Add the new styles**

In the `StyleSheet.create({...})` at the bottom, add:

```tsx
  strengthWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  strengthBars: { flexDirection: 'row', gap: 4, flex: 1 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontWeight: '600', fontFamily: FONTS.bodyBold },

  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 4 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 1,
  },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  termsText: { flex: 1, fontSize: 13, color: COLORS.text3, lineHeight: 20, fontFamily: FONTS.body },
  termsLink: { color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.bodyBold },
```

- [ ] **Step 6: Test registration in the app**

Start Expo, navigate to Register, try submitting without accepting terms → error appears. Accept terms + enter an 8-char password → registration succeeds.

- [ ] **Step 7: Commit**

```bash
git add app/auth/register.tsx
git commit -m "feat: register — terms checkbox + password strength indicator (8-char min)"
```

---

## Task 10: Frontend — Login Screen + Forgot Password Screen

**Files:**
- Modify: `app/auth/login.tsx`
- Create: `app/auth/forgot-password.tsx`

- [ ] **Step 1: Add "forgot password" link to login screen**

In `app/auth/login.tsx`, after the submit button `<TouchableOpacity>` and before the divider `<View style={styles.dividerRow}>`, add:

```tsx
<TouchableOpacity
  onPress={() => router.push('/auth/forgot-password')}
  style={styles.forgotBtn}
>
  <Text style={styles.forgotText}>{au.forgotPassword}</Text>
</TouchableOpacity>
```

Add to `StyleSheet.create`:

```tsx
  forgotBtn: { alignSelf: 'flex-end', marginTop: -4 },
  forgotText: { fontSize: 13, color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.bodyBold },
```

- [ ] **Step 2: Create the forgot password screen**

Create `app/auth/forgot-password.tsx`:

```tsx
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/Colors';
import { FONTS } from '../../constants/Fonts';
import { api } from '../../services/api';
import { useT } from '../../i18n';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const t = useT();
  const au = t.auth;
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      await api.forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch {
      // Show success even on error — don't reveal whether email exists
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text2} />
        </TouchableOpacity>

        <View style={styles.iconWrap}>
          <Ionicons name="key-outline" size={36} color={COLORS.primary} />
        </View>

        <Text style={styles.title}>{au.forgotPasswordTitle}</Text>
        <Text style={styles.subtitle}>{au.forgotPasswordSubtitle}</Text>

        {sent ? (
          <View style={styles.sentBox}>
            <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.green} />
            <Text style={styles.sentText}>{au.forgotPasswordSent}</Text>
          </View>
        ) : (
          <>
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={18} color={COLORS.text3} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.input}
                placeholder={au.emailPlaceholder}
                placeholderTextColor={COLORS.text3}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, (loading || !email.trim()) && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={loading || !email.trim()}
            >
              {loading
                ? <ActivityIndicator color={COLORS.bg} />
                : <Text style={styles.btnText}>{au.forgotPasswordBtn}</Text>
              }
            </TouchableOpacity>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  inner: {
    flex: 1, padding: 28, justifyContent: 'center', gap: 14,
  },
  backBtn: {
    position: 'absolute', top: 16, left: 20,
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: 24,
    backgroundColor: COLORS.primaryDim,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 8,
  },
  title: {
    fontSize: 24, fontWeight: '800', color: COLORS.text1,
    textAlign: 'center', fontFamily: FONTS.titleBold,
  },
  subtitle: {
    fontSize: 14, color: COLORS.text3, textAlign: 'center',
    fontFamily: FONTS.body, lineHeight: 20,
  },
  errorBox: {
    backgroundColor: COLORS.accentDim, padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.accent,
  },
  errorText: { color: COLORS.accent, fontSize: 13, fontFamily: FONTS.body },
  sentBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: COLORS.greenDim, padding: 16, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.green,
  },
  sentText: {
    flex: 1, color: COLORS.green, fontSize: 14,
    fontFamily: FONTS.body, lineHeight: 20,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface2, borderRadius: 16,
    borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1, paddingVertical: 14, fontSize: 15,
    color: COLORS.text1, fontFamily: FONTS.body,
  },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 16, fontWeight: '900', color: COLORS.bg, fontFamily: FONTS.bodyBold },
});
```

- [ ] **Step 3: Test the flow**

Start Expo → Login screen → tap "Esqueci a password" → enter email → tap "Enviar link" → success message appears. Check backend console for the reset link (in dev without Resend key). Open link in browser → HTML form appears.

- [ ] **Step 4: Commit**

```bash
git add app/auth/login.tsx app/auth/forgot-password.tsx
git commit -m "feat: forgot password screen + link on login screen"
```

---

## Task 11: Frontend — Email Verification Banner in Tabs

**Files:**
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Add the banner component and state**

In `app/(tabs)/_layout.tsx`, add the following imports at the top:

```tsx
import { Text, TouchableOpacity, View } from 'react-native';
import { useState } from 'react';
import { api } from '../../services/api';
```

Replace the `TabLayout` component with:

```tsx
export default function TabLayout() {
  const { token, user, updateUser } = useStore();
  const t = useT();
  const au = t.auth;
  const [resent, setResent] = useState(false);

  if (!token) {
    return <Redirect href="/auth/login" />;
  }

  async function handleResend() {
    if (!token) return;
    try {
      await api.sendVerification(token);
      setResent(true);
    } catch {}
  }

  async function handleVerified() {
    if (!token) return;
    try {
      const fresh = await api.me(token);
      if (fresh) updateUser(fresh);
    } catch {}
  }

  const showBanner = user != null && user.email_verified === false;

  return (
    <View style={{ flex: 1 }}>
      {showBanner && (
        <View style={styles.verifyBanner}>
          <Text style={styles.verifyText}>{au.verifyBanner}</Text>
          <View style={styles.verifyActions}>
            {resent ? (
              <Text style={styles.verifySent}>{au.verifySent}</Text>
            ) : (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.verifyBtn}>{au.verifyResend}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleVerified}>
              <Text style={styles.verifyBtn}>{au.verifyDone}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.text3,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
        {/* all existing Tabs.Screen entries here — unchanged */}
      </Tabs>
    </View>
  );
}
```

- [ ] **Step 2: Add banner styles**

In the `StyleSheet.create({...})` at the bottom of the file, add:

```tsx
  verifyBanner: {
    backgroundColor: COLORS.accentDim,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  verifyText: {
    flex: 1, fontSize: 12, color: COLORS.text2,
    fontFamily: FONTS.body,
  },
  verifyActions: { flexDirection: 'row', gap: 12 },
  verifyBtn: {
    fontSize: 12, fontWeight: '700', color: COLORS.primary,
    fontFamily: FONTS.bodyBold,
  },
  verifySent: {
    fontSize: 12, color: COLORS.green, fontFamily: FONTS.body,
  },
```

- [ ] **Step 3: Update the store import to include `updateUser`**

In `app/(tabs)/_layout.tsx`, the existing import is:
```tsx
const token = useStore((s) => s.token);
```

Change to:
```tsx
const { token, user, updateUser } = useStore();
```

- [ ] **Step 4: Test the banner**

Register a new account → navigate to tabs → the yellow banner "Confirma o teu email" should appear at the top. Tap "Reenviar" → "Enviado!" appears. In backend console, copy the verify link → open in browser → returns HTML success. Back in app, tap "Já verifiquei" → banner should disappear (after `api.me` returns `email_verified: true`).

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/_layout.tsx"
git commit -m "feat: email verification banner above tab navigator"
```

---

## Task 12: Deploy Backend to Render + Set Environment Variables

**Files:** None (Render dashboard config only)

- [ ] **Step 1: Add env vars to Render**

In your Render dashboard, go to your backend service → Environment:

| Key | Value |
|-----|-------|
| `RESEND_API_KEY` | Your key from resend.com |
| `API_URL` | `https://your-app.onrender.com` |
| `FROM_EMAIL` | `CookIt <noreply@yourdomain.com>` |

> If you don't have a domain yet: use `onboarding@resend.dev` as `FROM_EMAIL`. Emails will only arrive at the Resend account owner's email. For production, add a real domain at resend.com → Domains.

- [ ] **Step 2: Push backend to trigger Render redeploy**

```bash
git push origin master
```

Wait for Render to finish the build (2–3 min). Check the Render logs for "Server running" and no errors.

- [ ] **Step 3: Test email in production**

```bash
curl -s -X POST https://your-app.onrender.com/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"yourreal@email.com"}' | jq .
```

Expected: `{ "ok": true }` and an email arrives within 1–2 minutes.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "chore: all production auth + compliance features complete"
git push origin master
```

---

## Self-Review

**Spec coverage:**
- ✅ Email verification — Tasks 2, 3, 4, 11
- ✅ Password reset — Tasks 2, 4, 10
- ✅ Password 8-char minimum — Tasks 3, 9
- ✅ Password strength indicator — Task 9
- ✅ Terms of Service screen — Task 8
- ✅ Privacy Policy screen — Task 7
- ✅ Terms checkbox in register — Task 9
- ✅ Auth-specific rate limiting — Task 3
- ✅ `email_verified` field in user object — Tasks 3, 5
- ✅ i18n for all new strings — Task 6
- ✅ Deploy env vars — Task 12

**Gaps:** Social login (Google + Apple) is intentionally deferred to Plan B.

**Type consistency check:**
- `api.register` takes `{ ..., terms_accepted: boolean }` — consistent in Tasks 5 and 9
- `AuthUser.email_verified: boolean` — consistent in Tasks 5 and 11
- `au.verifyBanner`, `au.verifyResend`, `au.verifyDone`, `au.verifySent` — defined in Task 6, used in Task 11 ✅
- `au.termsCheckboxPrefix`, `au.termsLink`, `au.andText`, `au.privacyLink` — defined Task 6, used Task 9 ✅
- `api.forgotPassword`, `api.sendVerification` — defined Task 5, used Tasks 10 and 11 ✅
