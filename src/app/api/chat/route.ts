import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateResponse } from "@/lib/openai";

export async function GET(request: Request) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const conversations = await prisma.conversation.findMany({
    where: { source: "chat" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(conversations);
}

export async function POST(request: Request) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { conversationId, message } = await request.json();

  let config = await prisma.agentConfig.findFirst();
  if (!config) {
    config = await prisma.agentConfig.create({ data: {} });
  }

  let conversation;
  if (conversationId) {
    conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  }
  if (!conversation) {
    conversation = await prisma.conversation.create({ data: { source: "chat" } });
  }

  await prisma.message.create({
    data: { conversationId: conversation.id, role: "user", content: message },
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

  let aiContent: string;
  let aiTokens: number;
  try {
    const result = await generateResponse(
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
    aiContent = result.content;
    aiTokens = result.tokens;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao gerar resposta";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const saved = await prisma.message.create({
    data: { conversationId: conversation.id, role: "assistant", content: aiContent, tokens: aiTokens },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({
    conversationId: conversation.id,
    message: { id: saved.id, content: saved.content, tokens: saved.tokens, role: saved.role },
  });
}
