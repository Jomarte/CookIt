# Recipe Scanner AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a paid AI feature that analyses a photo (written recipe or dish) using Claude Vision and auto-fills the recipe form in CookIt, with a "Quero Cozinhar" private list in the user's profile.

**Architecture:** New `/api/ai/*` backend routes call the Anthropic SDK with the user's photo; quota is tracked per-user in the DB. The frontend has a new `app/scanner.tsx` screen (camera → loading → result) reachable via a header button and swipe gesture on the feed. A second entry point lives inside `add.tsx` (AI button after photo pick). Results can be saved to a private `scan_recipes` table or forwarded to `add.tsx` for publishing.

**Tech Stack:** Expo + React Native (expo-image-picker, expo-router, PanResponder), Zustand, Node.js/Express, PostgreSQL, `@anthropic-ai/sdk`.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `backend/database.js` | Modify | Add `scan_recipes` table and 3 AI columns to `users` |
| `backend/server.js` | Modify | Add 4 `/api/ai/*` endpoints |
| `backend/.env` / `.env.example` | Modify | Add `ANTHROPIC_API_KEY` |
| `services/api.ts` | Modify | Add `scanRecipe`, `getScanRecipes`, `saveScanRecipe`, `deleteScanRecipe` |
| `store/useStore.ts` | Modify | Add `aiScansUsed`, `aiPlan`, `setAiData` |
| `i18n/index.ts` | Modify | Add scanner translations (PT + EN) |
| `app/scanner.tsx` | Create | Scanner screen (pick → loading → result → save/publish) |
| `app/(tabs)/index.tsx` | Modify | Swipe-right gesture + 📷 header button → `/scanner` |
| `app/(tabs)/add.tsx` | Modify | "Analisar com IA ✨" button; read `scanData` param |
| `app/(tabs)/profile.tsx` | Modify | "Quero Cozinhar" tab |

---

## Task 1: Backend DB — scan_recipes table + AI columns on users

**Files:**
- Modify: `backend/database.js`

