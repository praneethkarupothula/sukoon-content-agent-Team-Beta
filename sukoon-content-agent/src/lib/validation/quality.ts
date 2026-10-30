import { googleAdsLanguages, languageLabel, type ChannelLanguages } from "@/lib/languages";
import {
  charCount, metaRecommended, validatePlatformLimits, type Deliverables, type Research, type ValidationResult,
} from "@/lib/validation/schema";

const placeholderPattern = /\[[^\]\n]{3,60}\]/g;

function collectText(deliverables: Deliverables) {
  return [
    deliverables.blog.title, deliverables.blog.excerpt, deliverables.blog.article, deliverables.blog.callToAction,
    deliverables.linkedin.text, ...deliverables.xThread.posts, deliverables.instagram.caption,
    ...deliverables.metaAds.flatMap((ad) => [ad.primaryText, ad.headline, ad.description]),
    ...deliverables.googleAds.flatMap((ad) => [...ad.headlines, ...ad.descriptions]),
  ].join("\n");
}

/** Deterministic quality checks shown in the review panel. */
export function runQualityChecks(deliverables: Deliverables, research: Research, languages: ChannelLanguages): ValidationResult[] {
  const issues = validatePlatformLimits(deliverables);
  const group = (prefix: string) => issues.filter((issue) => issue.startsWith(prefix));
  const result = (label: string, found: string[], ok: string): ValidationResult => ({ label, valid: found.length === 0, detail: found.join(" ") || ok });

  const metaNotes = deliverables.metaAds.flatMap((ad, index) => [
    charCount(ad.primaryText) > metaRecommended.primaryText ? `Ad ${index + 1} primary text ${charCount(ad.primaryText)}/${metaRecommended.primaryText} (may be truncated).` : "",
    charCount(ad.headline) > metaRecommended.headline ? `Ad ${index + 1} headline ${charCount(ad.headline)}/${metaRecommended.headline}.` : "",
    charCount(ad.description) > metaRecommended.description ? `Ad ${index + 1} description ${charCount(ad.description)}/${metaRecommended.description}.` : "",
  ]).filter(Boolean);

  const placeholders = [...new Set(collectText(deliverables).match(placeholderPattern) ?? [])];
  const unsupportedGoogle = !googleAdsLanguages.includes(languages.googleAds.primary) && languages.googleAds.script === "native";

  return [
    result("Google Ads limits", group("Google"), "Headlines ≤30, descriptions ≤90, display path ≤2×15 characters."),
    result("X thread limits", group("X"), "Every post is within X's 280 weighted characters."),
    result("Instagram limits", group("Instagram"), "Caption ≤2,200 characters and ≤30 hashtags."),
    result("LinkedIn limit", group("LinkedIn"), "Post is within 3,000 characters."),
    { label: "Meta ads recommended lengths", valid: metaNotes.length === 0, detail: metaNotes.join(" ") || "Primary text, headline and description fit Meta's recommended lengths." },
    {
      label: "Google Ads language support",
      valid: !unsupportedGoogle,
      detail: unsupportedGoogle
        ? `${languageLabel(languages.googleAds)} is not an official Google Ads language; ads may be limited. Consider Roman script or a supported language.`
        : `${languageLabel(languages.googleAds)} is supported for Google Ads text.`,
    },
    {
      label: "Placeholders to fill",
      valid: placeholders.length === 0,
      detail: placeholders.length ? `Replace before publishing: ${placeholders.join(", ")}` : "No unfilled placeholders.",
    },
    {
      label: "Research evidence",
      valid: research.status === "live",
      detail: research.status === "live" ? `${research.sources.length} source(s) retrieved; verify claims before publishing.` : "Topic-only generation; no live evidence was available.",
    },
  ];
}

export function limitWarnings(deliverables: Deliverables) {
  return validatePlatformLimits(deliverables);
}
