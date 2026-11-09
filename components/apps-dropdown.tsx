"use client";

import Image from "next/image";
import { yaleApps, yalemojiApp, type YaleApp } from "@/config/yale-apps";
import { useDropdown } from "./use-dropdown";
import styles from "./apps-dropdown.module.css";

const appOrder = ["coursetable", "yalies", "yaleclubs", "ymeets", "yalemoji", "yaleims", "ylabs", "yalemeals"];
const apps = [...yaleApps, yalemojiApp]
  .filter((app): app is YaleApp & { href: string } => typeof app.href === "string")
  .sort((a, b) => appOrder.indexOf(a.id) - appOrder.indexOf(b.id));

export function AppsDropdown() {
  const { closeDropdown, closing, open, toggleDropdown, wrapperRef } = useDropdown();

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        aria-expanded={open && !closing}
        aria-label="Yale apps"
        className={styles.toggle}
        onClick={toggleDropdown}
        type="button"
      >
        <span aria-hidden="true" className={styles.waffle}>
          {Array.from({ length: 9 }, (_, index) => <span key={index} />)}
        </span>
      </button>

      {open ? (
        <div className={`${styles.dropdown} ${closing ? styles.closing : ""}`}>
          <div className={styles.appGrid}>
            {apps.map((app) => (
              <a
                className={styles.appTile}
                href={app.href}
                key={app.name}
                onClick={closeDropdown}
                rel="noopener noreferrer"
                target="_blank"
              >
                <span className={styles.appIcon}>
                  <Image
                    alt=""
                    className={[
                      app.imageShift === "upMore" ? styles.imageUpMore : "",
                      app.imageShift === "up" ? styles.imageUp : "",
                      app.imageSize === "large" ? styles.imageLarge : "",
                      app.imageSize === "xlarge" ? styles.imageExtraLarge : "",
                      app.roundedImage ? styles.imageRounded : ""
                    ].filter(Boolean).join(" ")}
                    height={52}
                    src={app.image}
                    width={52}
                  />
                </span>
                <span>{app.name}</span>
              </a>
            ))}
          </div>
          <p className={styles.attribution}>
            YaleMoji is a{" "}
            <a href="https://yalecomputersociety.org" rel="noopener noreferrer" target="_blank">y/cs</a>{" "}
            product
          </p>
        </div>
      ) : null}
    </div>
  );
}
