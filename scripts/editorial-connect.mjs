import "./editorial-env.mjs";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { readFile, writeFile, rename, chmod } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { hiddenQuestion } from "./editorial-prompts.mjs";
import { createSupabaseStorage } from "../lib/editorial-storage.mjs";
try {
  if (!stdin.isTTY)
    throw new Error(
      "Macのターミナルで npm run editorial:connect を実行してください。",
    );
  const prompt = readline.createInterface({ input: stdin, output: stdout });
  const url = (
    await prompt.question("SupabaseのProject URL（https://...supabase.co）: ")
  ).trim();
  prompt.close();
  const key = (
    await hiddenQuestion(
      "サーバー用APIキー（service_role または secret・画面には表示されません）: ",
    )
  ).trim();
  if (!/^[A-Za-z0-9._-]+$/.test(key))
    throw new Error("サーバー用APIキーの形式を確認してください。");
  const storage = createSupabaseStorage({ url, key });
  await storage.readDocument("content");
  await storage.readDocument("account");
  const filename = path.join(process.cwd(), ".env.local");
  let previous = "";
  try {
    previous = await readFile(filename, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const replaced = new Set([
    "LUMINOUS_STORAGE",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY",
    "SUPABASE_STORAGE_BUCKET",
  ]);
  const lines = previous.split("\n").filter((line) => {
    const match = line.match(/^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=/);
    return !match || !replaced.has(match[1]);
  });
  const result =
    lines.join("\n").trimEnd() +
    "\n" +
    `LUMINOUS_STORAGE=supabase\nSUPABASE_URL=${url}\nSUPABASE_SERVICE_ROLE_KEY=${key}\nSUPABASE_STORAGE_BUCKET=luminous-media\n`;
  const temporary = `${filename}.${randomBytes(8).toString("hex")}.tmp`;
  await writeFile(temporary, result, { mode: 0o600 });
  await rename(temporary, filename);
  await chmod(filename, 0o600);
  console.log(
    "接続を確認し、Macの非公開ファイル .env.local に保存しました。次に npm run editorial:migrate で移行内容を確認してください。",
  );
} catch (error) {
  console.error(
    error.status
      ? error.message
      : "接続設定を完了できませんでした。Project URL・サーバー用APIキー・SQLの実行を確認してください。",
  );
  process.exitCode = 1;
}
