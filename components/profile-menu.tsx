"use client";

import Image from "next/image";
import Link from "next/link";
import { useDropdown } from "./use-dropdown";
import styles from "./profile-menu.module.css";

export function ProfileMenu() {
  const { closeDropdown, closing, open, toggleDropdown, wrapperRef } = useDropdown();

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        aria-expanded={open && !closing}
        aria-label="Profile menu"
        className={styles.profileButton}
        onClick={toggleDropdown}
        type="button"
      >
        <Image alt="" height={44} src="/assets/landing-avatar.png" width={49} />
      </button>

      {open ? (
        <div className={`${styles.dropdown} ${closing ? styles.closing : ""}`}>
          <div className={styles.identityHeader}>
            <Image alt="" height={82} src="/assets/landing-avatar.png" width={92} />
            <span>My YaleMoji</span>
          </div>
          <div className={styles.menuItems}>
            <Link className={styles.dropdownItem} href="/editor" onClick={closeDropdown}>
              Editor
            </Link>
            <span className={styles.dropdownItem}>My Library</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
