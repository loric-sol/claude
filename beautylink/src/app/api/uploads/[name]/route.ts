import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { uploadPath, UPLOAD_NAME } from "@/lib/uploads";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** Serves images uploaded through the dashboard. File names are random UUIDs. */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!UPLOAD_NAME.test(name)) return new NextResponse("Not found", { status: 404 });
  try {
    const data = await fs.readFile(uploadPath(name));
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": TYPES[name.split(".").pop()!],
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
