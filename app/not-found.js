import Link from "next/link";
import Icon from "@/components/icon";
export default function NotFound() {
  return (
    <main id="main-content" className="not-found page-width">
      <p className="eyebrow">404 — A LIGHT TO BE FOUND</p>
      <h1>
        Let’s find
        <br />
        <em>another light.</em>
      </h1>
      <p>お探しのページが見つかりませんでした。</p>
      <Link href="/stories" className="outline-button dark">
        ストーリーを探す <Icon name="arrow" size={18} />
      </Link>
    </main>
  );
}
