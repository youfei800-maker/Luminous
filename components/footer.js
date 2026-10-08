import Link from "next/link";
import Icon from "@/components/icon";
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top page-width">
        <div>
          <Link href="/" className="footer-wordmark">
            LUMINOUS
          </Link>
          <p className="footer-mission">
            人生を通して、
            <br />
            輝き続ける女性で溢れた社会へ。
          </p>
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
          <Link href="/saved">
            あとで読む <Icon name="bookmark" size={15} />
          </Link>
        </nav>
      </div>
      <div className="footer-bottom page-width">
        <span>© 2026 Luminous</span>
        <span>掲載プロフィール・記事本文はデモ用の架空のストーリーです。</span>
        <a href="#main-content">BACK TO TOP ↑</a>
      </div>
    </footer>
  );
}
