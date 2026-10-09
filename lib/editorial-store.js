import "server-only";
import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { stories } from "@/lib/stories";
import { dataDirectory } from "@/lib/editorial-account.mjs";
import {
  defaultEvents,
  validatePage,
  validateImage,
} from "@/lib/managed-pages";

export const defaultSite = {
  heroImage: "/images/bridge.png",
  heroImageAlt: "世代を越えて対話する女性たち",
  heroImagePosition: "center",
  heroTitle: "Bloom",
  heroAccent: "your future.",
  heroLead: "「知らなかったから、選べなかった」を減らす。",
  heroDescription:
    "これから未来を選ぶ女子学生と、\n選んできた女性たちの物語をつなぐメディア。",
  missionTitle: "人生を通して、\n輝き続ける女性で\n溢れた社会へ。",
  missionDescription:
    "キャリアか、家庭か。挑戦か、安定か。\nどちらかを諦める前に、まだ知らない生き方に出会う。\nLuminousは、女性の「今」だけでなく「人生全体」を見つめます。",
};
export async function getContent() {
  try {
    const content = JSON.parse(
      await readFile(path.join(dataDirectory(), "content.json"), "utf8"),
    );
    return {
      ...content,
      site: { ...defaultSite, ...content.site },
      events: content.events ?? defaultEvents(),
      activities: content.activities ?? [],
    };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return {
      records: stories.map((story) => ({
        slug: story.slug,
        published: { ...story, isDemo: true },
        draft: null,
        version: 1,
      })),
      site: defaultSite,
      siteVersion: 1,
      events: defaultEvents(),
      activities: [],
    };
  }
}
export async function getPublishedPages(kind) {
  return (await getContent())[kind]
    .map((record) => record.published)
    .filter(Boolean);
}
export async function getPublishedStories() {
  return (await getContent()).records
    .map((record) => record.published)
    .filter(Boolean);
}
let queue = Promise.resolve();
function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
function text(value, limit = 2000) {
  if (typeof value !== "string" || value.length > limit)
    fail("入力内容の形式または文字数を確認してください。");
  return value.trim();
}
function validateArticle(input, publishing) {
  if (!input || typeof input !== "object") fail("記事の内容がありません。");
  const article = {};
  for (const name of [
    "slug",
    "title",
    "excerpt",
    "category",
    "theme",
    "name",
    "role",
    "age",
    "image",
    "imageAlt",
    "position",
    "date",
    "quote",
    "introduction",
    "profile",
  ])
    article[name] = text(
      input[name] ?? "",
      ["introduction", "profile"].includes(name) ? 10000 : 2000,
    );
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug) ||
    article.slug.length > 100
  )
    fail("記事URLは100文字以内の半角英数字とハイフンで指定してください。");
  if (!article.title) fail("タイトルを入力してください。");
  if (!["girls", "women", "cross-talk"].includes(article.category))
    fail("カテゴリを選択してください。");
  if (
    !/^\/images\/[\w.-]+$/.test(article.image) &&
    !/^\/media\/[a-f0-9-]+\.(jpg|png|webp)$/.test(article.image)
  )
    fail("メイン画像を選択してください。");
  if (
    !/^\d{4}\.\d{2}\.\d{2}$/.test(article.date) ||
    Number.isNaN(Date.parse(article.date.replaceAll(".", "-"))) ||
    new Date(article.date.replaceAll(".", "-")).toISOString().slice(0, 10) !==
      article.date.replaceAll(".", "-")
  )
    fail("掲載日を指定してください。");
  article.position = "center 40%";
  article.isDemo = input.isDemo === true;
  article.readingTime = Number(input.readingTime);
  if (
    !Number.isInteger(article.readingTime) ||
    article.readingTime < 1 ||
    article.readingTime > 120
  )
    fail("読了時間は1〜120分で指定してください。");
  if (
    !Array.isArray(input.sections) ||
    input.sections.length > 30 ||
    !Array.isArray(input.timeline) ||
    input.timeline.length > 30
  )
    fail("本文・年表は各30件以内で入力してください。");
  article.sections = input.sections.map((section) => {
    if (!Array.isArray(section.paragraphs) || section.paragraphs.length > 50)
      fail("段落の数が多すぎます。");
    return {
      heading: text(section.heading, 300),
      paragraphs: section.paragraphs
        .map((paragraph) => text(paragraph, 10000))
        .filter(Boolean),
    };
  });
  article.timeline = input.timeline.map((item) => ({
    year: text(item.year, 30),
    title: text(item.title, 300),
    text: text(item.text, 2000),
  }));
  if (
    publishing &&
    (!article.name ||
      !article.role ||
      !article.introduction ||
      !article.sections.length ||
      article.sections.some(
        (section) => !section.heading || !section.paragraphs.length,
      ))
  )
    fail(
      "公開には人物名・職業・導入文と、見出しと本文のある章を入力してください。",
    );
  return article;
}
export function updateContent(input) {
  const operation = queue
    .catch(() => {})
    .then(async () => {
      const content = await getContent();
      if (input.kind === "site") {
        if (input.version !== content.siteVersion)
          fail(
            "他の画面で更新されています。再読み込みして内容を確認してください。",
            409,
          );
        const site = {};
        for (const key of Object.keys(defaultSite)) {
          site[key] = text(input.site?.[key] ?? content.site[key], 3000);
          if (!site[key] && key !== "heroImageAlt")
            fail("サイト設定の項目をすべて入力してください。");
        }
        validateImage(site.heroImage);
        if (!["center", "top", "bottom"].includes(site.heroImagePosition))
          fail("画像の表示位置を確認してください。");
        content.site = site;
        content.siteVersion += 1;
      } else if (["article", "event", "activity"].includes(input.kind)) {
        if (!["draft", "publish", "unpublish", "delete"].includes(input.action))
          fail("保存方法を確認してください。");
        const key = {
          article: "records",
          event: "events",
          activity: "activities",
        }[input.kind];
        const article =
          input.kind === "article"
            ? validateArticle(input.article, input.action === "publish")
            : validatePage(input.page, input.kind, input.action === "publish");
        let record = content[key].find((item) => item.slug === article.slug);
        if (input.version !== (record?.version ?? 0))
          fail(
            "他の画面で更新されています。再読み込みして内容を確認してください。",
            409,
          );
        if (!record) {
          if (["delete", "unpublish"].includes(input.action))
            fail("記事が見つかりません。", 404);
          record = {
            slug: article.slug,
            published: null,
            draft: null,
            version: 0,
          };
          content[key].unshift(record);
        }
        if (input.action === "draft") record.draft = article;
        if (input.action === "publish") {
          record.published = article;
          record.draft = null;
        }
        if (input.action === "unpublish") {
          record.draft = record.draft || record.published || article;
          record.published = null;
        }
        if (input.action === "delete") {
          if (record.published)
            fail("公開中の記事は、先に非公開にしてください。");
          content[key] = content[key].filter(
            (item) => item.slug !== article.slug,
          );
        }
        record.version += 1;
      } else fail("保存対象を確認してください。");
      await mkdir(dataDirectory(), { recursive: true, mode: 0o700 });
      const target = path.join(dataDirectory(), "content.json");
      const temporary = `${target}.${randomUUID()}.tmp`;
      await writeFile(temporary, JSON.stringify(content), { mode: 0o600 });
      await rename(temporary, target);
      return content;
    });
  queue = operation;
  return operation;
}
