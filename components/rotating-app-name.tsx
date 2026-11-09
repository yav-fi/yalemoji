"use client";

import { useEffect, useState } from "react";
import { yaleApps } from "@/config/yale-apps";
import styles from "./rotating-app-name.module.css";

const appNames = yaleApps.map((app) => app.name);

export function RotatingAppName() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionPreference.matches) return;

    const interval = window.setInterval(() => {
      setIndex((current) => (current + 1) % appNames.length);
    }, 2400);

    return () => window.clearInterval(interval);
  }, []);

  const appName = appNames[index];

  return (
    <strong aria-atomic="true" aria-live="polite" className={styles.rotator}>
      <span className={styles.word} key={appName}>{appName}</span>
    </strong>
  );
}
