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
const ENCODING = "utf8";
const API_ROUTE = "/api/v1";

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
  gif: "image/gif",
  jpeg: "image/jpeg",
  mp3: "audio/mpeg",
  ttf: "font/ttf",
  json: "application/json",
  stream: "text/event-stream",
};

const LOG_LEVELS = {
  alert: "alert",
  error: "error",
  warning: "warning",
  info: "info",
};

const LEVEL_NUMBERS = {
  [LOG_LEVELS.alert]: 0,
  [LOG_LEVELS.error]: 1,
  [LOG_LEVELS.warning]: 2,
  [LOG_LEVELS.info]: 3,
};

const LOGGER_DEFAULT_CONFIG = {
  to: "toFile",
  format: JSON.stringify,
  level: "info",
};

const LOG_FORMAT = {
  date: () => new Date().toString(),
  temporal: () => `${new Date().getMonth()}-${new Date().getFullYear()}`,
  geography: (loader) => loader.remoteAddress,
  message: ({ message }) => message,
  name: ({ name }) => name,
  level: (levelNumber) =>
    LOG_LEVELS[Object.keys(LOG_LEVELS).at(levelNumber)]?.toUpperCase() ||
    "uncertain",
  newLine: () => "\n",
  delimiter: () => "|",
};

const SSL =
  process.env.NODE_ENV === "development"
    ? null
    : {
        key: readFileSync(join(SERVER_PATH, process.env.SSL_KEY)),
        cert: readFileSync(join(SERVER_PATH, process.env.SSL_CERT)),
      };

export {
  PORT,
  LOCAL_ADDRESS,
  MIME_TYPES,
  ENCODING,
  API_ROUTE,
  LOG_FORMAT,
  SSL,
  LOG_FILE_PATH,
  PUBLIC_PATH,
  SERVER_PATH,
  LEVEL_NUMBERS,
  LOGGER_DEFAULT_CONFIG,
};
