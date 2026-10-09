import {
  ManagedDetail,
  managedMetadata,
} from "@/components/managed-public-pages";
export async function generateMetadata({ params }) {
  return managedMetadata("event", (await params).slug);
}
export default async function EventPage({ params }) {
  return <ManagedDetail kind="event" slug={(await params).slug} />;
}
