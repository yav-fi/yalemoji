"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  avatarBackgroundOptions,
  backgroundSections,
  defaultAvatarBackground,
  drawAvatarBackground,
  type AvatarBackgroundOption
} from "@/config/avatar-backgrounds";
import {
  accessoryGroups,
  avatarCategories,
  avatarOptions,
  categoryLabels,
  facialHairOptions,
  type AccessorySelections,
  type AvatarCategory,
  type AvatarOption,
  type AvatarSelections
} from "@/config/avatar-options";
import {
  hairPalettes,
  skinPalettes,
  type AvatarPalette
} from "@/config/avatar-palettes";
import {
  DEFAULT_HAIR_PALETTE,
  DEFAULT_SKIN_PALETTE,
  defaultConfig,
  missingRequiredFeatures,
  type AvatarConfig,
  type RequiredFeature
} from "@/lib/avatar-config";
import {
  clearDraftBackup,
  readDraftBackup,
  serializeAvatarConfig,
  useAvatarDraft
} from "@/lib/avatar-draft";
import {
  findOpaquePixelBounds,
  fitBoundsInsideSquare
} from "@/lib/avatar-image-fit";
import { innerSvg, namespaceAvatarSvg, replacePaletteVariables } from "@/lib/avatar-svg";
import {
  AvatarCanvas,
  createAvatarLayers
} from "./avatar-canvas";
import { loadAvatarSvg } from "./avatar-layer";
import { AvatarOptionGrid } from "./avatar-option-grid";
import { useDropdown } from "./use-dropdown";
import styles from "./avatar-editor.module.css";

const EXPORT_SIZE = 1080;
const EXPORT_AVATAR_SIZE = 900;
type PngAction = "download-background" | "download-transparent" | "save";

function DownloadButton({ pendingAction, onDownload }: {
  pendingAction: PngAction | null;
  onDownload: (action: "download-background" | "download-transparent") => Promise<void>;
}) {
  const { closeDropdown, closing, open, toggleDropdown, wrapperRef } = useDropdown();
  const dropdownId = useId();
  const expanded = open && !closing;

  return (
    <div className={styles.downloadWrapper} ref={wrapperRef}>
      <button
        aria-controls={expanded ? dropdownId : undefined}
        aria-expanded={expanded}
        className={`${styles.export} ${styles.secondaryAction}`}
        disabled={pendingAction !== null}
        onClick={toggleDropdown}
        type="button"
      >
        <svg aria-hidden fill="none" height="18" viewBox="0 0 24 24" width="18">
          <path d="M12 4v13m-6-6 6 6 6-6M5 21h14" />
        </svg>
        {pendingAction?.startsWith("download") ? "Downloading…" : "Download"}
      </button>
      {expanded ? (
        <div aria-label="Download options" className={styles.downloadMenu} id={dropdownId}>
          <button onClick={() => { closeDropdown(); void onDownload("download-background"); }} type="button">
            Download PNG with background
          </button>
          <button onClick={() => { closeDropdown(); void onDownload("download-transparent"); }} type="button">
            Download transparent PNG
          </button>
        </div>
      ) : null}
    </div>
  );
}

const requiredFeatureNames: Record<RequiredFeature, string> = {
  eyes: "eyes",
  mouth: "a mouth"
};

function missingFeaturesMessage(missing: readonly RequiredFeature[], action: PngAction) {
  const names = missing.map((feature) => requiredFeatureNames[feature] ?? feature).join(" and ");
  return `Add ${names} before ${action === "save" ? "saving" : "downloading"}.`;
}

function SectionHeading({
  label,
  onClear
}: {
  label: string;
  onClear?: () => void;
}) {
  return (
    <div className={styles.sectionHeading}>
      <h2>{label}</h2>
      {onClear ? (
        <button onClick={onClear} type="button">
          Clear
        </button>
      ) : null}
    </div>
  );
}

