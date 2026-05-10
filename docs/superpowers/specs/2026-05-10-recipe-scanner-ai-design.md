# Recipe Scanner IA — Design Document
**Date:** 2026-05-10  
**Status:** Approved

## Overview

Feature paga que usa Claude claude-sonnet-4-6 Vision para analisar uma foto (prato de comida ou receita escrita) e preencher automaticamente os campos de uma receita na app CookIt.

Dois pontos de entrada, uma feature unificada. Receitas escaneadas podem ser guardadas na lista privada "Quero Cozinhar" ou publicadas diretamente no feed.

---

## Pontos de Entrada

### Entrada 1 — Câmara rápida (do feed)
- Swipe para a direita no feed abre o ecrã Scanner (igual ao Instagram Stories)
- Botão 📷 no header do feed, ao lado do sino de notificações, abre o mesmo ecrã
- Fluxo: foto → IA analisa → escolher "Quero Cozinhar" ou "Publicar agora"

### Entrada 2 — Na página de publicação
- Após escolher foto na página de publicação (add.tsx), aparece botão "Analisar com IA ✨"
- IA analisa a foto já selecionada e preenche os campos do formulário existente
- Utilizador revê, edita e publica normalmente

---

## Ecrã Scanner (app/scanner.tsx)

Fluxo linear em 3 estados:

1. **Câmara / Galeria** — utilizador tira foto ou escolhe da galeria
2. **A analisar...** — loading com animação enquanto Claude processa (~2s)
3. **Resultado** — campos preenchidos pela IA (título, ingredientes, passos, tempo, dificuldade). Utilizador pode editar inline.

Botões no resultado:
- **⭐ Quero Cozinhar** — guarda na lista privada, sem publicar
- **🚀 Publicar agora** — navega para add.tsx com campos pré-preenchidos

---

## Lista "Quero Cozinhar"

Tab extra no perfil (entre "As minhas receitas" e "Cozinhei"). Só visível para o próprio utilizador.

Cada card mostra:
- Foto original escaneada
- Título gerado pela IA
- Tempo e dificuldade
- Botão **"Publicar com a tua foto 📸"** — abre add.tsx com os campos preenchidos, o utilizador adiciona a sua foto final

---

## Modelo Pago

| Plano | Análises/mês | Preço |
|-------|-------------|-------|
| Grátis | 3 | €0 |
| Pro | 30 | €2.99/mês |

Custo real de API por análise: ~$0.02 → custo total Pro: ~$0.60/mês → boa margem.

O utilizador vê sempre o contador de análises restantes (ex: "12/30 restantes"). Quando esgota o plano grátis, aparece prompt para upgrade.

**Pagamento:** a definir (Stripe / RevenueCat / manual). Não faz parte desta implementação.

---

## Backend

### Novas tabelas

**`scan_recipes`**
```sql
id, user_id, image TEXT, title TEXT,
ingredients TEXT (JSON), steps TEXT (JSON),
prep_time INT, cook_time INT, servings INT,
difficulty TEXT, cuisine TEXT,
created_at DATETIME
```

**Colunas adicionais em `users`**
```sql
ai_plan TEXT DEFAULT 'free',   -- 'free' | 'pro'
ai_scans_used INT DEFAULT 0,
ai_scans_reset_at DATE
```

### Novos endpoints

| Método | Path | Descrição |
|--------|------|-----------|
| POST | `/api/ai/scan` | Recebe imagem base64, chama Claude Vision, devolve JSON da receita, decrementa quota |
| GET | `/api/ai/scan-recipes` | Lista "Quero Cozinhar" do utilizador autenticado |
| POST | `/api/ai/scan-recipes` | Guarda receita escaneada na lista |
| DELETE | `/api/ai/scan-recipes/:id` | Remove da lista |

### Lógica de quota em `/api/ai/scan`
1. Verifica se utilizador está autenticado
2. Verifica `ai_scans_reset_at` — se passou um mês, reset `ai_scans_used = 0`
3. Verifica limite: free → 3, pro → 30. Se esgotado, retorna 403
4. Chama Claude Vision API com imagem + prompt estruturado
5. Incrementa `ai_scans_used`
6. Devolve JSON da receita

---

## Claude Vision — Prompt

```
Analisa esta imagem. Pode ser uma receita escrita (livro, revista, ecrã)
ou um prato de comida num restaurante ou em casa.

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
Para "difficulty" usa sempre: Fácil, Médio, ou Difícil
```

---

## Frontend — Ficheiros a alterar/criar

| Ficheiro | Alteração |
|----------|-----------|
| `app/(tabs)/index.tsx` | Swipe gesture + botão 📷 no header |
| `app/scanner.tsx` | Novo ecrã (câmara → loading → resultado) |
| `app/(tabs)/add.tsx` | Botão "Analisar com IA ✨" após escolha de foto |
| `app/(tabs)/profile.tsx` | Tab "Quero Cozinhar" + cards com botão publicar |
| `services/api.ts` | Métodos: `scanRecipe`, `getScanRecipes`, `saveScanRecipe`, `deleteScanRecipe` |
| `store/useStore.ts` | Estado: `aiScansUsed`, `aiPlan` |

---

## Fora de Scope (esta versão)

- Integração de pagamento (Stripe / RevenueCat)
- Edição inline da receita no ecrã de resultado (utilizador edita depois de guardar/publicar)
- Histórico de análises
