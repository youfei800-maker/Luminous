import localFont from "next/font/local";
import "./globals.css";
import Header from "@/components/header";
import Footer from "@/components/footer";
import SavedProvider from "@/components/saved-provider";
import SiteChrome from "@/components/site-chrome";
import { getContent } from "@/lib/editorial-store";
export const dynamic = "force-dynamic";
const editorial = localFont({
  src: [
    {
      path: "../public/fonts/editorial-regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/editorial-italic.ttf",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-editorial",
  display: "swap",
});
export const metadata = {
  title: { default: "Luminous | Bloom your future", template: "%s | Luminous" },
  description:
    "「知らなかったから、選べなかった」を減らす。女性一人ひとりのキャリアと人生のストーリーに出会う、可能性のカタログ。",
};
export default async function RootLayout({ children }) {
  const content = await getContent();
  const stories = content.records
    .map((record) => record.published)
    .filter(Boolean);
  return (
    <html lang="ja" className={editorial.variable}>
      <body>
        <SavedProvider>
          <SiteChrome>
            <Header stories={stories} />
          </SiteChrome>
          {children}
          <SiteChrome>
            <Footer
              site={content.site}
              hasDemo={stories.some((story) => story.isDemo)}
            />
          </SiteChrome>
        </SavedProvider>
      </body>
    </html>
  );
}
