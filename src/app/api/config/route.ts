import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let config = await prisma.agentConfig.findFirst();
  if (!config) {
    config = await prisma.agentConfig.create({ data: {} });
  }

  return NextResponse.json(config);
}

export async function PUT(request: Request) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await request.json();

  let config = await prisma.agentConfig.findFirst();

  if (config) {
    config = await prisma.agentConfig.update({
      where: { id: config.id },
      data: {
        name: body.name,
        systemPrompt: body.systemPrompt,
        temperature: parseFloat(body.temperature),
        maxTokens: parseInt(body.maxTokens),
        historyLimit: parseInt(body.historyLimit),
        enabled: body.enabled,
        allowedPhones: body.allowedPhones,
        evolutionUrl: body.evolutionUrl,
        evolutionApiKey: body.evolutionApiKey,
        instanceId: body.instanceId,
        aiProvider: body.aiProvider,
        openaiApiKey: body.openaiApiKey,
        openaiModel: body.openaiModel,
        groqApiKey: body.groqApiKey,
        groqModel: body.groqModel,
      },
    });
  } else {
    config = await prisma.agentConfig.create({ data: body });
  }

  return NextResponse.json(config);
}
