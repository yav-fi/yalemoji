import type { Metadata } from "next";
import { PublicSiteHeader } from "@/components/public-site-header";
import { UpdatesTimeline } from "@/components/updates-timeline";
import styles from "@/components/info-page.module.css";

export const metadata: Metadata = {
  title: "Updates · YaleMoji",
  description: "YaleMoji updates and release history."
};

// Keep releases in reverse chronological order, newest first.
const updates = [
  {
    id: "2026-11-01-about-and-updates",
    date: "2026-11-01",
    displayDate: "Nov 1, 2026",
    title: "Added about and updates pages.",
    author: "Yavin Fickel"
  }
];

export default function UpdatesPage() {
  return (
    <>
      <PublicSiteHeader activePage="updates" />
      <main className={styles.page}>
        <section className={styles.hero} aria-labelledby="updates-title">
          <h1 id="updates-title">Updates</h1>
        </section>

        <section className={styles.releaseSection} aria-label="Release timeline, newest first">
          <UpdatesTimeline updates={updates} />
        </section>
      </main>
    </>
  );
}
