import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { createAccount } from "../lib/editorial-account.mjs";

function hiddenQuestion(label) {
  return new Promise((resolve, reject) => {
    stdout.write(label);
    let value = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    function finish() {
      stdin.setRawMode(false);
      stdin.off("data", onData);
      stdin.pause();
      stdout.write("\n");
    }
    function onData(chunk) {
      for (const character of chunk) {
        if (character === "\u0003") {
          finish();
          reject(new Error("設定を中止しました。"));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          resolve(value);
          return;
        }
        if (character === "\u007f" || character === "\b")
          value = value.slice(0, -1);
        else if (character >= " ") value += character;
      }
    }
    stdin.on("data", onData);
  });
}
try {
  let email = process.env.EDITORIAL_EMAIL;
  let password = process.env.EDITORIAL_PASSWORD;
  if (!email || !password) {
    if (!stdin.isTTY)
      throw new Error(
        "ターミナルで npm run editorial:setup を実行してください。",
      );
    const prompt = readline.createInterface({ input: stdin, output: stdout });
    email = await prompt.question("編集者のメールアドレス: ");
    prompt.close();
    password = await hiddenQuestion(
      "パスワード（12文字以上・画面には表示されません）: ",
    );
    const confirmation = await hiddenQuestion("パスワードをもう一度: ");
    if (password !== confirmation)
      throw new Error("パスワードが一致しません。");
  }
  await createAccount(email, password, process.argv.includes("--reset"));
  console.log(
    "編集者アカウントを設定しました。サイトの /editorial/login からログインしてください。",
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
