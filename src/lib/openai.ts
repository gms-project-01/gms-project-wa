import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

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
  anthropicApiKey?: string;
  anthropicModel?: string;
}

export async function generateResponse(
  messages: ChatMessage[],
  systemPrompt: string,
  temperature: number,
  maxTokens: number,
  providerOpts?: ProviderOptions
): Promise<{ content: string; tokens: number }> {
  const provider = providerOpts?.aiProvider ?? "openai";

  if (provider === "anthropic") {
    const client = new Anthropic({
      apiKey: providerOpts?.anthropicApiKey || process.env.ANTHROPIC_API_KEY,
    });
    const model = providerOpts?.anthropicModel ?? "claude-sonnet-4-6";

    const anthropicMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const response = await client.messages.create({
      model,
      system: systemPrompt,
      messages: anthropicMessages,
      temperature,
      max_tokens: maxTokens,
    });

    const content = response.content[0]?.type === "text" ? response.content[0].text : "";
    const tokens = (response.usage.input_tokens ?? 0) + (response.usage.output_tokens ?? 0);
    return { content, tokens };
  }

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
