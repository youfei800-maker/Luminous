"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/icon";
import PageManager from "@/components/editorial/page-manager";
import ImagePicker from "@/components/editorial/image-picker";
import { themes } from "@/lib/stories";

const images = [
  { url: "/images/bridge.png", label: "対話するふたり" },
  { url: "/images/girls.png", label: "Girls — 窓辺の学生" },
  { url: "/images/women.png", label: "Women — 働く女性" },
  { url: "/images/designer.jpg", label: "ポートレート" },
  { url: "/images/team.jpg", label: "チームの仕事" },
  { url: "/images/learning.jpg", label: "学びの時間" },
];
const siteLabels = {
  heroTitle: "トップの英字タイトル",
  heroAccent: "トップの英字サブタイトル",
  heroLead: "トップのメッセージ",
  heroDescription: "トップの説明文",
  missionTitle: "ビジョンの見出し",
  missionDescription: "ビジョンの説明文",
};
function blankArticle() {
  return {
    slug: `story-${Date.now()}`,
    title: "新しいストーリー",
    excerpt: "",
    category: "girls",
    theme: themes[0],
    name: "",
    role: "",
    age: "",
    image: images[0].url,
    imageAlt: "",
    position: "center 40%",
    date: new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" })
      .format(new Date())
      .replaceAll("-", "."),
    readingTime: 5,
    quote: "",
    introduction: "",
    profile: "",
    sections: [{ heading: "", paragraphs: [""] }],
    timeline: [],
  };
}
function currentArticle(record) {
  return record?.draft || record?.published;
}