- [ ] **Step 1: Add the new table and columns in `database.js` `init()`**

  In `database.js`, inside the `async function init()`, after the existing `ALTER TABLE` statements at the end, add:

  ```js
  // AI scan quota columns on users
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_plan TEXT DEFAULT 'free'`);
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
  ```

- [x] **Step 2: Restart backend to apply schema**

  Run: `cd backend && node server.js`

  Expected: server starts without errors, logs connection success.

- [x] **Step 3: Verify columns exist**

  Run (in psql or any DB client):
  ```sql
  SELECT ai_plan, ai_scans_used, ai_scans_reset_at FROM users LIMIT 1;
  SELECT id FROM scan_recipes LIMIT 1;
  ```
  Expected: both queries succeed.

- [x] **Step 4: Commit**

  ```bash
  git add backend/database.js
  git commit -m "feat: add scan_recipes table and AI quota columns to users"
  ```

---

## Task 2: Backend — Install Anthropic SDK + env var

**Files:**
- Modify: `backend/package.json`, `backend/.env`, `backend/.env.example`

- [ ] **Step 1: Install SDK**

  ```bash
  cd backend && npm install @anthropic-ai/sdk
  ```

  Expected: `@anthropic-ai/sdk` appears in `backend/package.json` dependencies.

- [ ] **Step 2: Add env var to `.env` and `.env.example`**

  In `backend/.env`, add:
  ```
  ANTHROPIC_API_KEY=sk-ant-...your-key-here...
  ```

  In `backend/.env.example`, add:
  ```
  ANTHROPIC_API_KEY=
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add backend/package.json backend/package-lock.json backend/.env.example
  git commit -m "feat: install @anthropic-ai/sdk and document ANTHROPIC_API_KEY env var"
  ```

---

## Task 3: Backend — POST /api/ai/scan endpoint

**Files:**
- Modify: `backend/server.js`

- [ ] **Step 1: Require Anthropic at the top of server.js**

  At the top of `server.js`, after the existing `require` statements:

  ```js
  const Anthropic = require('@anthropic-ai/sdk');
  const anthropic = process.env.ANTHROPIC_API_KEY
    ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    : null;
  ```

- [ ] **Step 2: Add the AI rate limiter**

  After the existing `commentLimiter`, add:

  ```js
  const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas análises. Aguarda um momento.' },
  });
  ```

- [ ] **Step 3: Add the Claude Vision prompt constant**

  After `aiLimiter`, add:

  ```js
  const SCAN_PROMPT = `Analisa esta imagem. Pode ser uma receita escrita (livro, revista, ecrã) ou um prato de comida num restaurante ou em casa.

  Se for uma receita escrita, extrai os dados exatos.
  Se for um prato de comida, cria uma receita provável para esse prato.

  Responde APENAS com JSON válido, sem texto adicional:
  {
    "title": "Nome da receita",
    "ingredients": [
      {"name": "ingrediente", "amount": "100", "unit": "g"}
    ],
    "steps": ["Passo 1...", "Passo 2..."],
    "prep_time": 15,
    "cook_time": 20,
    "servings": 4,
    "difficulty": "Fácil",
    "cuisine": "Portuguesa"
  }

  Para "unit" usa sempre: g, kg, ml, L, c.s., c.c., un., fatia, dente, ramo, q.b., pitada
  Para "difficulty" usa sempre: Fácil, Médio, ou Difícil`;
  ```

- [ ] **Step 4: Add the POST /api/ai/scan route**

  Find a good location in `server.js` (e.g. before the `app.listen` call, grouped logically). Add:

  ```js
  // ── AI SCAN ─────────────────────────────────────────────────────────────────

  app.post('/api/ai/scan', auth, aiLimiter, async (req, res) => {
    try {
      if (!anthropic) return res.status(503).json({ error: 'Serviço de IA não configurado' });

      const { image } = req.body;
      if (!image || typeof image !== 'string') {
        return res.status(400).json({ error: 'Imagem em falta' });
      }
      // Strip data URL prefix if present
      const base64Match = image.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!base64Match) return res.status(400).json({ error: 'Formato de imagem inválido (deve ser data URL base64)' });
      const mediaType = `image/${base64Match[1]}`;
      const base64Data = base64Match[2];

      const userId = req.user.id;
      const user = await db.get('SELECT ai_plan, ai_scans_used, ai_scans_reset_at FROM users WHERE id = ?', [userId]);
      if (!user) return res.status(404).json({ error: 'Utilizador não encontrado' });

      // Monthly reset
      const today = new Date().toISOString().slice(0, 10);
      let scansUsed = user.ai_scans_used ?? 0;
      const resetAt = user.ai_scans_reset_at;
      if (!resetAt) {
        // First scan ever — set reset date
        await db.run('UPDATE users SET ai_scans_reset_at = ? WHERE id = ?', [today, userId]);
      } else {
        const resetDate = new Date(resetAt);
        const now = new Date();
        const daysDiff = (now - resetDate) / (1000 * 60 * 60 * 24);
        if (daysDiff >= 30) {
          scansUsed = 0;
          await db.run('UPDATE users SET ai_scans_used = 0, ai_scans_reset_at = ? WHERE id = ?', [today, userId]);
        }
      }

      const plan = user.ai_plan ?? 'free';
      const limit = plan === 'pro' ? 30 : 3;
      if (scansUsed >= limit) {
        return res.status(403).json({ error: `Limite de análises atingido (${limit}/${limit}). Faz upgrade para Pro.`, scansUsed, limit, aiPlan: plan });
      }

      // Call Claude Vision
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
            { type: 'text', text: SCAN_PROMPT },
          ],
        }],
      });

      const text = response.content[0]?.text ?? '';
      let recipe;
      try {
        recipe = JSON.parse(text);
      } catch {
        return res.status(500).json({ error: 'A IA devolveu uma resposta inválida. Tenta com outra foto.' });
      }

      // Increment quota
      const newScansUsed = scansUsed + 1;
      await db.run('UPDATE users SET ai_scans_used = ? WHERE id = ?', [newScansUsed, userId]);

      res.json({ recipe, scansUsed: newScansUsed, aiPlan: plan });
    } catch (err) {
      serverError(res, err);
    }
  });
  ```

- [ ] **Step 5: Test the endpoint manually**

  With a running backend and a valid JWT token, send:
  ```bash
  curl -X POST http://localhost:3001/api/ai/scan \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"image":"data:image/jpeg;base64,/9j/..."}'
  ```
  Expected: `{ recipe: { title, ingredients, steps, ... }, scansUsed: 1, aiPlan: "free" }`

- [ ] **Step 6: Commit**

  ```bash
  git add backend/server.js
  git commit -m "feat: add POST /api/ai/scan endpoint with Claude Vision and quota system"
  ```

---

## Task 4: Backend — scan-recipes CRUD endpoints

**Files:**
- Modify: `backend/server.js`

- [ ] **Step 1: Add GET /api/ai/scan-recipes**

  Add after the `/api/ai/scan` route:

  ```js
  app.get('/api/ai/scan-recipes', auth, async (req, res) => {
    try {
      const rows = await db.all(
        'SELECT id, image, title, ingredients, steps, prep_time, cook_time, servings, difficulty, cuisine, created_at FROM scan_recipes WHERE user_id = ? ORDER BY created_at DESC',
        [req.user.id]
      );
      const recipes = rows.map((r) => ({
        ...r,
        ingredients: JSON.parse(r.ingredients ?? '[]'),
        steps: JSON.parse(r.steps ?? '[]'),
      }));
      res.json(recipes);
    } catch (err) {
      serverError(res, err);
    }
  });
  ```

- [ ] **Step 2: Add POST /api/ai/scan-recipes**

  ```js
  app.post('/api/ai/scan-recipes', auth, async (req, res) => {
    try {
      const { image, title, ingredients, steps, prep_time, cook_time, servings, difficulty, cuisine } = req.body;
      if (!title) return res.status(400).json({ error: 'Título em falta' });
      const result = await db.run(
        'INSERT INTO scan_recipes (user_id, image, title, ingredients, steps, prep_time, cook_time, servings, difficulty, cuisine) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          req.user.id,
          image ?? null,
          sanitizeStr(title, 200),
          JSON.stringify(Array.isArray(ingredients) ? ingredients : []),
          JSON.stringify(Array.isArray(steps) ? steps : []),
          parseInt(prep_time) || 0,
          parseInt(cook_time) || 0,
          parseInt(servings) || 2,
          ['Fácil', 'Médio', 'Difícil'].includes(difficulty) ? difficulty : 'Fácil',
          sanitizeStr(cuisine ?? 'Internacional', 100),
        ]
      );
      res.status(201).json({ id: result.lastInsertRowid });
    } catch (err) {
      serverError(res, err);
    }
  });
  ```

- [ ] **Step 3: Add DELETE /api/ai/scan-recipes/:id**

  ```js
  app.delete('/api/ai/scan-recipes/:id', auth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });
      const row = await db.get('SELECT id FROM scan_recipes WHERE id = ? AND user_id = ?', [id, req.user.id]);
      if (!row) return res.status(404).json({ error: 'Receita não encontrada' });
      await db.run('DELETE FROM scan_recipes WHERE id = ?', [id]);
      res.json({ ok: true });
    } catch (err) {
      serverError(res, err);
    }
  });
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add backend/server.js
  git commit -m "feat: add scan-recipes CRUD endpoints (GET list, POST save, DELETE)"
  ```

---

## Task 5: Frontend — api.ts methods

**Files:**
- Modify: `services/api.ts`

- [ ] **Step 1: Add 4 methods to the `api` object**

  In `services/api.ts`, inside the `export const api = {` object, add before the closing `};`:

  ```ts
  scanRecipe: (token: string, image: string): Promise<{ recipe: any; scansUsed: number; aiPlan: 'free' | 'pro' }> =>
    request('/ai/scan', { method: 'POST', headers: authHeader(token), body: JSON.stringify({ image }) }),

  getScanRecipes: (token: string): Promise<any[]> =>
    request('/ai/scan-recipes', { headers: authHeader(token) }),

  saveScanRecipe: (token: string, body: {
    image?: string | null; title: string; ingredients: any[]; steps: string[];
    prep_time: number; cook_time: number; servings: number; difficulty: string; cuisine: string;
  }) =>
    request('/ai/scan-recipes', { method: 'POST', headers: authHeader(token), body: JSON.stringify(body) }),

  deleteScanRecipe: (token: string, id: number) =>
    request(`/ai/scan-recipes/${id}`, { method: 'DELETE', headers: authHeader(token) }),
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  Run: `npx tsc --noEmit`

  Expected: no errors in `services/api.ts`.

