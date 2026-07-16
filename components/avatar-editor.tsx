"use client";

import Link from "next/link";
import { useState } from "react";
import {
  backgroundColors,
  backgroundGradients,
  type AvatarBackgroundOption
} from "@/config/avatar-backgrounds";
import {
  avatarCategories,
  avatarOptions,
  categoryLabels,
  createInitialSelections,
  findAvatarOption,
  type AvatarCategory,
  type AvatarOption,
  type AvatarSelections
} from "@/config/avatar-options";
import {
  hairPalettes,
  neutralSkinPalette,
  skinPalettes,
  type AvatarPalette
} from "@/config/avatar-palettes";
import { AvatarCanvas } from "./avatar-canvas";
import { AvatarOptionGrid } from "./avatar-option-grid";
import styles from "./avatar-editor.module.css";

export function AvatarEditor() {
  const [category, setCategory] = useState<AvatarCategory>("face");
  const [skinPalette, setSkinPalette] = useState<AvatarPalette>(skinPalettes[0]);
  const [hairPalette, setHairPalette] = useState<AvatarPalette | null>(hairPalettes[0] ?? null);
  const [backgroundOption, setBackgroundOption] = useState<AvatarBackgroundOption | null>(null);
  const [selections, setSelections] = useState<AvatarSelections>(createInitialSelections);
  const [expanded, setExpanded] = useState(true);
  const [active, setActive] = useState(false);

  const palettes = category === "face" ? skinPalettes : category === "hair" ? hairPalettes : [];
  const selectedPalette = category === "hair" ? hairPalette : skinPalette;

  function selectPalette(palette: AvatarPalette) {
    if (category === "hair") setHairPalette(palette);
    if (category === "face") setSkinPalette(palette);
    setActive(true);
  }

  function selectOption(option: AvatarOption) {
    setSelections((current) => ({ ...current, [category]: option.id }));
    setActive(true);
  }

  function selectBackground(option: AvatarBackgroundOption) {
    setBackgroundOption(option);
    setActive(true);
  }

  const categoryIndex = avatarCategories.indexOf(category);

  function moveCategory(offset: -1 | 1) {
    const nextCategory = avatarCategories[categoryIndex + offset];
    if (nextCategory) setCategory(nextCategory);
  }

  return (
    <section className={styles.page} aria-labelledby="editor-title">
      <div className={styles.editor}>
        <div className={styles.topControls}>
          <Link aria-label="Close editor" className={styles.close} href="/">×</Link>
          <button
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse customization controls" : "Expand customization controls"}
            className={styles.collapse}
            onClick={() => setExpanded((value) => !value)}
            type="button"
          >
            <span aria-hidden="true">⌄</span>
          </button>
        </div>

        <div className={styles.identity}>
          <div aria-label="Preview of your YaleMoji" className={styles.face} role="img">
            <AvatarCanvas
              active={active}
              backgroundOption={backgroundOption}
              fallback
              hairPalette={hairPalette}
              selections={selections}
              skinPalette={active ? skinPalette : neutralSkinPalette}
            />
          </div>
          <h1 className={styles.name} id="editor-title">My YaleMoji</h1>
        </div>

        {expanded ? (
          <div className={styles.customizer}>
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
                  {categoryLabels[item]}
                </button>
              ))}
            </div>

            {palettes.length > 0 ? (
              <div aria-label={`${categoryLabels[category]} color`} className={styles.colors} role="group">
                <span>Color:</span>
                <div className={styles.swatches}>
                  {palettes.map((palette) => (
                    <button
                      aria-label={`Select color ${palette.id}`}
                      aria-pressed={selectedPalette?.id === palette.id}
                      className={styles.swatch}
                      key={palette.id}
                      onClick={() => selectPalette(palette)}
                      style={{ backgroundColor: palette.primary }}
                      type="button"
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {category === "background" ? (
              <div className={styles.backgroundControls}>
                <div aria-label="Background color" className={styles.colors} role="group">
                  <span>Solid:</span>
                  <div className={styles.swatches}>
                    {backgroundColors.map((color) => (
                      <button
                        aria-label={`Select ${color.label} background`}
                        aria-pressed={backgroundOption?.id === color.id}
                        className={styles.swatch}
                        key={color.id}
                        onClick={() => selectBackground(color)}
                        style={{ background: color.background }}
                        type="button"
                      />
                    ))}
                  </div>
                </div>

                <div aria-label="Background gradient" className={styles.colors} role="group">
                  <span>Gradients:</span>
                  <div className={styles.swatches}>
                    {backgroundGradients.map((gradient) => (
                      <button
                        aria-label={`Select ${gradient.label} gradient background`}
                        aria-pressed={backgroundOption?.id === gradient.id}
                        className={styles.swatch}
                        key={gradient.id}
                        onClick={() => selectBackground(gradient)}
                        style={{ background: gradient.background }}
                        type="button"
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <AvatarOptionGrid
                category={category}
                faceOption={findAvatarOption("face", selections.face)}
                onSelect={selectOption}
                options={avatarOptions[category]}
                palette={selectedPalette ?? undefined}
                selectedId={selections[category]}
                skinPalette={skinPalette}
              />
            )}

            <div className={styles.actions}>
              <button
                className={styles.back}
                disabled={categoryIndex === 0}
                onClick={() => moveCategory(-1)}
                type="button"
              >
                Back
              </button>
              <button
                className={styles.next}
                disabled={categoryIndex === avatarCategories.length - 1}
                onClick={() => moveCategory(1)}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
