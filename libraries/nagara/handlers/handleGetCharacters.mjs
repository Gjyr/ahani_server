import * as nagara from "../index.mjs";

export async function handleGetCharacters(req, res, url) {
  const playerId = url.searchParams.get("playerId");
  console.log("from get characters: ", playerId);

  if (!playerId) {
    console.trace("no player id");
    // @TODO: disable dm handing
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
    // GET /api/v1/nagara/characters -- Get characters for player
    const characters = await nagara.getPlayerCharacters(playerId);
    res.writeHead(200);

    res.end(JSON.stringify(characters));
  }
  return true;
}
