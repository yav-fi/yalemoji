import { Suspense } from "react";
import { TrafficLogger } from "@/components/traffic-logger";
import { PublicSiteHeader } from "@/components/public-site-header";
import { LandingHero } from "@/components/landing-hero";
import styles from "./page.module.css";

export default function Home() {
  return (
    <>
      <PublicSiteHeader activePage="home" />
      <main className={styles.page}>
        <Suspense fallback={null}>
          <TrafficLogger />
        </Suspense>
        <LandingHero />
      </main>
    </>
  );
}
