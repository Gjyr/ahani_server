import { readFileSync } from "node:fs";
import { join, sep } from "node:path";

const PORT = 443;
const SEPARATOR = process.env.NODE_ENV === "development" ? "" : "/";
const LOCAL_ADDRESS = "0.0.0.0";
const SERVER_PATH =
  process.env.NODE_ENV === "development" ? process.cwd() : "/srv/server";
const LOG_FILE_PATH = join(SEPARATOR, SERVER_PATH, "/logs/server.log");
const PUBLIC_PATH = join(
  SEPARATOR,
  ...SERVER_PATH.split(sep).slice(0, -1),
  "/ahani"
);

const MIME_TYPES = {
  default: "application/octet-stream",
  plain: "text/plain",
  html: "text/html; charset=UTF-8",
  js: "text/javascript",
  mjs: "text/javascript",
  css: "text/css",
  png: "image/png",
  webp: "image/webp",
  ico: "image/x-icon",
  svg: "image/svg+xml",
  mp3: "audio/mpeg",
  ttf: "font/ttf",
  json: "application/json",
};

const SSL =
  process.env.NODE_ENV === "development"
    ? null
    : {
        key: readFileSync(join(SERVER_PATH, process.env.SSL_KEY)),
        cert: readFileSync(join(SERVER_PATH, process.env.SSL_CERT)),
      };

export { PORT, LOCAL_ADDRESS, MIME_TYPES, SSL, LOG_FILE_PATH, PUBLIC_PATH };
