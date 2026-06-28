import { Suspense } from "react";
import { TrafficLogger } from "@/components/traffic-logger";
import { WaitlistForm } from "@/components/waitlist-form";
import styles from "./page.module.css";

const bubbles = [
  { size: 44, x: 0.695, y: 0.028 },
  { size: 29, x: 0.742, y: 0.095 },
  { size: 36, x: 0.79, y: 0.054 },
  { size: 52, x: 0.835, y: 0.026 },
  { size: 122, x: 0.914, y: 0.028 },
  { size: 26, x: 0.712, y: 0.185 },
  { size: 38, x: 0.778, y: 0.153 },
  { size: 74, x: 0.835, y: 0.14 },
  { size: 48, x: 0.907, y: 0.157 },
  { size: 33, x: 0.948, y: 0.238 },
  { size: 31, x: 0.874, y: 0.255 },
  { size: 21, x: 0.764, y: 0.265 },
  { size: 18, x: 0.718, y: 0.064 },
  { size: 24, x: 0.969, y: 0.112 }
];

export default function Home() {
  return (
    <main className={styles.shell}>
      <Suspense fallback={null}>
        <TrafficLogger />
      </Suspense>
      <section className={styles.hero} aria-labelledby="hero-title">
        <header className={styles.header} aria-label="YaleMoji">
          <span className={styles.logoYale}>Yale</span>
          <span className={styles.logoMoji}>Moji</span>
        </header>

        <div className={styles.bubbles} aria-hidden="true">
          {bubbles.map((bubble, index) => (
            <span
              className={styles.bubble}
              key={`${bubble.size}-${bubble.x}-${bubble.y}`}
              style={{
                "--bubble-size": `${bubble.size}px`,
                "--bubble-x": `${bubble.x * 100}%`,
                "--bubble-y": `${bubble.y * 100}%`,
                "--bubble-delay": `${index * 90}ms`
              } as React.CSSProperties}
            />
          ))}
        </div>

        <div className={styles.content}>
          <p className={styles.badge}>Coming soon to campus</p>
          <h1 className={styles.title} id="hero-title">
            <strong>Express yourself</strong>
            <span>across campus</span>
          </h1>
          <p className={styles.subtitle}>
            A Yale-first way to share moods, moments, and inside jokes with the people around you.
          </p>
          <WaitlistForm />
          <p className={styles.note}>Private beta opens soon for Yale students.</p>
        </div>

        <footer className={styles.footer}>© 2026 YaleMoji</footer>
      </section>
    </main>
  );
}
