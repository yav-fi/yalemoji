import { hairPalettes, type AvatarPalette } from "@/config/avatar-palettes";

// Keep the auburn with the reddish browns, before golden brown and blonde.
export const hairSliderPalettes: readonly AvatarPalette[] = [
  ...hairPalettes.slice(0, 5), hairPalettes[9],
  ...hairPalettes.slice(5, 9), ...hairPalettes.slice(10)
];

function blendHex(a: string, b: string, fraction: number) {
  const channels = [1, 3, 5].map((index) => Math.round(
    parseInt(a.slice(index, index + 2), 16) * (1 - fraction) +
    parseInt(b.slice(index, index + 2), 16) * fraction
  ).toString(16).padStart(2, "0"));
  return `#${channels.join("")}`;
}

export function interpolatePalette(options: readonly AvatarPalette[], value: number): AvatarPalette {
  const position = Math.max(0, Math.min(options.length - 1, value));
  const lower = Math.floor(position);
  const upper = Math.min(lower + 1, options.length - 1);
  const fraction = position - lower;
  return {
    id: options[Math.round(position)].id,
    primary: blendHex(options[lower].primary, options[upper].primary, fraction),
    secondary: blendHex(options[lower].secondary, options[upper].secondary, fraction)
  };
}

