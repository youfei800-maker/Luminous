import Link from "next/link";
import Image from "next/image";
import Icon from "@/components/icon";
import SaveButton from "@/components/save-button";
export default function StoryCard({ story }) {
  return (
    <article className="story-card">
      <div className="story-image-wrap">
        <Link
          href={`/stories/${story.slug}`}
          aria-label={`${story.title}を読む`}
        >
          <Image
            src={story.image}
            alt={story.imageAlt}
            fill
            sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
            style={{ objectPosition: story.position }}
          />
          <span className="story-image-tag">{story.theme}</span>
        </Link>
        <SaveButton slug={story.slug} title={story.title} />
      </div>
      <div className="story-meta">
        <span className={`category-label ${story.category}`}>
          {story.category === "cross-talk" ? "Girls × Women" : story.category}
        </span>
        <span>{story.readingTime} min read</span>
      </div>
      <Link href={`/stories/${story.slug}`} className="story-title-link">
        <h3>{story.title}</h3>
      </Link>
      <p className="story-excerpt">{story.excerpt}</p>
      <div className="story-byline">
        <div>
          <strong>{story.name}</strong>
          <span>{story.role}</span>
        </div>
        <Link
          href={`/stories/${story.slug}`}
          className="card-arrow"
          aria-label={`${story.name}のストーリーを読む`}
        >
          <Icon name="diagonal" size={20} />
        </Link>
      </div>
    </article>
  );
}
