"use client";

import Image from "next/image";
import Link from "next/link";
import { useId } from "react";
import { useDropdown } from "./use-dropdown";
import { ProfileMenuIcon } from "./profile-menu-icon";
import type { ActivePage } from "./site-header";
import styles from "./profile-menu.module.css";

export function ProfileMenu({
  avatarBackgroundUrl,
  avatarUrl,
  firstName,
  netid,
  activePage
}: {
  avatarBackgroundUrl: string | null;
  avatarUrl: string | null;
  firstName?: string;
  netid: string | null;
  activePage?: ActivePage;
}) {
  const { closeDropdown, closing, open, toggleDropdown, wrapperRef } = useDropdown();
  const dropdownId = useId();
  const initials = firstName?.trim()
    ? firstName.trim().split(/\s+/u).slice(0, 2)
      .map((name) => Array.from(name)[0]).join("").toUpperCase()
    : (netid?.replace(/\d/g, "").slice(0, 2).toUpperCase() || "?");

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
        {avatarUrl && avatarBackgroundUrl ? (
          <Image
            alt=""
            className={styles.backgroundLayer}
            fill
            src={avatarBackgroundUrl}
            unoptimized
          />
        ) : null}
        {avatarUrl ? (
          <Image
            alt=""
            className={styles.faceLayer}
            height={64}
            src={avatarUrl}
            unoptimized
            width={64}
          />
        ) : (
          <span aria-hidden="true" className={styles.initials}>{initials}</span>
        )}
      </button>

      {open ? (
        <div id={dropdownId} inert={closing} className={`${styles.dropdown} ${closing ? styles.closing : ""}`}>
          <div className={`${styles.identityHeader} ${avatarUrl ? "" : styles.initialsHeader}`}>
            {avatarUrl && avatarBackgroundUrl ? (
              <Image
                alt=""
                className={styles.backgroundLayer}
                fill
                src={avatarBackgroundUrl}
                unoptimized
              />
            ) : null}
            {avatarUrl ? (
              <Image
                alt=""
                className={styles.faceLayer}
                height={80}
                src={avatarUrl}
                unoptimized
                width={80}
              />
            ) : (
              <span aria-hidden="true" className={styles.initials}>{initials}</span>
            )}
          </div>
          <div className={styles.menuItems}>
            {netid ? (
              // Phones only: the navbar's text links (Editor, Designs) are
              // hidden at that width, so this is the way to reach Designs.
              <Link aria-current={activePage === "designs" ? "page" : undefined} className={`${styles.dropdownItem} ${styles.phoneOnly}`} href="/designs" onClick={closeDropdown}>
                <span className={styles.itemIcon}><ProfileMenuIcon name="designs" /></span> Designs
              </Link>
            ) : null}
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
