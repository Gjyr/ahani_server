import {
  processChatMessage,
  handleRegularResponse,
  handleStreamingResponse,
  params,
  listChatHistories,
} from "./index.mjs";
import { MIME_TYPES } from "../../app/config/config.mjs";

async function processMessagePost(req, res) {
  const acceptsSSE = req.headers.accept === MIME_TYPES.stream;
  const body = await parseRequestBody(req);
  const { message, parameters, chatFile = "messages.json" } = JSON.parse(body);

  try {
    if (acceptsSSE) {
      await handleStreamingResponse(
        req,
        res,
        params.CHAT_HISTORY_DIR,
        chatFile,
        message,
        parameters,
        process.env.DEEPSEEK_API_KEY
      );
    } else {
      await handleRegularResponse(
        req,
        res,
        params.CHAT_HISTORY_DIR,
        chatFile,
        message,
        parameters,
        process.env.DEEPSEEK_API_KEY
      );
    }
  } catch (error) {
    console.error("Route handler error: ", error);
    if (!res.headersSent) {
      res.writeHead(500, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      });
    }
    res.write(
      `event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`
    );
    res.end();
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

// TODO: error handling
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalLength = 0;

    req.on("data", (chunk) => {
      chunks.push(chunk);
      totalLength += chunk.length;

      // size limit, 5mb
      if (totalLength > 5e6) {
        req.destroy();
        reject(new Error("Request body too large"));
      }
    });

    req.on("end", () => {
      const body = Buffer.concat(chunks, totalLength).toString();
      resolve(body);
    });

    req.on("error", reject);
  });
}

export { processMessagePost };
