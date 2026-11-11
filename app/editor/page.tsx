import { AvatarEditor } from "@/components/avatar-editor";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";
import { defaultConfig, sanitizeAvatarConfig } from "@/lib/avatar-config";
import { getCurrentAvatar, getDesign } from "@/lib/avatar-store";
import { parseDesignVersion } from "@/lib/designs";
import { headers } from "next/headers";
import { isLocalEditorPreview } from "@/lib/local-editor-preview";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TrafficLogger } from "@/components/traffic-logger";
import { withPageContext } from "@/lib/page-context";

export const dynamic = "force-dynamic";

export default async function EditorPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const localPreview = isLocalEditorPreview((await headers()).get("host"));
  const user = localPreview ? null : await getCurrentUser();
  const params = await searchParams;
  if (!user && !localPreview) {
    const context = new URLSearchParams();
    for (const key of ["ref", "mode"]) {
      const value = params[key];
      if (value !== undefined) context.set(key, Array.isArray(value) ? value[0] : value);
    }
    redirect(withPageContext("/api/auth/login", context));
  }

  const avatar = user ? await getCurrentAvatar(user.netid).catch(() => null) : null;

  // ?design=N opens a saved design as a working draft. Anything that isn't a
  // usable design of this user's is reported as not found. The local preview
  // has no user, so it never opens one.
  const hasDesignParam = params.design !== undefined;
  const version = parseDesignVersion(params.design);
  const design =
    user && version !== null ? await getDesign(user.netid, version).catch(() => null) : null;
  const designConfig = design ? sanitizeAvatarConfig(design.config, defaultConfig) : null;

  return (
    <>
      {!localPreview && <Suspense fallback={null}><TrafficLogger /></Suspense>}
      <SiteHeader
        avatarBackgroundUrl={avatar?.backgroundUrl ?? null}
        avatarUrl={avatar?.pngUrl ?? null}
        firstName={user?.firstName}
        netid={user?.netid}
      />
      <main>
        {/* Both branches share one key: after the first edit the address no
            longer has ?design, so a router.refresh() (e.g. after Save)
            renders the other branch, and a different key would remount the
            editor and lose its state. */}
        {design && designConfig ? (
          <AvatarEditor
            initialDesign={{ version: design.version, name: design.name, config: designConfig }}
            key="editor"
            localPreview={localPreview}
            netid={user?.netid}
          />
        ) : (
          <AvatarEditor
            designNotFound={hasDesignParam}
            key="editor"
            localPreview={localPreview}
            netid={user?.netid}
          />
        )}
      </main>
    </>
  );
}
