export type AvatarPalette = {
  id: string;
  primary: string;
  secondary: string;
};

export const neutralSkinPalette: AvatarPalette = {
  id: "0",
  primary: "#c4c4c4",
  secondary: "#676767"
};

export const skinPalettes = [
  { id: "1", primary: "#f9e0d2", secondary: "#f1b18b" },
  { id: "2", primary: "#f9d2b6", secondary: "#f2965f" },
  { id: "3", primary: "#efb68b", secondary: "#cc6f37" },
  { id: "4", primary: "#e8a068", secondary: "#c16025" },
  { id: "5", primary: "#d2955a", secondary: "#a55e34" },
  { id: "6", primary: "#8e5116", secondary: "#4a2814" },
  { id: "7", primary: "#4c2608", secondary: "#1a0c03" }
] as const satisfies readonly AvatarPalette[];

export const hairPalettes = [
  { id: "1", primary: "#363636", secondary: "#110800" },
  { id: "2", primary: "#432c22", secondary: "#1e0e00" },
  { id: "3", primary: "#543021", secondary: "#1e0e00" },
  { id: "4", primary: "#6b2f16", secondary: "#1e0e00" },
  { id: "5", primary: "#83300d", secondary: "#1e0e00" },
  { id: "6", primary: "#7f471a", secondary: "#3c1c00" },
  { id: "7", primary: "#aa6e20", secondary: "#573509" },
  { id: "8", primary: "#cc9e48", secondary: "#88621f" },
  { id: "9", primary: "#ecce95", secondary: "#bf9348" },
  { id: "10", primary: "#a85433", secondary: "#84381b" },
  { id: "11", primary: "#e583b1", secondary: "#a52e66" },
  { id: "12", primary: "#c67de0", secondary: "#793d8e" },
  { id: "13", primary: "#828ce3", secondary: "#3e4aae" }
] as const satisfies readonly AvatarPalette[];
