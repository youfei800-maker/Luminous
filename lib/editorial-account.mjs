import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import path from "node:path";
const scrypt = promisify(scryptCallback);
export const dataDirectory = () =>
  path.resolve(
    /* turbopackIgnore: true */
    process.env.LUMINOUS_DATA_DIR || path.join(process.cwd(), ".luminous"),
  );
export async function readAccount() {
  try {
    return JSON.parse(
      await readFile(path.join(dataDirectory(), "account.json"), "utf8"),
    );
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}
export async function createAccount(email, password, reset = false) {
  email = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("正しいメールアドレスを入力してください。");
  if (password.length < 12 || password.length > 256)
    throw new Error("パスワードは12〜256文字で設定してください。");
  if ((await readAccount()) && !reset)
    throw new Error(
      "編集者は設定済みです。変更する場合は --reset を指定してください。",
    );
  const salt = randomBytes(32).toString("hex");
  const account = {
    email,
    salt,
    hash: (await scrypt(password, salt, 64)).toString("hex"),
    secret: randomBytes(48).toString("hex"),
  };
  await mkdir(dataDirectory(), { recursive: true, mode: 0o700 });
  const target = path.join(dataDirectory(), "account.json");
  const temporary = `${target}.${randomBytes(8).toString("hex")}.tmp`;
  await writeFile(temporary, JSON.stringify(account), { mode: 0o600 });
  await rename(temporary, target);
}
export async function verifyPassword(account, password) {
  const actual = await scrypt(password, account.salt, 64);
  const expected = Buffer.from(account.hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
