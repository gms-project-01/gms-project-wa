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

const SYSTEM_PROMPT = `Você é um classificador de mensagens. Analise a mensagem e responda APENAS com JSON válido, sem markdown.

Categorias disponíveis: ${CATEGORIES.join(", ")}
- requisicao: pedidos, solicitações, demandas
- anotacao: notas, lembretes, registros
- problema: erros, bugs, falhas, situações negativas
- solucao: respostas a problemas, correções, como-fazer
- feedback: opiniões, avaliações, sugestões
- duvida: perguntas, questionamentos
- tarefa: atividades a executar, to-dos
- outro: não se encaixa nas anteriores

Responda com:
{"register": true/false, "category": "<categoria>", "title": "<título curto em até 60 caracteres>"}

Use register=false apenas para mensagens triviais como "ok", "obrigado", "sim", "não", saudações simples.`;

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
    const parsed = JSON.parse(raw) as Classification;
    return parsed;
  } catch (err) {
    console.error("[classifier] error:", err instanceof Error ? err.message : String(err));
    return null;
  }
}
