import { getCharacter } from "../storage.mjs";
import { validateDmToken } from "../auth.mjs";
import { extractCharacterIdFromPath } from "./middleware.mjs";

export async function withCharacterPermissions(req, res, path, next) {
  const characterId = extractCharacterIdFromPath(path);

  const character = await getCharacter(characterId);

  if (!character) {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Character not found" }));
    return;
  }

  const dmToken = req.headers["x-dm-id"];
  const isDM = dmToken && validateDmToken(dmToken);

  if (character.deleted && !isDM) {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Character not found" }));
    return;
  }

  const playerId = req.headers["x-player-id"];
  const isOwner = character.playerId === playerId;

  req.characterPermissions = {
    role: isDM ? "dm" : isOwner ? "owner" : "public",
  };

  req.character = character;

  next();
}
