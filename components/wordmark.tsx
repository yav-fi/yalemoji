import Link from "next/link";
import styles from "./wordmark.module.css";

export function Wordmark() {
  return (
    <Link aria-label="YaleMoji home" className={styles.wordmark} href="/">
      <span>Yale</span>Moji
    </Link>
  );
}
