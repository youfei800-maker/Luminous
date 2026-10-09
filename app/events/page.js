import { ManagedListing } from "@/components/managed-public-pages";
export const metadata = { title: "イベント" };
export default function EventsPage() {
  return <ManagedListing kind="event" />;
}
