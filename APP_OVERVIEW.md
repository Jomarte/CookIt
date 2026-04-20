# CookIt — Visão Geral da Aplicação

**Plataforma de partilha e descoberta de receitas culinarias com funcionalidades sociais, gamificação e histórico de cozinha.**

---

## Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React Native + Expo (TypeScript) |
| Navegação | Expo Router (file-based, dynamic routes) |
| Estado Global | Zustand |
| Persistência Local | AsyncStorage |
| Backend | Node.js + Express.js |
| Base de Dados | SQLite via sql.js (ficheiro `cookit.db`) |
| Autenticação | JWT Bearer Token (30 dias TTL) |
| Ícones | Ionicons + MaterialCommunityIcons |
| Fontes | PlayfairDisplay + Lato (via Expo Google Fonts) |

---

## Paleta de Cores

### Cor Principal — Terracota

| Token | Hex / Valor | Uso |
|-------|-------------|-----|
| `primary` | `#C2622D` | Botões, ícones, destaques |
| `primaryDim` | `rgba(194,98,45,0.08)` | Fundos leves |
| `primaryGlow` | `rgba(194,98,45,0.30)` | Sombras, brilhos |
| `accent` | `#D4A853` | Highlights, dificuldade Médio |
| `accentDim` | `rgba(212,168,83,0.10)` | Fundo accent |

### Fundos

| Token | Hex | Uso |
|-------|-----|-----|
| `bg` | `#FBF5EF` | Fundo principal da app |
| `surface1` | `#FFFFFF` | Cards, modals |
| `surface2` | `#F5EDE3` | Surface secundária |
| `surface3` | `#EDE0D0` | Surface terciária |

### Texto

| Token | Hex | Uso |
|-------|-----|-----|
| `text1` | `#1A1A1A` | Texto principal |
| `text2` | `#555555` | Texto secundário |
| `text3` | `#999999` | Texto desativado / placeholder |
| `white` | `#FFFFFF` | Contraste em fundos escuros |

### UI

| Token | Hex / Valor | Uso |
|-------|-------------|-----|
| `border` | `rgba(0,0,0,0.08)` | Divisores, contornos |
| `borderActive` | `rgba(194,98,45,0.35)` | Contornos ativos |
| `star` | `#D97706` | Estrelas de rating |
| `green` | `#16A34A` | Sucesso, dificuldade Fácil |
| `greenDim` | `rgba(22,163,74,0.10)` | Fundo verde |

---

## Tipografia

| Token | Fonte | Peso | Uso |
|-------|-------|------|-----|
| `titleBold` | PlayfairDisplay_700Bold | 700 | Títulos principais |
| `titleBoldItalic` | PlayfairDisplay_700Bold_Italic | 700 | Títulos em itálico |
| `titleBlack` | PlayfairDisplay_900Black | 900 | Títulos de maior destaque |
| `body` | Lato_400Regular | 400 | Texto de corpo |
| `bodyBold` | Lato_700Bold | 700 | Texto de corpo em destaque |

---

## Estrutura de Ficheiros

