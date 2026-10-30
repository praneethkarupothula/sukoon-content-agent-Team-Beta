import { describe, expect, it } from "vitest";
import { buildImagePrompt, imageSize, parseRatio, pollinationsUrl } from "../src/lib/ai/image";

const concept = {
  title: "Evening calm", rationale: "r", audience: "a", visualDirection: "Warm editorial photography",
  composition: "Person by a window", palette: "Sage and off-white", aspectRatio: "4:5", placement: "Instagram", altText: "alt",
};

describe("pollinations image helpers", () => {
  it("parses aspect ratios and falls back to square", () => {
    expect(parseRatio("4:5")).toEqual([4, 5]);
    expect(parseRatio("Portrait 9 x 16")).toEqual([9, 16]);
    expect(parseRatio("whatever")).toEqual([1, 1]);
  });

  it("keeps free-tier sizes within 768×768 area", () => {
    const size = imageSize("4:5", 768 * 768);
    expect(size.width * size.height).toBeLessThanOrEqual(768 * 768);
    expect(size.width / size.height).toBeCloseTo(0.8, 1);
  });

  it("builds a no-text prompt and correct endpoints", () => {
    const prompt = buildImagePrompt(concept, "green", "Unwinding after work");
    expect(prompt).toContain("No text");
    const free = pollinationsUrl(prompt, { width: 688, height: 860, seed: 1, model: "flux", keyed: false });
    expect(free.startsWith("https://image.pollinations.ai/prompt/")).toBe(true);
    expect(free).not.toContain("model=");
    const keyed = pollinationsUrl(prompt, { width: 1024, height: 1280, seed: 1, model: "zimage", keyed: true });
    expect(keyed.startsWith("https://gen.pollinations.ai/image/")).toBe(true);
    expect(keyed).toContain("model=zimage");
  });
});

describe("pollinations request", () => {
  it("saves the image and returns a served URL, or a clear error", async () => {
    const { generateCampaignImage } = await import("../src/lib/ai/image");
    const campaign = {
      id: "test-campaign", topic: "Calm evenings", brandSnapshot: { colors: "green" },
      deliverables: { imageConcept: concept },
    } as unknown as Parameters<typeof generateCampaignImage>[0];
    const ok = await generateCampaignImage(campaign, async (url) => {
      expect(String(url)).toContain("image.pollinations.ai/prompt/");
      return new Response(new Uint8Array(4000), { headers: { "content-type": "image/jpeg" } });
    });
    expect(ok.status).toBe("generated");
    expect(ok.url).toMatch(/^\/api\/images\/test-campaign-\d+\.jpg$/);
    await expect(generateCampaignImage(campaign, async () => new Response("slow down", { status: 402, headers: { "retry-after": "30" } })))
      .rejects.toThrow(/rate limit.*30s/);
    await expect(generateCampaignImage(campaign, async () => { throw new TypeError("fetch failed", { cause: new Error("ENOTFOUND") }); }))
      .rejects.toThrow(/Could not reach Pollinations \(ENOTFOUND\)/);
  });
});
