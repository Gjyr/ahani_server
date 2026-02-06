import { getCharacter, saveCharacter } from "../storage.mjs";

export async function handleUpdateCharacter(req, res, characterId) {
  const playerId = req.header["x-player-id"];
  const isDM = req.headers["x-dm-token"] === process.env.DM_TOKEN;

  if (!playerId && !isDM) {
    res.writeHead(403);
    res.end(JSON.stringify({ error: "Player ID or DM token required" }));
  }

  let body = "";
  req.on("data", (chunk) => (body += chunk));

  req.on("end", async () => {
    try {
      const patchData = JSON.parse(body);
      const character = await getCharacter(characterId);

      if (!character) {
        res.writeHead(404);
        return res.end(JSON.stringify({ error: "Character not found" }));
      }

      if (character.playerId !== playerId && !isDM) {
        res.writeHead(403);
        return res.end(JSON.stringify({ error: "Not authorized " }));
      }

      const results = [];
      const errors = [];

      for (const update of patchData.updates) {
        try {
          if (
            !canUserEditField({ id: playerId, idDM }, character, update.field)
          ) {
            throw new Error(`Cannot edit field: ${update.field}`);
          }

          const validation = validateFieldUpdate(
            update.field,
            update.value,
            character,
          );

          if (!validation.valid) {
            throw new Error(validation.message);
          }

          applyFieldUpdate(character, update.field, update.value);

          results.push({
            field: update.field,
            success: true,
            newvalue: update.value,
          });
        } catch (error) {
          errors.push({
            field: update.field,
            error: error.message,
          });
        }
      }

      if (errors.length > 0) {
        res.writeHead(422);
        return res.end(
          JSON.stringify({
            error: "Some updates failed",
            results,
            errors,
          }),
        );
      }

      character.lastModified = new Date().toISOString();
      await saveCharacter(character);

      res.writeHead(200);
      res.end(
        JSON.stringify({
          success: true,
          character,
          updates: results,
        }),
      );
    } catch (error) {
      console.error("PATCH error:", error);
      res.writeHead(400);
      res.end(JSON.stringify({ error: error.message }));
    }
  });
}