```
CookIt/
├── app/
│   ├── _layout.tsx                  # Root layout: fonts, auth hydration, Stack navigator
│   ├── index.tsx                    # Splash screen → redireciona para login ou feed
│   ├── (tabs)/
│   │   ├── _layout.tsx              # Tab bar com 5 abas + FAB central
│   │   ├── index.tsx                # Feed principal
│   │   ├── discover.tsx             # Descoberta com filtros
│   │   ├── add.tsx                  # Criar nova receita
│   │   ├── shopping.tsx             # Lista de compras
│   │   ├── profile.tsx              # Perfil do utilizador
│   │   └── rankings.tsx             # Rankings globais
│   ├── auth/
│   │   ├── login.tsx                # Login
│   │   ├── register.tsx             # Registo
│   │   └── setup-profile.tsx        # Configuração de perfil pós-registo
│   ├── recipe/
│   │   ├── [id].tsx                 # Detalhe de receita
│   │   ├── edit/[id].tsx            # Editar receita própria
│   │   └── card/[id].tsx            # Card expandido de receita
│   ├── user/[id].tsx                # Perfil público de outro utilizador
│   ├── calendar.tsx                 # Calendário anual de cozinha
│   ├── notifications.tsx            # Centro de notificações
│   ├── achievements.tsx             # Badges e achievements
│   └── settings.tsx                 # Definições e conta
│
├── store/
│   └── useStore.ts                  # Estado global (Zustand)
│
├── services/
│   └── api.ts                       # Cliente HTTP para o backend
│
├── constants/
│   ├── Colors.ts                    # Paleta de cores
│   ├── Fonts.ts                     # Referências de tipografia
│   └── theme.ts
│
├── data/
│   ├── ingredients.ts               # Lista canónica de ingredientes (200+)
│   └── mockData.ts
│
├── backend/
│   ├── server.js                    # Servidor Express (porta 3001)
│   ├── database.js                  # Inicialização SQLite + queries
│   └── cookit.db                    # Base de dados SQLite
│
└── config.ts                        # API_URL dinâmica (Expo hostUri)
```

---

## Ecrãs e Navegação

### Fluxo de Autenticação

```
/ (Splash)
  ├── token válido → /(tabs) Feed
  └── sem token   → /auth/login
                        └── /auth/register
                                └── /auth/setup-profile
                                        └── /(tabs) Feed
```

### Tab Navigation

```
[Feed]  [Descobrir]  [＋ Criar]  [Lista]  [Perfil]
```

| Tab | Rota | Descrição |
|-----|------|-----------|
| Feed | `/(tabs)` | Todas as receitas públicas por ordem de publicação |
| Descobrir | `/(tabs)/discover` | Pesquisa + filtros avançados |
| Criar | `/(tabs)/add` | Formulário para publicar nova receita |
| Lista | `/(tabs)/shopping` | Lista de compras local (por receita) |
| Perfil | `/(tabs)/profile` | Perfil próprio com 3 abas + badges |

### Ecrãs Secundários

| Rota | Descrição |
|------|-----------|
| `/recipe/:id` | Detalhe da receita: ingredientes ajustáveis, passos, rating, comentários |
| `/recipe/edit/:id` | Editar receita (apenas o autor) |
| `/recipe/card/:id` | Vista "caderno" da receita com checklist interativo |
| `/user/:id` | Perfil público de outro utilizador + follow/unfollow |
| `/calendar` | Calendário anual com dias de cozinha marcados |
| `/notifications` | Centro de notificações (server + locais) |
| `/achievements` | Todos os badges com progresso e categorias |
| `/settings` | Editar perfil, logout, apagar conta |
| `/rankings` | Rankings globais de chefs (dados mock) |

---

## Funcionalidades em Detalhe

### Receitas

- **Criar**: título, imagem (câmara ou galeria), ingredientes com quantidade/unidade, passos com timer opcional, cozinha, tipo de prato, dificuldade, tempo de prep/cozedura, doses, calorias, custo, dietas e métodos culinários
- **Feed**: Todas as receitas públicas; cada card mostra imagem, título, autor, rating, tempo, dificuldade, dietas
- **Descobrir**: Pesquisa por texto + filtros combinados (cozinha, tipo prato, dificuldade, dieta, ingredientes); modo "frigorífico" com vários ingredientes separados por vírgula
- **Detalhe**: Ingredientes reescalonados automaticamente por número de doses; lista de passos; rating com estrelas (1-5); comentários com texto
- **Guardar / Cozinhei**: Botões com sincronização imediata no servidor; visíveis no perfil em abas separadas

### Sistema Social

- **Follow / Unfollow**: Perfil público de cada utilizador; atualiza contadores de seguidores e a seguir
- **Comentários**: Até 500 caracteres; visíveis no tab "Comentários" dentro do detalhe da receita
- **Rating**: 1 a 5 estrelas; recalcula a média da receita no servidor; persiste entre sessões e dispositivos

### Shopping List

