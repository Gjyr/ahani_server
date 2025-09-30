import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  DeepSeekStream,
  ResponseCollector,
  HistoryUpdater,
} from "../streams/index.mjs";
import { readChatHistory } from "../utils/chatHistory.mjs";
import { generateMessageId } from "../utils/idGenerator.mjs";
import { MIME_TYPES } from "../../../app/config/config.mjs";
import { params } from "#config";

async function handleStreamingResponse(
  req,
  res,
  chatHistoryDir,
  chatFile,
  message,
  parameters,
  apiKey
) {
  res.writeHead(200, {
    "Content-Type": MIME_TYPES.stream,
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  let streamEnded = false;
  const handleStreamEnd = () => {
    if (!streamEnded) {
      streamEnded = true;
      if (!res.writableEnded) res.end();
    }
  };

  req.on("close", () => {
    console.log("Client disconnected during streaming.");
    handleStreamEnd();
  });
  req.on("error", (error) => {
    console.error("Client connection error:", error);
    handleStreamEnd();
  });

  try {
    const chatHistory = await readChatHistory(
      params.CHAT_HISTORY_DIR,
      // TODO: choose chat file
      params.DEFAULT_CHAT
    );

    chatHistory.messages.push({
      id: generateMessageId(),
      role: parameters.role || params.DS_ROLE,
      content: message,
      timestamp: new Date().toISOString(),
      parameters,
    });

    const deepSeekStream = new DeepSeekStream(
      process.env.DEEPSEEK_API_KEY,
      parameters
    );
    const responseCollector = new ResponseCollector();
    const historyUpdater = new HistoryUpdater(
      params.CHAT_HISTORY_DIR,
      params.DEFAULT_CHAT
    );

    // TODO: backpressure awareness
    responseCollector.on("chunk", (content) => {
      if (streamEnded || res.writableEnded) return;

      try {
        const canWrite = res.write(`data: ${JSON.stringify({ content })}\n\n`);

        //  if the write buffer is full
        if (!canWrite) {
          res.once("drain", () =>
            console.log("Write buffer drained, continuing...")
          );
        }
      } catch (error) {
        console.error("Error writing chunk:", error);
        handleStreamEnd();
      }
    });

    /*
    responseCollector.once("end", async (updatedHistory) => {
      if (streamEnded) return;

      try {
        // final completion event
        const completeData = JSON.stringify({
          status: "complete",
          messageId: generateMessageId(),
        });

        // checks if can write immediately
        const canWrite = res.write(`data: ${completeData}\n\n`);

        if (canWrite) {
          // if buffer was accepted
          handleStreamEnd();
        } else {
          // or to wait for buffer to drain
          res.once("drain", handleStreamEnd);
        }
      } catch (error) {
        console.error("Error sending completion event:", error);
        handleStreamEnd();
      }
    });
    */

    /*
    responseCollector.on("error", (error) => {
      console.error("Stream processing error:", error);

      if (!streamEnded && !res.writableEnded)
        res.write(
          `event: error\ndata: ${JSON.stringify({
            error: "Stream processing failed",
          })}\n\n`
        );

      handleStreamEnd();
    });
    */

    const historyStream = Readable.from([chatHistory]);

    await pipeline(
      historyStream,
      deepSeekStream,
      responseCollector,
      historyUpdater
    );

    if (!streamEnded && !res.writableEnded) {
      console.log("HERE");
      res.write(`data: ${JSON.stringify({ status: "complete" })}\n\n`);
      handleStreamEnd();
    }
  } catch (error) {
    console.error("Streaming error:", error);

    if (!streamEnded && !res.writableEnded) {
      res.write(
        `event: error\ndata: ${JSON.stringify({
          error: error.message,
        })}\n\n`
      );
      handleStreamEnd();
    }
  }
}

export { handleStreamingResponse };
