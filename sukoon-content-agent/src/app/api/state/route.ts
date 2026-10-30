import { NextResponse } from "next/server";
import { getState } from "@/lib/db/store";

export async function GET() {
  try {
    return NextResponse.json(await getState());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load workspace." }, { status: 500 });
  }
}
