import { createGoogleGenerativeAI } from "@ai-sdk/google";

export const defaultTextModel = "gemini-3.8-flash";

/** Gemini API key from GEMINI_API_KEY (preferred) or GOOGLE_GENERATIVE_AI_API_KEY. */
export function textApiKey() {
  return (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "").trim();
}

export function requireTextModel() {
  const apiKey = textApiKey();
  if (!apiKey) throw new Error("Set GEMINI_API_KEY in .env.local (get one at aistudio.google.com) and restart the dev server.");
  const google = createGoogleGenerativeAI({ apiKey });
  return google(process.env.GEMINI_MODEL?.trim() || defaultTextModel);
}
