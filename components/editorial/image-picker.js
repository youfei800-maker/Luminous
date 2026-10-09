"use client";
import { useState } from "react";
const images = [
  ["/images/bridge.png", "対話するふたり"],
  ["/images/girls.png", "Girls"],
  ["/images/women.png", "Women"],
  ["/images/team.jpg", "チーム"],
  ["/images/learning.jpg", "学び"],
  ["/images/designer.jpg", "ポートレート"],
];
export default function ImagePicker({
  value,
  alt,
  onChange,
  onBusy,
  disabled = false,
  label = "表示画像",
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("5MB以内の画像を選択してください。");
      event.target.value = "";
      return;
    }
    setBusy(true);
    onBusy?.(true);
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
      onChange(result.url);
    } catch (error) {
      setError(error.message || "画像をアップロードできませんでした。");
    } finally {
      setBusy(false);
      onBusy?.(false);
      event.target.value = "";
    }
  }
  return (
    <div className="managed-image-picker">
      <img src={value} alt={alt || "選択中の画像"} />
      <label>
        {label}
        <select
          aria-label={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled || busy}
        >
          {!images.some(([url]) => url === value) && (
            <option value={value}>アップロードした画像</option>
          )}
          {images.map(([url, name]) => (
            <option key={url} value={url}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label>
        {label}をアップロード
        <input
          aria-label={`${label}をアップロード`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={upload}
          disabled={disabled || busy}
        />
        <small>
          JPEG・PNG・WebP / 5MB以下。アップロード後に保存してください。
        </small>
      </label>
      {busy && <p role="status">画像をアップロードしています…</p>}
      {error && (
        <p className="editorial-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
