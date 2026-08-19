import { AvatarEditor } from "@/components/avatar-editor";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditorPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/login");

  return (
    <>
      <SiteHeader netid={user.netid} />
      <main>
        <AvatarEditor />
      </main>
    </>
  );
}
