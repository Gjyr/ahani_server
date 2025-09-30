import {
  RequestBodyError,
  PayloadTooLargeError,
  InvalidJSONError,
} from "../errors/ChatError.mjs";

function parseRequestBody(req, options = {}) {
  const {
    maxSize = 5 * 1024 * 1024,
    timeout = 30000,
    requireJSON = true,
  } = options;

  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalLength = 0;
    let timeoutId;

    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        cleanup();
        reject(
          new RequestBodyError("Request body parsing timeout", { timeout })
        );
      }, timeout);
    }

    const cleanup = () => {
      clearTimeout(timeoutId);
      req.removeListener("data", onData);
      req.removeListener("end", onEnd);
      req.removeListener("data", onError);
    };

    const onData = (chunk) => {
      chunks.push(chunk);
      totalLength += chunk.length;

      if (totalLength > maxSize) {
        cleanup();
        reject(new PayloadTooLargeError(maxSize, totalLength));
      }
    };

    const onEnd = () => {
      cleanup();

      try {
        const body = Buffer.concat(chunks, totalLength).toString();

        if (requireJSON) {
          if (!body.trim()) throw new InvalidJSONError(body, 0);

          try {
            const parsed = JSON.parse(body);
            resolve(parsed);
          } catch (parseError) {
            const position = getJSONErrorPosition(body, parseError);
            throw new InvalidJSONError(body, position);
          }
        } else resolve(body);
      } catch (error) {
        reject(error);
      }
    };

    const onError = (error) => {
      cleanup();
      reject(
        new RequestBodyError(
          "Request body stream error",
          { bytesReceived: totalLength },
          error
        )
      );
    };

    if (req.aborted) {
      cleanup();
      reject(new RequestBodyError("Request aborted before body was parsed"));
      return;
    }

    req.on("data", onData);
    req.on("end", onEnd);
    req.on("error", onError);
  });
}

function getJSONErrorPosition(body, error) {
  if (error.message.includes("position")) {
    const match = error.message.match(/position\s+(\d+)/);
    if (match) return parseInt(match[1]);
  }

  try {
    const lines = body.split("\n");
    let position = 0;
    for (let i = 0; i < lines.length; i++) {
      try {
        JSON.parse(lines.at(i));
      } catch (e) {
        return position;
      }
      position += lines.at(i).length + 1;
    }
  } catch (e) {
    // just 0 then
  }
  return 0;
}

function sendErrorResponse(res, status, data) {
  if (!res.headersSent)
    res.writeHead(status, { "Content-Type": MIME_TYPES.json });

  res.end(JSON.stringify(data));
}

export { parseRequestBody, sendErrorResponse };
