import Link from "next/link";
import Icon from "@/components/icon";
export const metadata = { title: "Bloom career day — 10.24 Event" };
export default function EventPage() {
  return (
    <main id="main-content">
      <section className="event-detail-hero">
        <div className="page-width">
          <p className="eyebrow">LUMINOUS × 丸井グループ</p>
          <h1>
            Bloom
            <br />
            <em>career day.</em>
          </h1>
          <h2>強み発見 × 産休育休のリアルを聞こう。</h2>
          <p className="event-detail-date">
            2026.10.24 <span>SATURDAY</span>
          </p>
        </div>
      </section>
      <section className="event-detail-content page-width">
        <p className="eyebrow">MEET YOUR NEXT POSSIBILITY</p>
        <h2>
          未来のことを、
          <br />
          ひとりで考えなくていい。
        </h2>
        <p>
          自分の強みを見つけること。キャリアと暮らしのリアルを知ること。
          <br />
          新しい選択肢に出会う一日を、Luminousと一緒に。
        </p>
        <div className="event-topics">
          <article>
            <span>01</span>
            <h3>自分の強みを発見する</h3>
            <p>自分について考えることから、次の一歩のヒントを見つける。</p>
          </article>
          <article>
            <span>02</span>
            <h3>産休・育休のリアルを聞く</h3>
            <p>仕事とライフイベントについて、経験のある人の声に触れる。</p>
          </article>
          <article>
            <span>03</span>
            <h3>未来の選択肢をひらく</h3>
            <p>世代を越えて話し、まだ知らなかった可能性に出会う。</p>
          </article>
        </div>
        <div className="event-apply">
          <p>
            開催場所・時間・参加条件などの最新情報は、
            <br />
            参照サイトで案内されている申込フォームをご確認ください。
          </p>
          <a
            href="https://forms.gle/sYNLftEsy6dZdKM98"
            target="_blank"
            rel="noopener noreferrer"
            className="solid-button"
          >
            公式の申込フォームを見る <Icon name="diagonal" size={17} />
          </a>
          <span>外部のGoogleフォームが開きます。</span>
        </div>
        <Link href="/stories" className="text-link">
          まずはストーリーを読む <Icon name="arrow" size={16} />
        </Link>
      </section>
    </main>
  );
}
