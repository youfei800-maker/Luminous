import { NextResponse } from "next/server";
import {
  getSession,
  assertSameOrigin,
  readLimitedBody,
} from "@/lib/editorial-auth";
import { getContent, updateContent } from "@/lib/editorial-store";
export async function GET() {
  if (!(await getSession()))
    return NextResponse.json(
      { error: "ログインしてください。" },
      { status: 401 },
    );
  return NextResponse.json(await getContent(), {
    headers: { "Cache-Control": "no-store" },
  });
}
export async function PUT(request) {
  if (!(await getSession()))
    return NextResponse.json(
      { error: "ログインしてください。" },
      { status: 401 },
    );
  try {
    assertSameOrigin(request);
    const content = await updateContent(
      JSON.parse((await readLimitedBody(request)).toString("utf8")),
    );
    return NextResponse.json(content, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error.status
          ? error.message
          : "保存できませんでした。入力内容とサーバーの状態を確認してください。",
      },
      { status: error.status || 400 },
    );
  }
}
