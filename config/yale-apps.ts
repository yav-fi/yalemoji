export type YaleApp = {
  id: string;
  name: string;
  aliases: readonly string[];
  href?: string;
  image: string;
  imageShift?: "up" | "upMore";
  imageSize?: "xlarge";
  roundedImage?: boolean;
};

export const yalemojiApp: YaleApp = {
  id: "yalemoji",
  name: "YaleMoji",
  aliases: [],
  href: "https://yalemoji.com",
  image: "/apps-panel/yalemoji.png",
  roundedImage: true
};

export const yaleApps: readonly YaleApp[] = [
  { id: "coursetable", name: "CourseTable", aliases: [], href: "https://coursetable.com", image: "/apps-panel/coursetable.svg" },
  { id: "ymeets", name: "y/meets", aliases: ["yalemeets", "meets"], href: "https://ymeets.com", image: "/apps-panel/ymeetslogo.png", roundedImage: true },
  { id: "majoraudit", name: "MajorAudit", aliases: ["audit"], image: "/apps-panel/majoraudit.webp" },
  { id: "yalies", name: "Yalies", aliases: [], href: "https://yalies.io", image: "/apps-panel/yalies.png" },
  { id: "ylabs", name: "y/labs", aliases: ["yalelabs", "labs"], href: "https://yalelabs.io", image: "/apps-panel/ylabs.png", imageShift: "up" },
  { id: "yalemeals", name: "Yale Meals", aliases: ["yalesmeals", "yalemenus", "meals", "menus"], href: "https://apps.apple.com/us/app/yalemeals/id6755962674", image: "/apps-panel/yale-menus.png", imageShift: "upMore", imageSize: "xlarge" },
  { id: "yaleclubs", name: "Yale Clubs", aliases: ["yclubs", "clubs"], href: "https://yaleclubs.io", image: "/apps-panel/yclubs.svg" },
  { id: "yaleims", name: "Yale IMs", aliases: ["ims", "intramurals"], href: "https://yaleims.com", image: "/apps-panel/yaleims.png", imageShift: "up" }
];

export function findReferringApp(ref: string | null | undefined): YaleApp | null {
  const normalized = ref?.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!normalized) return null;
  return yaleApps.find((app) => app.id === normalized || app.aliases.includes(normalized)) ?? null;
}
