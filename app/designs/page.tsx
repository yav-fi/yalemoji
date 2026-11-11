import { DesignsGrid } from "@/components/designs-grid";
import styles from "@/components/designs-grid.module.css";
import { SiteHeader } from "@/components/site-header";
import { TrafficLogger } from "@/components/traffic-logger";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentAvatar, listDesigns } from "@/lib/avatar-store";
import type { Design } from "@/lib/designs";
import { withPageContext } from "@/lib/page-context";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function DesignsPage({ searchParams }: {
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

  // Dates are formatted here, in one fixed time zone, so the server and the
  // browser can never disagree about them.
  let designs: (Design & { savedLabel: string })[] | null = null;
  try {
    designs = (await listDesigns(user.netid)).map((design) => ({
      ...design,
      savedLabel: new Date(design.createdAt).toLocaleString("en-US", {
        timeZone: "America/New_York",
        dateStyle: "medium",
        timeStyle: "short"
      })
    }));
  } catch (error) {
    console.error("Design list failed", error);
  }

  return (
    <>
      <Suspense fallback={null}><TrafficLogger /></Suspense>
      <SiteHeader
        activePage="designs"
        avatarBackgroundUrl={avatar?.backgroundUrl ?? null}
        avatarUrl={avatar?.pngUrl ?? null}
        firstName={user.firstName}
        netid={user.netid}
      />
      <main className={styles.page}>
        {/* Focus target when the last design is removed. */}
        <h1 className={styles.title} id="designs-title" tabIndex={-1}>
          Designs
        </h1>
        {designs ? (
          <DesignsGrid designs={designs} />
        ) : (
          <p className={styles.loadError} role="alert">
            Couldn&apos;t load your designs. Try again.
          </p>
        )}
      </main>
    </>
  );
}
