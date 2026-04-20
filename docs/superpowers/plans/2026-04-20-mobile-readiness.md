# CookIt — Plano: App Pronta para Telemóvel (iOS & Android)

> **Estado atual:** A app corre no browser (web). No telemóvel nativo, o utilizador perde o login, receitas guardadas, lista de compras e tudo o resto cada vez que fecha a app. Isto está completamente partido para uso real em iOS/Android.

---

## Problemas identificados (por prioridade)

| # | Problema | Impacto |
|---|---------|---------|
| 1 | Persistência só funciona na web (`localStorage`) | **Crítico** — login e dados perdidos ao fechar a app em iOS/Android |
| 2 | URL da API hardcoded para `localhost` | **Crítico** — a app não liga ao backend num telemóvel real |
| 3 | Sem configuração EAS Build | **Alto** — sem isto não dá para gerar APK/IPA para instalar |
| 4 | `app.json` sem bundle identifier (iOS) nem package (Android) | **Alto** — necessário para publicar nas lojas |

---

## Ficheiros a tocar

| Ficheiro | Ação | Porquê |
|----------|------|--------|
| `app/_layout.tsx` | Modificar | Substituir `localStorage` por `AsyncStorage` (funciona em web + nativo) |
| `services/api.ts` | Modificar | URL da API via variável de ambiente |
| `app.json` | Modificar | Adicionar `bundleIdentifier` (iOS) e `package` (Android) |
| `eas.json` | Criar | Configuração do EAS Build para gerar APKs/IPAs |

---

## Task 1 — Persistência nativa com AsyncStorage

**O problema:** O `StoreHydrator` em `app/_layout.tsx` tem `if (Platform.OS !== 'web') return;` nas 3 linhas 73, 122, e 144. Em iOS/Android não persiste absolutamente nada.

**A solução:** `@react-native-async-storage/async-storage` já está instalado. Funciona em web (usa localStorage internamente) e em nativo (usa AsyncStorage nativo). Basta usá-lo em vez do `localStorage` direto, e remover os guards `Platform.OS !== 'web'`.

**Ficheiro:** `app/_layout.tsx`

- [ ] **Passo 1: Adicionar o import do AsyncStorage**

No topo de `app/_layout.tsx`, adicionar:
```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
```

- [ ] **Passo 2: Substituir as funções `webGet`, `webSet`, `webRemove` por versões async com AsyncStorage**

Apagar as 3 funções `webGet`, `webSet`, `webRemove` e substituir por:
```ts
async function storageGet(key: string): Promise<any | null> {
  try {
    const str = await AsyncStorage.getItem(key);
    return str ? JSON.parse(str) : null;
  } catch { return null; }
}

async function storageSet(key: string, value: any) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

async function storageRemove(key: string) {
  try {
    await AsyncStorage.removeItem(key);
  } catch {}
}
```

- [ ] **Passo 3: Reescrever o StoreHydrator**

Substituir toda a função `StoreHydrator` pelo seguinte (substitui as 3 `useEffect` por uma única versão async que funciona em web e nativo):

