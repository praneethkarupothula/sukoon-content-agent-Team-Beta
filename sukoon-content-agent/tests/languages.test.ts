import { describe, expect, it } from "vitest";
import { channelLanguagesSchema, languageInstruction, languageLabel, languages, defaultChannelLanguages } from "../src/lib/languages";
import { campaignInputSchema, charCount, xLength } from "../src/lib/validation/schema";

describe("languages", () => {
  it("covers English plus all 22 scheduled Indian languages", () => {
    expect(languages).toHaveLength(23);
  });

  it("labels code-mixed presets", () => {
    expect(languageLabel({ primary: "hi", mixWith: ["en"], script: "roman", mixLevel: "balanced" })).toBe("Hinglish");
    expect(languageLabel({ primary: "ta", mixWith: ["hi"], script: "native", mixLevel: "light" })).toBe("Tamil + Hindi");
  });

  it("describes mixed-script writing for the model", () => {
    const text = languageInstruction({ primary: "hi", mixWith: ["en"], script: "roman", mixLevel: "balanced" });
    expect(text).toContain("Code-mixed Hindi + English");
    expect(text).toContain("Roman (Latin) script");
  });

  it("accepts a different language per deliverable and defaults to English", () => {
    const parsed = campaignInputSchema.parse({ topic: "Sleep better", objective: "Engagement" });
    expect(parsed.languages).toEqual(defaultChannelLanguages);
    const custom = channelLanguagesSchema.parse({
      ...defaultChannelLanguages,
      instagram: { primary: "hi", mixWith: ["en"], script: "roman" },
      googleAds: { primary: "ta" },
    });
    expect(custom.instagram.mixLevel).toBe("balanced");
    expect(custom.googleAds.script).toBe("native");
  });
});

describe("character counting", () => {
  it("counts Indian scripts by code point", () => {
    expect(charCount("नमस्ते")).toBe(6);
    expect(xLength("नमस्ते")).toBe(6);
  });
  it("weights emoji as 2 on X", () => {
    expect(xLength("🙂")).toBe(2);
  });
});
