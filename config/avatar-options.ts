export const avatarCategories = [
  "face",
  "hair",
  "eyes",
  "brows",
  "mouth",
  "accessories",
  "background"
] as const;

export type AvatarCategory = (typeof avatarCategories)[number];

export type AvatarOption = {
  backSrc?: `/avatar/hair-back/${string}.svg`;
  default?: boolean;
  frontSrc?: `/avatar/hair-front/${string}.svg`;
  id: string;
  label: string;
  src: `/avatar/${string}.svg`;
};

export type AvatarSelections = Record<AvatarCategory, string | null>;

export const categoryLabels: Record<AvatarCategory, string> = {
  face: "Face",
  hair: "Hair",
  eyes: "Eyes",
  brows: "Brows",
  mouth: "Mouth",
  accessories: "Accessories",
  background: "Background"
};

// Add one manifest entry for every SVG placed in public/avatar/<category>/.
// The filename and id should be stable; labels are the user-facing names.
const hairOptions: readonly AvatarOption[] = Array.from({ length: 32 }, (_, index) => {
  const number = index + 1;
  return {
    id: `hair-${number}`,
    label: `Hair ${number}`,
    src: `/avatar/hair-front/${number}.svg`,
    frontSrc: `/avatar/hair-front/${number}.svg`,
    backSrc: `/avatar/hair-back/${number}.svg`
  } as AvatarOption;
});

const accessoryOptions: readonly AvatarOption[] = Array.from({ length: 22 }, (_, index) => {
  const number = index + 1;
  return {
    id: `accessories-${number}`,
    label: `Accessory ${number}`,
    src: `/avatar/accessories/${number}.svg`
  } as AvatarOption;
});

export const avatarOptions: Record<AvatarCategory, readonly AvatarOption[]> = {
  face: [
    { id: "face-1", label: "Face 1", src: "/avatar/face/1.svg", default: true },
    { id: "face-2", label: "Face 2", src: "/avatar/face/2.svg" },
    { id: "face-3", label: "Face 3", src: "/avatar/face/3.svg" },
    { id: "face-4", label: "Face 4", src: "/avatar/face/4.svg" },
    { id: "face-5", label: "Face 5", src: "/avatar/face/5.svg" }
  ],
  hair: hairOptions,
  eyes: [
    { id: "eyes-1", label: "Eyes 1", src: "/avatar/eyes/1.svg", default: true },
    { id: "eyes-2", label: "Eyes 2", src: "/avatar/eyes/2.svg" },
    { id: "eyes-3", label: "Eyes 3", src: "/avatar/eyes/3.svg" },
    { id: "eyes-4", label: "Eyes 4", src: "/avatar/eyes/4.svg" },
    { id: "eyes-5", label: "Eyes 5", src: "/avatar/eyes/5.svg" },
    { id: "eyes-6", label: "Eyes 6", src: "/avatar/eyes/6.svg" },
    { id: "eyes-7", label: "Eyes 7", src: "/avatar/eyes/7.svg" },
    { id: "eyes-8", label: "Eyes 8", src: "/avatar/eyes/8.svg" },
    { id: "eyes-9", label: "Eyes 9", src: "/avatar/eyes/9.svg" },
    { id: "eyes-10", label: "Eyes 10", src: "/avatar/eyes/10.svg" },
    { id: "eyes-11", label: "Eyes 11", src: "/avatar/eyes/11.svg" },
    { id: "eyes-12", label: "Eyes 12", src: "/avatar/eyes/12.svg" }
  ],
  brows: [
    { id: "brows-1", label: "Brows 1", src: "/avatar/brows/1.svg", default: true },
    { id: "brows-2", label: "Brows 2", src: "/avatar/brows/2.svg" },
    { id: "brows-3", label: "Brows 3", src: "/avatar/brows/3.svg" },
    { id: "brows-4", label: "Brows 4", src: "/avatar/brows/4.svg" },
    { id: "brows-5", label: "Brows 5", src: "/avatar/brows/5.svg" },
    { id: "brows-6", label: "Brows 6", src: "/avatar/brows/6.svg" },
    { id: "brows-7", label: "Brows 7", src: "/avatar/brows/7.svg" }
  ],
  mouth: [
    { id: "mouth-1", label: "Mouth 1", src: "/avatar/mouth/1.svg", default: true },
    { id: "mouth-2", label: "Mouth 2", src: "/avatar/mouth/2.svg" },
    { id: "mouth-3", label: "Mouth 3", src: "/avatar/mouth/3.svg" },
    { id: "mouth-4", label: "Mouth 4", src: "/avatar/mouth/4.svg" },
    { id: "mouth-5", label: "Mouth 5", src: "/avatar/mouth/5.svg" },
    { id: "mouth-6", label: "Mouth 6", src: "/avatar/mouth/6.svg" },
    { id: "mouth-7", label: "Mouth 7", src: "/avatar/mouth/7.svg" },
    { id: "mouth-8", label: "Mouth 8", src: "/avatar/mouth/8.svg" }
  ],
  accessories: accessoryOptions,
  background: []
};

export const fixedNoseSrc = "/avatar/nose/1.svg";

const defaultCategories: readonly AvatarCategory[] = ["face", "eyes", "brows", "mouth"];

export function createInitialSelections(): AvatarSelections {
  return Object.fromEntries(avatarCategories.map((category) => {
    const options = avatarOptions[category];
    const selected = options.find((option) => option.default) ??
      (defaultCategories.includes(category) ? options[0] : null);
    return [category, selected?.id ?? null];
  })) as AvatarSelections;
}

export const layerOrder: readonly AvatarCategory[] = [
  "background",
  "face",
  "eyes",
  "brows",
  "mouth",
  "hair",
  "accessories"
];

export function findAvatarOption(category: AvatarCategory, id: string | null) {
  if (!id) return null;
  return avatarOptions[category].find((option) => option.id === id) ?? null;
}
