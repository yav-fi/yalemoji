import Link from "next/link";
import { AppsDropdown } from "./apps-dropdown";
import { ProfileMenu } from "./profile-menu";
import { Wordmark } from "./wordmark";
import styles from "./site-header.module.css";

export function SiteHeader({
  avatarBackgroundUrl,
  avatarUrl,
  netid
}: {
  avatarBackgroundUrl: string | null;
  avatarUrl: string | null;
  netid: string;
}) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Wordmark />
        <nav aria-label="Primary navigation" className={styles.nav}>
          <div className={styles.textLinks}>
            <Link aria-current="page" className={styles.active} href="/editor">
              Editor
            </Link>
          </div>
          <div className={styles.accountControls}>
            <AppsDropdown />
            <ProfileMenu
              avatarBackgroundUrl={avatarBackgroundUrl}
              avatarUrl={avatarUrl}
              netid={netid}
            />
          </div>
        </nav>
      </div>
    </header>
  );
}
