"use client";

import Image from "next/image";
import { useDropdown } from "./use-dropdown";
import styles from "./apps-dropdown.module.css";

type AppLink = {
  name: string;
  href: string;
  image: string;
  imageShift?: "up" | "upMore";
  imageSize?: "xlarge";
  roundedImage?: boolean;
};

const apps: AppLink[] = [
  { name: "CourseTable", href: "https://coursetable.com", image: "/apps-panel/coursetable.svg" },
  { name: "Yalies", href: "https://yalies.io", image: "/apps-panel/yalies.png" },
  { name: "Yale Clubs", href: "https://yaleclubs.io", image: "/apps-panel/yclubs.svg" },
  { name: "y/meets", href: "https://ymeets.com", image: "/apps-panel/ymeetslogo.png", roundedImage: true },
  { name: "Yale IMs", href: "https://yaleims.com", image: "/apps-panel/yaleims.png", imageShift: "up" },
  { name: "y/labs", href: "https://yalelabs.io", image: "/apps-panel/ylabs.png", imageShift: "up" },
  {
    name: "Yale Meals",
    href: "https://apps.apple.com/us/app/yalemeals/id6755962674",
    image: "/apps-panel/yale-menus.png",
    imageShift: "upMore",
    imageSize: "xlarge"
  }
];

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
