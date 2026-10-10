import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  access,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import {
  createSupabaseStorage,
  storageMode,
  readDocument,
  writeDocument,
} from "../lib/editorial-storage.mjs";

function provider() {
  const key = "sb_secret_" + randomBytes(24).toString("hex");
  const documents = new Map(),
    media = new Map(),
    requests = [];
  async function fetcher(input, options = {}) {
    const url = new URL(input);
    const headers = new Headers(options.headers);
    requests.push({ url, headers, cache: options.cache });
    if (headers.get("apikey") !== key)
      return Response.json({ error: "unauthorized" }, { status: 401 });
    if (url.pathname === "/rest/v1/luminous_documents") {
      const name = url.searchParams.get("key").slice(3);
      const row = documents.get(name);
      return Response.json(row ? [structuredClone(row)] : []);
    }
    if (url.pathname === "/rest/v1/rpc/luminous_save_document") {
      const { p_key, p_document, p_expected_version } = JSON.parse(
        options.body,
      );
      const existing = documents.get(p_key);
      if ((existing?.version || 0) !== p_expected_version)
        return Response.json([]);
      const row = {
        document: structuredClone(p_document),
        version: p_expected_version + 1,
      };
      documents.set(p_key, row);
      return Response.json([row]);
    }
    if (
      url.pathname.startsWith(
        "/storage/v1/object/authenticated/luminous-media/",
      )
    ) {
      const bytes = media.get(url.pathname.split("/").pop());
      // Older Supabase Storage versions return HTTP 400 with statusCode "404".
      return bytes
        ? new Response(bytes)
        : Response.json(
            { statusCode: "404", error: "not_found" },
            { status: 400 },
          );
    }
    if (
      url.pathname.startsWith("/storage/v1/object/luminous-media/") &&
      options.method === "POST"
    ) {
      const name = url.pathname.split("/").pop();
      if (media.has(name))
        return Response.json({ error: "duplicate" }, { status: 409 });
      media.set(name, Buffer.from(options.body));
      return Response.json({ Key: name });
    }
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  return {
    key,
    documents,
    media,
    requests,
    fetcher,
    client: () =>
      createSupabaseStorage({
        url: "https://fixture.supabase.co",
        key,
        fetcher,
      }),
  };
}
test("共有保存は秘密キーをヘッダーだけに載せ、キャッシュせずに読み込む", async () => {
  const value = provider();
  const storage = value.client();
  assert.deepEqual(await storage.readDocument("content"), {
    data: null,
    version: 0,
  });
  assert.equal(
    await storage.writeDocument(
      "content",
      { site: { heroTitle: "Shared Bloom" } },
      0,
    ),
    1,
  );
  assert.equal(
    (await storage.readDocument("content")).data.site.heroTitle,
    "Shared Bloom",
  );
  assert.ok(
    value.requests.every(
      (request) =>
        request.cache === "no-store" &&
        request.headers.get("apikey") === value.key &&
        !request.url.href.includes(value.key),
    ),
  );
  assert.ok(
    value.requests.every((request) => !request.headers.has("authorization")),
    "新しいsecretキーをJWTとして送らない",
  );
  let authorization;
  const jwt = "test.jwt.key";
  const legacy = createSupabaseStorage({
    url: "https://fixture.supabase.co",
    key: jwt,
    fetcher: async (url, options) => {
      authorization = new Headers(options.headers).get("authorization");
      return Response.json([]);
    },
  });
  await legacy.readDocument("account");
  assert.equal(authorization, `Bearer ${jwt}`);
});
test("別インスタンスで同じ版を保存しても片方を409にし、上書きを防ぐ", async () => {
  const value = provider();
  const a = value.client(),
    b = value.client();
  await a.writeDocument("content", { title: "original" }, 0);
  const snapshot = await a.readDocument("content");
  await b.writeDocument("content", { title: "first edit" }, snapshot.version);
  await assert.rejects(
    () => a.writeDocument("content", { title: "stale edit" }, snapshot.version),
    (error) => error.status === 409,
  );
  assert.equal((await b.readDocument("content")).data.title, "first edit");
});
test("画像の保存と取得、不在画像404、重複・パストラバーサルの拒否", async () => {
  const value = provider();
  const storage = value.client();
  const name = randomUUID() + ".webp";
  const bytes = Buffer.from("test image bytes");
  assert.equal(await storage.readMedia(name), null);
  await storage.writeMedia(name, bytes);
  assert.deepEqual(await storage.readMedia(name), bytes);
  await assert.rejects(() => storage.writeMedia(name, bytes));
  await assert.rejects(
    () => storage.readMedia("../account.json"),
    (error) => error.status === 404,
  );
});
test("接続エラーは秘密や外部の応答本文を出さず、不正なURLと未設定キーを拒否する", async () => {
  const key = randomBytes(32).toString("hex");
  const storage = createSupabaseStorage({
    url: "https://fixture.supabase.co",
    key,
    fetcher: async () => Response.json({ error: key }, { status: 401 }),
  });
  await assert.rejects(
    () => storage.readDocument("account"),
    (error) => error.status === 503 && !error.message.includes(key),
  );
  for (const url of [
    "http://fixture.supabase.co",
    "https://user:password@fixture.supabase.co",
    "https://fixture.supabase.co/path",
  ])
    assert.throws(() => createSupabaseStorage({ url, key }));
  assert.throws(() =>
    createSupabaseStorage({ url: "https://fixture.supabase.co" }),
  );
});
test("未設定のVercelはローカル保存せず、接続設定が片方だけでもローカルへ戻らない", async () => {
  const names = [
    "LUMINOUS_STORAGE",
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY",
    "VERCEL",
  ];
  const previous = Object.fromEntries(
    names.map((name) => [name, process.env[name]]),
  );
  try {
    for (const name of names) delete process.env[name];
    process.env.VERCEL = "1";
    assert.equal(storageMode(), "unconfigured");
    assert.deepEqual(await readDocument("account"), { data: null, version: 0 });
    await assert.rejects(
      () => writeDocument("content", {}, 0),
      (error) => error.status === 503,
    );
    process.env.LUMINOUS_STORAGE = "local";
    assert.equal(storageMode(), "unconfigured");
    delete process.env.LUMINOUS_STORAGE;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fixture.supabase.co";
    assert.equal(storageMode(), "supabase");
    await assert.rejects(
      () => readDocument("content"),
      (error) => error.status === 503,
    );
  } finally {
    for (const name of names)
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
  }
});
async function child(command, args, options) {
  const proc = spawn(command, args, options);
  let output = "";
  proc.stdout?.on("data", (bytes) => (output += bytes.toString()));
  proc.stderr?.on("data", (bytes) => (output += bytes.toString()));
  const code = await new Promise((resolve, reject) => {
    proc.once("error", reject);
    proc.once("exit", resolve);
  });
  return { code, output };
}
async function stop(proc) {
  if (!proc || proc.exitCode !== null) return;
  const done = new Promise((resolve) => proc.once("exit", resolve));
  proc.kill("SIGTERM");
  await done;
}
async function unusedPort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}
async function app(env) {
  const port = await unusedPort();
  const base = `http://localhost:${port}`;
  const proc = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    { env, stdio: "ignore" },
  );
  for (let i = 0; i < 100; i++) {
    try {
      if (
        (
          await fetch(base + "/editorial/login", {
            signal: AbortSignal.timeout(1000),
          })
        ).ok
      )
        return { proc, base };
    } catch {}
    if (proc.exitCode !== null)
      throw new Error("Test Next.js server did not start");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  await stop(proc);
  throw new Error("Test Next.js server timed out");
}
test("Macの移行は確認後に実行でき、Vercelの2インスタンスで認証・編集・画像を共有する", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "luminous-cloud-check-"));
  const local = path.join(root, "local");
  const runtime = path.join(root, "runtime");
  const value = provider();
  let first, second, http;
  const cleanEnv = { ...process.env, NEXT_TELEMETRY_DISABLED: "1" };
  for (const name of [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SECRET_KEY",
    "LUMINOUS_STORAGE",
    "VERCEL",
    "NODE_OPTIONS",
  ])
    delete cleanEnv[name];
  try {
    http = createServer(async (req, res) => {
      try {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const response = await value.fetcher(
          `https://fixture.supabase.co${req.url}`,
          {
            method: req.method,
            headers: req.headers,
            body: Buffer.concat(chunks),
          },
        );
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(Buffer.from(await response.arrayBuffer()));
      } catch {
        res.writeHead(500);
        res.end();
      }
    });
    await new Promise((resolve) => http.listen(0, "127.0.0.1", resolve));
    const hook = path.join(root, "fetch-hook.mjs");
    await writeFile(
      hook,
      `const original=globalThis.fetch;globalThis.fetch=(url,options)=>original(typeof url==='string' && url.startsWith('https://fixture.supabase.co') ? url.replace('https://fixture.supabase.co','http://127.0.0.1:${http.address().port}') : url,options);`,
    );
    const cloudEnv = {
      ...cleanEnv,
      LUMINOUS_STORAGE: "supabase",
      NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.co",
      SUPABASE_SECRET_KEY: value.key,
      LUMINOUS_DATA_DIR: runtime,
      NODE_OPTIONS: `--import ${pathToFileURL(hook).href}`,
    };
    const password = randomBytes(32).toString("hex");
    const email = "migration-test@example.com";
    const setup = await child(
      process.execPath,
      ["scripts/editorial-setup.mjs"],
      {
        env: {
          ...cleanEnv,
          LUMINOUS_STORAGE: "local",
          LUMINOUS_DATA_DIR: local,
          EDITORIAL_EMAIL: email,
          EDITORIAL_PASSWORD: password,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    assert.equal(setup.code, 0, setup.output);
    const name = randomUUID() + ".webp";
    const bytes = await sharp({
      create: { width: 50, height: 50, channels: 3, background: "#a95670" },
    })
      .webp()
      .toBuffer();
    await mkdir(path.join(local, "uploads"));
    await writeFile(path.join(local, "uploads", name), bytes);
    const content = {
      records: [],
      site: { heroTitle: "Macから移行した見出し", heroImage: `/media/${name}` },
      siteVersion: 1,
      events: [],
      activities: [],
    };
    await writeFile(path.join(local, "content.json"), JSON.stringify(content));
    const migrationEnv = { ...cloudEnv, LUMINOUS_DATA_DIR: local };
    const preview = await child(
      process.execPath,
      ["scripts/editorial-migrate.mjs"],
      { env: migrationEnv, stdio: ["ignore", "pipe", "pipe"] },
    );
    assert.equal(preview.code, 0, preview.output);
    assert.equal(value.documents.size, 0);
    assert.equal(value.media.size, 0);
    for (let i = 0; i < 2; i++) {
      const apply = await child(
        process.execPath,
        ["scripts/editorial-migrate.mjs", "--apply"],
        { env: migrationEnv, stdio: ["ignore", "pipe", "pipe"] },
      );
      assert.equal(apply.code, 0, apply.output);
      assert.ok(!apply.output.includes(value.key));
      assert.ok(!apply.output.includes(password));
    }
    assert.equal(value.documents.size, 2);
    assert.equal(value.media.size, 1);
    first = await app({ ...cloudEnv, VERCEL: "1" });
    second = await app({ ...cloudEnv, VERCEL: "1" });
    const login = await fetch(first.base + "/api/editorial/login", {
      method: "POST",
      headers: { Origin: first.base, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(login.status, 200);
    assert.match(login.headers.get("set-cookie"), /Secure/);
    const cookie = login.headers.get("set-cookie").split(";")[0];
    const current = await (
      await fetch(first.base + "/api/editorial/content", {
        headers: { Cookie: cookie },
      })
    ).json();
    assert.equal(current.site.heroTitle, content.site.heroTitle);
    const update = await fetch(first.base + "/api/editorial/content", {
      method: "PUT",
      headers: {
        Origin: first.base,
        Cookie: cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        kind: "site",
        site: { ...current.site, heroTitle: "公開サイトで更新した見出し" },
        version: current.siteVersion,
      }),
    });
    assert.equal(update.status, 200);
    const html = await (await fetch(second.base + "/")).text();
    assert.ok(html.includes("公開サイトで更新した見出し"));
    assert.ok(!html.includes(value.key));
    assert.ok(!html.includes(value.documents.get("account").document.secret));
    assert.deepEqual(
      Buffer.from(
        await (await fetch(second.base + `/media/${name}`)).arrayBuffer(),
      ),
      bytes,
    );
    const form = new FormData();
    form.append(
      "file",
      new Blob([bytes], { type: "image/webp" }),
      "photo.webp",
    );
    const upload = await fetch(first.base + "/api/editorial/upload", {
      method: "POST",
      headers: { Cookie: cookie, Origin: first.base },
      body: form,
    });
    assert.equal(upload.status, 200);
    const { url } = await upload.json();
    assert.equal((await fetch(second.base + url)).status, 200);
    await stop(first.proc);
    first = await app({ ...cloudEnv, VERCEL: "1" });
    assert.ok(
      (await (await fetch(first.base + "/")).text()).includes(
        "公開サイトで更新した見出し",
      ),
    );
    await assert.rejects(() => access(runtime));
    const blocked = await child(
      process.execPath,
      ["scripts/editorial-migrate.mjs", "--apply"],
      { env: migrationEnv, stdio: ["ignore", "pipe", "pipe"] },
    );
    assert.equal(blocked.code, 1);
    assert.match(blocked.output, /別の編集データ/);
    assert.equal(
      value.documents.get("content").document.site.heroTitle,
      "公開サイトで更新した見出し",
    );
    assert.equal(
      JSON.parse(await readFile(path.join(local, "content.json"), "utf8")).site
        .heroTitle,
      content.site.heroTitle,
    );
  } finally {
    await stop(first?.proc);
    await stop(second?.proc);
    if (http) await new Promise((resolve) => http.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});
test("未連携のVercelは公開ページを表示し、編集には接続設定を案内する", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "luminous-unconfigured-"));
  let server;
  const env = {
    ...process.env,
    VERCEL: "1",
    LUMINOUS_DATA_DIR: path.join(root, "no-files"),
    NEXT_TELEMETRY_DISABLED: "1",
  };
  for (const name of [
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY",
    "LUMINOUS_STORAGE",
    "NODE_OPTIONS",
  ])
    delete env[name];
  try {
    server = await app(env);
    assert.equal((await fetch(server.base + "/")).status, 200);
    const html = await (await fetch(server.base + "/editorial/login")).text();
    assert.ok(html.includes("公開サイトの保存先を設定してください"));
    const response = await fetch(server.base + "/api/editorial/login", {
      method: "POST",
      headers: { Origin: server.base, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "editor@example.com",
        password: "test-test-password",
      }),
    });
    assert.equal(response.status, 503);
    await assert.rejects(() => access(path.join(root, "no-files")));
  } finally {
    await stop(server?.proc);
    await rm(root, { recursive: true, force: true });
  }
});
