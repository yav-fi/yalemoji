"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MAX_DESIGN_NAME, type Design } from "@/lib/designs";
import styles from "./designs-grid.module.css";

type GridDesign = Design & { savedLabel: string };

// The page heading in app/designs/page.tsx, focused when the last card is removed.
const HEADING_ID = "designs-title";

function DesignCard({
  design,
  onGone,
  onRemoved,
  onRenamed,
  registerLink
}: {
  design: GridDesign;
  onGone: (version: number) => void;
  onRemoved: (version: number) => void;
  onRenamed: (version: number, name: string) => void;
  registerLink: (version: number, link: HTMLAnchorElement | null) => void;
}) {
  const { version, name, isCurrent } = design;
  const [mode, setMode] = useState<"view" | "rename" | "confirm">("view");
  const [draft, setDraft] = useState(name);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set before fetch, so a second click or a blur can't send a second request.
  const pendingRef = useRef(false);
  // Escape sets this so the blur that follows doesn't save.
  const cancelledRef = useRef(false);
  // A name the server just rejected isn't resubmitted by a blur.
  const rejectedRef = useRef<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const renameRef = useRef<HTMLButtonElement>(null);
  const removeRef = useRef<HTMLButtonElement>(null);
  const focusNext = useRef<"input" | "cancel" | "rename" | "remove" | null>(null);

  useEffect(() => {
    const target = focusNext.current;
    focusNext.current = null;
    if (target === "input") {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else if (target === "cancel") cancelRef.current?.focus();
    else if (target === "rename") renameRef.current?.focus();
    else if (target === "remove") removeRef.current?.focus();
  });

  const url = `/api/designs/${version}`;

  function setBusy(busy: boolean) {
    pendingRef.current = busy;
    setPending(busy);
  }

  function startRename() {
    cancelledRef.current = false;
    rejectedRef.current = null;
    setDraft(name);
    setError(null);
    setMode("rename");
    focusNext.current = "input";
  }

  function stopRename() {
    setError(null);
    setMode("view");
    focusNext.current = "rename";
  }

  async function submitRename() {
    if (pendingRef.current || cancelledRef.current) return;
    const next = draft.trim();
    if (next === "" || next === name) {
      stopRename();
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: next })
      });
      if (response.status === 404) {
        onGone(version);
        return;
      }
      const body: unknown = response.ok ? await response.json().catch(() => null) : null;
      const saved = (body as { name?: unknown } | null)?.name;
      if (typeof saved !== "string") throw new Error("rename failed");

      // The name only changes once the server has confirmed it.
      onRenamed(version, saved);
      setBusy(false);
      stopRename();
    } catch {
      rejectedRef.current = next;
      setBusy(false);
      setError("Couldn't rename this design.");
      focusNext.current = "input";
    }
  }

  function askRemove() {
    if (isCurrent || pendingRef.current) return;
    setError(null);
    setMode("confirm");
    focusNext.current = "cancel";
  }

  async function confirmRemove() {
    if (pendingRef.current) return;
    setBusy(true);
    try {
      const response = await fetch(url, { method: "DELETE" });
      if (response.status !== 204) throw new Error("remove failed");
      // Stays busy: the card is about to be taken out of the grid.
      onRemoved(version);
    } catch {
      setBusy(false);
      setMode("view");
      setError("Couldn't remove this design.");
      focusNext.current = "remove";
    }
  }

  return (
    <li className={styles.card}>
      <Link
        aria-label={`Open ${name}`}
        className={styles.open}
        href={`/editor?design=${version}`}
        ref={(link) => registerLink(version, link)}
      >
        <span className={styles.preview}>
          <Image alt="" className={styles.backgroundLayer} fill src={design.backgroundUrl} unoptimized />
          <Image
            alt=""
            className={styles.faceLayer}
            height={220}
            src={design.pngUrl}
            unoptimized
            width={220}
          />
        </span>
        {mode === "rename" ? null : <span className={styles.name}>{name}</span>}
      </Link>

      {mode === "rename" ? (
        <input
          aria-label="Design name"
          className={styles.nameInput}
          disabled={pending}
          maxLength={MAX_DESIGN_NAME}
          onBlur={() => {
            if (rejectedRef.current !== null && draft.trim() === rejectedRef.current) return;
            void submitRename();
          }}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void submitRename();
            } else if (event.key === "Escape") {
              cancelledRef.current = true;
              stopRename();
            }
          }}
          ref={inputRef}
          type="text"
          value={draft}
        />
      ) : null}

      <div className={styles.meta}>
        <time dateTime={design.createdAt}>Saved {design.savedLabel}</time>
        {isCurrent ? <span className={styles.badge}>Current</span> : null}
      </div>

      <div className={styles.actions}>
        <button
          aria-label={`Rename ${name}`}
          className={styles.iconButton}
          disabled={pending}
          onClick={startRename}
          ref={renameRef}
          type="button"
        >
          <svg aria-hidden fill="none" height="18" viewBox="0 0 24 24" width="18">
            <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />
          </svg>
        </button>
        <button
          aria-disabled={isCurrent ? true : undefined}
          aria-label={`Remove ${name}`}
          className={styles.iconButton}
          disabled={pending}
          onClick={askRemove}
          ref={removeRef}
          type="button"
        >
          <svg aria-hidden fill="none" height="18" viewBox="0 0 24 24" width="18">
            <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5" />
          </svg>
        </button>
      </div>

      {mode === "confirm" ? (
        <div className={styles.confirm}>
          <p>Remove &apos;{name}&apos; from your designs?</p>
          <div className={styles.confirmActions}>
            <button
              disabled={pending}
              onClick={() => {
                setMode("view");
                focusNext.current = "remove";
              }}
              ref={cancelRef}
              type="button"
            >
              Cancel
            </button>
            <button
              className={styles.danger}
              disabled={pending}
              onClick={() => void confirmRemove()}
              type="button"
            >
              Remove
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      {isCurrent ? (
        <p className={styles.helper}>Current avatar: save a different design to remove this one.</p>
      ) : null}
    </li>
  );
}

