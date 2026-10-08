"use client";
import { useState } from "react";
import Link from "next/link";
import { stories, themes, matchesCategory } from "@/lib/stories";
import StoryCard from "@/components/story-card";
import Icon from "@/components/icon";
import { useSavedStories } from "@/components/saved-provider";
export default function StoryGrid({
  initialCategory = "all",
  savedOnly = false,
  compact = false,
}) {
  const [category, setCategory] = useState(initialCategory);
  const [theme, setTheme] = useState("all");
  const [query, setQuery] = useState("");
  const { saved, loaded } = useSavedStories();
  const filtered = stories.filter(
    (story) =>
      matchesCategory(story, category) &&
      (theme === "all" || story.theme === theme) &&
      (!savedOnly || saved.includes(story.slug)) &&
      `${story.title} ${story.name} ${story.role} ${story.theme}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <div className="story-browser">
      {!compact && (
        <label className="listing-search">
          <Icon name="search" size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="名前、職業、キーワードで探す"
            aria-label="一覧をキーワードで絞り込む"
          />
        </label>
      )}
      <div className="story-toolbar">
        <div
          className="category-filters"
          role="group"
          aria-label="ストーリーのカテゴリ"
        >
          {[
            { key: "all", label: "すべて" },
            { key: "girls", label: "Girls" },
            { key: "women", label: "Women" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              className={category === item.key ? "active" : ""}
              aria-pressed={category === item.key}
              onClick={() => setCategory(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="theme-select">
          <span className="sr-only">テーマで絞り込む</span>
          <select
            value={theme}
            onChange={(event) => setTheme(event.target.value)}
          >
            <option value="all">すべてのテーマ</option>
            {themes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <Icon name="down" size={15} />
        </label>
      </div>
      <div className="results-label" aria-live="polite">
        {savedOnly && !loaded
          ? "保存したストーリーを読み込み中…"
          : `${filtered.length} STORIES`}
      </div>
      <div className="story-grid">
        {filtered.map((story) => (
          <StoryCard key={story.slug} story={story} />
        ))}
      </div>
      {filtered.length === 0 && (!savedOnly || loaded) && (
        <div className="empty-state">
          <Icon name={savedOnly ? "bookmark" : "search"} size={34} />
          <h3>
            {savedOnly && saved.length === 0
              ? "気になるストーリーを、ここに。"
              : "該当するストーリーがありません。"}
          </h3>
          <p>
            {savedOnly && saved.length === 0
              ? "記事のブックマークを押すと、このブラウザに保存できます。"
              : "キーワードやテーマを変えて、もう一度探してみてください。"}
          </p>
          {savedOnly && saved.length === 0 ? (
            <Link href="/stories" className="text-link">
              ストーリーを探す <Icon name="arrow" size={16} />
            </Link>
          ) : (
            <button
              className="text-link"
              onClick={() => {
                setCategory("all");
                setTheme("all");
                setQuery("");
              }}
            >
              絞り込みをリセット <Icon name="arrow" size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
