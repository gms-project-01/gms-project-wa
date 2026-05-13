# Agente IA no WhatsApp

Projeto full-stack: dashboard Next.js que conecta OpenAI GPT-4.1-mini ao WhatsApp via Evolution API. Recebe mensagens via webhook, gera respostas com IA e envia de volta ao WhatsApp. Inclui painel web para testar o agente, visualizar conversas e configurar tudo.

## Stack

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Next.js App Router, `output: "standalone"` | 16.2.5 |
| UI | React | 19.2.4 |
| Linguagem | TypeScript | ^5 |
| Banco de dados | SQLite (arquivo) | — |
| ORM | Prisma | ^7.8.0 |
| Driver SQLite dev | better-sqlite3 | ^12.9.0 |
| Driver SQLite prod | @libsql/client | ^0.17.3 |
| IA | OpenAI SDK, modelo `gpt-4.1-mini` | ^6.36.0 |
| CSS | Tailwind CSS v4 | ^4 |
| Runtime Docker | Node.js 22-alpine | — |
| Auth | Cookie httpOnly `agent_session`, sem NextAuth | — |

## Estrutura de arquivos

```
src/
  app/
    api/
      auth/route.ts
      chat/route.ts
      config/route.ts
      conversations/route.ts
      webhook/route.ts
    (dashboard)/
      layout.tsx
      page.tsx
      config/page.tsx
      conversations/page.tsx
    login/page.tsx
    layout.tsx
    globals.css
  lib/
    auth.ts
    openai.ts
    evolution.ts
    prisma.ts
prisma/schema.prisma
migrate.mjs
start.sh
Dockerfile
prisma.config.ts
next.config.ts
tsconfig.json
.env.example
.gitignore
package.json
```

## package.json

```json
{
  "name": "yt-agente-ia",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@libsql/client": "^0.17.3",
    "@prisma/adapter-better-sqlite3": "^7.8.0",
    "@prisma/adapter-libsql": "^7.8.0",
    "@prisma/client": "^7.8.0",
    "better-sqlite3": "^12.9.0",
    "dotenv": "^17.4.2",
    "next": "16.2.5",
    "openai": "^6.36.0",
    "prisma": "^7.8.0",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/better-sqlite3": "^7.6.13",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.5",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

## Arquivos de configuração

### next.config.ts
```ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = { output: "standalone" };
export default nextConfig;
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### prisma.config.ts
```ts
import path from "node:path";
import { defineConfig } from "prisma/config";
export default defineConfig({
  earlyAccess: true,
  schema: path.join("prisma", "schema.prisma"),
});
```

### prisma/schema.prisma
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
}

