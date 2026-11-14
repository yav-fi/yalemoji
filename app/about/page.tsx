import type { Metadata } from "next";
import { GitHubLink } from "@/components/github-link";
import { PublicSiteHeader } from "@/components/public-site-header";
import styles from "@/components/info-page.module.css";

export const metadata: Metadata = {
  title: "About · Yalemoji",
  description: "Meet the team behind Yalemoji, your personal avatar for Yale."
};

const team = [
  { name: "Yavin Fickel", role: "Founder", github: "yav-fi" },
  { name: "Miffy Wang", role: "Founding Artist", github: "miffy-wang" },
  { name: "Erol Cetinok", role: "Developer", github: "erolcetinok" },
  { name: "Erica Zhao", role: "Developer", github: "zr918" },
  { name: "Mira Nuthakki", role: "Developer", github: "lgh1000" },
  { name: "Carmen Ung", role: "Developer", github: "cmucung" },
  { name: "Arjun Rangarajan", role: "Developer", github: "mister-coolman" },
  { name: "Brandon Yang", role: "Developer", github: "byang0320" }
];

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
          <ul className={styles.teamList}>
            {team.map((member) => (
              <li className={styles.teamMember} key={member.github}>
                <div className={styles.teamIdentity}>
                  <h3>{member.name}</h3>
                  <p className={styles.role}>{member.role}</p>
                </div>
                <GitHubLink className={styles.githubLink} username={member.github} />
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
