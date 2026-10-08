import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { dataDirectory } from "@/lib/editorial-account.mjs";
import {
  getSession,
  assertSameOrigin,
  readLimitedBody,
} from "@/lib/editorial-auth";
export async function POST(request) {
  if (!(await getSession()))
    return NextResponse.json(
      { error: "ログインしてください。" },
      { status: 401 },
    );
  try {
    assertSameOrigin(request);
    const form = await new Response(
      await readLimitedBody(request, 6 * 1024 * 1024),
      {
        headers: { "Content-Type": request.headers.get("content-type") || "" },
      },
    ).formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size > 5 * 1024 * 1024)
      return NextResponse.json(
        { error: "5MB以内のJPEG・PNG・WebPを選択してください。" },
        { status: 400 },
      );
    const bytes = Buffer.from(await file.arrayBuffer());
    let extension;
    if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])))
      extension = "jpg";
    if (
      bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    )
      extension = "png";
    if (
      bytes.subarray(0, 4).toString() === "RIFF" &&
      bytes.subarray(8, 12).toString() === "WEBP"
    )
      extension = "webp";
    if (!extension)
      return NextResponse.json(
        { error: "JPEG・PNG・WebP形式の画像を選択してください。" },
        { status: 400 },
      );
    const processed = await sharp(bytes, { limitInputPixels: 40000000 })
      .rotate()
      .resize({
        width: 1800,
        height: 2400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
    const name = `${randomUUID()}.webp`;
    await mkdir(path.join(dataDirectory(), "uploads"), {
      recursive: true,
      mode: 0o700,
    });
    await writeFile(path.join(dataDirectory(), "uploads", name), processed, {
      mode: 0o600,
    });
    return NextResponse.json({ url: `/media/${name}` });
  } catch (error) {
    return NextResponse.json(
      {
        error: error.status
          ? error.message
          : "画像をアップロードできませんでした。",
      },
      { status: error.status || 400 },
    );
  }
}
