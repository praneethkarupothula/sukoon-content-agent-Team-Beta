import { NextRequest, NextResponse } from "next/server";
import { getCampaign, saveCampaign } from "@/lib/db/store";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json() as { organizationId?: string; approved?: boolean };
    const campaign = await getCampaign(id, body.organizationId ?? "sukoon-studio");
    if (!body.approved) return NextResponse.json({ error: "Explicit approval is required." }, { status: 400 });
    campaign.status = "Approved";
    campaign.stage = "complete";
    campaign.approvedAt = new Date().toISOString();
    campaign.updatedAt = campaign.approvedAt;
    return NextResponse.json(await saveCampaign(campaign));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not approve campaign." }, { status: 400 });
  }
}
