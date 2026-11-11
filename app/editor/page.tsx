import { AvatarEditor } from "@/components/avatar-editor";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";
import { defaultConfig, sanitizeAvatarConfig } from "@/lib/avatar-config";
import { getCurrentAvatar, getDesign } from "@/lib/avatar-store";
import { parseDesignVersion } from "@/lib/designs";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TrafficLogger } from "@/components/traffic-logger";
import { withPageContext } from "@/lib/page-context";

export const dynamic = "force-dynamic";

export default async function EditorPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  if (!user) {
    const context = new URLSearchParams();
    for (const key of ["ref", "mode"]) {
      const value = params[key];
      if (value !== undefined) context.set(key, Array.isArray(value) ? value[0] : value);
    }
    redirect(withPageContext("/api/auth/login", context));
  }

  const avatar = await getCurrentAvatar(user.netid).catch(() => null);

  // ?design=N opens a saved design as a working draft. Anything that isn't a
  // usable design of this user's is reported as not found.
  const hasDesignParam = params.design !== undefined;
  const version = parseDesignVersion(params.design);
  const design = version === null ? null : await getDesign(user.netid, version).catch(() => null);
  const designConfig = design ? sanitizeAvatarConfig(design.config, defaultConfig) : null;

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
        {design && designConfig ? (
          <AvatarEditor
            initialDesign={{ version: design.version, name: design.name, config: designConfig }}
            key={design.version}
            netid={user.netid}
          />
        ) : (
          <AvatarEditor designNotFound={hasDesignParam} netid={user.netid} />
        )}
      </main>
    </>
  );
}
