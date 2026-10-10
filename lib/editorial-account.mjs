import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { readDocument, writeDocument } from "./editorial-storage.mjs";
export { dataDirectory } from "./editorial-storage.mjs";
const scrypt = promisify(scryptCallback);
export async function readAccount() {
  return (await readDocument("account")).data;
}
export async function createAccount(email, password, reset = false) {
  email = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("正しいメールアドレスを入力してください。");
  if (password.length < 12 || password.length > 256)
    throw new Error("パスワードは12〜256文字で設定してください。");
  const existing = await readDocument("account");
  if (existing.data && !reset)
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
  await writeDocument("account", account, existing.version);
}
export async function verifyPassword(account, password) {
  const actual = await scrypt(password, account.salt, 64);
  const expected = Buffer.from(account.hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
