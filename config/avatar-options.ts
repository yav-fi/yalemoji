export const avatarCategories = [
  "face",
  "eyes",
  "brows",
  "mouth",
  "hair",
  "accessories",
  "background"
] as const;

export type AvatarCategory = (typeof avatarCategories)[number];

export type AvatarOption = {
  behindFace?: boolean;
  backSrc?: `/yalemoji/${string}.svg`;
  default?: boolean;
  frontSrc?: `/yalemoji/${string}.svg`;
  id: string;
  label: string;
  src: `/yalemoji/${string}.svg`;
};

export type AvatarSelections = Record<AvatarCategory, string | null>;

export const accessoryTypes = [
  "eyewear",
  "cheeks",
  "earrings",
  "hairClips",
  "crest"
] as const;

export type AccessoryType = (typeof accessoryTypes)[number];
export type AccessorySelections = Partial<Record<AccessoryType, string>>;

export type AccessoryGroup = {
  id: AccessoryType;
  label: string;
  options: readonly AvatarOption[];
};

export const categoryLabels: Record<AvatarCategory, string> = {
  face: "Face",
  eyes: "Eyes",
  brows: "Eyebrows",
  mouth: "Mouth",
  hair: "Hair",
  accessories: "Accessories",
  background: "Background"
};

const numberedOptions = (
  prefix: string,
  label: string,
  folder: string,
  filePrefix: string,
  numbers: readonly number[]
): readonly AvatarOption[] =>
  numbers.map((number, index) => ({
    id: `${prefix}-${index + 1}`,
    label: `${label} ${index + 1}`,
    src: `/yalemoji/${folder}/${filePrefix}${number}.svg`
  }));

const hairOptions: readonly AvatarOption[] = (() => {
  const missingBack = new Set([5, 6, 7, 24]);
  const options: AvatarOption[] = Array.from({ length: 31 }, (_, index) => {
    const number = index + 1;
    const frontSrc = `/yalemoji/Hairs/${number}-front.svg` as const;
    return {
      id: `hair-${number}`,
      label: `Hair ${number}`,
      src: frontSrc,
      frontSrc,
      backSrc: missingBack.has(number)
        ? undefined
        : (`/yalemoji/Hairs/${number}-back.svg` as const)
    } satisfies AvatarOption;
  });

  options.splice(2, 0, {
    id: "hair-2-variant",
    label: "Hair 3",
    src: "/yalemoji/Hairs/2-front-1.svg",
    frontSrc: "/yalemoji/Hairs/2-front-1.svg"
  });
  return options.map((option, index) => ({
    ...option,
    label: `Hair ${index + 1}`
  }));
})();

const earringOptions = numberedOptions(
  "earrings", "Earrings", "Accessories", "ear", [1, 2, 3]
);

export const accessoryGroups = [
  {
    id: "eyewear",
    label: "Eyewear",
    options: numberedOptions(
      "eyewear",
      "Eyewear",
      "Accessories",
      "eyewear",
      [1, 2, 3, 4]
    )
  },
  {
    id: "cheeks",
    label: "Cheeks",
    options: numberedOptions(
      "cheeks",
      "Cheeks",
      "Accessories",
      "facial",
      [1, 2]
    )
  },
  {
    id: "earrings",
    label: "Jewelry",
    options: [
      ...earringOptions.slice(0, 2),
      {
        id: "cross",
        label: "Cross",
        src: "/yalemoji/Accessories/cross.svg",
        behindFace: true
      },
      ...earringOptions.slice(2)
    ]
  },
  {
    id: "hairClips",
    label: "Hair Clips",
    options: numberedOptions(
      "hair-clips",
      "Hair clips",
      "Accessories",
      "hair",
      [1, 2, 3, 4]
    )
  },
  {
    id: "crest",
    label: "College Crest",
    options: numberedOptions(
      "crest",
      "College crest",
      "Accessories",
      "face",
      Array.from({ length: 15 }, (_, index) => index + 1)
    )
  }
] as const satisfies readonly AccessoryGroup[];

export const facialHairOptions = numberedOptions(
  "facial-hair",
  "Facial hair",
  "FacialHair",
  "Facial_",
  Array.from({ length: 8 }, (_, index) => index + 1)
);

export const avatarOptions: Record<AvatarCategory, readonly AvatarOption[]> = {
  face: numberedOptions(
    "face",
    "Face",
    "Face",
    "Face_",
    [1, 2, 3, 4, 5]
  ),
  eyes: numberedOptions(
    "eyes",
    "Eyes",
    "Eyes",
    "Eyes_",
    Array.from({ length: 12 }, (_, index) => index + 12)
  ),
  brows: numberedOptions(
    "brows",
    "Eyebrows",
    "Brows",
    "Brows_",
    Array.from({ length: 6 }, (_, index) => index + 9)
  ),
  mouth: numberedOptions(
    "mouth",
    "Mouth",
    "Mouths",
    "Mouth_",
    Array.from({ length: 8 }, (_, index) => index + 33)
  ),
  hair: hairOptions,
  accessories: accessoryGroups.flatMap((group) => group.options),
  background: []
};

export const fixedNoseSrc = "/yalemoji/Nose 1.svg";

export function createInitialSelections(): AvatarSelections {
  return Object.fromEntries(
    avatarCategories.map((category) => [
      category,
      category === "face" ? avatarOptions.face[0]?.id ?? null : null
    ])
  ) as AvatarSelections;
}

export function findAvatarOption(
  category: AvatarCategory,
  id: string | null
) {
  if (!id) return null;
  return avatarOptions[category].find((option) => option.id === id) ?? null;
}

export function findAccessoryOption(
  type: AccessoryType,
  id: string | undefined
): AvatarOption | null {
  if (!id) return null;
  return (
    accessoryGroups
      .find((group) => group.id === type)
      ?.options.find((option) => option.id === id) ?? null
  );
}
