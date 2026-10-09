import {
  ManagedDetail,
  managedMetadata,
} from "@/components/managed-public-pages";
export async function generateMetadata({ params }) {
  return managedMetadata("activity", (await params).slug);
}
export default async function ActivityPage({ params }) {
  return <ManagedDetail kind="activity" slug={(await params).slug} />;
}
