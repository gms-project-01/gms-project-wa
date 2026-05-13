import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateResponse } from "@/lib/openai";
import { sendWhatsAppMessage } from "@/lib/evolution";

export async function POST(request: Request) {
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
    return NextResponse.json({ ok: true });
  }

  const config = await prisma.agentConfig.findFirst();
  if (!config || !config.enabled) {
    return NextResponse.json({ ok: true });
  }

  if (config.allowedPhones) {
    const allowed = config.allowedPhones.split(",").map((p) => p.trim());
    if (!allowed.includes(phone)) {
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

  const { content, tokens } = await generateResponse(
    messages,
    config.systemPrompt,
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

  await prisma.message.create({
    data: { conversationId: conversation.id, role: "assistant", content, tokens },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  await sendWhatsAppMessage(
    config.evolutionUrl,
    config.evolutionApiKey,
    config.instanceId,
    phone,
    content
  );

  return NextResponse.json({ ok: true });
}