```ts
function StoreHydrator() {
  const store = useStore();
  const hydrated = useRef(false);
  const prevUserIdRef = useRef<number | null>(null);

  // Mount: carregar auth guardado
  useEffect(() => {
    async function load() {
      let auth = await storageGet(AUTH_KEY);

      // Migrar formato antigo se necessário
      if (!auth) {
        const old = await storageGet('cookit-store');
        if (old?.token && old?.user) {
          auth = { token: old.token, user: old.user };
          await storageSet(AUTH_KEY, auth);
          await storageSet(userDataKey(old.user.id), {
            cookedRecipes: old.cookedRecipes ?? [],
            cookedLogs: old.cookedLogs ?? [],
            savedRecipes: old.savedRecipes ?? [],
            shoppingList: old.shoppingList ?? [],
            userRatings: old.userRatings ?? {},
            notifications: old.notifications ?? [],
            earnedBadgeIds: old.earnedBadgeIds ?? [],
            pinnedBadgeIds: old.pinnedBadgeIds ?? [],
          });
          await storageRemove('cookit-store');
        }
      }

      if (!auth?.token || !auth?.user) return;
      store.setAuth(auth.user, auth.token);

      const userData = await storageGet(userDataKey(auth.user.id));
      if (userData) {
        useStore.setState({
          cookedRecipes: userData.cookedRecipes ?? [],
          cookedLogs: userData.cookedLogs ?? [],
          savedRecipes: userData.savedRecipes ?? [],
          shoppingList: userData.shoppingList ?? [],
          userRatings: userData.userRatings ?? {},
          notifications: userData.notifications ?? [],
          earnedBadgeIds: userData.earnedBadgeIds ?? [],
          pinnedBadgeIds: userData.pinnedBadgeIds ?? [],
        });
      }
      hydrated.current = true;
    }
    load();
  }, []);

  const { token, user, cookedRecipes, cookedLogs, savedRecipes, shoppingList, userRatings, notifications, earnedBadgeIds, pinnedBadgeIds } = store;

  // Quando user muda (login manual): carregar dados desse user
  useEffect(() => {
    if (!user?.id) { prevUserIdRef.current = null; return; }
    if (user.id === prevUserIdRef.current) return;
    prevUserIdRef.current = user.id;

    async function loadUser() {
      const userData = await storageGet(userDataKey(user!.id));
      if (userData) {
        useStore.setState({
          cookedRecipes: userData.cookedRecipes ?? [],
          cookedLogs: userData.cookedLogs ?? [],
          savedRecipes: userData.savedRecipes ?? [],
          shoppingList: userData.shoppingList ?? [],
          userRatings: userData.userRatings ?? {},
          notifications: userData.notifications ?? [],
          earnedBadgeIds: userData.earnedBadgeIds ?? [],
          pinnedBadgeIds: userData.pinnedBadgeIds ?? [],
        });
      }
      hydrated.current = true;
    }
    loadUser();
  }, [user?.id]);

  // Persistir estado sempre que muda
  useEffect(() => {
    if (!hydrated.current && token === null) return;
    if (token && user) {
      storageSet(AUTH_KEY, { token, user });
      storageSet(userDataKey(user.id), { cookedRecipes, cookedLogs, savedRecipes, shoppingList, userRatings, notifications, earnedBadgeIds, pinnedBadgeIds });
    } else {
      storageRemove(AUTH_KEY);
    }
  }, [token, user, cookedRecipes, cookedLogs, savedRecipes, shoppingList, userRatings, notifications, earnedBadgeIds, pinnedBadgeIds]);

  return null;
}
```

- [ ] **Passo 4: Remover o bloco `if (Platform.OS === 'web')` no RootLayout**

No `RootLayout`, o bloco com `webPhone` e `webOuter` só deve afetar a apresentação visual, não a lógica de persistência. Verificar que já não há referências a `Platform.OS` relacionadas com storage (a lógica de styles web vs native pode manter-se).

- [ ] **Passo 5: Testar na web**

```bash
npx expo start --web
```
- Fazer login
- Guardar uma receita
- Fechar o tab e reabrir → dados devem continuar
- Fazer logout e login de novo → dados devem voltar

- [ ] **Passo 6: Testar no telemóvel com Expo Go**

Instalar a app **Expo Go** no telemóvel (iOS App Store / Google Play).

**Atenção:** O telemóvel e o computador têm de estar na mesma rede Wi-Fi.

```bash
npx expo start
```

Fazer scan do QR code com a câmera (iOS) ou com o Expo Go (Android).

- Fazer login
- Guardar uma receita
- Fechar a app completamente e reabrir → dados devem continuar ✓

- [ ] **Passo 7: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: substituir localStorage por AsyncStorage para persistência nativa"
```

---

## Task 2 — URL da API configurável

**O problema:** `services/api.ts` linha 1: `const BASE_URL = 'http://localhost:3001/api';`

Num telemóvel real, `localhost` não aponta para o teu computador — aponta para o próprio telemóvel. Portanto a app nunca consegue ligar ao backend.

**Solução temporária (testes locais):** usar o IP da tua máquina na rede local (ex: `192.168.1.x`).
**Solução definitiva (produção):** usar o URL do Railway (ver plano de deploy).

**Ficheiro:** `services/api.ts`

- [ ] **Passo 1: Criar ficheiro de config**

Criar `config.ts` na raiz do projeto:
```ts
import Constants from 'expo-constants';

// Em desenvolvimento usa o IP local ou localhost
// Em produção usa a variável de ambiente
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  `http://${Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost'}:3001/api`;
```

> **Nota:** `Constants.expoConfig?.hostUri` contém o IP do computador quando corres `npx expo start`. Isto resolve automaticamente o problema do `localhost` no telemóvel durante desenvolvimento.

- [ ] **Passo 2: Atualizar services/api.ts**

Substituir a linha 1:
```ts
// Antes:
const BASE_URL = 'http://localhost:3001/api';