function PalettePicker({
  label,
  onSelect,
  options,
  selected
}: {
  label: string;
  onSelect: (palette: AvatarPalette) => void;
  options: readonly AvatarPalette[];
  selected: AvatarPalette;
}) {
  return (
    <div aria-label={`${label} color`} className={styles.swatches} role="group">
      {options.map((palette) => (
        <button
          aria-label={`Select color ${palette.id}`}
          aria-pressed={selected.id === palette.id}
          className={styles.swatch}
          key={palette.id}
          onClick={() => onSelect(palette)}
          style={{ backgroundColor: palette.primary }}
          type="button"
        />
      ))}
    </div>
  );
}

async function renderAvatarPng({
  accessories,
  background,
  facialHairId,
  hairPalette,
  selections,
  skinPalette
}: {
  accessories: AccessorySelections;
  background?: AvatarBackgroundOption;
  facialHairId: string | null;
  hairPalette: AvatarPalette;
  selections: AvatarSelections;
  skinPalette: AvatarPalette;
}) {
  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_SIZE;
  canvas.height = EXPORT_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas export is unavailable.");

  if (background) {
    drawAvatarBackground(context, background.paint, EXPORT_SIZE);
  }
  const layers = createAvatarLayers(selections, accessories, facialHairId);
  const bodies = await Promise.all(
    layers.map(async (layer, index) => {
      const markup = await loadAvatarSvg(layer.src);
      const palette =
        layer.palette === "skin"
          ? skinPalette
          : layer.palette === "hair"
            ? hairPalette
            : undefined;
      return innerSvg(
        namespaceAvatarSvg(
          replacePaletteVariables(markup, palette),
          `export-${index}`
        )
      );
    })
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${EXPORT_AVATAR_SIZE}" height="${EXPORT_AVATAR_SIZE}" viewBox="0 0 502 502" fill="none">${bodies.join("")}</svg>`;
  const image = new Image();

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Could not render the YaleMoji."));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });

  if (background) {
    const inset = (EXPORT_SIZE - EXPORT_AVATAR_SIZE) / 2;
    context.drawImage(
      image,
      inset,
      inset,
      EXPORT_AVATAR_SIZE,
      EXPORT_AVATAR_SIZE
    );
  } else {
    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = EXPORT_SIZE;
    sourceCanvas.height = EXPORT_SIZE;
    const sourceContext = sourceCanvas.getContext("2d", {
      willReadFrequently: true
    });
    if (!sourceContext) throw new Error("Canvas export is unavailable.");

    sourceContext.drawImage(image, 0, 0, EXPORT_SIZE, EXPORT_SIZE);
    const pixels = sourceContext.getImageData(
      0,
      0,
      EXPORT_SIZE,
      EXPORT_SIZE
    );
    const sourceBounds = findOpaquePixelBounds(
      pixels.data,
      EXPORT_SIZE,
      EXPORT_SIZE
    );
    if (!sourceBounds) throw new Error("The YaleMoji has no visible artwork.");

    const destination = fitBoundsInsideSquare(
      sourceBounds,
      EXPORT_SIZE,
      0.1
    );
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      sourceCanvas,
      sourceBounds.x,
      sourceBounds.y,
      sourceBounds.width,
      sourceBounds.height,
      destination.x,
      destination.y,
      destination.width,
      destination.height
    );
  }
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );
  if (!blob) throw new Error("Could not create the PNG.");
  return blob;
}

function downloadBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

function isIncompleteBody(body: unknown): body is { missing: RequiredFeature[] } {
  return (
    typeof body === "object" &&
    body !== null &&
    (body as { error?: unknown }).error === "incomplete_avatar" &&
    Array.isArray((body as { missing?: unknown }).missing)
  );
}

function isRateLimitBody(body: unknown): body is { retryAfterSeconds: number } {
  return (
    typeof body === "object" &&
    body !== null &&
    typeof (body as { retryAfterSeconds?: unknown }).retryAfterSeconds === "number"
  );
}

