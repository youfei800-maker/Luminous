import Link from "next/link";
import Icon from "@/components/icon";
export default function Footer({ site, hasDemo }) {
  return (
    <footer className="site-footer">
      <div className="footer-top page-width">
        <div>
          <Link href="/" className="footer-wordmark">
            LUMINOUS
          </Link>
          <p className="footer-mission editable-lines">{site.missionTitle}</p>
          <p className="footer-tagline">Future, in every light.</p>
        </div>
        <nav aria-label="フッターナビゲーション">
          <Link href="/stories">
            すべてのストーリー <Icon name="diagonal" size={16} />
          </Link>
          <Link href="/girls">
            Girls — 未来を選ぶあなたへ <Icon name="diagonal" size={16} />
          </Link>
          <Link href="/women">
            Women — 自分らしく歩むあなたへ <Icon name="diagonal" size={16} />
          </Link>
          <Link href="/about">
            Luminousについて <Icon name="diagonal" size={16} />
          </Link>
          <Link href="/events">
            イベント <Icon name="diagonal" size={16} />
          </Link>
          <Link href="/activities">
            活動実績 <Icon name="diagonal" size={16} />
          </Link>
          <Link href="/saved">
            あとで読む <Icon name="bookmark" size={15} />
          </Link>
          <Link href="/editorial/login">
            編集部ログイン <Icon name="diagonal" size={15} />
          </Link>
        </nav>
      </div>
      <div className="footer-bottom page-width">
        <span>© 2026 Luminous</span>
        <span>
          {hasDemo
            ? "一部のプロフィール・記事はデモ用の架空のストーリーです。"
            : "Future, in every light."}
        </span>
        <a href="#main-content">BACK TO TOP ↑</a>
      </div>
    </footer>
  );
}