- [ ] **Step 3: Commit**

  ```bash
  git add services/api.ts
  git commit -m "feat: add scanRecipe, getScanRecipes, saveScanRecipe, deleteScanRecipe to api.ts"
  ```

---

## Task 6: Frontend — Zustand store (AI quota state)

**Files:**
- Modify: `store/useStore.ts`

- [ ] **Step 1: Add AI state to the interface**

  In `store/useStore.ts`, inside the `interface AppState {` block, add:

  ```ts
  aiScansUsed: number;
  aiPlan: 'free' | 'pro';
  setAiData: (used: number, plan: 'free' | 'pro') => void;
  ```

- [ ] **Step 2: Add initial values and action to the store**

  Inside `export const useStore = create<AppState>()((set, get) => ({`, add the initial values:

  ```ts
  aiScansUsed: 0,
  aiPlan: 'free' as 'free' | 'pro',
  setAiData: (used, plan) => set({ aiScansUsed: used, aiPlan: plan }),
  ```

  Also update the `logout` action to reset AI state:

  ```ts
  logout: () => set({
    user: null,
    token: null,
    cookedRecipes: [],
    cookedLogs: [],
    savedRecipes: [],
    likedRecipes: [],
    shoppingList: [],
    userRatings: {},
    aiScansUsed: 0,
    aiPlan: 'free',
  }),
  ```

