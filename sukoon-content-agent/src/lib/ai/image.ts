import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Campaign, Deliverables } from "@/lib/validation/schema";

/**
 * Image generation via Pollinations.
 * - With POLLINATIONS_API_KEY: unified API  https://gen.pollinations.ai/image/{prompt}  (Bearer auth, all models, no logo).
 * - Without a key: free classic API         https://image.pollinations.ai/prompt/{prompt} (one image per ~45 s per IP, max 768×768 area).
 */

export const generatedDir = path.join(process.cwd(), "data", "generated");
const ratios: Record<string, [number, number]> = {
  "1:1": [1, 1], "4:5": [4, 5], "5:4": [5, 4], "9:16": [9, 16], "16:9": [16, 9], "3:2": [3, 2], "2:3": [2, 3], "1.91:1": [1.91, 1],
};

/** Parses "4:5", "4 x 5", "Portrait 4:5" etc.; falls back to 1:1. */
export function parseRatio(value: string): [number, number] {
  const match = value.match(/(\d+(?:\.\d+)?)\s*[:x×/]\s*(\d+(?:\.\d+)?)/i);
  if (match) {
    const w = Number(match[1]);
    const h = Number(match[2]);
    if (w > 0 && h > 0 && w / h <= 3 && h / w <= 3) return [w, h];
  }
  return ratios["1:1"];
}

/** Pixel size for an aspect ratio within a maximum pixel area, rounded to multiples of 16. */
export function imageSize(aspectRatio: string, maxArea: number) {
  const [w, h] = parseRatio(aspectRatio);
  const scale = Math.sqrt(maxArea / (w * h));
  const round = (n: number) => Math.max(256, Math.floor((n * scale) / 16) * 16);
  return { width: round(w), height: round(h) };
}

export function buildImagePrompt(concept: Deliverables["imageConcept"], palette: string, topic: string) {
  const prompt = [
    concept.visualDirection,
    concept.composition,
    `Mood and subject: ${concept.title}. Context: ${topic}.`,
    `Colour palette: ${concept.palette || palette}.`,
    "Calm, natural, editorial photography style, soft natural light, authentic Indian setting and people where people appear.",
    "No text, no letters, no logos, no watermark.",
  ].join(" ").replace(/\s+/g, " ").trim();
  return prompt.slice(0, 1200);
}

export function pollinationsUrl(prompt: string, options: { width: number; height: number; seed: number; model: string; keyed: boolean }) {
  const params = new URLSearchParams({
    width: String(options.width),
    height: String(options.height),
    seed: String(options.seed),
    nologo: "true",
    safe: "true",
  });
  if (options.keyed) {
    params.set("model", options.model);
    params.set("enhance", "false");
    params.set("negative_prompt", "text, words, letters, logo, watermark, distorted hands, blurry");
  }
  const base = options.keyed ? "https://gen.pollinations.ai/image/" : "https://image.pollinations.ai/prompt/";
  return `${base}${encodeURIComponent(prompt)}?${params.toString()}`;
}

type ImageResult = Deliverables["image"];

export async function generateCampaignImage(campaign: Campaign, fetchImpl: typeof fetch = fetch): Promise<ImageResult> {
  if (process.env.IMAGE_GENERATION === "off") {
    return { status: "unavailable", message: "Image generation is turned off (IMAGE_GENERATION=off). The concept is ready." };
  }
  const key = process.env.POLLINATIONS_API_KEY?.trim() ?? "";
  const keyed = key.length > 0;
  const model = process.env.POLLINATIONS_IMAGE_MODEL?.trim() || "flux";
  const concept = campaign.deliverables.imageConcept;
  const { width, height } = imageSize(concept.aspectRatio, keyed ? 1024 * 1280 : 768 * 768);
  const seed = Math.floor(Math.random() * 2_000_000_000);
  const prompt = buildImagePrompt(concept, campaign.brandSnapshot.colors, campaign.topic);
  const url = pollinationsUrl(prompt, { width, height, seed, model, keyed });

  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: keyed ? { Authorization: `Bearer ${key}`, Accept: "image/*" } : { Accept: "image/*" },
      signal: AbortSignal.timeout(120_000),
    });
  } catch (error) {
    const reason = error instanceof Error ? (error.name === "TimeoutError" ? "the request timed out after 2 minutes" : (error.cause as Error | undefined)?.message ?? error.message) : "network error";
    throw new Error(`Could not reach Pollinations (${reason}). Check your internet connection and try again.`);
  }
  const type = response.headers.get("content-type") ?? "";
  if (!response.ok || !type.startsWith("image/")) {
    const body = (await response.text().catch(() => "")).slice(0, 300);
    if (response.status === 402 || response.status === 429) {
      const retry = response.headers.get("retry-after");
      throw new Error(`Pollinations rate limit reached${retry ? `; try again in ${retry}s` : ""}. The free tier allows about one image every 45 seconds — add POLLINATIONS_API_KEY (enter.pollinations.ai) to remove the limit.`);
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Pollinations rejected the request (HTTP ${response.status}). Check POLLINATIONS_API_KEY and that your key can use model "${model}". ${body}`);
    }
    throw new Error(`Pollinations returned HTTP ${response.status}${type ? ` (${type})` : ""}. ${body}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 1000) throw new Error("Pollinations returned an empty image.");
  const extension = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
  const filename = `${campaign.id.replace(/[^a-zA-Z0-9-]/g, "")}-${seed}.${extension}`;
  await mkdir(generatedDir, { recursive: true });
  await writeFile(path.join(generatedDir, filename), buffer);

  return {
    status: "generated",
    url: `/api/images/${filename}`,
    message: `Generated with Pollinations ${keyed ? `(${model})` : "(free tier)"} · ${width}×${height} · seed ${seed}.`,
    prompt,
    seed,
  };
}
