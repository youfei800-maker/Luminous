import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getPublishedStories } from "@/lib/editorial-store";
import Icon from "@/components/icon";
import StoryCard from "@/components/story-card";
import SaveButton from "@/components/save-button";
import ShareButton from "@/components/share-button";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const story = (await getPublishedStories()).find(
    (item) => item.slug === slug,
  );
  return story
    ? { title: story.title, description: story.excerpt }
    : { title: "ストーリーが見つかりません" };
}
export default async function StoryPage({ params }) {
  const { slug } = await params;
  const stories = await getPublishedStories();
  const story = stories.find((item) => item.slug === slug);
  if (!story) notFound();
  const related = stories
    .filter((item) => item.slug !== story.slug)
    .sort(
      (a, b) =>
        Number(b.category === story.category) -
        Number(a.category === story.category),
    )
    .slice(0, 3);
  return (
    <main id="main-content" className="article-page">
      <div className="page-width">
        <nav className="breadcrumbs" aria-label="パンくずリスト">
          <Link href="/">Home</Link>
          <span>/</span>
          <Link href="/stories">Stories</Link>
          <span>/</span>
          <span>{story.category}</span>
        </nav>
      </div>
      <header className="article-header">
        <div className="article-category">
          <span>
            {story.category === "cross-talk"
              ? "GIRLS × WOMEN"
              : story.category.toUpperCase()}
          </span>
          <span>{story.theme}</span>
        </div>
        <h1>{story.title}</h1>
        <p className="article-deck">{story.excerpt}</p>
        <div className="article-person">
          <strong>{story.name}</strong>
          <span>{story.role}</span>
        </div>
        <div className="article-info">
          <time dateTime={story.date.replaceAll(".", "-")}>{story.date}</time>
          <span>INTERVIEW & STORY</span>
          <span>
            <Icon name="clock" size={14} /> {story.readingTime} min read
          </span>
        </div>
      </header>
      <div className="article-cover page-width">
        <Image
          src={story.image}
          alt={story.imageAlt}
          fill
          preload
          sizes="(max-width: 1280px) 100vw, 1240px"
          style={{ objectPosition: story.position }}
        />
      </div>
      <div className="article-layout page-width">
        <article className="article-body">
          <p className="article-introduction">{story.introduction}</p>
          <blockquote>
            <span>“</span>
            {story.quote}
          </blockquote>
          {story.sections.map((section, index) => (
            <section id={`chapter-${index + 1}`} key={section.heading}>
              <p className="chapter-number">0{index + 1} — HER STORY</p>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph, pIndex) => (
                <p key={pIndex}>{paragraph}</p>
              ))}
            </section>
          ))}
          <section id="career-timeline" className="career-timeline">
            <p className="eyebrow">HER JOURNEY</p>
            <h2>これまでの、そしてこれからの私。</h2>
            <ol>
              {story.timeline.map((item) => (
                <li key={item.year}>
                  <span className="timeline-year">{item.year}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <div className="article-actions">
            <SaveButton slug={story.slug} title={story.title} withLabel />
            <ShareButton title={story.title} />
          </div>
          {story.isDemo && (
            <p className="demo-note">
              このプロフィールと記事本文は、サイトの体験を紹介するための架空のストーリーです。
            </p>
          )}
        </article>
        <aside className="article-sidebar">
          <div className="profile-card">
            <p className="eyebrow">MEET HER</p>
            <div className="profile-image">
              <Image
                src={story.image}
                alt=""
                fill
                sizes="260px"
                style={{ objectPosition: story.position }}
              />
            </div>
            <h2>{story.name}</h2>
            <p className="profile-role">
              {story.role} / {story.age}
            </p>
            <p>{story.profile}</p>
            <span className="profile-tag">{story.theme}</span>
          </div>
          <nav className="article-toc" aria-label="記事の目次">
            <p className="eyebrow">IN THIS STORY</p>
            {story.sections.map((section, index) => (
              <a href={`#chapter-${index + 1}`} key={section.heading}>
                <span>0{index + 1}</span>
                {section.heading}
              </a>
            ))}
            <a href="#career-timeline">
              <span>04</span>キャリアの歩み
            </a>
          </nav>
        </aside>
      </div>
      <section className="related-section page-width">
        <div className="section-heading">
          <div>
            <p className="eyebrow">YOUR NEXT INSPIRATION</p>
            <h2>
              More <em>light.</em>
            </h2>
          </div>
          <Link href="/stories" className="text-link">
            すべてのストーリー <Icon name="diagonal" size={16} />
          </Link>
        </div>
        <div className="story-grid">
          {related.map((item) => (
            <StoryCard key={item.slug} story={item} />
          ))}
        </div>
      </section>
    </main>
  );
}