- [ ] **Step 3: Verify TypeScript compiles**

  Run: `npx tsc --noEmit`

  Expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  git add store/useStore.ts
  git commit -m "feat: add aiScansUsed, aiPlan, setAiData to Zustand store"
  ```

---

## Task 7: i18n — Scanner translations

**Files:**
- Modify: `i18n/index.ts`

- [ ] **Step 1: Add scanner section to the `pt` object**

  In `i18n/index.ts`, inside the `const pt = {` object (after the `feed:` section), add:

  ```ts
  scanner: {
    photoTitle: 'Analisar foto',
    photoQuestion: 'Como queres adicionar a foto?',
    camera: 'Câmara',
    gallery: 'Galeria',
    analyzing: 'A analisar com IA...',
    resultTitle: 'Receita encontrada',
    wantToCook: 'Quero Cozinhar',
    publishNow: 'Publicar agora',
    ingredients: 'Ingredientes',
    steps: 'Passos',
    permissionTitle: 'Permissão necessária',
    permissionCamera: 'É necessária permissão para usar a câmara.',
    loginRequired: 'Tens de estar autenticado para usar o Scanner IA.',
    quotaTitle: 'Limite atingido',
    quotaMsg: 'Esgotaste as tuas análises mensais. Faz upgrade para Pro para teres 30 análises/mês.',
    analyzeError: 'Não foi possível analisar a foto. Tenta outra imagem.',
    savedTitle: 'Guardado!',
    savedMsg: 'Receita guardada na tua lista "Quero Cozinhar".',
    analyzeBtn: 'Analisar com IA ✨',
    analyzingBtn: 'A analisar...',
    scansLeft: (used: number, limit: number) => `${used}/${limit} análises`,
  },
  ```

- [ ] **Step 2: Add scanner section to the `en` object**

  In the same file, inside `const en = {` (after the `feed:` section), add:

  ```ts
  scanner: {
    photoTitle: 'Analyse photo',
    photoQuestion: 'How do you want to add the photo?',
    camera: 'Camera',
    gallery: 'Gallery',
    analyzing: 'Analysing with AI...',
    resultTitle: 'Recipe found',
    wantToCook: 'Want to Cook',
    publishNow: 'Publish now',
    ingredients: 'Ingredients',
    steps: 'Steps',
    permissionTitle: 'Permission required',
    permissionCamera: 'Camera permission is required.',
    loginRequired: 'You need to be logged in to use the AI Scanner.',
    quotaTitle: 'Limit reached',
    quotaMsg: 'You have used all your monthly analyses. Upgrade to Pro for 30 analyses/month.',
    analyzeError: 'Could not analyse the photo. Try another image.',
    savedTitle: 'Saved!',
    savedMsg: 'Recipe saved to your "Want to Cook" list.',
    analyzeBtn: 'Analyse with AI ✨',
    analyzingBtn: 'Analysing...',
    scansLeft: (used: number, limit: number) => `${used}/${limit} analyses`,
  },
  ```

- [ ] **Step 3: Add profile "Quero Cozinhar" tab translations**

  Inside the `pt.profile` object, add:
  ```ts
  wantToCook: 'Quero Cozinhar',
  wantToCookEmpty: 'Ainda não guardaste receitas.',
  wantToCookEmptySub: 'Usa o Scanner IA para guardar receitas que queres fazer.',
  publishWithPhoto: 'Publicar com a tua foto 📸',
  ```

  Inside the `en.profile` object, add:
  ```ts
  wantToCook: 'Want to Cook',
  wantToCookEmpty: 'No saved recipes yet.',
  wantToCookEmptySub: 'Use the AI Scanner to save recipes you want to make.',
  publishWithPhoto: 'Publish with your photo 📸',
  ```

- [ ] **Step 4: Verify TypeScript compiles**

  Run: `npx tsc --noEmit`

  Expected: no errors.

- [ ] **Step 5: Commit**

  ```bash
  git add i18n/index.ts
  git commit -m "feat: add scanner and wantToCook translations to i18n (PT + EN)"
  ```

---

## Task 8: Frontend — app/scanner.tsx (new screen)

**Files:**
- Create: `app/scanner.tsx`

- [ ] **Step 1: Create the scanner screen file**

  Create `app/scanner.tsx` with this complete content:

  ```tsx
  import { useRouter } from 'expo-router';
  import React, { useEffect, useState } from 'react';
  import * as ImagePicker from 'expo-image-picker';
  import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
  } from 'react-native';
  import { SafeAreaView } from 'react-native-safe-area-context';
  import { Ionicons } from '@expo/vector-icons';
  import { COLORS } from '../constants/Colors';
  import { FONTS } from '../constants/Fonts';
  import { api } from '../services/api';
  import { useStore } from '../store/useStore';
  import { useT } from '../i18n';

  type Phase = 'picking' | 'loading' | 'result';

  export default function ScannerScreen() {
    const router = useRouter();
    const t = useT();
    const s = t.scanner;
    const { token, aiScansUsed, aiPlan, setAiData } = useStore();
    const [phase, setPhase] = useState<Phase>('picking');
    const [photo, setPhoto] = useState<string | null>(null);
    const [recipe, setRecipe] = useState<any | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => { pickImage(); }, []);

    const analyzePhoto = async (dataUrl: string) => {
      if (!token) {
        Alert.alert(t.common.error, s.loginRequired);
        router.back();
        return;
      }
      setPhoto(dataUrl);
      setPhase('loading');
      try {
        const data = await api.scanRecipe(token, dataUrl);
        setRecipe(data.recipe);
        setAiData(data.scansUsed, data.aiPlan);
        setPhase('result');
      } catch (err: any) {
        const msg = err.message ?? '';
        if (msg.includes('Limite') || msg.includes('403')) {
          Alert.alert(s.quotaTitle, s.quotaMsg, [{ text: t.common.ok, onPress: () => router.back() }]);
        } else {
          Alert.alert(t.common.error, s.analyzeError);
          router.back();
        }
      }
    };

    const pickImage = async () => {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e: any) => {
          const file = e.target.files?.[0];
          if (!file) { router.back(); return; }
          const reader = new FileReader();
          reader.onload = (ev) => analyzePhoto(ev.target?.result as string);
          reader.readAsDataURL(file);
        };
        input.click();
        return;
      }
      Alert.alert(s.photoTitle, s.photoQuestion, [
        {
          text: s.camera,
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert(s.permissionTitle, s.permissionCamera);
              router.back();
              return;
            }
            const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.75, base64: true });
            if (result.canceled) { router.back(); return; }
            analyzePhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
          },
        },
        {
          text: s.gallery,
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              quality: 0.75,
              base64: true,
            });
            if (result.canceled) { router.back(); return; }
            analyzePhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
          },
        },
        { text: t.common.cancel, style: 'cancel', onPress: () => router.back() },
      ]);
    };

    const handleSaveWantToCook = async () => {
      if (!token || !recipe) return;
      setSaving(true);
      try {
        await api.saveScanRecipe(token, {
          image: photo,
          title: recipe.title,
          ingredients: recipe.ingredients ?? [],
          steps: recipe.steps ?? [],
          prep_time: recipe.prep_time ?? 0,
          cook_time: recipe.cook_time ?? 0,
          servings: recipe.servings ?? 2,
          difficulty: recipe.difficulty ?? 'Fácil',
          cuisine: recipe.cuisine ?? 'Internacional',
        });
        Alert.alert(s.savedTitle, s.savedMsg, [{ text: t.common.ok, onPress: () => router.back() }]);
      } catch (err: any) {
        Alert.alert(t.common.error, err.message);
      } finally {
        setSaving(false);
      }
    };

    const handlePublishNow = () => {
      if (!recipe) return;
      router.push({ pathname: '/(tabs)/add', params: { scanData: JSON.stringify(recipe) } } as any);
    };

    const limit = aiPlan === 'pro' ? 30 : 3;

    if (phase === 'loading') {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>{s.analyzing}</Text>
          </View>
        </SafeAreaView>
      );
    }

    if (phase === 'result' && recipe) {
      const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={COLORS.text1} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{s.resultTitle}</Text>
            <Text style={styles.quota}>{s.scansLeft(aiScansUsed, limit)}</Text>
          </View>

          <ScrollView contentContainerStyle={styles.resultContent} showsVerticalScrollIndicator={false}>
            {photo && (
              <View style={styles.previewWrap}>
                <Image source={{ uri: photo }} style={styles.previewImage} resizeMode="cover" />
              </View>
            )}
            <View style={styles.card}>
              <Text style={styles.recipeTitle}>{recipe.title}</Text>
              <View style={styles.metaRow}>
                {totalTime > 0 && (
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={13} color={COLORS.text2} />
                    <Text style={styles.metaText}>{totalTime} min</Text>
                  </View>
                )}
                {recipe.servings > 0 && (
                  <View style={styles.metaItem}>
                    <Ionicons name="people-outline" size={13} color={COLORS.text2} />
                    <Text style={styles.metaText}>{recipe.servings}</Text>
                  </View>
                )}
                {recipe.difficulty && (
                  <View style={styles.metaItem}>
                    <Text style={styles.metaText}>{recipe.difficulty}</Text>
                  </View>
                )}
              </View>

              {recipe.ingredients?.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>{s.ingredients}</Text>
                  {recipe.ingredients.map((ing: any, i: number) => (
                    <Text key={i} style={styles.listItem}>
                      • {ing.amount ? `${ing.amount} ${ing.unit} ` : ''}{ing.name}
                    </Text>
                  ))}
                </>
              )}

              {recipe.steps?.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>{s.steps}</Text>
                  {recipe.steps.map((step: string, i: number) => (
                    <Text key={i} style={styles.listItem}>{i + 1}. {step}</Text>
                  ))}
                </>
              )}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.btnStar]} onPress={handleSaveWantToCook} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.btnText}>⭐ {s.wantToCook}</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnPublish]} onPress={handlePublishNow}>
              <Text style={styles.btnText}>🚀 {s.publishNow}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    // Phase 'picking' — show spinner while Alert is shown
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
    loadingText: { fontSize: 16, color: COLORS.text2, fontFamily: FONTS.body },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      gap: 10,
    },
    closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: COLORS.text1, fontFamily: FONTS.titleBold },
    quota: { fontSize: 12, color: COLORS.text3, fontFamily: FONTS.body },

    resultContent: { padding: 16, gap: 12, paddingBottom: 32 },
    previewWrap: { borderRadius: 16, overflow: 'hidden', aspectRatio: 4 / 3 },
    previewImage: { width: '100%', height: '100%' },

    card: {
      backgroundColor: COLORS.surface1,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 16,
      gap: 8,
    },
    recipeTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text1, fontFamily: FONTS.titleBlack, lineHeight: 26 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    metaItem: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
      borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4,
    },
    metaText: { fontSize: 12, color: COLORS.text2, fontFamily: FONTS.body, fontWeight: '600' },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text1, fontFamily: FONTS.bodyBold, marginTop: 8 },
    listItem: { fontSize: 13, color: COLORS.text2, fontFamily: FONTS.body, lineHeight: 20 },

    actions: {
      flexDirection: 'row',
      gap: 10,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
    },
    btn: {
      flex: 1, paddingVertical: 14, borderRadius: 14,
      alignItems: 'center', justifyContent: 'center',
    },
    btnStar: { backgroundColor: COLORS.star },
    btnPublish: { backgroundColor: COLORS.primary },
    btnText: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: FONTS.bodyBold },
  });
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  Run: `npx tsc --noEmit`

  Expected: no errors in `app/scanner.tsx`.

