import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateResponse } from "@/lib/openai";
import { sendWhatsAppMessage } from "@/lib/evolution";
import { classifyMessage, Classification } from "@/lib/classifier";

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9\s]/g, "");
}

function wordOverlapScore(a: string, b: string): number {
  const wordsA = new Set(normalize(a).split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(normalize(b).split(/\s+/).filter(w => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) overlap++;
  }
  return overlap / Math.max(wordsA.size, wordsB.size);
}

function findBestMatch(ref: string, titles: string[]): string | null {
  const scored = titles
    .map(title => ({ title, score: wordOverlapScore(ref, title) }))
    .filter(x => x.score >= 0.5)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.title ?? null;
}

const STATUS_PT: Record<string, string> = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  resolvido: "Resolvido",
};

const CATEGORY_PT: Record<string, string> = {
  requisicao: "Requisição", anotacao: "Anotação", problema: "Problema",
  solucao: "Solução", feedback: "Feedback", duvida: "Dúvida",
  tarefa: "Tarefa", outro: "Outro",
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.event !== "messages.upsert") {
      return NextResponse.json({ ok: true });
    }

    const data = body.data;
    if (data?.key?.fromMe === true) {
      return NextResponse.json({ ok: true });
    }

    const remoteJid: string = data?.key?.remoteJid ?? "";
    if (remoteJid.includes("@g.us")) {
      return NextResponse.json({ ok: true });
    }

    const phone = remoteJid.replace("@s.whatsapp.net", "");
    const text: string =
      data?.message?.conversation ??
      data?.message?.extendedTextMessage?.text ??
      "";

    if (!text) {
      console.log("[webhook] ignored: empty text from", phone);
      return NextResponse.json({ ok: true });
    }

    console.log("[webhook] message from", phone, ":", text.slice(0, 60));

    const config = await prisma.agentConfig.findFirst();
    if (!config || !config.enabled) {
      console.log("[webhook] ignored: agent disabled or no config");
      return NextResponse.json({ ok: true });
    }

    if (config.allowedPhones) {
      const allowed = config.allowedPhones.split(",").map((p) => p.trim());
      if (!allowed.includes(phone)) {
        console.log("[webhook] ignored: phone not in allowedPhones:", phone);
        return NextResponse.json({ ok: true });
      }
    }

    let conversation = await prisma.conversation.findFirst({
      where: { source: "whatsapp", phone },
    });
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { source: "whatsapp", phone },
      });
    }

    await prisma.message.create({
      data: { conversationId: conversation.id, role: "user", content: text },
    });

    const providerOpts = {
      aiProvider: config.aiProvider,
      openaiApiKey: config.openaiApiKey,
      openaiModel: config.openaiModel,
      groqApiKey: config.groqApiKey,
      groqModel: config.groqModel,
    };

    // STEP 1: Classify message BEFORE generating AI response
    let classification: Classification | null = null;
    try {
      classification = await classifyMessage(text, providerOpts);
      console.log("[webhook] classification:", JSON.stringify(classification));
    } catch (err) {
      console.error("[webhook] classifier error:", err instanceof Error ? err.message : String(err));
    }

    // STEP 2: Apply DB actions from classification (before AI runs, so items list is current)
    let statusUpdateResult: { success: boolean; title?: string; newStatus?: string } = { success: false };

    if (classification?.action === "register" && classification.category) {
      await prisma.item.create({
        data: {
          category: classification.category,
          title: classification.title ?? text.slice(0, 60),
          content: text,
          status: "aberto",
          phone,
        },
      });
      console.log("[webhook] item saved:", classification.category, "-", classification.title);

    } else if (classification?.action === "update_status" && classification.itemRef) {
      const allItems = await prisma.item.findMany({ orderBy: { createdAt: "desc" } });
      const match = findBestMatch(classification.itemRef, allItems.map(i => i.title));
      const matchedItem = match !== null ? allItems.find(i => i.title === match) : null;
      if (matchedItem) {
        const newStatus = classification.newStatus ?? "resolvido";
        await prisma.item.update({ where: { id: matchedItem.id }, data: { status: newStatus } });
        statusUpdateResult = { success: true, title: matchedItem.title, newStatus };
        console.log("[webhook] item status updated:", matchedItem.title, "->", newStatus);
      } else {
        statusUpdateResult = { success: false, title: classification.itemRef };
        console.log("[webhook] update_status: no matching item found for ref:", classification.itemRef);
      }
    }

    // STEP 3: Fetch history and items AFTER DB updates (AI sees fresh data)
    const history = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: config.historyLimit,
    });
    history.reverse();

    const messages = history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const items = await prisma.item.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const itemsBlock = items.length > 0
      ? items.map((i) =>
          `• ${i.title} [${CATEGORY_PT[i.category] ?? i.category}] — ${STATUS_PT[i.status] ?? i.status}`
        ).join("\n")
      : "Nenhum item registrado ainda.";

    // STEP 4: Build classification-aware instruction so AI knows what happened and how to respond
    let classificationHint: string;
    if (classification?.action === "query") {
      classificationHint = "O usuário está consultando. Responda em texto corrido, mencionando os itens relevantes de forma natural. NÃO faça perguntas de volta. NÃO copie a lista com bullets.";
    } else if (classification?.action === "register") {
      const title = classification.title ?? "item";
      const cat = CATEGORY_PT[classification.category ?? ""] ?? classification.category ?? "";
      classificationHint = `O item foi registrado com sucesso. Confirme em UMA frase curta, ex: "Anotado! ${title}${cat ? ` (${cat})` : ""} foi registrado." Não liste outros itens.`;
    } else if (classification?.action === "update_status") {
      if (statusUpdateResult.success) {
        const statusLabel = STATUS_PT[statusUpdateResult.newStatus ?? ""] ?? statusUpdateResult.newStatus;
        classificationHint = `Status atualizado com sucesso. Confirme em UMA frase curta, ex: "Pronto! ${statusUpdateResult.title} marcado como ${statusLabel}." Não liste outros itens.`;
      } else {
        classificationHint = `O item "${statusUpdateResult.title}" não foi encontrado no sistema. Informe isso em uma frase curta e peça para confirmar o nome exato.`;
      }
    } else {
      classificationHint = "Responda de forma breve e natural. Não faça perguntas desnecessárias.";
    }

    const contextBlock = `---
CONTEXTO INTERNO — não reproduza na resposta:
${itemsBlock}
---
INSTRUÇÃO: ${classificationHint}
REGRA: Nunca copie a lista acima na resposta. Use-a apenas para consultar informações internamente.`;

    const systemPromptWithItems = config.systemPrompt.trim()
      ? `${config.systemPrompt.trim()}\n\n${contextBlock}`
      : contextBlock;

    // STEP 5: Generate AI response with full context
    let aiContent: string;
    let aiTokens: number;
    try {
      const result = await generateResponse(
        messages,
        systemPromptWithItems,
        config.temperature,
        config.maxTokens,
        providerOpts
      );
      aiContent = result.content;
      aiTokens = result.tokens;
      console.log("[webhook] AI response generated, tokens:", aiTokens);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[webhook] AI error:", msg);
      return NextResponse.json({ ok: false, error: "ai: " + msg }, { status: 500 });
    }

    await prisma.message.create({
      data: { conversationId: conversation.id, role: "assistant", content: aiContent, tokens: aiTokens },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    try {
      await sendWhatsAppMessage(
        config.evolutionUrl,
        config.evolutionApiKey,
        config.instanceId,
        phone,
        aiContent
      );
      console.log("[webhook] message sent to", phone);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[webhook] Evolution API error:", msg);
      return NextResponse.json({ ok: false, error: "evolution: " + msg }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[webhook] unexpected error:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