- Adicionada a partir de qualquer receita com "Adicionar à lista"
- Agrupa ingredientes por receita
- Check-off individual de itens
- Remover receita completa ou limpar todos os marcados
- **Armazenamento local** (AsyncStorage), não sincroniza com servidor

### Gamificação — Achievements & Badges

**5 categorias:**

| Categoria | Thresholds |
|-----------|-----------|
| Cozinheiro | 1, 5, 10, 25, 50, 100, 250, 500 receitas cozinhadas |
| Streak | 3, 7, 14, 30, 100, 365 dias consecutivos |
| Coleção | 1, 5, 20, 50 receitas guardadas |
| Social | 1, 5, 20, 50 receitas publicadas |
| Lendário | Achievements especiais (admin, 1000, 500 cozinhadas) |

- Desbloqueio automático ao atingir cada threshold
- Notificação local gerada ao desbloquear
- Pinning de até 8 badges visíveis no perfil
- Streak: dias consecutivos com pelo menos 1 receita cozinhada (recalculado localmente)

### Calendário

- Calendário anual completo (todos os meses)
- Dias com receitas cozinhadas marcados a verde
- Contador de receitas por mês
- Dia atual diferenciado visualmente
- Dados sincronizados do servidor (`/users/me/cooked`)

### Notificações

- **Servidor**: Notificação criada automaticamente quando alguém avalia ou comenta uma receita (exceto o próprio autor)
- **Locais**: Geradas ao desbloquear badges ou atingir streaks
- **Merge**: As duas fontes são combinadas e ordenadas por timestamp
- Marcar todas como lidas ao abrir o ecrã
- Link direto para a receita em causa (quando aplicável)

---

## Estado Global (Zustand)

```typescript
// Auth
user: AuthUser | null          // Utilizador autenticado
token: string | null           // JWT Bearer token

// Receitas (sincronizadas com servidor)
savedRecipes: string[]         // IDs das receitas guardadas
cookedRecipes: string[]        // IDs das receitas cozinhadas
cookedLogs: CookLog[]          // { recipeId, date } por cozinhada
userRatings: Record<string, number>  // { recipeId: 1-5 }

// Shopping List (local)
shoppingList: ShoppingItem[]   // Itens com receita, checked, unidade

// Notificações & Badges (local)
notifications: AppNotification[]
earnedBadgeIds: string[]       // IDs dos badges desbloqueados
pinnedBadgeIds: string[]       // Até 8 badges em destaque no perfil
```

**Persistência:**
- `cookit-auth` → token + user (AsyncStorage)
- `cookit-data-{userId}` → shoppingList, earnedBadgeIds, pinnedBadgeIds (AsyncStorage)
- savedRecipes, cookedRecipes, cookedLogs, userRatings → sincronizados do servidor ao fazer login

---

## Backend — Endpoints REST

**Servidor**: Express.js em `http://localhost:3001/api`

### Autenticação

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/register` | Criar conta (name, username, email, password) |
| POST | `/auth/login` | Login → devolve JWT token |
| GET | `/auth/me` | Perfil do utilizador autenticado |
| PUT | `/auth/me` | Atualizar perfil |
| DELETE | `/auth/me` | Apagar conta (cascata) |

### Receitas

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/recipes` | Todas as receitas (feed) |
| GET | `/recipes/:id` | Detalhe com ingredientes + passos |
| POST | `/recipes` | Criar receita |
| PUT | `/recipes/:id` | Editar receita (apenas autor) |
| DELETE | `/recipes/:id` | Apagar receita (apenas autor) |
| POST | `/recipes/:id/rate` | Dar rating (1-5) |
| GET | `/recipes/:id/comments` | Comentários da receita |
| POST | `/recipes/:id/comments` | Publicar comentário |
| POST | `/recipes/:id/save` | Guardar receita |
| DELETE | `/recipes/:id/save` | Remover dos guardados |
| POST | `/recipes/:id/cooked` | Marcar como cozinhada |
| DELETE | `/recipes/:id/cooked` | Desmarcar cozinha |

