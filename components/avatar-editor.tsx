"use client";

import { useMemo, useRef, useState } from "react";
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
  createInitialSelections,
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
  missingRequiredFeatures,
  type AvatarConfig,
  type RequiredFeature
} from "@/lib/avatar-config";
import { useAvatarDraft, writeDraft } from "@/lib/avatar-draft";
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
import { PaletteSlider } from "./palette-slider";
import { hairSliderPalettes, interpolatePalette } from "@/lib/avatar-colors";
import { AvatarCategoryIcon } from "./avatar-category-icon";
import { AvatarOptionGrid } from "./avatar-option-grid";
import styles from "./avatar-editor.module.css";

const EXPORT_SIZE = 1080;
const EXPORT_AVATAR_SIZE = 900;
type PngAction = "download-background" | "download-transparent" | "save";

function initialSelections(): AvatarSelections {
  const selections = createInitialSelections();
  selections.hair = null;
  selections.eyes = avatarOptions.eyes[0].id;
  selections.brows = avatarOptions.brows[avatarOptions.brows.length - 1].id;
  selections.mouth = avatarOptions.mouth[0].id;
  return selections;
}

const DEFAULT_SKIN_PALETTE = skinPalettes[2];
const DEFAULT_HAIR_PALETTE = hairPalettes[0];

const defaultConfig: AvatarConfig = {
  selections: initialSelections(),
  accessories: {},
  facialHairId: null,
  skinPaletteId: DEFAULT_SKIN_PALETTE.id,
  hairPaletteId: DEFAULT_HAIR_PALETTE.id,
  backgroundId: defaultAvatarBackground.id
};

const requiredFeatureNames: Record<RequiredFeature, string> = {
  eyes: "eyes",
  mouth: "a mouth"
};

