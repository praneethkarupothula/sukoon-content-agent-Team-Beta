import { languageLabel } from "@/lib/languages";
import type { Campaign, Deliverables } from "@/lib/validation/schema";

export type TemplateKey = Exclude<keyof Deliverables, "image">;

/** Platform-ready plain text for copying a whole deliverable. */
export function plainText(key: TemplateKey, deliverables: Deliverables) {
  const d = deliverables;
  switch (key) {
    case "blog":
      return `${d.blog.title}\n\n${d.blog.excerpt}\n\n${d.blog.article}\n\n${d.blog.callToAction}${d.blog.references.length ? `\n\nReferences:\n${d.blog.references.map((ref) => `- ${ref}`).join("\n")}` : ""}`;
    case "linkedin":
      return d.linkedin.text;
    case "xThread":
      return d.xThread.posts.map((post, index) => `${post} ${index + 1}/${d.xThread.posts.length}`).join("\n\n---\n\n");
    case "instagram":
      return `${d.instagram.caption}\n\n${d.instagram.hashtags.join(" ")}`;
    case "metaAds":
      return d.metaAds.map((ad, index) => `Variation ${index + 1}\nPrimary text: ${ad.primaryText}\nHeadline: ${ad.headline}\nDescription: ${ad.description}\nCTA button: ${ad.callToAction}`).join("\n\n");
    case "googleAds":
      return d.googleAds.map((ad, index) => `Asset set ${index + 1}\nHeadlines:\n${ad.headlines.map((h) => `- ${h}`).join("\n")}\nDescriptions:\n${ad.descriptions.map((x) => `- ${x}`).join("\n")}\nDisplay path: ${ad.displayPath}`).join("\n\n");
    case "imageConcept": {
      const c = d.imageConcept;
      return `${c.title}\nRationale: ${c.rationale}\nAudience: ${c.audience}\nVisual direction: ${c.visualDirection}\nComposition: ${c.composition}\nPalette: ${c.palette}\nAspect ratio: ${c.aspectRatio}\nPlacement: ${c.placement}\nAlt text: ${c.altText}`;
    }
  }
}

/** A readable Markdown brief of the whole pack (one section per platform template). */
export function campaignMarkdown(campaign: Campaign) {
  const d = campaign.deliverables;
  const lang = campaign.languages;
  return [
    `# ${campaign.name}`,
    `**Topic:** ${campaign.topic}  \n**Objective:** ${campaign.objective}  \n**Status:** ${campaign.status}`,
    `## Research\n\n${campaign.research.summary}\n\n${campaign.research.sources.map((s) => `- [${s.title}](${s.url}) — ${s.kind}`).join("\n") || "No sources retrieved."}`,
    `## Blog post · ${languageLabel(lang.blog)}\n\n${plainText("blog", d)}`,
    `## LinkedIn · ${languageLabel(lang.linkedin)}\n\n${plainText("linkedin", d)}`,
    `## X thread · ${languageLabel(lang.xThread)}\n\n${d.xThread.posts.map((post, i) => `**${i + 1}/${d.xThread.posts.length}** ${post}`).join("\n\n")}`,
    `## Instagram · ${languageLabel(lang.instagram)}\n\n${plainText("instagram", d)}`,
    `## Meta ads · ${languageLabel(lang.metaAds)}\n\n${d.metaAds.map((ad, i) => `### Variation ${i + 1}\n\n${ad.primaryText}\n\n**Headline:** ${ad.headline}  \n**Description:** ${ad.description}  \n**CTA:** ${ad.callToAction}`).join("\n\n")}`,
    `## Google ads · ${languageLabel(lang.googleAds)}\n\n${d.googleAds.map((ad, i) => `### Asset set ${i + 1}\n\n**Headlines:**\n${ad.headlines.map((h) => `- ${h}`).join("\n")}\n\n**Descriptions:**\n${ad.descriptions.map((x) => `- ${x}`).join("\n")}\n\n**Path:** ${ad.displayPath}`).join("\n\n")}`,
    `## Image concept\n\n${plainText("imageConcept", d)}\n\n**Image status:** ${d.image.status} — ${d.image.message}`,
    `## Quality checks\n\n${campaign.validationResults.map((v) => `- ${v.valid ? "✅" : "⚠️"} **${v.label}:** ${v.detail}`).join("\n") || "- Not run."}`,
    `## Warnings\n\n${campaign.warnings.map((w) => `- ${w}`).join("\n") || "- None recorded."}`,
  ].join("\n\n");
}
