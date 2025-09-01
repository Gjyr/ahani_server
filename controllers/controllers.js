import fs from "node:fs";
import path from "node:path";
import { MIME_TYPES, PUBLIC_PATH } from "../config.js";

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

async function serveSiteFiles(req, res) {
  let isUnsupported = true;

  if (req.url === "/")
    isUnsupported = !isChrome(req.headers) || !isDesktop(req.headers);

  const file = await prepareFile(req.url, isUnsupported);
  const mimeType = MIME_TYPES[file.ext] || MIME_TYPES.default;

  setHeaders(res, mimeType, file.found);

  file.stream.pipe(res);
}

async function serveImages(imagePath, res) {
  fs.readFile(
    `${PUBLIC_PATH}/assets/images/trp/${imagePath}main.webp`,
    (err, content) => {
      res.writeHead(200, {
        "Content-Type": "image/webp",
      });
      res.end(content);
    }
  );
}

async function logEvent(req, res) {
  if (req.method === "POST") {
    const bodyChunks = [];

    req.on("data", (chunk) => bodyChunks.push(chunk));
    req.on("end", () => {
      const body = Buffer.concat(bodyChunks);

      if (req.headers["content-type"] === MIME_TYPES.json) {
        try {
          const data = JSON.parse(body);

          res.statusCode = 200;
          res.setHeader("Content-Type", MIME_TYPES.json);
          res.end(JSON.stringify({ message: "Event captured!", data }));
        } catch (serverError) {
          res.statusCode = 400;
          res.setHeader("Content-Type", MIME_TYPES.plain);
          return res.end(
            `Something went wrong while trying to log event: ${serverError.name}: ${serverError.message},\n ${serverError.stack}`
          );
        }
      } else {
        // Raw body handling
        res.statusCode = 200;
        res.setHeader("Content-Type", MIME_TYPES.plain);
        res.end(`Received raw body: ${body}`);
      }
    });
  } else {
    // not POST handling
    res.statusCode = 200;
    res.setHeader("Content-Type", MIME_TYPES.plain);
    res.end("Expected a POST request at this endpoint with body set");
  }
}

export { serveSiteFiles, serveImages, logEvent };
