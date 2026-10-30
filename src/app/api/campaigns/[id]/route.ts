import { NextRequest, NextResponse } from "next/server";
import { getCampaign, saveCampaign } from "@/lib/db/store";
import { runQualityChecks } from "@/lib/validation/quality";
import { contentSchema } from "@/lib/validation/schema";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const organizationId = request.nextUrl.searchParams.get("organizationId") ?? "sukoon-studio";
    return NextResponse.json(await getCampaign(id, organizationId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load campaign." }, { status: 404 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json() as { organizationId?: string; deliverables?: unknown };
    const organizationId = body.organizationId ?? "sukoon-studio";
    const campaign = await getCampaign(id, organizationId);
    campaign.deliverables = contentSchema.parse(body.deliverables);
    campaign.validationResults = runQualityChecks(campaign.deliverables, campaign.research, campaign.languages);
    campaign.updatedAt = new Date().toISOString();
    campaign.status = campaign.status === "Approved" ? "Ready for Review" : campaign.status;
    campaign.approvedAt = undefined;
    return NextResponse.json(await saveCampaign(campaign));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save deliverables." }, { status: 400 });
  }
}
