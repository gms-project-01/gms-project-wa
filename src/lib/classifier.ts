import OpenAI from "openai";

export interface Classification {
  register: boolean;
  category: string;
  title: string;
}

const CATEGORIES = [
  "requisicao",
  "anotacao",
  "problema",
  "solucao",
  "feedback",
  "duvida",
  "tarefa",
  "outro",
] as const;

const SYSTEM_PROMPT = `Você é um classificador de mensagens do WhatsApp. Analise a mensagem e responda APENAS com JSON válido, sem markdown.

Categorias:
- requisicao: pedidos, solicitações, demandas
- anotacao: notas, lembretes, registros, informações para guardar
- problema: erros, bugs, falhas, reclamações, situações negativas
- solucao: respostas a problemas, correções, instruções
- feedback: opiniões, avaliações, sugestões de melhoria
- duvida: perguntas, questionamentos
- tarefa: atividades a executar, to-dos, lembretes de ação ("ligar para X", "enviar Y", "verificar Z")
- outro: saudações isoladas, confirmações sem conteúdo ("ok", "certo", "sim", "não", "obrigado")

Regra: use register=false SOMENTE quando a mensagem for "outro" (saudações ou confirmações vazias). Qualquer mensagem com conteúdo real deve ter register=true.

Responda com:
{"register": true, "category": "<categoria>", "title": "<título descritivo em até 60 caracteres>"}
ou
{"register": false, "category": "outro", "title": ""}`;

const NON_TRIVIAL_CATEGORIES = new Set([
  "requisicao", "anotacao", "problema", "solucao", "feedback", "duvida", "tarefa",
]);

interface ProviderOptions {
  aiProvider?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  groqApiKey?: string;
  groqModel?: string;
}

export async function classifyMessage(
  text: string,
  providerOpts?: ProviderOptions
): Promise<Classification | null> {
  try {
    const provider = providerOpts?.aiProvider ?? "openai";
    let client: OpenAI;
    let model: string;

    if (provider === "groq") {
      client = new OpenAI({
        baseURL: "https://api.groq.com/openai/v1",
        apiKey: providerOpts?.groqApiKey ?? "",
      });
      model = providerOpts?.groqModel ?? "llama-3.3-70b-versatile";
    } else {
      client = new OpenAI({
        apiKey: providerOpts?.openaiApiKey || process.env.OPENAI_API_KEY,
      });
      model = providerOpts?.openaiModel ?? "gpt-4.1-mini";
    }

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      temperature: 0,
      max_tokens: 120,
    });

    const raw = response.choices[0]?.message?.content ?? "";
    console.log("[classifier] raw response:", raw.slice(0, 200));

    // Strip markdown code blocks if present
    const clean = raw.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(clean) as Classification;

    // Fallback: if AI says register=false but picked a real category, force register=true
    if (!parsed.register && NON_TRIVIAL_CATEGORIES.has(parsed.category)) {
      parsed.register = true;
    }

    console.log("[classifier] parsed:", JSON.stringify(parsed));
    return parsed;
  } catch (err) {
    console.error("[classifier] error:", err instanceof Error ? err.message : String(err));
    return null;
  }
}
