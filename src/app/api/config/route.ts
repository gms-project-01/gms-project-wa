import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    let config = await prisma.agentConfig.findFirst();
    if (!config) {
      config = await prisma.agentConfig.create({ data: {} });
    }
    return NextResponse.json(config);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/config]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    console.log("[PUT /api/config] body received:", JSON.stringify(body));

    let config = await prisma.agentConfig.findFirst();
    console.log("[PUT /api/config] existing config id:", config?.id ?? "none");

    if (config) {
      config = await prisma.agentConfig.update({
        where: { id: config.id },
        data: {
          name: body.name,
          systemPrompt: body.systemPrompt,
          temperature: parseFloat(body.temperature),
          maxTokens: parseInt(body.maxTokens),
          historyLimit: parseInt(body.historyLimit),
          enabled: Boolean(body.enabled),
          allowedPhones: body.allowedPhones ?? "",
          evolutionUrl: body.evolutionUrl ?? "",
          evolutionApiKey: body.evolutionApiKey ?? "",
          instanceId: body.instanceId ?? "",
          aiProvider: body.aiProvider ?? "openai",
          openaiApiKey: body.openaiApiKey ?? "",
          openaiModel: body.openaiModel ?? "gpt-4.1-mini",
          groqApiKey: body.groqApiKey ?? "",
          groqModel: body.groqModel ?? "llama-3.3-70b-versatile",
          anthropicApiKey: body.anthropicApiKey ?? "",
          anthropicModel: body.anthropicModel ?? "claude-sonnet-4-6",
        },
      });
    } else {
      config = await prisma.agentConfig.create({
        data: {
          name: body.name ?? "Assistente IA",
          systemPrompt: body.systemPrompt ?? "Você é um assistente prestativo e amigável.",
          temperature: parseFloat(body.temperature) || 0.7,
          maxTokens: parseInt(body.maxTokens) || 1024,
          historyLimit: parseInt(body.historyLimit) || 10,
          enabled: Boolean(body.enabled ?? true),
          allowedPhones: body.allowedPhones ?? "",
          evolutionUrl: body.evolutionUrl ?? "",
          evolutionApiKey: body.evolutionApiKey ?? "",
          instanceId: body.instanceId ?? "",
          aiProvider: body.aiProvider ?? "openai",
          openaiApiKey: body.openaiApiKey ?? "",
          openaiModel: body.openaiModel ?? "gpt-4.1-mini",
          groqApiKey: body.groqApiKey ?? "",
          groqModel: body.groqModel ?? "llama-3.3-70b-versatile",
          anthropicApiKey: body.anthropicApiKey ?? "",
          anthropicModel: body.anthropicModel ?? "claude-sonnet-4-6",
        },
      });
    }

    console.log("[PUT /api/config] saved successfully:", config.id);
    return NextResponse.json(config);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[PUT /api/config] ERROR:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
