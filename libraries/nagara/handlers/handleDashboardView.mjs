import { renderDashboard } from "../templates/dashboard.mjs";
import * as nagara from "../index.mjs";

export async function handleDashboardView(req, res, playerId) {
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

    if (!playerId) {
        res.writeHead(401, { 'Content-Type': 'text/html' });
        res.end('<div class="error">Unauthorized</div>');
        return true;
    } else {
        // GET /api/v1/nagara/characters -- Get characters for player

        const characters = await nagara.getPlayerCharacters(playerId);
        const html = renderDashboard(characters);

        res.writeHead(200);
        res.end(html);
    }
    return true;
}

