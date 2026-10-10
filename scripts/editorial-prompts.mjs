import { stdin, stdout } from "node:process";
export function hiddenQuestion(label) {
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
