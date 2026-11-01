"use client";

import { useEffect, useRef, useState } from "react";
import { GitHubLink } from "./github-link";
import styles from "./info-page.module.css";

const READ_UPDATES_KEY = "yalemoji:read-updates";

type Update = {
  id: string;
  date: string;
  displayDate: string;
  title: string;
  author: string;
};

export function UpdatesTimeline({ updates }: { updates: Update[] }) {
  const [previouslyRead, setPreviouslyRead] = useState<string[] | null>(null);
  const opened = useRef(false);

  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    let readIds: string[] = [];
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(READ_UPDATES_KEY) ?? "[]");
      if (Array.isArray(stored)) {
        readIds = stored.filter((id): id is string => typeof id === "string");
      }
    } catch {
      // The timeline still works when local storage is unavailable or invalid.
    }

    // Keep first-visit markers filled for this visit; reopening shows them read.
    setPreviouslyRead(readIds);
    try {
      localStorage.setItem(
        READ_UPDATES_KEY,
        JSON.stringify([...new Set([...readIds, ...updates.map((update) => update.id)])])
      );
    } catch {
      // Browsing updates does not depend on storage access.
    }
  }, [updates]);

  return (
    <ol className={styles.timeline}>
      {updates.map((update) => {
        const unread = previouslyRead !== null && !previouslyRead.includes(update.id);
        return (
          <li className={styles.release} key={update.id}>
            <div className={styles.releaseDate}>
              <time dateTime={update.date}>{update.displayDate}</time>
            </div>
            <article className={styles.releaseContent}>
              <span
                className={styles.releaseMarker}
                data-unread={unread}
                role="img"
                aria-label={unread ? "Unread update" : "Read update"}
              />
              <h2>{update.title}</h2>
              <p className={styles.shippedBy}>
                <span>Shipped by <strong>{update.author}</strong></span>
                <GitHubLink className={styles.githubLink} />
              </p>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
