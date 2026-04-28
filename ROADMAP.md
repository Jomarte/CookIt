# CookIt — Roadmap de Lançamento

## Estado Atual
- Expo SDK 54, React Native 0.81.5, EAS configurado
- Backend no Render (PostgreSQL)
- Package: `com.cookit.app` (Android + iOS)
- Versão: 1.0.0 / versionCode 1 / buildNumber 1

---

## Fase 1 — Legal & Obrigatório (sem isto as stores rejeitam)

### 1.1 Política de Privacidade
- [ ] Escrever uma Privacy Policy (obrigatório para ambas as stores)
- [ ] Publicar num URL público (ex: GitHub Pages, Notion, site próprio)
- [ ] Deve cobrir: dados recolhidos (email, nome, fotos), como são usados, retenção, contacto
- [ ] URL a inserir no Google Play Console e App Store Connect

### 1.2 Termos de Serviço
- [ ] Escrever Terms of Service básicos
- [ ] Publicar no mesmo site da Privacy Policy
- [ ] Já tens `terms_accepted_at` na BD — tens de mostrar o link no ecrã de registo

### 1.3 Conta de Programador
- [ ] **Google Play**: conta Google Play Console — $25 taxa única em play.google.com/console
- [ ] **Apple App Store**: Apple Developer Program — $99/ano em developer.apple.com
- [ ] Ambas precisam de verificação de identidade (pode demorar 1-2 dias)

---

## Fase 2 — Assets Visuais para as Stores

### 2.1 Ícone
- [ ] Verificar que `assets/images/logo-new.png` tem 1024×1024px sem transparência (iOS rejeita transparência)
- [ ] Android: já tem `adaptiveIcon` configurado ✓

### 2.2 Splash Screen
- [ ] Verificar que `assets/images/splash-icon.png` fica bem em vários tamanhos

### 2.3 Screenshots (obrigatório)
- [ ] **Android**: mínimo 2 screenshots, idealmente 6-8
  - Tamanho: 1080×1920px (ou 1080×2340px para phones modernos)
- [ ] **iOS**: screenshots para iPhone 6.5" (1242×2688px) e iPhone 5.5" (1242×2208px)
  - Se `supportsTablet: true`, também precisas iPad 12.9"
- [ ] Ferramentas: gravar no emulador/dispositivo + Figma para mockups bonitos

### 2.4 Feature Graphic (só Android)
- [ ] Imagem 1024×500px para o topo da página da app no Play Store

---

## Fase 3 — Configuração de Build (EAS)

### 3.1 Android — Chave de Assinatura
- [ ] Gerar keystore: `eas credentials` → Android → generate new keystore
- [ ] **GUARDAR O KEYSTORE E PASSWORD EM LOCAL SEGURO** — sem ela não podes atualizar a app nunca mais
- [ ] O EAS pode gerir isto automaticamente (recomendado para Expo)

### 3.2 iOS — Certificados
- [ ] Precisa de conta Apple Developer ativa
- [ ] `eas credentials` → iOS → gera automaticamente Distribution Certificate e Provisioning Profile
- [ ] Ou gerir manualmente em developer.apple.com

### 3.3 Variáveis de Ambiente de Produção
- [ ] Confirmar que `eas.json` tem `EXPO_PUBLIC_API_URL` apontado para Render ✓
- [ ] Backend no Render deve ter `NODE_ENV=production` definido

### 3.4 Build de Produção
```bash
# Android (AAB para Play Store)
eas build --platform android --profile production

# iOS (IPA para App Store)
eas build --platform ios --profile production
```

---

## Fase 4 — Backend Pronto para Produção

### 4.1 Render — Plano Pago
- [ ] O plano gratuito do Render hiberna após 15 min de inatividade (a primeira request demora ~30s)
- [ ] Para produção: upgrade para plano "Starter" ($7/mês) para instância sempre ativa
- [ ] Alternativa: implementar keep-alive ping (cron job a fazer request a `/api/health` de 10 em 10 min)

