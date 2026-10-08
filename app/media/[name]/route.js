import { readFile } from "node:fs/promises";
import path from "node:path";
import { dataDirectory } from "@/lib/editorial-account.mjs";
export async function GET(_request, { params }) {
  const { name } = await params;
  if (!/^[a-f0-9-]+\.(jpg|png|webp)$/.test(name))
    return new Response(null, { status: 404 });
  try {
    const bytes = await readFile(path.join(dataDirectory(), "uploads", name));
    const types = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };
    return new Response(bytes, {
      headers: {
        "Content-Type": types[name.split(".").pop()],
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error.code === "ENOENT") return new Response(null, { status: 404 });
    throw error;
  }
}
