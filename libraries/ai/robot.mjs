import fs from "node:fs";
import { Buffer } from "node:buffer";
import { Transform, Readable, pipeline } from "node:stream";
import { request } from "node:https";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { MIME_TYPES, SERVER_PATH } from "../../app/config/config.mjs";

import { params, validateConfig } from "./config/deepseek.mjs";
import { generateMessageId } from "./utils/idGenerator.mjs";

// const `${params.CHAT_HISTORY_DIRS}${params.DEFAULT_CHAT}` = "./logs/chats/messages.json";

// const NET_CONFIG = Object.freeze({
//   hostname: "api.deepseek.com",
//   path: "/v1/chat/completions",
//   port: 443,
//   method: "POST",
//   headers: {
//     "Content-Type": MIME_TYPES.json,
//     //   Accept: MIME_TYPES.json,
//     Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
//   },
// });

/*
const DS_REFERENCE_PARAMS = Object.freeze({
  frequency_penalty: 0,
  presence_penalty: 0,
  response_format: {
    type: "text",
  },
  stop: null,
  stream_options: {
    include_usage: true  
  },
  top_p: 1,
  tools: null,
  tool_choice: "none",
  logprobs: false,
  top_logprobs: null,
});
*/

const DS_DEFAULTS = Object.seal({
  model: "deepseek-chat",
  temperature: 1.5,
  stream: true,
  max_tokens: 8192,
  role: "user",
});

const pipelineAsync = promisify(pipeline);

class DeepSeekStream extends Transform {
  constructor(options = {}) {
    super({ ...options, objectMode: true });
    this.temperature = options.temperature;
    this.model = options.model;
  }

  async _transform(chatHistory, encoding, callback) {
    try {
      const requestBody = {
        model: this.model,
        stream: true,
        temperature: this.temperature,
        messages: chatHistory.messages,
      };

      /**
       * @description Streamed response, DS param was set in {@link params.DS_PARAMETERS}
       * @instance IncomingMessage
       */
      const response = await this.makeAPIRequest(requestBody);

      this.push({ chatHistory, responseStream: response });
      callback();
    } catch (error) {
      callback(error);
    }
  }

  makeAPIRequest(requestBody) {
    return new Promise((resolve, reject) => {
      const options = params.NET_CONFIG;

      const req = request(options, (res) => resolve(res));

      req.on("error", reject);
      req.write(JSON.stringify(requestBody));
      req.end();
    });
  }
}

class ResponseCollector extends Transform {
  constructor(options = {}) {
    super({ ...options, objectMode: true });
  }

  async _transform(data, encoding, callback) {
    const { chatHistory, responseStream } = data;

    try {
      let fullResponse = "";

      for await (const chunk of responseStream) {
        const lines = chunk
          .toString()
          .split("\n")
          .filter((line) => line.trim() !== "");

        for (const line of lines) {
          if (line.startsWith("data: ") && !line.includes("[DONE]")) {
            try {
              const jsonData = JSON.parse(line.slice(6));
              const content = jsonData.choices[0]?.delta?.content || "";
              fullResponse += content;

              // TODO: chunks for RT processing, send them to the client
              this.emit("chunk", content);
            } catch (e) {
              // TODO: should be logged still?
              // to skip invalid JSON lines
            }
          }
        }
      }

      chatHistory.messages.push({
        role: "assistant",
        content: fullResponse,
        timestamp: new Date().toISOString(),
      });

      // forwarding just the json from here
      this.push(chatHistory);
      callback();
    } catch (error) {
      callback(error);
    }
  }
}

class HistoryUpdater extends Transform {
  constructor(filename, options = {}) {
    super({ ...options, objectMode: true });
    this.filename = filename;
  }

  async _transform(updatedHistory, encoding, callback) {
    try {
      await fs.promises.writeFile(
        this.filename,
        JSON.stringify(updatedHistory, null, 2)
      );

      this.push(updatedHistory);
      callback();
    } catch (error) {
      callback(error);
    }
  }
}

// TODO: also implement switching chats
async function processDeepSeekResponse(
  userMessage,
  parameters = {},
  res = null
) {
  const context = {
    userMessage: userMessage.substring(0, 100),
    parameters,
    streaming: !!res,
  };

  try {
    // add validation
    const chatHistory = await readChatHistory(
      `${SERVER_PATH}${params.CHAT_HISTORY_DIRS}${params.DEFAULT_CHAT}`
    );

    // push with validation
    chatHistory.messages.push({
      role: params.DS_ROLE,
      content: userMessage,
      timestamp: new Date().toISOString(),
      parameters: parameters, // temperature, etc. TODO: schema
    });

    const deepSeekStream = new DeepSeekStream({
      model: parameters.model || params.DS_PARAMETERS.model,
      temperature: parameters.temperature || params.DS_PARAMETERS.temperature,
      max_tokens: parameters.max_tokens || params.DS_PARAMETERS.max_tokens,
    });

    const responseCollector = new ResponseCollector();
    const historyUpdater = new HistoryUpdater(
      `${SERVER_PATH}${params.CHAT_HISTORY_DIRS}${params.DEFAULT_CHAT}`
    );

    // if (res) this.setupStreamingResponse(res, responseCollector);
    if (res) setupStreamingResponse(res, responseCollector);

    // TODO: send back
    // responseCollector.on("chunk", (chunk) => {
    //   // alternative for RT updates to the client
    //   console.log("Received chunk:", chunk);
    // });

    const historyStream = Readable.from([chatHistory]);

    await pipelineAsync(
      historyStream,
      deepSeekStream,
      responseCollector,
      historyUpdater
    );

    // if streaming, final event
    if (res && !res.writableEnded) {
      //   this.sendSSEEvent(res, "complete", {
      sendSSEEvent(res, "complete", {
        status: "Stream completed successfully",
      });
    }

    // return chatHistory;
    return {
      success: true,
      data: await readChatHistory(
        `${SERVER_PATH}${params.CHAT_HISTORY_DIRS}${params.DEFAULT_CHAT}`
      ),
      streamed: !!res,
    };
  } catch (error) {
    if (res && !res.writableEnded) {
      console.error("ERROR HERE: ", error);
      // also send this if streaming
      //   const result = await ErrorHandler.handlePipelineError(error, context);
      //   this.sendSSEEvent(res, "error", result.error);
    }

    // return await ErrorHandler.handlePipelineError(error, context);
  }
}

