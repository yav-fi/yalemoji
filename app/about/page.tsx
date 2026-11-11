import type { Metadata } from "next";
import Image from "next/image";
import { GitHubLink } from "@/components/github-link";
import { PublicSiteHeader } from "@/components/public-site-header";
import styles from "@/components/info-page.module.css";

export const metadata: Metadata = {
  title: "About · Yalemoji",
  description: "Meet the person behind Yalemoji, your personal avatar for Yale."
};

export default function AboutPage() {
  return (
    <>
      <PublicSiteHeader activePage="about" />
      <main className={styles.page}>
        <section className={styles.hero} aria-labelledby="about-title">
          <h1 id="about-title">About Yalemoji</h1>
          <p className={styles.intro}>
            Yalemoji allows students to express themselves across Yale student products.
            It&apos;s run by a small team within the{" "}
            <a href="http://yalecomputersociety.org/">Yale Computer Society</a>.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="team-title">
          <h2 className={styles.sectionHeading} id="team-title">Team</h2>
          <div className={styles.teamGrid}>
            <article className={styles.teamCard}>
              <Image className={styles.teamPhoto} src="/team/yavin_fickel.jpg" alt="Yavin Fickel" width={224} height={224} sizes="(max-width: 27rem) 224px, (max-width: 43.75rem) 50vw, (max-width: 56rem) 33vw, 224px" />
              <div className={styles.teamInfo}>
                <h3>Yavin Fickel</h3>
                <p className={styles.role}>Yalemoji Team Lead</p>
                <div className={styles.socialLinks}>
                  <GitHubLink className={styles.githubLink} />
                  <a className={styles.socialLink} href="https://linkedin.com/in/yavin" target="_blank" rel="noopener noreferrer">
                    <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.45 2H3.55C2.69 2 2 2.68 2 3.52v16.96c0 .84.69 1.52 1.55 1.52h16.9c.86 0 1.55-.68 1.55-1.52V3.52c0-.84-.69-1.52-1.55-1.52ZM7.93 18.75H4.98V9.2h2.95v9.55ZM6.45 7.9a1.71 1.71 0 1 1 0-3.42 1.71 1.71 0 0 1 0 3.42Zm12.3 10.85H15.8V14.1c0-1.1-.02-2.53-1.54-2.53-1.54 0-1.78 1.2-1.78 2.45v4.73H9.53V9.2h2.83v1.3h.04c.4-.75 1.36-1.54 2.79-1.54 2.99 0 3.56 1.97 3.56 4.53v5.26Z" />
                    </svg>
                    LinkedIn
                  </a>
                </div>
              </div>
            </article>
          </div>
        </section>
      </main>
    </>
  );
}
