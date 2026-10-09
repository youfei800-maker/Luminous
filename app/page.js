import Link from "next/link";
import Image from "next/image";
import Icon from "@/components/icon";
import StoryGrid from "@/components/story-grid";
import EventBanner from "@/components/event-banner";
import { getContent, getPublishedStories } from "@/lib/editorial-store";
export default async function Home() {
  const [content, stories] = await Promise.all([
    getContent(),
    getPublishedStories(),
  ]);
  const site = content.site;
  const featured =
    stories.find((story) => story.slug === "ten-years-apart") || stories[0];
  return (
    <main id="main-content">
      <section className="hero">
        <div className="hero-image">
          <Image
            src={site.heroImage}
            alt={site.heroImageAlt}
            style={{ objectPosition: site.heroImagePosition }}
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
            <Link href={featured ? `/stories/${featured.slug}` : "/stories"}>
              {featured ? featured.title : "あなたの未来のヒントを探す"}{" "}
              <Icon name="diagonal" size={18} />
            </Link>
          </div>
        </div>
        <div className="hero-copy">
          <p className="eyebrow">A CATALOGUE OF POSSIBILITIES</p>
          <h1>
            {site.heroTitle}
            <br />
            <em>{site.heroAccent}</em>
          </h1>
          <div className="hero-lead">
            <p>{site.heroLead}</p>
            <p className="editable-lines">{site.heroDescription}</p>
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
        <StoryGrid stories={stories} compact />
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
          <h2 className="editable-lines">{site.missionTitle}</h2>
          <p className="editable-lines">{site.missionDescription}</p>
          <Link href="/about" className="text-link">
            Luminousについて <Icon name="diagonal" size={16} />
          </Link>
        </div>
      </section>
      <EventBanner
        events={content.events
          .map((record) => record.published)
          .filter(Boolean)}
      />
    </main>
  );
}
