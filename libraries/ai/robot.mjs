import {
  handleRegularResponse,
  handleStreamingResponse,
  params,
  listChatHistories,
} from "./index.mjs";
import { MIME_TYPES } from "../../app/config/config.mjs";
import {
  InvalidJSONError,
  PayloadTooLargeError,
  RequestBodyError,
  ValidationError,
} from "./errors/ChatError.mjs";
import { parseRequestBody, sendErrorResponse } from "./utils/bodyParser.mjs";

async function processMessagePost(req, res) {
  let requestBody = null;

  try {
    const requestBody = await parseRequestBody(req, {
      maxSize: 10 * 1024 * 1024,
      timeout: 15_000,
      requireJSON: true,
    });

    if (!requestBody.message || typeof requestBody.message !== "string")
      throw new ValidationError(
        "Message field is required and must be a string",
        "message",
        requestBody.message,
      );

    const acceptsSSE = req.headers.accept === MIME_TYPES["stream"];

    const { message, parameters, chatFile = "grok.json" } = requestBody;

    try {
      if (acceptsSSE) {
        await handleStreamingResponse(
          req,
          res,
          params.CHAT_HISTORY_DIR,
          chatFile,
          message,
          parameters,
          process.env.XAI_API_KEY,
        );
      } else {
        await handleRegularResponse(
          req,
          res,
          params.CHAT_HISTORY_DIR,
          chatFile,
          message,
          parameters,
          process.env.XAI_API_KEY,
        );
      }
    } catch (error) {
      console.error("Route handler error: ", error);
      if (!res.headersSent) {
        res.writeHead(500, {
          "Content-Type": MIME_TYPES["stream"],
          "Cache-Control": "no-cache",
        });
      }
      res.write(
        `event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`,
      );
      res.end();
    }
  } catch (error) {
    if (error instanceof PayloadTooLargeError)
      return sendErrorResponse(res, 413, {
        error: "Payload too large",
        maxSize: error.context.maxSize,
        actualSize: error.context.actualSize,
      });
    else if (error instanceof InvalidJSONError)
      return sendErrorResponse(res, 400, {
        error: "Invalid JSON in request body",
        position: error.context.position,
      });
    else if (error instanceof RequestBodyError)
      return sendErrorResponse(res, error.httpStatus || 400, {
        error: error.message,
      });

    // TODO: catch higher
    throw error;
  }
}

async function listChats(req, res) {
  try {
    const chats = await listChatHistories(params.CHAT_HISTORY_DIR);
    // send success true & chats
  } catch (error) {
    // status 500, send success false and error.message
  }
}

async function createChat(req, res) {
  const body = parseRequestBody(req);
  const { name } = JSON.parse(body);
  const chatFile = `${name || `chat-${Date.now()}`}.json`;

  // create new chat
  // send success true & chatFile
}

export { processMessagePost };
