import { redirect } from "next/navigation";
import { getSession } from "@/lib/editorial-auth";
import { getContent } from "@/lib/editorial-store";
import EditorialDashboard from "@/components/editorial/dashboard";
export const metadata = {
  title: "編集部管理画面",
  robots: { index: false, follow: false },
};
export default async function EditorialPage() {
  const session = await getSession();
  if (!session) redirect("/editorial/login");
  return (
    <EditorialDashboard
      initialContent={await getContent()}
      email={session.email}
    />
  );
}
