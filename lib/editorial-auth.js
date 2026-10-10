import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { storageMode } from "@/lib/editorial-storage.mjs";
import { cookies } from "next/headers";
import { readAccount, verifyPassword } from "@/lib/editorial-account.mjs";

export const sessionCookie = "luminous_editorial";
export const sessionLifetime = 8 * 60 * 60;
function signature(value, secret) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}
export async function login(email, password) {
  const account = await readAccount();
  if (!account)
    return {
      error:
        storageMode() === "local"
          ? "編集者アカウントが未設定です。サーバーで npm run editorial:setup を実行してください。"
          : "公開側の編集者アカウントが未設定です。Supabaseへの接続とMacのデータ移行を完了してください。",
      status: 503,
    };
  const valid = await verifyPassword(account, password);
  if (!valid || email.trim().toLowerCase() !== account.email)
    return {
      error: "メールアドレスまたはパスワードが正しくありません。",
      status: 401,
    };
  const value = Buffer.from(
    JSON.stringify({
      email: account.email,
      expires: Date.now() + sessionLifetime * 1000,
      nonce: randomBytes(16).toString("hex"),
    }),
  ).toString("base64url");
  return { token: `${value}.${signature(value, account.secret)}` };
}
export async function getSession() {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token || token.length > 2048) return null;
  const account = await readAccount();
  if (!account) return null;
  const [value, supplied, extra] = token.split(".");
  if (!value || !supplied || extra) return null;
  const expected = Buffer.from(signature(value, account.secret));
  const actual = Buffer.from(supplied);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
    return null;
  try {
    const session = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    );
    return session.email === account.email && session.expires > Date.now()
      ? { email: session.email }
      : null;
  } catch {
    return null;
  }
}
export function assertSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    const error = new Error("このリクエストは許可されていません。");
    error.status = 403;
    throw error;
  }
}
export async function readLimitedBody(request, limit = 512 * 1024) {
  if (Number(request.headers.get("content-length") || 0) > limit) {
    const error = new Error("送信データが大きすぎます。");
    error.status = 413;
    throw error;
  }
  const reader = request.body?.getReader();
  if (!reader) throw new Error("送信内容がありません。");
  const chunks = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > limit) {
      await reader.cancel();
      const error = new Error("送信データが大きすぎます。");
      error.status = 413;
      throw error;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
