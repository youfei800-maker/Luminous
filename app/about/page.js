import Link from "next/link";
import Image from "next/image";
import Icon from "@/components/icon";
export const metadata = { title: "Luminousについて" };
export default function AboutPage() {
  return (
    <main id="main-content">
      <section className="about-hero page-width">
        <p className="eyebrow">ABOUT LUMINOUS</p>
        <h1>
          Future,
          <br />
          <em>in every light.</em>
        </h1>
        <h2>
          知らなかったから、
          <br />
          選べなかった、を減らす。
        </h2>
        <p>
          ひとつの正解ではなく、いくつもの可能性。
          <br />
          女性一人ひとりの人生から、未来の選択肢をひらくメディアです。
        </p>
      </section>
      <div className="about-photo page-width">
        <Image
          src="/images/bridge.png"
          alt="世代を越えて対話する二人の女性"
          fill
          sizes="(max-width: 1280px) 100vw, 1240px"
        />
      </div>
      <section className="about-content page-width">
        <div className="about-vision">
          <p className="eyebrow">OUR VISION</p>
          <h2>
            人生を通して、
            <br />
            輝き続ける女性で
            <br />
            溢れた社会へ。
          </h2>
          <div>
            <p>
              キャリアか、家庭か。挑戦か、安定か。どちらかを諦める前に、まだ知らない生き方に出会える場所をつくる。
            </p>
            <p>
              Luminousは、女性の「今」だけでなく「人生全体」を見つめます。順調な日々だけでなく、迷いや葛藤、立ち止まった時間も、その人の大切な物語として届けます。
            </p>
          </div>
        </div>
        <div className="about-values">
          {[
            {
              number: "01",
              title: "Real",
              subtitle: "ありのままの物語",
              text: "輝きだけでなく、その手前にあった迷いや葛藤にも向き合う。",
            },
            {
              number: "02",
              title: "Connection",
              subtitle: "世代を越えるつながり",
              text: "これから選ぶ人と、選んできた人。経験が、次の誰かの可能性になる。",
            },
            {
              number: "03",
              title: "Your choice",
              subtitle: "自分の意思で選ぶ",
              text: "誰かの正解をなぞるのではなく、自分なりの選択を重ねていく。",
            },
          ].map((value) => (
            <article key={value.number}>
              <span>{value.number}</span>
              <h3>{value.title}</h3>
              <h4>{value.subtitle}</h4>
              <p>{value.text}</p>
            </article>
          ))}
        </div>
        <div className="about-closing">
          <Icon name="star" size={44} />
          <h2>次は、あなたの未来に出会う番。</h2>
          <Link href="/stories" className="outline-button dark">
            ストーリーを探す <Icon name="arrow" size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}
