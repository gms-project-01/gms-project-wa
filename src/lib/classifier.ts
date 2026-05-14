import OpenAI from "openai";

export interface Classification {
  action: "register" | "update_status" | "query" | "none";
  // register
  category?: string;
  title?: string;
  // update_status
  itemRef?: string;
  newStatus?: "aberto" | "em_andamento" | "resolvido";
}

const SYSTEM_PROMPT = `Você é um analisador de mensagens do WhatsApp. Retorne APENAS JSON válido, sem markdown.

Classifique a mensagem em uma das 4 ações:

1. "register" — nova informação para salvar (tarefa, anotação, problema, solução, feedback, dúvida, requisição)
   Exemplos: "ligar para Luana às 18h", "temos um bug no login", "cliente pediu relatório", "anotar reunião amanhã"
   Resposta: {"action":"register","category":"<cat>","title":"<até 60 chars>"}

2. "update_status" — atualização de status de item existente
   Exemplos: "a tarefa de ligar para Luana foi concluída", "marquei o bug do login como resolvido", "estou trabalhando no relatório", "finalizei a reunião", "concluí a tarefa X"
   Resposta: {"action":"update_status","itemRef":"<título/referência do item>","newStatus":"<aberto|em_andamento|resolvido>"}

3. "query" — pergunta ou consulta sobre itens, tarefas, status ou o que está registrado (NÃO salvar)
   Exemplos: "quais tarefas estão abertas?", "existem problemas?", "o que está em andamento?", "tem alguma requisição?",
             "qual o status?", "como estão as tarefas?", "quais tarefas pendentes?", "me mostra os itens",
             "existem tarefas?", "o que tenho pra fazer?", "quais são as pendências?", "o que está aberto?",
             "tarefas pendentes", "status das tarefas", "o que tem registrado?"
   Resposta: {"action":"query"}

4. "none" — mensagem trivial sem conteúdo a registrar e que não é uma consulta
   Exemplos: "ok", "obrigado", "certo", "sim", "não", "oi", "olá", "tudo bem?", "até mais"
   Resposta: {"action":"none"}

REGRA IMPORTANTE: Qualquer mensagem que pergunta sobre tarefas, itens, status, pendências ou o que está registrado é SEMPRE "query", mesmo que curta.

Categorias válidas para register: requisicao, anotacao, problema, solucao, feedback, duvida, tarefa, outro
Status válidos para update_status: aberto, em_andamento, resolvido`;

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
      client = new OpenAI({ baseURL: "https://api.groq.com/openai/v1", apiKey: providerOpts?.groqApiKey ?? "" });
      model = providerOpts?.groqModel ?? "llama-3.3-70b-versatile";
    } else {
      client = new OpenAI({ apiKey: providerOpts?.openaiApiKey || process.env.OPENAI_API_KEY });
      model = providerOpts?.openaiModel ?? "gpt-4.1-mini";
    }

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
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
