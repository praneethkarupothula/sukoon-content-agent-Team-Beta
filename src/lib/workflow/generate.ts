import { generateObject } from "ai";
import { randomUUID } from "node:crypto";
import { generateCampaignImage } from "@/lib/ai/image";
import { requireTextModel } from "@/lib/ai/provider";
import { contentSystemPrompt, languageBrief } from "@/lib/ai/prompts";
import { defaultChannelLanguages, type ChannelLanguages } from "@/lib/languages";
import { researchTopic, researchText } from "@/lib/research";
import { getCampaign, saveCampaign, getOrganization } from "@/lib/db/store";
import { runQualityChecks } from "@/lib/validation/quality";
import { contentSchema, generatedPackSchema, validatePlatformLimits, type Campaign } from "@/lib/validation/schema";

const activeCampaigns = new Set<string>();

function emptyDeliverables() {
  const pending = "Not generated yet.";
  return contentSchema.parse({
    blog: { title: pending, excerpt: pending, article: pending, callToAction: pending, references: [] },
    linkedin: { text: pending },
    xThread: { posts: [pending, pending] },
    instagram: { caption: pending, hashtags: [] },
    metaAds: Array.from({ length: 3 }, () => ({
      primaryText: pending,
      headline: pending,
      description: pending,
      callToAction: pending,
    })),
    googleAds: Array.from({ length: 3 }, () => ({
      headlines: [pending, pending, pending],
      descriptions: [pending, pending],
      displayPath: pending,
    })),
    imageConcept: {
      title: pending,
      rationale: pending,
      audience: pending,
      visualDirection: pending,
      composition: pending,
      palette: pending,
      aspectRatio: pending,
      placement: pending,
      altText: pending,
    },
    image: { status: "not-requested", message: pending },
  });
}

export async function runCampaign(input: {
  id?: string;
  organizationId: string;
  name: string;
  topic: string;
  objective: Campaign["objective"];
  audience: string;
  instructions: string;
  languages?: ChannelLanguages;
  topicOnly?: boolean;
}) {
  const model = requireTextModel();
  const id = input.id ?? randomUUID();
  if (activeCampaigns.has(id)) throw new Error("This campaign is already being processed.");
  activeCampaigns.add(id);
  try {
    const previous = input.id ? await getCampaign(input.id, input.organizationId) : null;
    const brand = previous?.brandSnapshot ?? await getOrganization(input.organizationId);
    const now = new Date().toISOString();
    const campaign: Campaign = previous ? {
      ...previous,
      name: input.name.trim() || previous.name,
      topic: input.topic,
      objective: input.objective,
      audience: input.audience || previous.audience || brand.audience,
      instructions: input.instructions,
      languages: input.languages ?? previous.languages,
      status: "Researching",
      stage: "research",
      warnings: [],
      updatedAt: now,
    } : {
      id,
      organizationId: input.organizationId,
      name: input.name.trim() || input.topic.slice(0, 60),
      topic: input.topic,
      objective: input.objective,
      audience: input.audience || brand.audience,
      instructions: input.instructions,
      languages: input.languages ?? defaultChannelLanguages,
      status: "Researching",
      stage: "research",
      research: { summary: "Research has not completed.", status: "failed", facts: [], sources: [], limitations: [] },
      deliverables: emptyDeliverables(),
      brandSnapshot: brand,
      createdAt: now,
      updatedAt: now,
      validationResults: [],
      warnings: [],
    };
    await saveCampaign(campaign);

    campaign.research = input.topicOnly
      ? { summary: "Topic-only mode selected by the user. No web sources were retrieved.", status: "topic-only", facts: [], sources: [], limitations: ["No evidence was available to verify claims. Keep copy general and review it before publishing."] }
      : await researchTopic(campaign.topic, brand.website);
    campaign.status = "Generating";
    campaign.stage = "content";
    await saveCampaign(campaign);
    const prompt = `Campaign topic: ${campaign.topic}\nObjective: ${campaign.objective}\nAudience: ${campaign.audience}\nAdditional instructions: ${campaign.instructions || "None"}\n\n${languageBrief(campaign.languages)}\n\nResearch brief:\n${researchText(campaign.research)}`;
    const generated = await generateObject({
      model,
      schema: generatedPackSchema,
      system: contentSystemPrompt(brand),
      prompt,
      maxRetries: 2,
    });
    campaign.deliverables = contentSchema.parse({ ...generated.object, image: { status: "not-requested", message: "Image not generated yet." } });
    campaign.stage = "image";
    await saveCampaign(campaign);
    try {
      campaign.deliverables.image = await generateCampaignImage(campaign);
    } catch (error) {
      campaign.deliverables.image = { status: "failed", message: error instanceof Error ? error.message : "Image generation failed." };
      campaign.warnings.push("Image generation failed; the content pack is available for review and the image can be retried.");
    }
    const limitIssues = validatePlatformLimits(campaign.deliverables);
    campaign.validationResults = runQualityChecks(campaign.deliverables, campaign.research, campaign.languages);
    if (limitIssues.length) campaign.warnings.push(...limitIssues);
    campaign.status = "Ready for Review";
    campaign.stage = "review";
    campaign.updatedAt = new Date().toISOString();
    return await saveCampaign(campaign);
  } catch (error) {
    try {
      const failed = await getCampaign(id, input.organizationId);
      failed.status = "Failed";
      failed.stage = failed.research.status === "failed" ? "research" : failed.stage;
      failed.warnings.push(error instanceof Error ? error.message : "The workflow failed.");
      failed.updatedAt = new Date().toISOString();
      await saveCampaign(failed);
    } catch {
      // The original workflow error remains the useful error if persistence also fails.
    }
    throw error;
  } finally {
    activeCampaigns.delete(id);
  }
}
