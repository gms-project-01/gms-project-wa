import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { classifyMessage } from "@/lib/classifier";

export async function POST(request: Request) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { text } = await request.json();
    if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

    const config = await prisma.agentConfig.findFirst();
    if (!config) return NextResponse.json({ error: "No config" }, { status: 500 });

    const classification = await classifyMessage(text, {
      aiProvider: config.aiProvider,
      openaiApiKey: config.openaiApiKey,
      openaiModel: config.openaiModel,
      groqApiKey: config.groqApiKey,
      groqModel: config.groqModel,
    });

    return NextResponse.json({ text, classification });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
