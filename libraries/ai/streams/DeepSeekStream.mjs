import { Transform } from "node:stream";
import { request } from "node:https";
import {
  ChatError,
  DeepSeekAPIError,
  StreamProcessingError,
  ValidationError,
} from "../errors/AppError.mjs";
import { params } from "#config";

class DeepSeekStream extends Transform {
  constructor(apiKey, options = {}) {
    super({ ...options, objectMode: true });
    this.apiKey = apiKey;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1_000;
  }

  async _transform(chatHistory, encoding, callback) {
    try {
      this.validateChatHistory(chatHistory);

      const requestBody = this.prepareRequestBody(chatHistory);

      /**
       * @description Streamed response, DS param was set in {@link params.DS_PARAMETERS}
       * @instance IncomingMessage
       */
      const response = await this.makeAPIRequestWithRetry(requestBody);

      this.push({ chatHistory, responseStream: response });
      callback();
    } catch (error) {
      callback(this.normalizeError(error, chatHistory));
    }
  }

  validateChatHistory(chatHistory) {
    if (!chatHistory || typeof chatHistory !== "object") {
      throw new ValidationError(
        "Invalid chat history format",
        "chathistory",
        chatHistory
      );
    }

    if (!Array.isArray(chatHistory.messages)) {
      throw new ValidationError(
        "Chat history messages must be an array",
        "chatHistory.messages",
        chatHistory.messages
      );
    }

    chatHistory.messages.forEach((msg, index) => {
      if (!msg.role || !msg.content) {
        throw new ValidationError(
          `Message at index ${index} missing required fields`,
          `messages[${index}]`,
          msg
        );
      }
    });
  }

  prepareRequestBody(chatHistory) {
    try {
      return {
        ...params.DS_PARAMETERS,
        messages: chatHistory.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      };
    } catch (error) {
      throw new StreamProcessingError(
        "Failed to prepare API request body",
        "DeepSeekStream",
        {
          messagesCount: chatHistory.messages?.length,
        },
        error
      );
    }
  }

  async makeAPIRequestWithRetry(requestBody, attempt = 1) {
    try {
      return await this.makeAPIRequest(requestBody);
    } catch (error) {
      if (this.shouldRetry(error) && attempt < this.maxRetries) {
        await this.delay(this.retryDelay * attempt);
        return await this.makeAPIRequestWithRetry(requestBody, attempt + 1);
      }
      throw error;
    }
  }

  shouldRetry(error) {
    return (
      error.code === "ECONNRESET" ||
      error.code === "ETIMEDOUT" ||
      (error.statusCode && error.statusCode >= 500)
    );
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  makeAPIRequest(requestBody) {
    return new Promise((resolve, reject) => {
      const options = params.NET_CONFIG;

      const req = request(options, (res) => {
        if (res.statusCode >= 400) {
          let errorData = "";

          res.on("data", (chunk) => (errorData += chunk));
          res.on("end", () => {
            try {
              const errorJson = JSON.parse(errorData);

              reject(
                new DeepSeekAPIError(
                  errorJson.error?.message ||
                    `API request failed with status ${res.statusCode}: ${
                      errorJson.error?.message || errorData
                    }`,
                  res.statusCode,
                  requestBody
                )
              );
            } catch (error) {
              reject(
                new DeepSeekAPIError(
                  `API request failed with status ${res.statusCode} and body ${errorData}`,
                  res.statusCode,
                  requestBody
                )
              );
            }
          });
        } else resolve(res);
      });

      req.on("timeout", () => {
        req.destroy();
        reject(new DeepSeekAPIError("API request timeout", 408, requestBody));
      });

      req.on("error", (error) =>
        reject(
          new DeepSeekAPIError(
            `Network error: ${error.message}`,
            null,
            requestBody,
            error
          )
        )
      );

      try {
        req.write(JSON.stringify(requestBody));
        req.end();
      } catch (error) {
        reject(
          new DeepSeekAPIError(
            "Failed to send request",
            null,
            requestBody,
            error
          )
        );
      }
    });
  }

  normalizeError(error, chatHistory) {
    if (error instanceof ChatError) return error;

    return (
      new StreamProcessingError(
        "Unexpected error in DeepSeekStream",
        "DeepSeekStream",
        {
          messagesCount: chatHistory.messages?.length,
          lastMessage: chatHistory.messages
            ?.slice(-1)[0]
            ?.content?.substring(0, 100),
        }
      ),
      error
    );
  }
}

export { DeepSeekStream };