export default function EditorialDashboard({
  initialContent,
  email,
  storageMode = "local",
}) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [selected, setSelected] = useState(
    initialContent.records[0]?.slug || null,
  );
  const [draft, setDraft] = useState(
    currentArticle(initialContent.records[0]) || blankArticle(),
  );
  const [site, setSite] = useState(initialContent.site);
  const [pageDirty, setPageDirty] = useState(false);
  const [view, setView] = useState("articles");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const record = content.records.find((item) => item.slug === selected);
  const dirty =
    pageDirty ||
    (["event", "activity"].includes(view)
      ? false
      : view === "settings"
        ? JSON.stringify(site) !== JSON.stringify(content.site)
        : JSON.stringify(draft) !==
          JSON.stringify(currentArticle(record) || blankArticleBase));
  useEffect(() => {
    if (!dirty) return;
    const handler = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  function proceed() {
    return (
      !dirty ||
      window.confirm("未保存の変更があります。変更を破棄して移動しますか？")
    );
  }
  function clearMessages() {
    setError("");
    setNotice("");
    setPreview(false);
  }
  function select(item) {
    if (item.slug === selected) return;
    if (!proceed()) return;
    setSelected(item.slug);
    setDraft(currentArticle(item));
    clearMessages();
  }
  function switchView(next) {
    if (next === view || !proceed()) return;
    setDraft(currentArticle(record) || blankArticle());
    setSite(content.site);
    setPageDirty(false);
    setView(next);
    clearMessages();
  }
  function create() {
    if (!proceed()) return;
    setSelected(null);
    setDraft(blankArticle());
    setView("articles");
    clearMessages();
  }
  function field(name, value) {
    setDraft((previous) => ({ ...previous, [name]: value }));
  }
  async function persist(action) {
    if (
      action === "delete" &&
      !window.confirm(`「${draft.title}」を削除します。よろしいですか？`)
    )
      return;
    if (
      action === "unpublish" &&
      !window.confirm(
        "この記事を公開サイトから非公開にしますか？下書きは残ります。",
      )
    )
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const payload =
        view === "settings"
          ? { kind: "site", site, version: content.siteVersion }
          : {
              kind: "article",
              article: draft,
              action,
              version: record?.version || 0,
            };
      const response = await fetch("/api/editorial/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) router.replace("/editorial/login");
        throw new Error(result.error);
      }
      setContent(result);
      setSite(result.site);
      const next =
        action === "delete"
          ? result.records[0]
          : result.records.find((item) => item.slug === draft.slug);
      if (view !== "settings") {
        setSelected(next?.slug || null);
        setDraft(currentArticle(next) || blankArticle());
      }
      setNotice(
        view === "settings"
          ? "サイト設定を保存しました。公開サイトに反映されています。"
          : {
              draft: "下書きを保存しました。公開中の記事は変更されていません。",
              publish: "記事を公開しました。公開サイトに反映されています。",
              unpublish: "記事を非公開にしました。下書きは残っています。",
              delete: "記事を削除しました。",
            }[action],
      );
      router.refresh();
    } catch (error) {
      setError(
        error.message || "保存できませんでした。接続を確認してください。",
      );
    } finally {
      setBusy(false);
    }
  }
  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError("画像は4MB以内で選択してください。");
      event.target.value = "";
      return;
    }
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/editorial/upload", {
        method: "POST",
        body,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      field("image", result.url);
      setNotice("画像をアップロードしました。記事を保存すると反映されます。");
    } catch (error) {
      setError(error.message || "アップロードできませんでした。");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }
  async function logout() {
    if (!proceed()) return;
    setBusy(true);
    try {
      const response = await fetch("/api/editorial/logout", { method: "POST" });
      if (!response.ok) throw new Error();
      router.replace("/editorial/login");
      router.refresh();
    } catch {
      setError("ログアウトできませんでした。もう一度お試しください。");
      setBusy(false);
    }
  }
  const listed = content.records.filter(
    (item) =>
      (filter === "all" ||
        (filter === "published"
          ? Boolean(item.published)
          : Boolean(item.draft))) &&
      `${currentArticle(item).title} ${currentArticle(item).name}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const publishedCount = content.records.filter(
    (item) => item.published,
  ).length;
  const draftCount = content.records.filter((item) => item.draft).length;
  return (
    <main id="main-content" className="editorial-shell">
      <aside className="editorial-sidebar">
        <Link className="editorial-brand" href="/">
          LUMINOUS
        </Link>
        <p className="editorial-script">Editorial room</p>
        <nav aria-label="編集部メニュー">
          <button
            className={view === "articles" ? "active" : ""}
            onClick={() => switchView("articles")}
            disabled={busy || uploading}
          >
            <Icon name="bookmark" size={17} />
            ストーリー管理
          </button>
          <button
            className={view === "settings" ? "active" : ""}
            onClick={() => switchView("settings")}
            disabled={busy || uploading}
          >
            <Icon name="star" size={17} />
            サイト設定
          </button>
          {[
            ["event", "イベント管理"],
            ["activity", "活動実績管理"],
          ].map(([key, label]) => (
            <button
              key={key}
              className={view === key ? "active" : ""}
              onClick={() => switchView(key)}
              disabled={busy || uploading}
            >
              <Icon name="star" size={17} />
              {label}
            </button>
          ))}
          <Link href="/" target="_blank">
            公開サイトを見る
            <Icon name="diagonal" size={15} />
          </Link>
        </nav>
        <div className="editorial-user">
          <span className="editorial-avatar">L</span>
          <strong>編集者</strong>
          <span>{email}</span>
          <button onClick={logout} disabled={busy}>
            ログアウト <Icon name="arrow" size={14} />
          </button>
        </div>
      </aside>
      <div className="editorial-workspace">
        <header className="editorial-top">
          <div>
            <p className="eyebrow">PASS THE LIGHT ON</p>
            <h1>
              {
                {
                  articles: "ストーリー管理",
                  settings: "サイト設定",
                  event: "イベント管理",
                  activity: "活動実績管理",
                }[view]
              }
            </h1>
            <p className="editorial-subtitle">
              {view === "articles"
                ? "ひとりひとりの光を、次の誰かへ。"
                : "Luminousの想いを、あなたの言葉で。"}
            </p>
          </div>
          {view === "articles" && (
            <button
              className="editorial-primary"
              onClick={create}
              disabled={busy}
            >
              ＋ 新しいストーリー
            </button>
          )}
        </header>
        <p className="editorial-storage-note">
          {storageMode === "supabase"
            ? "Supabaseに保存します。同じSupabaseプロジェクトに接続した公開サイトに反映されます。"
            : "この編集画面はMac内に保存します。公開サイトには自動で反映されません。"}
        </p>
        {notice && (
          <p className="editorial-notice" role="status">
            <Icon name="check" size={17} />
            {notice}
          </p>
        )}
        {error && (
          <p className="editorial-error" role="alert">
            {error}
          </p>
        )}
        {["event", "activity"].includes(view) ? (
          <PageManager
            key={view}
            kind={view}
            content={content}
            onContent={setContent}
            onDirty={setPageDirty}
            onBusy={setBusy}
          />
        ) : view === "settings" ? (
          <section className="editorial-settings">
            <div className="editorial-settings-preview">
              <img
                className="managed-hero-preview"
                src={site.heroImage}
                alt={site.heroImageAlt}
                style={{ objectPosition: site.heroImagePosition }}
              />
              <p className="eyebrow">LIVE PREVIEW</p>
              <h2>
                {site.heroTitle}
                <br />
                <em>{site.heroAccent}</em>
              </h2>
              <p>{site.heroLead}</p>
              <p className="editable-lines">{site.heroDescription}</p>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                persist("site");
              }}
            >
              <h2>トップページのメッセージ</h2>
              <p>保存すると公開サイトのトップページに反映されます。</p>
              <fieldset disabled={busy || uploading}>
                <ImagePicker
                  label="トップページ画像"
                  value={site.heroImage}
                  alt={site.heroImageAlt}
                  onChange={(url) =>
                    setSite((previous) => ({ ...previous, heroImage: url }))
                  }
                  onBusy={setUploading}
                />
                <label>
                  トップ画像の説明
                  <input
                    aria-label="トップ画像の説明"
                    maxLength={2000}
                    value={site.heroImageAlt}
                    onChange={(event) =>
                      setSite({ ...site, heroImageAlt: event.target.value })
                    }
                  />
                </label>
                <label>
                  トップ画像の表示位置
                  <select
                    aria-label="トップ画像の表示位置"
                    value={site.heroImagePosition}
                    onChange={(event) =>
                      setSite({
                        ...site,
                        heroImagePosition: event.target.value,
                      })
                    }
                  >
                    <option value="center">中央</option>
                    <option value="top">上</option>
                    <option value="bottom">下</option>
                  </select>
                </label>
                {Object.entries(siteLabels).map(([name, label]) => (
                  <label key={name}>
                    {label}
                    {[
                      "heroDescription",
                      "missionTitle",
                      "missionDescription",
                    ].includes(name) ? (
                      <textarea
                        aria-label={label}
                        rows={3}
                        maxLength={3000}
                        value={site[name]}
                        onChange={(event) =>
                          setSite({ ...site, [name]: event.target.value })
                        }
                        required
                      />
                    ) : (
                      <input
                        value={site[name]}
                        maxLength={3000}
                        onChange={(event) =>
                          setSite({ ...site, [name]: event.target.value })
                        }
                        required
                      />
                    )}
                  </label>
                ))}
              </fieldset>
              <button
                className="editorial-primary"
                disabled={busy || uploading}
              >
                {busy ? "保存しています…" : "サイト設定を保存"}
                <Icon name="check" size={16} />
              </button>
            </form>
          </section>
        ) : (
          <div className="editorial-columns">
            <section className="editorial-article-list" aria-label="記事一覧">
              <div className="editorial-stats">
                <div>
                  <span>公開中</span>
                  <strong>{publishedCount}</strong>
                </div>
                <div>
                  <span>下書き</span>
                  <strong>{draftCount}</strong>
                </div>
              </div>
              <label className="editorial-list-search">
                <Icon name="search" size={15} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="タイトル・名前で検索"
                  aria-label="管理記事を検索"
                />
              </label>
              <div className="editorial-list-filters">
                {[
                  { key: "all", label: "すべて" },
                  { key: "published", label: "公開中" },
                  { key: "draft", label: "下書き" },
                ].map((item) => (
                  <button
                    key={item.key}
                    aria-pressed={filter === item.key}
                    className={filter === item.key ? "active" : ""}
                    onClick={() => setFilter(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="editorial-list-items">
                {listed.map((item) => (
                  <button
                    key={item.slug}
                    className={`editorial-article-row ${selected === item.slug ? "selected" : ""}`}
                    onClick={() => select(item)}
                    disabled={busy}
                  >
                    <span
                      className={`editorial-status-dot ${item.published ? "published" : ""}`}
                    />
                    <span>
                      <strong>{currentArticle(item).title}</strong>
                      <small>
                        {currentArticle(item).category} ·{" "}
                        {item.published ? "公開中" : "下書き"}
                        {item.published && item.draft ? " / 変更あり" : ""}
                      </small>
                    </span>
                  </button>
                ))}
                {listed.length === 0 && (
                  <p className="editorial-list-empty">
                    該当する記事はありません。
                  </p>
                )}
              </div>
            </section>
            <section className="editorial-editor">
              <div className="editorial-editor-heading">
                <div>
                  <span
                    className={`editorial-status-pill ${record?.published ? "published" : ""}`}
                  >
                    {record?.published
                      ? record.draft
                        ? "公開中・下書きあり"
                        : "公開中"
                      : record
                        ? "下書き"
                        : "新規記事"}
                  </span>
                  <h2>
                    {preview ? "ストーリーのプレビュー" : "ストーリーを編集"}
                  </h2>
                  <p className="editorial-unsaved">
                    {dirty ? "未保存の変更があります" : "保存済み"}
                  </p>
                </div>
                <div>
                  <button
                    className="editorial-secondary"
                    onClick={() => setPreview(!preview)}
                    disabled={busy}
                  >
                    {preview ? "編集に戻る" : "プレビュー"}
                  </button>
                  {record?.published && (
                    <Link
                      className="editorial-secondary"
                      href={`/stories/${record.slug}`}
                      target="_blank"
                    >
                      公開記事 <Icon name="diagonal" size={13} />
                    </Link>
                  )}
                </div>
              </div>
              {preview ? (
                <div className="editorial-story-preview">
                  <span className="category-label">{draft.category}</span>
                  <h2>{draft.title}</h2>
                  <p>{draft.excerpt}</p>
                  <img src={draft.image} alt={draft.imageAlt} />
                  <strong>
                    {draft.name} / {draft.role}
                  </strong>
                  <p className="editable-lines">{draft.introduction}</p>
                  {draft.quote && <blockquote>{draft.quote}</blockquote>}
                  {draft.sections.map((section, index) => (
                    <section key={index}>
                      <h3>{section.heading}</h3>
                      {section.paragraphs.map((paragraph, i) => (
                        <p className="editable-lines" key={i}>
                          {paragraph}
                        </p>
                      ))}
                    </section>
                  ))}
                  <h3>キャリアの歩み</h3>
                  {draft.timeline.map((item, index) => (
                    <p key={index}>
                      <strong>
                        {item.year} — {item.title}
                      </strong>
                      <br />
                      {item.text}
                    </p>
                  ))}
                </div>
              ) : (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    persist("draft");
                  }}
                >
                  <fieldset disabled={busy || uploading}>
                    <div className="editorial-field-grid">
                      <label className="wide">
                        タイトル
                        <input
                          name="title"
                          value={draft.title}
                          onChange={(event) =>
                            field("title", event.target.value)
                          }
                          required
                          maxLength={2000}
                        />
                      </label>
                      <label className="wide">
                        記事URL（半角英数字・ハイフン）
                        <span className="editorial-url-field">
                          <span>/stories/</span>
                          <input
                            name="slug"
                            value={draft.slug}
                            onChange={(event) =>
                              field("slug", event.target.value)
                            }
                            readOnly={Boolean(record)}
                            required
                            pattern="[a-z0-9]+(-[a-z0-9]+)*"
                            maxLength={100}
                          />
                        </span>
                        {record && (
                          <small>保存済みの記事URLは固定されています。</small>
                        )}
                      </label>
                      <label>
                        カテゴリ
                        <select
                          value={draft.category}
                          onChange={(event) =>
                            field("category", event.target.value)
                          }
                        >
                          <option value="girls">Girls</option>
                          <option value="women">Women</option>
                          <option value="cross-talk">Girls × Women</option>
                        </select>
                      </label>
                      <label>
                        テーマ
                        <input
                          list="editorial-themes"
                          value={draft.theme}
                          onChange={(event) =>
                            field("theme", event.target.value)
                          }
                          maxLength={2000}
                        />
                        <datalist id="editorial-themes">
                          {themes.map((theme) => (
                            <option key={theme} value={theme} />
                          ))}
                        </datalist>
                      </label>
                      <label>
                        掲載日
                        <input
                          type="date"
                          value={draft.date.replaceAll(".", "-")}
                          onChange={(event) =>
                            field(
                              "date",
                              event.target.value.replaceAll("-", "."),
                            )
                          }
                          required
                        />
                      </label>
                      <label>
                        読了時間（分）
                        <input
                          type="number"
                          min={1}
                          max={120}
                          value={draft.readingTime}
                          onChange={(event) =>
                            field("readingTime", Number(event.target.value))
                          }
                          required
                        />
                      </label>
                      <label className="wide">
                        記事の概要
                        <textarea
                          name="excerpt"
                          rows={2}
                          value={draft.excerpt}
                          onChange={(event) =>
                            field("excerpt", event.target.value)
                          }
                          maxLength={2000}
                        />
                      </label>
                    </div>
                    <section className="editorial-form-section">
                      <h3>人物プロフィール</h3>
                      <label className="editorial-checkbox">
                        <input
                          type="checkbox"
                          checked={Boolean(draft.isDemo)}
                          onChange={(event) =>
                            field("isDemo", event.target.checked)
                          }
                        />
                        この記事は架空のサンプルです（公開ページに注記を表示）
                      </label>
                      <div className="editorial-field-grid">
                        <label>
                          人物名
                          <input
                            name="personName"
                            value={draft.name}
                            onChange={(event) =>
                              field("name", event.target.value)
                            }
                            maxLength={2000}
                          />
                        </label>
                        <label>
                          年齢
                          <input
                            value={draft.age}
                            onChange={(event) =>
                              field("age", event.target.value)
                            }
                            maxLength={2000}
                          />
                        </label>
                        <label className="wide">
                          職業・肩書き
                          <input
                            value={draft.role}
                            onChange={(event) =>
                              field("role", event.target.value)
                            }
                            maxLength={2000}
                          />
                        </label>
                        <label className="wide">
                          プロフィール文
                          <textarea
                            rows={4}
                            value={draft.profile}
                            onChange={(event) =>
                              field("profile", event.target.value)
                            }
                            maxLength={10000}
                          />
                        </label>
                      </div>
                    </section>
                    <section className="editorial-form-section">
                      <h3>メイン画像</h3>
                      <div className="editorial-media">
                        <img src={draft.image} alt="選択した記事画像" />
                        <div>
                          <label>
                            画像を選ぶ
                            <select
                              value={draft.image}
                              onChange={(event) =>
                                field("image", event.target.value)
                              }
                            >
                              {images.map((image) => (
                                <option value={image.url} key={image.url}>
                                  {image.label}
                                </option>
                              ))}
                              {!images.some(
                                (image) => image.url === draft.image,
                              ) && (
                                <option value={draft.image}>
                                  アップロードした画像
                                </option>
                              )}
                            </select>
                          </label>
                          <label className="editorial-upload">
                            {uploading
                              ? "アップロード中…"
                              : "画像ファイルをアップロード"}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={upload}
                            />
                            <small>JPEG・PNG・WebP / 4MB以内</small>
                          </label>
                          <label>
                            画像の説明（読み上げ用）
                            <input
                              value={draft.imageAlt}
                              onChange={(event) =>
                                field("imageAlt", event.target.value)
                              }
                              maxLength={2000}
                            />
                          </label>
                        </div>
                      </div>
                    </section>
                    <section className="editorial-form-section">
                      <h3>ストーリー本文</h3>
                      <label>
                        導入文
                        <textarea
                          rows={4}
                          value={draft.introduction}
                          onChange={(event) =>
                            field("introduction", event.target.value)
                          }
                          maxLength={10000}
                        />
                      </label>
                      <label>
                        印象的なひと言
                        <input
                          value={draft.quote}
                          onChange={(event) =>
                            field("quote", event.target.value)
                          }
                          maxLength={2000}
                        />
                      </label>
                      {draft.sections.map((section, index) => (
                        <div className="editorial-repeat-block" key={index}>
                          <div>
                            <span>
                              CHAPTER {String(index + 1).padStart(2, "0")}
                            </span>
                            <button
                              type="button"
                              aria-label={`章${index + 1}を削除`}
                              onClick={() =>
                                field(
                                  "sections",
                                  draft.sections.filter((_, i) => i !== index),
                                )
                              }
                            >
                              <Icon name="close" size={16} />
                            </button>
                          </div>
                          <label>
                            見出し
                            <input
                              value={section.heading}
                              onChange={(event) =>
                                field(
                                  "sections",
                                  draft.sections.map((item, i) =>
                                    i === index
                                      ? { ...item, heading: event.target.value }
                                      : item,
                                  ),
                                )
                              }
                              maxLength={300}
                            />
                          </label>
                          <label>
                            本文
                            <textarea
                              rows={6}
                              value={section.paragraphs.join("\n\n")}
                              onChange={(event) =>
                                field(
                                  "sections",
                                  draft.sections.map((item, i) =>
                                    i === index
                                      ? {
                                          ...item,
                                          paragraphs:
                                            event.target.value.split(/\n\s*\n/),
                                        }
                                      : item,
                                  ),
                                )
                              }
                            />
                            <small>空行を入れると段落が分かれます。</small>
                          </label>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="editorial-add"
                        disabled={draft.sections.length >= 30}
                        onClick={() =>
                          field("sections", [
                            ...draft.sections,
                            { heading: "", paragraphs: [""] },
                          ])
                        }
                      >
                        ＋ 章を追加
                      </button>
                    </section>
                    <section className="editorial-form-section">
                      <h3>キャリアの年表</h3>
                      {draft.timeline.map((item, index) => (
                        <div className="editorial-repeat-block" key={index}>
                          <div>
                            <span>
                              JOURNEY {String(index + 1).padStart(2, "0")}
                            </span>
                            <button
                              type="button"
                              aria-label={`年表${index + 1}を削除`}
                              onClick={() =>
                                field(
                                  "timeline",
                                  draft.timeline.filter((_, i) => i !== index),
                                )
                              }
                            >
                              <Icon name="close" size={16} />
                            </button>
                          </div>
                          <div className="editorial-field-grid">
                            <label>
                              年・時期
                              <input
                                value={item.year}
                                onChange={(event) =>
                                  field(
                                    "timeline",
                                    draft.timeline.map((entry, i) =>
                                      i === index
                                        ? { ...entry, year: event.target.value }
                                        : entry,
                                    ),
                                  )
                                }
                                maxLength={30}
                              />
                            </label>
                            <label>
                              出来事
                              <input
                                value={item.title}
                                onChange={(event) =>
                                  field(
                                    "timeline",
                                    draft.timeline.map((entry, i) =>
                                      i === index
                                        ? {
                                            ...entry,
                                            title: event.target.value,
                                          }
                                        : entry,
                                    ),
                                  )
                                }
                                maxLength={300}
                              />
                            </label>
                            <label className="wide">
                              説明
                              <textarea
                                rows={2}
                                value={item.text}
                                onChange={(event) =>
                                  field(
                                    "timeline",
                                    draft.timeline.map((entry, i) =>
                                      i === index
                                        ? { ...entry, text: event.target.value }
                                        : entry,
                                    ),
                                  )
                                }
                                maxLength={2000}
                              />
                            </label>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="editorial-add"
                        disabled={draft.timeline.length >= 30}
                        onClick={() =>
                          field("timeline", [
                            ...draft.timeline,
                            { year: "", title: "", text: "" },
                          ])
                        }
                      >
                        ＋ 年表を追加
                      </button>
                    </section>
                  </fieldset>
                  <div className="editorial-save-bar">
                    <span>
                      {busy
                        ? "保存しています…"
                        : dirty
                          ? "未保存の変更があります"
                          : "すべての変更は保存済みです"}
                    </span>
                    <div>
                      <button
                        type="submit"
                        className="editorial-secondary"
                        disabled={busy || uploading}
                      >
                        下書き保存
                      </button>
                      <button
                        type="button"
                        className="editorial-primary"
                        disabled={busy || uploading}
                        onClick={() => persist("publish")}
                      >
                        公開する <Icon name="diagonal" size={15} />
                      </button>
                    </div>
                  </div>
                  {record && (
                    <div className="editorial-danger-zone">
                      {record.published ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => persist("unpublish")}
                        >
                          この記事を非公開にする
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => persist("delete")}
                        >
                          この記事を削除する
                        </button>
                      )}
                    </div>
                  )}
                </form>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
// A new article always has unsaved changes until its first save.
const blankArticleBase = null;