- [ ] **Step 3: Test on device/web**

  Run: `npx expo start --web`

  Navigate to the screen via browser console: `window.location.href = '/scanner'`

  Expected: file picker opens, photo selected, loading spinner shown, then result screen appears.

- [ ] **Step 4: Commit**

  ```bash
  git add app/scanner.tsx
  git commit -m "feat: add scanner.tsx screen (camera/gallery → AI analysis → result)"
  ```

---

## Task 9: Frontend — Feed (index.tsx): swipe + 📷 header button

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Import PanResponder and useRef**

  In `app/(tabs)/index.tsx`, the `React` import already has `useState, useEffect, useCallback`. Add `useRef` to that import and add `PanResponder` to the `react-native` import:

  ```ts
  import React, { useState, useEffect, useCallback, useRef } from 'react';
  import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    PanResponder,
    RefreshControl,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
  } from 'react-native';
  ```

- [ ] **Step 2: Add the PanResponder inside FeedScreen**

  Inside the `FeedScreen` component, after the state declarations, add:

  ```ts
  const swipeResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > 20 && Math.abs(dx) > Math.abs(dy) * 1.5,
      onPanResponderRelease: (_, { dx }) => {
        if (dx > 60) router.push('/scanner');
      },
    })
  ).current;
  ```

