import { generateId, generateBackupCode } from "./utils.mjs";
import { createDefaultCharacter, validateCharacterData } from "./schema.mjs";
import * as storage from "./storage.mjs";

async function createCharacter(playerId, characterData) {
  validateCharacterData(characterData);

  const defaultCharacter = createDefaultCharacter(
    playerId,
    characterData.characterName,
    characterData.player || "Unknown"
  );

  const character = {
    ...defaultCharacter,
    ...characterData,
    id: generateId(),
    backupCode: generateBackupCode(),
    playerId,
  };

  return await storage.saveCharacter(character);
}

async function getCharacter(id) {
  return await storage.getCharacter(id);
}

async function getPlayerCharacters(playerId) {
  return await storage.getCharactersByPlayer(playerId);
}

async function recoverCharacter(characterName, backupCode) {
  return await storage.findCharacterByNameAndCode(characterName, backupCode);
}

async function getAllCharacters() {
  return await storage.getAllCharacters();
}

async function updateCharacter(id, updates) {
  const existing = await storage.getCharacter(id);
  if (!existing) throw new Error("Character not found");

  const updated = deepMerge(existing, updates);
  updated.lastModified = new Date().toISOString();

  return await storage.saveCharacter(updated);
}

function deepMerge(target, source) {
  const output = { ...target };

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          output[key] = source[key];
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        output[key] = source[key];
      }
    });
  }

  return output;
}

function isObject(item) {
  return item && typeof item === "object" && !Array.isArray(item);
}

export {
  createCharacter,
  getCharacter,
  getPlayerCharacters,
  recoverCharacter,
  getAllCharacters,
  updateCharacter,
};
