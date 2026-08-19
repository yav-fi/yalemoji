"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  avatarBackgroundCssForRectangle,
  findAvatarBackground
} from "@/config/avatar-backgrounds";
import {
  readSavedAvatar,
  SAVED_AVATAR_EVENT,
  SAVED_AVATAR_STORAGE_KEY,
  type SavedAvatar
} from "@/lib/saved-avatar";
import { useDropdown } from "./use-dropdown";
import styles from "./profile-menu.module.css";

const profileAvatarSrc = "/assets/landing%20avatar.png?v=20260719-1";

export function ProfileMenu({ netid }: { netid: string }) {
  const { closeDropdown, closing, open, toggleDropdown, wrapperRef } = useDropdown();
  const [savedAvatar, setSavedAvatar] = useState<SavedAvatar | null>(null);

  useEffect(() => {
    const syncSavedAvatar = () => setSavedAvatar(readSavedAvatar());
    const syncStorage = (event: StorageEvent) => {
      if (event.key === SAVED_AVATAR_STORAGE_KEY) syncSavedAvatar();
    };

    syncSavedAvatar();
    window.addEventListener(SAVED_AVATAR_EVENT, syncSavedAvatar);
    window.addEventListener("storage", syncStorage);
    return () => {
      window.removeEventListener(SAVED_AVATAR_EVENT, syncSavedAvatar);
      window.removeEventListener("storage", syncStorage);
    };
  }, []);

  const background = savedAvatar
    ? findAvatarBackground(savedAvatar.backgroundId)
    : null;
  const avatarSrc = savedAvatar?.imageDataUrl ?? profileAvatarSrc;

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        aria-expanded={open && !closing}
        aria-label="Profile menu"
        className={styles.profileButton}
        onClick={toggleDropdown}
        style={background ? { background: background.background } : undefined}
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
          <div
            className={styles.identityHeader}
            data-saved={savedAvatar ? "true" : "false"}
            style={
              background
                ? {
                    background: avatarBackgroundCssForRectangle(
                      background.paint
                    )
                  }
                : undefined
            }
          >
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
            <span className={styles.dropdownItem}>My Library</span>
            <a className={styles.dropdownItem} href="/api/auth/logout">
              Log out
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