- [ ] **Step 3: Wrap the main content with the swipe responder**

  In the return JSX, wrap the `{loading ? ... : filtered.length === 0 ? ... : <FlatList .../>}` block in a `<View>` with the pan handlers. Replace:

  ```tsx
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        ...
      </View>

      {loading ? (
        ...
      ) : filtered.length === 0 ? (
        ...
      ) : (
        <FlatList ... />
      )}

      {/* Modal menu */}
      <Modal ...>
        ...
      </Modal>
    </SafeAreaView>
  );
  ```

  With:

  ```tsx
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        ...
      </View>

      <View style={{ flex: 1 }} {...swipeResponder.panHandlers}>
        {loading ? (
          ...
        ) : filtered.length === 0 ? (
          ...
        ) : (
          <FlatList ... />
        )}
      </View>

      {/* Modal menu */}
      <Modal ...>
        ...
      </Modal>
    </SafeAreaView>
  );
  ```

- [ ] **Step 4: Add 📷 camera button to the header**

  In the header `<View style={styles.header}>`, after `<View style={{ flex: 1 }} />` and before the trophy button, add:

  ```tsx
  <TouchableOpacity style={styles.notifBtn} onPress={() => router.push('/scanner')}>
    <Ionicons name="camera-outline" size={22} color={COLORS.text2} />
  </TouchableOpacity>
  ```

- [ ] **Step 5: Verify TypeScript compiles**

  Run: `npx tsc --noEmit`

  Expected: no errors.

- [ ] **Step 6: Test**

  Run app and verify:
  - Camera button visible in header; tapping navigates to `/scanner`
  - Swiping right on the feed (not vertically) also navigates to `/scanner`
  - Vertical scrolling still works normally

- [ ] **Step 7: Commit**

  ```bash
  git add app/(tabs)/index.tsx
  git commit -m "feat: add swipe-right gesture and camera button to feed header → scanner"
  ```

---

## Task 10: Frontend — add.tsx: "Analisar com IA ✨" button + scanData param

**Files:**
- Modify: `app/(tabs)/add.tsx`

- [ ] **Step 1: Import useLocalSearchParams and add analyzingAI state**

  In `app/(tabs)/add.tsx`, add to the existing `expo-router` import:

  ```ts
  import { useRouter, useLocalSearchParams } from 'expo-router';
  ```

  Inside `AddScreen()`, after the existing state declarations, add:

  ```ts
  const params = useLocalSearchParams();
  const [analyzingAI, setAnalyzingAI] = useState(false);
  ```

- [ ] **Step 2: Read scanData param on mount**

  After the state declarations, add a `useEffect`:

  ```ts
  useEffect(() => {
    if (!params.scanData) return;
    try {
      const r = JSON.parse(params.scanData as string);
      if (r.title) setTitle(r.title);
      if (r.cuisine) setCuisine(r.cuisine);
      if (r.difficulty && ['Fácil', 'Médio', 'Difícil'].includes(r.difficulty)) setDifficulty(r.difficulty);
      if (r.prep_time) setPrepTime(String(r.prep_time));
      if (r.cook_time) setCookTime(String(r.cook_time));
      if (r.servings) setServings(String(r.servings));
      if (Array.isArray(r.ingredients) && r.ingredients.length > 0) {
        setIngredients(r.ingredients.map((ing: any) => ({
          name: ing.name ?? '',
          amount: ing.amount ?? '',
          unit: ing.unit ?? 'g',
          canonical: '',
          category: 'Outros',
        })));
      }
      if (Array.isArray(r.steps) && r.steps.length > 0) {
        setSteps(r.steps.map((s: any) => String(s)));
      }
    } catch {}
  }, []);
  ```

- [ ] **Step 3: Add the handleAnalyzeWithAI function**

  After the `useEffect` above, add:

  ```ts
  const handleAnalyzeWithAI = async () => {
    if (!photo || !token) return;
    setAnalyzingAI(true);
    try {
      const data = await api.scanRecipe(token, photo);
      const r = data.recipe;
      if (r.title) setTitle(r.title);
      if (r.cuisine) setCuisine(r.cuisine);
      if (r.difficulty && ['Fácil', 'Médio', 'Difícil'].includes(r.difficulty)) setDifficulty(r.difficulty);
      if (r.prep_time) setPrepTime(String(r.prep_time));
      if (r.cook_time) setCookTime(String(r.cook_time));
      if (r.servings) setServings(String(r.servings));
      if (Array.isArray(r.ingredients) && r.ingredients.length > 0) {
        setIngredients(r.ingredients.map((ing: any) => ({
          name: ing.name ?? '',
          amount: ing.amount ?? '',
          unit: ing.unit ?? 'g',
          canonical: '',
          category: 'Outros',
        })));
      }
      if (Array.isArray(r.steps) && r.steps.length > 0) {
        setSteps(r.steps.map((s: any) => String(s)));
      }
    } catch (err: any) {
      const msg = err.message ?? '';
      if (msg.includes('Limite') || msg.includes('403')) {
        Alert.alert(t.scanner.quotaTitle, t.scanner.quotaMsg);
      } else {
        Alert.alert(t.common.error, t.scanner.analyzeError);
      }
    } finally {
      setAnalyzingAI(false);
    }
  };
  ```