### 4.2 Base de Dados
- [ ] Confirmar que a BD do Supabase/PostgreSQL tem backups automáticos ativos
- [ ] Testar que todas as migrações (`ALTER TABLE IF NOT EXISTS`) correm sem erro num deploy limpo

### 4.3 Monitorização
- [ ] Adicionar logging de erros (ex: Sentry — plano gratuito disponível)
- [ ] Configurar alertas de downtime (ex: UptimeRobot — gratuito)

---

## Fase 5 — Qualidade da App

### 5.1 Testes Manuais Antes do Lançamento
- [ ] Fluxo de registo → verificação de email → login
- [ ] Criar, editar, apagar receita
- [ ] Seguir/deixar de seguir utilizador
- [ ] Lista de compras
- [ ] Notificações
- [ ] Apagar conta (e confirmar que tudo desaparece)
- [ ] Funciona em modo offline (mensagens de erro adequadas)

### 5.2 Edge Cases
- [ ] Testar com rede lenta (3G)
- [ ] Testar com sessão expirada (token JWT de 30 dias)
- [ ] Testar registo com email já existente
- [ ] Imagens grandes (câmara de alta resolução)

### 5.3 Performance
- [ ] Feed principal não demora mais de 3s a carregar
- [ ] Sem crashes no Android 10+ e iOS 15+

---

## Fase 6 — Submissão às Stores

### 6.1 Google Play Console
- [ ] Criar app nova em play.google.com/console
- [ ] Preencher ficha: nome, descrição curta (80 char), descrição longa (4000 char)
- [ ] Upload screenshots e feature graphic
- [ ] Adicionar URL da Privacy Policy
- [ ] Classificação de conteúdo (questionário — provavelmente PEGI 3 ou 4+)
- [ ] Definir países de distribuição
- [ ] Upload do AAB (`eas submit --platform android` ou manual)
- [ ] Submeter para revisão (demora 1-3 dias úteis)

### 6.2 App Store Connect (iOS)
- [ ] Criar app em appstoreconnect.apple.com
- [ ] Preencher ficha: nome (30 char!), subtítulo (30 char), descrição (4000 char)
- [ ] Keywords (100 char total — crucial para descoberta)
- [ ] Upload screenshots
- [ ] Adicionar URL Privacy Policy e Support URL
- [ ] Classificação de conteúdo
- [ ] `eas submit --platform ios` ou upload via Transporter
- [ ] Submeter para App Review (demora 1-3 dias, pode pedir alterações)

---

## Fase 7 — Pós-Lançamento

- [ ] Monitorizar reviews e responder
- [ ] Corrigir crashes reportados pelo Sentry
- [ ] Preparar update v1.1 com melhorias (versionCode 2, buildNumber 2)
- [ ] ASO (App Store Optimization): testar diferentes keywords e descrições

---

## Resumo de Prioridades

| Prioridade | Item | Bloqueia lançamento? |
|---|---|---|
| 🔴 Crítico | Privacy Policy publicada | Sim |
| 🔴 Crítico | Contas Play Console + Apple Developer | Sim |
| 🔴 Crítico | Keystore Android guardada | Sim |
| 🔴 Crítico | Screenshots das stores | Sim |
| 🟡 Importante | Backend Render plano pago | Não (mas afeta UX) |
| 🟡 Importante | Testes manuais completos | Não (mas afeta qualidade) |
| 🟢 Nice-to-have | Sentry + UptimeRobot | Não |
| 🟢 Nice-to-have | Feature Graphic Android | Não |

## Estimativa de Tempo

- Fase 1 (Legal): 1-2 dias (escrever + publicar)
- Fase 2 (Assets): 1-2 dias (screenshots exigem dispositivo/emulador)
- Fase 3 (Build): 2-4h
- Fase 4 (Backend): 1h
- Fase 5 (Testes): 1-2 dias
- Fase 6 (Submissão): 1 dia + 1-3 dias de revisão das stores

**Total estimado até estar nas stores: ~2 semanas**
