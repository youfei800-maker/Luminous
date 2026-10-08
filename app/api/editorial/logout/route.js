import { NextResponse } from "next/server";
import { assertSameOrigin, sessionCookie } from "@/lib/editorial-auth";
export async function POST(request) {
  try {
    assertSameOrigin(request);
  } catch {
    return NextResponse.json(
      { error: "許可されていません。" },
      { status: 403 },
    );
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookie, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: new URL(request.url).protocol === "https:",
    path: "/",
    maxAge: 0,
  });
  return response;
}
