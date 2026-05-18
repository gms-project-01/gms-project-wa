import { createClient } from "@libsql/client";
import { config } from "dotenv";

config();

const db = createClient({ url: process.env.DATABASE_URL ?? "file:/app/data/prod.db" });

async function checkReminders() {
  const now = new Date().toISOString();
  const result = await db.execute({
    sql: `SELECT r.id, r.title, r.phone, r.scheduledAt,
                 a.evolutionUrl, a.evolutionApiKey, a.instanceId
          FROM "Reminder" r, "AgentConfig" a
          WHERE r.sent = 0 AND r.reminderAt <= ? LIMIT 20`,
    args: [now],
  });

  for (const row of result.rows) {
    const evolutionUrl = String(row.evolutionUrl ?? "");
    const evolutionApiKey = String(row.evolutionApiKey ?? "");
    const instanceId = String(row.instanceId ?? "");
    const phone = String(row.phone ?? "");
    const title = String(row.title ?? "");

    if (!evolutionUrl || !instanceId) {
      console.log("[cron] skipping reminder, Evolution not configured:", row.id);
      await db.execute({ sql: `UPDATE "Reminder" SET sent = 1 WHERE id = ?`, args: [row.id] });
      continue;
    }

    const message = `⏰ *Lembrete:* ${title}`;
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

    await db.execute({ sql: `UPDATE "Reminder" SET sent = 1 WHERE id = ?`, args: [row.id] });
  }
}

console.log("[cron] Reminder daemon started, checking every 60s");
checkReminders().catch(console.error);
setInterval(() => checkReminders().catch(console.error), 60_000);
