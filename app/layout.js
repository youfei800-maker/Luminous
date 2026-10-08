import localFont from "next/font/local";
import "./globals.css";
import Header from "@/components/header";
import Footer from "@/components/footer";
import SavedProvider from "@/components/saved-provider";
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
export default function RootLayout({ children }) {
  return (
    <html lang="ja" className={editorial.variable}>
      <body>
        <SavedProvider>
          <Header />
          {children}
          <Footer />
        </SavedProvider>
      </body>
    </html>
  );
}
