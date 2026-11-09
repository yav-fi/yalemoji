import { Suspense } from "react";
import { RotatingAppName } from "@/components/rotating-app-name";
import { TrafficLogger } from "@/components/traffic-logger";
import { PublicSiteHeader } from "@/components/public-site-header";
import styles from "./page.module.css";

export default function Home() {
  return (
    <>
      <PublicSiteHeader activePage="home" />
      <main className={styles.page}>
        <Suspense fallback={null}>
          <TrafficLogger />
        </Suspense>
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.copy}>
            <h1 className={styles.title} id="hero-title">
              <span>Your avatar on</span>
              <RotatingAppName />
            </h1>
          </div>
        </section>
      </main>
    </>
  );
}