- [ ] **Step 4: Render the AI button after photo is picked**

  In the JSX, find where the picked photo is shown (the `photo &&` block with the `<Image>` showing the selected photo). Right after the photo preview `<View>`, add the AI analyze button:

  ```tsx
  {photo && (
    <TouchableOpacity
      style={styles.aiBtn}
      onPress={handleAnalyzeWithAI}
      disabled={analyzingAI}
    >
      {analyzingAI
        ? <ActivityIndicator size="small" color="#fff" />
        : <Text style={styles.aiBtnText}>{t.scanner.analyzeBtn}</Text>
      }
    </TouchableOpacity>
  )}
  ```

- [ ] **Step 5: Add aiBtn styles to the StyleSheet**

  In the `StyleSheet.create({...})` at the bottom of add.tsx, add:

  ```ts
  aiBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  aiBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: FONTS.bodyBold,
  },
  ```

- [ ] **Step 6: Verify TypeScript compiles**

  Run: `npx tsc --noEmit`

  Expected: no errors.

- [ ] **Step 7: Test**

  Run app, go to Add screen, pick a photo. Verify:
  - "Analisar com IA ✨" button appears below the photo preview
  - Tapping it shows loading, then fills in the form fields
  - Navigating from scanner → "Publicar agora" pre-fills the form

- [ ] **Step 8: Commit**

  ```bash
  git add app/(tabs)/add.tsx
  git commit -m "feat: add AI analyse button and scanData param support to add.tsx"
  ```

---

## Task 11: Frontend — profile.tsx: "Quero Cozinhar" tab

**Files:**
- Modify: `app/(tabs)/profile.tsx`

- [ ] **Step 1: Add scan recipes state**

  Inside `ProfileScreen()`, after the existing state declarations, add:

  ```ts
  const [scanRecipes, setScanRecipes] = useState<any[]>([]);
  const [loadingScan, setLoadingScan] = useState(false);
  ```

- [ ] **Step 2: Add the 4th tab to the TABS array**

  Find the `TABS` constant at the top of profile.tsx:

  ```ts
  const TABS = [
    { key: 'recipes', icon: 'chef-hat', lib: 'mci' },
    { key: 'saved', icon: 'bookmark-outline', lib: 'ion' },
    { key: 'cooked', icon: 'pot-steam-outline', lib: 'mci' },
  ];
  ```

  Replace it with:

  ```ts
  const TABS = [
    { key: 'recipes', icon: 'chef-hat', lib: 'mci' },
    { key: 'saved', icon: 'bookmark-outline', lib: 'ion' },
    { key: 'wantcook', icon: 'star-outline', lib: 'ion' },
    { key: 'cooked', icon: 'pot-steam-outline', lib: 'mci' },
  ];
  ```

- [ ] **Step 3: Fetch scan recipes when wantcook tab is active**

  Find the `useEffect` or `useFocusEffect` that calls `loadData`. After it, add a new effect:

  ```ts
  useEffect(() => {
    if (activeTab !== 'wantcook' || !token) return;
    setLoadingScan(true);
    api.getScanRecipes(token)
      .then(setScanRecipes)
      .catch(() => {})
      .finally(() => setLoadingScan(false));
  }, [activeTab, token]);
  ```

- [ ] **Step 4: Add the delete scan recipe handler**

  After the scan recipes fetch effect, add:

  ```ts
  const handleDeleteScanRecipe = (id: number) => {
    if (!token) return;
    Alert.alert(t.common.delete, '?', [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteScanRecipe(token, id);
            setScanRecipes((prev) => prev.filter((r) => r.id !== id));
          } catch {}
        },
      },
    ]);
  };
  ```

- [ ] **Step 5: Add tab label rendering for wantcook**

  Find where tabs are rendered (the horizontal tab bar). Each tab renders an icon and label. The label for `wantcook` tab should say `p.wantToCook`. Find the label rendering logic (likely a map over TABS) and ensure the wantcook key is handled — if labels are derived from a translation key matching the tab key, add:

  In the tab bar labels section (the `t.profile` object has `myRecipes`, `saved`, `cooked` as keys), add a label for `wantcook`. In the JSX where the tab label is rendered, check for `tab.key === 'wantcook'` and use `p.wantToCook`.

  Typical pattern (find the tab bar mapping and ensure `wantcook` resolves a label):

  ```tsx
  // In the tab label rendering, inside a .map() over TABS:
  const tabLabel = tab.key === 'recipes' ? p.myRecipes
    : tab.key === 'saved' ? p.saved
    : tab.key === 'cooked' ? p.cooked
    : p.wantToCook;
  ```

