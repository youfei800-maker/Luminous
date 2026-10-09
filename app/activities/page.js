import { ManagedListing } from "@/components/managed-public-pages";
export const metadata = { title: "活動実績" };
export default function ActivitiesPage() {
  return <ManagedListing kind="activity" />;
}
