import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export function storageMode() {
  const mode = process.env.LUMINOUS_STORAGE;
  if (mode && !["local", "supabase"].includes(mode))
    throw storageError("LUMINOUS_STORAGE の設定を確認してください。");
  if (
    mode === "supabase" ||
    (!mode &&
      (process.env.SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_SECRET_KEY))
  )
    return "supabase";
  if (process.env.VERCEL === "1") return "unconfigured";
  return "local";
}
export const dataDirectory = () =>
  path.resolve(
    /* turbopackIgnore: true */
    process.env.LUMINOUS_DATA_DIR || path.join(process.cwd(), ".luminous"),
  );
export function storageError(message, status = 503) {
  const error = new Error(message);
  error.status = status;
  return error;
}
export function createSupabaseStorage({
  url,
  key,
  bucket = "luminous-media",
  fetcher = fetch,
}) {
  let endpoint;
  try {
    endpoint = new URL(url);
  } catch {
    throw storageError("Supabase のプロジェクトURLを設定してください。");
  }
  if (
    endpoint.protocol !== "https:" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.pathname !== "/" ||
    endpoint.search ||
    endpoint.hash ||
    !key
  )
    throw storageError(
      "Supabase のプロジェクトURLとサーバー用APIキーを確認してください。",
    );
  if (!/^[a-z0-9-]+$/.test(bucket))
    throw storageError("画像バケット名の設定を確認してください。");
  async function request(route, options = {}, missingMedia = false) {
    let response;
    try {
      response = await fetcher(`${endpoint.origin}${route}`, {
        ...options,
        headers: {
          apikey: key,
          ...(key.startsWith("sb_secret_")
            ? {}
            : { Authorization: `Bearer ${key}` }),
          ...options.headers,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      throw storageError(
        "保存先に接続できません。Supabase の状態と設定を確認してください。",
      );
    }
    if (!response.ok && missingMedia) {
      const detail = await response
        .clone()
        .json()
        .catch(() => ({}));
      if (response.status === 404 || String(detail.statusCode) === "404")
        return new Response(null, { status: 404 });
    }
    if (!response.ok && response.status !== 404)
      throw storageError(
        "保存先へのアクセスに失敗しました。Supabase のSQL・バケット・APIキーの設定を確認してください。",
      );
    return response;
  }
  function documentName(name) {
    if (!["content", "account"].includes(name))
      throw new Error("Invalid document name");
    return name;
  }
  function mediaName(name) {
    if (!/^[a-f0-9-]+\.(jpg|png|webp)$/.test(name))
      throw storageError("画像が見つかりません。", 404);
    return name;
  }
  return {
    async readDocument(name) {
      const response = await request(
        `/rest/v1/luminous_documents?key=eq.${documentName(name)}&select=document,version`,
      );
      if (!response.ok)
        throw storageError("Supabase の初期設定SQLを実行してください。");
      const rows = await response.json();
      if (!Array.isArray(rows))
        throw storageError("保存先の応答を確認してください。");
      return rows[0]
        ? { data: rows[0].document, version: rows[0].version }
        : { data: null, version: 0 };
    },
    async writeDocument(name, data, version) {
      const response = await request("/rest/v1/rpc/luminous_save_document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          p_key: documentName(name),
          p_document: data,
          p_expected_version: version,
        }),
      });
      if (!response.ok)
        throw storageError("Supabase の初期設定SQLを実行してください。");
      const rows = await response.json();
      if (!Array.isArray(rows) || !rows.length)
        throw storageError(
          "別の画面で更新されています。再読み込みして内容を確認してください。",
          409,
        );
      return rows[0].version;
    },
    async readMedia(name) {
      const response = await request(
        `/storage/v1/object/authenticated/${bucket}/${mediaName(name)}`,
        {},
        true,
      );
      if (response.status === 404) return null;
      return Buffer.from(await response.arrayBuffer());
    },
    async writeMedia(name, bytes) {
      const types = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };
      const response = await request(
        `/storage/v1/object/${bucket}/${mediaName(name)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": types[name.split(".").pop()],
            "x-upsert": "false",
          },
          body: bytes,
        },
      );
      if (!response.ok)
        throw storageError("Supabase の画像バケットを作成してください。");
    },
  };
}
export function cloudStorage() {
  return createSupabaseStorage({
    url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    key:
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY,
    bucket: process.env.SUPABASE_STORAGE_BUCKET || "luminous-media",
  });
}
export async function readDocument(name) {
  const mode = storageMode();
  if (mode === "supabase") return cloudStorage().readDocument(name);
  if (mode === "unconfigured") return { data: null, version: 0 };
  try {
    return {
      data: JSON.parse(
        await readFile(path.join(dataDirectory(), `${name}.json`), "utf8"),
      ),
      version: 0,
    };
  } catch (error) {
    if (error.code === "ENOENT") return { data: null, version: 0 };
    throw error;
  }
}
export async function writeDocument(name, data, version) {
  const mode = storageMode();
  if (mode === "supabase")
    return cloudStorage().writeDocument(name, data, version);
  if (mode === "unconfigured")
    throw storageError(
      "Vercel の保存先が未設定です。Supabase に接続して編集データを移行してください。",
    );
  await mkdir(dataDirectory(), { recursive: true, mode: 0o700 });
  const target = path.join(dataDirectory(), `${name}.json`);
  const temporary = `${target}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(data), { mode: 0o600 });
  await rename(temporary, target);
}
export async function readMedia(name) {
  const mode = storageMode();
  if (mode === "supabase") return cloudStorage().readMedia(name);
  if (mode === "unconfigured") return null;
  try {
    return await readFile(path.join(dataDirectory(), "uploads", name));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}
export async function writeMedia(name, bytes) {
  const mode = storageMode();
  if (mode === "supabase") return cloudStorage().writeMedia(name, bytes);
  if (mode === "unconfigured")
    throw storageError("Vercel の画像保存先が未設定です。");
  await mkdir(path.join(dataDirectory(), "uploads"), {
    recursive: true,
    mode: 0o700,
  });
  await writeFile(path.join(dataDirectory(), "uploads", name), bytes, {
    mode: 0o600,
  });
}
