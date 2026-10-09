import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedPages } from "@/lib/editorial-store";
import { pageTypes } from "@/lib/managed-pages";
import Icon from "@/components/icon";
export async function ManagedListing({ kind }) {
  const type = pageTypes[kind];
  const pages = (await getPublishedPages(type.key)).sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  return (
    <main id="main-content" className="managed-public page-width">
      <header className="managed-page-heading">
        <p className="eyebrow">{type.eyebrow}</p>
        <h1>
          {kind === "event"
            ? "出会いから、次の一歩へ。"
            : "ともに歩んできた、光の記録。"}
        </h1>
        <p>
          {kind === "event"
            ? "Luminousのイベント・参加申し込みをご案内します。"
            : "イベント、プロジェクト、連携など、これまでの活動をご紹介します。"}
        </p>
      </header>
      {pages.length ? (
        <div className="managed-public-grid">
          {pages.map((page) => (
            <Link
              href={`${type.path}/${page.slug}`}
              className="managed-public-card"
              key={page.slug}
            >
              <div className="managed-card-image">
                <Image
                  src={page.image}
                  alt={page.imageAlt}
                  fill
                  sizes="(max-width: 760px) 100vw, 33vw"
                />
              </div>
              <div>
                <p className="eyebrow">
                  {page.date.replaceAll("-", ".")} ·{" "}
                  {kind === "event"
                    ? registrationLabels[page.registrationStatus]
                    : page.category || "活動実績"}
                </p>
                <h2>{page.title}</h2>
                <p>{page.summary}</p>
                <span className="text-link">
                  詳しく見る <Icon name="diagonal" size={16} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="managed-empty">
          <p>
            {kind === "event"
              ? "現在公開中のイベントはありません。"
              : "活動実績は、準備ができ次第こちらでご紹介します。"}
          </p>
          <Link href="/" className="text-link">
            トップページへ戻る <Icon name="arrow" size={16} />
          </Link>
        </div>
      )}
    </main>
  );
}
const registrationLabels = {
  open: "申し込み受付中",
  closed: "受付終了",
  coming: "受付開始前",
};
export async function ManagedDetail({ kind, slug }) {
  const type = pageTypes[kind];
  const page = (await getPublishedPages(type.key)).find(
    (page) => page.slug === slug,
  );
  if (!page) notFound();
  const information =
    kind === "event"
      ? [
          ["主催・共催", page.organizer],
          ["開催日", page.date.replaceAll("-", ".")],
          ["開催時間", page.schedule],
          ["会場・開催方法", page.location],
          ["参加費・参加条件", page.fee],
        ]
      : [
          ["活動日", page.date.replaceAll("-", ".")],
          ["カテゴリ", page.category],
          ["連携先・クライアント", page.partner],
        ];
  return (
    <main id="main-content" className="managed-public page-width">
      <header className="managed-page-heading">
        <Link href={type.path} className="text-link">
          ← {type.label}一覧
        </Link>
        <p className="eyebrow">{type.eyebrow}</p>
        <h1>{page.title}</h1>
        <p>{page.summary}</p>
      </header>
      <div className="managed-detail-image">
        <Image
          src={page.image}
          alt={page.imageAlt}
          fill
          preload
          sizes="(max-width: 760px) 100vw, 1100px"
        />
      </div>
      <div className="managed-detail-layout">
        <article className="managed-body">
          {page.body
            .split(/\n\s*\n/)
            .filter(Boolean)
            .map((paragraph, index) => (
              <p key={index} className="editable-lines">
                {paragraph}
              </p>
            ))}
          {kind === "activity" && page.outcomes && (
            <section>
              <h2>成果・実績</h2>
              <p className="editable-lines">{page.outcomes}</p>
            </section>
          )}
        </article>
        <aside className="managed-information">
          <h2>{kind === "event" ? "開催概要" : "活動概要"}</h2>
          <dl>
            {information
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd className="editable-lines">{value}</dd>
                </div>
              ))}
          </dl>
          {kind === "event" && (
            <div className="event-apply">
              <p>{registrationLabels[page.registrationStatus]}</p>
              {page.registrationStatus === "open" && page.applicationUrl ? (
                <>
                  <a
                    href={page.applicationUrl}
                    className="solid-button"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {page.applicationLabel} <Icon name="diagonal" size={16} />
                  </a>
                  <small>外部の申し込みフォームが開きます。</small>
                </>
              ) : (
                <p>
                  {page.registrationStatus === "closed"
                    ? "このイベントの申し込み受付は終了しました。"
                    : "申し込み開始までお待ちください。"}
                </p>
              )}
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
export async function managedMetadata(kind, slug) {
  const page = (await getPublishedPages(pageTypes[kind].key)).find(
    (page) => page.slug === slug,
  );
  return {
    title: page?.title || "ページが見つかりません",
    description: page?.summary,
  };
}
