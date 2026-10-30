import { NextRequest, NextResponse } from "next/server";
import { generateCampaignImage } from "@/lib/ai/image";
import { getCampaign, saveCampaign } from "@/lib/db/store";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json() as { organizationId?: string };
    const campaign = await getCampaign(id, body.organizationId ?? "sukoon-studio");
    campaign.deliverables.image = await generateCampaignImage(campaign);
    campaign.warnings = campaign.warnings.filter((warning) => !warning.startsWith("Image generation failed"));
    campaign.updatedAt = new Date().toISOString();
    return NextResponse.json(await saveCampaign(campaign));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Image generation failed." }, { status: 400 });
  }
}