// This grid is the source of truth for the list once the page has rendered, so
// it never calls router.refresh().
export function DesignsGrid({ designs: initialDesigns }: { designs: GridDesign[] }) {
  const [designs, setDesigns] = useState(initialDesigns);
  const [announcement, setAnnouncement] = useState("");
  const links = useRef(new Map<number, HTMLAnchorElement>());
  const focusNext = useRef<number | "heading" | null>(null);

  useEffect(() => {
    const target = focusNext.current;
    if (target === null) return;
    focusNext.current = null;
    if (target === "heading") document.getElementById(HEADING_ID)?.focus();
    else links.current.get(target)?.focus();
  });

  function registerLink(version: number, link: HTMLAnchorElement | null) {
    if (link) links.current.set(version, link);
    else links.current.delete(version);
  }

  // Takes a card out and moves focus to the next card, the previous one if it
  // was last, or the page heading if none is left.
  function takeOut(version: number, message: string) {
    const index = designs.findIndex((design) => design.version === version);
    const neighbour = designs[index + 1] ?? designs[index - 1];
    focusNext.current = neighbour ? neighbour.version : "heading";
    setDesigns((current) => current.filter((design) => design.version !== version));
    setAnnouncement(message);
  }

  return (
    <>
      <p className={styles.announcement} role="status">
        {announcement}
      </p>
      {designs.length === 0 ? (
        <div className={styles.empty}>
          <p>No designs yet</p>
          <Link href="/editor">Create one in the editor</Link>
        </div>
      ) : (
        <ul className={styles.grid}>
          {designs.map((design) => (
            <DesignCard
              design={design}
              key={design.version}
              onGone={(version) => takeOut(version, "This design no longer exists.")}
              onRemoved={(version) => takeOut(version, "")}
              onRenamed={(version, name) =>
                setDesigns((current) =>
                  current.map((item) => (item.version === version ? { ...item, name } : item))
                )
              }
              registerLink={registerLink}
            />
          ))}
        </ul>
      )}
    </>
  );
}