// The one place config ids are turned into the editor's palette and background
// objects, used for both the starting state and applyConfig.
function configToState(config: AvatarConfig) {
  return {
    selections: config.selections,
    accessories: config.accessories,
    facialHairId: config.facialHairId,
    skinPalette:
      skinPalettes.find((palette) => palette.id === config.skinPaletteId) ?? DEFAULT_SKIN_PALETTE,
    hairPalette:
      hairPalettes.find((palette) => palette.id === config.hairPaletteId) ?? DEFAULT_HAIR_PALETTE,
    backgroundOption:
      avatarBackgroundOptions.find((option) => option.id === config.backgroundId) ??
      defaultAvatarBackground
  };
}

export function AvatarEditor({
  netid,
  initialDesign,
  designNotFound
}: {
  netid?: string | null;
  initialDesign?: { version: number; name: string; config: AvatarConfig };
  designNotFound?: boolean;
} = {}) {
  const router = useRouter();
  const [initialState] = useState(() =>
    configToState(initialDesign?.config ?? defaultConfig)
  );
  const [category, setCategory] = useState<AvatarCategory>("face");
  const [skinPalette, setSkinPalette] = useState<AvatarPalette>(initialState.skinPalette);
  const [hairPalette, setHairPalette] = useState<AvatarPalette>(initialState.hairPalette);
  const [backgroundOption, setBackgroundOption] =
    useState<AvatarBackgroundOption>(initialState.backgroundOption);
  const [selections, setSelections] =
    useState<AvatarSelections>(initialState.selections);
  const [facialHairId, setFacialHairId] = useState<string | null>(initialState.facialHairId);
  const [accessories, setAccessories] = useState<AccessorySelections>(initialState.accessories);
  // Captured on the first render so it survives the address being cleared.
  const [notice, setNotice] = useState<string | null>(() =>
    initialDesign
      ? `Opened '${initialDesign.name}'`
      : designNotFound
        ? "That design couldn't be found."
        : null
  );
  const [backup, setBackup] = useState<AvatarConfig | null>(null);
  const [pendingAction, setPendingAction] = useState<PngAction | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 3000);
    return () => window.clearTimeout(timer);
  }, [saved]);

  const config = useMemo<AvatarConfig>(
    () => ({
      selections,
      accessories,
      facialHairId,
      skinPaletteId: skinPalette.id,
      hairPaletteId: hairPalette.id,
      backgroundId: backgroundOption.id
    }),
    [selections, accessories, facialHairId, skinPalette, hairPalette, backgroundOption]
  );

  function applyConfig(next: AvatarConfig) {
    const state = configToState(next);
    setSelections(state.selections);
    setAccessories(state.accessories);
    setFacialHairId(state.facialHairId);
    setSkinPalette(state.skinPalette);
    setHairPalette(state.hairPalette);
    setBackgroundOption(state.backgroundOption);
    setExportError(null);
    setSaved(false);
  }

  useAvatarDraft({
    config,
    defaults: defaultConfig,
    netid,
    onRestore: applyConfig,
    initial: initialDesign?.config
  });

  // Declared after the draft hook, whose mount effect writes the backup.
  useEffect(() => {
    if (initialDesign && netid) setBackup(readDraftBackup(netid, defaultConfig));
    // Mount only: the editor is re-keyed when the opened design changes.
  }, []);

  function restoreBackup() {
    if (!backup) return;
    applyConfig(backup);
    if (netid) clearDraftBackup(netid);
    setBackup(null);
    setNotice("Brought back your previous edits");
  }

  // Keep ?design=N until the first edit, so a reload reopens the same design.
  // A design that wasn't found has nothing to reopen, so clear it right away.
  const addressCleared = useRef(false);
  const openedSerialized = useRef(
    initialDesign ? serializeAvatarConfig(initialDesign.config) : null
  );
  const serializedConfig = serializeAvatarConfig(config);
  useEffect(() => {
    if (addressCleared.current) return;
    const edited =
      openedSerialized.current !== null && serializedConfig !== openedSerialized.current;
    if (!edited && !designNotFound) return;
    addressCleared.current = true;
    // Not router.replace, which would re-render the page mid-edit. Only
    // ?design is removed; the path and any other parameters (ref, mode) stay.
    const url = new URL(window.location.href);
    url.searchParams.delete("design");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [serializedConfig, designNotFound]);

  const selectedPalette = category === "hair" ? hairPalette : skinPalette;
  const options = avatarOptions[category];
  const canvasStyle = useMemo(
    () => ({ background: backgroundOption.background }),
    [backgroundOption]
  );

  function selectOption(option: AvatarOption) {
    setSelections((current) => ({
      ...current,
      [category]:
        category !== "face" && current[category] === option.id
          ? null
          : option.id
    }));
  }

  function selectAccessory(type: keyof AccessorySelections, option: AvatarOption) {
    setAccessories((current) => {
      const next = { ...current };
      if (next[type] === option.id) delete next[type];
      else next[type] = option.id;
      return next;
    });
  }

  async function saveAvatar() {
    const response = await fetch("/api/avatar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config)
    });

    const body: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 400 && isIncompleteBody(body)) {
        throw new Error(missingFeaturesMessage(body.missing, "save"));
      }
      if (response.status === 429 && isRateLimitBody(body)) {
        throw new Error(
          `You're saving too often. Try again in about ${Math.ceil(
            body.retryAfterSeconds / 60
          )} minute(s).`
        );
      }
      throw new Error("Your YaleMoji could not be saved.");
    }

    setSaved(true);
    router.refresh();
  }

  async function runPngAction(action: PngAction) {
    if (pendingAction) return;
    setPendingAction(action);
    setExportError(null);
    if (action === "save") setSaved(false);
    const missing = missingRequiredFeatures(config);
    if (missing.length > 0) {
      setExportError(missingFeaturesMessage(missing, action));
      setPendingAction(null);
      return;
    }
    try {
      if (action === "save") {
        await saveAvatar();
      } else {
        const blob = await renderAvatarPng({
          accessories,
          background:
            action === "download-background" ? backgroundOption : undefined,
          facialHairId,
          hairPalette,
          selections,
          skinPalette
        });
        downloadBlob(
          blob,
          action === "download-transparent"
            ? "yalemoji-transparent.png"
            : "yalemoji.png"
        );
      }
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : "The PNG could not be created."
      );
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <section className={styles.page} aria-labelledby="editor-title">
      <h1 className={styles.srOnly} id="editor-title">
        YaleMoji editor
      </h1>
      <div aria-hidden className={styles.campus} />

      <div className={styles.workspace}>
        <div className={styles.previewColumn}>
          <div
            aria-label="Preview of your YaleMoji"
            className={styles.canvasCard}
            role="img"
            style={canvasStyle}
          >
            <div
              className={styles.background}
              data-avatar-layer="background"
              data-background-option={backgroundOption.id}
              style={canvasStyle}
            />
            <div aria-hidden className={styles.dotGrid} />
            <div className={styles.avatar}>
              <AvatarCanvas
                accessories={accessories}
                facialHairId={facialHairId}
                hairPalette={hairPalette}
                selections={selections}
                skinPalette={skinPalette}
              />
            </div>
          </div>
        </div>

        <aside className={styles.panel} aria-label="YaleMoji customization">
          <div aria-label="Avatar feature" className={styles.tabs} role="tablist">
            {avatarCategories.map((item) => (
              <button
                aria-selected={category === item}
                className={styles.tab}
                data-active={category === item}
                key={item}
                onClick={() => setCategory(item)}
                role="tab"
                type="button"
              >
                <span aria-hidden>{categoryLabels[item]}</span>
                {categoryLabels[item]}
              </button>
            ))}
          </div>

          <div className={styles.panelBody}>
            {category === "face" ? (
              <>
                <PalettePicker
                  label="Face"
                  onSelect={setSkinPalette}
                  options={skinPalettes}
                  selected={skinPalette}
                />
                <AvatarOptionGrid
                  category="face"
                  onSelect={selectOption}
                  options={options}
                  palette={selectedPalette}
                  selectedId={selections.face}
                />
              </>
            ) : null}

            {category === "eyes" ||
            category === "brows" ||
            category === "mouth" ? (
              <AvatarOptionGrid
                category={category}
                onSelect={selectOption}
                options={options}
                selectedId={selections[category]}
              />
            ) : null}

            {category === "hair" ? (
              <>
                <PalettePicker
                  label="Hair"
                  onSelect={setHairPalette}
                  options={hairPalettes}
                  selected={hairPalette}
                />
                <AvatarOptionGrid
                  category="hair"
                  onSelect={selectOption}
                  options={options}
                  palette={hairPalette}
                  selectedId={selections.hair}
                  skinPalette={skinPalette}
                />
                <div className={styles.optionSection}>
                  <SectionHeading
                    label="Facial Hair"
                    onClear={
                      facialHairId ? () => setFacialHairId(null) : undefined
                    }
                  />
                  <AvatarOptionGrid
                    category="hair"
                    onSelect={(option) =>
                      setFacialHairId((current) =>
                        current === option.id ? null : option.id
                      )
                    }
                    options={facialHairOptions}
                    palette={hairPalette}
                    selectedId={facialHairId}
                    skinPalette={skinPalette}
                  />
                </div>
              </>
            ) : null}

            {category === "accessories" ? (
              <div className={styles.accessorySections}>
                {accessoryGroups.map((group) => (
                  <section key={group.id}>
                    <SectionHeading
                      label={group.label}
                      onClear={
                        accessories[group.id]
                          ? () =>
                              setAccessories((current) => {
                                const next = { ...current };
                                delete next[group.id];
                                return next;
                              })
                          : undefined
                      }
                    />
                    <AvatarOptionGrid
                      category="accessories"
                      onSelect={(option) => selectAccessory(group.id, option)}
                      options={group.options}
                      selectedId={accessories[group.id] ?? null}
                    />
                  </section>
                ))}
              </div>
            ) : null}

            {category === "background" ? (
              <div className={styles.backgroundSections}>
                {backgroundSections.map((section) => (
                  <section key={section.id}>
                    <SectionHeading label={section.label} />
                    <div
                      aria-label={`Background ${section.label.toLowerCase()}`}
                      className={styles.backgroundOptions}
                      role="group"
                    >
                      {section.options.map((option) => (
                        <button
                          aria-label={`Select ${option.label} background`}
                          aria-pressed={backgroundOption.id === option.id}
                          className={styles.backgroundSwatch}
                          key={option.id}
                          onClick={() => setBackgroundOption(option)}
                          style={{ background: option.background }}
                          title={option.label}
                          type="button"
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : null}
          </div>

          <div className={styles.panelFooter}>
            <div className={styles.footerActions}>
              <DownloadButton pendingAction={pendingAction} onDownload={runPngAction} />
              <button
                aria-label={pendingAction === "save" ? "Saving avatar" : saved ? "Saved" : "Save avatar"}
                className={`${styles.export} ${styles.saveAction}`}
                disabled={pendingAction !== null}
                onClick={() => runPngAction("save")}
                type="button"
              >
                <svg aria-hidden fill="none" height="18" viewBox="0 0 24 24" width="18">
                  <path d="M5 4h12l2 2v14H5z" />
                  <path d="M8 4v6h8V4M8 20v-6h8v6" />
                </svg>
                <span aria-live="polite">{pendingAction === "save" ? "Saving…" : saved ? "Saved" : "Save"}</span>
              </button>
            </div>
            {exportError ? (
              <div className={styles.footerStatus}>
                <p className={styles.exportError} role="alert">{exportError}</p>
              </div>
            ) : notice ? (
              <div className={styles.footerStatus}>
                <p role="status" style={{ margin: 0, fontSize: 12, lineHeight: 1.3 }}>
                  {notice}
                  {backup ? (
                    <>
                      {" "}
                      <button
                        onClick={restoreBackup}
                        style={{
                          padding: 0,
                          border: 0,
                          background: "none",
                          color: "inherit",
                          font: "inherit",
                          textDecoration: "underline",
                          cursor: "pointer"
                        }}
                        type="button"
                      >
                        Bring back previous edits
                      </button>
                    </>
                  ) : null}
                </p>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </section>
  );
}
