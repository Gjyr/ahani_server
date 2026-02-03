import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ENCODING, SERVER_PATH } from "#config";
import { deepEqual } from "node:assert";
import { deletePortrait } from "./fileUploader.mjs";

const BASE_DIR = path.join(SERVER_PATH, "libraries", "nagara");
const LIVE_DATA_DIR = path.join(BASE_DIR, "data", "characters");
const INDEX_FILE = path.join(BASE_DIR, "data", "index.json");
const ALIAS_FILE = path.join(BASE_DIR, "data", "aliases.json");
const BACKUP_ROOT_DIR = path.join(BASE_DIR, "data", "backups");
const BACKUP_CHAR_DIR = path.join(BACKUP_ROOT_DIR, "characters");
const BACKUP_INDEX = path.join(BACKUP_ROOT_DIR, "index.json");

(async function ensureDirectories() {
  try {
    await fs.mkdir(LIVE_DATA_DIR, { recursive: true });
  } catch (error) {
    console.error("Failed to create data directory:", error);

    if (error.code === "MODULE_NOT_FOUND") {
      const fallbackDir = path.join(
        process.cwd(),
        "libraries",
        "nagara",
        "data",
      );
      LIVE_DATA_DIR = path.join(fallbackDir, "characters");
      INDEX_FILE = path.join(fallbackDir, "index.json");
      await fs.mkdir(LIVE_DATA_DIR, { recursive: true });
    } else {
      throw error;
    }
  }
})();

async function ensureBackupDirs() {
  const fs = await import("fs/promises");
  await fs.mkdir(BACKUP_CHAR_DIR, { recursive: true });
}

async function createAlias(characterId, alias) {
  // TODO
}

async function resolveAlias(alias) {
  // TODO
}

await fs.mkdir(LIVE_DATA_DIR, { recursive: true });

let characterIndex = {};

try {
  const indexData = await fs.readFile(INDEX_FILE, ENCODING);
  characterIndex = JSON.parse(indexData);
} catch {
  characterIndex = {
    byId: {},
    byBackupCode: {},
    byPlayer: {},
    all: [],
  };

  await saveIndex();
}

async function saveIndex() {
  await fs.writeFile(INDEX_FILE, JSON.stringify(characterIndex, null, 2));
}

async function saveCharacter(character) {
  const filename = path.join(LIVE_DATA_DIR, `${character.id}.json`);

  characterIndex.byId[character.id] = {
    name: character.characterName,
    playerId: character.playerId,
    backupCode: character.backupCode,
    created: character.created,
  };

  characterIndex.byBackupCode[character.backupCode] = character.id;

  if (!characterIndex.byPlayer[character.playerId]) {
    characterIndex.byPlayer[character.playerId] = [];
  }
  if (!characterIndex.byPlayer[character.playerId].includes(character.id)) {
    characterIndex.byPlayer[character.playerId].push(character.id);
  }

  if (!characterIndex.all.includes(character.id)) {
    characterIndex.all.push(character.id);
  }

  await fs.writeFile(filename, JSON.stringify(character, null, 2));
  await saveIndex();

  return character;
}

async function getCharacter(id) {
  try {
    const filename = path.join(LIVE_DATA_DIR, `${id}.json`);
    const data = await fs.readFile(filename, ENCODING);
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function getCharactersByPlayer(playerId) {
  const charIds = characterIndex.byPlayer[playerId] || [];
  const characters = [];

  for (const id of charIds) {
    const char = await getCharacter(id);
    if (char && !char.deleted) characters.push(char);
  }

  return characters;
}

async function findCharacterByNameAndCode(name, backupCode) {
  const charId = characterIndex.byBackupCode[backupCode];
  if (!charId) return null;

  const char = await getCharacter(charId);
  if (char && char.characterName.toLowerCase() === name.toLowerCase()) {
    return char;
  }
  return null;
}

async function getAllCharacters() {
  const characters = [];
  for (const id of characterIndex.all) {
    const char = await getCharacter(id);
    if (char) characters.push(char);
  }
  return characters;
}

async function markCharacterAsDeleted(characterId) {
  if (characterIndex.byId[characterId]) {
    characterIndex.byId[characterId].deleted = true;
    characterIndex.byId[characterId].deletedAt = new Date().toISOString();
    await saveIndex();
  }
}

async function hardDeleteCharacter(characterId) {
  try {
    const charInfo = characterIndex.byId[characterId];

    try {
      await deletePortrait(characterId);
    } catch (portraitError) {
      console.warn(
        `Portrait deletionfailed for ${characterId}:`,
        portraitError.message,
      );
    }

    const filename = path.join(LIVE_DATA_DIR, `${characterId}.json`);
    await fs.unlink(filename);

    if (charInfo) {
      delete characterIndex.byId[characterId];

      delete characterIndex.byBackupCode[charInfo.backupCode];

      if (characterIndex.byPlayer[charInfo.playerId]) {
        characterIndex.byPlayer[charInfo.playerId] = characterIndex.byPlayer[
          charInfo.playerId
        ].filter((id) => id !== characterId);

        if (characterIndex.byPlayer[charInfo.playerId].length === 0) {
          delete characterIndex.byPlayer[charInfo.playerId];
        }
      }

      characterIndex.all = characterIndex.all.filter(
        (id) => id !== characterId,
      );

      await saveIndex();
    }

    return true;
  } catch (error) {
    console.log("Hard delete failed:", error);
    throw new Error("Failed to delete character");
  }
}

export {
  saveCharacter,
  getCharacter,
  getCharactersByPlayer,
  findCharacterByNameAndCode,
  getAllCharacters,
  createAlias,
  resolveAlias,
  ensureBackupDirs,
  LIVE_DATA_DIR,
  BACKUP_CHAR_DIR,
  BACKUP_INDEX,
  markCharacterAsDeleted,
  hardDeleteCharacter,
};
