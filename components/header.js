"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/icon";
const links = [
  { href: "/stories", label: "Stories" },
  { href: "/girls", label: "Girls" },
  { href: "/women", label: "Women" },
  { href: "/about", label: "About" },
];
export default function Header({ stories }) {
  const pathname = usePathname();
  const dialog = useRef(null);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    setMenuOpen(false);
    dialog.current?.close();
  }, [pathname]);
  const results = stories.filter((story) =>
    `${story.title} ${story.name} ${story.role} ${story.theme} ${story.category}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  function openSearch() {
    setQuery("");
    dialog.current?.showModal();
  }
  function closeSearch() {
    dialog.current?.close();
  }
  return (
    <>
      <a className="skip-link" href="#main-content">
        本文へ移動
      </a>
      <header className={`site-header ${pathname === "/" ? "on-hero" : ""}`}>
        <Link href="/" className="wordmark" aria-label="Luminous ホーム">
          LUMINOUS<span>Future, in every light.</span>
        </Link>
        <nav aria-label="メインナビゲーション" className="desktop-nav">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="header-tools">
          <Link className="event-nav" href="/events/bloom-career-day">
            <span className="event-dot" />
            10.24 Event <Icon name="diagonal" size={14} />
          </Link>
          <button
            className="icon-button"
            onClick={openSearch}
            aria-label="ストーリーを検索"
          >
            <Icon name="search" size={19} />
          </button>
          <Link className="icon-button" href="/saved" aria-label="あとで読む">
            <Icon name="bookmark" size={18} />
          </Link>
          <button
            className="icon-button mobile-menu-button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
          >
            <Icon name={menuOpen ? "close" : "menu"} />
          </button>
        </div>
        {menuOpen && (
          <nav
            id="mobile-navigation"
            aria-label="モバイルナビゲーション"
            className="mobile-nav"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
                <Icon name="diagonal" />
              </Link>
            ))}
            <Link
              href="/events/bloom-career-day"
              onClick={() => setMenuOpen(false)}
            >
              10.24 Event
              <Icon name="diagonal" />
            </Link>
          </nav>
        )}
      </header>
      <dialog
        className="search-dialog"
        ref={dialog}
        aria-labelledby="search-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) closeSearch();
        }}
      >
        <div className="search-panel">
          <div className="flex items-center justify-between">
            <p className="eyebrow">FIND YOUR INSPIRATION</p>
            <button
              className="icon-button"
              onClick={closeSearch}
              aria-label="検索を閉じる"
            >
              <Icon name="close" />
            </button>
          </div>
          <h2 id="search-title">あなたの未来の、ヒントを。</h2>
          <label className="search-field">
            <Icon name="search" />
            <input
              autoFocus
              aria-label="キーワードでストーリーを検索"
              placeholder="名前、職業、気になるキーワード"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <p className="search-count" role="status">
            {query ? `「${query}」の検索結果` : "すべてのストーリー"} ·{" "}
            {results.length}件
          </p>
          <div className="search-results">
            {results.map((story) => (
              <Link
                href={`/stories/${story.slug}`}
                key={story.slug}
                onClick={closeSearch}
              >
                <img src={story.image} alt="" />
                <div>
                  <span>
                    {story.category} / {story.name}
                  </span>
                  <h3>{story.title}</h3>
                </div>
                <Icon name="diagonal" />
              </Link>
            ))}
            {results.length === 0 && (
              <p className="empty-text">
                該当するストーリーがありません。別のキーワードで探してみてください。
              </p>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
