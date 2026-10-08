import { NextResponse } from "next/server";
import {
  assertSameOrigin,
  login,
  readLimitedBody,
  sessionCookie,
  sessionLifetime,
} from "@/lib/editorial-auth";
const failures = [];
export async function POST(request) {
  try {
    assertSameOrigin(request);
    while (failures.length && failures[0] < Date.now() - 60000)
      failures.shift();
    if (failures.length >= 10)
      return NextResponse.json(
        { error: "ログイン試行が多いため、1分ほど待ってからお試しください。" },
        { status: 429 },
      );
    const input = JSON.parse(
      (await readLimitedBody(request, 4096)).toString("utf8"),
    );
    if (
      typeof input.email !== "string" ||
      input.email.length > 254 ||
      typeof input.password !== "string" ||
      input.password.length > 256
    )
      return NextResponse.json(
        { error: "メールアドレスとパスワードを確認してください。" },
        { status: 400 },
      );
    const result = await login(input.email, input.password);
    if (result.error) {
      if (result.status === 401) failures.push(Date.now());
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set(sessionCookie, result.token, {
      httpOnly: true,
      sameSite: "strict",
      secure: new URL(request.url).protocol === "https:",
      path: "/",
      maxAge: sessionLifetime,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: error.status
          ? error.message
          : "ログインに失敗しました。もう一度お試しください。",
      },
      { status: error.status || 400 },
    );
  }
}
