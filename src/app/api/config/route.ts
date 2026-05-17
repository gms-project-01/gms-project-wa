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
    const { configPassword, ...fields } = body;

    // Prompt-only save — no password required
    if (configPassword === undefined) {
      let config = await prisma.agentConfig.findFirst();
      if (config) {
        config = await prisma.agentConfig.update({
          where: { id: config.id },
          data: { systemPrompt: fields.systemPrompt ?? config.systemPrompt },
        });
      } else {
        config = await prisma.agentConfig.create({
          data: { systemPrompt: fields.systemPrompt ?? "Você é um assistente prestativo e amigável." },
        });
      }
      return NextResponse.json(config);
    }

    // Full save — requires config password
    const expected = process.env.CONFIG_PASSWORD ?? process.env.ADMIN_PASSWORD;
    if (!expected || configPassword !== expected) {
      return NextResponse.json({ error: "Senha incorreta" }, { status: 403 });
    }

    console.log("[PUT /api/config] full save authorized");
    let config = await prisma.agentConfig.findFirst();
    console.log("[PUT /api/config] existing config id:", config?.id ?? "none");

    if (config) {
      config = await prisma.agentConfig.update({
        where: { id: config.id },
        data: {
          name: fields.name,
          systemPrompt: fields.systemPrompt,
          temperature: parseFloat(fields.temperature),
          maxTokens: parseInt(fields.maxTokens),
          historyLimit: parseInt(fields.historyLimit),
          enabled: Boolean(fields.enabled),
          allowedPhones: fields.allowedPhones ?? "",
          evolutionUrl: fields.evolutionUrl ?? "",
          evolutionApiKey: fields.evolutionApiKey ?? "",
          instanceId: fields.instanceId ?? "",
          aiProvider: fields.aiProvider ?? "openai",
          openaiApiKey: fields.openaiApiKey ?? "",
          openaiModel: fields.openaiModel ?? "gpt-4.1-mini",
          groqApiKey: fields.groqApiKey ?? "",
          groqModel: fields.groqModel ?? "llama-3.3-70b-versatile",
        },
      });
    } else {
      config = await prisma.agentConfig.create({
        data: {
          name: fields.name ?? "Olivia",
          systemPrompt: fields.systemPrompt ?? "",
          temperature: parseFloat(fields.temperature) || 0.7,
          maxTokens: parseInt(fields.maxTokens) || 1024,
          historyLimit: parseInt(fields.historyLimit) || 10,
          enabled: Boolean(fields.enabled ?? true),
          allowedPhones: fields.allowedPhones ?? "",
          evolutionUrl: fields.evolutionUrl ?? "",
          evolutionApiKey: fields.evolutionApiKey ?? "",
          instanceId: fields.instanceId ?? "",
          aiProvider: fields.aiProvider ?? "openai",
          openaiApiKey: fields.openaiApiKey ?? "",
          openaiModel: fields.openaiModel ?? "gpt-4.1-mini",
          groqApiKey: fields.groqApiKey ?? "",
          groqModel: fields.groqModel ?? "llama-3.3-70b-versatile",
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