### Utilizadores

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/users/:id` | Perfil público |
| GET | `/users/:id/recipes` | Receitas de um utilizador |
| GET | `/users/:id/follow` | Verificar se sigo este utilizador |
| POST | `/users/:id/follow` | Seguir utilizador |
| DELETE | `/users/:id/follow` | Deixar de seguir |
| GET | `/users/me/saved` | IDs das receitas guardadas |
| GET | `/users/me/cooked` | Receitas cozinhadas com datas |
| GET | `/users/me/ratings` | Ratings dados pelo utilizador |

### Notificações

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/notifications` | Notificações do utilizador |
| PUT | `/notifications/read` | Marcar todas como lidas |
| GET | `/notifications/unread-count` | Número de não lidas |

---

## Base de Dados — Tabelas

| Tabela | Descrição |
|--------|-----------|
| `users` | Utilizadores: perfil completo, contadores de followers/following/recipes |
| `recipes` | Receitas: metadados, JSON arrays (diet, tags, cooking_method), contadores automáticos |
| `ingredients` | Ingredientes por receita (FK: recipe_id) |
| `steps` | Passos por receita com número e duração opcional (FK: recipe_id) |
| `ratings` | Rating por utilizador/receita; atualiza média na tabela recipes |
| `comments` | Comentários por receita; incrementa comments_count |
| `follows` | Relações de seguimento (PK composta: follower + following) |
| `user_cooked` | Histórico de cozinha com data (PK composta: user_id + recipe_id) |
| `saved_recipes` | Receitas guardadas (PK composta: user_id + recipe_id) |
| `notifications` | Notificações geradas automaticamente (rating, comentário) |

**Comportamentos automáticos do servidor:**
- Rating: recalcula `recipes.rating` e `recipes.rating_count`
- Cozinhada: incrementa/decrementa `recipes.cooked_count`
- Comentário: incrementa `recipes.comments_count`
- Seguir: atualiza `users.followers` e `users.following`
- Criar receita: incrementa `users.recipes_count`
- Rating/comentário por outro utilizador: cria notificação para o autor

---

## Constantes da App

### Cozinhas (17)
Portuguesa, Italiana, Japonesa, Mexicana, Indiana, Francesa, Mediterrânica, Americana, Brasileira, Coreana, Chinesa, Tailandesa, Árabe, Africana, Fusão, Internacional

### Tipos de Prato (13)
Entrada, Sopa, Prato Principal, Acompanhamento, Snack, Sobremesa, Pequeno-Almoço, Brunch, Lanche, Bebida, Molho, Pão / Pastelaria

### Dificuldades (3)
Fácil (verde), Médio (amarelo), Difícil (terracota)

### Dietas (12)
Vegetariano, Vegan, Pescetariano, Sem Glúten, Sem Lactose, Low Carb, Keto, Alta Proteína, Saudável, Meal Prep, Comfort Food, Light

### Métodos Culinários (10)
Forno, Frigideira, Air Fryer, Grelhado, Micro-ondas, Panela, Panela de Pressão, Sem Cozinhar, Barbecue, Slow Cooker

### Unidades de Medida (12)
g, kg, ml, L, c.s., c.c., un., fatia, dente, ramo, q.b., pitada

---

## Decisões de Arquitetura

| Decisão | Razão |
|---------|-------|
| Expo Router (file-based) | Navegação declarativa com dynamic routes, sem configuração manual de stacks |
| Zustand em vez de Redux | API simples, zero boilerplate, seletores eficientes |
| SQLite local (sql.js) | Sem dependências cloud para desenvolvimento; troca para PostgreSQL em produção |
| AsyncStorage para auth | Funciona em iOS, Android e web (via polyfill) |
| JWT 30 dias | Sessão longa sem refresh token, adequado para MVP |
| SafeAreaView (react-native-safe-area-context) | Compatível com notches, dynamic islands e barras de navegação em todos os devices |
| useSafeAreaInsets para botões flutuantes | position:absolute ignora o padding do SafeAreaView; insets.top + offset garante posição correta em qualquer iPhone/Android |
| Sincronização server-first ao login | Dados (saved, cooked, ratings) ficam consistentes entre dispositivos; apenas shopping list e badges ficam locais |
