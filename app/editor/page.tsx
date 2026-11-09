import { AvatarEditor } from "@/components/avatar-editor";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentAvatar } from "@/lib/avatar-store";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TrafficLogger } from "@/components/traffic-logger";
import { withPageContext } from "@/lib/page-context";

export const dynamic = "force-dynamic";

export default async function EditorPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    const params = await searchParams;
    const context = new URLSearchParams();
    for (const key of ["ref", "mode"]) {
      const value = params[key];
      if (value !== undefined) context.set(key, Array.isArray(value) ? value[0] : value);
    }
    redirect(withPageContext("/api/auth/login", context));
  }

  const avatar = await getCurrentAvatar(user.netid).catch(() => null);

  return (
    <>
      <Suspense fallback={null}><TrafficLogger /></Suspense>
      <SiteHeader
        avatarBackgroundUrl={avatar?.backgroundUrl ?? null}
        avatarUrl={avatar?.pngUrl ?? null}
        firstName={user.firstName}
        netid={user.netid}
      />
      <main>
        <AvatarEditor netid={user.netid} />
      </main>
    </>
  );
}
