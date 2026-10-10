import { redirect } from "next/navigation";
import { readAccount } from "@/lib/editorial-account.mjs";
import { getSession } from "@/lib/editorial-auth";
import { storageMode } from "@/lib/editorial-storage.mjs";
import EditorialLogin from "@/components/editorial/login";
export const metadata = {
  title: "編集部ログイン",
  robots: { index: false, follow: false },
};
export default async function LoginPage() {
  if (await getSession()) redirect("/editorial");
  return (
    <EditorialLogin
      configured={Boolean(await readAccount())}
      storageMode={storageMode()}
    />
  );
}
