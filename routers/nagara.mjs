import fs from "node:fs/promises";
import path from "node:path";
import { MIME_TYPES, PUBLIC_PATH } from "#config";
import { requireDmToken } from "../libraries/nagara/auth.mjs";
import * as nagara from "../libraries/nagara/index.mjs";
import * as backup from "../libraries/nagara/backup.mjs";

import {
  handleGetCharacters,
  handleGetAbilities,
  handleUploadPortrait,
  handleUpdateCharacter,
} from "../libraries/nagara/handlers/index.mjs";
import {
  renderDashboardView,
  renderInitialView,
  renderCreationView,
  renderCharacterView,
} from "../libraries/nagara/renderers/index.mjs";
import { generateHumanReadableId } from "../libraries/nagara/utils.mjs";

const FRONTEND_DIR = path.join(PUBLIC_PATH, "public", "nagara", "c");

async function nagaraRout(req, res, url) {
  const { pathname } = url;

  const isApiRequest = pathname.startsWith("/api/v1/nagara");
  const isFrontendRequest = pathname.startsWith("/nagara/c");

  if (!isApiRequest && !isFrontendRequest) return false;

  if (isFrontendRequest) {
    try {
      let filePath = pathname.substring("/nagara/c".length);
      if (filePath === "" || filePath === "/") filePath = "/index.html";

      const normalizedPath = path
        .normalize(filePath)
        .replace(/^(\.\.[\/\\])+/, "");
      const fullPath = path.join(FRONTEND_DIR, normalizedPath);

      const stat = await fs.stat(fullPath);
      if (!stat.isFile()) throw new Error("Not a file");

      const ext = path.extname(fullPath).slice(1);
      const mimeType = MIME_TYPES[ext];

      res.setHeader("Content-Type", mimeType);
      const content = await fs.readFile(fullPath);
      res.writeHead(200);
      res.end(content);
    } catch (error) {
      try {
        const indexPath = path.join(FRONTEND_DIR, "index.html");
        const content = await fs.readFile(indexPath);
        res.setHeader("Content-Type", "text/html");
        res.writeHead(200);
        res.end(content);
      } catch {
        res.writeHead(404);
        res.end("Not found");
      }
    }

    return true;
  }

  if (isApiRequest) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, x-player-id, x-dm-id",
    );

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return true;
    }

    const pathParts = pathname
      .replace("/api/v1/nagara", "")
      .split("/")
      .filter(Boolean);

    try {
      if (
        // GET /api/v1/nagara/characters -- Get characters for me
        req.method === "GET" &&
        pathParts[0] === "characters" &&
        !pathParts[1]
      ) {
        return await handleGetCharacters(req, res, url);
      }

      if (req.method === "GET" && pathParts[0] === "abilities") {
        // GET /api/v1/nagara/abilities
        return await handleGetAbilities(req, res);
      }

      if (
        // POST /api/v1/nagara/characters/:chaarcterId/portrait
        req.method === "POST" &&
        pathParts[0] === "characters" &&
        pathParts[1] &&
        pathParts[2] === "portrait"
      ) {
        const characterId = pathParts[1];
        return await handleUploadPortrait(req, res, characterId);
      }

      if (
        // GET /api/v1/nagara/view/dashboard
        req.method === "GET" &&
        pathParts[0] === "view" &&
        pathParts[1] === "dashboard"
      ) {
        // @TODO: refactor into handler
        return await renderDashboardView(req, res);
      }

      if (
        // GET /api/v1/nagara/view/initial
        req.method === "GET" &&
        pathParts[0] === "view" &&
        pathParts[1] === "initial"
      ) {
        return await renderInitialView(req, res);
      }

      if (
        // GET /api/v1/nagara/view/creation
        req.method === "GET" &&
        pathParts[0] === "view" &&
        pathParts[1] === "creation"
      ) {
        return await renderCreationView(req, res);
      }

      if (
        // GET /api/v1/nagara/view/character/:id
        req.method === "GET" &&
        pathParts[0] === "view" &&
        pathParts[1] === "character" &&
        pathParts[2]
      ) {
        return await renderCharacterView(req, res, pathParts[2]);
      }

      if (
        // GET /api/v1/nagara/characters/:id -- Get specific character
        req.method === "GET" &&
        pathParts[0] === "characters" &&
        pathParts[1]
      ) {
        const character = await nagara.getCharacter(pathParts[1]);
        if (character) {
          res.writeHead(200);
          res.end(JSON.stringify(character));
        } else {
          res.writeHead(404);
          res.end(JSON.stringify({ error: "Character not found" }));
        }
        return true;
      }

      if (
        req.method === "PATCH" &&
        pathParts[0] === "character" &&
        pathParts[1]
      ) {
        return await handleUpdateCharacter(req, res, pathParts[1]);
      }

      if (
        // DELETE /api/v1/nagara/characters/:id -- Get specific character
        req.method === "DELETE" &&
        pathParts[0] === "characters" &&
        pathParts[1]
      ) {
        const characterId = pathParts[1];

        try {
          const dmToken = req.headers["x-dm-id"];
          const playerId = req.headers["x-player-id"];

          if (!dmToken && !playerId) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: "Authorization required" }));
            return true;
          }

          let result;
          if (dmToken) {
            result = await nagara.deleteCharacterAsDM(characterId, dmToken);
          } else {
            result = await nagara.deleteCharacterAsPlayer(
              characterId,
              playerId,
            );
          }

          if (result.success) {
            res.writeHead(200);
            res.end(
              JSON.stringify({
                message: "Character deleted",
                type: result.type,
              }),
            );
          } else {
            res.writeHead(result.statusCode || 404);
            res.end(JSON.stringify({ error: result.error }));
          }
        } catch (error) {
          console.error("DELETE error:", error);
          res.writeHead(500);
          res.end(JSON.stringify({ error: "Internal server error" }));
        }

        return true;
      }

      if (req.method === "POST" && pathParts[0] === "characters") {
        // POST /api/v1/nagara/characters -- Create new character
        //@TODO: its own module

        let body = "";
        req.on("data", (chunk) => (body += chunk));

        req.on("end", async () => {
          try {
            const data = JSON.parse(body);
            let playerId = data.playerId || req.headers["x-player-id"];

            if (!playerId) {
              // res.writeHead(400);
              // res.end(JSON.stringify({ error: "Player ID required" }));
              // return;

              playerId = generateHumanReadableId();
            }

            const character = await nagara.createCharacter(playerId, data);
            res.writeHead(201);
            res.end(JSON.stringify(character));
          } catch (error) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: error.message }));
          }
        });
        return true;
      }

      if (req.method === "POST" && pathParts[0] === "recover") {
        // POST /api/v1/nagara/recover -- Recover character
        let body = "";
        req.on("data", (chunk) => (body += chunk));

        req.on("end", async () => {
          try {
            const { characterName, backupCode } = JSON.parse(body);
            const character = await nagara.recoverCharacter(
              characterName,
              backupCode,
            );

            if (character) {
              res.writeHead(200);
              res.end(JSON.stringify(character));
            } else {
              res.writeHead(404);
              res.end(
                JSON.stringify({
                  error: "Character not found or invalid backup code",
                }),
              );
            }
          } catch (error) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: error.message }));
          }
        });
        return true;
      }

      if (req.method === "GET" && pathParts[0] === "config") {
        res.writeHead(200);
        res.end(
          JSON.stringify({
            apiBase: "/api/v1/nagara",
            maxFileSize: 10485760, // 10MB?
            allowedImageTypes: [
              MIME_TYPES["jpeg"],
              MIME_TYPES["png"],
              MIME_TYPES["gif"],
              MIME_TYPES["webp"],
            ],
          }),
        );
        return true;
      }

      if (
        // POST /api/v1/nagara/backups/characters/:id -- Backup a character
        req.method === "POST" &&
        pathParts[0] === "backups" &&
        pathParts[1] === "characters" &&
        pathParts[2]
      ) {
        const characterId = pathParts[2];
        requireDmToken(req);

        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", async () => {
          try {
            const { note } = JSON.parse(body || "{}");
            const backupRecord = await backup.createCharacterBackup(
              characterId,
              note,
            );
            res.writeHead(201, { "Content-Type": "application/json" });
            res.end(JSON.stringify(backupRecord));
          } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
          }
        });
        return true;
      }

      // GET /api/v1/nagara/backups/characters[/:id] -- list backups
      if (
        req.method === "GET" &&
        pathParts[0] === "backups" &&
        pathParts[1] === "characters"
      ) {
        requireDmToken(req);
        const characterId = pathParts[2]; // might be undefined
        try {
          const backupList = await backup.listCharacterBackups(characterId);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(backupList));
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: error.message }));
        }
        return true;
      }

      if (
        // POST /api/v1/nagara/backups/restore -- restore character from a backup
        req.method === "POST" &&
        pathParts[0] === "backups" &&
        pathParts[1] === "restore"
      ) {
        requireDmToken(req);
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", async () => {
          try {
            const { backupId } = JSON.parse(body);
            if (!backupId) throw new Error("Missing backupId");
            const result = await backup.restoreCharacterBackup(backupId);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(result));
          } catch (error) {
            res.writeHead(400); // or 404 if not found
            res.end(JSON.stringify({ error: error.message }));
          }
        });
        return true;
      }

      // not found
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Not found" }));
    } catch (error) {
      console.error("Nagara API error:", error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: "Internal server error" }));
    }

    return true;
  }

  return false;
}

export default nagaraRout;
