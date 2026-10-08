"use client";
import { useState } from "react";
import Icon from "@/components/icon";
export default function ShareButton({ title }) {
  const [status, setStatus] = useState("");
  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setStatus("リンクをコピーしました");
      }
    } catch (error) {
      if (error.name !== "AbortError")
        setStatus("アドレスバーのURLから共有できます");
    }
  }
  return (
    <div className="share-wrap">
      <button className="save-action" onClick={share}>
        <Icon name="share" size={18} />
        <span>シェアする</span>
      </button>
      <span className="share-status" role="status">
        {status}
      </span>
    </div>
  );
}
