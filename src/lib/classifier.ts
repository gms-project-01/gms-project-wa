import OpenAI from "openai";

export interface Classification {
  action: "register" | "register_multiple" | "update_status" | "query" | "reminder" | "none";
  // register
  category?: string;
  title?: string;
  // register_multiple
  items?: Array<{ category: string; title: string }>;
  // update_status
  itemRef?: string;
  newStatus?: "aberto" | "em_andamento" | "resolvido";
  // reminder
  scheduledAt?: string; // ISO 8601, horário de Brasília
}

function buildSystemPrompt(nowBrasilia: string): string {
  return `Você é um analisador de mensagens do WhatsApp. Retorne APENAS JSON válido, sem markdown.
DATA E HORA ATUAL (Brasília, UTC-3): ${nowBrasilia}

Classifique a mensagem em uma das 6 ações:

1. "register" — UMA única informação para salvar (tarefa, anotação, problema, solução, feedback, dúvida, requisição)
   Exemplos: "ligar para Luana às 18h", "temos um bug no login", "cliente pediu relatório", "anotar reunião amanhã"
   Resposta: {"action":"register","category":"<cat>","title":"<até 60 chars>"}

2. "register_multiple" — LISTA com múltiplos itens para salvar como tarefas separadas
   Use quando a mensagem contém vários itens separados por >, -, *, números ou quebras de linha.
   Exemplos: lista de tarefas do dia, bullet points, itens numerados
   Cada item deve virar uma tarefa individual.
   Resposta: {"action":"register_multiple","items":[{"category":"<cat>","title":"<título>"},{"category":"<cat>","title":"<título>"},...]}

3. "update_status" — atualização de status de item existente
   Exemplos: "a tarefa de ligar para Luana foi concluída", "marquei o bug do login como resolvido", "finalizei a reunião", "concluí a tarefa X"
   Resposta: {"action":"update_status","itemRef":"<título/referência do item>","newStatus":"<aberto|em_andamento|resolvido>"}

4. "reminder" — pedido de lembrete em horário específico
   Exemplos: "me lembre de ligar às 09:00", "me avise sobre a reunião amanhã às 14:30", "lembrete pra hoje às 18h sobre o relatório"
   Use a DATA E HORA ATUAL para resolver "hoje", "amanhã", "essa tarde", etc.
   Retorne scheduledAt no formato "YYYY-MM-DDTHH:MM" no horário de Brasília (sem sufixo de fuso).
   Resposta: {"action":"reminder","title":"<descrição breve>","scheduledAt":"<YYYY-MM-DDTHH:MM>"}

5. "query" — pergunta ou consulta sobre itens, tarefas, status ou o que está registrado (NÃO salvar)
   Exemplos: "quais tarefas estão abertas?", "o que está em andamento?", "qual o status?", "como estão as tarefas?",
             "quais tarefas pendentes?", "o que tenho pra fazer?", "o que está aberto?", "o que tem registrado?"
   Resposta: {"action":"query"}

6. "none" — mensagem trivial sem conteúdo a registrar e que não é uma consulta
   Exemplos: "ok", "obrigado", "certo", "sim", "não", "oi", "olá", "tudo bem?", "até mais"
   Resposta: {"action":"none"}

REGRAS:
- Se a mensagem tem MÚLTIPLOS itens em lista → sempre "register_multiple", nunca "register"
- Qualquer mensagem que pergunta sobre tarefas/itens/status → sempre "query"
- Pedido de lembrete com horário → sempre "reminder"

Categorias válidas: requisicao, anotacao, problema, solucao, feedback, duvida, tarefa, outro
Status válidos para update_status: aberto, em_andamento, resolvido`;}

const SYSTEM_PROMPT = buildSystemPrompt("desconhecida");

interface ProviderOptions {
  aiProvider?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  groqApiKey?: string;
  groqModel?: string;
}

export async function classifyMessage(
  text: string,
  providerOpts?: ProviderOptions,
  nowBrasilia?: string
): Promise<Classification | null> {
  try {
    const provider = providerOpts?.aiProvider ?? "openai";
    let client: OpenAI;
    let model: string;

    if (provider === "groq") {
      client = new OpenAI({ baseURL: "https://api.groq.com/openai/v1", apiKey: providerOpts?.groqApiKey ?? "" });
      model = providerOpts?.groqModel ?? "llama-3.3-70b-versatile";
    } else {
      client = new OpenAI({ apiKey: providerOpts?.openaiApiKey || process.env.OPENAI_API_KEY });
      model = providerOpts?.openaiModel ?? "gpt-4.1-mini";
    }

    const systemPrompt = nowBrasilia ? buildSystemPrompt(nowBrasilia) : SYSTEM_PROMPT;

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0,
      max_tokens: 150,
    });

    const raw = response.choices[0]?.message?.content ?? "";
    console.log("[classifier] raw:", raw.slice(0, 200));

    const clean = raw.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(clean) as Classification;
    console.log("[classifier] parsed:", JSON.stringify(parsed));
    return parsed;
  } catch (err) {
    console.error("[classifier] error:", err instanceof Error ? err.message : String(err));
    return null;
  }
}
