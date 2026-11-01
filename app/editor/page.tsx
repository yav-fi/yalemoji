import { AvatarEditor } from "@/components/avatar-editor";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentAvatar } from "@/lib/avatar-store";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditorPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/login");

  const avatar = await getCurrentAvatar(user.netid).catch(() => null);

  return (
    <>
      <SiteHeader
        avatarBackgroundUrl={avatar?.backgroundUrl ?? null}
        avatarUrl={avatar?.pngUrl ?? null}
        netid={user.netid}
      />
      <main>
        <AvatarEditor netid={user.netid} />
      </main>
    </>
  );
}
