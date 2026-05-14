import OpenAI from "openai";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ProviderOptions {
  aiProvider?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  groqApiKey?: string;
  groqModel?: string;
}

export async function generateResponse(
  messages: ChatMessage[],
  systemPrompt: string,
  temperature: number,
  maxTokens: number,
  providerOpts?: ProviderOptions
): Promise<{ content: string; tokens: number }> {
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

  const allMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  const response = await client.chat.completions.create({
    model,
    messages: allMessages,
    temperature,
    max_tokens: maxTokens,
  });

  const content = response.choices[0]?.message?.content ?? "";
  const tokens = response.usage?.total_tokens ?? 0;

  return { content, tokens };
}
