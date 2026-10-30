import { NextRequest, NextResponse } from "next/server";
import { getCampaign } from "@/lib/db/store";
import { campaignMarkdown, plainText, type TemplateKey } from "@/lib/format";

type RouteContext = { params: Promise<{ id: string }> };
const templateKeys = new Set(["blog", "linkedin", "xThread", "instagram", "metaAds", "googleAds", "imageConcept"]);

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const campaign = await getCampaign(id, request.nextUrl.searchParams.get("organizationId") ?? "sukoon-studio");
    const deliverable = request.nextUrl.searchParams.get("deliverable");
    const single = deliverable && templateKeys.has(deliverable) ? deliverable as TemplateKey : null;
    const content = single ? plainText(single, campaign.deliverables) : campaignMarkdown(campaign);
    const filename = single ? `${campaign.id}-${single}.txt` : `${campaign.id}.md`;
    return new NextResponse(content, {
      headers: {
        "Content-Type": single ? "text/plain; charset=utf-8" : "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not export campaign." }, { status: 404 });
  }
}
