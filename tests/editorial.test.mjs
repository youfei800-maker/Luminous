import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
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

test("トップ画像は変更・保存でき、不正な外部画像を拒否する", async () => {
  const value = await content();
  const site = {
    ...value.site,
    heroImage: "/images/women.png",
    heroImageAlt: "新しいトップ画像",
    heroImagePosition: "top",
  };
  const body = { kind: "site", site, version: value.siteVersion };
  assert.equal(
    (await request("/api/editorial/content", { method: "PUT", body })).status,
    200,
  );
  const html = await (await fetch(`${base}/`)).text();
  assert.ok(html.includes('alt="新しいトップ画像"'));
  assert.ok(html.includes("object-position:top"));
  assert.equal((await content()).site.heroImage, "/images/women.png");
  assert.equal(
    (
      await request("/api/editorial/content", {
        method: "PUT",
        body: {
          ...body,
          version: value.siteVersion + 1,
          site: { ...site, heroImage: "https://other.example.com/photo.jpg" },
        },
      })
    ).status,
    400,
  );
});
for (const kind of ["event", "activity"]) {
  test(`${kind}: 下書き・公開・編集・競合・再起動・非公開・削除が一覧と詳細に反映される`, async () => {
    const key = kind === "event" ? "events" : "activities";
    const page = {
      slug: `test-${kind}`,
      title: `${kind} テスト公開`,
      summary: "概要を掲載する",
      date: "2026-11-03",
      image: "/images/team.jpg",
      imageAlt: "活動の写真",
      body: "活動の本文\n\n次の段落",
      organizer: "Luminous",
      schedule: "14:00–16:00",
      location: "オンライン",
      fee: "無料",
      applicationUrl: "https://example.com/register",
      applicationLabel: "参加を申し込む",
      registrationStatus: "open",
      category: "イベント開催",
      partner: "テスト連携先",
      outcomes: "キャリアを語り合う場をつくった。",
    };
    const change = (action, version, value = page, authorized = true) =>
      request("/api/editorial/content", {
        method: "PUT",
        authorized,
        body: { kind, action, page: value, version },
      });
    assert.equal((await change("publish", 0, page, false)).status, 401);
    assert.equal((await change("draft", 0)).status, 200);
    assert.equal((await fetch(`${base}/${key}/${page.slug}`)).status, 404);
    assert.ok(
      !(await (await fetch(`${base}/${key}`)).text()).includes(page.title),
    );
    assert.equal((await change("publish", 1)).status, 200);
    assert.equal((await change("publish", 1)).status, 409);
    assert.equal((await change("delete", 2)).status, 400);
    assert.ok(
      (await (await fetch(`${base}/${key}`)).text()).includes(page.title),
    );
    let html = await (await fetch(`${base}/${key}/${page.slug}`)).text();
    assert.ok(html.includes(page.body.split("\n")[0]));
    if (kind === "event")
      assert.ok(html.includes('href="https://example.com/register"'));
    else assert.ok(html.includes(page.outcomes));
    const edited = { ...page, title: "編集済みのタイトル" };
    assert.equal((await change("draft", 2, edited)).status, 200);
    assert.ok(
      (await (await fetch(`${base}/${key}/${page.slug}`)).text()).includes(
        page.title,
      ),
    );
    assert.equal((await change("publish", 3, edited)).status, 200);
    await stop();
    await start();
    assert.equal(
      (await content())[key].find((record) => record.slug === page.slug)
        .published.title,
      edited.title,
    );
    assert.ok(
      (await (await fetch(`${base}/${key}/${page.slug}`)).text()).includes(
        edited.title,
      ),
    );
    assert.equal((await change("unpublish", 4, edited)).status, 200);
    assert.equal((await fetch(`${base}/${key}/${page.slug}`)).status, 404);
    assert.equal((await change("delete", 5, edited)).status, 200);
    assert.ok(
      !(await content())[key].some((record) => record.slug === page.slug),
    );
  });
}
test("申し込みURLの偽装・未入力・不正日付を拒否し、受付終了でリンクを隠す", async () => {
  const record = (await content()).events[0];
  const value = record.published;
  const saveEvent = (page, version = record.version, action = "publish") =>
    request("/api/editorial/content", {
      method: "PUT",
      body: { kind: "event", page, version, action },
    });
  for (const applicationUrl of [
    "javascript:alert(1)",
    "https://user:password@example.com/",
    "http://example.com/",
    "",
  ])
    assert.equal((await saveEvent({ ...value, applicationUrl })).status, 400);
  assert.equal((await saveEvent({ ...value, date: "2026-02-30" })).status, 400);
  assert.equal(
    (await saveEvent({ ...value, registrationStatus: "closed" })).status,
    200,
  );
  const html = await (await fetch(`${base}/events/${value.slug}`)).text();
  assert.ok(html.includes("申し込み受付は終了しました"));
  assert.ok(!html.includes(`href="${value.applicationUrl}"`));
  assert.equal(
    (
      await saveEvent(
        { ...value, registrationStatus: "closed" },
        record.version + 1,
        "unpublish",
      )
    ).status,
    200,
  );
  assert.equal(
    (await saveEvent(value, record.version + 2, "delete")).status,
    200,
  );
  assert.equal((await content()).events.length, 0);
  assert.ok(
    !(await (await fetch(`${base}/`)).text()).includes("イベントの詳細を見る"),
  );
  await stop();
  await start();
  assert.equal(
    (await content()).events.length,
    0,
    "削除した初期イベントを再生成しない",
  );
});
test("既存の編集データを開くと画像・イベントの初期値を補完し、記事とアカウントを維持する", async () => {
  const snapshot = await content();
  const legacy = {
    records: snapshot.records,
    site: {
      heroTitle: "以前の見出し",
      heroAccent: snapshot.site.heroAccent,
      heroLead: snapshot.site.heroLead,
      heroDescription: snapshot.site.heroDescription,
      missionTitle: snapshot.site.missionTitle,
      missionDescription: snapshot.site.missionDescription,
    },
    siteVersion: snapshot.siteVersion,
  };
  await stop();
  await writeFile(path.join(directory, "content.json"), JSON.stringify(legacy));
  await start();
  const upgraded = await content();
  assert.deepEqual(upgraded.records, snapshot.records);
  assert.equal(upgraded.site.heroTitle, "以前の見出し");
  assert.equal(upgraded.site.heroImage, "/images/bridge.png");
  assert.equal(upgraded.events[0].slug, "bloom-career-day");
  assert.deepEqual(upgraded.activities, []);
  assert.equal(
    (
      await request("/api/editorial/content", {
        method: "PUT",
        body: {
          kind: "site",
          site: upgraded.site,
          version: upgraded.siteVersion,
        },
      })
    ).status,
    200,
  );
  const persisted = JSON.parse(
    await readFile(path.join(directory, "content.json"), "utf8"),
  );
  assert.equal(persisted.events[0].slug, "bloom-career-day");
  assert.equal(persisted.site.heroImage, "/images/bridge.png");
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
