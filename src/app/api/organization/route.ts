import { NextRequest, NextResponse } from "next/server";
import { updateOrganization } from "@/lib/db/store";
import { organizationSchema } from "@/lib/validation/schema";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = typeof body.id === "string" ? body.id : "";
    const profile = { ...body };
    delete profile.id;
    delete profile.version;
    const validated = organizationSchema.omit({ id: true, version: true }).parse(profile);
    return NextResponse.json(await updateOrganization(id, validated));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save brand profile." }, { status: 400 });
  }
}
