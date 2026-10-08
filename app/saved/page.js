import StoriesLanding from "@/components/stories-landing";
export const metadata = { title: "あとで読む" };
export default function SavedPage() {
  return <StoriesLanding savedOnly />;
}
