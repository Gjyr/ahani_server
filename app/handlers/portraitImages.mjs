import fs from "node:fs";
import path from "node:path";

import { MIME_TYPES, SERVER_PATH } from "#config";

const PORTRAITS_BASE_DIR = path.join(
  SERVER_PATH,
  "libraries",
  "nagara",
  "data",
  "uploads",
  "portraits",
);

export async function servePortraitImages(requestPath, res) {
  try {
    const relativePath = requestPath.replace("/uploads/portraits/", "");

    if (
      relativePath.includes("..") ||
      relativePath.includes("/..") ||
      relativePath.includes("../")
    ) {
      res.writeHead(400);
      res.end("Invalid path");
      return;
    }

    const fullPath = path.join(PORTRAITS_BASE_DIR, relativePath);

    try {
      await fs.promises.access(fullPath, fs.constants.R_OK);
    } catch {
      res.writeHead(404);
      res.end("Image not found");
      return;
    }

    const stats = await fs.promises.stat(fullPath);
    const ext = path.extname(fullPath).toLowerCase().slice(1);
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", stats.size);

    const stream = fs.createReadStream(fullPath);
    stream.pipe(res);

    stream.on("error", (error) => {
      console.error("Portrait stream error:", error);

      if (!res.headersSent) {
        res.writeHead(500);
        res.end("Server error");
      }
    });
  } catch (error) {
    console.error("Portrait serve error:", error);

    if (!res.headersSent) {
      res.writeHead(500);
      res.end("Server error");
    }
  }
}
