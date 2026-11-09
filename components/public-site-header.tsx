import { getCurrentUser } from "@/lib/auth";
import { getCurrentAvatar } from "@/lib/avatar-store";
import { SiteHeader } from "./site-header";

export async function PublicSiteHeader({ activePage }: { activePage: "home" | "about" | "updates" }) {
  const user = await getCurrentUser();
  const avatar = user ? await getCurrentAvatar(user.netid).catch(() => null) : null;

  return (
    <SiteHeader
      activePage={activePage}
      avatarBackgroundUrl={avatar?.backgroundUrl ?? null}
      avatarUrl={avatar?.pngUrl ?? null}
      firstName={user?.firstName}
      netid={user?.netid ?? null}
    />
  );
}
