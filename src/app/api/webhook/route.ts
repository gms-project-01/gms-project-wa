import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateResponse } from "@/lib/openai";
import { sendWhatsAppMessage } from "@/lib/evolution";
import { classifyMessage } from "@/lib/classifier";

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

    const history = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: config.historyLimit,
    });

    const messages = history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Inject registered items as context so the AI can answer queries about them
    const items = await prisma.item.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

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

    const itemsBlock = items.length > 0
      ? items.map((i) =>
          `• [${CATEGORY_PT[i.category] ?? i.category}] ${i.title} — ${STATUS_PT[i.status] ?? i.status}${i.phone ? ` (${i.phone})` : ""}`
        ).join("\n")
      : "Nenhum item registrado ainda.";

    const systemPromptWithItems = `${config.systemPrompt}

---
ITENS REGISTRADOS NO SISTEMA (banco de dados atualizado):
${itemsBlock}
---
Quando o usuário perguntar sobre tarefas, problemas, requisições ou qualquer item registrado, use as informações acima para responder com precisão. Você pode filtrar por status (Aberto, Em andamento, Resolvido) ou categoria conforme a pergunta.`;

    let aiContent: string;
    let aiTokens: number;
    try {
      const result = await generateResponse(
        messages,
        systemPromptWithItems,
        config.temperature,
        config.maxTokens,
        {
          aiProvider: config.aiProvider,
          openaiApiKey: config.openaiApiKey,
          openaiModel: config.openaiModel,
          groqApiKey: config.groqApiKey,
          groqModel: config.groqModel,
        }
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

    // Classify message and act accordingly
    try {
      const classification = await classifyMessage(text, {
        aiProvider: config.aiProvider,
        openaiApiKey: config.openaiApiKey,
        openaiModel: config.openaiModel,
        groqApiKey: config.groqApiKey,
        groqModel: config.groqModel,
      });
      console.log("[webhook] classification:", JSON.stringify(classification));

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
        const ref = classification.itemRef.toLowerCase();
        const allItems = await prisma.item.findMany({ orderBy: { createdAt: "desc" } });
        const match = allItems.find(
          (i) => i.title.toLowerCase().includes(ref) || ref.includes(i.title.toLowerCase())
        );
        if (match) {
          const newStatus = classification.newStatus ?? "resolvido";
          await prisma.item.update({ where: { id: match.id }, data: { status: newStatus } });
          console.log("[webhook] item status updated:", match.title, "->", newStatus);
        } else {
          console.log("[webhook] update_status: no matching item found for ref:", ref);
        }

      } else if (classification?.action === "query") {
        console.log("[webhook] query detected, no item saved");

      } else {
        console.log("[webhook] none/trivial, no item saved");
      }
    } catch (err) {
      console.error("[webhook] classifier/save error:", err instanceof Error ? err.message : String(err));
    }

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
