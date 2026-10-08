import Link from "next/link";
import Image from "next/image";
import Icon from "@/components/icon";
import StoryGrid from "@/components/story-grid";
import EventBanner from "@/components/event-banner";
export default function Home() {
  return (
    <main id="main-content">
      <section className="hero">
        <div className="hero-image">
          <Image
            src="/images/bridge.png"
            alt="世代を越えて対話する二人の女性"
            fill
            preload
            sizes="(max-width: 760px) 100vw, 58vw"
          />
          <div className="hero-audience">
            <span>FOR GIRLS</span>
            <i />
            <span>FOR WOMEN</span>
          </div>
          <div className="hero-photo-note">
            <span>STORIES THAT CONNECT US</span>
            <Link href="/stories/ten-years-apart">
              10年後の私に、出会いにいこう。 <Icon name="diagonal" size={18} />
            </Link>
          </div>
        </div>
        <div className="hero-copy">
          <p className="eyebrow">A CATALOGUE OF POSSIBILITIES</p>
          <h1>
            Bloom
            <br />
            <em>
              your
              <br className="hero-line-break" /> future.
            </em>
          </h1>
          <div className="hero-lead">
            <p>「知らなかったから、選べなかった」を減らす。</p>
            <p>
              これから未来を選ぶ女子学生と、
              <br />
              選んできた女性たちの物語をつなぐメディア。
            </p>
          </div>
          <Link href="/stories" className="hero-cta">
            あなたの未来のヒントを探す <Icon name="diagonal" size={18} />
          </Link>
          <a className="hero-scroll" href="#latest-stories">
            SCROLL TO DISCOVER <span>↓</span>
          </a>
        </div>
      </section>
      <section className="belief-strip page-width">
        <p className="eyebrow">OUR BELIEF</p>
        <h2>
          ひとりひとりの選択に、<span>光を。</span>
        </h2>
        <p>
          迷いも、遠回りも、あなたの物語。
          <br />
          誰かの経験が、次の一歩のヒントになる。
        </p>
        <Icon name="star" size={37} />
      </section>
      <section id="latest-stories" className="stories-section page-width">
        <div className="section-heading">
          <div>
            <p className="eyebrow">01 — REAL LIVES, REAL STORIES</p>
            <h2>
              Her <em>light.</em>
            </h2>
            <p className="section-description">
              ひとりひとりの、キャリアのかたち。
            </p>
          </div>
          <Link href="/stories" className="text-link">
            すべてのストーリー <Icon name="diagonal" size={16} />
          </Link>
        </div>
        <StoryGrid compact />
        <div className="stories-bottom">
          <p>その人だけの選択に、会いにいこう。</p>
          <Link href="/stories" className="outline-button dark">
            もっとストーリーを探す <Icon name="arrow" size={18} />
          </Link>
        </div>
      </section>
      <section className="two-voices">
        <div className="page-width voices-grid">
          <div className="voices-heading">
            <p className="eyebrow">02 — TWO VOICES, ONE FUTURE</p>
            <h2>
              Her
              <br />
              <em>choices.</em>
            </h2>
            <p>
              今のあなたにも、
              <br />
              これからのあなたにも。
            </p>
          </div>
          <Link href="/girls" className="voice">
            <span className="voice-number">01</span>
            <p className="voice-label">For girls</p>
            <h3>
              まだ見ぬ私へ、
              <br />
              一歩踏みだす。
            </h3>
            <p>
              夢中なことも、まだ言葉にならない迷いも。
              <br />
              自分の可能性を探している、あなたへ。
            </p>
            <span className="text-link">
              Girlsのストーリーを読む <Icon name="diagonal" size={16} />
            </span>
          </Link>
          <Link href="/women" className="voice">
            <span className="voice-number">02</span>
            <p className="voice-label">For women</p>
            <h3>
              選択を重ねて、
              <br />
              私らしく生きる。
            </h3>
            <p>
              キャリアと暮らし、人生の転機。
              <br />
              その先に見つけた、知恵と可能性。
            </p>
            <span className="text-link">
              Womenのストーリーを読む <Icon name="diagonal" size={16} />
            </span>
          </Link>
        </div>
      </section>
      <section className="manifesto page-width">
        <div>
          <p className="eyebrow">03 — WHAT WE BELIEVE</p>
          <span className="manifesto-script">Pass the light on.</span>
        </div>
        <div>
          <h2>
            人生を通して、
            <br />
            輝き続ける女性で
            <br />
            溢れた社会へ。
          </h2>
          <p>
            キャリアか、家庭か。挑戦か、安定か。
            <br />
            どちらかを諦める前に、まだ知らない生き方に出会う。
            <br />
            Luminousは、女性の「今」だけでなく「人生全体」を見つめます。
          </p>
          <Link href="/about" className="text-link">
            Luminousについて <Icon name="diagonal" size={16} />
          </Link>
        </div>
      </section>
      <EventBanner />
    </main>
  );
}
