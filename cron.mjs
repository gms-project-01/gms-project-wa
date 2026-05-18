import { createClient } from "@libsql/client";
import { config } from "dotenv";

config();

const db = createClient({ url: process.env.DATABASE_URL ?? "file:/app/data/prod.db" });

async function checkReminders() {
  const now = new Date().toISOString();

  // Mark overdue items (past scheduledAt) as sent without sending a message
  await db.execute({
    sql: `UPDATE "Item" SET reminderSent = 1
          WHERE reminderSent = 0 AND scheduledAt IS NOT NULL AND scheduledAt < ?`,
    args: [now],
  });

  // Items in the 15-min window that haven't expired yet
  const result = await db.execute({
    sql: `SELECT i.id, i.title, i.phone, i.scheduledAt,
                 a.evolutionUrl, a.evolutionApiKey, a.instanceId
          FROM "Item" i, "AgentConfig" a
          WHERE i.reminderSent = 0
            AND i.scheduledAt IS NOT NULL
            AND datetime(i.scheduledAt, '-15 minutes') <= ?
            AND i.scheduledAt > ?
          LIMIT 20`,
    args: [now, now],
  });

  for (const row of result.rows) {
    const evolutionUrl = String(row.evolutionUrl ?? "");
    const evolutionApiKey = String(row.evolutionApiKey ?? "");
    const instanceId = String(row.instanceId ?? "");
    const phone = String(row.phone ?? "");
    const title = String(row.title ?? "");

    // Always mark sent to avoid infinite loop even if config is missing
    await db.execute({ sql: `UPDATE "Item" SET reminderSent = 1 WHERE id = ?`, args: [row.id] });

    if (!evolutionUrl || !instanceId || !phone) {
      console.log("[cron] skipping reminder (missing config/phone):", row.id);
      continue;
    }

    const scheduledLabel = row.scheduledAt
      ? new Date(String(row.scheduledAt)).toLocaleString("pt-BR", {
          timeZone: "America/Sao_Paulo",
          hour: "2-digit", minute: "2-digit",
          day: "2-digit", month: "2-digit",
        })
      : "";

    const message = `⏰ *Lembrete:* ${title}\n🕐 Agendado para ${scheduledLabel}`;

    try {
      const res = await fetch(`${evolutionUrl}/message/sendText/${instanceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": evolutionApiKey },
        body: JSON.stringify({ number: phone, text: message }),
      });
      if (!res.ok) {
        console.error("[cron] Evolution API error:", res.status, await res.text());
      } else {
        console.log("[cron] reminder sent:", title, "->", phone);
      }
    } catch (err) {
      console.error("[cron] fetch error:", err instanceof Error ? err.message : String(err));
    }
  }
}

console.log("[cron] Reminder daemon started, checking every 60s");
checkReminders().catch(console.error);
setInterval(() => checkReminders().catch(console.error), 60_000);
