import Image from "next/image";
import Link from "next/link";
import styles from "./wordmark.module.css";

export function Wordmark() {
  return (
    <Link aria-label="YaleMoji home" className={styles.wordmark} href="/">
      <Image
        alt="YaleMoji"
        className={styles.logo}
        height={127}
        priority
        src="/assets/yalemoji.svg"
        width={465}
      />
    </Link>
  );
}
