import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { TrafficLogger } from "@/components/traffic-logger";
import { Wordmark } from "@/components/wordmark";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <Suspense fallback={null}>
        <TrafficLogger />
      </Suspense>

      <header className={styles.header}>
        <Wordmark />
      </header>

      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.copy}>
          <h1 className={styles.title} id="hero-title">
            <span>Your avatar on</span>
            <strong>CourseTable</strong>
          </h1>
          <Link className={styles.cta} href="/editor">
            Build mine <span aria-hidden="true">→</span>
          </Link>
        </div>

        <Image
          alt="A YaleMoji avatar with dark wavy hair"
          className={styles.avatar}
          height={165}
          priority
          src="/assets/landing-avatar.png"
          width={186}
        />
      </section>
    </main>
  );
}
