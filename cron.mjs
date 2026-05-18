import { createClient } from "@libsql/client";
import { config } from "dotenv";

config();

const db = createClient({ url: process.env.DATABASE_URL ?? "file:/app/data/prod.db" });

function toMs(value) {
  if (value == null) return NaN;
  // Prisma may store as integer (unix ms) or ISO string
  if (typeof value === "number") return value;
  const n = Number(value);
  if (!isNaN(n) && String(value) === String(n)) return n; // numeric string
  return new Date(String(value)).getTime();
}

async function checkReminders() {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;

  // Fetch all pending items with scheduledAt
  const result = await db.execute({
    sql: `SELECT i.id, i.title, i.phone, i.scheduledAt,
                 a.evolutionUrl, a.evolutionApiKey, a.instanceId
          FROM "Item" i, "AgentConfig" a
          WHERE i.reminderSent = 0 AND i.scheduledAt IS NOT NULL
          LIMIT 50`,
    args: [],
  });

  for (const row of result.rows) {
    const scheduledMs = toMs(row.scheduledAt);

    if (isNaN(scheduledMs)) {
      // Bad data — discard silently
      await db.execute({ sql: `UPDATE "Item" SET reminderSent = 1 WHERE id = ?`, args: [row.id] });
      continue;
    }

    // Past the scheduled time — discard without sending
    if (scheduledMs < now) {
      await db.execute({ sql: `UPDATE "Item" SET reminderSent = 1 WHERE id = ?`, args: [row.id] });
      console.log("[cron] overdue, discarded:", row.title);
      continue;
    }

    // Not yet in the 15-min window — skip for now
    if (scheduledMs - now > windowMs) continue;

    // In window and not expired — send reminder
    const evolutionUrl = String(row.evolutionUrl ?? "");
    const evolutionApiKey = String(row.evolutionApiKey ?? "");
    const instanceId = String(row.instanceId ?? "");
    const phone = String(row.phone ?? "");
    const title = String(row.title ?? "");

    // Mark sent first to avoid double-send on retry
    await db.execute({ sql: `UPDATE "Item" SET reminderSent = 1 WHERE id = ?`, args: [row.id] });

    if (!evolutionUrl || !instanceId || !phone) {
      console.log("[cron] skipping (missing config/phone):", row.id);
      continue;
    }

    const scheduledLabel = new Date(scheduledMs).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit", minute: "2-digit",
      day: "2-digit", month: "2-digit",
    });

    const message = `⏰ *Lembrete:* ${title}\n🕐 Agendado para ${scheduledLabel}`;

    try {
      const res = await fetch(`${evolutionUrl}/message/sendText/${instanceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": evolutionApiKey },
        body: JSON.stringify({ number: phone, text: message }),
      });
      if (!res.ok) {
        console.error("[cron] Evolution error:", res.status, await res.text());
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
