import StoryGrid from "@/components/story-grid";
import Icon from "@/components/icon";
import { getPublishedStories } from "@/lib/editorial-store";
export default async function StoriesLanding({
  category = "all",
  savedOnly = false,
}) {
  const stories = await getPublishedStories();
  const copy = savedOnly
    ? {
        eyebrow: "YOUR PERSONAL COLLECTION",
        title: "Your",
        emphasis: "inspiration.",
        lead: "また読みたい、いつかの自分に届けたい。",
        description: "保存したストーリーは、このブラウザに残ります。",
      }
    : category === "girls"
      ? {
          eyebrow: "FOR GIRLS — STILL BECOMING",
          title: "Your future",
          emphasis: "starts here.",
          lead: "まだ見ぬ私へ、一歩踏みだす。",
          description:
            "夢中なことも、迷いも。自分の可能性を探している、あなたへ。",
        }
      : category === "women"
        ? {
            eyebrow: "FOR WOMEN — KEEP BLOOMING",
            title: "Every choice,",
            emphasis: "your own.",
            lead: "選択を重ねて、私らしく生きる。",
            description:
              "キャリアと暮らし、人生の転機。その先で見つけた、知恵と可能性。",
          }
        : {
            eyebrow: "A CATALOGUE OF POSSIBILITIES",
            title: "Every story,",
            emphasis: "a new light.",
            lead: "あなたの未来の、ヒントを。",
            description:
              "ひとりひとりのキャリアと人生。気になる物語から、出会ってみませんか。",
          };
  return (
    <main id="main-content">
      <section className="listing-hero">
        <div className="page-width">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1>
            {copy.title}
            <br />
            <em>{copy.emphasis}</em>
          </h1>
          <div className="listing-intro">
            <div>
              <h2>{copy.lead}</h2>
              <p>{copy.description}</p>
            </div>
            <Icon name="star" size={60} />
          </div>
        </div>
      </section>
      <section className="listing-section page-width">
        <StoryGrid
          stories={stories}
          key={category}
          initialCategory={category}
          savedOnly={savedOnly}
        />
      </section>
    </main>
  );
}
