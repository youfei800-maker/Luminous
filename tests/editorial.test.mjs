import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:net";
import { randomBytes } from "node:crypto";
import sharp from "sharp";

let directory, server, base, cookie, initial, account;
const email = "test-editor@example.com";
const password = randomBytes(32).toString("hex");
async function start() {
  const port = await new Promise((resolve) => {
    const socket = createServer();
    socket.listen(0, "127.0.0.1", () => {
      const port = socket.address().port;
      socket.close(() => resolve(port));
    });
  });
  base = `http://localhost:${port}`;
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      env: {
        ...process.env,
        LUMINOUS_DATA_DIR: directory,
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: "ignore",
    },
  );
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if (
        (
          await fetch(`${base}/editorial/login`, {
            signal: AbortSignal.timeout(1500),
          })
        ).ok
      )
        return;
    } catch {}
    if (server.exitCode !== null)
      throw new Error(
        "テスト用サーバーを起動できませんでした。先に npm run build を実行してください。",
      );
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("テスト用サーバーの起動待ちがタイムアウトしました。");
}
async function stop() {
  if (!server || server.exitCode !== null) return;
  const stopped = new Promise((resolve) => server.once("exit", resolve));
  server.kill("SIGTERM");
  await stopped;
}
function request(
  route,
  { method = "GET", body, authorized = true, origin = base } = {},
) {
  const headers = {};
  if (authorized && cookie) headers.Cookie = cookie;
  if (method !== "GET") headers.Origin = origin;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  return fetch(`${base}${route}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
}
async function content() {
  const response = await request("/api/editorial/content");
  assert.equal(response.status, 200);
  return response.json();
}
async function save(article, version, action = "draft") {
  return request("/api/editorial/content", {
    method: "PUT",
    body: { kind: "article", article, version, action },
  });
}

before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "luminous-editorial-"));
  const setup = spawnSync(process.execPath, ["scripts/editorial-setup.mjs"], {
    env: {
      ...process.env,
      LUMINOUS_DATA_DIR: directory,
      EDITORIAL_EMAIL: email,
      EDITORIAL_PASSWORD: password,
    },
    encoding: "utf8",
  });
  assert.equal(setup.status, 0, setup.stderr);
  account = JSON.parse(
    await readFile(path.join(directory, "account.json"), "utf8"),
  );
  assert.equal(account.email, email);
  assert.notEqual(account.hash, password);
  await start();
});
after(async () => {
  await stop();
  if (directory) await rm(directory, { recursive: true, force: true });
});

test("未ログインでは管理画面・記事操作・画像アップロードにアクセスできない", async () => {
  const response = await request("/editorial", { authorized: false });
  assert.equal(response.status, 307);
  assert.match(response.headers.get("location"), /\/editorial\/login$/);
  assert.equal(
    (await request("/api/editorial/content", { authorized: false })).status,
    401,
  );
  assert.equal(
    (
      await request("/api/editorial/content", {
        method: "PUT",
        authorized: false,
        body: {},
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await request("/api/editorial/upload", {
        method: "POST",
        authorized: false,
      })
    ).status,
    401,
  );
});
test("ログインは同一オリジンと正しい認証情報を要求し、HttpOnlyセッションを発行する", async () => {
  assert.equal(
    (
      await request("/api/editorial/login", {
        method: "POST",
        body: { email, password },
        origin: "https://other.example.com",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("/api/editorial/login", {
        method: "POST",
        body: { email, password: "incorrect-password" },
      })
    ).status,
    401,
  );
  const response = await request("/api/editorial/login", {
    method: "POST",
    body: { email, password },
  });
  assert.equal(response.status, 200);
  const value = response.headers.get("set-cookie");
  assert.match(value, /HttpOnly/i);
  assert.match(value, /SameSite=strict/i);
  cookie = value.split(";")[0];
  initial = await content();
  assert.equal(initial.records.length, 6);
  const publicResponse = await fetch(`${base}/`);
  assert.ok(!(await publicResponse.text()).includes(account.secret));
});
test("下書きは公開記事を変更せず、公開操作と再起動後も編集内容が反映される", async () => {
  const record = initial.records[0];
  const article = {
    ...record.published,
    title: "保存と公開を確かめるテスト記事",
  };
  assert.equal((await save(article, record.version)).status, 200);
  let body = await (await fetch(`${base}/stories/${article.slug}`)).text();
  assert.ok(body.includes(record.published.title));
  assert.ok(!body.includes(article.title));
  assert.equal((await save(article, record.version, "publish")).status, 409);
  assert.equal(
    (await save(article, record.version + 1, "publish")).status,
    200,
  );
  body = await (await fetch(`${base}/stories/${article.slug}`)).text();
  assert.ok(body.includes(article.title));
  await stop();
  await start();
  body = await (await fetch(`${base}/stories/${article.slug}`)).text();
  assert.ok(body.includes(article.title));
  assert.equal((await content()).records[0].published.title, article.title);
});
test("新規記事は下書き・公開・非公開・削除を切り替えられ、公開前にURLから漏れない", async () => {
  const article = {
    ...initial.records[1].published,
    slug: "integration-new-story",
    title: "新規作成のテスト記事",
  };
  assert.equal((await save(article, 0)).status, 200);
  assert.equal((await fetch(`${base}/stories/${article.slug}`)).status, 404);
  assert.ok(!(await (await fetch(`${base}/`)).text()).includes(article.title));
  assert.equal((await save(article, 1, "publish")).status, 200);
  assert.equal((await fetch(`${base}/stories/${article.slug}`)).status, 200);
  assert.equal((await save(article, 2, "delete")).status, 400);
  assert.equal((await save(article, 2, "unpublish")).status, 200);
  assert.equal((await fetch(`${base}/stories/${article.slug}`)).status, 404);
  assert.equal((await save(article, 3, "delete")).status, 200);
  assert.ok(
    !(await content()).records.some((record) => record.slug === article.slug),
  );
});
test("サイト設定がトップページに反映され、古いバージョンからの上書きは拒否する", async () => {
  const value = await content();
  const site = { ...value.site, heroTitle: "New Bloom" };
  const body = { kind: "site", site, version: value.siteVersion };
  assert.equal(
    (await request("/api/editorial/content", { method: "PUT", body })).status,
    200,
  );
  assert.ok((await (await fetch(`${base}/`)).text()).includes("New Bloom"));
  assert.equal(
    (await request("/api/editorial/content", { method: "PUT", body })).status,
    409,
  );
});
test("画像は検証・WebP変換して保存し、偽装画像・パストラバーサルを拒否する", async () => {
  const bytes = await sharp({
    create: { width: 80, height: 120, channels: 3, background: "#f2cbd5" },
  })
    .png()
    .toBuffer();
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: "image/png" }), "photo.png");
  const response = await fetch(`${base}/api/editorial/upload`, {
    method: "POST",
    headers: { Origin: base, Cookie: cookie },
    body: form,
  });
  assert.equal(response.status, 200);
  const { url } = await response.json();
  assert.match(url, /^\/media\/[a-f0-9-]+\.webp$/);
  const media = await fetch(`${base}${url}`);
  assert.equal(media.status, 200);
  assert.equal(media.headers.get("content-type"), "image/webp");
  const image = Buffer.from(await media.arrayBuffer());
  assert.equal(image.subarray(0, 4).toString(), "RIFF");
  const spoof = new FormData();
  spoof.append(
    "file",
    new Blob([Buffer.from([0xff, 0xd8, 0xff, 0])], { type: "image/jpeg" }),
    "fake.jpg",
  );
  assert.equal(
    (
      await fetch(`${base}/api/editorial/upload`, {
        method: "POST",
        headers: { Origin: base, Cookie: cookie },
        body: spoof,
      })
    ).status,
    400,
  );
  assert.equal((await fetch(`${base}/media/account.json`)).status, 404);
});
test("署名を改変したCookie、外部オリジンからの編集、未完成の記事公開を拒否する", async () => {
  assert.equal(
    (
      await fetch(`${base}/api/editorial/content`, {
        headers: { Cookie: `${cookie}x` },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await request("/api/editorial/content", {
        method: "PUT",
        body: {},
        origin: "https://other.example.com",
      })
    ).status,
    403,
  );
  const article = {
    ...initial.records[1].published,
    slug: "incomplete-story",
    name: "",
  };
  assert.equal((await save(article, 0, "publish")).status, 400);
});
test("パスワード再設定で古いセッションが無効になり、ログアウトはCookieを消去する", async () => {
  const reset = spawnSync(
    process.execPath,
    ["scripts/editorial-setup.mjs", "--reset"],
    {
      env: {
        ...process.env,
        LUMINOUS_DATA_DIR: directory,
        EDITORIAL_EMAIL: email,
        EDITORIAL_PASSWORD: password,
      },
      encoding: "utf8",
    },
  );
  assert.equal(reset.status, 0, reset.stderr);
  assert.equal((await request("/api/editorial/content")).status, 401);
  const login = await request("/api/editorial/login", {
    method: "POST",
    body: { email, password },
  });
  cookie = login.headers.get("set-cookie").split(";")[0];
  const response = await request("/api/editorial/logout", { method: "POST" });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie"), /Max-Age=0/i);
  cookie = "";
  assert.equal((await request("/api/editorial/content")).status, 401);
});
