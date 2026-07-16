export type AvatarBackgroundOption = {
  background: string;
  id: string;
  label: string;
};

export const backgroundColors = [
  { id: "solid-1", label: "Blush", background: "#f7bcc4" },
  { id: "solid-2", label: "Peach", background: "#f8c79d" },
  { id: "solid-3", label: "Butter", background: "#f3dfa0" },
  { id: "solid-4", label: "Mint", background: "#b9e2ca" },
  { id: "solid-5", label: "Seafoam", background: "#afe1df" },
  { id: "solid-6", label: "Sky", background: "#b7d4f4" },
  { id: "solid-7", label: "Periwinkle", background: "#c2c7f3" },
  { id: "solid-8", label: "Lilac", background: "#d7bdec" },
  { id: "solid-9", label: "Pink", background: "#efbdd9" },
  { id: "solid-10", label: "Cream", background: "#f3e8cf" },
  { id: "solid-11", label: "Sage", background: "#cad9bd" },
  { id: "solid-12", label: "Mist", background: "#d5dde5" }
] as const satisfies readonly AvatarBackgroundOption[];

export const backgroundGradients = [
  {
    id: "gradient-1",
    label: "Pink and yellow",
    background: "linear-gradient(135deg, #f3b9d4 0%, #f5dfa0 100%)"
  },
  {
    id: "gradient-2",
    label: "Peach and pink",
    background: "linear-gradient(135deg, #f7c495 0%, #edacd2 100%)"
  },
  {
    id: "gradient-3",
    label: "Mint and sky",
    background: "linear-gradient(135deg, #b7e3ca 0%, #b7d5f5 100%)"
  },
  {
    id: "gradient-4",
    label: "Blue and lilac",
    background: "linear-gradient(135deg, #b4d5f4 0%, #d2b8eb 100%)"
  },
  {
    id: "gradient-5",
    label: "Yellow and mint",
    background: "linear-gradient(135deg, #f4e29e 0%, #b5dfc8 100%)"
  },
  {
    id: "gradient-6",
    label: "Rose and periwinkle",
    background: "linear-gradient(135deg, #efb6c3 0%, #bec4f1 100%)"
  }
] as const satisfies readonly AvatarBackgroundOption[];
