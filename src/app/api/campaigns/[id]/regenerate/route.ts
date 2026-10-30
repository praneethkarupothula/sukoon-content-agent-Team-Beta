import { generateObject } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { contentSystemPrompt, languageBrief } from "@/lib/ai/prompts";
import { requireTextModel } from "@/lib/ai/provider";
import { getCampaign, saveCampaign } from "@/lib/db/store";
import { channelKeys, languageSettingSchema, type ChannelKey } from "@/lib/languages";
import { researchText } from "@/lib/research";
import { runQualityChecks } from "@/lib/validation/quality";
import { generatedPackSchema } from "@/lib/validation/schema";

type RouteContext = { params: Promise<{ id: string }> };
const deliverableKeys = [...channelKeys, "imageConcept"] as const;
const bodySchema = z.object({
  organizationId: z.string().optional().default("sukoon-studio"),
  deliverable: z.enum(deliverableKeys),
  language: languageSettingSchema.optional(),
  feedback: z.string().max(1000).optional().default(""),
});

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const model = requireTextModel();
    const { id } = await params;
    const body = bodySchema.parse(await request.json());
    const campaign = await getCampaign(id, body.organizationId);
    const key = body.deliverable;
    const isChannel = key !== "imageConcept";
    if (isChannel && body.language) campaign.languages[key as ChannelKey] = body.language;

    const partSchema = z.object({ [key]: generatedPackSchema.shape[key] });
    const result = await generateObject({
      model,
      schema: partSchema,
      system: contentSystemPrompt(campaign.brandSnapshot),
      prompt: [
        `Regenerate only the "${key}" deliverable for this campaign. Make it fresh and clearly better, not a light paraphrase.`,
        `Topic: ${campaign.topic}`,
        `Objective: ${campaign.objective}`,
        `Audience: ${campaign.audience}`,
        `Campaign instructions: ${campaign.instructions || "None"}`,
        body.feedback ? `Reviewer feedback to apply: ${body.feedback}` : "",
        isChannel ? languageBrief(campaign.languages, key as ChannelKey) : "Write the image concept in English.",
        `Research:\n${researchText(campaign.research)}`,
        `Other deliverables for context (keep the campaign consistent, do not copy):\n${JSON.stringify({ ...campaign.deliverables, [key]: undefined, image: undefined })}`,
      ].filter(Boolean).join("\n\n"),
      maxRetries: 2,
    });
    const regenerated = (result.object as Record<string, unknown>)[key];
    campaign.deliverables = { ...campaign.deliverables, [key]: generatedPackSchema.shape[key].parse(regenerated) };
    campaign.validationResults = runQualityChecks(campaign.deliverables, campaign.research, campaign.languages);
    campaign.updatedAt = new Date().toISOString();
    campaign.status = "Ready for Review";
    campaign.approvedAt = undefined;
    return NextResponse.json(await saveCampaign(campaign));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not regenerate deliverable." }, { status: 400 });
  }
}
