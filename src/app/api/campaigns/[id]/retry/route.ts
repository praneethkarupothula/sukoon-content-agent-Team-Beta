import { NextRequest, NextResponse } from "next/server";
import { getCampaign } from "@/lib/db/store";
import { runCampaign } from "@/lib/workflow/generate";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json() as { organizationId?: string; topicOnly?: boolean };
    const campaign = await getCampaign(id, body.organizationId ?? "sukoon-studio");
    const retried = await runCampaign({
      id: campaign.id,
      organizationId: campaign.organizationId,
      name: campaign.name,
      topic: campaign.topic,
      objective: campaign.objective,
      audience: campaign.audience,
      instructions: campaign.instructions,
      languages: campaign.languages,
      topicOnly: body.topicOnly === true,
    });
    return NextResponse.json(retried);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not retry campaign." }, { status: 400 });
  }
}
