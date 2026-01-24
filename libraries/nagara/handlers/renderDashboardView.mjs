import { renderDashboard } from "../templates/dashboard.mjs";
import * as nagara from "../index.mjs";

export async function renderDashboardView(req, res) {
  // if (!playerId) {
  //     res.writeHead(401, {
  //         'Content-Type': 'text/html',
  //         'Content-Length': Buffer.byteLength(unauthorizedTemplate())
  //     });
  //     res.end(unauthorizedTemplate());
  //     return true;
  // }

  // const isValid = await nagara.validatePlayerToken(playerId);
  // if (!isValid) {
  //     res.writeHead(403, { 'Content-Type': 'text/html' });
  //     res.end(forbiddenTemplate());
  //     return true;
  // }
  const playerId = req.headers["x-player-id"];

  if (!playerId) {
    res.writeHead(401, { "Content-Type": "text/html" });
    res.end('<div class="error">Unauthorized</div>');
    return true;
  } else {
    // GET /api/v1/nagara/characters -- Get characters for player

    const characters = await nagara.getPlayerCharacters(playerId);
    const html = renderDashboard(characters);

    res.writeHead(200, {
      "Content-Type": "text/html",
      "Content-Length": Buffer.byteLength(html),
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
    });
    res.end(html);
  }
  return true;
}
