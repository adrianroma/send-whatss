import OpenAI from "openai";

// OpenAI SDK pointed at DeepSeek's OpenAI-compatible API.
let client: OpenAI | null = null;

export function getAiClient(): OpenAI {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY no está configurada");

  client ??= new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    defaultHeaders: process.env.DEEPSEEK_TRACKING_ID
      ? { "X-Tracking-Id": process.env.DEEPSEEK_TRACKING_ID }
      : undefined,
  });
  return client;
}

export const AI_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

export function getAiConfig() {
  const apiKey = process.env.DEEPSEEK_API_KEY ?? "";
  return {
    baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    model: AI_MODEL,
    trackingId: process.env.DEEPSEEK_TRACKING_ID || "",
    hasKey: Boolean(apiKey),
    maskedKey: apiKey ? `${apiKey.slice(0, 5)}…${apiKey.slice(-4)}` : "No configurado",
  };
}
