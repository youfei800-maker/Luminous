"use client";
import Icon from "@/components/icon";
import { useSavedStories } from "@/components/saved-provider";
export default function SaveButton({ slug, title, withLabel = false }) {
  const { saved, toggleSaved } = useSavedStories();
  const isSaved = saved.includes(slug);
  return (
    <button
      type="button"
      className={`${withLabel ? "save-action" : "save-icon"} ${isSaved ? "is-saved" : ""}`}
      onClick={() => toggleSaved(slug)}
      aria-pressed={isSaved}
      aria-label={`${title}を${isSaved ? "保存から削除" : "あとで読むに保存"}`}
      title={isSaved ? "保存から削除" : "あとで読むに保存"}
    >
      <Icon
        name="bookmark"
        size={18}
        fill={isSaved ? "currentColor" : "none"}
      />
      {withLabel && <span>{isSaved ? "保存しました" : "あとで読む"}</span>}
    </button>
  );
}
