"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/icon";
export default function EditorialLogin({ configured }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/editorial/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.replace("/editorial");
      router.refresh();
    } catch (error) {
      setError(error.message || "接続を確認して、もう一度お試しください。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main-content" className="editorial-login">
      <section className="editorial-login-card">
        <Link className="editorial-brand" href="/">
          LUMINOUS
        </Link>
        <p className="editorial-script">Editorial room</p>
        <div className="editorial-login-heading">
          <Icon name="star" size={23} />
          <h1>編集部ログイン</h1>
        </div>
        <p className="editorial-login-copy">
          登録済みの編集者だけがアクセスできます。
        </p>
        {!configured && (
          <div className="editorial-setup-note">
            <strong>最初に編集者アカウントを設定してください。</strong>
            <p>サイトを起動しているターミナルで、次のコマンドを実行します。</p>
            <code>npm run editorial:setup</code>
            <p>設定後、このページを再読み込みしてください。</p>
          </div>
        )}
        <form onSubmit={submit}>
          <label>
            メールアドレス
            <input
              type="email"
              name="email"
              autoComplete="username"
              placeholder="editor@example.com"
              required
              maxLength={254}
              disabled={!configured || busy}
            />
          </label>
          <label>
            パスワード
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="パスワードを入力"
              required
              maxLength={256}
              disabled={!configured || busy}
            />
          </label>
          {error && (
            <p className="editorial-error" role="alert">
              {error}
            </p>
          )}
          <button className="editorial-primary" disabled={!configured || busy}>
            {busy ? "ログインしています…" : "ログイン"}
            <Icon name="arrow" size={17} />
          </button>
        </form>
        <button
          className="editorial-help-link"
          onClick={() => setHelp(!help)}
          aria-expanded={help}
        >
          パスワードを忘れた・変更したい方
        </button>
        {help && (
          <div className="editorial-setup-note">
            <p>
              サイトを管理している方が、ターミナルで次のコマンドを実行して再設定できます。
            </p>
            <code>npm run editorial:setup -- --reset</code>
            <p>再設定すると、既存のログインセッションは無効になります。</p>
          </div>
        )}
        <Link className="editorial-back" href="/">
          <span>←</span> 公開サイトへ戻る
        </Link>
      </section>
      <p className="editorial-login-caption">A place to pass the light on.</p>
    </main>
  );
}
