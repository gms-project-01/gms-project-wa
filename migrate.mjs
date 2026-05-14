import { createClient } from "@libsql/client";
import { config } from "dotenv";

config();

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

const incrementalNew = [
  `CREATE TABLE IF NOT EXISTS "Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'aberto',
    "phone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
];

for (const sql of incrementalNew) {
  try {
    await db.execute(sql);
    console.log("[migrate] Item table OK");
  } catch (e) {
    console.log("[migrate] Item table already exists:", e.message);
  }
}

const incremental = [
  `ALTER TABLE "AgentConfig" ADD COLUMN "historyLimit" INTEGER NOT NULL DEFAULT 10`,
  `ALTER TABLE "AgentConfig" ADD COLUMN "anthropicApiKey" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "AgentConfig" ADD COLUMN "anthropicModel" TEXT NOT NULL DEFAULT 'claude-sonnet-4-6'`,
  `ALTER TABLE "AgentConfig" ADD COLUMN "enabled" INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE "AgentConfig" ADD COLUMN "allowedPhones" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "AgentConfig" ADD COLUMN "aiProvider" TEXT NOT NULL DEFAULT 'openai'`,
  `ALTER TABLE "AgentConfig" ADD COLUMN "openaiApiKey" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "AgentConfig" ADD COLUMN "openaiModel" TEXT NOT NULL DEFAULT 'gpt-4.1-mini'`,
  `ALTER TABLE "AgentConfig" ADD COLUMN "groqApiKey" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "AgentConfig" ADD COLUMN "groqModel" TEXT NOT NULL DEFAULT 'llama-3.3-70b-versatile'`,
];

for (const sql of incremental) {
  try { await db.execute(sql); } catch { /* coluna ja existe */ }
}

console.log("[migrate] Tables OK");
db.close();
