export const SECONDARY_FORMULAS = {
  toughness: {
    base: (char) => char.attributes.primary.strong || 0,
    formula: (base) => Math.max(base, 10),
  },
  painThreshold: {
    base: (char) => char.attributes.primary.strong || 0,
    formula: (base) => Math.ceil(base * 0.5),
  },
  corruptionThreshold: {
    base: (char) => char.attributes.primary.resolute || 0,
    formula: (base) => Math.ceil(base * 0.5),
  },
  defense: {
    base: (char) => char.attributes.primary.quick || 0,
    formula: (base) => base,
  },
};

export function clampValues(character) {
  const toughness = character.attributes?.secondary?.toughness;

  if (toughness) {
    toughness.current = Math.max(0, Math.min(toughness.current, toughness.max));
  }
}
