import {
  canAccessField,
  generateDefaultCharacter,
  getFieldSchema,
  checkRequiredFields,
  checkServerControlledField,
  validateRPGRules,
  validateFieldValue,
  validateCrossFieldRules,
} from "./utils.mjs";
import {
  deepMerge,
  getAllFieldPaths,
  getFieldPathsByProperty,
  getNestedValue,
  setNestedValue,
} from "./traversal.mjs";

const REQUIRED_FIELDS = getFieldPathsByProperty("required", true);
const FIELDS_WITH_VALIDATION = getFieldPathsByProperty("validate", undefined);
export const SERVER_CONTROLLED_FIELDS = getFieldPathsByProperty(
  "serverControlled",
  true,
);

export function validateCharacterCreation(data, playerId, playerName) {
  const errors = [];
  const warnings = [];
  const validatedData = {};

  const defaultCharacter = generateDefaultCharacter(playerId, playerName);

  const mergedCharacter = deepMerge(defaultCharacter, data, {
    skipUndefined: true,
  });

  checkRequiredFields(data, errors, REQUIRED_FIELDS);

  const userProvidedPaths = getAllFieldPaths(data);

  for (const fieldPath of userProvidedPaths) {
    if (
      checkServerControlledField(fieldPath, warnings, SERVER_CONTROLLED_FIELDS)
    )
      continue;

    const userValue = getNestedValue(data, fieldPath);
    const schema = getFieldSchema(fieldPath);

    if (!schema) {
      errors.push({
        field: fieldPath,
        error: `Unknown field: "${fieldPath}"`,
        code: "UNKNOWN_FIELD",
      });

      continue;
    }

    if (!canAccessField(fieldPath, "owner", "write")) {
      errors.push({
        field: fieldPath,
        error: `You don't have permission to set "${fieldPath}" during character creation...`,
        code: "PERMISSION_DENIED",
      });

      continue;
    }

    const validation = validateFieldValue(
      fieldPath,
      userValue,
      mergedCharacter,
    );
    if (!validation.valid) {
      errors.push({
        field: fieldPath,
        error: validation.error,
        code: "VALIDATION",
      });

      continue;
    }

    setNestedValue(validatedData, fieldPath, userValue);
  }

  const crossFieldErrors = validateCrossFieldRules(
    mergedCharacter,
    FIELDS_WITH_VALIDATION,
  );
  errors.push(...crossFieldErrors);

  const businessErrors = validateRPGRules(mergedCharacter);
  errors.push(...businessErrors);

  return {
    success: errors.length === 0,
    validatedData:
      errors.length === 0
        ? {
            ...deepMerge(defaultCharacter, validatedData, {
              skipUndefined: true,
            }),
            playerId,
            player: playerName || "Unknown",
            created: new Date().toISOString(),
            lastModified: new Date().toISOString(),
          }
        : null,
    errors,
    warnings,
  };
}

export async function validateCharacterUpdate(updates, character, user) {
  const errors = [];
  const validUpdates = [];

  for (const update of updates) {
    const { field, value, operation } = update;

    const userRole =
      user.id === character.playerId ? "owner" : user.isDM ? "dm" : "public";

    if (!canAccessField(field, userRole, "write")) {
      errors.push({
        field,
        error: `User ${user.id} cannot edit ${field}`,
        code: "FORBIDDEN",
      });
      continue;
    }

    const validation = validateFieldValue(field, value, character);
    if (!validation.valid) {
      errors.push({ field, error: validation.error, code: "VALIDATION" });
      continue;
    }

    if (operation === "increment" && field === "abilities") {
      // const requiredXP = calculateXPForNextRank(character);
      // if (value < requiredXP) {
      //   errors.push({
      //     field,
      //     error: `Need ${requiredXP} XP for the next rank`,
      //     code: `BUSINESS_RULE`,
      //   });
      //   continue;
      // }
    }
    validUpdates.push(update);
  }

  return { validUpdates, errors };
}
