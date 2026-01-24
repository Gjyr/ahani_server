import { renderCharacter } from "../templates/character.mjs";
import { getCharacter } from "../index.mjs";

export async function renderCharacterView(req, res, characterId) {
  const character = await getCharacter(characterId);
  const html = renderCharacter(character);

  res.writeHead(200, {
    "Content-Type": "text/html",
    "Content-Length": Buffer.byteLength(html),
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
  });
  res.end(html);

  return true;
}
