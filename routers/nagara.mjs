import * as nagara from "../libraries/nagara/index.mjs";
import { MIME_TYPES } from "#config";

async function nagaraRout(req, res, url) {
  const { pathname } = url;

  const pathParts = pathname
    .replace("/api/v1/nagara", "")
    .split("/")
    .filter(Boolean);

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", MIME_TYPES.json);

  try {
    // Route: GET /api/v1/nagara/characters - Get characters for player
    if (
      req.method === "GET" &&
      pathParts[0] === "characters" &&
      !pathParts[1]
    ) {
      const playerId = url.searchParams.get("playerId");

      if (!playerId) {
        // DM access - check for DM token (we'll implement later)
        const dmToken = req.headers["x-dm-token"];
        if (dmToken === process.env.DM_TOKEN) {
          const allChars = await nagara.getAllCharacters();
          res.writeHead(200);
          res.end(JSON.stringify(allChars));
        } else {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "Player ID or DM token required" }));
        }
      } else {
        const characters = await nagara.getPlayerCharacters(playerId);
        res.writeHead(200);
        res.end(JSON.stringify(characters));
      }
      return;
    }

    // Route: GET /api/v1/nagara/characters/:id - Get specific character
    if (req.method === "GET" && pathParts[0] === "characters" && pathParts[1]) {
      const character = await nagara.getCharacter(pathParts[1]);
      if (character) {
        res.writeHead(200);
        res.end(JSON.stringify(character));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Character not found" }));
      }
      return;
    }

    // Route: POST /api/v1/nagara/characters - Create new character
    if (req.method === "POST" && pathParts[0] === "characters") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));

      req.on("end", async () => {
        try {
          const data = JSON.parse(body);
          const playerId = data.playerId || req.headers["x-player-id"];

          if (!playerId) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: "Player ID required" }));
            return;
          }

          const character = await nagara.createCharacter(playerId, data);
          res.writeHead(201);
          res.end(JSON.stringify(character));
        } catch (error) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: error.message }));
        }
      });
      return;
    }

    // Route: POST /api/v1/nagara/recover - Recover character
    if (req.method === "POST" && pathParts[0] === "recover") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));

      req.on("end", async () => {
        try {
          const { characterName, backupCode } = JSON.parse(body);
          const character = await nagara.recoverCharacter(
            characterName,
            backupCode
          );

          if (character) {
            res.writeHead(200);
            res.end(JSON.stringify(character));
          } else {
            res.writeHead(404);
            res.end(
              JSON.stringify({
                error: "Character not found or invalid backup code",
              })
            );
          }
        } catch (error) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: error.message }));
        }
      });
      return;
    }

    // Route not found
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
  } catch (error) {
    console.error("Nagara route error:", error);
    res.writeHead(500);
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}

export default nagaraRout;
