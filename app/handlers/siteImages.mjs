import fs from "node:fs";
import path from "node:path";
import { PUBLIC_PATH } from "#config";

const BASE_TRP_DIR = path.join(PUBLIC_PATH, "/assets/images/trp");

export async function serveSiteImages(imageName, res) {
  try {
    if (!/^[a-zA-Z0-9\-]+$/.test(imageName)) {
      res.writeHead(400);
      res.end("Invalid image name");
      return;
    }

    const imagePath = path.join(BASE_TRP_DIR, `${imageName}main.webp`);
    if (!imagePath.startsWith(BASE_TRP_DIR)) {
      res.writeHead(400);
      res.end("Invalid image path");
      return;
    }

    try {
      await fs.promises.access(imagePath, fs.constants.R_OK);
    } catch {
      res.writeHead(404);
      res.end("Image not found");
      return;
    }

    const stream = fs.createReadStream(imagePath);
    res.setHeader("Content-Type", "image/webp");
    res.setHeader("Cache-Control", "public, max-age=31536000");

    stream.pipe(res);
  } catch (error) {
    console.error("My image serve error:", error);
    res.writeHead(500);
    res.end("Server error");
  }
}