- [ ] **Step 6: Render the "Quero Cozinhar" tab content**

  Find where the tab content is rendered (the section that switches on `activeTab`). Add a new case for `wantcook`, alongside the existing `recipes`, `saved`, and `cooked` cases.

  Example pattern — find the existing `activeTab === 'recipes'` condition and add a new `|| activeTab === 'wantcook'` block or add it as a separate branch:

  ```tsx
  {activeTab === 'wantcook' && (
    <View style={styles.tabContent}>
      {loadingScan ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : scanRecipes.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="star-outline" size={40} color={COLORS.primary} />
          <Text style={styles.emptyTitle}>{p.wantToCookEmpty}</Text>
          <Text style={styles.emptyText}>{p.wantToCookEmptySub}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 32 }}>
          {scanRecipes.map((scanR) => {
            const totalTime = (scanR.prep_time ?? 0) + (scanR.cook_time ?? 0);
            return (
              <View key={scanR.id} style={styles.scanCard}>
                {scanR.image && (
                  <Image source={{ uri: scanR.image }} style={styles.scanCardImage} resizeMode="cover" />
                )}
                <View style={styles.scanCardBody}>
                  <Text style={styles.scanCardTitle} numberOfLines={2}>{scanR.title}</Text>
                  <View style={styles.scanCardMeta}>
                    {totalTime > 0 && (
                      <View style={styles.metaChip}>
                        <Ionicons name="time-outline" size={12} color={COLORS.text3} />
                        <Text style={styles.metaChipText}>{totalTime} min</Text>
                      </View>
                    )}
                    {scanR.difficulty && (
                      <View style={styles.metaChip}>
                        <Text style={styles.metaChipText}>{scanR.difficulty}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.scanCardActions}>
                    <TouchableOpacity
                      style={styles.publishBtn}
                      onPress={() => router.push({ pathname: '/(tabs)/add', params: { scanData: JSON.stringify({ title: scanR.title, ingredients: scanR.ingredients, steps: scanR.steps, prep_time: scanR.prep_time, cook_time: scanR.cook_time, servings: scanR.servings, difficulty: scanR.difficulty, cuisine: scanR.cuisine }) } } as any)}
                    >
                      <Text style={styles.publishBtnText}>{p.publishWithPhoto}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteScanRecipe(scanR.id)} style={styles.deleteBtn}>
                      <Ionicons name="trash-outline" size={18} color={COLORS.text3} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  )}
  ```

- [ ] **Step 7: Add scan card styles to StyleSheet**

  In the `StyleSheet.create({...})` at the bottom of profile.tsx, add:

  ```ts
  scanCard: {
    backgroundColor: COLORS.surface1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  scanCardImage: {
    width: '100%',
    height: 160,
  },
  scanCardBody: {
    padding: 12,
    gap: 8,
  },
  scanCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text1,
    fontFamily: FONTS.titleBold,
    lineHeight: 22,
  },
  scanCardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  metaChipText: {
    fontSize: 11,
    color: COLORS.text2,
    fontFamily: FONTS.body,
    fontWeight: '600',
  },
  scanCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  publishBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  publishBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: FONTS.bodyBold,
  },
  deleteBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ```

- [ ] **Step 8: Verify TypeScript compiles**

  Run: `npx tsc --noEmit`

  Expected: no errors.

- [ ] **Step 9: Test**

  Run app, go to Profile. Verify:
  - 4 tabs visible (My Recipes, Saved, Want to Cook, Cooked)
  - "Quero Cozinhar" tab shows empty state with scanner prompt
  - After saving a scan from scanner, it appears in this tab
  - "Publicar com a tua foto 📸" navigates to add.tsx with pre-filled fields

- [ ] **Step 10: Commit**

  ```bash
  git add app/(tabs)/profile.tsx
  git commit -m "feat: add Quero Cozinhar tab to profile with scan recipe cards"
  ```

---

## Spec Coverage Self-Review

| Spec requirement | Task |
|-----------------|------|
| Claude Vision analyses photo | Task 3 — `/api/ai/scan` calls `anthropic.messages.create` with image |
| Free: 3/month, Pro: 30/month | Task 3 — quota check with `limit = plan === 'pro' ? 30 : 3` |
| Monthly reset of quota | Task 3 — `daysDiff >= 30` reset logic |
| Quota counter visible | Task 8 — `s.scansLeft(aiScansUsed, limit)` in scanner result header |
| 403 on quota exceeded | Task 3 — `return res.status(403).json(...)` |
| Entry 1: swipe + header button | Task 9 — PanResponder + camera icon button |
| Entry 2: AI button in add.tsx | Task 10 — `handleAnalyzeWithAI` + "Analisar com IA ✨" button |
| Scanner screen: camera → loading → result | Task 8 — three phases: picking, loading, result |
| "Quero Cozinhar" saves to scan_recipes | Tasks 1, 4, 8 — table + POST endpoint + scanner save button |
| "Publicar agora" → add.tsx pre-filled | Tasks 8, 10 — `router.push({params:{scanData}})` + `useLocalSearchParams` |
| Profile tab "Quero Cozinhar" | Task 11 — 4th tab with scan recipe cards |
| "Publicar com a tua foto" | Task 11 — button navigates to add.tsx with scanData (no photo) |
| Delete from "Quero Cozinhar" | Tasks 4, 11 — DELETE endpoint + trash icon in card |
| JSON structured output from Claude | Task 3 — `SCAN_PROMPT` defines exact JSON schema |
| PT unit/difficulty canonical values | Task 3 — prompt enumerates `g, kg, ml...` and `Fácil/Médio/Difícil` |