// Depois:
import { API_URL } from '../config';
const BASE_URL = API_URL;
```

- [ ] **Passo 3: Instalar expo-constants se não estiver instalado**

```bash
npx expo install expo-constants
```
(Provavelmente já está — verificar em package.json antes de correr.)

- [ ] **Passo 4: Testar com Expo Go no telemóvel**

Com o backend a correr no computador (`cd backend && npm start`), abrir a app pelo Expo Go. As chamadas à API devem funcionar automaticamente — o `hostUri` aponta para o IP correto.

- [ ] **Passo 5: Commit**

```bash
git add config.ts services/api.ts package.json package-lock.json
git commit -m "feat: URL da API dinâmica — funciona em localhost e em telemóvel real"
```

---

## Task 3 — Configurar EAS Build (gerar APK / IPA)

**O que é:** EAS (Expo Application Services) é o sistema oficial da Expo para fazer build de apps nativas. Gera um ficheiro `.apk` (Android) ou `.ipa` (iOS) que podes instalar num telemóvel ou submeter às lojas.

**Ficheiros:**
- Modificar: `app.json`
- Criar: `eas.json`

- [ ] **Passo 1: Criar conta Expo**

Ir a https://expo.dev e criar conta (gratuito).

- [ ] **Passo 2: Instalar EAS CLI**

```bash
npm install -g eas-cli
```

- [ ] **Passo 3: Login na conta Expo**

```bash
eas login
```
Introduzir o email e password da conta Expo.

- [ ] **Passo 4: Adicionar bundle identifier e package ao app.json**

Abrir `app.json` e adicionar dentro de `"ios"` e `"android"`:

```json
{
  "expo": {
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.jmgpc.cookit"
    },
    "android": {
      "package": "com.jmgpc.cookit",
      "adaptiveIcon": { ... }
    }
  }
}
```

> O `bundleIdentifier` / `package` tem de ser único nas lojas. O formato `com.seunome.cookit` é a convenção.

- [ ] **Passo 5: Inicializar EAS no projeto**

```bash
eas init
```
Responder às perguntas: associar ao teu projeto Expo.

- [ ] **Passo 6: Criar eas.json**

Criar `eas.json` na raiz do projeto:
```json
{
  "cli": {
    "version": ">= 16.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

> O perfil `preview` gera um APK para Android que podes instalar diretamente sem ir à loja.

- [ ] **Passo 7: Fazer o primeiro build para Android (APK)**

```bash
eas build --profile preview --platform android
```

Isto demora ~10-15 minutos (corre nos servidores da Expo). No fim dá um link para descarregar o APK.

- [ ] **Passo 8: Instalar o APK no telemóvel**

Enviar o ficheiro `.apk` para o telemóvel (por email, Google Drive, etc.) e instalar.

> Em Android é preciso ativar "Instalar apps de fontes desconhecidas" nas definições.

- [ ] **Passo 9: Commit**

```bash
git add app.json eas.json
git commit -m "chore: configurar EAS Build para iOS e Android"
```

---

## Task 4 — Testar tudo junto (checklist final)

Antes de considerar a app pronta para mobile, verificar:

- [ ] Abrir a app no Expo Go → fazer login → dados persistem ao fechar e reabrir
- [ ] Fazer logout → fazer login → receitas guardadas e cozinhadas voltam
- [ ] Guardar uma receita → fechar app → reabrir → receita ainda está guardada
- [ ] Criar uma receita → aparece no feed
- [ ] Instalar o APK no Android → testar o mesmo fluxo acima
- [ ] A URL da API não é localhost hardcoded — verificar nos logs de rede

---

## Ordem recomendada

```
Task 1  →  Task 2  →  Testar com Expo Go  →  Task 3  →  Testar APK
```

Não é preciso fazer a Task 3 (EAS Build) para testar no telemóvel — o Expo Go chega para desenvolvimento. O EAS Build só é necessário para distribuição final (lojas ou APK para partilhar).

---

## Nota sobre o backend em produção

Para a app funcionar num APK instalado num telemóvel real (fora da rede Wi-Fi local), o backend tem de estar online. Ver plano `2026-04-20-deploy-online.md` para colocar o backend no Railway antes de lançar o APK final.

O fluxo completo para lançamento:
1. Fazer deploy do backend no Railway (plano de deploy)
2. Adicionar `EXPO_PUBLIC_API_URL=https://teu-backend.railway.app/api` ao `.env`
3. Fazer `eas build --profile production --platform android` com a variável de ambiente definida
