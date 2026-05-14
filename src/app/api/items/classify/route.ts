import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { classifyMessage } from "@/lib/classifier";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { text } = await request.json();
    if (!text) {
      return NextResponse.json({ error: "text obrigatório" }, { status: 400 });
    }

    const config = await prisma.agentConfig.findFirst();

    const classification = await classifyMessage(text, {
      aiProvider: config?.aiProvider,
      openaiApiKey: config?.openaiApiKey,
      openaiModel: config?.openaiModel,
      groqApiKey: config?.groqApiKey,
      groqModel: config?.groqModel,
    });

    return NextResponse.json({ classification });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[classify] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
