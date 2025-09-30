import { Transform } from "node:stream";
import { ChatError, StreamProcessingError } from "../errors/ChatError.mjs";

class ResponseCollector extends Transform {
  constructor(options = {}) {
    super({ ...options, objectMode: true });
    this.maxResponseLength = options.maxResponseLength || 1_000_000;
    this.responseTimeout = options.responseTimeout || 300_000;
  }

  async _transform(data, encoding, callback) {
    let timeoutId = null;

    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          new StreamProcessingError(
            "Response stream timeout exceeded",
            "ResponseCollector",
            { timeout: this.responseTimeout }
          )
        );
      }, this.responseTimeout);
    });

    try {
      const result = await Promise.race([
        this.processResponse(data),
        timeoutPromise,
      ]);

      clearTimeout(timeoutId);
      this.push(result);
      callback();
    } catch (error) {
      clearTimeout(timeoutId);
      callback(this.normalizeError(error, data));
    }
  }

  async processResponse(data) {
    const { chatHistory, responseStream } = data;
    let fullResponse = "";
    let chunkCount = 0;

    for await (const chunk of responseStream) {
      chunkCount++;

      if (fullResponse.length > this.maxResponseLength) {
        throw new StreamProcessingError(
          `Response exceeded maximum length of ${this.maxResponseLength} characters`,
          "ResponseCollector",
          { chunkCount, currentLength: fullResponse.length }
        );
      }

      const lines = chunk
        .toString()
        .split("\n")
        .filter((line) => line.trim() !== "");

      for (const line of lines) {
        if (line.startsWith("data: ") && !line.includes("[DONE]")) {
          const content = this.parseChunk(line);
          if (content) {
            fullResponse += content;
            // TODO: chunks for RT processing, send them to the client
            this.emit("chunk", content);
          }
        }
      }
    }

    if (!fullResponse.trim()) {
      throw new StreamProcessingError(
        "Empty responce from API",
        "ResponseCollector",
        { chunkCount }
      );
    }

    chatHistory.messages.push({
      role: "assistant",
      content: fullResponse,
      timestamp: new Date().toISOString(),
    });

    return chatHistory;
  }

  parseChunk(line) {
    try {
      const jsonData = JSON.parse(line.slice(6));
      return jsonData.choices[0]?.delta?.content || "";
    } catch (error) {
      // skipping bad JSON chunks but logging them
      this.emit("chunkError", {
        error: "Invalid JSON chunk",
        chunk: line.substring(0, 200),
        originalError: error.message,
      });
      return "";
    }
  }

  normalizeError(error, data) {
    if (error instanceof ChatError) return error;

    return new StreamProcessingError(
      "Unexpected error in ResponseCollector",
      "ResponseCollector",
      {
        hasChatHistory: !!data.chatHistory,
        hasResponseStream: !!data.responseStream,
      },
      error
    );
  }
}

export { ResponseCollector };
