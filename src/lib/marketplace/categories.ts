export const CATEGORY_LABELS: Record<string, string> = {
  VEGETABLE: "Sayur",
  FRUIT: "Buah",
  PROTEIN: "Protein",
  STAPLE: "Pokok",
  HERB: "Rempah",
  OTHER: "Lainnya",
};

export const CATEGORY_ORDER = [
  "VEGETABLE",
  "FRUIT",
  "PROTEIN",
  "STAPLE",
  "HERB",
  "OTHER",
] as const;

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}
