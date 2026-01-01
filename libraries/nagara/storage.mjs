import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ENCODING, SERVER_PATH } from "#config";

const BASE_DIR = path.join(SERVER_PATH, "libraries", "nagara");
const DATA_DIR = path.join(BASE_DIR, "data", "characters");
const INDEX_FILE = path.join(BASE_DIR, "data", "index.json");
const ALIAS_FILE = path.join(BASE_DIR, "data", "aliases.json");

(async function ensureDirectories() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error("Failed to create data directory:", error);

    if (error.code === "MODULE_NOT_FOUND") {
      const fallbackDir = path.join(
        process.cwd(),
        "libraries",
        "nagara",
        "data"
      );
      DATA_DIR = path.join(fallbackDir, "characters");
      INDEX_FILE = path.join(fallbackDir, "index.json");
      await fs.mkdir(DATA_DIR, { recursive: true });
    } else {
      throw error;
    }
  }
})();

async function createAlias(characterId, alias) {
  // TODO
}

async function resolveAlias(alias) {
  // TODO
}

await fs.mkdir(DATA_DIR, { recursive: true });

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
  const filename = path.join(DATA_DIR, `${character.id}.json`);

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
    const filename = path.join(DATA_DIR, `${id}.json`);
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
    if (char) characters.push(char);
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

export {
  saveCharacter,
  getCharacter,
  getCharactersByPlayer,
  findCharacterByNameAndCode,
  getAllCharacters,
  createAlias,
  resolveAlias,
};
