import { createWriteStream, appendFile } from "node:fs";
import {
  ENCODING,
  LEVEL_NUMBERS,
  LOG_FILE_PATH,
  LOG_FORMAT,
  LOGGER_DEFAULT_CONFIG,
} from "#config";

const getLevelNumber = function (level) {
  return LEVEL_NUMBERS[level] ?? 9;
};

function formatMessage(data, client, config = LOG_FORMAT) {
  return `${config.level(
    getLevelNumber(data.type)
  )} ${config.delimiter()} ${config.geography(
    client
  )} on ${config.date()}${config.newLine()}Event: ${config.name(
    data.content
  )} -- ${config.message(data.content)}${config.delimiter()}`;
}

const transports = {
  toFile: function () {
    return appendFile;
  },

  toConsole: function () {},
};

async function log(
  data,
  client,
  format = LOGGER_DEFAULT_CONFIG.format,
  to = LOGGER_DEFAULT_CONFIG.to
) {
  await transports[to]()(
    LOG_FILE_PATH,
    `${format(data, client)}\n`,
    ENCODING,
    (writeError) => {
      if (writeError) throw writeError;
    }
  );
}

export { log, getLevelNumber, formatMessage };
