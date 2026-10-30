import { z } from "zod";
import { channelLanguagesSchema, defaultChannelLanguages } from "@/lib/languages";

export const organizationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  website: z.string(),
  industry: z.string(),
  description: z.string(),
  services: z.string(),
  audience: z.string(),
  voice: z.string(),
  messages: z.string(),
  preferences: z.string(),
  prohibited: z.string(),
  callsToAction: z.string(),
  colors: z.string(),
  version: z.number().int().positive(),
});

export const researchSchema = z.object({
  summary: z.string(),
  status: z.enum(["live", "topic-only", "failed"]),
  facts: z.array(
    z.object({
      finding: z.string(),
      evidence: z.string(),
      sourceUrl: z.string(),
      sourceTitle: z.string(),
    }),
  ),
  sources: z.array(
    z.object({
      title: z.string(),
      url: z.string().url(),
      kind: z.enum(["provided-url", "search", "official-site"]),
    }),
  ),
  limitations: z.array(z.string()),
});

export const blogSchema = z.object({
  title: z.string().min(1),
  excerpt: z.string().min(1),
  article: z.string().min(1).describe("Markdown article body using ## subheadings, short paragraphs and lists."),
  callToAction: z.string().min(1),
  references: z.array(z.string()),
});
export const linkedinSchema = z.object({ text: z.string().min(1) });
export const xThreadSchema = z.object({ posts: z.array(z.string().min(1)).min(2).max(10) });
export const instagramSchema = z.object({ caption: z.string().min(1), hashtags: z.array(z.string()).max(30) });
export const metaAdSchema = z.object({
  primaryText: z.string().min(1),
  headline: z.string().min(1),
  description: z.string().min(1),
  callToAction: z.string().min(1).describe("A Meta CTA button label such as Book Now, Learn More, Sign Up, Send WhatsApp Message."),
});
export const googleAdSchema = z.object({
  headlines: z.array(z.string().min(1)).min(3).max(15),
  descriptions: z.array(z.string().min(1)).min(2).max(4),
  displayPath: z.string().min(1).describe("Up to two path segments separated by '/', each at most 15 characters, e.g. meditation/free-class."),
});
export const imageConceptSchema = z.object({
  title: z.string().min(1),
  rationale: z.string().min(1),
  audience: z.string().min(1),
  visualDirection: z.string().min(1),
  composition: z.string().min(1),
  palette: z.string().min(1),
  aspectRatio: z.string().min(1).describe("One of 1:1, 4:5, 9:16, 16:9, 3:2, 2:3."),
  placement: z.string().min(1),
  altText: z.string().min(1),
});
export const imageSchema = z.object({
  status: z.enum(["not-requested", "generated", "unavailable", "failed"]),
  url: z.string().optional(),
  message: z.string(),
  prompt: z.string().optional(),
  seed: z.number().optional(),
});

export const contentSchema = z.object({
  blog: blogSchema,
  linkedin: linkedinSchema,
  xThread: xThreadSchema,
  instagram: instagramSchema,
  metaAds: z.array(metaAdSchema).length(3),
  googleAds: z.array(googleAdSchema).length(3),
  imageConcept: imageConceptSchema,
  image: imageSchema,
});

/** What the text model generates (image status is set by the workflow, not the model). */
export const generatedPackSchema = contentSchema.omit({ image: true });

export const validationResultSchema = z.object({ label: z.string(), valid: z.boolean(), detail: z.string() });

export const objectives = ["Brand Awareness", "Engagement", "Lead Generation", "Class Sign-ups"] as const;

export const campaignSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().min(1),
  name: z.string().min(1),
  topic: z.string().min(1),
  objective: z.enum(objectives),
  audience: z.string(),
  instructions: z.string(),
  languages: channelLanguagesSchema.default(defaultChannelLanguages),
  status: z.enum(["Draft", "Researching", "Generating", "Ready for Review", "Approved", "Failed"]),
  stage: z.enum(["research", "content", "image", "review", "approval", "complete"]),
  research: researchSchema,
  deliverables: contentSchema,
  brandSnapshot: organizationSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  approvedAt: z.string().optional(),
  validationResults: z.array(validationResultSchema),
  warnings: z.array(z.string()),
});

