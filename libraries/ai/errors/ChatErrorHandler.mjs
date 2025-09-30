import { appendFile } from "node:fs/promises";
import { SERVER_PATH } from "../../../app/config/config.mjs";

class ChatErrorHandler {
  static async handlePipelineError(error, context = {}) {
    const errorContext = {
      ...context,
      timestamp: new Date().toISOString(),
      stack: error.stack,
    };

    // TODO: move to logger
    await this.logError(error, errorContext);

    if (this.isOperationalError(error))
      return this.formatOperationalError(error);
    else {
      await this.alertCriticalError(error, errorContext);
      return this.formatUnexpectedError();
    }
  }

  static isOperationalError(error) {
    return error instanceof ChatError;
  }

  static async logError(error, context) {
    const logEntry = {
      level: this.getErrorLevel(error),
      error: {
        name: error.name,
        message: error.message,
        context: error.context || {},
        stack: error.stack,
      },
      appContext: context,
      timestamp: new Date().toISOString(),
    };

    console.error(JSON.stringify(logEntry, null, 2));

    //TODO: logger
    await this.writeToErrorLog(logEntry);
  }

  static getErrorLevel(error) {
    if (error instanceof ValidationError) return "warn";
    if (error.statusCode >= 500) return "error";
    return "info";
  }

  static formatOperationalError(error) {
    return {
      success: false,
      error: {
        type: "operational",
        message: error.message,
        code: this.getErrorCode(error),
        context: error.context,
        timestamp: error.timestamp,
      },
    };
  }

  static formatUnexpectedError() {
    return {
      success: false,
      error: {
        type: "unexpected",
        message: "An inexpected error occured. Should try again.",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      },
    };
  }

  static getErrorCode(error) {
    const codes = {
      ValidationError: "VALIDATION_ERROR",
      ChatHistoryError: "CHAT_HISTORY_ERROR",
      DeepSeekAPIError: "API_ERROR",
      StreamProcessingError: "STREAM_ERROR",
    };
    return codes[error.name] || "UNKNOWN_ERROR";
  }

  static async writeToErrorLog(entry) {
    try {
      await appendFile(
        `${SERVER_PATH}/logs/ai/aierrors.jsonl`,
        JSON.stringify(entry) + "\n"
      );
    } catch (logError) {
      console.error("Failed to write error log: ", logError);
    }
  }

  static async alertCriticalError(error, context) {
    // TODO: email?
    console.error("CRITICAL ERROR ALERT: ", error.message, context);
  }
}

export { ChatErrorHandler };
