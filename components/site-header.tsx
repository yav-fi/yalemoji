import { ContextLink } from "./context-link";
import { AppsDropdown } from "./apps-dropdown";
import { ProfileMenu } from "./profile-menu";
import { Wordmark } from "./wordmark";
import { ThemeToggle } from "./theme-toggle";
import styles from "./site-header.module.css";

export function SiteHeader({
  avatarBackgroundUrl,
  avatarUrl,
  netid = null,
  activePage = "editor"
}: {
  avatarBackgroundUrl?: string | null;
  avatarUrl?: string | null;
  netid?: string | null;
  activePage?: "home" | "editor" | "about" | "updates";
}) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Wordmark />
        <nav aria-label="Primary navigation" className={styles.nav}>
          <ThemeToggle />
          {netid ? (
            <>
              <div className={styles.textLinks}>
                <ContextLink aria-current={activePage === "editor" ? "page" : undefined} className={activePage === "editor" ? styles.active : undefined} href="/editor">
                  Editor
                </ContextLink>
              </div>
              <div className={styles.accountControls}>
                <AppsDropdown />
                <ProfileMenu
                  activePage={activePage}
                  avatarBackgroundUrl={avatarBackgroundUrl ?? null}
                  avatarUrl={avatarUrl ?? null}
                  netid={netid}
                />
              </div>
            </>
          ) : (
            <ContextLink className={styles.createButton} href="/api/auth/login">Create now</ContextLink>
          )}
        </nav>
      </div>
    </header>
  );
}
