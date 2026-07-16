import Image from "next/image";
import { Suspense } from "react";
import { RotatingAppName } from "@/components/rotating-app-name";
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
            <RotatingAppName />
          </h1>
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
