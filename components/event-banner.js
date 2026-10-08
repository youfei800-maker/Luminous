import Link from "next/link";
import Icon from "@/components/icon";
export default function EventBanner() {
  return (
    <section className="event-banner">
      <div className="page-width event-banner-inner">
        <div>
          <p className="eyebrow">LET’S MEET · 2026.10.24</p>
          <h2>
            次の一歩を、
            <br />
            一緒に見つけよう。
          </h2>
          <p className="event-script">Bloom career day</p>
          <p className="event-description">
            強み発見 × 産休育休のリアルを聞こう。
            <br />
            Luminous × 丸井グループ
          </p>
          <Link href="/events/bloom-career-day" className="outline-button">
            イベントの詳細を見る <Icon name="diagonal" size={17} />
          </Link>
        </div>
        <div className="event-date" aria-hidden="true">
          <span>OCTOBER</span>
          <strong>24</strong>
          <span>SATURDAY, 2026</span>
        </div>
      </div>
    </section>
  );
}
