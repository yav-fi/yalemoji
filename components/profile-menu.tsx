"use client";

import Image from "next/image";
import Link from "next/link";
import { useDropdown } from "./use-dropdown";
import styles from "./profile-menu.module.css";

const defaultAvatarSrc = "/assets/landing%20avatar.png?v=20260719-1";

export function ProfileMenu({
  avatarUrl,
  netid
}: {
  avatarUrl: string | null;
  netid: string;
}) {
  const { closeDropdown, closing, open, toggleDropdown, wrapperRef } = useDropdown();
  const avatarSrc = avatarUrl ?? defaultAvatarSrc;

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        aria-expanded={open && !closing}
        aria-label="Profile menu"
        className={styles.profileButton}
        onClick={toggleDropdown}
        type="button"
      >
        <Image
          alt=""
          height={64}
          src={avatarSrc}
          unoptimized
          width={64}
        />
      </button>

      {open ? (
        <div className={`${styles.dropdown} ${closing ? styles.closing : ""}`}>
          <div className={styles.identityHeader} data-saved={avatarUrl ? "true" : "false"}>
            <Image
              alt=""
              height={92}
              src={avatarSrc}
              unoptimized
              width={92}
            />
            <span>{netid}</span>
          </div>
          <div className={styles.menuItems}>
            <Link className={styles.dropdownItem} href="/editor" onClick={closeDropdown}>
              Editor
            </Link>
            <a className={styles.dropdownItem} href="/api/auth/logout">
              Log out
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