function setupStreamingResponse(res, responseCollector) {
  // TODO: update mime_types
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  sendSSEEvent(res, "connected", { status: "Streaming started" });

  responseCollector.on("chunk", (content) => {
    console.log("Received chunk:", content);
    sendSSEEvent(res, "chunk", { content });
  });

  // if disconnected
  let clientConnected = true;
  res.on("close", () => {
    clientConnected = false;
    // TODO: cancel the pipeline here
  });

  // keeps connection alive
  const keepAliveInterval = setInterval(() => {
    if (clientConnected && !res.writableEnded) {
      sendSSEEvent(res, "keep-alive", { timestamp: Date.now() });
    } else {
      clearInterval(keepAliveInterval);
    } // TODO: make a constant
  }, 30000);

  res.on("close", () => {
    clearInterval(keepAliveInterval);
    clientConnected = false;
  });
}

function sendSSEEvent(res, event, data) {
  console.log("================\n= Writing events =\n==================");
  if (!res.writableEnded) {
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      // client disconnected, might ignore?
    }
  }
}

async function readChatHistory(filename) {
  try {
    const data = await fs.promises.readFile(filename, "utf8");

    return JSON.parse(data);
  } catch (error) {
    // TODO: should create new if doesn't exist?
    return {
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

async function processMessagePost(req, res) {
  const acceptsSSE = req.headers.accept === "text/event-stream";

  try {
    const body = await parseRequestBody(req);
    const { message, parameters } = JSON.parse(body);
    console.log(message, parameters);

    if (acceptsSSE) {
      return await handleStreamingResponse(req, res, message, parameters);
    } else {
      // if not getting it through streams
      return await handleRegularResponse(req, res, message, parameters);
    }
  } catch (error) {
    if (acceptsSSE) {
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
    } else {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

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
async function handleStreamingResponse(req, res, message, parameters) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  let streamEnded = false;
  let finalChunkSent = false;

  const handleStreamEnd = () => {
    if (!streamEnded) {
      streamEnded = true;

      if (!res.writableEnded) res.end();
    }
  };

  req.on("close", () => {
    console.log("Client disconnected during streaming");
    handleStreamEnd();
  });

  req.on("error", (error) => {
    console.error("Client connection error:", error);
    handleStreamEnd();
  });

  try {
    const filename = `${SERVER_PATH}${params.CHAT_HISTORY_DIRS}${params.DEFAULT_CHAT}`;
    // const chatHistory = await readChatHistoryWithValidation(filename);
    const chatHistory = await readChatHistory(filename);

    chatHistory.messages.push({
      role: parameters.role || params.DS_ROLE,
      content: message,
      timestamp: new Date().toISOString(),
      parameters: parameters,
    });

    const deepSeekStream = new DeepSeekStream({
      model: parameters.model || params.DS_PARAMETERS.model,
      temperature: parameters.temperature || params.DS_PARAMETERS.temperature,
    });

    const responseCollector = new ResponseCollector();
    const historyUpdater = new HistoryUpdater(filename);

    // TODO: backpressure awareness
    responseCollector.on("chunk", (content) => {
      if (streamEnded || res.writableEnded) return;

      try {
        const chunkData = JSON.stringify({ content });
        const canWrite = res.write(`data: ${chunkData}\n\n`);

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

    const historyStream = Readable.from([chatHistory]);

    await pipelineAsync(
      historyStream,
      deepSeekStream,
      responseCollector,
      historyUpdater
    );
  } catch (error) {
    console.error("Streaming setup failed:", error);

    if (!streamEnded && !res.writableEnded) {
      res.write(
        `event: error\ndata: ${JSON.stringify({
          error: "Stream setup failed",
        })}\n\n`
      );
      handleStreamEnd();
    }
  }
}

async function handleRegularResponse(req, res, message, parameters) {
  console.log("Regular route");

  const result = await processDeepSeekResponse(message, parameters);

  if (result.success) {
    res.json({
      success: true,
      response: result.data.messages.slice(-1)[0].content,
      history: result.data,
    });
  } else {
    res.status(500).json(result);
  }
}

// const generateMessageId = () => randomUUID();

export { processMessagePost };
