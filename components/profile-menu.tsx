"use client";

import Image from "next/image";
import Link from "next/link";
import { useId } from "react";
import { useDropdown } from "./use-dropdown";
import { ProfileMenuIcon } from "./profile-menu-icon";
import styles from "./profile-menu.module.css";

const defaultAvatarSrc = "/assets/landing%20avatar.png?v=20260719-1";

export function ProfileMenu({
  avatarBackgroundUrl,
  avatarUrl,
  netid,
  firstName,
  activePage
}: {
  avatarBackgroundUrl: string | null;
  avatarUrl: string | null;
  netid: string | null;
  firstName?: string | null;
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
            {netid ? <span className={styles.greeting}>Hello, {firstName?.trim() || netid}</span> : null}
          </div>
          <div className={styles.menuItems}>
            <Link aria-current={activePage === "about" ? "page" : undefined} className={styles.dropdownItem} href="/about" onClick={closeDropdown}>
              <span className={styles.itemIcon}><ProfileMenuIcon name="about" /></span> About
            </Link>
            <Link aria-current={activePage === "updates" ? "page" : undefined} className={styles.dropdownItem} href="/updates" onClick={closeDropdown}>
              <span className={styles.itemIcon}><ProfileMenuIcon name="updates" /></span> Updates
            </Link>
            <a className={`${styles.dropdownItem} ${styles.authItem}`} href={netid ? "/api/auth/logout" : "/api/auth/login"}>
              <span className={styles.itemIcon}><ProfileMenuIcon name="logout" /></span> {netid ? "Log out" : "Log in"}
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
