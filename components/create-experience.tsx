"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AvatarCanvas } from "./avatar-canvas";
import { loadAvatarSvg } from "./avatar-layer";
import { yaleApps } from "@/config/yale-apps";
import { hairPalettes, skinPalettes } from "@/config/avatar-palettes";
import { createPreviewConfig, nextPreviewConfig, previewLayerSources } from "@/lib/avatar-preview";
import styles from "./create-experience.module.css";

const BLUR_DURATION_MS = 3500;

export function CreateExperience() {
  const [phase, setPhase] = useState<"ready" | "blurring" | "revealed" | "finished">("ready");
  const [config, setConfig] = useState(createPreviewConfig);
  const [layersReady, setLayersReady] = useState(false);
  const tick = useRef(0);
  const finished = phase === "finished";
  const introductionVisible = phase === "revealed" || finished;

  useEffect(() => {
    let active = true;
    void Promise.allSettled(previewLayerSources.map(loadAvatarSvg)).then(() => {
      if (active) setLayersReady(true);
    });
    const blur = window.setTimeout(() => setPhase("blurring"), 10000);
    const reveal = window.setTimeout(() => setPhase("revealed"), 11000);
    const finish = window.setTimeout(() => setPhase("finished"), 10000 + BLUR_DURATION_MS);
    return () => {
      active = false;
      window.clearTimeout(blur);
      window.clearTimeout(reveal);
      window.clearTimeout(finish);
    };
  }, []);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let interval: number | undefined;
    function updateAnimation() {
      window.clearInterval(interval);
      if (!layersReady || finished || motion.matches || document.hidden) return;
      interval = window.setInterval(() => {
        const step = tick.current++;
        setConfig((current) => nextPreviewConfig(current, step));
      }, 150);
    }
    updateAnimation();
    motion.addEventListener("change", updateAnimation);
    document.addEventListener("visibilitychange", updateAnimation);
    return () => {
      window.clearInterval(interval);
      motion.removeEventListener("change", updateAnimation);
      document.removeEventListener("visibilitychange", updateAnimation);
    };
  }, [layersReady, finished]);

  return (
    <main className={styles.page} data-phase={phase} style={{ "--blur-duration": `${BLUR_DURATION_MS}ms` } as CSSProperties}>
      <div className={styles.scene} data-phase={phase}>
        {!finished ? (
          <div className={styles.backdrop}>
            <div
              aria-label="Your Yale apps"
              className={styles.orbit}
              role="group"
              style={{ "--pulse-duration": `${yaleApps.length}s` } as CSSProperties}
            >
              {yaleApps.map((item, index) => {
                const angle = (index / yaleApps.length) * Math.PI * 2 - Math.PI / 2;
                return (
                  <div
                    className={styles.appPosition}
                    key={item.id}
                    style={{ "--x": Math.cos(angle), "--y": Math.sin(angle), "--pulse-delay": `${index}s` } as CSSProperties}
                  >
                    <div className={styles.counterRotation}>
                      <Image
                        alt={item.name}
                        className={`${styles.appImage} ${item.roundedImage ? styles.rounded : ""}`}
                        height={96}
                        priority
                        src={item.image}
                        width={96}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={styles.center}>
              <div className={styles.avatar}>
                <div aria-label="A YaleMoji cycling through different looks" className={styles.avatarPreview} role="img">
                  <AvatarCanvas
                    accessories={config.accessories}
                    facialHairId={config.facialHairId}
                    hairPalette={hairPalettes.find((palette) => palette.id === config.hairPaletteId)!}
                    selections={config.selections}
                    skinPalette={skinPalettes.find((palette) => palette.id === config.skinPaletteId)!}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}
        <div aria-hidden={!introductionVisible} className={styles.introduction}>
          <h1 aria-label="Introducing YaleMoji" className={styles.title}>
            <span className={styles.introducing}>Introducing</span>{" "}
            <Image alt="YaleMoji" className={styles.logo} height={127} priority src="/assets/yalemoji.svg" width={465} />
          </h1>
        </div>
      </div>
      <a className={styles.createButton} href="/editor">Create now</a>
    </main>
  );
}
