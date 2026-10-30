import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { generatedDir } from "@/lib/ai/image";

type RouteContext = { params: Promise<{ file: string }> };
const types: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { file } = await params;
  const match = file.match(/^[a-zA-Z0-9-]+\.(jpg|png|webp)$/);
  if (!match) return NextResponse.json({ error: "Invalid image name." }, { status: 400 });
  try {
    const data = await readFile(path.join(generatedDir, file));
    return new NextResponse(new Uint8Array(data), { headers: { "Content-Type": types[match[1]], "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }
}
