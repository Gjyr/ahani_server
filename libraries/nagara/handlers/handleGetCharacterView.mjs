import { renderCharacter } from "../templates/character.mjs";
import { sanitizeCharacterForRole } from "../schema/sanitization.mjs";

export async function handleGetCharacterView(req, res) {
  const character = req.character;

  if (!character) {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Character not found" }));
    return true;
  }

  const sanitizedCharacter = sanitizeCharacterForRole(
    character,
    req.characterPermissions.role,
  );

  const html = renderCharacter(sanitizedCharacter, req.characterPermissions);

  res.writeHead(200, {
    "Content-Type": "text/html",
    "Content-Length": Buffer.byteLength(html),
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
  });
  res.end(html);

  return true;
}
