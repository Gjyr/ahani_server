import { SECONDARY_FORMULAS, clampValues } from "./attributes.mjs";
import { applyEffect, applyEquipmentBonuses } from "./applicator.mjs";

export function recalculateDerivedFields(character) {
  const result = structuredClone(character);

  for (const [stat, rule] of Object.entries(SECONDARY_FORMULAS)) {
    const baseValue = rule.base(result);
    const calculated = rule.formula(baseValue);

    if (typeof result.attributes.secondary[stat] === "object") {
      result.attributes.secondary[stat] = {
        ...result.attributes.secondary[stat],
        max: calculated,
      };
    } else {
      result.attributes.secondary[stat] = calculated;
    }
  }

  const allEffects = [
    ...(result.traits || []).filter((t) => t.effects).flatMap((t) => t.effects),
    ...(result.effects || []),
  ].filter((effect) => !isExpired(effect));

  allEffects.sort((a, b) => (a.priority || 10) - (b.priority || 10));

  for (const effect of allEffects) {
    applyEffect(result, effect.target, effect.modifier);
  }

  applyEquipmentBonuses(result);

  clampValues(result);

  // enforceConsistency(result);

  return result;
}

function isExpired(effect) {
  return effect.duration && new Date(effect.duration) < new Date();
}
