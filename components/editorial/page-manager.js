"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { pageTypes } from "@/lib/managed-pages";
import ImagePicker from "@/components/editorial/image-picker";
const current = (record) => record?.draft || record?.published;
function blank(kind) {
  const page = {
    slug: `${kind}-${Date.now()}`,
    title: "",
    summary: "",
    date: new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(
      new Date(),
    ),
    image: "/images/bridge.png",
    imageAlt: "",
    body: "",
  };
  for (const field of Object.keys(pageTypes[kind].fields)) page[field] = "";
  if (kind === "event") {
    page.registrationStatus = "coming";
    page.applicationLabel = "参加を申し込む";
  }
  return page;
}
export default function PageManager({
  kind,
  content,
  onContent,
  onDirty,
  onBusy,
}) {
  const type = pageTypes[kind];
  const records = content[type.key];
  const router = useRouter();
  const [selected, setSelected] = useState(records[0]?.slug || null);
  const [draft, setDraft] = useState(current(records[0]) || null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const record = records.find((record) => record.slug === selected);
  const dirty =
    JSON.stringify(draft) !== JSON.stringify(current(record) || null);
  useEffect(() => {
    onDirty(dirty);
  }, [dirty, onDirty]);
  function proceed() {
    return (
      !dirty || window.confirm("未保存の変更があります。変更を破棄しますか？")
    );
  }
  function resetMessages() {
    setNotice("");
    setError("");
    setPreview(false);
  }
  function select(record) {
    if (record.slug === selected || !proceed()) return;
    setSelected(record.slug);
    setDraft(current(record));
    resetMessages();
  }
  function create() {
    if (!proceed()) return;
    setSelected(null);
    setDraft(blank(kind));
    resetMessages();
  }
  function field(name, value) {
    setDraft((previous) => ({ ...previous, [name]: value }));
  }
  async function save(action) {
    if (
      action === "delete" &&
      !window.confirm(
        `「${draft.title}」を削除しますか？この操作は取り消せません。`,
      )
    )
      return;
    if (
      action === "unpublish" &&
      !window.confirm(
        "このページを非公開にしますか？未保存の編集は破棄され、保存済みの下書きが残ります。",
      )
    )
      return;
    setBusy(true);
    onBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/editorial/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          action,
          page: action === "unpublish" ? current(record) : draft,
          version: record?.version || 0,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) router.replace("/editorial/login");
        throw new Error(result.error);
      }
      onContent(result);
      const next =
        action === "delete"
          ? result[type.key][0]
          : result[type.key].find((item) => item.slug === draft.slug);
      setSelected(next?.slug || null);
      setDraft(current(next) || null);
      setNotice(
        {
          draft: "下書きを保存しました。",
          publish: "公開しました。公開サイトに反映されています。",
          unpublish: "非公開にしました。下書きは残っています。",
          delete: "削除しました。",
        }[action],
      );
      router.refresh();
    } catch (error) {
      setError(error.message || "保存できませんでした。");
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }
  const listed = records.filter(
    (record) =>
      (filter === "all" ||
        (filter === "published" ? record.published : record.draft)) &&
      `${current(record).title} ${current(record).summary}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <section className="managed-editor">
      <div className="managed-editor-toolbar">
        <Link href={type.path} target="_blank" className="editorial-outline">
          公開一覧を見る ↗
        </Link>
        <button
          className="editorial-primary"
          onClick={create}
          disabled={busy || uploading}
        >
          ＋ 新しい{type.label}
        </button>
      </div>
      {notice && (
        <p className="editorial-notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="editorial-error" role="alert">
          {error}
        </p>
      )}
      <div className="editorial-columns">
        <section
          className="editorial-article-list"
          aria-label={`${type.label}一覧`}
        >
          <div className="editorial-stats">
            <div>
              <span>公開中</span>
              <strong>
                {records.filter((record) => record.published).length}
              </strong>
            </div>
            <div>
              <span>下書き</span>
              <strong>{records.filter((record) => record.draft).length}</strong>
            </div>
          </div>
          <label className="editorial-list-search">
            <input
              aria-label={`${type.label}を検索`}
              placeholder="タイトル・概要で検索"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="editorial-list-filters">
            {[
              ["all", "すべて"],
              ["published", "公開中"],
              ["draft", "下書き"],
            ].map(([key, label]) => (
              <button
                key={key}
                className={filter === key ? "active" : ""}
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="editorial-list-items">
            {listed.map((record) => (
              <button
                key={record.slug}
                disabled={busy || uploading}
                className={`editorial-article-row ${selected === record.slug ? "selected" : ""}`}
                onClick={() => select(record)}
              >
                <span
                  className={`editorial-status-dot ${record.published ? "published" : ""}`}
                />
                <span>
                  <strong>{current(record).title}</strong>
                  <small>
                    {current(record).date} ·{" "}
                    {record.published ? "公開中" : "下書き"}
                    {record.published && record.draft ? " / 変更あり" : ""}
                  </small>
                </span>
              </button>
            ))}
            {!listed.length && (
              <p className="editorial-list-empty">
                {records.length
                  ? "該当するページはありません。"
                  : `まだ${type.label}はありません。「新しい${type.label}」から作成できます。`}
              </p>
            )}
          </div>
        </section>
        <section className="editorial-editor">
          {draft ? (
            <>
              <div className="editorial-editor-heading">
                <div>
                  <p className="eyebrow">
                    {record?.published
                      ? "公開中"
                      : record
                        ? "下書き"
                        : "新規作成"}
                  </p>
                  <h2>{type.label}を編集</h2>
                </div>
                <div>
                  <button
                    className="editorial-outline"
                    onClick={() => setPreview(!preview)}
                  >
                    {preview ? "編集に戻る" : "プレビュー"}
                  </button>
                  {record?.published && (
                    <Link
                      href={`${type.path}/${record.slug}`}
                      target="_blank"
                      className="editorial-outline"
                    >
                      公開ページ ↗
                    </Link>
                  )}
                </div>
              </div>
              {preview ? (
                <div className="managed-editor-preview">
                  <img src={draft.image} alt={draft.imageAlt} />
                  <p className="eyebrow">{draft.date}</p>
                  <h2>{draft.title || "タイトル未入力"}</h2>
                  <p>{draft.summary}</p>
                  <p className="editable-lines">{draft.body}</p>
                  {kind === "event" ? (
                    <>
                      <dl>
                        {[
                          ["主催・共催", draft.organizer],
                          ["開催時間", draft.schedule],
                          ["会場", draft.location],
                          ["参加条件", draft.fee],
                        ]
                          .filter(([, value]) => value)
                          .map(([label, value]) => (
                            <div key={label}>
                              <dt>{label}</dt>
                              <dd>{value}</dd>
                            </div>
                          ))}
                      </dl>
                      <p>
                        {
                          {
                            open: "申し込み受付中",
                            closed: "受付終了",
                            coming: "受付開始前",
                          }[draft.registrationStatus]
                        }
                      </p>
                      {draft.registrationStatus === "open" && (
                        <span className="editorial-primary">
                          {draft.applicationLabel || "参加を申し込む"}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <p>
                        {draft.category} {draft.partner}
                      </p>
                      <h3>成果・実績</h3>
                      <p className="editable-lines">{draft.outcomes}</p>
                    </>
                  )}
                </div>
              ) : (
                <fieldset
                  disabled={busy || uploading}
                  className="managed-fields"
                >
                  <label>
                    タイトル
                    <input
                      aria-label="タイトル"
                      maxLength={2000}
                      value={draft.title}
                      onChange={(event) => field("title", event.target.value)}
                    />
                  </label>
                  <label>
                    ページURL
                    <input
                      aria-label="ページURL"
                      value={draft.slug}
                      maxLength={100}
                      disabled={Boolean(record)}
                      onChange={(event) => field("slug", event.target.value)}
                    />
                    <small>
                      {type.path}/{draft.slug}　保存後のURLは固定です。
                    </small>
                  </label>
                  <label>
                    {kind === "event" ? "開催日" : "活動日"}
                    <input
                      aria-label={kind === "event" ? "開催日" : "活動日"}
                      type="date"
                      value={draft.date}
                      onChange={(event) => field("date", event.target.value)}
                    />
                  </label>
                  <label>
                    概要
                    <textarea
                      aria-label="概要"
                      rows={3}
                      maxLength={2000}
                      value={draft.summary}
                      onChange={(event) => field("summary", event.target.value)}
                    />
                  </label>
                  <ImagePicker
                    value={draft.image}
                    alt={draft.imageAlt}
                    onChange={(url) => field("image", url)}
                    onBusy={(value) => {
                      setUploading(value);
                      onBusy(value);
                    }}
                    label="ページ画像"
                  />
                  <label>
                    画像の説明
                    <input
                      aria-label="画像の説明"
                      maxLength={2000}
                      value={draft.imageAlt}
                      onChange={(event) =>
                        field("imageAlt", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    本文
                    <textarea
                      aria-label="本文"
                      rows={12}
                      maxLength={30000}
                      value={draft.body}
                      onChange={(event) => field("body", event.target.value)}
                    />
                    <small>
                      空行で段落を分けられます。公開には日付・概要・本文が必要です。
                    </small>
                  </label>
                  {Object.entries(type.fields).map(([name, label]) => (
                    <label key={name}>
                      {label}
                      {["outcomes", "fee"].includes(name) ? (
                        <textarea
                          aria-label={label}
                          rows={4}
                          maxLength={name === "outcomes" ? 30000 : 2000}
                          value={draft[name]}
                          onChange={(event) => field(name, event.target.value)}
                        />
                      ) : (
                        <input
                          aria-label={label}
                          value={draft[name]}
                          maxLength={2000}
                          type={name === "applicationUrl" ? "url" : "text"}
                          placeholder={
                            name === "applicationUrl"
                              ? "https://forms.gle/…"
                              : undefined
                          }
                          onChange={(event) => field(name, event.target.value)}
                        />
                      )}
                    </label>
                  ))}
                  {kind === "event" && (
                    <label>
                      申し込み受付状態
                      <select
                        aria-label="申し込み受付状態"
                        value={draft.registrationStatus}
                        onChange={(event) =>
                          field("registrationStatus", event.target.value)
                        }
                      >
                        <option value="coming">受付開始前</option>
                        <option value="open">受付中</option>
                        <option value="closed">受付終了</option>
                      </select>
                      <small>
                        受付中では、HTTPSの申し込みフォームURLが必要です。外部フォームへのリンクを表示します。
                      </small>
                    </label>
                  )}
                </fieldset>
              )}
              <div className="managed-save-actions">
                <span>{dirty ? "未保存の変更があります" : "保存済み"}</span>
                <button
                  className="editorial-outline"
                  disabled={busy || uploading}
                  onClick={() => save("draft")}
                >
                  下書き保存
                </button>
                <button
                  className="editorial-primary"
                  disabled={busy || uploading}
                  onClick={() => save("publish")}
                >
                  公開する
                </button>
              </div>
              {record && (
                <div className="managed-delete-actions">
                  {record.published ? (
                    <button
                      className="editorial-outline"
                      disabled={busy || uploading}
                      onClick={() => save("unpublish")}
                    >
                      非公開にする
                    </button>
                  ) : (
                    <button
                      className="editorial-text-danger"
                      disabled={busy || uploading}
                      onClick={() => save("delete")}
                    >
                      この{type.label}を削除する
                    </button>
                  )}
                  <small>公開中のページは非公開にしてから削除できます。</small>
                </div>
              )}
            </>
          ) : (
            <div className="editorial-list-empty">
              <h2>{type.label}を掲載する</h2>
              <p>新しいページを作成して、画像と本文を追加してください。</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
