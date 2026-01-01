import { generateId, generateBackupCode, validateCharacter } from "./utils.mjs";
import * as storage from "./storage.mjs";

async function createCharacter(playerId, characterData) {
  validateCharacter(characterData);

  const character = {
    id: generateId(),
    playerId,
    backupCode: generateBackupCode(),
    created: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    ...characterData,
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

  const updated = {
    ...existing,
    ...updates,
    lastModified: new Date().toISOString(),
  };

  return await storage.saveCharacter(updated);
}

export {
  createCharacter,
  getCharacter,
  getPlayerCharacters,
  recoverCharacter,
  getAllCharacters,
  updateCharacter,
};
