import Link from "next/link";
import { AppsDropdown } from "./apps-dropdown";
import { ProfileMenu } from "./profile-menu";
import { Wordmark } from "./wordmark";
import styles from "./site-header.module.css";

export function SiteHeader({
  avatarBackgroundUrl,
  avatarUrl,
  netid = null,
  firstName,
  activePage = "editor"
}: {
  avatarBackgroundUrl?: string | null;
  avatarUrl?: string | null;
  netid?: string | null;
  firstName?: string | null;
  activePage?: "home" | "editor" | "about" | "updates";
}) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Wordmark />
        <nav aria-label="Primary navigation" className={styles.nav}>
          {netid ? (
            <>
              <div className={styles.textLinks}>
                <Link aria-current={activePage === "editor" ? "page" : undefined} className={activePage === "editor" ? styles.active : undefined} href="/editor">
                  Editor
                </Link>
              </div>
              <div className={styles.accountControls}>
                <AppsDropdown />
                <ProfileMenu
                  activePage={activePage}
                  avatarBackgroundUrl={avatarBackgroundUrl ?? null}
                  avatarUrl={avatarUrl ?? null}
                  netid={netid}
                  firstName={firstName}
                />
              </div>
            </>
          ) : (
            <a className={styles.createButton} href="/api/auth/login">Create now</a>
          )}
        </nav>
      </div>
    </header>
  );
}
