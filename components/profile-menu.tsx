"use client";

import Image from "next/image";
import Link from "next/link";
import { useId } from "react";
import { useDropdown } from "./use-dropdown";
import styles from "./profile-menu.module.css";

const defaultAvatarSrc = "/assets/landing%20avatar.png?v=20260719-1";

export function ProfileMenu({
  avatarBackgroundUrl,
  avatarUrl,
  netid,
  activePage
}: {
  avatarBackgroundUrl: string | null;
  avatarUrl: string | null;
  netid: string | null;
  activePage?: "home" | "editor" | "about" | "updates";
}) {
  const { closeDropdown, closing, open, toggleDropdown, wrapperRef } = useDropdown();
  const dropdownId = useId();
  const hasAvatar = Boolean(avatarUrl);
  const avatarSrc = avatarUrl ?? defaultAvatarSrc;

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        aria-expanded={open && !closing}
        aria-controls={open ? dropdownId : undefined}
        aria-label="Profile menu"
        className={styles.profileButton}
        onClick={toggleDropdown}
        type="button"
      >
        {avatarBackgroundUrl ? (
          <Image
            alt=""
            className={styles.backgroundLayer}
            fill
            src={avatarBackgroundUrl}
            unoptimized
          />
        ) : null}
        <Image
          alt=""
          className={styles.faceLayer}
          height={64}
          src={avatarSrc}
          unoptimized
          width={64}
        />
      </button>

      {open ? (
        <div id={dropdownId} inert={closing} className={`${styles.dropdown} ${closing ? styles.closing : ""}`}>
          <div className={styles.identityHeader} data-saved={hasAvatar ? "true" : "false"}>
            {avatarBackgroundUrl ? (
              <Image
                alt=""
                className={styles.backgroundLayer}
                fill
                src={avatarBackgroundUrl}
                unoptimized
              />
            ) : null}
            <Image
              alt=""
              className={styles.faceLayer}
              height={92}
              src={avatarSrc}
              unoptimized
              width={92}
            />
            {netid ? <span>{netid}</span> : null}
          </div>
          <div className={styles.menuItems}>
            <Link aria-current={activePage === "editor" ? "page" : undefined} className={styles.dropdownItem} href="/editor" onClick={closeDropdown}>
              <span aria-hidden="true" className={styles.itemIcon}>✎</span> Editor
            </Link>
            <Link aria-current={activePage === "about" ? "page" : undefined} className={styles.dropdownItem} href="/about" onClick={closeDropdown}>
              <span aria-hidden="true" className={styles.itemIcon}>ⓘ</span> About
            </Link>
            <Link aria-current={activePage === "updates" ? "page" : undefined} className={styles.dropdownItem} href="/updates" onClick={closeDropdown}>
              <span aria-hidden="true" className={styles.itemIcon}>🎁</span> Updates
            </Link>
            <a className={`${styles.dropdownItem} ${styles.authItem}`} href={netid ? "/api/auth/logout" : "/api/auth/login"}>
              <span aria-hidden="true" className={styles.itemIcon}>↗</span> {netid ? "Log out" : "Log in"}
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
