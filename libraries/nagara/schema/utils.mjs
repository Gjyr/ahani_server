import { CHARACTER_SCHEMA } from "./character.mjs";
import { setNestedValue, getNestedValue } from "./traversal.mjs";
import { SERVER_CONTROLLED_FIELDS } from "./validation.mjs";

export function canAccessField(fieldPath, userRole, operation = "read") {
  const fieldSchema = getFieldSchema(fieldPath);
  if (!fieldSchema) return false;

  const perm = fieldSchema.permissions?.[userRole];
  if (perm === undefined) return false;

  return operation === "write" ? perm === true : perm !== false;
}

export function validateFieldValue(fieldPath, value, allData = {}) {
  const schema = getFieldSchema(fieldPath);
  if (!schema) return { valid: false, error: `Unknown field: ${fieldPath}` };

  if (schema.type && typeof value !== schema.type) {
    if (!(schema.type === "array" && Array.isArray(value))) {
      return {
        valid: false,
        error: `Expected ${schema.type}, got ${typeof value}`,
      };
    }
  }

  if (schema.type === "number") {
    if (schema.min !== undefined && value < schema.min) {
      return { valid: false, error: `Minimum value is ${schema.min}` };
    }

    if (schema.max !== undefined && value > schema.max) {
      return { valid: false, error: `Maximum value is ${schema.max}` };
    }

    if (schema.integer && !Number.isInteger(value)) {
      return { valid: false, error: "Must be an integer " };
    }
  }

  if (schema.type === "string") {
    if (schema.minLength && value.length < schema.minLength) {
      return { valid: false, error: `Minimum length is ${schema.minLength}` };
    }

    if (schema.maxLength && value.length > schema.maxLength) {
      return { valid: false, error: `Maximum length is ${schema.maxLength}` };
    }

    if (schema.pattern && !schema.pattern.test(value)) {
      return { valid: false, error: schema.error || "Invalid format" };
    }
  }

  if (schema.validate) {
    const result = schema.validate(value, allData);

    if (result !== true) {
      return { valid: false, error: result };
    }
  }

  return { valid: true };
}

export function generateDefaultCharacter(playerId, playerName = "Unknown") {
  const defaults = {};

  function traverse(schema, path = "") {
    for (const [key, fieldSchema] of Object.entries(schema)) {
      if (key.startsWith("_")) continue;

      const fullPath = path ? `${path}.${key}` : key;

      if (SERVER_CONTROLLED_FIELDS.includes(fullPath)) {
        // console.warn(
        //   "DEBUG: server controlled path was skipped during default character generation",
        //   fullPath,
        // );
        console;
      }

      if (fieldSchema.default !== undefined) {
        setNestedValue(defaults, fullPath, fieldSchema.default);
      } else if (fieldSchema.type === "object") {
        traverse(fieldSchema, fullPath);
        //   } else if (fieldSchema.type === "array") {
        //     setNestedValue(defaults, fullPath, fieldSchema);
      }
    }
  }

  traverse(CHARACTER_SCHEMA);

  defaults.playerId = playerId;
  defaults.player = playerName;
  defaults.created = new Date().toISOString();
  defaults.lastModified = new Date().toISOString();

  return defaults;
}

export function getFieldSchema(fieldPath) {
  const parts = fieldPath.split(".");
  let current = CHARACTER_SCHEMA;

  for (const part of parts) {
    if (current[part] && typeof current[part] === "object") {
      current = current[part];
    } else {
      return null;
    }
  }

  const { primary, secondary, ...schema } = current;
  return schema;
}

export function _getFieldSchema(fieldPath, schema = CHARACTER_SCHEMA) {
  const parts = fieldPath.split(".");
  let current = schema;

  for (const part of parts) {
    if (current.type) return current;

    if (current[part]) {
      current = current[part];
    } else {
      for (const key in (current = {})) {
        if (current[key] && current[key].type === "object") {
          const nested = getFieldSchema(part, current[key]);

          if (nested) {
            current = nested;
            break;
          }
        }
      }

      if (current === schema) {
        return null;
      }
    }
  }

  const { primary, secondary, ...rest } = current;
  return rest.type ? rest : null;
}

export function checkRequiredFields(
  data,
  errors,
  requiredPaths,
  serverControlledFields,
) {
  for (const fieldPath of requiredPaths) {
    if (serverControlledFields.includes(fieldPath)) {
      continue;
    }

    const value = getNestedValue(data, fieldPath);
    // const schema = getFieldSchema(fieldPath);

    const isEmpty =
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "") ||
      (Array.isArray(value) && value.length === 0);

    if (isEmpty) {
      errors.push({
        field: fieldPath,
        error: `Required field "${fieldPath}" is missing`,
        code: "REQUIRED",
      });
    }
  }
}

export function checkServerControlledField(
  fieldPath,
  warnings,
  serverControlledPaths,
) {
  if (serverControlledPaths.includes(fieldPath)) {
    warnings.push({
      field: fieldPath,
      message: `Field "${fieldPath}" is server-controlled and will be ignored`,
    });

    return true;
  }

  return false;
}

export function validateCrossFieldRules(characterData, fieldsWithValidation) {
  const errors = [];

  for (const fieldPath of fieldsWithValidation) {
    const schema = getFieldSchema(fieldPath);

    if (schema.validate) {
      const value = getNestedValue(characterData, fieldPath);
      const result = schema.validate(value, characterData);

      if (result !== true) {
        errors.push({
          field: fieldPath,
          error: result || schema.message,
          code: "CROSS_FIELD_VALIDATION",
        });
      }
    }
  }

  return errors;
}

export function validateRPGRules(characterData) {
  const errors = [];

  if (characterData.experience?.unspent < 0) {
    errors.push({
      field: "experience.total",
      error: "Can't have negative experience",
      code: "BUSINESS_RULE",
    });
  }

  if (characterData.attributes?.primary) {
    const primaryTotal = Object.values(characterData.attributes.primary).reduce(
      (sum, val) => sum + (val || 0),
      0,
    );

    if (primaryTotal > 80) {
      errors.push({
        field: "attributes.primary",
        error: `Total primary attributes (${primaryTotal}) exceed budget of 80`,
        code: "BUSINESS_RULE",
      });
    }
  }

  return errors;
}
