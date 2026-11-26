"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatShortAge, MAX_DESIGN_NAME, type Design } from "@/lib/designs";
import styles from "./designs-grid.module.css";

type GridDesign = Design & { savedLabel: string };
type CurrentChangeResult = "ok" | "not_found" | "busy";

// Re-renders every 10 seconds so "33s ago" keeps counting.
function useNow(intervalMs = 10_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function DesignCard({
  currentChangePending,
  design,
  isCurrent,
  now,
  onGone,
  onMakeCurrent,
  onRemoved,
  onRenamed,
  registerLink
}: {
  currentChangePending: boolean;
  design: GridDesign;
  isCurrent: boolean;
  now: number;
  onGone: (version: number) => void;
  onMakeCurrent: (design: GridDesign) => Promise<CurrentChangeResult>;
  onRemoved: (version: number) => void;
  onRenamed: (version: number, name: string) => void;
  registerLink: (version: number, link: HTMLAnchorElement | null) => void;
}) {
  const { version, name } = design;
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
  const selectRef = useRef<HTMLButtonElement>(null);
  const focusNext = useRef<"input" | "cancel" | "rename" | "remove" | "select" | null>(null);

  useEffect(() => {
    const target = focusNext.current;
    focusNext.current = null;
    if (target === "input") {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else if (target === "cancel") cancelRef.current?.focus();
    else if (target === "rename") renameRef.current?.focus();
    else if (target === "remove") removeRef.current?.focus();
    else if (target === "select") selectRef.current?.focus();
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

  // `refocus` is false when the user left the input by tabbing or clicking
  // away: focus then stays where they put it.
  function stopRename(refocus = true) {
    setError(null);
    setMode("view");
    if (refocus) focusNext.current = "rename";
  }

  async function submitRename({ fromBlur = false } = {}) {
    if (pendingRef.current || cancelledRef.current) return;
    const next = draft.trim();
    if (next === "" || next === name) {
      stopRename(!fromBlur);
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
      stopRename(!fromBlur);
    } catch {
      rejectedRef.current = next;
      setBusy(false);
      setError("Couldn't rename this design.");
      focusNext.current = "input";
    }
  }

  async function makeCurrent() {
    if (isCurrent || pendingRef.current || currentChangePending) return;
    setBusy(true);
    setError(null);
    try {
      const result = await onMakeCurrent(design);
      if (result === "not_found") {
        onGone(version);
      } else if (result === "ok") {
        focusNext.current = "select";
      }
    } catch {
      setError("Couldn't make this design current.");
    } finally {
      setBusy(false);
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
      if (response.status === 404) {
        // Already removed, e.g. in another tab.
        onGone(version);
        return;
      }
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
            void submitRename({ fromBlur: true });
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
        {/* The server and browser clocks differ by the render time, so the
            first browser render may disagree by a few seconds. */}
        <time dateTime={design.createdAt} suppressHydrationWarning title={`Saved ${design.savedLabel}`}>
          {formatShortAge(design.createdAt, now)}
        </time>
      </div>

      <div className={styles.actions}>
        <button
          aria-disabled={currentChangePending || undefined}
          aria-label={`Make ${name} current`}
          aria-pressed={isCurrent}
          className={`${styles.selectButton} ${isCurrent ? styles.selected : ""}`}
          disabled={pending}
          onClick={() => void makeCurrent()}
          ref={selectRef}
          type="button"
        >
          {isCurrent ? (
            <>
              <svg aria-hidden fill="none" height="16" viewBox="0 0 24 24" width="16">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
              Current
            </>
          ) : (
            "Make current"
          )}
        </button>
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
          // The only explanation for the disabled state: a hover tooltip, also
          // read as the button's description.
          title={isCurrent ? "Your current avatar can't be removed" : undefined}
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
    </li>
  );
}

export function DesignsGrid({
  designs: initialDesigns,
  initialCurrentVersion = initialDesigns?.find((design) => design.isCurrent)?.version ?? null
}: {
  designs: GridDesign[] | null;
  initialCurrentVersion?: number | null;
}) {
  const router = useRouter();
  const now = useNow();
  const [localDesigns, setDesigns] = useState(initialDesigns);
  const designs = localDesigns ?? initialDesigns;
  const [currentVersion, setCurrentVersion] = useState(initialCurrentVersion);
  const [currentChangePending, setCurrentChangePending] = useState(false);
  const currentChangeInFlight = useRef(false);
  const [clearError, setClearError] = useState(false);
  // Read by takeOut, which can run after a later render (two removals in
  // flight), so it must not use a stale closure's list.
  const designsRef = useRef(designs);
  designsRef.current = designs;
  const [announcement, setAnnouncement] = useState("");
  const links = useRef(new Map<number, HTMLAnchorElement>());
  const heading = useRef<HTMLHeadingElement>(null);
  const focusNext = useRef<number | "heading" | null>(null);

  useEffect(() => {
    const target = focusNext.current;
    if (target === null) return;
    focusNext.current = null;
    if (target === "heading") heading.current?.focus();
    else links.current.get(target)?.focus();
  });

  function registerLink(version: number, link: HTMLAnchorElement | null) {
    if (link) links.current.set(version, link);
    else links.current.delete(version);
  }

  // Takes a card out and moves focus to the next card, the previous one if it
  // was last, or the page heading if none is left.
  function takeOut(version: number, message: string) {
    const list = designsRef.current ?? [];
    const index = list.findIndex((design) => design.version === version);
    const neighbour = list[index + 1] ?? list[index - 1];
    focusNext.current = neighbour ? neighbour.version : "heading";
    setDesigns((current) =>
      (current ?? initialDesigns ?? []).filter((design) => design.version !== version)
    );
    setAnnouncement(message);
  }

  async function changeCurrent(design: GridDesign | null): Promise<CurrentChangeResult> {
    if (currentChangeInFlight.current) return "busy";
    currentChangeInFlight.current = true;
    setCurrentChangePending(true);
    setClearError(false);

    try {
      const response = design
        ? await fetch(`/api/designs/${design.version}/current`, { method: "POST" })
        : await fetch("/api/designs/current", { method: "DELETE" });
      if (design && response.status === 404) return "not_found";
      if (!response.ok) throw new Error("Avatar update failed");

      setCurrentVersion(design?.version ?? null);
      setAnnouncement(design ? `'${design.name}' is now your current avatar.` : "");
      // Refresh the profile avatar while keeping the grid's local edits.
      router.refresh();
      return "ok";
    } finally {
      currentChangeInFlight.current = false;
      setCurrentChangePending(false);
    }
  }

  async function clearCurrent() {
    if (currentVersion === null || currentChangePending) return;
    try {
      await changeCurrent(null);
    } catch {
      setClearError(true);
    }
  }

  return (
    <>
      <div className={styles.headingRow}>
        <h1 className={styles.title} ref={heading} tabIndex={-1}>Designs</h1>
        <button
          aria-disabled={currentVersion === null || currentChangePending}
          className={styles.clearButton}
          onClick={() => void clearCurrent()}
          type="button"
        >
          Clear Yalemoji
        </button>
      </div>
      <p className={styles.announcement} role="status">
        {announcement || (currentVersion === null ? "No current Yalemoji." : "")}
      </p>
      {clearError ? (
        <p className={styles.pageError} role="alert">Couldn&apos;t clear your Yalemoji. Try again.</p>
      ) : null}
      {designs === null ? (
        <p className={styles.pageError} role="alert">Couldn&apos;t load your designs. Try again.</p>
      ) : designs.length === 0 ? (
        <div className={styles.empty}>
          <p>No designs yet</p>
          <Link href="/editor">Create one in the editor</Link>
        </div>
      ) : (
        <ul className={styles.grid}>
          {designs.map((design) => (
            <DesignCard
              currentChangePending={currentChangePending}
              design={design}
              isCurrent={currentVersion === design.version}
              key={design.version}
              now={now}
              onGone={(version) => takeOut(version, "This design no longer exists.")}
              onMakeCurrent={changeCurrent}
              onRemoved={(version) => takeOut(version, "")}
              onRenamed={(version, name) =>
                setDesigns((current) =>
                  (current ?? initialDesigns ?? []).map((item) =>
                    item.version === version ? { ...item, name } : item
                  )
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