function missingFeaturesMessage(missing: readonly RequiredFeature[], action: PngAction) {
  const names = missing.map((feature) => requiredFeatureNames[feature] ?? feature).join(" and ");
  return `Add ${names} before ${action.startsWith("save") ? "saving" : "downloading"}.`;
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
    image.onerror = () => reject(new Error("Could not render the Yalemoji."));
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
    if (!sourceBounds) throw new Error("The Yalemoji has no visible artwork.");

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

export function AvatarEditor({ netid, localPreview = false }: {
  netid?: string | null;
  localPreview?: boolean;
} = {}) {
  const router = useRouter();
  const panelBodyRef = useRef<HTMLDivElement>(null);
  const [category, setCategory] = useState<AvatarCategory | "finish">("face");
  const [skinPosition, setSkinPosition] = useState(2);
  const [hairPosition, setHairPosition] = useState(0);
  const skinPalette = useMemo(() => interpolatePalette(skinPalettes, skinPosition), [skinPosition]);
  const hairPalette = useMemo(() => interpolatePalette(hairSliderPalettes, hairPosition), [hairPosition]);
  const [backgroundOption, setBackgroundOption] =
    useState<AvatarBackgroundOption>(defaultAvatarBackground);
  const [selections, setSelections] =
    useState<AvatarSelections>(initialSelections);
  const [facialHairId, setFacialHairId] = useState<string | null>(null);
  const [accessories, setAccessories] = useState<AccessorySelections>({});
  const [pendingAction, setPendingAction] = useState<PngAction | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);
  const [savingControl, setSavingControl] = useState<"finish" | "next" | null>(null);
  const actionInFlight = useRef(false);
  const savedDesignConfig = useRef<string | null>(null);

  const config = useMemo<AvatarConfig>(
    () => ({
      selections,
      accessories,
      facialHairId,
      skinColorPosition: skinPosition,
      hairColorPosition: hairPosition,
      skinPaletteId: skinPalette.id,
      hairPaletteId: hairPalette.id,
      backgroundId: backgroundOption.id
    }),
    [selections, accessories, facialHairId, skinPalette, hairPalette, skinPosition, hairPosition, backgroundOption]
  );

  function applyConfig(next: AvatarConfig) {
    setSelections({
      ...next.selections,
      eyes: next.selections.eyes ?? avatarOptions.eyes[0].id,
      mouth: next.selections.mouth ?? avatarOptions.mouth[0].id
    });
    setAccessories(next.accessories);
    setFacialHairId(next.facialHairId);
    setSkinPosition(next.skinColorPosition ?? Math.max(0, skinPalettes.findIndex((palette) => palette.id === next.skinPaletteId)));
    setHairPosition(next.hairColorPosition ?? Math.max(0, hairSliderPalettes.findIndex((palette) => palette.id === next.hairPaletteId)));
    setBackgroundOption(
      avatarBackgroundOptions.find((option) => option.id === next.backgroundId) ??
        defaultAvatarBackground
    );
    setExportError(null);
    setCreated(false);
  }

  const draftOwner = localPreview ? "local-editor-preview" : netid;
  useAvatarDraft({ config, defaults: defaultConfig, netid: draftOwner, onRestore: applyConfig });

  const selectedPalette = category === "hair" ? hairPalette : skinPalette;
  const options = category === "finish" ? [] : avatarOptions[category];
  const canvasStyle = useMemo(
    () => ({ background: backgroundOption.background }),
    [backgroundOption]
  );

  function goToStep(step: AvatarCategory | "finish", control: "finish" | "next" = "finish") {
    if (actionInFlight.current) return;
    if (step === "finish" && savedDesignConfig.current !== JSON.stringify(config)) {
      setSavingControl(control);
      void runPngAction("save");
      return;
    }
    setCategory(step);
    if (panelBodyRef.current) panelBodyRef.current.scrollTop = 0;
  }

  const stepIndex = category === "finish" ? avatarCategories.length : avatarCategories.indexOf(category);

  function selectOption(option: AvatarOption) {
    if (category === "finish") return;
    setSelections((current) => ({
      ...current,
      [category]:
        !["face", "eyes", "mouth"].includes(category) && current[category] === option.id
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
    if (localPreview) {
      if (!writeDraft("local-editor-preview", config)) throw new Error("Could not save on this device. Browser storage is unavailable.");
      return;
    }
    const response = await fetch("/api/avatar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...config, setAsCurrent: true })
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
      throw new Error("Your Yalemoji could not be saved.");
    }


  }

  async function runPngAction(action: PngAction) {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setPendingAction(action);
    setExportError(null);
    if (action === "save") setCreated(false);
    const missing = missingRequiredFeatures(config);
    if (missing.length > 0) {
      setExportError(missingFeaturesMessage(missing, action));
      setPendingAction(null);
      actionInFlight.current = false;
      setSavingControl(null);
      return;
    }
    try {
      if (action === "save") {
        await saveAvatar();
        savedDesignConfig.current = JSON.stringify(config);
        setCreated(true);
        setCategory("finish");
        if (panelBodyRef.current) panelBodyRef.current.scrollTop = 0;
        if (!localPreview) router.refresh();
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
      setSavingControl(null);
      actionInFlight.current = false;
      setPendingAction(null);
    }
  }

  return (
    <section className={styles.page} aria-labelledby="editor-title">
      <h1 className={styles.srOnly} id="editor-title">
        Yalemoji editor
      </h1>
      <div aria-hidden className={styles.campus} />
      {localPreview && <p className={styles.previewNotice} role="status">Local editor preview · Saves stay on this device</p>}

      <div className={styles.workspace}>
        <div className={styles.previewColumn}>
          <div
            aria-label="Preview of your Yalemoji"
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

        <aside className={styles.panel} aria-label="Yalemoji customization">
          <div aria-label="Avatar feature" className={styles.tabs} role="tablist">
            {avatarCategories.map((item) => (
              <button
                disabled={pendingAction !== null}
                aria-label={categoryLabels[item]}
                aria-selected={category === item}
                className={styles.tab}
                data-active={category === item}
                key={item}
                onClick={() => goToStep(item)}
                role="tab"
                type="button"
              >
                <AvatarCategoryIcon category={item} />
                <span className={styles.tabLabel}>{categoryLabels[item]}</span>
              </button>
            ))}
            <button disabled={pendingAction !== null} aria-label="Finish" aria-busy={savingControl === "finish"} aria-selected={category === "finish"} role="tab" type="button"
              className={`${styles.tab} ${styles.finishTab}`} data-active={category === "finish"}
              onClick={() => goToStep("finish")}>
              {savingControl === "finish" ? <span className={styles.buttonSpinner} role="status" aria-label="Saving your Yalemoji" /> : (
              <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              )}
            </button>
          </div>

          <div className={styles.panelBody} ref={panelBodyRef} inert={pendingAction === "save"} aria-busy={pendingAction === "save"}>
            {category === "finish" && (
              <div className={styles.finishPanel} aria-busy={pendingAction === "save"}>
                {created && (
                  <>
                    <h2 aria-live="polite">Your Yalemoji has been set!</h2>
                    <button className={`${styles.export} ${styles.secondaryAction}`} type="button" disabled={pendingAction !== null}
                      onClick={() => void runPngAction("download-background")}>Download PNG with background</button>
                    <button className={`${styles.export} ${styles.secondaryAction}`} type="button" disabled={pendingAction !== null}
                      onClick={() => void runPngAction("download-transparent")}>Download transparent PNG</button>
                    <a className={`${styles.export} ${styles.saveAction} ${styles.done}`} href="https://yalemoji.com">Done</a>
                  </>
                )}
              </div>
            )}
            {category === "face" ? (
              <>
                <PaletteSlider
                  label="Face"
                  onChange={setSkinPosition}
                  options={skinPalettes}
                  value={skinPosition}
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
                <PaletteSlider
                  label="Hair"
                  onChange={setHairPosition}
                  options={hairSliderPalettes}
                  value={hairPosition}
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
          {exportError && <p className={`${styles.exportError} ${styles.stepError}`} role="alert">{exportError}</p>}
          <nav className={styles.stepNav} aria-label="Editor steps">
            {stepIndex > 0 && (
              <button className={`${styles.export} ${styles.secondaryAction}`} type="button" disabled={pendingAction !== null}
                onClick={() => goToStep(avatarCategories[stepIndex - 1])}>Back</button>
            )}
            {category !== "finish" && (
              <button className={`${styles.export} ${category === "background" ? styles.saveAction : styles.secondaryAction} ${styles.nextStep}`}
                type="button" disabled={pendingAction !== null} aria-label="Next" aria-busy={savingControl === "next"}
                onClick={() => goToStep(stepIndex + 1 === avatarCategories.length ? "finish" : avatarCategories[stepIndex + 1], "next")}>
                {savingControl === "next" ? <span className={styles.buttonSpinner} role="status" aria-label="Saving your Yalemoji" /> : "Next"}
              </button>
            )}
          </nav>
        </aside>
      </div>
    </section>
  );
}
