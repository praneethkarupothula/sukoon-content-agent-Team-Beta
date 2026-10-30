import { NextRequest, NextResponse } from "next/server";
import { listCampaigns, getOrganization } from "@/lib/db/store";
import { campaignInputSchema } from "@/lib/validation/schema";
import { runCampaign } from "@/lib/workflow/generate";

export async function GET(request: NextRequest) {
  try {
    const organizationId = request.nextUrl.searchParams.get("organizationId") ?? "sukoon-studio";
    await getOrganization(organizationId);
    return NextResponse.json(await listCampaigns(organizationId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load campaigns." }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = campaignInputSchema.parse(await request.json());
    const campaign = await runCampaign({ ...input, organizationId: input.organizationId });
    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    const status = error instanceof Error && error.message.includes("already being processed") ? 409 : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Campaign generation failed." }, { status });
  }
}