model AgentConfig {
  id              String   @id @default(cuid())
  name            String   @default("Assistente IA")
  systemPrompt    String   @default("Você é um assistente prestativo e amigável.")
  temperature     Float    @default(0.7)
  maxTokens       Int      @default(1024)
  evolutionUrl    String   @default("")
  evolutionApiKey String   @default("")
  instanceId      String   @default("")
  historyLimit    Int      @default(10)
  enabled         Boolean  @default(true)
  allowedPhones   String   @default("")
  aiProvider      String   @default("openai")
  openaiApiKey    String   @default("")
  openaiModel     String   @default("gpt-4.1-mini")
  groqApiKey      String   @default("")
  groqModel       String   @default("llama-3.3-70b-versatile")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Conversation {
  id        String    @id @default(cuid())
  source    String    @default("chat")
  phone     String?
  messages  Message[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Message {
  id             String       @id @default(cuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  role           String
  content        String
  tokens         Int?
  createdAt      DateTime     @default(now())
}
```

### .env.example
```
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY="sk-..."
ADMIN_PASSWORD="sua-senha-aqui"
NEXTAUTH_SECRET="gere-um-segredo-aleatorio-aqui"
```

### .gitignore
```
.env
*.db
*.db-shm
*.db-wal
node_modules/
.next/
```

### migrate.mjs
```js
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL ?? "file:/app/data/prod.db";
const db = createClient({ url });

await db.executeMultiple(`
  CREATE TABLE IF NOT EXISTS "AgentConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT 'Assistente IA',
    "systemPrompt" TEXT NOT NULL DEFAULT 'Voce e um assistente prestativo e amigavel.',
    "temperature" REAL NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER NOT NULL DEFAULT 1024,
    "historyLimit" INTEGER NOT NULL DEFAULT 10,
    "enabled" INTEGER NOT NULL DEFAULT 1,
    "allowedPhones" TEXT NOT NULL DEFAULT '',
    "evolutionUrl" TEXT NOT NULL DEFAULT '',
    "evolutionApiKey" TEXT NOT NULL DEFAULT '',
    "instanceId" TEXT NOT NULL DEFAULT '',
    "aiProvider" TEXT NOT NULL DEFAULT 'openai',
    "openaiApiKey" TEXT NOT NULL DEFAULT '',
    "openaiModel" TEXT NOT NULL DEFAULT 'gpt-4.1-mini',
    "groqApiKey" TEXT NOT NULL DEFAULT '',
    "groqModel" TEXT NOT NULL DEFAULT 'llama-3.3-70b-versatile',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS "Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL DEFAULT 'chat',
    "phone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tokens" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE
  );
`);

const incremental = [
  `ALTER TABLE "AgentConfig" ADD COLUMN "historyLimit" INTEGER NOT NULL DEFAULT 10`,
  `ALTER TABLE "AgentConfig" ADD COLUMN "enabled" INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE "AgentConfig" ADD COLUMN "allowedPhones" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "AgentConfig" ADD COLUMN "aiProvider" TEXT NOT NULL DEFAULT 'openai'`,
  `ALTER TABLE "AgentConfig" ADD COLUMN "openaiApiKey" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "AgentConfig" ADD COLUMN "openaiModel" TEXT NOT NULL DEFAULT 'gpt-4.1-mini'`,
  `ALTER TABLE "AgentConfig" ADD COLUMN "groqApiKey" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "AgentConfig" ADD COLUMN "groqModel" TEXT NOT NULL DEFAULT 'llama-3.3-70b-versatile'`,
];

for (const sql of incremental) {
  try { await db.execute(sql); } catch { /* coluna já existe */ }
}

console.log("[migrate] Tables OK");
db.close();
```

### start.sh
```sh
#!/bin/sh
node /app/migrate.mjs
node server.js
```

### Dockerfile
```dockerfile
FROM node:22-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/@libsql ./node_modules/@libsql
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/migrate.mjs ./migrate.mjs
COPY --from=builder /app/start.sh ./start.sh

RUN mkdir -p /app/data && chown nextjs:nodejs /app/data
RUN chmod +x start.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:/app/data/prod.db"

CMD ["sh", "start.sh"]
```

## Bibliotecas (src/lib/)

### prisma.ts
Singleton do Prisma Client para evitar múltiplas instâncias no hot reload de dev.

```ts
import { PrismaClient } from "@prisma/client";
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"] });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### auth.ts
Cookie `agent_session` (httpOnly, 7 dias). Sem NextAuth.
- `SESSION_COOKIE = "agent_session"`
- `isAuthenticated(request: Request): boolean` — verifica presença e validade do cookie
- `createSession(): string` — retorna valor do cookie (token fixo ou JWT mínimo)

### openai.ts
Suporta dois provedores com a mesma assinatura — Groq usa a API compatível com OpenAI.

```ts
interface ProviderOptions {
  aiProvider?: string;   // "openai" | "groq"
  openaiApiKey?: string;
  openaiModel?: string;
  groqApiKey?: string;
  groqModel?: string;
}

export async function generateResponse(
  messages: ChatMessage[],
  systemPrompt: string,
  temperature: number,
  maxTokens: number,
  providerOpts?: ProviderOptions
): Promise<{ content: string; tokens: number }>
```

- Se `aiProvider === "groq"`: usa `baseURL: "https://api.groq.com/openai/v1"` com `groqApiKey`; modelo = `groqModel` (padrão `llama-3.3-70b-versatile`)
- Senão (openai): usa `openaiApiKey` do config; se vazio, usa `OPENAI_API_KEY` do env como fallback; modelo = `openaiModel` (padrão `gpt-4.1-mini`)
- Groq é compatível com o SDK OpenAI — não precisa de dependência extra
- Insere `systemPrompt` como primeira mensagem `system`. Retorna texto e `usage.total_tokens`.

### evolution.ts
```ts
export async function sendWhatsAppMessage(
  evolutionUrl: string,
  evolutionApiKey: string,
  instanceId: string,
  phone: string,
  text: string
): Promise<void>
```
POST para `{evolutionUrl}/message/sendText/{instanceId}`.
Headers: `{ "Content-Type": "application/json", "apikey": evolutionApiKey }`.
Body: `{ "number": phone, "text": text }`.

## API Routes

### api/auth/route.ts
- **POST** — compara `{ password }` com `process.env.ADMIN_PASSWORD`; se correto, seta cookie e retorna 200; se não, 401
- **DELETE** — limpa o cookie (maxAge 0), retorna 200

### api/config/route.ts
Requer autenticação.
- **GET** — `prisma.agentConfig.findFirst()`; se não existir, cria registro padrão com `create({})`
- **PUT** — recebe todos os campos do `AgentConfig`; faz upsert pelo id

### api/chat/route.ts
Requer autenticação.
- **GET** — lista conversas `source: "chat"` com mensagens incluídas
- **POST** — body: `{ conversationId?: string, message: string }`; cria conversa se necessário; salva mensagem do usuário; busca histórico limitado por `historyLimit`; chama `generateResponse` passando `{ aiProvider, openaiApiKey, openaiModel, groqApiKey, groqModel }` da config; salva resposta; retorna `{ conversationId, message: { id, content, tokens, role } }`

### api/conversations/route.ts
Requer autenticação.
- **GET** — query param opcional `phone`; retorna conversas `source: "whatsapp"` com mensagens ordenadas por `createdAt asc`, conversas ordenadas por `updatedAt desc`

### api/webhook/route.ts
Sem autenticação (URL pública para a Evolution API).

Payload recebido:
```json
{
  "event": "messages.upsert",
  "data": {
    "key": { "remoteJid": "5511999999999@s.whatsapp.net", "fromMe": false },
    "message": { "conversation": "texto da mensagem" }
  }
}
```

Fluxo:
1. Ignorar se evento ≠ `"messages.upsert"`
2. Ignorar se `fromMe === true`
3. Ignorar se `remoteJid` contém `@g.us` (grupos)
4. `phone` = `remoteJid` sem o sufixo `@s.whatsapp.net`
5. Texto em `data.message.conversation` ou `data.message.extendedTextMessage.text`
6. Carregar config; ignorar se `enabled === false`
7. Se `allowedPhones` não vazio, verificar se `phone` está na lista CSV; ignorar se não estiver
8. Buscar ou criar `Conversation` (`source: "whatsapp"`, `phone`)
9. Salvar `Message` do usuário
10. Buscar histórico (último `historyLimit` mensagens)
11. `generateResponse` com o histórico e `{ aiProvider, openaiApiKey, openaiModel, groqApiKey, groqModel }` da config
12. Salvar `Message` do assistente com tokens
13. `sendWhatsAppMessage` com credenciais da config
14. Retornar `{ ok: true }`

## Pages

### Design System (globals.css)

```css
:root {
  /* Backgrounds */
  --bg: #06060E;
  --surface: #0D0D1C;
  --surface-2: #141428;
  --surface-3: #1C1C38;

  /* Borders */
  --border: #1E1E36;
  --border-2: #2C2C4A;
  --border-3: #3E3E60;

  /* Accent — warm amber */
  --accent: #F0A020;
  --accent-dim: rgba(240, 160, 32, 0.1);
  --accent-border: rgba(240, 160, 32, 0.25);
  --accent-text: #F5BA55;

  /* AI — electric cyan */
  --ai: #2DD4BF;
  --ai-dim: rgba(45, 212, 191, 0.09);
  --ai-border: rgba(45, 212, 191, 0.2);

  /* Text */
  --text-1: #EEEDF8;
  --text-2: #7A7A9C;
  --text-3: #48485E;

  /* Status */
  --error: #F87171;
  --error-dim: rgba(248, 113, 113, 0.08);
  --success: #4ADE80;
  --success-dim: rgba(74, 222, 128, 0.1);

  /* Font references */
  --font-display: var(--font-syne), 'Syne', sans-serif;
  --font-body: var(--font-dm-sans), 'DM Sans', sans-serif;
  --font-mono: var(--font-jetbrains), 'JetBrains Mono', monospace;
}
```

Classes utilitárias obrigatórias no mesmo arquivo:
- `.field-input` — input/select/textarea padrão: `background: var(--surface-2)`, borda `var(--border)`, `border-radius: 10px`, padding `10px 14px`, focus com `border-color: var(--accent)` e `box-shadow: 0 0 0 3px var(--accent-dim)`
- `.btn-primary` — botão preenchido: `background: var(--accent)`, `color: #000`, `font-weight: 600`, `border-radius: 10px`, hover com `opacity: 0.88`, disabled com `opacity: 0.45`
- `.btn-ghost` — botão outline: `border: 1px solid var(--border-2)`, hover com `background: var(--surface-2)`
- `.card` — container: `background: var(--surface)`, `border: 1px solid var(--border)`, `border-radius: 16px`
- `.animate-fade-up` — animação `fadeUp` (opacity 0→1, translateY 10px→0)
- `.dot-pulse` — animação dos 3 pontinhos de "digitando..."
- `.status-pulse` — pulsação do indicador online

Fontes via `next/font/google`: **Syne** (`--font-display`, títulos), **DM Sans** (`--font-body`, corpo), **JetBrains Mono** (`--font-mono`, código/timestamps).

### app/layout.tsx
Layout raiz. Importa as 3 fontes e aplica variáveis CSS no `<body>`. Fundo `var(--bg-primary)`.

### app/login/page.tsx
Tela cheia com card centralizado. Input de senha + botão. POST para `/api/auth`. Sucesso → `router.push("/")`. Erro → exibe "Senha incorreta".

### app/(dashboard)/layout.tsx
`"use client"`. Sidebar fixa (largura 216px) com:
- Logo/ícone no topo com `var(--accent-dim)` background
- Links de navegação: `/` (Chat de Teste), `/config` (Configurações), `/conversations` (Conversas WA)
- Link ativo: `background: var(--accent-dim)`, `border: 1px solid var(--accent-border)`, `color: var(--accent)`
- Botão "Sair" no rodapé: `DELETE /api/auth` → `router.push("/login")` + `router.refresh()`; hover com `var(--error)` e `var(--error-dim)`
- Autenticação verificada em cada page individualmente (não no layout)

### app/(dashboard)/page.tsx — Chat de Teste
- Estado: `messages`, `conversationId` (persistido em `localStorage`), `input`, `loading`
- Ao montar: restaura `conversationId` do localStorage; `GET /api/chat` para carregar histórico
- Envio: `POST /api/chat` com `{ message, conversationId }`
- Bolhas: usuário à direita (`--bg-tertiary`), assistente à esquerda (borda `--accent-cyan`)
- Tokens exibidos abaixo de cada resposta do assistente
- Indicador "digitando..." durante loading
- Botão "Nova conversa": limpa localStorage e estado
- `useRef` + `scrollIntoView` para scroll automático

### app/(dashboard)/config/page.tsx — Configurações
- `GET /api/config` ao montar para preencher os campos
- `PUT /api/config` ao salvar; exibe feedback de sucesso ou erro
- Campos: `name`, `systemPrompt` (textarea), `temperature`, `maxTokens`, `historyLimit`, `enabled` (toggle), `allowedPhones`, `evolutionUrl`, `evolutionApiKey`, `instanceId`
- Seção "Provedor de IA": dois botões toggle — OpenAI / Groq (grátis)
  - Se OpenAI: exibe campos `openaiApiKey` e `openaiModel` (select com 4 opções: gpt-4.1-mini, gpt-4.1, gpt-4o, gpt-4o-mini)
  - Se Groq: exibe campos `groqApiKey` e `groqModel` (select com 4 opções: llama-3.3-70b-versatile, llama-3.1-8b-instant, gemma2-9b-it, mixtral-8x7b-32768)
- Seção "Webhook": exibe `window.location.origin + "/api/webhook"` com botão copiar

### app/(dashboard)/conversations/page.tsx — Conversas WhatsApp
- Layout dois painéis: lista à esquerda, detalhes à direita
- `GET /api/conversations` ao montar
- Lista: avatar com iniciais do número, número, preview da última mensagem, horário
- Seleção: borda esquerda `--accent-amber`
- Campo de busca por número (re-fetch com query param `phone`)
- Detalhes: mensagens com mesmo estilo das bolhas do chat de teste; timestamps em pt-BR

## Inicialização do projeto do zero

Após criar todos os arquivos:
```bash
npm install
npx prisma generate
cp .env.example .env
# preencher .env com os valores reais
npm run dev
```

## Conectar ao GitHub

```bash
git init
git add .
git commit -m "feat: agente IA WhatsApp - setup inicial"
gh repo create meu-agente-ia --private --source=. --remote=origin --push
```

## Deploy no Easypanel

1. Criar serviço **App** conectado ao repositório GitHub, branch `main`
2. Build method: **Dockerfile** (detectado automaticamente)
3. Variáveis de ambiente:
   ```
   OPENAI_API_KEY=sk-...
   ADMIN_PASSWORD=senha-forte
   NEXTAUTH_SECRET=string-aleatoria-longa
   ```
4. Volume persistente: container path `/app/data` (banco SQLite sobrevive a redeploys)
5. Porta: `3000`
6. Após deploy: acessar `/login`, ir em Configurações, preencher credenciais da Evolution API e copiar a URL do webhook (`https://seudominio.com/api/webhook`) para configurar na Evolution API com evento `messages.upsert`