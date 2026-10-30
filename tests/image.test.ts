import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { buildImagePrompt, ideogramAspectRatio, generateCampaignImage, generatedDir, parseRatio } from "../src/lib/ai/image";

const concept = {
  title: "Evening calm", rationale: "A quiet routine supports the campaign's focus on winding down.",
  audience: "Urban professionals", visualDirection: "A woman closing her laptop after work",
  composition: "She sits beside a window in a softly lit home", palette: "Sage and off-white",
  aspectRatio: "4:5", placement: "Instagram", altText: "alt",
};
const campaign = {
  id: "test-campaign", topic: "Calm evenings for busy professionals", objective: "Engagement",
  audience: "Urban professionals seeking a gentler evening routine",
  brandSnapshot: {
    name: "Sukoon Studio", industry: "wellness", services: "guided meditation",
    voice: "warm and grounded", colors: "green",
  },
  deliverables: { imageConcept: concept },
} as unknown as Parameters<typeof generateCampaignImage>[0];

beforeEach(() => {
  vi.stubEnv("IDEOGRAM_API_KEY", "test-key");
  vi.stubEnv("IMAGE_API_KEY", "");
  vi.stubEnv("IMAGE_GENERATION", "on");
});
afterEach(() => vi.unstubAllEnvs());

describe("Ideogram images", () => {
  it("parses and maps aspect ratios and builds a no-text prompt", () => {
    expect(parseRatio("Portrait 9 x 16")).toEqual([9, 16]);
    expect(parseRatio("whatever")).toEqual([1, 1]);
    expect(ideogramAspectRatio("4:5")).toBe("4x5");
    expect(ideogramAspectRatio("1.91:1")).toBe("2x1");
    const prompt = buildImagePrompt(concept, {
      topic: "Unwinding after work",
      objective: "Engagement",
      audience: "Busy professionals",
      brandName: "Sukoon Studio",
      industry: "wellness",
      services: "guided meditation",
      voice: "warm and grounded",
      palette: "green",
    });
    expect(prompt).toContain("Unwinding after work");
    expect(prompt).toContain("closing her laptop");
    expect(prompt).toContain("Busy professionals");
    expect(prompt).toContain("Sukoon Studio");
    expect(prompt).toContain("Do not add text");
    const longPrompt = buildImagePrompt(concept, {
      topic: "topic ".repeat(1000),
      objective: "Engagement",
      audience: "Busy professionals",
      brandName: "Sukoon Studio",
      industry: "wellness",
      services: "guided meditation",
      voice: "warm and grounded",
      palette: "green",
    });
    expect(longPrompt.length).toBeLessThanOrEqual(1800);
    expect(longPrompt.endsWith("Do not add text, letters, logos, or a watermark.")).toBe(true);
  });

  it("authenticates, sends the image prompt, and saves the downloaded image", async () => {
    const bytes = Buffer.from("test image bytes");
    let calls = 0;
    const result = await generateCampaignImage(campaign, async (url, init) => {
      calls += 1;
      if (calls === 1) {
        expect(String(url)).toBe("https://api.ideogram.ai/v2/image/generate/auto");
        expect(init?.method).toBe("POST");
        expect(init?.headers).toMatchObject({ "Api-Key": "test-key" });
        const form = init?.body;
        expect(form).toBeInstanceOf(FormData);
        if (!(form instanceof FormData)) throw new Error("Expected Ideogram request body to be multipart form data.");
        expect(form.get("prompt")).toContain("Do not add text");
        expect(String(form.get("prompt"))).toContain("guided meditation");
        expect(form.get("aspect_ratio")).toBe("4x5");
        expect(form.get("num_images")).toBe("1");
        expect(form.get("seed")).toBeTruthy();
        return Response.json({ data: [{ is_image_safe: true, url: "https://images.ideogram.ai/test.png" }] });
      }
      expect(String(url)).toBe("https://images.ideogram.ai/test.png");
      expect(init?.headers).toMatchObject({ Accept: "image/*" });
      return new Response(bytes, { headers: { "content-type": "image/png" } });
    });
    expect(result.status).toBe("generated");
    expect(calls).toBe(2);
    expect(result.url).toMatch(/^\/api\/images\/test-campaign-\d+\.png$/);
    const file = path.join(generatedDir, path.basename(result.url!));
    try { expect(await readFile(file)).toEqual(bytes); } finally { await unlink(file); }
  });

  it("requires a key, supports the shared fallback, and skips when disabled", async () => {
    const fetcher = vi.fn<typeof fetch>();
    vi.stubEnv("IDEOGRAM_API_KEY", "");
    vi.stubEnv("IMAGE_API_KEY", "");
    await expect(generateCampaignImage(campaign, fetcher)).rejects.toThrow("Set IDEOGRAM_API_KEY");
    expect(fetcher).not.toHaveBeenCalled();
    vi.stubEnv("IMAGE_API_KEY", "fallback-key");
    await expect(generateCampaignImage(campaign, async (_url, init) => {
      expect(init?.headers).toMatchObject({ "Api-Key": "fallback-key" });
      return new Response(null, { status: 403 });
    })).rejects.toThrow("Ideogram rejected");
    vi.stubEnv("IMAGE_GENERATION", "off");
    expect((await generateCampaignImage(campaign, fetcher)).status).toBe("unavailable");
  });

  it("reports quota, authentication, unsafe output, and network failures", async () => {
    await expect(generateCampaignImage(campaign, async () => new Response(null, { status: 429, headers: { "retry-after": "30" } }))).rejects.toThrow(/rate limit.*30s/);
    await expect(generateCampaignImage(campaign, async () => new Response(null, { status: 403 }))).rejects.toThrow(/Check IDEOGRAM_API_KEY/);
    await expect(generateCampaignImage(campaign, async () => Response.json({ data: [{ is_image_safe: false }] }))).rejects.toThrow(/no safe image/);
    await expect(generateCampaignImage(campaign, async () => { throw new TypeError("fetch failed", { cause: new Error("ENOTFOUND") }); })).rejects.toThrow(/Could not reach Ideogram \(ENOTFOUND\)/);
  });
});
