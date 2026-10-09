// Shared field definitions contain no credentials or server-only dependencies.
export const pageTypes = {
  event: {
    key: "events",
    label: "イベント",
    heading: "イベント管理",
    path: "/events",
    eyebrow: "LET’S MEET",
    fields: {
      organizer: "主催・共催",
      schedule: "開催時間",
      location: "会場・開催方法",
      fee: "参加費・参加条件",
      applicationUrl: "申し込みフォームURL",
      applicationLabel: "申し込みボタンの文言",
    },
  },
  activity: {
    key: "activities",
    label: "活動実績",
    heading: "活動実績管理",
    path: "/activities",
    eyebrow: "OUR JOURNEY",
    fields: {
      category: "活動カテゴリ",
      partner: "連携先・クライアント",
      outcomes: "成果・実績",
    },
  },
};
export function defaultEvents() {
  return [
    {
      slug: "bloom-career-day",
      version: 1,
      draft: null,
      published: {
        slug: "bloom-career-day",
        title: "Bloom career day",
        summary: "強み発見 × 産休育休のリアルを聞こう。",
        date: "2026-10-24",
        image: "/images/bridge.png",
        imageAlt: "世代を越えて対話する女性たち",
        organizer: "Luminous × 丸井グループ",
        schedule: "",
        location: "",
        fee: "",
        applicationUrl: "https://forms.gle/sYNLftEsy6dZdKM98",
        applicationLabel: "公式の申込フォームを見る",
        registrationStatus: "open",
        body: "未来のことを、ひとりで考えなくていい。\n\n自分の強みを見つけること。キャリアと暮らしのリアルを知ること。新しい選択肢に出会う一日を、Luminousと一緒に。\n\n自分の強みを発見する\n自分について考えることから、次の一歩のヒントを見つける。\n\n産休・育休のリアルを聞く\n仕事とライフイベントについて、経験のある人の声に触れる。\n\n未来の選択肢をひらく\n世代を越えて話し、まだ知らなかった可能性に出会う。\n\n開催場所・時間・参加条件などの最新情報は、申込フォームをご確認ください。",
      },
    },
  ];
}
function fail(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}
export function validateImage(value) {
  if (
    !/^\/images\/[\w.-]+$/.test(value) &&
    !/^\/media\/[a-f0-9-]+\.(jpg|png|webp)$/.test(value)
  )
    fail("画像を選択またはアップロードしてください。");
}
export function validatePage(input, kind, publishing) {
  if (!input || typeof input !== "object") fail("ページの内容がありません。");
  const fields = [
    "slug",
    "title",
    "summary",
    "date",
    "image",
    "imageAlt",
    "body",
    ...Object.keys(pageTypes[kind].fields),
  ];
  const page = {};
  for (const field of fields) {
    const value = input[field] ?? "";
    if (
      typeof value !== "string" ||
      value.length > (["body", "outcomes"].includes(field) ? 30000 : 2000)
    )
      fail("入力内容の形式または文字数を確認してください。");
    page[field] = value.trim();
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page.slug) || page.slug.length > 100)
    fail("ページURLは100文字以内の半角英数字とハイフンで指定してください。");
  if (!page.title) fail("タイトルを入力してください。");
  if (
    page.date &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(page.date) ||
      Number.isNaN(Date.parse(page.date)) ||
      new Date(page.date).toISOString().slice(0, 10) !== page.date)
  )
    fail("正しい日付を指定してください。");
  validateImage(page.image);
  if (kind === "event") {
    page.registrationStatus = input.registrationStatus;
    if (!["open", "closed", "coming"].includes(page.registrationStatus))
      fail("申し込み受付状態を選択してください。");
    if (page.applicationUrl) {
      let url;
      try {
        url = new URL(page.applicationUrl);
      } catch {
        fail("申し込みURLは https:// から始まるURLを指定してください。");
      }
      if (url.protocol !== "https:" || url.username || url.password)
        fail("申し込みURLは https:// から始まるURLを指定してください。");
    }
    if (
      publishing &&
      page.registrationStatus === "open" &&
      (!page.applicationUrl || !page.applicationLabel)
    )
      fail("受付中のイベントには申し込みURLとボタンの文言を入力してください。");
  }
  if (publishing && (!page.date || !page.summary || !page.body))
    fail("公開には日付・概要・本文を入力してください。");
  return page;
}
