export type FlowerId =
  | "roseWhite"
  | "rosePink"
  | "peony"
  | "tulip"
  | "lily"
  | "hydrangea"
  | "babysBreath"
  | "eucalyptus";

export const flowerCatalog: readonly { id: FlowerId; label: string }[] = [
  { id: "roseWhite", label: "Hồng trắng" },
  { id: "rosePink", label: "Hồng phấn" },
  { id: "peony", label: "Mẫu đơn" },
  { id: "lily", label: "Ly" },
  { id: "tulip", label: "Tulip" },
  { id: "hydrangea", label: "Cẩm tú cầu" },
  { id: "babysBreath", label: "Baby" },
  { id: "eucalyptus", label: "Lá bạc" },
];

export const fillerFlowers: ReadonlySet<FlowerId> = new Set<FlowerId>(["babysBreath", "eucalyptus"]);

export const maxFlowers = 40;

export const defaultFlowers: FlowerId[] = [
  "peony",
  "roseWhite",
  "rosePink",
  "roseWhite",
  "rosePink",
  "lily",
  "roseWhite",
  "rosePink",
  "hydrangea",
  "roseWhite",
  "peony",
  "rosePink",
  "babysBreath",
  "roseWhite",
  "tulip",
  "babysBreath",
  "rosePink",
  "roseWhite",
  "eucalyptus",
  "babysBreath",
  "rosePink",
  "hydrangea",
];
