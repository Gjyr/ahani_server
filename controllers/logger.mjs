import fs from "node:fs";
import readline from "node:readline/promises";
import {
  ENCODING,
  LEVEL_NUMBERS,
  LOG_FILE_PATH,
  LOG_FORMAT,
  MIME_TYPES,
  LOGGER_DEFAULT_CONFIG,
} from "#config";

const getLevelNumber = function (level) {
  return LEVEL_NUMBERS[level] ?? 9;
};

function formatMessage(data, client, config = LOG_FORMAT) {
  return `${config.temporal()} ${config.level(
    getLevelNumber(data.type)
  )} ${config.delimiter()} from ${config.geography(
    client
  )} on ${config.date()} Event: ${config.name(
    data.content
  )} -- ${config.message(data.content)} ${config.delimiter()}`;
}

const transports = {
  toFile: function () {
    return fs.appendFile;
  },

  toConsole: function () {},
};

async function logEvent(req, res) {
  const bodyChunks = [];

  req.on("data", (chunk) => bodyChunks.push(chunk));
  await req.on("end", async () => {
    const body = Buffer.concat(bodyChunks);

    if (req.headers["content-type"] === MIME_TYPES.json) {
      try {
        const data = JSON.parse(body);

        if (getLevelNumber(data.type) < 9)
          await log(data, req.connection, formatMessage);

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
      try {
        // Raw body handling
        await log({ content: { message: data } }, req.connection);

        res.statusCode = 200;
        res.setHeader("Content-Type", MIME_TYPES.plain);
        res.end(`Received raw body: ${body}`);
      } catch (serverError) {
        res.statusCode = 400;
        res.setHeader("Content-Type", MIME_TYPES.plain);
        res.end(
          `Bad request: ${serverError.name}: ${serverError.message},\n ${serverError.stack}`
        );
      }
    }
  });
}

async function getEvents(req, res, url) {
  // must be able to specify date
  try {
    fs.access(LOG_FILE_PATH, fs.constants.F_OK, async (acessError) => {
      if (acessError) {
        res.writeHead(404, { "Content-Type": MIME_TYPES.plain });
        res.end("Something happened to the file");
        return;
      }

      const stat = fs.statSync(LOG_FILE_PATH);
      res.writeHead(200, {
        "Content-type": "text/plain",
        "Content-Length": stat.size,
      });

      const readStream = fs.createReadStream(LOG_FILE_PATH);
      if (url.searchParams.get("date") || url.searchParams.get("level")) {
        const date = url.searchParams.get("date");
        const level = url.searchParams.get("level")?.toUpperCase();
        const rl = readline.createInterface({
          input: readStream,
          output: res,
          crlfDelay: Infinity,
        });

        rl.on("line", (line) => {
          const index = line.indexOf(LOG_FORMAT.delimiter());
          const label = line.substring(0, index);

          if (date && !label.startsWith(date)) return;
          if (level && !label.includes(level)) return;

          res.write(line);
          res.write("\n");
        });

        rl.on("close", () => {
          console.log("END");
          res.end();
        });
      } else {
        await readStream.pipe(res);
      }
    });
  } catch (serverError) {
    res.statusCode = 400;
    res.setHeader("Content-Type", MIME_TYPES.plain);
    res.end("Couldn't send the log file");
  }
}

async function log(
  data,
  client,
  format = LOGGER_DEFAULT_CONFIG.format,
  to = LOGGER_DEFAULT_CONFIG.to
) {
  await transports[to]()(
    LOG_FILE_PATH,
    `\n${format(data, client)}`,
    ENCODING,
    (writeError) => {
      if (writeError) throw writeError;
    }
  );
}

export { logEvent, getEvents };
