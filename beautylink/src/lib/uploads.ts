import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Prototype image storage on local disk (data/uploads). In production, swap
 * `saveUpload` for Supabase Storage / S3 — callers only rely on the returned URL.
 */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const UPLOAD_NAME = /^[a-f0-9-]{36}\.(jpg|png|webp)$/;

const dir = () => process.env.UPLOAD_DIR || path.join(process.cwd(), "data", "uploads");
export const uploadPath = (name: string) => path.join(/*turbopackIgnore: true*/ dir(), name);

/** Detects the real file type from its first bytes. SVG and anything else is rejected. */
function sniff(bytes: Uint8Array): "jpg" | "png" | "webp" | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  const ascii = (a: number, b: number) => String.fromCharCode(...bytes.slice(a, b));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  return null;
}

export type UploadResult = { ok: true; url: string } | { ok: false; error: string };

export async function saveUpload(file: File): Promise<UploadResult> {
  if (file.size === 0) return { ok: false, error: "The selected file is empty." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "Images must be 5 MB or smaller." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = sniff(bytes);
  if (!ext) return { ok: false, error: "Please upload a JPG, PNG or WebP image." };
  const name = `${randomUUID()}.${ext}`;
  await fs.mkdir(dir(), { recursive: true });
  await fs.writeFile(uploadPath(name), bytes);
  return { ok: true, url: `/api/uploads/${name}` };
}

/** True when a FormData entry is a real, non-empty file. */
export const isFile = (v: FormDataEntryValue | null): v is File => typeof v === "object" && v !== null && v.size > 0;
