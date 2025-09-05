import fs from "node:fs";
import path from "node:path";
import { MIME_TYPES, PUBLIC_PATH } from "#config";
import { logEvent, getEvents } from "#logger";

function isChrome(headers) {
  const agentString = headers["sec-ch-ua"] || null;

  return agentString && agentString.includes("Chromium");
}

function isDesktop(headers) {
  const mobileFlag =
    headers["sec-ch-ua-mobile"] && headers["sec-ch-ua-mobile"] === "?0";

  return mobileFlag;
}

async function isFound(filePath) {
  const pathTraversal = !filePath.startsWith(PUBLIC_PATH);
  const exists = await fs.promises.access(filePath).then(
    () => true,
    () => false
  );

  return !pathTraversal && exists;
}

function setHeaders(res, mimeType, found) {
  const statusCode = !found ? 404 : mimeType === "audio/mpeg" ? 206 : 200;

  if (mimeType === "audio/mpeg") {
    res.writeHead(statusCode, {
      "Content-Type": mimeType,
      "Accept-Ranges": "bytes",
      "Content-Length": "6379464",
      "Content-Range": "bytes 0-6379463/6379464",
    });
  } else {
    res.writeHead(statusCode, { "Content-Type": mimeType });
  }
}

async function prepareFile(url, isUnsupported) {
  const paths = [PUBLIC_PATH, url];

  if (url.endsWith("/") && isUnsupported) paths.push("/public/browser.html");
  else if (url.endsWith("/")) paths.push("index.html");

  const filePath = path.join(...paths);

  const found = await isFound(filePath);
  const streamPath = found ? filePath : `${PUBLIC_PATH}/public/404.html`;

  const ext = path.extname(streamPath).substring(1).toLowerCase();

  const stream = fs.createReadStream(streamPath);

  return { found, ext, stream };
}

// TODO: default route
async function serveSiteFiles(req, res) {
  let isUnsupported = true;

  if (req.url === "/")
    isUnsupported = !isChrome(req.headers) || !isDesktop(req.headers);

  const file = await prepareFile(req.url, isUnsupported);
  const mimeType = MIME_TYPES[file.ext] || MIME_TYPES.default;

  setHeaders(res, mimeType, file.found);

  file.stream.pipe(res);
}

// TODO: hold route
async function serveImages(imagePath, res) {
  fs.readFile(
    `${PUBLIC_PATH}\\assets\\images\\trp\\${imagePath}main.webp`,
    (err, content) => {
      res.writeHead(200, {
        "Content-Type": "image/webp",
      });
      res.end(content);
    }
  );
}

// TODO: move to routs
async function loggerRout(req, res, url) {
  if (req.method === "POST") await logEvent(req, res);
  else if (req.method === "GET") await getEvents(req, res, url);
  else {
    res.statusCode = 400;
    res.setHeader("Content-Type", MIME_TYPES.plain);
    res.end(`Unsupported request`);
  }
}

export { serveSiteFiles, serveImages, loggerRout };
