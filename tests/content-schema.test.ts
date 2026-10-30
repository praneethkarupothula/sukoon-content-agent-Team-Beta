import { describe, expect, it } from "vitest";
import {
  contentSchema, googleDescriptionLimit, googleHeadlineLimit, validatePlatformLimits, xPostLimit,
} from "../src/lib/validation/schema";

const validPack = {
  blog: { title: "A gentle start", excerpt: "Small steps.", article: "## Begin\n\nTake a moment.", callToAction: "Explore a class.", references: [] },
  linkedin: { text: "A thoughtful post." },
  xThread: { posts: ["A short first post.", "A short second post."] },
  instagram: { caption: "A gentle moment.", hashtags: ["#Meditation"] },
  metaAds: Array.from({ length: 3 }, (_, index) => ({
    primaryText: `Primary ${index + 1}`,
    headline: `Headline ${index + 1}`,
    description: "Explore online classes.",
    callToAction: "Learn More",
  })),
  googleAds: Array.from({ length: 3 }, () => ({
    headlines: ["Meditation Online", "A Gentle Start", "Explore Classes"],
    descriptions: ["Explore welcoming live online meditation classes.", "Find out more about current class details."],
    displayPath: "online/classes",
  })),
  imageConcept: {
    title: "A quiet moment",
    rationale: "A calm visual direction.",
    audience: "Meditation beginners.",
    visualDirection: "Warm editorial photography.",
    composition: "A person beside a window.",
    palette: "Sage and off-white.",
    aspectRatio: "4:5",
    placement: "Instagram feed.",
    altText: "A person sitting beside a window.",
  },
  image: { status: "unavailable" as const, message: "No image provider configured." },
};

describe("content pack validation", () => {
  it("accepts a complete content pack with all required deliverable categories", () => {
    expect(contentSchema.parse(validPack)).toEqual(validPack);
  });

  it("rejects incomplete ad sets and missing content", () => {
    expect(() => contentSchema.parse({ ...validPack, metaAds: validPack.metaAds.slice(0, 2) })).toThrow();
    expect(() => contentSchema.parse({ ...validPack, linkedin: { text: "" } })).toThrow();
  });

  it("accepts platform copy exactly at its configured character limits", () => {
    const atLimit = structuredClone(validPack);
    atLimit.xThread.posts = ["x".repeat(xPostLimit), "Within limit."];
    atLimit.googleAds[0].headlines[0] = "h".repeat(googleHeadlineLimit);
    atLimit.googleAds[0].descriptions[0] = "d".repeat(googleDescriptionLimit);
    expect(validatePlatformLimits(contentSchema.parse(atLimit))).toEqual([]);
  });

  it("reports over-limit X and Google assets with their locations", () => {
    const invalid = structuredClone(validPack);
    invalid.xThread.posts[0] = "x".repeat(xPostLimit + 1);
    invalid.googleAds[0].headlines[0] = "h".repeat(googleHeadlineLimit + 1);
    invalid.googleAds[0].descriptions[0] = "d".repeat(googleDescriptionLimit + 1);
    expect(validatePlatformLimits(contentSchema.parse(invalid))).toEqual([
      "X post 1 is 281/280 characters.",
      "Google ad 1 headline 1 is 31/30 characters.",
      "Google ad 1 description 1 is 91/90 characters.",
    ]);
  });
});
