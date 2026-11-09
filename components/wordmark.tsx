import Image from "next/image";
import Link from "next/link";
import styles from "./wordmark.module.css";

export function Wordmark() {
  return (
    <Link aria-label="YaleMoji home" className={styles.wordmark} href="/">
      <Image
        alt=""
        className={`${styles.logo} ${styles.logoLight}`}
        height={127}
        priority
        src="/assets/yalemoji.svg"
        width={465}
      />
      <Image
        alt=""
        className={`${styles.logo} ${styles.logoDark}`}
        height={127}
        priority
        src="/assets/yalemoji-dark.svg"
        width={465}
      />
    </Link>
  );
}
