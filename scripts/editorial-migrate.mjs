import "./editorial-env.mjs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { isDeepStrictEqual } from "node:util";
import { cloudStorage, dataDirectory } from "../lib/editorial-storage.mjs";

function migrationError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

try {
  const storage = cloudStorage();
  const directory = dataDirectory();
  const account = JSON.parse(
    await readFile(path.join(directory, "account.json"), "utf8"),
  );
  if (
    typeof account.email !== "string" ||
    !/^[a-f0-9]{64}$/.test(account.salt) ||
    !/^[a-f0-9]{128}$/.test(account.hash) ||
    !/^[a-f0-9]{96}$/.test(account.secret)
  )
    throw migrationError("移行元のアカウントファイルを確認してください。");
  let content;
  try {
    content = JSON.parse(
      await readFile(path.join(directory, "content.json"), "utf8"),
    );
  } catch (error) {
    if (error.code === "ENOENT")
      throw migrationError(
        "保存済みの編集データがありません。移行前にローカルの編集画面で下書きまたはサイト設定を保存してください。",
      );
    throw error;
  }
  if (
    !Array.isArray(content.records) ||
    !content.site ||
    !Number.isInteger(content.siteVersion)
  )
    throw migrationError("移行元のコンテンツファイルを確認してください。");
  const names = new Set();
  function images(value) {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (
        ["image", "heroImage"].includes(key) &&
        typeof child === "string" &&
        child.startsWith("/media/")
      ) {
        const name = child.slice("/media/".length);
        if (!/^[a-f0-9-]+\.(jpg|png|webp)$/.test(name))
          throw migrationError("移行元の画像パスを確認してください。");
        names.add(name);
      } else if (typeof child === "object") images(child);
    }
  }
  images(content);
  const media = [];
  for (const name of names) {
    const bytes = await readFile(path.join(directory, "uploads", name));
    const metadata = await sharp(bytes, {
      limitInputPixels: 40000000,
    }).metadata();
    if (
      !["jpeg", "png", "webp"].includes(metadata.format) ||
      bytes.length > 8388608
    )
      throw migrationError("移行元の画像形式またはサイズを確認してください。");
    media.push({ name, bytes });
  }
  const targetAccount = await storage.readDocument("account");
  const targetContent = await storage.readDocument("content");
  if (targetAccount.data && !isDeepStrictEqual(targetAccount.data, account))
    throw migrationError(
      "公開側には別のアカウントがあります。安全のため移行を停止しました。既存データを上書きしません。",
    );
  if (targetContent.data && !isDeepStrictEqual(targetContent.data, content))
    throw migrationError(
      "公開側には別の編集データがあります。安全のため移行を停止しました。既存データを上書きしません。",
    );
  console.log(
    `移行内容：ストーリー ${content.records.length}件、イベント ${content.events?.length ?? 1}件、活動実績 ${content.activities?.length ?? 0}件、画像 ${media.length}点。`,
  );
  if (!process.argv.includes("--apply")) {
    console.log(
      "接続と移行内容を確認しました。まだ変更していません。移行するには npm run editorial:migrate -- --apply を実行してください。",
    );
  } else {
    // Publish the content document last, after all referenced images are available.
    for (const { name, bytes } of media) {
      const existing = await storage.readMedia(name);
      if (existing && !existing.equals(bytes))
        throw migrationError(
          "同名で内容の違う画像があります。上書きせず停止しました。",
        );
      if (!existing) await storage.writeMedia(name, bytes);
    }
    if (!targetAccount.data) await storage.writeDocument("account", account, 0);
    if (!targetContent.data) await storage.writeDocument("content", content, 0);
    console.log(
      "移行しました。公開サイトの /editorial/login から、これまでのメールアドレスとパスワードでログインできます。Macの元データは保持しています。",
    );
  }
} catch (error) {
  if (error.code === "ENOENT")
    console.error(
      "移行元のファイルが見つかりません。編集していたMacのLuminousフォルダで実行してください。",
    );
  else
    console.error(
      error.status
        ? error.message
        : "移行を完了できませんでした。移行元のファイルと接続設定を確認してください。",
    );
  process.exitCode = 1;
}
