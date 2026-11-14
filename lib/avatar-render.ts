import { readFile } from "node:fs/promises";
import path from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { createAvatarLayers } from "@/components/avatar-canvas";
import { avatarBackgroundSvg, findAvatarBackground } from "@/config/avatar-backgrounds";
import { hairPalettes, skinPalettes, type AvatarPalette } from "@/config/avatar-palettes";
import {
  innerSvg,
  namespaceAvatarSvg,
  normalizeAvatarSvg,
  occludeAvatarSvg,
  replacePaletteVariables
} from "@/lib/avatar-svg";
import { hairSliderPalettes, interpolatePalette } from "./avatar-colors";
import type { AvatarConfig } from "@/lib/avatar-config";

const ASSET_SIZE = 512;
const AVATAR_SIZE = 428;

const svgFileCache = new Map<string, Promise<string>>();

function loadAvatarSvgFromDisk(src: string) {
  const cached = svgFileCache.get(src);
  if (cached) return cached;

  const filePath = path.join(process.cwd(), "public", src);
  const request = readFile(filePath, "utf8").then((markup) =>
    normalizeAvatarSvg(src, markup)
  );
  svgFileCache.set(src, request);
  return request;
}

function findPalette(palettes: readonly AvatarPalette[], id: string) {
  return palettes.find((palette) => palette.id === id) ?? palettes[0];
}

async function composeSubjectSvg(config: AvatarConfig) {
  const skinPalette = config.skinColorPosition === undefined ? findPalette(skinPalettes, config.skinPaletteId) : interpolatePalette(skinPalettes, config.skinColorPosition);
  const hairPalette = config.hairColorPosition === undefined ? findPalette(hairPalettes, config.hairPaletteId) : interpolatePalette(hairSliderPalettes, config.hairColorPosition);
  const layers = createAvatarLayers(
    config.selections,
    config.accessories,
    config.facialHairId
  );

  const bodies = await Promise.all(
    layers.map(async (layer, index) => {
      const source = await loadAvatarSvgFromDisk(layer.src);
      const markup = layer.occludedBySrc
        ? occludeAvatarSvg(source, await loadAvatarSvgFromDisk(layer.occludedBySrc), layer.offsetY)
        : source;
      const palette =
        layer.palette === "skin"
          ? skinPalette
          : layer.palette === "hair"
            ? hairPalette
            : undefined;
      return innerSvg(
        namespaceAvatarSvg(
          replacePaletteVariables(markup, palette),
          `avatar-${index}`
        )
      );
    })
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ASSET_SIZE}" height="${ASSET_SIZE}" viewBox="0 0 502 502" fill="none">${bodies.join("")}</svg>`;
}

export async function renderAvatarAssets(
  config: AvatarConfig
): Promise<{ svg: string; png: Buffer; backgroundSvg: string }> {
  const svg = await composeSubjectSvg(config);
  const background = findAvatarBackground(config.backgroundId);
  const backgroundSvg = avatarBackgroundSvg(background.paint);

  const canvas = createCanvas(ASSET_SIZE, ASSET_SIZE);
  const context = canvas.getContext("2d");
  const image = await loadImage(Buffer.from(svg));
  const inset = (ASSET_SIZE - AVATAR_SIZE) / 2;
  context.drawImage(image, inset, inset, AVATAR_SIZE, AVATAR_SIZE);

  return { svg, png: canvas.toBuffer("image/png"), backgroundSvg };
}