export const campaignInputSchema = z.object({
  organizationId: z.string().min(1).optional().default("sukoon-studio"),
  name: z.string().max(120).optional().default(""),
  topic: z.string().min(4, "Enter a topic or article URL").max(1000),
  objective: z.enum(objectives),
  audience: z.string().max(500).optional().default(""),
  instructions: z.string().max(1000).optional().default(""),
  languages: channelLanguagesSchema.optional().default(defaultChannelLanguages),
});

export const googleHeadlineLimit = 30;
export const googleDescriptionLimit = 90;
export const googlePathLimit = 15;
export const xPostLimit = 280;
export const instagramCaptionLimit = 2200;
export const instagramHashtagLimit = 30;
export const linkedinLimit = 3000;
export const metaRecommended = { primaryText: 125, headline: 40, description: 30 };

/** Characters as people see them (code points), not UTF-16 units. */
export function charCount(text: string) {
  return [...text].length;
}

/**
 * X (Twitter) weighted length: most Latin and Indic characters count 1;
 * emoji, CJK and some scripts (e.g. Ol Chiki, Meitei Mayek) count 2.
 */
export function xLength(text: string) {
  let total = 0;
  for (const char of text) {
    const cp = char.codePointAt(0) ?? 0;
    const light = cp <= 4351 || (cp >= 8192 && cp <= 8205) || (cp >= 8208 && cp <= 8223) || (cp >= 8242 && cp <= 8247);
    total += light ? 1 : 2;
  }
  return total;
}

/** Hard platform limits. Returns human-readable issues (empty when valid). */
export function validatePlatformLimits(deliverables: z.infer<typeof contentSchema>) {
  const issues: string[] = [];
  deliverables.xThread.posts.forEach((post, index) => {
    const length = xLength(post);
    if (length > xPostLimit) issues.push(`X post ${index + 1} is ${length}/${xPostLimit} characters.`);
  });
  deliverables.googleAds.forEach((ad, adIndex) => {
    ad.headlines.forEach((headline, index) => {
      const length = charCount(headline);
      if (length > googleHeadlineLimit) issues.push(`Google ad ${adIndex + 1} headline ${index + 1} is ${length}/${googleHeadlineLimit} characters.`);
    });
    ad.descriptions.forEach((description, index) => {
      const length = charCount(description);
      if (length > googleDescriptionLimit) issues.push(`Google ad ${adIndex + 1} description ${index + 1} is ${length}/${googleDescriptionLimit} characters.`);
    });
    const segments = ad.displayPath.split("/").filter(Boolean);
    if (segments.length > 2) issues.push(`Google ad ${adIndex + 1} display path has ${segments.length} segments (max 2).`);
    segments.forEach((segment, index) => {
      if (charCount(segment) > googlePathLimit) issues.push(`Google ad ${adIndex + 1} path ${index + 1} is ${charCount(segment)}/${googlePathLimit} characters.`);
    });
  });
  const caption = charCount(deliverables.instagram.caption + " " + deliverables.instagram.hashtags.join(" "));
  if (caption > instagramCaptionLimit) issues.push(`Instagram caption is ${caption}/${instagramCaptionLimit} characters.`);
  if (deliverables.instagram.hashtags.length > instagramHashtagLimit) issues.push(`Instagram has ${deliverables.instagram.hashtags.length}/${instagramHashtagLimit} hashtags.`);
  const linkedin = charCount(deliverables.linkedin.text);
  if (linkedin > linkedinLimit) issues.push(`LinkedIn post is ${linkedin}/${linkedinLimit} characters.`);
  return issues;
}

export type Organization = z.infer<typeof organizationSchema>;
export type Research = z.infer<typeof researchSchema>;
export type Deliverables = z.infer<typeof contentSchema>;
export type Campaign = z.infer<typeof campaignSchema>;
export type ValidationResult = z.infer<typeof validationResultSchema>;
